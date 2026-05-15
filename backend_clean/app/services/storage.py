"""
Storage Service
Handles video file save/delete operations with organized directory structure.
"""
from __future__ import annotations

import uuid
from pathlib import Path

import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


class StorageService:
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def save_upload(self, content: bytes, suffix: str, user_id: int) -> tuple[str, Path]:
        """
        Save uploaded file content to disk.
        Returns (stored_filename, absolute_path).
        """
        user_dir = self.upload_dir / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)

        stored_name = f"{uuid.uuid4().hex}{suffix}"
        file_path = user_dir / stored_name
        file_path.write_bytes(content)

        logger.info("File saved", path=str(file_path), size_bytes=len(content))
        return stored_name, file_path

    def delete_video_files(self, video) -> None:
        """Delete video file and its thumbnail from disk."""
        file_path = Path(video.file_path)
        if file_path.exists():
            file_path.unlink()
            logger.info("Video file deleted", path=str(file_path))

        if video.thumbnail_path:
            thumb = Path(video.thumbnail_path)
            if thumb.exists():
                thumb.unlink()
                logger.info("Thumbnail deleted", path=str(thumb))

    def get_video_path(self, stored_filename: str, user_id: int) -> Path:
        return self.upload_dir / str(user_id) / stored_filename
