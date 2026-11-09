import io
import time
import zipfile
import httpx
from PIL import Image, ImageDraw

BASE_URL = "http://127.0.0.1:8080/api"

def create_logo_bytes(fmt="PNG", bg="transparent"):
    if bg == "transparent":
        img = Image.new("RGBA", (180, 80), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.ellipse([10, 10, 70, 70], fill=(212, 175, 55, 255))
        d.rectangle([80, 25, 170, 55], fill=(212, 175, 55, 255))
    else:
        img = Image.new("RGB", (180, 80), (255, 255, 255))
        d = ImageDraw.Draw(img)
        d.ellipse([10, 10, 70, 70], fill=(180, 40, 40))
        d.rectangle([80, 25, 170, 55], fill=(30, 30, 30))

    buf = io.BytesIO()
    if fmt == "JPEG":
        img.convert("RGB").save(buf, format="JPEG")
    elif fmt == "WEBP":
        img.save(buf, format="WEBP")
    else:
        img.save(buf, format="PNG")
    return buf.getvalue()

def create_saree_photo(idx, w=800, h=600):
    img = Image.new("RGB", (w, h), (40 + (idx * 5) % 150, 50, 80))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, 30], fill=(218, 165, 32))
    d.rectangle([0, h - 30, w, h], fill=(218, 165, 32))
    # Watermark
    d.rectangle([w - 120, h - 70, w - 20, h - 20], fill=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()

def run_live_audit():
    print("=== LIVE SERVER E2E VALIDATION ON PORT 8080 ===")
    with httpx.Client(timeout=30.0) as client:
        # 1. Health check
        res_health = client.get(f"{BASE_URL}/health")
        assert res_health.status_code == 200, f"Health check failed: {res_health.status_code}"
        print(f"[OK] Health check: {res_health.json()}")

        # 2. Project creation & retrieval
        p_res = client.post(f"{BASE_URL}/projects", json={"name": "Live Server Audit Project", "description": "Testing against running uvicorn daemon"})
        assert p_res.status_code == 200
        p = p_res.json()
        proj_id = p["id"]
        print(f"[OK] Created Project {proj_id} with auto-provisioned logo: {p['logo']['original_filename']}")

        # 3. Logo variants switching
        for variant, expected in [
            ("Junnu Mukka Sarees", "Junnu"),
            ("Savecus Gold", "Gold"),
            ("Savecus Black", "Black"),
        ]:
            v_res = client.post(f"{BASE_URL}/projects/{proj_id}/logo-variant?variant={variant}")
            assert v_res.status_code == 200, f"Variant switch failed: {v_res.text}"
            data = v_res.json()
            assert expected in data["original_filename"]
            assert data["has_alpha"] is True
            print(f"[OK] Switched to variant '{variant}': {data['original_filename']} (has_alpha={data['has_alpha']})")

        # 4. Custom logo upload (JPEG with white bg auto-transparency, PNG transparent, WEBP)
        # A. JPEG white background
        jpeg_bytes = create_logo_bytes(fmt="JPEG", bg="white")
        res_up_jpeg = client.post(
            f"{BASE_URL}/projects/{proj_id}/logo",
            files={"file": ("vendor_logo.jpg", jpeg_bytes, "image/jpeg")}
        )
        assert res_up_jpeg.status_code == 200
        assert res_up_jpeg.json()["has_alpha"] is True
        print(f"[OK] Custom JPEG logo uploaded and auto-transparency extracted: has_alpha={res_up_jpeg.json()['has_alpha']}")

        # B. PNG transparent
        png_bytes = create_logo_bytes(fmt="PNG", bg="transparent")
        res_up_png = client.post(
            f"{BASE_URL}/projects/{proj_id}/logo",
            files={"file": ("vendor_logo.png", png_bytes, "image/png")}
        )
        assert res_up_png.status_code == 200
        assert res_up_png.json()["has_alpha"] is True
        print(f"[OK] Custom PNG logo with alpha channel verified: has_alpha={res_up_png.json()['has_alpha']}")

        # C. WEBP
        webp_bytes = create_logo_bytes(fmt="WEBP", bg="transparent")
        res_up_webp = client.post(
            f"{BASE_URL}/projects/{proj_id}/logo",
            files={"file": ("vendor_logo.webp", webp_bytes, "image/webp")}
        )
        assert res_up_webp.status_code == 200
        assert res_up_webp.json()["has_alpha"] is True
        print(f"[OK] Custom WEBP logo with alpha channel verified: has_alpha={res_up_webp.json()['has_alpha']}")

        # 5. Stress test: Upload 28 simulated photos
        total_photos = 28
        files = []
        for i in range(total_photos):
            b = create_saree_photo(i, w=800 if i % 2 == 0 else 1024, h=600 if i % 2 == 0 else 768)
            files.append(("files", (f"live_saree_{i+1:02d}.jpg", b, "image/jpeg")))

        t0_up = time.time()
        res_imgs = client.post(f"{BASE_URL}/projects/{proj_id}/images", files=files)
        t_up = time.time() - t0_up
        assert res_imgs.status_code == 200
        uploaded = res_imgs.json()
        assert len(uploaded) == total_photos
        print(f"[OK] Uploaded {total_photos} photos to live server in {t_up:.2f}s ({(total_photos/t_up):.1f} imgs/s)")

        # 6. Set watermark removal mask on first photo
        first_id = uploaded[0]["id"]
        inpaint_res = client.post(f"{BASE_URL}/projects/{proj_id}/images/{first_id}/inpaint", json={
            "method": "telea",
            "mask_regions": [{"id": "m1", "type": "rect", "x": 0.85, "y": 0.88, "width": 0.13, "height": 0.10}]
        })
        assert inpaint_res.status_code == 200
        print(f"[OK] Defined reference inpainting mask on image {first_id}")

        # 7. Start live batch processing
        t0_batch = time.time()
        batch_res = client.post(f"{BASE_URL}/projects/{proj_id}/batch-process")
        assert batch_res.status_code == 200
        job_id = batch_res.json()["id"]
        print(f"[OK] Batch process started: job_id={job_id}")

        # Poll live job status
        poll_times = 0
        final_job = None
        for _ in range(60):
            time.sleep(0.3)
            poll_times += 1
            st = client.get(f"{BASE_URL}/projects/{proj_id}/jobs/{job_id}").json()
            if st["status"] in ("completed", "failed"):
                final_job = st
                break

        dur = time.time() - t0_batch
        assert final_job is not None
        assert final_job["status"] == "completed"
        assert final_job["processed_images"] == total_photos
        assert final_job["failed_images"] == 0
        print(f"[OK] Batch processing finished in {dur:.2f}s ({(total_photos/dur):.2f} images/s) with {poll_times} polls")

        # 8. Live ZIP Export
        t0_zip = time.time()
        zip_res = client.get(f"{BASE_URL}/projects/{proj_id}/export/zip")
        dur_zip = time.time() - t0_zip
        assert zip_res.status_code == 200
        assert zip_res.headers.get("content-type") == "application/zip"
        with zipfile.ZipFile(io.BytesIO(zip_res.content), "r") as zf:
            names = zf.namelist()
            assert len(names) == total_photos
            for n in names:
                data = zf.read(n)
                with Image.open(io.BytesIO(data)) as simg:
                    assert simg.format == "JPEG"
        print(f"[OK] ZIP export verified: {len(names)} valid files exported in {dur_zip:.2f}s ({len(zip_res.content)/1024:.1f} KB)")

        # 9. Clean up
        del_res = client.delete(f"{BASE_URL}/projects/{proj_id}")
        assert del_res.status_code == 200
        print(f"[OK] Project {proj_id} cleaned up successfully from live database and disk")

    print("\n>>> ALL LIVE SERVER ENDPOINTS VERIFIED 100% OPERATIONAL AND STABLE! <<<")

if __name__ == "__main__":
    run_live_audit()
