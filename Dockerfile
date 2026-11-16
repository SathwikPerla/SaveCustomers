# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source & ONLY the preset brand logos (not per-project generated copies)
COPY backend/app ./app
COPY backend/data/logos/junnu_mukka_transparent.png backend/data/logos/*_savecus_logo.png ./data/logos/

# Writable working folders for uploads / processed photos / database
RUN mkdir -p /app/data/uploads /app/data/processed /app/data/thumbnails /app/data/masks /app/data/exports \
    && chmod -R 777 /app/data

# Copy built frontend dist from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose port 8000
EXPOSE 8000

ENV PORT=8000
ENV PYTHONPATH=/app
# Keep memory low on small (512 MB) cloud servers
ENV MALLOC_ARENA_MAX=2

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

