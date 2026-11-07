import { describe, expect, it } from 'vitest';
import { addDays, daysLeft, isUpdateActive, isUpdateEnded, needsRecheck } from './dates';
import type { Update } from './types';

const base: Update = {
  id: 'u',
  placeId: 'p',
  type: 'limited',
  start: '2026-11-20',
  end: '2026-12-14',
  source: 'https://example.jp',
};

describe('isUpdateActive', () => {
  it('여행 기간이 없으면 종료일이 오늘 이후인 소식만 유효', () => {
    expect(isUpdateActive(base, '2026-12-14')).toBe(true);
    expect(isUpdateActive(base, '2026-12-15')).toBe(false);
  });
  it('여행 기간이 겹치면 유효', () => {
    expect(isUpdateActive(base, '2026-11-07', { from: '2026-12-10', to: '2026-12-13' })).toBe(true);
    expect(isUpdateActive(base, '2026-11-07', { from: '2026-12-15', to: '2026-12-20' })).toBe(false);
    expect(isUpdateActive(base, '2026-11-07', { from: '2026-11-01', to: '2026-11-19' })).toBe(false);
  });
  it('end가 없는 소식은 시작 후 60일까지만 새 소식', () => {
    const u = { ...base, type: 'new' as const, start: '2026-09-01', end: undefined };
    expect(isUpdateActive(u, '2026-10-31')).toBe(true); // 60일째
    expect(isUpdateActive(u, '2026-11-01')).toBe(false);
    expect(isUpdateEnded(u, '2026-11-01')).toBe(true);
  });
  it('시작 전 소식도 유효(예정)로 본다', () => {
    expect(isUpdateActive(base, '2026-11-08')).toBe(true);
  });
});

describe('isUpdateEnded / daysLeft / needsRecheck', () => {
  it('종료 판정과 D-day', () => {
    expect(isUpdateEnded(base, '2026-12-14')).toBe(false);
    expect(isUpdateEnded(base, '2026-12-15')).toBe(true);
    expect(daysLeft(base, '2026-12-02')).toBe(12);
    expect(daysLeft({ ...base, end: undefined }, '2026-12-02')).toBeNull();
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });
  it('재확인 예정일이 지나면 재확인 필요', () => {
    const c = { placeId: 'p', checkedAt: '2026-11-05', checkedBy: 'editor', recheckBy: '2026-11-26' };
    expect(needsRecheck(c, '2026-11-26')).toBe(false);
    expect(needsRecheck(c, '2026-11-27')).toBe(true);
    expect(needsRecheck(undefined, '2026-11-27')).toBe(false);
  });
});
