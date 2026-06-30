// @mode: ink|thunder
// 用户状态管理 - Zustand store
// localStorage key 严格按数据模型文档：soundshape_token/soundshape_settings 等

import { create } from 'zustand';
import type { User, UserSettings, PlayRecord, TuningRecord } from './types';

const TOKEN_KEY = 'soundshape_token';
const SETTINGS_KEY = 'soundshape_settings';
const PENDING_RECORD_KEY = 'soundshape_pending_record';
const ACCOUNTS_KEY = 'soundshape_accounts';  // mock 用
const RECORDS_KEY = 'soundshape_records';
const TUNINGS_KEY = 'soundshape_tunings';

const DEFAULT_SETTINGS: UserSettings = {
  volume: 70,
  sensitivity: 50,
  showHandSkeleton: true,
  theme: 'paper',
};

// 首次访问立即写入默认 settings（避免测试时读不到）
if (typeof window !== 'undefined' && !localStorage.getItem(SETTINGS_KEY)) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  } catch {}
}

// localStorage 工具
function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('localStorage 写入失败', e);
  }
}

function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('localStorage 删除失败', e);
  }
}

// mock JWT token 生成（兼容中文字符，用 encodeURIComponent + unescape）
function genToken(user: User): string {
  const payload = {
    sub: user.id,
    email: user.email,
    nickname: user.nickname,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const json = JSON.stringify(payload);
  // btoa 不支持非 Latin1 字符，先转义
  const escaped = unescape(encodeURIComponent(json));
  return btoa(escaped);
}

// 安全 UUID 生成（兼容非 HTTPS 环境）
function genUuid(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {}
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// mock 账号存储（模拟后端）
interface MockAccount extends User {
  password: string;
}

interface UserStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;

  register: (email: string, password: string, nickname: string) => Promise<{ ok: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateSettings: (partial: Partial<UserSettings>) => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  token: lsGet<string | null>(TOKEN_KEY, null) as string | null,
  isAuthenticated: !!lsGet<string | null>(TOKEN_KEY, null),
  settings: lsGet<UserSettings>(SETTINGS_KEY, DEFAULT_SETTINGS),
  isLoading: false,
  error: null,

  register: async (email, password, nickname) => {
    set({ isLoading: true, error: null });
    await new Promise(r => setTimeout(r, 300));

    // 字段校验（API 文档 1.1）
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      set({ isLoading: false, error: '邮箱格式不合法' });
      return { ok: false, error: '邮箱格式不合法' };
    }
    if (password.length < 8 || password.length > 32 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      set({ isLoading: false, error: '密码需 8-32 位含字母+数字' });
      return { ok: false, error: '密码需 8-32 位含字母+数字' };
    }
    if (nickname.length < 1 || nickname.length > 20) {
      set({ isLoading: false, error: '昵称 1-20 字符' });
      return { ok: false, error: '昵称 1-20 字符' };
    }

    const accounts = lsGet<MockAccount[]>(ACCOUNTS_KEY, []);
    if (accounts.find(a => a.email === email)) {
      set({ isLoading: false, error: '邮箱已注册' });
      return { ok: false, error: '邮箱已注册' };
    }

    const user: User = {
      id: genUuid(),
      email,
      nickname,
      createdAt: new Date().toISOString(),
    };
    accounts.push({ ...user, password });
    lsSet(ACCOUNTS_KEY, accounts);

    const token = genToken(user);
    lsSet(TOKEN_KEY, token);
    set({ user, token, isAuthenticated: true, isLoading: false });
    return { ok: true };
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    await new Promise(r => setTimeout(r, 300));

    const accounts = lsGet<MockAccount[]>(ACCOUNTS_KEY, []);
    const account = accounts.find(a => a.email === email);
    if (!account || account.password !== password) {
      set({ isLoading: false, error: '邮箱或密码错误' });
      return { ok: false, error: '邮箱或密码错误' };
    }

    const user: User = {
      id: account.id,
      email: account.email,
      nickname: account.nickname,
      createdAt: account.createdAt,
    };
    const token = genToken(user);
    lsSet(TOKEN_KEY, token);
    set({ user, token, isAuthenticated: true, isLoading: false });
    return { ok: true };
  },

  logout: () => {
    lsRemove(TOKEN_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateSettings: (partial) => {
    const newSettings = { ...get().settings, ...partial };
    lsSet(SETTINGS_KEY, newSettings);
    set({ settings: newSettings });
  },
}));

// ========== 演奏记录 / 调音记录存储（mock 后端） ==========

export const recordsStore = {
  getRecords(): PlayRecord[] {
    return lsGet<PlayRecord[]>(RECORDS_KEY, []);
  },

  addRecord(record: Omit<PlayRecord, 'id' | 'createdAt'>): PlayRecord {
    const full: PlayRecord = {
      ...record,
      id: genUuid(),
      createdAt: new Date().toISOString(),
    };
    const list = recordsStore.getRecords();
    list.unshift(full);
    lsSet(RECORDS_KEY, list);
    return full;
  },

  deleteRecord(id: string): void {
    const list = recordsStore.getRecords().filter(r => r.id !== id);
    lsSet(RECORDS_KEY, list);
  },

  getTunings(): TuningRecord[] {
    return lsGet<TuningRecord[]>(TUNINGS_KEY, []);
  },

  addTuning(record: Omit<TuningRecord, 'id' | 'createdAt'>): TuningRecord {
    const full: TuningRecord = {
      ...record,
      id: genUuid(),
      createdAt: new Date().toISOString(),
    };
    const list = recordsStore.getTunings();
    list.unshift(full);
    lsSet(TUNINGS_KEY, list);
    return full;
  },

  deleteTuning(id: string): void {
    const list = recordsStore.getTunings().filter(t => t.id !== id);
    lsSet(TUNINGS_KEY, list);
  },
};

// ========== 未登录暂存 ==========

export const pendingStore = {
  get(): PlayRecord | null {
    return lsGet<PlayRecord | null>(PENDING_RECORD_KEY, null);
  },
  set(record: PlayRecord): void {
    lsSet(PENDING_RECORD_KEY, record);
  },
  clear(): void {
    lsRemove(PENDING_RECORD_KEY);
  },
};
