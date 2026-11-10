import { CHANNEL } from './channel';
import { getAnalyticsOff } from './storage';

// 기획안의 최소 이벤트 6개. 다른 곳에서 직접 분석 SDK를 부르지 않는다.
export type EventName =
  | 'discovery_viewed'
  | 'place_opened'
  | 'place_saved'
  | 'map_opened'
  | 'source_opened'
  | 'saved_list_revisited';

type Params = Record<string, string | number | boolean | undefined>;

const OPERATOR_FLAG = 'tsugi:operator';

export function isOperator(): boolean {
  try {
    return localStorage.getItem(OPERATOR_FLAG) === '1';
  } catch {
    return false;
  }
}

// 웹 채널은 PostHog Cloud로 보낸다. 라이브러리 없이 수집 API에 직접 POST한다.
// 프로젝트 키는 쓰기 전용 공개 키라 번들에 실려도 된다. 비어 있으면 아무것도 보내지 않는다.
// 리전을 바꾸면 screens/Privacy.tsx의 국외 이전 문구도 같이 고친다.
const POSTHOG_KEY = '';
const POSTHOG_HOST = 'https://us.i.posthog.com';
const ANON_ID = 'tsugi:aid';

// 통계를 실제로 보내는 채널인지. 설정의 「이용 통계」 항목을 보일지 정한다.
// TODO(D8): 토스는 앱인토스 SDK 이벤트로 연결.
export const ANALYTICS_ENABLED = CHANNEL === 'web' && POSTHOG_KEY !== '';

// 기기에서 만든 무작위 ID. 이름·연락처와 이어지지 않는다. 저장이 막혀 있으면 이번 방문에만 쓴다.
let anonId: string | null = null;
function anonymousId(): string {
  if (anonId) return anonId;
  try {
    anonId = localStorage.getItem(ANON_ID);
    if (!anonId) {
      anonId = crypto.randomUUID();
      localStorage.setItem(ANON_ID, anonId);
    }
  } catch {
    anonId = anonId ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  return anonId;
}

// 들어오기 전 사이트의 도메인만 보낸다 (전체 주소는 보내지 않는다).
function referrerHost(): string | undefined {
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : '';
    return host && host !== window.location.hostname ? host : undefined;
  } catch {
    return undefined;
  }
}

export function track(name: EventName, params: Params = {}): void {
  if (isOperator()) return;
  const payload = { ...params, channel: CHANNEL, campaign: campaignFromUrl() };
  if (import.meta.env.DEV) {
    console.debug('[track]', name, payload);
    return;
  }
  if (!ANALYTICS_ENABLED || getAnalyticsOff()) return;
  try {
    void fetch(`${POSTHOG_HOST}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: name,
        distinct_id: anonymousId(),
        timestamp: new Date().toISOString(),
        // 사람 프로필을 만들지 않는 익명 이벤트로 보낸다.
        properties: { ...payload, referrer: referrerHost(), $process_person_profile: false },
      }),
    }).catch(() => {});
  } catch {
    // 통계 전송 실패는 화면에 영향을 주지 않는다.
  }
}

export function campaignFromUrl(): string | undefined {
  const hash = window.location.hash;
  const q = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  return new URLSearchParams(q).get('c') ?? undefined;
}
