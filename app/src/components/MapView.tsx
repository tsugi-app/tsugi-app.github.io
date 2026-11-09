import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
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

interface Props {
  pins: Pin[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  // 이 값이 바뀌면 보이는 마커가 모두 들어오게 지도를 맞춘다 (동네 칩을 바꿀 때).
  fitKey: string;
}

export default function MapView({ pins, selected, onSelect, fitKey }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  // 지도는 한 번만 만든다.
  useEffect(() => {
    const map = L.map(el.current!, { zoomControl: false, minZoom: 11, maxZoom: 18 }).setView(SHIBUYA, 15);
    L.control.zoom({ position: 'topright', zoomInTitle: '확대', zoomOutTitle: '축소' }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 18, minZoom: 5 }).addTo(map);
    map.on('click', () => selectRef.current(null));
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 마커. 같은 건물(같은 좌표)에 여러 곳이 있으면 옆으로 조금씩 벌려 각각 누를 수 있게 한다.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const seen = new Map<string, number>();
    for (const p of pins) {
      const key = `${p.lat},${p.lng}`;
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      const shift = n === 0 ? 0 : (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 20;
      const isSel = p.id === selected;
      const marker = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: 'map-pin-hit',
          html: `<span class="map-pin map-pin--${p.type}${isSel ? ' selected' : ''}"></span>`,
          iconSize: [44, 44],
          iconAnchor: [22 - shift, 22],
        }),
        keyboard: true,
        title: p.label,
        zIndexOffset: isSel ? 1000 : 0,
        riseOnHover: true,
      });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        selectRef.current(p.id);
      });
      marker.addTo(layer);
      const node = marker.getElement();
      node?.setAttribute('aria-label', p.label);
      node?.setAttribute('aria-pressed', String(isSel));
    }
  }, [pins, selected]);

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
