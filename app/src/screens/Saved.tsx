import { useEffect } from 'react';
import { track } from '../lib/analytics';
import { googleMapsUrl, openExternal } from '../lib/channel';
import { viewOf } from '../lib/content';
import { isUpdateEnded, needsRecheck, todayTokyo } from '../lib/dates';
import { hrefTo } from '../lib/router';
import { setVisitDate, toggleSaved, useSaved } from '../lib/storage';
import { type Content, HOOD_LABEL, type Hood } from '../lib/types';

const LAST_VISIT = 'tsugi:saved-visited';

export function Saved({ content }: { content: Content }) {
  const saved = useSaved();
  const today = todayTokyo();

  // 다른 날짜에 다시 왔을 때만 재방문으로 센다.
  useEffect(() => {
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST_VISIT);
      localStorage.setItem(LAST_VISIT, today);
    } catch {
      /* ignore */
    }
    if (last && last !== today) track('saved_list_revisited', { count: saved.length });
  }, [today, saved.length]);

  if (saved.length === 0) {
    return <p className="empty">다음 여행에 넣을 한 곳을 저장해 보세요.</p>;
  }

  const byHood = new Map<Hood, typeof saved>();
  for (const s of saved) {
    const p = content.places.find((x) => x.id === s.placeId);
    const hood = p?.hood ?? 'shibuya';
    byHood.set(hood, [...(byHood.get(hood) ?? []), s]);
  }

  return (
    <section>
      {[...byHood.entries()].map(([hood, items]) => (
        <div key={hood}>
          <h2 className="section-title">{HOOD_LABEL[hood]}</h2>
          <ul className="list-plain">
            {items.map((s) => {
              const v = viewOf(content, s.placeId);
              if (!v) {
                return (
                  <li key={s.placeId} className="row">
                    <span className="muted">정보 없음 ({s.placeId})</span>
                    <button className="muted" onClick={() => toggleSaved(s.placeId)}>
                      삭제
                    </button>
                  </li>
                );
              }
              const ended = v.updates.length > 0 && v.updates.every((u) => isUpdateEnded(u, today)) && !v.take?.evergreen;
              const recheck = needsRecheck(v.check, today);
              return (
                <li key={s.placeId}>
                  <div className="row">
                    <a href={hrefTo(`/p/${v.place.id}`)} style={{ fontWeight: 700 }}>
                      {v.place.name.ko}
                    </a>
                    <span className="muted">
                      {ended && '종료됨 '}
                      {recheck && <span className="badge recheck">재확인 필요</span>}
                    </span>
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <label className="muted">
                      방문 예정{' '}
                      <input
                        type="date"
                        value={s.visitDate ?? ''}
                        onChange={(e) => setVisitDate(s.placeId, e.target.value || undefined)}
                      />
                    </label>
                    <button
                      className="muted"
                      onClick={() => {
                        track('map_opened', { placeId: v.place.id, from: 'saved' });
                        openExternal(googleMapsUrl(v.place.geo.lat, v.place.geo.lng, v.place.name.ja ?? v.place.name.ko));
                      }}
                    >
                      지도 열기
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
