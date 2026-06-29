// @mode: thunder
// Web Audio 音色合成 - 严格按 M6 文档参数
// piano: 三 osc detune 0/1200/1902
// violin: 三 sawtooth detune 0/8/-8 + LFO freq 5 depth 0.02

import type { Instrument } from './types';

interface OscConfig {
  type: OscillatorType;
  gain: number;
  detune: number;
}

interface Envelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

interface FilterConfig {
  type: BiquadFilterType;
  frequency: number;
  Q: number;
}

interface InstrumentPreset {
  oscillators: OscConfig[];
  envelope: Envelope;
  filter: FilterConfig;
  lfo?: { frequency: number; depth: number };
  noiseGain?: number;
}

// M6 文档：5 乐器音色参数（严格固定）
const INSTRUMENT_PRESETS: Record<Instrument, InstrumentPreset> = {
  piano: {
    oscillators: [
      { type: 'triangle', gain: 0.6, detune: 0 },
      { type: 'sine', gain: 0.3, detune: 1200 },
      { type: 'sine', gain: 0.1, detune: 1902 },
    ],
    envelope: { attack: 0.005, decay: 0.3, sustain: 0.3, release: 0.5 },
    filter: { type: 'lowpass', frequency: 4000, Q: 1 },
  },
  violin: {
    oscillators: [
      { type: 'sawtooth', gain: 0.5, detune: 0 },
      { type: 'sawtooth', gain: 0.4, detune: 8 },
      { type: 'sawtooth', gain: 0.4, detune: -8 },
    ],
    envelope: { attack: 0.08, decay: 0, sustain: 0.8, release: 0.4 },
    filter: { type: 'lowpass', frequency: 3000, Q: 1 },
    lfo: { frequency: 5, depth: 0.02 },
  },
  guitar: {
    oscillators: [
      { type: 'sawtooth', gain: 0.6, detune: 0 },
      { type: 'triangle', gain: 0.3, detune: 1200 },
    ],
    envelope: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 0.6 },
    filter: { type: 'lowpass', frequency: 2500, Q: 2 },
  },
  flute: {
    oscillators: [
      { type: 'sine', gain: 0.7, detune: 0 },
      { type: 'sine', gain: 0.2, detune: 1200 },
    ],
    envelope: { attack: 0.1, decay: 0, sustain: 0.9, release: 0.3 },
    filter: { type: 'lowpass', frequency: 5000, Q: 1 },
    noiseGain: 0.05,
  },
  drums: {
    oscillators: [],
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
    filter: { type: 'lowpass', frequency: 2000, Q: 1 },
    noiseGain: 0.3,
  },
};

// 音名 → 频率（A4=440Hz 等比数列）
const NOTE_FREQ: Record<string, number> = {};
(function buildNoteFreq() {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (let oct = 0; oct <= 8; oct++) {
    for (let i = 0; i < 12; i++) {
      const semitones = (oct - 4) * 12 + (i - 9);  // A4=0
      const freq = 440 * Math.pow(2, semitones / 12);
      NOTE_FREQ[notes[i] + oct] = Math.round(freq * 100) / 100;
    }
  }
})();

export function noteToFreq(note: string): number {
  return NOTE_FREQ[note] || 440;
}

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.7;
    compressor = audioCtx.createDynamicsCompressor();
    masterGain.connect(compressor);
    compressor.connect(audioCtx.destination);
  }
  return audioCtx;
}

export function resumeAudio(): void {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
}

export function setVolume(vol: number): void {
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, vol / 100));
}

// 鼓组单独处理
function playDrum(note: string, duration: number): void {
  const ctx = getCtx();
  if (!masterGain) return;
  const now = ctx.currentTime;

  if (note === 'kick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + duration);
    gain.gain.setValueAtTime(1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration);
  } else if (note === 'snare') {
    // 噪声 + 三角波
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(now);
    noise.stop(now + duration);
  } else {
    // tom1/tom2/cymbal 用噪声 + 带通
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = note === 'cymbal' ? 'highpass' : 'bandpass';
    filter.frequency.value = note === 'tom1' ? 200 : note === 'tom2' ? 150 : 5000;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(now);
    noise.stop(now + duration);
  }
}

export function play(note: string, instrument: Instrument, duration = 0.5): void {
  const ctx = getCtx();
  if (!masterGain) return;

  if (instrument === 'drums') {
    playDrum(note, duration);
    return;
  }

  const preset = INSTRUMENT_PRESETS[instrument];
  const freq = noteToFreq(note);
  const now = ctx.currentTime;
  const dur = Math.max(0.1, duration);

  // 滤波器
  const filter = ctx.createBiquadFilter();
  filter.type = preset.filter.type;
  filter.frequency.value = preset.filter.frequency;
  filter.Q.value = preset.filter.Q;

  // 主增益（包络）
  const gainNode = ctx.createGain();
  const env = preset.envelope;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(1, now + env.attack);
  gainNode.gain.linearRampToValueAtTime(env.sustain, now + env.attack + env.decay);
  gainNode.gain.setValueAtTime(env.sustain, now + dur);
  gainNode.gain.linearRampToValueAtTime(0, now + dur + env.release);

  filter.connect(gainNode);
  gainNode.connect(masterGain);

  // 振荡器组
  const oscs: OscillatorNode[] = [];
  for (const oscConfig of preset.oscillators) {
    const osc = ctx.createOscillator();
    osc.type = oscConfig.type;
    osc.frequency.value = freq;
    osc.detune.value = oscConfig.detune;
    const oscGain = ctx.createGain();
    oscGain.gain.value = oscConfig.gain;
    osc.connect(oscGain);
    oscGain.connect(filter);
    osc.start(now);
    osc.stop(now + dur + env.release + 0.1);
    oscs.push(osc);
  }

  // LFO（颤音）
  if (preset.lfo) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = preset.lfo.frequency;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = freq * preset.lfo.depth;
    lfo.connect(lfoGain);
    oscs.forEach(osc => lfoGain.connect(osc.frequency));
    lfo.start(now);
    lfo.stop(now + dur + env.release + 0.1);
  }

  // 噪声（笛子气息声）
  if (preset.noiseGain) {
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = preset.noiseGain;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(now);
    noise.stop(now + dur);
  }
}

// 自相关基频检测（调音器 M8）
export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const SIZE = buffer.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null;

  const MIN_LAG = Math.floor(sampleRate / 2000);
  const MAX_LAG = Math.floor(sampleRate / 80);
  let bestLag = 0;
  let bestCorr = 0;

  for (let lag = MIN_LAG; lag < MAX_LAG; lag++) {
    let corr = 0;
    for (let i = 0; i < SIZE - lag; i++) corr += buffer[i] * buffer[i + lag];
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag === 0) return null;
  return sampleRate / bestLag;
}

// 频率 → 音名 + 偏差（cents）
export function freqToNote(freq: number): { note: string; cents: number } {
  const A4 = 440;
  const semitones = 12 * Math.log2(freq / A4);
  const noteNum = Math.round(semitones) + 69;  // MIDI
  const cents = Math.round((semitones - Math.round(semitones)) * 100);
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(noteNum / 12) - 1;
  const noteName = notes[noteNum % 12] + octave;
  return { note: noteName, cents };
}
