#!/bin/sh
set -e
mkdir -p "${UPLOAD_DIR:-/app/uploads}" /app/analysis_output

# Optional: pre-download YOLO weights on first start (set WARMUP_MODELS=1)
if [ "${WARMUP_MODELS:-0}" = "1" ]; then
  python - <<'PY' || true
from ultralytics import YOLO
for name in ("yolov8s-seg.pt", "yolov8n-pose.pt"):
    try:
        YOLO(name)
        print(f"[entrypoint] warmed {name}")
    except Exception as e:
        print(f"[entrypoint] warmup skip {name}: {e}")
PY
fi

exec "$@"
