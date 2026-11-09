import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { classify, decodeEntities, formatComment, isoWeekTokyo, mergeItems, parseNewsSitemap, parseRdf, pickCandidates, stripCompanyInfo } from './radar-lib.mjs';

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
      ['umeda', 'new'], // 2026-11-10부터 오사카도 다룬다
      ['omotesando', 'changed'],
    ],
  );
  assert.ok(Object.values(by).filter(Boolean).length === 5);
});

test('오피스 이전, OpenAI 같은 단어는 걸러진다', () => {
  const titles = pickCandidates(items).map((c) => c.title);
  assert.ok(!titles.some((t) => t.includes('オフィス')));
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
  assert.equal(pickCandidates(items, known).length, 4);
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
  assert.match(body, /수집 — 5건/);
  assert.match(body, /- \[ \] \*\*表参道に文具の期間限定ストアが登場\*\*/);
  assert.match(body, /\[보도자료\]\(https:\/\/prtimes\.jp\/main\/html\/rd\/p\/000000001\.000000001\.html\)/);
});

test('본사 주소의 지역어는 장소로 치지 않는다 (실제 피드 오탐 원인)', () => {
  const item = {
    title: '新ブランドのポップアップストアを福岡でオープン',
    description: '[株式会社サンプル] 株式会社サンプル（本社：東京都渋谷区、代表取締役：山田太郎）は、福岡で期間限定ストアを開催します。',
    link: 'https://prtimes.jp/y',
    corp: '',
    date: '',
  };
  assert.equal(classify(item), null);
  assert.ok(!stripCompanyInfo('（所長：井上岳久／東京都渋谷区）は').includes('渋谷'));
  assert.ok(!stripCompanyInfo('所在地：東京都渋谷区千駄ヶ谷、代表').includes('渋谷'));
  // 본문에 장소로 나오면 그대로 잡는다
  assert.deepEqual(
    classify({ ...item, description: '株式会社サンプル（本社：大阪市）は、渋谷パルコにポップアップストアをオープンします。' })?.hood,
    'shibuya',
  );
});

test('뉴스 사이트맵 키워드로 RSS 발췌에 없는 장소를 보완한다', () => {
  const news = parseNewsSitemap(readFileSync(new URL('./fixtures/prtimes-news-sample.xml', import.meta.url), 'utf8'));
  assert.equal(news.length, 2);
  assert.equal(news[1].keywords, '雑貨,インテリア,神宮前,原宿');
  const merged = mergeItems(items, news);
  assert.equal(merged.length, items.length + 1); // 첫 항목은 RSS와 같은 링크라 합쳐진다
  assert.equal(merged[0].keywords, '文具,期間限定,表参道');
  const extra = pickCandidates(merged).find((c) => c.link.includes('000000099'));
  assert.deepEqual([extra?.hood, extra?.type], ['harajuku', 'new']);
});

test('「～13日限定」 같은 날짜 한정도 기간 한정 소식이다 (실제 피드 누락 사례)', () => {
  const item = { title: '【11月7日～13日限定】天然石ブランド表参道店でブレスレットのメンテナンスが無料に', description: '', link: 'https://prtimes.jp/z', corp: '', date: '' };
  assert.deepEqual([classify(item)?.hood, classify(item)?.type], ['omotesando', 'limited']);
});

test('평일 피드 오탐: 필라테스 개점, 광고 캠페인, 다른 지역 행사는 거른다 (2026-11-09)', () => {
  const base = { link: 'https://prtimes.jp/w', corp: '', date: '' };
  assert.equal(classify({ ...base, title: '「FIVE. Pilates Club」が11月9日、南青山にオープン', description: '' }), null);
  assert.equal(classify({ ...base, title: '【推し活×リテールメディア】渋谷区のコンビニ充電器をジャック！期間限定で開催', description: '' }), null);
  const awaji = { ...base, title: 'テーマパークのウィンターカーニバルを11月17日より期間限定で開催', description: '', keywords: '淡路島,兵庫県,テーマパーク,南青山,期間限定' };
  assert.equal(classify(awaji), null);
  // 제목·본문에 지역어가 있으면 키워드에 다른 지명이 섞여도 후보다
  assert.equal(classify({ ...awaji, title: '表参道で期間限定ストアを開催（大阪・福岡にも巡回）' })?.hood, 'omotesando');
});

test('다섯 도시의 동네를 잡고, 이름이 겹치는 다른 곳은 거른다', () => {
  const base = { description: '', link: 'https://prtimes.jp/m', corp: '', date: '' };
  const at = (title, keywords) => classify({ ...base, title, keywords })?.hood ?? null;
  assert.equal(at('梅田にカフェがオープン'), 'umeda');
  assert.equal(at('心斎橋PARCOで期間限定ストア'), 'shinsaibashi');
  assert.equal(at('祇園に和菓子店がオープン'), 'gion');
  assert.equal(at('天神にポップアップストアが登場'), 'tenjin');
  assert.equal(at('JR博多シティで期間限定イベント'), 'hakata');
  assert.equal(at('すすきのにバーがオープン'), 'susukino');
  // 오사카 天神橋筋, 博多祇園山笠는 동네가 아니다
  assert.equal(at('天神橋筋商店街に新店舗がオープン'), null);
  assert.equal(at('博多祇園山笠の限定グッズをオープン記念で'), null);
  // 博多는 상품명으로 흔해서 그것만으론 잡지 않는다
  assert.equal(at('博多ラーメンの新店舗がオープン'), null);
  // 다른 도시 동네가 키워드에만 있고 키워드에 그 도시 밖 지명이 있으면 거른다
  assert.equal(at('冬のイベントを期間限定で開催', '東京,梅田,期間限定'), null);
  assert.equal(at('冬のイベントを期間限定で開催', '大阪,梅田,期間限定'), 'umeda');
});

test('댓글에 도시와 동네를 함께 적는다', () => {
  const body = formatComment(
    [{ title: 't', hood: 'umeda', type: 'new', signal: 'オープン', corp: '', date: '2026-11-10T00:00:00Z', link: 'https://prtimes.jp/x' }],
    new Date('2026-11-10T01:00:00Z'),
  );
  assert.match(body, /오사카 우메다 · 새로 오픈/);
});
