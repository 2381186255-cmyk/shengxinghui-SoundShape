// @mode: ink|thunder
// 通用工具 - Toast / 格式化 / 工具函数

type ToastType = 'info' | 'success' | 'warn' | 'error';
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

let toastListeners: Array<(items: ToastItem[]) => void> = [];
let toastItems: ToastItem[] = [];

export function showToast(message: string, type: ToastType = 'info'): void {
  const item: ToastItem = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    message,
    type,
  };
  toastItems = [...toastItems, item];
  toastListeners.forEach(fn => fn(toastItems));
  setTimeout(() => {
    toastItems = toastItems.filter(t => t.id !== item.id);
    toastListeners.forEach(fn => fn(toastItems));
  }, 3000);
}

export function subscribeToasts(fn: (items: ToastItem[]) => void): () => void {
  toastListeners.push(fn);
  fn(toastItems);
  return () => {
    toastListeners = toastListeners.filter(l => l !== fn);
  };
}

// 时长格式化
export function fmtDuration(sec: number): string {
  if (sec < 60) return sec + ' 秒';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ' 分 ' + s + ' 秒';
}

// 日期格式化
export function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  } catch {
    return '';
  }
}

// 生成 ID
export function genId(prefix = 'id'): string {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
