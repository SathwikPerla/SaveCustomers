import io
import uuid
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageOps
from fastapi import HTTPException
from app.core.config import settings

def sanitize_filename(filename: str) -> str:
    cleaned = Path(filename).name
    # Strip any directory traversal chars
    cleaned = "".join(c for c in cleaned if c.isalnum() or c in "._- ")
    if not cleaned:
        cleaned = "unnamed"
    return cleaned

def get_unique_filename(original_filename: str) -> str:
    cleaned = sanitize_filename(original_filename)
    ext = Path(cleaned).suffix.lower()
    stem = Path(cleaned).stem[:30]
    unique_id = uuid.uuid4().hex[:12]
    return f"{stem}_{unique_id}{ext}"

def validate_and_save_image(content: bytes, original_filename: str) -> tuple[str, str, int, int, int]:
    """
    Validates uploaded image and generates thumbnail.
    Returns: (stored_filename, thumbnail_filename, width, height, file_size)
    """
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed (50MB)")
        
    ext = Path(original_filename).suffix.lower()
    if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format: {ext}. Allowed: {', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}"
        )
        
    try:
        with Image.open(io.BytesIO(content)) as img:
            # Handle EXIF orientation if present
            img = ImageOps.exif_transpose(img)
            width, height = img.size
            if width <= 0 or height <= 0:
                raise HTTPException(status_code=400, detail="Invalid image dimensions")
                
            stored_filename = get_unique_filename(original_filename)
            stored_path = settings.UPLOADS_DIR / stored_filename
            
            # Save original image
            with open(stored_path, "wb") as f:
                f.write(content)
                
            # Create thumbnail
            thumb_filename = f"thumb_{Path(stored_filename).stem}.jpg"
            thumb_path = settings.THUMBNAILS_DIR / thumb_filename
            
            thumb_img = img.copy()
            thumb_img.thumbnail((360, 360), Image.Resampling.LANCZOS)
            if thumb_img.mode in ("RGBA", "P", "LA"):
                # Convert to RGB with white background for thumbnail
                rgb_thumb = Image.new("RGB", thumb_img.size, (24, 24, 27))
                if thumb_img.mode == "RGBA":
                    rgb_thumb.paste(thumb_img, mask=thumb_img.split()[3])
                else:
                    rgb_thumb.paste(thumb_img.convert("RGB"))
                rgb_thumb.save(thumb_path, "JPEG", quality=85)
            else:
                thumb_img.convert("RGB").save(thumb_path, "JPEG", quality=85)
                
            return stored_filename, thumb_filename, width, height, len(content)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")

def make_image_transparent(img: Image.Image) -> tuple[Image.Image, bool]:
    """
    Intelligently extracts transparent background from logos with solid/near-white backgrounds.
    Uses connected-component border flood matting with anti-aliasing to preserve all
    inner artwork, white highlights, gold accents, and drop-shadows.
    Returns (transparent_image, was_modified).
    """
    # If image already has alpha and isn't predominantly opaque solid background
    if img.mode in ("RGBA", "LA", "P"):
        img_rgba = img.convert("RGBA")
        alpha_arr = np.array(img_rgba.getchannel("A"))
        if np.mean(alpha_arr < 250) > 0.05:
            # Already has meaningful transparency
            return img_rgba, False

    img_rgb = img.convert("RGB")
    arr = np.array(img_rgb)
    h, w = arr.shape[:2]

    # Sample corners to determine background color
    corners = np.vstack([
        arr[:10, :10].reshape(-1, 3),
        arr[:10, -10:].reshape(-1, 3),
        arr[-10:, :10].reshape(-1, 3),
        arr[-10:, -10:].reshape(-1, 3),
    ])
    bg_color = np.median(corners, axis=0)
    bg_std = np.std(corners, axis=0)

    # Check if corners are relatively uniform (standard deviation < 30)
    if np.max(bg_std) > 30:
        return img.convert("RGBA"), False

    # Special tuned candidate detection for light/white, dark, or generalized uniform solid background
    is_light_bg = np.mean(bg_color) > 190
    is_dark_bg = np.mean(bg_color) < 45

    import cv2
    img_bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

    if is_light_bg:
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        is_bg_candidate = (hsv[:, :, 1] < 25) & (hsv[:, :, 2] > 210) & (img_bgr[:, :, 0] > 200)
    elif is_dark_bg:
        is_bg_candidate = np.all(arr < 45, axis=2)
    else:
        # Generalized solid background: color distance from corner
        dist = np.linalg.norm(arr.astype(float) - bg_color[None, None, :], axis=2)
        is_bg_candidate = dist < 28

    mask_u8 = is_bg_candidate.astype(np.uint8) * 255
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask_u8, connectivity=8)

    bg_mask = np.zeros((h, w), dtype=np.uint8)
    border_labels = set()
    border_labels.update(labels[0, :])
    border_labels.update(labels[-1, :])
    border_labels.update(labels[:, 0])
    border_labels.update(labels[:, -1])
    border_labels.discard(0)

    for lbl in border_labels:
        bg_mask[labels == lbl] = 255

    # If background mask found enough background (> 3% of image)
    if np.mean(bg_mask == 255) < 0.03:
        return img.convert("RGBA"), False

    alpha = (255 - bg_mask).astype(np.float32)
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0.5)

    rgba = np.dstack([arr, np.clip(alpha, 0, 255).astype(np.uint8)])
    pil_rgba = Image.fromarray(rgba)
    
    # Auto-crop transparent padding
    bbox = pil_rgba.getbbox()
    if bbox:
        pil_rgba = pil_rgba.crop(bbox)

    return pil_rgba, True

def validate_and_save_logo(content: bytes, original_filename: str) -> tuple[str, int, int, int, bool]:
    """
    Validates, handles alpha/transparency, and saves uploaded logo.
    Automatically removes solid white/black backgrounds into transparent PNG.
    Returns: (stored_filename, width, height, file_size, has_alpha)
    """
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Logo file size exceeds 50MB limit")
        
    ext = Path(original_filename).suffix.lower()
    if ext not in settings.ALLOWED_LOGO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported logo format: {ext}. Allowed: {', '.join(settings.ALLOWED_LOGO_EXTENSIONS)}"
        )
        
    try:
        # If SVG
        if ext == ".svg":
            stored_filename = get_unique_filename(original_filename)
            stored_path = settings.LOGOS_DIR / stored_filename
            with open(stored_path, "wb") as f:
                f.write(content)
            # Default dimensions for SVG if cannot be parsed
            return stored_filename, 500, 500, len(content), True
            
        with Image.open(io.BytesIO(content)) as img:
            img = ImageOps.exif_transpose(img)
            
            # Intelligently extract transparent background if needed
            cleaned_img, was_made_transparent = make_image_transparent(img)
            
            # If was made transparent, save as PNG
            if was_made_transparent:
                stored_filename = get_unique_filename(Path(original_filename).stem + ".png")
                stored_path = settings.LOGOS_DIR / stored_filename
                cleaned_img.save(stored_path, format="PNG")
                file_size = stored_path.stat().st_size
                width, height = cleaned_img.size
                return stored_filename, width, height, file_size, True
            else:
                width, height = img.size
                has_alpha = img.mode in ("RGBA", "LA") or ("transparency" in img.info)
                stored_filename = get_unique_filename(original_filename)
                stored_path = settings.LOGOS_DIR / stored_filename
                with open(stored_path, "wb") as f:
                    f.write(content)
                return stored_filename, width, height, len(content), has_alpha
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse logo image: {str(e)}")
