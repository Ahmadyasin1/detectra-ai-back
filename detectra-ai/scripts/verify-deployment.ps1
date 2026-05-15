# Pre-deploy checks (no Docker required for build steps)
$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot ".."
Set-Location $root

Write-Host "=== Detectra deployment verification ===" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Host "[WARN] .env missing - copy from .env.example"
} else {
    Write-Host "[OK]   .env exists"
}

$fe = Join-Path $root "detectra-ai-main"
Set-Location $fe
Write-Host "Building frontend..."
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host "[OK]   Frontend build" -ForegroundColor Green

Set-Location $root
if (Test-Path "requirements.api.txt") {
    Write-Host "[OK]   requirements.api.txt present"
}

Write-Host ""
Write-Host "Docker (optional - start Docker Desktop first):"
Write-Host "  cd $root"
Write-Host "  .\deploy.ps1 -Dev"
Write-Host ""

$prevEap = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
docker info 2>&1 | Out-Null
$dockerOk = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEap

if ($dockerOk) {
    Write-Host "[OK]   Docker engine is healthy" -ForegroundColor Green
    docker compose config -q 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK]   docker-compose.yml validates" -ForegroundColor Green
    }
} else {
    Write-Host "[SKIP] Docker not ready - restart Docker Desktop, then run deploy.ps1 -Dev" -ForegroundColor Yellow
}
