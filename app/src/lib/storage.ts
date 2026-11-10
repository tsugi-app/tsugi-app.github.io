import { useSyncExternalStore } from 'react';
import { countNew, type KeepItem, mergeKeep } from './savedLink';
import type { Saved } from './types';

// 저장은 기기에만 있다. 계정·동기화가 생기면 이 파일의 구현만 바꾼다.
const KEY = 'tsugi:saved';
const listeners = new Set<() => void>();
let cache: Saved[] | null = null;

function read(): Saved[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Saved[];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Saved[]): void {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장 공간이 없거나 접근 불가 — 메모리에만 유지
  }
  listeners.forEach((l) => l());
}

export function useSaved(): Saved[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => [],
  );
}

export function toggleSaved(placeId: string): boolean {
  const cur = read();
  if (cur.some((s) => s.placeId === placeId)) {
    write(cur.filter((s) => s.placeId !== placeId));
    return false;
  }
  write([...cur, { placeId, savedAt: new Date().toISOString() }]);
  return true;
}

export function importKeep(items: KeepItem[]): number {
  const cur = read();
  const added = countNew(cur, items);
  write(mergeKeep(cur, items, new Date().toISOString()));
  return added;
}

export function setVisitDate(placeId: string, visitDate?: string): void {
  write(read().map((s) => (s.placeId === placeId ? { ...s, visitDate } : s)));
}

// 화면 테마 설정. 기본은 기기 설정을 따른다 (docs/DESIGN.md §1.1 다크 모드).
export type ThemePref = 'system' | 'light' | 'dark';
const THEME_KEY = 'tsugi:theme';

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function setThemePref(pref: ThemePref): void {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    // 저장 불가 — 이번 방문에만 적용
  }
}

// 이용 통계 보내기. 기본은 켜짐이고, 설정에서 끄면 그 뒤로는 보내지 않는다 (#/privacy).
const ANALYTICS_KEY = 'tsugi:analytics';

export function getAnalyticsOff(): boolean {
  try {
    return localStorage.getItem(ANALYTICS_KEY) === 'off';
  } catch {
    return false;
  }
}

export function setAnalyticsOff(off: boolean): void {
  try {
    if (off) localStorage.setItem(ANALYTICS_KEY, 'off');
    else localStorage.removeItem(ANALYTICS_KEY);
  } catch {
    // 저장 불가 — 이번 방문에만 적용
  }
}
