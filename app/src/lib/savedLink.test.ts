import { describe, expect, it } from 'vitest';
import { countNew, encodeKeep, mergeKeep, parseKeep } from './savedLink';

const now = '2026-11-08T00:00:00.000Z';

describe('encodeKeep / parseKeep', () => {
  it('왕복 변환이 같다', () => {
    const saved = [
      { placeId: 'omotesando-a', savedAt: now },
      { placeId: 'shibuya-b', savedAt: now, visitDate: '2026-12-10' },
    ];
    const raw = encodeKeep(saved);
    expect(raw).toBe('omotesando-a,shibuya-b@20261210');
    expect(parseKeep(raw)).toEqual([{ placeId: 'omotesando-a' }, { placeId: 'shibuya-b', visitDate: '2026-12-10' }]);
  });

  it('잘못된 id·날짜·중복은 버린다', () => {
    expect(parseKeep('ok-1,BAD,../x,ok-1,ok-2@2026,ok-3@20261301x')).toEqual([{ placeId: 'ok-1' }, { placeId: 'ok-2' }]);
    expect(parseKeep('')).toEqual([]);
    expect(parseKeep(null)).toEqual([]);
  });
});

describe('mergeKeep', () => {
  it('없는 장소만 더하고 기존 저장은 유지', () => {
    const cur = [{ placeId: 'a', savedAt: '2026-11-01T00:00:00.000Z' }];
    const next = mergeKeep(cur, [{ placeId: 'a', visitDate: '2026-12-10' }, { placeId: 'b' }], now);
    expect(next).toEqual([
      { placeId: 'a', savedAt: '2026-11-01T00:00:00.000Z', visitDate: '2026-12-10' },
      { placeId: 'b', savedAt: now },
    ]);
  });

  it('기존 방문일은 링크로 덮어쓰지 않는다', () => {
    const cur = [{ placeId: 'a', savedAt: now, visitDate: '2026-12-01' }];
    expect(mergeKeep(cur, [{ placeId: 'a', visitDate: '2026-12-10' }], now)[0].visitDate).toBe('2026-12-01');
  });

  it('새로 더해질 개수', () => {
    expect(countNew([{ placeId: 'a', savedAt: now }], [{ placeId: 'a' }, { placeId: 'b' }])).toBe(1);
  });
});
