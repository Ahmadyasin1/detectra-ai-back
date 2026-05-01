"""
PerceptionAgent — Layer 3 of the Detectra AI multi-agent pipeline.

Responsibilities:
  - Run ALL 5 perception modules IN PARALLEL using ThreadPoolExecutor
  - Object detection (YOLOv8)
  - Logo recognition (ViT-ONNX)
  - Motion/action recognition (VideoMAE-ONNX)
  - Speech-to-text (Whisper)
  - Environmental audio classification (YAMNet)
  - Write results to EventBus for FusionAgent consumption
"""
from __future__ import annotations

import concurrent.futures
from pathlib import Path
from typing import Any

import structlog

from app.services.agents.base_agent import BaseAgent, EventBus, ProgressCallback

logger = structlog.get_logger(__name__)


class PerceptionAgent(BaseAgent):
    name = "PerceptionAgent"

    def __init__(
        self,
        bus: EventBus,
        progress_cb: ProgressCallback | None = None,
        max_workers: int = 4,
    ):
        super().__init__(bus, progress_cb)
        self.max_workers = max_workers

    # ─── Individual sub-tasks ─────────────────────────────────────────────────

    def _run_object_detection(self) -> list[dict]:
        if not self.bus.config.get("enable_object_detection", True):
            return []
        from app.services.pipeline.object_detector import ObjectDetectorService
        detector = ObjectDetectorService()
        results = detector.detect(
            self.bus.frames,
            extraction_fps=self.bus.config.get("frame_extraction_fps", 1.0),
        )
        self.log.info("Object detection", detections=len(results))
        return results

    def _run_logo_recognition(self) -> list[dict]:
        if not self.bus.config.get("enable_logo_recognition", True):
            return []
        from app.services.pipeline.logo_recognizer import LogoRecognizerService
        service = LogoRecognizerService()
        results = service.recognize(
            self.bus.frames,
            extraction_fps=self.bus.config.get("frame_extraction_fps", 1.0),
        )
        self.log.info("Logo recognition", detections=len(results))
        return results

    def _run_motion_recognition(self) -> list[dict]:
        if not self.bus.config.get("enable_motion_recognition", True) or not self.bus.metadata:
            return []
        from app.services.pipeline.motion_recognizer import MotionRecognizerService
        service = MotionRecognizerService()
        fps = getattr(self.bus.metadata, "fps", None) or 25.0
        results = service.recognize(Path(self.bus.video_path), fps)
        self.log.info("Motion recognition", segments=len(results))
        return results

    def _run_speech_recognition(self) -> list[dict]:
        if not self.bus.config.get("enable_speech_to_text", True) or not self.bus.audio_path:
            return []
        from app.services.pipeline.speech_recognizer import SpeechRecognizerService
        service = SpeechRecognizerService()
        results = service.transcribe(Path(self.bus.audio_path))
        self.log.info("Speech recognition", segments=len(results))
        return results

    def _run_audio_classification(self) -> list[dict]:
        if not self.bus.config.get("enable_audio_classification", True) or not self.bus.audio_path:
            return []
        from app.services.pipeline.audio_classifier import AudioClassifierService
        service = AudioClassifierService()
        results = service.classify(Path(self.bus.audio_path))
        self.log.info("Audio classification", events=len(results))
        return results

    # ─── Parallel execution ───────────────────────────────────────────────────

    def run(self) -> dict[str, list[dict]]:
        self.report_progress(20, "perception_agent:starting_parallel_inference")

        tasks = {
            "object": self._run_object_detection,
            "logo": self._run_logo_recognition,
            "motion": self._run_motion_recognition,
            "speech": self._run_speech_recognition,
            "audio": self._run_audio_classification,
        }

        outputs: dict[str, list[dict]] = {}

        # Run perception modules in parallel for maximum throughput
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(fn): name for name, fn in tasks.items()}
            for future in concurrent.futures.as_completed(futures):
                name = futures[future]
                try:
                    outputs[name] = future.result()
                except Exception as exc:
                    self.log.warning("Perception module failed", module=name, error=str(exc))
                    outputs[name] = []
                    self.bus.errors.append(f"PerceptionAgent.{name}: {exc}")

        # Write results to EventBus
        self.bus.object_results = outputs.get("object", [])
        self.bus.logo_results = outputs.get("logo", [])
        self.bus.motion_results = outputs.get("motion", [])
        self.bus.speech_results = outputs.get("speech", [])
        self.bus.audio_results = outputs.get("audio", [])

        self.report_progress(65, "perception_agent:complete")
        self.log.info("Perception complete",
                      objects=len(self.bus.object_results),
                      logos=len(self.bus.logo_results),
                      motions=len(self.bus.motion_results),
                      speech=len(self.bus.speech_results),
                      audio=len(self.bus.audio_results))
        return outputs
