import type { CSSProperties } from 'react';
import { track } from '../lib/analytics';
import type { PlaceView } from '../lib/content';
import { daysLeft, formatDate, isUpdateActive, isUpdateEnded, needsRecheck, type Trip } from '../lib/dates';
import { hrefTo } from '../lib/router';
import { isSaved, toggleSaved, useSaved } from '../lib/storage';
import { type CardType, HOOD_LABEL, TAG_LABEL, TYPE_LABEL } from '../lib/types';

export function cardTypeOf(v: PlaceView, today: string, trip?: Trip): { type: CardType; ended: boolean } {
  const active = v.updates.find((u) => isUpdateActive(u, today, trip));
  if (active) return { type: active.type, ended: false };
  const ended = v.updates.some((u) => isUpdateEnded(u, today));
  return { type: 'editorial', ended: ended && !v.take?.evergreen };
}

interface Props {
  view: PlaceView;
  today: string;
  trip?: Trip;
  pairName?: string;
}

export function PlaceCard({ view, today, trip, pairName }: Props) {
  useSaved();
  const { place, take, check } = view;
  const { type, ended } = cardTypeOf(view, today, trip);
  const update = view.updates.find((u) => isUpdateActive(u, today, trip));
  const upcoming = !!update && update.start > today;
  const left = update && !upcoming ? daysLeft(update, today) : null;
  const saved = isSaved(place.id);
  const recheck = needsRecheck(check, today);

  const condition = !update
    ? '상시'
    : upcoming
      ? update.type === 'new'
        ? `${formatDate(update.start)} 오픈 예정`
        : `${formatDate(update.start)}부터${update.end ? ` ${formatDate(update.end)}까지` : ''}`
      : update.end
        ? `${formatDate(update.end)}까지`
        : update.type === 'new'
          ? `${formatDate(update.start)} 오픈`
          : '상시';

  return (
    <article
      className={`card${ended ? ' ended' : ''}`}
      style={{ '--type-color': `var(--type-${type})` } as CSSProperties}
    >
      <a href={hrefTo(`/p/${place.id}`)} onClick={() => track('place_opened', { placeId: place.id, type })}>
        <div className="img">
          {place.image ? (
            <img src={`/images/${place.image.file}`} alt="" loading="lazy" />
          ) : (
            <span>{HOOD_LABEL[place.hood]}</span>
          )}
        </div>
        <div className="body">
          <div className="row">
            <span className="badge">
              <span className="dot" />
              {TYPE_LABEL[type]}
              {left !== null && left >= 0 && ` D-${left}`}
              {upcoming && ' · 예정'}
              {ended && ' · 종료됨'}
            </span>
            <span className="muted">{HOOD_LABEL[place.hood]}</span>
          </div>
          <div className="name">
            {place.name.ko}
            {place.name.ja && (
              <span className="name-ja ja"> {place.name.ja}</span>
            )}
          </div>
          <div className="line" />
          {take?.pairWith && pairName && <div className="next">다음 → 근처 한 곳: {pairName}</div>}
          <p className="why">{take?.why ?? '추천 이유를 확인 중입니다.'}</p>
          <div className="row">
            <div className="tags">
              {place.tags.map((t) => (
                <span key={t} className="tag">
                  {TAG_LABEL[t]}
                </span>
              ))}
            </div>
            <span className="muted">{condition}</span>
          </div>
        </div>
      </a>
      <div className="body foot row" style={{ paddingTop: 0 }}>
        <span className="muted">
          {check ? `확인 ${check.checkedAt.replace(/-/g, '.')}` : '확인 중'}
          {recheck && (
            <span className="badge recheck" style={{ marginLeft: 8 }}>
              재확인 필요
            </span>
          )}
        </span>
        <button
          className="save"
          aria-pressed={saved}
          onClick={() => {
            const now = toggleSaved(place.id);
            if (now) track('place_saved', { placeId: place.id, from: 'card' });
          }}
        >
          {saved ? '저장됨' : '저장'}
        </button>
      </div>
    </article>
  );
}
