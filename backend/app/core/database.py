import sqlite3
import json
from contextlib import contextmanager
from datetime import datetime
from typing import Generator, Any, Optional
from app.core.config import settings

def dict_factory(cursor: sqlite3.Cursor, row: tuple) -> dict[str, Any]:
    fields = [column[0] for column in cursor.description]
    return {key: value for key, value in zip(fields, row)}

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(str(settings.DB_PATH), check_same_thread=False, timeout=30.0)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Projects table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                global_settings TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Images table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS images (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                original_filename TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                thumbnail_filename TEXT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                file_size INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'uploaded',
                error_message TEXT DEFAULT NULL,
                custom_settings TEXT DEFAULT NULL,
                mask_data TEXT DEFAULT NULL,
                inpainting_method TEXT DEFAULT 'telea',
                processed_filename TEXT DEFAULT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Logos table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS logos (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                original_filename TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                file_size INTEGER NOT NULL,
                has_alpha INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
        """)
        
        # Batch jobs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS batch_jobs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                status TEXT NOT NULL DEFAULT 'pending',
                total_images INTEGER NOT NULL DEFAULT 0,
                processed_images INTEGER NOT NULL DEFAULT 0,
                failed_images INTEGER NOT NULL DEFAULT 0,
                current_image_id TEXT DEFAULT NULL,
                error_message TEXT DEFAULT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_images_project ON images(project_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_logos_project ON logos(project_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_project ON batch_jobs(project_id)")

