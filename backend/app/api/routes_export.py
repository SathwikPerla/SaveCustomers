import io
import zipfile
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from app.core.database import get_db
from app.core.config import settings

router = APIRouter()

@router.get("/{project_id}/export/zip")
def export_project_zip(project_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM projects WHERE id = ?", (project_id,))
        proj = cursor.fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found")
            
        cursor.execute("""
            SELECT id, original_filename, stored_filename, processed_filename, status
            FROM images
            WHERE project_id = ?
        """, (project_id,))
        images = cursor.fetchall()
        
    if not images:
        raise HTTPException(status_code=400, detail="No images in project to export")
        
    # Check if we have completed images
    completed_images = [img for img in images if img.get("processed_filename")]
    if not completed_images:
        raise HTTPException(status_code=400, detail="No processed images found. Please process images before exporting.")
        
    zip_buffer = io.BytesIO()
    used_names: dict[str, int] = {}
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for idx, img in enumerate(completed_images):
            processed_path = settings.PROCESSED_DIR / img["processed_filename"]
            if processed_path.exists():
                orig_stem = Path(img["original_filename"]).stem
                orig_ext = Path(img["original_filename"]).suffix or ".jpg"
                base_arcname = f"{orig_stem}_rebranded{orig_ext}"
                if base_arcname in used_names:
                    used_names[base_arcname] += 1
                    arcname = f"{orig_stem}_rebranded_{used_names[base_arcname]}{orig_ext}"
                else:
                    used_names[base_arcname] = 1
                    arcname = base_arcname
                zf.write(processed_path, arcname=arcname)
                
    if not used_names:
        raise HTTPException(status_code=404, detail="No processed files could be found on disk to export")
                
    zip_buffer.seek(0)
    safe_name = "".join(c for c in proj["name"] if c.isalnum() or c in "._- ") or "project"
    filename = f"{safe_name}_rebranded.zip"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{project_id}/images/{image_id}/download")
def download_single_image(project_id: str, image_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM images WHERE id = ? AND project_id = ?", (image_id, project_id))
        img = cursor.fetchone()
        if not img:
            raise HTTPException(status_code=404, detail="Image not found")
            
    if not img.get("processed_filename"):
        raise HTTPException(status_code=400, detail="Image has not been processed yet")
        
    file_path = settings.PROCESSED_DIR / img["processed_filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Processed file not found on disk")
        
    orig_stem = Path(img["original_filename"]).stem
    orig_ext = Path(img["original_filename"]).suffix or ".jpg"
    download_filename = f"{orig_stem}_rebranded{orig_ext}"
    
    return FileResponse(
        path=str(file_path),
        filename=download_filename,
        media_type="image/jpeg",
    )

