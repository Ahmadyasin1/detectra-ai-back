"""
StreamAgent — Layer 1 of the Detectra AI multi-agent pipeline.

Responsibilities:
  - Open video file (or RTSP stream URL)
  - Extract frames at configurable FPS
  - Extract audio track as WAV
  - Embed accurate timestamps from video PTS (presentation timestamps)
  - Apply CLAHE contrast enhancement for low-light footage
  - Populate EventBus with frames, audio_path, and metadata
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
import structlog

from app.services.agents.base_agent import BaseAgent, EventBus, ProgressCallback

logger = structlog.get_logger(__name__)


class StreamAgent(BaseAgent):
    name = "StreamAgent"

    def __init__(
        self,
        bus: EventBus,
        progress_cb: ProgressCallback | None = None,
        apply_clahe: bool = True,
    ):
        super().__init__(bus, progress_cb)
        self.apply_clahe = apply_clahe
        # CLAHE for low-light contrast enhancement (surveillance cameras)
        self._clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    def run(self):
        from app.services.pipeline.preprocessor import VideoPreprocessor

        video_path = Path(self.bus.video_path)
        config = self.bus.config
        fps = config.get("frame_extraction_fps", 1.0)

        self.report_progress(2, "stream_agent:opening_video")
        preprocessor = VideoPreprocessor()

        # Extract metadata first
        metadata = preprocessor.get_metadata(video_path)
        self.bus.metadata = metadata
        self.log.info("Video metadata", duration=metadata.duration_seconds,
                      resolution=f"{metadata.width}x{metadata.height}",
                      source_fps=metadata.fps)

        # Extract frames with optional CLAHE enhancement
        self.report_progress(5, "stream_agent:extracting_frames")
        frames = preprocessor.extract_frames(video_path, fps=fps)

        if self.apply_clahe and frames:
            enhanced = []
            for frame in frames:
                img = frame.image
                # Apply CLAHE to L channel in LAB space for natural enhancement
                try:
                    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
                    l_ch, a_ch, b_ch = cv2.split(lab)
                    l_ch = self._clahe.apply(l_ch)
                    enhanced_lab = cv2.merge([l_ch, a_ch, b_ch])
                    enhanced_img = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)
                    from app.services.pipeline.preprocessor import Frame
                    enhanced.append(Frame(
                        timestamp_s=frame.timestamp_s,
                        image=enhanced_img,
                        frame_index=frame.frame_index,
                    ))
                except Exception:
                    enhanced.append(frame)
            frames = enhanced

        self.bus.frames = frames

        # Extract audio
        self.report_progress(12, "stream_agent:extracting_audio")
        audio_path = preprocessor.extract_audio(video_path)
        self.bus.audio_path = str(audio_path) if audio_path else None

        self.log.info("Stream ingestion complete",
                      frames=len(frames), audio=str(audio_path))
        return {"frames": len(frames), "audio": str(audio_path), "duration": metadata.duration_seconds}
