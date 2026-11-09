import { useEffect, useMemo } from 'react';
import { AppBar } from '../components/AppBar';
import { Icon } from '../components/Icon';
import { cardTypeOf } from '../components/PlaceCard';
import { Thumb } from '../components/PlaceParts';
import { showSnackbar } from '../components/Snackbar';
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
    showSnackbar(await shareOrCopy(shareUrl(`/saved?keep=${encodeKeep(saved)}`), '츠기 — 내 저장 목록'));
  };

  return (
    <>
      <AppBar
        title={
          <h1 className="app-bar-title">
            저장{saved.length > 0 && <span className="meta"> {saved.length}곳</span>}
          </h1>
        }
      />

      {incoming.length > 0 && (
        <div className="callout callout--informative">
          <Icon name="link" size={20} />
          <div className="callout-body">
            {incomingNew > 0 ? (
              <>
                <p>
                  <b>보관 링크에 {incoming.length}곳</b>이 들어 있어요. 이 기기에 없는 {incomingNew}곳을 저장에 더할까요?
                </p>
                <div className="callout-actions">
                  <button
                    className="btn btn--sm btn--brand-solid"
                    onClick={() => {
                      const n = importKeep(incoming);
                      showSnackbar(`${n}곳을 저장에 더했어요.`);
                      go('/saved');
                    }}
                  >
                    저장에 더하기
                  </button>
                  <button className="btn btn--sm btn--neutral-outline" onClick={() => go('/saved')}>
                    닫기
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>보관 링크의 장소는 이미 모두 저장되어 있어요.</p>
                <div className="callout-actions">
                  <button className="btn btn--sm btn--neutral-outline" onClick={() => go('/saved')}>
                    닫기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {saved.length === 0 ? (
        <div className="empty">
          <Icon name="heart" size={48} />
          <p>
            다음 여행에 넣을 한 곳을
            <br />
            하트를 눌러 저장해 보세요.
          </p>
          <a className="btn btn--neutral-weak" href={hrefTo('/')}>
            둘러보기
          </a>
        </div>
      ) : (
        <>
          <div className="callout">
            <Icon name="info" size={20} />
            <div className="callout-body">
              <p>저장은 이 기기 브라우저에만 남아요. 아이폰 사파리는 7일 넘게 열지 않으면 지울 수 있으니 링크로 보관해 두세요.</p>
              <div className="callout-actions">
                <button className="btn btn--sm btn--neutral-outline" onClick={keepLink}>
                  <Icon name="link" size={16} />
                  링크로 보관하기
                </button>
              </div>
            </div>
          </div>
          <SavedList content={content} saved={saved} today={today} />
        </>
      )}
    </>
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
        <section key={hood}>
          <h2 className="list-header">
            {hood === 'unknown' ? '정보 없음' : HOOD_LABEL[hood]}
            <small>{items.length}곳</small>
          </h2>
          <ul className="place-list">
            {items.map((s) => {
              const v = viewOf(content, s.placeId);
              if (!v) {
                return (
                  <li key={s.placeId}>
                    <div className="place-item place-item--compact">
                      <div className="place-item-body">
                        <span className="meta">더 이상 소개하지 않는 장소예요 ({s.placeId})</span>
                      </div>
                      <div className="place-item-actions">
                        <button className="btn btn--sm btn--neutral-weak" onClick={() => toggleSaved(s.placeId)}>
                          삭제
                        </button>
                      </div>
                    </div>
                  </li>
                );
              }
              const ended = v.updates.length > 0 && v.updates.every((u) => isUpdateEnded(u, today)) && !v.take?.evergreen;
              const recheck = needsRecheck(v.check, today);
              const { type } = cardTypeOf(v, today);
              return (
                <li key={s.placeId}>
                  <div className={`place-item${ended ? ' ended' : ''}`}>
                    <a className="place-item-link" href={hrefTo(`/p/${v.place.id}`)} aria-label={`${v.place.name.ko} 자세히 보기`} />
                    <Thumb place={v.place} type={type} variant="mini" ended={ended} />
                    <div className="place-item-body">
                      {(ended || recheck) && (
                        <div className="badges">
                          {ended && <span className="badge badge--neutral">종료됨</span>}
                          {recheck && <span className="badge badge--warning">재확인 필요</span>}
                        </div>
                      )}
                      <h3 className="place-name">{v.place.name.ko}</h3>
                      <div className="place-item-actions">
                        <label className="field field--inline">
                          <span className="field-label">방문 예정</span>
                          <input
                            type="date"
                            value={s.visitDate ?? ''}
                            onChange={(e) => setVisitDate(s.placeId, e.target.value || undefined)}
                          />
                        </label>
                        <button
                          className="btn btn--sm btn--neutral-weak"
                          onClick={() => {
                            track('map_opened', { placeId: v.place.id, from: 'saved' });
                            openExternal(googleMapsUrl(v.place));
                          }}
                        >
                          지도 열기
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
