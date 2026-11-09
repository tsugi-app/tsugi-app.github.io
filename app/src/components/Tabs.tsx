import type { Route } from '../lib/router';
import { hrefTo } from '../lib/router';
import { Icon, type IconName } from './Icon';

const TABS: { name: Route['name']; path: string; label: string; icon: IconName }[] = [
  { name: 'discover', path: '/', label: '발견', icon: 'discover' },
  { name: 'map', path: '/map', label: '지도', icon: 'map' },
  { name: 'saved', path: '/saved', label: '저장', icon: 'heart' },
];

// SEED Bottom Tab. 상세 화면에선 하단 액션 바가 대신 자리한다.
export function Tabs({ route }: { route: Route }) {
  return (
    <nav className="tab-bar" aria-label="주요 메뉴">
      <div className="tab-bar-inner">
        {TABS.map((t) => (
          <a key={t.name} href={hrefTo(t.path)} aria-current={route.name === t.name ? 'page' : undefined}>
            <Icon name={t.icon === 'heart' && route.name === 'saved' ? 'heartFill' : t.icon} />
            {t.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
