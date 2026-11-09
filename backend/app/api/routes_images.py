import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from app.core.database import get_db
from app.models.schemas import (
    ImageItem,
    LogoItem,
    ImageConfigUpdate,
    MaskRegion,
    LogoPlacement,
)
from app.services.image_service import (
    validate_and_save_image,
    validate_and_save_logo,
)
from app.api.routes_projects import build_image_item, build_logo_item
from app.core.config import settings

router = APIRouter()

@router.post("/{project_id}/images", response_model=list[ImageItem])
async def upload_images(project_id: str, files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
        
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")
            
        cursor.execute("SELECT COUNT(*) as count FROM images WHERE project_id = ?", (project_id,))
        current_count = cursor.fetchone()["count"]
        if current_count + len(files) > settings.MAX_PROJECT_IMAGES:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {settings.MAX_PROJECT_IMAGES} images allowed per project (currently {current_count})"
            )
            
    added_images = []
    now = datetime.utcnow().isoformat()
    
    for f in files:
        content = await f.read()
        try:
            stored_name, thumb_name, width, height, size = validate_and_save_image(
                content=content,
                original_filename=f.filename or "image.jpg"
            )
            img_id = uuid.uuid4().hex[:12]
            
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO images (
                        id, project_id, original_filename, stored_filename,
                        thumbnail_filename, width, height, file_size,
                        status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploaded', ?, ?)
                """, (
                    img_id, project_id, f.filename or "image.jpg", stored_name,
                    thumb_name, width, height, size, now, now
                ))
                cursor.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, project_id))
                
                cursor.execute("SELECT * FROM images WHERE id = ?", (img_id,))
                row = cursor.fetchone()
                added_images.append(build_image_item(row))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process {f.filename}: {str(e)}")
            
    return added_images

@router.delete("/{project_id}/images/{image_id}")
def delete_image(project_id: str, image_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM images WHERE id = ? AND project_id = ?", (image_id, project_id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Image not found")
            
        # Remove files
        if row["stored_filename"]:
            (settings.UPLOADS_DIR / row["stored_filename"]).unlink(missing_ok=True)
        if row["thumbnail_filename"]:
            (settings.THUMBNAILS_DIR / row["thumbnail_filename"]).unlink(missing_ok=True)
        if row["processed_filename"]:
            (settings.PROCESSED_DIR / row["processed_filename"]).unlink(missing_ok=True)
            
        cursor.execute("DELETE FROM images WHERE id = ?", (image_id,))
        now = datetime.utcnow().isoformat()
        cursor.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, project_id))
        
    return {"message": "Image deleted", "id": image_id}

@router.post("/{project_id}/images/{image_id}/reset", response_model=ImageItem)
def reset_image_endpoint(project_id: str, image_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM images WHERE id = ? AND project_id = ?", (image_id, project_id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Image not found")
            
        if row["processed_filename"]:
            (settings.PROCESSED_DIR / row["processed_filename"]).unlink(missing_ok=True)
            
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            UPDATE images
            SET processed_filename = NULL, mask_data = NULL, status = 'ready', updated_at = ?
            WHERE id = ?
        """, (now, image_id))
        
        cursor.execute("SELECT * FROM images WHERE id = ?", (image_id,))
        updated_row = cursor.fetchone()
        return build_image_item(updated_row)

@router.put("/{project_id}/images/{image_id}/config", response_model=ImageItem)
def update_image_config(project_id: str, image_id: str, config: ImageConfigUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM images WHERE id = ? AND project_id = ?", (image_id, project_id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Image not found")
            
        now = datetime.utcnow().isoformat()
        
        custom_settings = row["custom_settings"]
        if config.custom_settings is not None:
            custom_settings = config.custom_settings.model_dump_json()
            
        mask_data = row["mask_data"]
        if config.mask_data is not None:
            mask_data = json.dumps([m.model_dump() for m in config.mask_data])
            
        inpainting_method = (
            config.inpainting_method
            if config.inpainting_method is not None
            else row["inpainting_method"]
        )
        
        cursor.execute("""
            UPDATE images
            SET custom_settings = ?, mask_data = ?, inpainting_method = ?, updated_at = ?
            WHERE id = ?
        """, (custom_settings, mask_data, inpainting_method, now, image_id))
        
        cursor.execute("SELECT * FROM images WHERE id = ?", (image_id,))
        updated_row = cursor.fetchone()
        return build_image_item(updated_row)

@router.post("/{project_id}/logo", response_model=LogoItem)
async def upload_logo(project_id: str, file: UploadFile = File(...)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

    content = await file.read()
    stored_name, width, height, size, has_alpha = validate_and_save_logo(
        content=content,
        original_filename=file.filename or "logo.png"
    )
    
    logo_id = uuid.uuid4().hex[:12]
    now = datetime.utcnow().isoformat()
    
    with get_db() as conn:
        cursor = conn.cursor()
        # Clean up existing logo if any, now that new logo is successfully validated
        cursor.execute("SELECT stored_filename FROM logos WHERE project_id = ?", (project_id,))
        existing = cursor.fetchone()
        if existing and existing["stored_filename"] and existing["stored_filename"] != stored_name:
            (settings.LOGOS_DIR / existing["stored_filename"]).unlink(missing_ok=True)
        cursor.execute("DELETE FROM logos WHERE project_id = ?", (project_id,))

        cursor.execute("""
            INSERT INTO logos (
                id, project_id, original_filename, stored_filename,
                width, height, file_size, has_alpha, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            logo_id, project_id, file.filename or "logo.png", stored_name,
            width, height, size, 1 if has_alpha else 0, now
        ))
        cursor.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, project_id))
        
        cursor.execute("SELECT * FROM logos WHERE id = ?", (logo_id,))
        row = cursor.fetchone()
        return build_logo_item(row)

@router.delete("/{project_id}/logo")
def delete_logo(project_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM logos WHERE project_id = ?", (project_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Logo not found")
            
        if row["stored_filename"]:
            (settings.LOGOS_DIR / row["stored_filename"]).unlink(missing_ok=True)
            
        cursor.execute("DELETE FROM logos WHERE project_id = ?", (project_id,))
        now = datetime.utcnow().isoformat()
        cursor.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, project_id))
        
    return {"message": "Logo deleted successfully"}

