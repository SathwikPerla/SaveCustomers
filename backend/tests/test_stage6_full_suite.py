import io
import time
import zipfile
import pytest
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def create_sample_image(w: int, h: int, bg_color: tuple, watermark_pos: tuple = None) -> bytes:
    img = Image.new("RGB", (w, h), bg_color)
    draw = ImageDraw.Draw(img)
    if watermark_pos:
        draw.rectangle(watermark_pos, fill=(240, 240, 240))
        draw.text((watermark_pos[0] + 5, watermark_pos[1] + 5), "OLD BRAND", fill=(20, 20, 20))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()

def create_transparent_logo(w: int = 240, h: int = 90) -> bytes:
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([10, 10, w - 10, h - 10], radius=12, fill=(14, 140, 233, 230))
    draw.text((25, h // 2 - 8), "REBRAND PRO", fill=(255, 255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def test_stage6_varying_resolutions_and_positions():
    """
    Tests varying resolutions (4K, portrait, square, ultrawide, standard)
    and various custom logo placements, rotations, and drop shadows.
    """
    res = client.post("/api/projects", json={"name": "Multi-Resolution Test"})
    proj_id = res.json()["id"]

    # Resolutions: 4K, vertical phone, square, ultrawide, standard
    resolutions = [
        ("4k_landscape.jpg", 3840, 2160, (50, 70, 90)),
        ("portrait_mobile.jpg", 1080, 1920, (120, 40, 60)),
        ("square_post.jpg", 1200, 1200, (40, 110, 80)),
        ("ultrawide_banner.jpg", 2560, 1080, (90, 80, 40)),
        ("standard_hd.jpg", 1280, 720, (70, 50, 110)),
    ]

    files = []
    for fname, w, h, col in resolutions:
        content = create_sample_image(w, h, col)
        files.append(("files", (fname, content, "image/jpeg")))

    res_upload = client.post(f"/api/projects/{proj_id}/images", files=files)
    assert res_upload.status_code == 200
    images = res_upload.json()
    assert len(images) == 5

    # Upload replacement logo
    logo_bytes = create_transparent_logo(300, 100)
    res_logo = client.post(f"/api/projects/{proj_id}/logo", files={"file": ("logo.png", logo_bytes, "image/png")})
    assert res_logo.status_code == 200
    assert res_logo.json()["has_alpha"] is True

    # Configure different positions on each image
    placements = [
        {"x": 0.1, "y": 0.1, "scale": 0.15, "rotation": 0.0, "opacity": 1.0, "blend_mode": "normal", "shadow": True}, # Top-left
        {"x": 0.85, "y": 0.1, "scale": 0.20, "rotation": -10.0, "opacity": 0.85, "blend_mode": "normal", "shadow": False}, # Top-right angled
        {"x": 0.5, "y": 0.5, "scale": 0.30, "rotation": 0.0, "opacity": 0.70, "blend_mode": "screen", "shadow": True}, # Center watermark
        {"x": 0.1, "y": 0.85, "scale": 0.18, "rotation": 45.0, "opacity": 1.0, "blend_mode": "multiply", "shadow": False}, # Bottom-left rotated
        {"x": 0.85, "y": 0.85, "scale": 0.22, "rotation": 0.0, "opacity": 0.95, "blend_mode": "normal", "shadow": True}, # Bottom-right
    ]

    for img, plc in zip(images, placements):
        res_cfg = client.put(
            f"/api/projects/{proj_id}/images/{img['id']}/config",
            json={"custom_settings": plc}
        )
        assert res_cfg.status_code == 200

        # Apply logo
        res_apply = client.post(f"/api/projects/{proj_id}/images/{img['id']}/apply-logo")
        assert res_apply.status_code == 200
        applied = res_apply.json()
        assert applied["status"] == "completed"
        assert applied["processed_url"] is not None

    # Test ZIP export containing all 5
    res_zip = client.get(f"/api/projects/{proj_id}/export/zip")
    assert res_zip.status_code == 200
    with zipfile.ZipFile(io.BytesIO(res_zip.content)) as zf:
        names = zf.namelist()
        assert len(names) == 5
        print(f"5-image multi-resolution test verified! ZIP contents: {names}")

    client.delete(f"/api/projects/{proj_id}")

def test_stage6_bulk_batch_processing_25_images():
    """
    Tests bulk batch processing with 25 images simultaneously,
    monitoring asynchronous background job queue and verifying completion.
    """
    res = client.post("/api/projects", json={"name": "Bulk 25 Images Test"})
    proj_id = res.json()["id"]

    # Create 25 images
    files = []
    for i in range(25):
        w = 800 + (i % 5) * 100
        h = 600 + (i % 4) * 80
        content = create_sample_image(w, h, (i * 8 % 255, (255 - i * 9) % 255, 128))
        files.append(("files", (f"bulk_item_{i+1:02d}.jpg", content, "image/jpeg")))

    res_upload = client.post(f"/api/projects/{proj_id}/images", files=files)
    assert res_upload.status_code == 200
    assert len(res_upload.json()) == 25

    # Upload logo
    logo_bytes = create_transparent_logo(200, 80)
    client.post(f"/api/projects/{proj_id}/logo", files={"file": ("corp_brand.png", logo_bytes, "image/png")})

    # Start Batch Job
    res_batch = client.post(f"/api/projects/{proj_id}/batch-process")
    assert res_batch.status_code == 200
    job_id = res_batch.json()["id"]

    # Poll status
    completed = False
    for _ in range(40):
        time.sleep(0.5)
        res_job = client.get(f"/api/projects/{proj_id}/jobs/{job_id}")
        assert res_job.status_code == 200
        data = res_job.json()
        if data["status"] in ("completed", "failed"):
            completed = True
            assert data["status"] == "completed"
            assert data["processed_images"] == 25
            assert data["failed_images"] == 0
            break

    assert completed, "Batch job did not complete within allotted timeout"

    # Verify project reflects completed count
    res_p = client.get(f"/api/projects/{proj_id}")
    assert res_p.json()["processed_count"] == 25

    # Verify ZIP download
    res_zip = client.get(f"/api/projects/{proj_id}/export/zip")
    assert res_zip.status_code == 200
    with zipfile.ZipFile(io.BytesIO(res_zip.content)) as zf:
        assert len(zf.namelist()) == 25

    print(f"Bulk 25-image batch processing test 100% verified!")
    client.delete(f"/api/projects/{proj_id}")

