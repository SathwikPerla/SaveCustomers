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

def test_savecus_auto_provision_and_variants():
    # 1. Create a new project - should automatically have Savecus logo pre-attached!
    res = client.post("/api/projects", json={"name": "Father Rebrand Batch 1"})
    assert res.status_code == 200
    p = res.json()
    proj_id = p["id"]
    
    # Verify logo is already attached (Junnu Mukka or Savecus)
    assert p["logo"] is not None
    assert ("Junnu" in p["logo"]["original_filename"]) or ("Savecus" in p["logo"]["original_filename"])
    assert p["logo"]["has_alpha"] is True

    # 2. Test switching to Junnu Mukka logo variant
    res_junnu = client.post(f"/api/projects/{proj_id}/logo-variant?variant=junnu_mukka")
    assert res_junnu.status_code == 200
    junnu_logo = res_junnu.json()
    assert "Junnu" in junnu_logo["original_filename"]
    assert junnu_logo["has_alpha"] is True

    # 2. Test switching to Gold logo variant
    res_gold = client.post(f"/api/projects/{proj_id}/logo-variant?variant=gold")
    assert res_gold.status_code == 200
    gold_logo = res_gold.json()
    assert "Gold" in gold_logo["original_filename"]

    # 3. Test switching back to Black logo variant
    res_black = client.post(f"/api/projects/{proj_id}/logo-variant?variant=black")
    assert res_black.status_code == 200
    black_logo = res_black.json()
    assert "Black" in black_logo["original_filename"]

    # 4. Upload 3 photos with simulated watermark in bottom-right
    files = []
    for i in range(3):
        img = Image.new("RGB", (800, 600), (40 + i * 20, 50, 70))
        d = ImageDraw.Draw(img)
        d.rectangle([680, 500, 780, 570], fill=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        files.append(("files", (f"father_pic_{i+1}.jpg", buf.getvalue(), "image/jpeg")))

    res_up = client.post(f"/api/projects/{proj_id}/images", files=files)
    assert res_up.status_code == 200
    images = res_up.json()
    assert len(images) == 3

    # Mark watermark removal ONCE on photo 1
    inpaint_payload = {
        "method": "telea",
        "mask_regions": [
            {"id": "m1", "type": "rect", "x": 0.85, "y": 0.83, "width": 0.12, "height": 0.12}
        ]
    }
    res_inpaint = client.post(f"/api/projects/{proj_id}/images/{images[0]['id']}/inpaint", json=inpaint_payload)
    assert res_inpaint.status_code == 200

    # Run batch process - should propagate watermark removal to all 3 photos!
    res_batch = client.post(f"/api/projects/{proj_id}/batch-process")
    assert res_batch.status_code == 200
    job_id = res_batch.json()["id"]

    for _ in range(20):
        time.sleep(0.5)
        st = client.get(f"/api/projects/{proj_id}/jobs/{job_id}").json()
        if st["status"] in ("completed", "failed"):
            assert st["status"] == "completed"
            assert st["processed_images"] == 3
            break

    # Verify ZIP export
    res_zip = client.get(f"/api/projects/{proj_id}/export/zip")
    assert res_zip.status_code == 200
    with zipfile.ZipFile(io.BytesIO(res_zip.content)) as zf:
        assert len(zf.namelist()) == 3

    client.delete(f"/api/projects/{proj_id}")

