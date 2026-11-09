import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { openExternal } from '../lib/channel';
import { coordKey } from '../lib/geo';
import type { CardType } from '../lib/types';

// 지도 본체 — docs/MAP_PLAN.md. 지도 탭에 들어갈 때만 내려받도록 MapScreen에서 lazy import 한다.
// 지도: OpenFreeMap(OpenStreetMap 데이터) Positron 스타일, MapLibre로 그린다.
//   상업 이용 가능, 무료, 키·조회 한도 없음, 출처 표시 필요(MapLibre가 자동으로 단다).
// 마커는 HTML(.map-pin)로 그려 색을 tokens.css의 유형색에서 가져온다.

const STYLE = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' };
const SHIBUYA: [number, number] = [139.7041, 35.6617];
const LABEL_MIN_ZOOM = 14;
// 지도 글자는 한국어 이름이 있으면 한국어, 없으면 일본어·원래 이름.
const KO_TEXT = ['coalesce', ['get', 'name:ko'], ['get', 'name:ja'], ['get', 'name']] as unknown as maplibregl.ExpressionSpecification;

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  type: CardType;
  // 지도 위 이름 라벨(한국어 이름)
  name: string;
  // 스크린리더용 "이름, 유형"
  label: string;
}

export interface Me {
  lat: number;
  lng: number;
  accuracy: number;
}

interface Props {
  pins: Pin[];
  selected: string | null;
  // 고른 곳의 짝 장소(take.pairWith). 있으면 점선으로 잇는다.
  pair: Pin | null;
  me: Me | null;
  // 같은 좌표에 여러 곳이 있으면 한 마커로 묶고, 누르면 그 묶음의 id 전부를 넘긴다.
  onSelect: (ids: string[] | null) => void;
  // 이 값이 바뀌면 보이는 마커가 모두 들어오게 지도를 맞춘다 (동네 칩을 바꿀 때).
  fitKey: string;
  // 이 값이 바뀌면 내 위치로 이동한다.
  meKey: number;
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const isDark = () => document.documentElement.dataset.theme === 'dark';
// 색은 tokens.css의 시맨틱 토큰을 그대로 읽는다 (컴포넌트에 색 코드를 쓰지 않는다).
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// 라벨이 다른 라벨·마커·지도 버튼·카드와 겹치면 오른쪽 → 왼쪽 순서로 자리를 바꿔 보고, 둘 다 겹치면 숨긴다.
// 고른 곳 → 기간 한정·새로 오픈·최근 변화 → 편집 추천 순서로 먼저 자리를 준다.
const PRIORITY: Record<CardType, number> = { limited: 0, new: 1, changed: 2, editorial: 3 };

function layoutLabels(zoom: number, container: HTMLElement) {
  const hits = [...container.querySelectorAll<HTMLElement>('.map-pin-hit')];
  const show = zoom >= LABEL_MIN_ZOOM;
  const box = container.getBoundingClientRect();
  const taken: DOMRect[] = hits.map((h) => h.querySelector('.map-pin')!.getBoundingClientRect());
  const wrap = container.parentElement ?? container;
  for (const c of wrap.querySelectorAll<HTMLElement>('.maplibregl-ctrl, .map-locate, .map-cards, .map-empty')) {
    taken.push(c.getBoundingClientRect());
  }
  const overlaps = (r: DOMRect) =>
    r.left < box.left ||
    r.right > box.right ||
    r.top < box.top ||
    r.bottom > box.bottom ||
    taken.some((t) => r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top);
  const order = hits
    .map((h) => ({ h, sel: h.getAttribute('aria-pressed') === 'true', pr: Number(h.dataset.priority ?? 9) }))
    .sort((a, b) => Number(b.sel) - Number(a.sel) || a.pr - b.pr);
  for (const { h, sel } of order) {
    const label = h.querySelector<HTMLElement>('.map-pin-label');
    if (!label) continue;
    label.classList.remove('is-left', 'is-hidden');
    if (!show && !sel) {
      label.classList.add('is-hidden');
      continue;
    }
    let r = label.getBoundingClientRect();
    if (overlaps(r)) {
      label.classList.add('is-left');
      r = label.getBoundingClientRect();
      if (overlaps(r)) {
        label.classList.remove('is-left');
        label.classList.add('is-hidden');
        continue;
      }
    }
    taken.push(r);
  }
}

// 정확도 원(m)을 지도 위 다각형으로. 줌이 바뀌어도 실제 반경을 따른다.
function circle(lng: number, lat: number, m: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const pts: [number, number][] = [];
  const dLat = m / 111_320;
  const dLng = m / (111_320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    pts.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [pts] } };
}

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

export default function MapView({ pins, selected, pair, me, onSelect, fitKey, meKey }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const meMarker = useRef<maplibregl.Marker | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  // 스타일을 바꾸면(다크 모드) 직접 얹은 선·원이 사라지므로 마지막 값을 들고 있다가 다시 얹는다.
  const overlay = useRef<{ line: GeoJSON.FeatureCollection; acc: GeoJSON.FeatureCollection }>({ line: EMPTY, acc: EMPTY });

  const relayout = () => {
    const map = mapRef.current;
    if (map && el.current) layoutLabels(map.getZoom(), el.current);
  };

  // 스타일이 (다시) 로드될 때마다: 한국어 라벨, 짝 장소 점선, 내 위치 정확도 원.
  const onStyle = (map: maplibregl.Map) => {
    for (const layer of map.getStyle().layers ?? []) {
      if (layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout) {
        map.setLayoutProperty(layer.id, 'text-field', KO_TEXT);
      }
    }
    const brand = token('--color-fg-brand');
    const ring = token('--color-stroke-focus-ring');
    if (!map.getSource('acc')) map.addSource('acc', { type: 'geojson', data: overlay.current.acc });
    if (!map.getLayer('acc-fill'))
      map.addLayer({ id: 'acc-fill', type: 'fill', source: 'acc', paint: { 'fill-color': ring, 'fill-opacity': 0.12 } });
    if (!map.getLayer('acc-line'))
      map.addLayer({ id: 'acc-line', type: 'line', source: 'acc', paint: { 'line-color': ring, 'line-width': 1 } });
    if (!map.getSource('pair')) map.addSource('pair', { type: 'geojson', data: overlay.current.line });
    if (!map.getLayer('pair-line'))
      map.addLayer({
        id: 'pair-line',
        type: 'line',
        source: 'pair',
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': brand, 'line-width': 3, 'line-dasharray': [2, 2] },
      });
  };

  // 지도는 한 번만 만든다. 회전·기울이기는 끈다(여행 중 한 손 조작에서 헷갈린다).
  useEffect(() => {
    const container = el.current!;
    const map = new maplibregl.Map({
      container,
      style: isDark() ? STYLE.dark : STYLE.light,
      center: SHIBUYA,
      zoom: 15,
      minZoom: 11,
      maxZoom: 18,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('style.load', () => onStyle(map));
    map.on('click', () => selectRef.current(null));
    map.on('moveend', relayout);
    map.on('resize', relayout);
    // 출처 링크도 다른 바깥 링크처럼 openExternal로 연다 (토스 WebView에서 target=_blank가 막힐 수 있다).
    const onAttr = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('.maplibregl-ctrl-attrib a') as HTMLAnchorElement | null;
      if (!a) return;
      e.preventDefault();
      openExternal(a.href);
    };
    container.addEventListener('click', onAttr);
    // 다크 모드를 바꾸면 지도 스타일도 바꾼다.
    // diff: false여야 style.load가 다시 불려 한국어 라벨·점선·원을 다시 얹는다.
    const obs = new MutationObserver(() => map.setStyle(isDark() ? STYLE.dark : STYLE.light, { diff: false }));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    mapRef.current = map;
    return () => {
      obs.disconnect();
      container.removeEventListener('click', onAttr);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 마커. 같은 좌표(같은 건물)는 한 마커로 묶고 개수를 단다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // 마커를 다시 그리면 키보드 포커스가 사라지므로, 포커스가 있던 마커를 기억했다가 되돌린다.
    const focusedKey = (document.activeElement as HTMLElement | null)?.dataset?.pinKey;
    for (const m of markers.current) m.remove();
    markers.current = [];
    const groups = new Map<string, Pin[]>();
    for (const p of pins) groups.set(coordKey(p), [...(groups.get(coordKey(p)) ?? []), p]);
    for (const group of groups.values()) {
      const first = group[0];
      const ids = group.map((p) => p.id);
      const isSel = !!selected && ids.includes(selected);
      const isPair = !!pair && ids.includes(pair.id) && !isSel;
      const count = group.length > 1 ? `<span class="map-pin-count">${group.length}</span>` : '';
      // 같은 건물이면 "첫 곳 이름 +1". 이름만 말줄임하고 개수는 남긴다.
      const more = group.length > 1 ? `<span class="map-pin-label-more">+${group.length - 1}</span>` : '';
      const label = group.length > 1 ? `${group.length}곳: ${group.map((p) => p.label).join(' / ')}` : first.label;

      const node = document.createElement('div');
      node.className = 'map-pin-hit';
      node.tabIndex = 0;
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', label);
      node.setAttribute('aria-pressed', String(isSel));
      node.title = label;
      node.dataset.pinKey = coordKey(first);
      node.dataset.priority = String(Math.min(...group.map((p) => PRIORITY[p.type])));
      node.style.zIndex = isSel ? '3' : isPair ? '2' : '1';
      node.innerHTML =
        `<span class="map-pin map-pin--${first.type}${isSel ? ' selected' : ''}${isPair ? ' paired' : ''}">${count}</span>` +
        `<span class="map-pin-label${isSel ? ' selected' : ''}" aria-hidden="true"><span class="map-pin-label-name">${esc(first.name)}</span>${more}</span>`;
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        selectRef.current(ids);
      });
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectRef.current(ids);
        }
      });
      markers.current.push(new maplibregl.Marker({ element: node, anchor: 'center' }).setLngLat([first.lng, first.lat]).addTo(map));
      // MapLibre가 마커를 만들 때 aria-label을 "Map marker"로 덮어써서 다시 단다.
      node.setAttribute('aria-label', label);
      node.setAttribute('role', 'button');
      if (focusedKey && focusedKey === coordKey(first)) node.focus({ preventScroll: true });
    }
    const id = requestAnimationFrame(relayout);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, selected, pair]);

  // 고른 곳이 화면 밖이면(짝 장소로 넘어갈 때 등) 그쪽으로 옮긴다. 아래 카드에 가리지 않게 위로 조금 띄운다.
  useEffect(() => {
    const map = mapRef.current;
    const p = pins.find((x) => x.id === selected);
    if (!map || !p) return;
    const pt = map.project([p.lng, p.lat]);
    const { clientWidth: w, clientHeight: h } = map.getContainer();
    if (pt.x < 24 || pt.x > w - 24 || pt.y < 24 || pt.y > h - 160) {
      map.easeTo({ center: [p.lng, p.lat], offset: [0, -60], duration: 400 });
    }
    // 고른 곳이 바뀔 때만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // 짝 장소 점선.
  useEffect(() => {
    const from = pins.find((p) => p.id === selected);
    overlay.current.line =
      from && pair
        ? {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [from.lng, from.lat],
                    [pair.lng, pair.lat],
                  ],
                },
              },
            ],
          }
        : EMPTY;
    (mapRef.current?.getSource('pair') as maplibregl.GeoJSONSource | undefined)?.setData(overlay.current.line);
  }, [pins, selected, pair]);

  // 내 위치: 점 + 정확도 원. 위치는 이 화면에만 두고 저장하지 않는다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    meMarker.current?.remove();
    meMarker.current = null;
    overlay.current.acc = me ? { type: 'FeatureCollection', features: [circle(me.lng, me.lat, me.accuracy)] } : EMPTY;
    (map.getSource('acc') as maplibregl.GeoJSONSource | undefined)?.setData(overlay.current.acc);
    if (!me) return;
    const dot = document.createElement('div');
    dot.className = 'map-me-hit';
    dot.innerHTML = '<span class="map-me"></span>';
    meMarker.current = new maplibregl.Marker({ element: dot, anchor: 'center' }).setLngLat([me.lng, me.lat]).addTo(map);
    dot.setAttribute('aria-label', '내 위치');
  }, [me]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && me && meKey) map.flyTo({ center: [me.lng, me.lat], zoom: Math.max(map.getZoom(), 16), duration: 600 });
    // meKey가 바뀔 때(버튼을 누를 때)만 이동한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meKey]);

  // 동네가 바뀌면 그 동네 마커가 다 보이게 맞춘다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || pins.length === 0) return;
    const b = new maplibregl.LngLatBounds();
    for (const p of pins) b.extend([p.lng, p.lat]);
    map.fitBounds(b, { padding: 56, maxZoom: 16, duration: 0 });
    // pins는 fitKey와 함께 바뀌므로 fitKey만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return <div ref={el} className="map-canvas" role="region" aria-label="장소 지도" aria-describedby="map-hint" />;
}
