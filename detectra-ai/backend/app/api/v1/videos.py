import math
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import ForbiddenException, NotFoundException, UnsupportedVideoFormatException, VideoTooLargeException
from app.db.models.user import User
from app.db.models.video import Video, VideoStatus
from app.db.session import get_db
from app.dependencies import get_current_active_user
from app.schemas.video import VideoPage, VideoRead
from app.services.storage import StorageService

router = APIRouter(prefix="/videos", tags=["Videos"])


@router.post("/upload", response_model=VideoRead, status_code=status.HTTP_201_CREATED)
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Video:
    # Validate extension
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in settings.ALLOWED_VIDEO_EXTENSIONS:
        raise UnsupportedVideoFormatException(suffix)

    # Read & validate size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_VIDEO_SIZE_MB:
        raise VideoTooLargeException(settings.MAX_VIDEO_SIZE_MB)

    # Store file
    storage = StorageService()
    stored_name, file_path = storage.save_upload(content, suffix, current_user.id)

    # Persist record
    video = Video(
        user_id=current_user.id,
        original_filename=file.filename or stored_name,
        stored_filename=stored_name,
        file_path=str(file_path),
        file_size_bytes=len(content),
        status=VideoStatus.UPLOADED,
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    # Extract metadata asynchronously (best-effort)
    try:
        from app.services.pipeline.preprocessor import VideoPreprocessor
        metadata = VideoPreprocessor().get_metadata(file_path)
        video.duration_seconds = metadata.duration_seconds
        video.width = metadata.width
        video.height = metadata.height
        video.fps = metadata.fps
        video.thumbnail_path = metadata.thumbnail_path
        db.commit()
        db.refresh(video)
    except Exception:
        pass  # Non-critical

    return video


@router.get("/", response_model=VideoPage)
def list_videos(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> VideoPage:
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size
    total = db.query(Video).filter(Video.user_id == current_user.id).count()
    videos = (
        db.query(Video)
        .filter(Video.user_id == current_user.id)
        .order_by(Video.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return VideoPage(
        items=videos,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 1,
    )


@router.get("/{video_id}", response_model=VideoRead)
def get_video(
    video_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Video:
    video = db.get(Video, video_id)
    if not video:
        raise NotFoundException("Video")
    if video.user_id != current_user.id:
        raise ForbiddenException()
    return video


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(
    video_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    video = db.get(Video, video_id)
    if not video:
        raise NotFoundException("Video")
    if video.user_id != current_user.id:
        raise ForbiddenException()

    storage = StorageService()
    storage.delete_video_files(video)

    db.delete(video)
    db.commit()


@router.get("/{video_id}/thumbnail")
def get_thumbnail(
    video_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    video = db.get(Video, video_id)
    if not video:
        raise NotFoundException("Video")
    if video.user_id != current_user.id:
        raise ForbiddenException()
    if not video.thumbnail_path or not Path(video.thumbnail_path).exists():
        raise NotFoundException("Thumbnail")
    return FileResponse(video.thumbnail_path, media_type="image/jpeg")
