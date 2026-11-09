import cv2
import numpy as np
from pathlib import Path
from app.models.schemas import MaskRegion, DetectLogoResponse

def detect_candidate_logo_regions(image_path: Path) -> DetectLogoResponse:
    """
    Analyzes image edges and corners for high-confidence watermark or logo candidates.
    Distinguishes real stickers, badges, and sharp watermark text from natural floral patterns
    or repetitive fabric weaves. Returns at most 1 primary candidate, or detected=False if confidence is low.
    """
    img = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if img is None:
        return DetectLogoResponse(detected=False, regions=[], message="Failed to load image for detection")
        
    h, w = img.shape[:2]
    total_area = w * h
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Bilateral filter to smooth fabric weave while retaining sharp sticker/logo edges
    filtered = cv2.bilateralFilter(gray, 7, 50, 50)
    
    # Morphological gradient + Otsu thresholding for edge discovery
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    gradient = cv2.morphologyEx(filtered, cv2.MORPH_GRADIENT, kernel)
    _, thresh = cv2.threshold(gradient, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Close small gaps in letters / badge symbols
    close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, close_kernel)
    
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    candidates = []
    
    # Restrict to watermark zones: outer 22% margins
    margin_w = w * 0.22
    margin_h = h * 0.22
    
    for cnt in contours:
        x, y, cw, ch = cv2.boundingRect(cnt)
        box_area = cw * ch
        area_ratio = box_area / total_area
        
        # Real logos/stickers typically occupy between 0.2% and 8% of the image area
        if not (0.002 <= area_ratio <= 0.08):
            continue
            
        aspect = cw / ch if ch > 0 else 1.0
        if not (0.35 <= aspect <= 6.5):
            continue
            
        in_left = x < margin_w
        in_right = (x + cw) > (w - margin_w)
        in_top = y < margin_h
        in_bottom = (y + ch) > (h - margin_h)
        
        if not (in_left or in_right or in_top or in_bottom):
            continue
            
        is_corner = (in_left or in_right) and (in_top or in_bottom)
        
        # Sample surrounding ring around candidate to measure contrast against background
        pad = max(6, int(min(cw, ch) * 0.2))
        y1_pad = max(0, y - pad)
        y2_pad = min(h, y + ch + pad)
        x1_pad = max(0, x - pad)
        x2_pad = min(w, x + cw + pad)
        
        box_patch = img[y:y+ch, x:x+cw]
        pad_patch = img[y1_pad:y2_pad, x1_pad:x2_pad]
        
        mean_box = np.mean(box_patch, axis=(0, 1))
        ring_mask = np.ones((y2_pad - y1_pad, x2_pad - x1_pad), dtype=bool)
        oy = y - y1_pad
        ox = x - x1_pad
        ring_mask[oy:oy+ch, ox:ox+cw] = False
        
        if np.any(ring_mask):
            mean_surr = np.mean(pad_patch[ring_mask], axis=0)
        else:
            mean_surr = mean_box
            
        # Watermarks/stickers exhibit sharp contrast against local background
        contrast = np.linalg.norm(mean_box - mean_surr) / (np.sqrt(3) * 255.0)
        border_grad = np.mean(gradient[y:y+ch, x:x+cw]) / 255.0
        
        # Base confidence score
        score = contrast * 2.2 + border_grad * 1.0
        if is_corner:
            score *= 1.4
            
        candidates.append({
            'box': (x, y, cw, ch),
            'contrast': contrast,
            'is_corner': is_corner,
            'score': score,
            'y_norm': y / h,
            'x_norm': x / w,
        })
        
    # Periodic pattern suppression (saree borders with repeated floral motifs)
    if len(candidates) >= 3:
        for c in candidates:
            similar_y = sum(1 for other in candidates if abs(other['y_norm'] - c['y_norm']) < 0.05)
            if similar_y >= 3:
                c['score'] *= 0.2  # Heavily penalize repetitive decorative patterns
                
    # Strict confidence threshold to avoid false positives on decorative floral prints
    CONFIDENCE_THRESHOLD = 0.65
    valid_candidates = [c for c in candidates if c['score'] >= CONFIDENCE_THRESHOLD]
    valid_candidates.sort(key=lambda c: c['score'], reverse=True)
    
    if valid_candidates:
        # Return at most 1 primary candidate with highest confidence
        top = valid_candidates[0]
        x, y, cw, ch = top['box']
        pad_x = int(cw * 0.06)
        pad_y = int(ch * 0.06)
        rx = max(0, x - pad_x)
        ry = max(0, y - pad_y)
        rw = min(w - rx, cw + pad_x * 2)
        rh = min(h - ry, ch + pad_y * 2)
        
        region = MaskRegion(
            id="det_1",
            type="rect",
            x=round(rx / w, 4),
            y=round(ry / h, 4),
            width=round(rw / w, 4),
            height=round(rh / h, 4),
        )
        return DetectLogoResponse(
            detected=True,
            regions=[region],
            message="Detected 1 candidate logo region. You can refine or adjust the selection."
        )
    else:
        return DetectLogoResponse(
            detected=False,
            regions=[],
            message="No obvious watermark or logo found in typical corner regions. Please use the rectangle or brush tool to select the old logo."
        )
