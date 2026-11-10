import type { CSSProperties } from 'react';
import { track } from '../lib/analytics';
import type { PlaceView } from '../lib/content';
import { activeUpdate, daysLeft, formatDate, isUpdateEnded, type Trip } from '../lib/dates';
import { toggleSaved, useSaved } from '../lib/storage';
import { type CardType, HOOD_LABEL, type Place, TAG_LABEL, TYPE_LABEL, type Update } from '../lib/types';
import { Icon } from './Icon';
import { showSnackbar } from './Snackbar';

// 유형(노선색)을 CSS 변수로 주입한다. 색 값은 tokens.css의 --color-type-*에만 있다.
export function typeVars(type: CardType | 'neutral'): CSSProperties {
  if (type === 'neutral') return {};
  return {
    '--type-fg': `var(--color-type-${type}-fg)`,
    '--type-bg': `var(--color-type-${type}-bg)`,
  } as CSSProperties;
}

// 카드에 보일 유형과 소식 하나. 살아 있는 소식이 없으면 편집 추천이고,
// 끝난 소식만 남았는데 상시 영업(evergreen)도 아니면 ended — 피드·지도에서 뺀다.
export function cardTypeOf(v: PlaceView, today: string, trip?: Trip): { type: CardType; ended: boolean; update?: Update } {
  const update = activeUpdate(v.updates, today, trip);
  if (update) return { type: update.type, ended: false, update };
  const ended = v.updates.some((u) => isUpdateEnded(u, today));
  return { type: 'editorial', ended: ended && !v.take?.evergreen };
}

// 카드 아래 줄의 "언제" 문구. 발견 카드와 지도 미리보기 카드가 같이 쓴다.
export function conditionText(update: Update | undefined, today: string): string {
  if (!update) return '상시';
  const start = formatDate(update.start);
  if (update.start > today)
    return update.type === 'new' ? `${start} 오픈 예정` : `${start}부터${update.end ? ` ${formatDate(update.end)}까지` : ''}`;
  if (update.end) return `${formatDate(update.end)}까지`;
  return update.type === 'new' ? `${start} 오픈` : '상시';
}

export function dday(n: number): string {
  return n === 0 ? 'D-DAY' : `D-${n}`;
}

// 유형 배지 + 남은 날(D-n) 또는 "예정". 발견 카드와 지도 미리보기 카드가 같이 쓴다.
export function TypeBadge({ type, update, today, ended = false }: { type: CardType; update?: Update; today: string; ended?: boolean }) {
  const upcoming = !!update && update.start > today;
  const left = update && !upcoming ? daysLeft(update, today) : null;
  return (
    <span className="badge" style={typeVars(ended ? 'neutral' : type)}>
      {TYPE_LABEL[type]}
      {left !== null && left >= 0 && ` ${dday(left)}`}
      {upcoming && ' · 예정'}
    </span>
  );
}

// 하트 저장 버튼. 저장하면 분석 이벤트를 남기고 스낵바로 알린다.
export function SaveButton({ place, from, size }: { place: Place; from: 'card' | 'map' | 'detail'; size?: number }) {
  const saved = useSaved().some((s) => s.placeId === place.id);
  // 상세는 화면 제목이 장소 이름이라 버튼 이름에 다시 넣지 않는다.
  const name = from === 'detail' ? '' : `${place.name.ko} `;
  return (
    <button
      className="icon-btn heart"
      aria-pressed={saved}
      aria-label={`${name}${saved ? '저장 취소' : '저장'}`}
      onClick={() => {
        const now = toggleSaved(place.id);
        if (now) track('place_saved', { placeId: place.id, from });
        showSnackbar(now ? '저장했어요. 저장 탭에서 볼 수 있어요.' : '저장에서 뺐어요.');
      }}
    >
      <Icon name={saved ? 'heartFill' : 'heart'} size={size} />
    </button>
  );
}

// SEED Image Frame. 사진이 없으면 유형 톤 바탕 + 취향 아이콘으로 자리를 채운다.
export function Thumb({
  place,
  type,
  variant,
  ended = false,
}: {
  place: Place;
  type: CardType | 'neutral';
  variant: 'list' | 'hero' | 'mini';
  ended?: boolean;
}) {
  const tag = place.tags[0];
  const cls = `thumb thumb--${variant}${place.image ? '' : ' is-placeholder'}${ended ? ' ended' : ''}`;
  return (
    <div className={cls} style={typeVars(ended ? 'neutral' : type)}>
      {place.image ? (
        <img src={`/images/${place.image.file}`} alt="" loading="lazy" />
      ) : (
        <>
          {/* 취향 이름이 곧 아이콘 이름이다 (Icon.tsx) */}
          <Icon name={tag ?? 'place'} size={variant === 'hero' ? 40 : variant === 'mini' ? 22 : 28} />
          {variant !== 'mini' && (
            <span className="thumb-label">{variant !== 'hero' && tag ? TAG_LABEL[tag] : HOOD_LABEL[place.hood]}</span>
          )}
        </>
      )}
    </div>
  );
}
