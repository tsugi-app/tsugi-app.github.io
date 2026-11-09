// content/ 규칙 검사. 오류가 하나라도 있으면 종료 코드 1 → CI가 병합을 막는다.
// 규칙은 개발 계획 문서의 "검증 규칙" 표와 같다.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CITIES, CONTENT, HOODS, LABELS, TAGS, UPDATE_TYPES, isDate, readDir, todayTokyo } from './lib.mjs';

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

const places = readDir('places');
const updates = readDir('updates');
const takes = readDir('takes');
const checks = readDir('checks');
const placeIds = new Set(places.map((p) => p.data.id));
const BANNED = ['핫한', '인생', '현지인만'];

// 대표 이미지 SVG 규칙 (docs/IMAGES.md 3장)
const SVG_PALETTE = ['#e3e6ec', '#e2e9de', '#ece5da', '#e9e2e0', '#dfe7e7', '#e8e4d8', '#e4e6ee', '#233c74', '#5873b5', '#c3d1ec', '#faf8f4', '#c99a2e'];
const SVG_BANNED = ['text', 'image', 'script', 'foreignObject', 'style', 'filter', 'linearGradient', 'radialGradient', 'mask', 'font'];
function svgProblems(path) {
  const out = [];
  const svg = readFileSync(path, 'utf8');
  if (statSync(path).size > 30 * 1024) out.push('30KB 초과');
  const root = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
  if (!/viewBox="0 0 1200 900"/.test(root) || !/width="1200"/.test(root) || !/height="900"/.test(root))
    out.push('<svg>에 viewBox="0 0 1200 900" width="1200" height="900" 필요');
  for (const tag of SVG_BANNED) if (new RegExp(`<${tag}\\b`).test(svg)) out.push(`<${tag}> 금지`);
  if (/\b(xlink:)?href="(?!#)/.test(svg)) out.push('외부 href 금지');
  if (!/<desc>[\s\S]*근거[\s\S]*<\/desc>/.test(svg)) out.push('<desc>에 모티프·근거 필요');
  for (const c of new Set(svg.toLowerCase().match(/#[0-9a-f]{6}\b/g) ?? []))
    if (!SVG_PALETTE.includes(c)) out.push(`팔레트 밖 색 ${c}`);
  return out;
}

for (const [h, v] of Object.entries(LABELS.hood))
  if (!CITIES.includes(v.city) || !v.ko) err('app/src/lib/labels.json', `hood.${h}에 ko와 city(${CITIES.join('|')}) 필요`);

for (const { file, data: p } of places) {
  if (!p.id || file !== `places/${p.id}.json`) err(file, 'id가 파일명과 같아야 한다');
  if (!p.name?.ko) err(file, 'name.ko 필요');
  if (!HOODS.includes(p.hood)) err(file, `hood는 ${HOODS.join('|')} 중 하나`);
  if (!p.category) err(file, 'category 필요');
  if (!Array.isArray(p.tags) || p.tags.length === 0 || !p.tags.every((t) => TAGS.includes(t)))
    err(file, `tags는 ${TAGS.join('|')} 중 1개 이상`);
  if (typeof p.geo?.lat !== 'number' || typeof p.geo?.lng !== 'number') err(file, 'geo.lat/lng 숫자 필요');
  if (p.image) {
    if (!p.image.file || !existsSync(join(CONTENT, 'images', p.image.file))) err(file, `이미지 파일 없음: ${p.image?.file}`);
    if (!p.image.credit || !p.image.license) err(file, 'image.credit·license 필요');
    const path = p.image.file && join(CONTENT, 'images', p.image.file);
    if (path && /\.svg$/i.test(path) && existsSync(path)) for (const m of svgProblems(path)) err(file, `${p.image.file}: ${m}`);
  }
  if (!checks.some((c) => c.data.placeId === p.id)) err(file, 'check(확인 기록) 없음 — 확인일 없는 카드는 발행 불가');
  if (!takes.some((t) => t.data.placeId === p.id)) warn(file, 'take(편집 판단) 없음 — 카드에 추천 이유가 비어 보인다');
}

for (const { file, data: u } of updates) {
  if (!u.id || file !== `updates/${u.id}.json`) err(file, 'id가 파일명과 같아야 한다');
  if (!placeIds.has(u.placeId)) err(file, `placeId가 없는 장소: ${u.placeId}`);
  if (!UPDATE_TYPES.includes(u.type)) err(file, `type은 ${UPDATE_TYPES.join('|')} 중 하나`);
  if (!isDate(u.start)) err(file, 'start는 YYYY-MM-DD');
  if (u.end !== undefined && !isDate(u.end)) err(file, 'end는 YYYY-MM-DD');
  if (u.type === 'limited' && !u.end) err(file, 'limited 유형은 end 필수');
  if (u.end && u.start > u.end) err(file, 'start가 end보다 늦다');
  if (!u.source) err(file, 'source(근거 링크) 필요');
}

for (const { file, data: t } of takes) {
  if (!placeIds.has(t.placeId)) err(file, `placeId가 없는 장소: ${t.placeId}`);
  if (!t.why) err(file, 'why(추천 이유) 필요');
  else {
    if (t.why.length > 80) warn(file, `why가 80자 초과 (${t.why.length}자)`);
    for (const b of BANNED) if (t.why.includes(b)) warn(file, `why에 금지 문구 "${b}"`);
  }
  if (t.pairWith && !placeIds.has(t.pairWith)) err(file, `pairWith가 없는 장소: ${t.pairWith}`);
}

const today = todayTokyo();
for (const { file, data: c } of checks) {
  if (!placeIds.has(c.placeId)) err(file, `placeId가 없는 장소: ${c.placeId}`);
  if (!isDate(c.checkedAt)) err(file, 'checkedAt은 YYYY-MM-DD');
  if (!c.checkedBy) err(file, 'checkedBy 필요');
  if (c.recheckBy !== undefined && !isDate(c.recheckBy)) err(file, 'recheckBy는 YYYY-MM-DD');
  if (c.recheckBy && c.recheckBy < today) warn(file, `recheckBy(${c.recheckBy})가 지났다 — 재확인 필요`);
}

for (const w of warnings) console.warn(`경고  ${w}`);
for (const e of errors) console.error(`오류  ${e}`);
const perCity = CITIES.map((c) => `${LABELS.city[c]} ${places.filter((p) => LABELS.hood[p.data.hood]?.city === c).length}`).join(', ');
console.log(`도시별 장소: ${perCity}`);
console.log(`검사 완료: 장소 ${places.length}, 소식 ${updates.length}, 판단 ${takes.length}, 확인 ${checks.length} — 오류 ${errors.length}, 경고 ${warnings.length}`);
if (errors.length) process.exit(1);
