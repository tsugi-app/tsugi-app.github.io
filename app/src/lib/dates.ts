import type { Check, Update } from './types';

// 모든 날짜 비교는 Asia/Tokyo 기준의 YYYY-MM-DD 문자열로 한다.
export function todayTokyo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export interface Trip {
  from: string;
  to: string;
}

// 끝나는 날이 없는 "새로 오픈·최근 변화" 소식은 시작 후 이 기간만 새 소식으로 본다.
// 그 뒤에는 장소가 남아 있어도(take.evergreen) 편집 추천으로 넘어간다.
export const FRESH_DAYS = 60;

export function addDays(d: string, n: number): string {
  return new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

export function effectiveEnd(u: Update): string {
  return u.end ?? addDays(u.start, FRESH_DAYS);
}

// 소식이 지금(또는 여행 기간에) 유효한가.
export function isUpdateActive(u: Update, today: string, trip?: Trip): boolean {
  const end = effectiveEnd(u);
  if (trip) return u.start <= trip.to && end >= trip.from;
  return end >= today;
}

// 카드에 보일 소식 하나: 살아 있는 소식 중 가장 먼저 시작하는 것 (지금 진행 중인 것이 다음 예정보다 앞선다).
export function activeUpdate(updates: Update[], today: string, trip?: Trip): Update | undefined {
  return updates
    .filter((u) => isUpdateActive(u, today, trip))
    .sort((a, b) => a.start.localeCompare(b.start))[0];
}

export function isUpdateEnded(u: Update, today: string): boolean {
  return effectiveEnd(u) < today;
}

export function needsRecheck(c: Check | undefined, today: string): boolean {
  return !!c?.recheckBy && c.recheckBy < today;
}

// 종료까지 남은 일수. end가 없으면 null.
export function daysLeft(u: Update, today: string): number | null {
  if (!u.end) return null;
  const ms = Date.parse(u.end + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z');
  return Math.round(ms / 86_400_000);
}

export function formatDate(d: string): string {
  const [, m, day] = d.split('-');
  return `${Number(m)}.${Number(day)}`;
}

// 날짜 입력 표시는 YYYY/MM/DD로 통일한다 (브라우저 기본 date 입력은 기기 언어에 따라 mm/dd/yyyy가 된다).
export function formatYmd(d: string): string {
  return d.replace(/-/g, '/');
}

// 달력 한 달: 'YYYY-MM' → 일요일 시작 7칸씩 끊은 주 배열. 앞뒤 빈칸은 null.
export function monthGrid(ym: string): (string | null)[][] {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${ym}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
