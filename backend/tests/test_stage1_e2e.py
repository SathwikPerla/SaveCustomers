import io
import httpx
from PIL import Image

BASE_URL = "http://127.0.0.1:8080"

def test_full_stage1_e2e():
    client = httpx.Client(timeout=10.0)
    print("1. Checking health...")
    r = client.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("   Health OK:", r.json())

    print("2. Creating project...")
    r = client.post(f"{BASE_URL}/api/projects", json={
        "name": "E2E Showcase Project",
        "description": "Testing Stage 1 end-to-end integration"
    })
    assert r.status_code == 200, f"Project creation failed: {r.text}"
    proj = r.json()
    proj_id = proj["id"]
    print(f"   Created project {proj_id}: {proj['name']}")

    print("3. Generating and uploading 3 test images...")
    images_to_upload = []
    for i, (w, h, col) in enumerate([(1920, 1080, "crimson"), (1080, 1080, "navy"), (800, 1200, "darkgreen")]):
        buf = io.BytesIO()
        img = Image.new("RGB", (w, h), col)
        img.save(buf, format="JPEG")
        images_to_upload.append(('files', (f"product_shot_{i+1}.jpg", buf.getvalue(), "image/jpeg")))

    r = client.post(f"{BASE_URL}/api/projects/{proj_id}/images", files=images_to_upload)
    assert r.status_code == 200, f"Images upload failed: {r.text}"
    uploaded_images = r.json()
    assert len(uploaded_images) == 3, f"Expected 3 images, got {len(uploaded_images)}"
    print(f"   Successfully uploaded {len(uploaded_images)} images:")
    for img in uploaded_images:
        print(f"     - {img['original_filename']} ({img['width']}x{img['height']}px), thumb: {img['thumbnail_url']}")

    print("4. Generating and uploading replacement logo (transparent PNG)...")
    logo_buf = io.BytesIO()
    logo_img = Image.new("RGBA", (300, 120), (0, 0, 0, 0))
    for x in range(20, 280):
        for y in range(20, 100):
            logo_img.putpixel((x, y), (14, 140, 233, 240))
    logo_img.save(logo_buf, format="PNG")
    
    r = client.post(
        f"{BASE_URL}/api/projects/{proj_id}/logo",
        files={'file': ("company_logo.png", logo_buf.getvalue(), "image/png")}
    )
    assert r.status_code == 200, f"Logo upload failed: {r.text}"
    logo = r.json()
    assert logo["has_alpha"] is True
    print(f"   Logo uploaded: {logo['original_filename']} ({logo['width']}x{logo['height']}px), alpha: {logo['has_alpha']}")

    print("5. Verifying static asset serving...")
    thumb_url = f"{BASE_URL}{uploaded_images[0]['thumbnail_url']}"
    r_thumb = client.get(thumb_url)
    assert r_thumb.status_code == 200, f"Failed to fetch thumbnail: {r_thumb.status_code}"
    assert len(r_thumb.content) > 0

    logo_url = f"{BASE_URL}{logo['url']}"
    r_logo = client.get(logo_url)
    assert r_logo.status_code == 200, f"Failed to fetch logo: {r_logo.status_code}"
    print("   Static asset serving verified!")

    print("6. Verifying project details aggregation...")
    r = client.get(f"{BASE_URL}/api/projects/{proj_id}")
    assert r.status_code == 200
    details = r.json()
    assert details["images_count"] == 3
    assert details["logo"] is not None
    assert len(details["images"]) == 3
    print("   Project details aggregation verified!")

    print("\nSTAGE 1 END-TO-END VERIFICATION: 100% PASSED!")

if __name__ == "__main__":
    test_full_stage1_e2e()
