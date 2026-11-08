// 채널 분기는 이 파일과 analytics.ts 두 곳에서만 한다.
export type Channel = 'web' | 'toss';

export const CHANNEL: Channel = import.meta.env.VITE_CHANNEL === 'toss' ? 'toss' : 'web';

export const WEB_BASE_URL = 'https://tsugi-app.github.io';

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

// 지도는 이름+주소로 검색한다. 좌표는 근사값일 수 있어 주소가 없을 때만 쓴다.
export function googleMapsUrl(place: { name: { ko: string; ja?: string }; address?: string; geo: { lat: number; lng: number } }): string {
  const name = place.name.ja ?? place.name.ko;
  const q = place.address ? `${name} ${place.address}` : `${name} ${place.geo.lat},${place.geo.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
