// @mode: ink|thunder
// 首页 - 沉浸式双态设计

import { Link } from 'react-router-dom';
import { TopNav } from '../components/TopNav';
import { INSTRUMENTS } from '../lib/types';

export function HomePage() {
  const instruments = Object.values(INSTRUMENTS);
  const steps = [
    { num: '壹', title: '墨绘符印', desc: '在羊皮纸上画下乐器轮廓或抽象形状，朱砂墨迹落定成符。' },
    { num: '贰', title: '通电唤声', desc: '点击「唤声」按钮，纸面燃烧溶解，符印从二维升起为全息投射。' },
    { num: '叁', title: '隔空演奏', desc: '食指在虚拟桌面上空挥动，触碰音位即触发音色与 MR 光效。' },
  ];

  return (
    <div className="immersive">
      <TopNav />

      {/* Hero 区 */}
      <section className="hero-immersive">
        <div className="font-mono" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 16, opacity: 0.6 }}>
          ⚜ 声形绘 · 墨绘符印 · 雷霆唤声
        </div>
        <h1 className="hero-title">
          在纸上画下符印<br/>
          <em>召唤未生的声音</em>
        </h1>
        <p className="hero-subtitle">
          画一个乐器，开启摄像头，让符印从纸面浮起化作全息雷霆。
          食指隔空触碰即发声——零硬件、即时反馈、MR 体验。
        </p>
        <div className="hero-cta">
          <Link to="/workbench" className="btn-primary no-underline">
            进入工作台 →
          </Link>
          <Link to="/register" className="btn-secondary no-underline">
            创建账号
          </Link>
        </div>
      </section>

      {/* 五音灵格区 */}
      <section style={{ padding: '40px 48px', maxWidth: 1400, margin: '0 auto' }}>
        <h2 className="section-title">五音灵格</h2>
        <div className="soul-grid">
          {instruments.map(inst => (
            <Link key={inst.id} to="/workbench" className="soul-card no-underline" style={{ textDecoration: 'none' }}>
              <span
                className="soul-glyph"
                style={{
                  '--soul-ink': inst.soulInk,
                  '--soul-holo': inst.soulHolo,
                } as React.CSSProperties}
              >
                {inst.sealText}
              </span>
              <div style={{ textAlign: 'center' }}>
                <div className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>
                  {inst.name}
                </div>
                <div className="font-mono" style={{ fontSize: 10, opacity: 0.5, marginTop: 2, letterSpacing: '0.1em' }}>
                  {inst.nameEn.toUpperCase()}
                </div>
              </div>
              <div className="font-body" style={{ fontSize: 11, opacity: 0.6, textAlign: 'center', lineHeight: 1.5 }}>
                {inst.soulMeaning}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 三步唤声 */}
      <section style={{ padding: '60px 48px', maxWidth: 1400, margin: '0 auto' }}>
        <h2 className="section-title">三步唤声</h2>
        <div className="steps-immersive">
          {steps.map((step, i) => (
            <div key={i} className="card-immersive step-card">
              <div className="step-num">{step.num}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 底部 CTA */}
      <section style={{ padding: '80px 48px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <h2 className="font-display" style={{ fontSize: 36, fontWeight: 400, marginBottom: 16 }}>
          准备好召唤你的声音了吗
        </h2>
        <p className="font-body" style={{ fontSize: 15, opacity: 0.7, marginBottom: 32 }}>
          无需安装、无需硬件、打开浏览器即可开始
        </p>
        <Link to="/workbench" className="btn-primary no-underline" style={{ display: 'inline-flex' }}>
          立即开始 →
        </Link>
      </section>

      <footer style={{ padding: '32px 48px', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
        <p className="font-mono" style={{ fontSize: 11, opacity: 0.4, letterSpacing: '0.1em' }}>
          SOUNDSHAPE MR · 2026 · 墨绘符印 · 雷霆唤声
        </p>
      </footer>
    </div>
  );
}
