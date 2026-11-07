import { useEffect, useState } from 'react';
import bundled from '../../public/content.json';
import { CONTENT_URL } from './channel';
import type { Check, Content, Place, Take, Update } from './types';

const initial = bundled as Content;

// 번들 내장본으로 즉시 그리고, Pages의 최신본이 더 새로우면 교체한다.
export function useContent(): Content {
  const [content, setContent] = useState<Content>(initial);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(CONTENT_URL, { signal: ctrl.signal, cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((c: Content | null) => {
        if (c && c.builtAt > initial.builtAt) setContent(c);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);
  return content;
}

export interface PlaceView {
  place: Place;
  updates: Update[];
  take?: Take;
  check?: Check;
}

export function viewOf(c: Content, placeId: string): PlaceView | undefined {
  const place = c.places.find((p) => p.id === placeId);
  if (!place) return undefined;
  return {
    place,
    updates: c.updates.filter((u) => u.placeId === placeId),
    take: c.takes.find((t) => t.placeId === placeId),
    check: c.checks.find((k) => k.placeId === placeId),
  };
}
