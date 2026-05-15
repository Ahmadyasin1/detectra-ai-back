"""
SceneContextEngine — Generates rich, natural-language scene understanding.

Responsibilities:
  - Aggregate object detections into per-second counts
  - Track unique object classes across the full video
  - Generate human-readable scene narratives per time window
  - Compute visual complexity score per frame
  - Produce a video-level intelligence summary

This is the "narrative brain" of the surveillance system — it translates
raw detection data into meaningful, actionable descriptions that security
operators can understand at a glance.

Output format:
  context_per_bin: [{
    "timestamp_start_s": 5.0,
    "timestamp_end_s": 6.0,
    "scene_type": "surveillance",
    "objects_present": {"person": 3, "car": 1},
    "dominant_action": "walking",
    "audio_context": "background noise",
    "narrative": "Three people walking in the scene with a vehicle nearby.",
    "complexity_score": 0.6,
    "object_count_total": 4,
  }]

  video_summary: {
    "total_object_count": 142,
    "unique_object_classes": ["person", "car", "bag"],
    "peak_activity_timestamp": 23.0,
    "dominant_scene_type": "surveillance",
    "person_present_seconds": 45,
    "vehicle_present_seconds": 12,
    "speech_present_seconds": 8,
    "overall_narrative": "...",
  }
"""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

# ─── Scene type classification ────────────────────────────────────────────────

def _classify_scene(
    person_count: int,
    vehicle_count: int,
    has_speech: bool,
    has_music: bool,
    has_crowd_audio: bool,
    action: str,
) -> str:
    action_lower = action.lower()
    if any(w in action_lower for w in ["fight", "wrestl", "attack"]):
        return "violent_confrontation"
    if vehicle_count > 0 and person_count == 0:
        return "traffic_scene"
    if vehicle_count > 0 and person_count > 0:
        return "mixed_traffic_pedestrian"
    if has_crowd_audio or person_count >= 5:
        return "crowd_scene"
    if has_music:
        return "entertainment_event"
    if has_speech and person_count >= 2:
        return "person_interaction"
    if has_speech and person_count == 1:
        return "single_person_speaking"
    if person_count >= 1:
        return "pedestrian_activity"
    return "empty_scene"


def _scene_description(
    scene_type: str,
    objects: dict[str, int],
    action: str,
    speech_text: str,
    audio_events: list[str],
    timestamp: float,
) -> str:
    """Generate a concise, human-readable scene description."""
    parts: list[str] = []

    # Time context
    mins = int(timestamp // 60)
    secs = timestamp % 60
    parts.append(f"At {mins:02d}:{secs:04.1f}")

    # Person count
    n_persons = objects.get("person", 0)
    if n_persons == 0:
        parts.append("no persons visible")
    elif n_persons == 1:
        parts.append("one person in frame")
    else:
        parts.append(f"{n_persons} persons in frame")

    # Vehicles
    vehicles = {k: v for k, v in objects.items() if k in {"car", "truck", "bus", "motorcycle", "bicycle"}}
    if vehicles:
        veh_str = ", ".join(f"{v} {k}{'s' if v>1 else ''}" for k, v in vehicles.items())
        parts.append(f"with {veh_str}")

    # Action
    if action and action != "unknown":
        parts.append(f"— action: {action.replace('_', ' ')}")

    # Audio
    notable_audio = [a for a in audio_events if a.lower() not in {"speech", "music", "silence", ""}]
    if notable_audio:
        parts.append(f"Audio: {', '.join(notable_audio[:3])}")
    elif audio_events:
        parts.append(f"Audio: {', '.join(audio_events[:2])}")

    # Speech snippet
    if speech_text:
        snippet = speech_text[:60].strip()
        if snippet:
            parts.append(f'— heard: "{snippet}"')

    # Other notable objects
    other_objs = {k: v for k, v in objects.items()
                  if k not in {"person", "car", "truck", "bus", "motorcycle", "bicycle"}}
    if other_objs:
        obj_str = ", ".join(f"{v} {k}" for k, v in list(other_objs.items())[:3])
        parts.append(f"Objects: {obj_str}")

    return ". ".join(parts) + "."


class SceneContextEngine:
    """
    Generates structured scene context and natural language narratives
    from the outputs of all perception modules.
    """

    def __init__(self, bin_size_s: float = 1.0):
        self.bin_size_s = bin_size_s

    def analyze(
        self,
        object_results: list[dict],
        motion_results: list[dict],
        speech_results: list[dict],
        audio_results: list[dict],
        video_duration: float,
    ) -> dict[str, Any]:
        """
        Main analysis entry point. Returns context_per_bin and video_summary.
        """
        num_bins = max(1, int(video_duration / self.bin_size_s) + 1)

        # ── Bucket data by time bin ───────────────────────────────────────────
        obj_by_bin: dict[int, list[dict]] = defaultdict(list)
        for r in object_results:
            t = int(r.get("timestamp_start_s", 0) / self.bin_size_s)
            for det in r.get("data", {}).get("detections", []):
                obj_by_bin[t].append(det)

        motion_by_bin: dict[int, dict] = {}
        for r in motion_results:
            t = int(r.get("timestamp_start_s", 0) / self.bin_size_s)
            motion_by_bin[t] = r.get("data", {})

        speech_by_bin: dict[int, list[str]] = defaultdict(list)
        for r in speech_results:
            t = int(r.get("timestamp_start_s", 0) / self.bin_size_s)
            text = r.get("data", {}).get("text", "")
            if text:
                speech_by_bin[t].append(text)

        audio_by_bin: dict[int, list[str]] = defaultdict(list)
        for r in audio_results:
            t = int(r.get("timestamp_start_s", 0) / self.bin_size_s)
            evt = r.get("data", {}).get("event_class", "")
            if evt:
                audio_by_bin[t].append(evt)

        # ── Per-bin context generation ────────────────────────────────────────
        context_per_bin: list[dict[str, Any]] = []
        all_object_classes: list[str] = []
        total_objects = 0
        peak_count = 0
        peak_ts = 0.0
        person_bins = 0
        vehicle_bins = 0
        speech_bins = 0

        for t in range(num_bins):
            t_start = float(t * self.bin_size_s)
            t_end = float((t + 1) * self.bin_size_s)

            detections = obj_by_bin.get(t, [])
            motion = motion_by_bin.get(t, {})
            speech_texts = speech_by_bin.get(t, [])
            audio_evts = audio_by_bin.get(t, [])

            # Object counts
            obj_counts: Counter = Counter(d.get("class_name", "") for d in detections)
            obj_dict = dict(obj_counts)
            all_object_classes.extend(obj_counts.keys())
            total_here = sum(obj_dict.values())
            total_objects += total_here

            if total_here > peak_count:
                peak_count = total_here
                peak_ts = t_start

            # Stats
            n_persons = obj_dict.get("person", 0)
            n_vehicles = sum(obj_dict.get(v, 0) for v in ["car", "truck", "bus", "motorcycle"])
            if n_persons > 0:
                person_bins += 1
            if n_vehicles > 0:
                vehicle_bins += 1

            has_speech = bool(speech_texts)
            if has_speech:
                speech_bins += 1

            has_music = any("music" in a.lower() for a in audio_evts)
            has_crowd_audio = any("crowd" in a.lower() for a in audio_evts)

            action = motion.get("action", "")
            action_conf = motion.get("confidence", 0.0)

            # Scene classification
            scene_type = _classify_scene(
                n_persons, n_vehicles, has_speech, has_music, has_crowd_audio, action
            )

            # Complexity score (0-1): more objects = more complex
            complexity = min(1.0, total_here / 20.0)

            # Average confidence of detections
            confs = [d.get("confidence", 0.5) for d in detections]
            avg_conf = sum(confs) / len(confs) if confs else 0.0

            # Narrative
            speech_snippet = speech_texts[0] if speech_texts else ""
            narrative = _scene_description(
                scene_type, obj_dict, action, speech_snippet, audio_evts, t_start
            )

            context_per_bin.append({
                "timestamp_start_s": t_start,
                "timestamp_end_s": t_end,
                "scene_type": scene_type,
                "objects_present": obj_dict,
                "object_count_total": total_here,
                "person_count": n_persons,
                "vehicle_count": n_vehicles,
                "dominant_action": action,
                "action_confidence": round(action_conf, 3),
                "audio_events": audio_evts[:5],
                "speech_text": speech_snippet[:100] if speech_snippet else "",
                "has_speech": has_speech,
                "complexity_score": round(complexity, 3),
                "avg_detection_confidence": round(avg_conf, 3),
                "narrative": narrative,
            })

        # ── Video-level summary ───────────────────────────────────────────────
        unique_classes = list(set(all_object_classes))
        class_freq = Counter(all_object_classes)

        dominant_scene = "unknown"
        if context_per_bin:
            scene_counter: Counter = Counter(c["scene_type"] for c in context_per_bin)
            dominant_scene = scene_counter.most_common(1)[0][0]

        # High-level narrative
        person_pct = person_bins / num_bins * 100 if num_bins else 0
        vehicle_pct = vehicle_bins / num_bins * 100 if num_bins else 0

        overall_narrative_parts = [
            f"The {video_duration:.0f}-second video shows primarily a {dominant_scene.replace('_', ' ')} environment.",
        ]
        if person_bins > 0:
            overall_narrative_parts.append(
                f"People are present for {person_pct:.0f}% of the footage ({person_bins}s)."
            )
        if vehicle_bins > 0:
            overall_narrative_parts.append(
                f"Vehicles appear for {vehicle_pct:.0f}% of the video."
            )
        if speech_bins > 0:
            overall_narrative_parts.append(
                f"Speech is detected for approximately {speech_bins} seconds."
            )
        if peak_ts > 0:
            overall_narrative_parts.append(
                f"Peak activity of {peak_count} objects occurs at {peak_ts:.1f}s."
            )
        top_objects = [cls for cls, _ in class_freq.most_common(5) if cls]
        if top_objects:
            overall_narrative_parts.append(
                f"Most frequent objects: {', '.join(top_objects)}."
            )

        video_summary = {
            "total_object_count": total_objects,
            "unique_object_classes": unique_classes,
            "class_frequencies": dict(class_freq.most_common(10)),
            "peak_activity_timestamp": peak_ts,
            "peak_activity_count": peak_count,
            "dominant_scene_type": dominant_scene,
            "person_present_seconds": person_bins,
            "vehicle_present_seconds": vehicle_bins,
            "speech_present_seconds": speech_bins,
            "overall_narrative": " ".join(overall_narrative_parts),
        }

        return {
            "context_per_bin": context_per_bin,
            "video_summary": video_summary,
        }
