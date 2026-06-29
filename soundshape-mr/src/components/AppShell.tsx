// @mode: ink|thunder
// Toast 容器 + 路由守卫

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '../lib/store';
import { subscribeToasts } from '../lib/utils';

// Toast 容器组件
export function ToastContainer() {
  const [items, setItems] = useState<Array<{ id: string; message: string; type: string }>>([]);
  const [mode, setMode] = useState('ink');

  useEffect(() => {
    const unsub = subscribeToasts(setItems);
    const observer = new MutationObserver(() => {
      setMode(document.documentElement.getAttribute('data-mode') || 'ink');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
    setMode(document.documentElement.getAttribute('data-mode') || 'ink');
    return () => {
      unsub();
      observer.disconnect();
    };
  }, []);

  return (
    <div className="toast-container">
      {items.map(item => (
        <div
          key={item.id}
          className={`toast-item ${mode === 'thunder' ? 'toast-thunder' : 'toast-ink'}`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}

// 登录守卫
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useUserStore(s => s.isAuthenticated);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.setItem('redirect_after_login', location.pathname);
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
