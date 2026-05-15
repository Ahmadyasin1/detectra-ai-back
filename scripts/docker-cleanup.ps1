# Remove stale Detectra containers/images from old manual builds (e.g. docker run -t detectra-ai)
$ErrorActionPreference = "SilentlyContinue"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Cleaning orphan Detectra containers..." -ForegroundColor Cyan

# Old standalone image name from legacy README (not the compose stack)
$legacyNames = @("detectra-ai", "detecra-ai")
foreach ($name in $legacyNames) {
    docker rm -f $name 2>$null | Out-Null
    $ids = docker ps -aq -f "name=$name" 2>$null
    if ($ids) { docker rm -f $ids 2>$null | Out-Null }
}

Write-Host "Done. Compose stack uses project name 'detectra' (detectra_api + detectra_frontend)." -ForegroundColor Green
