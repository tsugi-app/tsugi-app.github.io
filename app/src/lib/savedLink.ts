import type { Saved } from './types';

// 저장 목록을 URL 한 줄로 보관한다 (사파리는 7일 미방문 시 localStorage를 지울 수 있다).
//   #/saved?keep=place-a,place-b@20261210
// 장소 id는 [a-z0-9-]만 쓰므로 그대로 넣고, 방문 예정일은 @YYYYMMDD로 붙인다.

const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const MAX = 100;

export interface KeepItem {
  placeId: string;
  visitDate?: string;
}

export function encodeKeep(saved: Saved[]): string {
  return saved
    .slice(0, MAX)
    .map((s) => (s.visitDate ? `${s.placeId}@${s.visitDate.replace(/-/g, '')}` : s.placeId))
    .join(',');
}

export function parseKeep(raw: string | null | undefined): KeepItem[] {
  if (!raw) return [];
  const out: KeepItem[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(',').slice(0, MAX)) {
    const [id, d] = part.trim().split('@');
    if (!ID.test(id) || seen.has(id)) continue;
    seen.add(id);
    const iso = d && /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : undefined;
    // 형식이 맞아도 13월·32일 같은 날짜는 버린다. 장소는 살린다.
    const t = iso ? Date.parse(`${iso}T00:00:00Z`) : NaN;
    const visitDate = iso && !Number.isNaN(t) && new Date(t).toISOString().startsWith(iso) ? iso : undefined;
    out.push(visitDate ? { placeId: id, visitDate } : { placeId: id });
  }
  return out;
}

// 기존 저장은 그대로 두고, 없는 장소만 더한다. 기존에 방문일이 없으면 링크의 방문일로 채운다.
export function mergeKeep(cur: Saved[], incoming: KeepItem[], now: string): Saved[] {
  const byId = new Map(cur.map((s) => [s.placeId, s]));
  const next = cur.map((s) => {
    const inc = incoming.find((i) => i.placeId === s.placeId);
    return inc?.visitDate && !s.visitDate ? { ...s, visitDate: inc.visitDate } : s;
  });
  for (const i of incoming) {
    if (!byId.has(i.placeId)) next.push({ placeId: i.placeId, savedAt: now, ...(i.visitDate ? { visitDate: i.visitDate } : {}) });
  }
  return next;
}

export function countNew(cur: Saved[], incoming: KeepItem[]): number {
  const ids = new Set(cur.map((s) => s.placeId));
  return incoming.filter((i) => !ids.has(i.placeId)).length;
}
