@echo off
chcp 65001 >nul
setlocal enableextensions
title 声形绘 SoundShape 启动器
cd /d "%~dp0"

REM ===== 检测 Python 是否安装 =====
where python >nul 2>nul
if errorlevel 1 (
    echo.
    echo [错误] 未检测到 Python，请先安装 Python 3.10+
    echo        下载地址: https://www.python.org/downloads/
    echo        安装时务必勾选 "Add Python to PATH"
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
echo   [1] 启动前端服务（推荐，无需配置，双击即用）
echo       ^| 纯前端模式，所有数据保存在浏览器本地
echo       ^| 适合：体验产品、画图识别、演奏、调音、个人中心
echo.
echo   [2] 启动完整模式（前端 + 后端，需要 PostgreSQL 数据库）
echo       ^| 后端需先在 backend\.env 配置 DATABASE_URL 和 JWT_SECRET
echo       ^| 适合：测试账号登录、记录云端保存
echo.
echo   [3] 运行自动化测试（按文档 Task 33 验收清单）
echo       ^| 检查所有页面可访问、表单字段、关键 JS 函数
echo       ^| 自动生成测试报告到 launcher\test-report.txt
echo.
echo   [4] 停止所有本地服务（关闭 8000 / 8787 端口进程）
echo.
echo   [5] 查看使用说明
echo.
echo   [0] 退出
echo.
set /p choice=请输入选项数字后按回车：

if "%choice%"=="1" goto START_FRONTEND
if "%choice%"=="2" goto START_FULL
if "%choice%"=="3" goto RUN_TESTS
if "%choice%"=="4" goto STOP_ALL
if "%choice%"=="5" goto SHOW_HELP
if "%choice%"=="0" exit /b 0
goto MENU

:START_FRONTEND
cls
echo.
echo [启动中] 前端服务（端口 8000）...
echo 浏览器将自动打开首页。如未打开，请手动访问：
echo   http://127.0.0.1:8000/pages/home.html
echo.
echo 按 Ctrl + C 可停止服务（停止后回到菜单）。
echo.
python launcher\server.py --port 8000
echo.
echo [前端服务已停止]
pause
goto MENU

:START_FULL
cls
echo.
echo [启动中] 完整模式：前端 :8000 + 后端 :8787
echo.
if not exist "backend\.env" (
    echo [警告] 未找到 backend\.env 文件，后端无法启动！
    echo        请先复制 backend\.env.example 为 backend\.env 并填写：
    echo          - DATABASE_URL  （PostgreSQL 连接串）
    echo          - JWT_SECRET    （至少 32 位随机字符串）
    echo.
    goto ASK_FRONTEND_FALLBACK
)
echo [1/2] 启动后端（端口 8787）...
REM 新窗口也要 chcp 65001，否则后端中文输出会乱码
start "SoundShape 后端" cmd /k "chcp 65001 >nul && cd /d %~dp0backend && npm run dev"
echo       后端窗口已弹出，请等待 "声形绘后端已启动" 提示
echo.
echo [2/2] 启动前端（端口 8000），3 秒后打开浏览器...
timeout /t 3 /nobreak >nul
python launcher\server.py --port 8000
echo.
echo [前端服务已停止，请手动关闭后端窗口]
pause
goto MENU

:ASK_FRONTEND_FALLBACK
set /p cont=是否仍要启动仅前端模式？(Y/N)：
if /i "%cont%"=="Y" goto START_FRONTEND
if /i "%cont%"=="y" goto START_FRONTEND
goto MENU

:RUN_TESTS
cls
echo.
echo [运行中] 自动化测试（无需启动服务器，脚本内部启动临时服务器）...
echo.
python launcher\run_tests.py
echo.
pause
goto MENU

:STOP_ALL
cls
echo.
echo [停止中] 关闭 8000 和 8787 端口的进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul && echo 已关闭 PID %%a (端口 8000)
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8787 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul && echo 已关闭 PID %%a (端口 8787)
)
echo.
echo [完成]
timeout /t 2 /nobreak >nul
goto MENU

:SHOW_HELP
cls
echo.
echo ============================================================
echo                    使用说明
echo ============================================================
echo.
echo 【首次使用】
echo   1. 双击 启动器.bat
echo   2. 选 [1] 启动前端服务
echo   3. 浏览器会自动打开首页
echo   4. 体验：首页 ^> 工作台 ^> 画形状 ^> 识别 ^> 演奏 ^> 保存
echo   5. 数据保存在浏览器本地，刷新不丢失，换浏览器/清缓存会丢失
echo.
echo 【完整模式（可选）】
echo   1. 安装 PostgreSQL 16+ 或注册 Supabase（免费）
echo   2. 复制 backend\.env.example 为 backend\.env
echo   3. 填写 DATABASE_URL 和 JWT_SECRET
echo   4. 在 backend 目录运行：npm install
echo   5. 在 backend 目录运行：npm run migrate（建表）
echo   6. 回到启动器选 [2]
echo.
echo 【运行测试】
echo   1. 选 [3] 运行自动化测试
echo   2. 查看报告：launcher\test-report.txt
echo   3. 报告会列出每个验收项的 PASS / FAIL
echo.
echo 【停止服务】
echo   - 前端：在前端窗口按 Ctrl + C，或选 [4]
echo   - 后端：关闭后端窗口，或选 [4]
echo.
echo 【常见问题】
echo   Q: 提示"python 不是内部命令"？
echo   A: 安装 Python 3.10+，安装时勾选 "Add Python to PATH"
echo.
echo   Q: 端口被占用？
echo   A: 选 [4] 停止所有服务，或修改 launcher\server.py 默认端口
echo.
echo   Q: 画图后识别不出？
echo   A: 至少画 4 个独立形状（矩形/圆点），形状之间留间隙
echo.
echo   Q: 中文显示乱码？
echo   A: 启动器已自动切换 UTF-8 编码，无需手动处理
echo.
pause
goto MENU
