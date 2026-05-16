"""
Detectra AI — Accuracy Engine v5
=================================

A self-contained set of accuracy-first upgrades that the main ``analyze_videos``
pipeline imports opportunistically. Every component degrades gracefully when an
optional dependency is missing so the standalone analyzer remains 100% functional
without `faster-whisper`, `silero-vad`, `open_clip_torch`, or `torch` GPU.

Public surface (kept stable for ``analyze_videos.py``):

    transcribe_audio_enhanced(path, *, model_size, languages_hint)
        → (segments: list[dict], languages: list[dict])
    IdentityTracker
        Per-track appearance fingerprint (HSV histogram + spatial coherence) that
        merges fragmented ByteTrack IDs into a stable physical person count.
    ClipLogoMatcher
        Optional CLIP-based visual brand recognition. Returns [] when unavailable.
    ReasoningAgent
        Synthesizes multimodal evidence into an executive brief, hierarchical
        timeline narrative, key entities and a calibrated threat assessment.

All return values are pure data (dicts / numpy arrays) — the analyzer is
responsible for converting them into its own dataclasses. This keeps the
module independent of ``analyze_videos`` to avoid circular imports.
"""
from __future__ import annotations

import json
import math
import os
import re
import warnings
from collections import Counter, defaultdict, deque
from pathlib import Path
from typing import Any, Iterable

import numpy as np

# ─────────────────────────────────────────────────────────────────────────────
# Optional dependency probes — never fail at import time.
# ─────────────────────────────────────────────────────────────────────────────

try:
    import torch  # noqa: F401
    _TORCH_AVAILABLE = True
except Exception:
    _TORCH_AVAILABLE = False

try:
    import cv2  # noqa: F401
    _CV2_AVAILABLE = True
except Exception:
    _CV2_AVAILABLE = False


# ═════════════════════════════════════════════════════════════════════════════
# 1) Enhanced speech transcription — faster-whisper + Silero VAD
# ═════════════════════════════════════════════════════════════════════════════

_FASTER_WHISPER_MODEL_CACHE: dict[str, Any] = {}


_LANG_NAMES: dict[str, str] = {
    "af": "Afrikaans", "ar": "Arabic", "bg": "Bulgarian", "bn": "Bengali",
    "ca": "Catalan", "cs": "Czech", "cy": "Welsh", "da": "Danish",
    "de": "German", "el": "Greek", "en": "English", "es": "Spanish",
    "et": "Estonian", "fa": "Persian", "fi": "Finnish", "fr": "French",
    "gl": "Galician", "gu": "Gujarati", "he": "Hebrew", "hi": "Hindi",
    "hr": "Croatian", "hu": "Hungarian", "hy": "Armenian", "id": "Indonesian",
    "is": "Icelandic", "it": "Italian", "ja": "Japanese", "kn": "Kannada",
    "ko": "Korean", "lt": "Lithuanian", "lv": "Latvian", "mk": "Macedonian",
    "ml": "Malayalam", "mr": "Marathi", "ms": "Malay", "mt": "Maltese",
    "my": "Burmese", "ne": "Nepali", "nl": "Dutch", "no": "Norwegian",
    "pa": "Punjabi", "pl": "Polish", "pt": "Portuguese", "ro": "Romanian",
    "ru": "Russian", "si": "Sinhala", "sk": "Slovak", "sl": "Slovenian",
    "sq": "Albanian", "sr": "Serbian", "sv": "Swedish", "sw": "Swahili",
    "ta": "Tamil", "te": "Telugu", "th": "Thai", "tl": "Filipino",
    "tr": "Turkish", "uk": "Ukrainian", "ur": "Urdu", "uz": "Uzbek",
    "vi": "Vietnamese", "yi": "Yiddish", "zh": "Chinese",
}


def _lang_name(code: str | None) -> str:
    if not code:
        return "Unknown"
    return _LANG_NAMES.get(code, code.upper())


def faster_whisper_available() -> bool:
    try:
        import faster_whisper  # noqa: F401
        return True
    except Exception:
        return False


def silero_vad_available() -> bool:
    """Silero VAD ships natively inside ``faster_whisper`` (vad_filter)."""
    return faster_whisper_available()


def _load_faster_whisper(model_size: str, device: str, compute_type: str):
    key = f"{model_size}:{device}:{compute_type}"
    if key in _FASTER_WHISPER_MODEL_CACHE:
        return _FASTER_WHISPER_MODEL_CACHE[key]
    from faster_whisper import WhisperModel
    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    _FASTER_WHISPER_MODEL_CACHE[key] = model
    return model


def transcribe_audio_enhanced(
    audio_path: str | Path,
    *,
    model_size: str = "medium",
    languages_hint: str | None = None,
    beam_size: int = 5,
    verbose: bool = True,
    chunk_seconds: float = 30.0,
    multilingual: bool = True,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Multilingual transcription with built-in Silero VAD and **per-chunk language
    re-detection**. Returns ``(segments, languages_summary)``.

    Strategy:
      1. Run faster-whisper with VAD filtering once to obtain speech-only chunks
         and a dominant-language guess (``info.language``).
      2. If the audio is long enough (≥ 2 × ``chunk_seconds``) AND ``multilingual``
         is enabled, re-run transcription in **chunks**, letting Whisper detect
         the language of each chunk independently. This is the only way to
         correctly transcribe videos where speakers switch language mid-clip
         (e.g. German narration + English advertisement).
      3. Segments are merged in time order and per-chunk language metadata is
         preserved on every segment.

    A *segment* dict has::

        {
          "start_s": float, "end_s": float,
          "text": str, "language": str, "language_name": str,
          "confidence": float (0-1), "is_noise": bool,
        }

    Falls back silently to OpenAI ``whisper`` if faster-whisper is unavailable.
    """
    audio_path = str(audio_path)
    if not faster_whisper_available():
        return _legacy_openai_whisper(audio_path, model_size=model_size,
                                       beam_size=beam_size, verbose=verbose)

    device = "cpu"
    compute_type = "int8"
    if _TORCH_AVAILABLE:
        try:
            import torch
            if torch.cuda.is_available():
                device, compute_type = "cuda", "float16"
        except Exception:
            pass

    try:
        model = _load_faster_whisper(model_size, device, compute_type)
    except Exception as exc:
        if verbose:
            print(f"  [Speech] faster-whisper failed to load ({exc}); "
                  f"falling back to openai-whisper")
        return _legacy_openai_whisper(audio_path, model_size=model_size,
                                       beam_size=beam_size, verbose=verbose)

    duration_s = _safe_audio_duration_seconds(audio_path)

    # ── Pass 1: dominant pass over the full file (with VAD) ──────────────────
    segments: list[dict[str, Any]] = []
    lang_counter: Counter = Counter()
    lang_probs: dict[str, float] = {}

    def _emit(seg, seg_lang_hint: str | None, lang_prob: float):
        text = (seg.text or "").strip()
        no_speech_prob = float(getattr(seg, "no_speech_prob", 0.0) or 0.0)
        avg_logprob = float(getattr(seg, "avg_logprob", -2.0) or -2.0)
        conf = max(0.0, min(1.0,
                            math.exp(max(avg_logprob, -3.0)) * (1.0 - no_speech_prob)))
        is_noise = bool(no_speech_prob > 0.55 or avg_logprob < -1.1 or len(text) < 2)
        display = "[noise]" if is_noise else text
        seg_lang = (getattr(seg, "language", None) or seg_lang_hint or "")
        seg_lang_name = _lang_name(seg_lang) if seg_lang else "Unknown"
        if not is_noise and seg_lang:
            lang_counter[seg_lang] += 1
            lang_probs[seg_lang] = max(lang_probs.get(seg_lang, 0.0), float(lang_prob))
        segments.append({
            "start_s": float(seg.start),
            "end_s": float(seg.end),
            "text": display,
            "language": seg_lang,
            "language_name": seg_lang_name,
            "confidence": float(conf),
            "is_noise": is_noise,
        })

    try:
        segments_iter, info = _faster_whisper_transcribe(
            model, audio_path,
            language=languages_hint,
            beam_size=beam_size,
        )
    except Exception as exc:
        if verbose:
            print(f"  [Speech] faster-whisper run failed ({exc}); "
                  f"falling back to openai-whisper")
        return _legacy_openai_whisper(audio_path, model_size=model_size,
                                       beam_size=beam_size, verbose=verbose)

    if verbose:
        print(f"  [Speech] faster-whisper-{model_size} "
              f"({device}/{compute_type}) dominant={info.language} "
              f"prob={info.language_probability:.2f} | duration={duration_s:.1f}s")

    for seg in segments_iter:
        _emit(seg, info.language, info.language_probability or 0.0)

    # ── Pass 2 (optional): chunked re-detection for multilingual audio ──────
    # Only run when the user did not force a language and the audio is long
    # enough that we expect language switches.
    if (multilingual and not languages_hint
            and duration_s >= 2.0 * chunk_seconds and segments):
        try:
            chunk_segments, chunk_langs = _multilingual_chunk_pass(
                model=model,
                audio_path=audio_path,
                duration_s=duration_s,
                chunk_seconds=chunk_seconds,
                beam_size=beam_size,
                base_segments=segments,
                verbose=verbose,
            )
            if chunk_segments and _looks_more_multilingual(chunk_langs,
                                                            lang_counter):
                if verbose:
                    print(f"  [Speech] multilingual chunk pass improved language "
                          f"diversity: {sorted(chunk_langs)} vs "
                          f"{sorted(lang_counter)}")
                segments = chunk_segments
                lang_counter = chunk_langs
        except Exception as exc:
            if verbose:
                print(f"  [Speech] multilingual chunk pass skipped: {exc}")

    languages_summary = [
        {"code": code, "name": _lang_name(code),
         "confidence": float(lang_probs.get(code, info.language_probability or 0.0)),
         "segment_count": cnt}
        for code, cnt in lang_counter.most_common()
    ]

    if verbose:
        real = sum(1 for s in segments if not s["is_noise"])
        langs_str = ", ".join(f"{d['name']}({d['segment_count']})"
                              for d in languages_summary[:6])
        print(f"  [Speech] {real} speech / {len(segments) - real} noise | "
              f"langs: {langs_str or _lang_name(info.language)}")

    return segments, languages_summary


def _faster_whisper_transcribe(model, audio_path: str, *,
                                 language: str | None, beam_size: int):
    """Compatibility shim across faster-whisper versions."""
    try:
        return model.transcribe(
            audio_path,
            language=language,
            task="transcribe",
            beam_size=beam_size,
            best_of=beam_size,
            patience=1.0,
            length_penalty=1.0,
            repetition_penalty=1.05,
            no_speech_threshold=0.45,
            log_prob_threshold=-1.2,
            compression_ratio_threshold=2.4,
            condition_on_previous_text=False,
            temperature=[0.0, 0.2, 0.4],
            word_timestamps=False,
            vad_filter=True,
            vad_parameters={
                "min_silence_duration_ms": 250,
                "speech_pad_ms": 100,
                "threshold": 0.35,
            },
        )
    except TypeError:
        return model.transcribe(
            audio_path,
            language=language,
            beam_size=beam_size,
            vad_filter=True,
        )


def _safe_audio_duration_seconds(audio_path: str) -> float:
    """Best-effort audio duration probe (no hard dependency)."""
    try:
        import wave
        with wave.open(audio_path, "rb") as w:
            return w.getnframes() / float(w.getframerate())
    except Exception:
        pass
    try:
        import librosa
        return float(librosa.get_duration(path=audio_path))
    except Exception:
        return 0.0


def _looks_more_multilingual(new_langs: Counter, base_langs: Counter) -> bool:
    """Heuristic: prefer the chunked pass only if it yields more than one
    language with at least 2 segments each (i.e. genuine multilingual content),
    while the base pass collapsed to a single dominant language."""
    rich_new = sum(1 for v in new_langs.values() if v >= 2)
    rich_base = sum(1 for v in base_langs.values() if v >= 2)
    return rich_new >= 2 and rich_new > rich_base


def _multilingual_chunk_pass(
    *,
    model,
    audio_path: str,
    duration_s: float,
    chunk_seconds: float,
    beam_size: int,
    base_segments: list[dict[str, Any]],
    verbose: bool,
) -> tuple[list[dict[str, Any]], Counter]:
    """
    Run faster-whisper on overlapping audio chunks letting it detect the
    language of each chunk independently. Returns merged segments and a fresh
    language counter.

    Strategy: 30 s chunks with 2 s overlap. For each chunk we ask faster-whisper
    to ``transcribe(..., language=None)`` so the model picks the best language
    for the segment instead of forcing the global dominant.
    """
    if not _TORCH_AVAILABLE:
        return [], Counter()
    try:
        import soundfile as sf
    except Exception:
        # soundfile is bundled with faster-whisper; if it's missing we can't
        # safely slice audio.
        return [], Counter()
    try:
        import numpy as _np
        wav, sr = sf.read(audio_path, dtype="float32")
        if wav.ndim > 1:
            wav = wav.mean(axis=1)
    except Exception:
        return [], Counter()

    seg_out: list[dict[str, Any]] = []
    lang_counter: Counter = Counter()
    overlap_s = 2.0
    step_s = max(5.0, chunk_seconds - overlap_s)
    n = int(_np.ceil(duration_s / step_s))
    for k in range(n):
        c_start = max(0.0, k * step_s)
        c_end = min(duration_s, c_start + chunk_seconds)
        if c_end - c_start < 3.0:
            continue
        i0 = int(c_start * sr); i1 = int(c_end * sr)
        chunk = wav[i0:i1]
        if chunk.size == 0:
            continue
        try:
            segments_iter, info = _faster_whisper_transcribe(
                model, chunk, language=None, beam_size=beam_size)
        except Exception:
            continue
        chunk_lang = info.language
        if not chunk_lang:
            continue
        # Whisper detect_language is more reliable than the per-segment one;
        # mark every segment from this chunk with the chunk-level language.
        for seg in segments_iter:
            txt = (seg.text or "").strip()
            no_sp = float(getattr(seg, "no_speech_prob", 0.0) or 0.0)
            logp = float(getattr(seg, "avg_logprob", -2.0) or -2.0)
            conf = max(0.0, min(1.0,
                                math.exp(max(logp, -3.0)) * (1.0 - no_sp)))
            is_noise = bool(no_sp > 0.55 or logp < -1.1 or len(txt) < 2)
            display = "[noise]" if is_noise else txt
            seg_out.append({
                "start_s": float(seg.start + c_start),
                "end_s": float(seg.end + c_start),
                "text": display,
                "language": chunk_lang,
                "language_name": _lang_name(chunk_lang),
                "confidence": float(conf),
                "is_noise": is_noise,
            })
            if not is_noise:
                lang_counter[chunk_lang] += 1
    if not seg_out:
        return [], Counter()
    # Dedupe overlapping segments (keep highest-confidence one per (start, end))
    seg_out.sort(key=lambda s: (s["start_s"], -s["confidence"]))
    deduped: list[dict[str, Any]] = []
    for s in seg_out:
        if deduped and (s["start_s"] - deduped[-1]["start_s"] < 0.5
                        and s["end_s"] - deduped[-1]["end_s"] < 0.5):
            continue
        deduped.append(s)
    return deduped, lang_counter


def _legacy_openai_whisper(
    audio_path: str,
    *,
    model_size: str,
    beam_size: int,
    verbose: bool,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Backwards-compatible openai-whisper transcription path."""
    try:
        import whisper as _w
    except Exception as exc:
        if verbose:
            print(f"  [Speech] openai-whisper unavailable ({exc})")
        return [], []

    try:
        model = _w.load_model(model_size)
        audio = _w.load_audio(audio_path)
        clip = _w.pad_or_trim(audio)
        mel = _w.log_mel_spectrogram(clip).to(model.device)
        _, probs = model.detect_language(mel)
        dom_lang = max(probs, key=probs.get)
        dom_conf = float(probs[dom_lang])
        if verbose:
            print(f"  [Speech] openai-whisper-{model_size} dom={dom_lang} "
                  f"({dom_conf:.2f})")
        if dom_conf < 0.40:
            return [], []
        result = model.transcribe(
            audio_path, language=None, task="transcribe", fp16=False,
            word_timestamps=False, verbose=False,
            no_speech_threshold=0.45, logprob_threshold=-1.2,
            compression_ratio_threshold=2.4,
            condition_on_previous_text=False, temperature=0.0,
            beam_size=beam_size, best_of=beam_size, initial_prompt=None,
        )
        segments: list[dict[str, Any]] = []
        lang_counter: Counter = Counter()
        for seg in result.get("segments", []):
            text = (seg.get("text") or "").strip()
            avg_logprob = float(seg.get("avg_logprob", -2.0))
            no_speech = float(seg.get("no_speech_prob", 0.0))
            conf = max(0.0, min(1.0, math.exp(max(avg_logprob, -3.0)) * (1.0 - no_speech)))
            is_noise = bool(no_speech > 0.50 or avg_logprob < -1.0 or len(text) < 2)
            display = "[noise]" if is_noise else text
            seg_lang = seg.get("language") or result.get("language") or dom_lang
            if not is_noise:
                lang_counter[seg_lang] += 1
            segments.append({
                "start_s": float(seg["start"]), "end_s": float(seg["end"]),
                "text": display, "language": seg_lang,
                "language_name": _lang_name(seg_lang),
                "confidence": float(conf), "is_noise": is_noise,
            })
        languages_summary = [
            {"code": c, "name": _lang_name(c),
             "confidence": float(probs.get(c, dom_conf)),
             "segment_count": n}
            for c, n in lang_counter.most_common()
        ]
        return segments, languages_summary
    except Exception as exc:
        if verbose:
            print(f"  [Speech] openai-whisper failed: {exc}")
        return [], []


# ═════════════════════════════════════════════════════════════════════════════
# 2) Identity Tracker — appearance ReID for accurate person counting
# ═════════════════════════════════════════════════════════════════════════════

class _Identity:
    __slots__ = ("pid", "histogram", "last_seen_ts", "last_bbox", "track_ids",
                 "samples", "first_seen_ts")

    def __init__(self, pid: int, ts: float, hist: np.ndarray, bbox: tuple,
                 tid: int | None):
        self.pid = pid
        self.histogram = hist
        self.last_seen_ts = ts
        self.first_seen_ts = ts
        self.last_bbox = bbox
        self.track_ids: set[int] = {tid} if tid is not None else set()
        self.samples = 1


class IdentityTracker:
    """
    Maintains stable physical-person identities across ByteTrack ID switches.

    For every person detection we extract an HSV color histogram of the segmentation
    mask (or bounding-box fallback) and store it under a stable ``pid``. When
    ByteTrack assigns a new ``track_id`` the tracker tries to merge it with an
    existing identity by:

        1. Histogram Bhattacharyya similarity (clothing colour fingerprint)
        2. Spatial proximity to the identity's last bbox
        3. Time elapsed (longer gaps require higher similarity)

    The result is far closer to the true number of physically distinct people than
    counting raw ByteTrack IDs (which fragments on occlusion / re-entry).
    """

    def __init__(
        self,
        *,
        hist_bins: tuple[int, int, int] = (16, 8, 8),
        match_threshold: float = 0.55,
        reid_gap_seconds: float = 30.0,
        spatial_weight: float = 0.25,
    ):
        self.hist_bins = hist_bins
        self.match_threshold = match_threshold
        self.reid_gap_seconds = reid_gap_seconds
        self.spatial_weight = spatial_weight
        self._identities: list[_Identity] = []
        self._tid_to_pid: dict[int, int] = {}
        self._next_pid = 1

    # ── Public API ───────────────────────────────────────────────────────────

    def reset(self) -> None:
        self._identities.clear()
        self._tid_to_pid.clear()
        self._next_pid = 1

    def update(
        self,
        ts: float,
        person_records: list[dict[str, Any]],
    ) -> dict[int, int]:
        """
        Process one frame's person detections and return ``{track_id: pid}``.

        Each record needs: ``track_id`` (int|None), ``bbox`` (tuple x1,y1,x2,y2 in
        normalized coords), and either ``crop`` (BGR np.ndarray) or ``mask`` (bool
        np.ndarray) + ``frame`` (BGR np.ndarray of full frame) to extract appearance.
        """
        out: dict[int, int] = {}
        for rec in person_records:
            tid = rec.get("track_id")
            if tid is None:
                continue
            bbox = rec.get("bbox") or (0.0, 0.0, 0.0, 0.0)
            hist = self._compute_hist(rec)
            if hist is None:
                continue
            if tid in self._tid_to_pid:
                pid = self._tid_to_pid[tid]
                ident = self._find_pid(pid)
                if ident is not None:
                    ident.histogram = 0.85 * ident.histogram + 0.15 * hist
                    ident.last_seen_ts = ts
                    ident.last_bbox = bbox
                    ident.samples += 1
                    out[tid] = pid
                    continue
            # New track_id: try to merge with an existing identity
            best_pid, best_score = self._best_match(hist, bbox, ts)
            if best_pid is not None and best_score >= self.match_threshold:
                ident = self._find_pid(best_pid)
                if ident is not None:
                    ident.histogram = 0.7 * ident.histogram + 0.3 * hist
                    ident.last_seen_ts = ts
                    ident.last_bbox = bbox
                    ident.track_ids.add(tid)
                    ident.samples += 1
                    self._tid_to_pid[tid] = best_pid
                    out[tid] = best_pid
                    continue
            # Brand-new physical person
            pid = self._next_pid
            self._next_pid += 1
            self._identities.append(_Identity(pid, ts, hist, bbox, tid))
            self._tid_to_pid[tid] = pid
            out[tid] = pid
        return out

    @property
    def distinct_count(self) -> int:
        return len(self._identities)

    def summary(self) -> list[dict[str, Any]]:
        return [
            {
                "pid": ident.pid,
                "track_ids": sorted(ident.track_ids),
                "samples": ident.samples,
                "first_seen_s": round(ident.first_seen_ts, 2),
                "last_seen_s": round(ident.last_seen_ts, 2),
            }
            for ident in self._identities
        ]

    # ── Internals ───────────────────────────────────────────────────────────

    def _find_pid(self, pid: int) -> _Identity | None:
        for ident in self._identities:
            if ident.pid == pid:
                return ident
        return None

    def _best_match(
        self,
        hist: np.ndarray,
        bbox: tuple,
        ts: float,
    ) -> tuple[int | None, float]:
        best_pid = None
        best_score = -1.0
        for ident in self._identities:
            gap = ts - ident.last_seen_ts
            if gap > self.reid_gap_seconds:
                continue
            sim = _hist_similarity(ident.histogram, hist)
            spatial = _bbox_spatial_score(ident.last_bbox, bbox)
            # Time-decay penalty: identities reappearing after long gaps are less
            # confidently the same person.
            time_decay = max(0.0, 1.0 - gap / max(self.reid_gap_seconds, 1e-3))
            score = (1.0 - self.spatial_weight) * sim + \
                    self.spatial_weight * spatial
            score *= 0.6 + 0.4 * time_decay
            if score > best_score:
                best_score = score
                best_pid = ident.pid
        return best_pid, best_score

    def _compute_hist(self, rec: dict[str, Any]) -> np.ndarray | None:
        if not _CV2_AVAILABLE:
            return None
        import cv2
        frame = rec.get("frame")
        crop = rec.get("crop")
        mask = rec.get("mask")
        try:
            if crop is None and frame is not None:
                bbox = rec.get("bbox")
                if bbox is None:
                    return None
                h, w = frame.shape[:2]
                x1 = max(0, int(bbox[0] * w))
                y1 = max(0, int(bbox[1] * h))
                x2 = min(w, int(bbox[2] * w))
                y2 = min(h, int(bbox[3] * h))
                if x2 <= x1 or y2 <= y1:
                    return None
                crop = frame[y1:y2, x1:x2]
            if crop is None or crop.size == 0:
                return None
            hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
            mask_cv = None
            if mask is not None and mask.size > 0:
                m = mask.astype(np.uint8)
                if m.shape[:2] != hsv.shape[:2]:
                    m = cv2.resize(m, (hsv.shape[1], hsv.shape[0]),
                                   interpolation=cv2.INTER_NEAREST)
                mask_cv = (m * 255).astype(np.uint8)
            hist = cv2.calcHist([hsv], [0, 1, 2], mask_cv,
                                self.hist_bins, [0, 180, 0, 256, 0, 256])
            hist = cv2.normalize(hist, hist).flatten().astype(np.float32)
            return hist
        except Exception:
            return None


def _hist_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Bhattacharyya similarity normalised to [0, 1] (higher is more similar)."""
    if a is None or b is None or a.shape != b.shape:
        return 0.0
    if not _CV2_AVAILABLE:
        diff = float(np.linalg.norm(a - b))
        return max(0.0, 1.0 - diff)
    import cv2
    dist = cv2.compareHist(a.astype(np.float32), b.astype(np.float32),
                            cv2.HISTCMP_BHATTACHARYYA)
    return max(0.0, 1.0 - float(dist))


def _bbox_spatial_score(a: tuple, b: tuple) -> float:
    """Inverse normalized distance between two bbox centres. Range [0, 1]."""
    try:
        ax = 0.5 * (a[0] + a[2]); ay = 0.5 * (a[1] + a[3])
        bx = 0.5 * (b[0] + b[2]); by = 0.5 * (b[1] + b[3])
        d = math.hypot(ax - bx, ay - by)
        return max(0.0, 1.0 - min(1.0, d / 0.6))
    except Exception:
        return 0.0


# ═════════════════════════════════════════════════════════════════════════════
# 3) CLIP-based Logo Matcher (optional visual brand recognition)
# ═════════════════════════════════════════════════════════════════════════════

class ClipLogoMatcher:
    """
    CLIP-based visual logo recognition. A supplement to OCR-based detection that
    recognises *visual* brand marks (Nike swoosh, Apple silhouette, McDonald's
    golden arches, BMW roundel) that have no readable text.

    Accuracy upgrades over a naive single-prompt classifier:
      • 4 paraphrased prompts per brand are encoded and averaged → robust to
        prompt phrasing.
      • A 'distractor' class ("a photo of a generic scene without any brand
        logo") is added to the same softmax to suppress false positives.
      • Each frame is scanned at multiple regions (full frame + 4 quadrants +
        centre crop) → catches small logos that occupy <15 % of the frame.
      • Confidence is the softmax probability (not the raw cosine similarity)
        which is easier to threshold across brands and scenes.

    Usage::

        matcher = ClipLogoMatcher(brands=["nike", "apple", "coca-cola"])
        if matcher.available:
            hits = matcher.detect(frame_bgr, ts=12.4)
    """

    def __init__(
        self,
        brands: Iterable[str] | None = None,
        *,
        score_threshold: float = 0.30,
        top_k: int = 3,
        regions: str = "multi",          # "single" | "multi"
        verbose: bool = False,
    ):
        self.brands = list(brands or DEFAULT_LOGO_BRANDS)
        self.score_threshold = score_threshold
        self.top_k = top_k
        self.regions = regions
        self.verbose = verbose
        self._model = None
        self._preprocess = None
        self._text_features = None     # shape (N+1, D) -- last row is distractor
        self._distractor_label = "no_brand"
        self._device = "cpu"
        self._tokenizer = None
        self._load_error: str | None = None
        self._available = self._load()

    @property
    def available(self) -> bool:
        return self._available

    @property
    def load_error(self) -> str | None:
        return self._load_error

    # ── Internals ────────────────────────────────────────────────────────────

    _PROMPT_TEMPLATES: tuple[str, ...] = (
        "a photo of the {brand} logo",
        "the {brand} brand logo",
        "a sign or advertisement showing {brand}",
        "a {brand} branded product or storefront",
    )

    def _load(self) -> bool:
        try:
            import open_clip
            import torch
        except Exception as exc:
            self._load_error = f"open_clip/torch not installed ({exc})"
            return False
        try:
            model_name = "ViT-B-32"
            pretrained = "openai"
            self._device = "cuda" if torch.cuda.is_available() else "cpu"
            model, _, preprocess = open_clip.create_model_and_transforms(
                model_name, pretrained=pretrained, device=self._device)
            tokenizer = open_clip.get_tokenizer(model_name)

            with torch.no_grad():
                rows = []
                for brand in self.brands:
                    prompts = [t.format(brand=brand)
                               for t in self._PROMPT_TEMPLATES]
                    tokens = tokenizer(prompts).to(self._device)
                    feats = model.encode_text(tokens)
                    feats = feats / feats.norm(dim=-1, keepdim=True)
                    rows.append(feats.mean(dim=0))
                # Distractor row (suppresses generic scenes from matching)
                neg_prompts = [
                    "a photo of a generic scene without any brand logo",
                    "an empty wall or background with no logo",
                    "a photo of a person without any logo or brand",
                    "ordinary clothing or objects without branding",
                ]
                neg_tokens = tokenizer(neg_prompts).to(self._device)
                neg_feats = model.encode_text(neg_tokens)
                neg_feats = neg_feats / neg_feats.norm(dim=-1, keepdim=True)
                rows.append(neg_feats.mean(dim=0))

                text_feats = torch.stack(rows, dim=0)
                text_feats = text_feats / text_feats.norm(dim=-1, keepdim=True)

            self._model = model
            self._preprocess = preprocess
            self._text_features = text_feats
            self._tokenizer = tokenizer
            if self.verbose:
                print(f"  [CLIP] Logos ready ({len(self.brands)} brands, "
                      f"{len(self._PROMPT_TEMPLATES)} prompts/brand, "
                      f"device={self._device})")
            return True
        except Exception as exc:
            self._load_error = f"CLIP load failed ({exc})"
            return False

    @staticmethod
    def _regions_for(frame_bgr: np.ndarray, mode: str) -> list[tuple[np.ndarray, tuple[float, float, float, float]]]:
        """Return list of (region_image, normalized_bbox_xyxy)."""
        h, w = frame_bgr.shape[:2]
        if mode == "single":
            return [(frame_bgr, (0.0, 0.0, 1.0, 1.0))]
        # 6-region scan: full + 4 quadrants + centre
        cx, cy = w // 2, h // 2
        cw, ch = int(w * 0.55), int(h * 0.55)
        x0 = max(0, cx - cw // 2); y0 = max(0, cy - ch // 2)
        x1 = min(w, cx + cw // 2); y1 = min(h, cy + ch // 2)
        return [
            (frame_bgr, (0.0, 0.0, 1.0, 1.0)),
            (frame_bgr[:cy, :cx],   (0.0, 0.0, 0.5, 0.5)),  # TL
            (frame_bgr[:cy, cx:],   (0.5, 0.0, 1.0, 0.5)),  # TR
            (frame_bgr[cy:, :cx],   (0.0, 0.5, 0.5, 1.0)),  # BL
            (frame_bgr[cy:, cx:],   (0.5, 0.5, 1.0, 1.0)),  # BR
            (frame_bgr[y0:y1, x0:x1],
             (x0 / w, y0 / h, x1 / w, y1 / h)),              # centre
        ]

    def detect(self, frame_bgr: np.ndarray, ts: float = 0.0) -> list[dict[str, Any]]:
        if not self._available or frame_bgr is None or frame_bgr.size == 0:
            return []
        try:
            import torch
            from PIL import Image
        except Exception:
            return []

        try:
            regions = self._regions_for(frame_bgr, self.regions)
        except Exception:
            regions = [(frame_bgr, (0.0, 0.0, 1.0, 1.0))]

        # Aggregate best score per brand across all regions; keep best region.
        best_per_brand: dict[str, tuple[float, tuple[float, float, float, float]]] = {}

        try:
            for region, bbox in regions:
                if region is None or region.size == 0:
                    continue
                rgb = region[..., ::-1]
                pil = Image.fromarray(rgb)
                img = self._preprocess(pil).unsqueeze(0).to(self._device)
                with torch.no_grad():
                    feat = self._model.encode_image(img)
                    feat = feat / feat.norm(dim=-1, keepdim=True)
                    logits = (100.0 * feat @ self._text_features.T).squeeze(0)
                    probs = torch.softmax(logits, dim=-1)
                # Skip if distractor dominates → no brand in this region
                if probs[-1].item() >= 0.55:
                    continue
                topk = torch.topk(probs[:-1],
                                  k=min(self.top_k, probs.shape[0] - 1))
                for score, idx in zip(topk.values.tolist(),
                                       topk.indices.tolist()):
                    if score < self.score_threshold:
                        continue
                    brand = self.brands[idx]
                    cur = best_per_brand.get(brand)
                    if cur is None or score > cur[0]:
                        best_per_brand[brand] = (float(score), bbox)
        except Exception:
            return []

        results: list[dict[str, Any]] = []
        for brand, (score, bbox) in best_per_brand.items():
            results.append({
                "timestamp_s": float(ts),
                "brand": brand,
                "text_found": "",
                "confidence": float(score),
                "bbox": {
                    "x1": float(bbox[0]), "y1": float(bbox[1]),
                    "x2": float(bbox[2]), "y2": float(bbox[3]),
                },
                "source": "clip",
            })
        results.sort(key=lambda r: r["confidence"], reverse=True)
        return results


DEFAULT_LOGO_BRANDS: list[str] = [
    # Sportswear & fashion
    "Nike", "Adidas", "Puma", "Reebok", "Under Armour", "New Balance", "Asics",
    "Converse", "Vans", "Lacoste", "Polo Ralph Lauren", "Tommy Hilfiger",
    "Calvin Klein", "Gucci", "Louis Vuitton", "Chanel", "Prada", "Versace",
    "Hugo Boss", "Burberry", "Zara", "H&M", "Uniqlo", "Levi's",
    # Tech & electronics
    "Apple", "Samsung", "Google", "Microsoft", "Intel", "AMD", "Nvidia",
    "IBM", "Oracle", "Cisco", "Dell", "HP", "Lenovo", "Asus", "Acer",
    "Huawei", "Xiaomi", "OnePlus", "Oppo", "Motorola",
    # Beverages
    "Coca-Cola", "Pepsi", "Sprite", "Fanta", "Mountain Dew", "Dr Pepper",
    "Red Bull", "Monster Energy", "Gatorade", "Lipton", "Nestea", "Tropicana",
    "Heineken", "Corona", "Budweiser", "Carlsberg", "Stella Artois", "Guinness",
    "Nescafe", "Lavazza", "Nespresso",
    # Food & QSR
    "McDonald's", "KFC", "Burger King", "Starbucks", "Subway", "Domino's",
    "Pizza Hut", "Taco Bell", "Wendy's", "Chick-fil-A", "Dunkin'",
    "Tim Hortons", "Costa Coffee", "Krispy Kreme", "Baskin-Robbins",
    "Nestle", "Kellogg's", "Kraft", "Heinz", "Cadbury", "Hershey's",
    "Lay's", "Doritos", "Pringles", "Oreo", "Snickers", "M&M's", "Kit Kat",
    # Retail & e-commerce
    "Walmart", "Target", "Costco", "Tesco", "Carrefour", "Aldi", "Lidl",
    "Amazon", "eBay", "Alibaba", "AliExpress", "IKEA", "Home Depot",
    "Best Buy", "Sephora",
    # Streaming, social & internet
    "Netflix", "Disney+", "HBO", "Hulu", "Prime Video", "Spotify", "YouTube",
    "Twitch", "Facebook", "Meta", "Instagram", "TikTok", "Twitter", "X (Twitter)",
    "WhatsApp", "Snapchat", "LinkedIn", "Pinterest", "Reddit", "Discord",
    "Zoom", "Slack", "Telegram",
    # Automotive
    "BMW", "Mercedes-Benz", "Audi", "Toyota", "Honda", "Ford", "Tesla",
    "Volkswagen", "Hyundai", "Kia", "Mazda", "Subaru", "Ferrari", "Lamborghini",
    "Porsche", "Bentley", "Rolls-Royce", "Jaguar", "Land Rover", "Range Rover",
    "Volvo", "Peugeot", "Renault", "Fiat", "Jeep", "Chevrolet", "Dodge",
    "Nissan", "Mitsubishi", "Suzuki",
    # Finance & cards
    "Visa", "Mastercard", "American Express", "PayPal", "Venmo", "Stripe",
    "Square", "Klarna", "Afterpay", "Apple Pay", "Google Pay",
    "HSBC", "Citibank", "Chase", "Bank of America", "Wells Fargo",
    "Goldman Sachs", "JP Morgan", "Barclays", "Santander", "BNP Paribas",
    "Deutsche Bank", "ING", "UBS",
    # Cameras, audio & home appliances
    "Sony", "LG", "Panasonic", "Toshiba", "Sharp", "Samsung Electronics",
    "Canon", "Nikon", "Fujifilm", "GoPro", "DJI", "Bose", "JBL",
    "Beats", "Sennheiser", "Bosch", "Philips", "Dyson", "Roomba", "iRobot",
    # Logistics & energy
    "FedEx", "UPS", "DHL", "USPS", "Royal Mail", "Maersk", "Shell", "BP",
    "ExxonMobil", "Chevron", "Total", "Aramco", "GE", "Siemens", "Schneider",
    # Sports leagues & broadcasters (often appear on branded surfaces)
    "FIFA", "UEFA", "NBA", "NFL", "MLB", "NHL", "Premier League",
    "Champions League", "Formula 1", "ESPN", "CNN", "BBC", "Fox News",
    "Al Jazeera", "Bloomberg", "Reuters", "Sky Sports",
    # Airlines & travel
    "Emirates", "Qatar Airways", "Etihad", "Lufthansa", "Delta", "United",
    "American Airlines", "British Airways", "Singapore Airlines",
    "Booking.com", "Airbnb", "Uber", "Lyft", "Bolt", "Careem",
]


# ═════════════════════════════════════════════════════════════════════════════
# 4) Reasoning Agent — agentic synthesis of multimodal evidence
# ═════════════════════════════════════════════════════════════════════════════

_SCENE_NARRATIVE: dict[str, str] = {
    "empty_scene": "An empty environment with no significant human presence",
    "pedestrian_movement": "Pedestrian foot traffic in a populated environment",
    "crowd_gathering": "Several people gathering and converging in a single area",
    "crowd_dispersal": "A crowd rapidly dispersing in multiple directions",
    "vehicle_traffic": "Vehicles moving through the scene",
    "mixed_pedestrian_traffic": "A mix of pedestrians and vehicles sharing the area",
    "person_speaking": "Active conversation captured on the audio track",
    "indoor_activity": "Indoor scene with people engaged in routine activity",
    "outdoor_public": "Outdoor public space activity",
    "person_loitering": "One or more individuals lingering with little movement",
    "suspicious_activity": "Behaviour patterns flagged as suspicious",
    "confrontation": "Apparent confrontation or aggression between individuals",
    "entertainment_event": "An entertainment-style gathering with music or speech",
    "anomalous_audio": "Acoustic event of interest in the soundtrack",
    "surveillance_alert": "Surveillance-grade alert raised by the fusion engine",
    "routine_activity": "Routine, low-anomaly activity",
}


def _fmt_time(ts: float) -> str:
    m = int(ts // 60); s = ts - m * 60
    return f"{m:02d}:{s:05.2f}"


def _safe_top(counter: Counter, k: int) -> list[tuple[str, int]]:
    return counter.most_common(k) if counter else []


class ReasoningAgent:
    """
    Agentic synthesis layer. Consumes structured outputs from every modality and
    produces an executive brief, hierarchical timeline narrative, key entities,
    cross-modal correlations and a calibrated threat assessment.

    The agent is *deterministic and rule-based* by default (no external LLM
    required). If ``HF_TOKEN`` or ``GEMINI_API_KEY`` is set the analyzer can
    optionally pass the executive_brief output through a cloud LLM, but the
    structured payload below is always produced locally for reliability and
    privacy.
    """

    THREAT_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

    def __init__(self):
        self.version = "5.0"

    # ── Public API ───────────────────────────────────────────────────────────

    def synthesize(self, payload: dict[str, Any]) -> dict[str, Any]:
        """
        ``payload`` keys (all optional, missing fields default to empty):

            duration_s, fps, width, height
            frame_results       : list[dict] (timestamp_s, person_count, dominant_action,
                                              flow_magnitude, surveillance_flags,
                                              detections)
            speech_segments     : list[dict] (start_s, end_s, text, language,
                                              language_name, confidence, is_noise)
            audio_events        : list[dict] (timestamp_s, event_type, confidence)
            logo_detections     : list[dict] (timestamp_s, brand, source, confidence)
            fusion_insights     : list[dict] (window_start_s, window_end_s, scene_label,
                                              anomaly_score, severity, alert,
                                              contributing_factors, description)
            surveillance_events : list[dict] (timestamp_s, event_type, severity,
                                              description, track_ids, confidence)
            distinct_individuals: int
            unique_track_ids    : list[int]
        """
        duration = float(payload.get("duration_s") or 0.0)
        frame_results = payload.get("frame_results") or []
        speech = payload.get("speech_segments") or []
        audio_events = payload.get("audio_events") or []
        logo_dets = payload.get("logo_detections") or []
        fusion = payload.get("fusion_insights") or []
        surveillance = payload.get("surveillance_events") or []
        distinct_individuals = int(payload.get("distinct_individuals") or 0)
        identities = payload.get("identities") or []

        action_counter: Counter = Counter()
        class_counter: Counter = Counter()
        for fr in frame_results:
            if fr.get("dominant_action"):
                action_counter[fr["dominant_action"]] += 1
            for det in fr.get("detections", []) or []:
                cls = det.get("class_name")
                if cls:
                    class_counter[cls] += 1

        # ── 1. Executive Brief ────────────────────────────────────────────
        brief = self._executive_brief(
            duration=duration,
            distinct_individuals=distinct_individuals,
            frame_results=frame_results,
            action_counter=action_counter,
            class_counter=class_counter,
            speech=speech,
            audio_events=audio_events,
            logo_dets=logo_dets,
            fusion=fusion,
            surveillance=surveillance,
        )

        # ── 2. Hierarchical timeline narrative ────────────────────────────
        timeline = self._timeline_narrative(
            duration=duration,
            frame_results=frame_results,
            speech=speech,
            audio_events=audio_events,
            fusion=fusion,
            surveillance=surveillance,
        )

        # ── 3. Key entities ───────────────────────────────────────────────
        key_entities = self._key_entities(
            class_counter=class_counter,
            logo_dets=logo_dets,
            speech=speech,
            distinct_individuals=distinct_individuals,
            identities=identities,
            frame_results=frame_results,
        )

        # ── 4. Cross-modal correlations ───────────────────────────────────
        correlations = self._cross_modal_correlations(
            audio_events=audio_events,
            surveillance=surveillance,
            fusion=fusion,
            speech=speech,
        )

        # ── 5. Threat assessment ──────────────────────────────────────────
        threat = self._threat_assessment(
            surveillance=surveillance,
            fusion=fusion,
            audio_events=audio_events,
            action_counter=action_counter,
        )

        # ── 6. Final recommendation ───────────────────────────────────────
        recommendation = self._recommendation(threat, surveillance, fusion)

        return {
            "version": self.version,
            "executive_brief": brief,
            "timeline_narrative": timeline,
            "key_entities": key_entities,
            "cross_modal_correlations": correlations,
            "threat_assessment": threat,
            "recommendation": recommendation,
        }

    # ── Section builders ─────────────────────────────────────────────────────

    def _executive_brief(self, *, duration, distinct_individuals, frame_results,
                         action_counter, class_counter, speech, audio_events,
                         logo_dets, fusion, surveillance) -> str:
        parts: list[str] = []
        parts.append(f"This {duration:.1f}-second clip contains "
                     f"{distinct_individuals} distinct individual(s) "
                     f"identified by appearance.")

        if action_counter:
            dom_act, _ = action_counter.most_common(1)[0]
            parts.append(f"The dominant observed behaviour is "
                         f"'{dom_act.replace('_', ' ')}'.")
        max_pc = max((fr.get("person_count", 0) for fr in frame_results), default=0)
        if max_pc:
            parts.append(f"Peak concurrent presence reaches {max_pc} people.")

        non_person_top = [c for c, _ in class_counter.most_common(6) if c != "person"]
        if non_person_top:
            parts.append("Other recurring objects: "
                         f"{', '.join(non_person_top[:4])}.")

        real_speech = [s for s in speech if not s.get("is_noise")]
        if real_speech:
            top_lang = Counter(s.get("language_name") for s in real_speech).most_common(1)[0][0]
            parts.append(f"Audio includes {len(real_speech)} spoken segment(s) "
                         f"primarily in {top_lang}.")
        elif audio_events:
            evt_summary = Counter(e.get("event_type") for e in audio_events).most_common(3)
            parts.append("Audio contains " +
                         ", ".join(f"{c}× {t}" for t, c in evt_summary) + ".")

        if logo_dets:
            brands = sorted({lg.get("brand") for lg in logo_dets if lg.get("brand")})
            parts.append(f"Visual brand cues detected: {', '.join(brands[:5])}.")

        if surveillance:
            critical = [e for e in surveillance
                        if (e.get("severity") or "low") in {"high", "critical"}]
            if critical:
                top = critical[0]
                parts.append(
                    f"⚠ Surveillance flag: '{top.get('event_type')}' at "
                    f"{_fmt_time(top.get('timestamp_s', 0))} "
                    f"(severity={top.get('severity')})."
                )
            else:
                parts.append(f"{len(surveillance)} low/medium-severity "
                             f"surveillance event(s) recorded.")

        if fusion:
            mx = max((fi.get("anomaly_score", 0.0) for fi in fusion), default=0.0)
            alerts = sum(1 for fi in fusion if fi.get("alert"))
            parts.append(f"Cross-modal fusion peak anomaly score = {mx:.2f} "
                         f"({alerts} alert window(s)).")
        return " ".join(parts)

    def _timeline_narrative(self, *, duration, frame_results, speech,
                             audio_events, fusion, surveillance) -> list[dict[str, Any]]:
        if duration <= 0:
            return []
        bucket_s = 60.0 if duration > 180 else (15.0 if duration > 30 else 5.0)
        buckets: dict[int, dict[str, Any]] = {}

        def bidx(ts: float) -> int:
            return int(ts // bucket_s)

        for fr in frame_results:
            b = bidx(fr.get("timestamp_s", 0))
            block = buckets.setdefault(b, _empty_bucket())
            if fr.get("dominant_action"):
                block["actions"][fr["dominant_action"]] += 1
            block["max_persons"] = max(block["max_persons"], fr.get("person_count", 0))
            for flag in fr.get("surveillance_flags", []) or []:
                block["flags"].add(flag)
        for seg in speech:
            if seg.get("is_noise"):
                continue
            b = bidx(seg.get("start_s", 0))
            block = buckets.setdefault(b, _empty_bucket())
            block["speech_count"] += 1
            block["languages"][seg.get("language_name") or "Unknown"] += 1
            txt = (seg.get("text") or "").strip()
            if txt and len(block["speech_sample"]) < 80:
                block["speech_sample"] = txt[:80]
        for ev in audio_events:
            b = bidx(ev.get("timestamp_s", 0))
            block = buckets.setdefault(b, _empty_bucket())
            block["audio_events"][ev.get("event_type") or "unknown"] += 1
        for fi in fusion:
            b = bidx(fi.get("window_start_s", 0))
            block = buckets.setdefault(b, _empty_bucket())
            block["anomaly_max"] = max(block["anomaly_max"],
                                       fi.get("anomaly_score", 0.0))
            if fi.get("alert"):
                block["alerts"] += 1
        for sv in surveillance:
            b = bidx(sv.get("timestamp_s", 0))
            block = buckets.setdefault(b, _empty_bucket())
            block["surv_events"].append({
                "event_type": sv.get("event_type"),
                "severity": sv.get("severity"),
                "ts": sv.get("timestamp_s"),
            })

        narrative: list[dict[str, Any]] = []
        for b in sorted(buckets):
            block = buckets[b]
            start = b * bucket_s
            end = min((b + 1) * bucket_s, duration)
            dominant_action = max(block["actions"].items(),
                                  key=lambda kv: kv[1])[0] if block["actions"] else None
            top_audio = max(block["audio_events"].items(),
                            key=lambda kv: kv[1])[0] if block["audio_events"] else None
            top_lang = max(block["languages"].items(),
                            key=lambda kv: kv[1])[0] if block["languages"] else None
            text = self._compose_block_narrative(block, dominant_action, top_audio,
                                                  top_lang, start, end)
            narrative.append({
                "window_start_s": float(start),
                "window_end_s": float(end),
                "max_persons": int(block["max_persons"]),
                "dominant_action": dominant_action,
                "speech_count": int(block["speech_count"]),
                "top_language": top_lang,
                "speech_sample": block["speech_sample"],
                "top_audio_event": top_audio,
                "anomaly_max": float(block["anomaly_max"]),
                "alerts": int(block["alerts"]),
                "surveillance_events": block["surv_events"],
                "flags": sorted(block["flags"]),
                "narrative": text,
            })
        return narrative

    @staticmethod
    def _compose_block_narrative(block, dominant_action, top_audio, top_lang,
                                  start, end) -> str:
        bits: list[str] = [f"{_fmt_time(start)} – {_fmt_time(end)}:"]
        if block["max_persons"]:
            bits.append(f"up to {block['max_persons']} person(s) in frame")
        if dominant_action:
            bits.append(f"dominant motion '{dominant_action.replace('_', ' ')}'")
        if block["speech_count"]:
            bits.append(f"{block['speech_count']} spoken segment(s)")
            if top_lang:
                bits.append(f"in {top_lang}")
        if top_audio and top_audio not in ("silence", "ambient"):
            bits.append(f"audio cue '{top_audio}'")
        if block["alerts"]:
            bits.append(f"{block['alerts']} fusion alert(s)")
        if block["surv_events"]:
            sv_str = ", ".join(
                f"{sv['event_type']}({sv['severity']})"
                for sv in block["surv_events"][:3]
            )
            bits.append(f"surveillance: {sv_str}")
        if len(bits) == 1:
            bits.append("no notable activity")
        return "; ".join(bits) + "."

    def _key_entities(self, *, class_counter, logo_dets, speech,
                      distinct_individuals, identities, frame_results) -> dict[str, Any]:
        objects = [
            {"class_name": c, "frequency": n}
            for c, n in class_counter.most_common(12) if c != "person"
        ]
        brands_counter: Counter = Counter()
        sources_per_brand: dict[str, set[str]] = defaultdict(set)
        for lg in logo_dets:
            b = lg.get("brand")
            if not b:
                continue
            brands_counter[b] += 1
            if lg.get("source"):
                sources_per_brand[b].add(lg["source"])
        brands = [
            {"brand": b, "frequency": n,
             "sources": sorted(sources_per_brand[b])}
            for b, n in brands_counter.most_common(10)
        ]
        languages = Counter(s.get("language_name") for s in speech if not s.get("is_noise"))
        people_summary: list[dict[str, Any]] = []
        if identities:
            for ident in identities[:20]:
                people_summary.append(ident)
        else:
            # Fall back to first/last seen from track ids
            seen: dict[int, dict[str, Any]] = {}
            for fr in frame_results:
                ts = fr.get("timestamp_s", 0)
                for tid in fr.get("unique_track_ids", []) or []:
                    rec = seen.setdefault(tid, {
                        "pid": int(tid), "track_ids": [int(tid)],
                        "first_seen_s": float(ts),
                        "last_seen_s": float(ts),
                        "samples": 0,
                    })
                    rec["last_seen_s"] = float(ts)
                    rec["samples"] += 1
            people_summary = list(seen.values())[:20]
        return {
            "people_count": distinct_individuals,
            "people": people_summary,
            "objects": objects,
            "brands": brands,
            "languages": [
                {"name": k or "Unknown", "segments": v}
                for k, v in languages.most_common()
            ],
        }

    def _cross_modal_correlations(self, *, audio_events, surveillance, fusion,
                                   speech) -> list[dict[str, Any]]:
        correlations: list[dict[str, Any]] = []
        loud_events = [e for e in audio_events
                       if e.get("event_type") in {"scream", "gunshot"}]
        critical_sv = [s for s in surveillance
                       if (s.get("severity") or "low") in {"high", "critical"}]

        for ae in loud_events:
            for sv in surveillance:
                if abs(sv.get("timestamp_s", -1e9) - ae.get("timestamp_s", 1e9)) < 3.0:
                    correlations.append({
                        "kind": "audio_supports_surveillance",
                        "audio_event": ae.get("event_type"),
                        "surveillance_event": sv.get("event_type"),
                        "audio_ts": ae.get("timestamp_s"),
                        "surveillance_ts": sv.get("timestamp_s"),
                        "confidence": float(
                            min(1.0, 0.5 * float(ae.get("confidence", 0)) +
                                       0.5 * float(sv.get("confidence", 0)))),
                        "description": (
                            f"{ae.get('event_type')} audio event reinforces "
                            f"{sv.get('event_type')} visual event "
                            f"(Δt={abs(sv.get('timestamp_s', 0) - ae.get('timestamp_s', 0)):.1f}s)"
                        ),
                    })
        for sv in critical_sv:
            for fi in fusion:
                if fi.get("window_start_s", 1e9) <= sv.get("timestamp_s", -1) <= fi.get("window_end_s", -1e9):
                    correlations.append({
                        "kind": "fusion_supports_surveillance",
                        "scene_label": fi.get("scene_label"),
                        "surveillance_event": sv.get("event_type"),
                        "anomaly_score": float(fi.get("anomaly_score", 0)),
                        "surveillance_ts": sv.get("timestamp_s"),
                        "confidence": float(min(1.0,
                            0.5 * float(fi.get("anomaly_score", 0)) +
                            0.5 * float(sv.get("confidence", 0)))),
                        "description": (
                            f"Fusion window labelled "
                            f"'{fi.get('scene_label')}' with anomaly "
                            f"{fi.get('anomaly_score', 0):.2f} aligns with "
                            f"{sv.get('event_type')} at "
                            f"{_fmt_time(sv.get('timestamp_s', 0))}"
                        ),
                    })
        # Speech-supported events (e.g. distress keywords)
        distress_pattern = re.compile(
            r"\b(help|stop|fire|police|gun|shoot|knife|emergency|"
            r"call|attack|robbery|don'?t|please)\b", re.IGNORECASE)
        for sv in critical_sv:
            for seg in speech:
                if seg.get("is_noise"):
                    continue
                if abs((seg.get("start_s") or 0) - sv.get("timestamp_s", 1e9)) > 5.0:
                    continue
                if distress_pattern.search(seg.get("text", "") or ""):
                    correlations.append({
                        "kind": "speech_supports_surveillance",
                        "speech_snippet": seg.get("text"),
                        "surveillance_event": sv.get("event_type"),
                        "speech_ts": seg.get("start_s"),
                        "surveillance_ts": sv.get("timestamp_s"),
                        "confidence": 0.85,
                        "description": (
                            f"Distress speech '{seg.get('text', '')[:60]}' "
                            f"co-occurs with {sv.get('event_type')} "
                            f"at {_fmt_time(sv.get('timestamp_s', 0))}"
                        ),
                    })
        # De-duplicate
        seen = set()
        unique: list[dict[str, Any]] = []
        for c in correlations:
            key = (c["kind"], c.get("audio_event") or c.get("scene_label") or c.get("speech_snippet"),
                   round(float(c.get("surveillance_ts") or 0), 1))
            if key in seen:
                continue
            seen.add(key)
            unique.append(c)
        return unique[:50]

    def _threat_assessment(self, *, surveillance, fusion, audio_events,
                             action_counter) -> dict[str, Any]:
        severity_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        sv_score = max((severity_rank.get((s.get("severity") or "low").lower(), 1)
                        for s in surveillance), default=0)
        fusion_score = max((float(fi.get("anomaly_score", 0)) for fi in fusion),
                            default=0.0)
        loud_audio = sum(1 for e in audio_events
                         if e.get("event_type") in {"scream", "gunshot"})
        violent_actions = sum(action_counter.get(a, 0)
                              for a in ("fighting", "fallen", "running"))
        # Combined heuristic in [0, 1]
        score = (
            0.45 * (sv_score / 4.0) +
            0.40 * min(1.0, fusion_score) +
            0.10 * min(1.0, loud_audio / 3.0) +
            0.05 * min(1.0, violent_actions / 20.0)
        )
        if score >= 0.80 or sv_score >= 4:
            level = "CRITICAL"
        elif score >= 0.55 or sv_score >= 3:
            level = "HIGH"
        elif score >= 0.30 or sv_score >= 2:
            level = "MEDIUM"
        else:
            level = "LOW"
        contributing: list[str] = []
        if sv_score >= 3:
            contributing.append("High-severity surveillance event(s) detected")
        if fusion_score >= 0.5:
            contributing.append(f"Fusion anomaly score {fusion_score:.2f}")
        if loud_audio:
            contributing.append(f"{loud_audio} loud acoustic event(s)")
        if violent_actions >= 3:
            contributing.append(f"{violent_actions} aggressive pose frame(s)")
        if not contributing:
            contributing.append("No significant risk signals")
        return {
            "level": level,
            "score": float(round(score, 3)),
            "max_surveillance_severity": next(
                (s for s, v in severity_rank.items() if v == sv_score), "none"),
            "max_fusion_anomaly": float(round(fusion_score, 3)),
            "loud_audio_events": int(loud_audio),
            "violent_action_frames": int(violent_actions),
            "contributing_factors": contributing,
        }

    @staticmethod
    def _recommendation(threat, surveillance, fusion) -> str:
        level = threat["level"]
        if level == "CRITICAL":
            return (
                "Immediate review required. Critical-severity event(s) detected. "
                "Notify on-duty operator and preserve original video evidence."
            )
        if level == "HIGH":
            return (
                "Prioritise this clip for human review within the next operator shift. "
                "Cross-check against any incident report from the same time window."
            )
        if level == "MEDIUM":
            return (
                "Tag for routine review. Cross-modal evidence shows mild anomaly "
                "but no critical indicator was triggered."
            )
        return (
            "No action required. Activity appears routine; archive per retention policy."
        )


def _empty_bucket() -> dict[str, Any]:
    return {
        "actions": Counter(),
        "max_persons": 0,
        "speech_count": 0,
        "languages": Counter(),
        "speech_sample": "",
        "audio_events": Counter(),
        "anomaly_max": 0.0,
        "alerts": 0,
        "surv_events": [],
        "flags": set(),
    }


# ═════════════════════════════════════════════════════════════════════════════
# 5) Cadence-based action refinement (walk vs jog vs run from ankle motion FFT)
# ═════════════════════════════════════════════════════════════════════════════

class AnkleCadenceClassifier:
    """
    Maintains a per-track buffer of ankle vertical positions and infers a
    *cadence* (step frequency in Hz) via short-time FFT.

      - 0.5–1.3 Hz  → walking
      - 1.3–2.0 Hz  → jogging
      - >2.0 Hz     → running

    Returns ``None`` if not enough samples are present yet. Designed to be used
    as a tiebreaker on top of velocity-based action classification.
    """

    def __init__(self, *, history: int = 24):
        self._buffers: dict[int, deque[tuple[float, float]]] = defaultdict(
            lambda: deque(maxlen=history))

    def push(self, tid: int, ts: float, ankle_y: float) -> None:
        self._buffers[tid].append((ts, ankle_y))

    def cadence_hz(self, tid: int) -> float | None:
        buf = self._buffers.get(tid)
        if buf is None or len(buf) < 8:
            return None
        times = np.array([b[0] for b in buf], dtype=np.float32)
        ys = np.array([b[1] for b in buf], dtype=np.float32)
        dt = float(times[-1] - times[0])
        if dt < 0.5:
            return None
        n = len(ys)
        ys = ys - ys.mean()
        if not np.any(ys):
            return None
        fft = np.fft.rfft(ys * np.hanning(n))
        freqs = np.fft.rfftfreq(n, d=dt / max(1, n - 1))
        mag = np.abs(fft)
        if mag.shape[0] < 2:
            return None
        peak_idx = int(np.argmax(mag[1:])) + 1
        return float(freqs[peak_idx])

    def classify(self, tid: int) -> str | None:
        hz = self.cadence_hz(tid)
        if hz is None:
            return None
        if hz > 2.0:
            return "running"
        if hz > 1.3:
            return "jogging"
        if hz > 0.5:
            return "walking"
        return None


__all__ = [
    "transcribe_audio_enhanced",
    "faster_whisper_available",
    "silero_vad_available",
    "IdentityTracker",
    "ClipLogoMatcher",
    "DEFAULT_LOGO_BRANDS",
    "ReasoningAgent",
    "AnkleCadenceClassifier",
]
