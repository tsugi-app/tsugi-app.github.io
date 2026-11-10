import { useState } from 'react';
import { AppBar } from '../components/AppBar';
import { ANALYTICS_ENABLED } from '../lib/analytics';
import { applyColorMode, SUPPORTS_THEME } from '../lib/channel';
import { hrefTo } from '../lib/router';
import { getAnalyticsOff, getThemePref, setAnalyticsOff, setThemePref, type ThemePref } from '../lib/storage';

const THEME_OPTIONS: { value: ThemePref; label: string; desc: string }[] = [
  { value: 'system', label: '시스템 설정 따르기', desc: '기기의 라이트·다크 설정에 맞춰 바뀌어요.' },
  { value: 'light', label: '라이트', desc: '언제나 밝은 화면으로 봐요.' },
  { value: 'dark', label: '다크', desc: '언제나 어두운 화면으로 봐요.' },
];

const STATS_OPTIONS: { off: boolean; label: string; desc: string }[] = [
  { off: false, label: '보내기', desc: '어떤 장소를 열고 저장했는지 이름 없이 보내요. 츠기를 고치는 데 써요.' },
  { off: true, label: '보내지 않기', desc: '이 기기에서는 이용 기록을 보내지 않아요.' },
];

// 설정 — 화면 테마, 이용 통계, 처리방침 링크. 고르는 즉시 적용하고 이 기기에 기억한다. docs/DESIGN.md §3
export function Settings() {
  const [pref, setPref] = useState<ThemePref>(getThemePref);
  const [statsOff, setStatsOff] = useState<boolean>(getAnalyticsOff);

  const choose = (p: ThemePref) => {
    setPref(p);
    setThemePref(p);
    applyColorMode(p);
  };

  const chooseStats = (off: boolean) => {
    setStatsOff(off);
    setAnalyticsOff(off);
  };

  return (
    <>
      <AppBar back title={<h1 className="app-bar-title">설정</h1>} />
      {SUPPORTS_THEME && (
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
      )}
      {ANALYTICS_ENABLED && (
        <section>
          <h2 className="list-header">이용 통계</h2>
          <div className="option-list" role="radiogroup" aria-label="이용 통계">
            {STATS_OPTIONS.map((o) => (
              <label key={o.label} className="option-row">
                <span className="option-text">
                  <span className="option-label">{o.label}</span>
                  <span className="option-desc">{o.desc}</span>
                </span>
                <input
                  type="radio"
                  className="radiomark"
                  name="stats"
                  checked={statsOff === o.off}
                  onChange={() => chooseStats(o.off)}
                />
              </label>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="list-header">약관·정책</h2>
        <div className="option-list">
          <a className="option-row" href={hrefTo('/privacy')}>
            <span className="option-text">
              <span className="option-label">개인정보 처리방침</span>
              <span className="option-desc">츠기가 무엇을 모으고 어디에 두는지 적어 뒀어요.</span>
            </span>
          </a>
        </div>
      </section>
    </>
  );
}
