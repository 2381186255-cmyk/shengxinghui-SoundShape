// @mode: ink
// 登录/注册页

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
    <div className="parchment-bg min-h-screen">
      <TopNav />
      <div className="max-w-md mx-auto px-8 py-16">
        <h1 className="font-display text-display-1 mb-2" style={{ color: 'var(--ink-full)' }}>登录</h1>
        <p className="font-body text-body mb-8" style={{ color: 'var(--ink-mid)' }}>
          登录后可保存演奏记录与调音数据
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-caption block mb-2" style={{ color: 'var(--ink-faint)' }}>邮箱</label>
            <input
              type="email"
              className="input-ink"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-caption block mb-2" style={{ color: 'var(--ink-faint)' }}>密码</label>
            <input
              type="password"
              className="input-ink"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="8-32 位含字母+数字"
            />
          </div>
          <button type="submit" className="btn-engrave w-full" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <p className="mt-6 text-center font-body text-body" style={{ color: 'var(--ink-mid)' }}>
          还没账号？<Link to="/register" style={{ color: 'var(--cinnabar)' }}>立即注册</Link>
        </p>
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
    <div className="parchment-bg min-h-screen">
      <TopNav />
      <div className="max-w-md mx-auto px-8 py-16">
        <h1 className="font-display text-display-1 mb-2" style={{ color: 'var(--ink-full)' }}>注册</h1>
        <p className="font-body text-body mb-8" style={{ color: 'var(--ink-mid)' }}>
          创建账号开启你的 MR 音乐之旅
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-caption block mb-2" style={{ color: 'var(--ink-faint)' }}>昵称</label>
            <input
              type="text"
              className="input-ink"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              required
              maxLength={20}
              placeholder="1-20 字符"
            />
          </div>
          <div>
            <label className="text-caption block mb-2" style={{ color: 'var(--ink-faint)' }}>邮箱</label>
            <input
              type="email"
              className="input-ink"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-caption block mb-2" style={{ color: 'var(--ink-faint)' }}>密码</label>
            <input
              type="password"
              className="input-ink"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="8-32 位含字母+数字"
            />
            <p className="text-caption mt-1" style={{ color: 'var(--ink-faint)' }}>
              至少 8 位，需同时包含字母和数字
            </p>
          </div>
          <button type="submit" className="btn-engrave w-full" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <p className="mt-6 text-center font-body text-body" style={{ color: 'var(--ink-mid)' }}>
          已有账号？<Link to="/login" style={{ color: 'var(--cinnabar)' }}>去登录</Link>
        </p>
      </div>
    </div>
  );
}
