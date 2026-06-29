# 声形绘 数据模型与状态机文档

> 本文档定义数据库表结构、前端状态机、关键业务流程。
> 适用对象：后端开发者、前端开发者、AI 实现模型。禁止自行修改字段或状态流转。

---

## 一、数据库表结构

### 1.1 users 用户表

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

**字段说明**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键，自动生成 |
| email | VARCHAR(255) | 邮箱，唯一 |
| password_hash | VARCHAR(255) | bcrypt 哈希（cost=10） |
| nickname | VARCHAR(50) | 昵称 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

---

### 1.2 play_records 演奏记录表

```sql
CREATE TABLE play_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instrument VARCHAR(20) NOT NULL,
  notes_played JSONB,
  duration_sec INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_play_records_user_id ON play_records(user_id);
CREATE INDEX idx_play_records_created_at ON play_records(created_at DESC);
```

**约束**
- instrument 必须是：'piano', 'guitar', 'violin', 'flute', 'drums' 之一
- duration_sec 范围：1-3600
- notes_played 数组长度：0-1000

**notes_played JSON 结构**
```json
[
  { "note": "C4", "timestamp": 0 },
  { "note": "D4", "timestamp": 500 }
]
```

---

### 1.3 tuning_records 调音记录表

```sql
CREATE TABLE tuning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instrument VARCHAR(20) NOT NULL,
  target_note VARCHAR(10) NOT NULL,
  measured_freq DECIMAL(10,2) NOT NULL,
  deviation_cents DECIMAL(5,1) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tuning_records_user_id ON tuning_records(user_id);
```

**约束**
- instrument 必须是：'guitar', 'violin' 之一（只有弦乐器需要调音）
- measured_freq 范围：20-2000
- deviation_cents 范围：-50 到 50

---

### 1.4 layouts 自定义键位布局表

```sql
CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  instrument VARCHAR(20) NOT NULL,
  shapes JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_layouts_user_id ON layouts(user_id);
```

**shapes JSON 结构**
```json
[
  {
    "type": "rect",
    "bounds": { "x": 0.1, "y": 0.4, "width": 0.1, "height": 0.2 }
  },
  {
    "type": "line",
    "bounds": { "x": 0.3, "y": 0.1, "width": 0.02, "height": 0.8 }
  }
]
```

**约束**
- shapes 数组长度：1-20
- 坐标值范围：0-1（归一化）

---

### 1.5 songs 曲库表

```sql
CREATE TABLE songs (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  artist VARCHAR(100) NOT NULL,
  instrument VARCHAR(20) NOT NULL,
  difficulty SMALLINT NOT NULL,
  bpm INT NOT NULL,
  duration_sec INT NOT NULL,
  cover_image VARCHAR(200),
  notes JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_songs_instrument ON songs(instrument);
CREATE INDEX idx_songs_difficulty ON songs(difficulty);
```

**约束**
- id：字符串主键，如 'twinkle'
- difficulty：1-5
- bpm：40-300
- notes 数组长度：1-2000

**notes JSON 结构**
```json
[
  { "note": "C4", "startTime": 0, "duration": 500 },
  { "note": "G4", "startTime": 1000, "duration": 500 }
]
```

---

### 1.6 clips 分享视频表

```sql
CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instrument VARCHAR(20) NOT NULL,
  duration_sec INT NOT NULL,
  video_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clips_user_id ON clips(user_id);
CREATE INDEX idx_clips_created_at ON clips(created_at DESC);
```

**约束**
- duration_sec 范围：1-60
- video_url：Supabase Storage 公开访问 URL

---

### 1.7 challenge_scores 挑战成绩表

```sql
CREATE TABLE challenge_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  song_id VARCHAR(50) NOT NULL REFERENCES songs(id),
  correct_count INT NOT NULL,
  total_count INT NOT NULL,
  max_combo INT NOT NULL,
  duration_sec INT NOT NULL,
  score INT NOT NULL,
  is_best BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_challenge_scores_user_date ON challenge_scores(user_id, challenge_date) WHERE is_best = TRUE;
CREATE INDEX idx_challenge_leaderboard ON challenge_scores(challenge_date, score DESC) WHERE is_best = TRUE;
```

**约束**
- 同一用户同一日期只能有一条 is_best=TRUE 的记录
- 提交新成绩时：若新分 > 历史最高分，则旧记录 is_best 置 FALSE，新记录 is_best=TRUE
- score 计算公式（后端执行）：`score = round((correct_count / total_count) * 100) + floor(max_combo / 10) * 5`

---

### 1.8 初始数据导入

**migration 文件：`migrations/001_init.sql`**

包含：
1. 上述所有 CREATE TABLE
2. 初始 10 首曲目 INSERT 语句（见 M9 模块定义的曲库表）

**曲目数据示例（小星星）**
```sql
INSERT INTO songs (id, title, artist, instrument, difficulty, bpm, duration_sec, cover_image, notes) VALUES
('twinkle', '小星星', '传统民谣', 'piano', 1, 80, 30, '/covers/twinkle.png',
  '[{"note":"C4","startTime":0,"duration":500},{"note":"C4","startTime":500,"duration":500},{"note":"G4","startTime":1000,"duration":500},{"note":"G4","startTime":1500,"duration":500},{"note":"A4","startTime":2000,"duration":500},{"note":"A4","startTime":2500,"duration":500},{"note":"G4","startTime":3000,"duration":1000}]'::jsonb
);
```

其余 9 首曲目在 migration 中按相同格式 INSERT。

---

## 二、前端状态机

### 2.1 全局用户状态（Zustand store）

```typescript
// store/userStore.ts
interface UserStore {
  // 状态
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // 设置
  settings: UserSettings;
  
  // 动作
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  updateSettings: (partial: Partial<UserSettings>) => void;
}

interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
}

interface UserSettings {
  volume: number;           // 0-100，默认 70
  sensitivity: number;      // 0-100，默认 50
  showHandSkeleton: boolean; // 默认 true
  theme: 'paper' | 'night'; // 默认 'paper'
}
```

**状态流转**
```
未登录 ──login/register──→ 加载中 ──成功──→ 已登录
                              │
                              └──失败──→ 未登录（保留错误）
已登录 ──logout/401──→ 未登录
```

---

### 2.2 工作台状态机（核心）

```typescript
// store/workbenchStore.ts
type WorkbenchPhase = 
  | 'idle'           // 初始状态，等待用户画图
  | 'drawing'        // 用户正在画图
  | 'generating'     // 正在生成键位
  | 'camera-pending' // 键位已生成，等待开启摄像头
  | 'camera-loading' // 摄像头初始化中
  | 'tracking'       // 摄像头已开启，手部追踪中
  | 'paused'         // 用户暂停
  | 'error';         // 错误状态

interface WorkbenchStore {
  phase: WorkbenchPhase;
  shapes: Shape[];              // 用户画的形状
  keyLayout: KeyLayout | null;  // 生成的键位布局
  currentInstrument: Instrument | null;
  triggerEvents: TriggerEvent[]; // 实时触发事件
  error: { code: string; message: string } | null;
  cameraStream: MediaStream | null;
  
  // 动作
  addShape: (shape: Shape) => void;
  clearShapes: () => void;
  undoLastShape: () => void;
  loadTemplate: (templateId: string) => void;
  generateLayout: () => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  pauseTracking: () => void;
  resumeTracking: () => void;
  setError: (error: { code: string; message: string }) => void;
  clearError: () => void;
}
```

**状态流转图**

```
                ┌──────────┐
                │   idle   │ ← 初始
                └─────┬────┘
                      │ addShape
                      ▼
                ┌──────────┐
                │ drawing  │
                └─────┬────┘
                      │ generateLayout
                      ▼
                ┌───────────┐
                │generating │
                └─────┬─────┘
                      │ 成功
                      ▼
              ┌────────────────┐
              │ camera-pending │
              └───────┬────────┘
                      │ startCamera
                      ▼
              ┌───────────────┐
              │camera-loading │
              └───────┬───────┘
                      │ 成功
                      ▼
                ┌──────────┐
        ┌──→──→ │ tracking │ ←─→──→──┐
        │       └─────┬────┘         │
        │             │ pauseTracking│ resumeTracking
        │             ▼              │
        │       ┌──────────┐         │
        └──←─── │  paused  │ ──←─────┘
                └──────────┘
                
任何状态 → error（出错时）
任何状态 → idle（用户清空/重置）
tracking → camera-pending（stopCamera）
```

**禁止的状态跳转**
- idle 不能直接跳到 tracking（必须经过 drawing → generating → camera-pending）
- error 不能直接跳到 tracking（必须先 clearError 回到 idle 或 camera-pending）

---

### 2.3 调音器状态机

```typescript
type TunerPhase = 'idle' | 'starting' | 'listening' | 'error';

interface TunerStore {
  phase: TunerPhase;
  pitchDetection: PitchDetection | null;
  targetInstrument: 'guitar' | 'violin' | null;
  error: string | null;
  
  start: (instrument: 'guitar' | 'violin') => Promise<void>;
  stop: () => void;
}
```

**流转**
```
idle ──start──→ starting ──成功──→ listening
                    │                  │
                    └──失败──→ error   │ stop
                                       ▼
                                     idle
```

---

### 2.4 录制状态机

```typescript
type RecordingPhase = 'idle' | 'recording' | 'processing' | 'done' | 'error';

interface RecordingStore {
  phase: RecordingPhase;
  clipId: string | null;
  durationSec: number;
  error: string | null;
  
  start: () => void;
  stop: () => Promise<void>;  // 返回 clipId
  cancel: () => void;
}
```

**流转**
```
idle ──start──→ recording ──stop──→ processing ──成功──→ done
                    │                    │
                    └──cancel──→ idle    └──失败──→ error
```

**约束**
- 录制上限 60 秒，到时间自动 stop
- recording 状态必须基于 WorkbenchStore.phase === 'tracking'
- tracking 停止时，若仍在 recording，自动 stop

---

### 2.5 挑战模式状态机

```typescript
type ChallengePhase = 'idle' | 'loading' | 'ready' | 'playing' | 'scoring' | 'result';

interface ChallengeStore {
  phase: ChallengePhase;
  todaySong: Song | null;
  startTime: number | null;
  triggers: TriggerEvent[];
  correctCount: number;
  totalCount: number;
  maxCombo: number;
  score: number;
  rank: number | null;
  
  loadToday: () => Promise<void>;
  start: () => void;
  recordTrigger: (event: TriggerEvent) => void;
  submit: () => Promise<void>;
  reset: () => void;
}
```

**流转**
```
idle ──loadToday──→ loading ──成功──→ ready
                       │
                       └──失败──→ idle（显示错误）
ready ──start──→ playing ──曲目结束/用户停止──→ scoring
                                                    │
                                                    ▼
                                                  result
                                                    │
                                                    └──reset──→ ready
```

**评分算法（前端实时）**
```
对每个 trigger：
  找到 notes 中 startTime 与 trigger.timestamp 最接近的音符（误差 <= 200ms）
  若找到且 note 匹配 → correctCount++，combo++
  否则 → combo = 0
  maxCombo = max(maxCombo, combo)

submit 时：
  score = round((correctCount / totalCount) * 100) + floor(maxCombo / 10) * 5
```

---

## 三、关键业务流程

### 3.1 从画图到演奏的完整流程

```
1. 用户进入 /workbench
2. WorkbenchStore.phase = 'idle'
3. 用户在画布画形状
   - 每画一个形状 → addShape() → phase = 'drawing'
4. 用户点击"生成键位并开始演奏"
   - generateLayout()
   - phase = 'generating'
   - 调用 M2 的识别算法
   - 若识别失败 → phase = 'error' + error.code = 'SHAPE_NOT_RECOGNIZED'
   - 若成功 → keyLayout 生成 → phase = 'camera-pending'
5. 用户点击"开启摄像头"
   - startCamera()
   - phase = 'camera-loading'
   - 调用 M3 获取 MediaStream
   - 失败 → phase = 'error' + 对应错误码
   - 成功 → phase = 'tracking'
6. M4 开始手部追踪，每帧：
   - 调用 M5 检测触发
   - 触发 → M6 发声 + M8 特效
   - 触发 → M12 记录（若在挑战模式）
7. 用户点击"停止"
   - stopCamera()
   - phase = 'camera-pending'
   - 若在录制中 → 自动停止录制
```

---

### 3.2 用户注册登录流程

```
1. 用户访问任意需登录页面 → M13 检测无 token → 跳转 /login
2. 用户输入邮箱密码 → login()
3. POST /api/auth/login
4. 成功 → 存 token 到 localStorage → 更新 user → 跳回原页面
5. 失败 → 显示错误 Toast
6. Token 过期 → 任意 API 返回 401 → M13 清除 token → 跳转 /login
```

---

### 3.3 保存演奏记录流程

```
1. 用户在 tracking 状态演奏
2. M5 每次触发 → triggers 数组追加事件
3. 用户点击"停止演奏"
4. 若用户已登录：
   - POST /api/records { instrument, notesPlayed: triggers, durationSec }
   - 成功 → Toast "记录已保存"
   - 失败 → Toast "保存失败，记录已暂存本地"
5. 若用户未登录：
   - Toast "登录后可保存记录" + [去登录]按钮
   - 记录暂存到 localStorage（key: soundshape_pending_record）
   - 用户登录后自动检查并提交
```

---

### 3.4 录制分享流程

```
1. 用户在 tracking 状态点击"开始录制"
2. M11 启动 MediaRecorder
3. 录制中：Canvas 帧 + AudioStream 合成
4. 60 秒到/用户点击"停止录制"
5. phase = 'processing'
6. 生成 Blob → 上传 POST /api/clips
7. 后端存储到 Supabase Storage → 返回 videoUrl
8. phase = 'done' → 显示"分享链接已生成：/share/:clipId"
9. 用户可复制链接分享
```

---

### 3.5 挑战模式流程

```
1. 用户访问 /challenge
2. loadToday() → GET /api/challenge/today
3. 显示今日挑战曲目信息
4. 用户点击"开始挑战"
5. 挑战模式启动，复用工作台流程：
   - 用户需先画图/选模板生成对应乐器的键位
   - 摄像头开启
   - 曲目音符开始下落显示
6. 用户演奏，M5 触发事件 → ChallengeStore.recordTrigger()
7. 实时计算 correctCount/maxCombo
8. 曲目播放完毕 → phase = 'scoring'
9. submit() → POST /api/challenge/submit
10. 后端计算最终 score，更新 is_best，返回 rank
11. phase = 'result' → 显示得分、名次、排行榜
```

---

## 四、前端本地存储规范

| Key | 内容 | 有效期 | 清除时机 |
|-----|------|--------|---------|
| soundshape_token | JWT Token | 7 天 | 登出/401 |
| soundshape_settings | 用户设置 | 永久 | 用户清除浏览器数据 |
| soundshape_pending_record | 未保存的演奏记录 | 1 次 | 登录后成功提交 |
| soundshape_visited | 是否访问过（用于引导） | 永久 | - |

**禁止**在前端 localStorage 存储其他数据。所有用户数据必须通过 API 持久化到后端。

---

## 五、错误处理矩阵

| 场景 | 前端动作 | 后端动作 |
|------|---------|---------|
| 摄像头授权拒绝 | Toast + 显示引导 | 无 |
| MediaPipe 加载失败 | Toast + 提供键盘模式 | 无 |
| 画图识别失败 | Toast + 引导选模板 | 无 |
| 登录密码错误 | Toast | 返回 401 + AUTH_INVALID_CREDENTIALS |
| Token 过期 | 清除 token + 跳转登录 | 返回 401 + AUTH_TOKEN_INVALID |
| API 限流 | Toast "操作过频" | 返回 429 + RATE_LIMITED |
| 后端不可达 | Toast + 自动重试 1 次 | - |
| 数据库错误 | Toast "服务暂不可用" | 返回 503 + SERVICE_UNAVAILABLE |
| 上传文件过大 | 前端预校验 + Toast | 返回 413 + FILE_TOO_LARGE |
| 提交挑战成绩非本人 | - | 返回 403 + FORBIDDEN |

---

## 六、性能指标（验收标准）

| 指标 | 目标值 | 测量方法 |
|------|--------|---------|
| 首页加载（FCP） | < 2s | Lighthouse |
| 摄像头开启到首帧 | < 1s | performance.now() |
| 手部追踪帧率 | >= 25fps（桌面）/ 20fps（移动端） | requestAnimationFrame 统计 |
| 触发到发声延迟 | < 50ms | performance.now() |
| API 响应时间（p95） | < 300ms | 后端日志 |
| 演奏区内存占用 | < 200MB | Chrome DevTools |

未达标时优先降级特效（M8），其次降低摄像头分辨率（M3）。

---

## 七、禁止事项

1. **禁止**修改表结构字段名或类型
2. **禁止**修改状态机的状态集合和流转规则
3. **禁止**在前端 localStorage 存储敏感数据（密码、个人信息）
4. **禁止**绕过 API 直接访问数据库
5. **禁止**在错误处理中"自行添加容错"——按本文档的矩阵执行
6. **禁止**修改评分公式
7. **禁止**修改录制时长上限（60 秒）
8. **禁止**在未定义的状态下渲染 UI——必须先回到 idle 或 error
9. **禁止**在前端硬编码后端 URL——必须用环境变量
10. **禁止**在 API 响应中省略 code 字段

如有未覆盖的场景，必须先补充本文档再实现。
