// 후보 레이더 실행기.
//   node scripts/radar.mjs              → 후보를 콘솔에 출력 (GitHub 토큰 없으면 항상 이 모드)
//   node scripts/radar.mjs --issue      → 이번 주 레이더 이슈에 새 후보만 댓글로 추가
//   node scripts/radar.mjs --file x.rdf [--news y.xml] → 네트워크 대신 파일에서 읽기 (테스트용)
import { readFileSync } from 'node:fs';
import { ISSUE_BODY, formatComment, isoWeekTokyo, mergeItems, parseNewsSitemap, parseRdf, pickCandidates } from './radar-lib.mjs';
import { readDir } from './lib.mjs';

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

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;

async function gh(path, init = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`GitHub ${init.method ?? 'GET'} ${path} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
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

async function linksInIssue(number) {
  const links = new Set();
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
for (const l of await linksInIssue(issue.number)) known.add(l);
const cands = pickCandidates(items, known);
console.log(`보도자료 ${items.length}건 → 새 후보 ${cands.length}건 (이슈 #${issue.number})`);
if (cands.length > 0) {
  await gh(`/issues/${issue.number}/comments`, { method: 'POST', body: JSON.stringify({ body: formatComment(cands) }) });
}
