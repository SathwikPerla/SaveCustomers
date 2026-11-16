import hmac
import os
from pathlib import Path
from urllib.parse import parse_qsl, urlencode
from fastapi import Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
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


# ---------------------------------------------------------------------------
# Private-link protection for the public cloud deployment.
# If ACCESS_KEY is set, the app only opens for someone who has visited
#   https://<site>/?key=<ACCESS_KEY>   once (it is then remembered on that phone for years),
# or who types the code on the small sign-in page. Not set (local Mac) -> open as before.
# ---------------------------------------------------------------------------
ACCESS_KEY = os.getenv("ACCESS_KEY", "").strip()
ACCESS_COOKIE = "vsc_access"
PUBLIC_PATHS = ("/api/health", "/manifest.json")

_SIGNIN_PAGE = """<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sarees Studio</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#121214;color:#fff;font-family:-apple-system,Roboto,sans-serif}
form{width:min(90vw,360px);display:flex;flex-direction:column;gap:12px}
input,button{font-size:18px;padding:14px;border-radius:14px;border:1px solid #444}
input{background:#1e1d19;color:#fff}button{background:#eab308;color:#111;font-weight:800;border:0}
p{color:#f87171;margin:0}</style></head><body>
<form method="get" action="/"><h2 style="margin:0">Enter access code</h2>__ERR__
<input name="key" autocomplete="current-password" placeholder="Access code" autofocus>
<button type="submit">Open studio</button></form></body></html>"""


def _key_ok(value: str | None) -> bool:
    return bool(value) and hmac.compare_digest(value, ACCESS_KEY)


@app.middleware("http")
async def access_gate(request: Request, call_next):
    if not ACCESS_KEY or request.url.path in PUBLIC_PATHS or request.method == "OPTIONS":
        return await call_next(request)

    if _key_ok(request.cookies.get(ACCESS_COOKIE)):
        return await call_next(request)

    given = request.query_params.get("key")
    if given is not None:
        if _key_ok(given.strip()):
            rest = [(k, v) for k, v in parse_qsl(request.url.query) if k != "key"]
            target = request.url.path + (("?" + urlencode(rest)) if rest else "")
            resp = RedirectResponse(target, status_code=303)
            resp.set_cookie(
                ACCESS_COOKIE, ACCESS_KEY, max_age=60 * 60 * 24 * 365 * 5,
                httponly=True, samesite="lax", secure=request.url.scheme == "https"
                or request.headers.get("x-forwarded-proto") == "https",
            )
            return resp
        return HTMLResponse(_SIGNIN_PAGE.replace("__ERR__", "<p>Wrong code, try again.</p>"), status_code=401)

    path = request.url.path
    if path.startswith("/api/") or path.startswith("/static/"):
        return JSONResponse({"detail": "Access code required"}, status_code=401)
    if path.endswith(".png") and "/" not in path[1:]:
        return await call_next(request)  # app icons for the home-screen shortcut
    return HTMLResponse(_SIGNIN_PAGE.replace("__ERR__", ""), status_code=401)


@app.middleware("http")
async def no_stale_app_shell(request, call_next):
    """Make phones/installed apps re-check the app page every time so updates show up."""
    response = await call_next(request)
    path = request.url.path
    if path == "/" or path.endswith((".html", ".json", ".png")) and not path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
    return response


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

