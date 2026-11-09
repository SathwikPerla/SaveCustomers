import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Rebrand Studio API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    
    UPLOADS_DIR: Path = DATA_DIR / "uploads"
    LOGOS_DIR: Path = DATA_DIR / "logos"
    MASKS_DIR: Path = DATA_DIR / "masks"
    PROCESSED_DIR: Path = DATA_DIR / "processed"
    THUMBNAILS_DIR: Path = DATA_DIR / "thumbnails"
    EXPORTS_DIR: Path = DATA_DIR / "exports"
    
    DB_PATH: Path = DATA_DIR / "rebrand_studio.db"
    
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    MAX_PROJECT_IMAGES: int = 50
    
    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp"}
    ALLOWED_LOGO_EXTENSIONS: set = {".png", ".svg", ".webp", ".jpg", ".jpeg"}
    
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()

# Ensure directories exist
for folder in [
    settings.DATA_DIR,
    settings.UPLOADS_DIR,
    settings.LOGOS_DIR,
    settings.MASKS_DIR,
    settings.PROCESSED_DIR,
    settings.THUMBNAILS_DIR,
    settings.EXPORTS_DIR,
]:
    folder.mkdir(parents=True, exist_ok=True)
