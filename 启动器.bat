@echo off
chcp 65001 >nul
setlocal enableextensions enabledelayedexpansion
title 声形绘 SoundShape 启动器
cd /d "%~dp0"

REM ===== 检测 Node.js =====
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo [错误] 未检测到 Node.js
    echo        请安装 Node.js 18+ ：https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:MENU
cls
echo.
echo ============================================================
echo            声形绘 SoundShape - 快捷启动器
echo ============================================================
echo.
echo   [1] 启动前端（推荐，端口 5173）
echo       React + Vite 开发服务器，自动开浏览器
echo.
echo   [2] 启动完整模式（前端 5173 + 后端 8787）
echo       后端需先在 backend\.env 配置 DATABASE_URL 和 JWT_SECRET
echo.
echo   [3] 运行端到端测试（Playwright，需先启动前端）
echo.
echo   [4] 停止所有服务（关闭 5173 / 8787 端口）
echo.
echo   [5] 安装依赖（前端 + 后端 npm install）
echo.
echo   [0] 退出
echo.
set /p choice=请输入选项数字后按回车：

if "%choice%"=="1" goto START_FRONTEND
if "%choice%"=="2" goto START_FULL
if "%choice%"=="3" goto RUN_TESTS
if "%choice%"=="4" goto STOP_ALL
if "%choice%"=="5" goto INSTALL_DEPS
if "%choice%"=="0" exit /b 0
goto MENU

:START_FRONTEND
cls
echo.
echo [启动中] 前端服务（端口 5173）...
echo.
if not exist "soundshape-mr\node_modules" (
    echo [提示] 首次运行，正在安装前端依赖...
    cd /d "%~dp0soundshape-mr"
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        goto MENU
    )
    cd /d "%~dp0"
)
echo.
echo 浏览器将自动打开首页。如未打开请访问：http://localhost:5173/
echo 按 Ctrl + C 停止服务。
echo.
cd /d "%~dp0soundshape-mr"
call npm run dev
echo.
echo [前端已停止]
pause
goto MENU

:START_FULL
cls
echo.
if not exist "backend\.env" (
    echo [警告] 未找到 backend\.env，后端无法启动
    echo        请先复制 backend\.env.example 为 backend\.env 并填写：
    echo          - DATABASE_URL  （PostgreSQL 连接串）
    echo          - JWT_SECRET    （至少 32 位随机字符串）
    echo.
    set /p cont=是否仍要启动仅前端模式？(Y/N)：
    if /i "!cont!"=="Y" goto START_FRONTEND
    goto MENU
)
echo [1/2] 启动后端（端口 8787）...
if not exist "backend\node_modules" (
    echo [提示] 安装后端依赖...
    cd /d "%~dp0backend"
    call npm install
    cd /d "%~dp0"
)
start "SoundShape 后端" cmd /k "chcp 65001 >nul && cd /d %~dp0backend && npm run dev"
echo       后端窗口已弹出
echo.
echo [2/2] 启动前端（端口 5173），3 秒后打开浏览器...
timeout /t 3 /nobreak >nul
if not exist "soundshape-mr\node_modules" (
    cd /d "%~dp0soundshape-mr"
    call npm install
    cd /d "%~dp0"
)
cd /d "%~dp0soundshape-mr"
call npm run dev
echo.
echo [前端已停止，请手动关闭后端窗口]
pause
goto MENU

:RUN_TESTS
cls
echo.
echo [运行中] Playwright 端到端测试
echo        请确保前端已启动（选 [1]）且运行在 localhost:5173
echo.
where playwright >nul 2>nul
if errorlevel 1 (
    echo [提示] 未检测到 Playwright，正在安装...
    pip install playwright
    playwright install chromium
)
cd /d "%~dp0soundshape-mr"
python tests\e2e_test.py
echo.
pause
goto MENU

:STOP_ALL
cls
echo.
echo [停止中] 关闭 5173 和 8787 端口进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul && echo 已关闭 PID %%a (端口 5173)
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8787 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul && echo 已关闭 PID %%a (端口 8787)
)
echo.
echo [完成]
timeout /t 2 /nobreak >nul
goto MENU

:INSTALL_DEPS
cls
echo.
echo [安装中] 前端 + 后端依赖...
echo.
echo === 前端依赖 ===
cd /d "%~dp0soundshape-mr"
call npm install
echo.
echo === 后端依赖 ===
cd /d "%~dp0backend"
call npm install
echo.
echo [完成] 依赖已安装
pause
goto MENU
