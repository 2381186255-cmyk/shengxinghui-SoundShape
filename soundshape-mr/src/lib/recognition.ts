// @mode: ink|thunder
// 乐器识别模块 - 严格按 MR 设计文档 M2/M3 实现
// 提供 abstractRecognize（抽象形状识别，M2）和 contourRecognize（轮廓识别，M3）两种算法
// 主入口 recognize 根据 mode 选择识别路径，contour 模式失败时回退到 abstract

import type { DrawnShape, VirtualKey, RecognitionResult, Instrument } from './types';

// ==================== 常量 ====================

// 七声音名（用于生成钢琴音高序列）
const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// 吉他 6 根弦音高（固定，按 x 坐标排序后依次对应）
const GUITAR_NOTES: readonly string[] = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];

// 小提琴 4 根弦音高（固定，按 x 坐标排序后依次对应）
const VIOLIN_NOTES: readonly string[] = ['G3', 'D4', 'A4', 'E5'];

// 长笛音高序列（按圆点 x 坐标排序后依次对应）
const FLUTE_NOTES: readonly string[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];

// 架子鼓音位序列（kick/snare/tom1/tom2/cymbal）
const DRUMS_NOTES: readonly string[] = ['kick', 'snare', 'tom1', 'tom2', 'cymbal'];

// ==================== 辅助函数 ====================

// 生成钢琴音高序列 [C4, D4, E4, F4, G4, A4, B4, C5, D5, E5, ...]
function generatePianoNotes(count: number): string[] {
  const notes: string[] = [];
  let octave = 4;
  let idx = 0;
  for (let i = 0; i < count; i++) {
    notes.push(NOTE_NAMES[idx] + octave);
    idx++;
    if (idx >= NOTE_NAMES.length) {
      idx = 0;
      octave++;
    }
  }
  return notes;
}

// 画布 boundingBox（所有形状的外接矩形，用于坐标归一化）
interface BBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

// 计算所有形状的外接矩形
function getBoundingBox(shapes: DrawnShape[]): BBox | null {
  if (shapes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of shapes) {
    if (s.x < minX) minX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.x + s.width > maxX) maxX = s.x + s.width;
    if (s.y + s.height > maxY) maxY = s.y + s.height;
  }
  // 防止除零：宽高至少为 1
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  return { minX, minY, width, height };
}

// 将 shape 坐标归一化到 [0,1]（以画布 boundingBox 为基准）
function normalizeBounds(shape: DrawnShape, bbox: BBox): VirtualKey['bounds'] {
  return {
    x: (shape.x - bbox.minX) / bbox.width,
    y: (shape.y - bbox.minY) / bbox.height,
    width: shape.width / bbox.width,
    height: shape.height / bbox.height,
  };
}

// 构建 VirtualKey，id 格式 'key-0'/'key-1'，lastTriggeredAt 初始化为 0
function buildKey(index: number, note: string, shape: DrawnShape, bbox: BBox): VirtualKey {
  return {
    id: `key-${index}`,
    note,
    bounds: normalizeBounds(shape, bbox),
    lastTriggeredAt: 0,
  };
}

// 形状分类（M2 步骤 2）
type ShapeCategory = 'block' | 'hbar' | 'vbar';

function classifyShape(shape: DrawnShape): ShapeCategory {
  // 防止除零
  const w = Math.max(0.01, shape.width);
  const h = Math.max(0.01, shape.height);
  const ratio = Math.max(w, h) / Math.min(w, h);

  if (ratio < 1.5) return 'block';
  if (ratio >= 3) {
    return w > h ? 'hbar' : 'vbar';
  }
  // 1.5 <= ratio < 3：按原始 type 处理
  if (shape.type === 'line') {
    return w > h ? 'hbar' : 'vbar';
  }
  // rect / circle / ellipse 视为块状
  return 'block';
}

// 两点欧氏距离
function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// 形状中心点
function shapeCenter(shape: DrawnShape): { x: number; y: number } {
  return {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2,
  };
}

// ==================== 抽象形状识别（M2）====================

/**
 * 抽象形状识别 - 沿用原 SoundShape 逻辑
 * 严格按文档 M2 步骤实现：分类 → 统计 → 按优先级判断乐器
 */
export function abstractRecognize(shapes: DrawnShape[]): RecognitionResult | null {
  if (shapes.length === 0) return null;

  const bbox = getBoundingBox(shapes);
  if (!bbox) return null;

  // 步骤 1-3：分类所有形状并统计 blockCount/horizontalBarCount/verticalBarCount
  const blocks: DrawnShape[] = [];
  const hbars: DrawnShape[] = [];
  const vbars: DrawnShape[] = [];

  for (const s of shapes) {
    const cat = classifyShape(s);
    if (cat === 'block') blocks.push(s);
    else if (cat === 'hbar') hbars.push(s);
    else vbars.push(s);
  }

  const blockCount = blocks.length;
  const horizontalBarCount = hbars.length;
  const verticalBarCount = vbars.length;

  // 步骤 4：按优先级判断乐器（匹配第一个即返回）

  // a. verticalBarCount === 6 → guitar，6 根弦音高固定 [E2, A2, D3, G3, B3, E4]
  if (verticalBarCount === 6) {
    const sorted = [...vbars].sort((a, b) => a.x - b.x);
    const keys = sorted.map((s, i) => buildKey(i, GUITAR_NOTES[i], s, bbox));
    return {
      instrument: 'guitar',
      confidence: 0.9,
      mode: 'abstract',
      keys,
    };
  }

  // b. verticalBarCount === 4 → violin，4 根弦音高固定 [G3, D4, A4, E5]
  if (verticalBarCount === 4) {
    const sorted = [...vbars].sort((a, b) => a.x - b.x);
    const keys = sorted.map((s, i) => buildKey(i, VIOLIN_NOTES[i], s, bbox));
    return {
      instrument: 'violin',
      confidence: 0.9,
      mode: 'abstract',
      keys,
    };
  }

  // c. blockCount >= 5 且这些块状形状的 y 坐标差 < 平均高度的 50%（横向排列）→ piano
  //    音高按 x 坐标排序后依次分配 [C4, D4, E4, F4, G4, A4, B4, C5, D5, E5, ...]
  if (blockCount >= 5) {
    const yCenters = blocks.map(b => b.y + b.height / 2);
    let yMax = -Infinity;
    let yMin = Infinity;
    for (const y of yCenters) {
      if (y > yMax) yMax = y;
      if (y < yMin) yMin = y;
    }
    const yDiff = yMax - yMin;
    let heightSum = 0;
    for (const b of blocks) heightSum += b.height;
    const avgHeight = heightSum / blockCount;

    if (yDiff < avgHeight * 0.5) {
      const sorted = [...blocks].sort((a, b) => a.x - b.x);
      const notes = generatePianoNotes(blockCount);
      const keys = sorted.map((s, i) => buildKey(i, notes[i], s, bbox));
      return {
        instrument: 'piano',
        confidence: 0.85,
        mode: 'abstract',
        keys,
      };
    }
  }

  // d. horizontalBarCount === 1 且 blockCount >= 3 → flute
  //    音高按圆点 x 坐标排序分配 [C4, D4, E4, F4, G4, A4, B4]
  if (horizontalBarCount === 1 && blockCount >= 3) {
    const sorted = [...blocks].sort((a, b) => a.x - b.x);
    const keys = sorted.map((s, i) =>
      buildKey(i, FLUTE_NOTES[i % FLUTE_NOTES.length], s, bbox)
    );
    return {
      instrument: 'flute',
      confidence: 0.85,
      mode: 'abstract',
      keys,
    };
  }

  // e. blockCount >= 3 且这些块状形状分散（任意两块的中心距离 > 平均尺寸）→ drums
  //    音高按顺序分配底鼓/军鼓/嗵鼓1/嗵鼓2/镲（kick/snare/tom1/tom2/cymbal）
  if (blockCount >= 3) {
    const centers = blocks.map(shapeCenter);
    let sizeSum = 0;
    for (const b of blocks) sizeSum += (b.width + b.height) / 2;
    const avgSize = sizeSum / blockCount;

    // 检查任意两块的中心距离是否都 > 平均尺寸
    let allDispersed = true;
    for (let i = 0; i < centers.length && allDispersed; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const d = distance(centers[i].x, centers[i].y, centers[j].x, centers[j].y);
        if (d <= avgSize) {
          allDispersed = false;
          break;
        }
      }
    }

    if (allDispersed) {
      // 按位置排序：先按 y（上下），再按 x（左右）
      const sorted = [...blocks].sort((a, b) => {
        const ca = shapeCenter(a);
        const cb = shapeCenter(b);
        if (Math.abs(ca.y - cb.y) > avgSize * 0.5) {
          return ca.y - cb.y;
        }
        return ca.x - cb.x;
      });
      const keys = sorted.map((s, i) =>
        buildKey(i, DRUMS_NOTES[i % DRUMS_NOTES.length], s, bbox)
      );
      return {
        instrument: 'drums',
        confidence: 0.8,
        mode: 'abstract',
        keys,
      };
    }
  }

  // f. 其他情况 → 返回 null
  return null;
}

// ==================== 乐器轮廓识别（M3）====================

// 轮廓匹配内部结果（不含 mode，由 contourRecognize 统一添加）
interface ContourMatch {
  instrument: Instrument;
  confidence: number;
  keys: VirtualKey[];
}

// 钢琴轮廓：6-12 个 rect 且横向排列
function matchPianoContour(shapes: DrawnShape[]): ContourMatch | null {
  const rects = shapes.filter(s => s.type === 'rect');
  if (rects.length < 6 || rects.length > 12) return null;

  // 检查横向排列：y 坐标差 < 平均高度的 50%
  const yCenters = rects.map(r => r.y + r.height / 2);
  let yMax = -Infinity;
  let yMin = Infinity;
  for (const y of yCenters) {
    if (y > yMax) yMax = y;
    if (y < yMin) yMin = y;
  }
  const yDiff = yMax - yMin;
  const avgHeight = rects.reduce((s, r) => s + r.height, 0) / rects.length;
  if (yDiff >= avgHeight * 0.5) return null;

  const bbox = getBoundingBox(shapes);
  if (!bbox) return null;

  const sorted = [...rects].sort((a, b) => a.x - b.x);
  const notes = generatePianoNotes(rects.length);
  const keys = sorted.map((s, i) => buildKey(i, notes[i], s, bbox));

  // confidence：基于排列对齐度和数量充分度
  const alignmentScore = 1 - yDiff / (avgHeight * 0.5);
  const countScore = Math.min(1, rects.length / 8);
  const confidence = Math.min(0.95, 0.7 + 0.15 * alignmentScore + 0.1 * countScore);

  return { instrument: 'piano', confidence, keys };
}

// 吉他轮廓：6 条平行横线 + 可选椭圆音孔
function matchGuitarContour(shapes: DrawnShape[]): ContourMatch | null {
  // 找出所有横向 line（width > height）
  const hlines = shapes.filter(s => s.type === 'line' && s.width > s.height);
  if (hlines.length !== 6) return null;

  // 按 y 排序，检查平行度（间距是否均匀）
  const sorted = [...hlines].sort((a, b) => a.y - b.y);
  const yCenters = sorted.map(s => s.y + s.height / 2);

  const gaps: number[] = [];
  for (let i = 1; i < yCenters.length; i++) {
    gaps.push(yCenters[i] - yCenters[i - 1]);
  }
  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  if (avgGap <= 0) return null;

  // 间距差异不超过 30% 视为平行
  const gapVariance = gaps.reduce((s, g) => s + Math.abs(g - avgGap), 0) / gaps.length;
  if (gapVariance / avgGap > 0.3) return null;

  const bbox = getBoundingBox(shapes);
  if (!bbox) return null;

  // 6 根弦音高固定 [E2, A2, D3, G3, B3, E4]
  const keys = sorted.map((s, i) => buildKey(i, GUITAR_NOTES[i], s, bbox));

  const parallelScore = 1 - gapVariance / avgGap;
  const confidence = Math.min(0.95, 0.75 + 0.2 * parallelScore);

  return { instrument: 'guitar', confidence, keys };
}

// 小提琴轮廓：4 条平行竖线 + 可选拉长椭圆琴身
function matchViolinContour(shapes: DrawnShape[]): ContourMatch | null {
  // 找出所有竖向 line（height > width）
  const vlines = shapes.filter(s => s.type === 'line' && s.height > s.width);
  if (vlines.length !== 4) return null;

  // 按 x 排序，检查平行度
  const sorted = [...vlines].sort((a, b) => a.x - b.x);
  const xCenters = sorted.map(s => s.x + s.width / 2);

  const gaps: number[] = [];
  for (let i = 1; i < xCenters.length; i++) {
    gaps.push(xCenters[i] - xCenters[i - 1]);
  }
  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  if (avgGap <= 0) return null;

  const gapVariance = gaps.reduce((s, g) => s + Math.abs(g - avgGap), 0) / gaps.length;
  if (gapVariance / avgGap > 0.3) return null;

  const bbox = getBoundingBox(shapes);
  if (!bbox) return null;

  // 4 根弦音高固定 [G3, D4, A4, E5]
  const keys = sorted.map((s, i) => buildKey(i, VIOLIN_NOTES[i], s, bbox));

  const parallelScore = 1 - gapVariance / avgGap;
  const confidence = Math.min(0.95, 0.75 + 0.2 * parallelScore);

  return { instrument: 'violin', confidence, keys };
}

// 长笛轮廓：1 条长横线 + 5-8 个小圆点
function matchFluteContour(shapes: DrawnShape[]): ContourMatch | null {
  const hlines = shapes.filter(s => s.type === 'line' && s.width > s.height);
  if (hlines.length !== 1) return null;

  const fluteLine = hlines[0];
  const lineY = fluteLine.y + fluteLine.height / 2;

  // 找圆点（circle 类型）
  const dots = shapes.filter(s => s.type === 'circle');
  if (dots.length < 5 || dots.length > 8) return null;

  // 圆点应在线条附近（y 坐标接近，容差为线条高度的 3 倍或 20 像素）
  const tolerance = Math.max(fluteLine.height * 3, 20);
  const dotsNearLine = dots.filter(d => {
    const dotY = d.y + d.height / 2;
    return Math.abs(dotY - lineY) < tolerance;
  });
  if (dotsNearLine.length < 5) return null;

  const bbox = getBoundingBox(shapes);
  if (!bbox) return null;

  // 音高按圆点 x 坐标排序分配 [C4, D4, E4, F4, G4, A4, B4]
  const sorted = [...dotsNearLine].sort((a, b) => a.x - b.x);
  const keys = sorted.map((s, i) =>
    buildKey(i, FLUTE_NOTES[i % FLUTE_NOTES.length], s, bbox)
  );

  const confidence = Math.min(0.95, 0.7 + 0.05 * dotsNearLine.length);

  return { instrument: 'flute', confidence, keys };
}

// 架子鼓轮廓：5 个不等大的圆/方块分散排列
function matchDrumsContour(shapes: DrawnShape[]): ContourMatch | null {
  const blocks = shapes.filter(s => s.type === 'rect' || s.type === 'circle');
  if (blocks.length !== 5) return null;

  // 检查不等大：尺寸变异系数需 > 0.15
  const sizes = blocks.map(b => (b.width + b.height) / 2);
  const avgSize = sizes.reduce((s, sz) => s + sz, 0) / sizes.length;
  const sizeVariance = sizes.reduce((s, sz) => s + Math.abs(sz - avgSize), 0) / sizes.length;
  if (sizeVariance / avgSize < 0.15) return null;

  // 检查分散：任意两块的中心距离 > 平均尺寸
  const centers = blocks.map(shapeCenter);
  let allDispersed = true;
  for (let i = 0; i < centers.length && allDispersed; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const d = distance(centers[i].x, centers[i].y, centers[j].x, centers[j].y);
      if (d <= avgSize) {
        allDispersed = false;
        break;
      }
    }
  }
  if (!allDispersed) return null;

  const bbox = getBoundingBox(shapes);
  if (!bbox) return null;

  // 按位置排序（先上下，后左右），分配 kick/snare/tom1/tom2/cymbal
  const sorted = [...blocks].sort((a, b) => {
    const ca = shapeCenter(a);
    const cb = shapeCenter(b);
    if (Math.abs(ca.y - cb.y) > avgSize * 0.5) {
      return ca.y - cb.y;
    }
    return ca.x - cb.x;
  });
  const keys = sorted.map((s, i) =>
    buildKey(i, DRUMS_NOTES[i % DRUMS_NOTES.length], s, bbox)
  );

  const confidence = Math.min(0.95, 0.75 + 0.2 * (sizeVariance / avgSize));

  return { instrument: 'drums', confidence, keys };
}

/**
 * 乐器轮廓识别（M3）- 模式 A 优先识别路径
 * 按优先级尝试 5 种乐器轮廓匹配，匹配成功返回 mode='contour'
 * 全部匹配失败时回退到 abstractRecognize，返回 mode='abstract'
 */
export function contourRecognize(shapes: DrawnShape[]): RecognitionResult | null {
  if (shapes.length === 0) return null;

  // 按文档 M3 优先级顺序尝试匹配
  const matchers: Array<(shapes: DrawnShape[]) => ContourMatch | null> = [
    matchPianoContour,
    matchGuitarContour,
    matchViolinContour,
    matchFluteContour,
    matchDrumsContour,
  ];

  for (const matcher of matchers) {
    const result = matcher(shapes);
    if (result) {
      return {
        instrument: result.instrument,
        confidence: result.confidence,
        mode: 'contour',
        keys: result.keys,
      };
    }
  }

  // 轮廓匹配失败，回退到抽象识别（返回 mode='abstract'）
  return abstractRecognize(shapes);
}

// ==================== 主入口 ====================

/**
 * 识别主入口
 * @param shapes 用户绘制的形状数组
 * @param mode 识别模式：'contour' 先轮廓匹配后回退；'abstract' 直接抽象识别
 * @returns 识别结果，无法识别时返回 null
 */
export function recognize(
  shapes: DrawnShape[],
  mode: 'contour' | 'abstract'
): RecognitionResult | null {
  if (mode === 'contour') {
    return contourRecognize(shapes);
  }
  return abstractRecognize(shapes);
}
