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
