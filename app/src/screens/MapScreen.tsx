import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AppBar } from '../components/AppBar';
import type { Me, Pin } from '../components/MapView';
import { cardTypeOf, conditionText } from '../components/PlaceCard';
import { dday, Thumb, typeVars } from '../components/PlaceParts';
import { Icon } from '../components/Icon';
import { showSnackbar } from '../components/Snackbar';
import { track } from '../lib/analytics';
import { getPosition, googleMapsUrl, openExternal } from '../lib/channel';
import { type PlaceView, viewOf } from '../lib/content';
import { daysLeft, isUpdateActive, todayTokyo } from '../lib/dates';
import { distanceM, formatDistance } from '../lib/geo';
import { go, hrefTo } from '../lib/router';
import { isSaved, toggleSaved, useSaved } from '../lib/storage';
import { type Content, HOOD_LABEL, type Hood, TAG_LABEL, TYPE_LABEL } from '../lib/types';

// 지도 탭 — docs/MAP_PLAN.md 1·2단계.
//   #/map              지도 (MapLibre + OpenFreeMap Positron, 지도 탭에 들어갈 때만 내려받는다)
//   #/map?hood=…       동네만
//   #/map?saved=1      저장한 곳만
//   #/map?view=list    동네별 목록 (지도가 불편한 사람·스크린리더를 위한 대체 경로)
const MapView = lazy(() => import('../components/MapView'));

// 세 동네가 들어오는 범위. 내 위치가 이 밖이면 지도를 옮기지 않는다.
const AREA = { south: 35.64, north: 35.69, west: 139.68, east: 139.73 };

export function MapScreen({ content, query }: { content: Content; query: URLSearchParams }) {
  const saved = useSaved();
  const today = todayTokyo();
  const hood = (query.get('hood') ?? '') as Hood | '';
  const onlySaved = query.get('saved') === '1';
  const list = query.get('view') === 'list';
  // 누른 마커의 장소들(같은 건물이면 여러 곳)과 그중 지금 카드로 보이는 곳.
  const [group, setGroup] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [meKey, setMeKey] = useState(0);
  const [locating, setLocating] = useState(false);

  // 발견 피드와 같은 기준: 종료된 소식만 남은 곳은 지도에서도 뺀다.
  const views = useMemo(
    () =>
      content.places
        .filter((p) => !hood || p.hood === hood)
        .filter((p) => !onlySaved || saved.some((s) => s.placeId === p.id))
        .map((p) => viewOf(content, p.id)!)
        .filter((v) => !cardTypeOf(v, today).ended),
    [content, hood, onlySaved, saved, today],
  );

  const pinOf = (v: PlaceView): Pin => {
    const type = cardTypeOf(v, today).type;
    return {
      id: v.place.id,
      lat: v.place.geo.lat,
      lng: v.place.geo.lng,
      type,
      name: v.place.name.ko,
      label: `${v.place.name.ko}, ${TYPE_LABEL[type]}`,
    };
  };
  const pins = useMemo(() => views.map(pinOf), [views, today]); // eslint-disable-line react-hooks/exhaustive-deps

  // 필터를 바꿔 고른 곳이 사라지면 카드를 닫는다.
  useEffect(() => {
    if (selected && !views.some((v) => v.place.id === selected)) {
      setGroup(null);
      setSelected(null);
    }
  }, [views, selected]);

  // Esc로 미리보기 카드를 닫는다.
  useEffect(() => {
    if (!group) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGroup(null);
        setSelected(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [group]);

  const current = selected ? views.find((v) => v.place.id === selected) : undefined;
  const pairView = current?.take?.pairWith ? viewOf(content, current.take.pairWith) : undefined;
  const pairPin = pairView && pins.find((p) => p.id === pairView.place.id) ? pinOf(pairView) : null;

  const setParams = (patch: Record<string, string>) => {
    const q = new URLSearchParams(query);
    for (const [k, v] of Object.entries(patch)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    const s = q.toString();
    go(`/map${s ? `?${s}` : ''}`);
  };

  const select = (ids: string[] | null) => {
    setGroup(ids);
    setSelected(ids?.[0] ?? null);
  };

  // 내 위치는 버튼을 누를 때만 묻는다. 저장하지 않는다. 채널별 처리는 lib/channel.ts의 getPosition.
  const locate = async () => {
    setLocating(true);
    const r = await getPosition();
    setLocating(false);
    if (!r.ok) {
      showSnackbar(
        r.reason === 'denied'
          ? '위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요.'
          : r.reason === 'unsupported'
            ? '이 기기에서는 위치를 확인할 수 없어요.'
            : '위치를 찾지 못했어요. 잠시 뒤 다시 눌러 주세요.',
      );
      return;
    }
    const next = { lat: r.lat, lng: r.lng, accuracy: r.accuracy };
    setMe(next);
    const inArea = next.lat > AREA.south && next.lat < AREA.north && next.lng > AREA.west && next.lng < AREA.east;
    if (inArea) setMeKey((k) => k + 1);
    else showSnackbar('지금 위치가 시부야·하라주쿠·오모테산도 밖이라 지도를 옮기지 않았어요.');
  };

  const hoods = (Object.keys(HOOD_LABEL) as Hood[]).filter((h) => content.places.some((p) => p.hood === h));
  const groupViews = (group ?? []).map((id) => views.find((v) => v.place.id === id)).filter(Boolean) as PlaceView[];

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
      <div className="chip-row map-chips" role="group" aria-label="지도 필터">
        <button className="chip" aria-pressed={!hood} onClick={() => setParams({ hood: '' })}>
          전체
        </button>
        {hoods.map((h) => (
          <button key={h} className="chip" aria-pressed={hood === h} onClick={() => setParams({ hood: hood === h ? '' : h })}>
            {HOOD_LABEL[h]}
          </button>
        ))}
        <span className="chip-sep" aria-hidden />
        <button className="chip" aria-pressed={onlySaved} onClick={() => setParams({ saved: onlySaved ? '' : '1' })}>
          <Icon name={onlySaved ? 'heartFill' : 'heart'} size={16} />
          저장한 곳
        </button>
      </div>

      {list ? (
        <MapList views={views} onlySaved={onlySaved} />
      ) : (
        <div className="map-wrap">
          <p className="sr-only" id="map-hint">
            지도의 장소 표시는 Tab 키로 옮겨 가며 Enter로 고를 수 있어요. 같은 장소를 목록으로 보려면 위의 「목록으로 보기」를 누르세요.
          </p>
          <Suspense fallback={<div className="map-canvas map-loading">지도를 불러오고 있어요.</div>}>
            <MapView
              pins={pins}
              selected={selected}
              pair={pairPin}
              me={me}
              onSelect={select}
              fitKey={`${hood || 'all'}:${onlySaved ? 's' : ''}`}
              meKey={meKey}
            />
          </Suspense>
          <button
            className="map-locate icon-btn"
            aria-label="내 위치 보기"
            aria-busy={locating}
            onClick={locate}
          >
            <Icon name="locate" size={22} />
          </button>
          {onlySaved && views.length === 0 && (
            <p className="map-empty">저장한 곳이 아직 없어요. 발견 탭에서 하트를 눌러 보세요.</p>
          )}
          {groupViews.length > 0 && (
            <MapCards
              views={groupViews}
              selected={selected}
              today={today}
              me={me}
              pair={pairView}
              pairVisible={!!pairPin}
              onShow={setSelected}
              onPair={(id) => select([id])}
              onClose={() => select(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// 마커를 누르면 지도 아래에 뜨는 카드. 같은 건물이면 여러 장을 옆으로 넘긴다.
function MapCards({
  views,
  selected,
  today,
  me,
  pair,
  pairVisible,
  onShow,
  onPair,
  onClose,
}: {
  views: PlaceView[];
  selected: string | null;
  today: string;
  me: Me | null;
  pair: PlaceView | undefined;
  pairVisible: boolean;
  onShow: (id: string) => void;
  onPair: (id: string) => void;
  onClose: () => void;
}) {
  const row = useRef<HTMLDivElement>(null);
  const many = views.length > 1;

  // 옆으로 넘기면 보이는 카드를 고른 곳으로 삼는다 (짝 장소 점선이 따라 바뀐다).
  const onScroll = () => {
    const el = row.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    const v = views[Math.min(i, views.length - 1)];
    if (v && v.place.id !== selected) onShow(v.place.id);
  };

  return (
    <div className="map-cards" role="region" aria-label="고른 장소" aria-live="polite">
      <button className="map-card-close icon-btn" aria-label="미리보기 닫기" onClick={onClose}>
        <Icon name="close" size={18} />
      </button>
      <div className="map-cards-row" ref={row} onScroll={many ? onScroll : undefined}>
        {views.map((v, i) => (
          <MapCard
            key={v.place.id}
            view={v}
            today={today}
            me={me}
            pair={v.place.id === selected ? pair : undefined}
            pairVisible={pairVisible}
            onPair={onPair}
            position={many ? `${i + 1}/${views.length}` : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function MapCard({
  view,
  today,
  me,
  pair,
  pairVisible,
  onPair,
  position,
}: {
  view: PlaceView;
  today: string;
  me: Me | null;
  pair: PlaceView | undefined;
  pairVisible: boolean;
  onPair: (id: string) => void;
  position?: string;
}) {
  const { place } = view;
  const { type } = cardTypeOf(view, today);
  const update = view.updates.find((u) => isUpdateActive(u, today));
  const upcoming = !!update && update.start > today;
  const left = update && !upcoming ? daysLeft(update, today) : null;
  const saved = isSaved(place.id);
  const fromMe = me ? formatDistance(distanceM(me, place.geo)) : null;

  return (
    <article className="map-card" aria-label={`${place.name.ko} 미리보기${position ? `, ${position}` : ''}`}>
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
          {position && <span className="map-card-pos">{position}</span>}
        </div>
        <h3 className="place-name">{place.name.ko}</h3>
        <span className="meta">
          {conditionText(update, today)}
          {fromMe && <span className="meta-sep">내 위치에서 {fromMe}</span>}
        </span>
        {pair && (
          <button
            className="map-card-pair"
            onClick={() => (pairVisible ? onPair(pair.place.id) : go(`/p/${pair.place.id}`))}
          >
            근처 한 곳 · {pair.place.name.ko} · {pairDistance(place.geo, pair.place.geo)}
          </button>
        )}
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
    </article>
  );
}

// 짝 장소까지 거리. 같은 건물(30m 미만)이면 그렇게 쓴다. 도보 시간은 출처가 없어 쓰지 않는다.
function pairDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): string {
  const m = distanceM(a, b);
  return m < 30 ? '같은 건물' : `직선 ${formatDistance(m)}`;
}

// 목록 보기 — 지도 이전의 동네별 목록 그대로.
function MapList({ views, onlySaved }: { views: PlaceView[]; onlySaved: boolean }) {
  const hoods = (Object.keys(HOOD_LABEL) as Hood[]).filter((h) => views.some((v) => v.place.hood === h));
  if (onlySaved && views.length === 0) {
    return <p className="map-empty map-empty--list">저장한 곳이 아직 없어요. 발견 탭에서 하트를 눌러 보세요.</p>;
  }
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
