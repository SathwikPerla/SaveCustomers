import cv2
import numpy as np
from abc import ABC, abstractmethod
from pathlib import Path
from PIL import Image
from app.models.schemas import MaskRegion
from app.core.config import settings

class BaseInpainter(ABC):
    @abstractmethod
    def inpaint(self, image_bgr: np.ndarray, mask_gray: np.ndarray) -> np.ndarray:
        """
        Takes BGR image and single-channel 8-bit mask (255 where inpainting is needed).
        Returns reconstructed BGR image.
        """
        pass

class SnapseedHealingInpainter(BaseInpainter):
    """
    True Snapseed-style isotropic healing and exemplar texture-cloning inpainter.
    Eliminates ugly 1D directional stretching, blur patches, and vertical barcode stripes.
    
    1. For localized regions & brush strokes:
       Multi-scale isotropic inpainting using adaptive neighborhood radius (scaled via distance
       transform), dual-pass Navier-Stokes fluid isophote continuation and Telea fast marching,
       followed by bilateral texture smoothing. Propagates surrounding context naturally from all
       360-degree directions with zero directional bias.
       
    2. For rectangular boxes & large compact regions:
       Exemplar patch sampling with boundary matching score + Poisson boundary blending
       (cv2.seamlessClone) that clones realistic neighboring fabric weave & floral textures
       with exact Dirichlet boundary satisfaction and zero seam lines.
    """

    def _inpaint_roi_multiscale(self, img_roi: np.ndarray, mask_roi: np.ndarray, radius: int) -> np.ndarray:
        rh, rw = img_roi.shape[:2]
        if rw < 8 or rh < 8:
            return cv2.inpaint(img_roi, mask_roi, inpaintRadius=max(3, radius), flags=cv2.INPAINT_TELEA)
            
        down_w = max(4, rw // 2)
        down_h = max(4, rh // 2)
        roi_down = cv2.resize(img_roi, (down_w, down_h), interpolation=cv2.INTER_AREA)
        mask_down = cv2.resize(mask_roi, (down_w, down_h), interpolation=cv2.INTER_NEAREST)
        
        # Coarse pass: capture macro color gradients and overall structural continuity
        coarse_down = cv2.inpaint(roi_down, mask_down, inpaintRadius=max(3, radius // 2), flags=cv2.INPAINT_TELEA)
        coarse_up = cv2.resize(coarse_down, (rw, rh), interpolation=cv2.INTER_CUBIC)
        
        # Guided full-resolution input
        guided = np.where(mask_roi[:, :, None] == 255, coarse_up, img_roi)
        
        # Dual solver: Navier-Stokes (preserves edge gradients) + Telea (smooth fast-marching)
        inp_ns = cv2.inpaint(guided, mask_roi, inpaintRadius=radius, flags=cv2.INPAINT_NS)
        inp_telea = cv2.inpaint(guided, mask_roi, inpaintRadius=radius, flags=cv2.INPAINT_TELEA)
        fused = (0.5 * inp_ns.astype(np.float32) + 0.5 * inp_telea.astype(np.float32)).astype(np.uint8)
        
        # Edge-preserving bilateral polish: smooths inpainting noise without blurring real fabric weave
        d = min(9, max(5, radius))
        bilat = cv2.bilateralFilter(fused, d=d, sigmaColor=35, sigmaSpace=35)
        
        # Feather mask boundary for seamless integration
        feather = cv2.GaussianBlur(mask_roi.astype(np.float32) / 255.0, (7, 7), 0)[:, :, None]
        return (bilat.astype(np.float32) * feather + img_roi.astype(np.float32) * (1.0 - feather)).astype(np.uint8)

    def _inpaint_box_exemplar(
        self,
        img: np.ndarray,
        full_mask: np.ndarray,
        comp_mask: np.ndarray,
        x: int,
        y: int,
        rw: int,
        rh: int
    ) -> np.ndarray:
        h, w = img.shape[:2]
        B = max(8, min(32, min(rw, rh) // 6))
        
        y1, y2 = y, y + rh
        x1, x2 = x, x + rw
        
        # Target boundary context for color and texture matching
        y1_pad, y2_pad = max(0, y1 - B), min(h, y2 + B)
        x1_pad, x2_pad = max(0, x1 - B), min(w, x2 + B)
        
        target_roi = img[y1_pad:y2_pad, x1_pad:x2_pad]
        target_mask_roi = full_mask[y1_pad:y2_pad, x1_pad:x2_pad]
        clean_target = target_roi[target_mask_roi == 0]
        
        if clean_target.size > 0:
            target_mean = np.mean(clean_target, axis=0)
        else:
            target_mean = np.mean(img[y1:y2, x1:x2], axis=(0, 1))
            
        target_top = img[max(0, y1 - B):y1, x1:x2]
        target_bot = img[y2:min(h, y2 + B), x1:x2]
        
        # Search candidate exemplar patches in neighboring clean fabric
        shifts_x = [int(f * rw) for f in [-1.5, -1.2, -1.0, -0.6, 0.6, 1.0, 1.2, 1.5]]
        shifts_y = [int(f * rh) for f in [-1.5, -1.2, -1.0, -0.6, 0, 0.6, 1.0, 1.2, 1.5]]
        
        best_score = float('inf')
        best_patch = None
        
        for dx in shifts_x:
            for dy in shifts_y:
                sx = x1 + dx
                sy = y1 + dy
                if sx < 0 or sx + rw > w or sy < 0 or sy + rh > h:
                    continue
                # Ensure candidate does not overlap any inpainting mask
                if np.any(full_mask[sy:sy+rh, sx:sx+rw] > 0):
                    continue
                    
                cand_crop = img[sy:sy+rh, sx:sx+rw]
                cand_mean = np.mean(cand_crop, axis=(0, 1))
                color_diff = np.linalg.norm(cand_mean - target_mean)
                
                # Check candidate border ring
                c_y1_pad, c_y2_pad = max(0, sy - B), min(h, sy + rh + B)
                c_x1_pad, c_x2_pad = max(0, sx - B), min(w, sx + rw + B)
                cand_outer = img[c_y1_pad:c_y2_pad, c_x1_pad:c_x2_pad]
                cand_mask_outer = full_mask[c_y1_pad:c_y2_pad, c_x1_pad:c_x2_pad]
                clean_cand = cand_outer[cand_mask_outer == 0]
                
                if clean_cand.size > 0:
                    cand_outer_mean = np.mean(clean_cand, axis=0)
                    border_diff = np.linalg.norm(cand_outer_mean - target_mean)
                else:
                    border_diff = color_diff
                    
                # Border boundary edge alignment
                c_top = img[max(0, sy - B):sy, sx:sx+rw]
                c_bot = img[sy+rh:min(h, sy+rh+B), sx:sx+rw]
                border_err = 0.0
                if c_top.shape == target_top.shape and target_top.size > 0:
                    border_err += float(np.mean(np.abs(c_top.astype(np.float32) - target_top.astype(np.float32))))
                if c_bot.shape == target_bot.shape and target_bot.size > 0:
                    border_err += float(np.mean(np.abs(c_bot.astype(np.float32) - target_bot.astype(np.float32))))
                    
                dist = np.sqrt(dx**2 + dy**2)
                score = border_diff + 1.2 * color_diff + 0.3 * border_err + 0.005 * dist
                if score < best_score:
                    best_score = score
                    best_patch = cand_crop
                    
        if best_patch is not None:
            center = (x1 + rw // 2, y1 + rh // 2)
            # Poisson seamless clone if within safe margins
            if x1 > 2 and y1 > 2 and x2 < w - 2 and y2 < h - 2:
                src_canvas = img.copy()
                src_canvas[y1:y2, x1:x2] = best_patch
                try:
                    return cv2.seamlessClone(src_canvas, img, comp_mask, center, cv2.NORMAL_CLONE)
                except Exception:
                    pass
                    
            # Fallback: color-adjusted feathered blend
            color_shift = target_mean - np.mean(best_patch, axis=(0, 1))
            adjusted = np.clip(best_patch.astype(np.float32) + color_shift, 0, 255).astype(np.uint8)
            feather = cv2.GaussianBlur(comp_mask[y1:y2, x1:x2].astype(np.float32) / 255.0, (15, 15), 0)[:, :, None]
            result = img.copy()
            result[y1:y2, x1:x2] = (adjusted.astype(np.float32) * feather + img[y1:y2, x1:x2].astype(np.float32) * (1.0 - feather)).astype(np.uint8)
            return result
            
        # Fallback to multi-scale isotropic inpainting if no clean exemplar patch found
        pad = max(16, min(rw, rh) // 4)
        ry1, ry2 = max(0, y1 - pad), min(h, y2 + pad)
        rx1, rx2 = max(0, x1 - pad), min(w, x2 + pad)
        radius = max(5, int(min(rw, rh) * 0.1))
        healed_roi = self._inpaint_roi_multiscale(img[ry1:ry2, rx1:rx2], comp_mask[ry1:ry2, rx1:rx2], radius)
        result = img.copy()
        result[ry1:ry2, rx1:rx2] = healed_roi
        return result

    def inpaint(self, image_bgr: np.ndarray, mask_gray: np.ndarray) -> np.ndarray:
        if mask_gray is None or not np.any(mask_gray > 0):
            return image_bgr.copy()
            
        h, w = image_bgr.shape[:2]
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask_gray, connectivity=8)
        result = image_bgr.copy()
        
        for i in range(1, num_labels):
            x = stats[i, cv2.CC_STAT_LEFT]
            y = stats[i, cv2.CC_STAT_TOP]
            rw = stats[i, cv2.CC_STAT_WIDTH]
            rh = stats[i, cv2.CC_STAT_HEIGHT]
            area = stats[i, cv2.CC_STAT_AREA]
            
            if area < 2 or rw < 1 or rh < 1:
                continue
                
            comp_mask = (labels == i).astype(np.uint8) * 255
            fill_ratio = area / float(rw * rh)
            
            # Rectangular boxes vs brush strokes / localized regions
            is_rect_box = (fill_ratio >= 0.70 and rw >= 14 and rh >= 14 and area >= 196)
            
            if is_rect_box:
                result = self._inpaint_box_exemplar(result, mask_gray, comp_mask, x, y, rw, rh)
            else:
                pad = max(12, int(max(rw, rh) * 0.15))
                y1, y2 = max(0, y - pad), min(h, y + rh + pad)
                x1, x2 = max(0, x - pad), min(w, x + rw + pad)
                
                dist = cv2.distanceTransform(comp_mask[y1:y2, x1:x2], cv2.DIST_L2, 5)
                max_d = float(np.max(dist)) if dist.size > 0 else 3.0
                radius = int(np.clip(max_d * 1.5 + 2, 3, 20))
                
                healed_roi = self._inpaint_roi_multiscale(result[y1:y2, x1:x2], comp_mask[y1:y2, x1:x2], radius)
                result[y1:y2, x1:x2] = healed_roi
                
        return result

class DirectionalSeamInpainter(SnapseedHealingInpainter):
    """
    Backward-compatible subclass alias pointing to SnapseedHealingInpainter.
    Prevents any vertical barcode stretching across floral prints or saree fabrics.
    """
    pass

class OpenCVTeleaInpainter(BaseInpainter):
    def inpaint(self, image_bgr: np.ndarray, mask_gray: np.ndarray) -> np.ndarray:
        h, w = image_bgr.shape[:2]
        radius = max(3, int(min(h, w) * 0.005))
        return cv2.inpaint(image_bgr, mask_gray, inpaintRadius=radius, flags=cv2.INPAINT_TELEA)

class OpenCVNavierStokesInpainter(BaseInpainter):
    def inpaint(self, image_bgr: np.ndarray, mask_gray: np.ndarray) -> np.ndarray:
        h, w = image_bgr.shape[:2]
        radius = max(3, int(min(h, w) * 0.005))
        return cv2.inpaint(image_bgr, mask_gray, inpaintRadius=radius, flags=cv2.INPAINT_NS)

class GenerativeAIInpainter(BaseInpainter):
    """
    Modular Generative AI inpainter.
    Falls back gracefully to the Snapseed Healing Inpainter.
    """
    def inpaint(self, image_bgr: np.ndarray, mask_gray: np.ndarray) -> np.ndarray:
        return SnapseedHealingInpainter().inpaint(image_bgr, mask_gray)

def get_inpainter(method: str) -> BaseInpainter:
    method_lower = (method or "clean_structure").lower()
    if method_lower in (
        "clean_structure",
        "telea",
        "healing",
        "brush",
        "snapseed",
        "structure",
        "seam",
        "clean",
        "smart",
    ):
        return SnapseedHealingInpainter()
    elif method_lower in ("ns", "navier_stokes"):
        return OpenCVNavierStokesInpainter()
    elif method_lower in ("ai", "generative"):
        return GenerativeAIInpainter()
    return SnapseedHealingInpainter()

def generate_binary_mask(image_shape: tuple[int, int], mask_regions: list[MaskRegion]) -> np.ndarray:
    """
    Converts list of normalized mask regions to a binary 8-bit mask (255 for removal, 0 for keep).
    """
    height, width = image_shape[:2]
    mask = np.zeros((height, width), dtype=np.uint8)
    
    for r in mask_regions:
        if r.type == "rect" and r.x is not None and r.y is not None and r.width and r.height:
            rx = int(round(r.x * width))
            ry = int(round(r.y * height))
            rw = int(round(r.width * width))
            rh = int(round(r.height * height))
            
            # Clamp bounds
            x1 = max(0, rx)
            y1 = max(0, ry)
            x2 = min(width, rx + rw)
            y2 = min(height, ry + rh)
            
            if x2 > x1 and y2 > y1:
                cv2.rectangle(mask, (x1, y1), (x2, y2), 255, -1)
                
        elif r.type in ("brush", "polygon") and r.points and len(r.points) >= 4:
            pts = []
            for i in range(0, len(r.points), 2):
                px = int(round(r.points[i] * width))
                py = int(round(r.points[i + 1] * height))
                pts.append([px, py])
                
            pts_arr = np.array(pts, dtype=np.int32)
            stroke_thickness = max(6, int(round((r.stroke_width or 0.03) * width)))
            cv2.polylines(mask, [pts_arr], False, 255, stroke_thickness)
            
    # Dilate mask slightly to prevent boundary fringing / ghost borders
    dilation_size = max(2, int(min(width, height) * 0.002))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilation_size * 2 + 1, dilation_size * 2 + 1))
    mask = cv2.dilate(mask, kernel, iterations=1)
    
    return mask

def inpaint_image_file(
    image_path: Path,
    output_path: Path,
    mask_regions: list[MaskRegion],
    method: str = "clean_structure"
) -> Path:
    """
    Reads image, generates mask, performs Snapseed healing reconstruction, and writes output.
    """
    img = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Could not read image file at {image_path}")
        
    mask = generate_binary_mask(img.shape[:2], mask_regions)
    inpainter = get_inpainter(method)
    result = inpainter.inpaint(img, mask)
    
    cv2.imwrite(str(output_path), result, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    return output_path
