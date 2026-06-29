# 声形绘 功能模块详细设计

> 本文档目标：把每个功能模块的边界、输入输出、依赖关系、内部逻辑全部写死，杜绝实现阶段乱猜。
> 适用对象：所有实现该项目的开发者/AI 模型。必须严格按本文档实现，不得自行增减模块或修改接口。

---

## 模块总览

```
┌─────────────────────────────────────────────────────────────┐
│  前端模块                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ M1 UI层  │ │ M2 画图  │ │ M3 摄像头│ │ M4 手部  │        │
│  │          │ │ 生成键位 │ │ 实时画面 │ │ 追踪     │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ M5 键位  │ │ M6 音频  │ │ M7 调音器│ │ M8 特效  │        │
│  │ 叠加渲染 │ │ 合成     │ │          │ │          │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ M9 曲库  │ │ M10 教学 │ │ M11 分享 │ │ M12 挑战 │        │
│  │          │ │ 引导     │ │ 录制     │ │ 排行     │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐                                   │
│  │ M13 用户 │ │ M14 API  │                                   │
│  │ 状态     │ │ 客户端   │                                   │
│  └──────────┘ └──────────┘                                   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  后端模块                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ B1 认证  │ │ B2 记录  │ │ B3 调音  │ │ B4 布局  │        │
│  │ 服务     │ │ 服务     │ │ 记录     │ │ 服务     │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ B5 曲库  │ │ B6 分享  │ │ B7 挑战  │ │ B8 错误  │        │
│  │ 服务     │ │ 服务     │ │ 服务     │ │ 处理     │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## M1 UI 层模块

### 职责
- 全局页面路由与布局
- 主题与设计系统应用
- 全局 Toast / 错误条幅
- 响应式断点切换

### 边界
- 不直接处理业务逻辑，只做视图编排
- 调用 M13（用户状态）判断登录态
- 调用 M14（API 客户端）做数据请求

### 输入
- 路由 URL
- M13 的登录状态变化
- 各业务模块触发的 Toast 请求

### 输出
- 渲染页面 DOM
- 向业务模块下发路由参数

### 路由表（严格定义，不得变更）

| 路径 | 页面组件 | 是否需登录 | 说明 |
|------|---------|----------|------|
| `/` | Home | 否 | 首页 |
| /workbench | Workbench | 否 | 工作台（未登录可试用） |
| /login | Login | 否 | 登录页 |
| /register | Register | 否 | 注册页 |
| /profile | Profile | 是 | 个人中心 |
| /songs | SongLibrary | 否 | 曲库列表 |
| /songs/:id | SongDetail | 否 | 曲目详情与练习 |
| /challenge | Challenge | 否 | 挑战排行 |
| /share/:clipId | SharedClip | 否 | 分享播放页 |

### 主题切换规则
- 全站默认"白昼纸面"主题
- 进入 `/workbench` 且摄像头开启后，演奏区切换"暗夜雷电"主题
- 其他区域保持白昼主题
- 用户可在个人中心切换"暗夜全站"主题（可选功能）

---

## M2 画图生成键位模块

### 职责
- 提供画布让用户画形状
- 识别形状特征，推断乐器类型
- 生成对应的虚拟键位布局

### 输入
- 用户在 Canvas 上的鼠标/触摸事件
- 用户选择的"形状工具"：rectangle / line / circle / freehand
- 用户点击的"示例模板" ID

### 输出
- `KeyLayout` 对象（见数据模型），包含：
  ```typescript
  interface KeyLayout {
    instrument: 'piano' | 'guitar' | 'violin' | 'flute' | 'drums';
    keys: KeyRegion[];
    sourceShapes: Shape[];  // 用户画的原始形状，用于保存
  }
  
  interface KeyRegion {
    id: string;             // 唯一 ID，如 "key-0"
    x: number;              // 归一化坐标 [0,1]，相对于画布
    y: number;
    width: number;
    height: number;
    note: string;           // 音名，如 "C4"、"E2"
    frequency: number;      // 频率 Hz
    shape: 'rect' | 'line' | 'circle';
  }
  
  interface Shape {
    type: 'rect' | 'line' | 'circle' | 'freehand';
    bounds: { x: number; y: number; width: number; height: number };
    points?: { x: number; y: number }[];  // freehand 时的轨迹点
  }
  ```

### 识别算法（严格按此实现，不得自行调整阈值）

```
输入：Shape[] shapes
输出：{ instrument: string | null, keys: KeyRegion[] }

步骤：
1. 对每个 shape 计算 bounding box 的长宽比 ratio = max(w,h) / min(w,h)
2. 分类：
   - ratio < 1.5 → 视为"块状"（rect/circle）
   - ratio >= 3 且 w > h → 视为"横向长条"
   - ratio >= 3 且 h > w → 视为"竖向长条"
   - 1.5 <= ratio < 3 → 视为"中等形状"，按原始 type 处理

3. 统计：
   - blockCount = 块状数量
   - horizontalBarCount = 横向长条数量
   - verticalBarCount = 竖向长条数量

4. 判断乐器（按优先级，匹配第一个即返回）：
   a. 若 verticalBarCount === 6 → guitar，6 根弦音高固定 [E2, A2, D3, G3, B3, E4]
   b. 若 verticalBarCount === 4 → violin，4 根弦音高固定 [G3, D4, A4, E5]
   c. 若 blockCount >= 5 且这些块状形状的 y 坐标差 < 平均高度的 50%（即横向排列） → piano
      音高按 x 坐标排序后依次分配 [C4, D4, E4, F4, G4, A4, B4, C5, D5, E5, ...]
   d. 若 horizontalBarCount === 1 且 blockCount >= 3 → flute
      音高按圆点 x 坐标排序分配 [C4, D4, E4, F4, G4, A4, B4]
   e. 若 blockCount >= 3 且这些块状形状分散（任意两块的中心距离 > 平均尺寸） → drums
      音高按顺序分配底鼓/军鼓/嗵鼓1/嗵鼓2/镲
   f. 其他情况 → 返回 null，前端显示"再画几笔或选模板"

5. 生成 keys：将每个 shape 转为 KeyRegion，坐标归一化到 [0,1]
```

### 示例模板（严格定义，不得变更）

| 模板 ID | 名称 | 乐器 | 形状描述 |
|---------|------|------|---------|
| tpl-piano-8 | 标准钢琴 8 键 | piano | 8 个方块横向排列 |
| tpl-guitar-6 | 吉他 6 弦 | guitar | 6 条竖向长条 |
| tpl-violin-4 | 小提琴 4 弦 | violin | 4 条竖向长条 |
| tpl-flute-7 | 长笛 7 键 | flute | 1 条横向长条 + 7 个圆点 |
| tpl-drums-5 | 架子鼓 5 件 | drums | 5 个圆形分散排列 |

模板的具体坐标在 `frontend/src/features/templates.ts` 中硬编码，不得由后端返回。

---

## M3 摄像头实时画面模块

### 职责
- 调用 getUserMedia 获取摄像头视频流
- 将视频流镜像翻转后渲染到 Canvas
- 管理摄像头生命周期（开启/停止/切换）

### 输入
- 用户点击"开启摄像头"事件
- 用户选择的摄像头设备 ID（多摄像头时）

### 输出
- `MediaStream` 对象，传递给 M4（手部追踪）和 M6（特效叠加）
- 每帧 `HTMLVideoElement` 的当前帧，用于 Canvas 绘制

### 约束
- 视频分辨率：默认 1280x720，移动端降级到 640x480
- 帧率：30fps 目标
- 必须镜像翻转（scaleX(-1)），让用户像照镜子
- 摄像头不可用时不得阻塞 UI，必须降级到"仅画图查看键位"模式

### 错误处理（严格按此实现）

| 错误类型 | 处理 |
|---------|------|
| NotAllowedError | Toast："请允许摄像头权限" + 显示"如何开启"链接 |
| NotFoundError | Toast："未检测到摄像头，请使用画图模式查看键位" |
| NotReadableError | Toast："摄像头被其他应用占用，请关闭后重试" |
| OverConstrainedError | 自动降级分辨率到 640x480 重试 |

---

## M4 手部追踪模块

### 职责
- 接收 M3 的视频流
- 使用 MediaPipe Hands 推理手部关键点
- 输出归一化坐标供 M5（键位叠加）和 M8（特效）使用

### 输入
- `MediaStream`（来自 M3）

### 输出
- 每帧 `HandLandmarks` 对象数组：
  ```typescript
  interface HandLandmarks {
    handedness: 'Left' | 'Right';
    landmarks: Point3D[];  // 21 个关键点，归一化坐标 [0,1]
  }
  
  interface Point3D {
    x: number;  // [0,1] 水平
    y: number;  // [0,1] 垂直
    z: number;  // 深度，负值表示靠近摄像头
  }
  ```

### 配置参数（严格固定，不得调整）

```javascript
hands.setOptions({
  maxNumHands: 2,          // 最多追踪 2 只手
  modelComplexity: 1,      // 中等复杂度，平衡精度与性能
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.5
});
```

### 性能降级策略（自动执行）

| 实测帧率 | 降级动作 |
|---------|---------|
| >= 25fps | 无降级 |
| 15-24fps | 关闭 M8 的粒子特效，保留光晕 |
| < 15fps | 关闭所有特效，只保留键位描边 + 发声 |
| < 10fps | 显示 Toast："设备性能不足，建议切换到键盘模式" |

### 键盘备用模式
- 当摄像头不可用或性能不足时，自动启用键盘映射
- 键盘映射表（固定，不得变更）：

| 乐器 | 按键 → 音名 |
|------|------------|
| piano | A→C4, S→D4, D→E4, F→F4, G→G4, H→A4, J→B4, K→C5 |
| guitar | 1→E2, 2→A2, 3→D3, 4→G3, 5→B3, 6→E4 |
| violin | 1→G3, 2→D4, 3→A4, 4→E5 |
| flute | A→C4, S→D4, D→E4, F→F4, G→G4, H→A4, J→B4 |
| drums | Q→底鼓, W→军鼓, E→嗵鼓1, R→嗵鼓2, T→镲 |

---

## M5 键位叠加渲染模块

### 职责
- 在摄像头画面上层渲染虚拟键位
- 检测食指尖是否进入键位区域
- 触发 M6（音频）和 M8（特效）

### 输入
- `KeyLayout`（来自 M2）
- `HandLandmarks[]`（来自 M4，每帧）
- 灵敏度参数（用户可调，范围 0-100，默认 50）

### 输出
- 每帧触发的 `TriggerEvent`：
  ```typescript
  interface TriggerEvent {
    keyId: string;
    note: string;
    timestamp: number;  // 毫秒
    hand: 'Left' | 'Right';
  }
  ```

### 触发判定算法（严格按此实现）

```
输入：currentLandmarks（当前帧）, prevLandmarks（上一帧）, keys, sensitivity
输出：TriggerEvent[]

步骤：
1. 取食指尖坐标 = landmarks[8]（每只手）
2. 对每个 key：
   prevInside = prevLandmarks 是否在 key 的边界框内
   currInside = currentLandmarks 是否在 key 的边界框内
3. 触发条件：
   if (!prevInside && currInside) {
     // 进入瞬间触发
     // 灵敏度调节：sensitivity 越高，边界框扩大（最多 +20%）
     // sensitivity 越低，边界框缩小（最多 -20%）
     触发 TriggerEvent
   }
4. 防抖：
   - 同一个 key 在 150ms 内只触发一次（cooldown）
   - 即使手指在区域内反复进出
5. 释放：
   - 手指离开区域时不触发事件，由 M6 自行处理音符衰减
```

### 渲染规则（严格按此实现）

| 键位状态 | 渲染 |
|---------|------|
| idle（默认） | 描边 rgba(0,240,255,0.15)，1px，无填充 |
| hover（手指在区域内） | 描边 rgba(0,240,255,0.6)，2px，内部 radial-gradient 微光 |
| triggered（触发瞬间） | 描边 #00F0FF，3px，内部填充 rgba(0,240,255,0.3)，持续 200ms |
| cooldown（防抖期） | 描边 rgba(0,240,255,0.4)，1px |

音名标签：JetBrains Mono，14px，白色，显示在键位中心。

---

## M6 音频合成模块

### 职责
- 接收 TriggerEvent，合成对应音色
- 管理音符的 attack/decay/sustain/release
- 提供音量控制

### 输入
- `TriggerEvent`（来自 M5）
- 用户设置的音量（0-100，默认 70）
- 当前乐器类型

### 输出
- 音频输出到扬声器

### 音色合成参数（严格固定，不得调整）

```typescript
const INSTRUMENT_PRESETS = {
  piano: {
    oscillators: [
      { type: 'triangle', gain: 0.6, detune: 0 },
      { type: 'sine', gain: 0.3, detune: 1200 },  // 上八度
      { type: 'sine', gain: 0.1, detune: 1902 }   // 上十二度
    ],
    envelope: { attack: 0.005, decay: 0.3, sustain: 0.3, release: 0.5 },
    filter: { type: 'lowpass', frequency: 4000, Q: 1 }
  },
  guitar: {
    oscillators: [
      { type: 'sawtooth', gain: 0.7, detune: 0 },
      { type: 'triangle', gain: 0.3, detune: -1200 }
    ],
    envelope: { attack: 0.002, decay: 0.8, sustain: 0, release: 0.2 },
    filter: { type: 'lowpass', frequency: 2200, Q: 2 }
  },
  violin: {
    oscillators: [
      { type: 'sawtooth', gain: 0.5, detune: 0 },
      { type: 'sawtooth', gain: 0.4, detune: 8 },   // 轻微失谐
      { type: 'sawtooth', gain: 0.4, detune: -8 }
    ],
    envelope: { attack: 0.08, decay: 0, sustain: 0.8, release: 0.4 },
    filter: { type: 'lowpass', frequency: 3000, Q: 1 },
    lfo: { frequency: 5, depth: 0.02 }  // 颤音
  },
  flute: {
    oscillators: [
      { type: 'sine', gain: 0.7, detune: 0 },
      { type: 'triangle', gain: 0.2, detune: 0 }
    ],
    envelope: { attack: 0.03, decay: 0, sustain: 0.7, release: 0.2 },
    filter: { type: 'lowpass', frequency: 2500, Q: 1 },
    noiseGain: 0.05  // 气声
  },
  drums: {
    // 不同鼓件用不同合成
    kick: { oscillator: { type: 'sine', freqStart: 150, freqEnd: 50 }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.05 } },
    snare: { noise: true, filter: { type: 'highpass', frequency: 1000 }, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 } },
    tom1: { oscillator: { type: 'sine', freqStart: 200, freqEnd: 100 }, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.08 } },
    tom2: { oscillator: { type: 'sine', freqStart: 150, freqEnd: 80 }, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 } },
    cymbal: { noise: true, filter: { type: 'highpass', frequency: 5000 }, envelope: { attack: 0.001, decay: 0.8, sustain: 0, release: 0.3 } }
  }
};
```

### 音名-频率对照表（固定）

```
C4=261.63, C#4=277.18, D4=293.66, D#4=311.13, E4=329.63, F4=349.23,
F#4=369.99, G4=392.00, G#4=415.30, A4=440.00, A#4=466.16, B4=493.88,
C5=523.25, ...
E2=82.41, A2=110.00, D3=146.83, G3=196.00, B3=246.94,
G3=196.00, D4=293.66, A4=440.00, E5=659.25
```

### 多音同时触发
- 最多支持 4 个音同时发声（2 只手 × 2 个键位）
- 超过 4 个时，最早的音被强制 release

---

## M7 调音器模块

### 职责
- 开启麦克风，实时检测音高
- 显示当前音名、频率、与标准音的偏差
- 支持保存调音记录（登录用户）

### 输入
- 麦克风音频流
- 用户选择的目标乐器（用于显示该乐器的标准音参考）

### 输出
- 实时 `PitchDetection`：
  ```typescript
  interface PitchDetection {
    frequency: number;      // Hz
    note: string;           // 如 "A4"
    cents: number;          // 与标准音的偏差，-50 到 +50
    clarity: number;        // 检测置信度 [0,1]
  }
  ```

### 基频检测算法（固定使用自相关法）

```
1. 从 AnalyserNode 获取时域数据（2048 采样）
2. 计算自相关：对每个 lag (0 to 1024)，计算 sum(data[i] * data[i+lag])
3. 找到自相关函数的第一个峰值（跳过 lag=0 附近）
4. 峰值对应的 lag 即周期，frequency = sampleRate / lag
5. 用抛物线插值精确化峰值位置
6. 计算 clarity = 峰值高度 / 自相关函数最大值
7. 若 clarity < 0.9，视为无有效音高，输出 null
```

### 标准音参考表（固定）

| 乐器 | 弦/键 | 标准音 | 频率 Hz |
|------|------|--------|---------|
| guitar | 6弦 | E2 A2 D3 G3 B3 E4 | 82.41 110.00 146.83 196.00 246.94 329.63 |
| violin | 4弦 | G3 D4 A4 E5 | 196.00 293.66 440.00 659.25 |

### UI 显示规则
- 指针位置：cents / 50 × 半宽（最大偏左/偏右 50%）
- 指针颜色：|cents| < 5 → 绿色，5-20 → 黄色，> 20 → 红色
- |cents| < 5 持续 1 秒 → 显示"准音"提示 + 指针脉动

---

## M8 特效模块

### 职责
- 渲染手部关键点、拖尾粒子
- 渲染键位触发的光晕和粒子爆发

### 输入
- `HandLandmarks[]`（来自 M4）
- `TriggerEvent[]`（来自 M5）

### 输出
- 在演奏区 Canvas 上绘制特效

### 粒子系统参数（固定）

```typescript
const EFFECT_PARAMS = {
  handFingertip: {
    radius: 8,            // 食指尖发光点半径
    glowRadius: 24,       // 外圈光晕半径
    color: 'rgba(255,255,255,0.9)'
  },
  trail: {
    particlesPerFrame: 1, // 每帧生成粒子数
    maxParticles: 200,    // 全局上限
    lifetime: 400,        // ms
    sizeStart: 4,
    sizeEnd: 0,
    color: 'rgba(255,255,255,0.4)'
  },
  triggerBurst: {
    particleCount: 12,    // 每次触发爆发的粒子数
    speed: 200,           // px/s
    lifetime: 400,        // ms
    sizeStart: 6,
    sizeEnd: 0,
    colors: ['#00F0FF', '#FF00C8', '#FFE600']  // 随机选一个
  },
  triggerGlow: {
    radiusStart: 0,
    radiusEnd: 80,        // px
    duration: 300,        // ms
    fadeDuration: 600,    // ms
    color: 'rgba(0,240,255,0.6)'
  }
};
```

### 性能降级
- 实测帧率 < 25fps：关闭 trail 粒子
- 帧率 < 15fps：关闭 triggerBurst 粒子，只保留 triggerGlow
- 帧率 < 10fps：关闭所有特效

---

## M9 曲库模块（新增）

### 职责
- 提供曲目列表（按乐器、难度分类）
- 曲目详情页显示乐谱（简化版）
- 支持跟随演奏（音符下落式引导）

### 输入
- 用户选择的乐器筛选
- 用户选择的难度筛选

### 输出
- 曲目列表
- 单首曲目数据：
  ```typescript
  interface Song {
    id: string;
    title: string;          // 曲名
    artist: string;         // 原作者
    instrument: 'piano' | 'guitar' | 'violin' | 'flute' | 'drums';
    difficulty: 1 | 2 | 3 | 4 | 5;  // 难度星级
    bpm: number;            // 节拍
    notes: SongNote[];      // 音符序列
    durationSec: number;    // 总时长
    coverImage: string;     // 封面图 URL
  }
  
  interface SongNote {
    note: string;           // 音名
    startTime: number;      // ms，从曲目开始算
    duration: number;       // ms
  }
  ```

### 曲目数据来源（固定）
- 曲目数据硬编码在前端 `frontend/src/data/songs/` 目录
- 每首曲目一个 JSON 文件，如 `twinkle-twinkle.json`
- 不得由后端动态返回（避免后端复杂度）

### 初始曲库（10 首，固定）

| ID | 曲名 | 乐器 | 难度 | BPM |
|----|------|------|------|-----|
| twinkle | 小星星 | piano | 1 | 80 |
| ode-to-joy | 欢乐颂 | piano | 2 | 100 |
| canon | 卡农（简化） | piano | 3 | 80 |
| happy-birthday | 生日快乐 | piano | 1 | 100 |
| silent-night | 平安夜 | flute | 1 | 70 |
| scarborough-fair | 斯卡布罗集市 | guitar | 2 | 80 |
| romance | 浪漫曲 | guitar | 3 | 70 |
| amazing-grace | 奇异恩典 | violin | 2 | 80 |
| auld-lang-syne | 友谊地久天长 | violin | 2 | 90 |
| we-will-rock-you | We Will Rock You | drums | 1 | 100 |

### 跟随演奏模式
- 用户选择曲目后，进入"练习模式"
- 画面上方音符从上到下下落（或从右到左流动）
- 音符到达"判定线"时，用户应触发对应键位
- 判定窗口：±200ms 内触发 = 正确
- 显示得分：正确数 / 总音符数

---

## M10 教学引导模块（新增）

### 职责
- 首次使用引导
- 乐器知识科普
- 演奏技巧提示

### 内容（固定，硬编码在前端）

**首次进入工作台的 4 步引导：**

1. "画几个形状，或点击示例模板"
2. "点击'生成键位并开始演奏'"
3. "允许摄像头权限，把手放在画面中"
4. "用食指触碰虚拟键位，开始演奏"

每步显示一个半透明遮罩 + 高亮目标元素 + "下一步"按钮。

**乐器知识卡片：**
- 每种乐器在调音图示区显示一段介绍文字（50 字以内）
- 内容硬编码在 `frontend/src/data/instrument-info.ts`

### 不做的事
- 不做视频教学
- 不做付费课程
- 不做真人辅导

---

## M11 分享录制模块（新增）

### 职责
- 录制用户演奏过程（画面 + 音频）
- 生成可分享的短视频
- 上传到后端，生成分享链接

### 输入
- 用户点击"开始录制"
- 演奏区的 Canvas 帧（来自 M5/M8）
- 音频输出（来自 M6）

### 输出
- 录制完成后的 `Clip` 对象：
  ```typescript
  interface Clip {
    id: string;
    userId?: string;        // 登录用户才有
    instrument: string;
    durationSec: number;
    videoUrl: string;       // 后端返回的 URL
    thumbnailUrl: string;
    createdAt: string;
  }
  ```

### 录制技术方案（固定）
- 使用 `MediaRecorder API` 录制 Canvas + AudioStream 的合成流
- 格式：WebM（VP9 + Opus）
- 单次录制上限：60 秒
- 录制完成后上传到后端 `/api/clips`，后端存储到 Supabase Storage

### 分享页 `/share/:clipId`
- 公开访问，无需登录
- 显示视频播放器 + 乐器 + 时长 + 创建时间
- "我也来试试"按钮跳转工作台

---

## M12 挑战排行模块（新增）

### 职责
- 提供每日挑战曲目
- 用户演奏评分
- 排行榜

### 每日挑战规则（固定）
- 每天 UTC+8 00:00 更新一首挑战曲目
- 挑战曲目从曲库中轮换
- 用户在挑战模式下演奏，系统按正确率评分
- 评分公式：`score = (正确音符数 / 总音符数) × 100 + 连击奖励（每 10 连击 +5 分）`
- 单用户当日仅保留最高分

### 排行榜
- 按分数降序
- 显示前 100 名
- 显示用户昵称 + 分数 + 日期
- 登录用户才能上榜

---

## M13 用户状态模块

### 职责
- 管理登录态（JWT Token）
- 管理用户信息
- 管理全局设置（音量、灵敏度、主题）

### 状态结构（固定）

```typescript
interface UserState {
  user: { id: string; email: string; nickname: string } | null;
  token: string | null;
  settings: {
    volume: number;           // 0-100，默认 70
    sensitivity: number;      // 0-100，默认 50
    showHandSkeleton: boolean; // 默认 true
    theme: 'paper' | 'night'; // 默认 paper
  };
}
```

### 持久化
- token 存 localStorage（key: `soundshape_token`）
- settings 存 localStorage（key: `soundshape_settings`）
- user 信息不持久化，每次刷新从 `/api/auth/me` 获取

### Token 过期处理
- 任何 API 返回 401 → 清除 token → 跳转 `/login` + Toast "请重新登录"

---

## M14 API 客户端模块

### 职责
- 封装所有 HTTP 请求
- 自动附加 JWT Token
- 统一错误处理

### 配置（固定）
- baseURL：从环境变量 `VITE_API_URL` 读取
- 超时：10 秒
- 请求拦截器：自动添加 `Authorization: Bearer <token>`
- 响应拦截器：
  - 200-299：返回 data
  - 401：触发 M13 的登出流程
  - 其他：抛出包含 `{ code, message }` 的错误

---

## B1 认证服务（后端）

### 路由

| 方法 | 路径 | 功能 | 需认证 |
|------|------|------|--------|
| POST | /api/auth/register | 注册 | 否 |
| POST | /api/auth/login | 登录 | 否 |
| GET | /api/auth/me | 获取当前用户 | 是 |

### 详细规范见 API 接口文档

---

## B2 演奏记录服务（后端）

### 路由

| 方法 | 路径 | 功能 | 需认证 |
|------|------|------|--------|
| GET | /api/records | 查询当前用户的演奏记录 | 是 |
| POST | /api/records | 创建演奏记录 | 是 |
| DELETE | /api/records/:id | 删除演奏记录 | 是 |

---

## B3 调音记录服务（后端）

### 路由

| 方法 | 路径 | 功能 | 需认证 |
|------|------|------|--------|
| GET | /api/tunings | 查询调音记录 | 是 |
| POST | /api/tunings | 创建调音记录 | 是 |
| DELETE | /api/tunings/:id | 删除调音记录 | 是 |

---

## B4 布局服务（后端）

### 路由

| 方法 | 路径 | 功能 | 需认证 |
|------|------|------|--------|
| GET | /api/layouts | 查询自定义布局 | 是 |
| POST | /api/layouts | 保存自定义布局 | 是 |
| DELETE | /api/layouts/:id | 删除布局 | 是 |

---

## B5 曲库服务（后端）

### 路由

| 方法 | 路径 | 功能 | 需认证 |
|------|------|------|--------|
| GET | /api/songs | 获取曲库列表 | 否 |
| GET | /api/songs/:id | 获取单曲详情 | 否 |

### 说明
- 曲库数据存储在数据库（不硬编码在后端）
- 便于后续增补曲目
- 初始 10 首曲目通过 migration 导入

---

## B6 分享服务（后端）

### 路由

| 方法 | 路径 | 功能 | 需认证 |
|------|------|------|--------|
| POST | /api/clips | 上传演奏视频 | 是 |
| GET | /api/clips/:id | 获取分享视频信息 | 否 |
| GET | /api/clips | 查询自己的视频 | 是 |
| DELETE | /api/clips/:id | 删除视频 | 是 |

---

## B7 挑战服务（后端）

### 路由

| 方法 | 路径 | 功能 | 需认证 |
|------|------|------|--------|
| GET | /api/challenge/today | 获取今日挑战曲目 | 否 |
| POST | /api/challenge/submit | 提交挑战成绩 | 是 |
| GET | /api/challenge/leaderboard | 获取排行榜 | 否 |

---

## B8 错误处理（后端）

### 统一错误响应格式（固定，所有 API 必须遵守）

```typescript
interface ErrorResponse {
  code: string;       // 错误码，如 "AUTH_TOKEN_EXPIRED"
  message: string;    // 用户可读的中文消息
  details?: any;      // 可选的调试信息
}
```

### 错误码表（固定，不得新增）

| HTTP | code | message | 触发场景 |
|------|------|---------|---------|
| 400 | VALIDATION_ERROR | 请求参数错误 | 请求体校验失败 |
| 401 | AUTH_TOKEN_MISSING | 未登录 | 无 Token |
| 401 | AUTH_TOKEN_INVALID | 登录已失效 | Token 无效或过期 |
| 403 | FORBIDDEN | 无权操作 | 操作他人资源 |
| 404 | NOT_FOUND | 资源不存在 | 资源不存在 |
| 409 | CONFLICT | 资源冲突 | 邮箱已注册等 |
| 429 | RATE_LIMITED | 操作过于频繁 | 限流 |
| 500 | INTERNAL_ERROR | 服务器错误 | 未知异常 |
| 503 | SERVICE_UNAVAILABLE | 服务暂不可用 | 数据库不可达等 |

---

## 模块依赖关系（严格）

```
M1 UI 层
  ├─ M13 用户状态
  └─ M14 API 客户端

M2 画图生成键位
  └─ 依赖：无（纯前端）

M3 摄像头画面
  └─ 依赖：M1（UI 容器）

M4 手部追踪
  └─ 依赖：M3（视频流）

M5 键位叠加渲染
  ├─ 依赖：M2（KeyLayout）
  ├─ 依赖：M4（HandLandmarks）
  ├─ 输出给：M6（TriggerEvent）
  └─ 输出给：M8（TriggerEvent）

M6 音频合成
  ├─ 依赖：M5（TriggerEvent）
  └─ 输出给：M11（音频流，用于录制）

M7 调音器
  └─ 依赖：M1（UI 容器）

M8 特效
  ├─ 依赖：M4（HandLandmarks）
  └─ 依赖：M5（TriggerEvent）

M9 曲库
  ├─ 依赖：M14（API 获取曲目，可选）
  └─ 输出给：M5（音符序列用于引导）

M10 教学引导
  └─ 依赖：M1（UI 容器）

M11 分享录制
  ├─ 依赖：M5（Canvas 帧）
  ├─ 依赖：M6（音频流）
  └─ 依赖：M14（上传 API）

M12 挑战排行
  ├─ 依赖：M9（曲目）
  ├─ 依赖：M5（触发事件用于评分）
  └─ 依赖：M14（提交分数）

后端 B1-B8
  ├─ 依赖：数据库（Supabase）
  └─ 依赖：B8 错误处理
```

---

## 禁止事项（杜绝模型乱猜）

1. **禁止**自行新增模块，所有模块以本文档为准
2. **禁止**修改模块的输入输出接口
3. **禁止**调整算法阈值（如手部追踪置信度、触发判定 cooldown）
4. **禁止**更改音色合成参数
5. **禁止**更改路由路径
6. **禁止**更改错误码
7. **禁止**更改数据结构字段名
8. **禁止**使用本文档未列出的第三方库
9. **禁止**将曲库数据改为后端动态生成（必须硬编码或 migration 导入）
10. **禁止**在未定义错误处理的地方"自行添加容错"——按文档报错即可

如有本文档未覆盖的情况，必须先补充文档再实现，不得"自行判断"。
