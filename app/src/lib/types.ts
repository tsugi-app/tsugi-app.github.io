import labels from './labels.json';

// content/ 폴더의 JSON과 1:1로 대응한다. 규칙은 scripts/validate.mjs가 검사한다.

// 도시·동네 목록은 labels.json 한 곳에 둔다. 동네가 어느 도시인지도 거기서 정한다 (카드에는 hood만 쓴다).
export type City = keyof typeof labels.city;
export type Hood = keyof typeof labels.hood;
export type Tag = 'cafe' | 'design' | 'goods' | 'walk';
export type UpdateType = 'new' | 'limited' | 'changed';
export type CardType = UpdateType | 'editorial';

export interface Place {
  id: string;
  name: { ko: string; ja?: string };
  hood: Hood;
  category: string;
  tags: Tag[];
  geo: { lat: number; lng: number };
  address?: string;
  official?: string;
  image?: { file: string; credit: string; license: string };
}

export interface Update {
  id: string;
  placeId: string;
  type: UpdateType;
  start: string; // YYYY-MM-DD (Asia/Tokyo)
  end?: string; // limited 유형은 필수
  source: string;
  note?: string;
}

export interface Take {
  placeId: string;
  why: string;
  forWhom?: string;
  notFor?: string;
  differsFrom?: string;
  pairWith?: string;
  evergreen?: boolean;
}

export interface Check {
  placeId: string;
  checkedAt: string;
  checkedBy: string;
  recheckBy?: string;
  uncertain?: string[];
  sources?: string[];
}

export interface Content {
  builtAt: string;
  places: Place[];
  updates: Update[];
  takes: Take[];
  checks: Check[];
}

export interface Saved {
  placeId: string;
  savedAt: string;
  visitDate?: string;
}

// 도시·동네·취향 이름은 labels.json 한 곳에 둔다 (공유 페이지·검사·레이더 스크립트도 같은 파일을 읽는다).
// 키 순서가 화면의 칩 순서다.
export const CITY_LABEL: Record<City, string> = labels.city;
export const CITIES = Object.keys(labels.city) as City[];
export const HOODS = Object.keys(labels.hood) as Hood[];
export const HOOD_LABEL = Object.fromEntries(HOODS.map((h) => [h, labels.hood[h].ko])) as Record<Hood, string>;
export const HOOD_CITY = Object.fromEntries(HOODS.map((h) => [h, labels.hood[h].city])) as Record<Hood, City>;
export const cityOf = (p: Pick<Place, 'hood'>): City => HOOD_CITY[p.hood];
/** "도쿄 · 시부야" */
export const areaLabel = (p: Pick<Place, 'hood'>): string => `${CITY_LABEL[cityOf(p)]} · ${HOOD_LABEL[p.hood]}`;
/** 장소가 하나라도 있는 도시 (labels.json 순서). */
export const citiesWithPlaces = (places: Pick<Place, 'hood'>[]): City[] =>
  CITIES.filter((c) => places.some((p) => cityOf(p) === c));

export const TAG_LABEL: Record<Tag, string> = labels.tag;

export const TYPE_LABEL: Record<CardType, string> = {
  new: '새로 오픈',
  limited: '기간 한정',
  changed: '최근 변화',
  editorial: '편집 추천',
};
