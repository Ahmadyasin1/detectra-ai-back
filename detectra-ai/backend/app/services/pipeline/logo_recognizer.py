"""
Logo Recognizer Service
Uses a fine-tuned ViT (google/vit-base-patch16-224) exported to ONNX + INT8 quantized.
Fallback: if ONNX model not found, uses a placeholder that returns empty results with a warning.

Training: See notebooks/01_logo_recognition_training.ipynb (Colab T4, ~2 hrs)
Dataset: OpenLogos-32 + FlickrLogos-47
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import cv2
import numpy as np
import structlog

from app.config import settings
from app.services.pipeline.preprocessor import Frame

logger = structlog.get_logger(__name__)

# 32 brand classes from OpenLogos-32 (matches training labels)
LOGO_CLASSES = [
    "adidas", "apple", "bmw", "carlsberg", "chimay", "cocacola", "corona",
    "dhl", "erdinger", "esso", "fedex", "ferrari", "ford", "fosters",
    "google", "guiness", "heineken", "hp", "michelin", "minicooper",
    "nbc", "nike", "paulaner", "pepsi", "porsche", "puma", "redbull",
    "shell", "singha", "starbucks", "stellaartois", "texaco",
]


class LogoRecognizerService:
    """
    Logo recognition using ONNX-quantized ViT fine-tuned on OpenLogos-32 + FlickrLogos-47.

    Output per result dict:
    {
        "timestamp_start_s": float,
        "timestamp_end_s": float,
        "confidence": float,
        "data": {
            "detections": [{"brand": str, "confidence": float}]
        }
    }
    """

    _session = None
    _model_available = None

    def __init__(self):
        self.model_path = Path(settings.MODELS_DIR) / "logo_vit_quantized.onnx"
        self.confidence_threshold = settings.LOGO_CONFIDENCE_THRESHOLD
        self.input_size = (224, 224)
        # ImageNet normalization (ViT pretrained)
        self.mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        self.std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    def _load_session(self):
        if LogoRecognizerService._model_available is None:
            LogoRecognizerService._model_available = self.model_path.exists()
            if not LogoRecognizerService._model_available:
                logger.warning(
                    "Logo ONNX model not found. Train it using notebooks/01_logo_recognition_training.ipynb",
                    expected_path=str(self.model_path),
                )

        if not LogoRecognizerService._model_available:
            return None

        if LogoRecognizerService._session is None:
            import onnxruntime as ort
            opts = ort.SessionOptions()
            opts.inter_op_num_threads = 4
            opts.intra_op_num_threads = 4
            LogoRecognizerService._session = ort.InferenceSession(
                str(self.model_path),
                sess_options=opts,
                providers=["CPUExecutionProvider"],
            )
            logger.info("Logo ONNX model loaded", path=str(self.model_path))

        return LogoRecognizerService._session

    def _preprocess(self, frame: np.ndarray) -> np.ndarray:
        """Preprocess frame for ViT: resize → RGB → normalize → NCHW."""
        img = cv2.resize(frame, self.input_size, interpolation=cv2.INTER_LINEAR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        img = (img - self.mean) / self.std
        return img.transpose(2, 0, 1)[np.newaxis]  # (1, 3, 224, 224)

    def recognize(self, frames: list[Frame], extraction_fps: float | None = None) -> list[dict[str, Any]]:
        session = self._load_session()
        if session is None:
            return []  # Model not trained yet

        input_name = session.get_inputs()[0].name
        results = []
        frame_duration = 1.0 / (extraction_fps or settings.FRAME_EXTRACTION_FPS)

        for frame in frames:
            inp = self._preprocess(frame.image)
            logits = session.run(None, {input_name: inp})[0][0]  # shape: (num_classes,)
            probs = _softmax(logits)

            # Top-3 predictions
            top_indices = np.argsort(probs)[::-1][:3]
            detections = []
            max_conf = 0.0

            for idx in top_indices:
                conf = float(probs[idx])
                if conf >= self.confidence_threshold and idx < len(LOGO_CLASSES):
                    detections.append({
                        "brand": LOGO_CLASSES[idx],
                        "confidence": round(conf, 4),
                    })
                    max_conf = max(max_conf, conf)

            if detections:
                results.append({
                    "timestamp_start_s": frame.timestamp_s,
                    "timestamp_end_s": round(frame.timestamp_s + frame_duration, 3),
                    "confidence": round(max_conf, 4),
                    "data": {"detections": detections, "frame_index": frame.frame_index},
                })

        logger.info("Logo recognition complete", frames=len(frames), detections=len(results))
        return results


def _softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - np.max(x))
    return e / e.sum()
