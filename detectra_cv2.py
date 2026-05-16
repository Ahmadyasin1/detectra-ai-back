"""
Headless-safe OpenCV import for Heroku / Linux servers without libGL.
Import cv2 from this module instead of `import cv2` directly.
"""
from __future__ import annotations

import os
import sys


def _configure_headless_env() -> None:
    if os.getenv("DYNO") or os.getenv("DETECTRA_HEADLESS", "").strip().lower() in ("1", "true", "yes"):
        os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
        os.environ.setdefault("MPLBACKEND", "Agg")


def _is_headless_deploy() -> bool:
    return bool(os.getenv("DYNO")) or os.getenv("DETECTRA_HEADLESS", "").strip().lower() in (
        "1", "true", "yes",
    )


def _assert_headless_package() -> None:
    if not _is_headless_deploy():
        return
    try:
        import importlib.metadata as im
    except ImportError:
        return
    names = {d.metadata["Name"].lower() for d in im.distributions()}
    if "opencv-python" in names:
        raise RuntimeError(
            "opencv-python (GUI) is installed; Heroku will fail with libGL.so.1. "
            "Redeploy with bin/post_compile and run: heroku builds:cache:purge"
        )


def import_cv2():
    """Import OpenCV once, with a clear error if the GUI wheel is active."""
    _configure_headless_env()
    _assert_headless_package()
    try:
        import cv2 as _cv2
    except OSError as exc:
        if _is_headless_deploy() and ("libGL" in str(exc) or "libgobject" in str(exc)):
            raise RuntimeError(
                "OpenCV failed to load (libGL). Use opencv-python-headless only. "
                "Commit bin/post_compile, set Apt+Python buildpacks, purge cache, redeploy."
            ) from exc
        raise
    import numpy as np
    _cv2.cvtColor(np.zeros((4, 4, 3), dtype=np.uint8), _cv2.COLOR_BGR2GRAY)
    return _cv2


_configure_headless_env()
cv2 = import_cv2()
