from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import init_db
from app.api.routes_projects import router as projects_router
from app.api.routes_images import router as images_router
from app.api.routes_processing import router as processing_router
from app.api.routes_export import router as export_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded & processed static assets
app.mount("/static/uploads", StaticFiles(directory=str(settings.UPLOADS_DIR)), name="uploads")
app.mount("/static/thumbnails", StaticFiles(directory=str(settings.THUMBNAILS_DIR)), name="thumbnails")
app.mount("/static/logos", StaticFiles(directory=str(settings.LOGOS_DIR)), name="logos")
app.mount("/static/masks", StaticFiles(directory=str(settings.MASKS_DIR)), name="masks")
app.mount("/static/processed", StaticFiles(directory=str(settings.PROCESSED_DIR)), name="processed")
app.mount("/static/exports", StaticFiles(directory=str(settings.EXPORTS_DIR)), name="exports")

# Include Routers
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])
app.include_router(images_router, prefix="/api/projects", tags=["Images & Logos"])
app.include_router(processing_router, prefix="/api/projects", tags=["Processing"])
app.include_router(export_router, prefix="/api/projects", tags=["Export"])

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }

# Serve frontend build if present
frontend_dist_candidates = [
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    Path(__file__).resolve().parent.parent / "frontend" / "dist",
    Path("/app/frontend/dist"),
    Path("frontend/dist"),
]
frontend_dist = next((p for p in frontend_dist_candidates if p.exists()), None)
if frontend_dist:
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

