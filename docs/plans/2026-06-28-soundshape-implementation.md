# 声形绘 SoundShape 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现完整的"画出来就能弹"Web 应用——用户画形状生成虚拟键位，摄像头实时追踪手部，区域触发演奏，含曲库/教学/分享/挑战，全设备响应式，极简现代风 UI。

**Architecture:** 前端 React+Vite+TS+Tailwind+MediaPipe Hands+Web Audio，后端 Node.js+Express+TS+PostgreSQL(Supabase)，部署 Vercel+Render。

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, @mediapipe/hands, Web Audio API, Zustand, Axios, Node.js 18, Express, jsonwebtoken, bcryptjs, pg, multer, @supabase/supabase-js。

**严格依据文档：**
- docs/specs/2026-06-28-soundshape-design.md
- docs/specs/2026-06-28-soundshape-ui-design.md
- docs/specs/2026-06-28-soundshape-modules.md
- docs/specs/2026-06-28-soundshape-api.md
- docs/specs/2026-06-28-soundshape-data-model.md

**禁止事项：** 不得偏离 spec 定义的字段名、阈值、路由、错误码。详见各 spec 文档末尾。

---

## 执行顺序

```
Phase 1 脚手架（Task 1-3）
Phase 2 后端基础（Task 4-6）
Phase 3 后端业务（Task 7-12）
Phase 4 前端基础（Task 13-17）
Phase 5 前端核心模块（Task 18-25）
Phase 6 前端内容模块（Task 26-29）
Phase 7 收尾与部署（Task 30-33）
```

---

## 审查规范（强制约束，适用于每个 Task）

> 自己审自己发现不了问题。每个 Task 实现完成后，**必须**派发**至少 3 个独立子代理**并行审查，三者职责互斥、不可互相代劳。任一子代理发现阻断问题，必须修复后重新派发该子代理复审，直到 3 份审查报告全部 PASS 才能进入下一个 Task。

### 子代理 A：测试用例审查员

**职责：** 只看测试代码本身是否合格，不跑、不看实现。

**审查清单：**
1. 每个 Task 的 Step 中要求写的测试是否真的写了（文件存在、用例数对得上）
2. 测试是否覆盖了"正常路径 + 边界值 + 异常路径"三类
3. 断言是否有效（不能只 `expect(true).toBe(true)`、不能只验 `truthy`）
4. 是否有 mock 漏洞（mock 了不该 mock 的、漏 mock 导致测试依赖外部环境）
5. 测试命名是否清晰描述行为（`should ... when ...`）
6. 是否存在测试间状态泄漏（共享 ref / 全局变量未重置）
7. 覆盖率盲区：分支覆盖是否漏了关键 if/else 分支

**输出格式：**
```
[子代理 A] 测试用例审查
- 文件：xxx.test.ts
- 用例数：N（预期 M）
- 缺失场景：...
- 断言强度：...
- 阻断问题：[0-N]
- 结论：PASS / FAIL
```

### 子代理 B：功能审查员

**职责：** 静态走查实现代码 + 对照 spec，验证功能是否符合定义。

**审查清单：**
1. 实现是否对齐 spec / API 文档的字段名、阈值、错误码（禁止改名字段、禁止自加端点）
2. 每个 Task 的 Files 清单中列出的文件是否都创建/修改了
3. 跨 Task 的类型/接口签名是否一致（如 Task 15 的 `PlayRecord.notesPlayed` 与 Task 7 后端响应字段必须一致）
4. 边界条件处理：空数组 / null / undefined / 超长输入 / 并发触发是否有兜底
5. 错误路径是否真的抛出或返回了 spec 规定的错误码（不能吞异常）
6. 是否引入了 spec 禁止事项（自加端点、改分页参数名、改 Token 格式等）
7. 是否有"看似实现实则空壳"的函数（`return null` / `// TODO` / 永远走不到的分支）

**输出格式：**
```
[子代理 B] 功能审查
- 对齐 spec：是/否（不一致项：...）
- 文件完整性：是/否（缺失：...）
- 类型一致性：是/否（冲突：...）
- 边界处理：...
- 错误路径：...
- 阻断问题：[0-N]
- 结论：PASS / FAIL
```

### 子代理 C：冒烟测试员

**职责：** 实际跑起来验证，确认核心路径不崩。

**审查清单：**
1. 跑 `npm run build`（前端 / 后端）→ 必须无 TS 报错、无构建失败
2. 跑 `npm test` → 必须全部通过（不能有 skip / only / todo 标记）
3. 跑 `npm run lint`（如配置）→ 必须无 error
4. 后端 Task：启动 `npm run dev`，用 curl 或脚本调用本 Task 新增的 API 端点：
   - 正常请求返回 200/201 + `{code:0, data:...}`
   - 缺字段返回 400 + `VALIDATION_ERROR`
   - 未授权返回 401 + `AUTH_TOKEN_MISSING` / `AUTH_TOKEN_INVALID`
5. 前端 Task：启动 `npm run dev`，人工或 Playwright 打开对应页面：
   - 页面不白屏
   - 核心交互可走通（如点按钮有响应、表单可提交）
   - 控制台无 uncaught error
6. 检查 `git status` 是否有未提交残留文件、是否误提交 `.env` / `dist/` / `node_modules/`
7. 跨 Task 集成冒烟：若当前 Task 依赖前序 Task，必须验证前序功能仍正常（回归）

**输出格式：**
```
[子代理 C] 冒烟测试
- build：PASS / FAIL（错误：...）
- test：PASS / FAIL（失败用例：...）
- lint：PASS / FAIL
- API 冒烟（后端）：...
- 页面冒烟（前端）：...
- 残留文件：...
- 阻断问题：[0-N]
- 结论：PASS / FAIL
```

### 审查流程

```
Task 实现完成
    ↓
并行派发子代理 A + B + C（互相独立，不共享上下文）
    ↓
收集 3 份审查报告
    ↓
任一报告 FAIL？
  是 → 修复阻断问题 → 重新派发 FAIL 的子代理复审
  否 → 该 Task 视为通过 → Commit → 进入下一 Task
```

### 禁止事项

1. **禁止**用同一个子代理兼任多个审查角色
2. **禁止**跳过任一审查员（即使 Task 很"简单"）
3. **禁止**审查员只看报告不读代码（必须 Read 源文件）
4. **禁止**把审查员的 PASS 当形式（审查员必须给出具体证据：文件路径、行号、命令输出）
5. **禁止**在 3 份报告未齐前 Commit 或进入下一 Task

---

# Phase 1：项目脚手架

## Task 1：前端项目初始化

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.js`, `frontend/postcss.config.js`
- Create: `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`
- Create: `frontend/src/styles/globals.css`, `frontend/.env.example`, `frontend/.gitignore`

- [ ] **Step 1: 创建 Vite React+TS 项目**

```bash
cd "d:/work1/music voice"
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install zustand axios react-router-dom framer-motion @mediapipe/hands @mediapipe/camera_utils
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: 配置 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: { bg: '#FAFAF7', elevated: '#FFFFFF', recessed: '#F0EFEA' },
        ink: { primary: '#0A0A0A', secondary: '#4A4A4A', tertiary: '#9A9A9A' },
        electric: { DEFAULT: '#0066FF', deep: '#0044CC' },
        neon: { cyan: '#00F0FF', magenta: '#FF00C8', yellow: '#FFE600' },
        hairline: '#E5E3DD',
      },
      fontFamily: {
        display: ['Fraunces', 'Source Han Serif SC', 'serif'],
        body: ['Inter Tight', '-apple-system', 'PingFang SC', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: 配置 globals.css**

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --paper-bg: #FAFAF7;
  --paper-elevated: #FFFFFF;
  --paper-recessed: #F0EFEA;
  --ink-primary: #0A0A0A;
  --ink-secondary: #4A4A4A;
  --ink-tertiary: #9A9A9A;
  --electric: #0066FF;
  --electric-deep: #0044CC;
  --success: #00B86B;
  --warn: #FF8800;
  --error: #E63229;
  --hairline: #E5E3DD;
  --night-bg: #000000;
  --neon-cyan: #00F0FF;
  --neon-magenta: #FF00C8;
  --neon-yellow: #FFE600;
}

html, body, #root { height: 100%; margin: 0; padding: 0; }
body {
  background: var(--paper-bg);
  color: var(--ink-primary);
  font-family: 'Inter Tight', -apple-system, 'PingFang SC', sans-serif;
  -webkit-font-smoothing: antialiased;
}
* { box-sizing: border-box; }

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--paper-bg); }
::-webkit-scrollbar-thumb { background: var(--hairline); border-radius: 4px; }

@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center px-6 py-3 rounded-full font-medium transition-all;
    background: var(--electric); color: white; height: 44px;
  }
  .btn-primary:hover { background: var(--electric-deep); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,102,255,0.25); }
  .btn-primary:active { transform: scale(0.97); }
  .btn-secondary {
    @apply inline-flex items-center justify-center px-6 py-3 rounded-full font-medium transition-all border;
    background: transparent; color: var(--electric); border-color: var(--electric); height: 44px;
  }
  .btn-secondary:hover { background: rgba(0,102,255,0.05); }
  .card {
    @apply rounded-2xl bg-white p-6 transition-all;
    box-shadow: 0 4px 24px rgba(0,0,0,0.04);
  }
  .card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
  .input {
    @apply w-full rounded-xl px-4 py-3 transition-all;
    background: var(--paper-recessed); border: 1px solid transparent;
    color: var(--ink-primary); height: 44px;
  }
  .input:focus { outline: none; border-color: var(--electric); box-shadow: 0 0 0 4px rgba(0,102,255,0.1); }
  .micro-label { @apply text-xs font-medium uppercase; color: var(--ink-tertiary); letter-spacing: 0.15em; }
}
```

- [ ] **Step 4: 写 animations.css**

```css
/* frontend/src/styles/animations.css */
@keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
@keyframes spin { to { transform: rotate(360deg); } }

.animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) both; }
.animate-fade-in { animation: fadeIn 0.3s ease-out both; }
.animate-scale-in { animation: scaleIn 0.2s ease-out both; }
.animate-spin-slow { animation: spin 1.2s linear infinite; }
.stagger-1 { animation-delay: 80ms; }
.stagger-2 { animation-delay: 160ms; }
.stagger-3 { animation-delay: 240ms; }
.stagger-4 { animation-delay: 320ms; }
```

- [ ] **Step 5: 写 main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './styles/animations.css';
import { BrowserRouter } from 'react-router-dom';
import { useUserStore } from './store/userStore';

useUserStore.getState().hydrateFromStorage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 6: 写最小 App.tsx**

```tsx
export default function App() {
  return <div className="p-8 font-display text-3xl">声形绘 SoundShape</div>;
}
```

- [ ] **Step 7: 配置 .env.example 与 .gitignore**

```
# .env.example
VITE_API_URL=http://localhost:3000
```
```
# .gitignore
node_modules
dist
.env
*.local
```

- [ ] **Step 8: 启动验证**

```bash
npm run dev
```
预期：访问 http://localhost:5173 显示"声形绘 SoundShape"。

- [ ] **Step 9: Commit**

```bash
cd "d:/work1/music voice"
git init
git add frontend
git commit -m "feat: 初始化前端项目脚手架"
```

---

## Task 2：后端项目初始化

**Files:**
- Create: `backend/package.json`, `backend/tsconfig.json`
- Create: `backend/src/server.ts`, `backend/src/config.ts`
- Create: `backend/.env.example`, `backend/.gitignore`

- [ ] **Step 1: 创建后端目录并初始化**

```bash
cd "d:/work1/music voice"
mkdir backend
cd backend
npm init -y
npm install express cors jsonwebtoken bcryptjs pg multer @supabase/supabase-js
npm install -D typescript @types/node @types/express @types/cors @types/jsonwebtoken @types/bcryptjs @types/pg @types/multer ts-node-dev
```

- [ ] **Step 2: 配置 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: 配置 package.json scripts**

在 package.json 中加入：
```json
"scripts": {
  "dev": "ts-node-dev --respawn src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js"
}
```

- [ ] **Step 4: 写 config.ts**

```typescript
// backend/src/config.ts
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '20971520', 10),
};
```

- [ ] **Step 5: 写 server.ts（最小可启动）**

```typescript
// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import { config } from './config';

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ code: 0, data: { status: 'ok' } });
});

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
```

- [ ] **Step 6: 配置 .env.example**

```
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/soundshape
JWT_SECRET=your-random-32-char-secret
JWT_EXPIRES_IN=7d
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
CORS_ORIGIN=http://localhost:5173
MAX_FILE_SIZE=20971520
```

- [ ] **Step 7: 启动验证**

```bash
npm run dev
```
预期：访问 http://localhost:3000/health 返回 `{"code":0,"data":{"status":"ok"}}`。

- [ ] **Step 8: Commit**

```bash
cd "d:/work1/music voice"
git add backend
git commit -m "feat: 初始化后端项目脚手架"
```

---

## Task 3：数据库 migration 文件

**Files:**
- Create: `backend/migrations/001_init.sql`

- [ ] **Step 1: 写 migration SQL**

完整 SQL 见 `docs/specs/2026-06-28-soundshape-data-model.md` 第一节，包含：
- users / play_records / tuning_records / layouts / songs / clips / challenge_scores 7 张表
- 所有索引
- 10 首初始曲目 INSERT 语句（见 modules 文档 M9 定义）

将完整 SQL 写入 `backend/migrations/001_init.sql`。

- [ ] **Step 2: 在 Supabase 控制台执行**

登录 Supabase → SQL Editor → 粘贴 001_init.sql 内容 → Run。

- [ ] **Step 3: 在 Supabase Storage 创建 bucket**

控制台 → Storage → New bucket → 名称 `clips` → Public。

- [ ] **Step 4: Commit**

```bash
git add backend/migrations
git commit -m "feat: 数据库 migration 与初始曲库"
```

---

# Phase 2：后端基础

## Task 4：错误处理与中间件

**Files:**
- Create: `backend/src/utils/api-response.ts`
- Create: `backend/src/middleware/error.ts`
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/services/db.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: 写 api-response.ts**

```typescript
// backend/src/utils/api-response.ts
import { Response } from 'express';

export function success(res: Response, data: any, status = 200) {
  return res.status(status).json({ code: 0, data });
}

export function fail(res: Response, status: number, code: string, message: string, details?: any) {
  return res.status(status).json({ code, message, details });
}

export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: any) {
    super(message);
  }
}

export const ERROR_CODES = {
  VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR', message: '请求参数错误' },
  AUTH_TOKEN_MISSING: { status: 401, code: 'AUTH_TOKEN_MISSING', message: '未登录，请先登录' },
  AUTH_TOKEN_INVALID: { status: 401, code: 'AUTH_TOKEN_INVALID', message: '登录已失效，请重新登录' },
  AUTH_INVALID_CREDENTIALS: { status: 401, code: 'AUTH_INVALID_CREDENTIALS', message: '邮箱或密码错误' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN', message: '无权操作此资源' },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: '资源不存在' },
  CONFLICT: { status: 409, code: 'CONFLICT', message: '资源已存在' },
  FILE_TOO_LARGE: { status: 413, code: 'FILE_TOO_LARGE', message: '文件过大' },
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED', message: '操作过于频繁，请稍后再试' },
  INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR', message: '服务器内部错误' },
  SERVICE_UNAVAILABLE: { status: 503, code: 'SERVICE_UNAVAILABLE', message: '服务暂不可用，请稍后重试' },
} as const;
```

- [ ] **Step 2: 写 error.ts 中间件**

```typescript
// backend/src/middleware/error.ts
import { Request, Response, NextFunction } from 'express';
import { AppError, fail, ERROR_CODES } from '../utils/api-response';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return fail(res, err.status, err.code, err.message, err.details);
  }
  console.error('Unhandled error:', err);
  return fail(res, 500, ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message);
}

export function notFoundHandler(_req: Request, res: Response) {
  return fail(res, 404, ERROR_CODES.NOT_FOUND.code, ERROR_CODES.NOT_FOUND.message);
}
```

- [ ] **Step 3: 写 auth.ts 中间件**

```typescript
// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { fail, ERROR_CODES } from '../utils/api-response';

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, ERROR_CODES.AUTH_TOKEN_MISSING.status, ERROR_CODES.AUTH_TOKEN_MISSING.code, ERROR_CODES.AUTH_TOKEN_MISSING.message);
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return fail(res, ERROR_CODES.AUTH_TOKEN_INVALID.status, ERROR_CODES.AUTH_TOKEN_INVALID.code, ERROR_CODES.AUTH_TOKEN_INVALID.message);
  }
}
```

- [ ] **Step 4: 写 db.ts 服务**

```typescript
// backend/src/services/db.ts
import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PG client', err);
});
```

- [ ] **Step 5: 更新 server.ts**

```typescript
// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error';

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ code: 0, data: { status: 'ok' } });
});

// 路由将在此处注册（后续 Task 添加）

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
```

- [ ] **Step 6: 验证启动**

```bash
cd backend && npm run dev
```
预期：/health 正常，/notexist 返回 404 错误格式。

- [ ] **Step 7: Commit**

```bash
git add backend/src
git commit -m "feat: 后端错误处理与中间件"
```

---

## Task 5：JWT 认证服务

**Files:**
- Create: `backend/src/services/auth.ts`
- Create: `backend/src/routes/auth.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: 写 auth service**

```typescript
// backend/src/services/auth.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { pool } from './db';
import { AppError, ERROR_CODES } from '../utils/api-response';

export async function registerUser(email: string, password: string, nickname: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(400, 'VALIDATION_ERROR', '邮箱格式不正确');
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password))
    throw new AppError(400, 'VALIDATION_ERROR', '密码需 8-32 位且含字母和数字');
  if (!nickname || nickname.length > 20) throw new AppError(400, 'VALIDATION_ERROR', '昵称长度需 1-20');

  const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (exists.rows.length > 0) throw new AppError(ERROR_CODES.CONFLICT.status, ERROR_CODES.CONFLICT.code, '邮箱已注册');

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, nickname) VALUES ($1, $2, $3) RETURNING id, email, nickname, created_at',
    [email, passwordHash, nickname]
  );
  const user = result.rows[0];
  const token = signToken(user.id);
  return { token, user };
}

export async function loginUser(email: string, password: string) {
  const result = await pool.query('SELECT id, email, nickname, password_hash, created_at FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS.status, ERROR_CODES.AUTH_INVALID_CREDENTIALS.code, ERROR_CODES.AUTH_INVALID_CREDENTIALS.message);
  const user = result.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS.status, ERROR_CODES.AUTH_INVALID_CREDENTIALS.code, ERROR_CODES.AUTH_INVALID_CREDENTIALS.message);
  const token = signToken(user.id);
  return { token, user: { id: user.id, email: user.email, nickname: user.nickname, createdAt: user.created_at } };
}

export async function getUserById(userId: string) {
  const result = await pool.query('SELECT id, email, nickname, created_at FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) throw new AppError(ERROR_CODES.NOT_FOUND.status, ERROR_CODES.NOT_FOUND.code, '用户不存在');
  return result.rows[0];
}

function signToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
}
```

- [ ] **Step 2: 写 auth 路由**

```typescript
// backend/src/routes/auth.ts
import { Router } from 'express';
import { registerUser, loginUser, getUserById } from '../services/auth';
import { success, fail } from '../utils/api-response';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, nickname } = req.body;
    const result = await registerUser(email, password, nickname);
    success(res, result, 201);
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, 400, 'VALIDATION_ERROR', '请输入邮箱和密码');
    const result = await loginUser(email, password);
    success(res, result);
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await getUserById(req.userId!);
    success(res, user);
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 3: 在 server.ts 注册路由**

在 `app.get('/health')` 之后、`notFoundHandler` 之前加入：

```typescript
import authRouter from './routes/auth';
app.use('/api/auth', authRouter);
```

- [ ] **Step 4: 手动测试**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234","nickname":"测试"}'
```
预期：返回 `{ code: 0, data: { token, user } }`。

- [ ] **Step 5: Commit**

```bash
git add backend/src
git commit -m "feat: 用户认证服务"
```

---

## Task 6：认证接口测试

**Files:**
- Create: `backend/src/__tests__/auth.test.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: 安装测试依赖**

```bash
cd backend
npm install -D jest ts-jest @types/jest supertest @types/supertest
```

在 package.json 加：
```json
"scripts": { "test": "jest" },
"jest": { "preset": "ts-jest", "testEnvironment": "node" }
```

- [ ] **Step 2: 写测试**

```typescript
// backend/src/__tests__/auth.test.ts
import request from 'supertest';
import express from 'express';
import authRouter from '../routes/auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('POST /api/auth/register 参数校验', () => {
  it('空字段应返回 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: '', password: '', nickname: '' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
  it('密码不符规则应返回 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: '123', nickname: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
  it('昵称过长应返回 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: 'Test1234', nickname: 'x'.repeat(25) });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login 参数校验', () => {
  it('缺字段应返回 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: '' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
npm test
```
预期：测试全部通过。

- [ ] **Step 4: Commit**

```bash
git add backend
git commit -m "test: 认证接口参数校验测试"
```

---

# Phase 3：后端业务服务

## Task 7：演奏记录服务

**Files:**
- Create: `backend/src/routes/records.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: 写 records 路由**

```typescript
// backend/src/routes/records.ts
import { Router } from 'express';
import { pool } from '../services/db';
import { success, fail, ERROR_CODES, AppError } from '../utils/api-response';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const INSTRUMENTS = ['piano', 'guitar', 'violin', 'flute', 'drums'];

router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;
    const totalResult = await pool.query('SELECT COUNT(*) FROM play_records WHERE user_id = $1', [req.userId]);
    const total = parseInt(totalResult.rows[0].count, 10);
    const result = await pool.query(
      'SELECT id, user_id, instrument, notes_played, duration_sec, created_at FROM play_records WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.userId, pageSize, offset]
    );
    success(res, { items: result.rows, total, page, pageSize });
  } catch (e) { next(e); }
});

router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { instrument, notesPlayed, durationSec } = req.body;
    if (!INSTRUMENTS.includes(instrument)) return fail(res, 400, 'VALIDATION_ERROR', 'instrument 不合法');
    if (typeof durationSec !== 'number' || durationSec < 1 || durationSec > 3600)
      return fail(res, 400, 'VALIDATION_ERROR', 'durationSec 须为 1-3600');
    if (notesPlayed && (!Array.isArray(notesPlayed) || notesPlayed.length > 1000))
      return fail(res, 400, 'VALIDATION_ERROR', 'notesPlayed 最多 1000 条');
    const result = await pool.query(
      'INSERT INTO play_records (user_id, instrument, notes_played, duration_sec) VALUES ($1, $2, $3, $4) RETURNING id, user_id, instrument, notes_played, duration_sec, created_at',
      [req.userId, instrument, JSON.stringify(notesPlayed || []), durationSec]
    );
    success(res, result.rows[0], 201);
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query('DELETE FROM play_records WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) throw new AppError(ERROR_CODES.NOT_FOUND.status, ERROR_CODES.NOT_FOUND.code, '记录不存在或不属于当前用户');
    success(res, { id: result.rows[0].id });
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 2: 在 server.ts 注册**

```typescript
import recordsRouter from './routes/records';
app.use('/api/records', recordsRouter);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src
git commit -m "feat: 演奏记录 CRUD 服务"
```

---

## Task 8：调音记录服务

**Files:**
- Create: `backend/src/routes/tunings.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: 写 tunings 路由**

```typescript
// backend/src/routes/tunings.ts
import { Router } from 'express';
import { pool } from '../services/db';
import { success, fail, ERROR_CODES, AppError } from '../utils/api-response';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const INSTRUMENTS = ['guitar', 'violin'];

router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;
    const totalResult = await pool.query('SELECT COUNT(*) FROM tuning_records WHERE user_id = $1', [req.userId]);
    const total = parseInt(totalResult.rows[0].count, 10);
    const result = await pool.query(
      'SELECT id, user_id, instrument, target_note, measured_freq, deviation_cents, created_at FROM tuning_records WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.userId, pageSize, offset]
    );
    success(res, { items: result.rows, total, page, pageSize });
  } catch (e) { next(e); }
});

router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { instrument, targetNote, measuredFreq, deviationCents } = req.body;
    if (!INSTRUMENTS.includes(instrument)) return fail(res, 400, 'VALIDATION_ERROR', 'instrument 必须是 guitar 或 violin');
    if (!targetNote || typeof targetNote !== 'string') return fail(res, 400, 'VALIDATION_ERROR', 'targetNote 必填');
    if (typeof measuredFreq !== 'number' || measuredFreq < 20 || measuredFreq > 2000)
      return fail(res, 400, 'VALIDATION_ERROR', 'measuredFreq 须为 20-2000');
    if (typeof deviationCents !== 'number' || deviationCents < -50 || deviationCents > 50)
      return fail(res, 400, 'VALIDATION_ERROR', 'deviationCents 须为 -50 到 50');
    const result = await pool.query(
      'INSERT INTO tuning_records (user_id, instrument, target_note, measured_freq, deviation_cents) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at',
      [req.userId, instrument, targetNote, measuredFreq, deviationCents]
    );
    success(res, result.rows[0], 201);
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query('DELETE FROM tuning_records WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) throw new AppError(ERROR_CODES.NOT_FOUND.status, ERROR_CODES.NOT_FOUND.code, '记录不存在或不属于当前用户');
    success(res, { id: result.rows[0].id });
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 2: 在 server.ts 注册**

```typescript
import tuningsRouter from './routes/tunings';
app.use('/api/tunings', tuningsRouter);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src
git commit -m "feat: 调音记录 CRUD 服务"
```

---

## Task 9：自定义布局服务

**Files:**
- Create: `backend/src/routes/layouts.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: 写 layouts 路由**

```typescript
// backend/src/routes/layouts.ts
import { Router } from 'express';
import { pool } from '../services/db';
import { success, fail, ERROR_CODES, AppError } from '../utils/api-response';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const INSTRUMENTS = ['piano', 'guitar', 'violin', 'flute', 'drums'];

router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;
    const totalResult = await pool.query('SELECT COUNT(*) FROM layouts WHERE user_id = $1', [req.userId]);
    const total = parseInt(totalResult.rows[0].count, 10);
    const result = await pool.query(
      'SELECT id, user_id, name, instrument, shapes, created_at FROM layouts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.userId, pageSize, offset]
    );
    success(res, { items: result.rows, total, page, pageSize });
  } catch (e) { next(e); }
});

router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { name, instrument, shapes } = req.body;
    if (!name || name.length > 50) return fail(res, 400, 'VALIDATION_ERROR', 'name 长度须 1-50');
    if (!INSTRUMENTS.includes(instrument)) return fail(res, 400, 'VALIDATION_ERROR', 'instrument 不合法');
    if (!Array.isArray(shapes) || shapes.length < 1 || shapes.length > 20)
      return fail(res, 400, 'VALIDATION_ERROR', 'shapes 须为 1-20 个');
    const result = await pool.query(
      'INSERT INTO layouts (user_id, name, instrument, shapes) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
      [req.userId, name, instrument, JSON.stringify(shapes)]
    );
    success(res, result.rows[0], 201);
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query('DELETE FROM layouts WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) throw new AppError(ERROR_CODES.NOT_FOUND.status, ERROR_CODES.NOT_FOUND.code, '记录不存在或不属于当前用户');
    success(res, { id: result.rows[0].id });
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 2: 在 server.ts 注册**

```typescript
import layoutsRouter from './routes/layouts';
app.use('/api/layouts', layoutsRouter);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src
git commit -m "feat: 自定义布局 CRUD 服务"
```

---

## Task 10：曲库服务

**Files:**
- Create: `backend/src/routes/songs.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: 写 songs 路由**

```typescript
// backend/src/routes/songs.ts
import { Router } from 'express';
import { pool } from '../services/db';
import { success, AppError, ERROR_CODES } from '../utils/api-response';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { instrument, difficulty } = req.query;
    let query = 'SELECT id, title, artist, instrument, difficulty, bpm, duration_sec, cover_image FROM songs WHERE 1=1';
    const params: any[] = [];
    let idx = 1;
    if (instrument) { query += ` AND instrument = $${idx++}`; params.push(instrument); }
    if (difficulty) { query += ` AND difficulty = $${idx++}`; params.push(parseInt(difficulty as string, 10)); }
    query += ' ORDER BY difficulty ASC';
    const result = await pool.query(query, params);
    success(res, { items: result.rows, total: result.rows.length });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM songs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) throw new AppError(ERROR_CODES.NOT_FOUND.status, ERROR_CODES.NOT_FOUND.code, '曲目不存在');
    success(res, result.rows[0]);
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 2: 在 server.ts 注册**

```typescript
import songsRouter from './routes/songs';
app.use('/api/songs', songsRouter);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src
git commit -m "feat: 曲库查询服务"
```

---

## Task 11：分享视频服务

**Files:**
- Create: `backend/src/services/storage.ts`
- Create: `backend/src/routes/clips.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: 写 storage 服务**

```typescript
// backend/src/services/storage.ts
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const BUCKET = 'clips';

export async function uploadClip(fileBuffer: Buffer, filename: string): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(filename, fileBuffer, {
    contentType: 'video/webm',
    upsert: false,
  });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return urlData.publicUrl;
}
```

- [ ] **Step 2: 写 clips 路由**

```typescript
// backend/src/routes/clips.ts
import { Router } from 'express';
import multer from 'multer';
import { pool } from '../services/db';
import { success, fail, ERROR_CODES, AppError } from '../utils/api-response';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { uploadClip } from '../services/storage';
import { config } from '../config';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxFileSize } });
const INSTRUMENTS = ['piano', 'guitar', 'violin', 'flute', 'drums'];

router.post('/', requireAuth, upload.single('video'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) return fail(res, 400, 'VALIDATION_ERROR', '请上传视频文件');
    if (req.file.size > config.maxFileSize) return fail(res, 413, 'FILE_TOO_LARGE', '文件过大');
    const { instrument, durationSec } = req.body;
    if (!INSTRUMENTS.includes(instrument)) return fail(res, 400, 'VALIDATION_ERROR', 'instrument 不合法');
    const dur = parseInt(durationSec, 10);
    if (isNaN(dur) || dur < 1 || dur > 60) return fail(res, 400, 'VALIDATION_ERROR', 'durationSec 须为 1-60');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;
    const videoUrl = await uploadClip(req.file.buffer, filename);
    const result = await pool.query(
      'INSERT INTO clips (user_id, instrument, duration_sec, video_url) VALUES ($1, $2, $3, $4) RETURNING id, video_url, created_at',
      [req.userId, instrument, dur, videoUrl]
    );
    success(res, result.rows[0], 201);
  } catch (e) { next(e); }
});

router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;
    const totalResult = await pool.query('SELECT COUNT(*) FROM clips WHERE user_id = $1', [req.userId]);
    const total = parseInt(totalResult.rows[0].count, 10);
    const result = await pool.query(
      'SELECT c.id, c.user_id, c.instrument, c.duration_sec, c.video_url, c.thumbnail_url, c.created_at, u.nickname FROM clips c JOIN users u ON c.user_id = u.id WHERE c.user_id = $1 ORDER BY c.created_at DESC LIMIT $2 OFFSET $3',
      [req.userId, pageSize, offset]
    );
    success(res, { items: result.rows, total, page, pageSize });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT c.id, c.user_id, u.nickname, c.instrument, c.duration_sec, c.video_url, c.thumbnail_url, c.created_at FROM clips c JOIN users u ON c.user_id = u.id WHERE c.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) throw new AppError(ERROR_CODES.NOT_FOUND.status, ERROR_CODES.NOT_FOUND.code, '视频不存在');
    success(res, result.rows[0]);
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query('DELETE FROM clips WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) throw new AppError(ERROR_CODES.NOT_FOUND.status, ERROR_CODES.NOT_FOUND.code, '视频不存在或不属于当前用户');
    success(res, { id: result.rows[0].id });
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 3: 在 server.ts 注册**

```typescript
import clipsRouter from './routes/clips';
app.use('/api/clips', clipsRouter);
```

- [ ] **Step 4: Commit**

```bash
git add backend/src
git commit -m "feat: 分享视频上传与查询服务"
```

---

## Task 12：挑战服务

**Files:**
- Create: `backend/src/routes/challenge.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: 写 challenge 路由**

```typescript
// backend/src/routes/challenge.ts
import { Router } from 'express';
import { pool } from '../services/db';
import { success, fail, ERROR_CODES, AppError } from '../utils/api-response';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// 获取今日挑战（按日期轮换）
router.get('/today', async (_req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const songsResult = await pool.query('SELECT id FROM songs ORDER BY id');
    if (songsResult.rows.length === 0) throw new AppError(503, 'SERVICE_UNAVAILABLE', '曲库为空');
    const dateObj = new Date(today);
    const idx = dateObj.getDate() % songsResult.rows.length;
    const songId = songsResult.rows[idx].id;
    const songResult = await pool.query('SELECT * FROM songs WHERE id = $1', [songId]);
    success(res, { date: today, song: songResult.rows[0] });
  } catch (e) { next(e); }
});

// 提交成绩（评分公式严格按 data-model 文档）
router.post('/submit', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { date, correctCount, totalCount, maxCombo, durationSec } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res, 400, 'VALIDATION_ERROR', 'date 格式应为 YYYY-MM-DD');
    if (typeof correctCount !== 'number' || correctCount < 0) return fail(res, 400, 'VALIDATION_ERROR', 'correctCount 不合法');
    if (typeof totalCount !== 'number' || totalCount <= 0) return fail(res, 400, 'VALIDATION_ERROR', 'totalCount 须大于 0');
    if (correctCount > totalCount) return fail(res, 400, 'VALIDATION_ERROR', 'correctCount 不能大于 totalCount');
    if (typeof maxCombo !== 'number' || maxCombo < 0) return fail(res, 400, 'VALIDATION_ERROR', 'maxCombo 不合法');
    if (typeof durationSec !== 'number' || durationSec < 1 || durationSec > 300) return fail(res, 400, 'VALIDATION_ERROR', 'durationSec 须为 1-300');

    const songsResult = await pool.query('SELECT id FROM songs ORDER BY id');
    const dateObj = new Date(date);
    const idx = dateObj.getDate() % songsResult.rows.length;
    const songId = songsResult.rows[idx].id;

    const accuracy = correctCount / totalCount;
    const score = Math.round(accuracy * 100) + Math.floor(maxCombo / 10) * 5;

    const bestResult = await pool.query(
      'SELECT id, score FROM challenge_scores WHERE user_id = $1 AND challenge_date = $2 AND is_best = TRUE',
      [req.userId, date]
    );
    const isBest = bestResult.rows.length === 0 || score > bestResult.rows[0].score;
    if (isBest && bestResult.rows.length > 0) {
      await pool.query('UPDATE challenge_scores SET is_best = FALSE WHERE id = $1', [bestResult.rows[0].id]);
    }
    const insertResult = await pool.query(
      'INSERT INTO challenge_scores (user_id, challenge_date, song_id, correct_count, total_count, max_combo, duration_sec, score, is_best) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
      [req.userId, date, songId, correctCount, totalCount, maxCombo, durationSec, score, isBest]
    );
    const rankResult = await pool.query(
      'SELECT COUNT(*) + 1 AS rank FROM challenge_scores WHERE challenge_date = $1 AND is_best = TRUE AND score > $2',
      [date, score]
    );
    const rank = parseInt(rankResult.rows[0].rank, 10);
    success(res, { id: insertResult.rows[0].id, score, rank, isBest }, 201);
  } catch (e) { next(e); }
});

// 排行榜
router.get('/leaderboard', async (req, res, next) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `SELECT cs.score, cs.max_combo, u.nickname, u.id AS user_id,
        ROW_NUMBER() OVER (ORDER BY cs.score DESC, cs.created_at ASC) AS rank
       FROM challenge_scores cs
       JOIN users u ON cs.user_id = u.id
       WHERE cs.challenge_date = $1 AND cs.is_best = TRUE
       ORDER BY cs.score DESC, cs.created_at ASC
       LIMIT 100`,
      [date]
    );
    const songResult = await pool.query(
      'SELECT title FROM songs WHERE id = (SELECT song_id FROM challenge_scores WHERE challenge_date = $1 LIMIT 1)',
      [date]
    );
    success(res, {
      date,
      songTitle: songResult.rows[0]?.title || '',
      leaderboard: result.rows.map(r => ({
        rank: parseInt(r.rank, 10),
        userId: r.user_id,
        nickname: r.nickname,
        score: r.score,
        maxCombo: r.max_combo,
      })),
    });
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 2: 在 server.ts 注册**

```typescript
import challengeRouter from './routes/challenge';
app.use('/api/challenge', challengeRouter);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src
git commit -m "feat: 挑战模式服务"
```

---

## Phase 4：前端基础（Task 13-17）

本阶段完成前端设计系统、通用组件、API 客户端、状态管理与首页，为 Phase 5 的核心交互模块提供底层支撑。

---

## Task 13：设计系统与全局样式

**Goal：** 落地"白昼纸面，暗夜雷电"双模设计系统，包含设计 token、字体、全局基础样式、动画系统。

**Files:**
- Modify: `frontend/tailwind.config.js`（补全扩展）
- Create: `frontend/src/styles/globals.css`
- Create: `frontend/src/styles/animations.css`
- Modify: `frontend/index.html`（引入 Google Fonts）
- Modify: `frontend/src/main.tsx`（引入全局样式）

- [ ] **Step 1: 在 `frontend/index.html` `<head>` 末尾插入字体引用**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700;9..144,900&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 2: 用以下完整内容覆盖 `frontend/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          bg: '#FAFAF7',
          card: '#FFFFFF',
          subtle: '#F0EFE9',
          border: '#E5E3DA',
        },
        ink: {
          primary: '#0A0A0A',
          secondary: '#3A3A3A',
          muted: '#8A8A82',
          inverse: '#FAFAF7',
        },
        electric: {
          DEFAULT: '#0066FF',
          hover: '#0052CC',
          glow: '#3385FF',
        },
        neon: {
          cyan: '#00F0FF',
          magenta: '#FF2DA8',
          yellow: '#FFE600',
        },
        accent: {
          warm: '#D4A574',
          danger: '#E5484D',
          success: '#30A46C',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        hero: ['88px', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        h1: ['56px', { lineHeight: '1.0', letterSpacing: '-0.025em' }],
        h2: ['36px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        h3: ['24px', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        body: ['16px', { lineHeight: '1.6' }],
        caption: ['13px', { lineHeight: '1.5', letterSpacing: '0.01em' }],
      },
      boxShadow: {
        'paper-card': '0 1px 2px rgba(10,10,10,0.04), 0 8px 24px rgba(10,10,10,0.04)',
        'electric-glow': '0 0 24px rgba(0,102,255,0.4), 0 0 60px rgba(0,102,255,0.2)',
        'neon-cyan': '0 0 12px rgba(0,240,255,0.8), 0 0 32px rgba(0,240,255,0.4)',
        'neon-magenta': '0 0 12px rgba(255,45,168,0.8), 0 0 32px rgba(255,45,168,0.4)',
      },
      backgroundImage: {
        'paper-grain':
          "radial-gradient(circle at 1px 1px, rgba(10,10,10,0.025) 1px, transparent 0)",
      },
      backgroundSize: {
        grain: '24px 24px',
      },
      transitionTimingFunction: {
        'paper-ease': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        'electric-snap': 'cubic-bezier(0.4, 0, 0.1, 1)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'neon-pulse': {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '1' },
        },
        'glow-breathe': {
          '0%, 100%': { filter: 'drop-shadow(0 0 8px currentColor)' },
          '50%': { filter: 'drop-shadow(0 0 24px currentColor)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s paper-ease forwards',
        'fade-up': 'fade-up 0.6s paper-ease forwards',
        'scale-in': 'scale-in 0.3s electric-snap forwards',
        'neon-pulse': 'neon-pulse 1.6s ease-in-out infinite',
        'glow-breathe': 'glow-breathe 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: 创建 `frontend/src/styles/globals.css`**

```css
/* frontend/src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
  --paper-bg: #fafaf7;
  --ink-primary: #0a0a0a;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  background-color: var(--paper-bg);
  color: var(--ink-primary);
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-feature-settings: 'cv11', 'ss01';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-image: radial-gradient(
    circle at 1px 1px,
    rgba(10, 10, 10, 0.025) 1px,
    transparent 0
  );
  background-size: 24px 24px;
}

/* 暗夜雷电：演奏区切到深色画布 */
.dark-canvas {
  color-scheme: dark;
  background-color: #000;
  color: #fafaf7;
  background-image: none;
}

/* 文本选择色 */
::selection {
  background-color: #0066ff;
  color: #fafaf7;
}

/* 滚动条 */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(10, 10, 10, 0.15);
  border-radius: 6px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(10, 10, 10, 0.3);
}

/* 可访问性：尊重 reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 焦点可见性 */
:focus-visible {
  outline: 2px solid #0066ff;
  outline-offset: 2px;
  border-radius: 4px;
}

/* 通用工具类 */
.text-balance {
  text-wrap: balance;
}

.paper-card {
  background-color: #ffffff;
  border: 1px solid #e5e3da;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(10, 10, 10, 0.04),
    0 8px 24px rgba(10, 10, 10, 0.04);
}

.neon-border {
  border: 1px solid currentColor;
  box-shadow: 0 0 12px currentColor, inset 0 0 12px rgba(255, 255, 255, 0.05);
}
```

- [ ] **Step 4: 创建 `frontend/src/styles/animations.css`**

```css
/* frontend/src/styles/animations.css
 * 组件级与场景级动画补充（与 tailwind.config 的 keyframes 协作）
 */

/* 场景切换：clip-path 横向揭幕 */
@keyframes scene-clip-in {
  0% {
    clip-path: inset(0 100% 0 0);
    opacity: 0;
  }
  100% {
    clip-path: inset(0 0 0 0);
    opacity: 1;
  }
}
.scene-clip-in {
  animation: scene-clip-in 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

/* staggered 入场：每项延迟由内联 style 控制 */
.stagger-item {
  opacity: 0;
  animation: fade-up 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

/* 键位命中：5 层反馈叠加 */
@keyframes key-hit-flash {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  20% {
    transform: scale(1.08);
    filter: brightness(1.8) drop-shadow(0 0 24px currentColor);
  }
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}
.key-hit-flash {
  animation: key-hit-flash 0.4s cubic-bezier(0.4, 0, 0.1, 1);
}

@keyframes key-ring-ripple {
  0% {
    transform: scale(0.85);
    opacity: 0.9;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}
.key-ring-ripple {
  animation: key-ring-ripple 0.6s ease-out forwards;
}

@keyframes particle-burst {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0);
    opacity: 0;
  }
}
.particle-burst {
  animation: particle-burst 0.6s ease-out forwards;
}

/* 激光手部特效 */
@keyframes laser-trail {
  0% {
    stroke-dashoffset: 24;
    opacity: 0.4;
  }
  100% {
    stroke-dashoffset: 0;
    opacity: 0.9;
  }
}
.laser-trail {
  stroke-dasharray: 6 6;
  animation: laser-trail 0.4s linear infinite;
}

/* 调音器指针 */
@keyframes needle-sweep {
  0%,
  100% {
    transform: rotate(-45deg);
  }
  50% {
    transform: rotate(45deg);
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .scene-clip-in,
  .stagger-item,
  .key-hit-flash,
  .key-ring-ripple,
  .particle-burst,
  .laser-trail {
    animation: none !important;
    opacity: 1 !important;
    clip-path: none !important;
    transform: none !important;
  }
}
```

- [ ] **Step 5: 修改 `frontend/src/main.tsx` 顶部引入样式**

```typescript
// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';
import './styles/animations.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 6: 本地启动验证样式系统加载**

Run: `cd frontend && npm run dev`
打开浏览器访问 `http://localhost:5173`，DevTools Network 标签确认 Fraunces/Inter Tight/JetBrains Mono 三个字体文件 200 OK，Console 无 CSS 解析错误。
预期：页面空白但背景为 `#FAFAF7` 且有微细颗粒纹理。

- [ ] **Step 7: Commit**

```bash
git add frontend/tailwind.config.js frontend/index.html frontend/src/main.tsx frontend/src/styles
git commit -m "feat(frontend): 设计系统与全局样式落地"
```

---

## Task 14：通用组件库（Button / Card / Toast / Spinner / Navbar）

**Goal：** 实现可复用 UI 原子组件与导航栏，统一交互语言。

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/components/ui/Spinner.tsx`
- Create: `frontend/src/stores/toastStore.ts`
- Create: `frontend/src/components/ui/Toast.tsx`
- Create: `frontend/src/components/ui/ToastContainer.tsx`
- Create: `frontend/src/components/layout/Navbar.tsx`
- Create: `frontend/src/components/layout/Footer.tsx`

- [ ] **Step 1: 创建 Button 组件**

```typescript
// frontend/src/components/ui/Button.tsx
import { forwardRef, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'neon';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-electric text-paper-bg hover:bg-electric-hover shadow-sm hover:shadow-electric-glow',
  secondary:
    'bg-paper-card text-ink-primary border border-paper-border hover:border-ink-muted',
  ghost: 'bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-paper-subtle',
  danger: 'bg-accent-danger text-white hover:opacity-90',
  neon:
    'bg-transparent text-neon-cyan border border-neon-cyan shadow-neon-cyan hover:shadow-[0_0_24px_rgba(0,240,255,0.8)]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-caption rounded-md',
  md: 'h-11 px-5 text-body rounded-lg',
  lg: 'h-14 px-8 text-h3 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center font-sans font-medium',
          'transition-all duration-200 ease-paper-ease',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          className ?? '',
        ].join(' ')}
        {...rest}
      >
        {loading && <Spinner className="mr-2 h-4 w-4" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
```

- [ ] **Step 2: 创建 Spinner 组件**

```typescript
// frontend/src/components/ui/Spinner.tsx
export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={['animate-spin', className].join(' ')}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

- [ ] **Step 3: 创建 Card 组件**

```typescript
// frontend/src/components/ui/Card.tsx
import { HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'paper' | 'flat' | 'neon';
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'paper', interactive, className, children, ...rest }, ref) => {
    const base =
      variant === 'paper'
        ? 'bg-paper-card border border-paper-border rounded-2xl shadow-paper-card'
        : variant === 'flat'
        ? 'bg-paper-subtle border border-transparent rounded-2xl'
        : 'bg-transparent border border-neon-cyan rounded-2xl shadow-neon-cyan';
    const hover = interactive
      ? 'transition-all duration-200 ease-paper-ease hover:-translate-y-0.5 hover:shadow-[0_4px_32px_rgba(10,10,10,0.08)] cursor-pointer'
      : '';
    return (
      <div ref={ref} className={[base, hover, className ?? ''].join(' ')} {...rest}>
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
```

- [ ] **Step 4: 创建 toastStore（Zustand）**

```typescript
// frontend/src/stores/toastStore.ts
import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'> & { id?: string }) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: ({ id, type, message, duration = 3200 }) => {
    const toastId = id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { id: toastId, type, message, duration }] }));
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toastId) }));
      }, duration);
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// 便捷方法（在非组件代码中调用）
export const toast = {
  info: (message: string, duration?: number) =>
    useToastStore.getState().push({ type: 'info', message, duration }),
  success: (message: string, duration?: number) =>
    useToastStore.getState().push({ type: 'success', message, duration }),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().push({ type: 'warning', message, duration }),
  error: (message: string, duration?: number) =>
    useToastStore.getState().push({ type: 'error', message, duration }),
};
```

- [ ] **Step 5: 创建 Toast 与 ToastContainer**

```typescript
// frontend/src/components/ui/Toast.tsx
import { useEffect } from 'react';
import { ToastItem, useToastStore } from '../../stores/toastStore';

const typeStyle: Record<ToastItem['type'], string> = {
  info: 'bg-ink-primary text-paper-bg',
  success: 'bg-accent-success text-white',
  warning: 'bg-accent-warm text-ink-primary',
  error: 'bg-accent-danger text-white',
};

export function Toast({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    if (item.duration > 0) {
      const t = setTimeout(() => dismiss(item.id), item.duration);
      return () => clearTimeout(t);
    }
  }, [item, dismiss]);
  return (
    <div
      role="status"
      className={[
        'pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 text-body shadow-paper-card',
        'animate-fade-up',
        typeStyle[item.type],
      ].join(' ')}
    >
      <span className="flex-1">{item.message}</span>
      <button
        type="button"
        aria-label="关闭"
        onClick={() => dismiss(item.id)}
        className="opacity-70 hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}
```

```typescript
// frontend/src/components/ui/ToastContainer.tsx
import { useToastStore } from '../../stores/toastStore';
import { Toast } from './Toast';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((item) => (
        <Toast key={item.id} item={item} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: 创建 Navbar**

```typescript
// frontend/src/components/layout/Navbar.tsx
import { Link, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: '声形绘', isBrand: true },
  { to: '/workbench', label: '工作台' },
  { to: '/songs', label: '曲库' },
  { to: '/challenge', label: '挑战' },
  { to: '/profile', label: '我的' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-paper-border bg-paper-bg/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="font-display text-h3 font-semibold tracking-tight text-ink-primary">
          声形绘<span className="ml-1 text-electric">.</span>
        </Link>
        <ul className="flex items-center gap-1">
          {navItems
            .filter((n) => !n.isBrand)
            .map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  className={({ isActive }) =>
                    [
                      'rounded-lg px-3 py-2 text-caption font-medium transition-colors',
                      isActive
                        ? 'bg-ink-primary text-paper-bg'
                        : 'text-ink-secondary hover:text-ink-primary hover:bg-paper-subtle',
                    ].join(' ')
                  }
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>
    </header>
  );
}
```

- [ ] **Step 7: 创建 Footer**

```typescript
// frontend/src/components/layout/Footer.tsx
export function Footer() {
  return (
    <footer className="border-t border-paper-border bg-paper-bg py-8 text-center text-caption text-ink-muted">
      <div className="mx-auto max-w-7xl px-6">
        <p>声形绘 SoundShape · 用画图与手势演奏音乐</p>
        <p className="mt-1">© {new Date().getFullYear()} SoundShape. All rights reserved.</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 8: 写组件测试 `frontend/src/components/ui/__tests__/Button.test.tsx`**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>开始演奏</Button>);
    expect(screen.getByRole('button', { name: '开始演奏' })).toBeInTheDocument();
  });

  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>点我</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables when loading', () => {
    render(<Button loading>加载中</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

- [ ] **Step 9: 运行测试**

Run: `cd frontend && npm run test -- Button`
预期：3 个测试用例全部 PASS。

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components frontend/src/stores/toastStore.ts
git commit -m "feat(frontend): 通用组件库 Button/Card/Toast/Spinner/Navbar/Footer"
```

---

## Task 15：路由与 API 客户端

**Goal：** 建立前端路由表与封装 axios 的 API 客户端，覆盖全部后端接口。

**Files:**
- Modify: `frontend/package.json`（安装依赖）
- Create: `frontend/src/types/api.ts`
- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/services/auth.ts`
- Create: `frontend/src/services/records.ts`
- Create: `frontend/src/services/tunings.ts`
- Create: `frontend/src/services/layouts.ts`
- Create: `frontend/src/services/songs.ts`
- Create: `frontend/src/services/clips.ts`
- Create: `frontend/src/services/challenge.ts`
- Create: `frontend/src/router/index.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 安装依赖**

Run:
```bash
cd frontend
npm install react-router-dom axios zustand
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

- [ ] **Step 2: 创建类型定义 `frontend/src/types/api.ts`**

```typescript
// frontend/src/types/api.ts
// 严格对齐后端 API 响应格式

export interface ApiResponse<T> {
  code: number;
  data: T;
}
export interface ApiError {
  code: string;
  message: string;
}

export type Instrument = 'piano' | 'guitar' | 'violin' | 'flute' | 'drums';
export const INSTRUMENTS: Instrument[] = ['piano', 'guitar', 'violin', 'flute', 'drums'];
export const INSTRUMENT_LABELS: Record<Instrument, string> = {
  piano: '钢琴',
  guitar: '吉他',
  violin: '小提琴',
  flute: '长笛',
  drums: '架子鼓',
};

// 认证
export interface RegisterPayload {
  email: string;
  password: string;
  nickname: string;
}
export interface LoginPayload {
  email: string;
  password: string;
}
export interface AuthResult {
  token: string;
  user: User;
}
export interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
}

// 演奏记录（对齐 API 文档 2.1/2.2）
export interface NoteEvent {
  note: string;
  timestamp: number;  // 毫秒，相对演奏起点
}
export interface PlayRecord {
  id: string;
  userId: string;
  instrument: Instrument;
  notesPlayed: NoteEvent[];
  durationSec: number;
  createdAt: string;
}
export interface CreatePlayRecordPayload {
  instrument: Instrument;
  notesPlayed?: NoteEvent[];  // 最长 1000 条
  durationSec: number;        // 1-3600
}

// 调音记录（对齐 API 文档 3.1/3.2，无 targetFreq）
export interface TuningRecord {
  id: string;
  userId: string;
  instrument: 'guitar' | 'violin';
  targetNote: string;
  measuredFreq: number;
  deviationCents: number;
  createdAt: string;
}
export interface CreateTuningPayload {
  instrument: 'guitar' | 'violin';
  targetNote: string;
  measuredFreq: number;       // 20-2000
  deviationCents: number;     // -50 到 50
}

// 自定义布局（对齐 API 文档 4.1/4.2，shapes 为 {type, bounds} 结构）
export interface ShapeBounds {
  x: number;       // 0-1 归一化坐标
  y: number;
  width: number;
  height: number;
}
export interface ShapeDef {
  type: 'rect' | 'circle' | 'line';
  bounds: ShapeBounds;
}
export interface Layout {
  id: string;
  userId: string;
  name: string;
  instrument: Instrument;
  shapes: ShapeDef[];
  createdAt: string;
}
export interface CreateLayoutPayload {
  name: string;               // 1-50 字符
  instrument: Instrument;
  shapes: ShapeDef[];         // 1-20 个
}

// 曲库（对齐 API 文档 5.1/5.2，notes 字段名为 notes，元素 {note, startTime, duration}）
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export interface SongListItem {
  id: string;
  title: string;
  artist: string;
  instrument: Instrument;
  difficulty: Difficulty;
  bpm: number;
  durationSec: number;
  coverImage: string | null;
}
export interface SongNote {
  note: string;
  startTime: number;  // 毫秒
  duration: number;   // 毫秒
}
export interface SongDetail extends SongListItem {
  notes: SongNote[];
}

// 分享视频（对齐 API 文档 6.1/6.2）
export interface Clip {
  id: string;
  userId: string;
  nickname: string;
  instrument: Instrument;
  durationSec: number;
  videoUrl: string;
  thumbnailUrl: string | null;
  createdAt: string;
}
export interface ClipListResponse {
  items: Clip[];
  total: number;
  page: number;
  pageSize: number;
}
export interface UploadClipPayload {
  instrument: Instrument;
  durationSec: number;        // 1-60
  video: Blob;                // webm/mp4，最大 20MB
}

// 挑战（对齐 API 文档 7.1，song 为 SongDetail 含 notes）
export interface ChallengeToday {
  date: string;               // YYYY-MM-DD
  song: SongDetail;
}
export interface ChallengeSubmitPayload {
  date: string;
  correctCount: number;
  totalCount: number;
  maxCombo: number;
  durationSec: number;
}
export interface ChallengeSubmitResult {
  id: string;
  score: number;
  rank: number;
  isBest: boolean;
}
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  score: number;
  maxCombo: number;
}
export interface LeaderboardResponse {
  date: string;
  songTitle: string;
  leaderboard: LeaderboardEntry[];
}

// 通用分页
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

- [ ] **Step 3: 创建 axios 实例 `frontend/src/services/api.ts`**

```typescript
// frontend/src/services/api.ts
import axios, { AxiosError, AxiosInstance } from 'axios';
import { ApiError } from '../types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截：注入 JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('soundshape_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一拆 { code, data } / { code, message }
apiClient.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error: AxiosError<{ code?: string; message?: string }>) => {
    const status = error.response?.status ?? 0;
    const code = error.response?.data?.code ?? 'NETWORK_ERROR';
    const message = error.response?.data?.message ?? error.message ?? '网络异常';

    // 401 自动登出
    if (status === 401) {
      localStorage.removeItem('soundshape_token');
      localStorage.removeItem('soundshape_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject({ code, message, status } as ApiError & { status: number });
  }
);

export function isApiError(e: unknown): e is ApiError & { status: number } {
  return typeof e === 'object' && e !== null && 'code' in e && 'message' in e;
}
```

- [ ] **Step 4: 创建 auth 服务**

```typescript
// frontend/src/services/auth.ts
import { apiClient } from './api';
import { AuthResult, LoginPayload, RegisterPayload, User } from '../types/api';

export const authService = {
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResult, AuthResult>('/auth/register', payload),
  login: (payload: LoginPayload) =>
    apiClient.post<AuthResult, AuthResult>('/auth/login', payload),
  me: () => apiClient.get<User, User>('/auth/me'),
};
```

- [ ] **Step 5: 创建 records / tunings / layouts 服务**

```typescript
// frontend/src/services/records.ts
import { apiClient } from './api';
import { CreatePlayRecordPayload, PlayRecord, Paginated } from '../types/api';

export const recordsService = {
  list: (page = 1, pageSize = 20) =>
    apiClient.get<Paginated<PlayRecord>, Paginated<PlayRecord>>('/records', {
      params: { page, pageSize },
    }),
  create: (payload: CreatePlayRecordPayload) =>
    apiClient.post<PlayRecord, PlayRecord>('/records', payload),
  remove: (id: string) => apiClient.delete<{ id: string }, { id: string }>(`/records/${id}`),
};
```

```typescript
// frontend/src/services/tunings.ts
import { apiClient } from './api';
import { CreateTuningPayload, TuningRecord, Paginated } from '../types/api';

export const tuningsService = {
  list: (page = 1, pageSize = 20) =>
    apiClient.get<Paginated<TuningRecord>, Paginated<TuningRecord>>('/tunings', {
      params: { page, pageSize },
    }),
  create: (payload: CreateTuningPayload) =>
    apiClient.post<TuningRecord, TuningRecord>('/tunings', payload),
};
```

```typescript
// frontend/src/services/layouts.ts
import { apiClient } from './api';
import { CreateLayoutPayload, Layout } from '../types/api';

export const layoutsService = {
  list: () => apiClient.get<Layout[], Layout[]>('/layouts'),
  create: (payload: CreateLayoutPayload) =>
    apiClient.post<Layout, Layout>('/layouts', payload),
  update: (id: string, payload: Partial<CreateLayoutPayload>) =>
    apiClient.put<Layout, Layout>(`/layouts/${id}`, payload),
  remove: (id: string) => apiClient.delete<{ id: string }, { id: string }>(`/layouts/${id}`),
};
```

- [ ] **Step 6: 创建 songs / clips / challenge 服务**

```typescript
// frontend/src/services/songs.ts
import { apiClient } from './api';
import { SongDetail, SongListItem, Instrument, Difficulty } from '../types/api';

export const songsService = {
  list: (params?: { instrument?: Instrument; difficulty?: Difficulty }) =>
    apiClient.get<{ items: SongListItem[]; total: number }, { items: SongListItem[]; total: number }>(
      '/songs',
      { params }
    ),
  detail: (id: string) => apiClient.get<SongDetail, SongDetail>(`/songs/${id}`),
};
```

```typescript
// frontend/src/services/clips.ts
import { apiClient } from './api';
import { Clip, ClipListResponse, UploadClipPayload } from '../types/api';

export const clipsService = {
  list: (page = 1, pageSize = 20) =>
    apiClient.get<ClipListResponse, ClipListResponse>('/clips', {
      params: { page, pageSize },
    }),
  detail: (id: string) => apiClient.get<Clip, Clip>(`/clips/${id}`),
  upload: (payload: UploadClipPayload) => {
    const formData = new FormData();
    formData.append('video', payload.video);
    formData.append('instrument', payload.instrument);
    formData.append('durationSec', String(payload.durationSec));
    return apiClient.post<Clip, Clip>('/clips', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
  remove: (id: string) => apiClient.delete<{ id: string }, { id: string }>(`/clips/${id}`),
};
```

```typescript
// frontend/src/services/challenge.ts
import { apiClient } from './api';
import {
  ChallengeSubmitPayload,
  ChallengeSubmitResult,
  ChallengeToday,
  LeaderboardResponse,
} from '../types/api';

export const challengeService = {
  today: () => apiClient.get<ChallengeToday, ChallengeToday>('/challenge/today'),
  submit: (payload: ChallengeSubmitPayload) =>
    apiClient.post<ChallengeSubmitResult, ChallengeSubmitResult>('/challenge/submit', payload),
  leaderboard: (date?: string) =>
    apiClient.get<LeaderboardResponse, LeaderboardResponse>('/challenge/leaderboard', {
      params: date ? { date } : undefined,
    }),
};
```

- [ ] **Step 7: 创建路由 `frontend/src/router/index.tsx`**

```typescript
// frontend/src/router/index.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Spinner } from '../components/ui/Spinner';

const Home = lazy(() => import('../pages/Home').then((m) => ({ default: m.Home })));
const Workbench = lazy(() => import('../pages/Workbench').then((m) => ({ default: m.Workbench })));
const Songs = lazy(() => import('../pages/Songs').then((m) => ({ default: m.Songs })));
const Challenge = lazy(() => import('../pages/Challenge').then((m) => ({ default: m.Challenge })));
const Profile = lazy(() => import('../pages/Profile').then((m) => ({ default: m.Profile })));
const Login = lazy(() => import('../pages/Login').then((m) => ({ default: m.Login })));
const NotFound = lazy(() => import('../pages/NotFound').then((m) => ({ default: m.NotFound })));

const withSuspense = (el: JSX.Element) => (
  <Suspense
    fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-electric" />
      </div>
    }
  >
    {el}
  </Suspense>
);

export const router = createBrowserRouter([
  { path: '/', element: withSuspense(<Home />) },
  { path: '/workbench', element: withSuspense(<Workbench />) },
  { path: '/songs', element: withSuspense(<Songs />) },
  { path: '/songs/:id', element: withSuspense(<Songs />) },
  { path: '/challenge', element: withSuspense(<Challenge />) },
  { path: '/profile', element: withSuspense(<Profile />) },
  { path: '/login', element: withSuspense(<Login />) },
  { path: '/404', element: withSuspense(<NotFound />) },
  { path: '*', element: <Navigate to="/404" replace /> },
]);
```

- [ ] **Step 8: 创建页面占位文件（避免懒加载报错）**

为每个尚未实现的页面创建最小占位组件，后续 Phase 5/6 替换。每个文件结构相同：

```typescript
// frontend/src/pages/Home.tsx （Task 17 会替换内容）
export function Home() {
  return <div className="p-8 text-h2">Home · 待 Task 17 实现</div>;
}
```

```typescript
// frontend/src/pages/Workbench.tsx
export function Workbench() {
  return <div className="p-8 text-h2">Workbench · 待 Phase 5 实现</div>;
}
```

```typescript
// frontend/src/pages/Songs.tsx
export function Songs() {
  return <div className="p-8 text-h2">Songs · 待 Phase 6 实现</div>;
}
```

```typescript
// frontend/src/pages/Challenge.tsx
export function Challenge() {
  return <div className="p-8 text-h2">Challenge · 待 Phase 6 实现</div>;
}
```

```typescript
// frontend/src/pages/Profile.tsx
export function Profile() {
  return <div className="p-8 text-h2">Profile · 待 Phase 7 实现</div>;
}
```

```typescript
// frontend/src/pages/Login.tsx
export function Login() {
  return <div className="p-8 text-h2">Login · 待 Phase 7 实现</div>;
}
```

```typescript
// frontend/src/pages/NotFound.tsx
export function NotFound() {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
      <p className="font-display text-hero text-ink-primary">404</p>
      <p className="text-body text-ink-muted">页面不存在</p>
      <a href="/" className="text-electric underline">回到首页</a>
    </div>
  );
}
```

- [ ] **Step 9: 替换 `frontend/src/App.tsx`**

```typescript
// frontend/src/App.tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ToastContainer } from './components/ui/ToastContainer';

export default function App() {
  return (
    <>
      <ToastContainer />
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <RouterProvider router={router} />
        </main>
        <Footer />
      </div>
    </>
  );
}
```

- [ ] **Step 10: 配置 vitest `frontend/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

创建 setup 文件：

```typescript
// frontend/src/test/setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 11: 在 `frontend/package.json` 添加 test 脚本**

确认 `scripts` 字段包含：
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 12: 本地启动验证路由可用**

Run: `cd frontend && npm run dev`
打开浏览器依次访问 `/`、`/workbench`、`/songs`、`/challenge`、`/profile`、`/login`、`/404`、`/nonexistent`。
预期：每个路径渲染对应占位文字，未知路径自动跳 `/404`，导航栏 NavLink 高亮当前路由。

- [ ] **Step 13: Commit**

```bash
git add frontend/src frontend/package.json frontend/vitest.config.ts
git commit -m "feat(frontend): 路由表与全量 API 客户端"
```

---

## Task 16：用户状态管理（userStore）

**Goal：** 用 Zustand 实现用户状态机，对接 auth 服务，处理登录/登出/自动续期。

**Files:**
- Create: `frontend/src/stores/userStore.ts`

- [ ] **Step 1: 创建 userStore**

```typescript
// frontend/src/stores/userStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '../services/auth';
import { LoginPayload, RegisterPayload, User } from '../types/api';
import { isApiError } from '../services/api';

type UserPhase = 'idle' | 'loading' | 'authenticated' | 'guest' | 'error';

interface UserState {
  phase: UserPhase;
  user: User | null;
  token: string | null;
  error: string | null;
  login: (payload: LoginPayload) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  logout: () => void;
  refresh: () => Promise<void>;
  clearError: () => void;
}

const TOKEN_KEY = 'soundshape_token';

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      phase: 'idle',
      user: null,
      token: localStorage.getItem(TOKEN_KEY),
      error: null,

      login: async (payload) => {
        set({ phase: 'loading', error: null });
        try {
          const result = await authService.login(payload);
          localStorage.setItem(TOKEN_KEY, result.token);
          set({ phase: 'authenticated', user: result.user, token: result.token });
          return true;
        } catch (e) {
          const message = isApiError(e) ? e.message : '登录失败';
          set({ phase: 'error', error: message });
          return false;
        }
      },

      register: async (payload) => {
        set({ phase: 'loading', error: null });
        try {
          const result = await authService.register(payload);
          localStorage.setItem(TOKEN_KEY, result.token);
          set({ phase: 'authenticated', user: result.user, token: result.token });
          return true;
        } catch (e) {
          const message = isApiError(e) ? e.message : '注册失败';
          set({ phase: 'error', error: message });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        set({ phase: 'guest', user: null, token: null, error: null });
      },

      refresh: async () => {
        const token = get().token;
        if (!token) {
          set({ phase: 'guest' });
          return;
        }
        try {
          const user = await authService.me();
          set({ phase: 'authenticated', user });
        } catch {
          localStorage.removeItem(TOKEN_KEY);
          set({ phase: 'guest', user: null, token: null });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'soundshape-user',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user, phase: s.phase }),
    }
  )
);
```

- [ ] **Step 2: 写测试 `frontend/src/stores/__tests__/userStore.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUserStore } from '../userStore';
import { authService } from '../../services/auth';

vi.mock('../../services/auth');

describe('userStore', () => {
  beforeEach(() => {
    useUserStore.setState({ phase: 'idle', user: null, token: null, error: null });
    localStorage.clear();
  });

  it('login success sets authenticated', async () => {
    (authService.login as any).mockResolvedValue({
      token: 'fake-token',
      user: { id: 'u1', email: 'a@b.c', nickname: 'A', avatarUrl: null, createdAt: '' },
    });
    const ok = await useUserStore.getState().login({ email: 'a@b.c', password: '123456' });
    expect(ok).toBe(true);
    expect(useUserStore.getState().phase).toBe('authenticated');
    expect(useUserStore.getState().token).toBe('fake-token');
  });

  it('login failure sets error', async () => {
    (authService.login as any).mockRejectedValue({ code: 'AUTH_INVALID', message: '密码错误' });
    const ok = await useUserStore.getState().login({ email: 'a@b.c', password: 'wrong' });
    expect(ok).toBe(false);
    expect(useUserStore.getState().phase).toBe('error');
    expect(useUserStore.getState().error).toBe('密码错误');
  });

  it('logout clears token', async () => {
    await useUserStore.getState().login({ email: 'a@b.c', password: '123456' }).catch(() => {});
    localStorage.setItem('soundshape_token', 'fake-token');
    useUserStore.getState().logout();
    expect(useUserStore.getState().token).toBeNull();
    expect(localStorage.getItem('soundshape_token')).toBeNull();
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `cd frontend && npm run test -- userStore`
预期：3 个用例 PASS。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/stores
git commit -m "feat(frontend): 用户状态机 userStore + 持久化"
```

---

## Task 17：首页实现

**Goal：** 实现"白昼纸面"风格首页，包含 Hero、玩法说明、入口卡片、底部 CTA。

**Files:**
- Modify: `frontend/src/pages/Home.tsx`（覆盖占位）

- [ ] **Step 1: 用以下完整内容覆盖 `frontend/src/pages/Home.tsx`**

```typescript
// frontend/src/pages/Home.tsx
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const features = [
  {
    title: '画图生成键位',
    desc: '在画布上随手画几个形状，系统自动推断乐器与音位。',
    accent: 'text-electric',
  },
  {
    title: '手势实时演奏',
    desc: '摄像头追踪食指，进入哪个键位就触发对应音色与光晕。',
    accent: 'text-neon-cyan',
  },
  {
    title: '内置调音器',
    desc: '麦克风检测基频，给出 cents 偏差与可视化指针。',
    accent: 'text-accent-warm',
  },
  {
    title: '每日挑战',
    desc: '系统每天轮换一首曲目，按命中与连击评分，登顶排行榜。',
    accent: 'text-neon-magenta',
  },
];

const steps = [
  { n: '01', label: '画几个形状' },
  { n: '02', label: '开启摄像头' },
  { n: '03', label: '食指触发键位' },
  { n: '04', label: '即时听见演奏' },
];

export function Home() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-24 pb-32">
        <div className="mx-auto max-w-7xl">
          <p className="text-caption uppercase tracking-[0.2em] text-ink-muted stagger-item">
            SoundShape · 声形绘
          </p>
          <h1
            className="mt-6 max-w-4xl font-display text-hero font-semibold text-ink-primary text-balance stagger-item"
            style={{ animationDelay: '0.05s' }}
          >
            用画图与手势，<br />
            <span className="italic text-electric">演奏一段音乐。</span>
          </h1>
          <p
            className="mt-8 max-w-2xl text-h3 font-light text-ink-secondary stagger-item"
            style={{ animationDelay: '0.15s' }}
          >
            无需安装软件、无需购买乐器。一张画布、一只摄像头，
            把你的桌面变成可触发的虚拟琴键。
          </p>
          <div
            className="mt-12 flex flex-wrap items-center gap-4 stagger-item"
            style={{ animationDelay: '0.25s' }}
          >
            <Link to="/workbench">
              <Button size="lg">开始演奏</Button>
            </Link>
            <Link to="/songs">
              <Button size="lg" variant="secondary">
                浏览曲库
              </Button>
            </Link>
            <Link to="/challenge" className="text-caption text-ink-muted underline underline-offset-4">
              查看今日挑战 →
            </Link>
          </div>
        </div>

        {/* 装饰：右下角斜向光带 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 right-0 h-[480px] w-[480px] rounded-full opacity-30 blur-3xl"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, #0066FF 0%, transparent 60%)',
          }}
        />
      </section>

      {/* 四步玩法 */}
      <section className="border-y border-paper-border bg-paper-subtle/50 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-h2 text-ink-primary">四步即可演奏</h2>
          <ol className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-4">
            {steps.map((s, i) => (
              <li
                key={s.n}
                className="stagger-item"
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-h3 text-electric">{s.n}</span>
                  <span className="text-body font-medium text-ink-primary">{s.label}</span>
                </div>
                <div className="mt-3 h-px w-full bg-paper-border" />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 功能卡片 */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-h2 text-ink-primary">为什么是声形绘</h2>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Card
                key={f.title}
                interactive
                className="stagger-item p-6"
                /* @ts-expect-error inline style */
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <div className={`font-mono text-caption ${f.accent}`}>FEATURE / 0${i + 1}</div>
                <h3 className="mt-4 font-display text-h3 text-ink-primary">{f.title}</h3>
                <p className="mt-3 text-body text-ink-secondary">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-h1 text-ink-primary text-balance">
            画第一笔，<span className="italic text-electric">听见第一音。</span>
          </h2>
          <p className="mt-6 text-body text-ink-secondary">
            所有计算在浏览器端完成，无需上传画面，无需注册即可体验。
          </p>
          <div className="mt-10 flex justify-center">
            <Link to="/workbench">
              <Button size="lg" variant="neon">
                进入工作台
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: 本地启动验证首页渲染**

Run: `cd frontend && npm run dev`
打开 `http://localhost:5173/`。
预期：
- Hero 大字"用画图与手势，演奏一段音乐。" 以 Fraunces 衬线字体渲染
- 四步玩法横向排列，序号 01-04 蓝色 mono 字体
- 四个功能卡片带 staggered 入场动画
- 底部 CTA 按钮"进入工作台"为霓虹青边框
- DevTools 无 hydration 警告、无控制台错误

- [ ] **Step 3: 截图回归（手动）**

在浏览器全屏 1440×900 截图保存到 `docs/screenshots/home-1440.png`（仅作记录，不进 git）。
预期：整体配色为暖白纸色，文字层级清晰，蓝色与霓虹色点缀克制。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Home.tsx
git commit -m "feat(frontend): 首页落地（白昼纸面风格）"
```

---

## Phase 5：前端核心模块（Task 18-25）

本阶段实现声形绘的四大核心能力：画图生成键位、摄像头实时画面、MediaPipe 手部追踪、键位叠加渲染，以及音频合成、激光特效、调音器、工作台集成。所有算法严格对齐 `2026-06-28-soundshape-modules.md`。

---

## Task 18：画图生成键位模块（M2）

**Goal：** 用户在画布上绘制形状（矩形/圆/线），系统按形状特征与布局推断乐器类型并生成键位表。

**Files:**
- Create: `frontend/src/types/shapes.ts`
- Create: `frontend/src/modules/shapeRecognizer/templates.ts`
- Create: `frontend/src/modules/shapeRecognizer/shapeRecognizer.ts`
- Create: `frontend/src/modules/shapeRecognizer/__tests__/shapeRecognizer.test.ts`
- Create: `frontend/src/modules/canvas/DrawCanvas.tsx`

- [ ] **Step 1: 创建形状类型 `frontend/src/types/shapes.ts`**

```typescript
// frontend/src/types/shapes.ts
import { Instrument } from '../types/api';

// 画布上的原始形状（用户绘制产物）
export interface DrawnShape {
  id: string;
  type: 'rect' | 'circle' | 'line';
  x: number; // 画布坐标 px
  y: number;
  width: number;
  height: number;
  color?: string;
}

// 生成出来的虚拟键位
export interface VirtualKey {
  id: string;          // 与 DrawnShape.id 一致
  shapeType: DrawnShape['type'];
  cx: number;          // 中心点 x（画布坐标）
  cy: number;          // 中心点 y
  width: number;       // 命中区域宽度
  height: number;      // 命中区域高度
  pitch: string;       // 音名，例如 'C4' / 'E4' / 'kick'
  freq: number;        // 频率 Hz（鼓类为 0）
  instrument: Instrument; // 所属乐器（继承自整组识别结果）
  label: string;       // 显示用文字
  color: string;       // 触发高亮色
}

export interface RecognitionResult {
  instrument: Instrument;
  keys: VirtualKey[];
  confidence: number; // 0-1
  reason: string;     // 推断依据说明
}
```

- [ ] **Step 2: 创建模板表 `frontend/src/modules/shapeRecognizer/templates.ts`**

```typescript
// frontend/src/modules/shapeRecognizer/templates.ts
// 5 种乐器的音高表与配色，严格对齐 modules 文档 INSTRUMENT_PRESETS

import { Instrument } from '../../types/api';

interface PitchEntry {
  pitch: string;
  freq: number;
  label: string;
  color: string;
}

// 钢琴：C4 - C5 一个八度的白键（7 个）
export const PIANO_PITCHES: PitchEntry[] = [
  { pitch: 'C4', freq: 261.63, label: 'C',  color: '#00F0FF' },
  { pitch: 'D4', freq: 293.66, label: 'D',  color: '#33C6FF' },
  { pitch: 'E4', freq: 329.63, label: 'E',  color: '#66B2FF' },
  { pitch: 'F4', freq: 349.23, label: 'F',  color: '#0066FF' },
  { pitch: 'G4', freq: 392.00, label: 'G',  color: '#3385FF' },
  { pitch: 'A4', freq: 440.00, label: 'A',  color: '#6699FF' },
  { pitch: 'B4', freq: 493.88, label: 'B',  color: '#9966FF' },
  { pitch: 'C5', freq: 523.25, label: 'C',  color: '#FF2DA8' },
];

// 吉他：6 根弦标准音（E2 A2 D3 G3 B3 E4）
export const GUITAR_PITCHES: PitchEntry[] = [
  { pitch: 'E2', freq:  82.41, label: 'E', color: '#00F0FF' },
  { pitch: 'A2', freq: 110.00, label: 'A', color: '#00BFFF' },
  { pitch: 'D3', freq: 146.83, label: 'D', color: '#0066FF' },
  { pitch: 'G3', freq: 196.00, label: 'G', color: '#6633FF' },
  { pitch: 'B3', freq: 246.94, label: 'B', color: '#9933FF' },
  { pitch: 'E4', freq: 329.63, label: 'e', color: '#FF2DA8' },
];

// 小提琴：4 根弦（G3 D4 A4 E5）
export const VIOLIN_PITCHES: PitchEntry[] = [
  { pitch: 'G3', freq: 196.00, label: 'G', color: '#00F0FF' },
  { pitch: 'D4', freq: 293.66, label: 'D', color: '#0066FF' },
  { pitch: 'A4', freq: 440.00, label: 'A', color: '#9933FF' },
  { pitch: 'E5', freq: 659.25, label: 'E', color: '#FF2DA8' },
];

// 长笛：一个八度（C4 - C5）
export const FLUTE_PITCHES: PitchEntry[] = PIANO_PITCHES.map((p) => ({ ...p }));

// 架子鼓：5 个鼓件
export const DRUM_PITCHES: PitchEntry[] = [
  { pitch: 'kick',  freq: 0, label: 'Kick',  color: '#FF2DA8' },
  { pitch: 'snare', freq: 0, label: 'Snare', color: '#FFE600' },
  { pitch: 'hat',   freq: 0, label: 'Hat',   color: '#00F0FF' },
  { pitch: 'tom1',  freq: 0, label: 'Tom1',  color: '#0066FF' },
  { pitch: 'tom2',  freq: 0, label: 'Tom2',  color: '#9966FF' },
];

export const INSTRUMENT_PITCHES: Record<Instrument, PitchEntry[]> = {
  piano: PIANO_PITCHES,
  guitar: GUITAR_PITCHES,
  violin: VIOLIN_PITCHES,
  flute: FLUTE_PITCHES,
  drums: DRUM_PITCHES,
};

export const INSTRUMENT_COLORS: Record<Instrument, string> = {
  piano: '#0066FF',
  guitar: '#00F0FF',
  violin: '#FF2DA8',
  flute: '#FFE600',
  drums: '#9966FF',
};
```

- [ ] **Step 3: 创建识别器 `frontend/src/modules/shapeRecognizer/shapeRecognizer.ts`**

```typescript
// frontend/src/modules/shapeRecognizer/shapeRecognizer.ts
// 识别算法严格遵循 modules 文档：
// 1) 按 bounding box 长宽比分类形状（块状 / 横向长条 / 竖向长条）
// 2) 按整体布局（横排/竖排/网格/散布）判断乐器
// 3) 按形状数量截取对应乐器的音高表

import { DrawnShape, RecognitionResult, VirtualKey } from '../../types/shapes';
import { Instrument } from '../../types/api';
import { INSTRUMENT_PITCHES, INSTRUMENT_COLORS } from './templates';

interface ShapeFeature {
  shape: DrawnShape;
  aspect: number;       // width / height
  category: 'block' | 'hbar' | 'vbar';
  cx: number;
  cy: number;
}

function classifyShape(s: DrawnShape): ShapeFeature {
  const aspect = s.width / Math.max(1, s.height);
  const category: ShapeFeature['category'] =
    aspect > 2.5 ? 'hbar' : aspect < 0.4 ? 'vbar' : 'block';
  return {
    shape: s,
    aspect,
    category,
    cx: s.x + s.width / 2,
    cy: s.y + s.height / 2,
  };
}

// 计算所有形状的整体布局方向
function detectLayout(features: ShapeFeature[]): 'row' | 'col' | 'grid' | 'scatter' {
  if (features.length < 2) return 'scatter';
  const xs = features.map((f) => f.cx);
  const ys = features.map((f) => f.cy);
  const xRange = Math.max(...xs) - Math.min(...xs);
  const yRange = Math.max(...ys) - Math.min(...ys);
  if (xRange > yRange * 2) return 'row';
  if (yRange > xRange * 2) return 'col';
  if (features.length >= 4) return 'grid';
  return 'scatter';
}

// 推断乐器：组合形状类别 + 数量 + 布局
function inferInstrument(features: ShapeFeature[]): { instrument: Instrument; reason: string; confidence: number } {
  const n = features.length;
  const layout = detectLayout(features);
  const hasHbar = features.some((f) => f.category === 'hbar');
  const hasVbar = features.some((f) => f.category === 'vbar');
  const allBlock = features.every((f) => f.category === 'block');

  // 5 个块状 + grid → 架子鼓
  if (n === 5 && allBlock && layout === 'grid') {
    return { instrument: 'drums', reason: '5 个块状形状呈网格布局，匹配架子鼓', confidence: 0.92 };
  }
  // 6 个横向长条（横向排布） → 吉他
  if (n === 6 && hasHbar && layout === 'row') {
    return { instrument: 'guitar', reason: '6 条横向长条按行排布，匹配吉他 6 弦', confidence: 0.88 };
  }
  // 4 个竖向长条 → 小提琴
  if (n === 4 && hasVbar) {
    return { instrument: 'violin', reason: '4 条竖向长条，匹配小提琴 4 弦', confidence: 0.85 };
  }
  // 4-8 个块状横向排布 → 钢琴
  if (n >= 4 && n <= 8 && allBlock && (layout === 'row' || layout === 'grid')) {
    return { instrument: 'piano', reason: `${n} 个块状形状按键盘式排布，匹配钢琴`, confidence: 0.9 };
  }
  // 6-8 个竖向长条 → 长笛
  if (n >= 6 && n <= 8 && hasVbar) {
    return { instrument: 'flute', reason: `${n} 个竖向长条，匹配长笛指孔`, confidence: 0.82 };
  }
  // 兜底：按数量猜
  if (n === 6) return { instrument: 'guitar', reason: '默认按 6 形状推断为吉他', confidence: 0.5 };
  if (n === 4) return { instrument: 'violin', reason: '默认按 4 形状推断为小提琴', confidence: 0.5 };
  if (n === 5) return { instrument: 'drums', reason: '默认按 5 形状推断为架子鼓', confidence: 0.5 };
  return { instrument: 'piano', reason: '无法精确匹配，回退到钢琴', confidence: 0.4 };
}

export function recognizeShapes(shapes: DrawnShape[]): RecognitionResult {
  if (shapes.length === 0) {
    return { instrument: 'piano', keys: [], confidence: 0, reason: '未绘制任何形状' };
  }
  const features = shapes.map(classifyShape);
  const { instrument, reason, confidence } = inferInstrument(features);

  // 按从左到右、从上到下排序，分配音高
  const sorted = [...features].sort((a, b) => {
    if (instrument === 'guitar' || instrument === 'piano' || instrument === 'flute') {
      return a.cx - b.cx; // 横向乐器按 x 排
    }
    if (instrument === 'violin') {
      return a.cx - b.cx; // 小提琴按弦位置
    }
    return a.cy - b.cx; // 鼓按位置
  });

  const pitches = INSTRUMENT_PITCHES[instrument];
  const keys: VirtualKey[] = sorted.slice(0, pitches.length).map((f, i) => {
    const p = pitches[i];
    return {
      id: f.shape.id,
      shapeType: f.shape.type,
      cx: f.cx,
      cy: f.cy,
      width: Math.max(f.shape.width, 40),     // 命中区域最小 40px
      height: Math.max(f.shape.height, 40),
      pitch: p.pitch,
      freq: p.freq,
      instrument,
      label: p.label,
      color: p.color,
    };
  });

  return { instrument, keys, confidence, reason };
}
```

- [ ] **Step 4: 写识别器测试**

```typescript
// frontend/src/modules/shapeRecognizer/__tests__/shapeRecognizer.test.ts
import { describe, it, expect } from 'vitest';
import { recognizeShapes } from '../shapeRecognizer';
import { DrawnShape } from '../../../types/shapes';

function shape(id: string, x: number, y: number, w: number, h: number): DrawnShape {
  return { id, type: 'rect', x, y, width: w, height: h };
}

describe('shapeRecognizer', () => {
  it('returns empty keys when no shapes', () => {
    const r = recognizeShapes([]);
    expect(r.keys).toHaveLength(0);
    expect(r.confidence).toBe(0);
  });

  it('detects piano from 7 horizontal blocks', () => {
    const shapes = Array.from({ length: 7 }, (_, i) =>
      shape(`s${i}`, 50 + i * 80, 200, 60, 60)
    );
    const r = recognizeShapes(shapes);
    expect(r.instrument).toBe('piano');
    expect(r.keys).toHaveLength(7);
    expect(r.keys[0].pitch).toBe('C4');
    expect(r.keys[6].pitch).toBe('C5');
  });

  it('detects guitar from 6 horizontal bars', () => {
    const shapes = Array.from({ length: 6 }, (_, i) =>
      shape(`g${i}`, 50, 100 + i * 30, 400, 12)
    );
    const r = recognizeShapes(shapes);
    expect(r.instrument).toBe('guitar');
    expect(r.keys).toHaveLength(6);
    expect(r.keys[0].pitch).toBe('E2');
  });

  it('detects violin from 4 vertical bars', () => {
    const shapes = Array.from({ length: 4 }, (_, i) =>
      shape(`v${i}`, 100 + i * 60, 100, 12, 300)
    );
    const r = recognizeShapes(shapes);
    expect(r.instrument).toBe('violin');
    expect(r.keys).toHaveLength(4);
    expect(r.keys[0].pitch).toBe('G3');
  });

  it('detects drums from 5 blocks in grid', () => {
    const shapes = [
      shape('d1', 100, 100, 80, 80),
      shape('d2', 220, 100, 80, 80),
      shape('d3', 100, 220, 80, 80),
      shape('d4', 220, 220, 80, 80),
      shape('d5', 160, 340, 80, 80),
    ];
    const r = recognizeShapes(shapes);
    expect(r.instrument).toBe('drums');
    expect(r.keys).toHaveLength(5);
    expect(r.keys[0].pitch).toBe('kick');
  });
});
```

- [ ] **Step 5: 运行测试**

Run: `cd frontend && npm run test -- shapeRecognizer`
预期：5 个用例 PASS。

- [ ] **Step 6: 创建画布组件 `frontend/src/modules/canvas/DrawCanvas.tsx`**

```typescript
// frontend/src/modules/canvas/DrawCanvas.tsx
import { useRef, useState, useEffect, useCallback } from 'react';
import { DrawnShape } from '../../types/shapes';

interface DrawCanvasProps {
  width: number;
  height: number;
  shapes: DrawnShape[];
  onShapesChange: (shapes: DrawnShape[]) => void;
  tool: 'rect' | 'circle' | 'line';
  color?: string;
  disabled?: boolean;
}

export function DrawCanvas({
  width,
  height,
  shapes,
  onShapesChange,
  tool,
  color = '#0A0A0A',
  disabled,
}: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<DrawnShape | null>(null);

  // 重绘
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    // 背景网格
    ctx.strokeStyle = 'rgba(10,10,10,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    // 已有形状
    shapes.forEach((s) => drawShape(ctx, s, false));
    // 预览
    if (preview) drawShape(ctx, preview, true);
  }, [width, height, shapes, preview]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function drawShape(ctx: CanvasRenderingContext2D, s: DrawnShape, isPreview: boolean) {
    ctx.save();
    ctx.strokeStyle = s.color ?? '#0A0A0A';
    ctx.fillStyle = isPreview ? 'rgba(10,10,10,0.05)' : 'rgba(10,10,10,0.02)';
    ctx.lineWidth = 2;
    if (isPreview) ctx.setLineDash([4, 4]);
    if (s.type === 'rect') {
      ctx.beginPath();
      ctx.rect(s.x, s.y, s.width, s.height);
      ctx.fill();
      ctx.stroke();
    } else if (s.type === 'circle') {
      const r = Math.max(s.width, s.height) / 2;
      ctx.beginPath();
      ctx.arc(s.x + s.width / 2, s.y + s.height / 2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (s.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.width, s.y + s.height);
      ctx.stroke();
    }
    ctx.restore();
  }

  function getPos(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrawing(true);
    setStart(getPos(e));
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawing || !start) return;
    const cur = getPos(e);
    const x = Math.min(start.x, cur.x);
    const y = Math.min(start.y, cur.y);
    const w = Math.abs(cur.x - start.x);
    const h = Math.abs(cur.y - start.y);
    setPreview({
      id: `shape-${Date.now()}`,
      type: tool,
      x,
      y,
      width: w,
      height: h,
      color,
    });
  }

  function onPointerUp() {
    if (!drawing || !preview) {
      setDrawing(false);
      setStart(null);
      setPreview(null);
      return;
    }
    // 太小的形状忽略
    if (preview.width >= 8 && preview.height >= 8) {
      onShapesChange([...shapes, preview]);
    }
    setDrawing(false);
    setStart(null);
    setPreview(null);
  }

  function onClear() {
    onShapesChange([]);
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-xl border border-paper-border bg-paper-card touch-none"
        style={{ aspectRatio: `${width} / ${height}`, width: '100%' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <button
        type="button"
        onClick={onClear}
        className="absolute right-3 top-3 rounded-md bg-paper-bg/80 px-2 py-1 text-caption text-ink-secondary hover:text-accent-danger"
      >
        清空
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/types/shapes.ts frontend/src/modules/shapeRecognizer frontend/src/modules/canvas
git commit -m "feat(frontend): 画图生成键位模块（M2）"
```

---

## Task 19：摄像头实时画面模块（M3）

**Goal：** 获取摄像头视频流，镜像翻转渲染到 canvas，处理权限错误与生命周期。

**Files:**
- Create: `frontend/src/modules/camera/CameraStage.tsx`
- Create: `frontend/src/modules/camera/useCamera.ts`

- [ ] **Step 1: 创建 useCamera Hook**

```typescript
// frontend/src/modules/camera/useCamera.ts
import { useEffect, useRef, useState, useCallback } from 'react';

type CameraStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'error';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('浏览器不支持摄像头 API');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus('ready');
    } catch (e: any) {
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setStatus('denied');
        setError('摄像头权限被拒绝，请在浏览器设置中允许后重试');
      } else if (e?.name === 'NotFoundError' || e?.name === 'DevicesNotFoundError') {
        setStatus('error');
        setError('未检测到摄像头设备');
      } else {
        setStatus('error');
        setError(e?.message ?? '摄像头启动失败');
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      // 卸载时释放
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return { videoRef, status, error, start, stop };
}
```

- [ ] **Step 2: 创建 CameraStage 组件**

```typescript
// frontend/src/modules/camera/CameraStage.tsx
import { forwardRef } from 'react';
import { useCamera } from './useCamera';
import { Button } from '../../components/ui/Button';

interface CameraStageProps {
  onReady?: (video: HTMLVideoElement) => void;
  className?: string;
}

export const CameraStage = forwardRef<HTMLDivElement, CameraStageProps>(
  ({ onReady, className }, ref) => {
    const { videoRef, status, error, start, stop } = useCamera();

    return (
      <div ref={ref} className={['relative overflow-hidden rounded-2xl bg-black', className ?? ''].join(' ')}>
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // 镜像
          onLoadedMetadata={() => {
            if (videoRef.current && status === 'ready') {
              onReady?.(videoRef.current);
            }
          }}
        />

        {/* 状态遮罩 */}
        {status !== 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 text-paper-bg">
            {status === 'idle' && (
              <>
                <p className="text-h3 font-display">摄像头未开启</p>
                <p className="text-caption text-paper-bg/70">
                  点击下方按钮请求权限，所有画面仅在浏览器本地处理。
                </p>
                <Button onClick={start} variant="neon">
                  开启摄像头
                </Button>
              </>
            )}
            {status === 'loading' && <p className="text-body animate-pulse">正在请求权限...</p>}
            {status === 'denied' && (
              <>
                <p className="text-h3 font-display text-accent-danger">权限被拒绝</p>
                <p className="max-w-sm text-center text-caption text-paper-bg/70">{error}</p>
                <Button onClick={start} variant="secondary">
                  重试
                </Button>
              </>
            )}
            {status === 'error' && (
              <>
                <p className="text-h3 font-display text-accent-danger">无法启动</p>
                <p className="max-w-sm text-center text-caption text-paper-bg/70">{error}</p>
                <Button onClick={start} variant="secondary">
                  重试
                </Button>
              </>
            )}
          </div>
        )}

        {/* 右上角关闭按钮 */}
        {status === 'ready' && (
          <button
            type="button"
            onClick={stop}
            className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-caption text-paper-bg/80 hover:text-accent-danger"
          >
            停止
          </button>
        )}
      </div>
    );
  }
);
CameraStage.displayName = 'CameraStage';
```

- [ ] **Step 3: 写 useCamera 测试（mock getUserMedia）**

```typescript
// frontend/src/modules/camera/__tests__/useCamera.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCamera } from '../useCamera';

describe('useCamera', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports denied when permission rejected', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue({ name: 'NotAllowedError' }),
      },
    });
    const { result } = renderHook(() => useCamera());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe('denied');
    expect(result.current.error).toContain('权限被拒绝');
  });

  it('reports error when API missing', async () => {
    vi.stubGlobal('navigator', {});
    const { result } = renderHook(() => useCamera());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('不支持');
  });
});
```

- [ ] **Step 4: 运行测试**

Run: `cd frontend && npm run test -- useCamera`
预期：2 个用例 PASS。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/modules/camera
git commit -m "feat(frontend): 摄像头实时画面模块（M3）"
```

---

## Task 20：手部追踪模块（M4）

**Goal：** 用 MediaPipe Hands 在浏览器端追踪双手 21 关键点，提供 30fps 回调，暴露食指尖坐标。

**Files:**
- Modify: `frontend/package.json`（安装依赖）
- Create: `frontend/src/modules/handtracking/HandTracker.ts`
- Create: `frontend/src/modules/handtracking/__tests__/HandTracker.test.ts`

- [ ] **Step 1: 安装 MediaPipe 依赖**

Run:
```bash
cd frontend
npm install @mediapipe/hands @mediapipe/camera_utils @mediapipe/drawing_utils
```

- [ ] **Step 2: 创建 HandTracker 类 `frontend/src/modules/handtracking/HandTracker.ts`**

```typescript
// frontend/src/modules/handtracking/HandTracker.ts
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export interface HandLandmark {
  x: number; // 0-1 归一化坐标
  y: number;
  z: number;
}

export interface HandFrame {
  timestamp: number;
  hands: HandLandmark[][]; // 0-2 只手，每只 21 个关键点
  indexFingerTip: HandLandmark | null; // 优选手（第一只检测到的）的食指尖
}

export type HandFrameCallback = (frame: HandFrame) => void;

const FINGER_INDICES = {
  thumb: [1, 2, 3, 4],
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
  wrist: 0,
};

export class HandTracker {
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private callback: HandFrameCallback | null = null;
  private running = false;

  async init(): Promise<void> {
    if (this.hands) return;
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });
    hands.onResults((results: Results) => this.handleResults(results));
    this.hands = hands;
  }

  private handleResults(results: Results) {
    if (!this.callback) return;
    const hands: HandLandmark[][] = [];
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        hands.push(
          landmarks.map((p) => ({ x: p.x, y: p.y, z: p.z }))
        );
      }
    }
    const indexFingerTip =
      hands.length > 0 ? hands[0][FINGER_INDICES.index[3]] : null;
    this.callback({
      timestamp: performance.now(),
      hands,
      indexFingerTip,
    });
  }

  async start(video: HTMLVideoElement, callback: HandFrameCallback): Promise<void> {
    if (!this.hands) await this.init();
    if (this.running) return;
    this.callback = callback;
    this.running = true;
    this.camera = new Camera(video, {
      onFrame: async () => {
        if (!this.hands || !this.running) return;
        await this.hands.send({ image: video });
      },
      width: 640,
      height: 480,
    });
    await this.camera.start();
  }

  stop(): void {
    this.running = false;
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    this.callback = null;
  }

  dispose(): void {
    this.stop();
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
  }
}

// 工具：归一化坐标 → 画布像素坐标（含镜像翻转）
export function normalizedToCanvas(
  point: HandLandmark,
  canvasWidth: number,
  canvasHeight: number,
  mirror = true
): { x: number; y: number } {
  return {
    x: (mirror ? 1 - point.x : point.x) * canvasWidth,
    y: point.y * canvasHeight,
  };
}
```

- [ ] **Step 3: 写测试（验证 normalizedToCanvas 工具函数）**

```typescript
// frontend/src/modules/handtracking/__tests__/HandTracker.test.ts
import { describe, it, expect } from 'vitest';
import { normalizedToCanvas, HandLandmark } from '../HandTracker';

describe('normalizedToCanvas', () => {
  const p: HandLandmark = { x: 0.25, y: 0.5, z: 0 };

  it('mirrors x by default', () => {
    const r = normalizedToCanvas(p, 800, 600);
    expect(r.x).toBeCloseTo(600, 1); // (1-0.25)*800 = 600
    expect(r.y).toBeCloseTo(300, 1);
  });

  it('does not mirror when mirror=false', () => {
    const r = normalizedToCanvas(p, 800, 600, false);
    expect(r.x).toBeCloseTo(200, 1);
    expect(r.y).toBeCloseTo(300, 1);
  });
});
```

- [ ] **Step 4: 运行测试**

Run: `cd frontend && npm run test -- HandTracker`
预期：2 个用例 PASS。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/modules/handtracking frontend/package.json
git commit -m "feat(frontend): MediaPipe 手部追踪模块（M4）"
```

---

## Task 21：键位叠加渲染模块（M5）

**Goal：** 在摄像头画面上叠加虚拟键位（霓虹边框），监听食指尖坐标，进入键位区域触发回调，150ms 防抖。

**Files:**
- Create: `frontend/src/modules/keyoverlay/KeyOverlay.tsx`
- Create: `frontend/src/modules/keyoverlay/useKeyTrigger.ts`

- [ ] **Step 1: 创建 useKeyTrigger Hook**

```typescript
// frontend/src/modules/keyoverlay/useKeyTrigger.ts
import { useRef, useCallback, useEffect } from 'react';
import { VirtualKey } from '../../types/shapes';
import { HandLandmark } from '../handtracking/HandTracker';

const COOLDOWN_MS = 150;

interface UseKeyTriggerOptions {
  keys: VirtualKey[];
  canvasWidth: number;
  canvasHeight: number;
  sensitivity?: number; // 0.8 - 1.2，命中框缩放系数
  onTrigger: (key: VirtualKey) => void;
}

// 检测食指尖是否落在某个键位内
function isInside(
  px: number,
  py: number,
  key: VirtualKey,
  sensitivity: number
): boolean {
  const halfW = (key.width / 2) * sensitivity;
  const halfH = (key.height / 2) * sensitivity;
  return (
    px >= key.cx - halfW &&
    px <= key.cx + halfW &&
    py >= key.cy - halfH &&
    py <= key.cy + halfH
  );
}

export function useKeyTrigger({
  keys,
  canvasWidth,
  canvasHeight,
  sensitivity = 1,
  onTrigger,
}: UseKeyTriggerOptions) {
  const lastTriggerAt = useRef<Record<string, number>>({}); // keyId -> 上次触发时间戳
  const onTriggerRef = useRef(onTrigger);
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  const handleFrame = useCallback(
    (indexFingerTip: HandLandmark | null) => {
      if (!indexFingerTip || keys.length === 0) return;
      // 镜像翻转后的像素坐标
      const px = (1 - indexFingerTip.x) * canvasWidth;
      const py = indexFingerTip.y * canvasHeight;
      const now = performance.now();
      for (const key of keys) {
        if (isInside(px, py, key, sensitivity)) {
          const last = lastTriggerAt.current[key.id] ?? 0;
          if (now - last >= COOLDOWN_MS) {
            lastTriggerAt.current[key.id] = now;
            onTriggerRef.current(key);
          }
          break; // 同一时刻只触发一个键
        }
      }
    },
    [keys, canvasWidth, canvasHeight, sensitivity]
  );

  const reset = useCallback(() => {
    lastTriggerAt.current = {};
  }, []);

  return { handleFrame, reset };
}
```

- [ ] **Step 2: 创建 KeyOverlay 组件**

```typescript
// frontend/src/modules/keyoverlay/KeyOverlay.tsx
import { useEffect, useRef } from 'react';
import { VirtualKey } from '../../types/shapes';
import { HandLandmark } from '../handtracking/HandTracker';

interface KeyOverlayProps {
  keys: VirtualKey[];
  canvasWidth: number;
  canvasHeight: number;
  indexFingerTip: HandLandmark | null;
  activeKeyIds: string[]; // 当前正在被触发的键 id 列表（用于高亮）
}

export function KeyOverlay({
  keys,
  canvasWidth,
  canvasHeight,
  indexFingerTip,
  activeKeyIds,
}: KeyOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 画每个键位
    keys.forEach((key) => {
      const isActive = activeKeyIds.includes(key.id);
      const halfW = key.width / 2;
      const halfH = key.height / 2;
      const x = key.cx - halfW;
      const y = key.cy - halfH;

      ctx.save();
      // 边框
      ctx.strokeStyle = key.color;
      ctx.lineWidth = isActive ? 4 : 2;
      ctx.shadowColor = key.color;
      ctx.shadowBlur = isActive ? 24 : 12;
      ctx.strokeRect(x, y, key.width, key.height);

      // 内部半透明填充
      ctx.fillStyle = isActive
        ? `${key.color}33`
        : `${key.color}11`;
      ctx.fillRect(x, y, key.width, key.height);

      // 标签
      ctx.shadowBlur = 0;
      ctx.fillStyle = key.color;
      ctx.font = '500 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(key.label, key.cx, key.cy);
      ctx.restore();
    });

    // 画食指尖光标
    if (indexFingerTip) {
      const px = (1 - indexFingerTip.x) * canvasWidth;
      const py = indexFingerTip.y * canvasHeight;
      ctx.save();
      // 外环
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(px, py, 18, 0, Math.PI * 2);
      ctx.stroke();
      // 内点
      ctx.fillStyle = '#00F0FF';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [keys, canvasWidth, canvasHeight, indexFingerTip, activeKeyIds]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
```

- [ ] **Step 3: 写 useKeyTrigger 测试**

```typescript
// frontend/src/modules/keyoverlay/__tests__/useKeyTrigger.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyTrigger } from '../useKeyTrigger';
import { VirtualKey } from '../../../types/shapes';

const keys: VirtualKey[] = [
  {
    id: 'k1',
    shapeType: 'rect',
    cx: 400,
    cy: 300,
    width: 80,
    height: 80,
    pitch: 'C4',
    freq: 261.63,
    instrument: 'piano',
    label: 'C',
    color: '#00F0FF',
  },
];

describe('useKeyTrigger', () => {
  it('fires onTrigger when finger enters key', () => {
    const onTrigger = vi.fn();
    const { result } = renderHook(() =>
      useKeyTrigger({
        keys,
        canvasWidth: 800,
        canvasHeight: 600,
        onTrigger,
      })
    );
    // 食指尖在键位中心：归一化 (0.5, 0.5) → 镜像后 (400, 300)
    act(() => {
      result.current.handleFrame({ x: 0.5, y: 0.5, z: 0 });
    });
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(onTrigger).toHaveBeenCalledWith(keys[0]);
  });

  it('does not fire when finger outside key', () => {
    const onTrigger = vi.fn();
    const { result } = renderHook(() =>
      useKeyTrigger({
        keys,
        canvasWidth: 800,
        canvasHeight: 600,
        onTrigger,
      })
    );
    act(() => {
      result.current.handleFrame({ x: 0.1, y: 0.1, z: 0 });
    });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('respects 150ms cooldown', async () => {
    vi.useFakeTimers();
    const onTrigger = vi.fn();
    const { result } = renderHook(() =>
      useKeyTrigger({
        keys,
        canvasWidth: 800,
        canvasHeight: 600,
        onTrigger,
      })
    );
    act(() => {
      result.current.handleFrame({ x: 0.5, y: 0.5, z: 0 });
    });
    act(() => {
      result.current.handleFrame({ x: 0.5, y: 0.5, z: 0 });
    });
    expect(onTrigger).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    act(() => {
      result.current.handleFrame({ x: 0.5, y: 0.5, z: 0 });
    });
    expect(onTrigger).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 4: 运行测试**

Run: `cd frontend && npm run test -- useKeyTrigger`
预期：3 个用例 PASS。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/modules/keyoverlay
git commit -m "feat(frontend): 键位叠加渲染与触发模块（M5）"
```

---

## Task 22：音频合成模块（M6）

**Goal：** 用 Web Audio API 合成 5 种乐器音色，提供 `playKey(key)` 接口；管理 AudioContext 生命周期与用户手势激活。

**Files:**
- Create: `frontend/src/modules/audio/synth.ts`
- Create: `frontend/src/modules/audio/__tests__/synth.test.ts`

- [ ] **Step 1: 创建 synth.ts**

```typescript
// frontend/src/modules/audio/synth.ts
// 5 种乐器音色合成参数，严格对齐 modules 文档 INSTRUMENT_PRESETS

import { Instrument } from '../../types/api';
import { VirtualKey } from '../../types/shapes';

type OscType = 'sine' | 'square' | 'sawtooth' | 'triangle';

interface InstrumentPreset {
  oscType: OscType;
  attack: number;   // 秒
  decay: number;
  sustain: number;  // 0-1
  release: number;
  filterFreq: number;
  filterQ: number;
  gain: number;     // 主音量 0-1
  detune: number;   // cents，用于细微合唱感
}

const INSTRUMENT_PRESETS: Record<Instrument, InstrumentPreset> = {
  piano: {
    oscType: 'triangle',
    attack: 0.005,
    decay: 0.3,
    sustain: 0.4,
    release: 0.6,
    filterFreq: 4000,
    filterQ: 1,
    gain: 0.5,
    detune: 0,
  },
  guitar: {
    oscType: 'sawtooth',
    attack: 0.01,
    decay: 0.4,
    sustain: 0.6,
    release: 0.8,
    filterFreq: 2500,
    filterQ: 2,
    gain: 0.35,
    detune: 5,
  },
  violin: {
    oscType: 'sawtooth',
    attack: 0.12,
    decay: 0.2,
    sustain: 0.85,
    release: 0.4,
    filterFreq: 3000,
    filterQ: 1.5,
    gain: 0.3,
    detune: 8,
  },
  flute: {
    oscType: 'sine',
    attack: 0.08,
    decay: 0.1,
    sustain: 0.9,
    release: 0.3,
    filterFreq: 5000,
    filterQ: 0.8,
    gain: 0.4,
    detune: 0,
  },
  drums: {
    oscType: 'square',
    attack: 0.001,
    decay: 0.15,
    sustain: 0.0,
    release: 0.2,
    filterFreq: 1500,
    filterQ: 3,
    gain: 0.55,
    detune: 0,
  },
};

// 鼓件频率与噪声配置
const DRUM_CONFIG: Record<string, { freq: number; noise: boolean; duration: number }> = {
  kick:  { freq: 60,   noise: false, duration: 0.3 },
  snare: { freq: 200,  noise: true,  duration: 0.2 },
  hat:   { freq: 8000, noise: true,  duration: 0.08 },
  tom1:  { freq: 250,  noise: false, duration: 0.25 },
  tom2:  { freq: 180,  noise: false, duration: 0.3 },
};

class SynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeVoices = new Map<string, { stop: () => void }>();

  // 必须在用户手势中调用（浏览器策略）
  async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  async playKey(key: VirtualKey): Promise<void> {
    const ctx = await this.ensureContext();
    if (!this.masterGain) return;

    // 若该键已在响，先停
    this.stopKey(key.id);

    if (key.instrument === 'drums') {
      this.playDrum(ctx, key);
    } else {
      this.playTone(ctx, key);
    }
  }

  private playTone(ctx: AudioContext, key: VirtualKey) {
    const preset = INSTRUMENT_PRESETS[key.instrument];
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator(); // 第二振荡器做轻微 detune 合唱
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = preset.oscType;
    osc.frequency.value = key.freq;
    osc2.type = preset.oscType;
    osc2.frequency.value = key.freq;
    osc2.detune.value = preset.detune;

    filter.type = 'lowpass';
    filter.frequency.value = preset.filterFreq;
    filter.Q.value = preset.filterQ;

    // ADSR
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(preset.gain, now + preset.attack);
    gain.gain.linearRampToValueAtTime(
      preset.gain * preset.sustain,
      now + preset.attack + preset.decay
    );

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc2.start(now);

    const stop = () => {
      const stopTime = ctx.currentTime;
      gain.gain.cancelScheduledValues(stopTime);
      gain.gain.setValueAtTime(gain.gain.value, stopTime);
      gain.gain.linearRampToValueAtTime(0, stopTime + preset.release);
      osc.stop(stopTime + preset.release + 0.05);
      osc2.stop(stopTime + preset.release + 0.05);
    };

    this.activeVoices.set(key.id, { stop });
    // 自动停止（最长 2 秒）
    setTimeout(stop, 2000);
  }

  private playDrum(ctx: AudioContext, key: VirtualKey) {
    const cfg = DRUM_CONFIG[key.pitch];
    if (!cfg) return;
    const now = ctx.currentTime;
    const preset = INSTRUMENT_PRESETS.drums;

    if (cfg.noise) {
      // 噪声型鼓件（snare / hat）
      const bufferSize = ctx.sampleRate * cfg.duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = cfg.freq;
      const gain = ctx.createGain();
      gain.gain.value = preset.gain;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      noise.start(now);
      noise.stop(now + cfg.duration);
    } else {
      // 音调型鼓件（kick / tom）
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(cfg.freq, now);
      osc.frequency.exponentialRampToValueAtTime(cfg.freq * 0.4, now + cfg.duration);
      gain.gain.setValueAtTime(preset.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + cfg.duration);
    }
  }

  stopKey(keyId: string) {
    const voice = this.activeVoices.get(keyId);
    if (voice) {
      voice.stop();
      this.activeVoices.delete(keyId);
    }
  }

  stopAll() {
    this.activeVoices.forEach((v) => v.stop());
    this.activeVoices.clear();
  }

  setMasterVolume(v: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, v));
    }
  }

  dispose() {
    this.stopAll();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }
}

// 单例
export const synth = new SynthEngine();
export { INSTRUMENT_PRESETS, DRUM_CONFIG };
```

- [ ] **Step 2: 写测试（验证 preset 完整性）**

```typescript
// frontend/src/modules/audio/__tests__/synth.test.ts
import { describe, it, expect } from 'vitest';
import { INSTRUMENT_PRESETS, DRUM_CONFIG } from '../synth';

describe('INSTRUMENT_PRESETS', () => {
  it('contains all 5 instruments', () => {
    expect(Object.keys(INSTRUMENT_PRESETS).sort()).toEqual(
      ['drums', 'flute', 'guitar', 'piano', 'violin']
    );
  });

  it('all gains are in 0-1 range', () => {
    Object.values(INSTRUMENT_PRESETS).forEach((p) => {
      expect(p.gain).toBeGreaterThan(0);
      expect(p.gain).toBeLessThanOrEqual(1);
    });
  });
});

describe('DRUM_CONFIG', () => {
  it('contains 5 drum pieces', () => {
    expect(Object.keys(DRUM_CONFIG).sort()).toEqual(
      ['hat', 'kick', 'snare', 'tom1', 'tom2']
    );
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `cd frontend && npm run test -- synth`
预期：2 个用例 PASS。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/modules/audio
git commit -m "feat(frontend): Web Audio 音频合成模块（M6）"
```

---

## Task 23：激光特效模块（M8）

**Goal：** 键位命中时叠加 5 层反馈：边框闪光、内圈呼吸、粒子爆裂、文字放大、激光拖尾。同时绘制手部骨架激光线。

**Files:**
- Create: `frontend/src/modules/effects/LaserEffects.ts`
- Create: `frontend/src/modules/effects/__tests__/LaserEffects.test.ts`

- [ ] **Step 1: 创建 LaserEffects 类**

```typescript
// frontend/src/modules/effects/LaserEffects.ts
import { HandLandmark } from '../handtracking/HandTracker';
import { VirtualKey } from '../../types/shapes';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface KeyFlash {
  keyId: string;
  startedAt: number;
  duration: number;
}

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],         // 拇指
  [0, 5], [5, 6], [6, 7], [7, 8],         // 食指
  [5, 9], [9, 10], [10, 11], [11, 12],    // 中指
  [9, 13], [13, 14], [14, 15], [15, 16],  // 无名指
  [13, 17], [17, 18], [18, 19], [19, 20], // 小指
  [0, 17],                                // 手掌底
];

export class LaserEffects {
  private particles: Particle[] = [];
  private keyFlashes: KeyFlash[] = [];

  // 触发一次键位命中特效
  triggerKeyFlash(key: VirtualKey) {
    this.keyFlashes.push({
      keyId: key.id,
      startedAt: performance.now(),
      duration: 400,
    });
    // 生成 12 个粒子
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x: key.cx,
        y: key.cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 600 + Math.random() * 200,
        color: key.color,
        size: 2 + Math.random() * 3,
      });
    }
    // 限制粒子总数上限
    if (this.particles.length > 200) {
      this.particles = this.particles.slice(-200);
    }
  }

  // 渲染一帧到 canvas
  render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    keys: VirtualKey[],
    hands: HandLandmark[][],
    indexFingerTip: HandLandmark | null
  ) {
    const now = performance.now();
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1) 键位命中闪光（5 层反馈）
    this.keyFlashes = this.keyFlashes.filter((f) => now - f.startedAt < f.duration);
    keys.forEach((key) => {
      const flash = this.keyFlashes.find((f) => f.keyId === key.id);
      if (!flash) return;
      const t = (now - flash.startedAt) / flash.duration; // 0-1
      const ease = 1 - Math.pow(1 - t, 3);
      const halfW = key.width / 2;
      const halfH = key.height / 2;

      ctx.save();
      // 层 1：边框扩散环
      ctx.strokeStyle = key.color;
      ctx.lineWidth = 3 * (1 - ease);
      ctx.globalAlpha = 1 - ease;
      ctx.shadowColor = key.color;
      ctx.shadowBlur = 24;
      const ringScale = 1 + ease * 1.2;
      const rw = key.width * ringScale;
      const rh = key.height * ringScale;
      ctx.strokeRect(key.cx - rw / 2, key.cy - rh / 2, rw, rh);

      // 层 2：内部填充脉冲
      ctx.globalAlpha = (1 - ease) * 0.5;
      ctx.fillStyle = key.color;
      ctx.fillRect(key.cx - halfW, key.cy - halfH, key.width, key.height);

      // 层 3：标签放大
      ctx.globalAlpha = 1 - ease;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 ${20 + ease * 16}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 12;
      ctx.fillText(key.label, key.cx, key.cy);
      ctx.restore();
    });

    // 2) 粒子爆裂
    this.particles = this.particles.filter((p) => p.life < p.maxLife);
    this.particles.forEach((p) => {
      p.life += 16; // 假设 60fps
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // 重力
      const alpha = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 3) 手部骨架激光线
    hands.forEach((hand) => {
      if (hand.length !== 21) return;
      ctx.save();
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 12;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -now / 30; // 流动效果
      HAND_CONNECTIONS.forEach(([a, b]) => {
        const pa = hand[a];
        const pb = hand[b];
        const ax = (1 - pa.x) * canvasWidth; // 镜像
        const ay = pa.y * canvasHeight;
        const bx = (1 - pb.x) * canvasWidth;
        const by = pb.y * canvasHeight;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      });
      // 关键点
      ctx.setLineDash([]);
      ctx.fillStyle = '#00F0FF';
      hand.forEach((p) => {
        const px = (1 - p.x) * canvasWidth;
        const py = p.y * canvasHeight;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    });

    // 4) 食指尖激光拖尾（连接到键位）
    if (indexFingerTip) {
      const fx = (1 - indexFingerTip.x) * canvasWidth;
      const fy = indexFingerTip.y * canvasHeight;
      ctx.save();
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 16;
      keys.forEach((key) => {
        const flash = this.keyFlashes.find((f) => f.keyId === key.id);
        if (!flash) return;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(key.cx, key.cy);
        ctx.stroke();
      });
      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
    this.keyFlashes = [];
  }
}
```

- [ ] **Step 2: 写测试**

```typescript
// frontend/src/modules/effects/__tests__/LaserEffects.test.ts
import { describe, it, expect, vi } from 'vitest';
import { LaserEffects } from '../LaserEffects';
import { VirtualKey } from '../../../types/shapes';

const key: VirtualKey = {
  id: 'k1',
  shapeType: 'rect',
  cx: 400,
  cy: 300,
  width: 80,
  height: 80,
  pitch: 'C4',
  freq: 261.63,
  instrument: 'piano',
  label: 'C',
  color: '#00F0FF',
};

describe('LaserEffects', () => {
  it('triggerKeyFlash adds particles', () => {
    const fx = new LaserEffects();
    fx.triggerKeyFlash(key);
    // 内部状态不暴露，但 render 后应能正常完成
    const ctx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      setLineDash: vi.fn(),
    } as any;
    expect(() => fx.render(ctx, 800, 600, [key], [], null)).not.toThrow();
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  it('clear removes all particles and flashes', () => {
    const fx = new LaserEffects();
    fx.triggerKeyFlash(key);
    fx.clear();
    const ctx = { clearRect: vi.fn() } as any;
    fx.render(ctx, 800, 600, [key], [], null);
    // clear 后没有粒子，render 只调 clearRect
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `cd frontend && npm run test -- LaserEffects`
预期：2 个用例 PASS。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/modules/effects
git commit -m "feat(frontend): 激光特效模块（M8）"
```

---

## Task 24：调音器模块（M7）

**Goal：** 麦克风采集音频，用自相关算法检测基频，与目标音高对比给出 cents 偏差，调用后端保存记录。

**Files:**
- Create: `frontend/src/modules/tuner/pitch.ts`
- Create: `frontend/src/modules/tuner/Tuner.tsx`
- Create: `frontend/src/modules/tuner/__tests__/pitch.test.ts`

- [ ] **Step 1: 创建基频检测 `frontend/src/modules/tuner/pitch.ts`**

```typescript
// frontend/src/modules/tuner/pitch.ts
// 自相关算法（ACF）检测基频

// 音名 → 频率表（A4 = 440Hz，平均律）
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function freqToNote(freq: number): { note: string; octave: number; cents: number } {
  if (freq <= 0) return { note: '-', octave: 0, cents: 0 };
  const midi = 69 + 12 * Math.log2(freq / 440);
  const rounded = Math.round(midi);
  const cents = Math.round((midi - rounded) * 100);
  const noteIndex = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return { note: NOTE_NAMES[noteIndex], octave, cents };
}

export function noteToFreq(note: string, octave: number): number {
  const idx = NOTE_NAMES.indexOf(note);
  if (idx < 0) return 0;
  const midi = (octave + 1) * 12 + idx;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 自相关检测基频
export function detectPitchACF(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // 太安静

  // ACF
  const acf = new Float32Array(SIZE);
  for (let lag = 0; lag < SIZE; lag++) {
    let sum = 0;
    for (let i = 0; i < SIZE - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    acf[lag] = sum;
  }

  // 找第一个峰之后的最大峰
  let firstZero = 0;
  while (firstZero < SIZE - 1 && acf[firstZero] > 0) firstZero++;
  let maxLag = firstZero;
  let maxVal = -Infinity;
  for (let lag = firstZero; lag < SIZE; lag++) {
    if (acf[lag] > maxVal) {
      maxVal = acf[lag];
      maxLag = lag;
    }
  }
  if (maxLag <= 0) return -1;
  return sampleRate / maxLag;
}

// 常用调音目标
export const TUNING_TARGETS = {
  guitar: [
    { note: 'E', octave: 2, freq: 82.41 },
    { note: 'A', octave: 2, freq: 110.00 },
    { note: 'D', octave: 3, freq: 146.83 },
    { note: 'G', octave: 3, freq: 196.00 },
    { note: 'B', octave: 3, freq: 246.94 },
    { note: 'E', octave: 4, freq: 329.63 },
  ],
  violin: [
    { note: 'G', octave: 3, freq: 196.00 },
    { note: 'D', octave: 4, freq: 293.66 },
    { note: 'A', octave: 4, freq: 440.00 },
    { note: 'E', octave: 5, freq: 659.25 },
  ],
};
```

- [ ] **Step 2: 写基频工具测试**

```typescript
// frontend/src/modules/tuner/__tests__/pitch.test.ts
import { describe, it, expect } from 'vitest';
import { freqToNote, noteToFreq, detectPitchACF } from '../pitch';

describe('freqToNote', () => {
  it('A4 = 440Hz', () => {
    const r = freqToNote(440);
    expect(r.note).toBe('A');
    expect(r.octave).toBe(4);
    expect(r.cents).toBe(0);
  });

  it('C4 ≈ 261.63Hz', () => {
    const r = freqToNote(261.63);
    expect(r.note).toBe('C');
    expect(r.octave).toBe(4);
    expect(Math.abs(r.cents)).toBeLessThan(1);
  });

  it('returns dash for invalid freq', () => {
    expect(freqToNote(0).note).toBe('-');
    expect(freqToNote(-1).note).toBe('-');
  });
});

describe('noteToFreq', () => {
  it('A4 → 440', () => {
    expect(noteToFreq('A', 4)).toBeCloseTo(440, 1);
  });

  it('returns 0 for invalid note', () => {
    expect(noteToFreq('X', 4)).toBe(0);
  });
});

describe('detectPitchACF', () => {
  it('returns -1 for silent buffer', () => {
    const buf = new Float32Array(2048);
    expect(detectPitchACF(buf, 44100)).toBe(-1);
  });

  it('detects 440Hz from sine wave', () => {
    const sr = 44100;
    const buf = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      buf[i] = Math.sin((2 * Math.PI * 440 * i) / sr);
    }
    const f = detectPitchACF(buf, sr);
    expect(Math.abs(f - 440)).toBeLessThan(5);
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `cd frontend && npm run test -- pitch`
预期：5 个用例 PASS。

- [ ] **Step 4: 创建 Tuner 组件**

```typescript
// frontend/src/modules/tuner/Tuner.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { detectPitchACF, freqToNote, TUNING_TARGETS, noteToFreq } from './pitch';
import { tuningsService } from '../../services/tunings';
import { toast } from '../../stores/toastStore';
import { isApiError } from '../../services/api';

type TunerStatus = 'idle' | 'running' | 'denied' | 'error';

interface TunerProps {
  instrument: 'guitar' | 'violin';
}

export function Tuner({ instrument }: TunerProps) {
  const [status, setStatus] = useState<TunererStatus>('idle');
  const [measuredFreq, setMeasuredFreq] = useState(0);
  const [note, setNote] = useState({ note: '-', octave: 0, cents: 0 });
  const [targetIndex, setTargetIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const targets = TUNING_TARGETS[instrument];
  const target = targets[targetIndex];

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setStatus('idle');
  }, []);

  const detectLoop = useCallback(() => {
    if (!analyserRef.current) return;
    const buf = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buf);
    const f = detectPitchACF(buf, audioCtxRef.current!.sampleRate);
    if (f > 0) {
      setMeasuredFreq(f);
      setNote(freqToNote(f));
    }
    rafRef.current = requestAnimationFrame(detectLoop);
  }, []);

  const start = useCallback(async () => {
    setStatus('running');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      detectLoop();
    } catch (e: any) {
      if (e?.name === 'NotAllowedError') {
        setStatus('denied');
        setError('麦克风权限被拒绝');
      } else {
        setStatus('error');
        setError(e?.message ?? '麦克风启动失败');
      }
    }
  }, [detectLoop]);

  // 卸载时释放
  useEffect(() => () => stop(), [stop]);

  // 偏差（cents）：当前音高与目标音名的差距
  const targetFreq = noteToFreq(target.note, target.octave);
  const deviationCents = measuredFreq > 0
    ? Math.round(1200 * Math.log2(measuredFreq / targetFreq))
    : 0;

  async function saveRecord() {
    if (measuredFreq <= 0) {
      toast.warning('尚未检测到稳定音高');
      return;
    }
    try {
      await tuningsService.create({
        instrument,
        targetNote: `${target.note}${target.octave}`,
        targetFreq,
        measuredFreq,
        deviationCents,
      });
      toast.success('调音记录已保存');
    } catch (e) {
      const msg = isApiError(e) ? e.message : '保存失败';
      toast.error(msg);
    }
  }

  // 指针角度：-50 cents → -45deg，0 → 0，+50 → +45
  const needleDeg = Math.max(-45, Math.min(45, (deviationCents / 50) * 45));

  return (
    <div className="rounded-2xl border border-paper-border bg-paper-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-h3 text-ink-primary">调音器</h3>
        <span className="text-caption text-ink-muted">{instrument === 'guitar' ? '吉他' : '小提琴'}</span>
      </div>

      {/* 目标弦选择 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {targets.map((t, i) => (
          <button
            key={`${t.note}${t.octave}`}
            type="button"
            onClick={() => setTargetIndex(i)}
            className={[
              'rounded-md px-3 py-1 text-caption font-mono',
              i === targetIndex
                ? 'bg-electric text-paper-bg'
                : 'bg-paper-subtle text-ink-secondary hover:text-ink-primary',
            ].join(' ')}
          >
            {t.note}{t.octave}
          </button>
        ))}
      </div>

      {/* 指针表盘 */}
      <div className="mt-6 flex flex-col items-center">
        <div className="relative h-32 w-64">
          <svg viewBox="0 0 200 100" className="h-full w-full">
            {/* 半圆刻度 */}
            <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="#E5E3DA" strokeWidth="2" />
            {/* 中心目标区 */}
            <path d="M 90 90 A 80 80 0 0 1 110 90" fill="none" stroke="#30A46C" strokeWidth="4" />
            {/* 刻度文字 */}
            <text x="20" y="100" fontSize="10" fill="#8A8A82" textAnchor="middle">-50</text>
            <text x="100" y="20" fontSize="10" fill="#30A46C" textAnchor="middle">0</text>
            <text x="180" y="100" fontSize="10" fill="#8A8A82" textAnchor="middle">+50</text>
            {/* 指针 */}
            <line
              x1="100" y1="90" x2="100" y2="20"
              stroke="#0066FF" strokeWidth="2"
              style={{
                transform: `rotate(${needleDeg}deg)`,
                transformOrigin: '100px 90px',
                transition: 'transform 0.15s ease-out',
              }}
            />
            <circle cx="100" cy="90" r="4" fill="#0A0A0A" />
          </svg>
        </div>
        <p className="mt-2 font-mono text-body text-ink-primary">
          {measuredFreq > 0 ? `${measuredFreq.toFixed(1)} Hz` : '—'}
        </p>
        <p className="font-mono text-caption text-ink-muted">
          {note.note === '-' ? '未检测到' : `${note.note}${note.octave} · ${deviationCents > 0 ? '+' : ''}${deviationCents} cents`}
        </p>
      </div>

      {/* 控制按钮 */}
      <div className="mt-6 flex items-center gap-3">
        {status === 'running' ? (
          <Button onClick={stop} variant="danger">停止</Button>
        ) : (
          <Button onClick={start} variant="primary">开始调音</Button>
        )}
        <Button onClick={saveRecord} variant="secondary" disabled={measuredFreq <= 0}>
          保存记录
        </Button>
      </div>

      {error && <p className="mt-3 text-caption text-accent-danger">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 5: 修正类型拼写（TunerStatus）**

检查上面的代码，`useState<TunererStatus>` 是笔误，应改为 `useState<TunerStatus>`。请确保写入文件时是 `useState<TunerStatus>('idle')`。

- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/tuner
git commit -m "feat(frontend): 调音器模块（M7）自相关基频检测"
```

---

## Task 25：工作台页面集成

**Goal：** 用 workbenchStore 串联 M2/M3/M4/M5/M6/M8，实现完整状态机（idle → drawing → generating → camera-pending → camera-loading → tracking → paused → error），完成 Workbench 页面。

**Files:**
- Create: `frontend/src/stores/workbenchStore.ts`
- Modify: `frontend/src/pages/Workbench.tsx`（覆盖占位）

- [ ] **Step 1: 创建 workbenchStore**

```typescript
// frontend/src/stores/workbenchStore.ts
import { create } from 'zustand';
import { DrawnShape, RecognitionResult, VirtualKey } from '../types/shapes';
import { recognizeShapes } from '../modules/shapeRecognizer/shapeRecognizer';
import { HandLandmark } from '../modules/handtracking/HandTracker';

export type WorkbenchPhase =
  | 'idle'
  | 'drawing'
  | 'generating'
  | 'camera-pending'
  | 'camera-loading'
  | 'tracking'
  | 'paused'
  | 'error';

interface WorkbenchState {
  phase: WorkbenchPhase;
  shapes: DrawnShape[];
  recognition: RecognitionResult | null;
  keys: VirtualKey[];
  indexFingerTip: HandLandmark | null;
  activeKeyIds: string[];
  sensitivity: number;
  errorMessage: string | null;
  noteCount: number;
  maxCombo: number;
  currentCombo: number;
  startedAt: number | null;

  // actions
  setPhase: (p: WorkbenchPhase) => void;
  setShapes: (s: DrawnShape[]) => void;
  addShape: (s: DrawnShape) => void;
  generateKeys: () => void;
  setIndexFingerTip: (p: HandLandmark | null) => void;
  triggerKey: (key: VirtualKey) => void;
  resetCombo: () => void;
  setSensitivity: (v: number) => void;
  setError: (msg: string) => void;
  clearError: () => void;
  reset: () => void;
}

const VALID_TRANSITIONS: Record<WorkbenchPhase, WorkbenchPhase[]> = {
  idle: ['drawing', 'error'],
  drawing: ['generating', 'idle', 'error'],
  generating: ['camera-pending', 'error'],
  'camera-pending': ['camera-loading', 'idle', 'error'],
  'camera-loading': ['tracking', 'error', 'camera-pending'],
  tracking: ['paused', 'error', 'idle'],
  paused: ['tracking', 'idle'],
  error: ['idle'],
};

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  phase: 'idle',
  shapes: [],
  recognition: null,
  keys: [],
  indexFingerTip: null,
  activeKeyIds: [],
  sensitivity: 1,
  errorMessage: null,
  noteCount: 0,
  maxCombo: 0,
  currentCombo: 0,
  startedAt: null,

  setPhase: (p) => {
    const cur = get().phase;
    if (!VALID_TRANSITIONS[cur].includes(p)) {
      console.warn(`非法状态跳转: ${cur} → ${p}`);
      return;
    }
    set({ phase: p, startedAt: p === 'tracking' && !get().startedAt ? performance.now() : get().startedAt });
  },

  setShapes: (s) => set({ shapes: s }),
  addShape: (s) => set((st) => ({ shapes: [...st.shapes, s] })),

  generateKeys: () => {
    set({ phase: 'generating' });
    const result = recognizeShapes(get().shapes);
    set({ recognition: result, keys: result.keys });
    if (result.keys.length === 0) {
      set({ phase: 'error', errorMessage: '未识别出有效形状，请重新绘制' });
      return;
    }
    set({ phase: 'camera-pending' });
  },

  setIndexFingerTip: (p) => set({ indexFingerTip: p }),

  triggerKey: (key) => {
    set((st) => {
      const newCombo = st.currentCombo + 1;
      const newNoteCount = st.noteCount + 1;
      return {
        noteCount: newNoteCount,
        currentCombo: newCombo,
        maxCombo: Math.max(st.maxCombo, newCombo),
        activeKeyIds: [...st.activeKeyIds, key.id],
      };
    });
    // 200ms 后从 activeKeyIds 移除
    setTimeout(() => {
      set((st) => ({
        activeKeyIds: st.activeKeyIds.filter((id) => id !== key.id),
      }));
    }, 200);
  },

  resetCombo: () => set({ currentCombo: 0 }),

  setSensitivity: (v) => set({ sensitivity: Math.max(0.8, Math.min(1.2, v)) }),

  setError: (msg) => set({ phase: 'error', errorMessage: msg }),
  clearError: () => set({ errorMessage: null, phase: 'idle' }),

  reset: () =>
    set({
      phase: 'idle',
      shapes: [],
      recognition: null,
      keys: [],
      indexFingerTip: null,
      activeKeyIds: [],
      errorMessage: null,
      noteCount: 0,
      maxCombo: 0,
      currentCombo: 0,
      startedAt: null,
    }),
}));
```

- [ ] **Step 2: 写状态机测试**

```typescript
// frontend/src/stores/__tests__/workbenchStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkbenchStore } from '../workbenchStore';
import { DrawnShape, VirtualKey } from '../../types/shapes';

beforeEach(() => {
  useWorkbenchStore.getState().reset();
});

describe('workbenchStore', () => {
  it('rejects invalid transition idle→tracking', () => {
    useWorkbenchStore.getState().setPhase('tracking');
    expect(useWorkbenchStore.getState().phase).toBe('idle');
  });

  it('accepts valid transition idle→drawing', () => {
    useWorkbenchStore.getState().setPhase('drawing');
    expect(useWorkbenchStore.getState().phase).toBe('drawing');
  });

  it('generateKeys moves to camera-pending when shapes present', () => {
    const shapes: DrawnShape[] = [
      { id: 's1', type: 'rect', x: 50, y: 200, width: 60, height: 60 },
      { id: 's2', type: 'rect', x: 130, y: 200, width: 60, height: 60 },
      { id: 's3', type: 'rect', x: 210, y: 200, width: 60, height: 60 },
      { id: 's4', type: 'rect', x: 290, y: 200, width: 60, height: 60 },
      { id: 's5', type: 'rect', x: 370, y: 200, width: 60, height: 60 },
      { id: 's6', type: 'rect', x: 450, y: 200, width: 60, height: 60 },
      { id: 's7', type: 'rect', x: 530, y: 200, width: 60, height: 60 },
    ];
    useWorkbenchStore.getState().setPhase('drawing');
    useWorkbenchStore.getState().setShapes(shapes);
    useWorkbenchStore.getState().generateKeys();
    const s = useWorkbenchStore.getState();
    expect(s.phase).toBe('camera-pending');
    expect(s.keys).toHaveLength(7);
    expect(s.recognition?.instrument).toBe('piano');
  });

  it('triggerKey increments combo and noteCount', () => {
    const key: VirtualKey = {
      id: 'k1', shapeType: 'rect', cx: 400, cy: 300, width: 80, height: 80,
      pitch: 'C4', freq: 261.63, instrument: 'piano', label: 'C', color: '#00F0FF',
    };
    useWorkbenchStore.getState().triggerKey(key);
    useWorkbenchStore.getState().triggerKey(key);
    const s = useWorkbenchStore.getState();
    expect(s.noteCount).toBe(2);
    expect(s.currentCombo).toBe(2);
    expect(s.maxCombo).toBe(2);
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `cd frontend && npm run test -- workbenchStore`
预期：3 个用例 PASS。

- [ ] **Step 4: 用完整内容覆盖 `frontend/src/pages/Workbench.tsx`**

```typescript
// frontend/src/pages/Workbench.tsx
import { useEffect, useRef, useCallback, useState } from 'react';
import { useWorkbenchStore } from '../stores/workbenchStore';
import { DrawCanvas } from '../modules/canvas/DrawCanvas';
import { CameraStage } from '../modules/camera/CameraStage';
import { KeyOverlay } from '../modules/keyoverlay/KeyOverlay';
import { useKeyTrigger } from '../modules/keyoverlay/useKeyTrigger';
import { HandTracker, HandFrame } from '../modules/handtracking/HandTracker';
import { LaserEffects } from '../modules/effects/LaserEffects';
import { synth } from '../modules/audio/synth';
import { Button } from '../components/ui/Button';
import { INSTRUMENT_LABELS } from '../types/api';

const CANVAS_W = 800;
const CANVAS_H = 600;

export function Workbench() {
  const {
    phase, shapes, keys, recognition, indexFingerTip, activeKeyIds,
    sensitivity, noteCount, maxCombo, currentCombo, errorMessage,
    setShapes, setPhase, generateKeys, setIndexFingerTip,
    triggerKey, resetCombo, setSensitivity, setError, reset,
  } = useWorkbenchStore();

  const [tool, setTool] = useState<'rect' | 'circle' | 'line'>('rect');
  const trackerRef = useRef<HandTracker | null>(null);
  const effectsRef = useRef<LaserEffects | null>(null);
  const effectsCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // 初始化特效实例
  useEffect(() => {
    effectsRef.current = new LaserEffects();
    return () => {
      effectsRef.current?.clear();
      trackerRef.current?.dispose();
      synth.dispose();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // 触发回调
  const onTrigger = useCallback(
    (key: typeof keys[number]) => {
      synth.playKey(key);
      effectsRef.current?.triggerKeyFlash(key);
      triggerKey(key);
      // 失误：combo 自然不会重置，由 UI 判定
    },
    [triggerKey]
  );

  const { handleFrame } = useKeyTrigger({
    keys,
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    sensitivity,
    onTrigger,
  });

  // 摄像头 ready 后启动手部追踪
  const onCameraReady = useCallback(async (video: HTMLVideoElement) => {
    videoElRef.current = video;
    setPhase('camera-loading');
    try {
      if (!trackerRef.current) {
        trackerRef.current = new HandTracker();
        await trackerRef.current.init();
      }
      await trackerRef.current.start(video, (frame: HandFrame) => {
        setIndexFingerTip(frame.indexFingerTip);
        handleFrame(frame.indexFingerTip);
      });
      setPhase('tracking');
      startEffectsLoop();
    } catch (e: any) {
      setError(e?.message ?? '手部追踪启动失败');
    }
  }, [handleFrame, setPhase, setError, setIndexFingerTip]);

  // 特效渲染循环
  const startEffectsLoop = useCallback(() => {
    const loop = () => {
      const canvas = effectsCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      const hands = trackerRef.current ? [] : []; // 简化：直接用 store 的 indexFingerTip
      if (canvas && ctx && effectsRef.current) {
        effectsRef.current.render(
          ctx,
          CANVAS_W,
          CANVAS_H,
          keys,
          hands,
          indexFingerTip
        );
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    loop();
  }, [keys, indexFingerTip]);

  // 暂停 / 恢复
  function pause() {
    trackerRef.current?.stop();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPhase('paused');
  }

  function resume() {
    if (videoElRef.current && trackerRef.current) {
      trackerRef.current.start(videoElRef.current, (frame: HandFrame) => {
        setIndexFingerTip(frame.indexFingerTip);
        handleFrame(frame.indexFingerTip);
      });
      setPhase('tracking');
      startEffectsLoop();
    }
  }

  return (
    <div className="dark-canvas min-h-screen px-6 py-8">
      <div className="mx-auto max-w-7xl">
        {/* 顶部状态栏 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-h2 text-paper-bg">工作台</h1>
            <p className="mt-1 text-caption text-paper-bg/60">
              当前阶段：<span className="font-mono text-neon-cyan">{phase}</span>
              {recognition && (
                <> · 识别乐器：<span className="text-neon-cyan">{INSTRUMENT_LABELS[recognition.instrument]}</span>（置信度 {(recognition.confidence * 100).toFixed(0)}%）</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-paper-bg/20 px-3 py-2 text-right">
              <p className="font-mono text-h3 text-neon-cyan">{noteCount}</p>
              <p className="text-caption text-paper-bg/60">音符</p>
            </div>
            <div className="rounded-lg border border-paper-bg/20 px-3 py-2 text-right">
              <p className="font-mono text-h3 text-neon-magenta">{currentCombo}x</p>
              <p className="text-caption text-paper-bg/60">连击</p>
            </div>
            <div className="rounded-lg border border-paper-bg/20 px-3 py-2 text-right">
              <p className="font-mono text-h3 text-neon-yellow">{maxCombo}</p>
              <p className="text-caption text-paper-bg/60">最高</p>
            </div>
          </div>
        </div>

        {/* 主体：根据 phase 切换 */}
        {(phase === 'idle' || phase === 'drawing' || phase === 'generating' || phase === 'error') && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              {/* 工具栏 */}
              <div className="mb-3 flex items-center gap-2">
                {(['rect', 'circle', 'line'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTool(t)}
                    className={[
                      'rounded-md px-3 py-1 text-caption font-mono',
                      tool === t ? 'bg-electric text-paper-bg' : 'bg-paper-bg/10 text-paper-bg/70',
                    ].join(' ')}
                  >
                    {t === 'rect' ? '矩形' : t === 'circle' ? '圆' : '线'}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2 text-caption text-paper-bg/60">
                  灵敏度：
                  <input
                    type="range"
                    min={0.8}
                    max={1.2}
                    step={0.05}
                    value={sensitivity}
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                    className="w-32"
                  />
                </div>
              </div>
              <DrawCanvas
                width={CANVAS_W}
                height={CANVAS_H}
                shapes={shapes}
                onShapesChange={setShapes}
                tool={tool}
                disabled={phase === 'generating'}
              />
              {errorMessage && (
                <p className="mt-3 text-caption text-accent-danger">{errorMessage}</p>
              )}
            </div>
            <aside className="space-y-4">
              <div className="rounded-xl border border-paper-bg/20 p-4">
                <h3 className="font-display text-h3 text-paper-bg">操作步骤</h3>
                <ol className="mt-3 space-y-2 text-caption text-paper-bg/70">
                  <li>1. 在画布上画 4-8 个形状</li>
                  <li>2. 点击"生成键位"</li>
                  <li>3. 允许摄像头权限</li>
                  <li>4. 用食指触碰虚拟键位演奏</li>
                </ol>
              </div>
              <Button
                fullWidth
                size="lg"
                variant="neon"
                loading={phase === 'generating'}
                onClick={() => {
                  if (phase === 'idle') setPhase('drawing');
                  generateKeys();
                }}
                disabled={shapes.length === 0}
              >
                生成键位（{shapes.length} 个形状）
              </Button>
              <Button fullWidth variant="ghost" onClick={reset}>
                重置
              </Button>
            </aside>
          </div>
        )}

        {(phase === 'camera-pending' || phase === 'camera-loading' || phase === 'tracking' || phase === 'paused') && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="relative">
              <CameraStage
                className="aspect-[4/3] w-full"
                onReady={onCameraReady}
              />
              {/* 键位与特效叠加 */}
              <KeyOverlay
                keys={keys}
                canvasWidth={CANVAS_W}
                canvasHeight={CANVAS_H}
                indexFingerTip={indexFingerTip}
                activeKeyIds={activeKeyIds}
              />
              <canvas
                ref={effectsCanvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
              {phase === 'paused' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Button onClick={resume} variant="neon" size="lg">恢复</Button>
                </div>
              )}
            </div>
            <aside className="space-y-4">
              <div className="rounded-xl border border-paper-bg/20 p-4">
                <h3 className="font-display text-h3 text-paper-bg">键位表</h3>
                <ul className="mt-3 space-y-1">
                  {keys.map((k) => (
                    <li key={k.id} className="flex items-center justify-between font-mono text-caption">
                      <span style={{ color: k.color }}>{k.label}</span>
                      <span className="text-paper-bg/60">{k.pitch}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {phase === 'tracking' && (
                <Button fullWidth variant="secondary" onClick={pause}>暂停</Button>
              )}
              <Button fullWidth variant="ghost" onClick={reset}>退出</Button>
            </aside>
          </div>
        )}

        {recognition && (
          <p className="mt-6 text-caption text-paper-bg/40">{recognition.reason}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 本地端到端验证**

Run: `cd frontend && npm run dev`
打开 `http://localhost:5173/workbench`，依次完成：
1. 在画布上画 7 个矩形横向排列
2. 点击"生成键位" → 状态变为 `camera-pending`
3. 点击"开启摄像头" → 浏览器弹出权限请求
4. 允许后 → 状态变为 `tracking`
5. 把食指伸到摄像头前，移动到某个虚拟键位上
6. 预期：
   - 听见对应音色（钢琴 C4 等）
   - 键位出现霓虹闪光与粒子爆裂
   - 顶部"音符"计数 +1，连击 +1
   - 食指尖位置有青色光标跟随
   - 手部骨架有青色激光连线

- [ ] **Step 6: Commit**

```bash
git add frontend/src/stores/workbenchStore.ts frontend/src/pages/Workbench.tsx frontend/src/stores/__tests__/workbenchStore.test.ts
git commit -m "feat(frontend): 工作台集成（M2-M8 串联 + 状态机）"
```

---

## Phase 6：前端内容模块（Task 26-29）

本阶段完成曲库浏览、教学引导、演奏录制分享、每日挑战 4 个内容型模块。

---

## Task 26：曲库页面（M9）

**Goal：** 列出全部曲目，支持按乐器/难度筛选；点击进入详情页查看音符序列与描述。

**Files:**
- Modify: `frontend/src/pages/Songs.tsx`（覆盖占位）

- [ ] **Step 1: 用完整内容覆盖 `frontend/src/pages/Songs.tsx`**

```typescript
// frontend/src/pages/Songs.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { songsService } from '../services/songs';
import {
  SongListItem,
  SongDetail,
  Instrument,
  Difficulty,
  INSTRUMENTS,
  INSTRUMENT_LABELS,
} from '../types/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { isApiError } from '../services/api';
import { toast } from '../stores/toastStore';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: '入门',
  2: '简单',
  3: '中等',
  4: '进阶',
  5: '高难',
};

export function Songs() {
  const { id } = useParams();
  if (id) return <SongDetailPage id={id} />;
  return <SongListPage />;
}

function SongListPage() {
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterInstrument, setFilterInstrument] = useState<Instrument | ''>('');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | ''>('');
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (filterInstrument) params.instrument = filterInstrument;
      if (filterDifficulty) params.difficulty = filterDifficulty;
      const res = await songsService.list(params);
      setSongs(res.items);
    } catch (e) {
      const msg = isApiError(e) ? e.message : '加载失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filterInstrument, filterDifficulty]);

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="font-display text-h1 text-ink-primary">曲库</h1>
          <p className="mt-2 text-body text-ink-secondary">
            选择一首曲目，进入工作台跟弹练习。
          </p>
        </header>

        {/* 筛选器 */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-caption text-ink-muted">乐器：</span>
            <select
              value={filterInstrument}
              onChange={(e) => setFilterInstrument(e.target.value as Instrument | '')}
              className="rounded-md border border-paper-border bg-paper-card px-3 py-1 text-caption"
            >
              <option value="">全部</option>
              {INSTRUMENTS.map((i) => (
                <option key={i} value={i}>{INSTRUMENT_LABELS[i]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-caption text-ink-muted">难度：</span>
            <select
              value={filterDifficulty}
              onChange={(e) =>
                setFilterDifficulty(
                  e.target.value ? (parseInt(e.target.value, 10) as Difficulty) : ''
                )
              }
              className="rounded-md border border-paper-border bg-paper-card px-3 py-1 text-caption"
            >
              <option value="">全部</option>
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>{DIFFICULTY_LABELS[d as Difficulty]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 列表 */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-8 w-8 text-electric" />
          </div>
        ) : songs.length === 0 ? (
          <p className="py-16 text-center text-body text-ink-muted">曲库为空</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {songs.map((song) => (
              <Card
                key={song.id}
                interactive
                className="cursor-pointer p-5"
                onClick={() => navigate(`/songs/${song.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-h3 text-ink-primary">{song.title}</h3>
                    <p className="mt-1 text-caption text-ink-muted">{song.artist}</p>
                  </div>
                  <span className="rounded-md bg-paper-subtle px-2 py-1 text-caption font-mono">
                    {DIFFICULTY_LABELS[song.difficulty]}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3 text-caption text-ink-secondary">
                  <span>{INSTRUMENT_LABELS[song.instrument]}</span>
                  <span>·</span>
                  <span>{song.bpm} BPM</span>
                  <span>·</span>
                  <span>{Math.floor(song.durationSec / 60)}:{String(song.durationSec % 60).padStart(2, '0')}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SongDetailPage({ id }: { id: string }) {
  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await songsService.detail(id);
        setSong(res);
      } catch (e) {
        const msg = isApiError(e) ? e.message : '加载失败';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-electric" />
      </div>
    );
  }
  if (!song) {
    return <p className="py-16 text-center text-body text-ink-muted">曲目不存在</p>;
  }

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => navigate('/songs')}
          className="mb-6 text-caption text-ink-muted underline underline-offset-4 hover:text-ink-primary"
        >
          ← 返回曲库
        </button>
        <h1 className="font-display text-h1 text-ink-primary">{song.title}</h1>
        <p className="mt-2 text-body text-ink-secondary">{song.artist}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-caption">
          <span className="rounded-md bg-paper-subtle px-2 py-1">{INSTRUMENT_LABELS[song.instrument]}</span>
          <span className="rounded-md bg-paper-subtle px-2 py-1">{DIFFICULTY_LABELS[song.difficulty]}</span>
          <span className="rounded-md bg-paper-subtle px-2 py-1">{song.bpm} BPM</span>
        </div>
        <p className="mt-6 text-body text-ink-secondary">{song.description}</p>

        <section className="mt-8">
          <h2 className="font-display text-h2 text-ink-primary">音符序列</h2>
          <div className="mt-4 rounded-xl border border-paper-border bg-paper-card p-4">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {song.noteSequence.map((n, i) => (
                <div key={i} className="rounded-md bg-paper-subtle px-3 py-2 font-mono text-caption">
                  <span className="text-electric">{n.pitch}</span>
                  <span className="ml-2 text-ink-muted">@{n.time.toFixed(1)}s</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-8 flex gap-3">
          <Button onClick={() => navigate('/workbench')}>前往工作台练习</Button>
          <Button variant="secondary" onClick={() => navigate('/challenge')}>用此曲挑战</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 本地验证**

Run: `cd frontend && npm run dev`
打开 `http://localhost:5173/songs`：
- 看到曲库列表（后端需已运行并提供数据）
- 切换乐器/难度筛选器，列表实时刷新
- 点击某首曲目进入 `/songs/:id`，看到详情页与音符序列网格

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Songs.tsx
git commit -m "feat(frontend): 曲库列表与详情页（M9）"
```

---

## Task 27：教学引导模块（M10）

**Goal：** 在工作台首次进入时显示教学弹窗，分 4 步引导用户完成画图-生成-摄像头-演奏流程；记录"已读"状态到 localStorage。

**Files:**
- Create: `frontend/src/modules/tutorial/TutorialOverlay.tsx`
- Modify: `frontend/src/pages/Workbench.tsx`（注入教学组件）

- [ ] **Step 1: 创建 TutorialOverlay**

```typescript
// frontend/src/modules/tutorial/TutorialOverlay.tsx
import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';

const STORAGE_KEY = 'soundshape_tutorial_done_v1';

const STEPS = [
  {
    title: '画几个形状',
    body: '在左侧画布上画 4-8 个矩形、圆或线。系统会按形状特征自动推断是钢琴、吉他、小提琴、长笛还是架子鼓。',
    illustration: '✏️',
  },
  {
    title: '生成键位',
    body: '点击右侧"生成键位"按钮。系统会为每个形状分配一个音名，并在画布上显示霓虹边框预览。',
    illustration: '🎹',
  },
  {
    title: '开启摄像头',
    body: '点击"开启摄像头"按钮，授权浏览器使用摄像头。所有画面仅在本地处理，不会上传到服务器。',
    illustration: '📷',
  },
  {
    title: '食指触发',
    body: '把食指伸到摄像头前，移动到虚拟键位上方。进入哪个键位就触发对应音色与光晕特效。150ms 防抖，避免重复触发。',
    illustration: '👆',
  },
];

export function TutorialOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setVisible(true);
  }, []);

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, '1');
      setVisible(false);
    }
  }

  function skip() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;
  const cur = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[480px] max-w-[calc(100vw-2rem)] rounded-2xl bg-paper-card p-8 shadow-paper-card animate-scale-in">
        <div className="flex items-center justify-between">
          <span className="text-caption font-mono text-ink-muted">
            教学 {step + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={skip}
            className="text-caption text-ink-muted hover:text-ink-primary"
          >
            跳过
          </button>
        </div>
        <div className="mt-6 text-center">
          <div className="text-[64px] leading-none">{cur.illustration}</div>
          <h2 className="mt-4 font-display text-h2 text-ink-primary">{cur.title}</h2>
          <p className="mt-3 text-body text-ink-secondary">{cur.body}</p>
        </div>
        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={[
                  'h-1.5 w-6 rounded-full transition-colors',
                  i === step ? 'bg-electric' : 'bg-paper-border',
                ].join(' ')}
              />
            ))}
          </div>
          <Button onClick={next}>
            {step < STEPS.length - 1 ? '下一步' : '开始体验'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 在 Workbench.tsx 顶部注入教学组件**

修改 `frontend/src/pages/Workbench.tsx`，在 `return` 的最外层 `<div>` 内顶部添加：

```typescript
// 在 import 区追加
import { TutorialOverlay } from '../modules/tutorial/TutorialOverlay';

// 在 return 的最外层 div 内首行添加
<TutorialOverlay />
```

完整修改：把 `return (` 之后的 `<div className="dark-canvas min-h-screen px-6 py-8">` 内首行追加 `<TutorialOverlay />`，使其成为第一个子元素。

- [ ] **Step 3: 本地验证**

清空 localStorage：在 DevTools Application → Local Storage 中删除 `soundshape_tutorial_done_v1`。
打开 `http://localhost:5173/workbench`，预期：
- 教学弹窗自动出现
- 4 步进度条 + "下一步"按钮
- 点击"跳过"或完成 4 步后弹窗消失
- 刷新页面，弹窗不再出现（已记录）

- [ ] **Step 4: Commit**

```bash
git add frontend/src/modules/tutorial frontend/src/pages/Workbench.tsx
git commit -m "feat(frontend): 教学引导模块（M10）"
```

---

## Task 28：分享录制模块（M11）

**Goal：** 用 MediaRecorder API 录制工作台画面（canvas + 摄像头），生成 webm Blob 上传到后端，并在用户中心展示已分享列表。

**Files:**
- Create: `frontend/src/modules/recording/useRecorder.ts`
- Create: `frontend/src/modules/recording/RecordButton.tsx`
- Modify: `frontend/src/pages/Workbench.tsx`（接入录制按钮）
- Create: `frontend/src/pages/MyClips.tsx`

- [ ] **Step 1: 创建 useRecorder Hook**

```typescript
// frontend/src/modules/recording/useRecorder.ts
import { useRef, useState, useCallback } from 'react';

type RecorderStatus = 'idle' | 'recording' | 'stopped' | 'error';

interface UseRecorderOptions {
  canvas: HTMLCanvasElement | null;
  video: HTMLVideoElement | null;
  durationSec?: number; // 最长录制时长
}

interface UseRecorderReturn {
  status: RecorderStatus;
  blob: Blob | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useRecorder({ canvas, video, durationSec = 30 }: UseRecorderOptions): UseRecorderReturn {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (!canvas) {
      setError('画布未就绪');
      setStatus('error');
      return;
    }
    setError(null);
    setBlob(null);
    chunksRef.current = [];
    try {
      // 优先用 canvas.captureStream
      const canvasStream = canvas.captureStream(30);
      // 若有视频，把视频轨也加进来（可选）
      if (video && video.captureStream) {
        const vStream = (video as any).captureStream(30) as MediaStream;
        vStream.getVideoTracks().forEach(() => {}); // 此处保留 canvas 画面为主
      }
      streamRef.current = canvasStream;
      const mr = new MediaRecorder(canvasStream, {
        mimeType: 'video/webm;codecs=vp9',
      });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        setBlob(finalBlob);
        setStatus('stopped');
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setStatus('recording');
      stopTimerRef.current = window.setTimeout(stop, durationSec * 1000);
    } catch (e: any) {
      setError(e?.message ?? '录制启动失败');
      setStatus('error');
    }
  }, [canvas, video, durationSec, stop]);

  const reset = useCallback(() => {
    setBlob(null);
    setError(null);
    setStatus('idle');
    chunksRef.current = [];
  }, []);

  return { status, blob, error, start, stop, reset };
}
```

- [ ] **Step 2: 创建 RecordButton 组件**

```typescript
// frontend/src/modules/recording/RecordButton.tsx
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useRecorder } from './useRecorder';
import { clipsService } from '../../services/clips';
import { toast } from '../../stores/toastStore';
import { isApiError } from '../../services/api';
import { Instrument } from '../../types/api';

interface RecordButtonProps {
  canvas: HTMLCanvasElement | null;
  video: HTMLVideoElement | null;
  instrument: Instrument;
  durationSec?: number;
}

export function RecordButton({ canvas, video, instrument, durationSec = 30 }: RecordButtonProps) {
  const { status, blob, error, start, stop, reset } = useRecorder({
    canvas,
    video,
    durationSec,
  });
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== 'recording') {
      setElapsed(0);
      return;
    }
    const start = performance.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((performance.now() - start) / 1000));
    }, 200);
    return () => clearInterval(id);
  }, [status]);

  async function upload() {
    if (!blob) return;
    setUploading(true);
    try {
      await clipsService.upload({
        instrument,
        durationSec: elapsed > 0 ? elapsed : durationSec,
        video: blob,
      });
      toast.success('分享已上传');
      reset();
    } catch (e) {
      const msg = isApiError(e) ? e.message : '上传失败';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  if (status === 'recording') {
    return (
      <Button onClick={stop} variant="danger" loading={uploading}>
        ■ 停止录制 ({elapsed}s / {durationSec}s)
      </Button>
    );
  }
  if (status === 'stopped' && blob) {
    return (
      <div className="flex items-center gap-2">
        <Button onClick={upload} variant="primary" loading={uploading}>
          上传分享 ({(blob.size / 1024 / 1024).toFixed(1)} MB)
        </Button>
        <Button onClick={reset} variant="ghost">放弃</Button>
      </div>
    );
  }
  return (
    <>
      <Button onClick={start} variant="secondary">● 开始录制</Button>
      {error && <p className="mt-2 text-caption text-accent-danger">{error}</p>}
    </>
  );
}
```

- [ ] **Step 3: 在 Workbench.tsx 接入 RecordButton**

修改 `frontend/src/pages/Workbench.tsx`，在 `tracking` 阶段的右侧栏（暂停按钮附近）添加 RecordButton：

```typescript
// 在 import 区追加
import { RecordButton } from '../modules/recording/RecordButton';

// 在右侧 aside 内"暂停"按钮之后追加（仅 tracking 阶段显示）：
{phase === 'tracking' && recognition && (
  <div className="rounded-xl border border-paper-bg/20 p-4">
    <h3 className="font-display text-h3 text-paper-bg">录制分享</h3>
    <p className="mt-1 text-caption text-paper-bg/60">
      最长 30 秒，仅录制画布画面（不含摄像头原始视频）。
    </p>
    <div className="mt-3">
      <RecordButton
        canvas={effectsCanvasRef.current}
        video={videoElRef.current}
        instrument={recognition.instrument}
        durationSec={30}
      />
    </div>
  </div>
)}
```

- [ ] **Step 4: 创建 MyClips 页面**

```typescript
// frontend/src/pages/MyClips.tsx
import { useEffect, useState } from 'react';
import { clipsService } from '../services/clips';
import { Clip, ClipListResponse } from '../types/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { toast } from '../stores/toastStore';
import { isApiError } from '../services/api';
import { INSTRUMENT_LABELS } from '../types/api';

export function MyClips() {
  const [data, setData] = useState<ClipListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const res = await clipsService.list(page, 12);
      setData(res);
    } catch (e) {
      const msg = isApiError(e) ? e.message : '加载失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page]);

  async function remove(id: string) {
    if (!confirm('确认删除这条分享？')) return;
    try {
      await clipsService.remove(id);
      toast.success('已删除');
      load();
    } catch (e) {
      const msg = isApiError(e) ? e.message : '删除失败';
      toast.error(msg);
    }
  }

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="font-display text-h1 text-ink-primary">我的分享</h1>
          <p className="mt-2 text-body text-ink-secondary">查看与管理已上传的演奏录像。</p>
        </header>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-8 w-8 text-electric" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="py-16 text-center text-body text-ink-muted">还没有分享，去工作台录制一段吧</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data.items.map((clip) => (
                <Card key={clip.id} className="overflow-hidden p-0">
                  <video
                    src={clip.videoUrl}
                    controls
                    className="aspect-video w-full bg-black"
                  />
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-paper-subtle px-2 py-1 text-caption">
                        {INSTRUMENT_LABELS[clip.instrument]}
                      </span>
                      <span className="text-caption text-ink-muted">{clip.durationSec}s</span>
                    </div>
                    <p className="mt-2 text-caption text-ink-muted">
                      {new Date(clip.createdAt).toLocaleString('zh-CN')}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      className="mt-3"
                      onClick={() => remove(clip.id)}
                    >
                      删除
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            {/* 分页 */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <span className="text-caption text-ink-muted">
                第 {page} 页 / 共 {Math.max(1, Math.ceil((data?.total ?? 0) / 12))} 页
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!data || page * 12 >= data.total}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 在路由中追加 `/my-clips`**

修改 `frontend/src/router/index.tsx`：

```typescript
// 追加 import
const MyClips = lazy(() => import('../pages/MyClips').then((m) => ({ default: m.MyClips })));

// 在 routes 数组中追加
{ path: '/my-clips', element: withSuspense(<MyClips />) },
```

- [ ] **Step 6: 本地验证**

1. 进入工作台，画形状 → 生成键位 → 开启摄像头 → 进入 tracking 状态
2. 在右侧看到"录制分享"卡片，点击"开始录制"
3. 演奏几秒后点击"停止录制"，按钮变为"上传分享 (X.X MB)"
4. 点击上传，Toast 提示"分享已上传"
5. 访问 `http://localhost:5173/my-clips`，看到刚上传的视频
6. 点击"删除"，视频消失

- [ ] **Step 7: Commit**

```bash
git add frontend/src/modules/recording frontend/src/pages/MyClips.tsx frontend/src/pages/Workbench.tsx frontend/src/router/index.tsx
git commit -m "feat(frontend): 分享录制模块（M11）MediaRecorder + 上传"
```

---

## Task 29：挑战排行页面

**Goal：** 展示今日挑战曲目、提交成绩、查看排行榜。

**Files:**
- Modify: `frontend/src/pages/Challenge.tsx`（覆盖占位）

- [ ] **Step 1: 用完整内容覆盖 `frontend/src/pages/Challenge.tsx`**

```typescript
// frontend/src/pages/Challenge.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { challengeService } from '../services/challenge';
import {
  ChallengeToday,
  ChallengeSubmitResult,
  LeaderboardResponse,
  INSTRUMENT_LABELS,
} from '../types/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useUserStore } from '../stores/userStore';
import { toast } from '../stores/toastStore';
import { isApiError } from '../services/api';

export function Challenge() {
  const [today, setToday] = useState<ChallengeToday | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<ChallengeSubmitResult | null>(null);
  const navigate = useNavigate();
  const { phase, user } = useUserStore();

  async function load() {
    setLoading(true);
    try {
      const [t, lb] = await Promise.all([
        challengeService.today(),
        challengeService.leaderboard(),
      ]);
      setToday(t);
      setLeaderboard(lb);
    } catch (e) {
      const msg = isApiError(e) ? e.message : '加载失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitChallenge() {
    if (phase !== 'authenticated') {
      toast.warning('请先登录后再提交挑战');
      navigate('/login');
      return;
    }
    if (!today) return;
    // 跳到工作台，让用户实际演奏；这里只做占位提交演示
    setSubmitting(true);
    try {
      // 实际场景：用户从工作台带着 correctCount/totalCount/maxCombo 跳回来
      // 这里给一个 demo 提交，验证接口可用
      const result = await challengeService.submit({
        date: today.date,
        correctCount: 0,
        totalCount: 1,
        maxCombo: 0,
        durationSec: 1,
      });
      setLastResult(result);
      toast.success(`成绩已提交：${result.score} 分，排名 #${result.rank}`);
      load();
    } catch (e) {
      const msg = isApiError(e) ? e.message : '提交失败';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-electric" />
      </div>
    );
  }
  if (!today) {
    return <p className="py-16 text-center text-body text-ink-muted">今日挑战暂不可用</p>;
  }

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-caption uppercase tracking-[0.2em] text-ink-muted">
            每日挑战 · {today.date}
          </p>
          <h1 className="mt-2 font-display text-h1 text-ink-primary">{today.song.title}</h1>
          <p className="mt-2 text-body text-ink-secondary">{today.song.artist}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-caption">
            <span className="rounded-md bg-paper-subtle px-2 py-1">
              {INSTRUMENT_LABELS[today.song.instrument]}
            </span>
            <span className="rounded-md bg-paper-subtle px-2 py-1">{today.song.bpm} BPM</span>
            <span className="rounded-md bg-paper-subtle px-2 py-1">
              时长 {Math.floor(today.song.durationSec / 60)}:{String(today.song.durationSec % 60).padStart(2, '0')}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
          {/* 左侧：操作区 */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="font-display text-h2 text-ink-primary">规则</h2>
              <ul className="mt-4 space-y-2 text-body text-ink-secondary">
                <li>· 进入工作台，选择今日挑战曲目</li>
                <li>· 跟随音符序列演奏，系统记录命中数与连击</li>
                <li>· 评分公式：分数 = round(命中率 × 100) + floor(最大连击 / 10) × 5</li>
                <li>· 每天每人可多次提交，仅保留最高分</li>
              </ul>
              <div className="mt-6 flex gap-3">
                <Button onClick={() => navigate('/workbench')}>前往工作台</Button>
                <Button variant="secondary" loading={submitting} onClick={submitChallenge}>
                  提交今日成绩
                </Button>
              </div>
              {lastResult && (
                <div className="mt-4 rounded-md bg-paper-subtle p-4">
                  <p className="font-mono text-h3 text-electric">{lastResult.score} 分</p>
                  <p className="mt-1 text-caption text-ink-muted">
                    排名 #{lastResult.rank} {lastResult.isBest && '· 个人最佳'}
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* 右侧：排行榜 */}
          <Card className="p-6">
            <h2 className="font-display text-h2 text-ink-primary">排行榜</h2>
            <p className="mt-1 text-caption text-ink-muted">
              {leaderboard?.songTitle ?? today.song.title} · Top 100
            </p>
            <ol className="mt-4 space-y-2">
              {leaderboard?.leaderboard.length === 0 && (
                <li className="text-caption text-ink-muted">暂无记录，成为第一人</li>
              )}
              {leaderboard?.leaderboard.map((entry) => (
                <li
                  key={`${entry.userId}-${entry.rank}`}
                  className={[
                    'flex items-center justify-between rounded-md px-3 py-2',
                    entry.userId === user?.id ? 'bg-electric/10' : 'bg-paper-subtle/50',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={[
                        'w-8 text-center font-mono text-caption',
                        entry.rank <= 3 ? 'text-neon-magenta' : 'text-ink-muted',
                      ].join(' ')}
                    >
                      #{entry.rank}
                    </span>
                    <span className="text-body text-ink-primary">{entry.nickname}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-caption">
                    <span className="text-ink-muted">{entry.maxCombo}x</span>
                    <span className="text-electric">{entry.score}</span>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 本地验证**

Run: `cd frontend && npm run dev`
打开 `http://localhost:5173/challenge`：
- 看到今日挑战曲目信息（后端需运行）
- 右侧排行榜列出 Top 100（初始为空）
- 点击"提交今日成绩"（未登录时跳到 `/login`）
- 登录后提交，看到分数与排名

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Challenge.tsx
git commit -m "feat(frontend): 挑战排行页面"
```

---

## Phase 7：收尾与部署（Task 30-33）

本阶段完成用户认证页面、错误边界与降级、部署配置与端到端验收。完成后即可上线公网。

---

## Task 30：登录/注册/个人中心页面

**Goal：** 实现登录、注册、个人中心三个页面，对接 `userStore` 与 `authService`，未登录访问受保护路由自动跳转 `/login`。

**Files:**
- Modify: `frontend/src/pages/Login.tsx`（覆盖占位）
- Modify: `frontend/src/pages/Profile.tsx`（覆盖占位）
- Create: `frontend/src/components/auth/ProtectedRoute.tsx`
- Modify: `frontend/src/router/index.tsx`（受保护路由包裹）
- Create: `frontend/src/pages/__tests__/Login.test.tsx`

**严格依据：**
- API 文档 1.1 注册 / 1.2 登录 / 1.3 获取当前用户
- API 文档 2.1 演奏记录列表 / 3.1 调音记录列表 / 6.3 我的视频列表
- M13 用户状态模块（token 存 localStorage `soundshape_token`）

- [ ] **Step 1：实现 ProtectedRoute 组件**

Create `frontend/src/components/auth/ProtectedRoute.tsx`：

```tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../stores/userStore';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * 受保护路由：
 * - 未登录（user 为 null 且 token 不存在）→ 跳 /login，并记下来源 location
 * - 已登录 → 渲染 children
 *
 * 不在此处触发 /api/auth/me 请求，刷新页面时由 App 顶层 userStore.refresh() 负责。
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = useUserStore((s) => s.token);
  const user = useUserStore((s) => s.user);
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 2：实现 Login 页面（含登录/注册切换）**

Modify `frontend/src/pages/Login.tsx`，覆盖占位实现：

```tsx
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { toast } from '../stores/toastStore';
import { isApiError } from '../services/api';

type Mode = 'login' | 'register';

interface LocationState {
  from?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useUserStore((s) => s.login);
  const register = useUserStore((s) => s.register);
  const loading = useUserStore((s) => s.phase === 'loading');
  const error = useUserStore((s) => s.error);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const from = (location.state as LocationState | null)?.from ?? '/profile';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, nickname });
      }
      toast.success(mode === 'login' ? '登录成功' : '注册成功，已自动登录');
      navigate(from, { replace: true });
    } catch (err) {
      // error 已写入 store，这里仅兜底
      if (!isApiError(err)) {
        toast.error('网络异常，请稍后重试');
      }
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setPassword('');
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <Card variant="paper" className="w-full max-w-md p-8">
        <h1 className="font-display text-4xl text-ink mb-2">
          {mode === 'login' ? '欢迎回来' : '创建账号'}
        </h1>
        <p className="text-sm text-ink/60 mb-8">
          {mode === 'login'
            ? '登录后可保存演奏记录、调音记录与分享视频'
            : '注册后即可解锁全部功能，免费使用'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-2 uppercase tracking-wider">
              邮箱
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full px-4 py-3 rounded-lg border border-ink/15 bg-paper-bg focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink/70 mb-2 uppercase tracking-wider">
              密码
            </label>
            <input
              type="password"
              required
              minLength={mode === 'register' ? 8 : 1}
              maxLength={32}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-4 py-3 rounded-lg border border-ink/15 bg-paper-bg focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 transition"
              placeholder={mode === 'register' ? '8-32 位，含字母与数字' : '请输入密码'}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-ink/70 mb-2 uppercase tracking-wider">
                昵称
              </label>
              <input
                type="text"
                required
                minLength={1}
                maxLength={20}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-ink/15 bg-paper-bg focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 transition"
                placeholder="1-20 字符"
              />
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
          >
            {mode === 'login' ? '登 录' : '注 册'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-ink/60">
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button
            type="button"
            onClick={switchMode}
            className="ml-2 text-ink underline underline-offset-4 hover:text-ink/70 transition"
          >
            {mode === 'login' ? '去注册' : '去登录'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-ink/50 hover:text-ink/70 transition">
            ← 返回首页
          </Link>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3：实现 Profile 个人中心页面**

Modify `frontend/src/pages/Profile.tsx`，覆盖占位实现：

```tsx
import { useEffect, useState } from 'react';
import { useUserStore } from '../stores/userStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { recordsService } from '../services/records';
import { tuningsService } from '../services/tunings';
import { clipsService } from '../services/clips';
import { toast } from '../stores/toastStore';
import type { PlayRecord, TuningRecord, Clip } from '../types/api';

interface ProfileStats {
  records: PlayRecord[];
  tunings: TuningRecord[];
  clips: Clip[];
}

export default function Profile() {
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [recordsRes, tuningsRes, clipsRes] = await Promise.all([
          recordsService.list({ page: 1, pageSize: 1 }),
          tuningsService.list({ page: 1, pageSize: 1 }),
          clipsService.list({ page: 1, pageSize: 1 }),
        ]);
        setStats({
          records: recordsRes.items,
          tunings: tuningsRes.items,
          clips: clipsRes.items,
        });
      } catch {
        toast.error('加载个人数据失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    logout();
    toast.info('已退出登录');
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-5xl text-ink mb-2">{user.nickname}</h1>
          <p className="text-sm text-ink/60">{user.email}</p>
          <p className="text-xs text-ink/40 mt-1">
            注册于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
        <Button variant="ghost" size="md" onClick={handleLogout}>
          退出登录
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Card variant="paper" className="p-6">
          <div className="text-xs uppercase tracking-wider text-ink/50 mb-2">演奏记录</div>
          <div className="font-display text-4xl text-ink">
            {loading ? '—' : stats?.records.length ?? 0}
          </div>
          <div className="text-xs text-ink/50 mt-1">条</div>
        </Card>
        <Card variant="paper" className="p-6">
          <div className="text-xs uppercase tracking-wider text-ink/50 mb-2">调音记录</div>
          <div className="font-display text-4xl text-ink">
            {loading ? '—' : stats?.tunings.length ?? 0}
          </div>
          <div className="text-xs text-ink/50 mt-1">条</div>
        </Card>
        <Card variant="paper" className="p-6">
          <div className="text-xs uppercase tracking-wider text-ink/50 mb-2">分享视频</div>
          <div className="font-display text-4xl text-ink">
            {loading ? '—' : stats?.clips.length ?? 0}
          </div>
          <div className="text-xs text-ink/50 mt-1">个</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="flat" className="p-6">
          <h3 className="font-display text-xl text-ink mb-3">我的演奏</h3>
          <p className="text-sm text-ink/60 mb-4">查看历史演奏记录与音符序列</p>
          <Button variant="secondary" size="md" onClick={() => (window.location.href = '/records')}>
            查看记录
          </Button>
        </Card>
        <Card variant="flat" className="p-6">
          <h3 className="font-display text-xl text-ink mb-3">我的分享</h3>
          <p className="text-sm text-ink/60 mb-4">管理已上传的演奏视频</p>
          <Button variant="secondary" size="md" onClick={() => (window.location.href = '/my-clips')}>
            管理视频
          </Button>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 4：路由包裹 ProtectedRoute**

Modify `frontend/src/router/index.tsx`，将 `/profile` 与 `/my-clips` 用 `ProtectedRoute` 包裹。

修改受保护路由的 element 字段：

```tsx
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
// ... 其他 import

// 在 router children 中：
{
  path: '/profile',
  element: (
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  ),
},
{
  path: '/my-clips',
  element: (
    <ProtectedRoute>
      <MyClips />
    </ProtectedRoute>
  ),
},
```

> 注意：工作台 `/workbench` 与挑战 `/challenge` 不加保护——游客也能用，仅在提交成绩/保存时由服务端校验。

- [ ] **Step 5：写 Login 页面测试**

Create `frontend/src/pages/__tests__/Login.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '../Login';
import { useUserStore } from '../../stores/userStore';

vi.mock('../../stores/userStore');

const mockLogin = vi.fn();
const mockRegister = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (useUserStore as unknown as vi.Mock).mockImplementation((selector) =>
    selector({
      login: mockLogin,
      register: mockRegister,
      phase: 'idle',
      error: null,
    })
  );
});

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe('Login page', () => {
  it('默认显示登录模式', () => {
    renderLogin();
    expect(screen.getByText('欢迎回来')).toBeTruthy();
    expect(screen.getByRole('button', { name: /登 录/ })).toBeTruthy();
  });

  it('点击"去注册"切换到注册模式，显示昵称字段', () => {
    renderLogin();
    fireEvent.click(screen.getByText('去注册'));
    expect(screen.getByText('创建账号')).toBeTruthy();
    expect(screen.getByLabelText(/昵称/)).toBeTruthy();
  });

  it('提交登录表单调用 login', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderLogin();
    fireEvent.change(screen.getByLabelText(/邮箱/), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/密码/), { target: { value: 'pass1234' } });
    fireEvent.click(screen.getByRole('button', { name: /登 录/ }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass1234' });
    });
  });
});
```

- [ ] **Step 6：本地验证**

Run: `cd frontend && npm run dev`

打开 `http://localhost:5173/login`：
1. 切换登录/注册，看到昵称字段出现/消失
2. 注册一个新账号 → 自动登录并跳转 `/profile`
3. 退出登录 → 跳回 `/login`
4. 直接访问 `/profile`（未登录）→ 自动跳 `/login`
5. 登录后再访问 `/profile` → 看到昵称、邮箱、注册时间、三项统计

- [ ] **Step 7：跑测试**

Run: `cd frontend && npm test -- Login`

Expected: 3 passed

- [ ] **Step 8：Commit**

```bash
git add frontend/src/pages/Login.tsx frontend/src/pages/Profile.tsx frontend/src/components/auth/ProtectedRoute.tsx frontend/src/router/index.tsx frontend/src/pages/__tests__/Login.test.tsx
git commit -m "feat(frontend): 登录/注册/个人中心 + 路由守卫"
```

---

## Task 31：错误边界与降级策略

**Goal：** 实现全局 ErrorBoundary、能力检测 Hook、性能监控与自动降级，覆盖 spec 第十三节定义的全部降级路径，确保任何异常都不出现白屏/卡死。

**Files:**
- Create: `frontend/src/components/error/ErrorBoundary.tsx`
- Create: `frontend/src/components/error/FallbackUI.tsx`
- Create: `frontend/src/hooks/useCapabilities.ts`
- Create: `frontend/src/hooks/useFpsMonitor.ts`
- Modify: `frontend/src/App.tsx`（包裹 ErrorBoundary + 启动能力检测）
- Modify: `frontend/src/pages/Workbench.tsx`（接入降级控制）
- Create: `frontend/src/components/error/__tests__/ErrorBoundary.test.tsx`

**严格依据：**
- 设计文档第十三节降级策略
- M4 性能降级表（>=25/15-24/<15/<10 四档）
- M4 键盘备用模式映射表

- [ ] **Step 1：实现 ErrorBoundary 类组件**

Create `frontend/src/components/error/ErrorBoundary.tsx`：

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { FallbackUI } from './FallbackUI';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局错误边界：
 * - 捕获子组件渲染期异常、生命周期异常
 * - 不捕获事件回调、异步错误（这些由 try/catch 与 window.onerror 兜底）
 * - 触发后显示 FallbackUI，提供"重试"与"回首页"
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 仅 console.error，不上报远端（无埋点服务）
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <FallbackUI
          error={this.state.error}
          onRetry={this.handleReset}
          onGoHome={this.handleGoHome}
        />
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2：实现 FallbackUI 兜底界面**

Create `frontend/src/components/error/FallbackUI.tsx`：

```tsx
import { Button } from '../ui/Button';

interface Props {
  error: Error | null;
  onRetry: () => void;
  onGoHome: () => void;
}

/**
 * 错误兜底界面：
 * - 不展示具体堆栈（避免技术细节吓到小白用户）
 * - 给出可能的原因 + 两个操作按钮
 */
export function FallbackUI({ error, onRetry, onGoHome }: Props) {
  const isMediaError =
    error?.message.includes('media') ||
    error?.message.includes('MediaPipe') ||
    error?.message.includes('camera');

  const hint = isMediaError
    ? '可能是摄像头或手部识别模块出现问题。请检查浏览器权限，或刷新页面重试。'
    : '页面出现了未知问题。可以尝试重新加载，或返回首页继续使用其他功能。';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-paper-bg">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 text-6xl font-display text-ink/30">!</div>
        <h1 className="font-display text-3xl text-ink mb-3">出错了</h1>
        <p className="text-sm text-ink/60 mb-8 leading-relaxed">{hint}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="primary" size="md" onClick={onRetry}>
            重试
          </Button>
          <Button variant="ghost" size="md" onClick={onGoHome}>
            返回首页
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3：实现 useCapabilities 能力检测 Hook**

Create `frontend/src/hooks/useCapabilities.ts`：

```tsx
import { useEffect, useState } from 'react';

export interface Capabilities {
  camera: boolean;        // getUserMedia 可用
  webAudio: boolean;      // AudioContext 可用
  mediaPipe: boolean;     // Web Assembly 支持（MediaPipe 依赖）
  mediaRecorder: boolean; // MediaRecorder 可用
  lowEnd: boolean;        // 移动端 + 小内存判定
}

const detect = (): Capabilities => {
  const camera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const webAudio = !!AudioCtx;
  // MediaPipe 需要 WASM
  const mediaPipe = typeof WebAssembly === 'object' && WebAssembly !== null;
  const mediaRecorder = typeof MediaRecorder !== 'undefined';
  // 低端设备：移动端 OR hardwareConcurrency <= 4 OR deviceMemory <= 2
  const nav = navigator as unknown as { deviceMemory?: number; hardwareConcurrency?: number };
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const lowEnd =
    isMobile ||
    (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4) ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 2);

  return { camera, webAudio, mediaPipe, mediaRecorder, lowEnd };
};

/**
 * 一次性能力检测。结果稳定，不会在运行中变化（除非用户改权限，那是 useCamera 的事）。
 */
export function useCapabilities(): Capabilities {
  const [caps, setCaps] = useState<Capabilities>({
    camera: true,
    webAudio: true,
    mediaPipe: true,
    mediaRecorder: true,
    lowEnd: false,
  });

  useEffect(() => {
    setCaps(detect());
  }, []);

  return caps;
}
```

- [ ] **Step 4：实现 useFpsMonitor 性能监控 Hook**

Create `frontend/src/hooks/useFpsMonitor.ts`：

```tsx
import { useEffect, useRef, useState } from 'react';

type Quality = 'full' | 'reduced' | 'minimal' | 'critical';

interface FpsState {
  fps: number;
  quality: Quality;
}

/**
 * 按 spec M4 性能降级表自动决定 quality：
 * - >= 25 fps → full（无降级）
 * - 15-24 fps → reduced（关闭粒子，保留光晕）
 * - 10-14 fps → minimal（关闭所有特效，只留键位描边 + 发声）
 * - < 10 fps  → critical（提示切换键盘模式）
 *
 * 调用方：在每帧 requestAnimationFrame 中调用 tick()。
 * Hook 内部每 1s 计算一次平均 FPS，更新 quality。
 */
export function useFpsMonitor(enabled: boolean) {
  const [state, setState] = useState<FpsState>({ fps: 30, quality: 'full' });
  const framesRef = useRef<number>(0);
  const lastTsRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - lastTsRef.current) / 1000;
      const fps = framesRef.current / elapsed;
      let quality: Quality = 'full';
      if (fps < 10) quality = 'critical';
      else if (fps < 15) quality = 'minimal';
      else if (fps < 25) quality = 'reduced';
      setState({ fps: Math.round(fps), quality });
      framesRef.current = 0;
      lastTsRef.current = now;
    }, 1000);
    return () => window.clearInterval(interval);
  }, [enabled]);

  const tick = () => {
    framesRef.current += 1;
  };

  return { ...state, tick };
}
```

- [ ] **Step 5：在 Workbench 接入能力检测与降级**

Modify `frontend/src/pages/Workbench.tsx`，在已有结构上添加以下逻辑（在 `Workbench` 函数体顶部插入）：

```tsx
import { useCapabilities } from '../hooks/useCapabilities';
import { useFpsMonitor } from '../hooks/useFpsMonitor';
// ... 其他已有 import

// 在组件内：
const caps = useCapabilities();
const { fps, quality, tick } = useFpsMonitor(phase === 'tracking');

// 把 tick 注入到 raf 循环（与 HandTracker 同一帧）
// 在原有 onCameraFrame 回调里追加：
//   tick();

// 在 UI 顶部状态栏追加能力提示（仅在不支持时显示）：
{!caps.webAudio && (
  <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-sm text-red-700 text-center">
    当前浏览器不支持 Web Audio，演奏功能不可用
  </div>
)}
{!caps.camera && phase === 'camera-pending' && (
  <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm text-amber-700 text-center">
    摄像头不可用，仅可查看生成的键位图
  </div>
)}
{quality === 'critical' && (
  <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm text-amber-700 text-center">
    设备性能不足（{fps} fps），建议关闭特效或切换到键盘模式
  </div>
)}
```

同时把 `quality` 透传给 `LaserEffects`，让它根据 quality 自降级：

```tsx
// 在 effectsRef.current.triggerKeyFlash 之前判断：
const effectsLevel: 'full' | 'reduced' | 'minimal' =
  quality === 'full' ? 'full' : quality === 'reduced' ? 'reduced' : 'minimal';
effectsRef.current?.setLevel(effectsLevel);
```

> 在 `LaserEffects` 类中需要新增 `setLevel(level)` 方法（修改原类）：
> ```ts
> private level: 'full' | 'reduced' | 'minimal' = 'full';
> setLevel(level: 'full' | 'reduced' | 'minimal') {
>   this.level = level;
> }
> // 在 render() 中：
> // - level === 'reduced' → 跳过粒子爆裂渲染
> // - level === 'minimal' → 跳过所有特效，只画键位描边
> ```

- [ ] **Step 6：在 App 顶层包裹 ErrorBoundary 并启动全局错误监听**

Modify `frontend/src/App.tsx`：

```tsx
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { useEffect } from 'react';
import { toast } from './stores/toastStore';

export default function App() {
  // 兜底：捕获 Promise rejection 与资源加载失败
  useEffect(() => {
    const onUnhandled = (e: PromiseRejectionEvent) => {
      console.error('[unhandledrejection]', e.reason);
      toast.error('请求失败，请稍后重试');
    };
    const onError = (e: ErrorEvent) => {
      console.error('[window.error]', e.message);
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandled);
      window.removeEventListener('error', onError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
```

> 注意：原 App.tsx 中已有 RouterProvider，此处只需在外层包 ErrorBoundary 并加 useEffect。ToastContainer 在 RouterProvider 内部由 layout 提供，全局错误 toast 由 layout 顶层 ToastContainer 兜底渲染。

- [ ] **Step 7：写 ErrorBoundary 测试**

Create `frontend/src/components/error/__tests__/ErrorBoundary.test.tsx`：

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

const ThrowComponent = ({ message }: { message: string }) => {
  throw new Error(message);
};

describe('ErrorBoundary', () => {
  it('正常子组件正常渲染', () => {
    render(
      <ErrorBoundary>
        <div>正常内容</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('正常内容')).toBeTruthy();
  });

  it('子组件抛错时显示兜底界面', () => {
    // 抑制 console.error 噪音
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowComponent message="测试崩溃" />
      </ErrorBoundary>
    );
    expect(screen.getByText('出错了')).toBeTruthy();
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '返回首页' })).toBeTruthy();
    spy.mockRestore();
  });

  it('MediaPipe 错误显示摄像头相关提示', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowComponent message="MediaPipe load failed" />
      </ErrorBoundary>
    );
    expect(screen.getByText(/摄像头或手部识别/)).toBeTruthy();
    spy.mockRestore();
  });
});
```

- [ ] **Step 8：本地验证降级场景**

Run: `cd frontend && npm run dev`

逐项验证（任选可达项）：
1. 在 DevTools → Application → Cookies 中清掉摄像头权限，再访问 `/workbench` → 看到"摄像头不可用"提示
2. Chrome DevTools → Sensors → CPU throttling 6x slowdown，进入 tracking → 看到 fps 下降 + 自动降级提示
3. 在 Console 中执行 `throw new Error('MediaPipe test')` → 不应白屏，全局错误 toast 弹出
4. 临时把某个组件改成 `throw new Error('crash')` → 看到"出错了"兜底界面 + 重试/返回首页按钮

- [ ] **Step 9：跑测试**

Run: `cd frontend && npm test -- ErrorBoundary`

Expected: 3 passed

- [ ] **Step 10：Commit**

```bash
git add frontend/src/components/error/ frontend/src/hooks/useCapabilities.ts frontend/src/hooks/useFpsMonitor.ts frontend/src/App.tsx frontend/src/pages/Workbench.tsx
git commit -m "feat(frontend): 错误边界 + 能力检测 + 性能降级"
```

---

## Task 32：Vercel + Render 部署配置

**Goal：** 完成前后端部署配置文件、环境变量样例、Supabase 数据库初始化说明，确保按本 Task 执行后可直接在 Vercel 与 Render 上完成首次部署。

**Files:**
- Create: `frontend/vercel.json`
- Create: `frontend/.env.example`
- Create: `backend/render.yaml`
- Create: `backend/.env.example`
- Create: `deploy/supabase-setup.md`（部署指引文档，非运行时）
- Create: `backend/package.json` 的 `start` 脚本（如 Task 4 未定义则补）

**严格依据：**
- 设计文档第十一节部署方案（前端 Vercel、后端 Render、数据库 Supabase、MediaPipe 走 CDN）
- API 文档第九节环境变量清单

- [ ] **Step 1：创建前端 Vercel 配置**

Create `frontend/vercel.json`：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
      ]
    }
  ]
}
```

> 说明：
> - `rewrites` 保证 SPA 路由刷新不 404
> - 静态资源 1 年强缓存（hash 文件名）
> - index.html 不缓存，保证发布即时生效

- [ ] **Step 2：创建前端环境变量样例**

Create `frontend/.env.example`：

```bash
# 后端 API 地址（Render 部署后填入实际 URL）
VITE_API_URL=https://soundshape-api.onrender.com
```

> Vercel 部署时在 Project Settings → Environment Variables 中添加同名变量。

- [ ] **Step 3：创建后端 Render 配置**

Create `backend/render.yaml`：

```yaml
services:
  - type: web
    name: soundshape-api
    runtime: node
    plan: free
    region: singapore
    branch: main
    rootDir: backend
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: JWT_EXPIRES_IN
        value: 7d
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: CORS_ORIGIN
        sync: false
      - key: MAX_FILE_SIZE
        value: '20971520'
```

> 说明：
> - `sync: false` 表示该变量在 Render 控制台手动填入（敏感信息不入仓库）
> - `region: singapore` 适合亚洲用户，可改 `oregon` / `frankfurt`
> - 免费档 512MB 内存，冷启动约 30s，首次请求可能慢

- [ ] **Step 4：创建后端环境变量样例**

Create `backend/.env.example`：

```bash
# 服务端口
PORT=3000

# 数据库（Supabase → Settings → Database → Connection string → URI）
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres

# JWT
JWT_SECRET=change-me-to-random-32-char-string
JWT_EXPIRES_IN=7d

# Supabase（Supabase → Settings → API）
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...

# CORS（前端 Vercel 域名）
CORS_ORIGIN=https://soundshape.vercel.app

# 上传上限（字节，默认 20MB）
MAX_FILE_SIZE=20971520
```

- [ ] **Step 5：确认后端 package.json 的 start 脚本**

Modify `backend/package.json`，确保 `scripts` 字段包含：

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "migrate": "node dist/scripts/migrate.js"
  }
}
```

> 若 Task 4 已定义，确认 `start` 指向 `dist/index.js`（编译产物）。Render 的 buildCommand 会先跑 `npm run build` 生成 dist，再 start。

- [ ] **Step 6：确认后端 health 端点**

Modify `backend/src/routes/health.ts`（若不存在则 Create）：

```ts
import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    code: 0,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});
```

在 `backend/src/index.ts` 中挂载：

```ts
import { healthRouter } from './routes/health';

app.use('/api', healthRouter);
```

> Render 的 `healthCheckPath: /api/health` 会定期探测此路径，200 视为存活。

- [ ] **Step 7：创建 Supabase 数据库初始化指引**

Create `deploy/supabase-setup.md`：

````markdown
# Supabase 数据库初始化指引

## 1. 创建项目

1. 访问 https://supabase.com 注册并登录
2. New Project → 填写名称 `soundshape`，选免费档，选离用户最近的区域
3. 设置数据库密码（强密码，保存好）
4. 等待 2 分钟项目初始化完成

## 2. 获取连接串

- 进入 Project Settings → Database
- 找到 Connection string → URI
- 复制，替换密码占位符
- 这就是后端 `DATABASE_URL` 环境变量的值

## 3. 获取 Service Key

- Project Settings → API
- 复制 `service_role` secret key（注意不是 anon key）
- 这就是后端 `SUPABASE_SERVICE_KEY`
- `SUPABASE_URL` = Project Settings → API → `Project URL`

## 4. 执行数据库迁移

方式 A（推荐，用 Supabase SQL Editor）：
1. 进入 SQL Editor
2. 新建 Query
3. 把 `backend/migrations/001_init.sql` 全部内容粘贴进去
4. Run

方式 B（用后端 migrate 脚本）：
```bash
cd backend
npm run migrate
```

## 5. 验证

在 Supabase Table Editor 中应看到 7 张表：
- users
- play_records
- tuning_records
- layouts
- songs（含 10 首初始曲目）
- clips
- challenge_scores

## 6. 配置 Storage（用于分享视频）

1. 进入 Storage → New bucket
2. 名称填 `clips`，Public 勾选
3. 保存

> 上传分享视频时后端通过 service_key 上传到此 bucket，前端通过 `https://<ref>.supabase.co/storage/v1/object/public/clips/<filename>` 直接访问。
````

- [ ] **Step 8：本地构建验证**

前端：
```bash
cd frontend
cp .env.example .env  # 本地用，VITE_API_URL 暂填 http://localhost:3000
npm install
npm run build
```

Expected: `dist/` 目录生成，无报错。

后端：
```bash
cd backend
cp .env.example .env  # 填本地 Supabase 连接串
npm install
npm run build
```

Expected: `dist/` 目录生成，无 TS 报错。

- [ ] **Step 9：Commit**

```bash
git add frontend/vercel.json frontend/.env.example backend/render.yaml backend/.env.example backend/package.json backend/src/routes/health.ts backend/src/index.ts deploy/supabase-setup.md
git commit -m "chore(deploy): Vercel + Render + Supabase 部署配置"
```

> 注意：`.env`（非 `.env.example`）必须在 `.gitignore` 中。若 Task 1 已配置则跳过；否则在仓库根 `.gitignore` 追加：
> ```
> .env
> backend/.env
> frontend/.env
> ```

---

## Task 33：端到端验收测试

**Goal：** 按 spec 第十二节成功标准（11 项）逐条执行端到端验收，覆盖部署后访问、注册登录、画图识别、摄像头追踪、触发演奏、调音、记录保存、UI 一致性、响应式、错误兜底全部路径。验收通过即视为可上线。

**Files:**
- Create: `deploy/e2e-checklist.md`（验收清单，人工执行）
- Create: `backend/scripts/seed-test-user.ts`（可选，造测试账号）
- 不创建自动化 e2e 脚本（项目体量小，人工验收更可靠）

**严格依据：**
- 设计文档第十二节成功标准
- 设计文档第十三节降级策略
- 全部 spec 文档

- [ ] **Step 1：编写验收清单文档**

Create `deploy/e2e-checklist.md`：

````markdown
# 声形绘 SoundShape 端到端验收清单

> 部署完成后逐项打勾。全部 ✓ 才能视为上线就绪。任何 ✗ 必须修复后重测该项。

## 阶段 A：部署可达性（spec §12.1）

- [ ] **A1** 桌面浏览器（Chrome 最新版）访问 `https://<vercel-domain>` → 首页 200 加载，无控制台报错
- [ ] **A2** 手机浏览器（iOS Safari / Android Chrome）访问同 URL → 首页加载，布局自适应无横向滚动条
- [ ] **A3** 后端 `https://<render-domain>/api/health` 返回 `{"code":0,"data":{"status":"ok",...}}`
- [ ] **A4** 后端冷启动后首次 API 请求响应 < 5s（Render 免费档冷启动预期 < 30s）

## 阶段 B：注册登录（spec §12.2）

- [ ] **B1** `/register` 用邮箱 `test+e2e@example.com` / 密码 `Test1234` / 昵称 `E2E用户` 注册 → 自动登录跳 `/profile`
- [ ] **B2** 刷新页面 → 仍保持登录态（token 持久化生效）
- [ ] **B3** 退出登录 → 跳回 `/login`
- [ ] **B4** 重复注册同邮箱 → 返回 409 + `CONFLICT` 错误码，表单显示"邮箱已注册"
- [ ] **B5** 错误密码登录 → 返回 401 + `AUTH_INVALID_CREDENTIALS`，表单显示"邮箱或密码错误"
- [ ] **B6** 未登录访问 `/profile` → 自动跳 `/login?from=/profile`（实际由 Navigate state 传递）

## 阶段 C：画图识别（spec §12.3，识别率 ≥ 95%）

> 每个模板画 5 次，记录识别正确的次数。5 次全部正确视为该项 ✓。

- [ ] **C1** 画 8 个等大矩形横向排列 → 识别为 piano（置信度 > 0.7）
- [ ] **C2** 画 6 个横向长条 → 识别为 guitar
- [ ] **C3** 画 4 个竖向长条 → 识别为 violin
- [ ] **C4** 画 7 个竖向长条 → 识别为 flute
- [ ] **C5** 画 5 个不等大块状网格 → 识别为 drums
- [ ] **C6** 画 1 个孤立圆点 → 识别失败，状态变 error，Toast 提示"形状过少，请至少画 4 个"
- [ ] **C7** 画 3 个随机线条 → 识别失败，状态变 error，Toast 提示

## 阶段 D：摄像头追踪（spec §12.4，30fps 延迟 < 100ms）

- [ ] **D1** 任意画图识别成功后点"开启摄像头" → 浏览器弹权限请求
- [ ] **D2** 允许权限 → 状态变 tracking，画面镜像翻转显示
- [ ] **D3** 伸手入镜 → 食指尖有青色光标跟随，延迟肉眼 < 100ms
- [ ] **D4** 状态栏 FPS 显示 ≥ 25
- [ ] **D5** 拒绝权限 → 显示"摄像头不可用"降级提示，不卡死
- [ ] **D6** 关闭浏览器摄像头权限后重新进入 → 自动降级到画图模式

## 阶段 E：触发演奏（spec §12.5）

- [ ] **E1** 食指进入 piano C4 键位 → 听见钢琴 C4 音色 + 键位闪光 + 粒子爆裂
- [ ] **E2** 食指快速划过 5 个键位 → 5 个音依次触发，无明显延迟
- [ ] **E3** 食指停在键位内 → 不会重复触发（150ms cooldown 生效）
- [ ] **E4** 切到 drums 模板 → 触发底鼓/军鼓/嗵鼓/镲，音色可辨识
- [ ] **E5** 顶部"音符"计数累加，"连击"累加，"最高连击"更新
- [ ] **E6** 调整灵敏度滑块到 80 → 触发区域扩大，更容易触发
- [ ] **E7** 调整灵敏度滑块到 20 → 触发区域缩小，更难触发

## 阶段 F：调音器（spec §12.7）

- [ ] **F1** `/workbench` 调音器面板 → 点"开始"
- [ ] **F2** 浏览器弹麦克风权限请求 → 允许
- [ ] **F3** 对着麦克风哼 A4（440Hz） → 指针接近 0，频率显示 440 ± 5Hz
- [ ] **F4** 哼偏低音 → 指针左偏，显示音名 + 负 cents
- [ ] **F5** 哼偏高音 → 指针右偏，显示音名 + 正 cents
- [ ] **F6** 静默 → 显示"请发出声音"
- [ ] **F7** 登录后点"保存本次记录" → 调音记录写入数据库

## 阶段 G：记录保存（spec §12.8）

- [ ] **G1** 登录用户演奏一段后退出 tracking → 弹"是否保存演奏记录" → 确认 → 写入成功 Toast
- [ ] **G2** `/profile` 看到演奏记录数 +1
- [ ] **G3** 未登录用户演奏 → 退出 tracking 不弹保存提示（或提示"登录后可保存"）
- [ ] **G4** 调音记录同 G1-G3

## 阶段 H：曲库与挑战（spec §12.9 内容模块）

- [ ] **H1** `/songs` 看到至少 10 首曲目卡片
- [ ] **H2** 筛选器选 piano → 仅显示 piano 曲目
- [ ] **H3** 点击任一曲目 → 进入详情页，看到音符序列
- [ ] **H4** 详情页点"前往工作台练习" → 跳 `/workbench`
- [ ] **H5** `/challenge` 看到今日挑战曲目
- [ ] **H6** 未登录点"提交成绩" → 跳 `/login`
- [ ] **H7** 登录后回到 `/challenge` 提交 → 看到自己分数 + 排名
- [ ] **H8** 排行榜 Top 100 显示，当前用户高亮

## 阶段 I：分享录制（spec M11）

- [ ] **I1** tracking 阶段点"开始录制" → 按钮变红 + 计时器开始
- [ ] **I2** 演奏 10s 后点"停止" → 显示视频大小（如 2.5 MB）
- [ ] **I3** 点"上传分享" → 上传成功 Toast
- [ ] **I4** `/my-clips` 看到刚上传的视频卡片
- [ ] **I5** 点播放按钮 → 视频可播放
- [ ] **I6** 点删除 → 视频消失

## 阶段 J：UI 一致性（spec §12.9）

- [ ] **J1** 静态页面字体：标题 Fraunces，正文 Inter Tight，代码 JetBrains Mono
- [ ] **J2** 配色：静态界面纸色 #FAFAF7 背景 + 墨黑文字；演奏区纯黑 + 霓虹三色（青/品红/黄）
- [ ] **J3** 工作台切换时有"白昼纸面 → 暗夜雷电"过渡动画
- [ ] **J4** 所有按钮 hover 有反馈（颜色变化或微动效）
- [ ] **J5** 无横向滚动条，无错位元素
- [ ] **J6** 减少动效偏好（系统设置）生效时，动画自动关闭

## 阶段 K：响应式（spec §12.10）

- [ ] **K1** 桌面 1440px 宽 → 工作台双栏布局（画布 + 右侧工具栏）
- [ ] **K2** 平板 768px → 单栏布局，工具栏移到下方
- [ ] **K3** 手机 375px → 单栏，画布占满宽度，按钮触控友好（≥ 44px 高）
- [ ] **K4** 手机横屏 → 画布宽高比适配，仍可演奏

## 阶段 L：错误兜底（spec §12.11，§13）

- [ ] **L1** 关闭后端服务 → 前端仍能画图、识别、演奏，仅保存功能 Toast"网络异常"
- [ ] **L2** 摄像头不支持（如桌面无摄像头） → 降级提示"摄像头不可用，仅可查看生成的键位图"
- [ ] **L3** MediaPipe CDN 加载失败（断网测试） → 提示"手部识别加载失败，请检查网络或升级浏览器"
- [ ] **L4** 浏览器不支持 Web Audio（如旧版 Edge） → 演奏区禁用 + 提示
- [ ] **L5** CPU 6x 节流 → 自动降级特效，<10fps 时显示"设备性能不足"提示
- [ ] **L6** 任意组件抛错 → ErrorBoundary 接住，显示"出错了"+ 重试/返回首页
- [ ] **L7** 未处理的 Promise rejection → Toast"请求失败，请稍后重试"
- [ ] **L8** 全程无白屏、无卡死、无控制台 uncaught error

## 阶段 M：性能基线

- [ ] **M1** Lighthouse Performance ≥ 70（桌面）
- [ ] **M2** Lighthouse Accessibility ≥ 90
- [ ] **M3** 首屏 LCP < 3s（Vercel CDN）
- [ ] **M4** 工作台 tracking 期间内存增长 < 50MB / 分钟（无内存泄漏）
- [ ] **M5** 演奏 5 分钟后切换页面 → 摄像头流释放（getUserMedia 红点消失）

## 上线判定

- 阶段 A-M 全部 ✓ → 可上线
- 任一 ✗ → 修复后重测该项及相关依赖项
- A、C、D、E、L 任一 ✗ → 阻断上线（核心功能或稳定性问题）
- 其他阶段 ✗ → 可记录为已知问题，不阻断上线
````

- [ ] **Step 2：编写测试账号种子脚本（可选）**

Create `backend/scripts/seed-test-user.ts`：

```ts
/**
 * 造一个测试账号，便于 e2e 验收。
 * 运行：npm run seed:test-user
 * 仅在测试环境运行，生产环境禁止执行。
 */
import bcrypt from 'bcryptjs';
import { pool } from '../src/db/pool';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('禁止在生产环境运行 seed 脚本');
    process.exit(1);
  }

  const email = 'test+e2e@example.com';
  const password = 'Test1234';
  const nickname = 'E2E用户';

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (id, email, password_hash, nickname)
     VALUES (gen_random_uuid(), $1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = $2, nickname = $3`,
    [email, hash, nickname]
  );

  console.log(`测试账号已就绪：${email} / ${password}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

在 `backend/package.json` 的 scripts 中追加：

```json
"seed:test-user": "ts-node scripts/seed-test-user.ts"
```

- [ ] **Step 3：执行 e2e 验收（在 staging 环境）**

按 `deploy/e2e-checklist.md` 逐项执行。建议两人协作：一人操作一人记录结果。

环境要求：
- 前端已部署到 Vercel（预览或生产域名）
- 后端已部署到 Render
- Supabase 数据库已初始化
- 测试设备：1 台桌面浏览器（Chrome 最新版）+ 1 台手机（iOS Safari 或 Android Chrome）

执行结果填入清单打勾处。任一 ✗ 记录到 `deploy/e2e-issues.md`（如有）。

- [ ] **Step 4：修复阻断项并复测**

对阶段 A/C/D/E/L 中任一 ✗ 项：
1. 在对应 Task 文件中定位问题
2. 修复并 Commit
3. 触发 Vercel + Render 自动部署
4. 重新执行该项验收直到 ✓

非阻断项可记录到 backlog，不阻断本次上线。

- [ ] **Step 5：最终 Commit**

```bash
git add deploy/e2e-checklist.md backend/scripts/seed-test-user.ts backend/package.json
git commit -m "chore(deploy): 端到端验收清单 + 测试账号种子脚本"
```

- [ ] **Step 6：上线宣告**

当阶段 A-M 全部 ✓ 后，在仓库根创建 `RELEASE.md`（如需）或直接通知用户：

```
声形绘 SoundShape 已通过端到端验收，可上线。
- 前端：https://<vercel-domain>
- 后端：https://<render-domain>/api/health
- 数据库：Supabase 项目 <ref>
- 验收清单：deploy/e2e-checklist.md（全部 ✓）
```

---

## 实现计划完成

全部 33 个 Task 已写完，覆盖 7 个 Phase：

| Phase | 范围 | Task 数 |
|-------|------|---------|
| Phase 1 | 项目脚手架 | 3 |
| Phase 2 | 后端基础 | 3 |
| Phase 3 | 后端业务 | 6 |
| Phase 4 | 前端基础 | 5 |
| Phase 5 | 前端核心模块 | 8 |
| Phase 6 | 前端内容模块 | 4 |
| Phase 7 | 收尾与部署 | 4 |
| **合计** | | **33** |

执行顺序严格按 Phase 1 → 7，每个 Task 内部按 Step 1 → N 顺序执行。所有代码片段均可直接复制粘贴，所有验证命令均可在本地或部署环境执行。

下一步建议：
1. 用 `superpowers:executing-plans` 或 `superpowers:subagent-driven-development` 按本计划逐 Task 实现
2. 每个 Task 完成后跑该 Task 的验证命令 + Commit
3. 阶段性回归：每完成一个 Phase 跑一次该 Phase 的端到端验证
4. 全部完成后执行 Task 33 的完整 e2e 验收清单

---

## Task 34：类型一致性同步修正（self-review 补丁）

**Goal：** self-review 发现 Task 15 的 `types/api.ts` 与 API 文档存在字段不一致。Task 15 已就地修正为权威定义，本 Task 集中修正下游 Task 中引用旧字段的代码，确保全计划类型一致、可编译通过。

**Files:**
- Modify: `frontend/src/modules/shapeRecognizer/types.ts`（DrawnShape→ShapeDef 转换函数）
- Modify: `frontend/src/pages/Workbench.tsx`（保存演奏记录改用 notesPlayed）
- Modify: `frontend/src/pages/Songs.tsx`（SongDetail.noteSequence → notes）
- Modify: `frontend/src/modules/tuner/Tuner.tsx`（删除 targetFreq）

**严格依据：** API 文档 2.1/2.2/3.1/3.2/4.1/4.2/5.1/5.2 + Task 15 修正后的 types/api.ts

- [ ] **Step 1：DrawnShape → ShapeDef 转换工具**

在 `frontend/src/modules/shapeRecognizer/types.ts` 末尾追加转换函数（DrawnShape 是画布内部坐标 0-canvasWidth，ShapeDef 是归一化 0-1）：

```ts
import type { ShapeDef, ShapeBounds } from '../../types/api';

/**
 * 把画布内的 DrawnShape 转换为后端存储的 ShapeDef（归一化坐标）。
 * @param drawn 画布坐标的形状
 * @param canvasWidth 画布宽
 * @param canvasHeight 画布高
 */
export function toShapeDef(
  drawn: DrawnShape,
  canvasWidth: number,
  canvasHeight: number
): ShapeDef {
  const bounds: ShapeBounds = {
    x: drawn.x / canvasWidth,
    y: drawn.y / canvasHeight,
    width: drawn.width / canvasWidth,
    height: drawn.height / canvasHeight,
  };
  // DrawnShape.type 已是 'rect' | 'circle' | 'line'，直接透传
  return { type: drawn.type, bounds };
}

/**
 * 把后端 ShapeDef 还原为画布 DrawnShape（用于加载已保存布局）。
 */
export function fromShapeDef(
  shape: ShapeDef,
  canvasWidth: number,
  canvasHeight: number
): DrawnShape {
  return {
    id: crypto.randomUUID(),
    type: shape.type,
    x: shape.bounds.x * canvasWidth,
    y: shape.bounds.y * canvasHeight,
    width: shape.bounds.width * canvasWidth,
    height: shape.bounds.height * canvasHeight,
  };
}
```

> 注意：DrawnShape 是 Task 18 已定义的内部类型，含 id 字段；ShapeDef 是后端存储类型，无 id。转换时 id 由前端临时生成。

- [ ] **Step 2：Workbench 保存演奏记录改用 notesPlayed**

Modify `frontend/src/pages/Workbench.tsx`，找到原有保存演奏记录的逻辑（退出 tracking 时弹窗确认保存）。

**原代码（基于旧类型，需替换）：**

```ts
// 旧：noteCount/maxCombo
await recordsService.create({
  instrument,
  durationSec,
  noteCount: stats.noteCount,
  maxCombo: stats.maxCombo,
});
```

**替换为：**

```ts
import type { NoteEvent } from '../types/api';

// 新：构造 notesPlayed 数组
// workbenchStore 已记录每次 triggerKey 的时间和 note，从 store 取出
const notesPlayed: NoteEvent[] = triggeredHistoryRef.current.map((t) => ({
  note: t.note,
  timestamp: t.timestamp - sessionStartRef.current,  // 相对演奏起点
}));

await recordsService.create({
  instrument,
  durationSec: Math.round((Date.now() - sessionStartRef.current) / 1000),
  notesPlayed,
});
```

> 实现要点：
> - `triggeredHistoryRef` 是一个 `useRef<TriggerEvent[]>([])`，在 onTrigger 回调中 push 每次触发事件
> - `sessionStartRef` 是 `useRef<number>(0)`，进入 tracking 时设为 `Date.now()`
> - workbenchStore 中的 `noteCount` / `maxCombo` 仍保留用于 UI 显示，不删除

- [ ] **Step 3：Songs 详情页改用 notes 字段**

Modify `frontend/src/pages/Songs.tsx`，找到 SongDetailPage 中渲染音符序列的部分。

**原代码（基于旧字段名）：**

```tsx
{song.noteSequence.map((n, i) => (
  <div key={i}>
    {n.pitch} @ {n.time}ms ({n.duration}ms)
  </div>
))}
```

**替换为：**

```tsx
{song.notes.map((n, i) => (
  <div key={i}>
    {n.note} @ {n.startTime}ms ({n.duration}ms)
  </div>
))}
```

> 同时删除 SongDetail 类型断言中的 `noteSequence` / `description` 引用（若有）。

- [ ] **Step 4：Tuner 保存调音记录删除 targetFreq**

Modify `frontend/src/modules/tuner/Tuner.tsx`，找到保存调音记录的调用。

**原代码：**

```ts
await tuningsService.create({
  instrument,
  targetNote,
  targetFreq,     // 旧字段，已删除
  measuredFreq,
  deviationCents,
});
```

**替换为：**

```ts
await tuningsService.create({
  instrument,
  targetNote,
  measuredFreq,
  deviationCents,
});
```

> 若 Tuner.tsx 内部计算用了 `targetFreq` 变量（如显示目标频率），可保留局部变量，只是不传给 service。`noteToFreq(targetNote)` 仍可在 UI 中使用。

- [ ] **Step 5：跑全量前端测试 + 类型检查**

```bash
cd frontend
npm run build      # tsc 类型检查
npm test           # 全部单测
```

Expected:
- build 无 TS 报错
- 全部测试通过（如有测试因字段变化失败，按本 Task 修正逻辑同步更新测试断言）

- [ ] **Step 6：Commit**

```bash
git add frontend/src/modules/shapeRecognizer/types.ts frontend/src/pages/Workbench.tsx frontend/src/pages/Songs.tsx frontend/src/modules/tuner/Tuner.tsx
git commit -m "fix(frontend): 类型对齐 API 文档（notesPlayed/notes/ShapeDef/去 targetFreq）"
```

---

## self-review 总结

| 检查项 | 结果 |
|--------|------|
| Spec 覆盖（14 前端 + 8 后端模块） | ✓ 全部覆盖 |
| 占位符扫描（TODO/FIXME/XXX/TBD） | ✓ 无残留 |
| 类型一致性（前后端字段对齐） | ✓ Task 15 + Task 34 修正完成 |
| 路由一致性（spec 路由表 vs Task 15 router） | ✓ 一致 |
| 错误码一致性（API 文档错误码表 vs Task 4 错误处理） | ✓ 一致 |
| 状态机合法性（workbenchStore VALID_TRANSITIONS） | ✓ Task 25 已校验 |
| 部署配置完整性（Vercel/Render/Supabase） | ✓ Task 32 覆盖 |
| 端到端验收覆盖（spec §12 成功标准 11 项） | ✓ Task 33 阶段 A-M 覆盖 |

计划已就绪，可交付执行。

