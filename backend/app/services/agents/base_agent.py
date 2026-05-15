"""
Base Agent — Abstract contract for all Detectra AI pipeline agents.

Each agent:
  - Receives an EventBus (shared dict updated in-place) as context
  - Exposes a run() method returning typed output
  - Reports progress via the progress_callback
  - Fails gracefully, never crashing the pipeline
"""
from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class AgentResult:
    agent_name: str
    success: bool
    output: Any
    elapsed_s: float
    error: str | None = None


@dataclass
class EventBus:
    """
    Shared, mutable state container passed across agents.
    Agents READ other agents' outputs and WRITE their own.
    """
    video_path: str = ""
    config: dict = field(default_factory=dict)

    # Preprocessing outputs
    frames: list = field(default_factory=list)
    audio_path: str | None = None
    metadata: Any = None

    # Perception outputs (raw results from each module)
    object_results: list[dict] = field(default_factory=list)
    logo_results: list[dict] = field(default_factory=list)
    motion_results: list[dict] = field(default_factory=list)
    speech_results: list[dict] = field(default_factory=list)
    audio_results: list[dict] = field(default_factory=list)

    # Fusion + reasoning outputs
    fused_results: list[dict] = field(default_factory=list)
    scene_contexts: list[dict] = field(default_factory=list)
    anomaly_events: list[dict] = field(default_factory=list)
    object_counts: dict[str, int] = field(default_factory=dict)
    tracking_summary: dict = field(default_factory=dict)

    # Status
    errors: list[str] = field(default_factory=list)


ProgressCallback = Callable[[float, str], None]


class BaseAgent(ABC):
    """Abstract base for all pipeline agents."""

    name: str = "BaseAgent"

    def __init__(self, bus: EventBus, progress_cb: ProgressCallback | None = None):
        self.bus = bus
        self._progress_cb = progress_cb
        self.log = structlog.get_logger(self.name)

    def report_progress(self, pct: float, stage: str):
        if self._progress_cb:
            try:
                self._progress_cb(pct, stage)
            except Exception:
                pass

    def execute(self) -> AgentResult:
        """Wrapper: time the run, catch errors, return AgentResult."""
        t0 = time.perf_counter()
        try:
            output = self.run()
            elapsed = time.perf_counter() - t0
            self.log.info("Agent completed", elapsed_s=round(elapsed, 2))
            return AgentResult(
                agent_name=self.name, success=True, output=output, elapsed_s=elapsed
            )
        except Exception as exc:
            elapsed = time.perf_counter() - t0
            self.log.error("Agent failed", error=str(exc))
            self.bus.errors.append(f"{self.name}: {exc}")
            return AgentResult(
                agent_name=self.name, success=False, output=None,
                elapsed_s=elapsed, error=str(exc)
            )

    @abstractmethod
    def run(self) -> Any:
        ...
