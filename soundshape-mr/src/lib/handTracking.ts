// @mode: thunder
// 手部追踪可视化系统 - 严格按 MR 设计文档 7.10 + 5.x 触发判定
// 纯 Canvas 2D 逻辑模块（不含 React）：骨架渲染 / 食指准星 / 悬停预热 / 拖尾 / 手势识别 / 触发判定 / 进出动画
// 所有手部可视化符合「雷霆唤声」电磁幽灵美学：骨骼是电光线框，关节是发光节点，食指尖是准星

import type {
  HandData,
  Landmark,
  CursorState,
  HoverState,
  GestureType,
  VirtualKey,
  TriggerEvent,
} from './types';

// ========== 调色板（对齐 tokens.css 雷霆态变量，禁止品红等非白名单色） ==========
const CYAN_BRIGHT = '#00F0FF'; // 电光青：骨架 / 准星 idle 边
const CYAN_MID = '#00B8C4'; // 青中：指间关节
const SULFUR = '#FFCC33'; // 硫黄：左手准星 / hovering / triggering / 拖尾
const BLOOD_ORANGE = '#FF4A1C'; // 血橙：右手准星
const TEXT_BRIGHT = '#E8F4F8'; // 准星中心亮点（--text-bright）

// ========== 本地工具 ==========
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dist2D(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ========== 1. MediaPipe Hands 配置（文档 5.1） ==========
// @mediapipe/hands 通过 CDN locateFile 加载，无需 npm 安装
export const HAND_CONFIG = {
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.5,
  locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
};

// ========== 2. 21 点骨架渲染（文档 7.10.1） ==========
// 19 条骨骼连线（landmark 索引对）
export const SKELETON_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], // 拇指
  [0, 5], [5, 6], [6, 7], [7, 8], // 食指
  [5, 9], [9, 10], [10, 11], [11, 12], // 中指
  [9, 13], [13, 14], [14, 15], [15, 16], // 无名指
  [13, 17], [17, 18], [18, 19], [19, 20], // 小指
  [0, 17], // 手腕到小指根
];

// 关节分级样式（landmark 索引 → 半径/颜色/外发光半径）
function jointStyle(i: number): { r: number; color: string; glow: number } {
  if (i === 0) return { r: 5, color: CYAN_BRIGHT, glow: 10 }; // 手腕锚点
  if (i === 1 || i === 5 || i === 9 || i === 13 || i === 17)
    return { r: 3, color: CYAN_BRIGHT, glow: 0 }; // 指根
  if (i === 4 || i === 12 || i === 16 || i === 20)
    return { r: 4, color: SULFUR, glow: 6 }; // 指尖（硫黄高光）
  return { r: 2.5, color: CYAN_MID, glow: 0 }; // 指间
}

// 计算置信度 4 档可视化参数（文档 7.10.6）
// 返回 { alpha, dashed, flicker } —— 丢失档由 HandAnimationManager 处理，本函数只覆盖 3 个有输出的档
function confidenceVisual(confidence: number, now: number): {
  alpha: number;
  dashed: boolean;
} {
  if (confidence >= 0.8) {
    // 稳定：实线 + 全亮
    return { alpha: 1, dashed: false };
  }
  if (confidence >= 0.5) {
    // 一般：实线 + 80% 透明度
    return { alpha: 0.8, dashed: false };
  }
  // 不稳：虚线 + 频闪（confidence-flicker 0.25s steps(2)，0.5↔0.8）
  const phase = Math.floor((now % 250) / 125); // 0 或 1
  return { alpha: phase === 0 ? 0.5 : 0.8, dashed: true };
}

/**
 * 绘制单手 21 点骨架（文档 7.10.1 + 7.10.6）
 * - 镜像翻转：x' = 1 - x（摄像头画面镜像）
 * - 骨骼线：电光青 1.5px，drop-shadow 3px
 * - 关节分级渲染，食指尖(8) 跳过（由 drawIndexCursor 绘制准星）
 * - 置信度 4 档可视化
 * @param options.showSkeleton false 时整体跳过（仅保留外层准星）
 * @param options.confidence   用于 4 档可视化的置信度
 */
export function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  hand: HandData,
  sceneW: number,
  sceneH: number,
  options: { showSkeleton: boolean; confidence: number },
): void {
  if (!options.showSkeleton) return;
  const landmarks = hand.landmarks;
  if (!landmarks || landmarks.length < 21) return;

  const now = Date.now();
  const { alpha, dashed } = confidenceVisual(options.confidence, now);

  // 镜像坐标 → 像素坐标
  const px = (lm: Landmark) => (1 - lm.x) * sceneW;
  const py = (lm: Landmark) => lm.y * sceneH;

  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // —— 骨骼线 ——
  ctx.strokeStyle = CYAN_BRIGHT;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = CYAN_BRIGHT;
  ctx.shadowBlur = 3; // drop-shadow(0 0 3px cyan-faint)
  if (dashed) ctx.setLineDash([3, 3]);
  for (const [a, b] of SKELETON_CONNECTIONS) {
    const la = landmarks[a];
    const lb = landmarks[b];
    if (!la || !lb) continue;
    ctx.beginPath();
    ctx.moveTo(px(la), py(la));
    ctx.lineTo(px(lb), py(lb));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  // —— 关节点 ——
  for (let i = 0; i < 21; i++) {
    if (i === 8) continue; // 食指尖由准星渲染
    const lm = landmarks[i];
    if (!lm) continue;
    const { r, color, glow } = jointStyle(i);
    ctx.fillStyle = color;
    if (glow > 0) {
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.beginPath();
    ctx.arc(px(lm), py(lm), r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ========== 3. 食指准星 5 态状态机（文档 7.10.3 + 7.10.5） ==========
/**
 * 绘制食指尖十字准星（核心交互锚点）
 * - 5 态：idle / hovering / triggering / lost / hidden
 * - 双手区分：左手硫黄 / 右手血橙（hovering、triggering 一律硫黄）
 * - 深度暗示：根据 z 调整 scale/opacity/blur（近大亮清，远小暗糊）
 * - 样式：两条 2px 交叉线 + 中心 4px 亮点
 */
export function drawIndexCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  state: CursorState,
  handedness: 'Left' | 'Right',
  z: number,
): void {
  if (state === 'hidden') return;

  const now = Date.now();
  const handednessColor = handedness === 'Left' ? SULFUR : BLOOD_ORANGE;

  // 各态基础参数
  let color: string;
  let size: number; // 准星十字总尺寸（px）
  let alpha: number;
  let glow: number; // 光晕（shadowBlur）
  let dashed = false;

  switch (state) {
    case 'idle':
      // 准星色 + 半透明，24px，8px blur
      color = handednessColor;
      size = 24;
      alpha = 0.5;
      glow = 8;
      break;
    case 'hovering':
      // 准星色变硫黄 + 不透明，28px，12px blur
      color = SULFUR;
      size = 28;
      alpha = 1;
      glow = 12;
      break;
    case 'triggering':
      // 硫黄 + 全亮 + 脉冲，36px，20px blur
      color = SULFUR;
      size = 36 + Math.sin(now / 60) * 3; // 脉冲振荡
      alpha = 1;
      glow = 20;
      break;
    case 'lost':
      // 虚线准星 + 频闪，24px，无光晕
      color = handednessColor;
      size = 24;
      alpha = Math.floor((now % 250) / 125) === 0 ? 0.5 : 0.8; // 4Hz 频闪
      glow = 0;
      dashed = true;
      break;
    default:
      return;
  }

  // 深度暗示（文档 7.10.5）：z 范围 -0.1（近）到 0.1（远）归一化到 0-1
  const depth = clamp((z + 0.1) / 0.2, 0, 1); // 0=近，1=远
  const depthScale = 1.2 - depth * 0.4; // 近 1.2 / 远 0.8
  const depthOpacity = 1 - depth * 0.4; // 近 1 / 远 0.6
  const depthBlur = depth * 1.5; // 近 0 / 远 1.5px

  const finalSize = size * depthScale;
  const finalAlpha = clamp(alpha * depthOpacity, 0, 1);
  const half = finalSize / 2;

  ctx.save();
  ctx.globalAlpha = finalAlpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  if (dashed) ctx.setLineDash([3, 3]);
  if (depthBlur > 0.01) ctx.filter = `blur(${depthBlur}px)`;

  // 水平线
  ctx.beginPath();
  ctx.moveTo(x - half, y);
  ctx.lineTo(x + half, y);
  ctx.stroke();
  // 垂直线
  ctx.beginPath();
  ctx.moveTo(x, y - half);
  ctx.lineTo(x, y + half);
  ctx.stroke();

  // 中心 4px 亮点（text-bright + 6px 自身光晕）
  ctx.setLineDash([]);
  ctx.shadowColor = TEXT_BRIGHT;
  ctx.shadowBlur = 6;
  ctx.fillStyle = TEXT_BRIGHT;
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2); // 4px 直径 → 2px 半径
  ctx.fill();

  ctx.restore();
}

// ========== 4. 悬停预热反馈（文档 7.10.4） ==========
/**
 * 绘制键位悬停预热：虚线边框 + 倒计时圆环
 * @param progress 0-1，圆环填充比例（0=空，1=满，即将触发）
 */
export function drawHoverFeedback(
  ctx: CanvasRenderingContext2D,
  keyX: number,
  keyY: number,
  keyW: number,
  keyH: number,
  progress: number,
): void {
  ctx.save();

  // 虚线边框（dashed cyan-bright，inset 8px glow）
  ctx.strokeStyle = CYAN_BRIGHT;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.shadowColor = CYAN_BRIGHT;
  ctx.shadowBlur = 8;
  ctx.strokeRect(keyX, keyY, keyW, keyH);
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  // 倒计时圆环（SVG circle 风格：stroke sulfur，stroke-width 2，dashoffset 从周长到 0）
  const cx = keyX + keyW / 2;
  const cy = keyY + keyH / 2;
  const r = Math.max(2, Math.min(keyW, keyH) / 2 - 4); // 内切圆留 4px padding
  const p = clamp(progress, 0, 1);
  ctx.strokeStyle = SULFUR;
  ctx.lineWidth = 2;
  ctx.shadowColor = SULFUR;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  // 从 12 点钟方向起，顺时针填充 p 比例
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * p);
  ctx.stroke();

  ctx.restore();
}

// ========== 5. 30 帧拖尾（文档 7.10.8） ==========
/**
 * 食指轨迹拖尾管理器（电磁残影）
 * 保留最近 30 帧（0.5s @60fps），按年龄渐隐线宽和透明度
 */
export class TrailManager {
  private points: Array<{ x: number; y: number; t: number }> = [];
  private maxPoints = 30;
  private duration = 500; // ms

  add(x: number, y: number): void {
    const now = Date.now();
    this.points.push({ x, y, t: now });
    // 移除超过 0.5s 的点
    while (this.points.length > 0 && now - this.points[0].t > this.duration) {
      this.points.shift();
    }
    // 上限保护
    if (this.points.length > this.maxPoints) this.points.shift();
  }

  draw(ctx: CanvasRenderingContext2D, color: string): void {
    if (this.points.length < 2) return;
    const now = Date.now();
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    for (let i = 1; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];
      const age = (now - p1.t) / this.duration; // 0=最新，1=最旧
      ctx.globalAlpha = clamp((1 - age) * 0.6, 0, 1);
      ctx.lineWidth = Math.max(0.1, (1 - age) * 3);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  clear(): void {
    this.points = [];
  }
}

// ========== 6. 手势识别（文档 7.10.7） ==========
/**
 * 识别手势类型
 * 判断"伸直"：指尖到腕距离 > 指根到腕距离的 1.5 倍
 */
export function detectGesture(landmarks: Landmark[]): GestureType {
  if (!landmarks || landmarks.length < 21) return 'UNKNOWN';

  const wrist = landmarks[0];

  // 各指：tip / 指根(mcp)
  const isExtended = (tip: Landmark, mcp: Landmark): boolean =>
    dist2D(tip, wrist) > 1.5 * dist2D(mcp, wrist);

  const thumb = isExtended(landmarks[4], landmarks[2]);
  const index = isExtended(landmarks[8], landmarks[5]);
  const middle = isExtended(landmarks[12], landmarks[9]);
  const ring = isExtended(landmarks[16], landmarks[13]);
  const pinky = isExtended(landmarks[20], landmarks[17]);

  // PINCH 优先（拇指食指距离 < 0.05）
  if (dist2D(landmarks[4], landmarks[8]) < 0.05) return 'PINCH';
  if (index && middle && ring && pinky && thumb) return 'OPEN';
  if (!index && !middle && !ring && !pinky && !thumb) return 'FIST';
  if (index && !middle && !ring && !pinky && !thumb) return 'INDEX';
  if (index && middle && !ring && !pinky && !thumb) return 'V';
  return 'UNKNOWN';
}

// ========== 7. 触发判定（文档 5.3 + 7.10.4） ==========
// unprojectFn 由调用方注入（mrRenderer 的 unprojectFromScene），避免循环依赖
type UnprojectFn = (
  sx: number,
  sy: number,
  sw: number,
  sh: number,
) => { x: number; y: number } | null;

/**
 * 每帧触发判定 + 悬停状态计算
 * - 取食指尖 landmarks[8]，镜像翻转后投影到绘制坐标系
 * - 灵敏度扩展：expand = 0.5 + (sensitivity/100) * 0.4（0.5-0.9）
 * - 命中且 cooldown 过 → triggered + hover.triggering
 * - 命中但 cooldown 未过 → hover.hovering（progress = sinceLast/cooldown）
 * - 未命中 → hover.idle
 *
 * 注：unprojectFn 默认返回 null（视为不在桌面），调用方应传入真实反投影函数；
 * 因 TypeScript 不允许必选参数跟在可选参数后，此处给 unprojectFn 一个安全兜底。
 */
export function checkTrigger(
  hand: HandData,
  keys: VirtualKey[],
  sensitivity: number,
  sceneW: number,
  sceneH: number,
  cooldownMs = 150,
  unprojectFn: UnprojectFn = () => null,
): { triggered: TriggerEvent | null; hover: HoverState } {
  const indexTip = hand.landmarks[8];
  if (!indexTip) {
    return { triggered: null, hover: { type: 'idle' } };
  }

  // 镜像翻转 + 投影到绘制坐标系
  const mirroredX = 1 - indexTip.x;
  const projected = unprojectFn(
    mirroredX * sceneW,
    indexTip.y * sceneH,
    sceneW,
    sceneH,
  );
  if (!projected) {
    // 手不在桌面区域（如天空区）
    return { triggered: null, hover: { type: 'idle' } };
  }

  const expand = 0.5 + (sensitivity / 100) * 0.4; // 0.5-0.9
  const now = Date.now();

  for (const key of keys) {
    const cx = key.bounds.x + key.bounds.width / 2;
    const cy = key.bounds.y + key.bounds.height / 2;
    const halfW = (key.bounds.width * expand) / 2;
    const halfH = (key.bounds.height * expand) / 2;
    if (
      Math.abs(projected.x - cx) < halfW &&
      Math.abs(projected.y - cy) < halfH
    ) {
      // 命中
      const sinceLast = now - key.lastTriggeredAt;
      if (sinceLast > cooldownMs) {
        // 触发
        return {
          triggered: {
            keyId: key.id,
            note: key.note,
            timestamp: now,
            hand: hand.handedness,
          },
          hover: { type: 'triggering', keyId: key.id, progress: 1 },
        };
      }
      // 命中但冷却中：悬停预热
      return {
        triggered: null,
        hover: {
          type: 'hovering',
          keyId: key.id,
          progress: clamp(sinceLast / cooldownMs, 0, 1),
        },
      };
    }
  }

  return { triggered: null, hover: { type: 'idle' } };
}

// ========== 8. 手部进入/离开动画（文档 7.10.9） ==========
/**
 * 手部进入/离开动画管理器
 * - 进入：200ms（opacity 0→1 + scale 0.5→1 + blur 8→0，本类只输出 alpha）
 * - 离开：250ms 电光消散（opacity 1→0 + blur 0→6）
 * - 短暂遮挡（<300ms）重现：不播放进入动画，遮挡期保持 0.3 透明度占位
 *
 * 说明：丢失后先进入 300ms 宽限期（保持 0.3 占位），超过 300ms 才视为真正离开，
 * 此时从 0.3 渐隐到 0（250ms）。这是对文档"离开 1→0"与"遮挡保持 0.3"两规则的折中：
 * 优先满足"短暂遮挡可见半透明"的强交互诉求。
 */
export class HandAnimationManager {
  private handStates: Map<
    string,
    {
      visible: boolean;
      emergeStart: number; // 进入动画起始时间，0 表示无进入动画
      dissolveStart: number; // 丢失/消散起始时间，0 表示未在消散
    }
  > = new Map();

  /** 触发进入动画（手被检测到） */
  onHandDetected(handId: string): void {
    const now = Date.now();
    const s = this.handStates.get(handId);
    if (s) {
      if (s.visible) return; // 已可见
      const elapsed = now - s.dissolveStart;
      if (s.dissolveStart > 0 && elapsed < 300) {
        // 短暂遮挡重现：不播放进入动画，直接恢复可见
        s.visible = true;
        s.emergeStart = 0;
        s.dissolveStart = 0;
      } else {
        // 真正离开后重新进入：播放进入动画
        s.visible = true;
        s.emergeStart = now;
        s.dissolveStart = 0;
      }
    } else {
      // 首次出现：播放进入动画
      this.handStates.set(handId, {
        visible: true,
        emergeStart: now,
        dissolveStart: 0,
      });
    }
  }

  /** 触发离开动画（手丢失） */
  onHandLost(handId: string): void {
    const now = Date.now();
    const s = this.handStates.get(handId);
    if (s) {
      if (!s.visible) return; // 已在丢失状态
      s.visible = false;
      s.dissolveStart = now;
      s.emergeStart = 0;
    } else {
      this.handStates.set(handId, {
        visible: false,
        emergeStart: 0,
        dissolveStart: now,
      });
    }
  }

  /** 返回当前透明度 0-1 */
  getHandAlpha(handId: string, now: number): number {
    const s = this.handStates.get(handId);
    if (!s) return 0;

    if (s.visible) {
      if (s.emergeStart > 0) {
        // 进入：200ms opacity 0→1
        const t = (now - s.emergeStart) / 200;
        return clamp(t, 0, 1);
      }
      // 无进入动画（短暂遮挡重现 或 稳定态）
      return 1;
    }

    // 丢失状态
    if (s.dissolveStart === 0) return 0;
    const elapsed = now - s.dissolveStart;
    if (elapsed < 300) {
      // 遮挡宽限期：保持 0.3 透明度占位
      return 0.3;
    }
    // 真正离开：250ms 电光消散（0.3 → 0）
    const dissolveT = (elapsed - 300) / 250;
    return clamp(0.3 * (1 - dissolveT), 0, 1);
  }
}
