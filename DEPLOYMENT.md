# Savecus Rebrand Studio – Deployment Guide

Savecus Rebrand Studio is fully containerized and production-ready.

---

## 🚀 Option 1: Instant Live Link (Active Now)
The app is currently deployed and running live with an encrypted HTTPS link:

- **Live Public URL (Cloudflare Enterprise Edge)**: `https://because-languages-diary-compilation.trycloudflare.com`
- **Local Mac URL**: `http://localhost:8080`
- **Home Wi-Fi Network URL**: `http://192.168.1.102:8080`

Send this URL directly to your father's phone via WhatsApp or SMS. It opens immediately in Safari or Chrome without installing any apps or entering passwords.

---

## ☁️ Option 2: Permanent 24/7 Cloud Deployment (Render.com)
To keep the app online 24/7 for free even when your laptop is turned off:

1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Savecus Rebrand Studio initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. Log into [Render.com](https://render.com) (free).
3. Click **New +** -> **Web Service**.
4. Select your GitHub repository.
5. Render will automatically detect `render.yaml` and the `Dockerfile`.
6. Click **Deploy**. Within 2 minutes, you will receive a permanent custom URL like `https://savecus-studio.onrender.com`.

---

## 🐳 Option 3: Local Docker Container
Run the unified frontend & backend with a single Docker command:

```bash
docker compose up -d --build
```
Access at `http://localhost:8000` or `http://<your-ip>:8000`.

