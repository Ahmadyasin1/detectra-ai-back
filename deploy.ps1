# Detectra AI - Docker production deploy (Windows PowerShell 5.1+)
# Usage: .\deploy.ps1           # production gateway on :80
#        .\deploy.ps1 -Dev      # API + UI (default :8000 / :3000)

param(
    [switch]$Dev,
    [switch]$Gpu
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$prevEap = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
$dockerCheck = docker info 2>&1
$dockerOk = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEap
if (-not $dockerOk) {
    Write-Host $dockerCheck
    Write-Error @"
Docker engine is not healthy.
  1. Quit and restart Docker Desktop (wait until Running).
  2. Ensure WSL2 is enabled and you have 10+ GB free disk.
  3. Run: docker version
  4. Then: .\deploy.ps1 -Dev
"@
}

if (-not (Test-Path ".env")) {
    Write-Host "Creating .env from .env.example - edit secrets before public deploy."
    Copy-Item ".env.example" ".env"
}

if ((Get-Content ".env" -Raw) -match "CHANGE_ME_IN_PRODUCTION") {
    $secret = python -c "import secrets; print(secrets.token_hex(32))"
    if ($secret) {
        (Get-Content ".env") -replace "SECRET_KEY=.*", "SECRET_KEY=$secret" | Set-Content ".env"
        Write-Host "Generated SECRET_KEY in .env"
    }
}

# Remove legacy standalone containers (old `docker run -t detectra-ai` builds)
& powershell -NoProfile -File (Join-Path $PSScriptRoot "scripts\docker-cleanup.ps1") 2>$null

$composeArgs = @("compose")
if ($Gpu) {
    $composeArgs += "-f", "docker-compose.yml", "-f", "docker-compose.gpu.yml"
}

# Avoid clashing with local api_server.py / Vite dev servers
if (-not $env:API_PORT) {
    $p8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    if ($p8000) {
        $env:API_PORT = "8002"
        Write-Host "Port 8000 busy - using API_PORT=8002"
    }
}
if (-not $env:FRONTEND_PORT) {
    $p3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($p3000) {
        $env:FRONTEND_PORT = "3001"
        Write-Host "Port 3000 busy - using FRONTEND_PORT=3001"
    }
}

$prevEap = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"

if ($Dev) {
    & docker @composeArgs down --remove-orphans 2>$null
    Write-Host "Starting dev stack (API + frontend)..."
    & docker @composeArgs up -d --build api frontend
    $upOk = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $prevEap
    if (-not $upOk) { exit 1 }
    if ($env:FRONTEND_PORT) { $fe = $env:FRONTEND_PORT } else { $fe = "3000" }
    $appUrl = "http://localhost:$fe"
} else {
    & docker @composeArgs --profile production down --remove-orphans 2>$null
    Write-Host "Starting production stack (nginx gateway + API + frontend)..."
    & docker @composeArgs --profile production up -d --build api frontend nginx
    $upOk = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $prevEap
    if (-not $upOk) { exit 1 }
    if ($env:HTTP_PORT) { $httpPort = $env:HTTP_PORT } else { $httpPort = "80" }
    $appUrl = "http://localhost:$httpPort"
}

if ($env:API_PORT) { $apiPort = $env:API_PORT } else { $apiPort = "8000" }
if ($env:FRONTEND_PORT) { $fePort = $env:FRONTEND_PORT } else { $fePort = "3000" }

Write-Host "Waiting for API health..."
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
    try {
        Invoke-WebRequest -Uri "http://localhost:${apiPort}/health" -UseBasicParsing -TimeoutSec 5 | Out-Null
        $ok = $true
        break
    } catch {
        Start-Sleep -Seconds 3
    }
}

if (-not $ok) {
    Write-Warning "API health check timed out. Run: docker compose logs api"
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Detectra AI - Deployment Ready" -ForegroundColor Cyan
Write-Host "  Frontend: detectra-ai/detectra-ai-main" -ForegroundColor Cyan
Write-Host "  Stack:    Docker Compose project 'detectra'" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  App:      $appUrl"
Write-Host "  API:      http://localhost:${apiPort}"
Write-Host "  Health:   http://localhost:${apiPort}/health"
if ($Dev) {
    Write-Host "  Proxy:    http://localhost:${fePort}/health"
}
Write-Host ""
Write-Host "  Docker Desktop: look for group 'detectra' (detectra_api + detectra_frontend)"
Write-Host "  Logs:  docker compose logs -f api frontend"
Write-Host "  Stop:  docker compose down"
