// 채널 분기는 이 파일과 analytics.ts 두 곳에서만 한다.
export type Channel = 'web' | 'toss';

export const CHANNEL: Channel = import.meta.env.VITE_CHANNEL === 'toss' ? 'toss' : 'web';

export const WEB_BASE_URL = 'https://tsugi-app.github.io';

// 빌드 시점에 번들된 content.json보다 새 파일이 Pages에 있으면 그걸 쓴다.
export const CONTENT_URL = `${WEB_BASE_URL}/content.json`;

export function openExternal(url: string): void {
  // 앱인토스 SDK 연동 시 이 함수만 교체한다 (D8).
  window.open(url, '_blank', 'noopener');
}

export function googleMapsUrl(lat: number, lng: number, name: string): string {
  const q = encodeURIComponent(`${name} ${lat},${lng}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
