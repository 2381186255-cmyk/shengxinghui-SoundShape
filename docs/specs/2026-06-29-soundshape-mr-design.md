# 声形绘 MR（SoundShape MR）设计文档 v1

> **版本：** v1（2026-06-29）
> **定位：** SoundShape 升级版，替代当前"画形状生成键位"模式，改为"画乐器 + 隔空操作 + MR 视觉"
> **状态：** 待评审

---

## 一、产品定位

### 1.1 一句话定位

用户在屏幕上画出乐器（轮廓或抽象形状），开启摄像头后，画出来的乐器以"全息投射"形态叠加在真实环境中，用户隔空挥手即可演奏。

### 1.2 与原 SoundShape 的差异

| 维度 | 原 SoundShape | SoundShape MR（本文档） |
|------|---------------|------------------------|
| 绘制对象 | 抽象形状（矩形/圆点） | 乐器轮廓 + 抽象形状两种都支持 |
| 视觉风格 | 暗夜雷电 + 霓虹边框 | MR 全息投射 + 深度光影 + 粒子 |
| 交互隐喻 | 键位区域触发 | 隔空演奏真实乐器（手与乐器在同一画面空间） |
| 摄像头角色 | 后台追踪手部 | 前台作为真实环境背景，乐器叠加其上 |
| 空间感 | 2D 平面键位 | 伪 3D 透视，乐器"躺"在虚拟桌面上 |
| 触发判定 | 食指尖进入矩形区域 | 食指尖投影到虚拟平面的坐标命中乐器音位 |

### 1.3 目标用户

- 大众尝鲜用户（手机/笔记本用户）
- 想体验"未来感演奏"的短视频创作者
- 音乐爱好者（无乐器硬件也能感受演奏）

### 1.4 核心价值

- **零硬件**：不用买乐器，画出来就能弹
- **MR 体验**：摄像头让虚拟乐器与真实环境融合
- **即时反馈**：手挥到哪里，音就响到哪里

---

## 二、核心玩法

### 2.1 完整流程

```
1. 用户在画布上绘制
   ├─ 模式 A：画乐器轮廓（钢琴键盘/吉他指板/鼓组/小提琴/长笛）
   └─ 模式 B：画抽象形状（沿用原 SoundShape 识别逻辑）
2. 系统识别绘制内容 → 生成虚拟乐器（含音位映射）
3. 用户点击"开启 MR 演奏"
4. 摄像头开启，画面作为背景
5. 虚拟乐器以"全息投射"形态叠加在画面下半部分（模拟桌面区域）
6. MediaPipe 追踪手部，食指尖位置实时映射到虚拟乐器坐标系
7. 食指触碰到音位 → 即时触发音色 + MR 光效（光晕、粒子、空间反射）
8. 演奏可录制为视频分享
```

### 2.2 两种绘制模式

#### 模式 A：画乐器轮廓

用户在画布上画出乐器的具体形态。系统通过轮廓特征识别乐器类型，并在轮廓上生成音位。

| 乐器 | 用户画什么 | 系统识别特征 | 生成的音位 |
|------|-----------|-------------|-----------|
| 钢琴 | 一排等大的矩形（键盘） | 横向排列的 6-12 个矩形 | 每个矩形对应一个音（C4-C5 或更宽） |
| 吉他 | 6 条横线（琴弦）+ 椭圆（音孔） | 6 条平行横线 | 6 根弦对应 E2/A2/D3/G3/B3/E4 |
| 小提琴 | 4 条竖线（琴弦）+ 拉长椭圆（琴身） | 4 条平行竖线 | 4 根弦对应 G3/D4/A4/E5 |
| 长笛 | 一条长横线 + 若干小圆点（按键） | 长横线 + 5-8 个圆点 | 圆点对应 C4-D5 |
| 架子鼓 | 5 个不等大的圆/方块（鼓面） | 5 个块状分布 | 底鼓/军鼓/嗵1/嗵2/镲 |

**识别算法：** 沿用原 SoundShape 的形状分类（block/hbar/vbar），但增加"乐器轮廓模板匹配"作为优先路径。若轮廓匹配失败，回退到原抽象形状识别。

#### 模式 B：画抽象形状

完全沿用原 SoundShape 逻辑：用户画矩形/线条/圆点，系统按布局推断乐器。此模式作为"快速模式"保留，降低新用户门槛。

### 2.3 模式选择交互

绘制页面顶部有两个 Tab：
- **「画乐器」**（默认）：进入模式 A，画布右侧显示乐器模板缩略图作为参考
- **「画形状」**：进入模式 B，沿用原逻辑

用户可随时切换 Tab（切换时清空画布）。

---

## 三、技术架构

### 3.1 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│  前端（Vercel）                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ React + Vite + TypeScript                              │  │
│  │ ├─ 绘制系统（Canvas 2D）                               │  │
│  │ ├─ 乐器轮廓识别（模板匹配 + 形状分类回退）             │  │
│  │ ├─ MR 渲染层（Canvas 2D + 透视变换 + 光影）            │  │
│  │ ├─ MediaPipe Hands（手部追踪）                         │  │
│  │ ├─ Web Audio API（音色合成）                           │  │
│  │ └─ 状态管理（Zustand）                                 │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↕ HTTPS                             │
┌──────────────────────────────────────────────────────────────┐
│  后端（Render）                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Node.js + Express + TypeScript                         │  │
│  │ ├─ 认证（JWT）                                         │  │
│  │ ├─ 演奏记录 / 调音记录 / 布局保存                      │  │
│  │ ├─ 分享视频上传（Supabase Storage）                    │  │
│  │ └─ 挑战排行                                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↕                                   │
┌──────────────────────────────────────────────────────────────┐
│  Supabase                                                    │
│  ├─ PostgreSQL（用户/记录/曲库/排行）                        │
│  └─ Storage（分享视频）                                      │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 技术栈

| 层 | 技术 | 版本 | 用途 |
|----|------|------|------|
| 前端框架 | React | 18 | UI |
| 构建 | Vite | 5 | 开发/打包 |
| 语言 | TypeScript | 5 | 类型安全 |
| 样式 | Tailwind CSS | 3 | 原子化 CSS |
| 动画 | Framer Motion | 11 | UI 微交互 |
| 手部追踪 | @mediapipe/hands | 0.4 | 21 关键点追踪 |
| 摄像头 | @mediapipe/camera_utils | 0.3 | 帧循环 |
| 音频 | Web Audio API | 原生 | 音色合成 |
| 状态 | Zustand | 4 | 全局状态 |
| HTTP | Axios | 1 | API 调用 |
| 后端 | Node.js + Express | 18 + 4 | REST API |
| 数据库 | PostgreSQL（Supabase） | 15 | 持久化 |
| 文件存储 | Supabase Storage | - | 视频 |
| 部署 | Vercel + Render | - | 公网访问 |

### 3.3 关键技术决策

#### 3.3.1 为什么用 Canvas 2D 而不是 Three.js / WebXR

| 方案 | 优点 | 缺点 | 决策 |
|------|------|------|------|
| Three.js + WebXR | 真 3D，真 AR 平面检测 | 浏览器兼容性差（iOS Safari 不支持 WebXR），开发量大，性能要求高 | ❌ 不采用 |
| Canvas 2D + 透视变换 | 兼容所有现代浏览器，性能好，开发可控 | 不是真 3D，靠视觉技巧模拟 | ✅ 采用 |
| 纯 CSS 3D Transform | 简单 | 与摄像头画面叠加困难 | ❌ 不采用 |

**结论：** 用 Canvas 2D 绘制 + 透视变换 + 光影效果，模拟 MR 贴合感。视觉上让用户感觉乐器"躺"在桌面上，实际上是 2D 画面的视觉欺骗。

#### 3.3.2 为什么不做"真正的平面检测"

用户原话："摄像头并不都是鱼眼镜头，反而交互会更奇怪"。

- 真正的平面检测（ARCore/ARKit/WebXR Hit Test）需要：
  - 移动设备 + 后置摄像头
  - 用户需要移动设备扫描环境
  - 单目 RGB 摄像头（笔记本/台式机）无法做平面检测
- 大众用户场景：笔记本前置摄像头 / 手机前置摄像头
- 结论：放弃真 AR 平面检测，用"假设存在一个虚拟桌面"的视觉约定

#### 3.3.3 "虚拟桌面"约定

为了让"隔空操作"有空间感，定义一个**虚拟桌面平面**：

- 摄像头画面下半部分（y > 50% 画面高度）视为"桌面区域"
- 虚拟乐器绘制时应用透视变换，让乐器看起来"平躺"在桌面上
- 透视参数固定：乐器远端（画面上方）窄、近端（画面下方）宽
- 手部追踪时，食指尖在画面中的 y 坐标决定"深度"，x 坐标决定"左右"

这样用户挥手时：
- 手抬高（画面上方）→ 触发乐器远端音位
- 手放低（画面下方）→ 触发乐器近端音位
- 视觉上就像在敲击桌面上的乐器

---

## 四、MR 视觉系统设计

### 4.1 视觉分层（从下到上）

```
┌─────────────────────────────────┐
│ Layer 1: 摄像头画面（背景）      │  真实环境，镜像翻转
├─────────────────────────────────┤
│ Layer 2: 虚拟桌面阴影            │  画面下半部分渐变暗化，营造"桌面"感
├─────────────────────────────────┤
│ Layer 3: 乐器全息投射            │  透视变换后的乐器，半透明 + 霓虹边框
├─────────────────────────────────┤
│ Layer 4: 音位光效                │  触发时的光晕、粒子、扩散环
├─────────────────────────────────┤
│ Layer 5: 手部骨架 + 食指尖光标   │  21 点连线 + 指尖青色光球
├─────────────────────────────────┤
│ Layer 6: UI 覆盖层               │  顶部状态栏、灵敏度滑块、录制按钮
└─────────────────────────────────┘
```

### 4.2 透视变换参数

虚拟乐器从绘制坐标系（0-1 归一化）映射到画面坐标系时，应用以下透视：

```typescript
// 透视参数（固定，不可调）
const PERSPECTIVE = {
  horizonY: 0.45,        // 地平线在画面 45% 处（上半部分是天空，下半部分是桌面）
  nearY: 0.92,           // 近端在画面 92% 处
  nearScaleX: 1.0,       // 近端宽度缩放
  farScaleX: 0.55,       // 远端宽度缩放（远端窄）
  skewY: 0.12,           // Y 方向倾斜系数（营造俯视角）
};

// 坐标映射：绘制坐标 (dx, dy) → 画面坐标 (sx, sy)
function projectToScene(dx: number, dy: number, sceneWidth: number, sceneHeight: number) {
  // dy=0 是乐器远端（画面上方），dy=1 是乐器近端（画面下方）
  const t = dy; // 0..1
  const sceneY = PERSPECTIVE.horizonY + (PERSPECTIVE.nearY - PERSPECTIVE.horizonY) * t;
  const scaleX = PERSPECTIVE.farScaleX + (PERSPECTIVE.nearScaleX - PERSPECTIVE.farScaleX) * t;
  const centerX = sceneWidth / 2;
  const sceneX = centerX + (dx - 0.5) * sceneWidth * scaleX;
  return { x: sceneX, y: sceneY * sceneHeight };
}
```

### 4.3 乐器全息视觉风格

> 配色以 7.4.3 节「五种乐器灵格色」为准，本节描述视觉结构。每个音位在 MR 场景中渲染为：

```
┌─────────────────────────┐
│  ╭───────────────────╮  │  外发光（灵格色，按乐器区分）
│  │                   │  │
│  │     音名标签       │  │  半透明填充（灵格色 rgba 0.15）
│  │                   │  │
│  ╰───────────────────╯  │  内边框（灵格色，1.5px）
│                         │
│  ▽ 投影（向下偏移 8px）  │  模拟桌面投影
└─────────────────────────┘
```

**乐器灵格色（沿用 7.4.3，禁止使用本节历史版本的其他配色）：**

| 乐器 | 墨绘印章色 | 雷霆全息色 | 灵格含义 |
|------|-----------|-----------|---------|
| 钢琴 | #2C4A7C（青金石蓝） | #00B4FF（电光蓝） | 沉静的水，理性的波动 |
| 吉他 | #B33A2C（朱砂红） | #FF6B35（橙红电弧） | 灼热的木，跳跃的火舌 |
| 小提琴 | #A87C2C（暗金） | #FFCC33（硫黄） | 流动的金，缠绵的丝弦 |
| 长笛 | #5C7A3D（苔绿） | #00FFA3（荧光绿） | 林间的风，清越的气流 |
| 架子鼓 | #5C2C7C（紫水晶） | #B829FF（电紫） | 雷霆的骨，沉稳的震颤 |

### 4.4 触发光效（对齐 7.11 节）

> 触发光效的完整定义见 7.11 节（6 层 L1-L6），本节仅作概览。食指触碰音位时触发 6 层光效（总时长 600ms）：

1. **L1 键位高亮**：被触发的虚拟键填充灵格色，外发光
2. **L2 涟漪扩散**：从键位中心向外扩散的圆形涟漪（灵格色）
3. **L3 粒子爆发**：8-12 个粒子从键位向外飞溅（硫黄色）
4. **L4 食指光晕**：食指尖光标从血橙变为硫黄，光晕扩大 2 倍（与 7.10.3 准星 triggering 态联动）
5. **L5 扫描线脉冲**：一道扫描线从键位向上扫过画面顶部
6. **L6 屏幕震屏**：整个画面轻微抖动（强度 2px，持续 80ms）

### 4.5 手部追踪视觉（对齐 7.10 节）

> 手部追踪可视化的完整定义见 7.10 节（11 个子节），本节仅作概览。4.5 节的历史描述（"小圆点半径3px"、"大光球半径12px"、"10帧拖尾"）已作废，一律以 7.10 节为准。

- 21 个关键点 + 19 条骨骼线全部渲染（7.10.1），关节点分级渲染（手腕5px/指根3px/指间2.5px/指尖4px硫黄）
- 食指尖（关键点 8）用十字准星 + 5 态状态机（idle/hovering/triggering/lost/hidden）（7.10.3）
- 双手通过准星色区分（左手硫黄/右手血橙），骨架统一电光青（7.10.2）
- 悬停预热反馈：键位虚线框 + 倒计时圆环 + 准星变色（7.10.4）
- 识别置信度 4 档可视化（7.10.6）
- 食指拖尾保留最近 30 帧（0.5s）渐隐（7.10.8）



### 5.1 追踪配置

```typescript
const HAND_CONFIG = {
  maxNumHands: 2,           // 支持双手
  modelComplexity: 1,       // 1 = 全精度
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.5,
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
};
```

### 5.2 坐标系映射

MediaPipe 输出的 landmarks 是归一化坐标（0-1），原点在左上角。需要：

1. **镜像翻转**：x' = 1 - x（因为摄像头画面镜像）
2. **投影到虚拟桌面**：用 4.2 节的逆变换，把画面坐标反投影到绘制坐标系

```typescript
// 画面坐标 (sx, sy) → 绘制坐标 (dx, dy)
function unprojectFromScene(sx: number, sy: number, sceneWidth: number, sceneHeight: number) {
  const normY = sy / sceneHeight;
  if (normY < PERSPECTIVE.horizonY) {
    // 手在"天空"区域，不在桌面上
    return null;
  }
  const t = (normY - PERSPECTIVE.horizonY) / (PERSPECTIVE.nearY - PERSPECTIVE.horizonY);
  const scaleX = PERSPECTIVE.farScaleX + (PERSPECTIVE.nearScaleX - PERSPECTIVE.farScaleX) * t;
  const centerX = sceneWidth / 2;
  const dx = (sx - centerX) / (sceneWidth * scaleX) + 0.5;
  const dy = t;
  return { x: dx, y: dy };
}
```

### 5.3 触发判定

```typescript
interface TriggerEvent {
  keyId: string;
  note: string;
  timestamp: number;
  hand: 'Left' | 'Right';
}

// 每帧检测
function checkTrigger(landmarks: NormalizedLandmark[], keys: VirtualKey[], sensitivity: number): TriggerEvent | null {
  const indexTip = landmarks[8]; // 食指尖
  // 镜像翻转
  const mirroredX = 1 - indexTip.x;
  // 投影到绘制坐标
  const projected = unprojectFromScene(mirroredX * sceneWidth, indexTip.y * sceneHeight, sceneWidth, sceneHeight);
  if (!projected) return null; // 手不在桌面区域

  // 灵敏度扩展（sensitivity 0-100，默认 50）
  const expand = 0.5 + (sensitivity / 100) * 0.4; // 0.5-0.9 的扩展系数

  for (const key of keys) {
    const dx = key.bounds.x + key.bounds.width / 2;
    const dy = key.bounds.y + key.bounds.height / 2;
    const halfW = (key.bounds.width * expand) / 2;
    const halfH = (key.bounds.height * expand) / 2;
    if (
      Math.abs(projected.x - dx) < halfW &&
      Math.abs(projected.y - dy) < halfH
    ) {
      // 命中，检查 cooldown
      if (Date.now() - key.lastTriggeredAt > 150) {
        return {
          keyId: key.id,
          note: key.note,
          timestamp: Date.now(),
          hand: landmarks.handedness === 'Left' ? 'Left' : 'Right',
        };
      }
    }
  }
  return null;
}
```

### 5.4 双手支持

- maxNumHands = 2，左右手可独立触发不同音位
- 同一音位不能被两手同时触发（150ms cooldown 全局生效）
- 视觉上左右手用不同颜色区分（左手青、右手品红）

---

## 六、模块划分

### 6.1 前端模块（16 个，M1-M16）

| 模块 | 职责 | 与原 SoundShape 差异 |
|------|------|---------------------|
| M1 UI 层 | 路由、布局、主题 | 主题新增"MR 场景"风格 |
| M2 绘制系统 | Canvas 绘制 + 两种模式 | **新增**乐器轮廓模板匹配 |
| M3 乐器识别 | 轮廓识别 + 形状分类回退 | **重写**优先走模板匹配 |
| M4 摄像头 | getUserMedia + 画面镜像 | 无差异 |
| M5 手部追踪 | MediaPipe 封装 | 无差异 |
| M6 MR 渲染层 | 透视变换 + 全息视觉 + 光效 | **新增**（替代原 KeyOverlay） |
| M7 音频合成 | 5 种乐器音色 | 无差异 |
| M8 调音器 | 自相关基频检测 | 无差异 |
| M9 曲库 | 曲目列表 + 详情 | 无差异 |
| M10 教学引导 | 4 步教学 | **修改**第 3 步改为"开启 MR" |
| M11 分享录制 | MediaRecorder | 无差异 |
| M12 挑战排行 | 每日挑战 | 无差异 |
| M13 用户状态 | JWT + 设置 | 无差异 |
| M14 API 客户端 | Axios 封装 | 无差异 |
| M15 性能监控 | FPS + 降级 | 无差异 |
| M16 错误边界 | ErrorBoundary | 无差异 |

### 6.2 后端模块（8 个，B1-B8）

与原 SoundShape 完全一致，无变更：
- B1 认证 / B2 演奏记录 / B3 调音记录 / B4 布局 / B5 曲库 / B6 分享 / B7 挑战 / B8 错误处理

---

## 七、UI 设计

> 设计语言：**「墨绘符印 · 雷霆唤声」**
> 双态美学——绘制态是中世纪炼金术手稿的羊皮纸墨绘，演奏态是 CRT 电磁幽灵的全息雷霆。
> 隔绝一切 Inter/Roboto/紫色渐变/赛博朋克套路。每一帧画面都该让人想起符印被烙印在纸面、又在通电瞬间化作电光的奇异转生。

### 7.1 设计风格与设计语言定义（AI 强制执行）

> 本节用形式化、机器可判断的方式定义「墨绘符印 · 雷霆唤声」的设计风格与设计语言。
> 所有负责前端实现的 AI 代理（主代理/子代理/审查代理）在生成或审查任何前端代码前，必须先读取本节，并严格执行下列规则。违反任一规则视为产出无效，必须重写。

#### 7.1.1 设计风格的形式化定义（特征向量）

设计风格 = 以下 8 个维度的取值组合。任何视觉产出必须同时满足全部维度，任一维度偏离即判定为「风格失败」。

| 维度 | 取值 | AI 判断规则（违反→FAIL） |
|------|------|--------------------------|
| D1 时代质感 | 中世纪手稿 + CRT 复古 | 产出含 Material Design / 扁平化 / 玻璃拟态 / 新拟态特征 → FAIL |
| D2 色温极性 | 双态（暖羊皮纸 ↔ 冷深渊黑） | 墨绘态出现冷色调 / 雷霆态出现暖色调 → FAIL（过渡动画期除外） |
| D3 字体族 | 衬线（Cormorant/Spectral/Noto Serif SC）+ 等宽（JetBrains Mono） | 出现 Inter/Roboto/Arial/system-ui/Space Grotesk/Geist → FAIL |
| D4 边缘硬度 | 直角为主，圆角 ≤ 8px | 卡片/按钮 border-radius > 8px → FAIL |
| D5 装饰密度 | 高密度纹理 + 低密度留白对比 | 大面积纯色背景（无纹理/噪声/渐变叠加）→ FAIL |
| D6 动效语义 | 物理隐喻（墨迹晕染/燃烧溶解/电光汇聚） | 动效为通用 fade/slide 且无隐喻 → FAIL |
| D7 图标系统 | SVG 自绘线性符号或 Lucide | 使用 emoji 作为功能图标 → FAIL |
| D8 视觉锚点 | 朱砂印章 / 全息边框作为页面焦点 | 页面无明确视觉焦点 → FAIL |

#### 7.1.2 设计语言核心规则集（IF-THEN 推导）

设计语言由以下 7 条规则构成。AI 在产出任何视觉元素时，必须按规则推导样式，禁止凭直觉选择。

**R1 双态隔离规则**
- IF 元素属于墨绘态页面（路由非 /workbench 的 tracking 阶段）
  THEN 必须使用 `[data-mode="ink"]` 下的 CSS 变量，禁止使用 cyan-/blood-/sulfur- 前缀变量，禁止 Scanline / Chromatic Aberration / 深渊黑背景
- IF 元素属于雷霆态（/workbench 的 tracking 阶段）
  THEN 必须使用 `[data-mode="thunder"]` 下的 CSS 变量，禁止使用 parchment-/cinnabar-/gold-/ink- 前缀变量，禁止羊皮纸纹理 / 朱砂印章 / 五线谱水印
- IF phase = generating（过渡动画期）THEN 允许双态混用

**R2 字体分配规则**
- IF 元素是标题/Hero/章节大字 → font-family: var(--font-display)（Cormorant Garamond）
- IF 元素是正文/段落/描述 → font-family: var(--font-body)（Spectral）
- IF 元素是数据/坐标/频率/FPS/音符序列 → font-family: var(--font-mono)（JetBrains Mono）
- IF 元素含中文 → font-family 链中必须包含 'Noto Serif SC'
- 禁止任何元素使用 Inter / Roboto / Arial / system-ui / Space Grotesk / Geist / PingFang / 微软雅黑作为主字体

**R3 色彩语义规则**
- IF 元素是墨绘态主按钮 → background: var(--ink-full)，hover 变 var(--cinnabar)
- IF 元素是雷霆态主按钮 → transparent + border 1px var(--cyan-bright)，hover 填充 cyan-faint
- IF 元素是乐器标识 → 使用该乐器灵格色（见 R7）
- IF 元素是状态提示 → success/warning/error 按双态取对应色
- 禁止：紫色渐变（#7C3AED→#EC4899）、墨绘态纯黑 #000、雷霆态大面积纯白 #FFF、赛博朋克紫粉霓虹套路

**R4 纹理强制规则**
- IF 元素是墨绘态页面/卡片背景 → 必须叠加 `.parchment-bg` 类
- IF 元素是墨绘态绘制画布 → 必须叠加 `.staff-watermark` 类
- IF 元素是雷霆态页面背景 → 必须叠加 `.scanline-overlay` 类
- IF 元素是雷霆态关键文字（标题/乐器名）→ 必须叠加 `.chromatic-text` 类
- IF 元素是雷霆态卡片 → 必须叠加 `.holo-border` 类

**R5 动效语义规则**
- IF 动效在墨绘态 → 使用墨迹晕染/卷轴展开/印章烙下语义，transition: all 0.3s cubic-bezier(0.4,0,0.2,1)
- IF 动效在雷霆态 → 使用扫描线扫过/像素解构/电光汇聚语义，transition: all 0.2s
- IF 动效是双态过渡 → 必须完整实现 7.9 节定义的 2.4s 九阶段时间轴，禁止简化为单一 fade
- IF 用户开启 prefers-reduced-motion → 2.4s 过渡压缩为 400ms 简单淡入，关闭 L3/L5/L6 触发光效

**R6 触发光效完整性规则**
- IF 食指尖触发虚拟键 → 必须同时触发 L1-L6 全部 6 层光效（reduced-motion 模式下仅保留 L1/L2/L4）
- 禁止只触发部分光效（如仅键位高亮无涟漪/粒子）

**R7 乐器灵格色绑定规则**
- IF 元素展示钢琴 → 墨绘印章色 #2C4A7C，雷霆全息色 #00B4FF
- IF 元素展示吉他 → #B33A2C / #FF6B35
- IF 元素展示小提琴 → #A87C2C / #FFCC33
- IF 元素展示长笛 → #5C7A3D / #00FFA3
- IF 元素展示架子鼓 → #5C2C7C / #B829FF
- 灵格色必须贯穿该乐器的所有视觉元素（印章/全息投射/触发光效/卡片标识/列表项）

#### 7.1.3 AI 强制执行提示词（system prompt 注入文本）

以下提示词必须被注入到所有负责前端实现的 AI 代理（主代理/子代理/审查代理）的 system prompt 中。实现代理在生成代码前必须读取，审查代理在审查代码时必须对照检查。

```
# ROLE
你是 SoundShape MR 项目的前端实现 AI。
本项目唯一的设计语言是「墨绘符印 · 雷霆唤声」，禁止使用任何其他设计语言。

# TASK
生成符合该设计语言的前端代码（HTML/CSS/JS/TSX/CSS Module）。

# ABSOLUTE CONSTRAINTS（违反任一条即视为产出无效，必须重写）

## C1 字体白名单
- 允许：Cormorant Garamond / Spectral / JetBrains Mono / Noto Serif SC / Songti SC / SimSun
- 禁止：Inter / Roboto / Arial / system-ui / Space Grotesk / Geist / PingFang / 微软雅黑
- 检查：扫描所有 font-family 声明，命中禁止列表 → 立即重写

## C2 配色白名单
- 墨绘态仅允许变量：--parchment-* / --ink-* / --cinnabar-* / --gold-* / --terrain-* / --success / --warning / --error
- 雷霆态仅允许变量：--abyss-* / --cyan-* / --blood-* / --sulfur-* / --text-* / --success / --warning / --error
- 乐器灵格色：钢琴 #2C4A7C/#00B4FF、吉他 #B33A2C/#FF6B35、小提琴 #A87C2C/#FFCC33、长笛 #5C7A3D/#00FFA3、架子鼓 #5C2C7C/#B829FF
- 手部可视化允许色：左手食指准星 --sulfur #FFCC33，右手食指准星 --blood-orange #FF4A1C，骨架统一 --cyan-bright #00F0FF
- 禁止：紫色渐变(#7C3AED→#EC4899)、墨绘态纯黑#000、雷霆态大面积纯白#FFF、赛博朋克紫粉霓虹套路、品红(#FF00AA)作为手部颜色
- 检查：扫描所有 color/background/border/stroke/fill 值，命中禁止值或不在白名单 → 立即重写

## C3 双态隔离
- 墨绘态元素禁止出现：cyan-/blood-/sulfur- 变量、Scanline、Chromatic Aberration、深渊黑背景
- 雷霆态元素禁止出现：parchment-/cinnabar-/gold-/ink- 变量、羊皮纸纹理、朱砂印章、五线谱水印
- 过渡动画期（phase=generating）例外
- 检查：按 data-mode 属性分组所有样式，交叉检查变量使用

## C4 纹理强制
- 墨绘态页面/卡片背景必须叠加 .parchment-bg
- 墨绘态绘制画布必须叠加 .staff-watermark
- 雷霆态页面背景必须叠加 .scanline-overlay
- 雷霆态关键文字（标题/乐器名）必须叠加 .chromatic-text
- 雷霆态卡片必须叠加 .holo-border
- 检查：扫描 className，缺失对应纹理类 → 立即补齐

## C5 圆角限制
- 所有卡片、按钮、输入框、徽章的 border-radius ≤ 8px
- 按钮推荐 border-radius: 0（直角，刻印感）
- 检查：扫描所有 border-radius 声明，> 8px → 重写为 0 或 ≤8px

## C6 图标系统
- 功能图标必须使用 SVG 自绘线性符号或 Lucide 图标库
- 禁止使用 emoji（🎨🎸🎹 等表情符号）作为功能图标
- 装饰性符号（⚜ ▓ ░ 等非 emoji 字符）允许在标题装饰中使用
- 手势状态指示器（7.10.7）必须用 SVG 线稿，禁止用 emoji 表示手势
- 检查：扫描代码中的 emoji 字符，命中 → 替换为 SVG/Lucide

## C7 动效完整性
- 双态过渡动画必须完整实现 7.9 节的 9 阶段时间轴（0/200/400/800/1200/1400/1800/2200/2400ms）
- 禁止简化为单一 fade 或仅实现部分阶段
- 触发光效必须同时实现 L1-L6 全部 6 层（reduced-motion 下保留 L1/L2/L4）
- 检查：对照 7.9/7.11 节时间轴表，逐阶段核对实现

## C8 乐器灵格色绑定
- 任何展示乐器的元素（印章/全息投射/触发光效/卡片标识/列表项）必须使用该乐器灵格色
- 禁止用默认色或随机色代替
- 检查：扫描乐器相关组件，核对灵格色映射

## C9 禁止事项（硬性红线）
1. 禁止使用 Material Design 阴影层级（elevation 0-24dp 套路）
2. 禁止使用 Tailwind 默认蓝色 #3B82F6 作为主色
3. 禁止使用对称网格布局（必须有非对称/破格元素）
4. 禁止使用圆角 > 8px 的卡片
5. 禁止双态混用（过渡动画期除外）
6. 禁止使用 emoji 作为功能图标
7. 禁止使用 Inter/Roboto/Arial/system-ui 字体
8. 禁止使用紫色渐变配色
9. 禁止使用通用 fade/slide 动效且无物理隐喻
10. 禁止在大面积背景使用纯色（必须叠加纹理/噪声/渐变）

## C10 手部追踪可视化完整性（MR 演奏阶段核心交互）
- 21 个 landmarks 必须全部渲染，禁止只渲染食指尖（违反 → FAIL）
- 骨架骨骼线必须用 --cyan-bright，关节点分级渲染（手腕5px/指根3px/指间2.5px/指尖4px硫黄）
- 食指尖准星必须实现 5 态状态机（idle/hovering/triggering/lost/hidden），禁止简化为单一静态光标
- 悬停预热反馈必须同时实现：键位虚线边框 + 倒计时圆环（stroke-dashoffset 动画）+ 准星变色
- 深度暗示必须根据 landmark.z 调整光标 scale/opacity/blur，禁止忽略 z 值
- 识别置信度必须分 4 档可视化（≥0.8 全亮 / 0.5-0.8 半透明 / <0.5 虚线频闪 / 丢失渐隐），禁止全置信度统一渲染
- 手势状态指示器必须显示当前手势（INDEX/OPEN/FIST/PINCH/V），用 SVG 线稿禁止 emoji
- 食指轨迹拖尾必须保留最近 30 帧（0.5s），按年龄渐隐线宽和透明度
- 手部进入/离开必须有过渡动画（进入200ms像素解构汇聚 / 离开250ms电光消散），禁止突兀出现消失
- 双手区分通过食指准星色（左手硫黄/右手血橙），骨架统一电光青，禁止用品红或其他非白名单色区分
- 手部可视化必须用 requestAnimationFrame + ref 直接操作 DOM/SVG/Canvas，禁止用 React state 驱动每帧重绘
- 性能预算：手部可视化总渲染时间 < 3.4ms/帧（60fps 下占比 < 21%）
- 检查：对照 7.10.1-7.10.11 逐项核对，缺任一子节实现 → FAIL

# SELF-CHECK（产出前必须自检，任一条 FAIL 必须修正后再交付）
1. [ ] 扫描所有 font-family 声明，无禁止字体
2. [ ] 扫描所有颜色值，均在白名单内
3. [ ] 墨绘态元素无雷霆态变量/纹理，反之亦然
4. [ ] 所有墨绘态背景叠加 .parchment-bg，绘制画布叠加 .staff-watermark
5. [ ] 所有雷霆态背景叠加 .scanline-overlay，关键文字叠加 .chromatic-text，卡片叠加 .holo-border
6. [ ] 所有 border-radius ≤ 8px
7. [ ] 无 emoji 作为功能图标
8. [ ] 双态过渡动画完整实现 9 阶段
9. [ ] 触发光效完整实现 6 层（reduced-motion 下 3 层）
10. [ ] 乐器展示元素绑定正确灵格色
11. [ ] 无 Material Design 阴影层级
12. [ ] 无对称网格布局（含非对称/破格元素）
13. [ ] 无大面积纯色背景（均叠加纹理）
14. [ ] 所有动效含物理隐喻（非通用 fade/slide）
15. [ ] 手部骨架渲染全部 21 个 landmarks + 19 条骨骼线，用 SVG 每帧重绘
16. [ ] 食指尖准星实现 5 态状态机（idle/hovering/triggering/lost/hidden），无遗漏
17. [ ] 悬停预热反馈含 3 要素：键位虚线框 + 倒计时圆环 + 准星变色
18. [ ] 识别置信度分 4 档可视化，手势指示器用 SVG 线稿无 emoji，食指拖尾保留 30 帧
19. [ ] 手部可视化用 requestAnimationFrame + ref 驱动，无 React state 每帧重绘

# OUTPUT FORMAT
- 输出代码时，每个文件顶部必须用注释标注所属态：// @mode: ink | thunder | transition
- 新增组件必须说明使用了哪些设计语言规则（R1-R7）
- 若某规则不适用，必须显式说明原因（不能默认忽略）
- 审查代理产出报告时，必须逐条列出 C1-C10 和 SELF-CHECK 1-19 的检查结果（PASS/FAIL + 证据）
```

#### 7.1.4 审查代理强制检查清单

三方审查代理中的「功能审查员」（子代理 B）在审查前端 Task 时，除常规功能检查外，必须额外执行以下设计语言审查。任一检查项 FAIL，整体审查报告标记为 FAIL，禁止进入下一 Task。

| # | 检查项 | 检查方法 | FAIL 处理 |
|---|--------|---------|----------|
| D1 | 字体白名单 | grep 所有 font-family 声明，比对 C1 禁止列表 | 命中禁止字体 → FAIL，要求重写 |
| D2 | 配色白名单 | grep 所有 color/background/border/stroke/fill 值，比对 C2 白名单 | 命中禁止色或非白名单色 → FAIL |
| D3 | 双态隔离 | 按 data-mode 分组样式，交叉检查变量使用 | 跨态变量泄漏 → FAIL |
| D4 | 纹理强制 | 检查页面/卡片/画布 className 是否含对应纹理类 | 缺失纹理类 → FAIL |
| D5 | 圆角限制 | grep border-radius，检查 > 8px | 超限 → FAIL |
| D6 | 图标系统 | 扫描 emoji 字符作为功能图标，含手势指示器 | 命中 → FAIL |
| D7 | 动效完整性 | 对照 7.9 节 9 阶段时间轴核对实现 | 缺阶段或简化 → FAIL |
| D8 | 触发光效 | 对照 7.11 节 L1-L6 核对实现 | 缺层 → FAIL（reduced-motion 下 L3/L5/L6 可缺） |
| D9 | 灵格色绑定 | 核对乐器相关组件的灵格色映射 | 错误或缺失 → FAIL |
| D10 | 非对称构图 | 检查页面布局是否含非对称/破格元素 | 全对称网格 → FAIL |
| D11 | 动效隐喻 | 检查所有动效是否含物理隐喻 | 通用 fade/slide 无隐喻 → FAIL |
| D12 | 纯色背景 | 检查大面积背景是否叠加纹理 | 纯色无纹理 → FAIL |
| D13 | 手部骨架完整性 | 核对 21 个 landmarks + 19 条骨骼线是否全部渲染 | 缺点或缺线 → FAIL |
| D14 | 准星状态机 | 核对食指尖准星 5 态（idle/hovering/triggering/lost/hidden）是否完整 | 缺态 → FAIL |
| D15 | 悬停预热反馈 | 核对 3 要素（虚线框 + 倒计时圆环 + 准星变色）是否同时实现 | 缺要素 → FAIL |
| D16 | 置信度与手势 | 核对置信度 4 档可视化 + 手势指示器 SVG 线稿（非 emoji）+ 拖尾 30 帧 | 缺档/用 emoji/拖尾不足 → FAIL |
| D17 | 性能与驱动方式 | 核对手部可视化用 requestAnimationFrame + ref 驱动，非 React state；总渲染 < 3.4ms/帧 | 用 state 驱动或超预算 → FAIL |


#### 7.1.5 设计语言执行流程

AI 在每个前端 Task 中的执行流程必须如下：

1. **读取本节** → 确认理解 D1-D8 特征向量、R1-R7 规则集、C1-C9 约束
2. **识别态** → 判断当前 Task 产出属于 ink / thunder / transition 哪种态
3. **推导样式** → 按 R1-R7 规则逐一推导字体/配色/纹理/动效
4. **生成代码** → 文件顶部标注 `// @mode: ink|thunder|transition`，注释说明使用了哪些规则
5. **自检** → 执行 SELF-CHECK 1-14，全部 PASS 才交付
6. **接受审查** → 审查代理按 D1-D12 逐项检查，全 PASS 才进入下一 Task


### 7.2 设计概念

| 维度 | 墨绘态（绘制阶段） | 雷霆态（MR 演奏阶段） |
|------|--------------------|----------------------|
| 气质 | 中世纪炼金术手稿、修道院抄经室 | CRT 显示器残影、电磁幽灵、霓虹降神 |
| 背景 | 羊皮纸纹理 + 灰褐山脉河流底纹 | 深渊黑 + Scanline + Chromatic Aberration |
| 主色 | 朱砂红印章 + 暗金箔装饰 | 电光青全息 + 血橙触发 + 硫黄高光 |
| 字体 | Cormorant Garamond + Noto Serif SC | JetBrains Mono + Noto Serif SC |
| 动效 | 墨迹晕染、卷轴展开、印章烙下 | 扫描线扫过、像素解构、电光汇聚 |
| 隐喻 | 在纸上画下符印，召唤未生的声音 | 通电的瞬间，符印从纸面浮起，化作悬浮的全息乐器 |

**核心叙事**：用户在羊皮纸上以朱砂墨绘制乐器符印——这是「墨绘符印」；点击「唤声」按钮，纸面燃烧溶解，符印从二维升起为三维全息投射，摄像头开启，手指隔空触碰即发声——这是「雷霆唤声」。

### 7.3 字体系统

```css
/* 显示字体：标题、乐器名、章节大字 */
--font-display: 'Cormorant Garamond', 'Noto Serif SC', serif;
/* 正文衬线：描述、说明、段落 */
--font-body: 'Spectral', 'Noto Serif SC', serif;
/* 等宽字体：数据、坐标、频率、FPS、音符序列 */
--font-mono: 'JetBrains Mono', 'Courier New', monospace;
/* 中文衬线兜底 */
--font-cn: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
```

**字号阶梯**（桌面端，移动端按 0.85 系数缩放）：

| Token | 字号 | 字重 | 字距 | 用途 |
|-------|------|------|------|------|
| display-hero | 72px | 300 | -0.02em | 首页主标题、空状态大字 |
| display-1 | 48px | 500 | -0.01em | 页面主标题 |
| display-2 | 32px | 600 | 0 | 章节标题、卡片标题 |
| body-lg | 18px | 400 | 0 | 引导文、重要正文 |
| body | 15px | 400 | 0.01em | 默认正文 |
| caption | 12px | 500 | 0.08em | 标签、辅助说明（大写英文） |
| data | 14px | 500 | 0.05em | 数据、坐标、频率 |

**严禁**：Inter / Roboto / Arial / system-ui / Space Grotesk / Geist。中文严禁使用默认黑体（PingFang/微软雅黑）作为正文衬线场景。

### 7.4 配色系统

#### 7.4.1 墨绘态 CSS 变量

```css
[data-mode="ink"] {
  /* 纸基底色——仿古羊皮纸，三层叠加避免纯色塑料感 */
  --parchment-base: #F1E4C8;       /* 主羊皮纸 */
  --parchment-deep: #E8D5A8;       /* 深羊皮纸（卡片背景） */
  --parchment-shadow: #C9B583;     /* 阴影区羊皮纸 */

  /* 墨色——三层灰度，模拟墨的浓淡干湿 */
  --ink-full: #1A1410;             /* 浓墨（标题、主文字） */
  --ink-mid: #4A3F2E;              /* 中墨（正文） */
  --ink-faint: #8B7A5C;            /* 淡墨（辅助、说明） */

  /* 朱砂——印章与重点强调 */
  --cinnabar: #B33A2C;             /* 朱砂主色 */
  --cinnabar-deep: #8C2A1F;        /* 深朱砂（hover/active） */
  --cinnabar-glow: rgba(179, 58, 44, 0.25); /* 朱砂光晕 */

  /* 暗金——装饰线条、边框、分隔符 */
  --gold-dark: #A87C2C;            /* 暗金箔 */
  --gold-faint: #C9A35C;           /* 淡金 */

  /* 山河底纹——羊皮纸上的灰褐色山脉河流 */
  --terrain: #9B8B6B;              /* 山脉河流线 */
  --terrain-faint: rgba(155, 139, 107, 0.15); /* 底纹浅色 */

  /* 状态色——保持墨绘调性 */
  --success: #5C7A3D;              /* 苔绿（成功） */
  --warning: #C77A2C;              /* 赭黄（警告） */
  --error: #8C2A1F;                /* 深朱砂（错误） */
}
```

#### 7.4.2 雷霆态 CSS 变量

```css
[data-mode="thunder"] {
  /* 深渊底色——不是纯黑，是通电的暗 */
  --abyss-base: #050407;           /* 主背景（带紫蓝暗调） */
  --abyss-deep: #0A0810;           /* 卡片背景 */
  --abyss-grid: rgba(0, 240, 255, 0.04); /* 网格线极淡青 */

  /* 电光青——主交互色、全息投射色 */
  --cyan-bright: #00F0FF;          /* 电光青 */
  --cyan-mid: #00B8C4;             /* 中青 */
  --cyan-faint: rgba(0, 240, 255, 0.15); /* 青光晕 */

  /* 血橙——触发、激活、警示 */
  --blood-orange: #FF4A1C;         /* 血橙主色 */
  --blood-deep: #C73814;           /* 深血橙 */
  --blood-glow: rgba(255, 74, 28, 0.35); /* 血橙光晕 */

  /* 硫黄——高光、强调、峰值 */
  --sulfur: #FFCC33;               /* 硫黄 */
  --sulfur-faint: rgba(255, 204, 51, 0.2);

  /* 文字——通电的白 */
  --text-bright: #E8F4F8;          /* 主文字（带青调） */
  --text-mid: #8BA0A8;             /* 中文字 */
  --text-faint: #4A5860;           /* 淡文字 */

  /* 状态色——保持电磁调性 */
  --success: #00FFA3;              /* 荧光绿 */
  --warning: #FFCC33;              /* 硫黄 */
  --error: #FF4A1C;                /* 血橙 */
}
```

#### 7.4.3 五种乐器灵格色

每件乐器都有自己的「灵格色」，在墨绘态作为印章颜色，在雷霆态作为全息投射色：

| 乐器 | 墨绘印章色 | 雷霆全息色 | 灵格含义 |
|------|-----------|-----------|---------|
| 钢琴 | #2C4A7C（青金石蓝） | #00B4FF（电光蓝） | 沉静的水，理性的波动 |
| 吉他 | #B33A2C（朱砂红） | #FF6B35（橙红电弧） | 灼热的木，跳跃的火舌 |
| 小提琴 | #A87C2C（暗金） | #FFCC33（硫黄） | 流动的金，缠绵的丝弦 |
| 长笛 | #5C7A3D（苔绿） | #00FFA3（荧光绿） | 林间的风，清越的气流 |
| 架子鼓 | #5C2C7C（紫水晶） | #B829FF（电紫） | 雷霆的骨，沉稳的震颤 |

### 7.5 视觉细节库

#### 7.5.1 羊皮纸纹理（墨绘态背景）

用 SVG feTurbulence 生成程序化噪声，避免外部图片依赖：

```css
.parchment-bg {
  background-color: var(--parchment-base);
  background-image:
    /* 第一层：粗纤维噪声 */
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.6 0 0 0 0 0.5 0 0 0 0 0.3 0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),
    /* 第二层：污渍渐变 */
    radial-gradient(ellipse at 20% 30%, rgba(168, 124, 44, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(139, 58, 32, 0.06) 0%, transparent 40%),
    /* 第三层：边缘暗角 */
    radial-gradient(ellipse at center, transparent 60%, rgba(74, 63, 46, 0.12) 100%);
}
```

#### 7.5.2 破损边缘 mask（羊皮纸不规则边缘）

```css
.torn-edge {
  /* 用 SVG mask 模拟羊皮纸撕裂边缘，避免规整矩形 */
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' preserveAspectRatio='none'%3E%3Cpath d='M0,20 Q20,5 40,15 T80,10 Q100,20 120,8 T160,12 ... L1200,780 L0,780 Z' fill='black'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' preserveAspectRatio='none'%3E%3Cpath d='M0,20 Q20,5 40,15 ...' fill='black'/%3E%3C/svg%3E");
}
```

#### 7.5.3 朱砂印章（乐器标识）

每个乐器在墨绘态以朱砂印章形式出现，印章为方形篆体字 + 朱砂边框，略有旋转角度（-3°~3°）和透明度变化（0.85~0.95）模拟手盖印章的不均匀：

```css
.cinnabar-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: var(--cinnabar);
  color: var(--parchment-base);
  font-family: var(--font-cn);
  font-weight: 700;
  font-size: 24px;
  border-radius: 4px;
  transform: rotate(var(--seal-rotate, -2deg));
  opacity: var(--seal-opacity, 0.92);
  box-shadow:
    inset 0 0 0 2px var(--cinnabar-deep),
    0 2px 8px rgba(140, 42, 31, 0.3);
  /* 印章不均匀效果——用径向渐变模拟墨色浓淡 */
  background-image: radial-gradient(circle at 30% 40%, transparent 60%, rgba(0,0,0,0.15) 100%);
}
```

#### 7.5.4 五线谱水印（绘制画布底纹）

绘制画布的羊皮纸上叠加极淡的五线谱水印，提示"这是用来画声音的纸"：

```css
.staff-watermark {
  background-image:
    linear-gradient(to bottom, transparent calc(50% - 24px), var(--terrain-faint) calc(50% - 24px), var(--terrain-faint) calc(50% - 23px), transparent calc(50% - 23px)),
    linear-gradient(to bottom, transparent calc(50% - 12px), var(--terrain-faint) calc(50% - 12px), var(--terrain-faint) calc(50% - 11px), transparent calc(50% - 11px)),
    linear-gradient(to bottom, transparent calc(50%), var(--terrain-faint) calc(50%), var(--terrain-faint) calc(50% + 1px), transparent calc(50% + 1px)),
    linear-gradient(to bottom, transparent calc(50% + 12px), var(--terrain-faint) calc(50% + 12px), var(--terrain-faint) calc(50% + 13px), transparent calc(50% + 13px)),
    linear-gradient(to bottom, transparent calc(50% + 24px), var(--terrain-faint) calc(50% + 24px), var(--terrain-faint) calc(50% + 25px), transparent calc(50% + 25px));
}
```

#### 7.5.5 Scanline（雷霆态扫描线）

```css
.scanline-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 2px,
    rgba(0, 240, 255, 0.03) 2px,
    rgba(0, 240, 255, 0.03) 3px
  );
  /* 缓慢滚动的扫描线 */
  animation: scanline-roll 8s linear infinite;
}

@keyframes scanline-roll {
  from { background-position: 0 0; }
  to { background-position: 0 100px; }
}
```

#### 7.5.6 Chromatic Aberration（色差错位）

雷霆态的关键文字（标题、乐器名）应用 RGB 通道错位，模拟 CRT 色散：

```css
.chromatic-text {
  text-shadow:
    1px 0 0 rgba(255, 0, 80, 0.7),
    -1px 0 0 rgba(0, 240, 255, 0.7);
}
```

#### 7.5.7 全息边框（雷霆态卡片）

```css
.holo-border {
  position: relative;
  border: 1px solid var(--cyan-faint);
  background: rgba(0, 240, 255, 0.02);
}
.holo-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  border: 1px solid transparent;
  background: linear-gradient(135deg, var(--cyan-bright), transparent 30%, transparent 70%, var(--blood-orange)) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

### 7.6 组件设计规范

#### 7.6.1 刻印按钮 btn-engrave（墨绘态主按钮）

```css
.btn-engrave {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.05em;
  padding: 14px 32px;
  background: var(--ink-full);
  color: var(--parchment-base);
  border: 1px solid var(--gold-dark);
  border-radius: 0;  /* 直角，像刻印 */
  position: relative;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  /* 内嵌阴影模拟刻痕 */
  box-shadow:
    inset 0 1px 0 rgba(168, 124, 44, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4),
    0 2px 0 var(--ink-mid);
}
.btn-engrave:hover {
  background: var(--cinnabar);
  border-color: var(--cinnabar-deep);
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 180, 0.3),
    0 4px 12px var(--cinnabar-glow);
}
.btn-engrave:active {
  transform: translateY(1px);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
}
```

#### 7.6.2 全息按钮 btn-holo（雷霆态主按钮）

```css
.btn-holo {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 12px 28px;
  background: transparent;
  color: var(--cyan-bright);
  border: 1px solid var(--cyan-bright);
  border-radius: 0;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  /* 全息光晕 */
  text-shadow: 0 0 8px var(--cyan-faint);
  box-shadow:
    inset 0 0 12px rgba(0, 240, 255, 0.1),
    0 0 8px rgba(0, 240, 255, 0.2);
}
.btn-holo:hover {
  background: rgba(0, 240, 255, 0.1);
  border-color: var(--cyan-bright);
  box-shadow:
    inset 0 0 20px rgba(0, 240, 255, 0.2),
    0 0 16px var(--cyan-faint);
}
.btn-holo:active {
  background: var(--cyan-bright);
  color: var(--abyss-base);
  text-shadow: none;
}
```

#### 7.6.3 卷轴卡片 card-scroll（墨绘态卡片）

```css
.card-scroll {
  background: var(--parchment-deep);
  border: 1px solid var(--gold-faint);
  padding: 24px;
  position: relative;
  /* 上下用暗金细线模拟卷轴轴杆 */
  border-top: 3px solid var(--gold-dark);
  border-bottom: 3px solid var(--gold-dark);
}
.card-scroll::before,
.card-scroll::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--ink-faint);
}
.card-scroll::before { top: 8px; }
.card-scroll::after { bottom: 8px; }
```

#### 7.6.4 全息卡片 card-holo（雷霆态卡片）

```css
.card-holo {
  background: var(--abyss-deep);
  border: 1px solid var(--cyan-faint);
  padding: 20px;
  position: relative;
  /* 全息边框 */
}
.card-holo::before {
  /* 左上角装饰——技术读数风格 */
  content: attr(data-tag);
  position: absolute;
  top: 8px;
  right: 12px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-faint);
  letter-spacing: 0.15em;
}
```

#### 7.6.5 双态 Toast

```css
/* 墨绘态 Toast——羊皮纸卷轴条 */
.toast-ink {
  background: var(--parchment-deep);
  color: var(--ink-full);
  border-left: 4px solid var(--cinnabar);
  font-family: var(--font-body);
}

/* 雷霆态 Toast——电光警报条 */
.toast-thunder {
  background: var(--abyss-deep);
  color: var(--cyan-bright);
  border-left: 4px solid var(--blood-orange);
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.05em;
  text-shadow: 0 0 6px var(--cyan-faint);
}
```

### 7.7 页面清单与排版特点

| 路由 | 页面 | 墨绘态/雷霆态 | 排版特点 |
|------|------|--------------|---------|
| / | 首页 | 墨绘 | hero 大标题用 Cormorant 300 字重 72px；下方五枚朱砂印章横排展示五件乐器；卷轴卡片承载介绍文字；山河底纹若隐若现 |
| /workbench | 工作台 | 双态切换 | 顶部状态栏（Cormorant + JetBrains Mono 数据）；绘制区羊皮纸画布 + 五线谱水印；点击「唤声」进入雷霆态，2.4s 过渡动画 |
| /songs | 曲库 | 墨绘 | 曲目以卷轴卡片列表呈现，每张卡片左侧朱砂印章为曲目编号，右侧暗金分隔线 |
| /songs/:id | 曲目详情 | 墨绘 | 主标题 display-1；乐谱区用 JetBrains Mono 等宽音符序列；右下角朱砂印章「习」表示可练习 |
| /challenge | 挑战 | 墨绘 | 今日曲目大卡片 + 朱砂「今日」印章；历史挑战列表 |
| /my-clips | 我的分享 | 墨绘 | 网格卡片，每张卡片左上角朱砂印章为乐器灵格色 |
| /profile | 个人中心 | 墨绘 | 顶部用户信息卡（卷轴样式）；下方统计数据用 JetBrains Mono 等宽字体；演奏记录列表 |
| /login | 登录注册 | 墨绘 | 居中卷轴卡片；标题 display-1；表单字段下划线为暗金细线 |

### 7.8 工作台双态布局

#### 7.8.1 墨绘态布局（绘制阶段）

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚜ SOUND/SHAPE     phase: 研墨  ·  乐器: --  ·  笔画: 0  ·  FPS:60  │  ← 顶栏（Cormorant + JetBrains Mono）
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ╭─── 卷轴 ───────────────────────────────────────────╮       │
│    │                                                      │       │
│    │   [画乐器符印]  [画抽象形状]      ← Tab（暗金下划线）│       │
│    │                                                      │       │
│    │   ┌────────────────────────────────────────────┐    │       │
│    │   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │    │       │
│    │   │ ░░░░░░░  羊皮纸画布 + 五线谱水印  ░░░░░░░░░ │    │       │
│    │   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │    │       │
│    │   │        （右上角：乐器符印模板缩略图）       │    │       │
│    │   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │    │       │
│    │   └────────────────────────────────────────────┘    │       │
│    │                                                      │       │
│    │   [清空]   灵敏度 ━━●━━━━   [⚡ 唤声]              │       │
│    │                                                      │       │
│    ╰──────────────────────────────────────────────────────╯       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 7.8.2 雷霆态布局（MR 演奏阶段）

```
┌─────────────────────────────────────────────────────────────────┐
│  ▓ SOUND/SHAPE    phase: 唤声  ·  KEY: 钢琴  ·  N:0  ·  FPS:60  │  ← 顶栏（Chromatic Aberration）
├─────────────────────────────────────────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← Scanline 覆盖层
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░ 摄像头画面（镜像，全屏） ░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ──────────────── 地平线（45% 处）───────────────────────────── │  ← 虚拟桌面分界
│ ░░░░░░░░░░░ 虚拟桌面阴影（梯形透视） ░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░ 全息乐器投射（电光青线框 + 灵格色填充）░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░ 食指尖光标（血橙十字准星 + 硫黄光晕）░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                                                 │
│   [⏸ 暂停]   [● 录制]   灵敏度 ━━●━━━━   [✕ 退出]            │  ← 全息按钮组
└─────────────────────────────────────────────────────────────────┘
```

### 7.9 双态过渡动画「墨绘符印 → 雷霆唤声」

用户点击「唤声」按钮后，2.4s 的转场动画（不可跳过，但可加速）：

| 时间 | 阶段 | 动画 | 实现 |
|------|------|------|------|
| 0ms | 起始 | 墨绘态静止 | data-mode="ink" |
| 200ms | 印章激活 | 用户绘制的符印中心亮起朱砂光点 | box-shadow 扩散 |
| 400ms | 燃烧溶解 | 朱砂光点向四周扩散，纸面从中心开始变黑、卷曲、溶解 | burn-dissolve 关键帧（CSS filter + opacity） |
| 800ms | 扫描线扫过 | 一道亮白扫描线从上到下扫过画面 | scanline-sweep 关键帧 |
| 1200ms | 黑场转场 | 全屏纯黑，仅剩画面中心的电光青光点 | 全屏黑遮罩 |
| 1400ms | 摄像头开启 | 摄像头画面以光点为中心向外辐射展开 | radial-gradient + scale |
| 1800ms | 全息投射 | 绘制的符印从二维升起为三维全息乐器，从远端向近端透视展开 | holo-emerge 关键帧（transform + perspective） |
| 2200ms | 网格上线 | 虚拟桌面网格淡入，地平线出现 | opacity 渐变 |
| 2400ms | 完成 | 状态变为 tracking，提示「以食指隔空触碰」 | data-mode="thunder" |

```css
@keyframes burn-dissolve {
  0% { filter: brightness(1) contrast(1); opacity: 1; }
  50% { filter: brightness(1.5) contrast(1.3) saturate(1.5); opacity: 0.8; }
  100% { filter: brightness(0.3) contrast(2) saturate(0); opacity: 0; }
}

@keyframes scanline-sweep {
  0% { transform: translateY(-100%); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(100vh); opacity: 0; }
}

@keyframes holo-emerge {
  0% { transform: perspective(800px) rotateX(90deg) scale(0.3); opacity: 0; filter: blur(8px); }
  60% { opacity: 0.6; filter: blur(2px); }
  100% { transform: perspective(800px) rotateX(45deg) scale(1); opacity: 1; filter: blur(0); }
}
```

### 7.10 手部追踪可视化系统（MR 演奏阶段核心交互）

> 本节定义 MediaPipe 识别到的手部数据如何被实时渲染为可视化的「电磁幽灵之手」。
> 目标：让用户清晰看到"系统识别到了我的手、我的手指在哪里、我离触发还有多远"，把黑盒识别变成可见的交互对话。
> 所有手部可视化必须符合「雷霆唤声」电磁幽灵美学——骨骼是电光线框，关节是发光节点，食指尖是准星，移动留下电磁残影。

#### 7.10.1 21 点骨架渲染

MediaPipe Hands 输出 21 个 landmarks（0=手腕，1-4=拇指，5-8=食指，9-12=中指，13-16=无名指，17-20=小指）。必须全部渲染，禁止只渲染食指尖。

**骨骼连线**（19 条）：

```css
/* 骨骼线条样式 */
.hand-skeleton-line {
  stroke: var(--cyan-bright);
  stroke-width: 1.5px;
  stroke-linecap: round;
  filter: drop-shadow(0 0 3px var(--cyan-faint));
  opacity: 0.9;
}
```

**关节节点**（21 个）：

| 节点类型 | 节点编号 | 渲染 | CSS |
|---------|---------|------|-----|
| 手腕锚点 | 0 | 5px 实心圆 + 10px 外发光 | fill: var(--cyan-bright); r:5; filter: blur(2px) |
| 指根关节 | 1,5,9,13,17 | 3px 实心圆 | fill: var(--cyan-bright); r:3 |
| 指间关节 | 2,3,6,7,10,11,14,15,18,19 | 2.5px 实心圆 | fill: var(--cyan-mid); r:2.5 |
| 指尖节点 | 4,12,16,20 | 4px 实心圆 + 6px 外发光 + 硫黄高光 | fill: var(--sulfur); r:4; filter: blur(1px) |
| 食指尖（特殊） | 8 | 见 7.10.3 准星 | — |

**渲染方式**：用单个 `<svg>` 覆盖在摄像头画面上，每帧重绘 21 个 `<circle>` + 19 条 `<line>`。禁止用 DOM 元素堆叠（性能差）。

#### 7.10.2 双手区分方案

两手骨架主色均为电光青（保持全息统一感），通过**食指尖准星颜色**区分左右手，避免在画面中引入第二种主色破坏配色系统。

| 手别 | 骨架色 | 食指尖准星色 | 手腕锚点标记 |
|------|--------|-------------|-------------|
| 左手 | var(--cyan-bright) #00F0FF | var(--sulfur) #FFCC33 硫黄 | 左下角"L"标签 |
| 右手 | var(--cyan-bright) #00F0FF | var(--blood-orange) #FF4A1C 血橙 | 右下角"R"标签 |

> 注意：原 5.4 节"左手青、右手品红"的方案违反配色白名单（品红不在雷霆态变量中），本节以准星色区分替代，5.4 节视觉描述以此为准。

#### 7.10.3 食指尖准星（核心交互锚点）

食指尖（landmark 8）是触发虚拟键的唯一锚点，必须最高优先级渲染：

```css
.index-cursor {
  /* 十字准星——两条交叉线 */
  position: absolute;
  width: 24px;
  height: 24px;
  pointer-events: none;
  transform: translate(-50%, -50%);
}
.index-cursor::before,
.index-cursor::after {
  content: '';
  position: absolute;
  background: var(--cursor-color, var(--blood-orange));
  box-shadow: 0 0 8px var(--cursor-color, var(--blood-orange));
}
.index-cursor::before {
  /* 水平线 */
  left: 0; right: 0; top: 50%;
  height: 2px;
  transform: translateY(-50%);
}
.index-cursor::after {
  /* 垂直线 */
  top: 0; bottom: 0; left: 50%;
  width: 2px;
  transform: translateX(-50%);
}
/* 中心亮点 */
.index-cursor > .core {
  position: absolute;
  top: 50%; left: 50%;
  width: 4px; height: 4px;
  background: var(--text-bright);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 6px var(--text-bright);
}
```

准星状态机（5 态）：

| 状态 | 触发条件 | 视觉 | 尺寸 | 光晕 |
|------|---------|------|------|------|
| idle | 食指在画面但不在桌面区域 | 准星色 + 半透明 | 24px | 8px blur |
| hovering | 食指投影在键位扩展区但未触发 | 准星色变硫黄 + 不透明 | 28px | 12px blur |
| triggering | 命中触发（150ms 内） | 硫黄 + 全亮 + 脉冲 | 36px | 20px blur |
| lost | 识别丢失（< 0.5 置信度） | 虚线准星 + 频闪 | 24px | 无 |
| hidden | 手离开画面 | 渐隐 200ms 后隐藏 | — | — |

#### 7.10.4 悬停预热反馈（交互感关键）

当食指尖投影进入某虚拟键的扩展区域（sensitivity 扩展后）但尚未满足触发条件（cooldown 未过或停留时间不足）时，必须显示"即将触发"的预热视觉：

**键位预热状态**：

```css
/* 键位悬停——虚线边框 + 倒计时圆环 */
.key-hover {
  border: 1px dashed var(--cyan-bright);
  box-shadow: inset 0 0 8px var(--cyan-faint);
}
/* 倒计时圆环——SVG circle，stroke-dashoffset 从周长到 0 */
.key-hover-ring {
  stroke: var(--sulfur);
  stroke-width: 2;
  fill: none;
  /* 周长 = 2πr，dashoffset 动画从周长到 0 */
  animation: ring-fill var(--hover-duration, 150ms) linear forwards;
}
@keyframes ring-fill {
  from { stroke-dashoffset: var(--circumference); }
  to { stroke-dashoffset: 0; }
}
```

**预热反馈逻辑**：

```typescript
// 每帧检测食指与键位的关系
function getHoverState(indexTipProjected, keys, sensitivity): HoverState {
  if (!indexTipProjected) return { type: 'idle' };
  for (const key of keys) {
    const dx = key.bounds.x + key.bounds.width / 2;
    const dy = key.bounds.y + key.bounds.height / 2;
    const halfW = (key.bounds.width * (0.5 + sensitivity / 100 * 0.4)) / 2;
    const halfH = (key.bounds.height * (0.5 + sensitivity / 100 * 0.4)) / 2;
    if (Math.abs(indexTipProjected.x - dx) < halfW &&
        Math.abs(indexTipProjected.y - dy) < halfH) {
      const sinceLast = Date.now() - key.lastTriggeredAt;
      if (sinceLast > 150) return { type: 'triggering', keyId: key.id };
      return {
        type: 'hovering',
        keyId: key.id,
        progress: sinceLast / 150, // 0-1，圆环填充比例
      };
    }
  }
  return { type: 'idle' };
}
```

**用户感知**：看到虚线框 + 倒计时圆环填满 → 明确知道"再停 150ms 就会触发"，而非"为什么没声音"。

#### 7.10.5 深度暗示（Z 轴）

MediaPipe landmark.z 是相对深度（手腕为 0，越靠近相机 z 越负）。利用 z 渲染"幽灵远近"：

```typescript
// 根据食指尖 z 调整光标视觉
function applyDepth(cursor: HTMLElement, z: number) {
  // z 范围约 -0.1（近）到 0.1（远），归一化到 0-1
  const depth = Math.max(0, Math.min(1, (z + 0.1) / 0.2));
  // 近（depth=0）：大、亮、清晰
  // 远（depth=1）：小、暗、模糊
  cursor.style.transform = `translate(-50%, -50%) scale(${1.2 - depth * 0.4})`;
  cursor.style.opacity = `${1 - depth * 0.4}`;
  cursor.style.filter = `blur(${depth * 1.5}px)`;
}
```

**用户感知**：手抬起时光标变小变虚（"幽灵远去"），手压下时光标变大变实（"幽灵降临"），提供 Z 轴深度反馈。

#### 7.10.6 识别置信度可视化

MediaPipe 的 detectionConfidence 和 trackingConfidence 必须可视化，让用户知道"系统是否稳定识别到我"：

| 置信度范围 | 骨架视觉 | 准星视觉 | 提示 |
|-----------|---------|---------|------|
| ≥ 0.8（稳定） | 实线 + 全亮 | 实线 + 稳定 | 无 |
| 0.5-0.8（一般） | 实线 + 80% 透明度 | 实线 + 轻微闪烁（2Hz） | 画面顶部：「识别稳定中」 |
| < 0.5（不稳） | 虚线 + 50% 透明度 + 频闪（4Hz） | 虚线 + 频闪（4Hz） | 画面顶部：「识别不稳，请调整手部位置或光线」 |
| 丢失（无输出） | 渐隐 300ms 后消失 | 虚线准星定格最后位置 + 渐隐 | 画面顶部：「未检测到手部」 |

```css
/* 低置信度频闪 */
@keyframes confidence-flicker {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}
.skeleton-low-confidence {
  stroke-dasharray: 3 3;
  animation: confidence-flicker 0.25s steps(2) infinite;
}
```

#### 7.10.7 手势状态指示器

在画面右上角显示当前识别到的手势状态（用 SVG 图标 + 文字标签，禁止 emoji）：

| 手势 | 识别条件 | SVG 图标 | 文字标签 | 是否可触发 |
|------|---------|---------|---------|-----------|
| 食指伸出 | 食指伸直 + 其他四指弯曲 | 一根伸出的手指线稿 | "INDEX" | 是（触发态） |
| 五指张开 | 五指均伸直 | 五指张开手掌线稿 | "OPEN" | 否 |
| 握拳 | 五指均弯曲 | 拳头线稿 | "FIST" | 否 |
| 捏合 | 拇指食指距离 < 0.05 | 拇指食指相捏线稿 | "PINCH" | 否（预留模式切换） |
| Victor | 食指中指伸直 + 其他弯曲 | V 字线稿 | "V" | 否（预留快捷键） |

```css
.gesture-indicator {
  position: fixed;
  top: 60px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--abyss-deep);
  border: 1px solid var(--cyan-faint);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--cyan-bright);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.gesture-indicator svg {
  width: 16px;
  height: 16px;
  stroke: var(--cyan-bright);
  stroke-width: 1.5;
  fill: none;
}
```

#### 7.10.8 食指轨迹拖尾（电磁残影）

食指尖移动时留下 0.5s 渐隐的拖尾，像 CRT 电磁残影：

```typescript
// 保留最近 30 帧（约 0.5s @60fps）的食指尖坐标
const trailPoints: Array<{x: number, y: number, t: number}> = [];
const TRAIL_MAX = 30;
const TRAIL_DURATION = 500; // ms

function updateTrail(x: number, y: number) {
  const now = Date.now();
  trailPoints.push({ x, y, t: now });
  // 移除超过 0.5s 的点
  while (trailPoints.length > 0 && now - trailPoints[0].t > TRAIL_DURATION) {
    trailPoints.shift();
  }
  // 上限保护
  if (trailPoints.length > TRAIL_MAX) trailPoints.shift();
}

function drawTrail(ctx: CanvasRenderingContext2D, handColor: string) {
  if (trailPoints.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < trailPoints.length; i++) {
    const p0 = trailPoints[i - 1];
    const p1 = trailPoints[i];
    const age = (Date.now() - p1.t) / TRAIL_DURATION; // 0=最新, 1=最旧
    ctx.strokeStyle = handColor;
    ctx.globalAlpha = (1 - age) * 0.6;
    ctx.lineWidth = (1 - age) * 3;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
```

**用户感知**：快速移动手指时拖尾长且明显（像挥动电光），静止时拖尾消失。提供运动方向和速度的视觉反馈。

#### 7.10.9 手部进入/离开动画

手进入或离开摄像头画面时，必须有过渡动画，不能突兀出现/消失：

| 事件 | 动画 | 时长 | 实现 |
|------|------|------|------|
| 手进入画面（从边缘） | 像素解构汇聚：21 个关键点从随机位置以 ease-out 汇聚到识别位置，骨骼线随后连接 | 200ms | 关键点坐标插值 + 延迟连线 |
| 手离开画面 | 电光消散：骨骼线从指尖向手腕方向逐段消失，关节点频闪后渐隐 | 250ms | stroke-dashoffset 动画 + opacity |
| 短暂遮挡（< 300ms）后重现 | 骨架保持最后位置半透明，重现时不播放进入动画 | — | opacity 0.3 占位 |

```css
@keyframes hand-emerge {
  0% { opacity: 0; transform: scale(0.5); filter: blur(8px); }
  100% { opacity: 1; transform: scale(1); filter: blur(0); }
}
@keyframes hand-dissolve {
  0% { opacity: 1; filter: blur(0); }
  100% { opacity: 0; filter: blur(6px); }
}
```

#### 7.10.10 性能预算与实现约束

| 渲染对象 | 实现方式 | 每帧预算 | 上限 |
|---------|---------|---------|------|
| 21 点骨架 + 19 条骨骼 | 单个 SVG，每帧重绘 | < 1.5ms | 双手共 42 点 |
| 食指准星 | DOM 元素 + transform | < 0.5ms | 2 个 |
| 拖尾 | Canvas 2D path | < 1ms | 30 点/手 |
| 悬停圆环 | SVG circle + dashoffset | < 0.3ms | 1 个 |
| 手势指示器 | 静态 DOM，仅状态切换 | < 0.1ms | 1 个 |
| **总计** | — | **< 3.4ms** | 60fps 帧预算 16.6ms，占比 < 21% |

**实现约束**：
- 所有手部可视化绘制在专用的 `HandOverlay` 组件中，层级在摄像头画面之上、Scanline 之下
- 禁止用 React state 驱动每帧重绘（会触发重渲染风暴），必须用 `requestAnimationFrame` + ref 直接操作 DOM/SVG/Canvas
- 双手时两个骨架共享一个 SVG，避免多层 SVG 叠加
- 拖尾用独立 Canvas 层，避免与 SVG 重绘冲突

#### 7.10.11 手部可视化与触发光效的衔接

本节定义的"持续可视化"与 7.11 节定义的"事件触发光效"必须协同工作：

| 时刻 | 持续可视化状态 | 事件光效状态 |
|------|--------------|-------------|
| 食指接近键位（hovering） | 准星变硫黄 + 键位虚线框 + 倒计时圆环 | 无 |
| 触发瞬间（triggering） | 准星脉冲扩大 + 食指光晕变硫黄（L4） | L1-L6 全部触发 |
| 触发后 150ms 内（cooldown） | 准星回到 idle 态 + 键位虚线框消失 | L2-L6 渐隐中 |
| 手离开键位区域 | 准星回到 idle 态 | 无 |

**关键约束**：7.11 节的 L4「食指光晕」必须与本节的准星状态机联动，不能是两套独立的食指视觉效果。L4 触发时，准星从 hovering 态直接进入 triggering 态（硫黄 + 36px + 20px 光晕），而非叠加第二层光晕。


### 7.11 触发光效（MR 演奏阶段）

当食指尖投影到虚拟桌面并触发某个虚拟键时，触发 6 层光效（叠加，总时长 600ms）：

| 层 | 名称 | 时机 | 视觉 | 实现 |
|----|------|------|------|------|
| L1 | 键位高亮 | 0ms | 被触发的虚拟键填充灵格色，外发光 | box-shadow + background |
| L2 | 涟漪扩散 | 0ms | 从键位中心向外扩散的圆形涟漪（灵格色） | ripple 关键帧（scale + opacity） |
| L3 | 粒子爆发 | 50ms | 8-12 个粒子从键位向外飞溅（硫黄色） | canvas 粒子系统 |
| L4 | 食指光晕 | 0ms | 食指尖光标从血橙变为硫黄，光晕扩大 2 倍 | box-shadow 扩散 |
| L5 | 扫描线脉冲 | 100ms | 一道扫描线从键位向上扫过画面顶部 | scanline-pulse 关键帧 |
| L6 | 屏幕震屏 | 0ms | 整个画面轻微抖动（强度 2px，持续 80ms） | transform translate |

### 7.12 响应式断点

| 断点 | 宽度 | 适配 | 关键调整 |
|------|------|------|---------|
| desktop | ≥1280px | 桌面浏览器（主场景） | 完整布局，画布 800×500，全息区域全屏 |
| tablet | 768-1279px | 平板/小笔记本 | 画布 600×375，顶栏简化为单行，按钮缩小 10% |
| mobile | <768px | 手机（降级模式） | 画布 320×200，MR 演奏强制横屏提示，部分光效关闭（L3/L5） |

移动端降级提示：「墨绘符印在小屏上难以施展，请于桌面浏览器体验完整的雷霆唤声」。

### 7.13 可访问性

- **reduced-motion**：`@media (prefers-reduced-motion: reduce)` 下，2.4s 过渡动画压缩为 400ms 简单淡入淡出，L3/L5/L6 光效关闭
- **对比度**：墨绘态正文（#4A3F2E on #F1E4C8）对比度 7.2:1（AAA），雷霆态主文字（#E8F4F8 on #050407）对比度 16.8:1（AAA）
- **焦点可见**：所有可交互元素 focus 时显示 2px 暗金/电光青外发光轮廓
- **色彩无关**：状态信息不仅靠颜色，搭配图标（成功✓/警告⚠/错误✕）和文字标签
- **键盘可达**：所有交互可通过 Tab/Enter/Esc 操作；工作台支持快捷键（D=画乐器/S=画形状/C=清空/H=唤声/Esc=退出）

### 7.14 设计交付物清单

| # | 文件 | 内容 | 状态 |
|---|------|------|------|
| 1 | `src/styles/tokens.css` | CSS 变量（双态配色、字号、间距、阴影） | 待实现 |
| 2 | `src/styles/fonts.css` | 字体引入（Google Fonts @import） | 待实现 |
| 3 | `src/styles/base.css` | 全局重置 + body 双态背景 + Scanline overlay | 待实现 |
| 4 | `src/styles/components.css` | btn-engrave / btn-holo / card-scroll / card-holo / toast 组件样式 | 待实现 |
| 5 | `src/styles/animations.css` | burn-dissolve / scanline-sweep / holo-emerge / ripple / scanline-pulse 关键帧 | 待实现 |
| 6 | `src/styles/workbench.css` | 工作台双态布局、画布、全息区域、触发光效 | 待实现 |
| 7 | `src/hooks/useModeTransition.ts` | 双态过渡动画的 React Hook（控制 2.4s 时间轴） | 待实现 |
| 8 | `src/components/ModeTransition.tsx` | 过渡动画覆盖层组件 | 待实现 |
| 9 | `src/components/TouchEffect.tsx` | 6 层触发光效组件（接收键位坐标 + 灵格色） | 待实现 |

### 7.15 设计禁令

1. **禁止**使用 Inter / Roboto / Arial / system-ui / Space Grotesk / Geist 作为任何文字的字体
2. **禁止**使用紫色渐变（#7C3AED → #EC4899 等典型 AI 套路配色）
3. **禁止**在墨绘态使用纯黑（#000）背景，必须用羊皮纸色系
4. **禁止**在雷霆态使用纯白（#FFF）背景或大面积白色卡片
5. **禁止**使用 emoji 作为图标（用 SVG 自绘符号或 Lucide 图标库的线性图标）
6. **禁止**使用 Material Design 的阴影层级（elevation 0-24dp 套路）
7. **禁止**双态混用——墨绘态页面严禁出现电光青/Scanline；雷霆态页面严禁出现羊皮纸/朱砂印章（过渡动画期间除外）
8. **禁止**使用圆角 > 8px 的卡片（保持手稿/全息屏的硬朗感）

---


## 八、数据模型

### 8.1 绘制数据结构

```typescript
// 用户绘制原始数据（模式 A 与 B 共用）
interface DrawnShape {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'ellipse';  // 新增 ellipse 用于乐器轮廓
  x: number;          // 画布坐标（像素）
  y: number;
  width: number;
  height: number;
  strokeColor?: string;
  fillColor?: string;
}

// 识别结果
interface RecognitionResult {
  instrument: 'piano' | 'guitar' | 'violin' | 'flute' | 'drums';
  confidence: number;  // 0-1
  mode: 'contour' | 'abstract';  // 模式 A 命中 / 模式 B 回退
  keys: VirtualKey[];
}

// 虚拟键位（音位）
interface VirtualKey {
  id: string;
  note: string;        // 如 'C4' / 'kick'
  bounds: {
    x: number;         // 归一化 0-1（绘制坐标系）
    y: number;
    width: number;
    height: number;
  };
  lastTriggeredAt: number;  // 上次触发时间戳（cooldown 用）
}
```

### 8.2 状态机

```typescript
type WorkbenchPhase =
  | 'idle'           // 初始
  | 'drawing'        // 绘制中
  | 'generating'     // 识别中
  | 'camera-pending' // 等待开启摄像头
  | 'camera-loading' // 摄像头初始化
  | 'tracking'       // MR 演奏中
  | 'paused'         // 暂停
  | 'error';         // 错误

// 合法跳转
const VALID_TRANSITIONS = {
  idle: ['drawing', 'error'],
  drawing: ['generating', 'idle', 'error'],
  generating: ['camera-pending', 'error'],
  'camera-pending': ['camera-loading', 'idle', 'error'],
  'camera-loading': ['tracking', 'error'],
  tracking: ['paused', 'idle', 'error'],
  paused: ['tracking', 'idle'],
  error: ['idle'],
};
```

### 8.3 后端数据表

与原 SoundShape 完全一致，无变更。已有的 `play_records` / `tuning_records` / `layouts` / `clips` / `challenge_scores` 表结构不变。

`layouts` 表的 `shapes` 字段存 `DrawnShape[]`（JSONB），新增 `type: 'ellipse'` 即可，无需改表结构。

---

## 九、API 设计

与原 SoundShape API 完全一致，无新增端点。

唯一变更：`POST /api/layouts` 保存布局时，`shapes` 数组中的元素 `type` 字段新增 `'ellipse'` 枚举值。

```json
{
  "name": "我的钢琴布局",
  "instrument": "piano",
  "shapes": [
    {
      "type": "rect",
      "bounds": { "x": 0.1, "y": 0.4, "width": 0.1, "height": 0.2 }
    },
    {
      "type": "ellipse",
      "bounds": { "x": 0.5, "y": 0.3, "width": 0.2, "height": 0.1 }
    }
  ]
}
```

---

## 十、部署方案

与原 SoundShape 完全一致：
- 前端 → Vercel
- 后端 → Render
- 数据库 → Supabase
- MediaPipe → jsdelivr CDN

---

## 十一、降级策略

| 场景 | 降级动作 |
|------|---------|
| 摄像头不可用 | 仅画图模式，可查看生成的乐器图但不演奏 |
| MediaPipe 加载失败 | 提示重试 + 引导升级浏览器 |
| 后端不可达 | 演奏/调音正常，仅禁用保存功能 |
| 浏览器不支持 Web Audio | 演奏区禁用 + 提示 |
| 性能不足（<15fps） | 自动降低特效：先关粒子，再关光影，最后只留键位描边 |
| 性能不足（<10fps） | Toast 提示"设备性能不足，建议切换到画形状模式（模式 B）" |
| 透视变换导致乐器变形严重 | 检测画面宽高比，极端比例（<1.5 或 >2.5）时禁用透视，回退到 2D 平面 |

---

## 十二、可行性评估

### 12.1 技术可行性

| 项 | 评估 | 风险 |
|----|------|------|
| Canvas 透视变换 | ✅ 成熟技术 | 无 |
| MediaPipe Hands | ✅ 已验证 | 首次加载 8MB |
| Web Audio 合成 | ✅ 已验证 | 无 |
| 摄像头 + Canvas 叠加 | ✅ 标准方案 | 无 |
| 伪 MR 视觉 | ✅ 可行 | 视觉效果取决于美术调参 |
| 双手追踪 | ⚠️ 性能要求高 | 低端设备可能掉帧，已设计降级 |
| 乐器轮廓识别 | ⚠️ 算法复杂度中 | 识别率可能不如抽象形状，已设计回退到模式 B |

### 12.2 用户可行性

| 项 | 评估 |
|----|------|
| 学习成本 | 中（需要理解"画 → 投射 → 隔空操作"三步） |
| 硬件门槛 | 低（任意带摄像头的设备） |
| 网络要求 | 中（首次加载 MediaPipe 8MB） |
| 隐私顾虑 | 中（摄像头权限，需明确告知仅本地处理） |

### 12.3 与原 SoundShape 的迁移成本

| 模块 | 迁移成本 | 说明 |
|------|---------|------|
| M2 绘制系统 | 中 | 新增模式 A + 模板匹配 |
| M3 识别 | 高 | 重写识别算法 |
| M6 渲染层 | 高 | 全新 MR 渲染（替代 KeyOverlay） |
| 其他模块 | 低 | 复用原 SoundShape |
| 后端 | 零 | 完全复用 |

**总体评估：** 升级成本可控，主要工作量在前端 M2/M3/M6 三个模块的重写。

---

## 十三、风险与缓解

### 13.1 识别率风险

**风险：** 用户画的乐器轮廓不规范，识别率低。

**缓解：**
1. 模式 A 提供 5 个乐器模板缩略图作为参考
2. 识别失败时自动回退到模式 B（抽象形状识别）
3. 回退时 Toast 提示"未识别为乐器轮廓，已按形状推断"
4. 识别置信度 < 0.5 时让用户确认"是否识别为 X？"

### 13.2 MR 视觉不自然风险

**风险：** 透视变换后的乐器看起来不像"在桌面上"，像贴片。

**缓解：**
1. 虚拟桌面阴影（画面下半部分渐变暗化）
2. 乐器下方加投影
3. 触发时加"桌面反射"高光
4. 美术调参：透视参数可配置，发布前在多种设备上调试

### 13.3 隔空操作疲劳风险

**风险：** 用户长时间抬手挥动会累。

**缓解：**
1. 教学引导第 4 步提示"建议手肘放在桌面上，只抬前臂"
2. 默认灵敏度 50（中等），让用户不用大幅度移动
3. 演奏 5 分钟后 Toast 提示"建议休息"

### 13.4 双手追踪性能风险

**风险：** 双手 42 关键点追踪在低端设备上掉帧。

**缓解：**
1. M15 性能监控实时检测 FPS
2. <15fps 时自动切回单手模式（maxNumHands=1）
3. <10fps 时提示切换到模式 B

---

## 十四、成功标准

1. 公网 URL 可在桌面/手机浏览器正常打开
2. 画乐器模式：5 种乐器轮廓识别率 ≥ 85%
3. 画形状模式：5 种乐器识别率 ≥ 95%（沿用原标准）
4. 摄像头开启后能实时追踪手部（≥25fps，延迟 < 100ms）
5. 食指触碰音位即时触发音色 + MR 光效
6. 5 种乐器音色可辨识
7. 视觉效果让用户感觉"乐器在桌面上"（用户测试 5 人中 ≥3 人认可）
8. 登录用户可保存演奏记录、调音记录、分享视频
9. UI 严格遵循"纸面 → 全息"设计概念
10. 全设备响应式，移动端可触摸演奏（单手模式）
11. 所有错误场景有友好提示，无白屏/卡死

---

## 十五、禁止事项

1. **禁止**使用 Three.js / WebXR / ARCore / ARKit（浏览器兼容性差）
2. **禁止**做真正的平面检测（单目摄像头无法实现）
3. **禁止**修改后端 API 字段名和错误码
4. **禁止**修改数据库表结构（shapes 字段是 JSONB，新增 type 枚举值即可）
5. **禁止**在 MR 演奏时上传摄像头画面到服务器（仅本地处理）
6. **禁止**在未触发时显示粒子/光效（避免视觉噪音）
7. **禁止**透视参数运行时动态调整（会导致乐器抖动）
8. **禁止**跳过教学引导直接进入 MR 模式（用户需要理解交互隐喻）
9. **禁止**在 mode A 识别失败时直接报错（必须回退到 mode B）
10. **禁止**双手模式作为默认（默认单手，双手需用户主动开启）
11. **禁止**使用鱼眼镜头假设（用户设备多样，普通镜头为主）
12. **禁止**在虚拟桌面区域之外触发音位（手在画面上半部分不触发）

---

## 十六、与原 SoundShape 实现计划的关系

### 16.1 复用部分

- Phase 1-4（脚手架/后端/前端基础）：100% 复用
- Phase 6（前端内容模块：曲库/教学/分享/挑战）：90% 复用，仅教学引导第 3 步文案修改
- Phase 7（收尾/部署/验收）：90% 复用，验收清单新增 MR 视觉项

### 16.2 替换部分

- **Task 18（画图生成键位 M2）**：替换为"绘制系统（双模式）"
- **Task 21（键位叠加渲染 M5）**：替换为"MR 渲染层 M6"
- **新增 Task**：乐器轮廓识别（M3 独立模块）

### 16.3 迁移建议

1. 先完成原 SoundShape 的 Phase 1-4（基础架构）
2. 跳过原 Task 18-21
3. 按本文档新增 MR 相关 Task
4. 继续 Phase 6-7

具体的 Task 拆分将在实现计划文档中补充。

---

## 十七、下一步

1. 用户评审本文档
2. 通过后，撰写 MR 部分的实现计划（替换原 Task 18-21）
3. 按新计划执行

---

**文档结束**
