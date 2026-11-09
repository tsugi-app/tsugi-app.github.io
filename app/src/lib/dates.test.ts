import { describe, expect, it } from 'vitest';
import { activeUpdate, addDays, addMonths, daysLeft, formatYmd, isUpdateActive, isUpdateEnded, monthGrid, needsRecheck } from './dates';
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

describe('달력', () => {
  it('날짜 표시는 YYYY/MM/DD', () => {
    expect(formatYmd('2026-11-09')).toBe('2026/11/09');
  });
  it('한 달을 일요일 시작 주로 나눈다', () => {
    const g = monthGrid('2026-11'); // 2026-11-01은 일요일, 30일까지
    expect(g[0][0]).toBe('2026-11-01');
    expect(g.length).toBe(5);
    expect(g[4].filter(Boolean)).toEqual(['2026-11-29', '2026-11-30']);
    const feb = monthGrid('2027-02'); // 2027-02-01은 월요일, 28일까지
    expect(feb[0][0]).toBeNull();
    expect(feb[0][1]).toBe('2027-02-01');
    expect(feb.flat().filter(Boolean).length).toBe(28);
  });
  it('월 이동은 연도를 넘긴다', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2027-01', -1)).toBe('2026-12');
  });
});

describe('activeUpdate', () => {
  it('진행 중인 소식이 다음 예정 소식보다 앞선다 (파일 이름 순서와 상관없이)', () => {
    const next = { ...base, id: 'a-next', start: '2026-12-15', end: '2027-01-11' };
    const now = { ...base, id: 'z-now', start: '2026-11-03', end: '2026-11-23' };
    expect(activeUpdate([next, now], '2026-11-10')?.id).toBe('z-now');
    expect(activeUpdate([next, now], '2026-11-24')?.id).toBe('a-next');
    expect(activeUpdate([next, now], '2027-01-12')).toBeUndefined();
  });
});
