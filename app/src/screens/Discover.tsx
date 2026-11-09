import { useEffect, useMemo } from 'react';
import { AppBar } from '../components/AppBar';
import { Icon } from '../components/Icon';
import { PlaceCard, cardTypeOf } from '../components/PlaceCard';
import { TripDates } from '../components/TripDates';
import { track } from '../lib/analytics';
import { type PlaceView, viewOf } from '../lib/content';
import { isUpdateActive, todayTokyo, type Trip } from '../lib/dates';
import { go } from '../lib/router';
import { type Content, HOOD_LABEL, type Hood, type Tag, TAG_LABEL } from '../lib/types';

interface Props {
  content: Content;
  query: URLSearchParams;
}

// 필터 상태는 URL(#/?hood=&tag=&from=&to=&c=)에만 있다. 진입 링크가 곧 필터다.
export function Discover({ content, query }: Props) {
  const today = todayTokyo();
  const hood = (query.get('hood') ?? '') as Hood | '';
  const tag = (query.get('tag') ?? '') as Tag | '';
  const from = query.get('from');
  const to = query.get('to');
  const trip = useMemo<Trip | undefined>(() => (from && to ? { from, to } : undefined), [from, to]);

  useEffect(() => {
    track('discovery_viewed', { hood: hood || undefined, tag: tag || undefined, hasTrip: !!trip });
  }, [hood, tag, trip]);

  const views = useMemo(() => {
    return content.places
      .filter((p) => !hood || p.hood === hood)
      .filter((p) => !tag || p.tags.includes(tag))
      .map((p) => viewOf(content, p.id)!)
      .filter((v) => !cardTypeOf(v, today, trip).ended);
  }, [content, hood, tag, today, trip]);

  const fresh = views.filter((v) => v.updates.some((u) => isUpdateActive(u, today, trip)));
  const editorial = views.filter((v) => !fresh.includes(v));

  const setParams = (patch: Record<string, string>) => {
    const q = new URLSearchParams(query);
    for (const [k, v] of Object.entries(patch)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    go(`/?${q.toString()}`);
  };
  const setParam = (k: string, v: string) => setParams({ [k]: v });

  const pairName = (v: PlaceView) =>
    v.take?.pairWith ? content.places.find((p) => p.id === v.take!.pairWith)?.name.ko : undefined;

  const list = (items: PlaceView[]) => (
    <ul className="place-list">
      {items.map((v) => (
        <li key={v.place.id}>
          <PlaceCard view={v} today={today} trip={trip} pairName={pairName(v)} />
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <AppBar />
      <section>
        <div className="chip-row" role="group" aria-label="동네">
          <button className="chip" aria-pressed={!hood} onClick={() => setParam('hood', '')}>
            전체
          </button>
          {(Object.keys(HOOD_LABEL) as Hood[]).map((h) => (
            <button key={h} className="chip" aria-pressed={hood === h} onClick={() => setParam('hood', hood === h ? '' : h)}>
              {HOOD_LABEL[h]}
            </button>
          ))}
        </div>
        <div className="chip-row" role="group" aria-label="취향">
          {(Object.keys(TAG_LABEL) as Tag[]).map((t) => (
            <button key={t} className="chip" aria-pressed={tag === t} onClick={() => setParam('tag', tag === t ? '' : t)}>
              {TAG_LABEL[t]}
            </button>
          ))}
        </div>
        <TripDates
          from={from}
          to={to}
          today={today}
          onChange={(f, t) => setParams({ from: f, to: t })}
          onClear={() => setParams({ from: '', to: '' })}
        />
        <div className="divider-band" />

        {views.length === 0 && (
          <div className="empty">
            <Icon name="discover" size={48} />
            <p>이 조건엔 아직 후보가 없어요.</p>
            <button className="btn btn--neutral-weak" onClick={() => setParams({ hood: '', tag: '' })}>
              동네·취향 조건 풀기
            </button>
          </div>
        )}

        {fresh.length > 0 && (
          <>
            <h2 className="list-header">
              {trip ? '여행 기간 중 새 소식' : '지금 새 소식'}
              <small>{fresh.length}곳</small>
            </h2>
            {list(fresh)}
          </>
        )}

        {editorial.length > 0 && (
          <>
            <h2 className="list-header">
              편집 추천<small>{editorial.length}곳</small>
            </h2>
            {list(editorial)}
          </>
        )}
      </section>
    </>
  );
}
