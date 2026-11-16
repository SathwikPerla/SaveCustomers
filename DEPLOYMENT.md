# 🌟 Savecus / Junnu Mukka Sarees Studio – Permanent Deployment & Maintenance Guide

This guide explains how to make the **Rebrand Studio** permanent 24/7 in the cloud so your father can access it everyday from his phone without needing your laptop to stay awake, how to use any custom logo icon, and how to push future code updates seamlessly.

---

## 📱 Part 1: How Your Father Uses Any Logo on His Phone

The app includes **Automated Background Matting & Transparency**:
1. **Open the App**: Your father opens the link in his phone browser (Safari or Chrome).
2. **Tap `[ + Upload Your Own Logo ]`**:
   - He can select any image from his phone photo gallery, camera, or WhatsApp downloads.
   - It supports `.png`, `.jpg`, `.jpeg`, `.webp`, and `.svg`.
3. **Automatic Clean Transparency**:
   - If the image has a white, off-white, black, or uniform solid background, the server's computer-vision matting automatically strips the background to **100% transparent PNG**, preserving all fine inner artwork, gold gradients, drop shadows, and lettering.
   - It also automatically crops out excessive transparent margins.
4. **Tap to Select**:
   - The uploaded logo is instantly saved to the logo shelf with a green checkmark `✓ Transparent PNG (0 background)`.
   - Tapping it makes it active on all canvas photos immediately.
5. **Positioning & Batching**:
   - Drag with finger or tap **Bottom Right**, **Center**, etc.
   - Tap **`[ ☵ Apply This Logo Position to All Photos ]`** to sync the logo placement across 20–30 saree photos in one tap.

---

## ☁️ Part 2: Permanent 24/7 Link on Render.com (Free)

The repo contains a Render **Blueprint** (`render.yaml`), so Render reads every setting from it.

### One-time setup (about 10 minutes)
1. Go to <https://dashboard.render.com> and **sign in with GitHub**.
2. Click **New + → Blueprint**, pick **`SathwikPerla/SaveCustomers`**, branch **`main`**.
3. Render shows the service `savecus-rebrand-studio` (Docker, Free, Singapore). It asks for **`ACCESS_KEY`**: type your private access code (see below) → **Apply**.
4. Wait for the first build (~5–8 min). The service page shows your permanent URL, e.g.
   **`https://savecus-rebrand-studio.onrender.com`** (it never changes).
5. Keep it awake (free plan sleeps after 15 min without visits):
   go to <https://uptimerobot.com> (free) → **New monitor → HTTP(s)** →
   URL `https://<your-render-url>/api/health` → interval **5 minutes** → Create.
   This also emails you if the site is ever down.

### Settings Render uses (already in `render.yaml`)
| Setting | Value |
|---|---|
| Runtime | Docker (root `Dockerfile`; builds the React app, then runs FastAPI) |
| Start command | from Dockerfile: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT}` |
| `PORT` | `8000` |
| `MAX_IMAGE_SIDE` | `3000` (huge camera photos are scaled to 3000px longest side) |
| `ACCESS_KEY` | your private code (set in the Render dashboard, never in git) |
| Health check | `/api/health` |
| Auto-deploy | every `git push` to `main` redeploys automatically |

### The private access code
The cloud link is public on the internet, so the app is locked with `ACCESS_KEY`.
Give your father this link **once**:

    https://<your-render-url>/?key=<ACCESS_KEY>

His phone then remembers it (5 years). After that, the plain link (and the home-screen app) just opens.
Anyone without the code only sees an “Enter access code” page. To change the code: Render → service → **Environment** → edit `ACCESS_KEY` → Save (phones then need the new `?key=` link once).

### Storage: is the free (temporary) disk enough?
Yes, for the daily flow **upload → edit → Preview & Save / ZIP → done**. Photos are stored on the server's
temporary disk and are **wiped whenever the server restarts or redeploys** (after a `git push`, or occasionally by Render).
So: **always save/download the finished photos the same session**; don't keep batches on the server for days.
A persistent disk needs a paid plan (Render Starter ~$7/mo + disk) — not needed for this workflow.

### Free-plan limits to know
- 512 MB RAM: tested with 30 WhatsApp photos (peak ~290 MB) and full 12 MP camera photos (peak ~430 MB) — OK.
- 750 free hours / month: one always-on service uses ≤ 744 h, so it fits.
- First build after a push takes a few minutes; during that time the old version keeps serving.

---

## 🔄 Part 3: How to Make Updates & Changes Later

Once your permanent deployment is live on Railway or Render, **making future updates is 100% automated via Git Continuous Deployment (CI/CD)**:

Whenever you or we change code, adjust colors, or add new tools:
```bash
# 1. Check changed files
git status

# 2. Stage the changes
git add .

# 3. Commit with a message describing what was improved
git commit -m "Improve brush smoothness and add new logo presets"

# 4. Push to GitHub
git push origin main
```

### What Happens Automatically:
1. GitHub notifies Railway / Render of the new push.
2. The cloud server automatically triggers a new container build.
3. It builds the new Vite frontend and launches the new backend.
4. **Zero Downtime**: The existing version remains live until the new build passes health checks, then switches over seamlessly.
5. Your father simply refreshes the page on his phone and gets the new version immediately—**no URL changes, no manual server steps!**

---

## 📲 Part 4: How Your Father Can Add It to His Phone Home Screen (PWA)

The application includes full Progressive Web App (PWA) support (`manifest.json` and standalone mobile display):

### On iPhone (Safari):
1. Open the permanent URL in Safari.
2. Tap the **Share** button (box with an upward arrow at the bottom).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add**. A "Junnu Sarees" app icon will appear directly on his home screen.
5. Tapping the icon opens the app in fullscreen mode without any Safari navigation bars!

### On Android (Chrome):
1. Open the permanent URL in Chrome.
2. Tap the three dots (⋮) in the top-right corner.
3. Tap **"Install App"** or **"Add to Home screen"**.
4. The app installs like a regular Android app from Google Play.

---
