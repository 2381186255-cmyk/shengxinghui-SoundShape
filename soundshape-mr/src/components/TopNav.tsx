// @mode: ink|thunder
// 顶部导航栏 - 沉浸式双态

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
    <header className="topbar-immersive">
      <Link to="/" className="brand-seal no-underline">
        <span className="brand-seal-icon">声</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="font-display" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1 }}>
            SoundShape
          </span>
          <span className="font-mono" style={{ fontSize: 10, opacity: 0.5, letterSpacing: '0.15em' }}>
            MR · v2
          </span>
        </span>
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Link to="/" className="nav-link no-underline">首页</Link>
        <Link to="/workbench" className="nav-link no-underline">工作台</Link>
        {isAuthenticated ? (
          <>
            <Link to="/profile" className="nav-link no-underline">{user?.nickname || '个人中心'}</Link>
            <button onClick={handleLogout} className="nav-link" style={{ color: 'var(--cinnabar)' }}>退出</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link no-underline">登录</Link>
            <Link to="/register" className="btn-primary no-underline" style={{ padding: '8px 20px', fontSize: 13, marginLeft: 8 }}>
              注册
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
