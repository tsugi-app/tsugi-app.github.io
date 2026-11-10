import type { ReactNode } from 'react';
import { SHOW_WORDMARK_ICON } from '../lib/channel';
import { goBack } from '../lib/router';
import { Icon } from './Icon';

// SEED App Bar. 뒤로 가기는 앱 안에서 온 경우 history.back, 링크로 바로 들어온 경우 발견으로.
export function AppBar({ title, back, right }: { title?: ReactNode; back?: boolean; right?: ReactNode }) {
  return (
    <header className={`app-bar${back ? ' with-back' : ''}`}>
      {back && (
        <button className="icon-btn" aria-label="뒤로" onClick={goBack}>
          <Icon name="back" />
        </button>
      )}
      {title ?? (
        <a className="wordmark" href="#/">
          {SHOW_WORDMARK_ICON && <img className="wordmark-icon" src="/icon.svg" alt="" width={28} height={28} />}
          <b>츠기</b>
          <span>다음 일본 여행에 넣을 한 곳</span>
        </a>
      )}
      {right}
    </header>
  );
}
