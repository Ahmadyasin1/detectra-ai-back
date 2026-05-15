"""
Detectra AI — Multimodal Fusion Engine (25% of FYP grade)
============================================================
Cross-modal transformer that temporally aligns visual and audio modality outputs
into unified, contextually-enriched insights.

Architecture:
  1. Temporal Binning      — discretize all events into 1-second bins
  2. Feature Encoding      — project each modality into d_model=256 space
  3. Cross-Modal Attention — visual queries attend to audio keys/values
  4. Temporal Self-Attn    — capture temporal context across bins
  5. Insight Generation    — classify scene, score anomalies, write summaries

The fusion model weights are stored in models/fusion_transformer.pt.
Training: See notebooks/03_fusion_engine_training.ipynb (Colab T4, ~4 hrs)

If the model is not yet trained, a rule-based fallback fusion is used so the
pipeline still produces meaningful (non-empty) fused insights.
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import numpy as np
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


# ─── Feature Dimensions ───────────────────────────────────────────────────────
# Objects: one-hot-like bag-of-words over 80 COCO classes
_OBJECT_DIM = 80
# Logos: one-hot over 32 OpenLogos classes
_LOGO_DIM = 32
# Actions: one-hot over 101 UCF-101 classes
_ACTION_DIM = 101
# Speech: 4 features [has_speech, text_length, avg_logprob, no_speech_prob]
_SPEECH_DIM = 4
# Audio: one-hot over YAMNet top-5 classes used as summary + confidence
_AUDIO_DIM = 8

VISUAL_FEAT_DIM = _OBJECT_DIM + _LOGO_DIM + _ACTION_DIM  # 213
AUDIO_FEAT_DIM = _SPEECH_DIM + _AUDIO_DIM               # 12

D_MODEL = 256
N_HEADS = 8
N_CROSS_ATTN_LAYERS = 2

# Scene categories the fusion model predicts
# Surveillance-first ordering — most common surveillance scenes listed early
SCENE_LABELS = [
    # Surveillance-relevant (primary)
    "pedestrian_activity",
    "vehicle_traffic",
    "crowd_gathering",
    "person_interaction",
    "violent_confrontation",
    "loitering",
    "empty_scene",
    "restricted_area_intrusion",
    # General video scenes
    "sports_event",
    "music_performance",
    "news_broadcast",
    "conversation",
    "action_sequence",
    "nature_wildlife",
    "tutorial",
    "unknown",
]


# ─── PyTorch Model Definition ─────────────────────────────────────────────────

def _build_fusion_model():
    """Build the CrossModalTransformer in PyTorch."""
    import torch
    import torch.nn as nn

    class TemporalPositionalEncoding(nn.Module):
        def __init__(self, d_model: int, max_len: int = 3600):
            super().__init__()
            pe = torch.zeros(max_len, d_model)
            position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
            div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
            pe[:, 0::2] = torch.sin(position * div_term)
            pe[:, 1::2] = torch.cos(position * div_term)
            self.register_buffer("pe", pe.unsqueeze(0))  # (1, max_len, d_model)

        def forward(self, x):
            return x + self.pe[:, : x.size(1)]

    class CrossModalTransformer(nn.Module):
        def __init__(self):
            super().__init__()
            # Modality-specific linear projections
            self.visual_encoder = nn.Sequential(
                nn.Linear(VISUAL_FEAT_DIM, D_MODEL),
                nn.LayerNorm(D_MODEL),
                nn.ReLU(),
            )
            self.audio_encoder = nn.Sequential(
                nn.Linear(AUDIO_FEAT_DIM, D_MODEL),
                nn.LayerNorm(D_MODEL),
                nn.ReLU(),
            )
            self.pos_encoding = TemporalPositionalEncoding(D_MODEL)

            # Cross-attention: visual queries → audio keys/values
            self.cross_attn_layers = nn.ModuleList([
                nn.MultiheadAttention(D_MODEL, N_HEADS, dropout=0.1, batch_first=True)
                for _ in range(N_CROSS_ATTN_LAYERS)
            ])
            self.cross_attn_norms = nn.ModuleList([
                nn.LayerNorm(D_MODEL) for _ in range(N_CROSS_ATTN_LAYERS)
            ])

            # Temporal self-attention for context
            encoder_layer = nn.TransformerEncoderLayer(
                d_model=D_MODEL, nhead=N_HEADS, dim_feedforward=512,
                dropout=0.1, batch_first=True, norm_first=True,
            )
            self.temporal_encoder = nn.TransformerEncoder(encoder_layer, num_layers=2)

            # Output heads
            self.scene_classifier = nn.Linear(D_MODEL, len(SCENE_LABELS))
            self.anomaly_head = nn.Sequential(
                nn.Linear(D_MODEL, 64), nn.ReLU(), nn.Linear(64, 1), nn.Sigmoid()
            )
            self.correlation_head = nn.Sequential(
                nn.Linear(D_MODEL * 2, 64), nn.ReLU(), nn.Linear(64, 1), nn.Sigmoid()
            )

        def forward(self, visual_feats, audio_feats):
            # visual_feats: (B, T, VISUAL_FEAT_DIM)
            # audio_feats:  (B, T, AUDIO_FEAT_DIM)
            v = self.pos_encoding(self.visual_encoder(visual_feats))
            a = self.pos_encoding(self.audio_encoder(audio_feats))

            # Cross-attention: visual attends to audio
            for attn, norm in zip(self.cross_attn_layers, self.cross_attn_norms):
                v_attended, _ = attn(v, a, a)
                v = norm(v + v_attended)

            # Temporal self-attention over fused representation
            fused = self.temporal_encoder(v + a)

            scene_logits = self.scene_classifier(fused)  # (B, T, num_scenes)
            anomaly_scores = self.anomaly_head(fused).squeeze(-1)  # (B, T)

            # Visual-audio correlation per bin
            va_concat = torch.cat([v, a], dim=-1)  # (B, T, 2*D_MODEL)
            correlation = self.correlation_head(va_concat).squeeze(-1)  # (B, T)

            return scene_logits, anomaly_scores, correlation

    return CrossModalTransformer()


# ─── Feature Extraction Helpers ──────────────────────────────────────────────

# Cache COCO class names once at module load — avoids re-loading YOLOv8 on every time bin
_COCO_NAMES: list[str] | None = None


def _get_coco_names() -> list[str]:
    global _COCO_NAMES
    if _COCO_NAMES is None:
        try:
            from ultralytics import YOLO
            model_path = Path(settings.MODELS_DIR) / "yolov8n.pt"
            _model = YOLO(str(model_path) if model_path.exists() else "yolov8n.pt")
            _COCO_NAMES = list(_model.names.values())
        except Exception:
            _COCO_NAMES = [f"obj_{i}" for i in range(80)]
    return _COCO_NAMES


def _build_visual_feature_vector(
    object_data: list[dict], logo_data: list[dict], motion_data: list[dict], time_bin: int
) -> np.ndarray:
    """Build VISUAL_FEAT_DIM feature vector for a given 1-second time bin."""
    vec = np.zeros(VISUAL_FEAT_DIM, dtype=np.float32)

    # Object presence (aggregated confidence per COCO class index)
    coco_names = _get_coco_names()

    for item in object_data:
        if item["time_bin"] != time_bin:
            continue
        for det in item.get("detections", []):
            try:
                idx = coco_names.index(det["class_name"])
                vec[idx] = max(vec[idx], det["confidence"])
            except ValueError:
                pass

    # Logo presence (aggregated confidence per brand)
    from app.services.pipeline.logo_recognizer import LOGO_CLASSES
    for item in logo_data:
        if item["time_bin"] != time_bin:
            continue
        for det in item.get("detections", []):
            try:
                idx = LOGO_CLASSES.index(det["brand"])
                vec[_OBJECT_DIM + idx] = max(vec[_OBJECT_DIM + idx], det["confidence"])
            except ValueError:
                pass

    # Action presence (aggregated confidence per UCF-101 class)
    from app.services.pipeline.motion_recognizer import UCF101_CLASSES
    for item in motion_data:
        if item["time_bin"] != time_bin:
            continue
        action = item.get("action", "")
        try:
            idx = UCF101_CLASSES.index(action)
            vec[_OBJECT_DIM + _LOGO_DIM + idx] = max(
                vec[_OBJECT_DIM + _LOGO_DIM + idx], item.get("confidence", 0.0)
            )
        except ValueError:
            pass

    return vec


def _build_audio_feature_vector(
    speech_data: list[dict], audio_data: list[dict], time_bin: int
) -> np.ndarray:
    """Build AUDIO_FEAT_DIM feature vector for a given 1-second time bin."""
    vec = np.zeros(AUDIO_FEAT_DIM, dtype=np.float32)

    # Speech features
    for item in speech_data:
        if item["time_bin"] != time_bin:
            continue
        vec[0] = 1.0  # has_speech
        vec[1] = min(1.0, len(item.get("text", "")) / 200.0)  # text_length (normalized)
        vec[2] = (item.get("avg_logprob", -5.0) + 5.0) / 5.0  # avg_logprob (normalized)
        vec[3] = item.get("no_speech_prob", 0.0)

    # Audio event features (top-5 highlighted categories as binary)
    highlight_classes = [
        "Speech", "Music", "Vehicle", "Explosion", "Gunshot", "Siren", "Crowd", "Alarm"
    ]
    for item in audio_data:
        if item["time_bin"] != time_bin:
            continue
        event_class = item.get("event_class", "")
        try:
            idx = highlight_classes.index(event_class)
            vec[_SPEECH_DIM + idx] = max(vec[_SPEECH_DIM + idx], item.get("confidence", 0.0))
        except ValueError:
            pass

    return vec


def _assign_time_bins(results: list[dict], bin_size_s: float = 1.0) -> list[dict]:
    """Flatten result data and assign time bin indices."""
    flat = []
    for r in results:
        start_s = r.get("timestamp_start_s", 0.0)
        time_bin = int(start_s / bin_size_s)
        data = r.get("data", {})

        if "detections" in data:
            for det in data["detections"]:
                flat.append({"time_bin": time_bin, **det})
        else:
            flat.append({
                "time_bin": time_bin,
                "action": data.get("action", ""),
                "confidence": r.get("confidence", 0.0),
                "text": data.get("text", ""),
                "avg_logprob": data.get("avg_logprob", -5.0),
                "no_speech_prob": data.get("no_speech_prob", 0.0),
                "event_class": data.get("event_class", ""),
            })
    return flat


# ─── Rule-based Fallback Fusion ───────────────────────────────────────────────

def _rule_based_fusion(
    num_bins: int,
    object_flat: list[dict],
    logo_flat: list[dict],
    motion_flat: list[dict],
    speech_flat: list[dict],
    audio_flat: list[dict],
) -> list[dict[str, Any]]:
    """
    Surveillance-aware deterministic fallback fusion.
    Covers all key surveillance scenarios with structured output.
    """
    _VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle", "bicycle"}
    _DANGER_AUDIO = {"Gunshot", "Explosion", "Screaming", "Scream", "Glass", "Alarm", "Siren", "Fire"}
    _CROWD_THRESHOLD = 5

    results = []
    for t in range(num_bins):
        objects_here = [x for x in object_flat if x["time_bin"] == t]
        logos_here   = [x for x in logo_flat   if x["time_bin"] == t]
        motions_here = [x for x in motion_flat if x["time_bin"] == t]
        speech_here  = [x for x in speech_flat if x["time_bin"] == t]
        audio_here   = [x for x in audio_flat  if x["time_bin"] == t]

        all_events = objects_here + logos_here + motions_here + speech_here + audio_here
        if not all_events:
            continue

        # ── Presence flags ────────────────────────────────────────────────────
        person_count = sum(1 for x in objects_here if x.get("class_name") == "person")
        has_vehicle  = any(x.get("class_name") in _VEHICLE_CLASSES for x in objects_here)
        has_person   = person_count > 0
        has_crowd    = person_count >= _CROWD_THRESHOLD
        has_speech   = bool(speech_here)
        has_music    = any("music" in (x.get("event_class") or "").lower() for x in audio_here)
        danger_audio = [x for x in audio_here if x.get("event_class") in _DANGER_AUDIO]
        has_danger   = bool(danger_audio)

        action_names = {(x.get("action") or "").lower() for x in motions_here}
        has_fight    = any(w in a for a in action_names for w in ("fight", "wrestl", "attack"))
        has_run      = any("run" in a for a in action_names)
        has_sports   = any(a in {"basketball", "soccer", "tennis", "swimming", "baseball"}
                           for a in action_names)

        # ── Scene classification (surveillance-first) ─────────────────────────
        if has_fight:
            scene = "violent_confrontation"
        elif has_danger:
            scene = "restricted_area_intrusion"
        elif has_crowd:
            scene = "crowd_gathering"
        elif has_vehicle and has_person:
            scene = "vehicle_traffic"
        elif has_vehicle and not has_person:
            scene = "vehicle_traffic"
        elif has_sports:
            scene = "sports_event"
        elif has_music and not has_person:
            scene = "music_performance"
        elif has_speech and has_person:
            scene = "person_interaction"
        elif has_person:
            scene = "pedestrian_activity"
        else:
            scene = "empty_scene"

        # ── Anomaly scoring ───────────────────────────────────────────────────
        anomaly_score = 0.05  # baseline
        if has_danger:
            # Use max confidence from danger audio events
            max_conf = max((x.get("confidence", 0.5) for x in danger_audio), default=0.5)
            anomaly_score = max(anomaly_score, 0.85 * max_conf)
        if has_fight:
            anomaly_score = max(anomaly_score, 0.90)
        if has_crowd:
            crowd_score = min(0.75, 0.40 + (person_count - _CROWD_THRESHOLD) * 0.05)
            anomaly_score = max(anomaly_score, crowd_score)
        if has_run and not has_sports:
            anomaly_score = max(anomaly_score, 0.45)

        # ── Visual-audio correlation ──────────────────────────────────────────
        va_corr = 0.85 if (has_person and has_speech) else (0.60 if has_person else 0.30)

        # ── Confidence (detection quality proxy) ─────────────────────────────
        obj_confs = [x.get("confidence", 0.5) for x in objects_here]
        avg_conf = sum(obj_confs) / len(obj_confs) if obj_confs else 0.6

        # ── Object counts ─────────────────────────────────────────────────────
        from collections import Counter
        obj_counts = dict(Counter(x.get("class_name", "") for x in objects_here))

        # ── Event string list ─────────────────────────────────────────────────
        event_strs = list({
            x.get("class_name") or x.get("brand") or x.get("action") or x.get("event_class", "")
            for x in all_events
            if x.get("class_name") or x.get("brand") or x.get("action") or x.get("event_class")
        })

        # ── Narrative ─────────────────────────────────────────────────────────
        mins, secs = divmod(t, 60)
        narrative_parts = [f"At {mins:02d}:{secs:02d}"]
        if person_count:
            narrative_parts.append(f"{person_count} person{'s' if person_count>1 else ''} detected")
        if has_vehicle:
            narrative_parts.append("vehicle present")
        if has_fight:
            narrative_parts.append("ALERT: possible physical confrontation")
        if has_danger:
            classes = [x.get("event_class","") for x in danger_audio]
            narrative_parts.append(f"ALERT: {', '.join(classes)} detected in audio")
        if has_crowd:
            narrative_parts.append(f"crowd of {person_count} persons")
        if has_run and not has_sports:
            narrative_parts.append("person running")
        if speech_here:
            text = speech_here[0].get("text", "")[:60]
            if text:
                narrative_parts.append(f'speech: "{text}"')
        if logos_here:
            brands = list({x.get("brand","") for x in logos_here if x.get("brand")})[:2]
            if brands:
                narrative_parts.append(f"logo: {', '.join(brands)}")

        narrative = ". ".join(narrative_parts) + "."

        # Build summary (shorter version)
        summary_parts = []
        if event_strs:
            summary_parts.append(f"Detected: {', '.join(event_strs[:5])}")
        if speech_here:
            text = speech_here[0].get("text", "")[:80]
            summary_parts.append(f'Speech: "{text}"')
        summary = ". ".join(summary_parts) or "Activity detected."

        results.append({
            "timestamp_start_s": float(t),
            "timestamp_end_s": float(t + 1),
            "confidence": round(avg_conf, 4),
            "data": {
                "time_bin": t,
                "scene_label": scene,
                "scene_type": scene,
                "anomaly_score": round(anomaly_score, 4),
                "anomaly_severity": (
                    "critical" if anomaly_score >= 0.85
                    else "high" if anomaly_score >= 0.70
                    else "medium" if anomaly_score >= 0.45
                    else "low" if anomaly_score >= 0.20
                    else "normal"
                ),
                "alert": anomaly_score >= 0.70,
                "visual_audio_correlation": round(va_corr, 4),
                "narrative": narrative,
                "summary": summary,
                "contributing_events": event_strs[:10],
                "objects_present": obj_counts,
                "person_count": person_count,
                "vehicle_count": sum(1 for x in objects_here if x.get("class_name") in _VEHICLE_CLASSES),
                "has_speech": has_speech,
                "has_crowd": has_crowd,
            },
        })

    return results


# ─── Main Fusion Engine Class ─────────────────────────────────────────────────

class MultimodalFusionEngine:
    """
    Fuses outputs from all 5 analysis modules into unified timeline insights.

    Uses a trained CrossModalTransformer if available (models/fusion_transformer.pt),
    otherwise falls back to deterministic rule-based fusion.
    """

    _model = None
    _model_available = None

    def __init__(self):
        self.model_path = Path(settings.MODELS_DIR) / "fusion_transformer.pt"
        self.bin_size_s = settings.FUSION_TIME_BIN_S

    def _load_model(self):
        if MultimodalFusionEngine._model_available is None:
            MultimodalFusionEngine._model_available = self.model_path.exists()
            if not MultimodalFusionEngine._model_available:
                logger.warning(
                    "Fusion model not found — using rule-based fallback. "
                    "Train using notebooks/03_fusion_engine_training.ipynb",
                    expected_path=str(self.model_path),
                )

        if not MultimodalFusionEngine._model_available:
            return None

        if MultimodalFusionEngine._model is None:
            import torch
            model = _build_fusion_model()
            state = torch.load(str(self.model_path), map_location="cpu", weights_only=True)
            model.load_state_dict(state)
            model.eval()
            MultimodalFusionEngine._model = model
            logger.info("Fusion transformer model loaded", path=str(self.model_path))

        return MultimodalFusionEngine._model

    def fuse(
        self,
        object_results: list[dict],
        logo_results: list[dict],
        motion_results: list[dict],
        speech_results: list[dict],
        audio_results: list[dict],
        video_duration: float,
    ) -> list[dict[str, Any]]:
        """
        Main fusion method. Accepts raw result dicts from each pipeline module.
        Returns fused insight dicts ready to be saved as Result records.
        """
        num_bins = max(1, math.ceil(video_duration / self.bin_size_s))

        # Flatten and bin all results
        object_flat = _assign_time_bins(object_results, self.bin_size_s)
        logo_flat = _assign_time_bins(logo_results, self.bin_size_s)
        motion_flat = _assign_time_bins(motion_results, self.bin_size_s)
        speech_flat = _assign_time_bins(speech_results, self.bin_size_s)
        audio_flat = _assign_time_bins(audio_results, self.bin_size_s)

        model = self._load_model()

        if model is None:
            # Rule-based fallback
            return _rule_based_fusion(
                num_bins, object_flat, logo_flat, motion_flat, speech_flat, audio_flat
            )

        # ─── Neural Fusion ─────────────────────────────────────────────────
        import torch

        visual_matrix = np.stack([
            _build_visual_feature_vector(object_flat, logo_flat, motion_flat, t)
            for t in range(num_bins)
        ])  # (T, VISUAL_FEAT_DIM)

        audio_matrix = np.stack([
            _build_audio_feature_vector(speech_flat, audio_flat, t)
            for t in range(num_bins)
        ])  # (T, AUDIO_FEAT_DIM)

        v_tensor = torch.from_numpy(visual_matrix).unsqueeze(0)  # (1, T, VISUAL_FEAT_DIM)
        a_tensor = torch.from_numpy(audio_matrix).unsqueeze(0)   # (1, T, AUDIO_FEAT_DIM)

        with torch.no_grad():
            scene_logits, anomaly_scores, correlations = model(v_tensor, a_tensor)

        scene_probs = torch.softmax(scene_logits[0], dim=-1).numpy()   # (T, num_scenes)
        anomaly_np = anomaly_scores[0].numpy()                           # (T,)
        corr_np = correlations[0].numpy()                                # (T,)

        results = []
        for t in range(num_bins):
            scene_idx = int(np.argmax(scene_probs[t]))
            scene_label = SCENE_LABELS[scene_idx]
            anomaly_score = float(anomaly_np[t])
            va_corr = float(corr_np[t])

            # Collect events for this bin
            all_events_here = (
                [x for x in object_flat if x["time_bin"] == t] +
                [x for x in logo_flat if x["time_bin"] == t] +
                [x for x in motion_flat if x["time_bin"] == t] +
                [x for x in speech_flat if x["time_bin"] == t] +
                [x for x in audio_flat if x["time_bin"] == t]
            )
            if not all_events_here and anomaly_score < 0.3:
                continue

            event_strs = list({
                x.get("class_name") or x.get("brand") or x.get("action") or x.get("event_class", "")
                for x in all_events_here
                if x.get("class_name") or x.get("brand") or x.get("action") or x.get("event_class")
            })

            speech_texts = [x.get("text", "") for x in speech_flat if x["time_bin"] == t and x.get("text")]
            speech_snippet = f' Speech: "{speech_texts[0][:80]}"' if speech_texts else ""
            summary = (
                f"[{scene_label.replace('_', ' ').title()}] "
                f"{', '.join(event_strs[:4]) or 'No notable events'}."
                f"{speech_snippet}"
            )

            results.append({
                "timestamp_start_s": float(t * self.bin_size_s),
                "timestamp_end_s": float((t + 1) * self.bin_size_s),
                "confidence": float(scene_probs[t, scene_idx]),
                "data": {
                    "time_bin": t,
                    "scene_label": scene_label,
                    "scene_confidence": float(scene_probs[t, scene_idx]),
                    "anomaly_score": round(anomaly_score, 4),
                    "visual_audio_correlation": round(va_corr, 4),
                    "summary": summary,
                    "contributing_events": event_strs[:10],
                    "top3_scenes": [
                        {"scene": SCENE_LABELS[i], "confidence": float(scene_probs[t, i])}
                        for i in np.argsort(scene_probs[t])[::-1][:3]
                    ],
                },
            })

        logger.info("Fusion complete", bins=num_bins, insights=len(results), model="neural")
        return results
