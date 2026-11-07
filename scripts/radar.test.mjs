import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { classify, decodeEntities, formatComment, isoWeekTokyo, parseRdf, pickCandidates } from './radar-lib.mjs';

const xml = readFileSync(new URL('./fixtures/prtimes-sample.rdf', import.meta.url), 'utf8');
const items = parseRdf(xml);

test('RDF를 항목으로 파싱하고 이중 이스케이프·태그를 벗긴다', () => {
  assert.equal(items.length, 7);
  assert.equal(items[0].title, '表参道に文具の期間限定ストアが登場');
  assert.equal(items[0].description, 'サンプル株式会社は、東京・表参道で12月14日まで期間限定ストアを開催します。');
  assert.equal(items[0].corp, 'サンプル株式会社');
  assert.equal(decodeEntities('&amp;amp;'), '&');
});

test('지역어 + 소식어가 모두 있어야 후보', () => {
  const by = Object.fromEntries(items.map((i) => [i.link.slice(-25, -5), classify(i)]));
  assert.deepEqual(
    pickCandidates(items).map((c) => [c.hood, c.type]),
    [
      ['omotesando', 'limited'],
      ['shibuya', 'new'],
      ['harajuku', 'limited'],
      ['omotesando', 'changed'],
    ],
  );
  assert.ok(Object.values(by).filter(Boolean).length === 4);
});

test('오피스 이전, 지역 밖, OpenAI 같은 단어는 걸러진다', () => {
  const titles = pickCandidates(items).map((c) => c.title);
  assert.ok(!titles.some((t) => t.includes('オフィス')));
  assert.ok(!titles.some((t) => t.includes('大阪')));
  assert.ok(!titles.some((t) => t.includes('OpenAI')));
});

test('온라인 스토어 개점은 여행 후보가 아니다 (실제 피드 오탐 사례)', () => {
  const item = {
    title: 'PIZZA OF DEATH RECORDSのオフィシャルオンラインストアがリニューアルオープン！',
    description: '渋谷のレーベルが運営する公式ストア。',
    link: 'https://prtimes.jp/x',
    corp: '',
    date: '',
  };
  assert.equal(classify(item), null);
});

test('이미 알고 있는 링크는 다시 올리지 않는다', () => {
  const known = new Set([items[0].link]);
  assert.equal(pickCandidates(items, known).length, 3);
});

test('ISO 주차는 도쿄 기준', () => {
  assert.equal(isoWeekTokyo(new Date('2026-11-07T14:00:00Z')), '2026-W45');
  // 일요일 23시 JST(=일요일 14시 UTC)는 아직 같은 주, 월요일 0시 JST는 다음 주
  assert.equal(isoWeekTokyo(new Date('2026-11-08T14:00:00Z')), '2026-W45');
  assert.equal(isoWeekTokyo(new Date('2026-11-08T15:00:00Z')), '2026-W46');
  assert.equal(isoWeekTokyo(new Date('2027-01-01T00:00:00Z')), '2026-W53');
});

test('댓글은 체크박스 목록과 보도자료 링크를 담는다', () => {
  const body = formatComment(pickCandidates(items), new Date('2026-11-07T01:00:00Z'));
  assert.match(body, /수집 — 4건/);
  assert.match(body, /- \[ \] \*\*表参道に文具の期間限定ストアが登場\*\*/);
  assert.match(body, /\[보도자료\]\(https:\/\/prtimes\.jp\/main\/html\/rd\/p\/000000001\.000000001\.html\)/);
});
