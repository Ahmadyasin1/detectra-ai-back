"""
Speech-to-Text Service
Uses OpenAI Whisper (base model, 74M params) for timestamped transcript generation.
Fully CPU-compatible. No training needed.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


class SpeechRecognizerService:
    """
    Transcribes audio using Whisper with word-level timestamps.

    Output per result dict:
    {
        "timestamp_start_s": float,
        "timestamp_end_s": float,
        "confidence": float,
        "data": {
            "text": str,
            "language": str,
            "avg_logprob": float,
            "no_speech_prob": float,
        }
    }
    """

    _model = None

    def __init__(self):
        self.model_size = settings.WHISPER_MODEL_SIZE  # "base" by default

    def _load_model(self):
        if SpeechRecognizerService._model is None:
            import whisper
            logger.info("Loading Whisper model", size=self.model_size)
            SpeechRecognizerService._model = whisper.load_model(
                self.model_size,
                device="cpu",
                download_root=str(Path(settings.MODELS_DIR) / "whisper"),
            )
            logger.info("Whisper model loaded")
        return SpeechRecognizerService._model

    def transcribe(self, audio_path: Path) -> list[dict[str, Any]]:
        """
        Transcribe audio file and return sentence-level segments with timestamps.
        """
        if not Path(audio_path).exists():
            logger.warning("Audio file not found", path=str(audio_path))
            return []

        model = self._load_model()

        result = model.transcribe(
            str(audio_path),
            language=None,        # Auto-detect language
            task="transcribe",
            verbose=False,
            word_timestamps=True,
            fp16=False,           # CPU doesn't support FP16
            temperature=0.0,      # Greedy decoding for consistency
        )

        results = []
        for segment in result.get("segments", []):
            text = segment.get("text", "").strip()
            if not text:
                continue

            avg_logprob = segment.get("avg_logprob", 0.0)
            no_speech_prob = segment.get("no_speech_prob", 0.0)

            # Convert avg_logprob to confidence (0-1):
            # avg_logprob is typically in [-5, 0]; exp() maps it to (0, 1]
            # Then discount by no_speech_prob to penalise silence segments
            import math
            confidence = max(0.0, min(1.0, math.exp(avg_logprob) * (1.0 - no_speech_prob)))

            results.append({
                "timestamp_start_s": round(segment["start"], 3),
                "timestamp_end_s": round(segment["end"], 3),
                "confidence": round(confidence, 4),
                "data": {
                    "text": text,
                    "language": result.get("language", "unknown"),
                    "avg_logprob": round(avg_logprob, 4),
                    "no_speech_prob": round(no_speech_prob, 4),
                    "words": [
                        {
                            "word": w.get("word", "").strip(),
                            "start": round(w.get("start", 0), 3),
                            "end": round(w.get("end", 0), 3),
                            "probability": round(w.get("probability", 0), 4),
                        }
                        for w in segment.get("words", [])
                    ],
                },
            })

        logger.info(
            "Speech recognition complete",
            segments=len(results),
            language=result.get("language", "unknown"),
        )
        return results
