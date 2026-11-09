import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AppBar } from '../components/AppBar';
import type { Pin } from '../components/MapView';
import { cardTypeOf, conditionText } from '../components/PlaceCard';
import { dday, Thumb, typeVars } from '../components/PlaceParts';
import { Icon } from '../components/Icon';
import { showSnackbar } from '../components/Snackbar';
import { track } from '../lib/analytics';
import { googleMapsUrl, openExternal } from '../lib/channel';
import { type PlaceView, viewOf } from '../lib/content';
import { daysLeft, isUpdateActive, todayTokyo } from '../lib/dates';
import { go, hrefTo } from '../lib/router';
import { isSaved, toggleSaved, useSaved } from '../lib/storage';
import { type Content, HOOD_LABEL, type Hood, TAG_LABEL, TYPE_LABEL } from '../lib/types';

// 지도 탭 — docs/MAP_PLAN.md 1단계.
//   #/map              지도 (Leaflet + 지리원 타일, 지도 탭에 들어갈 때만 내려받는다)
//   #/map?hood=…       동네만
//   #/map?view=list    동네별 목록 (지도가 불편한 사람·스크린리더를 위한 대체 경로)
const MapView = lazy(() => import('../components/MapView'));

export function MapScreen({ content, query }: { content: Content; query: URLSearchParams }) {
  const today = todayTokyo();
  const hood = (query.get('hood') ?? '') as Hood | '';
  const list = query.get('view') === 'list';
  const [selected, setSelected] = useState<string | null>(null);

  // 발견 피드와 같은 기준: 종료된 소식만 남은 곳은 지도에서도 뺀다.
  const views = useMemo(
    () =>
      content.places
        .filter((p) => !hood || p.hood === hood)
        .map((p) => viewOf(content, p.id)!)
        .filter((v) => !cardTypeOf(v, today).ended),
    [content, hood, today],
  );

  const pins = useMemo<Pin[]>(
    () =>
      views.map((v) => {
        const type = cardTypeOf(v, today).type;
        return {
          id: v.place.id,
          lat: v.place.geo.lat,
          lng: v.place.geo.lng,
          type,
          label: `${v.place.name.ko}, ${TYPE_LABEL[type]}`,
        };
      }),
    [views, today],
  );

  // 동네를 바꾸면 고른 장소가 그 동네에 없을 수 있다.
  useEffect(() => {
    if (selected && !views.some((v) => v.place.id === selected)) setSelected(null);
  }, [views, selected]);

  const setParams = (patch: Record<string, string>) => {
    const q = new URLSearchParams(query);
    for (const [k, v] of Object.entries(patch)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    const s = q.toString();
    go(`/map${s ? `?${s}` : ''}`);
  };

  const hoods = (Object.keys(HOOD_LABEL) as Hood[]).filter((h) => content.places.some((p) => p.hood === h));
  const current = selected ? views.find((v) => v.place.id === selected) : undefined;

  return (
    <div className={list ? undefined : 'map-screen'}>
      <AppBar
        title={<h1 className="app-bar-title">지도</h1>}
        right={
          <button className="btn btn--sm btn--neutral-weak" onClick={() => setParams({ view: list ? '' : 'list' })}>
            <Icon name={list ? 'map' : 'discover'} size={18} />
            {list ? '지도로 보기' : '목록으로 보기'}
          </button>
        }
      />
      <div className="chip-row map-chips" role="group" aria-label="동네">
        <button className="chip" aria-pressed={!hood} onClick={() => setParams({ hood: '' })}>
          전체
        </button>
        {hoods.map((h) => (
          <button key={h} className="chip" aria-pressed={hood === h} onClick={() => setParams({ hood: hood === h ? '' : h })}>
            {HOOD_LABEL[h]}
          </button>
        ))}
      </div>

      {list ? (
        <MapList views={views} />
      ) : (
        <div className="map-wrap">
          <Suspense fallback={<div className="map-canvas map-loading">지도를 불러오고 있어요.</div>}>
            <MapView pins={pins} selected={selected} onSelect={setSelected} fitKey={hood || 'all'} />
          </Suspense>
          {current && <MapPreview view={current} today={today} onClose={() => setSelected(null)} />}
        </div>
      )}
    </div>
  );
}

// 마커를 누르면 지도 아래에 뜨는 카드. 누르면 상세, 「길찾기」는 구글 지도.
function MapPreview({ view, today, onClose }: { view: PlaceView; today: string; onClose: () => void }) {
  useSaved();
  const { place } = view;
  const { type } = cardTypeOf(view, today);
  const update = view.updates.find((u) => isUpdateActive(u, today));
  const upcoming = !!update && update.start > today;
  const left = update && !upcoming ? daysLeft(update, today) : null;
  const saved = isSaved(place.id);

  return (
    <article className="map-card" aria-label={`${place.name.ko} 미리보기`}>
      <a
        className="place-item-link"
        href={hrefTo(`/p/${place.id}`)}
        onClick={() => track('place_opened', { placeId: place.id, type, from: 'map' })}
        aria-label={`${place.name.ko} 자세히 보기`}
      />
      <Thumb place={place} type={type} variant="mini" />
      <div className="map-card-body">
        <div className="place-item-meta-top">
          <span className="badge" style={typeVars(type)}>
            {TYPE_LABEL[type]}
            {left !== null && left >= 0 && ` ${dday(left)}`}
            {upcoming && ' · 예정'}
          </span>
          <span>{HOOD_LABEL[place.hood]}</span>
        </div>
        <h3 className="place-name">{place.name.ko}</h3>
        <span className="meta">{conditionText(update, today)}</span>
      </div>
      <div className="map-card-actions">
        <button
          className="icon-btn heart"
          aria-pressed={saved}
          aria-label={saved ? `${place.name.ko} 저장 취소` : `${place.name.ko} 저장`}
          onClick={() => {
            const now = toggleSaved(place.id);
            if (now) track('place_saved', { placeId: place.id, from: 'map' });
            showSnackbar(now ? '저장했어요. 저장 탭에서 볼 수 있어요.' : '저장에서 뺐어요.');
          }}
        >
          <Icon name={saved ? 'heartFill' : 'heart'} />
        </button>
        <button
          className="btn btn--sm btn--brand-solid"
          onClick={() => {
            track('map_opened', { placeId: place.id, from: 'map' });
            openExternal(googleMapsUrl(place));
          }}
        >
          길찾기
        </button>
      </div>
      <button className="map-card-close icon-btn" aria-label="미리보기 닫기" onClick={onClose}>
        <Icon name="close" size={18} />
      </button>
    </article>
  );
}

// 목록 보기 — 지도 이전의 동네별 목록 그대로.
function MapList({ views }: { views: PlaceView[] }) {
  const hoods = (Object.keys(HOOD_LABEL) as Hood[]).filter((h) => views.some((v) => v.place.hood === h));
  return (
    <>
      {hoods.map((h) => {
        const places = views.filter((v) => v.place.hood === h).map((v) => v.place);
        return (
          <section key={h}>
            <h2 className="list-header">
              {HOOD_LABEL[h]}
              <small>{places.length}곳</small>
            </h2>
            <ul className="place-list">
              {places.map((p) => (
                <li key={p.id}>
                  <div className="place-item place-item--compact">
                    <a className="place-item-link" href={hrefTo(`/p/${p.id}`)} aria-label={`${p.name.ko} 자세히 보기`} />
                    <Thumb place={p} type="editorial" variant="mini" />
                    <div className="place-item-body">
                      <h3 className="place-name">{p.name.ko}</h3>
                      <span className="meta">{p.tags.map((t) => TAG_LABEL[t]).join(' · ')}</span>
                    </div>
                    <div className="place-item-actions">
                      <button
                        className="btn btn--sm btn--neutral-weak"
                        onClick={() => {
                          track('map_opened', { placeId: p.id, from: 'map' });
                          openExternal(googleMapsUrl(p));
                        }}
                      >
                        지도 열기
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
