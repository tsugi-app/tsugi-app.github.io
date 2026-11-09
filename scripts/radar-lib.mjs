// 후보 레이더 — 순수 함수만 둔다 (네트워크·GitHub 호출 없음). radar.test.mjs가 이걸 검사한다.

// 지역어: 하나라도 있어야 후보. 값은 content의 hood.
export const AREAS = [
  ['表参道', 'omotesando'],
  ['北青山', 'omotesando'],
  ['南青山', 'omotesando'],
  ['青山', 'omotesando'],
  ['原宿', 'harajuku'],
  ['神宮前', 'harajuku'],
  ['渋谷', 'shibuya'],
  ['宮下公園', 'shibuya'],
  ['MIYASHITA PARK', 'shibuya'],
];

// 소식어: 하나라도 있어야 후보. 값은 updates의 type 추정치.
export const SIGNALS = [
  ['期間限定', 'limited'],
  ['日間限定', 'limited'], // 「3日間限定」
  ['日限定', 'limited'], // 「11月7日～13日限定」 (실제 피드: 표참도 매장 한정 행사)
  ['ポップアップ', 'limited'],
  ['POPUP', 'limited'], // POP UP / POP-UP / pop-up 은 normalize()가 POPUP으로 바꾼다
  ['限定ストア', 'limited'],
  ['グランドオープン', 'new'],
  ['新店舗', 'new'],
  ['オープン', 'new'],
  ['OPEN', 'new'], // 단어 단위로만 (normalize 참고)
  ['開業', 'new'],
  ['出店', 'new'],
  ['リニューアル', 'changed'],
];

// 걸러낼 말: 여행자가 갈 곳이 아닌 보도자료, 또는 "オープン"이 가게 개점이 아닌 경우.
export const EXCLUDE = [
  '求人', '採用', '決算', '株主', 'ウェビナー', 'オンラインセミナー', '資金調達', '人事異動',
  'クリニック', '歯科', '不動産', '賃貸', 'オフィス移転', 'コワーキング',
  'オンラインストア', 'オンラインショップ', 'ECサイト', '公式通販', 'アプリをリリース',
  'オープンキャンパス', 'オープンイノベーション', 'オープンソース', 'オープンハウス', 'オープンデータ',
  // 여행자가 들르지 않는 회원제·시술 공간 (2026-11-09 평일 피드 오탐: 南青山 필라테스 개점)
  'ピラティス', 'Pilates', 'PILATES', 'パーソナルジム', 'フィットネスジム', 'ヨガスタジオ', 'エステサロン', '脱毛サロン',
  // 매장이 아닌 광고 캠페인 (같은 날 오탐: 渋谷区 편의점 충전기 광고 jack)
  'リテールメディア',
];

// 지역어가 키워드에만 있고 키워드에 도쿄 밖 지명이 있으면 다른 지역 소식이다.
// (같은 날 오탐: 淡路島의 テーマパーク 행사인데 발표사 키워드에 南青山)
const ELSEWHERE = /(北海道|青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|京都|大阪|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄|淡路島|横浜|名古屋|札幌|仙台|神戸)/;

function normalize(text) {
  return text
    .replace(/pop[\s\-‐]?up/gi, 'POPUP')
    .replace(/(^|[^A-Za-z])open(?![A-Za-z])/gi, (_, p) => `${p}OPEN`)
    .replace(/(^|[^A-Za-z])OPEN(?=[A-Za-z])/g, (_, p) => `${p}open`); // OPENAI 같은 단어는 제외
}

export function decodeEntities(s) {
  const once = (t) =>
    t
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;|&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&amp;/g, '&');
  // PR TIMES 피드는 엔티티가 두 번 이스케이프되어 있다.
  return once(once(s));
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  if (!m) return '';
  const unwrap = (s) => s.trim().replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1');
  return unwrap(decodeEntities(unwrap(m[1]))).trim();
}

// RSS 1.0(RDF) 문자열 → 항목 배열. 외부 XML 파서 없이 동작한다.
export function parseRdf(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)) {
    const b = m[1];
    const link = tag(b, 'link');
    if (!link) continue;
    items.push({
      title: tag(b, 'title'),
      link,
      description: tag(b, 'description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      corp: tag(b, 'dc:corp'),
      date: tag(b, 'dc:date') || tag(b, 'date'),
    });
  }
  return items;
}

// 보도자료 첫머리의 회사 소개(「本社：東京都渋谷区…」)를 지운다.
// 시부야에 본사를 둔 회사가 많아, 그대로 두면 지역어가 장소가 아닌 본사 주소에 걸린다 (실제 피드 200건 중 12건).
export function stripCompanyInfo(text) {
  return text
    .replace(/[（(][^（）()]*(?:本社|本店|本部|所在地|代表|所長|理事長)[^（）()]*[）)]/g, ' ')
    .replace(/(?:本社|本店|本部|所在地)\s*[:：]\s*[^、，,。／/]{0,40}/g, ' ');
}

// 뉴스 사이트맵(sitemap-news.xml) → 항목 배열. 제목과 발표사 지정 키워드만 있다.
export function parseNewsSitemap(xml) {
  const items = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const b = m[1];
    const link = tag(b, 'loc');
    if (!link) continue;
    items.push({
      title: tag(b, 'news:title'),
      link,
      description: '',
      keywords: tag(b, 'news:keywords'),
      corp: '',
      date: tag(b, 'news:publication_date'),
    });
  }
  return items;
}

// RSS 항목에 사이트맵 키워드를 붙이고, RSS에 없는 사이트맵 항목은 그대로 더한다.
export function mergeItems(rss, news) {
  const byLink = new Map(news.map((n) => [n.link, n]));
  const out = rss.map((r) => (byLink.has(r.link) ? { ...r, keywords: byLink.get(r.link).keywords } : r));
  const have = new Set(rss.map((r) => r.link));
  for (const n of news) if (!have.has(n.link)) out.push(n);
  return out;
}

const firstHit = (text, list) => list.find(([w]) => text.includes(w));

// 항목 하나를 판정한다. 후보면 { hood, type, area, signal }을, 아니면 null.
// keywords는 뉴스 사이트맵에서 온 발표사 지정 키워드 (RSS 본문 발췌가 짧아 장소가 빠질 때 보완).
export function classify(item) {
  const text = normalize(`${item.title} ${stripCompanyInfo(item.description ?? '')} ${item.keywords ?? ''}`);
  if (EXCLUDE.some((w) => text.includes(w))) return null;
  const area = firstHit(text, AREAS);
  const signal = firstHit(text, SIGNALS);
  if (!area || !signal) return null;
  const body = normalize(`${item.title} ${stripCompanyInfo(item.description ?? '')}`);
  if (!body.includes(area[0]) && ELSEWHERE.test(item.keywords ?? '')) return null;
  return { hood: area[1], type: signal[1], area: area[0], signal: signal[0] };
}

export function pickCandidates(items, knownLinks = new Set()) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    if (knownLinks.has(it.link) || seen.has(it.link)) continue;
    const c = classify(it);
    if (!c) continue;
    seen.add(it.link);
    out.push({ ...it, ...c });
  }
  return out;
}

// Asia/Tokyo 기준 ISO 주차 ("2026-W45").
export function isoWeekTokyo(now = new Date()) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const d = new Date(`${ymd}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // 월=0
  d.setUTCDate(d.getUTCDate() - day + 3); // 그 주 목요일
  const dayOfYear = (d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000 + 1;
  const week = Math.ceil(dayOfYear / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const HOOD_KO = { shibuya: '시부야', harajuku: '하라주쿠', omotesando: '오모테산도' };
const TYPE_KO = { new: '새로 오픈', limited: '기간 한정', changed: '최근 변화' };

export function formatComment(cands, now = new Date()) {
  const stamp = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const lines = [`### ${stamp} (JST) 수집 — ${cands.length}건`, ''];
  for (const c of cands) {
    const title = c.title.replace(/[\[\]]/g, '');
    lines.push(`- [ ] **${title}**`);
    lines.push(`  ${HOOD_KO[c.hood]} · ${TYPE_KO[c.type]}(추정: "${c.signal}") · ${c.corp || '발표사 미상'} · ${c.date.slice(0, 10)} · [보도자료](${c.link})`);
  }
  lines.push('', '<sub>자동 수집 · PR TIMES RSS·뉴스 사이트맵 · 지역어+소식어 키워드 일치. 카드로 만들 항목에 체크하고 Claude에게 "체크한 후보로 카드 초안" 요청.</sub>');
  return lines.join('\n');
}

export const ISSUE_BODY = [
  '이번 주 PR TIMES 보도자료(RSS·뉴스 사이트맵) 중 시부야·하라주쿠·오모테산도의 새로 오픈·기간 한정·리뉴얼 소식을 매시간 자동으로 모읍니다. 새 후보는 댓글로 추가됩니다.',
  '',
  '**쓰는 법**',
  '1. 댓글의 후보 중 카드로 만들 만한 곳에 체크합니다. 여행자가 가 볼 이유가 없는 곳은 무시합니다.',
  '2. Claude에게 "이번 주 레이더에서 체크한 후보로 카드 초안 만들어줘"라고 요청합니다.',
  '3. 날짜·예약 조건은 공식 페이지에서 다시 확인한 뒤 PR을 병합합니다.',
  '',
  '키워드 판정이라 엉뚱한 항목도 섞입니다. 자주 섞이는 단어는 `scripts/radar-lib.mjs`의 `EXCLUDE`에 추가합니다.',
].join('\n');
