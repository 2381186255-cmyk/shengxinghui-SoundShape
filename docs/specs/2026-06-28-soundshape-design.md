# 声形绘 SoundShape 设计文档 v3

> 画出来就能弹——画图生成虚拟键位 + 摄像头实时手部追踪 + 区域触发演奏 + 激光特效

## 一、产品定位

面向非技术用户的 Web 应用。用户在画布上画几个形状（线条/方块/圆点），系统按形状特征生成虚拟音键区，叠加到摄像头实时画面上。用户用手在空中触碰这些虚拟键位即可演奏音乐，伴随激光光晕特效。

无需安装真实乐器，无需乐器识别，画几笔就能弹。

## 二、核心交互流程

```
1. 用户进入工作台
2. 选择"画图生成键位"模式
3. 在画布上画形状（线条/方块/圆点）
4. 点击"生成键位并开始演奏"
5. 系统按形状特征推断乐器：
   - 多个方块横向一行 → 钢琴（横向琴键）
   - 6条竖向长条 → 吉他（6根弦）
   - 4条竖向长条 → 小提琴（4根弦）
   - 单条横向长条 + 圆点 → 长笛（按键）
   - 多个圆形/方块分散 → 架子鼓（鼓件）
6. 摄像头开启，画面叠加生成的虚拟键位
7. MediaPipe Hands 实时追踪手部21个关键点
8. 手指（食指尖）进入某个键位区域 → 触发该音 + 光晕特效
9. 手指离开 → 音符自然衰减
10. 演奏过程可录制/保存（登录用户）
```

## 三、技术架构

### 3.1 整体架构

```
┌──────────────────────────────────────────────────┐
│  前端 (Vercel)                                    │
│  React + Vite + TypeScript + Tailwind CSS         │
│  - 画图采集（Canvas）                              │
│  - 摄像头实时画面（getUserMedia）                  │
│  - MediaPipe Hands 手部追踪（浏览器端推理）        │
│  - 虚拟键位叠加 + 激光特效（Canvas/Framer Motion）│
│  - Web Audio 合成音色                              │
│  - 实时调音器（AnalyserNode + 自相关）             │
└──────────────┬───────────────────────────────────┘
               │ HTTPS REST API
┌──────────────▼───────────────────────────────────┐
│  后端 (Render)                                    │
│  Node.js + Express + TypeScript                   │
│  - /api/auth      用户注册/登录（JWT）              │
│  - /api/records   演奏记录 CRUD                    │
│  - /api/tunings   调音历史 CRUD                    │
│  - /api/layouts   键位布局保存/分享                 │
└──────────────┬───────────────────────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐  ┌──────────────┐
│ Supabase     │  │ 静态资源 CDN  │
│ PostgreSQL   │  │ (Vercel 自带) │
└──────────────┘  └──────────────┘
```

**关键变化（相比 v2）：**
- 移除 TensorFlow MobileNet 图像识别（不再需要识别乐器图片）
- 新增 MediaPipe Hands（前端浏览器内手部追踪，无需后端算力）
- 后端不再处理图像，只做用户数据/记录存储
- 演奏逻辑全部在前端实时完成，延迟 < 100ms

### 3.2 技术栈

**前端**
- React 18 + Vite + TypeScript
- Tailwind CSS（极简现代风）
- @mediapipe/hands + @mediapipe/camera_utils（手部追踪）
- Framer Motion（UI 动画）
- Web Audio API（音色合成 + 调音器）
- Canvas 2D（虚拟键位叠加 + 激光特效）
- Zustand（状态管理）
- Axios（HTTP）

**后端**
- Node.js 18 + Express + TypeScript
- jsonwebtoken + bcryptjs（认证）
- pg（PostgreSQL）
- 无图像处理，无 AI 推理

**托管**
- Vercel（前端）+ Render（后端）+ Supabase（数据库）

### 3.3 为什么去掉图像识别

| v2 方案（识别乐器图片） | v3 方案（画图生成键位） |
|----------------------|----------------------|
| 用户拍真实乐器 → AI 识别 → 再演奏 | 用户画形状 → 直接生成键位 → 演奏 |
| 两段式，识别准确率不保证 | 一气呵成，识别率≈100% |
| 后端跑 TensorFlow，延迟 200-500ms | 前端 MediaPipe 追踪，延迟 < 100ms |
| 识别失败需降级 | 不会失败 |

## 四、核心功能模块

### 4.1 画图生成键位

**画布交互：**
- 用户在 Canvas 上自由画形状
- 支持画方块、长条、圆形、自由线
- 可选择"形状工具"或"自由画"
- 提供"清空"、"撤销"按钮
- 提供示例模板（点击一键画好标准钢琴键位等）

**形状识别算法（前端本地）：**
```
分析所有画出的形状：
1. 计算每个形状的边界框（bounding box）
2. 按长宽比分类：
   - 长宽比 ≈ 1 → 圆形/方块
   - 长宽比 > 3 且横向 → 横向长条
   - 长宽比 > 3 且竖向 → 竖向长条
3. 按整体布局分类：
   - ≥5个方块横向一行 → 钢琴
   - 6条竖向长条 → 吉他
   - 4条竖向长条 → 小提琴
   - 1条横向长条 + 若干圆点 → 长笛
   - ≥3个圆形/方块分散 → 架子鼓
4. 不匹配任何模式 → 提示"再画几笔，或参考右侧示意图"
```

**键位生成：**
- 每个识别出的形状 → 生成一个"音键区"
- 按乐器类型分配音高：
  - 钢琴：C4 D4 E4 F4 G4 A4 B4 C5（按画的方块数）
  - 吉他：E2 A2 D3 G3 B3 E4（6根弦）
  - 小提琴：G3 D4 A4 E5（4根弦）
  - 长笛：C4 D4 E4 F4 G4 A4 B4（按圆点数）
  - 架子鼓：底鼓/军鼓/嗵鼓/镲（按形状数）

### 4.2 摄像头实时手部追踪

**技术：MediaPipe Hands**

- 浏览器端实时推理，30fps
- 追踪双手共 42 个关键点（每手 21 个）
- 关键点坐标归一化到 [0,1]，映射到画面像素

**触发逻辑：**
- 取食指尖（关键点 8）作为"演奏点"
- 每帧检测食指尖是否落在某个虚拟键位区域内
- 进入区域（前一帧不在、当前帧在）→ 触发音符 onset
- 持续在区域内 → 不重复触发（防抖）
- 离开区域 → 音符自然衰减（release）
- 可选：双手食指可同时触发不同键位（和弦）

**防误触：**
- 设置"深度阈值"：手必须靠近摄像头一定距离（关键点 z 值）才触发
- 或设置"停留时间"：手指在区域内停留 > 80ms 才触发
- 提供"灵敏度"滑块调节

### 4.3 虚拟键位叠加 + 激光特效

**画面层级（从下到上）：**
1. 摄像头实时视频流（镜像翻转，让用户像照镜子）
2. 虚拟键位半透明叠加层（Canvas 绘制）
3. 手部关键点连线（MediaPipe 输出，Canvas 绘制）
4. 触发光晕特效（Canvas 粒子/Framer Motion）

**虚拟键位样式：**
- 半透明发光边框（霓虹色）
- 默认状态：低饱和度描边
- 手指悬停：边框加亮 + 内部微微发光
- 触发瞬间：光晕从中心扩散 + 颜色饱和度拉满
- 每个键位标注对应音名（如"C4"、"E2"）

**手部特效：**
- 食指尖绘制发光圆点
- 手指移动留下渐隐拖尾（粒子）
- 触发瞬间指尖爆发粒子

**配色（暗色演奏区）：**
```css
--play-bg: #000000;
--key-border-default: rgba(0, 229, 255, 0.3);   /* 青色低饱和 */
--key-border-hover: rgba(0, 229, 255, 0.8);
--key-trigger-cyan: #00E5FF;
--key-trigger-magenta: #FF00E5;
--key-trigger-yellow: #FFD600;
--hand-trail: rgba(255, 255, 255, 0.6);
--particle-burst: #FFFFFF;
```

### 4.4 音色合成（Web Audio）

**5种乐器音色合成方案：**

| 乐器 | 合成方式 | 包络 |
|------|---------|------|
| 钢琴 | OSCillator 三角波 + 谐波 | Attack 5ms / Decay 300ms / Sustain 0.3 / Release 500ms |
| 吉他 | OSCillator 锯齿波 + 低通滤波 | Attack 2ms / Decay 800ms / Sustain 0 / Release 200ms |
| 小提琴 | OSCillator 锯齿波 + 颤音 LFO | Attack 80ms / Sustain 0.8 / Release 400ms |
| 长笛 | OSCillator 正弦波 + 气声噪声 | Attack 30ms / Sustain 0.7 / Release 200ms |
| 架子鼓 | 噪声 + 低频 OSCillator | Attack 1ms / Decay 200ms / Sustain 0 / Release 50ms |

### 4.5 调音图示区

识别出乐器后，在演奏区旁展示该乐器的标准调音参考：

| 乐器 | 调音图示 |
|------|---------|
| 钢琴 | 88键简化图 + 中央C标注 + 点击试听标准音 |
| 吉他 | 6根弦 + 标准音 E A D G B E + 每弦可点击播放对照音 |
| 小提琴 | 4根弦 + 标准音 G D A E + 每弦可点击播放对照音 |
| 长笛 | 指法示意图 + 标准音可点击试听 |
| 架子鼓 | 各部件位置图 + 点击试听 |

### 4.6 实时调音器

- 独立面板，开启麦克风
- 浏览器端 AnalyserNode + 自相关算法检测基频
- 显示：音名 + 频率 + 偏差指针（偏左=偏低，偏右=偏高，居中=准）
- 适合给真实吉他/小提琴调弦
- 调音结果可保存（登录用户）

### 4.7 用户系统

- 注册/登录（邮箱+密码）
- JWT 认证，Token 存 localStorage
- 未登录可试用（画图+演奏+调音），无法保存
- 登录后可保存：演奏记录、调音历史、自定义键位布局

## 五、UI 设计规范（极简现代风）

### 5.1 设计原则

参照 Apple 官网设计语言：
- 大量留白，呼吸感强
- 纯白底 + 深灰文字 + 苹果蓝强调
- 18px 圆角卡片 + 微妙阴影
- 大字号标题（48-56px）
- 演奏区是唯一暗色块（黑底霓虹特效）

### 5.2 配色系统

```css
/* 背景色 */
--bg-primary: #FFFFFF;
--bg-secondary: #F5F5F7;
--bg-card: #FFFFFF;

/* 文字色 */
--text-primary: #1D1D1F;
--text-secondary: #86868B;
--text-tertiary: #D2D2D7;

/* 强调色 */
--accent-blue: #0071E3;
--accent-blue-hover: #0077ED;
--accent-green: #34C759;
--accent-orange: #FF9500;
--accent-red: #FF3B30;

/* 边框 */
--border-light: #D2D2D7;
--border-focus: #0071E3;

/* 演奏区暗色配色 */
--play-bg: #000000;
--key-border-default: rgba(0, 229, 255, 0.3);
--key-border-hover: rgba(0, 229, 255, 0.8);
--key-trigger-cyan: #00E5FF;
--key-trigger-magenta: #FF00E5;
--key-trigger-yellow: #FFD600;
--hand-trail: rgba(255, 255, 255, 0.6);
```

### 5.3 字体规范

```css
--font-display: 'SF Pro Display', -apple-system, 'Inter', sans-serif;
--font-body: 'SF Pro Text', -apple-system, 'Inter', sans-serif;
--font-mono: 'SF Mono', 'JetBrains Mono', monospace;

--text-hero: 56px;
--text-h1: 48px;
--text-h2: 36px;
--text-h3: 24px;
--text-body: 17px;
--text-caption: 14px;
--text-micro: 12px;

--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

### 5.4 间距与圆角

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 40px;
--space-2xl: 64px;
--space-3xl: 96px;

--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 18px;
--radius-xl: 24px;
--radius-pill: 9999px;

--shadow-card: 0 4px 24px rgba(0,0,0,0.04);
--shadow-hover: 0 8px 32px rgba(0,0,0,0.08);
```

### 5.5 组件规范

**按钮**
- 主按钮：蓝底白字 pill，hover 加深，高 44px
- 次按钮：白底蓝字蓝边 pill
- 文字按钮：无边框，hover 下划线

**卡片**
- 白底，18px 圆角，内边距 24px
- hover 阴影加深

**输入框**
- 浅灰背景 #F5F5F7，12px 圆角
- focus 蓝色边框

**图标**
- SF Symbols 风格线性图标，默认 24px

### 5.6 页面布局

**顶部导航（固定，高 56px）**
```
┌─────────────────────────────────────────────────┐
│  ◆ 声形绘                  [工作台]  [登录]     │  白底，底部细分割线
└─────────────────────────────────────────────────┘
```

**首页 Hero**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│           画出来，就能弹。                        │  56px 居中大标题
│         让每一笔都成为音乐                       │  24px 灰色副标题
│                                                 │
│         [开始创作]    [看看怎么玩]               │  两个 pill 按钮
│                                                 │
│           [产品演示动图]                         │  演示手部追踪演奏
│                                                 │
└─────────────────────────────────────────────────┘
```

**工作台页面（核心）**
```
┌─────────────────────────────────────────────────┐
│  顶部导航                                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  步骤 1：画形状生成键位                          │  24px 标题
│  ┌─────────────────────────────────────────┐    │
│  │                                         │    │
│  │      画布（白底，可画方块/长条/圆）       │    │  18px 圆角
│  │      [清空] [撤销] [示例模板]            │    │  高 320px
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│  [生成键位并开始演奏]  ← 蓝色主按钮               │
│                                                 │
├─────────────────────────────────────────────────┤
│  步骤 2：摄像头实时演奏                          │  识别后显示
│  ┌─────────────────────────────────────────┐    │
│  │                                         │    │
│  │   摄像头实时画面（镜像）                  │    │  暗色背景
│  │   + 虚拟键位叠加（霓虹边框）              │    │  16:9
│  │   + 手部关键点追踪                        │    │  最大宽 960px
│  │   + 触发光晕特效                         │    │
│  │                                         │    │
│  │  [灵敏度: ━━●━━] [显示手部骨架: ✓]      │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  识别结果：钢琴 Piano                            │  灰色小字
├─────────────────────────────────────────────────┤
│  调音图示区                 │ 演奏控制            │
│  ┌──────────────┐          │ ┌──────────────┐   │
│  │ 88键简笔画   │          │ │ 音量: ━●━━   │   │
│  │ 中央C标注    │          │ │ 音色: 钢琴▾  │   │
│  │ [试听标准音] │          │ │ [保存演奏]   │   │
│  └──────────────┘          │ └──────────────┘   │
├─────────────────────────────────────────────────┤
│  实时调音器（给真乐器调弦用）                     │
│  [开启麦克风]  当前：A4 440Hz  ●━━━━○ 偏差: 0    │
└─────────────────────────────────────────────────┘
```

**移动端布局**（< 768px）
- 导航栏简化为图标
- 画布和演奏区上下堆叠
- 演奏区占满屏幕宽度
- 调音器改为底部可展开抽屉

### 5.7 交互动画

- 页面切换：淡入淡出 200ms
- 卡片 hover：阴影加深 + 上移 2px
- 按钮点击：缩放至 0.96 + 回弹
- 生成键位中：旋转加载图标 + "生成中..."
- 键位生成成功：演奏区从下淡入
- 演奏触发：光晕扩散（200ms 扩散 + 600ms 渐隐）
- 调音器指针：smooth 过渡

## 六、5种支持乐器

| 乐器 | 画图识别特征 | 音键区形式 | 音高分配 | 调音支持 |
|------|------------|-----------|---------|---------|
| 钢琴 Piano | ≥5个方块横向一行 | 横向琴键 | C4 D4 E4 F4 G4 A4 B4 C5... | 标准音对照 |
| 吉他 Guitar | 6条竖向长条 | 6根弦 | E2 A2 D3 G3 B3 E4 | 实时调弦 E A D G B E |
| 小提琴 Violin | 4条竖向长条 | 4根弦 | G3 D4 A4 E5 | 实时调弦 G D A E |
| 长笛 Flute | 1条横向长条 + 圆点 | 横向按键 | C4 D4 E4 F4 G4 A4 B4 | 标准音对照 |
| 架子鼓 Drums | ≥3个圆形/方块分散 | 鼓件点位 | 底鼓/军鼓/嗵鼓/镲 | 标准音对照 |

## 七、API 设计

### 7.1 认证

```
POST /api/auth/register
  Body: { email, password, nickname }
  Res:  { token, user }

POST /api/auth/login
  Body: { email, password }
  Res:  { token, user }
```

### 7.2 演奏记录

```
GET  /api/records          ?limit=20&offset=0
POST /api/records          { instrument, notes_played, duration_sec }
DELETE /api/records/:id
```

### 7.3 调音记录

```
GET  /api/tunings          ?limit=20
POST /api/tunings          { instrument, target_note, measured_freq, deviation_cents }
DELETE /api/tunings/:id
```

### 7.4 键位布局（可选，登录用户保存自定义布局）

```
GET  /api/layouts          ?limit=20
POST /api/layouts          { name, instrument, shapes: [...] }
DELETE /api/layouts/:id
```

## 八、数据库表设计

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE play_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  instrument VARCHAR(50) NOT NULL,
  notes_played JSONB,
  duration_sec INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tuning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  instrument VARCHAR(50) NOT NULL,
  target_note VARCHAR(10),
  measured_freq FLOAT,
  deviation_cents FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  instrument VARCHAR(50) NOT NULL,
  shapes JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 九、错误处理

| 场景 | 处理 |
|------|------|
| 摄像头授权失败 | Toast 提示 + 引导开启权限 + "仅画图模式"按钮 |
| MediaPipe 加载失败 | 顶部条幅提示 + 重试按钮 |
| 画图特征不匹配任何乐器 | 提示"再画几笔，或点击示例模板" |
| 麦克风授权失败 | 调音器禁用 + Toast |
| JWT 过期 | 跳转登录页 + 提示 |
| 后端不可达 | 仅禁用保存功能，演奏不受影响 |
| 浏览器不支持 Web Audio | 演奏区禁用 + 引导升级浏览器 |
| 手部追踪丢失 | 演奏区显示"请把手放在画面内" |

## 十、文件结构

```
music voice/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── Navbar.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Workbench.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── Profile.tsx
│   │   ├── features/
│   │   │   ├── DrawCanvas.tsx       # 画图生成键位
│   │   │   ├── ShapeRecognizer.ts   # 形状识别算法
│   │   │   ├── CameraStage.tsx      # 摄像头画面+叠加层
│   │   │   ├── HandTracker.ts       # MediaPipe 手部追踪
│   │   │   ├── KeyOverlay.tsx       # 虚拟键位绘制
│   │   │   ├── LaserEffects.ts      # 激光光晕特效
│   │   │   ├── TuningGuide.tsx      # 调音图示
│   │   │   └── Tuner.tsx            # 实时调音器
│   │   ├── audio/
│   │   │   ├── synth.ts             # Web Audio 合成
│   │   │   └── pitch.ts             # 基频检测
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── store/
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── records.ts
│   │   │   ├── tunings.ts
│   │   │   └── layouts.ts
│   │   ├── services/
│   │   │   ├── db.ts
│   │   │   └── auth.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── error.ts
│   │   ├── config.ts
│   │   └── server.ts
│   ├── migrations/
│   │   └── 001_init.sql
│   ├── package.json
│   └── tsconfig.json
│
├── docs/specs/
│   └── 2026-06-28-soundshape-design.md
└── README.md
```

## 十一、部署方案

### 前端 → Vercel
- 构建命令：`npm run build`
- 输出目录：`dist`
- 环境变量：`VITE_API_URL`

### 后端 → Render
- 启动命令：`npm start`
- 环境变量：`DATABASE_URL`、`JWT_SECRET`、`PORT`
- 免费档：512MB 内存

### 数据库 → Supabase
- 免费 500MB PostgreSQL
- 执行 migrations/001_init.sql

### MediaPipe 模型
- 从 Google CDN 加载，无需自托管
- 首次加载约 8MB，浏览器缓存后秒开

## 十二、成功标准

1. Vercel 公网 URL，手机/桌面浏览器均能正常打开
2. 注册/登录流程正常，JWT 认证生效
3. 画图模式 5 种乐器识别率 ≥95%
4. 摄像头开启后能实时追踪手部（30fps，延迟 < 100ms）
5. 手指进入虚拟键位区域能即时触发音色 + 光晕特效
6. 5 种乐器音色可辨识
7. 调音器能实时显示音高偏差
8. 登录用户可保存演奏/调音记录
9. UI 严格遵循极简现代风规范
10. 全设备响应式，移动端可触摸演奏
11. 所有错误场景有友好提示，无白屏/卡死

## 十三、降级策略

- 摄像头不可用 → 仅画图模式（可查看生成的键位图，但不演奏）
- MediaPipe 加载失败 → 提示重试 + 引导升级浏览器
- 后端不可达 → 演奏/调音正常，仅禁用保存功能
- 浏览器不支持 Web Audio → 演奏区禁用 + 提示
- 性能不足（帧率 < 15fps）→ 自动降低特效质量
