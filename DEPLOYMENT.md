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

## ☁️ Part 2: Making It Permanent 24/7 (Laptop Independent)

Currently, the local tunnel runs from your MacBook. When the MacBook sleeps or closes, the tunnel drops.
To make it permanently online 24/7 so your father can use it anytime anywhere:

### 🏆 Recommended Method: Railway.app (Takes 3 Minutes, Zero DevOps)

Railway automatically builds the included `Dockerfile` and gives you a permanent, fast SSL URL (e.g. `https://junnu-sarees.up.railway.app`).

#### Step 1: Create a GitHub Repository
1. On your Mac terminal, initialize and push this repo to your GitHub account:
   ```bash
   git remote add origin https://github.com/<your-username>/savecus-studio.git
   git branch -M main
   git push -u origin main
   ```

#### Step 2: Deploy on Railway
1. Go to [railway.app](https://railway.app) and sign up/log in with GitHub.
2. Click **"+ New Project"** ➔ **"Deploy from GitHub repo"**.
3. Select your `savecus-studio` repository.
4. Railway will automatically detect the `Dockerfile` and start building the container.
5. Click on the project tile ➔ **Settings** ➔ **Networking** ➔ Click **"Generate Domain"**.
   - You will get a permanent URL like `https://savecus-studio-production.up.railway.app`.
   - *(Optional)* You can also connect a custom domain like `studio.junnumukkasarees.com`.
6. *(Optional Data Persistence)*: Under the service settings, click **Add Volume** and mount `/app/backend/data` so uploaded logos persist forever even when restarting.

---

### 🌐 Alternative Method: Render.com (Free Tier)

1. Sign up at [render.com](https://render.com).
2. Click **"New +"** ➔ **"Web Service"** ➔ Connect your GitHub repo.
3. Render automatically detects the root `render.yaml` configuration and `Dockerfile`.
4. Click **Deploy Web Service**.
5. You will get a permanent URL like `https://savecus-rebrand-studio.onrender.com`.

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

## 🧪 Current Live Development Status (Mac Tunnel Active Now)

While you prepare your GitHub push, the live encrypted tunnel is active right now:
- **Cloudflare Public Link**: `https://reduced-volumes-touched-advocacy.trycloudflare.com`
- **Local Wi-Fi Network**: `http://192.168.1.102:8080`
- **Local Mac**: `http://localhost:8080`
- **All 21 Rebranded Sarees**: Saved in `/Users/sathwikperla/Desktop/Savecus/the batch updated` (also zipped in `the batch updated.zip`).
