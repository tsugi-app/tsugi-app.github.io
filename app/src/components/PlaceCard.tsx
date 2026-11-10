import { track } from '../lib/analytics';
import type { PlaceView } from '../lib/content';
import { needsRecheck, type Trip } from '../lib/dates';
import { hrefTo } from '../lib/router';
import { HOOD_LABEL } from '../lib/types';
import { cardTypeOf, conditionText, SaveButton, Thumb, TypeBadge } from './PlaceParts';

interface Props {
  view: PlaceView;
  today: string;
  trip?: Trip;
  pairName?: string;
}

// 장소 리스트 아이템 — docs/DESIGN.md §2.1
export function PlaceCard({ view, today, trip, pairName }: Props) {
  const { place, take, check } = view;
  const { type, ended, update } = cardTypeOf(view, today, trip);

  return (
    <article className={`place-item${ended ? ' ended' : ''}`}>
      <a
        className="place-item-link"
        href={hrefTo(`/p/${place.id}`)}
        onClick={() => track('place_opened', { placeId: place.id, type })}
        aria-label={`${place.name.ko} 자세히 보기`}
      />
      <Thumb place={place} type={type} variant="list" ended={ended} />
      <div className="place-item-body">
        <div className="place-item-meta-top">
          <TypeBadge type={type} update={update} today={today} ended={ended} />
          {ended && <span className="badge badge--neutral">종료됨</span>}
          {needsRecheck(check, today) && <span className="badge badge--warning">재확인 필요</span>}
          <span>{HOOD_LABEL[place.hood]}</span>
        </div>
        <h3 className="place-name">{place.name.ko}</h3>
        {place.name.ja && <p className="place-name-ja ja">{place.name.ja}</p>}
        <p className="place-why">{take?.why ?? '추천 이유를 확인 중이에요.'}</p>
        {take?.pairWith && pairName && <p className="place-pair">근처 한 곳 · {pairName}</p>}
        <div className="place-item-foot">
          <span className="meta">{conditionText(update, today)}</span>
          <SaveButton place={place} from="card" />
        </div>
      </div>
    </article>
  );
}
