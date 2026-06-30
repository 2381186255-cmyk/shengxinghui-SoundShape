@echo off
chcp 65001 >nul
setlocal enableextensions
title SoundShape Launcher
cd /d "%~dp0"

REM ===== 检测 Node.js =====
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node.js 18+: https://nodejs.org/
    pause
    exit /b 1
)

REM ===== 前端依赖检查 =====
if not exist "soundshape-mr\node_modules" (
    echo [SETUP] Installing frontend dependencies...
    cd /d "%~dp0soundshape-mr"
    call npm install
    if errorlevel 1 ( echo [ERROR] Frontend install failed. & pause & exit /b 1 )
    cd /d "%~dp0"
)

REM ===== 启动前端（新窗口） =====
echo [START] Frontend (Vite :5173)
start "SoundShape Frontend" cmd /k "chcp 65001 >nul && cd /d %~dp0soundshape-mr && npm run dev"

REM ===== 后端依赖检查 + 启动 =====
if exist "backend\.env" (
    if not exist "backend\node_modules" (
        echo [SETUP] Installing backend dependencies...
        cd /d "%~dp0backend"
        call npm install
        if errorlevel 1 ( echo [ERROR] Backend install failed. & pause & exit /b 1 )
        cd /d "%~dp0"
    )
    echo [START] Backend (Express :8787)
    start "SoundShape Backend" cmd /k "chcp 65001 >nul && cd /d %~dp0backend && npm run dev"
) else (
    echo [SKIP] Backend not started: backend\.env missing.
    echo        Copy backend\.env.example to backend\.env and fill DATABASE_URL + JWT_SECRET.
)

REM ===== 打开浏览器 =====
timeout /t 3 /nobreak >nul
echo [OPEN] Browser opening http://localhost:5173/
start "" http://localhost:5173/

echo.
echo ============================================================
echo  SoundShape started.
echo  Frontend: http://localhost:5173/  (close its window to stop)
echo  Backend:  http://localhost:8787/  (close its window to stop)
echo ============================================================
echo.
echo This launcher window can be closed safely.
timeout /t 5 /nobreak >nul
exit /b 0
