"""
Multi-Agent Pipeline Integration Tests
=======================================
Tests the complete Detectra AI multi-agent surveillance pipeline:
  StreamAgent → PerceptionAgent → ReasoningAgent

Uses synthetic data (no real video/GPU required).
All tests run on CPU with mocked/stub models.
"""
from __future__ import annotations

import math
import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_frame(ts: float, h: int = 224, w: int = 224):
    from app.services.pipeline.preprocessor import Frame
    img = np.zeros((h, w, 3), dtype=np.uint8)
    img[50:150, 50:150] = [200, 100, 50]  # fake "object"
    return Frame(timestamp_s=ts, image=img, frame_index=int(ts))


def _make_frames(n: int = 5):
    return [_make_frame(float(i)) for i in range(n)]


def _object_results(n_frames: int = 5) -> list[dict]:
    """Synthetic object detection results (persons + car)."""
    results = []
    for i in range(n_frames):
        results.append({
            "timestamp_start_s": float(i),
            "timestamp_end_s": float(i + 1),
            "confidence": 0.85,
            "data": {
                "detections": [
                    {"class_name": "person", "confidence": 0.91, "bbox": {"x1": 0.1, "y1": 0.1, "x2": 0.4, "y2": 0.9}},
                    {"class_name": "person", "confidence": 0.78, "bbox": {"x1": 0.5, "y1": 0.1, "x2": 0.8, "y2": 0.9}},
                    {"class_name": "car", "confidence": 0.82, "bbox": {"x1": 0.6, "y1": 0.5, "x2": 0.9, "y2": 0.8}},
                ]
            },
        })
    return results


def _speech_results() -> list[dict]:
    return [
        {
            "timestamp_start_s": 1.0, "timestamp_end_s": 3.0, "confidence": 0.88,
            "data": {"text": "help me please stop", "language": "en", "avg_logprob": -0.3, "no_speech_prob": 0.05},
        },
        {
            "timestamp_start_s": 3.0, "timestamp_end_s": 5.0, "confidence": 0.76,
            "data": {"text": "everything is fine now", "language": "en", "avg_logprob": -0.5, "no_speech_prob": 0.1},
        },
    ]


def _audio_results() -> list[dict]:
    return [
        {"timestamp_start_s": 0.5, "timestamp_end_s": 1.5, "confidence": 0.90,
         "data": {"event_class": "Screaming", "confidence": 0.90}},
        {"timestamp_start_s": 2.0, "timestamp_end_s": 3.0, "confidence": 0.75,
         "data": {"event_class": "Speech", "confidence": 0.75}},
    ]


def _motion_results() -> list[dict]:
    return [
        {"timestamp_start_s": 0.0, "timestamp_end_s": 2.0, "confidence": 0.72,
         "data": {"action": "running", "confidence": 0.72}},
        {"timestamp_start_s": 2.0, "timestamp_end_s": 4.0, "confidence": 0.65,
         "data": {"action": "walking", "confidence": 0.65}},
    ]


# ─── EventBus ────────────────────────────────────────────────────────────────

class TestEventBus:
    def test_event_bus_defaults(self):
        from app.services.agents.base_agent import EventBus
        bus = EventBus()
        assert bus.frames == []
        assert bus.object_results == []
        assert bus.anomaly_events == []
        assert bus.errors == []

    def test_event_bus_population(self):
        from app.services.agents.base_agent import EventBus
        bus = EventBus(video_path="/fake/video.mp4", config={"enable_object_detection": True})
        bus.object_results = _object_results(3)
        assert len(bus.object_results) == 3
        assert bus.config["enable_object_detection"] is True


# ─── AnomalyDetector ─────────────────────────────────────────────────────────

class TestAnomalyDetector:
    def test_no_anomaly_empty_inputs(self):
        from app.services.agents.anomaly_detector import AnomalyDetector
        detector = AnomalyDetector()
        events = detector.detect([], [], [], [], video_duration=10.0)
        assert isinstance(events, list)

    def test_screaming_audio_triggers_high_anomaly(self):
        from app.services.agents.anomaly_detector import AnomalyDetector
        detector = AnomalyDetector()
        events = detector.detect(
            object_results=[],
            motion_results=[],
            speech_results=[],
            audio_results=_audio_results(),
            video_duration=5.0,
        )
        # Screaming should fire a high+ anomaly
        alert_events = [e for e in events if e.anomaly_score >= 0.70]
        assert len(alert_events) >= 1
        assert any("distress_call" in e.anomaly_type or "Scream" in " ".join(e.contributing_signals)
                   for e in alert_events)

    def test_distress_speech_triggers_anomaly(self):
        from app.services.agents.anomaly_detector import AnomalyDetector
        detector = AnomalyDetector()
        events = detector.detect(
            object_results=[],
            motion_results=[],
            speech_results=_speech_results(),
            audio_results=[],
            video_duration=5.0,
        )
        distress_events = [e for e in events if "distress" in e.anomaly_type]
        assert len(distress_events) >= 1

    def test_crowd_detection(self):
        from app.services.agents.anomaly_detector import AnomalyDetector
        detector = AnomalyDetector()
        # 8 persons in frame → crowd_surge
        crowd_objects = [{
            "timestamp_start_s": 0.0, "timestamp_end_s": 1.0, "confidence": 0.9,
            "data": {"detections": [
                {"class_name": "person", "confidence": 0.9,
                 "bbox": {"x1": i*0.1, "y1": 0.1, "x2": i*0.1+0.08, "y2": 0.9}}
                for i in range(8)
            ]},
        }]
        events = detector.detect(crowd_objects, [], [], [], video_duration=5.0)
        crowd_events = [e for e in events if "crowd" in e.anomaly_type]
        assert len(crowd_events) >= 1
        assert crowd_events[0].anomaly_score >= 0.50

    def test_anomaly_summary(self):
        from app.services.agents.anomaly_detector import AnomalyDetector, AnomalyEvent
        detector = AnomalyDetector()
        events = [
            AnomalyEvent(0.0, 1.0, 0.92, "critical", "weapon_discharge",
                         "Gunshot detected", ["audio:Gunshot"]),
            AnomalyEvent(2.0, 3.0, 0.55, "medium", "loitering",
                         "Person loitering", ["loitering:spatial_stability"]),
        ]
        summary = detector.get_summary(events)
        assert summary["overall_risk"] == "critical"
        assert summary["max_anomaly_score"] == pytest.approx(0.92, abs=1e-3)
        assert summary["alerts"] == 1
        assert summary["total_anomalies"] == 2

    def test_severity_classification(self):
        from app.services.agents.anomaly_detector import AnomalyDetector
        detector = AnomalyDetector()
        assert detector._severity(0.92) == "critical"
        assert detector._severity(0.75) == "high"
        assert detector._severity(0.55) == "medium"
        assert detector._severity(0.30) == "low"
        assert detector._severity(0.10) == "normal"


# ─── SceneContextEngine ───────────────────────────────────────────────────────

class TestSceneContextEngine:
    def test_empty_inputs(self):
        from app.services.agents.scene_context_engine import SceneContextEngine
        engine = SceneContextEngine()
        result = engine.analyze([], [], [], [], video_duration=10.0)
        assert "context_per_bin" in result
        assert "video_summary" in result

    def test_person_detection_context(self):
        from app.services.agents.scene_context_engine import SceneContextEngine
        engine = SceneContextEngine()
        result = engine.analyze(
            object_results=_object_results(3),
            motion_results=_motion_results(),
            speech_results=_speech_results(),
            audio_results=_audio_results(),
            video_duration=5.0,
        )
        summary = result["video_summary"]
        assert summary["total_object_count"] > 0
        assert "person" in summary["unique_object_classes"]
        assert "car" in summary["unique_object_classes"]
        assert summary["person_present_seconds"] > 0

    def test_context_per_bin_structure(self):
        from app.services.agents.scene_context_engine import SceneContextEngine
        engine = SceneContextEngine()
        result = engine.analyze(
            object_results=_object_results(3),
            motion_results=[],
            speech_results=[],
            audio_results=[],
            video_duration=3.0,
        )
        bins = result["context_per_bin"]
        assert len(bins) > 0
        first = bins[0]
        assert "timestamp_start_s" in first
        assert "scene_type" in first
        assert "objects_present" in first
        assert "narrative" in first
        assert "person_count" in first

    def test_narrative_contains_persons(self):
        from app.services.agents.scene_context_engine import SceneContextEngine
        engine = SceneContextEngine()
        result = engine.analyze(
            object_results=_object_results(1),
            motion_results=[], speech_results=[], audio_results=[],
            video_duration=1.0,
        )
        # Narrative should mention persons
        narrative = result["context_per_bin"][0]["narrative"]
        assert "person" in narrative.lower() or "2" in narrative

    def test_overall_narrative_generated(self):
        from app.services.agents.scene_context_engine import SceneContextEngine
        engine = SceneContextEngine()
        result = engine.analyze(
            object_results=_object_results(5),
            motion_results=_motion_results(),
            speech_results=_speech_results(),
            audio_results=_audio_results(),
            video_duration=5.0,
        )
        narrative = result["video_summary"]["overall_narrative"]
        assert len(narrative) > 20
        assert "person" in narrative.lower() or "scene" in narrative.lower()


# ─── FusionEngine rule-based ──────────────────────────────────────────────────

class TestFusionEngineSurveillance:
    def _get_engine(self):
        from app.services.pipeline.fusion_engine import MultimodalFusionEngine
        engine = MultimodalFusionEngine()
        MultimodalFusionEngine._model_available = False
        MultimodalFusionEngine._model = None
        return engine

    def test_fusion_with_persons_and_speech(self):
        engine = self._get_engine()
        results = engine.fuse(
            object_results=_object_results(3),
            logo_results=[],
            motion_results=_motion_results(),
            speech_results=_speech_results(),
            audio_results=_audio_results(),
            video_duration=5.0,
        )
        assert len(results) > 0
        first = results[0]
        assert "timestamp_start_s" in first
        assert "data" in first
        data = first["data"]
        assert "scene_label" in data
        assert "anomaly_score" in data
        assert "narrative" in data
        assert "person_count" in data

    def test_fusion_crowd_scene_label(self):
        engine = self._get_engine()
        # 6 persons → crowd_gathering
        crowd_obj = [{
            "timestamp_start_s": 0.0, "timestamp_end_s": 1.0, "confidence": 0.9,
            "data": {"detections": [
                {"class_name": "person", "confidence": 0.9,
                 "bbox": {"x1": i*0.1, "y1": 0.0, "x2": i*0.1+0.09, "y2": 1.0}}
                for i in range(6)
            ]},
        }]
        results = engine.fuse(crowd_obj, [], [], [], [], video_duration=2.0)
        assert any(r["data"]["scene_label"] == "crowd_gathering" for r in results)

    def test_fusion_danger_audio_anomaly(self):
        engine = self._get_engine()
        results = engine.fuse(
            object_results=[],
            logo_results=[],
            motion_results=[],
            speech_results=[],
            audio_results=[
                {"timestamp_start_s": 0.0, "timestamp_end_s": 1.0, "confidence": 0.95,
                 "data": {"event_class": "Gunshot", "confidence": 0.95}},
            ],
            video_duration=3.0,
        )
        # Gunshot must produce a high anomaly score
        assert any(r["data"]["anomaly_score"] >= 0.70 for r in results)

    def test_fusion_vehicle_traffic_scene(self):
        engine = self._get_engine()
        car_results = [{
            "timestamp_start_s": 0.0, "timestamp_end_s": 1.0, "confidence": 0.88,
            "data": {"detections": [
                {"class_name": "car", "confidence": 0.88, "bbox": {"x1": 0.1, "y1": 0.1, "x2": 0.9, "y2": 0.9}},
                {"class_name": "truck", "confidence": 0.75, "bbox": {"x1": 0.2, "y1": 0.2, "x2": 0.8, "y2": 0.8}},
            ]},
        }]
        results = engine.fuse(car_results, [], [], [], [], video_duration=2.0)
        assert any(r["data"]["scene_label"] == "vehicle_traffic" for r in results)

    def test_fusion_empty_returns_empty(self):
        engine = self._get_engine()
        results = engine.fuse([], [], [], [], [], video_duration=5.0)
        assert results == []


# ─── ReasoningAgent ───────────────────────────────────────────────────────────

class TestReasoningAgent:
    def _make_bus(self, n_frames: int = 5):
        from app.services.agents.base_agent import EventBus
        from app.services.pipeline.preprocessor import VideoMetadata

        bus = EventBus(video_path="/fake/video.mp4", config={})
        bus.frames = _make_frames(n_frames)
        bus.metadata = VideoMetadata(
            duration_seconds=float(n_frames),
            width=640, height=480, fps=25.0, total_frames=n_frames * 25
        )
        bus.object_results = _object_results(n_frames)
        bus.logo_results = []
        bus.motion_results = _motion_results()
        bus.speech_results = _speech_results()
        bus.audio_results = _audio_results()
        return bus

    def test_reasoning_agent_produces_fused_results(self):
        from app.services.agents.reasoning_agent import ReasoningAgent
        bus = self._make_bus(5)
        agent = ReasoningAgent(bus)
        result = agent.execute()
        assert result.success
        assert len(bus.fused_results) > 0
        assert len(bus.anomaly_events) > 0
        assert len(bus.scene_contexts) > 0

    def test_reasoning_agent_enriches_fused_with_anomaly(self):
        from app.services.agents.reasoning_agent import ReasoningAgent
        bus = self._make_bus(5)
        agent = ReasoningAgent(bus)
        agent.execute()
        # Every fused result should have anomaly fields
        for fr in bus.fused_results:
            data = fr["data"]
            assert "anomaly_score" in data
            assert "anomaly_severity" in data

    def test_reasoning_agent_tracking_summary(self):
        from app.services.agents.reasoning_agent import ReasoningAgent
        bus = self._make_bus(5)
        agent = ReasoningAgent(bus)
        result = agent.execute()
        assert result.success
        summary = bus.tracking_summary
        assert "anomaly_summary" in summary
        assert "video_context" in summary
        assert "alert_count" in summary

    def test_screaming_audio_triggers_alert_in_fused(self):
        from app.services.agents.reasoning_agent import ReasoningAgent
        bus = self._make_bus(5)
        agent = ReasoningAgent(bus)
        agent.execute()
        # With screaming audio, at least one fused insight must be alert
        alerts = [f for f in bus.fused_results if f["data"].get("alert", False)]
        assert len(alerts) >= 1

    def test_object_counts_populated(self):
        from app.services.agents.reasoning_agent import ReasoningAgent
        bus = self._make_bus(3)
        agent = ReasoningAgent(bus)
        agent.execute()
        counts = bus.object_counts
        assert isinstance(counts, dict)
        # Should have person counts since we injected person detections
        assert counts.get("person", 0) > 0


# ─── Full pipeline simulation ─────────────────────────────────────────────────

class TestFullPipelineSimulation:
    """Simulate the complete multi-agent pipeline without a real video file."""

    def test_end_to_end_with_mock_stream_agent(self):
        """
        Full pipeline: EventBus → (mock StreamAgent) → PerceptionAgent mocked →
        ReasoningAgent → verify outputs.
        """
        from app.services.agents.base_agent import EventBus
        from app.services.pipeline.preprocessor import VideoMetadata
        from app.services.agents.reasoning_agent import ReasoningAgent

        # Pre-populate bus as if StreamAgent ran
        bus = EventBus(video_path="/fake/video.mp4", config={
            "enable_object_detection": True,
            "enable_speech_to_text": True,
            "enable_audio_classification": True,
        })
        bus.frames = _make_frames(10)
        bus.metadata = VideoMetadata(10.0, 1280, 720, 25.0, 250)

        # Pre-populate as if PerceptionAgent ran
        bus.object_results = _object_results(10)
        bus.logo_results = []
        bus.motion_results = _motion_results()
        bus.speech_results = _speech_results()
        bus.audio_results = _audio_results()

        # Run ReasoningAgent (the most important agent)
        agent = ReasoningAgent(bus)
        result = agent.execute()

        assert result.success, f"ReasoningAgent failed: {result.error}"
        assert len(bus.fused_results) > 0, "No fused results produced"
        assert len(bus.anomaly_events) > 0, "No anomaly events produced"
        assert bus.tracking_summary is not None

        # Verify overall risk is not unknown
        anomaly_summary = bus.tracking_summary["anomaly_summary"]
        assert anomaly_summary["overall_risk"] in {
            "normal", "low", "medium", "high", "critical"
        }

        # Screaming → should have at least 1 alert
        assert anomaly_summary["alerts"] >= 1, (
            f"Expected >=1 alert with Screaming audio, got {anomaly_summary['alerts']}"
        )

        # Verify fused result structure
        for fr in bus.fused_results:
            assert "timestamp_start_s" in fr
            assert "timestamp_end_s" in fr
            assert "confidence" in fr
            data = fr["data"]
            assert "anomaly_score" in data
            assert 0.0 <= data["anomaly_score"] <= 1.0

    def test_surveillance_scene_with_gunshot(self):
        """Critical scenario: gunshot audio + persons = CRITICAL anomaly."""
        from app.services.agents.base_agent import EventBus
        from app.services.pipeline.preprocessor import VideoMetadata
        from app.services.agents.reasoning_agent import ReasoningAgent

        bus = EventBus(video_path="/fake/video.mp4", config={})
        bus.frames = _make_frames(5)
        bus.metadata = VideoMetadata(5.0, 640, 480, 25.0, 125)

        bus.object_results = _object_results(5)
        bus.logo_results = []
        bus.motion_results = []
        bus.speech_results = []
        bus.audio_results = [
            {"timestamp_start_s": 1.0, "timestamp_end_s": 2.0, "confidence": 0.97,
             "data": {"event_class": "Gunshot", "confidence": 0.97}},
        ]

        agent = ReasoningAgent(bus)
        agent.execute()

        summary = bus.tracking_summary["anomaly_summary"]
        assert summary["max_anomaly_score"] >= 0.70, (
            f"Gunshot should produce score >=0.70, got {summary['max_anomaly_score']}"
        )
        assert summary["overall_risk"] in {"high", "critical"}

    def test_empty_video_no_crash(self):
        """Pipeline must not crash on completely empty video."""
        from app.services.agents.base_agent import EventBus
        from app.services.pipeline.preprocessor import VideoMetadata
        from app.services.agents.reasoning_agent import ReasoningAgent

        bus = EventBus(video_path="/fake/empty.mp4", config={})
        bus.frames = []
        bus.metadata = VideoMetadata(5.0, 640, 480, 25.0, 0)
        bus.object_results = []
        bus.logo_results = []
        bus.motion_results = []
        bus.speech_results = []
        bus.audio_results = []

        agent = ReasoningAgent(bus)
        result = agent.execute()
        # Should succeed even with no data
        assert result.success

    def test_crowd_scene_detection(self):
        """8 persons in frame → crowd_gathering or crowd_surge scene."""
        from app.services.agents.base_agent import EventBus
        from app.services.pipeline.preprocessor import VideoMetadata
        from app.services.agents.reasoning_agent import ReasoningAgent

        crowd_objects = [{
            "timestamp_start_s": float(i), "timestamp_end_s": float(i+1),
            "confidence": 0.9,
            "data": {"detections": [
                {"class_name": "person", "confidence": 0.9,
                 "bbox": {"x1": j*0.1, "y1": 0.0, "x2": j*0.1+0.09, "y2": 1.0}}
                for j in range(8)
            ]},
        } for i in range(5)]

        bus = EventBus(video_path="/fake/crowd.mp4", config={})
        bus.frames = _make_frames(5)
        bus.metadata = VideoMetadata(5.0, 1280, 720, 25.0, 125)
        bus.object_results = crowd_objects
        bus.logo_results = []
        bus.motion_results = []
        bus.speech_results = []
        bus.audio_results = []

        agent = ReasoningAgent(bus)
        agent.execute()

        crowd_anomalies = [
            e for e in bus.anomaly_events
            if "crowd" in e["data"].get("anomaly_type", "")
        ]
        assert len(crowd_anomalies) >= 1, "Crowd of 8 persons should trigger crowd anomaly"

        summary = bus.tracking_summary
        ctx = summary["video_context"]
        assert ctx["person_present_seconds"] > 0
