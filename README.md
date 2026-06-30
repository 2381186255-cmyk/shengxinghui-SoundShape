# 声形绘 SoundShape

> 画出来，就能弹 —— 画图生成虚拟键位 + 摄像头实时手部追踪 + 区域触发演奏 + 激光特效

![首页](soundshape-mr/tests/screens/01-home.png)

一个面向非技术用户的 Web 音乐应用。在画布上画几个形状（方块/长条/圆点），系统按形状特征自动生成虚拟音键区，叠加到摄像头画面上，用手指在空中触碰即可演奏音乐，伴随激光光晕特效。**无需安装真实乐器，无需乐器识别，画几笔就能弹。**

---

## 核心特性

| 能力 | 说明 |
| --- | --- |
| 画图识别 | 画形状自动识别为 5 种乐器：钢琴 / 吉他 / 小提琴 / 长笛 / 架子鼓 |
| 手部追踪 | MediaPipe Hands 实时追踪 21 个关键点，延迟 < 100ms |
| 演奏触发 | 食指进入虚拟键位即触发音色 + 粒子爆裂 + 键位闪光 |
| 调音器 | 内置实时音高检测，支持 A4(440Hz) 校准与音名/cents 显示 |
| 个人中心 | 注册登录后可保存演奏记录与调音历史，支持回放与删除 |
| 双主题 | 浅色"白昼纸面" + 深色"暗夜雷电"两种主题无缝切换 |
| 响应式 | 桌面 / 平板 / 手机全适配，触控按钮 ≥ 44px |

---

## 识别规则

按形状特征自动推断乐器（[模块文档 M2](docs/specs/2026-06-28-soundshape-modules.md) 阈值）：

| 画法 | 识别为 | 置信度 |
| --- | --- | --- |
| 6 条竖向长条 | 吉他（6 根弦） | 95% |
| 4 条竖向长条 | 小提琴（4 根弦） | 92% |
| ≥ 5 个横向排列方块 | 钢琴（横向琴键） | 90% |
| 1 条横向长条 + ≥ 3 圆点 | 长笛（按键） | 88% |
| ≥ 3 个分散形状 | 架子鼓（鼓件） | 85% |

---

## 快速开始（一键启动）

### 前置准备

- [Node.js 18+](https://nodejs.org/)（必装）
- 后端（可选）：PostgreSQL 16+ 或 Supabase 免费档

### 一键启动

双击 `start.bat`，启动器会自动：

1. 检测并安装前端依赖
2. 启动前端 Vite 开发服务器（端口 5173，新窗口）
3. 若 `backend/.env` 存在，启动后端 Express（端口 8787，新窗口）
4. 打开浏览器访问 http://localhost:5173/

启动后会有两个窗口分别显示前后端日志，关闭窗口即停止服务。

### 启用后端（可选）

```bash
cd backend
copy .env.example .env
# 编辑 .env 填入 DATABASE_URL 和 JWT_SECRET
npm install
npm run migrate    # 建表
```

配置完成后再次双击 `start.bat`，后端会自动启动。

---

## 项目结构

```
music voice/
├── start.bat                     # 一键启动（拉起前后端 + 开浏览器）
├── soundshape-mr/                # 前端（React + Vite + TypeScript）
│   ├── src/
│   │   ├── components/           # AppShell / TopNav
│   │   ├── lib/                  # audio / handTracking / recognition / store
│   │   ├── pages/                # Home / Workbench / Auth / Profile
│   │   └── styles/               # tokens / base / layout / animations
│   ├── tests/
│   │   ├── e2e_test.py           # Playwright 端到端测试
│   │   └── screens/              # 10 张测试截图
│   └── vite.config.ts
├── soundshape-design/            # 静态设计稿（14 页面 + 2 hero 图）
├── backend/                      # 后端（Node.js + Express + TypeScript）
│   ├── src/
│   │   ├── server.ts             # 入口，含 /api/health
│   │   ├── config.ts             # 环境变量
│   │   ├── migrate.ts            # 数据库迁移
│   │   ├── routes/               # auth / records / tunings / layouts
│   │   ├── middleware/           # auth(JWT) / error
│   │   └── services/             # auth / db
│   ├── migrations/001_init.sql   # 建表 SQL
│   └── .env.example
└── docs/                         # 设计文档与实现计划
    ├── plans/2026-06-28-soundshape-implementation.md  # 34 个 Task 实现计划
    └── specs/                    # 6 份规格文档
        ├── 2026-06-28-soundshape-design.md        # 产品设计
        ├── 2026-06-28-soundshape-ui-design.md     # UI 设计
        ├── 2026-06-28-soundshape-modules.md       # 模块规格（M1-M13）
        ├── 2026-06-28-soundshape-api.md           # API 规格
        ├── 2026-06-28-soundshape-data-model.md    # 数据模型
        └── 2026-06-28-soundshape-modules.md       # 模块规格
```

---

## 技术栈

**前端**（React + Vite）

- React 19 + Vite 8 + TypeScript
- Tailwind CSS（Apple 极简风）
- Web Audio API（音色合成）
- MediaPipe Hands（手部追踪，浏览器端推理）
- Zustand（状态管理）
- React Router（路由）

**后端**（可选，云端保存）

- Node.js 18 + Express + TypeScript
- PostgreSQL（Supabase 免费档）
- JWT 鉴权 + bcryptjs 密码哈希

**启动器**

- Windows `start.bat`（一键拉起前后端 + 开浏览器）

---

## 音色参数（M6 严格固定）

| 乐器 | 振荡器 | 包络 | 滤波器 |
| --- | --- | --- | --- |
| 钢琴 | triangle + sine×2 | A5ms D300ms S0.3 R500ms | lowpass 4000Hz |
| 吉他 | sawtooth + triangle | A2ms D800ms S0 R200ms | lowpass 2200Hz Q2 |
| 小提琴 | sawtooth×3 + LFO | A80ms D0 S0.8 R400ms | lowpass 3000Hz |
| 长笛 | sine + triangle + 噪声 | A30ms D0 S0.7 R200ms | lowpass 2500Hz |
| 架子鼓 | kick/snare/tom/cymbal | 各自合成 | — |

详见 [audio.ts](soundshape-mr/src/lib/audio.ts) 的 `INSTRUMENT_PRESETS`。

---

## 键盘备用模式（M4）

摄像头不可用时，可用键盘演奏：

| 乐器 | 键位 → 音名 |
| --- | --- |
| 钢琴 | `A S D F G H J K` → C4 D4 E4 F4 G4 A4 B4 C5 |
| 吉他 | `1 2 3 4 5 6` → E2 A2 D3 G3 B3 E4 |
| 小提琴 | `1 2 3 4` → G3 D4 A4 E5 |
| 长笛 | `A S D F G H J` → C4 D4 E4 F4 G4 A4 B4 |
| 架子鼓 | `Q W E R T` → kick snare tom1 tom2 cymbal |

---

## 测试

按 [实现计划 Task 33](docs/plans/2026-06-28-soundshape-implementation.md) 端到端验收清单执行，覆盖 9 个阶段：

```
阶段 A 部署可达性    阶段 B 注册登录    阶段 C 画图识别
阶段 D 摄像头追踪    阶段 E 触发演奏    阶段 F 调音器
阶段 G 记录保存      阶段 H 曲库挑战    阶段 I 分享录制
阶段 J UI 一致性     阶段 K 响应式      阶段 L 错误兜底
```

运行测试：

```bash
# 1. 先启动前端（双击 start.bat，或手动）
cd soundshape-mr && npm run dev

# 2. 另开终端运行 Playwright 测试
cd soundshape-mr
python tests/e2e_test.py
```

最新结果：**86 / 86 项全部通过**。

---

## 截图预览

| 首页 | 工作台导航 | 工作台空闲 | 绘制形状 |
| :---: | :---: | :---: | :---: |
| ![首页](soundshape-mr/tests/screens/01-home.png) | ![工作台导航](soundshape-mr/tests/screens/02-workbench-nav.png) | ![工作台空闲](soundshape-mr/tests/screens/03-workbench-idle.png) | ![绘制](soundshape-mr/tests/screens/04-workbench-drawn.png) |

| 模板 | 生成键位 | 摄像头 | 注册 |
| :---: | :---: | :---: | :---: |
| ![模板](soundshape-mr/tests/screens/05-template.png) | ![生成](soundshape-mr/tests/screens/06-generated.png) | ![摄像头](soundshape-mr/tests/screens/07-camera.png) | ![注册](soundshape-mr/tests/screens/08-register.png) |

| 注册完成 | 个人中心 |
| :---: | :---: |
| ![注册完成](soundshape-mr/tests/screens/09-register-done.png) | ![个人中心](soundshape-mr/tests/screens/10-profile.png) |

---

## 文档

完整设计与实现文档位于 [`docs/`](docs/)：

- [实现计划](docs/plans/2026-06-28-soundshape-implementation.md) — 7 阶段 34 个 Task，含审查规范
- [产品设计](docs/specs/2026-06-28-soundshape-design.md) — 产品定位、交互流程、技术架构
- [UI 设计](docs/specs/2026-06-28-soundshape-ui-design.md) — 视觉系统、组件语言
- [模块规格](docs/specs/2026-06-28-soundshape-modules.md) — M1-M13 模块定义
- [API 规格](docs/specs/2026-06-28-soundshape-api.md) — 接口字段、错误码
- [数据模型](docs/specs/2026-06-28-soundshape-data-model.md) — localStorage key、表结构

---

## 部署

| 层 | 平台 | 说明 |
| --- | --- | --- |
| 前端 | Vercel | 静态托管，CDN 加速 |
| 后端 | Render | Node.js 服务，免费档冷启动 < 30s |
| 数据库 | Supabase | PostgreSQL 免费档，500MB |

部署配置详见 [实现计划 Task 32](docs/plans/2026-06-28-soundshape-implementation.md)。

---

## 常见问题

**Q: 提示"node 不是内部命令"？**
A: 安装 [Node.js 18+](https://nodejs.org/)。

**Q: 端口被占用？**
A: 关闭之前启动的前后端窗口。或手动结束占用 5173/8787 的进程。

**Q: 画图后识别不出？**
A: 至少画 4 个独立形状（矩形/圆点），形状之间留间隙。参考上方"识别规则"。

**Q: 摄像头无法开启？**
A: 浏览器需 HTTPS 或 localhost 才能调用摄像头。本地访问 `http://localhost:5173` 即可。

**Q: 中文显示乱码？**
A: start.bat 已自动切换 UTF-8 编码，无需手动处理。

**Q: 数据保存在哪里？**
A: 未配后端时保存在浏览器 localStorage，配了后端则保存到 PostgreSQL。

---

## 开源协议

本项目仅用于学习与展示。商用请联系作者。

---

## 致谢

- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html) — 手部追踪
- [Web Audio API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Audio_API) — 音色合成
- [Tailwind CSS](https://tailwindcss.com/) — 样式系统
- [Lucide Icons](https://lucide.dev/) — 图标库

---

<p align="center">画几笔，就能弹。让音乐回归直觉。</p>
