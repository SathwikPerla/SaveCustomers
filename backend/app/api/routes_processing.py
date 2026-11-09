import asyncio
import json
import uuid
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.core.database import get_db
from app.core.config import settings
from app.models.schemas import (
    ImageItem,
    InpaintRequest,
    DetectLogoResponse,
    BatchJobStatus,
    LogoPlacement,
    MaskRegion,
)
from app.services.inpainting_service import inpaint_image_file
from app.services.logo_detector import detect_candidate_logo_regions
from app.services.logo_compositor import composite_logo_on_image
from app.api.routes_projects import build_image_item

router = APIRouter()

@router.post("/{project_id}/images/{image_id}/detect-logo", response_model=DetectLogoResponse)
def detect_logo_endpoint(project_id: str, image_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT stored_filename FROM images WHERE id = ? AND project_id = ?", (image_id, project_id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Image not found")
            
    img_path = settings.UPLOADS_DIR / row["stored_filename"]
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image file missing on disk")
        
    return detect_candidate_logo_regions(img_path)

@router.post("/{project_id}/images/{image_id}/inpaint", response_model=ImageItem)
def inpaint_image_endpoint(project_id: str, image_id: str, req: InpaintRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM images WHERE id = ? AND project_id = ?", (image_id, project_id))
        img_row = cursor.fetchone()
        if not img_row:
            raise HTTPException(status_code=404, detail="Image not found")
            
    # Resolve mask regions: from request or stored image record
    mask_regions = req.mask_regions
    if not mask_regions and img_row.get("mask_data"):
        try:
            raw = json.loads(img_row["mask_data"])
            mask_regions = [MaskRegion(**m) for m in raw]
        except Exception:
            mask_regions = []
            
    if not mask_regions:
        raise HTTPException(status_code=400, detail="No mask regions specified for inpainting")
        
    source_path = settings.UPLOADS_DIR / img_row["stored_filename"]
    output_filename = f"inpainted_{img_row['stored_filename']}.jpg"
    output_path = settings.PROCESSED_DIR / output_filename
    
    try:
        inpaint_image_file(source_path, output_path, mask_regions, method=req.method)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inpainting failed: {str(e)}")
        
    now = datetime.utcnow().isoformat()
    mask_json = json.dumps([m.model_dump() for m in mask_regions])
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE images
            SET processed_filename = ?, mask_data = ?, inpainting_method = ?, status = 'ready', updated_at = ?
            WHERE id = ?
        """, (output_filename, mask_json, req.method, now, image_id))
        
        cursor.execute("SELECT * FROM images WHERE id = ?", (image_id,))
        updated_row = cursor.fetchone()
        return build_image_item(updated_row)

@router.post("/{project_id}/images/{image_id}/apply-logo", response_model=ImageItem)
def apply_logo_endpoint(project_id: str, image_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM images WHERE id = ? AND project_id = ?", (image_id, project_id))
        img_row = cursor.fetchone()
        if not img_row:
            raise HTTPException(status_code=404, detail="Image not found")
            
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        proj_row = cursor.fetchone()
        
        cursor.execute("SELECT * FROM logos WHERE project_id = ?", (project_id,))
        logo_row = cursor.fetchone()
        if not logo_row:
            raise HTTPException(status_code=400, detail="No replacement logo uploaded for this project")
            
    # Determine placement: custom_settings override, else global_settings
    placement = LogoPlacement()
    if img_row.get("custom_settings"):
        try:
            placement = LogoPlacement(**json.loads(img_row["custom_settings"]))
        except Exception:
            pass
    elif proj_row.get("global_settings"):
        try:
            placement = LogoPlacement(**json.loads(proj_row["global_settings"]))
        except Exception:
            pass
            
    # Source image: if already inpainted, use inpainted version; else upload original
    if img_row.get("processed_filename") and (settings.PROCESSED_DIR / img_row["processed_filename"]).exists():
        source_path = settings.PROCESSED_DIR / img_row["processed_filename"]
    else:
        source_path = settings.UPLOADS_DIR / img_row["stored_filename"]
        
    logo_path = settings.LOGOS_DIR / logo_row["stored_filename"]
    final_filename = f"rebranded_{img_row['stored_filename']}.jpg"
    output_path = settings.PROCESSED_DIR / final_filename
    
    try:
        composite_logo_on_image(
            base_image_path=source_path,
            logo_path=logo_path,
            output_path=output_path,
            placement=placement,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply logo: {str(e)}")
        
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE images
            SET processed_filename = ?, status = 'completed', error_message = NULL, updated_at = ?
            WHERE id = ?
        """, (final_filename, now, image_id))
        
        cursor.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, project_id))
        cursor.execute("SELECT * FROM images WHERE id = ?", (image_id,))
        return build_image_item(cursor.fetchone())

def process_batch_job_worker(project_id: str, job_id: str):
    """
    Background worker that iterates through all project images,
    inpaints if mask present, and applies replacement logo.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        proj = cursor.fetchone()
        
        cursor.execute("SELECT * FROM logos WHERE project_id = ?", (project_id,))
        logo = cursor.fetchone()
        
        cursor.execute("SELECT * FROM images WHERE project_id = ?", (project_id,))
        images = cursor.fetchall()
        
    if not logo or not images:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE batch_jobs
                SET status = 'failed', error_message = 'No logo or images found in project', updated_at = ?
                WHERE id = ?
            """, (datetime.utcnow().isoformat(), job_id))
        return
        
    logo_path = settings.LOGOS_DIR / logo["stored_filename"]
    
    global_placement = LogoPlacement()
    if proj.get("global_settings"):
        try:
            global_placement = LogoPlacement(**json.loads(proj["global_settings"]))
        except Exception:
            pass

    # Look for reference watermark removal mask across project images for batch propagation
    batch_default_masks = None
    for im in images:
        if im.get("mask_data"):
            try:
                candidate = [MaskRegion(**m) for m in json.loads(im["mask_data"])]
                if candidate:
                    batch_default_masks = candidate
                    break
            except Exception:
                pass
            
    processed_count = 0
    failed_count = 0
    
    for img in images:
        now = datetime.utcnow().isoformat()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE batch_jobs
                SET current_image_id = ?, updated_at = ?
                WHERE id = ?
            """, (img["id"], now, job_id))
            cursor.execute("UPDATE images SET status = 'processing' WHERE id = ?", (img["id"],))
            
        try:
            # 1. Check if inpainting needed (individual or batch propagated)
            base_file = settings.UPLOADS_DIR / img["stored_filename"]
            source_for_logo = base_file
            
            masks_to_use = None
            if img.get("mask_data"):
                try:
                    masks_to_use = [MaskRegion(**m) for m in json.loads(img["mask_data"])]
                except Exception:
                    pass
            if not masks_to_use and batch_default_masks:
                masks_to_use = batch_default_masks
                
            if masks_to_use:
                try:
                    inpaint_out = settings.PROCESSED_DIR / f"inp_{img['stored_filename']}.jpg"
                    inpaint_image_file(base_file, inpaint_out, masks_to_use, method=img.get("inpainting_method", "telea"))
                    source_for_logo = inpaint_out
                except Exception as e:
                    # Non-fatal, proceed with base image
                    source_for_logo = base_file
                    
            # 2. Determine placement
            placement = global_placement
            if img.get("custom_settings"):
                try:
                    placement = LogoPlacement(**json.loads(img["custom_settings"]))
                except Exception:
                    pass
                    
            # 3. Composite logo
            final_out_name = f"rebranded_{img['stored_filename']}.jpg"
            final_out_path = settings.PROCESSED_DIR / final_out_name
            
            composite_logo_on_image(
                base_image_path=source_for_logo,
                logo_path=logo_path,
                output_path=final_out_path,
                placement=placement,
            )
            
            processed_count += 1
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE images
                    SET processed_filename = ?, status = 'completed', error_message = NULL, updated_at = ?
                    WHERE id = ?
                """, (final_out_name, datetime.utcnow().isoformat(), img["id"]))
                cursor.execute("""
                    UPDATE batch_jobs
                    SET processed_images = ?, updated_at = ?
                    WHERE id = ?
                """, (processed_count, datetime.utcnow().isoformat(), job_id))
        except Exception as e:
            failed_count += 1
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE images
                    SET status = 'failed', error_message = ?, updated_at = ?
                    WHERE id = ?
                """, (str(e), datetime.utcnow().isoformat(), img["id"]))
                cursor.execute("""
                    UPDATE batch_jobs
                    SET failed_images = ?, updated_at = ?
                    WHERE id = ?
                """, (failed_count, datetime.utcnow().isoformat(), job_id))
                
    # Finish job
    final_status = "completed" if failed_count == 0 else ("completed_with_errors" if processed_count > 0 else "failed")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE batch_jobs
            SET status = ?, current_image_id = NULL, updated_at = ?
            WHERE id = ?
        """, (final_status, datetime.utcnow().isoformat(), job_id))
        cursor.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (datetime.utcnow().isoformat(), project_id))

@router.post("/{project_id}/batch-process", response_model=BatchJobStatus)
def start_batch_process(project_id: str, background_tasks: BackgroundTasks):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")
            
        cursor.execute("SELECT id FROM logos WHERE project_id = ?", (project_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Cannot start batch: Replacement logo has not been uploaded.")
            
        cursor.execute("SELECT COUNT(*) as count FROM images WHERE project_id = ?", (project_id,))
        total_images = cursor.fetchone()["count"]
        if total_images == 0:
            raise HTTPException(status_code=400, detail="No images to process")
            
        job_id = uuid.uuid4().hex[:12]
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO batch_jobs (
                id, project_id, status, total_images, processed_images,
                failed_images, created_at, updated_at
            ) VALUES (?, ?, 'running', ?, 0, 0, ?, ?)
        """, (job_id, project_id, total_images, now, now))
        
    background_tasks.add_task(process_batch_job_worker, project_id, job_id)
    
    return BatchJobStatus(
        id=job_id,
        project_id=project_id,
        status="running",
        total_images=total_images,
        processed_images=0,
        failed_images=0,
        current_image_id=None,
        error_message=None,
        created_at=now,
        updated_at=now,
    )

@router.get("/{project_id}/jobs/{job_id}", response_model=BatchJobStatus)
def get_job_status(project_id: str, job_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM batch_jobs WHERE id = ? AND project_id = ?", (job_id, project_id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Batch job not found")
            
        return BatchJobStatus(
            id=row["id"],
            project_id=row["project_id"],
            status=row["status"],
            total_images=row["total_images"],
            processed_images=row["processed_images"],
            failed_images=row["failed_images"],
            current_image_id=row["current_image_id"],
            error_message=row["error_message"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

