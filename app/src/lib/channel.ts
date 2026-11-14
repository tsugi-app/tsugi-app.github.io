// 채널 분기는 이 파일과 analytics.ts 두 곳에서만 한다.
// 토스 채널은 앱인토스 SDK(@apps-in-toss/web-framework)를 쓴다. 웹 번들에 SDK가 실리지 않게 언제나 동적 import로 부른다.
import { goBack, parse } from './router';
import type { ThemePref } from './storage';

export type Channel = 'web' | 'toss';

export const CHANNEL: Channel = import.meta.env.VITE_CHANNEL === 'toss' ? 'toss' : 'web';

export const WEB_BASE_URL = 'https://tsugi-app.github.io';

// 다크 모드는 웹만 지원한다. 앱인토스는 다크 모드를 지원하지 않아 라이트로 고정한다.
export const SUPPORTS_THEME = CHANNEL === 'web';

// 앱 바 워드마크 왼쪽 아이콘은 웹만. 앱인토스는 토스 상단 바가 앱 이름·아이콘을 따로 보여 줄 수 있어 겹치지 않게 뺀다.
export const SHOW_WORDMARK_ICON = CHANNEL === 'web';

// 화면 안 뒤로 가기 버튼은 웹만. 앱인토스는 토스 상단 바의 뒤로 가기만 보여야 한다(같이 보이면 검수 반려).
export const SHOW_IN_APP_BACK = CHANNEL === 'web';

// 저장 목록 보관 링크는 웹만. 사파리 7일 삭제 대비용이고, 토스 안에서 웹 주소로 내보내면 자사 서비스 이동 유도로 볼 수 있다.
// 앱인토스 SDK 3.1 이상은 localStorage를 미니앱 origin(<appName>.apps.tossmini.com)에 유지한다.
export const SUPPORTS_KEEP_LINK = CHANNEL === 'web';

export const TOSS_APP_NAME = 'tsugi';

const toss = () => import('@apps-in-toss/web-framework');

// 앱 시작 때 한 번. 토스 채널에서만:
//   - 공유 링크(intoss://tsugi?p=<placeId>)로 들어오면 해당 장소 화면으로 보낸다.
//   - 핀치 확대를 막는다 (지도는 maplibre가 자체 제스처로 확대한다).
//   - 시스템·상단 바 뒤로 가기를 받아 앱 안에서 한 단계 뒤로, 첫 화면(발견)이면 미니앱을 닫는다.
export function setupChannel(): void {
  if (CHANNEL !== 'toss') return;
  const placeId = new URLSearchParams(window.location.search).get('p');
  if (placeId) window.history.replaceState(null, '', `${window.location.pathname}#/p/${encodeURIComponent(placeId)}`);
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  void toss()
    .then(({ graniteEvent, Screen }) => {
      graniteEvent.addEventListener('backEvent', {
        onEvent: () => {
          if (parse(window.location.hash).name === 'discover') void Screen.close();
          else goBack();
        },
      });
    })
    .catch(() => {});
}

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
//   /p/<placeId>/ , /c/<도시|동네|취향>/
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

// 장소 공유. 웹은 미리보기가 붙는 정적 페이지 주소를, 토스는 토스 앱에서 열리는 공유 링크(intoss://)를 쓴다.
export async function sharePlace(placeId: string, title: string): Promise<string> {
  if (CHANNEL !== 'toss') return shareOrCopy(sharePageUrl(`/p/${placeId}/`), title);
  try {
    const { Share } = await toss();
    const link = await Share.createLink({
      path: `intoss://${TOSS_APP_NAME}?p=${encodeURIComponent(placeId)}`,
      ogImageUrl: `${WEB_BASE_URL}/icon-1024.png`,
    });
    await Share.sendMessage({ message: `${title}\n${link}` });
    return '';
  } catch {
    return '공유하지 못했어요. 잠시 뒤 다시 해 주세요.';
  }
}

// 바깥 링크(구글 지도·공식 페이지·출처). 토스는 미니앱 안에서 다른 사이트를 띄우면 안 돼서 기기 브라우저로 연다.
export function openExternal(url: string): void {
  if (CHANNEL === 'toss') {
    void toss()
      .then(({ Device }) => Device.openURL(url))
      .catch(() => {});
    return;
  }
  window.open(url, '_blank', 'noopener');
}

// 내 위치. 웹은 브라우저 위치 API, 토스는 앱인토스 SDK 위치 API (docs/MAP_PLAN.md §5).
// 위치는 부른 쪽 화면 상태에만 두고 저장하지 않는다.
export type PositionResult =
  | { ok: true; lat: number; lng: number; accuracy: number }
  | { ok: false; reason: 'unsupported' | 'denied' | 'failed' };

export async function getPosition(): Promise<PositionResult> {
  if (CHANNEL === 'toss') {
    try {
      const { Device, Accuracy, PermissionError } = await toss();
      // 버튼을 누른 뒤에만 여기 온다. 아직 동의 전이면 토스 권한 창으로 먼저 묻는다.
      let status = await Device.getLocation.getPermission();
      if (status === 'notDetermined') status = await Device.getLocation.openPermissionDialog();
      if (status !== 'allowed') return { ok: false, reason: 'denied' };
      try {
        const loc = await Device.getLocation({ accuracy: Accuracy.Balanced });
        return { ok: true, lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy };
      } catch (e) {
        const code = (e as { code?: string }).code ?? '';
        const denied = e instanceof PermissionError || ['PERMISSION_DENIED', 'OS_PERMISSION_DENIED', 'NOT_ALLOWED'].includes(code);
        return { ok: false, reason: denied ? 'denied' : 'failed' };
      }
    } catch {
      return { ok: false, reason: 'unsupported' };
    }
  }
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
