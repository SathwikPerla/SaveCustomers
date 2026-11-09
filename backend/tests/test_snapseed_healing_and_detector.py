import cv2
import numpy as np
import pytest
from pathlib import Path
from PIL import Image, ImageDraw

from app.services.inpainting_service import (
    SnapseedHealingInpainter,
    DirectionalSeamInpainter,
    get_inpainter,
    generate_binary_mask,
    inpaint_image_file,
)
from app.services.logo_detector import detect_candidate_logo_regions
from app.models.schemas import MaskRegion

SAREE_PATH = (
    Path("data/uploads/WhatsApp Image 2026-11-08 at 1_759841a8c9a2.jpeg")
    if Path("data/uploads/WhatsApp Image 2026-11-08 at 1_759841a8c9a2.jpeg").exists()
    else Path("backend/data/uploads/WhatsApp Image 2026-11-08 at 1_759841a8c9a2.jpeg")
)

def test_inpainter_method_routing():
    """Verify clean_structure, telea, healing, and brush route to SnapseedHealingInpainter."""
    for method in ["clean_structure", "telea", "healing", "brush", "snapseed", "clean", "smart"]:
        inp = get_inpainter(method)
        assert isinstance(inp, SnapseedHealingInpainter), f"Expected SnapseedHealingInpainter for {method}"

def test_logo_detector_rejects_saree_floral_patterns():
    """Verify that logo_detector does NOT detect saree floral patterns as watermarks."""
    assert SAREE_PATH.exists(), f"Image {SAREE_PATH} must exist"
    res = detect_candidate_logo_regions(SAREE_PATH)
    # Saree floral patterns must not trigger false positive watermark boxes
    assert res.detected is False
    assert len(res.regions) == 0

def test_logo_detector_detects_high_confidence_watermark(tmp_path):
    """Verify that a high-contrast watermark in the corner is detected with at most 1 candidate."""
    img_pil = Image.new("RGB", (600, 400), (45, 85, 125))
    draw = ImageDraw.Draw(img_pil)
    draw.rectangle([480, 320, 570, 370], fill=(250, 250, 250))
    test_file = tmp_path / "watermark_sample.jpg"
    img_pil.save(test_file)
    
    res = detect_candidate_logo_regions(test_file)
    assert res.detected is True
    assert len(res.regions) == 1
    r = res.regions[0]
    # Check normalized coordinates are in the bottom right corner
    assert r.x > 0.70
    assert r.y > 0.70
    assert r.width > 0.05
    assert r.height > 0.05

def test_snapseed_box_exemplar_healing_no_barcode(tmp_path):
    """
    Test rectangular box inpainting on the user's saree image.
    Verifies that ZERO vertical barcode stripes are created (dx/dy ratio ~ 1.0).
    """
    assert SAREE_PATH.exists()
    saree = cv2.imread(str(SAREE_PATH))
    h, w = saree.shape[:2]
    
    # User's box coordinates from the bug report: x=0.3584, y=0.4186, w=0.3163, h=0.1576
    box_region = MaskRegion(
        id="box_test",
        type="rect",
        x=0.3584,
        y=0.4186,
        width=0.3163,
        height=0.1576,
    )
    
    out_file = tmp_path / "box_healed.jpg"
    inpaint_image_file(SAREE_PATH, out_file, [box_region], method="healing")
    assert out_file.exists()
    
    healed = cv2.imread(str(out_file))
    bx1 = int(0.3584 * w)
    by1 = int(0.4186 * h)
    bw = int(0.3163 * w)
    bh = int(0.1576 * h)
    
    crop = healed[by1:by1+bh, bx1:bx1+bw]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(float)
    
    # Calculate gradient ratios: vertical barcode would have dx >> dy (ratio > 3.0)
    dx = np.abs(gray[:-1, 1:] - gray[:-1, :-1])
    dy = np.abs(gray[1:, :-1] - gray[:-1, :-1])
    ratio = (np.mean(dx) + 1.0) / (np.mean(dy) + 1.0)
    
    # Natural isotropic texture should have ratio close to 1.0 (between 0.7 and 1.5)
    assert 0.7 <= ratio <= 1.5, f"Unexpected barcode streak ratio: {ratio}"
    # Standard deviation across channels should indicate rich texture, not flat or blurred stripes
    std_colors = np.std(crop, axis=(0, 1))
    assert np.all(std_colors > 25), f"Texture has insufficient variance: {std_colors}"

def test_snapseed_brush_stroke_healing_isotropic(tmp_path):
    """
    Test brush stroke inpainting on the saree floral pattern.
    Verifies isotropic 360-degree fill with no directional elongation.
    """
    assert SAREE_PATH.exists()
    saree = cv2.imread(str(SAREE_PATH))
    h, w = saree.shape[:2]
    
    # Brush stroke curving across floral print
    brush_region = MaskRegion(
        id="brush_test",
        type="brush",
        points=[0.40, 0.50, 0.45, 0.52, 0.48, 0.49, 0.53, 0.51],
        stroke_width=0.025,
    )
    
    out_file = tmp_path / "brush_healed.jpg"
    inpaint_image_file(SAREE_PATH, out_file, [brush_region], method="brush")
    assert out_file.exists()
    
    healed = cv2.imread(str(out_file))
    crop = healed[int(0.48 * h):int(0.53 * h), int(0.39 * w):int(0.54 * w)]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(float)
    
    dx = np.abs(gray[:-1, 1:] - gray[:-1, :-1])
    dy = np.abs(gray[1:, :-1] - gray[:-1, :-1])
    ratio = (np.mean(dx) + 1.0) / (np.mean(dy) + 1.0)
    
    assert 0.7 <= ratio <= 1.4, f"Brush stroke inpainting showed directional bias: ratio={ratio}"
