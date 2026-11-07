import { useEffect, useMemo, useState } from 'react';
import { track } from '../lib/analytics';
import { googleMapsUrl, openExternal, shareOrCopy, shareUrl } from '../lib/channel';
import { viewOf } from '../lib/content';
import { isUpdateEnded, needsRecheck, todayTokyo } from '../lib/dates';
import { go, hrefTo } from '../lib/router';
import { countNew, encodeKeep, parseKeep } from '../lib/savedLink';
import { importKeep, setVisitDate, toggleSaved, useSaved } from '../lib/storage';
import { type Content, HOOD_LABEL, type Hood, type Saved as SavedItem } from '../lib/types';

const LAST_VISIT = 'tsugi:saved-visited';

interface Props {
  content: Content;
  query: URLSearchParams;
}

export function Saved({ content, query }: Props) {
  const saved = useSaved();
  const today = todayTokyo();
  const [msg, setMsg] = useState('');
  const incoming = useMemo(() => parseKeep(query.get('keep')), [query]);
  const incomingNew = countNew(saved, incoming);

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
    // 진입 시 한 번만 센다 (저장 개수가 바뀔 때마다 다시 세지 않는다).
  }, []);

  const keepLink = async () => {
    const m = await shareOrCopy(shareUrl(`/saved?keep=${encodeKeep(saved)}`), '츠기 — 내 저장 목록');
    setMsg(m);
  };

  return (
    <section>
      {incoming.length > 0 && (
        <div className="notice">
          {incomingNew > 0 ? (
            <>
              <p>
                보관 링크에 <strong>{incoming.length}곳</strong>이 들어 있어요. 이 기기에 없는 {incomingNew}곳을 저장에 더할까요?
              </p>
              <div className="row">
                <button
                  className="save"
                  onClick={() => {
                    const n = importKeep(incoming);
                    setMsg(`${n}곳을 저장에 더했어요.`);
                    go('/saved');
                  }}
                >
                  저장에 더하기
                </button>
                <button className="muted" onClick={() => go('/saved')}>
                  닫기
                </button>
              </div>
            </>
          ) : (
            <div className="row">
              <p>보관 링크의 장소는 이미 모두 저장되어 있어요.</p>
              <button className="muted" onClick={() => go('/saved')}>
                닫기
              </button>
            </div>
          )}
        </div>
      )}

      {saved.length === 0 ? (
        <p className="empty">다음 여행에 넣을 한 곳을 저장해 보세요.</p>
      ) : (
        <>
          <div className="notice keep">
            <p className="muted">
              저장은 이 기기 브라우저에만 남아요. 아이폰 사파리는 7일 넘게 열지 않으면 지울 수 있으니, 링크로 보관해 두세요.
            </p>
            <button className="save" onClick={keepLink}>
              링크로 보관하기
            </button>
          </div>
          {msg && (
            <p className="muted" role="status">
              {msg}
            </p>
          )}
          <SavedList content={content} saved={saved} today={today} />
        </>
      )}
    </section>
  );
}

function SavedList({ content, saved, today }: { content: Content; saved: SavedItem[]; today: string }) {
  const byHood = new Map<Hood | 'unknown', SavedItem[]>();
  for (const s of saved) {
    const hood = content.places.find((x) => x.id === s.placeId)?.hood ?? 'unknown';
    byHood.set(hood, [...(byHood.get(hood) ?? []), s]);
  }

  return (
    <>
      {[...byHood.entries()].map(([hood, items]) => (
        <div key={hood}>
          <h2 className="section-title">{hood === 'unknown' ? '정보 없음' : HOOD_LABEL[hood]}</h2>
          <ul className="list-plain">
            {items.map((s) => {
              const v = viewOf(content, s.placeId);
              if (!v) {
                return (
                  <li key={s.placeId} className="row">
                    <span className="muted">더 이상 소개하지 않는 장소 ({s.placeId})</span>
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
    </>
  );
}
