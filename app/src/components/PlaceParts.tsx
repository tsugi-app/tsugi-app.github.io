import type { CSSProperties } from 'react';
import { type CardType, HOOD_LABEL, type Place, TAG_LABEL } from '../lib/types';
import { Icon, type IconName } from './Icon';

// 유형(노선색)을 CSS 변수로 주입한다. 색 값은 tokens.css의 --color-type-*에만 있다.
export function typeVars(type: CardType | 'neutral'): CSSProperties {
  if (type === 'neutral') return {};
  return {
    '--type-fg': `var(--color-type-${type}-fg)`,
    '--type-bg': `var(--color-type-${type}-bg)`,
  } as CSSProperties;
}

const TAG_ICON: Record<string, IconName> = { cafe: 'cafe', design: 'design', goods: 'goods', walk: 'walk' };

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
          <Icon name={tag ? TAG_ICON[tag] : 'place'} size={variant === 'hero' ? 40 : variant === 'mini' ? 22 : 28} />
          {variant !== 'mini' && (
            <span className="thumb-label">
              {variant === 'hero' ? HOOD_LABEL[place.hood] : tag ? TAG_LABEL[tag] : HOOD_LABEL[place.hood]}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function dday(n: number): string {
  return n === 0 ? 'D-DAY' : `D-${n}`;
}
