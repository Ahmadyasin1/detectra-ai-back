from datetime import datetime

from pydantic import BaseModel


class VideoRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    original_filename: str
    file_size_bytes: int
    duration_seconds: float | None
    width: int | None
    height: int | None
    fps: float | None
    status: str
    thumbnail_path: str | None
    created_at: datetime


class VideoListItem(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    original_filename: str
    file_size_bytes: int
    duration_seconds: float | None
    status: str
    thumbnail_path: str | None
    created_at: datetime


class VideoPage(BaseModel):
    items: list[VideoListItem]
    total: int
    page: int
    page_size: int
    total_pages: int
