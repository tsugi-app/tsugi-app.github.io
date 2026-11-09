import { useState } from 'react';
import { AppBar } from '../components/AppBar';
import { applyColorMode, SUPPORTS_THEME } from '../lib/channel';
import { getThemePref, setThemePref, type ThemePref } from '../lib/storage';

const THEME_OPTIONS: { value: ThemePref; label: string; desc: string }[] = [
  { value: 'system', label: '시스템 설정 따르기', desc: '기기의 라이트·다크 설정에 맞춰 바뀌어요.' },
  { value: 'light', label: '라이트', desc: '언제나 밝은 화면으로 봐요.' },
  { value: 'dark', label: '다크', desc: '언제나 어두운 화면으로 봐요.' },
];

// 설정 — 지금은 화면 테마 하나. 고르는 즉시 적용하고 이 기기에 기억한다. docs/DESIGN.md §3
export function Settings() {
  const [pref, setPref] = useState<ThemePref>(getThemePref);

  const choose = (p: ThemePref) => {
    setPref(p);
    setThemePref(p);
    applyColorMode(p);
  };

  return (
    <>
      <AppBar back title={<h1 className="app-bar-title">설정</h1>} />
      {SUPPORTS_THEME ? (
        <section>
          <h2 className="list-header">화면 테마</h2>
          <div className="option-list" role="radiogroup" aria-label="화면 테마">
            {THEME_OPTIONS.map((o) => (
              <label key={o.value} className="option-row">
                <span className="option-text">
                  <span className="option-label">{o.label}</span>
                  <span className="option-desc">{o.desc}</span>
                </span>
                <input
                  type="radio"
                  className="radiomark"
                  name="theme"
                  value={o.value}
                  checked={pref === o.value}
                  onChange={() => choose(o.value)}
                />
              </label>
            ))}
          </div>
        </section>
      ) : (
        <p className="empty">바꿀 수 있는 설정이 아직 없어요.</p>
      )}
    </>
  );
}
