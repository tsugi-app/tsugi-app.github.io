// 후보 레이더 실행기.
//   node scripts/radar.mjs              → 후보를 콘솔에 출력 (GitHub 토큰 없으면 항상 이 모드)
//   node scripts/radar.mjs --issue      → 이번 주 레이더 이슈 본문 끝에 새 후보만 추가
//                                         (댓글은 알림 메일이 가서 쓰지 않는다. 본문 수정은 알림이 없다)
//   node scripts/radar.mjs --file x.rdf [--news y.xml] → 네트워크 대신 파일에서 읽기 (테스트용)
import { readFileSync } from 'node:fs';
import { ISSUE_BODY, formatComment, isoWeekTokyo, mergeItems, parseNewsSitemap, parseRdf, pickCandidates } from './radar-lib.mjs';
import { GITHUB_REPO as repo, GITHUB_TOKEN as token, gh, readDir } from './lib.mjs';

const FEED = 'https://prtimes.jp/index.rdf';
// 공식 뉴스 사이트맵 (robots.txt에 공개). 제목과 발표사 지정 키워드가 있어 RSS 발췌에 없는 장소를 보완한다.
const NEWS = 'https://prtimes.jp/sitemap-news.xml';
const UA = { 'User-Agent': 'tsugi-radar (+https://tsugi-app.github.io)' };
const LABEL = 'radar';
const args = process.argv.slice(2);
const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
const newsArg = args.includes('--news') ? args[args.indexOf('--news') + 1] : null;
const issueMode = args.includes('--issue');

async function loadFeed() {
  if (fileArg) return readFileSync(fileArg, 'utf8');
  const res = await fetch(FEED, { headers: UA });
  if (!res.ok) throw new Error(`PR TIMES RSS 응답 ${res.status}`);
  return res.text();
}

// 사이트맵은 보조 자료라 실패해도 RSS만으로 계속한다.
async function loadNews() {
  if (fileArg) return newsArg ? readFileSync(newsArg, 'utf8') : '';
  try {
    const res = await fetch(NEWS, { headers: UA });
    if (res.ok) return res.text();
    console.log(`뉴스 사이트맵 응답 ${res.status} — RSS만 사용`);
  } catch (e) {
    console.log(`뉴스 사이트맵 실패 (${e.message}) — RSS만 사용`);
  }
  return '';
}

// 이미 카드에 쓰인 보도자료는 다시 올리지 않는다.
function knownFromContent() {
  const links = new Set();
  for (const { data } of readDir('updates')) if (data.source) links.add(data.source);
  for (const { data } of readDir('checks')) for (const s of data.sources ?? []) links.add(s);
  return links;
}

async function ensureWeeklyIssue(week) {
  const title = `후보 레이더 ${week}`;
  const open = await gh(`/issues?labels=${LABEL}&state=open&per_page=20`);
  const found = open.find((i) => i.title === title);
  if (found) return found;
  try {
    await gh('/labels', { method: 'POST', body: JSON.stringify({ name: LABEL, color: '2D4B8E', description: '후보 레이더 자동 수집' }) });
  } catch {
    // 이미 있음
  }
  // 지난주 레이더 이슈는 닫는다 (기록은 남는다).
  for (const old of open) {
    if (old.title.startsWith('후보 레이더 ')) await gh(`/issues/${old.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed' }) });
  }
  return gh('/issues', { method: 'POST', body: JSON.stringify({ title, body: ISSUE_BODY, labels: [LABEL] }) });
}

// GitHub 이슈 본문 한도(65,536자)보다 조금 작게.
const BODY_MAX = 60000;

async function linksInIssue(number, body) {
  const links = new Set();
  for (const m of (body ?? '').matchAll(/\]\((https:\/\/prtimes\.jp\/[^)\s]+)\)/g)) links.add(m[1]);
  // 본문 방식 이전 주에 댓글로 쌓인 후보도 다시 올리지 않는다.
  for (let page = 1; page < 20; page++) {
    const comments = await gh(`/issues/${number}/comments?per_page=100&page=${page}`);
    for (const c of comments) for (const m of c.body.matchAll(/\]\((https:\/\/prtimes\.jp\/[^)\s]+)\)/g)) links.add(m[1]);
    if (comments.length < 100) break;
  }
  return links;
}

const items = mergeItems(parseRdf(await loadFeed()), parseNewsSitemap(await loadNews()));
const known = knownFromContent();

if (!issueMode || !token || !repo) {
  const cands = pickCandidates(items, known);
  console.log(`보도자료 ${items.length}건 중 후보 ${cands.length}건`);
  for (const c of cands) console.log(`- [${c.hood}/${c.type}] ${c.title} (${c.corp}) ${c.link}`);
  if (issueMode) console.log('GITHUB_TOKEN/GITHUB_REPOSITORY가 없어 이슈를 갱신하지 않았습니다.');
  process.exit(0);
}

const issue = await ensureWeeklyIssue(isoWeekTokyo());
for (const l of await linksInIssue(issue.number, issue.body)) known.add(l);
const cands = pickCandidates(items, known);
console.log(`보도자료 ${items.length}건 → 새 후보 ${cands.length}건 (이슈 #${issue.number})`);
if (cands.length > 0) {
  // 편집자가 그사이 체크한 상자를 덮어쓰지 않게 고치기 직전에 본문을 다시 읽는다.
  const current = (await gh(`/issues/${issue.number}`)).body ?? '';
  const next = `${current}\n\n---\n\n${formatComment(cands)}`;
  if (next.length > BODY_MAX) console.log(`이슈 본문이 ${BODY_MAX}자를 넘어 이번 후보 ${cands.length}건은 건너뜀`);
  else await gh(`/issues/${issue.number}`, { method: 'PATCH', body: JSON.stringify({ body: next }) });
}
