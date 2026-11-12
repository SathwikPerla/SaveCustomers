import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from app.core.database import get_db
from app.models.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectItem,
    ProjectDetail,
    LogoPlacement,
    LogoItem,
    ImageItem,
    MaskRegion,
)
from app.core.config import settings

import shutil
from PIL import Image

router = APIRouter()

def build_image_item(row: dict) -> ImageItem:
    custom_settings = None
    if row.get("custom_settings"):
        try:
            custom_settings = LogoPlacement(**json.loads(row["custom_settings"]))
        except Exception:
            pass
            
    mask_data = None
    if row.get("mask_data"):
        try:
            raw_masks = json.loads(row["mask_data"])
            mask_data = [MaskRegion(**m) for m in raw_masks]
        except Exception:
            pass

    return ImageItem(
        id=row["id"],
        project_id=row["project_id"],
        original_filename=row["original_filename"],
        url=f"/static/uploads/{row['stored_filename']}",
        thumbnail_url=f"/static/thumbnails/{row['thumbnail_filename']}",
        width=row["width"],
        height=row["height"],
        file_size=row["file_size"],
        status=row["status"],
        error_message=row.get("error_message"),
        custom_settings=custom_settings,
        mask_data=mask_data,
        inpainting_method=row.get("inpainting_method", "telea"),
        processed_url=f"/static/processed/{row['processed_filename']}" if row.get("processed_filename") else None,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )

def build_logo_item(row: dict) -> LogoItem:
    return LogoItem(
        id=row["id"],
        project_id=row["project_id"],
        original_filename=row["original_filename"],
        url=f"/static/logos/{row['stored_filename']}",
        width=row["width"],
        height=row["height"],
        file_size=row["file_size"],
        has_alpha=bool(row["has_alpha"]),
        created_at=row["created_at"],
    )

@router.get("", response_model=list[ProjectItem])
def list_projects():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.*,
                   (SELECT COUNT(*) FROM images WHERE project_id = p.id) as images_count,
                   (SELECT COUNT(*) FROM images WHERE project_id = p.id AND status = 'completed') as processed_count,
                   l.id as logo_id, l.original_filename as logo_name, l.stored_filename as logo_file,
                   l.width as logo_w, l.height as logo_h, l.file_size as logo_size, l.has_alpha as logo_alpha,
                   l.created_at as logo_created
            FROM projects p
            LEFT JOIN logos l ON l.project_id = p.id
            ORDER BY p.updated_at DESC
        """)
        rows = cursor.fetchall()
        
        projects = []
        for r in rows:
            global_settings = LogoPlacement()
            if r.get("global_settings"):
                try:
                    global_settings = LogoPlacement(**json.loads(r["global_settings"]))
                except Exception:
                    pass
                    
            logo = None
            if r.get("logo_id"):
                logo = LogoItem(
                    id=r["logo_id"],
                    project_id=r["id"],
                    original_filename=r["logo_name"],
                    url=f"/static/logos/{r['logo_file']}",
                    width=r["logo_w"],
                    height=r["logo_h"],
                    file_size=r["logo_size"],
                    has_alpha=bool(r["logo_alpha"]),
                    created_at=r["logo_created"],
                )
                
            projects.append(ProjectItem(
                id=r["id"],
                name=r["name"],
                description=r["description"] or "",
                global_settings=global_settings,
                images_count=r["images_count"],
                processed_count=r["processed_count"],
                logo=logo,
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            ))
        return projects

@router.post("", response_model=ProjectItem)
def create_project(data: ProjectCreate):
    proj_id = uuid.uuid4().hex[:10]
    now = datetime.utcnow().isoformat()
    # Default to placing logo centered over watermark with optimal scale and luxury drop shadow
    default_settings_obj = LogoPlacement(
        x=0.50,
        y=0.48,
        scale=0.42,
        opacity=1.0,
        shadow=True,
        shadow_blur=10.0,
        shadow_opacity=0.60,
        shadow_offset_x=2.0,
        shadow_offset_y=6.0,
    )
    default_settings = default_settings_obj.model_dump_json()
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO projects (id, name, description, global_settings, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (proj_id, data.name, data.description or "", default_settings, now, now))
        
        # Auto-provision default logo (prefer Junnu Mukka if available, else Savecus)
        junnu_src = settings.LOGOS_DIR / "junnu_mukka_transparent.png"
        default_logo_src = junnu_src if junnu_src.exists() else (settings.LOGOS_DIR / "default_savecus_logo.png")
        logo_item = None
        if default_logo_src.exists():
            dest_filename = f"junnu_mukka_{proj_id}.png" if default_logo_src == junnu_src else f"savecus_logo_{proj_id}.png"
            display_name = "Junnu_Mukka_Sarees_Logo.png" if default_logo_src == junnu_src else "Savecus_Official_Logo.png"
            dest_path = settings.LOGOS_DIR / dest_filename
            shutil.copyfile(default_logo_src, dest_path)
            
            with Image.open(dest_path) as limg:
                lw, lh = limg.size
                has_alpha = limg.mode in ("RGBA", "LA")
                
            logo_id = uuid.uuid4().hex[:12]
            cursor.execute("""
                INSERT INTO logos (
                    id, project_id, original_filename, stored_filename,
                    width, height, file_size, has_alpha, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (logo_id, proj_id, display_name, dest_filename, lw, lh, dest_path.stat().st_size, 1 if has_alpha else 0, now))
            
            logo_item = LogoItem(
                id=logo_id,
                project_id=proj_id,
                original_filename=display_name,
                url=f"/static/logos/{dest_filename}",
                width=lw,
                height=lh,
                file_size=dest_path.stat().st_size,
                has_alpha=has_alpha,
                created_at=now,
            )
        
    return ProjectItem(
        id=proj_id,
        name=data.name,
        description=data.description or "",
        global_settings=default_settings_obj,
        images_count=0,
        processed_count=0,
        logo=logo_item,
        created_at=now,
        updated_at=now,
    )

@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(project_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        proj = cursor.fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found")
            
        cursor.execute("SELECT * FROM logos WHERE project_id = ?", (project_id,))
        logo_row = cursor.fetchone()
        logo = build_logo_item(logo_row) if logo_row else None
        
        cursor.execute("SELECT * FROM images WHERE project_id = ? ORDER BY created_at ASC", (project_id,))
        img_rows = cursor.fetchall()
        images = [build_image_item(r) for r in img_rows]
        
        global_settings = LogoPlacement()
        if proj.get("global_settings"):
            try:
                global_settings = LogoPlacement(**json.loads(proj["global_settings"]))
            except Exception:
                pass
                
        processed_count = sum(1 for img in images if img.status == "completed")
        
        return ProjectDetail(
            id=proj["id"],
            name=proj["name"],
            description=proj["description"] or "",
            global_settings=global_settings,
            images_count=len(images),
            processed_count=processed_count,
            logo=logo,
            images=images,
            created_at=proj["created_at"],
            updated_at=proj["updated_at"],
        )

@router.put("/{project_id}", response_model=ProjectItem)
def update_project(project_id: str, data: ProjectUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        proj = cursor.fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found")
            
        now = datetime.utcnow().isoformat()
        name = data.name if data.name is not None else proj["name"]
        description = data.description if data.description is not None else proj["description"]
        global_settings_str = (
            data.global_settings.model_dump_json()
            if data.global_settings is not None
            else proj["global_settings"]
        )
        
        cursor.execute("""
            UPDATE projects
            SET name = ?, description = ?, global_settings = ?, updated_at = ?
            WHERE id = ?
        """, (name, description, global_settings_str, now, project_id))
        
        # Fetch updated counts and logo
        cursor.execute("SELECT COUNT(*) as cnt FROM images WHERE project_id = ?", (project_id,))
        images_count = cursor.fetchone()["cnt"]
        cursor.execute("SELECT COUNT(*) as cnt FROM images WHERE project_id = ? AND status = 'completed'", (project_id,))
        processed_count = cursor.fetchone()["cnt"]
        
        cursor.execute("SELECT * FROM logos WHERE project_id = ?", (project_id,))
        logo_row = cursor.fetchone()
        logo = build_logo_item(logo_row) if logo_row else None
        
        global_settings = LogoPlacement(**json.loads(global_settings_str))
        
        return ProjectItem(
            id=project_id,
            name=name,
            description=description,
            global_settings=global_settings,
            images_count=images_count,
            processed_count=processed_count,
            logo=logo,
            created_at=proj["created_at"],
            updated_at=now,
        )

# VSC (Vinay Sarees Centre) logo presets: key -> (asset file, display label)
LOGO_VARIANTS = {
    "black": ("default_savecus_logo.png", "Black"),
    "gold": ("gold_savecus_logo.png", "Gold"),
    "red": ("red_savecus_logo.png", "Red"),
    "blue": ("blue_savecus_logo.png", "Royal_Blue"),
    "orange": ("orange_savecus_logo.png", "Orange"),
    "white_bg": ("white_bg_savecus_logo.png", "Black_On_White"),
    "red_bg": ("red_bg_savecus_logo.png", "Red_On_White"),
}


@router.post("/{project_id}/logo-variant", response_model=LogoItem)
def switch_logo_variant(project_id: str, variant: str = "black"):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")
            
        variant_lower = (variant or "black").lower()
        if "junnu" in variant_lower or "mukka" in variant_lower:
            src_file = "junnu_mukka_transparent.png"
            dest_filename = f"junnu_mukka_{project_id}.png"
            display_name = "Junnu_Mukka_Sarees_Logo.png"
        else:
            matched_key = None
            if variant_lower in LOGO_VARIANTS:
                matched_key = variant_lower
            else:
                for k in LOGO_VARIANTS:
                    if k in variant_lower:
                        matched_key = k
                        break
            if matched_key:
                src_file, label = LOGO_VARIANTS[matched_key]
                dest_filename = f"savecus_{matched_key}_{project_id}.png"
                display_name = f"Savecus_{label}_Logo.png"
            else:
                src_file = "default_savecus_logo.png"
                dest_filename = f"savecus_black_{project_id}.png"
                display_name = "Savecus_Black_Logo.png"

        src_path = settings.LOGOS_DIR / src_file
        if not src_path.exists():
            raise HTTPException(status_code=404, detail=f"Variant {variant} asset not found")
            
        cursor.execute("SELECT * FROM logos WHERE project_id = ?", (project_id,))
        existing_logo = cursor.fetchone()
        
        dest_path = settings.LOGOS_DIR / dest_filename
        shutil.copyfile(src_path, dest_path)
        
        with Image.open(dest_path) as limg:
            lw, lh = limg.size
            has_alpha = limg.mode in ("RGBA", "LA")
            
        now = datetime.utcnow().isoformat()
        if existing_logo:
            cursor.execute("""
                UPDATE logos
                SET original_filename = ?, stored_filename = ?, width = ?, height = ?, file_size = ?, has_alpha = ?
                WHERE id = ?
            """, (display_name, dest_filename, lw, lh, dest_path.stat().st_size, 1 if has_alpha else 0, existing_logo["id"]))
            logo_id = existing_logo["id"]
        else:
            logo_id = uuid.uuid4().hex[:12]
            cursor.execute("""
                INSERT INTO logos (
                    id, project_id, original_filename, stored_filename,
                    width, height, file_size, has_alpha, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (logo_id, project_id, display_name, dest_filename, lw, lh, dest_path.stat().st_size, 1 if has_alpha else 0, now))
            
        cursor.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, project_id))
        
        return LogoItem(
            id=logo_id,
            project_id=project_id,
            original_filename=display_name,
            url=f"/static/logos/{dest_filename}",
            width=lw,
            height=lh,
            file_size=dest_path.stat().st_size,
            has_alpha=has_alpha,
            created_at=now,
        )

@router.delete("/{project_id}")
def delete_project(project_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        proj = cursor.fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found")
            
        # Delete associated files
        cursor.execute("SELECT stored_filename, thumbnail_filename, processed_filename FROM images WHERE project_id = ?", (project_id,))
        images = cursor.fetchall()
        for img in images:
            if img["stored_filename"]:
                (settings.UPLOADS_DIR / img["stored_filename"]).unlink(missing_ok=True)
            if img["thumbnail_filename"]:
                (settings.THUMBNAILS_DIR / img["thumbnail_filename"]).unlink(missing_ok=True)
            if img["processed_filename"]:
                (settings.PROCESSED_DIR / img["processed_filename"]).unlink(missing_ok=True)
                
        cursor.execute("SELECT stored_filename FROM logos WHERE project_id = ?", (project_id,))
        logo = cursor.fetchone()
        if logo and logo["stored_filename"]:
            (settings.LOGOS_DIR / logo["stored_filename"]).unlink(missing_ok=True)
            
        cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        
    return {"message": "Project deleted successfully", "id": project_id}

