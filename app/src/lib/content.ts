import { useEffect, useState } from 'react';
import bundled from '../../public/content.json';
import { CONTENT_URL } from './channel';
import {
  type Check,
  type City,
  type Content,
  type Hood,
  type Place,
  type Take,
  type Update,
  CITIES,
  HOOD_CITY,
  HOODS,
  cityOf,
  citiesWithPlaces,
} from './types';

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

// 도시·동네 필터 (#/?city=&hood=, #/map?city=&hood=). 발견·지도 탭이 같이 쓴다.
// - 칩에는 장소가 하나라도 있는 도시·동네만 나온다.
// - 도시가 하나뿐이면 도시 칩 줄은 숨기고 그 도시로 본다.
// - ?hood=만 있는 옛 링크(공유 페이지 포함)는 동네에서 도시를 알아낸다.
export interface AreaFilter {
  city: City | '';
  hood: Hood | '';
  /** 도시 칩 (장소가 있는 도시). 2개 이상일 때만 보여 준다. */
  cities: City[];
  /** 지금 도시의 동네 칩. 도시를 고르기 전엔 비어 있다. */
  hoods: Hood[];
  match: (p: Place) => boolean;
}

export function areaFilter(places: Place[], query: URLSearchParams): AreaFilter {
  const qHood = query.get('hood') as Hood | null;
  const qCity = query.get('city') as City | null;
  const hood: Hood | '' = qHood && HOODS.includes(qHood) ? qHood : '';
  const cities = citiesWithPlaces(places);
  const city: City | '' =
    (qCity && CITIES.includes(qCity) ? qCity : '') || (hood ? HOOD_CITY[hood] : '') || (cities.length === 1 ? cities[0] : '');
  const hoods = city ? HOODS.filter((h) => HOOD_CITY[h] === city && places.some((p) => p.hood === h)) : [];
  return {
    city,
    hood,
    cities,
    hoods,
    match: (p) => (!city || cityOf(p) === city) && (!hood || p.hood === hood),
  };
}
