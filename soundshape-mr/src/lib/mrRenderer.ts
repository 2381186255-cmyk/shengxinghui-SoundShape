// @mode: thunder
// MR 渲染层（M6）- 严格按设计文档 4.1 / 4.2 / 4.3 / 7.10.4 / 7.11 实现
// 纯 Canvas 2D 绘制函数和类，不含 React
// 性能约定：调用方应通过 requestAnimationFrame 驱动 update/draw 调用

import type { VirtualKey, Instrument, TriggerEvent, EffectLevel } from './types';
import { INSTRUMENTS } from './types';

// ============================================================
// 1. 透视变换参数（文档 4.2，严格固定，禁止调整）
// ============================================================

export const PERSPECTIVE = {
  horizonY: 0.45,    // 地平线在画面 45% 处（上半部分是天空，下半部分是桌面）
  nearY: 0.92,       // 近端在画面 92% 处
  nearScaleX: 1.0,   // 近端宽度缩放
  farScaleX: 0.55,   // 远端宽度缩放（远端窄）
  skewY: 0.12,       // Y 方向倾斜系数（营造俯视角，文档 4.2 预留参数）
};

// 绘制坐标 (dx, dy 0-1) → 画面坐标
// dy=0 是乐器远端（画面上方），dy=1 是乐器近端（画面下方）
export function projectToScene(
  dx: number,
  dy: number,
  sceneW: number,
  sceneH: number,
): { x: number; y: number } {
  const t = dy; // 0..1
  const sceneY = PERSPECTIVE.horizonY + (PERSPECTIVE.nearY - PERSPECTIVE.horizonY) * t;
  const scaleX = PERSPECTIVE.farScaleX + (PERSPECTIVE.nearScaleX - PERSPECTIVE.farScaleX) * t;
  const centerX = sceneW / 2;
  const sceneX = centerX + (dx - 0.5) * sceneW * scaleX;
  return { x: sceneX, y: sceneY * sceneH };
}

// 画面坐标 (sx, sy) → 绘制坐标，手在天空区域返回 null
export function unprojectFromScene(
  sx: number,
  sy: number,
  sceneW: number,
  sceneH: number,
): { x: number; y: number } | null {
  const normY = sy / sceneH;
  if (normY < PERSPECTIVE.horizonY) {
    return null; // 手在"天空"区域，不在桌面上
  }
  const t = (normY - PERSPECTIVE.horizonY) / (PERSPECTIVE.nearY - PERSPECTIVE.horizonY);
  const scaleX = PERSPECTIVE.farScaleX + (PERSPECTIVE.nearScaleX - PERSPECTIVE.farScaleX) * t;
  const centerX = sceneW / 2;
  const dx = (sx - centerX) / (sceneW * scaleX) + 0.5;
  const dy = t;
  return { x: dx, y: dy };
}

// ============================================================
// 2. 虚拟桌面阴影（文档 4.1 Layer 2）
// ============================================================

// 画面下半部分渐变暗化，营造"桌面"感
// 从 horizonY 到底部渐变 rgba(0,0,0,0) → rgba(0,0,0,0.5)
export function drawVirtualDesktop(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const horizonPx = PERSPECTIVE.horizonY * h;
  const gradient = ctx.createLinearGradient(0, horizonPx, 0, h);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, horizonPx, w, h - horizonPx);
}

// ============================================================
// 3. 全息乐器投射（文档 4.1 Layer 3 + 4.3）
// ============================================================

// hex 颜色转 rgba 字符串（如 '#00B4FF' → 'rgba(0,180,255,0.15)'）
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// 投影 VirtualKey 的 4 个角点和中心点（透视后形成梯形）
function projectKeyCorners(key: VirtualKey, w: number, h: number) {
  const { x, y, width, height } = key.bounds;
  return {
    tl: projectToScene(x, y, w, h),
    tr: projectToScene(x + width, y, w, h),
    br: projectToScene(x + width, y + height, w, h),
    bl: projectToScene(x, y + height, w, h),
    center: projectToScene(x + width / 2, y + height / 2, w, h),
  };
}

// 绘制全息乐器：每个 VirtualKey 投影到画面坐标后渲染
export function drawHoloInstrument(
  ctx: CanvasRenderingContext2D,
  keys: VirtualKey[],
  instrument: Instrument,
  w: number,
  h: number,
  hoveredKeyId?: string | null,
  triggeredKeyId?: string | null,
  triggeredAt?: number,
): void {
  const soulHolo = INSTRUMENTS[instrument].soulHolo;
  const now = Date.now();

  for (const key of keys) {
    const corners = projectKeyCorners(key, w, h);
    const isHovered = hoveredKeyId === key.id;
    const isTriggered = triggeredKeyId === key.id;

    // --- 下方投影（向下偏移 8px 模拟桌面投影）---
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(corners.tl.x, corners.tl.y + 8);
    ctx.lineTo(corners.tr.x, corners.tr.y + 8);
    ctx.lineTo(corners.br.x, corners.br.y + 8);
    ctx.lineTo(corners.bl.x, corners.bl.y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- 半透明填充（灵格色 rgba 0.15）+ 外发光 ---
    ctx.save();
    ctx.shadowColor = soulHolo;
    ctx.shadowBlur = isTriggered ? 24 : 8;
    ctx.fillStyle = isTriggered ? hexToRgba(soulHolo, 0.4) : hexToRgba(soulHolo, 0.15);
    ctx.beginPath();
    ctx.moveTo(corners.tl.x, corners.tl.y);
    ctx.lineTo(corners.tr.x, corners.tr.y);
    ctx.lineTo(corners.br.x, corners.br.y);
    ctx.lineTo(corners.bl.x, corners.bl.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- 内边框（灵格色 1.5px），hover 时虚线 ---
    ctx.save();
    ctx.shadowColor = soulHolo;
    ctx.shadowBlur = isTriggered ? 12 : 4;
    ctx.strokeStyle = soulHolo;
    ctx.lineWidth = 1.5;
    if (isHovered && !isTriggered) {
      ctx.setLineDash([6, 4]); // 虚线边框（hover 预热）
    }
    ctx.beginPath();
    ctx.moveTo(corners.tl.x, corners.tl.y);
    ctx.lineTo(corners.tr.x, corners.tr.y);
    ctx.lineTo(corners.br.x, corners.br.y);
    ctx.lineTo(corners.bl.x, corners.bl.y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // --- 音名标签（JetBrains Mono 14px 白色，居中）---
    ctx.save();
    ctx.font = '14px "JetBrains Mono", "Courier New", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(key.note, corners.center.x, corners.center.y);
    ctx.restore();

    // --- hover 倒计时圆环（文档 7.10.4 悬停预热）---
    if (isHovered && !isTriggered) {
      const sinceLast = now - key.lastTriggeredAt;
      const progress = Math.min(1, Math.max(0, sinceLast / 150));
      const ringRadius = 18;
      ctx.save();
      ctx.strokeStyle = '#FFCC33'; // 硫黄色
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        corners.center.x,
        corners.center.y,
        ringRadius,
        -Math.PI / 2,
        -Math.PI / 2 + progress * Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    }

    // --- triggered 强发光衰减（L1 键位高亮，衰减由 age 驱动）---
    if (isTriggered && triggeredAt !== undefined) {
      const age = now - triggeredAt;
      const decay = Math.max(0, 1 - age / 600);
      if (decay > 0) {
        ctx.save();
        ctx.shadowColor = soulHolo;
        ctx.shadowBlur = 30 * decay;
        ctx.strokeStyle = hexToRgba(soulHolo, decay);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(corners.tl.x, corners.tl.y);
        ctx.lineTo(corners.tr.x, corners.tr.y);
        ctx.lineTo(corners.br.x, corners.br.y);
        ctx.lineTo(corners.bl.x, corners.bl.y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

// ============================================================
// 4. 触发光效系统（文档 7.11 L1-L6）
// ============================================================

// 触发光效数据（由调用方构建后传入 EffectManager）
export interface TriggerEffect {
  keyId: string;
  note: string;
  x: number;   // 画面坐标
  y: number;
  bornAt: number;
  instrument: Instrument;
}

// 从 TriggerEvent 构建 TriggerEffect（供调用方便捷使用）
export function createTriggerEffect(
  event: TriggerEvent,
  x: number,
  y: number,
  instrument: Instrument,
): TriggerEffect {
  return {
    keyId: event.keyId,
    note: event.note,
    x,
    y,
    bornAt: event.timestamp,
    instrument,
  };
}

// 粒子（内部类型，L3 粒子爆发用）
interface Particle {
  x: number;
  y: number;
  vx: number;      // 速度 x（px/s）
  vy: number;      // 速度 y（px/s）
  bornAt: number;
  life: number;    // 寿命（ms）
  color: string;
}

// 涟漪（内部类型，L2 涟漪扩散用）
interface Ripple {
  x: number;
  y: number;
  bornAt: number;
  color: string;
}

// 扫描线（内部类型，L5 扫描线脉冲用）
interface Scanline {
  startY: number;  // 起始画面 y 坐标
  bornAt: number;
  color: string;
}

// 光效时长常量（ms，严格按文档 7.11）
const EFFECT_DURATION = 600;       // 总时长
const RIPPLE_DURATION = 400;       // L2 涟漪持续
const PARTICLE_LIFE = 400;         // L3 粒子寿命
const SCANLINE_DURATION = 500;     // L5 扫描线持续
const SHAKE_DURATION = 80;         // L6 震屏持续
const SHAKE_INTENSITY = 2;         // L6 震屏强度（px）
const MAX_PARTICLES = 200;         // 粒子上限
const PARTICLE_SPEED = 200;        // 粒子速度（px/s）
const PARTICLE_MIN_COUNT = 8;      // 粒子最少数量
const PARTICLE_MAX_COUNT = 12;     // 粒子最多个数
const RIPPLE_BASE_RADIUS = 20;     // 涟漪基准半径（scale 0→4 即 0→80px）
const SULFUR_COLOR = '#FFCC33';    // 硫黄色（L3 粒子 / L4 食指光晕）

// 触发光效管理器（6 层 L1-L6）
// L1 键位高亮：drawHoloInstrument 处理即时高亮，EffectManager 负责衰减余光
// L2 涟漪扩散：EffectManager 绘制
// L3 粒子爆发：EffectManager 绘制
// L4 食指光晕：由手部追踪模块处理，EffectManager 仅发事件（onFingerGlow 回调）
// L5 扫描线脉冲：EffectManager 绘制
// L6 屏幕震屏：通过 shakeOffset 暴露偏移量，由调用方应用 ctx.transform
export class EffectManager {
  private effects: TriggerEffect[] = [];
  private particles: Particle[] = [];
  private ripples: Ripple[] = [];
  private scanlines: Scanline[] = [];
  private effectLevel: EffectLevel = 3;
  private shakeActiveUntil = 0;

  // L6 震屏偏移，调用方读取后应用 ctx.translate(shakeOffset.x, shakeOffset.y)
  public shakeOffset: { x: number; y: number } = { x: 0, y: 0 };

  // L4 食指光晕回调，由手部追踪模块设置；触发时被调用
  public onFingerGlow?: (effect: TriggerEffect) => void;

  // 触发一个光效（文档 7.11，同时触发 L1-L6）
  trigger(effect: TriggerEffect): void {
    if (this.effectLevel === 0) return; // 全关

    this.effects.push(effect);

    const level = this.effectLevel;
    const reduced = this.isReducedMotion();
    const soulHolo = INSTRUMENTS[effect.instrument].soulHolo;

    // L2 涟漪扩散：normal 需 level>=3，reduced-motion 需 level>=1
    if (reduced ? level >= 1 : level >= 3) {
      this.ripples.push({ x: effect.x, y: effect.y, bornAt: effect.bornAt, color: soulHolo });
    }

    // L3 粒子爆发：level>=2 且非 reduced-motion
    if (!reduced && level >= 2) {
      const count = PARTICLE_MIN_COUNT + Math.floor(Math.random() * (PARTICLE_MAX_COUNT - PARTICLE_MIN_COUNT + 1));
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        this.particles.push({
          x: effect.x,
          y: effect.y,
          vx: Math.cos(angle) * PARTICLE_SPEED,
          vy: Math.sin(angle) * PARTICLE_SPEED,
          bornAt: effect.bornAt,
          life: PARTICLE_LIFE,
          color: SULFUR_COLOR, // 硫黄色
        });
      }
      // 上限保护：超出 200 个按 bornAt 删最老
      if (this.particles.length > MAX_PARTICLES) {
        this.particles.sort((a, b) => a.bornAt - b.bornAt);
        this.particles.splice(0, this.particles.length - MAX_PARTICLES);
      }
    }

    // L4 食指光晕：发事件，由手部追踪模块处理准星变色 + 光晕扩大
    this.onFingerGlow?.(effect);

    // L5 扫描线脉冲：level>=3 且非 reduced-motion
    if (!reduced && level >= 3) {
      this.scanlines.push({ startY: effect.y, bornAt: effect.bornAt, color: soulHolo });
    }

    // L6 屏幕震屏：level>=3 且非 reduced-motion
    if (!reduced && level >= 3) {
      this.shakeActiveUntil = effect.bornAt + SHAKE_DURATION;
    }
  }

  // 每帧更新：清理过期数据 + 更新震屏偏移
  update(now: number): void {
    // 清理过期数据
    this.effects = this.effects.filter((e) => now - e.bornAt < EFFECT_DURATION);
    this.ripples = this.ripples.filter((r) => now - r.bornAt < RIPPLE_DURATION);
    this.particles = this.particles.filter((p) => now - p.bornAt < p.life);
    this.scanlines = this.scanlines.filter((s) => now - s.bornAt < SCANLINE_DURATION);

    // 更新 L6 震屏偏移（抖动 2px 持续 80ms）
    if (now < this.shakeActiveUntil) {
      this.shakeOffset.x = (Math.random() - 0.5) * 2 * SHAKE_INTENSITY;
      this.shakeOffset.y = (Math.random() - 0.5) * 2 * SHAKE_INTENSITY;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }
  }

  // 绘制所有活跃光效（L1 衰减余光 / L2 涟漪 / L3 粒子 / L5 扫描线）
  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.effectLevel === 0) return;

    const now = Date.now();
    const level = this.effectLevel;
    const reduced = this.isReducedMotion();

    // --- L1 键位高亮衰减余光（即时高亮由 drawHoloInstrument 处理）---
    if (level >= 1) {
      for (const effect of this.effects) {
        const age = now - effect.bornAt;
        const decay = Math.max(0, 1 - age / EFFECT_DURATION);
        if (decay <= 0) continue;
        const soulHolo = INSTRUMENTS[effect.instrument].soulHolo;
        ctx.save();
        ctx.globalAlpha = decay * 0.5;
        ctx.shadowColor = soulHolo;
        ctx.shadowBlur = 20;
        ctx.fillStyle = soulHolo;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // --- L2 涟漪扩散（scale 0→4，opacity 1→0，持续 400ms）---
    if (reduced ? level >= 1 : level >= 3) {
      for (const ripple of this.ripples) {
        const age = now - ripple.bornAt;
        const progress = age / RIPPLE_DURATION;
        if (progress >= 1 || progress < 0) continue;
        const radius = progress * RIPPLE_BASE_RADIUS * 4; // scale 0→4
        const opacity = 1 - progress;
        ctx.save();
        ctx.strokeStyle = hexToRgba(ripple.color, opacity);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // --- L3 粒子爆发（硫黄色，速度 200px/s，寿命 400ms）---
    if (!reduced && level >= 2) {
      for (const p of this.particles) {
        const age = now - p.bornAt;
        const progress = age / p.life;
        if (progress >= 1 || progress < 0) continue;
        const dt = age / 1000; // 经过的秒数
        const x = p.x + p.vx * dt;
        const y = p.y + p.vy * dt;
        const opacity = 1 - progress;
        ctx.save();
        ctx.fillStyle = hexToRgba(p.color, opacity);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // --- L5 扫描线脉冲（从键位向上扫过画面顶部，持续 500ms）---
    if (!reduced && level >= 3) {
      for (const scan of this.scanlines) {
        const age = now - scan.bornAt;
        const progress = age / SCANLINE_DURATION;
        if (progress >= 1 || progress < 0) continue;
        const startY = Math.min(scan.startY, h);
        const y = startY * (1 - progress); // 从键位 y 向上到 0
        if (y < 0 || y > h) continue;
        const opacity = (1 - progress) * 0.6;
        ctx.save();
        ctx.strokeStyle = hexToRgba(scan.color, opacity);
        ctx.lineWidth = 2;
        ctx.shadowColor = scan.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // L4 食指光晕：由手部追踪模块处理（trigger 中已通过 onFingerGlow 发事件）
    // L6 屏幕震屏：通过 shakeOffset 暴露（update 中已更新），调用方应用 transform
  }

  // 设置性能降级等级（0=全关 1=仅glow 2=glow+burst 3=全部）
  setLevel(level: EffectLevel): void {
    this.effectLevel = level;
  }

  // 清空所有光效
  clear(): void {
    this.effects = [];
    this.particles = [];
    this.ripples = [];
    this.scanlines = [];
    this.shakeActiveUntil = 0;
    this.shakeOffset = { x: 0, y: 0 };
  }

  // 检测用户是否启用了 reduced-motion（文档 7.13 可访问性）
  private isReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
