import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { coordKey } from '../lib/geo';
import type { CardType } from '../lib/types';

// 지도 본체 — docs/MAP_PLAN.md. 지도 탭에 들어갈 때만 내려받도록 MapScreen에서 lazy import 한다.
// 타일: 국토지리원 지리원 타일 淡色地図. 실시간으로 읽어 보여 주는 경우 출처 표시만 하면 된다.
// 마커는 이미지 없이 CSS(.map-pin)로 그려 색을 tokens.css의 유형색에서 가져온다.

const TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';
const ATTRIBUTION = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>';
const SHIBUYA: L.LatLngTuple = [35.6617, 139.7041];

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  type: CardType;
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

export default function MapView({ pins, selected, pair, me, onSelect, fitKey, meKey }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinLayer = useRef<L.LayerGroup | null>(null);
  const lineLayer = useRef<L.LayerGroup | null>(null);
  const meLayer = useRef<L.LayerGroup | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  // 지도는 한 번만 만든다.
  useEffect(() => {
    const map = L.map(el.current!, { zoomControl: false, minZoom: 11, maxZoom: 18 }).setView(SHIBUYA, 15);
    L.control.zoom({ position: 'topright', zoomInTitle: '확대', zoomOutTitle: '축소' }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 18, minZoom: 5 }).addTo(map);
    map.on('click', () => selectRef.current(null));
    lineLayer.current = L.layerGroup().addTo(map);
    meLayer.current = L.layerGroup().addTo(map);
    pinLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 마커. 같은 좌표(같은 건물)는 한 마커로 묶고 개수를 단다.
  useEffect(() => {
    const layer = pinLayer.current;
    if (!layer) return;
    layer.clearLayers();
    const groups = new Map<string, Pin[]>();
    for (const p of pins) groups.set(coordKey(p), [...(groups.get(coordKey(p)) ?? []), p]);
    for (const group of groups.values()) {
      const first = group[0];
      const ids = group.map((p) => p.id);
      const isSel = !!selected && ids.includes(selected);
      const isPair = !!pair && ids.includes(pair.id) && !isSel;
      const count = group.length > 1 ? `<span class="map-pin-count">${group.length}</span>` : '';
      const label = group.length > 1 ? `${group.length}곳: ${group.map((p) => p.label).join(' / ')}` : first.label;
      const marker = L.marker([first.lat, first.lng], {
        icon: L.divIcon({
          className: 'map-pin-hit',
          html: `<span class="map-pin map-pin--${first.type}${isSel ? ' selected' : ''}${isPair ? ' paired' : ''}">${count}</span>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        }),
        keyboard: true,
        title: label,
        zIndexOffset: isSel ? 1000 : isPair ? 500 : 0,
        riseOnHover: true,
      });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        selectRef.current(ids);
      });
      marker.addTo(layer);
      const node = marker.getElement();
      node?.setAttribute('aria-label', label);
      node?.setAttribute('aria-pressed', String(isSel));
    }
  }, [pins, selected, pair]);

  // 짝 장소 점선.
  useEffect(() => {
    const layer = lineLayer.current;
    if (!layer) return;
    layer.clearLayers();
    const from = pins.find((p) => p.id === selected);
    if (!from || !pair) return;
    L.polyline(
      [
        [from.lat, from.lng],
        [pair.lat, pair.lng],
      ],
      { className: 'map-pair-line', interactive: false },
    ).addTo(layer);
  }, [pins, selected, pair]);

  // 내 위치: 점 + 정확도 원. 위치는 이 화면에만 두고 저장하지 않는다.
  useEffect(() => {
    const layer = meLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (!me) return;
    L.circle([me.lat, me.lng], { radius: me.accuracy, className: 'map-me-accuracy', interactive: false }).addTo(layer);
    L.marker([me.lat, me.lng], {
      icon: L.divIcon({ className: 'map-me-hit', html: '<span class="map-me"></span>', iconSize: [24, 24], iconAnchor: [12, 12] }),
      interactive: false,
      keyboard: false,
    }).addTo(layer);
  }, [me]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && me && meKey) map.flyTo([me.lat, me.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
    // meKey가 바뀔 때(버튼을 누를 때)만 이동한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meKey]);

  // 동네가 바뀌면 그 동네 마커가 다 보이게 맞춘다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || pins.length === 0) return;
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as L.LatLngTuple));
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 16 });
    // pins는 fitKey와 함께 바뀌므로 fitKey만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return <div ref={el} className="map-canvas" role="region" aria-label="장소 지도" />;
}
