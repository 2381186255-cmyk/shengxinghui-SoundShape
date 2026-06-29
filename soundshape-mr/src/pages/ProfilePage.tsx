// @mode: ink
// 个人中心 - 演奏记录 + 调音记录 + 设置

import { useEffect, useState } from 'react';
import { TopNav } from '../components/TopNav';
import { useUserStore, recordsStore, pendingStore } from '../lib/store';
import { showToast, fmtDate, fmtDuration } from '../lib/utils';
import { play } from '../lib/audio';
import type { PlayRecord, TuningRecord } from '../lib/types';

export function ProfilePage() {
  const user = useUserStore(s => s.user);
  const settings = useUserStore(s => s.settings);
  const updateSettings = useUserStore(s => s.updateSettings);
  const [tab, setTab] = useState<'records' | 'tunings' | 'settings'>('records');
  const [records, setRecords] = useState<PlayRecord[]>([]);
  const [tunings, setTunings] = useState<TuningRecord[]>([]);

  const refresh = () => {
    setRecords(recordsStore.getRecords());
    setTunings(recordsStore.getTunings());
  };

  useEffect(() => {
    refresh();
    // 登录后自动提交暂存记录
    const pending = pendingStore.get();
    if (pending) {
      recordsStore.addRecord({
        instrument: pending.instrument,
        notesPlayed: pending.notesPlayed,
        durationSec: pending.durationSec,
      });
      pendingStore.clear();
      showToast('暂存的演奏记录已保存', 'success');
      refresh();
    }
  }, []);

  const handleDeleteRecord = (id: string) => {
    recordsStore.deleteRecord(id);
    showToast('记录已删除', 'info');
    refresh();
  };

  const handleDeleteTuning = (id: string) => {
    recordsStore.deleteTuning(id);
    showToast('调音记录已删除', 'info');
    refresh();
  };

  const handlePlayRecord = (record: PlayRecord) => {
    if (!record.notesPlayed || record.notesPlayed.length === 0) {
      showToast('该记录无音符数据', 'warn');
      return;
    }
    showToast(`回放 ${record.notesPlayed.length} 个音符`, 'info');
    record.notesPlayed.forEach((n, i) => {
      setTimeout(() => play(n.note, record.instrument, 0.4), n.timestamp || i * 300);
    });
  };

  return (
    <div className="parchment-bg min-h-screen">
      <TopNav />
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* 用户信息卡片 */}
        <div className="card-scroll mb-8">
          <div className="flex items-center gap-6">
            <span className="cinnabar-seal" style={{ width: 64, height: 64, fontSize: 28 }}>
              {user?.nickname?.[0] || '客'}
            </span>
            <div>
              <h1 className="font-display text-display-1" style={{ color: 'var(--ink-full)' }}>
                {user?.nickname || '游客'}
              </h1>
              <p className="text-caption" style={{ color: 'var(--ink-faint)' }}>
                {user?.email} · 注册于 {user?.createdAt ? fmtDate(user.createdAt) : '未知'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-6 mb-8" style={{ borderBottom: '1px solid var(--gold-faint)' }}>
          {[
            { id: 'records' as const, label: `演奏记录 (${records.length})` },
            { id: 'tunings' as const, label: `调音记录 (${tunings.length})` },
            { id: 'settings' as const, label: '设置' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="font-body text-body pb-3"
              style={{
                color: tab === t.id ? 'var(--cinnabar)' : 'var(--ink-faint)',
                borderBottom: tab === t.id ? '2px solid var(--cinnabar)' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        {tab === 'records' && (
          <div className="space-y-4">
            {records.length === 0 ? (
              <p className="text-center py-12 font-body text-body" style={{ color: 'var(--ink-faint)' }}>
                暂无演奏记录，去工作台画一个开始吧
              </p>
            ) : (
              records.map(r => (
                <div key={r.id} className="card-scroll flex items-center justify-between">
                  <div>
                    <p className="font-display text-display-2" style={{ color: 'var(--ink-full)' }}>
                      {r.instrument} · {r.notesPlayed?.length || 0} 音 · {fmtDuration(r.durationSec)}
                    </p>
                    <p className="text-caption" style={{ color: 'var(--ink-faint)' }}>
                      {fmtDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handlePlayRecord(r)} className="btn-engrave" style={{ padding: '8px 16px', fontSize: 13 }}>
                      回放
                    </button>
                    <button
                      onClick={() => handleDeleteRecord(r.id)}
                      className="btn-engrave"
                      style={{ padding: '8px 16px', fontSize: 13, background: 'transparent', color: 'var(--cinnabar)', borderColor: 'var(--cinnabar)' }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'tunings' && (
          <div className="space-y-4">
            {tunings.length === 0 ? (
              <p className="text-center py-12 font-body text-body" style={{ color: 'var(--ink-faint)' }}>
                暂无调音记录
              </p>
            ) : (
              tunings.map(t => (
                <div key={t.id} className="card-scroll flex items-center justify-between">
                  <div>
                    <p className="font-display text-display-2" style={{ color: 'var(--ink-full)' }}>
                      {t.instrument} · 目标 {t.targetNote}
                    </p>
                    <p className="text-data" style={{ color: 'var(--ink-mid)' }}>
                      测得 {t.measuredFreq.toFixed(2)} Hz · 偏差 {t.deviationCents > 0 ? '+' : ''}{t.deviationCents.toFixed(1)} cents
                    </p>
                    <p className="text-caption" style={{ color: 'var(--ink-faint)' }}>{fmtDate(t.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteTuning(t.id)}
                    className="btn-engrave"
                    style={{ padding: '8px 16px', fontSize: 13, background: 'transparent', color: 'var(--cinnabar)', borderColor: 'var(--cinnabar)' }}
                  >
                    删除
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="card-scroll max-w-xl">
            <h3 className="font-display text-display-2 mb-6" style={{ color: 'var(--ink-full)' }}>用户设置</h3>
            <div className="space-y-6">
              <div>
                <label className="font-body text-body block mb-2" style={{ color: 'var(--ink-mid)' }}>
                  音量：{settings.volume}
                </label>
                <input
                  type="range" min={0} max={100} value={settings.volume}
                  onChange={e => updateSettings({ volume: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="font-body text-body block mb-2" style={{ color: 'var(--ink-mid)' }}>
                  触发灵敏度：{settings.sensitivity}
                </label>
                <input
                  type="range" min={0} max={100} value={settings.sensitivity}
                  onChange={e => updateSettings({ sensitivity: Number(e.target.value) })}
                  className="w-full"
                />
                <p className="text-caption mt-1" style={{ color: 'var(--ink-faint)' }}>
                  数值越高，键位触发范围越宽
                </p>
              </div>
              <div>
                <label className="flex items-center gap-3 font-body text-body" style={{ color: 'var(--ink-mid)' }}>
                  <input
                    type="checkbox"
                    checked={settings.showHandSkeleton}
                    onChange={e => updateSettings({ showHandSkeleton: e.target.checked })}
                  />
                  显示手部骨架
                </label>
              </div>
              <div>
                <label className="font-body text-body block mb-2" style={{ color: 'var(--ink-mid)' }}>主题</label>
                <select
                  value={settings.theme}
                  onChange={e => updateSettings({ theme: e.target.value as 'paper' | 'night' })}
                  className="input-ink"
                >
                  <option value="paper">白昼纸面（默认）</option>
                  <option value="night">暗夜全站（可选）</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
