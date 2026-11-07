import { track } from '../lib/analytics';
import { googleMapsUrl, openExternal } from '../lib/channel';
import { hrefTo } from '../lib/router';
import { type Content, HOOD_LABEL } from '../lib/types';

// D6에 Leaflet + OSM 타일로 교체한다. 그 전까지는 동네별 목록 + 외부 지도 열기.
export function MapScreen({ content }: { content: Content }) {
  return (
    <section>
      <p className="muted">지도 타일은 준비 중입니다. 지금은 동네별 목록에서 바로 지도를 열 수 있어요.</p>
      <ul className="list-plain">
        {content.places.map((p) => (
          <li key={p.id} className="row">
            <a href={hrefTo(`/p/${p.id}`)}>
              <span className="muted">{HOOD_LABEL[p.hood]} · </span>
              {p.name.ko}
            </a>
            <button
              className="muted"
              onClick={() => {
                track('map_opened', { placeId: p.id, from: 'map' });
                openExternal(googleMapsUrl(p.geo.lat, p.geo.lng, p.name.ja ?? p.name.ko));
              }}
            >
              지도 열기
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
