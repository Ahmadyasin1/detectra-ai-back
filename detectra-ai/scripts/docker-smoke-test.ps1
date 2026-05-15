# Smoke-test Detectra Docker stack (run from detectra-ai/)
param(
    [int]$ApiPort = 8002,
    [int]$FrontendPort = 3001
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$env:API_PORT = "$ApiPort"
$env:FRONTEND_PORT = "$FrontendPort"

Write-Host "Building and starting API + frontend (ports $ApiPort / $FrontendPort)..."
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$deadline = (Get-Date).AddMinutes(3)
$apiOk = $false
$r = $null
while ((Get-Date) -lt $deadline) {
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:${ApiPort}/health" -TimeoutSec 5
        if ($r.status -eq "online") { $apiOk = $true; break }
    } catch {
        Start-Sleep -Seconds 3
    }
}

if (-not $apiOk) {
    Write-Error "API health failed. Logs: docker compose logs api"
}

$ping = Invoke-WebRequest -Uri "http://localhost:${FrontendPort}/ping" -UseBasicParsing -TimeoutSec 5
if ($ping.StatusCode -ne 200) { Write-Error "Frontend /ping failed" }

$healthViaFe = Invoke-RestMethod -Uri "http://localhost:${FrontendPort}/health" -TimeoutSec 5
Write-Host "OK API:      http://localhost:${ApiPort}/health -> $($r.status)"
Write-Host "OK Frontend: http://localhost:${FrontendPort} (proxy health: $($healthViaFe.status))"
Write-Host "Open Dashboard -> Analyzer to confirm API ONLINE."
