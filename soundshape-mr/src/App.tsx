// @mode: ink|thunder
// 应用入口 + 路由配置

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer, RequireAuth } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { ProfilePage } from './pages/ProfilePage';
import { WorkbenchPage } from './pages/WorkbenchPage';
import { setVolume } from './lib/audio';
import { useUserStore } from './lib/store';

function App() {
  const settings = useUserStore(s => s.settings);

  // 同步音量设置到音频引擎
  useEffect(() => {
    setVolume(settings.volume);
  }, [settings.volume]);

  // 应用暗夜全站主题
  useEffect(() => {
    if (settings.theme === 'night') {
      document.documentElement.setAttribute('data-mode', 'thunder');
    }
  }, [settings.theme]);

  return (
    <BrowserRouter>
      <div className="scanline-overlay" style={{ display: settings.theme === 'night' ? 'block' : 'none' }} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/workbench" element={<WorkbenchPage />} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
