// 채널 분기는 이 파일과 analytics.ts 두 곳에서만 한다.
import type { ThemePref } from './storage';

export type Channel = 'web' | 'toss';

export const CHANNEL: Channel = import.meta.env.VITE_CHANNEL === 'toss' ? 'toss' : 'web';

export const WEB_BASE_URL = 'https://tsugi-app.github.io';

// 다크 모드는 웹만 지원한다. 앱인토스는 다크 모드를 지원하지 않아 라이트로 고정한다.
export const SUPPORTS_THEME = CHANNEL === 'web';

// 설정(시스템·라이트·다크)과 기기 설정을 합쳐 <html data-theme>을 단다.
// 브라우저 상단 색(theme-color)은 tokens.css의 바탕색을 읽어 맞춘다 (색 코드를 여기 쓰지 않는다).
let themePref: ThemePref = 'system';
let listening = false;

export function applyColorMode(pref: ThemePref): void {
  if (!SUPPORTS_THEME) return;
  themePref = pref;
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const sync = () => {
    const dark = themePref === 'dark' || (themePref === 'system' && media.matches);
    if (dark) root.dataset.theme = 'dark';
    else delete root.dataset.theme;
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', dark ? 'dark' : 'light');
    const bg = getComputedStyle(root).getPropertyValue('--color-bg-layer-floating').trim();
    if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  };
  sync();
  if (!listening) {
    media.addEventListener('change', sync);
    listening = true;
  }
}

// 빌드 시점에 번들된 content.json보다 새 파일이 Pages에 있으면 그걸 쓴다.
export const CONTENT_URL = `${WEB_BASE_URL}/content.json`;

// 공유·보관 링크는 언제나 웹 주소로 만든다 (토스 안에서 만든 링크도 브라우저에서 열려야 한다).
export function shareUrl(hashPath: string): string {
  const base = CHANNEL === 'toss' ? WEB_BASE_URL : `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`;
  return `${base}/#${hashPath}`;
}

// 장소·주제 공유는 미리보기(OG)가 붙는 정적 페이지 주소로 만든다 (scripts/build-share.mjs가 생성).
//   /p/<placeId>/ , /c/<동네|취향>/
export function sharePageUrl(path: string): string {
  return `${WEB_BASE_URL}${path}`;
}

// 공유 시트가 있으면 쓰고, 없으면 클립보드에 복사한다. 결과를 사람이 읽을 문장으로 돌려준다.
export async function shareOrCopy(url: string, title: string): Promise<string> {
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return '공유했어요.';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return '';
  }
  try {
    await navigator.clipboard.writeText(url);
    return '링크를 복사했어요. 메모나 카톡 나에게 보내기에 붙여 두세요.';
  } catch {
    window.prompt('아래 링크를 복사해 두세요.', url);
    return '';
  }
}

export function openExternal(url: string): void {
  // 앱인토스 SDK 연동 시 이 함수만 교체한다 (D8).
  window.open(url, '_blank', 'noopener');
}

// 내 위치. 웹은 브라우저 위치 API, 토스는 앱인토스 SDK 위치 API로 바꿀 자리 (docs/MAP_PLAN.md 3단계).
// 위치는 부른 쪽 화면 상태에만 두고 저장하지 않는다.
export type PositionResult =
  | { ok: true; lat: number; lng: number; accuracy: number }
  | { ok: false; reason: 'unsupported' | 'denied' | 'failed' };

export function getPosition(): Promise<PositionResult> {
  // TODO(D8): CHANNEL === 'toss'이면 SDK 위치 API를 쓴다. WebView에서 navigator.geolocation이 되면 그대로 둔다.
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve({ ok: false, reason: 'unsupported' });
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => resolve({ ok: false, reason: err.code === err.PERMISSION_DENIED ? 'denied' : 'failed' }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

// 지도는 이름+주소로 검색한다. 좌표는 근사값일 수 있어 주소가 없을 때만 쓴다.
export function googleMapsUrl(place: { name: { ko: string; ja?: string }; address?: string; geo: { lat: number; lng: number } }): string {
  const name = place.name.ja ?? place.name.ko;
  const q = place.address ? `${name} ${place.address}` : `${name} ${place.geo.lat},${place.geo.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
