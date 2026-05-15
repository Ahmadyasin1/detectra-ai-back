"""
ReasoningAgent — Layer 4 of the Detectra AI multi-agent pipeline.

Responsibilities:
  - Run FusionEngine (cross-modal transformer / rule-based)
  - Run AnomalyDetector (surveillance-grade scoring)
  - Run SceneContextEngine (narrative + object counting)
  - Merge all outputs into a unified, enriched fused insight timeline
  - Write results to EventBus
"""
from __future__ import annotations

from typing import Any

import structlog

from app.services.agents.base_agent import BaseAgent, EventBus, ProgressCallback

logger = structlog.get_logger(__name__)


class ReasoningAgent(BaseAgent):
    name = "ReasoningAgent"

    def __init__(self, bus: EventBus, progress_cb: ProgressCallback | None = None):
        super().__init__(bus, progress_cb)

    def run(self) -> dict[str, Any]:
        self.report_progress(68, "reasoning_agent:fusion")

        duration = (
            getattr(self.bus.metadata, "duration_seconds", None) or 60.0
        )

        # ── Step 1: Multimodal Fusion (cross-modal transformer) ───────────────
        from app.services.pipeline.fusion_engine import MultimodalFusionEngine
        fusion_engine = MultimodalFusionEngine()
        fused = fusion_engine.fuse(
            object_results=self.bus.object_results,
            logo_results=self.bus.logo_results,
            motion_results=self.bus.motion_results,
            speech_results=self.bus.speech_results,
            audio_results=self.bus.audio_results,
            video_duration=duration,
        )
        self.bus.fused_results = fused
        self.report_progress(78, "reasoning_agent:anomaly_detection")

        # ── Step 2: Anomaly Detection ─────────────────────────────────────────
        from app.services.agents.anomaly_detector import AnomalyDetector
        detector = AnomalyDetector(bin_size_s=1.0)
        anomaly_events = detector.detect(
            object_results=self.bus.object_results,
            motion_results=self.bus.motion_results,
            speech_results=self.bus.speech_results,
            audio_results=self.bus.audio_results,
            video_duration=duration,
        )
        anomaly_summary = detector.get_summary(anomaly_events)
        self.bus.anomaly_events = [e.to_dict() for e in anomaly_events]
        self.report_progress(87, "reasoning_agent:scene_context")

        # ── Step 3: Scene Context + Narrative ────────────────────────────────
        from app.services.agents.scene_context_engine import SceneContextEngine
        ctx_engine = SceneContextEngine(bin_size_s=1.0)
        context_output = ctx_engine.analyze(
            object_results=self.bus.object_results,
            motion_results=self.bus.motion_results,
            speech_results=self.bus.speech_results,
            audio_results=self.bus.audio_results,
            video_duration=duration,
        )
        self.bus.scene_contexts = context_output["context_per_bin"]
        self.report_progress(93, "reasoning_agent:merging")

        # ── Step 4: Merge anomaly + context into fused insight ────────────────
        # Build lookup dicts by time bin
        anomaly_by_bin: dict[int, dict] = {}
        for ev in self.bus.anomaly_events:
            t = int(ev["timestamp_start_s"])
            anomaly_by_bin[t] = ev["data"]

        context_by_bin: dict[int, dict] = {}
        for ctx in self.bus.scene_contexts:
            t = int(ctx["timestamp_start_s"])
            context_by_bin[t] = ctx

        # Enrich fused results with anomaly + context data
        enriched_fused: list[dict[str, Any]] = []
        for fi in fused:
            t = int(fi["timestamp_start_s"])
            anomaly_data = anomaly_by_bin.get(t, {})
            ctx_data = context_by_bin.get(t, {})

            enriched_data = {**fi["data"]}
            enriched_data["anomaly_score"] = max(
                enriched_data.get("anomaly_score", 0.0),
                anomaly_data.get("anomaly_score", 0.0),
            )
            enriched_data["anomaly_severity"] = anomaly_data.get("severity", "normal")
            enriched_data["anomaly_type"] = anomaly_data.get("anomaly_type", "normal")
            enriched_data["contributing_signals"] = anomaly_data.get("contributing_signals", [])
            enriched_data["alert"] = anomaly_data.get("alert", False)

            # Scene context overlay
            if ctx_data:
                enriched_data["scene_type"] = ctx_data.get("scene_type", enriched_data.get("scene_label", "unknown"))
                enriched_data["narrative"] = ctx_data.get("narrative", enriched_data.get("summary", ""))
                enriched_data["objects_present"] = ctx_data.get("objects_present", {})
                enriched_data["person_count"] = ctx_data.get("person_count", 0)
                enriched_data["vehicle_count"] = ctx_data.get("vehicle_count", 0)
                enriched_data["complexity_score"] = ctx_data.get("complexity_score", 0.0)

            # Compute merged confidence (average of fusion + anomaly)
            anomaly_conf = anomaly_data.get("anomaly_score", fi.get("confidence", 0.5))
            merged_conf = (fi.get("confidence", 0.5) + anomaly_conf) / 2.0

            enriched_fused.append({
                "timestamp_start_s": fi["timestamp_start_s"],
                "timestamp_end_s": fi["timestamp_end_s"],
                "confidence": round(merged_conf, 4),
                "data": enriched_data,
            })

        # Also add anomaly-only bins (not covered by fused results)
        fused_bins = {int(f["timestamp_start_s"]) for f in fused}
        for ev in self.bus.anomaly_events:
            t = int(ev["timestamp_start_s"])
            if t not in fused_bins and ev["data"].get("anomaly_score", 0) > 0.2:
                ctx_data = context_by_bin.get(t, {})
                ev_data = {
                    "scene_label": "surveillance",
                    "scene_type": ctx_data.get("scene_type", "surveillance"),
                    "narrative": ctx_data.get("narrative", ev["data"].get("description", "")),
                    "summary": ev["data"].get("description", ""),
                    **ev["data"],
                }
                if ctx_data:
                    ev_data["objects_present"] = ctx_data.get("objects_present", {})
                    ev_data["person_count"] = ctx_data.get("person_count", 0)
                enriched_fused.append({
                    "timestamp_start_s": ev["timestamp_start_s"],
                    "timestamp_end_s": ev["timestamp_end_s"],
                    "confidence": ev["data"].get("anomaly_score", 0.5),
                    "data": ev_data,
                })

        # Sort final merged list by timestamp
        enriched_fused.sort(key=lambda x: x["timestamp_start_s"])
        self.bus.fused_results = enriched_fused

        # Object count summary
        all_obj_counts: dict[str, int] = {}
        for ctx in self.bus.scene_contexts:
            for cls, cnt in ctx.get("objects_present", {}).items():
                all_obj_counts[cls] = all_obj_counts.get(cls, 0) + cnt
        self.bus.object_counts = all_obj_counts
        self.bus.tracking_summary = {
            "anomaly_summary": anomaly_summary,
            "video_context": context_output["video_summary"],
            "total_fused_insights": len(enriched_fused),
            "alert_count": anomaly_summary.get("alerts", 0),
        }

        self.report_progress(97, "reasoning_agent:complete")
        self.log.info("Reasoning complete",
                      fused=len(enriched_fused),
                      anomalies=len(self.bus.anomaly_events),
                      alerts=anomaly_summary.get("alerts", 0))
        return self.bus.tracking_summary
