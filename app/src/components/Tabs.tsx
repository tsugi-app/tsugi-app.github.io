import type { Route } from '../lib/router';
import { hrefTo } from '../lib/router';

const TABS: { name: Route['name']; path: string; label: string }[] = [
  { name: 'discover', path: '/', label: '발견' },
  { name: 'map', path: '/map', label: '지도' },
  { name: 'saved', path: '/saved', label: '저장' },
];

export function Tabs({ route }: { route: Route }) {
  const current = route.name === 'place' ? 'discover' : route.name;
  return (
    <nav className="tabs" aria-label="주요 메뉴">
      {TABS.map((t) => (
        <a key={t.name} href={hrefTo(t.path)} aria-current={current === t.name ? 'page' : undefined}>
          {t.label}
        </a>
      ))}
    </nav>
  );
}
