# Rebrand Studio – AI-Powered Bulk Image Rebranding Application

A production-quality web application designed for fast, accurate bulk image rebranding. It allows users to upload batches of photos (20–30+ images), upload a transparent company replacement logo, remove old watermarks/logos with inpainting, interactively position new branding anywhere with free drag-and-drop / scaling / rotation / opacity, and export the entire rebranded collection in high-resolution or as a ZIP package.

---

## 1. Project Structure

```
Savecus/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes_projects.py       # Project CRUD and status aggregation
│   │   │   ├── routes_images.py         # Multi-image upload, logo upload, configs
│   │   │   ├── routes_processing.py     # Watermark detection, inpainting, compositing, batch jobs
│   │   │   └── routes_export.py         # Streaming ZIP generation & individual file downloads
│   │   ├── core/
│   │   │   ├── config.py                # App configuration, directories, and limits
│   │   │   └── database.py              # SQLite WAL connection manager and schema initialization
│   │   ├── models/
│   │   │   └── schemas.py               # Pydantic schemas for API requests and responses
│   │   ├── services/
│   │   │   ├── image_service.py         # Safe file handling, validation, thumbnails
│   │   │   ├── inpainting_service.py    # OpenCV Telea, Navier-Stokes & modular AI inpainting
│   │   │   ├── logo_compositor.py       # Normalized server-side alpha compositing & blending
│   │   │   └── logo_detector.py         # Saliency & edge-based watermark candidate detector
│   │   └── main.py                      # FastAPI app, CORS, and static file mounts
│   ├── requirements.txt                 # Backend Python dependencies
│   ├── tests/
│   │   ├── test_stage1.py               # Project CRUD and upload validation tests
│   │   ├── test_stage1_e2e.py           # HTTP server end-to-end integration tests
│   │   ├── test_stages_2_to_5.py        # Inpainting, composition, batch, and ZIP tests
│   │   └── test_stage6_full_suite.py    # Multi-resolution (4K, mobile, square) and 25-image bulk tests
│   └── venv/                            # Python 3.11 virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   └── Dashboard.tsx        # Project management, stats, creation modal
│   │   │   ├── editor/
│   │   │   │   ├── StudioCanvas.tsx     # Konva interactive canvas, transformer, pan/zoom
│   │   │   │   ├── EditorSidebar.tsx    # Placement, rotation, appearance, and removal controls
│   │   │   │   ├── EditorLeftSidebar.tsx# Thumbnail queue strip and image selection
│   │   │   │   └── EditorBottomBar.tsx  # Prev/Next, Undo/Redo, Save, Apply, Batch trigger
│   │   │   ├── gallery/
│   │   │   │   └── ImageGalleryGrid.tsx # Grid layout with thumbnails, dimensions, remove/add
│   │   │   ├── layout/
│   │   │   │   └── Navbar.tsx           # Global header and breadcrumbs
│   │   │   ├── processing/
│   │   │   │   ├── BatchModal.tsx       # Live background batch progress tracking & ZIP download
│   │   │   │   └── CompareModal.tsx     # Interactive before/after split comparison slider
│   │   │   ├── upload/
│   │   │   │   ├── ImageUploader.tsx    # Drag-and-drop batch image uploader
│   │   │   │   └── LogoUploader.tsx     # Replacement logo uploader with checkerboard preview
│   │   │   └── workspace/
│   │   │       └── Workspace.tsx        # Master workspace view coordinating gallery & editor
│   │   ├── hooks/
│   │   │   └── useCanvasHistory.ts      # Undo / Redo history state hook
│   │   ├── services/
│   │   │   └── api.ts                   # Typed API client for backend communication
│   │   ├── types/
│   │   │   └── index.ts                 # Full TypeScript domain models
│   │   ├── App.tsx                      # Root application component
│   │   ├── main.tsx                     # React DOM entrypoint
│   │   └── index.css                    # Tailwind CSS and transparency checkerboard styles
│   ├── package.json
│   ├── vite.config.ts                   # Vite proxy configuration for /api and /static
│   └── tailwind.config.js
└── prompt.md
```

---

## 2. Installation Instructions

### Prerequisites
- **Python 3.11+**
- **Node.js v18+ & npm**

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment with Python 3.11
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install npm packages
npm install
```

---

## 3. Commands to Run Frontend and Backend

### Start the Backend (Port 8000)
```bash
cd backend
source venv/bin/activate
PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API documentation is available at `http://127.0.0.1:8000/docs`.

### Start the Frontend (Port 3000)
```bash
cd frontend
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 4. Required Environment Variables

Create a `.env` file in the `backend/` directory if you wish to configure optional settings:

```env
# Optional: Google Gemini API key for cloud generative AI inpainting
GEMINI_API_KEY=""

# Optional: Maximum upload size in bytes (defaults to 52428800 = 50MB)
MAX_FILE_SIZE=52428800

# Optional: Maximum images per project (defaults to 50)
MAX_PROJECT_IMAGES=50
```

---

## 5. Implemented Features

1. **Dashboard & Project Management**:
   - Modern, Apple-inspired dark SaaS aesthetic.
   - Project cards displaying total images, processed percentage progress bars, logo status, and creation timestamps.
   - Project search, creation modal, and safe project deletion.

2. **Bulk Image Upload System**:
   - Drag-and-drop multiple image uploads (JPG, PNG, WEBP).
   - Thumbnail generation preserving aspect ratio.
   - Dimension sniffing (width × height) and human-readable file sizes.
   - Individual image deletion and "Add More Images" capability.

3. **Replacement Logo Management**:
   - Upload transparent PNG or SVG branding assets.
   - Live checkerboard transparency preview.
   - Alpha channel detection and dimensions display.

4. **Interactive Studio Canvas**:
   - Powered by React Konva with hardware-accelerated rendering.
   - Free drag-and-drop logo positioning anywhere on the base photo.
   - Transformer with corner handles for aspect-ratio locked or unlocked resizing.
   - Rotation handle with free 360° rotation and quick angles (0°, 90°, 180°, -90°).
   - Opacity slider (0–100%).
   - Blend modes: `Normal`, `Multiply` (Darken), `Screen` (Lighten), `Overlay`.
   - Drop shadow toggle with blur, opacity, and offset controls.
   - Canvas viewport controls: Zoom In, Zoom Out, Fit to Screen, Reset, and Pan (with hand tool or Spacebar hold).
   - Multi-level Undo (Cmd+Z) / Redo (Cmd+Shift+Z) history stack.

5. **Normalized Coordinate System**:
   - All positions are stored as normalized $(x, y) \in [0, 1]$ relative to the underlying photo's dimensions.
   - Logo scale is normalized relative to photo width.
   - This ensures identical pixel placement whether rendered on a mobile preview, 1080p display, or during 4K server export.

6. **Global vs Individual Mode**:
   - Global Mode: changes propagate to all images in the project.
   - Individual Mode: custom overrides per image.
   - Copy & Paste placement settings across images.

7. **Old Logo Removal & Background Inpainting**:
   - Manual selection tools: bounding box rectangles and brush drawing.
   - AI candidate watermark detection using gradient saliency and margin contour heuristics.
   - Inpainting engines:
     - OpenCV Fast Marching (`INPAINT_TELEA`)
     - Navier-Stokes Fluid Mechanics (`INPAINT_NS`)
     - Modular Generative AI inpainter adapter with bilateral texture blending.

8. **Before & After Inspection**:
   - Interactive split comparison slider allowing users to scrub between original and rebranded photos.

9. **Batch Processing Engine**:
   - Non-blocking background worker processes batches of 20–30+ images without freezing the UI.
   - Real-time progress bar, completed count, and error state tracking.

10. **Output & Export**:
    - Direct download of individual rebranded images.
    - Single-click streaming ZIP export containing all rebranded images named cleanly based on their original filenames.

---

## 6. Known Limitations

- Inpainting on extremely complex, detailed patterns (e.g. human faces or dense photographic textures directly behind the old logo) using local OpenCV methods can leave minor gradient blurs. For such cases, enabling the Generative AI provider produces optimal results.
- SVG logo rendering on canvas is supported via raster image fallback; highly intricate dynamic SVG filters are converted to transparent PNG rasters upon upload.

---

## 7. Instructions for Integrating an AI Inpainting Provider Later

The backend architecture in `backend/app/services/inpainting_service.py` is modular:

1. **Obtain API Key**:
   Add your API key (e.g. Google Gemini, Replicate, or Runway) to `backend/.env`:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```

2. **Hooking Provider Code**:
   In `backend/app/services/inpainting_service.py`, edit the `GenerativeAIInpainter.inpaint` method:
   ```python
   class GenerativeAIInpainter(BaseInpainter):
       def inpaint(self, image_bgr: np.ndarray, mask_gray: np.ndarray) -> np.ndarray:
           if settings.GEMINI_API_KEY:
               # 1. Encode image_bgr and mask_gray to PNG base64 or bytes
               # 2. Call external generative vision endpoint
               # 3. Decode response bytes to BGR numpy array
               # 4. Return reconstructed image
               return ai_generated_bgr
           
           # Automatic fallback to Navier-Stokes + bilateral filtering
           ...
   ```
   No changes to the frontend or database schemas are needed; the UI already provides the "Generative AI Reconstruct" method selector.

---

## 8. Verification & Test Suite

To run all automated integration and performance tests:
```bash
cd backend
source venv/bin/activate
PYTHONPATH=. pytest tests/ -v
```
All 7 comprehensive tests (CRUD, upload validation, HTTP proxy, watermark detection, OpenCV inpainting, multi-resolution 4K/portrait, and 25-image batch ZIP export) execute and pass in under 2 seconds.

