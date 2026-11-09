import io
import time
import zipfile
import pytest
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, get_db
from app.core.config import settings

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

# ==============================================================================
# Helper generators for simulated logos and test images
# ==============================================================================

def create_simulated_logo(fmt: str, bg_type: str = "transparent", width: int = 200, height: int = 100) -> bytes:
    """
    Creates simulated logos in various formats (JPEG, PNG, WEBP)
    and backgrounds ('transparent', 'white', 'black').
    """
    if bg_type == "transparent":
        img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        # Gold emblem + text
        draw.ellipse([10, 10, 80, 80], fill=(212, 175, 55, 255), outline=(255, 255, 255, 255))
        draw.rectangle([90, 30, 180, 60], fill=(212, 175, 55, 255))
    elif bg_type == "white":
        img = Image.new("RGB", (width, height), (255, 255, 255))
        draw = ImageDraw.Draw(img)
        draw.ellipse([10, 10, 80, 80], fill=(180, 40, 40))
        draw.rectangle([90, 30, 180, 60], fill=(30, 30, 30))
    elif bg_type == "black":
        img = Image.new("RGB", (width, height), (10, 10, 10))
        draw = ImageDraw.Draw(img)
        draw.ellipse([10, 10, 80, 80], fill=(212, 175, 55))
        draw.rectangle([90, 30, 180, 60], fill=(240, 240, 240))
    else:
        raise ValueError(f"Unknown bg_type: {bg_type}")

    buf = io.BytesIO()
    if fmt.upper() in ("JPEG", "JPG"):
        img.convert("RGB").save(buf, format="JPEG", quality=95)
    elif fmt.upper() == "WEBP":
        img.save(buf, format="WEBP", quality=95)
    else:
        img.save(buf, format="PNG")
    return buf.getvalue()


def create_simulated_saree_image(idx: int, width: int = 800, height: int = 600) -> bytes:
    """
    Creates a simulated saree photograph with textures, borders, and a corner watermark.
    """
    img = Image.new("RGB", (width, height), (30 + (idx * 7) % 180, 40 + (idx * 11) % 150, 80 + (idx * 5) % 120))
    draw = ImageDraw.Draw(img)
    
    # Draw simulated saree zari border and stripes
    draw.rectangle([0, 0, width, 40], fill=(218, 165, 32))
    draw.rectangle([0, height - 40, width, height], fill=(218, 165, 32))
    for stripe in range(50, height - 50, 40):
        draw.line([(0, stripe), (width, stripe)], fill=(255, 215, 0), width=2)
        
    # Draw old simulated watermark in bottom-right corner
    wm_w, wm_h = int(width * 0.15), int(height * 0.10)
    wm_x, wm_y = width - wm_w - 20, height - wm_h - 20
    draw.rectangle([wm_x, wm_y, wm_x + wm_w, wm_y + wm_h], fill=(240, 240, 240))
    draw.text((wm_x + 10, wm_y + 10), "OLD_WM", fill=(50, 50, 50))
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


# ==============================================================================
# 1. Project Creation & Retrieval Tests
# ==============================================================================

def test_project_crud_and_defaults():
    # Test creation
    res = client.post("/api/projects", json={
        "name": "Audit Test Project Alpha",
        "description": "Validation test project for endpoint audit"
    })
    assert res.status_code == 200, res.text
    p = res.json()
    proj_id = p["id"]
    assert p["name"] == "Audit Test Project Alpha"
    assert p["description"] == "Validation test project for endpoint audit"
    assert p["images_count"] == 0
    assert p["processed_count"] == 0
    assert p["global_settings"] is not None
    assert p["global_settings"]["scale"] in (0.20, 0.42)
    assert p["global_settings"]["shadow"] is True
    
    # Verify auto-provisioned logo is attached
    assert p["logo"] is not None
    assert p["logo"]["has_alpha"] is True
    assert p["logo"]["url"].startswith("/static/logos/")

    # Test retrieval (list)
    res_list = client.get("/api/projects")
    assert res_list.status_code == 200
    all_projects = res_list.json()
    assert any(proj["id"] == proj_id for proj in all_projects)

    # Test retrieval (single detail)
    res_detail = client.get(f"/api/projects/{proj_id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["id"] == proj_id
    assert len(detail["images"]) == 0
    assert detail["logo"] is not None

    # Test project update
    res_update = client.put(f"/api/projects/{proj_id}", json={
        "name": "Audit Test Project Renamed",
        "description": "Updated description",
        "global_settings": {
            "x": 0.5,
            "y": 0.5,
            "scale": 0.25,
            "opacity": 0.9,
            "rotation": 0,
            "blend_mode": "normal",
            "shadow": False,
            "shadow_blur": 4.0,
            "shadow_offset_x": 2.0,
            "shadow_offset_y": 2.0,
            "shadow_opacity": 0.3
        }
    })
    assert res_update.status_code == 200
    updated = res_update.json()
    assert updated["name"] == "Audit Test Project Renamed"
    assert updated["global_settings"]["x"] == 0.5
    assert updated["global_settings"]["scale"] == 0.25
    assert updated["global_settings"]["shadow"] is False

    # Test 404 for non-existent project
    res_404 = client.get("/api/projects/non_existent_id_9999")
    assert res_404.status_code == 404

    # Cleanup
    client.delete(f"/api/projects/{proj_id}")


# ==============================================================================
# 2. Logo Variant Switching Tests
# ==============================================================================

def test_logo_variant_switching():
    res = client.post("/api/projects", json={"name": "Logo Switch Test"})
    assert res.status_code == 200
    proj_id = res.json()["id"]

    # 1. Switch to Junnu Mukka Sarees variant
    res_junnu = client.post(f"/api/projects/{proj_id}/logo-variant?variant=junnu_mukka")
    assert res_junnu.status_code == 200
    junnu = res_junnu.json()
    assert "Junnu" in junnu["original_filename"]
    assert junnu["has_alpha"] is True
    assert junnu["width"] > 0 and junnu["height"] > 0

    # Test human-readable variant string
    res_junnu2 = client.post(f"/api/projects/{proj_id}/logo-variant?variant=Junnu%20Mukka%20Sarees")
    assert res_junnu2.status_code == 200
    assert "Junnu" in res_junnu2.json()["original_filename"]

    # 2. Switch to Savecus Gold variant
    res_gold = client.post(f"/api/projects/{proj_id}/logo-variant?variant=gold")
    assert res_gold.status_code == 200
    gold = res_gold.json()
    assert "Gold" in gold["original_filename"]
    assert gold["has_alpha"] is True

    res_gold2 = client.post(f"/api/projects/{proj_id}/logo-variant?variant=Savecus%20Gold")
    assert res_gold2.status_code == 200
    assert "Gold" in res_gold2.json()["original_filename"]

    # 3. Switch to Savecus Black variant
    res_black = client.post(f"/api/projects/{proj_id}/logo-variant?variant=black")
    assert res_black.status_code == 200
    black = res_black.json()
    assert "Black" in black["original_filename"]
    assert black["has_alpha"] is True

    res_black2 = client.post(f"/api/projects/{proj_id}/logo-variant?variant=Savecus%20Black")
    assert res_black2.status_code == 200
    assert "Black" in res_black2.json()["original_filename"]

    # 4. Verify project detail reflects current logo
    proj_detail = client.get(f"/api/projects/{proj_id}").json()
    assert proj_detail["logo"]["id"] == black["id"]
    assert "Black" in proj_detail["logo"]["original_filename"]

    # 5. Non-existent project
    res_err = client.post("/api/projects/unknown_proj/logo-variant?variant=gold")
    assert res_err.status_code == 404

    client.delete(f"/api/projects/{proj_id}")


# ==============================================================================
# 3. Custom Logo Upload: JPEG, PNG, WEBP with Auto-transparency & Alpha Tests
# ==============================================================================

def test_custom_logo_uploads_and_transparency():
    res = client.post("/api/projects", json={"name": "Custom Logo Upload Test"})
    proj_id = res.json()["id"]

    # Format 1: JPEG with solid white background -> Should auto-extract transparency
    jpeg_white = create_simulated_logo(fmt="JPEG", bg_type="white", width=300, height=150)
    res_jpeg = client.post(
        f"/api/projects/{proj_id}/logo",
        files={"file": ("custom_logo.jpg", jpeg_white, "image/jpeg")}
    )
    assert res_jpeg.status_code == 200, res_jpeg.text
    logo_data = res_jpeg.json()
    assert logo_data["has_alpha"] is True
    # Verify file stored on disk is valid PNG with alpha channel
    dest_path = settings.LOGOS_DIR / logo_data["url"].replace("/static/logos/", "")
    assert dest_path.exists()
    with Image.open(dest_path) as limg:
        assert limg.mode == "RGBA"

    # Format 2: PNG with transparent alpha channel
    png_alpha = create_simulated_logo(fmt="PNG", bg_type="transparent", width=250, height=120)
    res_png_alpha = client.post(
        f"/api/projects/{proj_id}/logo",
        files={"file": ("brand_transparent.png", png_alpha, "image/png")}
    )
    assert res_png_alpha.status_code == 200
    logo_data2 = res_png_alpha.json()
    assert logo_data2["has_alpha"] is True

    # Format 3: PNG with solid white background -> Should auto-extract transparency
    png_white = create_simulated_logo(fmt="PNG", bg_type="white", width=220, height=110)
    res_png_white = client.post(
        f"/api/projects/{proj_id}/logo",
        files={"file": ("brand_opaque.png", png_white, "image/png")}
    )
    assert res_png_white.status_code == 200
    logo_data3 = res_png_white.json()
    assert logo_data3["has_alpha"] is True

    # Format 4: WEBP with alpha channel
    webp_alpha = create_simulated_logo(fmt="WEBP", bg_type="transparent", width=240, height=120)
    res_webp_alpha = client.post(
        f"/api/projects/{proj_id}/logo",
        files={"file": ("brand_alpha.webp", webp_alpha, "image/webp")}
    )
    assert res_webp_alpha.status_code == 200
    logo_data4 = res_webp_alpha.json()
    assert logo_data4["has_alpha"] is True

    # Format 5: WEBP with solid white background -> Auto-extracts transparency
    webp_white = create_simulated_logo(fmt="WEBP", bg_type="white", width=240, height=120)
    res_webp_white = client.post(
        f"/api/projects/{proj_id}/logo",
        files={"file": ("brand_white.webp", webp_white, "image/webp")}
    )
    assert res_webp_white.status_code == 200
    logo_data5 = res_webp_white.json()
    assert logo_data5["has_alpha"] is True

    # Error test: Unsupported extension (.txt)
    res_bad = client.post(
        f"/api/projects/{proj_id}/logo",
        files={"file": ("not_an_image.txt", b"hello world", "text/plain")}
    )
    assert res_bad.status_code == 400

    # Error test: Corrupted image bytes
    res_corrupt = client.post(
        f"/api/projects/{proj_id}/logo",
        files={"file": ("corrupted.png", b"\x89PNG\r\n\x1a\n\x00\x00corrupted_bytes", "image/png")}
    )
    assert res_corrupt.status_code == 400

    # Test delete logo endpoint
    res_del_logo = client.delete(f"/api/projects/{proj_id}/logo")
    assert res_del_logo.status_code == 200
    proj_check = client.get(f"/api/projects/{proj_id}").json()
    assert proj_check["logo"] is None

    client.delete(f"/api/projects/{proj_id}")


# ==============================================================================
# 4. Stress Test: 30 Images Batch Processing & Propagation
# ==============================================================================

def test_stress_batch_processing_30_images():
    """
    Stress tests the batch processing pipeline with 30 simulated images of varying dimensions.
    Verifies watermark inpainting, logo composition, concurrent status polling, and completion.
    """
    res = client.post("/api/projects", json={
        "name": "Stress Batch 30 Sarees Test",
        "description": "High-volume batch processing stress test"
    })
    assert res.status_code == 200
    proj_id = res.json()["id"]

    # Select Savecus Gold logo variant for this rebrand batch
    client.post(f"/api/projects/{proj_id}/logo-variant?variant=gold")

    # Generate 30 images with varied resolutions
    resolutions = [
        (800, 600), (1024, 768), (1200, 800), (600, 900), (960, 720), (1280, 720)
    ]
    total_images_count = 30
    files_payload = []

    print(f"\n[STRESS TEST] Generating {total_images_count} simulated saree images...")
    t0 = time.time()
    for i in range(total_images_count):
        w, h = resolutions[i % len(resolutions)]
        img_bytes = create_simulated_saree_image(idx=i, width=w, height=h)
        files_payload.append(("files", (f"saree_catalog_{i+1:02d}.jpg", img_bytes, "image/jpeg")))

    gen_time = time.time() - t0
    print(f"[STRESS TEST] Generated {total_images_count} images in {gen_time:.2f}s")

    # Upload all 30 images to the project
    t_up0 = time.time()
    res_up = client.post(f"/api/projects/{proj_id}/images", files=files_payload)
    up_time = time.time() - t_up0
    assert res_up.status_code == 200, res_up.text
    uploaded_images = res_up.json()
    assert len(uploaded_images) == total_images_count
    print(f"[STRESS TEST] Uploaded & thumbnailed {total_images_count} images in {up_time:.2f}s ({(total_images_count/up_time):.1f} imgs/s)")

    # Set watermark inpainting mask on photo #1 for automatic batch propagation
    first_img_id = uploaded_images[0]["id"]
    inpaint_payload = {
        "method": "telea",
        "mask_regions": [
            {"id": "wm_rect", "type": "rect", "x": 0.80, "y": 0.85, "width": 0.18, "height": 0.12}
        ]
    }
    res_inpaint = client.post(f"/api/projects/{proj_id}/images/{first_img_id}/inpaint", json=inpaint_payload)
    assert res_inpaint.status_code == 200
    assert res_inpaint.json()["status"] == "ready"

    # Start batch process
    t_batch0 = time.time()
    res_batch = client.post(f"/api/projects/{proj_id}/batch-process")
    assert res_batch.status_code == 200, res_batch.text
    job_info = res_batch.json()
    job_id = job_info["id"]
    assert job_info["total_images"] == total_images_count
    assert job_info["status"] == "running"

    # Poll status concurrently, simulating active UI polling every 200ms
    max_wait_seconds = 60
    poll_count = 0
    start_poll = time.time()
    final_status = None

    while time.time() - start_poll < max_wait_seconds:
        time.sleep(0.2)
        poll_count += 1
        st_res = client.get(f"/api/projects/{proj_id}/jobs/{job_id}")
        assert st_res.status_code == 200
        job_st = st_res.json()
        
        # Concurrently query project detail to test read locks during background writes
        if poll_count % 3 == 0:
            proj_read = client.get(f"/api/projects/{proj_id}")
            assert proj_read.status_code == 200

        if job_st["status"] in ("completed", "completed_with_errors", "failed"):
            final_status = job_st
            break

    batch_duration = time.time() - t_batch0
    assert final_status is not None, f"Batch job timed out after {max_wait_seconds}s"
    assert final_status["status"] == "completed", f"Batch job failed: {final_status}"
    assert final_status["processed_images"] == total_images_count
    assert final_status["failed_images"] == 0

    fps = total_images_count / batch_duration
    print(f"[STRESS TEST] Batch processing completed in {batch_duration:.2f}s ({fps:.2f} images/s) with {poll_count} status polls")

    # Verify all 30 processed images on disk
    detail_res = client.get(f"/api/projects/{proj_id}")
    assert detail_res.status_code == 200
    images_detail = detail_res.json()["images"]
    assert len(images_detail) == total_images_count

    for idx, img_info in enumerate(images_detail):
        assert img_info["status"] == "completed"
        assert img_info["processed_url"] is not None
        proc_disk_path = settings.PROCESSED_DIR / img_info["processed_url"].replace("/static/processed/", "")
        assert proc_disk_path.exists(), f"Processed image file missing: {proc_disk_path}"
        assert proc_disk_path.stat().st_size > 0

        # Verify PIL can open the processed image
        with Image.open(proc_disk_path) as verified_img:
            assert verified_img.format == "JPEG"
            assert verified_img.size == (img_info["width"], img_info["height"])

    # ==============================================================================
    # 5. ZIP Export Verification
    # ==============================================================================
    t_zip0 = time.time()
    res_zip = client.get(f"/api/projects/{proj_id}/export/zip")
    zip_time = time.time() - t_zip0
    assert res_zip.status_code == 200
    assert res_zip.headers["content-type"] == "application/zip"
    assert "attachment; filename=" in res_zip.headers["content-disposition"]
    assert len(res_zip.content) > 0

    with zipfile.ZipFile(io.BytesIO(res_zip.content), "r") as zf:
        namelist = zf.namelist()
        assert len(namelist) == total_images_count
        assert len(set(namelist)) == total_images_count, "ZIP has duplicate entry filenames!"
        # Verify each image inside ZIP is valid
        for name in namelist:
            data = zf.read(name)
            assert len(data) > 0
            with Image.open(io.BytesIO(data)) as zip_img:
                assert zip_img.size[0] > 0 and zip_img.size[1] > 0

    print(f"[STRESS TEST] ZIP Export created and validated in {zip_time:.2f}s ({len(res_zip.content)/1024:.1f} KB)")

    # Cleanup project
    res_del = client.delete(f"/api/projects/{proj_id}")
    assert res_del.status_code == 200


# ==============================================================================
# 6. Edge Cases and Error Handling Tests
# ==============================================================================

def test_edge_cases_and_error_handling():
    # 1. Project without images export should return 400
    res_p = client.post("/api/projects", json={"name": "Empty Project"})
    empty_pid = res_p.json()["id"]

    res_empty_zip = client.get(f"/api/projects/{empty_pid}/export/zip")
    assert res_empty_zip.status_code == 400

    # 2. Batch process on empty project should return 400
    res_empty_batch = client.post(f"/api/projects/{empty_pid}/batch-process")
    assert res_empty_batch.status_code == 400

    # 3. Batch process when logo is deleted should return 400
    client.delete(f"/api/projects/{empty_pid}/logo")
    # Upload 1 image
    buf = io.BytesIO()
    Image.new("RGB", (400, 300)).save(buf, format="JPEG")
    client.post(f"/api/projects/{empty_pid}/images", files={"files": ("sample.jpg", buf.getvalue(), "image/jpeg")})
    
    res_no_logo_batch = client.post(f"/api/projects/{empty_pid}/batch-process")
    assert res_no_logo_batch.status_code == 400
    assert "Replacement logo" in res_no_logo_batch.json()["detail"]

    # Cleanup
    client.delete(f"/api/projects/{empty_pid}")


def test_single_photo_manual_tweak_and_aspect_adaptation():
    """Verify smart aspect-ratio scaling and single-photo tweak without affecting other photos."""
    res_p = client.post("/api/projects", json={"name": "Single Photo Tweak Test"})
    pid = res_p.json()["id"]

    # 1. Upload 1 tall image (1600x3600) and 1 square image (1600x1600)
    tall_buf = io.BytesIO()
    Image.new("RGB", (1600, 3600), (220, 180, 150)).save(tall_buf, format="JPEG")
    sq_buf = io.BytesIO()
    Image.new("RGB", (1600, 1600), (180, 220, 150)).save(sq_buf, format="JPEG")

    res_up = client.post(
        f"/api/projects/{pid}/images",
        files=[
            ("files", ("tall_saree.jpg", tall_buf.getvalue(), "image/jpeg")),
            ("files", ("square_saree.jpg", sq_buf.getvalue(), "image/jpeg")),
        ]
    )
    assert res_up.status_code == 200
    images = res_up.json()
    tall_id = images[0]["id"]
    sq_id = images[1]["id"]

    # 2. Run batch processing
    res_batch = client.post(f"/api/projects/{pid}/batch-process")
    assert res_batch.status_code == 200
    job_id = res_batch.json()["id"]

    # Poll completion
    for _ in range(30):
        st = client.get(f"/api/projects/{pid}/jobs/{job_id}").json()
        if st["status"] in ("completed", "failed"):
            break
        time.sleep(0.1)

    assert st["status"] == "completed"

    # 3. Manually tweak ONLY the tall photo (change position to top-right with scale 0.25)
    tweak_placement = {
        "x": 0.85,
        "y": 0.15,
        "scale": 0.25,
        "rotation": 0,
        "opacity": 1.0,
        "blend_mode": "normal",
        "shadow": True,
        "shadow_blur": 10.0,
        "shadow_opacity": 0.60
    }
    res_cfg = client.put(
        f"/api/projects/{pid}/images/{tall_id}/config",
        json={"custom_settings": tweak_placement}
    )
    assert res_cfg.status_code == 200

    # Apply logo to ONLY the tall photo
    res_apply = client.post(f"/api/projects/{pid}/images/{tall_id}/apply-logo")
    assert res_apply.status_code == 200
    updated_tall = res_apply.json()
    assert updated_tall["status"] == "completed"
    assert updated_tall["custom_settings"]["x"] == 0.85
    assert updated_tall["custom_settings"]["scale"] == 0.25

    # 4. Verify square photo remained untouched with its original settings
    res_proj = client.get(f"/api/projects/{pid}")
    proj_detail = res_proj.json()
    sq_img = next(im for im in proj_detail["images"] if im["id"] == sq_id)
    assert sq_img["status"] == "completed"
    # Square photo custom_settings should be None or unchanged
    assert sq_img.get("custom_settings") is None or sq_img["custom_settings"]["x"] != 0.85

    # 5. Export ZIP and verify both are exported
    res_zip = client.get(f"/api/projects/{pid}/export/zip")
    assert res_zip.status_code == 200
    with zipfile.ZipFile(io.BytesIO(res_zip.content)) as zf:
        assert len(zf.namelist()) == 2

    # Cleanup
    client.delete(f"/api/projects/{pid}")

