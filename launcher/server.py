"""声形绘 SoundShape - 静态前端服务器

用途：
    用 Python 内置 http.server 启动一个本地静态服务器，
    专门托管 soundshape-design 目录下的纯前端页面。

特点：
    - 零依赖（Python 3.6+ 自带所有模块）
    - 默认端口 8000，可被 --port 覆盖
    - 自动打开默认浏览器到首页
    - 启动前会检查目录与首页是否存在
    - Ctrl+C 优雅退出

使用：
    python launcher/server.py
    python launcher/server.py --port 8080
"""

import argparse
import http.server
import socketserver
import threading
import time
import webbrowser
import sys
from pathlib import Path

# Windows cmd 默认编码可能是 GBK（cp936），强制 stdout 用 UTF-8
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

# 项目根目录 = 本文件的上两级
ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT / "soundshape-design"


class Handler(http.server.SimpleHTTPRequestHandler):
    """自定义请求处理器：固定目录 + 中文路径支持 + 简单日志。"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND_DIR), **kwargs)

    def end_headers(self):
        # 关键：允许所有跨域，方便前端调用本地后端
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        # 简化日志，避免 stderr 噪音
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


def find_free_port(preferred: int) -> int:
    """如果首选端口被占用，自动找一个空闲端口。"""
    import socket
    for port in [preferred] + list(range(preferred + 1, preferred + 50)):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("没有可用端口")


def open_browser(url: str, delay: float = 1.0):
    """延迟打开浏览器，给服务器一点启动时间。"""
    def _open():
        time.sleep(delay)
        webbrowser.open(url)
    threading.Thread(target=_open, daemon=True).start()


def main():
    parser = argparse.ArgumentParser(description="声形绘 SoundShape 前端静态服务器")
    parser.add_argument("--port", type=int, default=8000, help="端口号，默认 8000")
    parser.add_argument("--no-browser", action="store_true", help="不自动打开浏览器")
    args = parser.parse_args()

    # 前置检查
    if not FRONTEND_DIR.exists():
        print(f"[错误] 前端目录不存在：{FRONTEND_DIR}")
        sys.exit(1)
    home_page = FRONTEND_DIR / "pages" / "home.html"
    if not home_page.exists():
        print(f"[错误] 首页文件不存在：{home_page}")
        sys.exit(1)

    port = find_free_port(args.port)
    if port != args.port:
        print(f"[提示] 端口 {args.port} 被占用，改用 {port}")

    base_url = f"http://127.0.0.1:{port}/pages/home.html"

    print("=" * 60)
    print("  声形绘 SoundShape · 前端服务器")
    print("=" * 60)
    print(f"  目录 : {FRONTEND_DIR}")
    print(f"  地址 : {base_url}")
    print(f"  退出 : 按 Ctrl + C")
    print("=" * 60)

    if not args.no_browser:
        open_browser(base_url, delay=1.2)

    with socketserver.TCPServer(("127.0.0.1", port), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[服务器已停止]")
            httpd.shutdown()


if __name__ == "__main__":
    main()
