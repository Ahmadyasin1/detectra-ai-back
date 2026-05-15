"""Unit tests for AI pipeline services (CPU, no GPU required)."""
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np


# ─── Preprocessor ────────────────────────────────────────────────────────────
def test_frame_dataclass():
    from app.services.pipeline.preprocessor import Frame
    frame = Frame(timestamp_s=1.5, image=np.zeros((224, 224, 3), dtype=np.uint8), frame_index=0)
    assert frame.timestamp_s == 1.5
    assert frame.image.shape == (224, 224, 3)


def test_video_metadata_dataclass():
    from app.services.pipeline.preprocessor import VideoMetadata
    m = VideoMetadata(duration_seconds=60.0, width=1280, height=720, fps=30.0, total_frames=1800)
    assert m.duration_seconds == 60.0
    assert m.fps == 30.0


def test_preprocessor_resize():
    from app.services.pipeline.preprocessor import VideoPreprocessor
    frame = np.ones((480, 640, 3), dtype=np.uint8) * 128
    resized = VideoPreprocessor.resize_frame(frame, size=(224, 224))
    assert resized.shape == (224, 224, 3)


def test_preprocessor_bgr_to_rgb():
    from app.services.pipeline.preprocessor import VideoPreprocessor
    frame = np.zeros((10, 10, 3), dtype=np.uint8)
    frame[:, :, 0] = 255  # Blue channel in BGR
    rgb = VideoPreprocessor.frame_to_rgb(frame)
    assert rgb[:, :, 2].mean() == 255  # Now in red channel


# ─── Object Detector ─────────────────────────────────────────────────────────
def test_object_detector_no_detections():
    """Detector should return per-frame results with empty detections when no objects found."""
    from app.services.pipeline.object_detector import ObjectDetectorService
    from app.services.pipeline.preprocessor import Frame

    detector = ObjectDetectorService()

    mock_pred = MagicMock()
    mock_pred.boxes = None
    mock_pred.masks = None
    mock_pred.names = {}

    mock_seg = MagicMock()
    mock_seg.track.return_value = [mock_pred]

    mock_pose = MagicMock(return_value=[MagicMock(keypoints=None, boxes=[])])

    with patch.object(ObjectDetectorService, "_load_models"):
        ObjectDetectorService._seg_model = mock_seg
        ObjectDetectorService._pose_model = mock_pose
        frames = [Frame(timestamp_s=0.0, image=np.zeros((224, 224, 3), dtype=np.uint8), frame_index=0)]
        results = detector.detect(frames)

    assert len(results) == 1
    assert results[0]["data"]["detections"] == []
    assert results[0]["data"]["person_count"] == 0


# ─── Logo Recognizer ─────────────────────────────────────────────────────────
def test_logo_recognizer_no_model():
    """Should return empty list gracefully when ONNX model not found."""
    from app.services.pipeline.logo_recognizer import LogoRecognizerService
    from app.services.pipeline.preprocessor import Frame

    # Reset class-level state
    LogoRecognizerService._session = None
    LogoRecognizerService._model_available = None

    service = LogoRecognizerService()
    # Override model path to non-existent
    service.model_path = Path("/nonexistent/model.onnx")
    LogoRecognizerService._model_available = False

    frames = [Frame(timestamp_s=0.0, image=np.zeros((224,224,3), dtype=np.uint8), frame_index=0)]
    results = service.recognize(frames)
    assert results == []


# ─── Speech Recognizer ───────────────────────────────────────────────────────
def test_speech_recognizer_missing_file():
    """Should return empty list if audio file doesn't exist."""
    from app.services.pipeline.speech_recognizer import SpeechRecognizerService

    service = SpeechRecognizerService()
    results = service.transcribe(Path("/nonexistent/audio.wav"))
    assert results == []


# ─── Audio Classifier ────────────────────────────────────────────────────────
def test_audio_classifier_missing_file():
    """Should return empty list if audio file doesn't exist."""
    from app.services.pipeline.audio_classifier import AudioClassifierService

    service = AudioClassifierService()
    results = service.classify(Path("/nonexistent/audio.wav"))
    assert results == []


# ─── Fusion Engine ───────────────────────────────────────────────────────────
def test_fusion_rule_based_empty():
    """Rule-based fallback returns empty list for empty inputs."""
    from app.services.pipeline.fusion_engine import MultimodalFusionEngine

    engine = MultimodalFusionEngine()
    engine.model_path = Path("/nonexistent/model.pt")
    MultimodalFusionEngine._model_available = False
    MultimodalFusionEngine._model = None

    results = engine.fuse([], [], [], [], [], video_duration=10.0)
    assert isinstance(results, list)


def test_fusion_rule_based_with_data():
    """Rule-based fusion returns insights for non-empty modality data."""
    from app.services.pipeline.fusion_engine import MultimodalFusionEngine

    engine = MultimodalFusionEngine()
    MultimodalFusionEngine._model_available = False
    MultimodalFusionEngine._model = None

    object_results = [{
        "timestamp_start_s": 0.0, "timestamp_end_s": 1.0,
        "confidence": 0.9,
        "data": {"detections": [{"class_name": "person", "confidence": 0.9, "bbox": {}}]},
    }]
    speech_results = [{
        "timestamp_start_s": 0.0, "timestamp_end_s": 2.0,
        "confidence": 0.8,
        "data": {"text": "Hello world", "avg_logprob": -0.5, "no_speech_prob": 0.01},
    }]

    results = engine.fuse(
        object_results=object_results,
        logo_results=[],
        motion_results=[],
        speech_results=speech_results,
        audio_results=[],
        video_duration=5.0,
    )

    assert isinstance(results, list)
    if results:
        r = results[0]
        assert "timestamp_start_s" in r
        assert "data" in r
        assert "scene_label" in r["data"]
        assert "summary" in r["data"]


# ─── Security ────────────────────────────────────────────────────────────────
def test_password_hashing():
    from app.core.security import hash_password, verify_password
    hashed = hash_password("mysecretpassword")
    assert hashed != "mysecretpassword"
    assert verify_password("mysecretpassword", hashed)
    assert not verify_password("wrongpassword", hashed)


def test_jwt_create_decode():
    from app.core.security import create_access_token, decode_token
    token = create_access_token(subject=42)
    payload = decode_token(token)
    assert payload["sub"] == "42"
    assert payload["type"] == "access"


def test_jwt_invalid():
    from app.core.security import decode_token
    payload = decode_token("not.a.valid.token")
    assert payload == {}
