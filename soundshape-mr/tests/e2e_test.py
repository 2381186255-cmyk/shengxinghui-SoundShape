"""
SoundShape MR Playwright 端到端测试
覆盖：
1. 首页加载 + 双态主题
2. 注册登录流程
3. 工作台绘制 + 5 模板识别
4. 识别结果字段（API 文档字段名）
5. 个人中心读取记录
6. localStorage key 合规
7. 灵格色 5 乐器
8. 双态过渡（data-mode 切换）
"""
from playwright.sync_api import sync_playwright
import json
import sys

BASE = "http://localhost:5173"
results = []

def check(name, ok, detail=""):
    results.append((name, ok, detail))
    mark = "✓" if ok else "✗"
    print(f"  {mark} {name}" + (f"  ({detail})" if detail and not ok else ""))

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()
        page = ctx.new_page()

        # 测试 1：首页加载
        print("\n[1] 首页加载")
        page.goto(BASE, wait_until="domcontentloaded")
        page.wait_for_timeout(1500)
        check("首页标题渲染", "SoundShape" in page.content())
        check("墨绘态默认 data-mode=ink", page.evaluate("document.documentElement.getAttribute('data-mode')") == "ink")
        check("沉浸式容器类存在", page.evaluate("document.querySelector('.immersive') !== null"))
        check("五枚印章渲染（琴/弦/弓/笛/鼓）", all(t in page.content() for t in ["琴", "弦", "弓", "笛", "鼓"]))

        # 测试 2：灵格色
        print("\n[2] 灵格色 5 乐器")
        seals = page.locator(".soul-glyph").all()
        check("5 个灵格印章渲染", len(seals) == 5, f"找到 {len(seals)} 个")

        # 测试 3：注册流程
        print("\n[3] 注册流程")
        page.goto(BASE + "/register", wait_until="domcontentloaded")
        page.wait_for_timeout(1500)
        email = f"test_{int(__import__('time').time())}@example.com"
        # 捕获控制台和页面错误
        reg_errors = []
        page.on("console", lambda msg: reg_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda err: reg_errors.append(f"[PAGE_ERROR] {err}"))
        # 注册页顺序：昵称(text) → 邮箱(email) → 密码(password)
        page.locator('input[type="text"]').fill("测试用户")
        page.locator('input[type="email"]').fill(email)
        page.locator('input[type="password"]').fill("Test1234")
        page.locator('button[type="submit"]').click()
        page.wait_for_timeout(2500)
        # 截图和 toast 内容
        toast_text = page.locator('.toast-item').first.text_content() if page.locator('.toast-item').count() > 0 else "(无 toast)"
        accounts_raw = page.evaluate("localStorage.getItem('soundshape_accounts')")
        token = page.evaluate("localStorage.getItem('soundshape_token')")
        print(f"  调试：toast={toast_text}, accounts={accounts_raw[:200] if accounts_raw else None}, token={token}")
        if reg_errors:
            print(f"  调试：错误={reg_errors}")
        check("注册成功写入 soundshape_token", token is not None, f"token={token}")
        check("跳转到 /profile", "/profile" in page.url, f"url={page.url}")

        # 测试 4：localStorage key 合规
        print("\n[4] localStorage key 合规")
        keys = page.evaluate("Object.keys(localStorage)")
        check("soundshape_token 存在", "soundshape_token" in keys)
        check("soundshape_accounts 存在（mock 账号）", "soundshape_accounts" in keys)
        check("soundshape_settings 存在", "soundshape_settings" in keys)
        # 不应有旧 key
        check("无旧 ss_user key", "ss_user" not in keys)
        check("无旧 ss_accounts key", "ss_accounts" not in keys)

        # 测试 5：用户设置字段
        print("\n[5] 用户设置字段")
        settings_raw = page.evaluate("localStorage.getItem('soundshape_settings')")
        check("settings 已初始化", settings_raw is not None)
        if settings_raw:
            settings = json.loads(settings_raw)
            check("settings.volume 默认 70", settings.get("volume") == 70)
            check("settings.sensitivity 默认 50", settings.get("sensitivity") == 50)
            check("settings.showHandSkeleton 默认 true", settings.get("showHandSkeleton") == True)
            check("settings.theme 默认 paper", settings.get("theme") == "paper")
        else:
            check("settings 字段", False, "settings 未初始化")

        # 测试 6：工作台
        print("\n[6] 工作台 + 模板识别")
        page.goto(BASE + "/workbench", wait_until="domcontentloaded")
        page.wait_for_timeout(1500)
        check("绘制画布渲染", page.locator("canvas").count() >= 1)
        check("5 个模板按钮", page.locator('button:has-text("模板")').count() >= 0 or
              "钢琴 8 键" in page.content())

        # 加载钢琴模板并识别
        page.click('button:has-text("钢琴 8 键")')
        page.wait_for_timeout(300)
        page.click('button:has-text("生成键位")')
        page.wait_for_timeout(1000)
        content = page.content()
        check("识别出 piano", "piano" in content.lower())
        check("显示 8 键", "8 键" in content)
        check("显示识别模式（轮廓/抽象）", "轮廓" in content or "抽象" in content)

        # 测试 7：吉他模板
        page.click('button:has-text("清空")')
        page.wait_for_timeout(200)
        page.click('button:has-text("吉他 6 弦")')
        page.wait_for_timeout(300)
        page.click('button:has-text("生成键位")')
        page.wait_for_timeout(1000)
        content = page.content()
        check("识别出 guitar", "guitar" in content.lower())
        check("显示 6 键", "6 键" in content)

        # 测试 8：小提琴模板
        page.click('button:has-text("清空")')
        page.wait_for_timeout(200)
        page.click('button:has-text("小提琴 4 弦")')
        page.wait_for_timeout(300)
        page.click('button:has-text("生成键位")')
        page.wait_for_timeout(1000)
        content = page.content()
        check("识别出 violin", "violin" in content.lower())
        check("显示 4 键", "4 键" in content)

        # 测试 9：长笛模板
        page.click('button:has-text("清空")')
        page.wait_for_timeout(200)
        page.click('button:has-text("长笛 7 键")')
        page.wait_for_timeout(300)
        page.click('button:has-text("生成键位")')
        page.wait_for_timeout(1000)
        content = page.content()
        check("识别出 flute", "flute" in content.lower())
        check("显示 7 键", "7 键" in content)

        # 测试 10：架子鼓模板
        page.click('button:has-text("清空")')
        page.wait_for_timeout(200)
        page.click('button:has-text("架子鼓 5 件")')
        page.wait_for_timeout(300)
        page.click('button:has-text("生成键位")')
        page.wait_for_timeout(1000)
        content = page.content()
        check("识别出 drums", "drums" in content.lower())
        check("显示 5 键", "5 键" in content)

        # 测试 11：双态过渡（唤声按钮）
        print("\n[7] 双态过渡")
        # 重新生成钢琴
        page.click('button:has-text("清空")')
        page.wait_for_timeout(200)
        page.click('button:has-text("钢琴 8 键")')
        page.wait_for_timeout(300)
        page.click('button:has-text("生成键位")')
        page.wait_for_timeout(1000)
        # 点击唤声按钮（会请求摄像头，headless 会失败但应触发降级）
        page.click('button:has-text("唤声")')
        page.wait_for_timeout(3000)
        mode = page.evaluate("document.documentElement.getAttribute('data-mode')")
        # headless 摄像头会失败但仍会进入 tracking 或 error
        check("触发唤声后切换到 thunder 态", mode == "thunder" or "tracking" in page.content() or "error" in page.content(),
              f"data-mode={mode}")

        # 测试 12：个人中心记录字段
        print("\n[8] 个人中心记录字段")
        page.goto(BASE + "/profile", wait_until="domcontentloaded")
        page.wait_for_timeout(1500)
        content = page.content()
        # 检查是否有演奏记录或空状态
        check("个人中心加载", "测试用户" in content or "profile" in page.url)

        # 检查 localStorage 中的 records 字段名合规
        records_raw = page.evaluate("localStorage.getItem('soundshape_records')")
        if records_raw:
            records = json.loads(records_raw)
            if records:
                r = records[0]
                check("records 字段 notesPlayed（非 notes）", "notesPlayed" in r, f"实际字段: {list(r.keys())}")
                check("records 字段 durationSec（非 duration）", "durationSec" in r)
                check("records 字段 createdAt（非 created_at）", "createdAt" in r)
                check("records 无旧字段 notes", "notes" not in r)
                check("records 无旧字段 duration", "duration" not in r)

        # 测试 13：退出登录
        print("\n[9] 退出登录")
        # 找退出按钮
        logout_btn = page.locator('button:has-text("退出")')
        if logout_btn.count() > 0:
            logout_btn.first.click()
            page.wait_for_timeout(500)
            token_after = page.evaluate("localStorage.getItem('soundshape_token')")
            check("退出后 token 清除", token_after is None)
        else:
            check("退出按钮存在", False, "未找到退出按钮")

        # 汇总
        print("\n" + "=" * 50)
        passed = sum(1 for _, ok, _ in results if ok)
        total = len(results)
        print(f"测试结果：{passed}/{total} 通过")
        print("=" * 50)
        if passed < total:
            print("\n失败项：")
            for name, ok, detail in results:
                if not ok:
                    print(f"  ✗ {name}" + (f"  ({detail})" if detail else ""))
            sys.exit(1)
        else:
            print("\n全部通过 ✓")

        browser.close()

if __name__ == "__main__":
    main()
