// 지도에서 쓰는 좌표 계산. 라이브러리 없이 둔다.

// 두 지점 사이 직선 거리(m). 지구 반지름 6,371km, 하버사인 공식.
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 사람이 읽는 거리. 1km 미만은 10m 단위, 그 이상은 0.1km 단위. 도보 시간은 출처가 없어 쓰지 않는다.
export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

// 같은 좌표(같은 건물)에 있는 곳을 한 마커로 묶는 키.
export function coordKey(p: { lat: number; lng: number }): string {
  return `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
}
