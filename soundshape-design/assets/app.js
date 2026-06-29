/* ==========================================================================
 * 声形绘 SoundShape - 全站共享脚本
 * 严格按文档实现：
 *   - 数据模型文档：localStorage key、字段名
 *   - API 文档：notesPlayed/durationSec/timestamp 字段
 *   - 模块文档 M2：识别算法阈值
 *   - 模块文档 M4：键盘备用模式映射表
 *   - 模块文档 M6：音色合成参数
 *   - 模块文档 M13：用户设置持久化
 * ========================================================================== */

(function (global) {
  'use strict';

  const SS = {};

  /* ---------- 1. 页面路由（M1） ---------- */
  const ROUTES = {
    'nav-home': 'home.html',
    'cta-start': 'workbench.html',
    'nav-login': 'login.html',
    'nav-register': 'register.html',
    'nav-profile': 'profile.html',
    'nav-workbench': 'workbench.html',
    'btn-identify': 'workbench-result.html',
    'btn-reidentify': 'workbench.html',
    'btn-play': 'workbench-play.html',
    'btn-back-result': 'workbench-result.html',
    'btn-close-play': 'workbench.html',
    'login-success': 'home.html',
    'register-success': 'home.html',
    'goto-register': 'register.html',
    'goto-login': 'login.html'
  };

  SS.bindNavigation = function () {
    document.querySelectorAll('[data-dom-id]').forEach(function (el) {
      if (el.__ssNavBound) return;
      el.__ssNavBound = true;
      el.addEventListener('click', function (e) {
        const id = el.getAttribute('data-dom-id');
        const target = ROUTES[id];
        if (target) {
          e.preventDefault();
          window.location.href = target;
        }
      });
    });
  };

  /* ---------- 2. 本地存储（M13 数据模型文档规范） ---------- */
  // 文档第四章：localStorage key 规范
  const KEY_TOKEN = 'soundshape_token';
  const KEY_SETTINGS = 'soundshape_settings';
  const KEY_PENDING_RECORD = 'soundshape_pending_record';
  const KEY_VISITED = 'soundshape_visited';

  // 模拟后端的账户表与记录表（文档要求通过 API 持久化，本地降级方案）
  const KEY_ACCOUNTS = 'ss_accounts';
  const KEY_USER = 'ss_user';
  const KEY_RECORDS = 'ss_records';
  const KEY_TUNINGS = 'ss_tunings';
  const KEY_LAST_INSTRUMENT = 'ss_last_instrument';

  /* M13 用户设置（文档 2.1 UserSettings） */
  const DEFAULT_SETTINGS = {
    volume: 70,              // 0-100，默认 70
    sensitivity: 50,         // 0-100，默认 50
    showHandSkeleton: true,  // 默认 true
    theme: 'paper'           // 默认 paper
  };

  SS.store = {
    /* ---- 认证（M13）---- */
    getToken() { return localStorage.getItem(KEY_TOKEN); },
    setToken(t) { localStorage.setItem(KEY_TOKEN, t); },
    clearToken() { localStorage.removeItem(KEY_TOKEN); },

    getUser() {
      try { return JSON.parse(localStorage.getItem(KEY_USER) || 'null'); }
      catch { return null; }
    },
    setUser(u) { localStorage.setItem(KEY_USER, JSON.stringify(u)); },
    clearUser() { localStorage.removeItem(KEY_USER); },
    isLoggedIn() { return !!this.getToken() && !!this.getUser(); },

    /* ---- 设置（M13）---- */
    getSettings() {
      try {
        const s = JSON.parse(localStorage.getItem(KEY_SETTINGS) || 'null');
        return Object.assign({}, DEFAULT_SETTINGS, s || {});
      } catch { return Object.assign({}, DEFAULT_SETTINGS); }
    },
    setSettings(partial) {
      const s = Object.assign({}, this.getSettings(), partial);
      localStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
      return s;
    },

    /* ---- 模拟账户表 ---- */
    getAccounts() {
      try { return JSON.parse(localStorage.getItem(KEY_ACCOUNTS) || '[]'); }
      catch { return []; }
    },
    findAccount(email) {
      const e = String(email || '').trim().toLowerCase();
      return this.getAccounts().find(a => String(a.email).toLowerCase() === e) || null;
    },
    addAccount(acc) {
      const list = this.getAccounts();
      acc.created_at = new Date().toISOString();
      list.push(acc);
      localStorage.setItem(KEY_ACCOUNTS, JSON.stringify(list));
      return acc;
    },
    /* 注册：API 文档 1.1 字段约束 */
    register(nickname, email, password) {
      nickname = String(nickname || '').trim();
      email = String(email || '').trim();
      if (!nickname || nickname.length > 20) return { ok: false, msg: '昵称需 1-20 字符' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, msg: '邮箱格式不正确' };
      // API 文档：password 8-32 位，至少含字母+数字
      if (password.length < 8 || password.length > 32) return { ok: false, msg: '密码需 8-32 位' };
      if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return { ok: false, msg: '密码需含字母和数字' };
      if (this.findAccount(email)) return { ok: false, msg: '该邮箱已注册' };
      const acc = { nickname, email, password };
      this.addAccount(acc);
      // 模拟 JWT token
      const token = 'mock.' + btoa(email) + '.' + Date.now();
      this.setToken(token);
      this.setUser({ id: 'u_' + Date.now(), email, nickname, createdAt: acc.created_at });
      return { ok: true, token, user: { id: 'u_' + Date.now(), email, nickname } };
    },
    /* 登录：API 文档 1.2 */
    login(email, password) {
      email = String(email || '').trim();
      const acc = this.findAccount(email);
      if (!acc) return { ok: false, msg: '邮箱或密码错误' };
      if (acc.password !== password) return { ok: false, msg: '邮箱或密码错误' };
      const token = 'mock.' + btoa(email) + '.' + Date.now();
      this.setToken(token);
      const user = { id: 'u_' + Date.now(), email: acc.email, nickname: acc.nickname, createdAt: acc.created_at };
      this.setUser(user);
      return { ok: true, token, user };
    },

    /* ---- 演奏记录（API 文档字段：notesPlayed/durationSec/timestamp）---- */
    getRecords() {
      try { return JSON.parse(localStorage.getItem(KEY_RECORDS) || '[]'); }
      catch { return []; }
    },
    addRecord(r) {
      const list = this.getRecords();
      r.id = 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      r.created_at = new Date().toISOString();
      list.unshift(r);
      localStorage.setItem(KEY_RECORDS, JSON.stringify(list));
      return r;
    },
    deleteRecord(id) {
      const list = this.getRecords().filter(r => r.id !== id);
      localStorage.setItem(KEY_RECORDS, JSON.stringify(list));
    },

    /* ---- 调音记录（API 文档字段：targetNote/measuredFreq/deviationCents）---- */
    getTunings() {
      try { return JSON.parse(localStorage.getItem(KEY_TUNINGS) || '[]'); }
      catch { return []; }
    },
    addTuning(t) {
      const list = this.getTunings();
      t.id = 't_' + Date.now();
      t.created_at = new Date().toISOString();
      list.unshift(t);
      localStorage.setItem(KEY_TUNINGS, JSON.stringify(list));
      return t;
    },
    deleteTuning(id) {
      const list = this.getTunings().filter(t => t.id !== id);
      localStorage.setItem(KEY_TUNINGS, JSON.stringify(list));
    },

    /* ---- 待保存记录（数据模型文档：未登录暂存）---- */
    getPendingRecord() {
      try { return JSON.parse(localStorage.getItem(KEY_PENDING_RECORD) || 'null'); }
      catch { return null; }
    },
    setPendingRecord(r) { localStorage.setItem(KEY_PENDING_RECORD, JSON.stringify(r)); },
    clearPendingRecord() { localStorage.removeItem(KEY_PENDING_RECORD); },

    /* ---- 访问标记（引导用）---- */
    isVisited() { return localStorage.getItem(KEY_VISITED) === '1'; },
    markVisited() { localStorage.setItem(KEY_VISITED, '1'); },

    setLastInstrument(name) { localStorage.setItem(KEY_LAST_INSTRUMENT, name); },
    getLastInstrument() { return localStorage.getItem(KEY_LAST_INSTRUMENT) || 'piano'; }
  };

  /* ---------- 3. Web Audio 音色合成（M6 严格参数） ---------- */
  // M6 文档音名-频率对照表
  const NOTE_FREQ = (function () {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const map = {};
    for (let oct = 1; oct <= 7; oct++) {
      names.forEach((n, i) => {
        const semi = (oct - 4) * 12 + (i - 9);
        map[n + oct] = 440 * Math.pow(2, semi / 12);
      });
    }
    return map;
  })();
  SS.NOTE_FREQ = NOTE_FREQ;
  SS.noteToFreq = function (name) { return NOTE_FREQ[name] || 440; };

  /* M6 文档 INSTRUMENT_PRESETS（严格固定，不得调整） */
  const INSTRUMENT_PRESETS = {
    piano: {
      oscillators: [
        { type: 'triangle', gain: 0.6, detune: 0 },
        { type: 'sine', gain: 0.3, detune: 1200 },
        { type: 'sine', gain: 0.1, detune: 1902 }
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
        { type: 'sawtooth', gain: 0.4, detune: 8 },
        { type: 'sawtooth', gain: 0.4, detune: -8 }
      ],
      envelope: { attack: 0.08, decay: 0, sustain: 0.8, release: 0.4 },
      filter: { type: 'lowpass', frequency: 3000, Q: 1 },
      lfo: { frequency: 5, depth: 0.02 }
    },
    flute: {
      oscillators: [
        { type: 'sine', gain: 0.7, detune: 0 },
        { type: 'triangle', gain: 0.2, detune: 0 }
      ],
      envelope: { attack: 0.03, decay: 0, sustain: 0.7, release: 0.2 },
      filter: { type: 'lowpass', frequency: 2500, Q: 1 },
      noiseGain: 0.05
    },
    drums: {
      // 不同鼓件用不同合成（M6 文档）
      kick:    { oscillator: { type: 'sine', freqStart: 150, freqEnd: 50 },  envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.05 } },
      snare:   { noise: true, filter: { type: 'highpass', frequency: 1000 }, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 } },
      tom1:    { oscillator: { type: 'sine', freqStart: 200, freqEnd: 100 }, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.08 } },
      tom2:    { oscillator: { type: 'sine', freqStart: 150, freqEnd: 80 },  envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 } },
      cymbal:  { noise: true, filter: { type: 'highpass', frequency: 5000 }, envelope: { attack: 0.001, decay: 0.8, sustain: 0, release: 0.3 } }
    }
  };
  SS.INSTRUMENT_PRESETS = INSTRUMENT_PRESETS;

  // 各乐器默认音高布局（M2 文档）
  SS.INSTRUMENT_NOTES = {
    piano:  ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'],
    guitar: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    violin: ['G3', 'D4', 'A4', 'E5'],
    flute:  ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'],
    drums:  ['kick', 'snare', 'tom1', 'tom2', 'cymbal']
  };

  let ctx = null;
  let masterGain = null;
  let compressor = null;

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    compressor = ctx.createDynamicsCompressor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(compressor);
    compressor.connect(ctx.destination);
    return ctx;
  }

  SS.audio = {
    resume() {
      const c = ensureCtx();
      if (c && c.state === 'suspended') c.resume();
    },
    setVolume(v) {
      ensureCtx();
      if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
    },
    getVolume() { return masterGain ? masterGain.gain.value : 0.7; },
    /* M6：接收 TriggerEvent，合成音色 */
    play(note, instrument, duration) {
      const c = ensureCtx();
      if (!c) return null;
      if (c.state === 'suspended') c.resume();
      const now = c.currentTime;
      const t0 = now + 0.005;

      // 鼓组特殊处理（M6 drums 配置）
      if (instrument === 'drums') {
        return playDrum(c, note, t0);
      }

      const cfg = INSTRUMENT_PRESETS[instrument] || INSTRUMENT_PRESETS.piano;
      const freq = NOTE_FREQ[note] || 440;

      // 多 oscillator（M6 严格配置，含 detune）
      const voices = cfg.oscillators.map(oscCfg => {
        const osc = c.createOscillator();
        osc.type = oscCfg.type;
        osc.frequency.value = freq;
        osc.detune.value = oscCfg.detune || 0;
        const g = c.createGain();
        g.gain.value = oscCfg.gain;
        osc.connect(g);
        return { osc, gain: g };
      });

      // 滤波器
      let lastNodes = voices.map(v => v.gain);
      if (cfg.filter) {
        const f = c.createBiquadFilter();
        f.type = cfg.filter.type;
        f.frequency.value = cfg.filter.frequency;
        f.Q.value = cfg.filter.Q;
        voices.forEach(v => v.gain.connect(f));
        lastNodes = [f];
      }

      // 颤音 LFO（M6 violin: frequency 5, depth 0.02）
      if (cfg.lfo) {
        const lfo = c.createOscillator();
        const lfoGain = c.createGain();
        lfo.frequency.value = cfg.lfo.frequency;
        lfoGain.gain.value = freq * cfg.lfo.depth;
        voices.forEach(v => lfoGain.connect(v.osc.frequency));
        lfo.connect(lfoGain);
        lfo.start(t0);
        lfo.stop(t0 + (duration || 1.5) + cfg.envelope.release);
      }

      // 包络
      const env = c.createGain();
      const sus = cfg.envelope.sustain;
      const dur = duration || (cfg.envelope.attack + cfg.envelope.decay + 0.5);
      env.gain.setValueAtTime(0, t0);
      env.gain.linearRampToValueAtTime(1, t0 + cfg.envelope.attack);
      env.gain.linearRampToValueAtTime(sus, t0 + cfg.envelope.attack + cfg.envelope.decay);
      if (duration) {
        env.gain.setValueAtTime(sus, t0 + dur);
        env.gain.linearRampToValueAtTime(0, t0 + dur + cfg.envelope.release);
      } else {
        env.gain.setTargetAtTime(0, t0 + cfg.envelope.attack + cfg.envelope.decay + 0.3, cfg.envelope.release);
      }
      lastNodes.forEach(n => n.connect(env));
      env.connect(masterGain);

      // 气声噪声（M6 flute: noiseGain 0.05）
      if (cfg.noiseGain && cfg.noiseGain > 0) {
        const noiseBuf = createNoiseBuffer(c, 0.5);
        const src = c.createBufferSource();
        src.buffer = noiseBuf;
        const ng = c.createGain();
        ng.gain.value = cfg.noiseGain;
        const nf = c.createBiquadFilter();
        nf.type = 'bandpass';
        nf.frequency.value = freq;
        nf.Q.value = 2;
        src.connect(nf).connect(ng).connect(env);
        src.start(t0);
        src.stop(t0 + (duration || 1.5) + cfg.envelope.release);
      }

      voices.forEach(v => {
        v.osc.start(t0);
        v.osc.stop(t0 + (duration || 1.5) + cfg.envelope.release + 0.1);
      });

      return { stop() { try { voices.forEach(v => v.osc.stop()); } catch (e) {} } };
    }
  };

  function createNoiseBuffer(c, seconds) {
    const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* M6 drums 合成 */
  function playDrum(c, name, t0) {
    const cfg = INSTRUMENT_PRESETS.drums[name] || INSTRUMENT_PRESETS.drums.kick;
    const g = c.createGain();
    g.connect(masterGain);
    const env = cfg.envelope;
    if (cfg.noise) {
      const noise = c.createBufferSource();
      noise.buffer = createNoiseBuffer(c, 0.5);
      let node = noise;
      if (cfg.filter) {
        const f = c.createBiquadFilter();
        f.type = cfg.filter.type;
        f.frequency.value = cfg.filter.frequency;
        noise.connect(f);
        node = f;
      }
      g.gain.setValueAtTime(0.8, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + env.decay + env.release);
      node.connect(g);
      noise.start(t0);
      noise.stop(t0 + env.decay + env.release + 0.05);
    } else if (cfg.oscillator) {
      const o = c.createOscillator();
      o.type = cfg.oscillator.type;
      o.frequency.setValueAtTime(cfg.oscillator.freqStart, t0);
      o.frequency.exponentialRampToValueAtTime(cfg.oscillator.freqEnd, t0 + env.decay);
      g.gain.setValueAtTime(0.9, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + env.decay + env.release);
      o.connect(g);
      o.start(t0);
      o.stop(t0 + env.decay + env.release + 0.05);
    }
    return { stop() {} };
  }

  /* ---------- 4. 节拍器 ---------- */
  SS.Metronome = function (bpm) {
    this.bpm = bpm || 90;
    this.running = false;
    this._timer = null;
    this._beat = 0;
  };
  SS.Metronome.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this._beat = 0;
    const tick = () => {
      if (!this.running) return;
      const c = ensureCtx();
      if (c) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'square';
        o.frequency.value = (this._beat % 4 === 0) ? 1200 : 800;
        const t = c.currentTime;
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        o.connect(g).connect(masterGain);
        o.start(t); o.stop(t + 0.05);
      }
      this._beat++;
      this._timer = setTimeout(tick, 60000 / this.bpm);
    };
    tick();
  };
  SS.Metronome.prototype.stop = function () {
    this.running = false;
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
  };
  SS.Metronome.prototype.setBpm = function (b) { this.bpm = Math.max(30, Math.min(240, b)); };

  /* ---------- 5. 形状识别（M2 严格算法） ---------- */
  // M2 文档：识别算法（严格按此实现，不得自行调整阈值）
  SS.recognize = function (shapes) {
    if (!shapes || shapes.length === 0) {
      return { instrument: null, confidence: 0, reason: '还没画呢，先画几笔吧' };
    }

    // 步骤1：计算每个 shape 的 bounding box 长宽比
    const normalized = shapes.map(s => {
      const x = Math.min(s.x, s.x + s.w);
      const y = Math.min(s.y, s.y + s.h);
      const w = Math.abs(s.w);
      const h = Math.abs(s.h);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const ratio = (w === 0 || h === 0) ? 999 : (Math.max(w, h) / Math.min(w, h));
      return { ...s, x, y, w, h, cx, cy, ratio };
    });

    // 步骤2：分类
    normalized.forEach(s => {
      if (s.ratio < 1.5) s.category = 'block';
      else if (s.ratio >= 3 && s.w > s.h) s.category = 'horizontalBar';
      else if (s.ratio >= 3 && s.h > s.w) s.category = 'verticalBar';
      else s.category = 'medium';
    });

    // 步骤3：统计
    const blocks = normalized.filter(s => s.category === 'block' || (s.category === 'medium' && s.type === 'rect'));
    const horizontalBars = normalized.filter(s => s.category === 'horizontalBar');
    const verticalBars = normalized.filter(s => s.category === 'verticalBar' || (s.category === 'medium' && s.type === 'line' && s.h > s.w));
    const blockCount = blocks.length;
    const horizontalBarCount = horizontalBars.length;
    const verticalBarCount = verticalBars.length;

    // 步骤4：判断乐器（按优先级，匹配第一个即返回）
    // a. verticalBarCount === 6 → guitar
    if (verticalBarCount === 6) {
      return { instrument: 'guitar', confidence: 95, reason: '检测到 6 条竖向长条，识别为吉他' };
    }
    // b. verticalBarCount === 4 → violin
    if (verticalBarCount === 4) {
      return { instrument: 'violin', confidence: 92, reason: '检测到 4 条竖向长条，识别为小提琴' };
    }
    // c. blockCount >= 5 且横向排列 → piano
    if (blockCount >= 5) {
      const sorted = blocks.slice().sort((a, b) => a.cx - b.cx);
      const ys = sorted.map(s => s.cy);
      const yRange = Math.max(...ys) - Math.min(...ys);
      const avgH = sorted.reduce((sum, s) => sum + s.h, 0) / sorted.length;
      if (yRange < avgH * 0.5) {
        return { instrument: 'piano', confidence: 90, reason: '检测到 ' + blockCount + ' 个横向排列方块，识别为钢琴' };
      }
    }
    // d. horizontalBarCount === 1 且 blockCount >= 3 → flute
    if (horizontalBarCount === 1 && blockCount >= 3) {
      return { instrument: 'flute', confidence: 88, reason: '检测到横向长条加圆点，识别为长笛' };
    }
    // e. blockCount >= 3 且分散 → drums
    if (blockCount >= 3) {
      const centers = blocks.map(s => ({ x: s.cx, y: s.cy }));
      let minDist = Infinity;
      const avgSize = blocks.reduce((sum, s) => sum + (s.w + s.h) / 2, 0) / blocks.length;
      for (let i = 0; i < centers.length; i++) {
        for (let j = i + 1; j < centers.length; j++) {
          const d = Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y);
          if (d < minDist) minDist = d;
        }
      }
      if (minDist > avgSize) {
        return { instrument: 'drums', confidence: 85, reason: '检测到 ' + blockCount + ' 个分散形状，识别为架子鼓' };
      }
    }
    // f. 其他情况
    return { instrument: null, confidence: 0, reason: '特征不明显，再画几笔或试试示例模板' };
  };

  /* ---------- 6. 键盘备用模式映射表（M4 文档严格固定） ---------- */
  SS.KEYBOARD_MAP = {
    piano:  { 'a': 'C4', 's': 'D4', 'd': 'E4', 'f': 'F4', 'g': 'G4', 'h': 'A4', 'j': 'B4', 'k': 'C5' },
    guitar: { '1': 'E2', '2': 'A2', '3': 'D3', '4': 'G3', '5': 'B3', '6': 'E4' },
    violin: { '1': 'G3', '2': 'D4', '3': 'A4', '4': 'E5' },
    flute:  { 'a': 'C4', 's': 'D4', 'd': 'E4', 'f': 'F4', 'g': 'G4', 'h': 'A4', 'j': 'B4' },
    drums:  { 'q': 'kick', 'w': 'snare', 'e': 'tom1', 'r': 'tom2', 't': 'cymbal' }
  };

  /* ---------- 7. Toast 提示 ---------- */
  SS.toast = function (msg, type) {
    type = type || 'info';
    let wrap = document.getElementById('ss-toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'ss-toast-wrap';
      wrap.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    const colors = {
      info: 'background:#1d1d1f;color:#fff;',
      success: 'background:#34c759;color:#fff;',
      error: 'background:#ff3b30;color:#fff;',
      warn: 'background:#ff9500;color:#fff;'
    };
    t.textContent = msg;
    t.style.cssText = (colors[type] || colors.info) +
      'padding:10px 18px;border-radius:9999px;font-size:14px;font-weight:500;' +
      'box-shadow:0 8px 24px rgba(0,0,0,0.15);opacity:0;transform:translateY(-10px);' +
      'transition:all .25s ease;pointer-events:auto;max-width:90vw;';
    wrap.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(-10px)';
      setTimeout(() => t.remove(), 300);
    }, 3000);
  };

  /* ---------- 8. 页面间数据传递 ---------- */
  SS.flow = {
    setResult(data) { sessionStorage.setItem('ss_flow_result', JSON.stringify(data)); },
    getResult() {
      try { return JSON.parse(sessionStorage.getItem('ss_flow_result') || 'null'); }
      catch { return null; }
    },
    clearResult() { sessionStorage.removeItem('ss_flow_result'); }
  };

  /* ---------- 9. 自动绑定 ---------- */
  SS.init = function () {
    SS.bindNavigation();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', SS.init);
  } else {
    SS.init();
  }

  global.SS = SS;
})(window);
