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

def create_test_image_with_watermark() -> bytes:
    # 600x400 image with a white watermark in bottom-right corner
    img = Image.new("RGB", (600, 400), (45, 85, 125))
    draw = ImageDraw.Draw(img)
    # Draw simulated watermark rectangle
    draw.rectangle([480, 320, 570, 370], fill=(250, 250, 250))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def create_test_logo() -> bytes:
    img = Image.new("RGBA", (150, 60), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, 140, 50], fill=(0, 200, 120, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def test_full_pipeline_stage2_to_5():
    # 1. Create project
    res = client.post("/api/projects", json={"name": "Pipeline Project"})
    assert res.status_code == 200
    proj_id = res.json()["id"]

    # 2. Upload image and logo
    img_bytes = create_test_image_with_watermark()
    logo_bytes = create_test_logo()

    res_img = client.post(
        f"/api/projects/{proj_id}/images",
        files=[("files", ("photo_with_watermark.jpg", img_bytes, "image/jpeg"))]
    )
    assert res_img.status_code == 200
    img_id = res_img.json()[0]["id"]

    res_logo = client.post(
        f"/api/projects/{proj_id}/logo",
        files={"file": ("new_brand.png", logo_bytes, "image/png")}
    )
    assert res_logo.status_code == 200

    # 3. Test logo detection (Stage 3)
    res_detect = client.post(f"/api/projects/{proj_id}/images/{img_id}/detect-logo")
    assert res_detect.status_code == 200
    detect_data = res_detect.json()
    assert "detected" in detect_data
    print(f"Detection result: {detect_data['detected']}, regions: {len(detect_data['regions'])}")

    # 4. Test inpainting (Stage 3)
    # Define mask covering bottom right (x: 0.78, y: 0.78, w: 0.2, h: 0.2)
    inpaint_payload = {
        "method": "telea",
        "mask_regions": [
            {
                "id": "mask_1",
                "type": "rect",
                "x": 0.78,
                "y": 0.78,
                "width": 0.2,
                "height": 0.2
            }
        ]
    }
    res_inpaint = client.post(f"/api/projects/{proj_id}/images/{img_id}/inpaint", json=inpaint_payload)
    assert res_inpaint.status_code == 200
    inpainted_item = res_inpaint.json()
    assert inpainted_item["processed_url"] is not None
    assert "inpainted_" in inpainted_item["processed_url"]

    # 5. Test apply replacement logo (Stage 2 & 4)
    # Update custom settings on image
    res_cfg = client.put(
        f"/api/projects/{proj_id}/images/{img_id}/config",
        json={
            "custom_settings": {
                "x": 0.2,
                "y": 0.2,
                "scale": 0.25,
                "rotation": 15.0,
                "opacity": 0.9,
                "blend_mode": "normal",
                "shadow": True,
                "shadow_blur": 6.0,
                "shadow_opacity": 0.5,
                "shadow_offset_x": 3.0,
                "shadow_offset_y": 3.0,
                "lock_aspect_ratio": True
            }
        }
    )
    assert res_cfg.status_code == 200

    res_apply = client.post(f"/api/projects/{proj_id}/images/{img_id}/apply-logo")
    assert res_apply.status_code == 200
    rebranded_item = res_apply.json()
    assert rebranded_item["status"] == "completed"
    assert "rebranded_" in rebranded_item["processed_url"]

    # 6. Test Single Image Download (Stage 5)
    res_dl = client.get(f"/api/projects/{proj_id}/images/{img_id}/download")
    assert res_dl.status_code == 200
    assert len(res_dl.content) > 0
    assert "photo_with_watermark_rebranded" in res_dl.headers.get("content-disposition", "")

    # 7. Test Batch Process (Stage 4)
    res_batch = client.post(f"/api/projects/{proj_id}/batch-process")
    assert res_batch.status_code == 200
    job_id = res_batch.json()["id"]

    # Wait for batch worker to finish
    for _ in range(10):
        time.sleep(0.5)
        res_job = client.get(f"/api/projects/{proj_id}/jobs/{job_id}")
        assert res_job.status_code == 200
        if res_job.json()["status"] in ("completed", "failed"):
            break

    job_data = res_job.json()
    assert job_data["status"] == "completed"
    assert job_data["processed_images"] == 1

    # 8. Test ZIP Export (Stage 5)
    res_zip = client.get(f"/api/projects/{proj_id}/export/zip")
    assert res_zip.status_code == 200
    assert res_zip.headers["content-type"] == "application/zip"
    
    # Verify ZIP validity and contents
    with zipfile.ZipFile(io.BytesIO(res_zip.content)) as zf:
        namelist = zf.namelist()
        assert len(namelist) == 1
        assert "photo_with_watermark_rebranded.jpg" in namelist[0]
        print(f"ZIP archive verified successfully: {namelist}")

    # Cleanup
    client.delete(f"/api/projects/{proj_id}")
