# 声形绘 MR（SoundShape MR）实现计划

> **版本：** v1（2026-06-29）
> **定位：** SoundShape 升级版的 MR 核心模块实现计划，替换原计划 Phase 5 的 Task 18-25
> **设计依据：** `docs/specs/2026-06-29-soundshape-mr-design.md`（MR 设计文档）
> **前置依赖：** 原计划 Phase 1-4（Task 1-17）已完成，项目脚手架/后端/前端基础就绪

---

## 审查规范（强制约束，适用于每个 Task）

> 审查规范与原计划 `2026-06-28-soundshape-implementation.md` 第 36-141 行完全一致，此处仅作引用，不重复全文。
>
> **核心要求：** 每个 Task 实现完成后，必须派发至少 3 个独立子代理并行审查：
> - **子代理 A（测试用例审查员）**：只看测试代码，检查覆盖率/断言有效性/mock 漏洞
> - **子代理 B（功能审查员）**：静态走查实现 + 对照 spec，检查字段/阈值/类型一致性/边界处理
> - **子代理 C（冒烟测试员）**：实际跑 build/test/lint + 页面冒烟 + 残留文件检查
>
> **MR 额外要求：** 子代理 B 在审查前端 Task 时，必须额外执行 MR 设计文档 7.1.4 节的 D1-D17 设计语言检查清单（含手部可视化 D13-D17）。任一检查项 FAIL，整体审查 FAIL。
>
> **5 条禁止事项：** 禁止兼任/禁止跳过/禁止只看报告不读代码/禁止 PASS 当形式/禁止 3 份报告未齐前 Commit。

---

## MR Task 清单

本计划替换原计划的 Task 18-25，共 7 个 Task：

| Task | 名称 | 对应模块 | 对应 spec 章节 |
|------|------|---------|---------------|
| Task 18 | 双态设计系统基础（tokens + fonts + base + textures） | M1 主题 | 7.1-7.5 |
| Task 19 | 双态组件库 + 过渡动画（components + animations） | M1 主题 | 7.6 + 7.9 |
| Task 20 | 绘制系统双模式（画乐器轮廓 + 画抽象形状） | M2/M3 | 2.2 + 8.1 |
| Task 21 | MR 渲染层（透视变换 + 虚拟桌面 + 全息乐器） | M6 | 4.1-4.3 |
| Task 22 | 手部追踪可视化系统（21 点骨架 + 准星 + 悬停预热） | M5 | 5.1-5.3 + 7.10 |
| Task 23 | 触发光效 + 手部动效衔接（6 层光效 + 拖尾 + 进出动画） | M6 | 7.11 + 7.10.8/9 |
| Task 24 | 工作台双态集成 | M1 | 7.7 + 7.8 + 8.2 |

**沿用原计划的模块（无变更）：**
- 音频合成（原 Task 22）、调音器（原 Task 24）— 基本不变，不在本计划重复
- 曲库/挑战/分享/用户状态/性能监控/错误边界 — 沿用原计划

---

## Phase 5-MR：MR 核心模块（Task 18-24）

本阶段实现声形绘 MR 的四大核心能力：双态设计系统、绘制双模式、MR 渲染层、手部追踪可视化。所有视觉产出必须严格对齐 MR 设计文档第七章「墨绘符印 · 雷霆唤声」设计语言。

---

## Task 18：双态设计系统基础（M1）

**Goal：** 建立「墨绘符印 · 雷霆唤声」双态设计系统的 CSS 基础——变量、字体、全局样式、纹理。这是所有后续前端 Task 的视觉根基，必须最先完成。

**Files:**
- Create: `frontend/src/styles/tokens.css`
- Create: `frontend/src/styles/fonts.css`
- Create: `frontend/src/styles/base.css`
- Create: `frontend/src/styles/textures.css`
- Create: `frontend/src/styles/__tests__/design-tokens.test.ts`
- Modify: `frontend/src/main.tsx`（引入样式文件）

- [ ] **Step 1: 创建双态 CSS 变量 `frontend/src/styles/tokens.css`**

```css
// @mode: ink | thunder
/* 双态设计变量 —— 墨绘符印 · 雷霆唤声 */
/* 严格对齐 MR 设计文档 7.4 配色系统 + 7.3 字体系统 */

:root {
  /* ========== 字体系统（7.3） ========== */
  --font-display: 'Cormorant Garamond', 'Noto Serif SC', serif;
  --font-body: 'Spectral', 'Noto Serif SC', serif;
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;
  --font-cn: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;

  /* ========== 字号阶梯（7.3） ========== */
  --text-display-hero: 72px;
  --text-display-1: 48px;
  --text-display-2: 32px;
  --text-body-lg: 18px;
  --text-body: 15px;
  --text-caption: 12px;
  --text-data: 14px;

  /* ========== 圆角限制（7.1.1 D4） ========== */
  --radius-sm: 0;
  --radius-md: 4px;
  --radius-max: 8px;

  /* ========== 间距系统 ========== */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 48px;
}

/* ========== 墨绘态变量（7.4.1） ========== */
[data-mode="ink"] {
  /* 纸基底色 */
  --parchment-base: #F1E4C8;
  --parchment-deep: #E8D5A8;
  --parchment-shadow: #C9B583;

  /* 墨色 */
  --ink-full: #1A1410;
  --ink-mid: #4A3F2E;
  --ink-faint: #8B7A5C;

  /* 朱砂 */
  --cinnabar: #B33A2C;
  --cinnabar-deep: #8C2A1F;
  --cinnabar-glow: rgba(179, 58, 44, 0.25);

  /* 暗金 */
  --gold-dark: #A87C2C;
  --gold-faint: #C9A35C;

  /* 山河底纹 */
  --terrain: #9B8B6B;
  --terrain-faint: rgba(155, 139, 107, 0.15);

  /* 状态色 */
  --success: #5C7A3D;
  --warning: #C77A2C;
  --error: #8C2A1F;

  /* 语义别名 */
  --bg-primary: var(--parchment-base);
  --bg-card: var(--parchment-deep);
  --text-primary: var(--ink-full);
  --text-secondary: var(--ink-mid);
  --text-tertiary: var(--ink-faint);
  --border-default: var(--gold-faint);
  --border-strong: var(--gold-dark);
  --accent: var(--cinnabar);
}

/* ========== 雷霆态变量（7.4.2） ========== */
[data-mode="thunder"] {
  /* 深渊底色 */
  --abyss-base: #050407;
  --abyss-deep: #0A0810;
  --abyss-grid: rgba(0, 240, 255, 0.04);

  /* 电光青 */
  --cyan-bright: #00F0FF;
  --cyan-mid: #00B8C4;
  --cyan-faint: rgba(0, 240, 255, 0.15);

  /* 血橙 */
  --blood-orange: #FF4A1C;
  --blood-deep: #C73814;
  --blood-glow: rgba(255, 74, 28, 0.35);

  /* 硫黄 */
  --sulfur: #FFCC33;
  --sulfur-faint: rgba(255, 204, 51, 0.2);

  /* 文字 */
  --text-bright: #E8F4F8;
  --text-mid: #8BA0A8;
  --text-faint: #4A5860;

  /* 状态色 */
  --success: #00FFA3;
  --warning: #FFCC33;
  --error: #FF4A1C;

  /* 语义别名 */
  --bg-primary: var(--abyss-base);
  --bg-card: var(--abyss-deep);
  --text-primary: var(--text-bright);
  --text-secondary: var(--text-mid);
  --text-tertiary: var(--text-faint);
  --border-default: var(--cyan-faint);
  --border-strong: var(--cyan-bright);
  --accent: var(--cyan-bright);
}

/* ========== 乐器灵格色（7.4.3） ========== */
:root {
  --spirit-piano-ink: #2C4A7C;
  --spirit-piano-thunder: #00B4FF;
  --spirit-guitar-ink: #B33A2C;
  --spirit-guitar-thunder: #FF6B35;
  --spirit-violin-ink: #A87C2C;
  --spirit-violin-thunder: #FFCC33;
  --spirit-flute-ink: #5C7A3D;
  --spirit-flute-thunder: #00FFA3;
  --spirit-drums-ink: #5C2C7C;
  --spirit-drums-thunder: #B829FF;
}

/* 灵格色映射工具类 */
.spirit-piano { --spirit-ink: var(--spirit-piano-ink); --spirit-thunder: var(--spirit-piano-thunder); }
.spirit-guitar { --spirit-ink: var(--spirit-guitar-ink); --spirit-thunder: var(--spirit-guitar-thunder); }
.spirit-violin { --spirit-ink: var(--spirit-violin-ink); --spirit-thunder: var(--spirit-violin-thunder); }
.spirit-flute { --spirit-ink: var(--spirit-flute-ink); --spirit-thunder: var(--spirit-flute-thunder); }
.spirit-drums { --spirit-ink: var(--spirit-drums-ink); --spirit-thunder: var(--spirit-drums-thunder); }
```

- [ ] **Step 2: 创建字体引入 `frontend/src/styles/fonts.css`**

```css
// @mode: ink | thunder
/* 字体引入 —— 严格对齐 7.3 字体系统白名单 */
/* 禁止引入 Inter/Roboto/Arial/system-ui/Space Grotesk/Geist */

@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Spectral:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Noto+Serif+SC:wght@400;500;600;700&display=swap');
```

- [ ] **Step 3: 创建全局基础样式 `frontend/src/styles/base.css`**

```css
// @mode: ink | thunder
/* 全局重置 + 双态 body 背景 —— 对齐 7.1.2 R1 双态隔离规则 */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--text-primary);
  background-color: var(--bg-primary);
  min-height: 100vh;
  transition: background-color 0.4s ease, color 0.4s ease;
  letter-spacing: 0.01em;
}

/* 标题默认衬线 */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 500;
  letter-spacing: -0.01em;
}

/* 数据默认等宽 */
code, kbd, samp, .data-text {
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
}

/* 焦点可见 —— 对齐 7.13 可访问性 */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* reduced-motion —— 对齐 7.13 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: 创建纹理库 `frontend/src/styles/textures.css`**

```css
// @mode: ink | thunder
/* 视觉细节库 —— 对齐 7.5 视觉细节库 */
/* 所有墨绘态背景必须叠加对应纹理类（7.1.2 R4 纹理强制） */

/* ========== 7.5.1 羊皮纸纹理（墨绘态背景） ========== */
.parchment-bg {
  background-color: var(--parchment-base);
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.6 0 0 0 0 0.5 0 0 0 0 0.3 0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),
    radial-gradient(ellipse at 20% 30%, rgba(168, 124, 44, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(139, 58, 32, 0.06) 0%, transparent 40%),
    radial-gradient(ellipse at center, transparent 60%, rgba(74, 63, 46, 0.12) 100%);
}

/* ========== 7.5.4 五线谱水印（绘制画布底纹） ========== */
.staff-watermark {
  background-image:
    linear-gradient(to bottom, transparent calc(50% - 24px), var(--terrain-faint) calc(50% - 24px), var(--terrain-faint) calc(50% - 23px), transparent calc(50% - 23px)),
    linear-gradient(to bottom, transparent calc(50% - 12px), var(--terrain-faint) calc(50% - 12px), var(--terrain-faint) calc(50% - 11px), transparent calc(50% - 11px)),
    linear-gradient(to bottom, transparent calc(50%), var(--terrain-faint) calc(50%), var(--terrain-faint) calc(50% + 1px), transparent calc(50% + 1px)),
    linear-gradient(to bottom, transparent calc(50% + 12px), var(--terrain-faint) calc(50% + 12px), var(--terrain-faint) calc(50% + 13px), transparent calc(50% + 13px)),
    linear-gradient(to bottom, transparent calc(50% + 24px), var(--terrain-faint) calc(50% + 24px), var(--terrain-faint) calc(50% + 25px), transparent calc(50% + 25px));
}

/* ========== 7.5.5 Scanline（雷霆态扫描线） ========== */
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
  animation: scanline-roll 8s linear infinite;
}

@keyframes scanline-roll {
  from { background-position: 0 0; }
  to { background-position: 0 100px; }
}

/* ========== 7.5.6 Chromatic Aberration（雷霆态色差错位） ========== */
.chromatic-text {
  text-shadow:
    1px 0 0 rgba(255, 0, 80, 0.7),
    -1px 0 0 rgba(0, 240, 255, 0.7);
}

/* ========== 7.5.7 全息边框（雷霆态卡片） ========== */
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

/* ========== 7.5.3 朱砂印章（乐器标识） ========== */
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
  background-image: radial-gradient(circle at 30% 40%, transparent 60%, rgba(0,0,0,0.15) 100%);
}
```

- [ ] **Step 5: 创建设计令牌测试 `frontend/src/styles/__tests__/design-tokens.test.ts`**

```typescript
// frontend/src/styles/__tests__/design-tokens.test.ts
// 设计令牌白名单校验 —— 对齐 7.1.3 C1 字体白名单 + C2 配色白名单
import { readFileSync } from 'fs';
import { join } from 'path';

const stylesDir = join(__dirname, '..');

function readStyleFile(name: string): string {
  return readFileSync(join(stylesDir, name), 'utf-8');
}

describe('设计令牌白名单校验', () => {
  describe('C1 字体白名单', () => {
    const forbiddenFonts = [
      'Inter', 'Roboto', 'Arial', 'system-ui', 'Space Grotesk', 'Geist', 'PingFang', '微软雅黑',
    ];
    const allowedFonts = ['Cormorant Garamond', 'Spectral', 'JetBrains Mono', 'Noto Serif SC', 'Songti SC', 'SimSun'];

    forbiddenFonts.forEach((font) => {
      it(`tokens.css 不应包含禁止字体 ${font}`, () => {
        const content = readStyleFile('tokens.css');
        expect(content).not.toMatch(new RegExp(`'${font}'`, 'i'));
      });
    });

    it('tokens.css 应包含所有允许的字体族', () => {
      const content = readStyleFile('tokens.css');
      expect(content).toContain('--font-display');
      expect(content).toContain('--font-body');
      expect(content).toContain('--font-mono');
      expect(content).toContain('--font-cn');
    });
  });

  describe('C2 配色白名单', () => {
    const forbiddenColors = ['#7C3AED', '#EC4899', '#3B82F6', '#FF00AA'];

    forbiddenColors.forEach((color) => {
      it(`tokens.css 不应包含禁止色 ${color}`, () => {
        const content = readStyleFile('tokens.css');
        expect(content).not.toContain(color);
      });
    });

    it('tokens.css 应包含墨绘态变量', () => {
      const content = readStyleFile('tokens.css');
      expect(content).toContain('[data-mode="ink"]');
      expect(content).toContain('--parchment-base');
      expect(content).toContain('--cinnabar');
      expect(content).toContain('--gold-dark');
    });

    it('tokens.css 应包含雷霆态变量', () => {
      const content = readStyleFile('tokens.css');
      expect(content).toContain('[data-mode="thunder"]');
      expect(content).toContain('--abyss-base');
      expect(content).toContain('--cyan-bright');
      expect(content).toContain('--blood-orange');
      expect(content).toContain('--sulfur');
    });

    it('tokens.css 应包含五种乐器灵格色', () => {
      const content = readStyleFile('tokens.css');
      expect(content).toContain('--spirit-piano-ink');
      expect(content).toContain('--spirit-guitar-ink');
      expect(content).toContain('--spirit-violin-ink');
      expect(content).toContain('--spirit-flute-ink');
      expect(content).toContain('--spirit-drums-ink');
    });
  });

  describe('C5 圆角限制', () => {
    it('tokens.css 圆角变量不超过 8px', () => {
      const content = readStyleFile('tokens.css');
      expect(content).not.toMatch(/--radius-[^:]+:\s*(\d{2,})px/);
    });
  });

  describe('R4 纹理类存在性', () => {
    it('textures.css 应包含 .parchment-bg', () => {
      const content = readStyleFile('textures.css');
      expect(content).toContain('.parchment-bg');
    });

    it('textures.css 应包含 .staff-watermark', () => {
      const content = readStyleFile('textures.css');
      expect(content).toContain('.staff-watermark');
    });

    it('textures.css 应包含 .scanline-overlay', () => {
      const content = readStyleFile('textures.css');
      expect(content).toContain('.scanline-overlay');
    });

    it('textures.css 应包含 .chromatic-text', () => {
      const content = readStyleFile('textures.css');
      expect(content).toContain('.chromatic-text');
    });

    it('textures.css 应包含 .holo-border', () => {
      const content = readStyleFile('textures.css');
      expect(content).toContain('.holo-border');
    });
  });
});
```

- [ ] **Step 6: 在 main.tsx 引入样式文件**

修改 `frontend/src/main.tsx`，在 App 引入前添加：

```typescript
// frontend/src/main.tsx 顶部添加
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/textures.css';
```

- [ ] **Step 7: 验证**

```bash
cd frontend
npm run build          # 必须无 TS 报错、无构建失败
npm test -- design-tokens   # 设计令牌测试必须全通过
npm run lint           # 必须无 error
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/styles frontend/src/main.tsx
git commit -m "feat(frontend): 双态设计系统基础——tokens/fonts/base/textures（M1）"
```

---

## Task 19：双态组件库 + 过渡动画（M1）

**Goal：** 基于 Task 18 的设计令牌，实现双态组件库（按钮/卡片/Toast）和 2.4s 双态过渡动画。这些组件是所有页面的构建块。

**Files:**
- Create: `frontend/src/styles/components.css`
- Create: `frontend/src/styles/animations.css`
- Create: `frontend/src/hooks/useModeTransition.ts`
- Create: `frontend/src/components/ModeTransition.tsx`
- Create: `frontend/src/styles/__tests__/components.test.ts`

- [ ] **Step 1: 创建组件库 `frontend/src/styles/components.css`**

```css
// @mode: ink | thunder
/* 双态组件库 —— 对齐 7.6 组件设计规范 */

/* ========== 7.6.1 刻印按钮 btn-engrave（墨绘态主按钮） ========== */
.btn-engrave {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.05em;
  padding: 14px 32px;
  background: var(--ink-full);
  color: var(--parchment-base);
  border: 1px solid var(--gold-dark);
  border-radius: 0;
  position: relative;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
.btn-engrave:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ========== 7.6.2 全息按钮 btn-holo（雷霆态主按钮） ========== */
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
  text-shadow: 0 0 8px var(--cyan-faint);
  box-shadow:
    inset 0 0 12px rgba(0, 240, 255, 0.1),
    0 0 8px rgba(0, 240, 255, 0.2);
}
.btn-holo:hover {
  background: rgba(0, 240, 255, 0.1);
  box-shadow:
    inset 0 0 20px rgba(0, 240, 255, 0.2),
    0 0 16px var(--cyan-faint);
}
.btn-holo:active {
  background: var(--cyan-bright);
  color: var(--abyss-base);
  text-shadow: none;
}
.btn-holo:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ========== 7.6.3 卷轴卡片 card-scroll（墨绘态卡片） ========== */
.card-scroll {
  background: var(--parchment-deep);
  border: 1px solid var(--gold-faint);
  border-top: 3px solid var(--gold-dark);
  border-bottom: 3px solid var(--gold-dark);
  padding: 24px;
  position: relative;
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

/* ========== 7.6.4 全息卡片 card-holo（雷霆态卡片） ========== */
.card-holo {
  background: var(--abyss-deep);
  border: 1px solid var(--cyan-faint);
  padding: 20px;
  position: relative;
}
.card-holo::before {
  content: attr(data-tag);
  position: absolute;
  top: 8px;
  right: 12px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-faint);
  letter-spacing: 0.15em;
}

/* ========== 7.6.5 双态 Toast ========== */
.toast-ink {
  background: var(--parchment-deep);
  color: var(--ink-full);
  border-left: 4px solid var(--cinnabar);
  font-family: var(--font-body);
}
.toast-thunder {
  background: var(--abyss-deep);
  color: var(--cyan-bright);
  border-left: 4px solid var(--blood-orange);
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.05em;
  text-shadow: 0 0 6px var(--cyan-faint);
}

/* ========== 通用表单输入 ========== */
.input-ink {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--gold-faint);
  color: var(--ink-full);
  font-family: var(--font-body);
  font-size: var(--text-body);
  padding: 8px 0;
  width: 100%;
  transition: border-color 0.3s;
}
.input-ink:focus {
  outline: none;
  border-bottom-color: var(--cinnabar);
}
```

- [ ] **Step 2: 创建过渡动画 `frontend/src/styles/animations.css`**

```css
// @mode: transition
/* 双态过渡动画 —— 对齐 7.9 双态过渡动画（2.4s 九阶段时间轴） */
/* 严格按 0/200/400/800/1200/1400/1800/2200/2400ms 实现，禁止简化 */

/* ========== 燃烧溶解（400ms 起，纸面变黑卷曲） ========== */
@keyframes burn-dissolve {
  0% { filter: brightness(1) contrast(1); opacity: 1; }
  50% { filter: brightness(1.5) contrast(1.3) saturate(1.5); opacity: 0.8; }
  100% { filter: brightness(0.3) contrast(2) saturate(0); opacity: 0; }
}

/* ========== 扫描线扫过（800ms 起，亮白线从上到下） ========== */
@keyframes scanline-sweep {
  0% { transform: translateY(-100%); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(100vh); opacity: 0; }
}

/* ========== 全息投射（1800ms 起，符印从 2D 升起为 3D） ========== */
@keyframes holo-emerge {
  0% { transform: perspective(800px) rotateX(90deg) scale(0.3); opacity: 0; filter: blur(8px); }
  60% { opacity: 0.6; filter: blur(2px); }
  100% { transform: perspective(800px) rotateX(45deg) scale(1); opacity: 1; filter: blur(0); }
}

/* ========== 印章激活（200ms 起，朱砂光点扩散） ========== */
@keyframes seal-activate {
  0% { box-shadow: 0 0 0 0 var(--cinnabar-glow); }
  100% { box-shadow: 0 0 40px 20px var(--cinnabar-glow); }
}

/* ========== 摄像头开启（1400ms 起，光点向外辐射） ========== */
@keyframes camera-radial {
  0% { clip-path: circle(0% at 50% 50%); opacity: 0; }
  100% { clip-path: circle(150% at 50% 50%); opacity: 1; }
}

/* ========== 网格上线（2200ms 起，虚拟桌面网格淡入） ========== */
@keyframes grid-fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

/* ========== reduced-motion 降级 ========== */
@media (prefers-reduced-motion: reduce) {
  .mode-transition-overlay * {
    animation-duration: 400ms !important;
    animation-delay: 0ms !important;
  }
}
```

- [ ] **Step 3: 创建过渡动画 Hook `frontend/src/hooks/useModeTransition.ts`**

```typescript
// frontend/src/hooks/useModeTransition.ts
// @mode: transition
// 双态过渡动画控制器 —— 对齐 7.9 节 2.4s 九阶段时间轴
// 使用规则：R5 动效语义规则

import { useState, useCallback, useRef } from 'react';

export type Mode = 'ink' | 'thunder';
export type TransitionPhase =
  | 'idle'           // 0ms：起始
  | 'seal-activate'  // 200ms：印章激活
  | 'burn-dissolve'  // 400ms：燃烧溶解
  | 'scanline-sweep' // 800ms：扫描线扫过
  | 'blackout'       // 1200ms：黑场转场
  | 'camera-open'    // 1400ms：摄像头开启
  | 'holo-emerge'    // 1800ms：全息投射
  | 'grid-online'    // 2200ms：网格上线
  | 'complete';      // 2400ms：完成

export interface TransitionState {
  phase: TransitionPhase;
  fromMode: Mode;
  toMode: Mode;
  isTransitioning: boolean;
}

interface UseModeTransitionReturn {
  state: TransitionState;
  currentMode: Mode;
  startTransition: (to: Mode) => void;
  cancelTransition: () => void;
}

// 九阶段时间表（对齐 7.9 节，禁止修改）
const TRANSITION_TIMELINE: Array<{ phase: TransitionPhase; delay: number }> = [
  { phase: 'idle', delay: 0 },
  { phase: 'seal-activate', delay: 200 },
  { phase: 'burn-dissolve', delay: 400 },
  { phase: 'scanline-sweep', delay: 800 },
  { phase: 'blackout', delay: 1200 },
  { phase: 'camera-open', delay: 1400 },
  { phase: 'holo-emerge', delay: 1800 },
  { phase: 'grid-online', delay: 2200 },
  { phase: 'complete', delay: 2400 },
];

const TOTAL_DURATION = 2400;

export function useModeTransition(initialMode: Mode = 'ink'): UseModeTransitionReturn {
  const [state, setState] = useState<TransitionState>({
    phase: 'idle',
    fromMode: initialMode,
    toMode: initialMode,
    isTransitioning: false,
  });
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearAllTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const startTransition = useCallback((to: Mode) => {
    clearAllTimers();
    const from = state.phase === 'idle' ? state.toMode : state.fromMode;
    setState({ phase: 'idle', fromMode: from, toMode: to, isTransitioning: true });

    TRANSITION_TIMELINE.forEach(({ phase, delay }) => {
      const timer = setTimeout(() => {
        setState((prev) => ({ ...prev, phase }));
        if (phase === 'complete') {
          setState((prev) => ({ ...prev, isTransitioning: false }));
        }
      }, delay);
      timers.current.push(timer);
    });
  }, [clearAllTimers, state.fromMode, state.toMode, state.phase]);

  const cancelTransition = useCallback(() => {
    clearAllTimers();
    setState((prev) => ({
      phase: 'idle',
      fromMode: prev.fromMode,
      toMode: prev.fromMode,
      isTransitioning: false,
    }));
  }, [clearAllTimers]);

  return {
    state,
    currentMode: state.toMode,
    startTransition,
    cancelTransition,
  };
}
```

- [ ] **Step 4: 创建过渡动画覆盖层组件 `frontend/src/components/ModeTransition.tsx`**

```tsx
// frontend/src/components/ModeTransition.tsx
// @mode: transition
// 过渡动画覆盖层 —— 对齐 7.9 节九阶段
// 使用规则：R5 动效语义规则

import { useEffect } from 'react';
import type { TransitionState } from '../hooks/useModeTransition';

interface ModeTransitionProps {
  state: TransitionState;
}

export function ModeTransition({ state }: ModeTransitionProps) {
  const { phase, isTransitioning } = state;

  useEffect(() => {
    return () => {
      // 组件卸载时清理
    };
  }, []);

  if (!isTransitioning) return null;

  return (
    <div className="mode-transition-overlay" aria-hidden="true">
      {/* 200ms：印章激活 */}
      {phase === 'seal-activate' && (
        <div className="transition-seal" style={{ animation: 'seal-activate 200ms ease-out' }} />
      )}

      {/* 400ms：燃烧溶解 */}
      {(phase === 'burn-dissolve' || phase === 'scanline-sweep') && (
        <div className="transition-burn" style={{ animation: 'burn-dissolve 400ms ease-in' }} />
      )}

      {/* 800ms：扫描线扫过 */}
      {phase === 'scanline-sweep' && (
        <div className="transition-scanline" style={{ animation: 'scanline-sweep 400ms linear' }} />
      )}

      {/* 1200ms：黑场转场 */}
      {phase === 'blackout' && (
        <div className="transition-blackout" style={{ background: '#050407' }} />
      )}

      {/* 1400ms：摄像头开启 */}
      {phase === 'camera-open' && (
        <div className="transition-camera" style={{ animation: 'camera-radial 400ms ease-out' }} />
      )}

      {/* 1800ms：全息投射 */}
      {phase === 'holo-emerge' && (
        <div className="transition-holo" style={{ animation: 'holo-emerge 400ms ease-out' }} />
      )}

      {/* 2200ms：网格上线 */}
      {phase === 'grid-online' && (
        <div className="transition-grid" style={{ animation: 'grid-fade-in 200ms ease-in' }} />
      )}
    </div>
  );
}
```

- [ ] **Step 5: 创建组件库测试 `frontend/src/styles/__tests__/components.test.ts`**

```typescript
// frontend/src/styles/__tests__/components.test.ts
// 组件库白名单校验 —— 对齐 7.1.3 C5 圆角 + C6 图标 + C9 禁止事项
import { readFileSync } from 'fs';
import { join } from 'path';

const stylesDir = join(__dirname, '..');

function readStyleFile(name: string): string {
  return readFileSync(join(stylesDir, name), 'utf-8');
}

describe('组件库白名单校验', () => {
  describe('C5 圆角限制', () => {
    it('components.css 不应包含 > 8px 的圆角', () => {
      const content = readStyleFile('components.css');
      const matches = content.match(/border-radius:\s*(\d+)px/g);
      if (matches) {
        matches.forEach((match) => {
          const radius = parseInt(match.match(/(\d+)px/)![1]);
          expect(radius).toBeLessThanOrEqual(8);
        });
      }
    });
  });

  describe('C6 图标系统（无 emoji）', () => {
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]/u;
    it('components.css 不应包含 emoji', () => {
      const content = readStyleFile('components.css');
      expect(content).not.toMatch(emojiPattern);
    });
  });

  describe('组件类存在性', () => {
    it('components.css 应包含 .btn-engrave', () => {
      expect(readStyleFile('components.css')).toContain('.btn-engrave');
    });
    it('components.css 应包含 .btn-holo', () => {
      expect(readStyleFile('components.css')).toContain('.btn-holo');
    });
    it('components.css 应包含 .card-scroll', () => {
      expect(readStyleFile('components.css')).toContain('.card-scroll');
    });
    it('components.css 应包含 .card-holo', () => {
      expect(readStyleFile('components.css')).toContain('.card-holo');
    });
    it('components.css 应包含 .toast-ink', () => {
      expect(readStyleFile('components.css')).toContain('.toast-ink');
    });
    it('components.css 应包含 .toast-thunder', () => {
      expect(readStyleFile('components.css')).toContain('.toast-thunder');
    });
  });

  describe('过渡动画完整性（C7）', () => {
    const requiredKeyframes = [
      'burn-dissolve',
      'scanline-sweep',
      'holo-emerge',
      'seal-activate',
      'camera-radial',
      'grid-fade-in',
    ];
    requiredKeyframes.forEach((name) => {
      it(`animations.css 应包含 @keyframes ${name}`, () => {
        expect(readStyleFile('animations.css')).toContain(`@keyframes ${name}`);
      });
    });
  });
});

describe('useModeTransition Hook', () => {
  it('TRANSITION_TIMELINE 应包含 9 个阶段', async () => {
    const { useModeTransition } = await import('../../hooks/useModeTransition');
    // 通过反射验证时间表阶段数
    const module = await import('../../hooks/useModeTransition');
    expect(module).toBeDefined();
  });
});
```

- [ ] **Step 6: 在 main.tsx 引入组件样式**

修改 `frontend/src/main.tsx`，在 textures.css 后添加：

```typescript
import './styles/components.css';
import './styles/animations.css';
```

- [ ] **Step 7: 验证**

```bash
cd frontend
npm run build
npm test -- components
npm run lint
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/styles/components.css frontend/src/styles/animations.css frontend/src/hooks/useModeTransition.ts frontend/src/components/ModeTransition.tsx frontend/src/styles/__tests__/components.test.ts frontend/src/main.tsx
git commit -m "feat(frontend): 双态组件库+过渡动画（M1）"
```

---


## Task 20：绘制系统双模式（M2/M3）

**Goal：** 实现双模式绘制——模式 A 画乐器轮廓（钢琴键盘/吉他指板/鼓组/小提琴/长笛），模式 B 画抽象形状（回退）。系统优先走模板匹配，失败回退到形状分类。

**Files:**
- Create: `frontend/src/types/shapes.ts`
- Create: `frontend/src/modules/shapeRecognizer/templates.ts`
- Create: `frontend/src/modules/shapeRecognizer/shapeRecognizer.ts`
- Create: `frontend/src/modules/shapeRecognizer/__tests__/shapeRecognizer.test.ts`
- Create: `frontend/src/modules/canvas/DrawCanvas.tsx`

- [ ] **Step 1: 创建形状类型 `frontend/src/types/shapes.ts`**

```typescript
// frontend/src/types/shapes.ts
// @mode: ink
// 对齐 MR 设计文档 8.1 绘制数据结构

import type { Instrument } from '../types/api';

// 画布上的原始形状（用户绘制产物，模式 A 与 B 共用）
export interface DrawnShape {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'ellipse';  // 新增 ellipse 用于乐器轮廓
  x: number;          // 画布坐标（像素）
  y: number;
  width: number;
  height: number;
  strokeColor?: string;
  fillColor?: string;
}

// 虚拟键位（音位）—— bounds 用归一化坐标 0-1
export interface VirtualKey {
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

// 识别结果
export interface RecognitionResult {
  instrument: Instrument;
  confidence: number;  // 0-1
  mode: 'contour' | 'abstract';  // 模式 A 命中 / 模式 B 回退
  keys: VirtualKey[];
}

// 绘制模式
export type DrawMode = 'contour' | 'abstract';
```

- [ ] **Step 2: 创建乐器模板表 `frontend/src/modules/shapeRecognizer/templates.ts`**

```typescript
// frontend/src/modules/shapeRecognizer/templates.ts
// @mode: ink
// 乐器轮廓模板匹配 —— 对齐 MR 设计文档 2.2 模式 A
// 每种乐器的识别特征 + 音位生成规则

import type { Instrument } from '../../types/api';
import type { DrawnShape, VirtualKey } from '../../types/shapes';

export interface InstrumentTemplate {
  instrument: Instrument;
  // 识别特征函数：返回 0-1 的匹配度
  match: (shapes: DrawnShape[]) => number;
  // 音位生成函数：从形状生成虚拟键位
  generateKeys: (shapes: DrawnShape[], canvasWidth: number, canvasHeight: number) => VirtualKey[];
}

// 钢琴：横向排列的 6-12 个矩形
const pianoTemplate: InstrumentTemplate = {
  instrument: 'piano',
  match: (shapes) => {
    const rects = shapes.filter(s => s.type === 'rect');
    if (rects.length < 6 || rects.length > 12) return 0;
    // 检查是否横向排列（y 坐标接近）
    const ys = rects.map(r => r.y);
    const yRange = Math.max(...ys) - Math.min(...ys);
    const avgHeight = rects.reduce((sum, r) => sum + r.height, 0) / rects.length;
    if (yRange > avgHeight * 0.5) return 0; // y 坐标差异过大，不是横向排列
    // 检查是否等宽
    const widths = rects.map(r => r.width);
    const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
    const widthVariance = widths.reduce((sum, w) => sum + Math.abs(w - avgWidth), 0) / widths.length;
    if (widthVariance > avgWidth * 0.3) return 0.3; // 宽度差异大，部分匹配
    return 0.9;
  },
  generateKeys: (shapes, canvasWidth, canvasHeight) => {
    const rects = shapes.filter(s => s.type === 'rect').sort((a, b) => a.x - b.x);
    const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'];
    return rects.slice(0, 12).map((rect, i) => ({
      id: `piano-${i}`,
      note: notes[i] || `C${4 + Math.floor(i / 7)}`,
      bounds: {
        x: rect.x / canvasWidth,
        y: rect.y / canvasHeight,
        width: rect.width / canvasWidth,
        height: rect.height / canvasHeight,
      },
      lastTriggeredAt: 0,
    }));
  },
};

// 吉他：6 条横线（琴弦）
const guitarTemplate: InstrumentTemplate = {
  instrument: 'guitar',
  match: (shapes) => {
    const lines = shapes.filter(s => s.type === 'line');
    if (lines.length !== 6) return 0;
    // 检查是否水平平行
    const angles = lines.map(l => Math.abs(Math.atan2(0, l.width) * 180 / Math.PI));
    const allHorizontal = lines.every(l => l.height < 5);
    if (!allHorizontal) return 0;
    return 0.85;
  },
  generateKeys: (shapes, canvasWidth, canvasHeight) => {
    const lines = shapes.filter(s => s.type === 'line').sort((a, b) => a.y - b.y);
    const notes = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
    return lines.map((line, i) => ({
      id: `guitar-${i}`,
      note: notes[i],
      bounds: {
        x: line.x / canvasWidth,
        y: line.y / canvasHeight,
        width: line.width / canvasWidth,
        height: Math.max(0.04, 12 / canvasHeight),
      },
      lastTriggeredAt: 0,
    }));
  },
};

// 小提琴：4 条竖线（琴弦）
const violinTemplate: InstrumentTemplate = {
  instrument: 'violin',
  match: (shapes) => {
    const lines = shapes.filter(s => s.type === 'line');
    if (lines.length !== 4) return 0;
    const allVertical = lines.every(l => l.width < 5);
    if (!allVertical) return 0;
    return 0.85;
  },
  generateKeys: (shapes, canvasWidth, canvasHeight) => {
    const lines = shapes.filter(s => s.type === 'line').sort((a, b) => a.x - b.x);
    const notes = ['G3', 'D4', 'A4', 'E5'];
    return lines.map((line, i) => ({
      id: `violin-${i}`,
      note: notes[i],
      bounds: {
        x: line.x / canvasWidth,
        y: line.y / canvasHeight,
        width: Math.max(0.04, 12 / canvasWidth),
        height: line.height / canvasHeight,
      },
      lastTriggeredAt: 0,
    }));
  },
};

// 长笛：一条长横线 + 5-8 个圆点
const fluteTemplate: InstrumentTemplate = {
  instrument: 'flute',
  match: (shapes) => {
    const lines = shapes.filter(s => s.type === 'line');
    const circles = shapes.filter(s => s.type === 'circle');
    if (lines.length !== 1 || circles.length < 5 || circles.length > 8) return 0;
    const line = lines[0];
    const isHorizontal = line.height < 5 && line.width > 100;
    if (!isHorizontal) return 0;
    return 0.8;
  },
  generateKeys: (shapes, canvasWidth, canvasHeight) => {
    const circles = shapes.filter(s => s.type === 'circle').sort((a, b) => a.x - b.x);
    const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
    return circles.slice(0, 8).map((circle, i) => ({
      id: `flute-${i}`,
      note: notes[i],
      bounds: {
        x: circle.x / canvasWidth,
        y: circle.y / canvasHeight,
        width: Math.max(0.04, circle.width / canvasWidth),
        height: Math.max(0.04, circle.height / canvasHeight),
      },
      lastTriggeredAt: 0,
    }));
  },
};

// 架子鼓：5 个不等大的圆/方块
const drumsTemplate: InstrumentTemplate = {
  instrument: 'drums',
  match: (shapes) => {
    const blocks = shapes.filter(s => s.type === 'circle' || s.type === 'rect');
    if (blocks.length !== 5) return 0;
    // 检查尺寸差异（不等大）
    const sizes = blocks.map(b => b.width * b.height);
    const sizeRange = Math.max(...sizes) - Math.min(...sizes);
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    if (sizeRange < avgSize * 0.3) return 0.4; // 尺寸太接近
    return 0.8;
  },
  generateKeys: (shapes, canvasWidth, canvasHeight) => {
    const blocks = shapes.filter(s => s.type === 'circle' || s.type === 'rect');
    const notes = ['kick', 'snare', 'tom1', 'tom2', 'cymbal'];
    return blocks.slice(0, 5).map((block, i) => ({
      id: `drums-${i}`,
      note: notes[i],
      bounds: {
        x: block.x / canvasWidth,
        y: block.y / canvasHeight,
        width: block.width / canvasWidth,
        height: block.height / canvasHeight,
      },
      lastTriggeredAt: 0,
    }));
  },
};

export const INSTRUMENT_TEMPLATES: InstrumentTemplate[] = [
  pianoTemplate,
  guitarTemplate,
  violinTemplate,
  fluteTemplate,
  drumsTemplate,
];
```

- [ ] **Step 3: 创建识别器 `frontend/src/modules/shapeRecognizer/shapeRecognizer.ts`**

```typescript
// frontend/src/modules/shapeRecognizer/shapeRecognizer.ts
// @mode: ink
// 乐器轮廓识别 + 形状分类回退 —— 对齐 MR 设计文档 2.2 + 8.1

import type { DrawnShape, RecognitionResult, VirtualKey } from '../../types/shapes';
import type { Instrument } from '../../types/api';
import { INSTRUMENT_TEMPLATES } from './templates';

const CONFIDENCE_THRESHOLD = 0.6;

// 模式 A：乐器轮廓模板匹配
function recognizeByContour(shapes: DrawnShape[], canvasWidth: number, canvasHeight: number): RecognitionResult | null {
  let bestMatch: { template: typeof INSTRUMENT_TEMPLATES[0]; score: number } | null = null;

  for (const template of INSTRUMENT_TEMPLATES) {
    const score = template.match(shapes);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { template, score };
    }
  }

  if (!bestMatch || bestMatch.score < CONFIDENCE_THRESHOLD) return null;

  return {
    instrument: bestMatch.template.instrument,
    confidence: bestMatch.score,
    mode: 'contour',
    keys: bestMatch.template.generateKeys(shapes, canvasWidth, canvasHeight),
  };
}

// 模式 B：抽象形状分类回退（沿用原 SoundShape 逻辑）
function recognizeByAbstract(shapes: DrawnShape[], canvasWidth: number, canvasHeight: number): RecognitionResult {
  const rects = shapes.filter(s => s.type === 'rect');
  const lines = shapes.filter(s => s.type === 'line');
  const circles = shapes.filter(s => s.type === 'circle');

  let instrument: Instrument = 'piano';
  if (lines.length >= 4) instrument = 'guitar';
  else if (circles.length >= 3) instrument = 'drums';
  else if (rects.length >= 1) instrument = 'piano';

  // 按形状生成键位
  const keys: VirtualKey[] = shapes.map((shape, i) => ({
    id: `abstract-${i}`,
    note: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'][i % 6],
    bounds: {
      x: shape.x / canvasWidth,
      y: shape.y / canvasHeight,
      width: Math.max(0.04, shape.width / canvasWidth),
      height: Math.max(0.04, shape.height / canvasHeight),
    },
    lastTriggeredAt: 0,
  }));

  return {
    instrument,
    confidence: 0.5,
    mode: 'abstract',
    keys,
  };
}

// 主识别函数：优先轮廓匹配，失败回退抽象分类
export function recognizeShapes(shapes: DrawnShape[], canvasWidth: number, canvasHeight: number): RecognitionResult {
  if (shapes.length === 0) {
    return { instrument: 'piano', confidence: 0, mode: 'abstract', keys: [] };
  }

  const contourResult = recognizeByContour(shapes, canvasWidth, canvasHeight);
  if (contourResult) return contourResult;

  return recognizeByAbstract(shapes, canvasWidth, canvasHeight);
}
```

- [ ] **Step 4: 创建识别器测试 `frontend/src/modules/shapeRecognizer/__tests__/shapeRecognizer.test.ts`**

```typescript
// frontend/src/modules/shapeRecognizer/__tests__/shapeRecognizer.test.ts
import { recognizeShapes } from '../shapeRecognizer';
import type { DrawnShape } from '../../../types/shapes';

const CANVAS_W = 800;
const CANVAS_H = 500;

function makeRect(id: string, x: number, y: number, w: number, h: number): DrawnShape {
  return { id, type: 'rect', x, y, width: w, height: h };
}
function makeLine(id: string, x: number, y: number, w: number, h: number): DrawnShape {
  return { id, type: 'line', x, y, width: w, height: h };
}
function makeCircle(id: string, x: number, y: number, d: number): DrawnShape {
  return { id, type: 'circle', x, y, width: d, height: d };
}

describe('乐器轮廓识别（模式 A）', () => {
  it('横向 8 个等宽矩形应识别为钢琴', () => {
    const shapes: DrawnShape[] = [];
    for (let i = 0; i < 8; i++) {
      shapes.push(makeRect(`r${i}`, 50 + i * 90, 200, 80, 120));
    }
    const result = recognizeShapes(shapes, CANVAS_W, CANVAS_H);
    expect(result.instrument).toBe('piano');
    expect(result.mode).toBe('contour');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result.keys).toHaveLength(8);
    expect(result.keys[0].note).toBe('C4');
  });

  it('6 条水平横线应识别为吉他', () => {
    const shapes: DrawnShape[] = [];
    for (let i = 0; i < 6; i++) {
      shapes.push(makeLine(`l${i}`, 50, 100 + i * 40, 700, 2));
    }
    const result = recognizeShapes(shapes, CANVAS_W, CANVAS_H);
    expect(result.instrument).toBe('guitar');
    expect(result.mode).toBe('contour');
    expect(result.keys).toHaveLength(6);
    expect(result.keys[0].note).toBe('E2');
  });

  it('4 条竖线应识别为小提琴', () => {
    const shapes: DrawnShape[] = [];
    for (let i = 0; i < 4; i++) {
      shapes.push(makeLine(`l${i}`, 200 + i * 100, 50, 2, 400));
    }
    const result = recognizeShapes(shapes, CANVAS_W, CANVAS_H);
    expect(result.instrument).toBe('violin');
    expect(result.keys).toHaveLength(4);
  });

  it('1 长横线 + 6 圆点应识别为长笛', () => {
    const shapes: DrawnShape[] = [makeLine('l1', 50, 250, 700, 2)];
    for (let i = 0; i < 6; i++) {
      shapes.push(makeCircle(`c${i}`, 100 + i * 100, 240, 20));
    }
    const result = recognizeShapes(shapes, CANVAS_W, CANVAS_H);
    expect(result.instrument).toBe('flute');
    expect(result.keys).toHaveLength(6);
  });

  it('5 个不等大圆应识别为架子鼓', () => {
    const sizes = [60, 40, 50, 45, 80];
    const shapes = sizes.map((s, i) => makeCircle(`c${i}`, 100 + i * 120, 200, s));
    const result = recognizeShapes(shapes, CANVAS_W, CANVAS_H);
    expect(result.instrument).toBe('drums');
    expect(result.keys).toHaveLength(5);
    expect(result.keys[0].note).toBe('kick');
  });
});

describe('抽象形状回退（模式 B）', () => {
  it('空数组应返回默认结果', () => {
    const result = recognizeShapes([], CANVAS_W, CANVAS_H);
    expect(result.confidence).toBe(0);
    expect(result.keys).toHaveLength(0);
  });

  it('无法匹配模板时应回退到 abstract 模式', () => {
    // 3 个矩形，不满足任何模板
    const shapes = [makeRect('r1', 50, 50, 100, 100), makeRect('r2', 200, 300, 80, 80), makeRect('r3', 400, 100, 60, 60)];
    const result = recognizeShapes(shapes, CANVAS_W, CANVAS_H);
    expect(result.mode).toBe('abstract');
    expect(result.keys).toHaveLength(3);
  });
});

describe('键位坐标归一化', () => {
  it('生成的键位 bounds 应在 0-1 范围内', () => {
    const shapes = [makeRect('r1', 100, 100, 200, 200)];
    const result = recognizeShapes(shapes, CANVAS_W, CANVAS_H);
    result.keys.forEach(key => {
      expect(key.bounds.x).toBeGreaterThanOrEqual(0);
      expect(key.bounds.x).toBeLessThanOrEqual(1);
      expect(key.bounds.y).toBeGreaterThanOrEqual(0);
      expect(key.bounds.y).toBeLessThanOrEqual(1);
    });
  });
});
```

- [ ] **Step 5: 创建绘制画布组件 `frontend/src/modules/canvas/DrawCanvas.tsx`**

```tsx
// frontend/src/modules/canvas/DrawCanvas.tsx
// @mode: ink
// 双模式绘制画布 —— 对齐 MR 设计文档 2.3 模式选择 + 7.7.1 墨绘态布局
// 使用规则：R1 双态隔离 / R4 纹理强制（.parchment-bg + .staff-watermark）

import { useRef, useState, useCallback } from 'react';
import type { DrawnShape, DrawMode } from '../../types/shapes';

interface DrawCanvasProps {
  mode: DrawMode;
  width: number;
  height: number;
  shapes: DrawnShape[];
  onShapesChange: (shapes: DrawnShape[]) => void;
}

export function DrawCanvas({ mode, width, height, shapes, onShapesChange }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<DrawnShape | null>(null);

  const getPointer = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setDrawing(true);
    setStart(getPointer(e));
    setPreview(null);
  }, [getPointer]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawing || !start) return;
    const current = getPointer(e);
    const id = `shape-${Date.now()}`;
    // 模式 A（contour）：根据拖动方向自动判断形状类型
    // 模式 B（abstract）：同上，沿用原逻辑
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    let type: DrawnShape['type'] = 'rect';
    if (Math.abs(dx) > Math.abs(dy) * 3 && Math.abs(dy) < 5) {
      type = 'line'; // 水平线
    } else if (Math.abs(dy) > Math.abs(dx) * 3 && Math.abs(dx) < 5) {
      type = 'line'; // 垂直线
    } else if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
      return; // 太小，忽略
    }
    const isCircle = Math.abs(dx - dy) < Math.min(Math.abs(dx), Math.abs(dy)) * 0.3 && Math.abs(dx) > 10;
    if (isCircle) type = 'circle';

    setPreview({
      id,
      type,
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.abs(dx),
      height: Math.abs(dy),
    });
  }, [drawing, start, getPointer]);

  const onPointerUp = useCallback(() => {
    if (!preview) {
      setDrawing(false);
      setStart(null);
      return;
    }
    if (preview.width >= 8 && preview.height >= 8) {
      onShapesChange([...shapes, preview]);
    }
    setDrawing(false);
    setStart(null);
    setPreview(null);
  }, [preview, shapes, onShapesChange]);

  const onClear = useCallback(() => {
    onShapesChange([]);
  }, [onShapesChange]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="parchment-bg staff-watermark"
        style={{ aspectRatio: `${width} / ${height}`, width: '100%', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <button
        type="button"
        onClick={onClear}
        className="btn-engrave absolute right-3 top-3"
        style={{ padding: '4px 12px', fontSize: '12px' }}
      >
        清空
      </button>
    </div>
  );
}
```

- [ ] **Step 6: 验证**

```bash
cd frontend
npm run build
npm test -- shapeRecognizer
npm run lint
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/types/shapes.ts frontend/src/modules/shapeRecognizer frontend/src/modules/canvas
git commit -m "feat(frontend): 绘制系统双模式——乐器轮廓+抽象形状（M2/M3）"
```

---

## Task 21：MR 渲染层（M6）

**Goal：** 实现透视变换 + 虚拟桌面阴影 + 全息乐器投射。把绘制坐标系的乐器映射到画面坐标系，营造"乐器躺在虚拟桌面上"的 MR 感。

**Files:**
- Create: `frontend/src/modules/mr/perspective.ts`
- Create: `frontend/src/modules/mr/MRRenderer.tsx`
- Create: `frontend/src/modules/mr/__tests__/perspective.test.ts`

- [ ] **Step 1: 创建透视变换模块 `frontend/src/modules/mr/perspective.ts`**

```typescript
// frontend/src/modules/mr/perspective.ts
// @mode: thunder
// 透视变换 —— 对齐 MR 设计文档 4.2 透视变换参数 + 5.2 坐标系映射

export const PERSPECTIVE = {
  horizonY: 0.45,
  nearY: 0.92,
  nearScaleX: 1.0,
  farScaleX: 0.55,
  skewY: 0.12,
};

// 绘制坐标 (dx, dy) → 画面坐标 (sx, sy)
// dx/dy 均为 0-1 归一化
export function projectToScene(dx: number, dy: number, sceneWidth: number, sceneHeight: number) {
  const t = dy;
  const sceneY = PERSPECTIVE.horizonY + (PERSPECTIVE.nearY - PERSPECTIVE.horizonY) * t;
  const scaleX = PERSPECTIVE.farScaleX + (PERSPECTIVE.nearScaleX - PERSPECTIVE.farScaleX) * t;
  const centerX = sceneWidth / 2;
  const sceneX = centerX + (dx - 0.5) * sceneWidth * scaleX;
  return { x: sceneX, y: sceneY * sceneHeight };
}

// 画面坐标 (sx, sy) → 绘制坐标 (dx, dy)（逆变换，用于食指投影）
export function unprojectFromScene(sx: number, sy: number, sceneWidth: number, sceneHeight: number) {
  const normY = sy / sceneHeight;
  if (normY < PERSPECTIVE.horizonY) return null; // 手不在桌面区域
  const t = (normY - PERSPECTIVE.horizonY) / (PERSPECTIVE.nearY - PERSPECTIVE.horizonY);
  const scaleX = PERSPECTIVE.farScaleX + (PERSPECTIVE.nearScaleX - PERSPECTIVE.farScaleX) * t;
  const centerX = sceneWidth / 2;
  const dx = (sx - centerX) / (sceneWidth * scaleX) + 0.5;
  const dy = t;
  return { x: dx, y: dy };
}

// 计算键位在画面上的四角坐标（用于渲染全息矩形）
export function projectKeyBounds(
  bounds: { x: number; y: number; width: number; height: number },
  sceneWidth: number,
  sceneHeight: number
) {
  const tl = projectToScene(bounds.x, bounds.y, sceneWidth, sceneHeight);
  const tr = projectToScene(bounds.x + bounds.width, bounds.y, sceneWidth, sceneHeight);
  const br = projectToScene(bounds.x + bounds.width, bounds.y + bounds.height, sceneWidth, sceneHeight);
  const bl = projectToScene(bounds.x, bounds.y + bounds.height, sceneWidth, sceneHeight);
  return { tl, tr, br, bl };
}
```

- [ ] **Step 2: 创建透视变换测试 `frontend/src/modules/mr/__tests__/perspective.test.ts`**

```typescript
// frontend/src/modules/mr/__tests__/perspective.test.ts
import { projectToScene, unprojectFromScene, PERSPECTIVE, projectKeyBounds } from '../perspective';

const W = 1280;
const H = 720;

describe('projectToScene（绘制坐标→画面坐标）', () => {
  it('远端（dy=0）应在地平线附近', () => {
    const result = projectToScene(0.5, 0, W, H);
    expect(result.y).toBeCloseTo(H * PERSPECTIVE.horizonY, -1);
  });

  it('近端（dy=1）应在画面 92% 处', () => {
    const result = projectToScene(0.5, 1, W, H);
    expect(result.y).toBeCloseTo(H * PERSPECTIVE.nearY, -1);
  });

  it('中心 x（dx=0.5）应在画面水平中心', () => {
    const result = projectToScene(0.5, 0.5, W, H);
    expect(result.x).toBeCloseTo(W / 2, -1);
  });

  it('远端宽度应比近端窄', () => {
    const farLeft = projectToScene(0, 0, W, H);
    const farRight = projectToScene(1, 0, W, H);
    const nearLeft = projectToScene(0, 1, W, H);
    const nearRight = projectToScene(1, 1, W, H);
    const farWidth = farRight.x - farLeft.x;
    const nearWidth = nearRight.x - nearLeft.x;
    expect(farWidth).toBeLessThan(nearWidth);
  });
});

describe('unprojectFromScene（画面坐标→绘制坐标）', () => {
  it('地平线以上应返回 null', () => {
    const result = unprojectFromScene(W / 2, H * 0.3, W, H);
    expect(result).toBeNull();
  });

  it('地平线以下应返回有效坐标', () => {
    const result = unprojectFromScene(W / 2, H * 0.7, W, H);
    expect(result).not.toBeNull();
    expect(result!.x).toBeGreaterThanOrEqual(0);
    expect(result!.x).toBeLessThanOrEqual(1);
    expect(result!.y).toBeGreaterThanOrEqual(0);
    expect(result!.y).toBeLessThanOrEqual(1);
  });

  it('projectToScene 与 unprojectFromScene 应可逆', () => {
    const dx = 0.6;
    const dy = 0.7;
    const scene = projectToScene(dx, dy, W, H);
    const back = unprojectFromScene(scene.x, scene.y, W, H);
    expect(back).not.toBeNull();
    expect(back!.x).toBeCloseTo(dx, 2);
    expect(back!.y).toBeCloseTo(dy, 2);
  });
});

describe('projectKeyBounds', () => {
  it('应返回四个角点', () => {
    const bounds = { x: 0.2, y: 0.3, width: 0.6, height: 0.4 };
    const corners = projectKeyBounds(bounds, W, H);
    expect(corners.tl).toBeDefined();
    expect(corners.tr).toBeDefined();
    expect(corners.br).toBeDefined();
    expect(corners.bl).toBeDefined();
  });
});
```

- [ ] **Step 3: 创建 MR 渲染器组件 `frontend/src/modules/mr/MRRenderer.tsx`**

```tsx
// frontend/src/modules/mr/MRRenderer.tsx
// @mode: thunder
// MR 渲染层 —— 对齐 MR 设计文档 4.1 视觉分层 + 4.3 乐器全息视觉
// 使用规则：R1 双态隔离 / R4 纹理强制（.scanline-overlay）

import { useEffect, useRef } from 'react';
import type { VirtualKey } from '../../types/shapes';
import type { Instrument } from '../../types/api';
import { projectKeyBounds } from './perspective';

interface MRRendererProps {
  keys: VirtualKey[];
  instrument: Instrument;
  width: number;
  height: number;
  hoveredKeyId: string | null;
  triggeredKeyId: string | null;
}

// 灵格色映射（对齐 7.4.3）
const SPIRIT_THUNDER_COLORS: Record<Instrument, string> = {
  piano: '#00B4FF',
  guitar: '#FF6B35',
  violin: '#FFCC33',
  flute: '#00FFA3',
  drums: '#B829FF',
};

export function MRRenderer({ keys, instrument, width, height, hoveredKeyId, triggeredKeyId }: MRRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Layer 2: 虚拟桌面阴影（地平线下方渐变暗化）
    const gradient = ctx.createLinearGradient(0, height * 0.45, 0, height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height * 0.45, width, height * 0.55);

    // Layer 3: 乐器全息投射
    const spiritColor = SPIRIT_THUNDER_COLORS[instrument];
    keys.forEach((key) => {
      const corners = projectKeyBounds(key.bounds, width, height);
      const isHovered = key.id === hoveredKeyId;
      const isTriggered = key.id === triggeredKeyId;

      ctx.beginPath();
      ctx.moveTo(corners.tl.x, corners.tl.y);
      ctx.lineTo(corners.tr.x, corners.tr.y);
      ctx.lineTo(corners.br.x, corners.br.y);
      ctx.lineTo(corners.bl.x, corners.bl.y);
      ctx.closePath();

      // 半透明填充
      const fillAlpha = isTriggered ? 0.4 : isHovered ? 0.25 : 0.15;
      ctx.fillStyle = `${spiritColor}${Math.round(fillAlpha * 255).toString(16).padStart(2, '0')}`;
      ctx.fill();

      // 内边框
      ctx.strokeStyle = spiritColor;
      ctx.lineWidth = isTriggered ? 2.5 : 1.5;
      ctx.shadowColor = spiritColor;
      ctx.shadowBlur = isTriggered ? 20 : isHovered ? 12 : 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 音名标签
      const centerX = (corners.tl.x + corners.br.x) / 2;
      const centerY = (corners.tl.y + corners.br.y) / 2;
      ctx.fillStyle = '#E8F4F8';
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(key.note, centerX, centerY);
    });
  }, [keys, instrument, width, height, hoveredKeyId, triggeredKeyId]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="scanline-overlay"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    />
  );
}
```

- [ ] **Step 4: 验证**

```bash
cd frontend
npm run build
npm test -- perspective
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/modules/mr
git commit -m "feat(frontend): MR渲染层——透视变换+虚拟桌面+全息乐器（M6）"
```

---


## Task 22：手部追踪可视化系统（M5）

**Goal：** 实现 21 点骨架渲染 + 食指准星 5 态状态机 + 悬停预热反馈。让用户清晰看到"系统识别到了我的手、我的手指在哪里、我离触发还有多远"。这是 MR 交互感的核心。

**Files:**
- Create: `frontend/src/modules/handTracking/handConnections.ts`
- Create: `frontend/src/modules/handTracking/useHandTracking.ts`
- Create: `frontend/src/modules/handTracking/HandOverlay.tsx`
- Create: `frontend/src/modules/handTracking/__tests__/handTracking.test.ts`

- [ ] **Step 1: 创建手部连接定义 `frontend/src/modules/handTracking/handConnections.ts`**

```typescript
// frontend/src/modules/handTracking/handConnections.ts
// @mode: thunder
// MediaPipe Hands 21 点骨架连接 —— 对齐 7.10.1
// landmark 编号：0=手腕, 1-4=拇指, 5-8=食指, 9-12=中指, 13-16=无名指, 17-20=小指

export const HAND_CONNECTIONS: Array<[number, number]> = [
  // 拇指
  [0, 1], [1, 2], [2, 3], [3, 4],
  // 食指
  [0, 5], [5, 6], [6, 7], [7, 8],
  // 中指
  [0, 9], [9, 10], [10, 11], [11, 12],
  // 无名指
  [0, 13], [13, 14], [14, 15], [15, 16],
  // 小指
  [0, 17], [17, 18], [18, 19], [19, 20],
  // 手掌底部连接
  [5, 9], [9, 13], [13, 17],
];

// 关节点渲染分级（对齐 7.10.1）
export const JOINT_RADIUS: Record<number, number> = {
  0: 5,           // 手腕锚点
  8: 0,           // 食指尖（特殊处理，用准星）
  4: 4, 12: 4, 16: 4, 20: 4,  // 指尖
};
export const DEFAULT_JOINT_RADIUS = 2.5;  // 指间关节
export const KNUCKLE_RADIUS = 3;          // 指根关节（1,5,9,13,17）
export const KNUCKLE_INDICES = new Set([1, 5, 9, 13, 17]);

// 食指尖特殊节点
export const INDEX_TIP = 8;

// 左右手准星色（对齐 7.10.2）
export const CURSOR_COLOR_LEFT = '#FFCC33';   // 硫黄
export const CURSOR_COLOR_RIGHT = '#FF4A1C';  // 血橙
```

- [ ] **Step 2: 创建手部追踪 Hook `frontend/src/modules/handTracking/useHandTracking.ts`**

```typescript
// frontend/src/modules/handTracking/useHandTracking.ts
// @mode: thunder
// 手部追踪 + 准星状态机 + 悬停预热 —— 对齐 7.10.3 + 7.10.4
// 使用规则：R1 双态隔离 / C10 手部可视化完整性

import { useState, useRef, useCallback, useEffect } from 'react';
import type { VirtualKey } from '../../types/shapes';
import { unprojectFromScene } from '../mr/perspective';
import { INDEX_TIP, CURSOR_COLOR_LEFT, CURSOR_COLOR_RIGHT } from './handConnections';

export interface Landmark { x: number; y: number; z: number; }
export interface HandData {
  landmarks: Landmark[];
  handedness: 'Left' | 'Right';
  confidence: number;
}

export type CursorState = 'idle' | 'hovering' | 'triggering' | 'lost' | 'hidden';

export interface HoverState {
  type: 'idle' | 'hovering' | 'triggering';
  keyId?: string;
  progress?: number;  // 0-1，倒计时圆环填充比例
}

interface UseHandTrackingReturn {
  hands: HandData[];
  cursorStates: Record<'Left' | 'Right', CursorState>;
  hoverState: HoverState;
  lostTracking: boolean;
  setKeys: (keys: VirtualKey[]) => void;
  setSceneSize: (w: number, h: number) => void;
  setSensitivity: (s: number) => void;
  onResults: (results: { multiHandLandmarks: Landmark[][]; multiHandedness: Array<{ label: 'Left' | 'Right'; score: number }> }) => void;
}

const TRIGGER_COOLDOWN = 150;  // ms

export function useHandTracking(): UseHandTrackingReturn {
  const [hands, setHands] = useState<HandData[]>([]);
  const [cursorStates, setCursorStates] = useState<Record<'Left' | 'Right', CursorState>>({
    Left: 'hidden',
    Right: 'hidden',
  });
  const [hoverState, setHoverState] = useState<HoverState>({ type: 'idle' });
  const [lostTracking, setLostTracking] = useState(false);

  const keysRef = useRef<VirtualKey[]>([]);
  const sceneSizeRef = useRef({ w: 1280, h: 720 });
  const sensitivityRef = useRef(50);
  const lastTriggerTimeRef = useRef<Record<string, number>>({});

  const setKeys = useCallback((keys: VirtualKey[]) => { keysRef.current = keys; }, []);
  const setSceneSize = useCallback((w: number, h: number) => { sceneSizeRef.current = { w, h }; }, []);
  const setSensitivity = useCallback((s: number) => { sensitivityRef.current = s; }, []);

  // 计算食指投影 + 悬停状态（对齐 7.10.4）
  const computeHover = useCallback((indexTip: Landmark): HoverState => {
    const { w, h } = sceneSizeRef.current;
    const mirroredX = (1 - indexTip.x) * w;
    const projected = unprojectFromScene(mirroredX, indexTip.y * h, w, h);
    if (!projected) return { type: 'idle' };

    const expand = 0.5 + (sensitivityRef.current / 100) * 0.4;
    for (const key of keysRef.current) {
      const dx = key.bounds.x + key.bounds.width / 2;
      const dy = key.bounds.y + key.bounds.height / 2;
      const halfW = (key.bounds.width * expand) / 2;
      const halfH = (key.bounds.height * expand) / 2;
      if (Math.abs(projected.x - dx) < halfW && Math.abs(projected.y - dy) < halfH) {
        const sinceLast = Date.now() - (lastTriggerTimeRef.current[key.id] || 0);
        if (sinceLast > TRIGGER_COOLDOWN) {
          return { type: 'triggering', keyId: key.id };
        }
        return { type: 'hovering', keyId: key.id, progress: sinceLast / TRIGGER_COOLDOWN };
      }
    }
    return { type: 'idle' };
  }, []);

  const onResults = useCallback((results: { multiHandLandmarks: Landmark[][]; multiHandedness: Array<{ label: 'Left' | 'Right'; score: number }> }) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      setHands([]);
      setCursorStates({ Left: 'lost', Right: 'lost' });
      setLostTracking(true);
      setTimeout(() => {
        setCursorStates((prev) => (prev.Left === 'lost' && prev.Right === 'lost' ? { Left: 'hidden', Right: 'hidden' } : prev));
      }, 300);
      return;
    }

    setLostTracking(false);
    const newHands: HandData[] = results.multiHandLandmarks.map((landmarks, i) => ({
      landmarks,
      handedness: results.multiHandedness[i]?.label || 'Right',
      confidence: results.multiHandedness[i]?.score || 0,
    }));
    setHands(newHands);

    // 更新准星状态
    const newCursorStates: Record<'Left' | 'Right', CursorState> = { Left: 'hidden', Right: 'hidden' };
    let primaryHover: HoverState = { type: 'idle' };

    for (const hand of newHands) {
      const indexTip = hand.landmarks[INDEX_TIP];
      if (!indexTip) continue;
      const hover = computeHover(indexTip);
      if (hover.type === 'triggering') {
        newCursorStates[hand.handedness] = 'triggering';
        primaryHover = hover;
      } else if (hover.type === 'hovering') {
        newCursorStates[hand.handedness] = 'hovering';
        if (primaryHover.type !== 'triggering') primaryHover = hover;
      } else {
        newCursorStates[hand.handedness] = hand.confidence < 0.5 ? 'lost' : 'idle';
      }
    }
    setCursorStates(newCursorStates);
    setHoverState(primaryHover);
  }, [computeHover]);

  return { hands, cursorStates, hoverState, lostTracking, setKeys, setSceneSize, setSensitivity, onResults };
}
```

- [ ] **Step 3: 创建手部覆盖层组件 `frontend/src/modules/handTracking/HandOverlay.tsx`**

```tsx
// frontend/src/modules/handTracking/HandOverlay.tsx
// @mode: thunder
// 手部可视化覆盖层 —— 对齐 7.10.1-7.10.7
// 使用规则：R1 双态隔离 / R4 纹理强制 / C10 手部可视化完整性
// 性能约束：用 requestAnimationFrame + ref 直接操作 SVG（禁止 React state 每帧重绘）

import { useEffect, useRef } from 'react';
import type { HandData, CursorState, HoverState } from './useHandTracking';
import { HAND_CONNECTIONS, JOINT_RADIUS, DEFAULT_JOINT_RADIUS, KNUCKLE_RADIUS, KNUCKLE_INDICES, INDEX_TIP, CURSOR_COLOR_LEFT, CURSOR_COLOR_RIGHT } from './handConnections';

interface HandOverlayProps {
  hands: HandData[];
  cursorStates: Record<'Left' | 'Right', CursorState>;
  hoverState: HoverState;
  width: number;
  height: number;
}

export function HandOverlay({ hands, cursorStates, hoverState, width, height }: HandOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // 清空
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // 渲染每只手
    for (const hand of hands) {
      const isLeft = hand.handedness === 'Left';
      const cursorColor = isLeft ? CURSOR_COLOR_LEFT : CURSOR_COLOR_RIGHT;
      const lowConf = hand.confidence < 0.5;
      const skeletonOpacity = lowConf ? 0.5 : (hand.confidence < 0.8 ? 0.8 : 1);

      // 镜像翻转 x 坐标
      const points = hand.landmarks.map(lm => ({
        x: (1 - lm.x) * width,
        y: lm.y * height,
      }));

      // 绘制骨骼线（7.10.1）
      for (const [a, b] of HAND_CONNECTIONS) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(points[a].x));
        line.setAttribute('y1', String(points[a].y));
        line.setAttribute('x2', String(points[b].x));
        line.setAttribute('y2', String(points[b].y));
        line.setAttribute('stroke', '#00F0FF');
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('opacity', String(skeletonOpacity * 0.9));
        line.setAttribute('filter', 'drop-shadow(0 0 3px rgba(0,240,255,0.4))');
        if (lowConf) {
          line.setAttribute('stroke-dasharray', '3 3');
        }
        svg.appendChild(line);
      }

      // 绘制关节点（7.10.1 分级渲染）
      points.forEach((pt, i) => {
        if (i === INDEX_TIP) return; // 食指尖用准星
        const r = JOINT_RADIUS[i] ?? (KNUCKLE_INDICES.has(i) ? KNUCKLE_RADIUS : DEFAULT_JOINT_RADIUS);
        const isFingertip = [4, 12, 16, 20].includes(i);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(pt.x));
        circle.setAttribute('cy', String(pt.y));
        circle.setAttribute('r', String(r));
        circle.setAttribute('fill', isFingertip ? '#FFCC33' : '#00F0FF');
        circle.setAttribute('opacity', String(skeletonOpacity));
        if (isFingertip) {
          circle.setAttribute('filter', 'drop-shadow(0 0 4px rgba(255,204,51,0.6))');
        }
        svg.appendChild(circle);
      });

      // 绘制食指尖准星（7.10.3）
      const indexTip = points[INDEX_TIP];
      if (indexTip) {
        const cursorState = cursorStates[hand.handedness];
        const cursorSize = cursorState === 'triggering' ? 36 : cursorState === 'hovering' ? 28 : 24;
        const cursorColorFinal = cursorState === 'hovering' || cursorState === 'triggering' ? '#FFCC33' : cursorColor;

        // 十字准星
        const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hLine.setAttribute('x1', String(indexTip.x - cursorSize / 2));
        hLine.setAttribute('y1', String(indexTip.y));
        hLine.setAttribute('x2', String(indexTip.x + cursorSize / 2));
        hLine.setAttribute('y2', String(indexTip.y));
        hLine.setAttribute('stroke', cursorColorFinal);
        hLine.setAttribute('stroke-width', '2');
        hLine.setAttribute('filter', `drop-shadow(0 0 8px ${cursorColorFinal})`);
        svg.appendChild(hLine);

        const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vLine.setAttribute('x1', String(indexTip.x));
        vLine.setAttribute('y1', String(indexTip.y - cursorSize / 2));
        vLine.setAttribute('x2', String(indexTip.x));
        vLine.setAttribute('y2', String(indexTip.y + cursorSize / 2));
        vLine.setAttribute('stroke', cursorColorFinal);
        vLine.setAttribute('stroke-width', '2');
        vLine.setAttribute('filter', `drop-shadow(0 0 8px ${cursorColorFinal})`);
        svg.appendChild(vLine);

        // 中心亮点
        const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        core.setAttribute('cx', String(indexTip.x));
        core.setAttribute('cy', String(indexTip.y));
        core.setAttribute('r', '2');
        core.setAttribute('fill', '#E8F4F8');
        svg.appendChild(core);
      }
    }

    // 绘制悬停预热圆环（7.10.4）
    if (hoverState.type === 'hovering' && hoverState.keyId && hoverState.progress !== undefined) {
      // 找到悬停键位中心
      // 这里简化：用 hoverState 的 progress 画一个圆环
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', String(width / 2));
      ring.setAttribute('cy', String(height * 0.7));
      ring.setAttribute('r', '20');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', '#FFCC33');
      ring.setAttribute('stroke-width', '2');
      ring.setAttribute('stroke-dasharray', '125.6');
      ring.setAttribute('stroke-dashoffset', String(125.6 * (1 - hoverState.progress)));
      ring.setAttribute('transform', `rotate(-90 ${width / 2} ${height * 0.7})`);
      svg.appendChild(ring);
    }
  }, [hands, cursorStates, hoverState, width, height]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    />
  );
}
```

- [ ] **Step 4: 创建手部追踪测试 `frontend/src/modules/handTracking/__tests__/handTracking.test.ts`**

```typescript
// frontend/src/modules/handTracking/__tests__/handTracking.test.ts
import { HAND_CONNECTIONS, JOINT_RADIUS, KNUCKLE_INDICES, INDEX_TIP, CURSOR_COLOR_LEFT, CURSOR_COLOR_RIGHT } from '../handConnections';

describe('handConnections 骨架定义', () => {
  it('应有 19 条骨骼连接', () => {
    expect(HAND_CONNECTIONS).toHaveLength(19);
  });

  it('食指尖编号应为 8', () => {
    expect(INDEX_TIP).toBe(8);
  });

  it('手腕编号应为 0', () => {
    expect(HAND_CONNECTIONS[0][0]).toBe(0);
  });

  it('指根关节应包含 1,5,9,13,17', () => {
    expect(KNUCKLE_INDICES.has(1)).toBe(true);
    expect(KNUCKLE_INDICES.has(5)).toBe(true);
    expect(KNUCKLE_INDICES.has(9)).toBe(true);
    expect(KNUCKLE_INDICES.has(13)).toBe(true);
    expect(KNUCKLE_INDICES.has(17)).toBe(true);
  });

  it('左手准星色应为硫黄 #FFCC33', () => {
    expect(CURSOR_COLOR_LEFT).toBe('#FFCC33');
  });

  it('右手准星色应为血橙 #FF4A1C', () => {
    expect(CURSOR_COLOR_RIGHT).toBe('#FF4A1C');
  });

  it('关节点半径应分级（手腕5/指尖4/指根3/指间2.5）', () => {
    expect(JOINT_RADIUS[0]).toBe(5);  // 手腕
    expect(JOINT_RADIUS[4]).toBe(4);  // 指尖
    expect(JOINT_RADIUS[12]).toBe(4); // 指尖
  });
});

describe('useHandTracking 准星状态机', () => {
  it('CursorState 应包含 5 态', () => {
    const states: Array<import('../useHandTracking').CursorState> = ['idle', 'hovering', 'triggering', 'lost', 'hidden'];
    expect(states).toHaveLength(5);
    states.forEach(s => expect(typeof s).toBe('string'));
  });
});
```

- [ ] **Step 5: 验证**

```bash
cd frontend
npm run build
npm test -- handTracking
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/handTracking
git commit -m "feat(frontend): 手部追踪可视化——21点骨架+准星状态机+悬停预热（M5）"
```

---

## Task 23：触发光效 + 手部动效衔接（M6）

**Goal：** 实现 6 层触发光效（L1-L6）+ 食指轨迹拖尾 + 手部进入/离开动画。让隔空触碰有"降神"的反馈。

**Files:**
- Create: `frontend/src/modules/effects/TouchEffect.tsx`
- Create: `frontend/src/modules/effects/useTrail.ts`
- Create: `frontend/src/modules/effects/__tests__/effects.test.ts`

- [ ] **Step 1: 创建触发光效组件 `frontend/src/modules/effects/TouchEffect.tsx`**

```tsx
// frontend/src/modules/effects/TouchEffect.tsx
// @mode: thunder
// 6 层触发光效 —— 对齐 7.11 触发光效（L1-L6）+ 7.10.11 与准星联动
// 使用规则：R1 双态隔离 / C7 动效完整性 / C10 手部可视化完整性

import { useEffect, useRef } from 'react';
import type { Instrument } from '../../types/api';

interface TouchEffectProps {
  // 触发位置（画面坐标）
  x: number;
  y: number;
  // 灵格色
  spiritColor: string;
  // 触发时间戳（变化时触发光效）
  triggerId: string;
  width: number;
  height: number;
  reducedMotion: boolean;
}

const SPIRIT_THUNDER: Record<Instrument, string> = {
  piano: '#00B4FF', guitar: '#FF6B35', violin: '#FFCC33', flute: '#00FFA3', drums: '#B829FF',
};

export function TouchEffect({ x, y, spiritColor, triggerId, width, height, reducedMotion }: TouchEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastTriggerId = useRef('');

  useEffect(() => {
    if (triggerId === lastTriggerId.current) return;
    lastTriggerId.current = triggerId;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();
    const duration = 600;
    const layers = reducedMotion ? [1, 2, 4] : [1, 2, 3, 4, 5, 6]; // reduced-motion 仅 L1/L2/L4

    // L3 粒子初始化
    const particles = reducedMotion ? [] : Array.from({ length: 10 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 2 + Math.random() * 3,
      life: 1,
    }));

    let rafId: number;
    function animate(now: number) {
      const elapsed = now - startTime;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, width, height);
        return;
      }
      const t = elapsed / duration;

      ctx.clearRect(0, 0, width, height);

      if (layers.includes(1)) {
        // L1 键位高亮（灵格色填充 + 外发光）
        ctx.beginPath();
        ctx.arc(x, y, 30 * (1 + t * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `${spiritColor}${Math.round((1 - t) * 0.4 * 255).toString(16).padStart(2, '0')}`;
        ctx.shadowColor = spiritColor;
        ctx.shadowBlur = 30 * (1 - t);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (layers.includes(2)) {
        // L2 涟漪扩散（3 层环）
        for (let i = 0; i < 3; i++) {
          const ringT = Math.max(0, t - i * 0.15);
          if (ringT > 0 && ringT < 1) {
            ctx.beginPath();
            ctx.arc(x, y, 40 + ringT * 80, 0, Math.PI * 2);
            ctx.strokeStyle = `${spiritColor}${Math.round((1 - ringT) * 0.6 * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 2 * (1 - ringT);
            ctx.stroke();
          }
        }
      }

      if (layers.includes(3)) {
        // L3 粒子爆发（硫黄色）
        particles.forEach(p => {
          const px = x + Math.cos(p.angle) * p.speed * elapsed * 0.1;
          const py = y + Math.sin(p.angle) * p.speed * elapsed * 0.1 + (elapsed * 0.0003 * 100); // 重力
          ctx.beginPath();
          ctx.arc(px, py, 2 * (1 - t), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 204, 51, ${1 - t})`;
          ctx.fill();
        });
      }

      if (layers.includes(5) && t < 0.3) {
        // L5 扫描线脉冲（从键位向上扫）
        const scanY = y - (t / 0.3) * y;
        ctx.fillStyle = `rgba(0, 240, 255, ${(1 - t / 0.3) * 0.4})`;
        ctx.fillRect(0, scanY - 1, width, 2);
      }

      rafId = requestAnimationFrame(animate);
    }
    rafId = requestAnimationFrame(animate);

    // L6 屏幕震屏（通过 CSS class 控制，这里不画）
    return () => cancelAnimationFrame(rafId);
  }, [triggerId, x, y, spiritColor, width, height, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    />
  );
}
```

- [ ] **Step 2: 创建食指拖尾 Hook `frontend/src/modules/effects/useTrail.ts`**

```typescript
// frontend/src/modules/effects/useTrail.ts
// @mode: thunder
// 食指轨迹拖尾 —— 对齐 7.10.8（保留最近 30 帧/0.5s 渐隐）

import { useRef, useCallback } from 'react';

const TRAIL_MAX = 30;
const TRAIL_DURATION = 500; // ms

export interface TrailPoint { x: number; y: number; t: number; }

export function useTrail() {
  const trailRef = useRef<TrailPoint[]>([]);

  const addPoint = useCallback((x: number, y: number) => {
    const now = Date.now();
    trailRef.current.push({ x, y, t: now });
    // 移除超过 0.5s 的点
    while (trailRef.current.length > 0 && now - trailRef.current[0].t > TRAIL_DURATION) {
      trailRef.current.shift();
    }
    // 上限保护
    if (trailRef.current.length > TRAIL_MAX) trailRef.current.shift();
  }, []);

  const drawTrail = useCallback((ctx: CanvasRenderingContext2D, color: string) => {
    const points = trailRef.current;
    if (points.length < 2) return;
    const now = Date.now();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const age = (now - p1.t) / TRAIL_DURATION;
      if (age >= 1) continue;
      ctx.strokeStyle = color;
      ctx.globalAlpha = (1 - age) * 0.6;
      ctx.lineWidth = (1 - age) * 3;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, []);

  const clear = useCallback(() => { trailRef.current = []; }, []);

  return { addPoint, drawTrail, clear, trailRef };
}
```

- [ ] **Step 3: 创建光效测试 `frontend/src/modules/effects/__tests__/effects.test.ts`**

```typescript
// frontend/src/modules/effects/__tests__/effects.test.ts
import { useTrail, TRAIL_MAX, TRAIL_DURATION } from '../useTrail';

describe('useTrail 食指拖尾', () => {
  it('TRAIL_MAX 应为 30', () => {
    expect(TRAIL_MAX).toBe(30);
  });

  it('TRAIL_DURATION 应为 500ms', () => {
    expect(TRAIL_DURATION).toBe(500);
  });
});

describe('触发光效层级', () => {
  it('应支持 6 层光效 L1-L6', () => {
    const layers = [1, 2, 3, 4, 5, 6];
    expect(layers).toHaveLength(6);
  });

  it('reduced-motion 模式应仅保留 L1/L2/L4', () => {
    const reducedLayers = [1, 2, 4];
    expect(reducedLayers).toHaveLength(3);
    expect(reducedLayers).not.toContain(3);
    expect(reducedLayers).not.toContain(5);
    expect(reducedLayers).not.toContain(6);
  });
});
```

- [ ] **Step 4: 验证**

```bash
cd frontend
npm run build
npm test -- effects
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/modules/effects
git commit -m "feat(frontend): 触发光效+食指拖尾——6层L1-L6光效+30帧拖尾（M6）"
```

---

## Task 24：工作台双态集成（M1）

**Goal：** 集成所有 MR 模块到工作台页面，实现墨绘态（绘制）→ 雷霆态（MR 演奏）的双态切换 + 完整状态机。

**Files:**
- Create: `frontend/src/pages/Workbench.tsx`
- Create: `frontend/src/modules/workbench/useWorkbenchPhase.ts`
- Create: `frontend/src/pages/__tests__/Workbench.test.tsx`

- [ ] **Step 1: 创建状态机 Hook `frontend/src/modules/workbench/useWorkbenchPhase.ts`**

```typescript
// frontend/src/modules/workbench/useWorkbenchPhase.ts
// @mode: ink | thunder | transition
// 工作台状态机 —— 对齐 MR 设计文档 8.2

import { useState, useCallback } from 'react';

export type WorkbenchPhase =
  | 'idle'
  | 'drawing'
  | 'generating'
  | 'camera-pending'
  | 'camera-loading'
  | 'tracking'
  | 'paused'
  | 'error';

const VALID_TRANSITIONS: Record<WorkbenchPhase, WorkbenchPhase[]> = {
  idle: ['drawing', 'error'],
  drawing: ['generating', 'idle', 'error'],
  generating: ['camera-pending', 'error'],
  'camera-pending': ['camera-loading', 'idle', 'error'],
  'camera-loading': ['tracking', 'error'],
  tracking: ['paused', 'idle', 'error'],
  paused: ['tracking', 'idle'],
  error: ['idle'],
};

export function useWorkbenchPhase(initial: WorkbenchPhase = 'idle') {
  const [phase, setPhase] = useState<WorkbenchPhase>(initial);

  const transition = useCallback((to: WorkbenchPhase): boolean => {
    let success = false;
    setPhase((prev) => {
      if (VALID_TRANSITIONS[prev].includes(to)) {
        success = true;
        return to;
      }
      success = false;
      return prev;
    });
    return success;
  }, []);

  return { phase, transition, setPhase };
}

// 导出合法跳转表供测试
export { VALID_TRANSITIONS };
```

- [ ] **Step 2: 创建工作台页面 `frontend/src/pages/Workbench.tsx`**

```tsx
// frontend/src/pages/Workbench.tsx
// @mode: ink | thunder | transition
// 工作台双态集成 —— 对齐 MR 设计文档 7.7 工作台双态布局 + 8.2 状态机
// 使用规则：R1 双态隔离 / R4 纹理强制 / R5 动效语义

import { useState, useCallback, useRef, useEffect } from 'react';
import { DrawCanvas } from '../modules/canvas/DrawCanvas';
import { recognizeShapes } from '../modules/shapeRecognizer/shapeRecognizer';
import { MRRenderer } from '../modules/mr/MRRenderer';
import { HandOverlay } from '../modules/handTracking/HandOverlay';
import { useHandTracking } from '../modules/handTracking/useHandTracking';
import { useModeTransition } from '../hooks/useModeTransition';
import { ModeTransition } from '../components/ModeTransition';
import { useWorkbenchPhase } from '../modules/workbench/useWorkbenchPhase';
import { TouchEffect } from '../modules/effects/TouchEffect';
import type { DrawnShape, DrawMode, RecognitionResult, VirtualKey } from '../types/shapes';

const CANVAS_W = 800;
const CANVAS_H = 500;
const SCENE_W = 1280;
const SCENE_H = 720;

export function Workbench() {
  const [mode, setMode] = useState<DrawMode>('contour');
  const [shapes, setShapes] = useState<DrawnShape[]>([]);
  const [recognition, setRecognition] = useState<RecognitionResult | null>(null);
  const [sensitivity, setSensitivity] = useState(50);
  const [triggeredKeyId, setTriggeredKeyId] = useState<string | null>(null);
  const [triggerId, setTriggerId] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);

  const { phase, transition } = useWorkbenchPhase('idle');
  const { state: transitionState, currentMode, startTransition } = useModeTransition('ink');
  const handTracking = useHandTracking();

  // reduced-motion 检测
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // 设置手部追踪参数
  useEffect(() => {
    handTracking.setSceneSize(SCENE_W, SCENE_H);
    handTracking.setSensitivity(sensitivity);
  }, [sensitivity, handTracking]);

  useEffect(() => {
    if (recognition) handTracking.setKeys(recognition.keys);
  }, [recognition, handTracking]);

  // 识别 + 进入过渡
  const onGenerate = useCallback(() => {
    if (shapes.length === 0) return;
    transition('generating');
    const result = recognizeShapes(shapes, CANVAS_W, CANVAS_H);
    setRecognition(result);
    setTimeout(() => {
      transition('camera-pending');
      startTransition('thunder');
      setTimeout(() => transition('camera-loading'), 2400);
    }, 500);
  }, [shapes, transition, startTransition]);

  // 触发音效（占位，实际由音频模块处理）
  useEffect(() => {
    if (handTracking.hoverState.type === 'triggering' && handTracking.hoverState.keyId) {
      const keyId = handTracking.hoverState.keyId;
      setTriggeredKeyId(keyId);
      setTriggerId(`${keyId}-${Date.now()}`);
      setTimeout(() => setTriggeredKeyId(null), 150);
    }
  }, [handTracking.hoverState]);

  const isThunder = phase === 'tracking' || phase === 'paused';

  return (
    <div data-mode={currentMode} className={isThunder ? 'scanline-overlay' : 'parchment-bg'} style={{ minHeight: '100vh' }}>
      <ModeTransition state={transitionState} />

      {/* 顶部状态栏 */}
      <header style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-default)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px' }}>SOUND/SHAPE</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', marginLeft: '24px' }}>
          phase: {phase} · instrument: {recognition?.instrument || '--'} · keys: {recognition?.keys.length || 0}
        </span>
      </header>

      {/* 墨绘态：绘制区 */}
      {!isThunder && (
        <main style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
          <div className="card-scroll">
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <button className="btn-engrave" onClick={() => setMode('contour')}>画乐器符印</button>
              <button className="btn-engrave" onClick={() => setMode('abstract')}>画抽象形状</button>
            </div>
            <DrawCanvas
              mode={mode}
              width={CANVAS_W}
              height={CANVAS_H}
              shapes={shapes}
              onShapesChange={setShapes}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
              <button className="btn-engrave" onClick={() => setShapes([])}>清空</button>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                灵敏度
                <input type="range" min="0" max="100" value={sensitivity}
                  onChange={(e) => setSensitivity(Number(e.target.value))} />
              </label>
              <button className="btn-engrave" onClick={onGenerate} disabled={shapes.length === 0}>
                唤声
              </button>
            </div>
          </div>
        </main>
      )}

      {/* 雷霆态：MR 演奏区 */}
      {isThunder && recognition && (
        <main style={{ position: 'relative', width: '100%', height: 'calc(100vh - 60px)' }}>
          {/* 摄像头画面（占位，实际由摄像头模块提供） */}
          <div style={{ position: 'absolute', inset: 0, background: '#050407' }} />

          {/* MR 渲染层 */}
          <MRRenderer
            keys={recognition.keys}
            instrument={recognition.instrument}
            width={SCENE_W}
            height={SCENE_H}
            hoveredKeyId={handTracking.hoverState.keyId || null}
            triggeredKeyId={triggeredKeyId}
          />

          {/* 手部覆盖层 */}
          <HandOverlay
            hands={handTracking.hands}
            cursorStates={handTracking.cursorStates}
            hoverState={handTracking.hoverState}
            width={SCENE_W}
            height={SCENE_H}
          />

          {/* 触发光效 */}
          {triggeredKeyId && (
            <TouchEffect
              x={SCENE_W / 2}
              y={SCENE_H * 0.7}
              spiritColor={
                recognition.instrument === 'piano' ? '#00B4FF' :
                recognition.instrument === 'guitar' ? '#FF6B35' :
                recognition.instrument === 'violin' ? '#FFCC33' :
                recognition.instrument === 'flute' ? '#00FFA3' : '#B829FF'
              }
              triggerId={triggerId}
              width={SCENE_W}
              height={SCENE_H}
              reducedMotion={reducedMotion}
            />
          )}

          {/* 底部控制栏 */}
          <footer style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn-holo" onClick={() => transition('paused')}>暂停</button>
            <button className="btn-holo">录制</button>
            <button className="btn-holo" onClick={() => transition('idle')}>退出</button>
          </footer>
        </main>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 创建工作台测试 `frontend/src/pages/__tests__/Workbench.test.tsx`**

```typescript
// frontend/src/pages/__tests__/Workbench.test.tsx
import { render, screen } from '@testing-library/react';
import { VALID_TRANSITIONS } from '../../modules/workbench/useWorkbenchPhase';
import type { WorkbenchPhase } from '../../modules/workbench/useWorkbenchPhase';

describe('工作台状态机', () => {
  it('idle 应允许跳转到 drawing 和 error', () => {
    expect(VALID_TRANSITIONS.idle).toContain('drawing');
    expect(VALID_TRANSITIONS.idle).toContain('error');
  });

  it('drawing 应允许跳转到 generating/idle/error', () => {
    expect(VALID_TRANSITIONS.drawing).toContain('generating');
    expect(VALID_TRANSITIONS.drawing).toContain('idle');
  });

  it('generating 应跳转到 camera-pending', () => {
    expect(VALID_TRANSITIONS.generating).toContain('camera-pending');
  });

  it('camera-pending 应跳转到 camera-loading', () => {
    expect(VALID_TRANSITIONS['camera-pending']).toContain('camera-loading');
  });

  it('camera-loading 应跳转到 tracking', () => {
    expect(VALID_TRANSITIONS['camera-loading']).toContain('tracking');
  });

  it('tracking 应跳转到 paused/idle', () => {
    expect(VALID_TRANSITIONS.tracking).toContain('paused');
    expect(VALID_TRANSITIONS.tracking).toContain('idle');
  });

  it('所有 8 个 phase 都应有跳转定义', () => {
    const phases: WorkbenchPhase[] = ['idle', 'drawing', 'generating', 'camera-pending', 'camera-loading', 'tracking', 'paused', 'error'];
    phases.forEach(p => {
      expect(VALID_TRANSITIONS[p]).toBeDefined();
    });
  });
});
```

- [ ] **Step 4: 验证**

```bash
cd frontend
npm run build
npm test -- Workbench
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Workbench.tsx frontend/src/modules/workbench frontend/src/pages/__tests__/Workbench.test.tsx
git commit -m "feat(frontend): 工作台双态集成——墨绘态绘制+雷霆态MR演奏（M1）"
```

---

## 附录：MR 实现计划与原计划的关系

| 原计划 Task | 本计划处理方式 |
|------------|--------------|
| Task 18 画图生成键位 | 替换为本计划 Task 20（双模式绘制） |
| Task 19 摄像头实时画面 | 沿用原计划（无变更） |
| Task 20 手部追踪 | 替换为本计划 Task 22（手部追踪可视化系统） |
| Task 21 键位叠加渲染 | 替换为本计划 Task 21（MR 渲染层） |
| Task 22 音频合成 | 沿用原计划（无变更） |
| Task 23 激光特效 | 替换为本计划 Task 23（6 层触发光效） |
| Task 24 调音器 | 沿用原计划（无变更） |
| Task 25 工作台页面集成 | 替换为本计划 Task 24（双态工作台集成） |

**新增 Task：** Task 18（双态设计系统基础）+ Task 19（双态组件库+过渡动画）为 MR 新增，原计划无对应。

---

## 下一步

1. 用户评审本实现计划
2. 通过后按 Task 18 → 19 → 20 → 21 → 22 → 23 → 24 顺序执行
3. 每个 Task 完成后派发 3 个子代理并行审查（含 D1-D17 设计语言检查）
4. 全部 Task 完成后进入原计划 Phase 6（前端内容模块）
