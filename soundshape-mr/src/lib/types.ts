// @mode: ink|thunder
// 核心类型定义 - 严格按 MR 设计文档第八章数据模型
// 所有模块共享的类型契约

export type Instrument = 'piano' | 'guitar' | 'violin' | 'flute' | 'drums';

export type ShapeType = 'rect' | 'circle' | 'line' | 'ellipse';

// 用户绘制原始数据（模式 A 与 B 共用，文档 8.1）
export interface DrawnShape {
  id: string;
  type: ShapeType;
  x: number;          // 画布坐标（像素）
  y: number;
  width: number;
  height: number;
  strokeColor?: string;
  fillColor?: string;
}

// 虚拟键位（音位，文档 8.1）
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

// 识别结果（文档 8.1）
export interface RecognitionResult {
  instrument: Instrument;
  confidence: number;  // 0-1
  mode: 'contour' | 'abstract';  // 模式 A 命中 / 模式 B 回退
  keys: VirtualKey[];
}

// 触发事件（文档 5.3）
export interface TriggerEvent {
  keyId: string;
  note: string;
  timestamp: number;
  hand: 'Left' | 'Right';
}

// 工作台状态机（文档 8.2）
export type WorkbenchPhase =
  | 'idle'
  | 'drawing'
  | 'generating'
  | 'camera-pending'
  | 'camera-loading'
  | 'tracking'
  | 'paused'
  | 'error';

// MediaPipe 手部数据
export interface Landmark {
  x: number;  // 归一化 0-1
  y: number;
  z: number;  // 相对深度
}

export interface HandData {
  handedness: 'Left' | 'Right';
  landmarks: Landmark[];
  confidence: number;
}

// 食指准星 5 态状态机（文档 7.10.3）
export type CursorState = 'idle' | 'hovering' | 'triggering' | 'lost' | 'hidden';

// 悬停预热状态（文档 7.10.4）
export interface HoverState {
  type: 'idle' | 'hovering' | 'triggering';
  keyId?: string;
  progress?: number;  // 0-1，圆环填充比例
}

// 手势类型（文档 7.10.7）
export type GestureType = 'INDEX' | 'OPEN' | 'FIST' | 'PINCH' | 'V' | 'UNKNOWN';

// 用户设置（文档 2.1 UserSettings）
export interface UserSettings {
  volume: number;           // 0-100，默认 70
  sensitivity: number;      // 0-100，默认 50
  showHandSkeleton: boolean; // 默认 true
  theme: 'paper' | 'night'; // 默认 'paper'
}

// 用户信息
export interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
}

// 演奏记录（API 字段，文档 2.2）
export interface PlayRecord {
  id: string;
  userId?: string;
  instrument: Instrument;
  notesPlayed: Array<{ note: string; timestamp: number }>;
  durationSec: number;
  createdAt: string;
}

// 调音记录（API 字段，文档 3.2）
export interface TuningRecord {
  id: string;
  userId?: string;
  instrument: 'guitar' | 'violin';
  targetNote: string;
  measuredFreq: number;
  deviationCents: number;
  createdAt: string;
}

// 乐器元数据
export interface InstrumentMeta {
  id: Instrument;
  name: string;          // 中文名
  nameEn: string;        // 英文名
  notes: string[];       // 音位列表
  sealText: string;      // 印章字
  soulInk: string;       // 墨绘印章色
  soulHolo: string;      // 雷霆全息色
  soulMeaning: string;   // 灵格含义
}

// 5 乐器元数据（文档 7.4.3 灵格色）
export const INSTRUMENTS: Record<Instrument, InstrumentMeta> = {
  piano: {
    id: 'piano',
    name: '钢琴',
    nameEn: 'Piano',
    notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    sealText: '琴',
    soulInk: '#2C4A7C',
    soulHolo: '#00B4FF',
    soulMeaning: '沉静的水，理性的波动',
  },
  guitar: {
    id: 'guitar',
    name: '吉他',
    nameEn: 'Guitar',
    notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    sealText: '弦',
    soulInk: '#B33A2C',
    soulHolo: '#FF6B35',
    soulMeaning: '灼热的木，跳跃的火舌',
  },
  violin: {
    id: 'violin',
    name: '小提琴',
    nameEn: 'Violin',
    notes: ['G3', 'D4', 'A4', 'E5'],
    sealText: '弓',
    soulInk: '#A87C2C',
    soulHolo: '#FFCC33',
    soulMeaning: '流动的金，缠绵的丝弦',
  },
  flute: {
    id: 'flute',
    name: '长笛',
    nameEn: 'Flute',
    notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'],
    sealText: '笛',
    soulInk: '#5C7A3D',
    soulHolo: '#00FFA3',
    soulMeaning: '林间的风，清越的气流',
  },
  drums: {
    id: 'drums',
    name: '架子鼓',
    nameEn: 'Drums',
    notes: ['kick', 'snare', 'tom1', 'tom2', 'cymbal'],
    sealText: '鼓',
    soulInk: '#5C2C7C',
    soulHolo: '#B829FF',
    soulMeaning: '雷霆的骨，沉稳的震颤',
  },
};

// 绘制模式（文档 2.3）
export type DrawMode = 'contour' | 'abstract';

// 性能降级等级
export type EffectLevel = 0 | 1 | 2 | 3;  // 0=全关, 1=仅glow, 2=glow+burst, 3=全部
