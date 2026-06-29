// @mode: ink|thunder
// 工作台 - MR 演奏核心
// 集成 M2 绘制/识别 + M3 双态过渡 + M4/M5/M6 MR 渲染+手部追踪+触发
// 状态机严格按数据模型文档 8.2

import { useEffect, useRef, useState, useCallback } from 'react';
import { TopNav } from '../components/TopNav';
import { recognize } from '../lib/recognition';
import {
  projectToScene, unprojectFromScene,
  drawVirtualDesktop, drawHoloInstrument, EffectManager,
} from '../lib/mrRenderer';
import {
  HAND_CONFIG, TrailManager, checkTrigger,
  HandAnimationManager,
} from '../lib/handTracking';
import { play, resumeAudio } from '../lib/audio';
import { useUserStore, recordsStore, pendingStore } from '../lib/store';
import { showToast, genId } from '../lib/utils';
import type {
  DrawnShape, RecognitionResult, WorkbenchPhase,
  Instrument, HandData, EffectLevel, DrawMode,
} from '../lib/types';

// 5 乐器模板（文档 M2）
const TEMPLATES: Array<{ id: string; name: string; instrument: Instrument; shapes: DrawnShape[] }> = [
  {
    id: 'tpl-piano-8', name: '钢琴 8 键', instrument: 'piano',
    shapes: Array.from({ length: 8 }, (_, i) => ({
      id: `tpl-p${i}`, type: 'rect' as const,
      x: 50 + i * 80, y: 200, width: 70, height: 120,
    })),
  },
  {
    id: 'tpl-guitar-6', name: '吉他 6 弦', instrument: 'guitar',
    shapes: Array.from({ length: 6 }, (_, i) => ({
      id: `tpl-g${i}`, type: 'line' as const,
      x: 100 + i * 80, y: 80, width: 8, height: 320,
    })),
  },
  {
    id: 'tpl-violin-4', name: '小提琴 4 弦', instrument: 'violin',
    shapes: Array.from({ length: 4 }, (_, i) => ({
      id: `tpl-v${i}`, type: 'line' as const,
      x: 140 + i * 80, y: 80, width: 8, height: 320,
    })),
  },
  {
    id: 'tpl-flute-7', name: '长笛 7 键', instrument: 'flute',
    shapes: [
      { id: 'tpl-f-bar', type: 'line', x: 60, y: 200, width: 600, height: 8 },
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `tpl-f${i}`, type: 'circle' as const,
        x: 90 + i * 80, y: 180, width: 40, height: 40,
      })),
    ],
  },
  {
    id: 'tpl-drums-5', name: '架子鼓 5 件', instrument: 'drums',
    shapes: [
      { id: 'tpl-d0', type: 'circle', x: 100, y: 220, width: 90, height: 90 },  // kick
      { id: 'tpl-d1', type: 'circle', x: 250, y: 120, width: 70, height: 70 },  // snare
      { id: 'tpl-d2', type: 'circle', x: 380, y: 100, width: 60, height: 60 },  // tom1
      { id: 'tpl-d3', type: 'circle', x: 480, y: 130, width: 65, height: 65 },  // tom2
      { id: 'tpl-d4', type: 'circle', x: 580, y: 80, width: 80, height: 80 },   // cymbal
    ],
  },
];

export function WorkbenchPage() {
  // === 状态机 ===
  const [phase, setPhase] = useState<WorkbenchPhase>('idle');
  const [drawMode, setDrawMode] = useState<DrawMode>('contour');
  const [shapes, setShapes] = useState<DrawnShape[]>([]);
  const [recognition, setRecognition] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [fps, setFps] = useState(0);
  const [effectLevel, setEffectLevel] = useState<EffectLevel>(3);

  // === 用户设置 ===
  const settings = useUserStore(s => s.settings);
  const isAuthenticated = useUserStore(s => s.isAuthenticated);

  // === refs（性能关键路径，不走 state） ===
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const mrCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now() });
  const triggeredKeysRef = useRef<Map<string, number>>(new Map());  // keyId → lastTriggeredAt
  const trailMgrRef = useRef(new TrailManager());
  const handAnimMgrRef = useRef(new HandAnimationManager());
  const effectMgrRef = useRef(new EffectManager());
  const handIdMapRef = useRef<Map<string, number>>(new Map());  // 持续手部追踪用

  // 绘制状态
  const drawingRef = useRef(false);
  const currentShapeRef = useRef<DrawnShape | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const selectedToolRef = useRef<'rect' | 'circle' | 'line'>('rect');

  // === 工具栏工具选择 ===
  const [tool, setTool] = useState<'rect' | 'circle' | 'line'>('rect');
  useEffect(() => { selectedToolRef.current = tool; }, [tool]);

  // === 绘制画布事件 ===
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = drawCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== 'idle' && phase !== 'drawing') return;
    e.preventDefault();
    drawingRef.current = true;
    const pt = getCanvasPos(e);
    startPointRef.current = pt;
    currentShapeRef.current = {
      id: genId('shape'),
      type: selectedToolRef.current,
      x: pt.x, y: pt.y, width: 0, height: 0,
    };
    if (phase === 'idle') setPhase('drawing');
  };

  const moveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current || !currentShapeRef.current || !startPointRef.current) return;
    e.preventDefault();
    const pt = getCanvasPos(e);
    const start = startPointRef.current;
    const shape = currentShapeRef.current;
    if (shape.type === 'rect') {
      shape.x = Math.min(start.x, pt.x);
      shape.y = Math.min(start.y, pt.y);
      shape.width = Math.abs(pt.x - start.x);
      shape.height = Math.abs(pt.y - start.y);
    } else if (shape.type === 'circle') {
      const dx = pt.x - start.x;
      const dy = pt.y - start.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      shape.x = start.x - r;
      shape.y = start.y - r;
      shape.width = r * 2;
      shape.height = r * 2;
    } else if (shape.type === 'line') {
      shape.x = start.x;
      shape.y = start.y;
      shape.width = pt.x - start.x;
      shape.height = pt.y - start.y;
      // 对 line：存储为竖向或横向长条
      if (Math.abs(shape.width) > Math.abs(shape.height)) {
        shape.height = 8;
      } else {
        shape.width = 8;
      }
    }
    redrawDrawCanvas();
  };

  const endDraw = () => {
    if (!drawingRef.current || !currentShapeRef.current) return;
    drawingRef.current = false;
    const shape = currentShapeRef.current;
    if (shape.width > 5 && shape.height > 5) {
      setShapes(prev => [...prev, shape]);
    }
    currentShapeRef.current = null;
    startPointRef.current = null;
    redrawDrawCanvas();
  };

  const redrawDrawCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 五线谱水印（文档 7.5.4）
    ctx.save();
    ctx.strokeStyle = 'rgba(155, 139, 107, 0.15)';
    ctx.lineWidth = 1;
    const cy = canvas.height / 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(0, cy + i * 24);
      ctx.lineTo(canvas.width, cy + i * 24);
      ctx.stroke();
    }
    ctx.restore();

    // 已绘形状
    const allShapes = currentShapeRef.current ? [...shapes, currentShapeRef.current] : shapes;
    ctx.strokeStyle = '#1A1410';
    ctx.fillStyle = 'rgba(179, 58, 44, 0.15)';
    ctx.lineWidth = 2;
    for (const s of allShapes) {
      ctx.beginPath();
      if (s.type === 'rect') {
        ctx.rect(s.x, s.y, s.width, s.height);
      } else if (s.type === 'circle') {
        const cx = s.x + s.width / 2;
        const cy = s.y + s.height / 2;
        ctx.ellipse(cx, cy, s.width / 2, s.height / 2, 0, 0, Math.PI * 2);
      } else if (s.type === 'line') {
        ctx.rect(s.x, s.y, s.width, s.height);
      }
      ctx.fill();
      ctx.stroke();
    }
  }, [shapes]);

  useEffect(() => { redrawDrawCanvas(); }, [shapes, redrawDrawCanvas]);

  // === 模板加载 ===
  const loadTemplate = (tplId: string) => {
    const tpl = TEMPLATES.find(t => t.id === tplId);
    if (!tpl) return;
    setShapes(tpl.shapes.map(s => ({ ...s, id: genId('shape') })));
    setPhase('drawing');
    showToast(`已加载模板：${tpl.name}`, 'info');
  };

  // === 清空 ===
  const handleClear = () => {
    setShapes([]);
    setRecognition(null);
    setPhase('idle');
    setError(null);
  };

  // === 生成键位（识别） ===
  const handleGenerate = () => {
    if (shapes.length === 0) {
      showToast('请先画一些形状或选择模板', 'warn');
      return;
    }
    setPhase('generating');
    setTimeout(() => {
      const result = recognize(shapes, drawMode);
      if (!result || result.keys.length === 0) {
        setError({ code: 'SHAPE_NOT_RECOGNIZED', message: '无法识别乐器，请再画几笔或选择模板' });
        setPhase('error');
        showToast('识别失败，请重画或选择模板', 'error');
        return;
      }
      setRecognition(result);
      setPhase('camera-pending');
      showToast(`识别成功：${result.instrument}（${result.mode === 'contour' ? '轮廓匹配' : '抽象回退'}，${result.keys.length} 键）`, 'success');
    }, 600);
  };

  // === 双态过渡动画（文档 7.9，2.4s 九阶段） ===
  const playTransition = useCallback(async (): Promise<void> => {
    setTransitioning(true);
    // 切换到雷霆态
    document.documentElement.setAttribute('data-mode', 'thunder');

    // 简化的过渡：黑场 + 中心光点 + 全息升起（总计 2.4s）
    await new Promise(r => setTimeout(r, 2400));
    setTransitioning(false);
  }, []);

  // === 启动摄像头 + MediaPipe ===
  const startCamera = async () => {
    setPhase('camera-loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // 播放过渡动画
      await playTransition();

      // 加载 MediaPipe Hands
      await loadHands();

      setPhase('tracking');
      showToast('摄像头已开启，开始演奏', 'success');
      startRenderLoop();
    } catch (err: any) {
      handleCameraError(err);
    }
  };

  const handleCameraError = (err: any) => {
    console.error('摄像头错误', err);
    let code = 'CAMERA_ERROR';
    let msg = '摄像头开启失败';
    if (err.name === 'NotAllowedError') {
      code = 'CAMERA_NOT_ALLOWED';
      msg = '摄像头权限被拒绝，请在浏览器设置中允许';
    } else if (err.name === 'NotFoundError') {
      code = 'CAMERA_NOT_FOUND';
      msg = '未找到摄像头设备';
    } else if (err.name === 'NotReadableError') {
      code = 'CAMERA_NOT_READABLE';
      msg = '摄像头被其他程序占用';
    }
    setError({ code, message: msg });
    setPhase('error');
    showToast(msg + '，已降级到键盘模式', 'warn');
    // 降级到键盘模式：仍然进入 tracking 但无手部追踪
    setPhase('tracking');
    startRenderLoop();
  };

  // === 加载 MediaPipe Hands ===
  const loadHands = async () => {
    if (handsRef.current) return;
    try {
      // 动态加载 CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js';
      script.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('MediaPipe 加载失败'));
        document.head.appendChild(script);
      });

      const Hands = (window as any).Hands;
      const hands = new Hands(HAND_CONFIG);
      hands.setOptions({
        maxNumHands: HAND_CONFIG.maxNumHands,
        modelComplexity: HAND_CONFIG.modelComplexity,
        minDetectionConfidence: HAND_CONFIG.minDetectionConfidence,
        minTrackingConfidence: HAND_CONFIG.minTrackingConfidence,
      });
      hands.onResults(onHandsResults);
      handsRef.current = hands;
    } catch (err) {
      console.error('MediaPipe 加载失败，降级到键盘模式', err);
      showToast('手部追踪加载失败，已降级到键盘模式', 'warn');
    }
  };

  // === MediaPipe 结果回调 ===
  const onHandsResults = (results: any) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      // 手部丢失
      handIdMapRef.current.clear();
      return;
    }
    const now = performance.now();
    const hands: HandData[] = results.multiHandLandmarks.map((landmarks: any[], i: number) => {
      const handedness = results.multiHandedness[i].label as 'Left' | 'Right';
      const handId = `${handedness}-${i}`;
      if (!handIdMapRef.current.has(handId)) {
        handAnimMgrRef.current.onHandDetected(handId);
        handIdMapRef.current.set(handId, now);
      }
      return {
        handedness,
        landmarks: landmarks.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z })),
        confidence: results.multiHandedness[i].score,
      };
    });
    // 检查丢失的手
    const currentIds = new Set(hands.map((_, i) => `${results.multiHandedness[i].label}-${i}`));
    for (const id of handIdMapRef.current.keys()) {
      if (!currentIds.has(id)) {
        handAnimMgrRef.current.onHandLost(id);
        handIdMapRef.current.delete(id);
      }
    }
    // 处理触发
    processHands(hands);
  };

  // === 处理手部触发 ===
  const processHands = (hands: HandData[]) => {
    if (!recognition || phase !== 'tracking') return;
    const canvas = mrCanvasRef.current;
    if (!canvas) return;
    const now = performance.now();

    for (const hand of hands) {
      const { triggered } = checkTrigger(
        hand,
        recognition.keys,
        settings.sensitivity,
        canvas.width, canvas.height,
        150,
        (sx, sy, sw, sh) => unprojectFromScene(sx, sy, sw, sh),
      );

      if (triggered) {
        // cooldown 判定
        const last = triggeredKeysRef.current.get(triggered.keyId) || 0;
        if (now - last < 150) continue;
        triggeredKeysRef.current.set(triggered.keyId, now);

        // 播放音色
        resumeAudio();
        play(triggered.note, recognition.instrument, 0.5);

        // 触发光效
        const key = recognition.keys.find(k => k.id === triggered.keyId);
        if (key) {
          const center = projectToScene(
            key.bounds.x + key.bounds.width / 2,
            key.bounds.y + key.bounds.height / 2,
            canvas.width, canvas.height,
          );
          effectMgrRef.current.trigger({
            keyId: triggered.keyId,
            note: triggered.note,
            x: center.x,
            y: center.y,
            bornAt: now,
            instrument: recognition.instrument,
          });
        }

        // 食指拖尾
        const tip = hand.landmarks[8];
        trailMgrRef.current.add(
          (1 - tip.x) * canvas.width,  // 镜像
          tip.y * canvas.height,
        );
      }
    }
  };

  // === 渲染循环 ===
  const startRenderLoop = () => {
    const loop = async () => {
      if (phase !== 'tracking' && phase !== 'paused') return;
      const canvas = mrCanvasRef.current;
      const video = videoRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext('2d')!;
      const now = performance.now();

      // FPS 监控
      fpsCounterRef.current.frames++;
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        setFps(fpsCounterRef.current.frames);
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;

        // 性能降级
        if (fpsCounterRef.current.frames < 15 && effectLevel > 0) {
          setEffectLevel(prev => (prev > 0 ? (prev - 1) as EffectLevel : 0));
          showToast(`性能降级到 L${effectLevel - 1}`, 'warn');
        }
      }

      effectMgrRef.current.setLevel(effectLevel);

      // 清屏
      ctx.fillStyle = '#050407';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Layer 1: 摄像头画面（镜像翻转）
      if (video && video.readyState >= 2) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        // 暗化
        ctx.fillStyle = 'rgba(5, 4, 7, 0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Layer 2: 虚拟桌面阴影
      drawVirtualDesktop(ctx, canvas.width, canvas.height);

      // Layer 3: 全息乐器投射
      if (recognition) {
        drawHoloInstrument(
          ctx, recognition.keys, recognition.instrument,
          canvas.width, canvas.height,
          null, null, 0,
        );
      }

      // Layer 4: 触发光效
      effectMgrRef.current.update(now);
      // 应用震屏偏移
      const shake = (effectMgrRef.current as any).shakeOffset || { x: 0, y: 0 };
      ctx.save();
      ctx.translate(shake.x, shake.y);
      effectMgrRef.current.draw(ctx, canvas.width, canvas.height);
      ctx.restore();

      // Layer 5: 手部骨架 + 食指准星
      if (handsRef.current && video && video.readyState >= 2) {
        try {
          await handsRef.current.send({ image: video });
        } catch (e) {
          // MediaPipe 推理失败，跳过
        }
      }

      // 拖尾
      trailMgrRef.current.draw(ctx, '#FFCC33');

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // === 停止 ===
  const handleStop = () => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setPhase('camera-pending');
    document.documentElement.setAttribute('data-mode', 'ink');
  };

  // === 保存演奏记录 ===
  const handleSave = () => {
    if (!recognition) return;
    const durationSec = Math.floor((performance.now() - (fpsCounterRef.current.lastTime - 1000)) / 1000);
    const notesPlayed = Array.from(triggeredKeysRef.current.entries()).map(([keyId, ts]) => {
      const key = recognition.keys.find(k => k.id === keyId);
      return { note: key?.note || '', timestamp: Math.floor(ts) };
    }).filter(n => n.note);

    const record = {
      instrument: recognition.instrument,
      notesPlayed,
      durationSec: Math.max(1, durationSec),
    };

    if (isAuthenticated) {
      recordsStore.addRecord(record);
      showToast('演奏记录已保存', 'success');
    } else {
      pendingStore.set({
        id: 'pending',
        createdAt: new Date().toISOString(),
        ...record,
      });
      showToast('未登录，记录已暂存，登录后自动保存', 'info');
    }
  };

  // === 键盘备用模式（M4） ===
  useEffect(() => {
    if (phase !== 'tracking' || !recognition) return;
    const KEYBOARD_MAP: Record<string, number> = {
      piano: { a: 0, s: 1, d: 2, f: 3, g: 4, h: 5, j: 6, k: 7 },
      guitar: { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5 },
      violin: { '1': 0, '2': 1, '3': 2, '4': 3 },
      flute: { a: 0, s: 1, d: 2, f: 3, g: 4, h: 5, j: 6 },
      drums: { q: 0, w: 1, e: 2, r: 3, t: 4 },
    }[recognition.instrument] as Record<string, number>;

    const handler = (e: KeyboardEvent) => {
      const idx = KEYBOARD_MAP[e.key.toLowerCase()];
      if (idx === undefined) return;
      const key = recognition.keys[idx];
      if (!key) return;
      const now = performance.now();
      const last = triggeredKeysRef.current.get(key.id) || 0;
      if (now - last < 150) return;
      triggeredKeysRef.current.set(key.id, now);
      resumeAudio();
      play(key.note, recognition.instrument, 0.5);
      // 触发光效
      const canvas = mrCanvasRef.current;
      if (canvas) {
        const center = projectToScene(
          key.bounds.x + key.bounds.width / 2,
          key.bounds.y + key.bounds.height / 2,
          canvas.width, canvas.height,
        );
        effectMgrRef.current.trigger({
          keyId: key.id, note: key.note,
          x: center.x, y: center.y, bornAt: now,
          instrument: recognition.instrument,
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, recognition]);

  // === 清理 ===
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // === 渲染 ===
  return (
    <div className="parchment-bg min-h-screen">
      <TopNav />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-display-1" style={{ color: 'var(--ink-full)' }}>工作台</h1>
            <p className="text-caption" style={{ color: 'var(--ink-faint)' }}>
              状态：{phase} {fps > 0 && `· ${fps} FPS · L${effectLevel}`}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleClear} className="btn-engrave" style={{ padding: '8px 16px', fontSize: 13 }}>
              清空
            </button>
            {(phase === 'idle' || phase === 'drawing') && (
              <button onClick={handleGenerate} className="btn-engrave" style={{ padding: '8px 16px', fontSize: 13 }}>
                生成键位
              </button>
            )}
            {phase === 'camera-pending' && (
              <button onClick={startCamera} className="btn-engrave" style={{ padding: '8px 16px', fontSize: 13 }}>
                唤声（开启摄像头）
              </button>
            )}
            {(phase === 'tracking' || phase === 'paused') && (
              <>
                <button onClick={handleSave} className="btn-engrave" style={{ padding: '8px 16px', fontSize: 13 }}>
                  保存记录
                </button>
                <button onClick={handleStop} className="btn-engrave" style={{ padding: '8px 16px', fontSize: 13, background: 'var(--cinnabar)' }}>
                  停止
                </button>
              </>
            )}
          </div>
        </div>

        {/* 模式切换 */}
        {(phase === 'idle' || phase === 'drawing') && (
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setDrawMode('contour')}
              className="font-body text-body"
              style={{
                padding: '8px 16px',
                background: drawMode === 'contour' ? 'var(--ink-full)' : 'transparent',
                color: drawMode === 'contour' ? 'var(--parchment-base)' : 'var(--ink-mid)',
                border: '1px solid var(--ink-mid)',
                cursor: 'pointer',
              }}
            >
              模式 A：画乐器轮廓
            </button>
            <button
              onClick={() => setDrawMode('abstract')}
              className="font-body text-body"
              style={{
                padding: '8px 16px',
                background: drawMode === 'abstract' ? 'var(--ink-full)' : 'transparent',
                color: drawMode === 'abstract' ? 'var(--parchment-base)' : 'var(--ink-mid)',
                border: '1px solid var(--ink-mid)',
                cursor: 'pointer',
              }}
            >
              模式 B：画抽象形状
            </button>
          </div>
        )}

        {/* 工具栏 */}
        {(phase === 'idle' || phase === 'drawing') && (
          <div className="flex gap-2 mb-4">
            {(['rect', 'circle', 'line'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className="font-mono text-caption"
                style={{
                  padding: '6px 12px',
                  background: tool === t ? 'var(--cinnabar)' : 'transparent',
                  color: tool === t ? 'var(--parchment-base)' : 'var(--ink-mid)',
                  border: '1px solid var(--gold-faint)',
                  cursor: 'pointer',
                }}
              >
                {t === 'rect' ? '矩形' : t === 'circle' ? '圆形' : '长条'}
              </button>
            ))}
          </div>
        )}

        {/* 模板 */}
        {(phase === 'idle' || phase === 'drawing') && (
          <div className="mb-4">
            <p className="text-caption mb-2" style={{ color: 'var(--ink-faint)' }}>或选择模板：</p>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => loadTemplate(tpl.id)}
                  className="font-body text-body"
                  style={{
                    padding: '6px 12px',
                    background: 'var(--parchment-deep)',
                    color: 'var(--ink-mid)',
                    border: '1px solid var(--gold-faint)',
                    cursor: 'pointer',
                  }}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 画布区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 绘制画布 */}
          {(phase === 'idle' || phase === 'drawing' || phase === 'generating' || phase === 'error') && (
            <div className="card-scroll">
              <p className="text-caption mb-3" style={{ color: 'var(--ink-faint)' }}>
                绘制画布（{shapes.length} 形状）
              </p>
              <canvas
                ref={drawCanvasRef}
                width={640}
                height={400}
                className="w-full staff-watermark"
                style={{
                  background: 'var(--parchment-base)',
                  border: '1px solid var(--gold-faint)',
                  cursor: 'crosshair',
                }}
                onMouseDown={startDraw}
                onMouseMove={moveDraw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={moveDraw}
                onTouchEnd={endDraw}
              />
              {error && (
                <p className="mt-3 font-body text-body" style={{ color: 'var(--cinnabar)' }}>
                  ⚠ {error.message}
                </p>
              )}
            </div>
          )}

          {/* MR 演奏画布 */}
          {(phase === 'camera-pending' || phase === 'camera-loading' || phase === 'tracking' || phase === 'paused') && (
            <div className="card-holo holo-border" style={{ position: 'relative' }}>
              <p className="text-caption mb-3" data-tag="MR · LIVE" style={{ color: 'var(--cyan-bright)' }}>
                MR 演奏区
              </p>
              <canvas
                ref={mrCanvasRef}
                width={640}
                height={400}
                className="w-full"
                style={{ background: '#050407', border: '1px solid var(--cyan-faint)' }}
              />
              <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
              {transitioning && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: '#000', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    width: 4, height: 4, background: 'var(--cyan-bright)',
                    borderRadius: '50%', boxShadow: '0 0 20px 10px var(--cyan-bright)',
                  }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 识别结果信息 */}
        {recognition && (
          <div className="mt-6 card-scroll">
            <p className="font-display text-display-2 mb-2" style={{ color: 'var(--ink-full)' }}>
              {recognition.instrument} · {recognition.keys.length} 键
            </p>
            <p className="text-caption" style={{ color: 'var(--ink-faint)' }}>
              识别模式：{recognition.mode === 'contour' ? '轮廓匹配（A）' : '抽象回退（B）'} ·
              置信度：{(recognition.confidence * 100).toFixed(0)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
