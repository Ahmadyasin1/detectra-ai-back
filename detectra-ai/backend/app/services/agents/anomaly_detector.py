"""
AnomalyDetector — Surveillance-grade anomaly scoring for Detectra AI.

Uses a multi-factor scoring system combining visual, audio, and temporal signals.
All rules are domain-specific for surveillance contexts.

Anomaly Types (scored 0.0–1.0, where >= 0.7 = ALERT):
  - CRITICAL (0.85–1.0): Weapon, explosion, gunshot, fire
  - HIGH (0.70–0.85):    Fighting, crowd surge, screaming, glass break
  - MEDIUM (0.45–0.70):  Loitering, running, unauthorized object, alarm
  - LOW (0.20–0.45):     Unusual gathering, vehicle stopped, object left behind
  - NORMAL (0.0–0.20):   Routine activity

Output: list of AnomalyEvent dicts per time bin with:
  - timestamp_start_s, timestamp_end_s
  - anomaly_score (0.0–1.0)
  - severity ("critical" | "high" | "medium" | "low" | "normal")
  - anomaly_type (what triggered it)
  - description (human-readable)
  - contributing_signals (which modalities fired)
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any


# ─── Surveillance Alert Rules ─────────────────────────────────────────────────

# Audio events mapped to base anomaly scores
AUDIO_ANOMALY_MAP: dict[str, tuple[float, str]] = {
    # (base_score, anomaly_type)
    "Gunshot":          (0.95, "weapon_discharge"),
    "Explosion":        (0.95, "explosion"),
    "Screaming":        (0.85, "distress_call"),
    "Scream":           (0.85, "distress_call"),
    "Glass":            (0.80, "glass_breaking"),
    "Breaking":         (0.80, "glass_breaking"),
    "Alarm":            (0.75, "alarm_triggered"),
    "Siren":            (0.70, "emergency_vehicle"),
    "Fire":             (0.72, "fire_detected"),
    "Crying":           (0.60, "distress_call"),
    "Crowd":            (0.35, "crowd_activity"),
    "Laughter":         (0.10, "normal_activity"),
    "Music":            (0.05, "normal_activity"),
    "Speech":           (0.05, "normal_activity"),
}

# Object-action combinations that indicate danger
DANGEROUS_OBJECTS = {"knife", "scissors", "fork", "fire", "smoke"}
SURVEILLANCE_OBJECTS = {"person", "car", "truck", "bus", "motorcycle", "bicycle"}

# Actions with anomaly relevance
ACTION_ANOMALY_MAP: dict[str, float] = {
    "fistfight": 0.90,
    "wrestling":  0.85,
    "falling":    0.75,
    "running":    0.50,
    "loitering":  0.55,
    "crawling":   0.60,
}

# Crowd thresholds
CROWD_THRESHOLD = 5          # persons per frame to trigger crowd anomaly
CROWD_SURGE_THRESHOLD = 8    # persons per frame for critical crowd
LOITER_SECONDS = 10          # seconds in same area = loitering


@dataclass
class AnomalyEvent:
    timestamp_start_s: float
    timestamp_end_s: float
    anomaly_score: float
    severity: str
    anomaly_type: str
    description: str
    contributing_signals: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "timestamp_start_s": self.timestamp_start_s,
            "timestamp_end_s": self.timestamp_end_s,
            "confidence": self.anomaly_score,
            "data": {
                "anomaly_score": round(self.anomaly_score, 4),
                "severity": self.severity,
                "anomaly_type": self.anomaly_type,
                "description": self.description,
                "contributing_signals": self.contributing_signals,
                "alert": self.anomaly_score >= 0.70,
            },
        }


class AnomalyDetector:
    """
    Multi-factor anomaly detector for surveillance video analysis.

    Consumes outputs from all perception modules and produces
    time-stamped anomaly events with severity classifications.
    """

    def __init__(self, bin_size_s: float = 1.0):
        self.bin_size_s = bin_size_s

    @staticmethod
    def _severity(score: float) -> str:
        if score >= 0.85:
            return "critical"
        if score >= 0.70:
            return "high"
        if score >= 0.45:
            return "medium"
        if score >= 0.20:
            return "low"
        return "normal"

    def detect(
        self,
        object_results: list[dict],
        motion_results: list[dict],
        speech_results: list[dict],
        audio_results: list[dict],
        video_duration: float,
    ) -> list[AnomalyEvent]:
        """
        Main anomaly detection entry point.
        Returns a list of AnomalyEvents sorted by timestamp.
        """
        num_bins = max(1, int(video_duration / self.bin_size_s) + 1)
        events: list[AnomalyEvent] = []

        # Pre-bucket all data by time bin
        obj_by_bin: dict[int, list[dict]] = defaultdict(list)
        for r in object_results:
            t = int(r.get("timestamp_start_s", 0) / self.bin_size_s)
            data = r.get("data", {})
            for det in data.get("detections", []):
                obj_by_bin[t].append(det)

        motion_by_bin: dict[int, list[dict]] = defaultdict(list)
        for r in motion_results:
            t = int(r.get("timestamp_start_s", 0) / self.bin_size_s)
            motion_by_bin[t].append(r.get("data", {}))

        audio_by_bin: dict[int, list[dict]] = defaultdict(list)
        for r in audio_results:
            t = int(r.get("timestamp_start_s", 0) / self.bin_size_s)
            audio_by_bin[t].append(r.get("data", {}))

        speech_by_bin: dict[int, list[dict]] = defaultdict(list)
        for r in speech_results:
            t = int(r.get("timestamp_start_s", 0) / self.bin_size_s)
            speech_by_bin[t].append(r.get("data", {}))

        # Track person positions for loitering detection
        person_positions: list[dict] = []  # [{bin, x_center, y_center}]

        for t in range(num_bins):
            t_start = float(t * self.bin_size_s)
            t_end = float((t + 1) * self.bin_size_s)

            objects_here = obj_by_bin.get(t, [])
            motions_here = motion_by_bin.get(t, [])
            audio_here = audio_by_bin.get(t, [])
            speech_here = speech_by_bin.get(t, [])

            signals: list[str] = []
            score = 0.0
            anomaly_type = "normal"
            description_parts: list[str] = []

            # ── 1. Critical audio events ──────────────────────────────────────
            for audio_evt in audio_here:
                evt_class = audio_evt.get("event_class", "")
                conf = audio_evt.get("confidence", 0.5)
                for keyword, (base_score, atype) in AUDIO_ANOMALY_MAP.items():
                    if keyword.lower() in evt_class.lower():
                        weighted = base_score * conf
                        if weighted > score:
                            score = weighted
                            anomaly_type = atype
                        signals.append(f"audio:{evt_class}({conf:.2f})")
                        description_parts.append(f"{evt_class} detected in audio")
                        break

            # ── 2. Dangerous objects ──────────────────────────────────────────
            for det in objects_here:
                obj_class = det.get("class_name", "").lower()
                conf = det.get("confidence", 0.5)
                if obj_class in DANGEROUS_OBJECTS:
                    s = 0.85 * conf
                    if s > score:
                        score = s
                        anomaly_type = "dangerous_object"
                    signals.append(f"object:{obj_class}({conf:.2f})")
                    description_parts.append(f"Dangerous object '{obj_class}' detected")

            # ── 3. Crowd detection (person count) ─────────────────────────────
            person_count = sum(1 for d in objects_here if d.get("class_name") == "person")
            if person_count >= CROWD_SURGE_THRESHOLD:
                s = 0.80
                if s > score:
                    score = s
                    anomaly_type = "crowd_surge"
                signals.append(f"crowd:{person_count}persons")
                description_parts.append(f"Large crowd detected ({person_count} persons)")
            elif person_count >= CROWD_THRESHOLD:
                s = 0.50
                if s > score:
                    score = s
                    anomaly_type = "crowd_gathering"
                signals.append(f"crowd:{person_count}persons")
                description_parts.append(f"Crowd gathering ({person_count} persons)")

            # Track person centroids for loitering
            for det in objects_here:
                if det.get("class_name") == "person":
                    bbox = det.get("bbox", {})
                    if bbox:
                        cx = (bbox.get("x1", 0) + bbox.get("x2", 1)) / 2
                        cy = (bbox.get("y1", 0) + bbox.get("y2", 1)) / 2
                        person_positions.append({"bin": t, "cx": cx, "cy": cy})

            # ── 4. Loitering detection (person in same area > LOITER_SECONDS) ──
            if len(person_positions) >= LOITER_SECONDS:
                recent = [p for p in person_positions if p["bin"] >= t - LOITER_SECONDS]
                if len(recent) >= LOITER_SECONDS:
                    # Check spatial stability (std < 0.1 of frame width)
                    import statistics
                    cx_vals = [p["cx"] for p in recent]
                    cy_vals = [p["cy"] for p in recent]
                    try:
                        cx_std = statistics.stdev(cx_vals)
                        cy_std = statistics.stdev(cy_vals)
                        if cx_std < 0.10 and cy_std < 0.10:  # normalized coords
                            s = 0.55
                            if s > score:
                                score = s
                                anomaly_type = "loitering"
                            signals.append("loitering:spatial_stability")
                            description_parts.append(
                                f"Possible loitering: person stationary for >{LOITER_SECONDS}s"
                            )
                    except statistics.StatisticsError:
                        pass

            # ── 5. Action anomalies ───────────────────────────────────────────
            for motion in motions_here:
                action = motion.get("action", "").lower()
                action_conf = motion.get("confidence", 0.5)
                for act_key, act_score in ACTION_ANOMALY_MAP.items():
                    if act_key in action:
                        s = act_score * action_conf
                        if s > score:
                            score = s
                            anomaly_type = f"action_{act_key}"
                        signals.append(f"motion:{action}({action_conf:.2f})")
                        description_parts.append(f"Anomalous action: {action}")
                        break

            # ── 6. Speech distress keywords ───────────────────────────────────
            DISTRESS_KEYWORDS = {"help", "fire", "stop", "no", "run", "emergency", "attack"}
            for speech in speech_here:
                text = speech.get("text", "").lower()
                matched = [w for w in DISTRESS_KEYWORDS if w in text]
                if matched:
                    s = 0.65
                    if s > score:
                        score = s
                        anomaly_type = "distress_speech"
                    signals.append(f"speech:distress_keyword")
                    description_parts.append(
                        f"Distress keywords in speech: {', '.join(matched)}"
                    )

            # ── 7. Unattended object (vehicle stopped > 30s) ──────────────────
            vehicle_classes = {"car", "truck", "bus", "motorcycle"}
            vehicles_here = [d for d in objects_here if d.get("class_name") in vehicle_classes]
            if vehicles_here and person_count == 0:
                s = 0.30
                if s > score:
                    score = s
                    anomaly_type = "unattended_vehicle"
                signals.append("object:vehicle_without_person")
                description_parts.append("Unattended vehicle detected (no person visible)")

            # Only create an event if there's something notable
            if score > 0.05 or signals:
                severity = self._severity(score)
                description = "; ".join(description_parts) if description_parts else "Routine activity"

                events.append(AnomalyEvent(
                    timestamp_start_s=t_start,
                    timestamp_end_s=t_end,
                    anomaly_score=min(1.0, score),
                    severity=severity,
                    anomaly_type=anomaly_type,
                    description=description,
                    contributing_signals=signals[:10],
                ))

        return sorted(events, key=lambda e: e.timestamp_start_s)

    def get_summary(self, events: list[AnomalyEvent]) -> dict[str, Any]:
        """Generate an overall anomaly summary for the full video."""
        if not events:
            return {
                "overall_risk": "normal",
                "max_anomaly_score": 0.0,
                "total_anomalies": 0,
                "alerts": 0,
                "anomaly_types": {},
                "highest_risk_timestamp": None,
            }

        alert_events = [e for e in events if e.anomaly_score >= 0.70]
        type_counts: dict[str, int] = defaultdict(int)
        for e in events:
            type_counts[e.anomaly_type] += 1

        max_event = max(events, key=lambda e: e.anomaly_score)
        overall_score = max_event.anomaly_score

        return {
            "overall_risk": self._severity(overall_score),
            "max_anomaly_score": round(overall_score, 4),
            "total_anomalies": len(events),
            "alerts": len(alert_events),
            "anomaly_types": dict(type_counts),
            "highest_risk_timestamp": max_event.timestamp_start_s,
            "alert_timestamps": [e.timestamp_start_s for e in alert_events],
        }
