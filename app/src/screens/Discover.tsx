import { useEffect, useMemo } from 'react';
import { PlaceCard, cardTypeOf } from '../components/PlaceCard';
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

  const setParam = (k: string, v: string) => {
    const q = new URLSearchParams(query);
    if (v) q.set(k, v);
    else q.delete(k);
    go(`/?${q.toString()}`);
  };

  const pairName = (v: PlaceView) =>
    v.take?.pairWith ? content.places.find((p) => p.id === v.take!.pairWith)?.name.ko : undefined;

  return (
    <section>
      <div className="chips" role="group" aria-label="동네">
        {(Object.keys(HOOD_LABEL) as Hood[]).map((h) => (
          <button key={h} className="chip" aria-pressed={hood === h} onClick={() => setParam('hood', hood === h ? '' : h)}>
            {HOOD_LABEL[h]}
          </button>
        ))}
      </div>
      <div className="chips" role="group" aria-label="취향">
        {(Object.keys(TAG_LABEL) as Tag[]).map((t) => (
          <button key={t} className="chip" aria-pressed={tag === t} onClick={() => setParam('tag', tag === t ? '' : t)}>
            {TAG_LABEL[t]}
          </button>
        ))}
      </div>
      <p className="muted">
        {trip ? `여행 ${from} ~ ${to} 기준으로 걸렀습니다.` : '여행 날짜를 넣으면 그 기간에 갈 수 없는 기간 한정 후보를 걸러냅니다.'}
      </p>

      {views.length === 0 && (
        <p className="empty">이 조건엔 아직 후보가 없어요. 동네를 하나 더 넣어 볼까요?</p>
      )}

      {fresh.length > 0 && <h2 className="section-title">이번 주 새 소식</h2>}
      {fresh.map((v) => (
        <PlaceCard key={v.place.id} view={v} today={today} trip={trip} pairName={pairName(v)} />
      ))}

      {editorial.length > 0 && <h2 className="section-title">편집 추천</h2>}
      {editorial.map((v) => (
        <PlaceCard key={v.place.id} view={v} today={today} trip={trip} pairName={pairName(v)} />
      ))}
    </section>
  );
}
