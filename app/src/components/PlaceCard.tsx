import { track } from '../lib/analytics';
import type { PlaceView } from '../lib/content';
import { activeUpdate, daysLeft, formatDate, isUpdateEnded, needsRecheck, type Trip } from '../lib/dates';
import { hrefTo } from '../lib/router';
import { isSaved, toggleSaved, useSaved } from '../lib/storage';
import { type CardType, HOOD_LABEL, TYPE_LABEL, type Update } from '../lib/types';
import { Icon } from './Icon';
import { dday, Thumb, typeVars } from './PlaceParts';
import { showSnackbar } from './Snackbar';

export function cardTypeOf(v: PlaceView, today: string, trip?: Trip): { type: CardType; ended: boolean } {
  const active = activeUpdate(v.updates, today, trip);
  if (active) return { type: active.type, ended: false };
  const ended = v.updates.some((u) => isUpdateEnded(u, today));
  return { type: 'editorial', ended: ended && !v.take?.evergreen };
}

// 카드 아래 줄의 "언제" 문구. 발견 카드와 지도 미리보기 카드가 같이 쓴다.
export function conditionText(update: Update | undefined, today: string): string {
  if (!update) return '상시';
  if (update.start > today)
    return update.type === 'new'
      ? `${formatDate(update.start)} 오픈 예정`
      : `${formatDate(update.start)}부터${update.end ? ` ${formatDate(update.end)}까지` : ''}`;
  if (update.end) return `${formatDate(update.end)}까지`;
  return update.type === 'new' ? `${formatDate(update.start)} 오픈` : '상시';
}

interface Props {
  view: PlaceView;
  today: string;
  trip?: Trip;
  pairName?: string;
}

// 장소 리스트 아이템 — docs/DESIGN.md §2.1
export function PlaceCard({ view, today, trip, pairName }: Props) {
  useSaved();
  const { place, take, check } = view;
  const { type, ended } = cardTypeOf(view, today, trip);
  const update = activeUpdate(view.updates, today, trip);
  const upcoming = !!update && update.start > today;
  const left = update && !upcoming ? daysLeft(update, today) : null;
  const saved = isSaved(place.id);
  const recheck = needsRecheck(check, today);

  const condition = conditionText(update, today);

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
          <span className="badge" style={typeVars(ended ? 'neutral' : type)}>
            {TYPE_LABEL[type]}
            {left !== null && left >= 0 && ` ${dday(left)}`}
            {upcoming && ' · 예정'}
          </span>
          {ended && <span className="badge badge--neutral">종료됨</span>}
          {recheck && <span className="badge badge--warning">재확인 필요</span>}
          <span>{HOOD_LABEL[place.hood]}</span>
        </div>
        <h3 className="place-name">{place.name.ko}</h3>
        {place.name.ja && <p className="place-name-ja ja">{place.name.ja}</p>}
        <p className="place-why">{take?.why ?? '추천 이유를 확인 중이에요.'}</p>
        {take?.pairWith && pairName && <p className="place-pair">근처 한 곳 · {pairName}</p>}
        <div className="place-item-foot">
          <span className="meta">{condition}</span>
          <button
            className="icon-btn heart"
            aria-pressed={saved}
            aria-label={saved ? `${place.name.ko} 저장 취소` : `${place.name.ko} 저장`}
            onClick={() => {
              const now = toggleSaved(place.id);
              if (now) track('place_saved', { placeId: place.id, from: 'card' });
              showSnackbar(now ? '저장했어요. 저장 탭에서 볼 수 있어요.' : '저장에서 뺐어요.');
            }}
          >
            <Icon name={saved ? 'heartFill' : 'heart'} />
          </button>
        </div>
      </div>
    </article>
  );
}
