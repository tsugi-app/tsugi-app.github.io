import labels from './labels.json';

// content/ 폴더의 JSON과 1:1로 대응한다. 규칙은 scripts/validate.mjs가 검사한다.

export type Hood = 'shibuya' | 'harajuku' | 'omotesando';
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

// 동네·취향 이름은 labels.json 한 곳에 둔다 (공유 페이지 스크립트도 같은 파일을 읽는다).
export const HOOD_LABEL: Record<Hood, string> = labels.hood;

export const TAG_LABEL: Record<Tag, string> = labels.tag;

export const TYPE_LABEL: Record<CardType, string> = {
  new: '새로 오픈',
  limited: '기간 한정',
  changed: '최근 변화',
  editorial: '편집 추천',
};
