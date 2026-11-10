import { useEffect, useState } from 'react';

// GitHub Pages에는 서버 리라이트가 없어 해시 라우팅을 쓴다.
//   #/                    발견
//   #/p/<placeId>         장소 상세
//   #/map                 지도 (?city=…&hood=… 도시·동네, ?view=list 목록 보기)
//   #/saved               저장 (?keep=… 이면 보관 링크 불러오기)
//   #/settings            설정 (화면 테마·이용 통계)
//   #/privacy             개인정보 처리방침
export type Route =
  | { name: 'discover'; query: URLSearchParams }
  | { name: 'place'; id: string }
  | { name: 'map'; query: URLSearchParams }
  | { name: 'saved'; query: URLSearchParams }
  | { name: 'settings' }
  | { name: 'privacy' };

export function parse(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  const query = new URLSearchParams(qs);
  if (path.startsWith('/p/')) return { name: 'place', id: decodeURIComponent(path.slice(3)) };
  if (path === '/map') return { name: 'map', query };
  if (path === '/saved') return { name: 'saved', query };
  if (path === '/settings') return { name: 'settings' };
  if (path === '/privacy') return { name: 'privacy' };
  return { name: 'discover', query };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

// 앱 안에서 한 번이라도 이동했는지. 공유 링크로 상세에 바로 들어온 경우 뒤로 가기는 발견으로 보낸다.
let moved = false;
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => (moved = true));

export function goBack(): void {
  if (moved) window.history.back();
  else go('/');
}

export function go(path: string): void {
  window.location.hash = path;
}

export function hrefTo(path: string): string {
  return `#${path}`;
}
