"""
Motion / Action Recognizer Service
Uses VideoMAE fine-tuned on UCF-101, exported as ONNX + INT8 quantized.
Sliding window inference: 16 frames at 8fps.

Training: See notebooks/02_motion_recognition_training.ipynb (Kaggle P100, ~6 hrs)
Dataset: UCF-101 (101 action classes, 13K videos)
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import cv2
import numpy as np
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

# UCF-101 class labels (101 classes)
UCF101_CLASSES = [
    "ApplyEyeMakeup", "ApplyLipstick", "Archery", "BabyCrawling", "BalanceBeam",
    "BandMarching", "BaseballPitch", "Basketball", "BasketballDunk", "BenchPress",
    "Biking", "Billiards", "BlowDryHair", "BlowingCandles", "BodyWeightSquats",
    "Bowling", "BoxingPunchingBag", "BoxingSpeedBag", "BreastStroke", "BrushingTeeth",
    "CleanAndJerk", "CliffDiving", "CricketBowling", "CricketShot", "CuttingInKitchen",
    "Diving", "Drumming", "Fencing", "FieldHockeyPenalty", "FloorGymnastics",
    "FrisbeeCatch", "FrontCrawl", "GolfSwing", "Haircut", "HammerThrow",
    "Hammering", "HandstandPushups", "HandstandWalking", "HeadMassage", "HighJump",
    "HorseRace", "HorseRiding", "HulaHoop", "IceDancing", "JavelinThrow",
    "JugglingBalls", "JumpRope", "JumpingJack", "Kayaking", "Knitting",
    "LongJump", "Lunges", "MilitaryParade", "Mixing", "MoppingFloor",
    "Nunchucks", "ParallelBars", "PizzaTossing", "PlayingCello", "PlayingDaf",
    "PlayingDhol", "PlayingFlute", "PlayingGuitar", "PlayingPiano", "PlayingSitar",
    "PlayingTabla", "PlayingViolin", "PoleVault", "PommelHorse", "PullUps",
    "Punch", "PushUps", "Rafting", "RockClimbingIndoor", "RopeClimbing",
    "Rowing", "SalsaSpin", "ShavingBeard", "Shotput", "SkateBoarding",
    "Skiing", "Skijet", "SkyDiving", "SoccerJuggling", "SoccerPenalty",
    "StillRings", "SumoWrestling", "Surfing", "Swing", "TableTennisShot",
    "TaiChi", "TennisSwing", "ThrowDiscus", "TrampolineJumping", "Typing",
    "UnevenBars", "VolleyballSpiking", "WalkingWithDog", "WallPushups",
    "WritingOnBoard", "YoYo",
]


class MotionRecognizerService:
    """
    Action recognition using sliding 16-frame windows extracted at 8fps.
    Outputs one prediction per non-overlapping window.

    Output per result dict:
    {
        "timestamp_start_s": float,
        "timestamp_end_s": float,
        "confidence": float,
        "data": {"action": str, "top3": [{"action": str, "confidence": float}]}
    }
    """

    _session = None
    _model_available = None

    def __init__(self):
        self.model_path = Path(settings.MODELS_DIR) / "motion_videomae_quantized.onnx"
        self.window_frames = settings.MOTION_WINDOW_FRAMES  # 16
        self.window_fps = settings.MOTION_WINDOW_FPS        # 8
        self.input_size = (224, 224)
        self.mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        self.std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    def _load_session(self):
        if MotionRecognizerService._model_available is None:
            MotionRecognizerService._model_available = self.model_path.exists()
            if not MotionRecognizerService._model_available:
                logger.warning(
                    "Motion ONNX model not found. Train using notebooks/02_motion_recognition_training.ipynb",
                    expected_path=str(self.model_path),
                )

        if not MotionRecognizerService._model_available:
            return None

        if MotionRecognizerService._session is None:
            import onnxruntime as ort
            opts = ort.SessionOptions()
            opts.inter_op_num_threads = 4
            opts.intra_op_num_threads = 4
            MotionRecognizerService._session = ort.InferenceSession(
                str(self.model_path),
                sess_options=opts,
                providers=["CPUExecutionProvider"],
            )
            logger.info("Motion ONNX model loaded", path=str(self.model_path))

        return MotionRecognizerService._session

    def _extract_clip_frames(self, video_path: Path, start_s: float, end_s: float) -> np.ndarray:
        """Extract exactly window_frames frames from [start_s, end_s]."""
        cap = cv2.VideoCapture(str(video_path))
        video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0

        start_frame = int(start_s * video_fps)
        frame_step = max(1, int((end_s - start_s) * video_fps / self.window_frames))

        frames = []
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        for i in range(self.window_frames):
            ret, frame = cap.read()
            if not ret:
                # Pad with zeros if video ended
                frames.append(np.zeros((*self.input_size, 3), dtype=np.float32))
            else:
                f = cv2.resize(frame, self.input_size, interpolation=cv2.INTER_LINEAR)
                f = cv2.cvtColor(f, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
                f = (f - self.mean) / self.std
                frames.append(f)

            # Skip frames to match desired temporal sampling
            for _ in range(frame_step - 1):
                cap.read()

        cap.release()
        # Shape: (1, 16, 3, 224, 224)
        clip = np.stack(frames, axis=0).transpose(0, 3, 1, 2)[np.newaxis]
        return clip.astype(np.float32)

    def recognize(self, video_path: Path, video_fps: float) -> list[dict[str, Any]]:
        session = self._load_session()
        if session is None:
            return []

        input_name = session.get_inputs()[0].name

        # Determine video duration
        cap = cv2.VideoCapture(str(video_path))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()
        duration_s = total_frames / video_fps
        window_duration_s = self.window_frames / self.window_fps

        results = []
        start_s = 0.0

        while start_s + window_duration_s <= duration_s:
            end_s = start_s + window_duration_s
            clip = self._extract_clip_frames(video_path, start_s, end_s)

            logits = session.run(None, {input_name: clip})[0][0]
            probs = _softmax(logits)

            top_indices = np.argsort(probs)[::-1][:3]
            top3 = []
            for idx in top_indices:
                if idx < len(UCF101_CLASSES):
                    top3.append({
                        "action": UCF101_CLASSES[idx],
                        "confidence": round(float(probs[idx]), 4),
                    })

            if top3:
                results.append({
                    "timestamp_start_s": round(start_s, 3),
                    "timestamp_end_s": round(end_s, 3),
                    "confidence": top3[0]["confidence"],
                    "data": {
                        "action": top3[0]["action"],
                        "top3": top3,
                    },
                })

            start_s += window_duration_s  # Non-overlapping windows

        logger.info("Motion recognition complete", windows=len(results), duration_s=duration_s)
        return results


def _softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - np.max(x))
    return e / e.sum()
