// @mode: ink
// 顶部导航栏 - 墨绘态

import { Link, useNavigate } from 'react-router-dom';
import { useUserStore } from '../lib/store';
import { showToast } from '../lib/utils';

export function TopNav() {
  const isAuthenticated = useUserStore(s => s.isAuthenticated);
  const user = useUserStore(s => s.user);
  const logout = useUserStore(s => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    showToast('已退出登录', 'info');
    navigate('/');
  };

  return (
    <header className="topbar parchment-bg" style={{ borderBottom: '1px solid var(--gold-faint)' }}>
      <Link to="/" className="flex items-center gap-3 no-underline">
        <span className="cinnabar-seal" style={{ width: 36, height: 36, fontSize: 16 }}>声</span>
        <span className="font-display text-display-2" style={{ color: 'var(--ink-full)' }}>
          SoundShape
        </span>
        <span className="text-caption" style={{ color: 'var(--ink-faint)' }}>墨绘符印 · 雷霆唤声</span>
      </Link>

      <nav className="flex items-center gap-6">
        <Link to="/" className="font-body text-body no-underline" style={{ color: 'var(--ink-mid)' }}>
          首页
        </Link>
        <Link to="/workbench" className="font-body text-body no-underline" style={{ color: 'var(--ink-mid)' }}>
          工作台
        </Link>
        {isAuthenticated ? (
          <>
            <Link to="/profile" className="font-body text-body no-underline" style={{ color: 'var(--ink-mid)' }}>
              {user?.nickname || '个人中心'}
            </Link>
            <button onClick={handleLogout} className="btn-engrave" style={{ padding: '8px 16px', fontSize: 13 }}>
              退出
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="font-body text-body no-underline" style={{ color: 'var(--ink-mid)' }}>
              登录
            </Link>
            <Link to="/register" className="btn-engrave no-underline" style={{ padding: '8px 16px', fontSize: 13, display: 'inline-block' }}>
              注册
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
