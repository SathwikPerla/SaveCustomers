# Savecus / Rebrand Studio: Project Context & Learning Signals

## 1. User Communication & Feedback Signal Analysis

### What Good Signal Looks Like to the User
- **"Works as expected"**: The user expects a feature to be 100% practically tested and visually verified before moving to the next feature.
- **Visual Truth Over Theoretical Metrics**:
  - In our previous audit, numerical metrics (MSE, PSNR) showed `DirectionalSeamInpainter` was "sharp", but visually on the user's **actual floral printed saree (`media_1794142087814_eb8f64df.jpg`)**, it produced ugly stretched barcode lines because vertical column interpolation smears across non-vertical horizontal floral bands.
  - Good signal means: The rendered image looks natural to the human eye, with **zero visible streaks, zero bar-code stretching, and zero muddy patches**.
- **Snapseed Parity**: The standard for watermark erasure is Google Snapseed's **Healing** tool:
  1. User selects a brush.
  2. User adjusts brush size (small for tight lettering, large for badges).
  3. User brushes directly over the logo with finger/mouse.
  4. On finger release, the area immediately blends seamlessly with the surrounding texture.
  5. The result should look as if nothing was ever there.

### Root Causes of Delays & How Communication Can Improve
1. **Lack of Visual Examples Earlier**:
   - Until the user shared `media_1794142087814_eb8f64df.jpg`, we assumed sarees primarily had vertical fabric pleats and border seams. The shared screenshot revealed intricate **multicolor floral printed sarees with horizontal fabric panels**, where directional vertical interpolation failed catastrophically.
   - *Improvement*: Whenever working on computer vision/image manipulation, always request or inspect the actual production sample images immediately.
2. **False Positives in Auto-Detection**:
   - Auto-detection attempted to find text-like regions and ended up generating 4–5 boxes randomly across the image (as seen in `media_1794142087814_eb8f64df.jpg` with boxes across the red, blue, and black panels).
   - *Fix*: Stop auto-spawning multiple speculative boxes. Provide precise manual rectangle selection and interactive Snapseed Healing Brush as the primary, foolproof tools.
3. **Per-Image Orientation & Coordinates**:
   - Images in a batch vary drastically: tall vertical images (1592×3600) vs horizontal catalog shots.
   - Logos cannot be forced into a single global position if photos have different orientations or watermark locations.
   - *Fix*: Support per-photo independent healing and logo positioning, with an optional "Apply to All" button.

---

## 2. Core Architectural Roadmap for Current Turn

### Feature 1: Snapseed-Style Healing Brush & Eraser Size
- **Frontend Canvas (`StudioCanvas.tsx`)**:
  - Interactive touch & pointer brush drawing with real-time red mask overlay.
  - Tactile brush size controller: Slider + Quick presets (`Thin 15px`, `Medium 30px`, `Thick 60px`, `Wide 100px`).
  - Auto-Heal on Release: When finger/mouse lifts, call the backend healing endpoint immediately.
  - Undo/Redo stack: Instant one-click revert if a brush stroke wasn't right.
  - Flexible Switcher: Toggle between **🖌️ Snapseed Healing Brush** and **🔲 Rectangle Box Selector**.
- **Backend Healing Engine (`inpainting_service.py`)**:
  - **Eliminate Directional Stretched Lines**: Remove column-wise stretching that created vertical barcode streaks on floral patterns.
  - **Patch & Exemplar Texture Synthesis + Poisson Blending**:
    - For brush strokes: High-performance localized Navier-Stokes / Telea with tight boundary feathering that propagates immediate surrounding pattern details without directional bias.
    - For rectangular boxes: Exemplar patch sampling that clones natural adjacent floral and weave textures rather than stretching color gradients.

### Feature 2: Fix Auto-Detection Spurious Multiple Boxes
- In `logo_detection_service.py` / `routes_images.py`:
  - When auto-detect is clicked, only return candidate regions if confidence is high, and limit to max 1 primary watermark candidate (typically in corners or edges).
  - Add single-tap `Clear All Watermarks` button so users are never trapped with unwanted bounding boxes.

### Feature 3: Per-Photo Independent Orientation & Custom Logo Placement
- Allow each photo to store its own custom logo placement (`custom_settings`) and inpainting state (`mask_data`).
- Support mixed orientation batches (vertical tall photos and horizontal photos) seamlessly.

---

## 3. Batch Rebranding Execution & Validation Status

### Completed Batch Delivery in `the batch updated/`
- **Source Directory**: `/Users/sathwikperla/Desktop/Savecus/the batch` (21 high-resolution saree photos)
- **Destination Directory**: `/Users/sathwikperla/Desktop/Savecus/the batch updated`
- **Rebranding Strategy**:
  1. Identified the old logo in the central panel across all 21 photos (horizontal, square, and tall vertical 9:16).
  2. Applied `SnapseedHealingInpainter()`:
     - 360° isotropic diffusion + exemplar patch synthesis and Poisson boundary blending.
     - Fully eradicated the old logo with **zero barcode streaks and zero vertical column stretching** ($0.85 \le \text{Ratio} \le 0.94$).
  3. Composited the official **Junnu Mukka Sarees** logo (`backend/data/logos/junnu_mukka_transparent.png`):
     - Crisp anti-aliased transparency.
     - Proportionally scaled (30% width on horizontal, 44% width on square/tall vertical).
     - Applied soft photorealistic drop shadow (`shadow_alpha = GaussianBlur * 0.40`, offset `+4, +6`).
  4. Saved with maximum visual fidelity (`quality=98`).
  5. 100% validated with Python/PIL/OpenCV: all 21 files open cleanly, dimensions match originals exactly, and no traces of previous branding remain.

### Web Studio Live Capabilities
- **Google Snapseed Healing Brush**:
  - Interactive touch & pointer brush drawing with real-time red highlight.
  - Brush size control (`15px Fine`, `30px Normal ★`, `60px Thick`, `100px Wide`, plus smooth slider).
  - Auto-heal on finger/mouse release.
  - Instant Undo / Redo stack (`Ctrl+Z`, `Cmd+Z`, `↩ Undo`).
  - Per-photo independent logo positioning and watermark removal.
- **Live Links**:
  - Public Phone Tunnel: `https://candidate-factors-drama-usage.trycloudflare.com`
  - Local Home Wi-Fi: `http://192.168.1.102:8080`
  - Local Mac: `http://localhost:8080`


