"""
Video Preprocessor
Extracts timestamped frames (OpenCV) and audio (FFmpeg) from video files.
"""
from __future__ import annotations

import subprocess
import uuid
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


@dataclass
class Frame:
    timestamp_s: float
    image: np.ndarray          # BGR uint8, shape (H, W, 3)
    frame_index: int


@dataclass
class VideoMetadata:
    duration_seconds: float
    width: int
    height: int
    fps: float
    total_frames: int
    thumbnail_path: str | None = None


class VideoPreprocessor:
    def __init__(self):
        self.temp_dir = Path(settings.TEMP_DIR)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.upload_dir = Path(settings.UPLOAD_DIR)

    def extract_frames(self, video_path: Path, fps: float = 1.0) -> list[Frame]:
        """
        Extract frames from video at the given frame rate.
        Returns a list of Frame objects with timestamps.
        """
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_interval = max(1, int(video_fps / fps))

        frames: list[Frame] = []
        frame_idx = 0
        extracted_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                timestamp_s = frame_idx / video_fps
                frames.append(Frame(
                    timestamp_s=round(timestamp_s, 3),
                    image=frame,
                    frame_index=extracted_idx,
                ))
                extracted_idx += 1

            frame_idx += 1

        cap.release()
        logger.info("Frames extracted", count=len(frames), fps=fps, video=str(video_path))
        return frames

    def extract_audio(self, video_path: Path) -> Path | None:
        """
        Extract audio track from video as a 16kHz mono WAV file using FFmpeg.
        Returns path to the WAV file or None if no audio track.
        """
        out_path = self.temp_dir / f"audio_{uuid.uuid4().hex}.wav"
        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-vn",                    # No video
            "-acodec", "pcm_s16le",   # 16-bit PCM
            "-ar", "16000",           # 16 kHz (required by Whisper)
            "-ac", "1",               # Mono
            str(out_path),
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=300)
        if result.returncode != 0 or not out_path.exists():
            logger.warning("Audio extraction failed or no audio track", video=str(video_path))
            return None

        logger.info("Audio extracted", path=str(out_path), size_kb=out_path.stat().st_size // 1024)
        return out_path

    def get_metadata(self, video_path: Path) -> VideoMetadata:
        """Extract video metadata using OpenCV."""
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0.0

        # Extract thumbnail (frame at 5% of video)
        thumbnail_path: str | None = None
        try:
            thumb_frame_idx = max(0, int(total_frames * 0.05))
            cap.set(cv2.CAP_PROP_POS_FRAMES, thumb_frame_idx)
            ret, thumb_frame = cap.read()
            if ret:
                thumb_path = self.upload_dir / f"thumb_{video_path.stem}.jpg"
                cv2.imwrite(str(thumb_path), thumb_frame)
                thumbnail_path = str(thumb_path)
        except Exception as e:
            logger.warning("Thumbnail extraction failed", error=str(e))

        cap.release()
        return VideoMetadata(
            duration_seconds=round(duration, 3),
            width=width,
            height=height,
            fps=round(fps, 3),
            total_frames=total_frames,
            thumbnail_path=thumbnail_path,
        )

    @staticmethod
    def resize_frame(frame: np.ndarray, size: tuple[int, int] = (224, 224)) -> np.ndarray:
        """Resize frame for model input."""
        return cv2.resize(frame, size, interpolation=cv2.INTER_LINEAR)

    @staticmethod
    def frame_to_rgb(frame: np.ndarray) -> np.ndarray:
        """Convert BGR (OpenCV default) to RGB."""
        return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
