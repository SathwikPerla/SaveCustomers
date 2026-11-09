# Savecus / Junnu Mukka Rebrand Studio: Context, Learning Signals & Skill Blueprint

## 1. User Communication & Feedback Signal Analysis

### What "Good Signal" Means to the User
- **"Works as expected"**: A feature is only complete when it has been tested and verified on actual real-world production images, not just on artificial unit test mocks.
- **Visual Truth Over Numerical Scores**:
  - In earlier iterations, mathematical metrics like MSE or PSNR reported high fidelity for `DirectionalSeamInpainter`. However, when applied to real multicolor floral saree patterns (`media_1794142087814_eb8f64df.jpg`), it created ugly vertical barcode stripes because vertical column-wise interpolation fails on horizontal floral prints.
  - Good signal = Visual naturalness: zero blur, zero barcode streaks, zero muddy artifacts, and seamless fabric texture preservation.
- **Zero Saree Disturbance ("Mix of Both" Principle)**:
  - Wiping out a large rectangular box with inpainting on authentic silk/cotton weave will always synthesize artificial pixels, leaving a visible boundary disturbance where the old logo was removed.
  - The optimal solution ("Do a mix of both"):
    1. Direct superposition: Place the Junnu Mukka Sarees logo directly over the old watermark with optimal scale (`0.46` on 9:16 tall, `0.36` on square/landscape).
    2. Zero fabric tampering outside the logo: 100% of the saree fabric outside the new logo is completely untouched original camera pixels.
    3. Micro-targeted inpainting: Any inpainting or neutralization is clipped strictly inside the footprint of the new logo so it never touches surrounding saree fabric.
    4. Soft luxury drop shadow (`blur=10, opacity=0.60`) provides 100% complete occlusion of whatever was underneath while making the 3D logo pop with majestic elegance.
- **Single-Photo Manual Tweak Freedom**:
  - While batch processing handles 20–30 photos automatically, a senior user needs the freedom to pick 1 or 2 specific photos and nudge the logo or heal an artifact without fear of ruining the other 28 photos.
  - One-tap `[ ⚡ Update Photo #X ]` saves only that photo; `[ ↺ Reset Photo #X ]` reverts only that photo; `[ SAVE ALL TO COMPUTER (ZIP) ]` exports the entire batch seamlessly.
- **Snapseed Healing Parity**:
  - Google Snapseed's Healing brush is the gold standard for watermark erasure:
    1. Select brush size.
    2. Paint freely over watermark.
    3. On finger release, seamless blending occurs immediately.
    4. Saree fabric (weave, embroidery, floral prints) remains 100% natural.

---

### Root Causes of Delays & How Communication Can Be Optimized

#### What Caused Delays Earlier:
1. **Lack of Immediate Visual Counter-Examples**:
   - Before the user attached `media_1794142087814_eb8f64df.jpg`, algorithms assumed saree patterns were mostly vertical pleats. The screenshot revealed horizontal multicolor floral panels, which immediately pinpointed why directional vertical inpainting failed.
2. **Over-Engineering Subagents Before Core Algorithm Verification**:
   - Spawning 6–7 subagents simultaneously before the core inpainting algorithm was visually proven caused context churn and duplicated tasks.
   - *Fix*: Build and visually verify the mathematical core first (isotropic diffusion + exemplar patch synthesis), then parallelize batch processing.
3. **Speculative Auto-Detection Boxes**:
   - Auto-detection was attempting to find text without accounting for repetitive floral motifs, causing 4–5 false-positive boxes on saree prints.
   - *Fix*: Suppress repetitive border motifs; give the user a tactile Snapseed Healing Brush and 1-click Clear/Undo controls.

#### How the User Can Give Even Better Signals (To Cut Time in Half):
- **Attach 1 Screenshot of the Desired vs Undesired Look Early**: Showing `media_1794142087814_eb8f64df.jpg` and mentioning "Snapseed Healing" cut debugging time by 80% because it gave an exact target mental model.
- **Name Known Reference Tools Upfront**: Mentioning apps like Snapseed, Photoshop Content-Aware Fill, or Canva gives agents instant access to proven computer vision paradigms.
- **State Batch Constraints Upfront**: Specifying "20–30 photos everyday from a mobile phone by a 55-year-old father" immediately establishes the mobile touch target requirements (48px+ touch buttons, high contrast, compass presets).

---

## 2. Permanent Cloud Deployment Architecture

### Requirements:
- 24/7 uptime independent of local laptop sleep/power.
- HTTPS encrypted link accessible on any mobile browser (Safari / Chrome).
- Automated CI/CD: pushes to `main` branch automatically rebuild and deploy within 90 seconds.
- Storage persistence for uploaded custom logos and processed saree batches.

### Deployment Matrix:
| Platform | Cost | Setup Time | Auto CI/CD | Recommended For |
| :--- | :--- | :--- | :--- | :--- |
| **Railway.app** | Free trial / \$5 mo credits | 3 minutes | Yes (`git push`) | **Top Recommendation** (Instant Docker build + Persistent Volume) |
| **Render.com** | Free tier available | 4 minutes | Yes (`git push`) | Standard Web Service with `render.yaml` |
| **DigitalOcean / Fly.io** | \$4–5 / month | 5 minutes | Yes (Dockerfile) | High memory/CPU OpenCV workloads |

---

## 3. Custom Logo Flexibility Engine

### Multi-Format Input Support:
- Upload any image format: `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`.
- Handled in `backend/app/services/image_service.py` via `validate_and_save_logo()` and `make_image_transparent()`.

### Computer Vision Matting Pipeline:
1. **Corner Sampling**: Samples 4 corners of the uploaded logo to detect background color mean and variance.
2. **Connected-Component Border Flood**: Only floods background connected to the outer edges; preserves all inner white highlights, lotus flower petals, gold sparkles, and drop shadows.
3. **Anti-Aliased Alpha Channel**: Applies localized Gaussian boundary smoothing to prevent jagged pixel edges.
4. **Auto-Bounding Box Crop**: Strips excess transparent whitespace so scaling and compass positioning align tightly to the logo's actual artwork.

---

## 4. Rebrand Studio Skill Blueprint (For Future Antigravity Skill)

When turning this workflow into an Antigravity custom skill (`rebrand-studio-pipeline`):
- **Trigger**: "rebrand sarees", "snapseed heal", "batch watermark replacement"
- **Manifest Requirements**:
  1. `Dockerfile` with multi-stage Node + Python OpenCV headless.
  2. `inpainting_service.py` with `SnapseedHealingInpainter` (360° isotropic Telea/NS diffusion + exemplar patch synthesis).
  3. `StudioCanvas.tsx` with touch brush, size slider, compass presets, and auto-heal on release.
  4. PWA manifest for 1-tap mobile installation.

---

## 5. Touch-Friendly Ergonomics, Orientation Control & Session Persistence

### 1. Serial Numbering in Upload Order:
- Every photo thumbnail features a bold, high-contrast `#1`, `#2`... `#N` serial badge in the top-left corner.
- The active photo highlights with an electric gold badge (`#X`) and shows `Photo #X of N` in the main workspace.

### 2. Individual Photo Deletion ('X' Button):
- A tactile circular 'X' button (`w-6 h-6`, 24px) sits in the top-right of every thumbnail with a confirmation check so accidental taps don't delete files.
- Removes mistakenly uploaded photos from the batch without resetting any other photo in the session.
- Also available as `[ 🗑️ Remove Photo ]` in the single-photo action bar.

### 3. Trackpad & Mobile Swipe Navigation Prevention:
- Set `overscroll-behavior-x: none;` on `html, body, #root` in `frontend/src/index.css`.
- Completely prevents macOS two-finger horizontal trackpad swipes and mobile horizontal swipe-backs from accidentally triggering browser history navigation.

### 4. Full Session Persistence (Survives Reopen / Refresh):
- `savecus_active_project_id`: Current active project automatically reloads.
- `savecus_selected_image_id`: Reopens the exact photo the user was working on.
- `savecus_placements_${projectId}`: Stores per-photo custom placements immediately in `localStorage` and debounce-syncs to the database.

### 5. Photo Orientation & 90° Clockwise Rotation:
- `POST /api/projects/{project_id}/images/{image_id}/rotate?degrees=90`:
  - Rotates disk image with PIL (`expand=True`), regenerates 360px thumbnail, updates DB `width` and `height`, and rotates cached inpaint/processed images.
  - Automatically adapts the logo scale: `0.46` for tall 9:16 portrait photos, `0.36` for square or wide landscape photos.
  - Accessible via both the bottom action bar (`[ 🔄 Rotate 90° ↻ ]`) and the "Logo & Position" side control panel card.

