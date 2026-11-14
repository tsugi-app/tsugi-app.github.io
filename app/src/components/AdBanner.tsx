import { useEffect, useRef, useState } from 'react';
import { type AdSlot, attachAdBanner, SHOW_ADS } from '../lib/channel';

// 토스 채널 인앱 배너. 광고가 실제로 그려진 뒤에만 「광고」 표시와 함께 보이고, 채울 광고가 없으면 자리를 차지하지 않는다.
// 카드와 헷갈리지 않게 위에 「광고」를 단다 (토스애즈 SSP 정책: 광고와 콘텐츠 구분). docs/DESIGN.md §2 광고
export function AdBanner({ slot }: { slot: AdSlot }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'shown' | 'empty'>('loading');

  useEffect(() => {
    if (!ref.current) return;
    return attachAdBanner(
      slot,
      ref.current,
      () => setState('shown'),
      () => setState('empty'),
    );
  }, [slot]);

  if (!SHOW_ADS || state === 'empty') return null;
  return (
    <aside className={`ad-slot${state === 'shown' ? ' is-shown' : ''}`} aria-label="광고">
      {state === 'shown' && <p className="ad-slot-label">광고</p>}
      <div ref={ref} />
    </aside>
  );
}
