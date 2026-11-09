import { type ReactNode, useEffect } from 'react';
import { AppBar } from '../components/AppBar';
import { Icon } from '../components/Icon';
import { cardTypeOf } from '../components/PlaceCard';
import { dday, Thumb, typeVars } from '../components/PlaceParts';
import { showSnackbar } from '../components/Snackbar';
import { track } from '../lib/analytics';
import { googleMapsUrl, openExternal, sharePageUrl, shareOrCopy } from '../lib/channel';
import { type PlaceView, viewOf } from '../lib/content';
import { daysLeft, formatDate, isUpdateActive, needsRecheck, todayTokyo } from '../lib/dates';
import { hrefTo } from '../lib/router';
import { isSaved, toggleSaved, useSaved } from '../lib/storage';
import { type Content, HOOD_LABEL, TAG_LABEL, TYPE_LABEL, type Update } from '../lib/types';

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
      <>
        <AppBar back title={<h1 className="app-bar-title">장소</h1>} />
        <div className="empty">
          <Icon name="place" size={48} />
          <p>이 장소의 정보가 아직 없어요.</p>
          <a className="btn btn--neutral-weak" href={hrefTo('/')}>
            다른 곳 둘러보기
          </a>
        </div>
      </>
    );
  }
  return <PlaceDetail view={view} content={content} />;
}

function Block({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="block">
      <h2 className="block-title">{title}</h2>
      {children ? <div className="block-body">{children}</div> : <p className="block-body pending">확인 중</p>}
    </section>
  );
}

function PlaceDetail({ view, content }: { view: PlaceView; content: Content }) {
  const today = todayTokyo();
  const { place, take, check } = view;
  const { type } = cardTypeOf(view, today);
  // 끝나지 않은 소식을 시작일 순으로 모두 보여 준다 (예: 지금 전시 + 다음 전시).
  const current = view.updates.filter((u) => isUpdateActive(u, today)).sort((a, b) => a.start.localeCompare(b.start));
  const pair = take?.pairWith ? content.places.find((p) => p.id === take.pairWith) : undefined;
  const saved = isSaved(place.id);

  const share = async () => {
    showSnackbar(await shareOrCopy(sharePageUrl(`/p/${place.id}/`), `${place.name.ko} — 츠기`));
  };

  const status = (u: Update) => {
    if (u.start > today) return '시작 전';
    const n = daysLeft(u, today);
    return n === null ? null : dday(n);
  };

  const when =
    current.length > 0 ? (
      <>
        <ul className="when-list">
          {current.map((u) => (
            <li key={u.id}>
              <span className="badge" style={typeVars(u.type)}>
                {TYPE_LABEL[u.type]}
                {status(u) && ` ${status(u)}`}
              </span>
              <span>
                {formatDate(u.start)}
                {u.end ? ` ~ ${formatDate(u.end)}` : ''}
              </span>
              {u.note && <span className="when-note">{u.note}</span>}
            </li>
          ))}
        </ul>
        {take?.evergreen && <p className="block-note">소식이 끝난 뒤에도 갈 수 있어요.</p>}
      </>
    ) : take?.evergreen ? (
      '상시 방문할 수 있어요.'
    ) : undefined;

  return (
    <>
      <AppBar
        back
        title={<h1 className="app-bar-title">{place.name.ko}</h1>}
        right={
          <button className="icon-btn" aria-label="공유" onClick={share}>
            <Icon name="share" />
          </button>
        }
      />
      <article>
        <Thumb place={place} type={type} variant="hero" />
        <header className="detail-head">
          <div className="badges">
            <span className="badge" style={typeVars(type)}>
              {TYPE_LABEL[type]}
            </span>
            {needsRecheck(check, today) && <span className="badge badge--warning">재확인 필요</span>}
            <span className="meta">
              {HOOD_LABEL[place.hood]}
              {place.tags.map((t) => (
                <span key={t} className="meta-sep">
                  {TAG_LABEL[t]}
                </span>
              ))}
            </span>
          </div>
          <h2 className="detail-name">{place.name.ko}</h2>
          {(place.name.ja || place.address) && (
            <p className="detail-sub ja">
              {place.name.ja}
              {place.name.ja && place.address && <br />}
              {place.address}
            </p>
          )}
        </header>

        <Block title="왜 갈까">{take?.why}</Block>
        <Block title="누구에게 맞을까">
          {take && (take.forWhom || take.notFor) && (
            <>
              {take.forWhom}
              {take.notFor && <p className="block-note">기대와 다를 수 있는 사람 · {take.notFor}</p>}
            </>
          )}
        </Block>
        <Block title="언제 갈 수 있을까">{when}</Block>
        <Block title="무엇이 다를까">{take?.differsFrom}</Block>
        <Block title="어떻게 끼워 넣을까">
          {pair && (
            <a className="pair-link" href={hrefTo(`/p/${pair.id}`)}>
              <Thumb place={pair} type="editorial" variant="mini" />
              <span className="pair-link-text">
                <span className="meta">근처 한 곳 · {HOOD_LABEL[pair.hood]}</span>
                <b>{pair.name.ko}</b>
              </span>
              <Icon name="forward" size={20} />
            </a>
          )}
        </Block>
        <Block title="무엇을 확인했을까">
          {check && (
            <>
              {check.checkedAt.replace(/-/g, '.')}에 확인했어요.
              {check.uncertain?.length ? <p className="block-note">아직 불확실 · {check.uncertain.join(', ')}</p> : null}
              {place.official && (
                <p className="block-note">
                  <a
                    className="link"
                    href={place.official}
                    onClick={(e) => {
                      e.preventDefault();
                      track('source_opened', { placeId: place.id });
                      openExternal(place.official!);
                    }}
                  >
                    공식 출처 보기
                  </a>
                </p>
              )}
            </>
          )}
        </Block>
      </article>

      <div className="action-bar">
        <div className="action-bar-inner">
          <button
            className="icon-btn heart"
            aria-pressed={saved}
            aria-label={saved ? '저장 취소' : '저장'}
            onClick={() => {
              const now = toggleSaved(place.id);
              if (now) track('place_saved', { placeId: place.id, from: 'detail' });
              showSnackbar(now ? '저장했어요. 저장 탭에서 볼 수 있어요.' : '저장에서 뺐어요.');
            }}
          >
            <Icon name={saved ? 'heartFill' : 'heart'} size={26} />
          </button>
          <span className="action-bar-sep" aria-hidden />
          <button
            className="btn btn--lg btn--brand-solid btn--grow"
            onClick={() => {
              track('map_opened', { placeId: place.id, from: 'detail' });
              openExternal(googleMapsUrl(place));
            }}
          >
            <Icon name="pin" size={20} />
            지도에서 열기
          </button>
        </div>
      </div>
    </>
  );
}
