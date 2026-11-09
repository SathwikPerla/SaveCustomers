import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def create_dummy_image(width=400, height=300, color="red", fmt="JPEG") -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=color)
    img.save(buf, format=fmt)
    return buf.getvalue()

def create_dummy_logo(width=150, height=80, fmt="PNG", alpha=True) -> bytes:
    buf = io.BytesIO()
    mode = "RGBA" if alpha else "RGB"
    img = Image.new(mode, (width, height), (0, 0, 0, 0) if alpha else (255, 255, 255))
    img.save(buf, format=fmt)
    return buf.getvalue()

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_project_crud():
    # 1. Create project
    res = client.post("/api/projects", json={"name": "Test Brand Launch", "description": "Spring 2026"})
    assert res.status_code == 200
    data = res.json()
    proj_id = data["id"]
    assert data["name"] == "Test Brand Launch"
    assert data["images_count"] == 0

    # 2. Get project details
    res = client.get(f"/api/projects/{proj_id}")
    assert res.status_code == 200
    assert res.json()["id"] == proj_id

    # 3. List projects
    res = client.get("/api/projects")
    assert res.status_code == 200
    assert any(p["id"] == proj_id for p in res.json())

    # 4. Update project
    res = client.put(f"/api/projects/{proj_id}", json={"name": "Updated Brand Launch"})
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Brand Launch"

def test_image_and_logo_upload():
    # Create project
    res = client.post("/api/projects", json={"name": "Upload Test"})
    proj_id = res.json()["id"]

    # Upload 2 images
    img1_bytes = create_dummy_image(500, 400, "blue")
    img2_bytes = create_dummy_image(800, 600, "green")
    
    files = [
        ("files", ("image1.jpg", img1_bytes, "image/jpeg")),
        ("files", ("image2.jpg", img2_bytes, "image/jpeg")),
    ]
    
    res = client.post(f"/api/projects/{proj_id}/images", files=files)
    assert res.status_code == 200
    images = res.json()
    assert len(images) == 2
    assert images[0]["width"] == 500
    assert images[0]["height"] == 400
    assert images[1]["width"] == 800
    assert images[1]["height"] == 600
    assert images[0]["thumbnail_url"].startswith("/static/thumbnails/")

    img1_id = images[0]["id"]

    # Upload logo
    logo_bytes = create_dummy_logo(200, 100, alpha=True)
    res = client.post(f"/api/projects/{proj_id}/logo", files={"file": ("logo.png", logo_bytes, "image/png")})
    assert res.status_code == 200
    logo_data = res.json()
    assert logo_data["width"] == 200
    assert logo_data["height"] == 100
    assert logo_data["has_alpha"] is True

    # Check project details has both images and logo
    res = client.get(f"/api/projects/{proj_id}")
    assert res.status_code == 200
    p = res.json()
    assert p["images_count"] == 2
    assert p["logo"] is not None
    assert p["logo"]["id"] == logo_data["id"]

    # Delete 1 image
    res = client.delete(f"/api/projects/{proj_id}/images/{img1_id}")
    assert res.status_code == 200

    res = client.get(f"/api/projects/{proj_id}")
    assert res.json()["images_count"] == 1

    # Cleanup project
    res = client.delete(f"/api/projects/{proj_id}")
    assert res.status_code == 200

