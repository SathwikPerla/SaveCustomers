import math
import numpy as np
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps
from app.models.schemas import LogoPlacement
from app.core.config import settings

def apply_blend_mode(base: Image.Image, overlay: Image.Image, position: tuple[int, int], blend_mode: str) -> Image.Image:
    """
    Pastes overlay onto base at position using alpha compositing or specific blend mode.
    Both base and overlay are assumed to be RGBA.
    """
    if blend_mode == "normal" or blend_mode == "source-over":
        base.paste(overlay, position, mask=overlay)
        return base
        
    # Crop the base region that overlaps with overlay
    bx, by = position
    bw, bh = overlay.size
    
    # Calculate overlap bounds
    x1 = max(0, bx)
    y1 = max(0, by)
    x2 = min(base.width, bx + bw)
    y2 = min(base.height, by + bh)
    
    if x2 <= x1 or y2 <= y1:
        return base
        
    crop_w = x2 - x1
    crop_h = y2 - y1
    
    base_crop = base.crop((x1, y1, x2, y2))
    overlay_crop = overlay.crop((x1 - bx, y1 - by, x1 - bx + crop_w, y1 - by + crop_h))
    
    b_arr = np.array(base_crop, dtype=np.float32) / 255.0
    o_arr = np.array(overlay_crop, dtype=np.float32) / 255.0
    
    # Separate color and alpha
    b_rgb = b_arr[:, :, :3]
    b_a = b_arr[:, :, 3:4]
    
    o_rgb = o_arr[:, :, :3]
    o_a = o_arr[:, :, 3:4]
    
    if blend_mode == "multiply":
        blended_rgb = b_rgb * o_rgb
    elif blend_mode == "screen":
        blended_rgb = 1.0 - (1.0 - b_rgb) * (1.0 - o_rgb)
    elif blend_mode == "overlay":
        mask = b_rgb < 0.5
        blended_rgb = np.zeros_like(b_rgb)
        blended_rgb[mask] = 2.0 * b_rgb[mask] * o_rgb[mask]
        blended_rgb[~mask] = 1.0 - 2.0 * (1.0 - b_rgb[~mask]) * (1.0 - o_rgb[~mask])
    else:
        blended_rgb = o_rgb

    # Standard alpha composite between b_rgb and blended_rgb using o_a
    final_rgb = blended_rgb * o_a + b_rgb * (1.0 - o_a)
    final_a = np.clip(b_a + o_a * (1.0 - b_a), 0.0, 1.0)
    
    result_arr = np.concatenate([final_rgb, final_a], axis=2)
    result_img = Image.fromarray((result_arr * 255.0).astype(np.uint8), mode="RGBA")
    
    base.paste(result_img, (x1, y1))
    return base

def composite_logo_on_image(
    base_image_path: Path,
    logo_path: Path,
    output_path: Path,
    placement: LogoPlacement,
    output_format: str = "JPEG",
    quality: int = 92,
) -> Path:
    """
    Renders the logo onto the base image using exact normalized coordinates.
    Matches the frontend Konva transform calculations.
    """
    with Image.open(base_image_path) as base_img_raw, Image.open(logo_path) as logo_img_raw:
        base_img = ImageOps.exif_transpose(base_img_raw).convert("RGBA")
        logo_img = ImageOps.exif_transpose(logo_img_raw).convert("RGBA")
        
        base_w, base_h = base_img.size
        logo_orig_w, logo_orig_h = logo_img.size
        
        if not placement.show_logo:
            # No logo wanted: just save the (healed) photo as-is
            fmt = output_format.upper()
            if fmt in ("JPEG", "JPG"):
                base_img.convert("RGB").save(output_path, "JPEG", quality=quality, optimize=True)
            elif fmt == "WEBP":
                base_img.save(output_path, "WEBP", quality=quality)
            else:
                base_img.save(output_path, "PNG", optimize=True)
            return output_path

        # Calculate target logo dimensions based on normalized scale
        target_logo_w = max(4, int(round(placement.scale * base_w)))
        logo_aspect = logo_orig_w / logo_orig_h if logo_orig_h > 0 else 1.0
        target_logo_h = max(4, int(round(target_logo_w / logo_aspect)))
        
        # Resize logo with high quality Lanczos filter
        resized_logo = logo_img.resize((target_logo_w, target_logo_h), Image.Resampling.LANCZOS)
        
        # Apply opacity
        if placement.opacity < 1.0:
            r, g, b, a = resized_logo.split()
            a = a.point(lambda p: int(p * placement.opacity))
            resized_logo = Image.merge("RGBA", (r, g, b, a))
            
        # Apply rotation (expand=True so corners aren't clipped)
        # Note: Konva rotates clockwise for positive angles; PIL rotates counter-clockwise for positive angles
        if placement.rotation != 0:
            resized_logo = resized_logo.rotate(
                -placement.rotation,
                resample=Image.Resampling.BICUBIC,
                expand=True
            )
            
        rot_w, rot_h = resized_logo.size
        
        # Calculate top-left placement coordinates from normalized center (x, y)
        center_x = placement.x * base_w
        center_y = placement.y * base_h
        
        paste_x = int(round(center_x - rot_w / 2))
        paste_y = int(round(center_y - rot_h / 2))
        
        # Drop shadow if enabled
        if placement.shadow:
            shadow_offset_x = int(round(placement.shadow_offset_x * (base_w / 800.0)))
            shadow_offset_y = int(round(placement.shadow_offset_y * (base_w / 800.0)))
            shadow_blur = max(1.0, placement.shadow_blur * (base_w / 800.0))
            
            # Create shadow mask from rotated logo alpha
            shadow_img = Image.new("RGBA", (rot_w, rot_h), (0, 0, 0, 0))
            logo_alpha = resized_logo.split()[3]
            shadow_alpha = logo_alpha.point(lambda p: int(p * placement.shadow_opacity))
            shadow_color = Image.new("RGBA", (rot_w, rot_h), (0, 0, 0, 255))
            shadow_img.paste(shadow_color, mask=shadow_alpha)
            shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(shadow_blur))
            
            base_img.paste(
                shadow_img,
                (paste_x + shadow_offset_x, paste_y + shadow_offset_y),
                mask=shadow_img
            )
            
        # Composite logo with blend mode
        apply_blend_mode(base_img, resized_logo, (paste_x, paste_y), placement.blend_mode)
        
        # Save output in specified format
        output_format_upper = output_format.upper()
        if output_format_upper in ("JPEG", "JPG"):
            final_img = base_img.convert("RGB")
            final_img.save(output_path, "JPEG", quality=quality, optimize=True)
        elif output_format_upper == "WEBP":
            base_img.save(output_path, "WEBP", quality=quality)
        else:
            base_img.save(output_path, "PNG", optimize=True)
            
        return output_path

