import { Fragment, useEffect, useMemo } from 'react';
import { AdBanner } from '../components/AdBanner';
import { AppBar } from '../components/AppBar';
import { Icon } from '../components/Icon';
import { PlaceCard } from '../components/PlaceCard';
import { cardTypeOf } from '../components/PlaceParts';
import { TripDates } from '../components/TripDates';
import { track } from '../lib/analytics';
import { areaFilter, type PlaceView, viewOf } from '../lib/content';
import { todayTokyo, type Trip } from '../lib/dates';
import { go, hrefTo } from '../lib/router';
import { CITY_LABEL, type Content, HOOD_LABEL, type Tag, TAG_LABEL } from '../lib/types';

interface Props {
  content: Content;
  query: URLSearchParams;
}

const AD_AFTER = 5;

// 필터 상태는 URL(#/?city=&hood=&tag=&from=&to=&c=)에만 있다. 진입 링크가 곧 필터다.
export function Discover({ content, query }: Props) {
  const today = todayTokyo();
  const area = useMemo(() => areaFilter(content.places, query), [content, query]);
  const { city, hood } = area;
  const tag = (query.get('tag') ?? '') as Tag | '';
  const from = query.get('from');
  const to = query.get('to');
  const trip = useMemo<Trip | undefined>(() => (from && to ? { from, to } : undefined), [from, to]);

  useEffect(() => {
    track('discovery_viewed', { city: city || undefined, hood: hood || undefined, tag: tag || undefined, hasTrip: !!trip });
  }, [city, hood, tag, trip]);

  // 끝난 소식만 남은 곳은 빼고, 살아 있는 소식이 있으면 "새 소식", 없으면 "편집 추천"으로 나눈다.
  const { fresh, editorial } = useMemo(() => {
    const fresh: PlaceView[] = [];
    const editorial: PlaceView[] = [];
    for (const p of content.places) {
      if (!area.match(p) || (tag && !p.tags.includes(tag))) continue;
      const v = viewOf(content, p.id)!;
      const card = cardTypeOf(v, today, trip);
      if (!card.ended) (card.update ? fresh : editorial).push(v);
    }
    return { fresh, editorial };
  }, [content, area, tag, today, trip]);

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

  // 배너는 다섯 번째 카드 뒤에 한 번만 — 새 소식이 다섯 곳 이상이면 거기, 아니면 편집 추천에 (토스 채널만, components/AdBanner.tsx).
  const list = (items: PlaceView[], withAd = false) => (
    <ul className="place-list">
      {items.map((v, i) => (
        <Fragment key={v.place.id}>
          <li>
            <PlaceCard view={v} today={today} trip={trip} pairName={pairName(v)} />
          </li>
          {withAd && i === AD_AFTER - 1 && (
            <li>
              <AdBanner slot="discover" />
            </li>
          )}
        </Fragment>
      ))}
    </ul>
  );

  return (
    <>
      <AppBar
        right={
          <a className="icon-btn" href={hrefTo('/settings')} aria-label="설정">
            <Icon name="settings" />
          </a>
        }
      />
      <section>
        {area.cities.length > 1 && (
          <div className="chip-row" role="group" aria-label="도시">
            <button className="chip" aria-pressed={!city} onClick={() => setParams({ city: '', hood: '' })}>
              전체
            </button>
            {area.cities.map((c) => (
              <button
                key={c}
                className="chip"
                aria-pressed={city === c}
                onClick={() => setParams({ city: city === c ? '' : c, hood: '' })}
              >
                {CITY_LABEL[c]}
              </button>
            ))}
          </div>
        )}
        {area.hoods.length > 0 && (
          <div className="chip-row" role="group" aria-label="동네">
            <button className="chip" aria-pressed={!hood} onClick={() => setParams({ city, hood: '' })}>
              {area.cities.length > 1 && city ? `${CITY_LABEL[city]} 전체` : '전체'}
            </button>
            {area.hoods.map((h) => (
              <button key={h} className="chip" aria-pressed={hood === h} onClick={() => setParams({ city, hood: hood === h ? '' : h })}>
                {HOOD_LABEL[h]}
              </button>
            ))}
          </div>
        )}
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

        {fresh.length + editorial.length === 0 && (
          <div className="empty">
            <Icon name="discover" size={48} />
            <p>이 조건엔 아직 후보가 없어요.</p>
            <button className="btn btn--neutral-weak" onClick={() => setParams({ city: '', hood: '', tag: '' })}>
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
            {list(fresh, fresh.length >= AD_AFTER)}
          </>
        )}

        {editorial.length > 0 && (
          <>
            <h2 className="list-header">
              편집 추천<small>{editorial.length}곳</small>
            </h2>
            {list(editorial, fresh.length < AD_AFTER)}
          </>
        )}
      </section>
    </>
  );
}
