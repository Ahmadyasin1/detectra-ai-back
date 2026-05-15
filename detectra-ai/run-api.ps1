#
# Detectra AI — API server launcher
# ---------------------------------------------------------------
# Always prefer the project virtualenv (backend/venv) because it contains the
# v5 Ultra Accuracy dependencies (faster-whisper, open_clip_torch, ctranslate2,
# noisereduce, etc.) that the system Python install usually lacks.
#
# Usage:
#   .\run-api.ps1
#
# Environment overrides:
#   $env:DETECTRA_PY = "C:\path\to\python.exe"   # force a specific interpreter
#

Set-Location $PSScriptRoot

$venvPython = Join-Path $PSScriptRoot "backend\venv\Scripts\python.exe"

if ($env:DETECTRA_PY -and (Test-Path $env:DETECTRA_PY)) {
    $py = $env:DETECTRA_PY
} elseif (Test-Path $venvPython) {
    $py = $venvPython
} else {
    $py = "python"
}

Write-Host "[detectra] Using Python: $py" -ForegroundColor Cyan

# Quick capability probe so we fail fast with a helpful message instead of
# silently falling back to a less accurate engine inside the analyzer.
$probe = & $py -c "import importlib.util as u, sys; req = ['faster_whisper','open_clip','torch','cv2','librosa','easyocr']; missing = [m for m in req if not u.find_spec(m)]; print('OK' if not missing else 'MISSING:' + ','.join(missing))"
if ($probe -like "MISSING:*") {
    Write-Host "[detectra] WARNING — Python is missing v5 accuracy deps: $probe" -ForegroundColor Yellow
    Write-Host "[detectra] The pipeline will still run, but with reduced accuracy." -ForegroundColor Yellow
    Write-Host "[detectra] Fix: run: $py -m pip install -r requirements.api.txt" -ForegroundColor Yellow
} else {
    Write-Host "[detectra] All accuracy deps present ✓" -ForegroundColor Green
}

& $py api_server.py
