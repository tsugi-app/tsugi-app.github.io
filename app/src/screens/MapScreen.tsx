import { AppBar } from '../components/AppBar';
import { Icon } from '../components/Icon';
import { Thumb } from '../components/PlaceParts';
import { track } from '../lib/analytics';
import { googleMapsUrl, openExternal } from '../lib/channel';
import { hrefTo } from '../lib/router';
import { type Content, HOOD_LABEL, type Hood, TAG_LABEL } from '../lib/types';

// 지도는 docs/MAP_PLAN.md대로 Leaflet + 국토지리원 타일로 바꾼다. 그 전까지는 동네별 목록 + 외부 지도 열기.
export function MapScreen({ content }: { content: Content }) {
  const hoods = (Object.keys(HOOD_LABEL) as Hood[]).filter((h) => content.places.some((p) => p.hood === h));
  return (
    <>
      <AppBar title={<h1 className="app-bar-title">지도</h1>} />
      <div className="callout">
        <Icon name="info" size={20} />
        <p className="callout-body">지도 화면은 준비 중이에요. 지금은 동네별 목록에서 구글 지도로 바로 열 수 있어요.</p>
      </div>
      {hoods.map((h) => {
        const places = content.places.filter((p) => p.hood === h);
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
