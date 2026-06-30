// @mode: ink|thunder
// 个人中心 - 沉浸式双态

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
    <div className="immersive">
      <TopNav />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 48px' }}>
        {/* 用户卡片 */}
        <div className="card-immersive" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 24 }}>
          <span className="brand-seal-icon" style={{ width: 72, height: 72, fontSize: 32 }}>
            {user?.nickname?.[0] || '客'}
          </span>
          <div>
            <h1 className="font-display" style={{ fontSize: 32, fontWeight: 600, marginBottom: 4 }}>
              {user?.nickname || '游客'}
            </h1>
            <p className="font-mono" style={{ fontSize: 12, opacity: 0.6, letterSpacing: '0.05em' }}>
              {user?.email} · 注册于 {user?.createdAt ? fmtDate(user.createdAt) : '未知'}
            </p>
          </div>
        </div>

        {/* Tab */}
        <div className="tabs-immersive">
          <button onClick={() => setTab('records')} className={`tab-item ${tab === 'records' ? 'active' : ''}`}>
            演奏记录 ({records.length})
          </button>
          <button onClick={() => setTab('tunings')} className={`tab-item ${tab === 'tunings' ? 'active' : ''}`}>
            调音记录 ({tunings.length})
          </button>
          <button onClick={() => setTab('settings')} className={`tab-item ${tab === 'settings' ? 'active' : ''}`}>
            设置
          </button>
        </div>

        {/* 内容 */}
        {tab === 'records' && (
          <div>
            {records.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-glyph">符</div>
                <p className="font-body" style={{ opacity: 0.6 }}>
                  暂无演奏记录<br/>
                  <a href="/workbench" style={{ color: 'var(--cinnabar)' }}>去工作台画一个开始</a>
                </p>
              </div>
            ) : (
              records.map(r => (
                <div key={r.id} className="record-item">
                  <div>
                    <p className="font-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                      {r.instrument} · {r.notesPlayed?.length || 0} 音 · {fmtDuration(r.durationSec)}
                    </p>
                    <p className="font-mono" style={{ fontSize: 11, opacity: 0.5, letterSpacing: '0.05em' }}>
                      {fmtDate(r.createdAt)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handlePlayRecord(r)} className="btn-tool">回放</button>
                    <button
                      onClick={() => handleDeleteRecord(r.id)}
                      className="btn-tool"
                      style={{ color: 'var(--cinnabar)', borderColor: 'var(--cinnabar)' }}
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
          <div>
            {tunings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-glyph">弓</div>
                <p className="font-body" style={{ opacity: 0.6 }}>暂无调音记录</p>
              </div>
            ) : (
              tunings.map(t => (
                <div key={t.id} className="record-item">
                  <div>
                    <p className="font-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                      {t.instrument} · 目标 {t.targetNote}
                    </p>
                    <p className="font-mono" style={{ fontSize: 12, opacity: 0.7 }}>
                      测得 {t.measuredFreq.toFixed(2)} Hz · 偏差 {t.deviationCents > 0 ? '+' : ''}{t.deviationCents.toFixed(1)} cents
                    </p>
                    <p className="font-mono" style={{ fontSize: 11, opacity: 0.5 }}>{fmtDate(t.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteTuning(t.id)}
                    className="btn-tool"
                    style={{ color: 'var(--cinnabar)', borderColor: 'var(--cinnabar)' }}
                  >
                    删除
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="card-immersive" style={{ maxWidth: 560 }}>
            <h3 className="font-display" style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>用户设置</h3>
            <div style={{ marginBottom: 24 }}>
              <label className="field-label">音量：{settings.volume}</label>
              <input
                type="range" min={0} max={100} value={settings.volume}
                onChange={e => updateSettings({ volume: Number(e.target.value) })}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="field-label">触发灵敏度：{settings.sensitivity}</label>
              <input
                type="range" min={0} max={100} value={settings.sensitivity}
                onChange={e => updateSettings({ sensitivity: Number(e.target.value) })}
              />
              <p className="font-mono" style={{ fontSize: 11, opacity: 0.5, marginTop: 6 }}>
                数值越高，键位触发范围越宽
              </p>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={settings.showHandSkeleton}
                  onChange={e => updateSettings({ showHandSkeleton: e.target.checked })}
                />
                <span className="font-body" style={{ fontSize: 14 }}>显示手部骨架</span>
              </label>
            </div>
            <div>
              <label className="field-label">主题</label>
              <select
                value={settings.theme}
                onChange={e => updateSettings({ theme: e.target.value as 'paper' | 'night' })}
                className="select-immersive"
              >
                <option value="paper">白昼纸面（默认）</option>
                <option value="night">暗夜全站（可选）</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
