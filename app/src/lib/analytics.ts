import { CHANNEL } from './channel';

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

export function track(name: EventName, params: Params = {}): void {
  if (isOperator()) return;
  const payload = { ...params, channel: CHANNEL, campaign: campaignFromUrl() };
  if (import.meta.env.DEV) console.debug('[track]', name, payload);
  // TODO(D7): 웹은 GA4 또는 PostHog, 토스는 SDK 이벤트로 연결.
}

export function campaignFromUrl(): string | undefined {
  const hash = window.location.hash;
  const q = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  return new URLSearchParams(q).get('c') ?? undefined;
}
