// @mode: ink
// 首页 - 墨绘符印设计语言

import { Link } from 'react-router-dom';
import { TopNav } from '../components/TopNav';
import { INSTRUMENTS } from '../lib/types';

export function HomePage() {
  const instruments = Object.values(INSTRUMENTS);

  return (
    <div className="parchment-bg min-h-screen">
      <TopNav />

      {/* Hero 区 */}
      <section className="px-8 py-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <p className="text-caption mb-4" style={{ color: 'var(--cinnabar)' }}>
              ⚜ 声形绘 MR · v2
            </p>
            <h1 className="font-display text-hero mb-6" style={{ color: 'var(--ink-full)', lineHeight: 1.1 }}>
              在纸上画下符印<br/>
              <span style={{ color: 'var(--cinnabar)' }}>召唤未生的声音</span>
            </h1>
            <p className="font-body text-body-lg mb-8" style={{ color: 'var(--ink-mid)', maxWidth: 480 }}>
              画一个乐器，开启摄像头，让符印从纸面浮起化作全息雷霆。
              食指隔空触碰即发声——零硬件、即时反馈、MR 体验。
            </p>
            <div className="flex gap-4">
              <Link to="/workbench" className="btn-engrave no-underline inline-flex items-center gap-2">
                进入工作台 →
              </Link>
              <Link to="/register" className="btn-engrave no-underline inline-flex items-center"
                style={{ background: 'transparent', color: 'var(--ink-full)', border: '1px solid var(--ink-mid)' }}>
                创建账号
              </Link>
            </div>
          </div>

          {/* 五枚朱砂印章 */}
          <div className="lg:col-span-5">
            <div className="card-scroll">
              <p className="text-caption mb-4" style={{ color: 'var(--ink-faint)' }}>五音灵格</p>
              <div className="flex flex-wrap gap-3">
                {instruments.map(inst => (
                  <div key={inst.id} className="flex flex-col items-center gap-2">
                    <span
                      className="cinnabar-seal soul-seal"
                      style={{
                        background: inst.soulInk,
                        width: 56, height: 56,
                        transform: `rotate(${(Math.random() * 6 - 3).toFixed(1)}deg)`,
                        opacity: 0.92
                      }}
                    >
                      {inst.sealText}
                    </span>
                    <span className="text-caption" style={{ color: 'var(--ink-mid)' }}>{inst.name}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--gold-faint)' }}>
                <p className="font-body text-body" style={{ color: 'var(--ink-mid)' }}>
                  每件乐器都有独特的"灵格色"——
                  在墨绘态作为印章色，在雷霆态化作全息电光。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 玩法说明 */}
      <section className="px-8 py-16 max-w-6xl mx-auto">
        <h2 className="font-display text-display-1 mb-12" style={{ color: 'var(--ink-full)' }}>
          三步唤声
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { num: '壹', title: '墨绘符印', desc: '在羊皮纸上画下乐器轮廓或抽象形状，朱砂墨迹落定成符。' },
            { num: '贰', title: '通电唤声', desc: '点击「唤声」按钮，纸面燃烧溶解，符印从二维升起为全息投射。' },
            { num: '叁', title: '隔空演奏', desc: '食指在虚拟桌面上空挥动，触碰音位即触发音色与 MR 光效。' },
          ].map((step, i) => (
            <div key={i} className="card-scroll">
              <span className="cinnabar-seal mb-4 inline-flex" style={{ width: 44, height: 44, fontSize: 18 }}>
                {step.num}
              </span>
              <h3 className="font-display text-display-2 mb-3" style={{ color: 'var(--ink-full)' }}>
                {step.title}
              </h3>
              <p className="font-body text-body" style={{ color: 'var(--ink-mid)' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-8 py-8 text-center" style={{ borderTop: '1px solid var(--gold-faint)' }}>
        <p className="text-caption" style={{ color: 'var(--ink-faint)' }}>
          声形绘 SoundShape MR · 墨绘符印 · 雷霆唤声 · 2026
        </p>
      </footer>
    </div>
  );
}
