"""
Environmental Audio Classifier Service
Uses Google YAMNet (521 AudioSet classes) via TensorFlow Hub or ONNX fallback.
Processes audio in 0.96s windows with 0.48s stride. No training needed.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

# Top environmental sound categories to surface (subset of 521 YAMNet classes)
HIGHLIGHT_CATEGORIES = {
    "Speech", "Music", "Vehicle", "Explosion", "Gunshot", "Siren", "Dog",
    "Cat", "Bird", "Rain", "Thunder", "Crowd", "Applause", "Laughter",
    "Screaming", "Crying", "Engine", "Bell", "Alarm", "Glass breaking",
}


class AudioClassifierService:
    """
    Classifies environmental sounds in audio using YAMNet.

    Output per result dict:
    {
        "timestamp_start_s": float,
        "timestamp_end_s": float,
        "confidence": float,
        "data": {
            "event_class": str,
            "top3": [{"class": str, "confidence": float}],
            "is_highlighted": bool,
        }
    }
    """

    _yamnet = None
    _class_names = None

    def __init__(self):
        self.window_s = settings.YAMNET_WINDOW_S    # 0.96s
        self.sample_rate = 16000                     # YAMNet requires 16kHz

    def _load_model(self):
        if AudioClassifierService._yamnet is None:
            try:
                import tensorflow_hub as hub

                logger.info("Loading YAMNet from TensorFlow Hub")
                AudioClassifierService._yamnet = hub.load("https://tfhub.dev/google/yamnet/1")

                # Load class names
                class_map_path = AudioClassifierService._yamnet.class_map_path().numpy().decode()
                import csv
                class_names = []
                with open(class_map_path) as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        class_names.append(row["display_name"])
                AudioClassifierService._class_names = class_names
                logger.info("YAMNet loaded", num_classes=len(class_names))

            except Exception as e:
                logger.error("Failed to load YAMNet", error=str(e))
                raise

        return AudioClassifierService._yamnet, AudioClassifierService._class_names

    def _load_audio(self, audio_path: Path) -> np.ndarray:
        """Load WAV file and resample to 16kHz mono."""
        import librosa
        waveform, _ = librosa.load(str(audio_path), sr=self.sample_rate, mono=True)
        return waveform.astype(np.float32)

    def classify(self, audio_path: Path) -> list[dict[str, Any]]:
        """
        Classify audio events across the full audio file.
        Returns per-window predictions with timestamps.
        """
        if not Path(audio_path).exists():
            logger.warning("Audio file not found for classification", path=str(audio_path))
            return []

        try:
            yamnet, class_names = self._load_model()
        except Exception:
            return []

        import tensorflow as tf
        waveform = self._load_audio(audio_path)
        waveform_tensor = tf.constant(waveform)

        scores, embeddings, spectrogram = yamnet(waveform_tensor)
        scores_np = scores.numpy()  # shape: (num_windows, 521)

        window_duration_s = self.window_s
        stride_s = window_duration_s / 2  # 50% overlap

        results = []
        for i, window_scores in enumerate(scores_np):
            start_s = i * stride_s
            end_s = start_s + window_duration_s

            top_indices = np.argsort(window_scores)[::-1][:3]
            top3 = [
                {
                    "class": class_names[idx] if idx < len(class_names) else f"class_{idx}",
                    "confidence": round(float(window_scores[idx]), 4),
                }
                for idx in top_indices
            ]

            top_class = top3[0]["class"] if top3 else "Unknown"
            top_conf = top3[0]["confidence"] if top3 else 0.0

            if top_conf < 0.1:  # Skip very low confidence windows
                continue

            results.append({
                "timestamp_start_s": round(start_s, 3),
                "timestamp_end_s": round(end_s, 3),
                "confidence": round(top_conf, 4),
                "data": {
                    "event_class": top_class,
                    "top3": top3,
                    "is_highlighted": top_class in HIGHLIGHT_CATEGORIES,
                },
            })

        logger.info("Audio classification complete", windows=len(results), audio=str(audio_path))
        return results
