// @mode: ink|thunder
// 登录/注册页 - 沉浸式双态

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TopNav } from '../components/TopNav';
import { useUserStore } from '../lib/store';
import { showToast } from '../lib/utils';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useUserStore(s => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      showToast('登录成功', 'success');
      const redirect = sessionStorage.getItem('redirect_after_login') || '/profile';
      sessionStorage.removeItem('redirect_after_login');
      navigate(redirect);
    } else {
      showToast(result.error || '登录失败', 'error');
    }
  };

  return (
    <div className="immersive">
      <TopNav />
      <div style={{ padding: '40px 24px', minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={handleSubmit} className="form-immersive">
          <h1 className="form-title">登录</h1>
          <p className="form-subtitle">登录后可保存演奏记录与调音数据</p>
          <div style={{ marginBottom: 24 }}>
            <label className="field-label">邮箱</label>
            <input
              type="email"
              className="input-immersive"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div style={{ marginBottom: 32 }}>
            <label className="field-label">密码</label>
            <input
              type="password"
              className="input-immersive"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="8-32 位含字母+数字"
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
          <p style={{ marginTop: 24, textAlign: 'center' }} className="font-body">
            还没账号？<Link to="/register" style={{ color: 'var(--cinnabar)' }}>立即注册</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useUserStore(s => s.register);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await register(email, password, nickname);
    setLoading(false);
    if (result.ok) {
      showToast('注册成功', 'success');
      navigate('/profile');
    } else {
      showToast(result.error || '注册失败', 'error');
    }
  };

  return (
    <div className="immersive">
      <TopNav />
      <div style={{ padding: '40px 24px', minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={handleSubmit} className="form-immersive">
          <h1 className="form-title">注册</h1>
          <p className="form-subtitle">创建账号开启你的 MR 音乐之旅</p>
          <div style={{ marginBottom: 24 }}>
            <label className="field-label">昵称</label>
            <input
              type="text"
              className="input-immersive"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              required
              maxLength={20}
              placeholder="1-20 字符"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label className="field-label">邮箱</label>
            <input
              type="email"
              className="input-immersive"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div style={{ marginBottom: 32 }}>
            <label className="field-label">密码</label>
            <input
              type="password"
              className="input-immersive"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="8-32 位含字母+数字"
            />
            <p className="font-mono" style={{ fontSize: 10, opacity: 0.5, marginTop: 6, letterSpacing: '0.05em' }}>
              至少 8 位，需同时包含字母和数字
            </p>
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
          <p style={{ marginTop: 24, textAlign: 'center' }} className="font-body">
            已有账号？<Link to="/login" style={{ color: 'var(--cinnabar)' }}>去登录</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
