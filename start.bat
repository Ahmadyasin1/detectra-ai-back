@echo off
REM ═══════════════════════════════════════════════════════
REM  Detectra AI — Start Everything
REM  Run this from the detectra-ai folder:
REM    cd detectra-ai
REM    start.bat
REM ═══════════════════════════════════════════════════════

echo.
echo  Starting Detectra AI...
echo.

REM Kill any previous backend on port 8000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Start backend in a new window
echo  [1/2] Starting backend API (port 8000)...
start "Detectra Backend" cmd /k "cd /d %~dp0 && python api_server.py"

REM Wait 3 seconds for backend to bind
timeout /t 3 /nobreak >nul

REM Start frontend dev server in a new window
echo  [2/2] Starting frontend dev server (port 5173)...
start "Detectra Frontend" cmd /k "cd /d %~dp0detectra-ai-main && npm run dev"

echo.
echo  Both servers starting in new windows.
echo  Open: http://localhost:5173
echo.
pause
