import { type ReactNode, useEffect } from 'react';
import { track } from '../lib/analytics';
import { googleMapsUrl, openExternal } from '../lib/channel';
import { type PlaceView, viewOf } from '../lib/content';
import { daysLeft, formatDate, isUpdateActive, needsRecheck, todayTokyo } from '../lib/dates';
import { hrefTo } from '../lib/router';
import { isSaved, toggleSaved, useSaved } from '../lib/storage';
import { type Content, HOOD_LABEL, TYPE_LABEL } from '../lib/types';

interface Props {
  content: Content;
  id: string;
}

// 상세는 기획안의 6블록 순서를 그대로 따른다. 빈 블록은 숨기지 않고 "확인 중"으로 보인다.
export function Place({ content, id }: Props) {
  useSaved();
  const view = viewOf(content, id);
  useEffect(() => {
    if (view) track('place_opened', { placeId: id, from: 'detail' });
  }, [id, view]);

  if (!view) {
    return (
      <section>
        <a className="back" href={hrefTo('/')}>
          ← 발견
        </a>
        <p className="empty">이 장소의 정보가 아직 없어요.</p>
      </section>
    );
  }
  return <PlaceDetail view={view} content={content} />;
}

function Block({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : <p className="pending">확인 중</p>}
    </>
  );
}

function PlaceDetail({ view, content }: { view: PlaceView; content: Content }) {
  const today = todayTokyo();
  const { place, take, check } = view;
  const active = view.updates.find((u) => isUpdateActive(u, today));
  const pair = take?.pairWith ? content.places.find((p) => p.id === take.pairWith) : undefined;
  const saved = isSaved(place.id);

  const when = active
    ? `${TYPE_LABEL[active.type]} · ${formatDate(active.start)}${active.end ? ` ~ ${formatDate(active.end)}` : ''}${
        active.end ? ` (D-${daysLeft(active, today)})` : ''
      }${active.note ? ` · ${active.note}` : ''}`
    : take?.evergreen
      ? '상시 방문 가능'
      : undefined;

  return (
    <section className="detail">
      <a className="back" href={hrefTo('/')}>
        ← 발견
      </a>
      <div className="row" style={{ marginTop: 12 }}>
        <span className="muted">{HOOD_LABEL[place.hood]}</span>
        {needsRecheck(check, today) && <span className="badge recheck">재확인 필요</span>}
      </div>
      <div className="name">
        {place.name.ko}
        {place.name.ja && <span className="name-ja ja"> {place.name.ja}</span>}
      </div>
      {place.address && <p className="muted ja">{place.address}</p>}

      <Block title="왜 갈까">{take?.why}</Block>
      <Block title="누구에게 맞을까">
        {take && (take.forWhom || take.notFor) && (
          <>
            {take.forWhom}
            {take.notFor && (
              <>
                <br />
                <span className="muted">기대와 다를 수 있는 사람: {take.notFor}</span>
              </>
            )}
          </>
        )}
      </Block>
      <Block title="언제 갈 수 있을까">{when}</Block>
      <Block title="무엇이 다를까">{take?.differsFrom}</Block>
      <Block title="어떻게 끼워 넣을까">
        {pair && (
          <>
            근처 한 곳: <a href={hrefTo(`/p/${pair.id}`)}>{pair.name.ko}</a>
          </>
        )}
      </Block>
      <Block title="무엇을 확인했을까">
        {check && (
          <>
            {check.checkedAt.replace(/-/g, '.')} 확인
            {check.uncertain?.length ? ` · 아직 불확실: ${check.uncertain.join(', ')}` : ''}
            {place.official && (
              <>
                {' · '}
                <a
                  href={place.official}
                  onClick={(e) => {
                    e.preventDefault();
                    track('source_opened', { placeId: place.id });
                    openExternal(place.official!);
                  }}
                >
                  공식 출처
                </a>
              </>
            )}
          </>
        )}
      </Block>

      <div className="actions">
        <button
          className="btn primary"
          onClick={() => {
            const now = toggleSaved(place.id);
            if (now) track('place_saved', { placeId: place.id, from: 'detail' });
          }}
        >
          {saved ? '저장됨' : '저장'}
        </button>
        <button
          className="btn"
          onClick={() => {
            track('map_opened', { placeId: place.id, from: 'detail' });
            openExternal(googleMapsUrl(place.geo.lat, place.geo.lng, place.name.ja ?? place.name.ko));
          }}
        >
          지도 열기
        </button>
      </div>
    </section>
  );
}
