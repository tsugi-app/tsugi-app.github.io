// 공유 미리보기용 정적 페이지를 만든다. vite build 뒤에 돈다.
//   /p/<placeId>/   장소 하나   → /#/p/<placeId>
//   /c/<동네|취향>/  주제 하나   → /#/?hood=… 또는 /#/?tag=…
// 해시 주소는 카톡·X 미리보기 수집기가 읽지 못해서, 실제 경로에 OG 태그만 담은 페이지를 두고
// 사람이 열면 바로 앱 해시 경로로 넘긴다. 링크의 ?c=캠페인 은 그대로 넘긴다.
// 앱인토스 번들(VITE_CHANNEL=toss)에는 필요 없어서 만들지 않는다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_PUBLIC, ROOT } from './lib.mjs';

if (process.env.VITE_CHANNEL === 'toss') {
  console.log('공유 페이지: toss 채널이라 건너뜀');
  process.exit(0);
}

const BASE = 'https://tsugi-app.github.io'; // app/src/lib/channel.ts의 WEB_BASE_URL과 같아야 한다
const SITE = '츠기';
const TAGLINE = '다음 일본 여행에 넣을 한 곳';
const DIST = join(ROOT, 'app', 'dist');
const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;

if (!existsSync(DIST)) throw new Error('app/dist가 없다 — vite build 뒤에 실행한다');

const DEFAULT_OG = existsSync(join(DIST, 'og.png')); // vite가 app/public/og.png를 dist로 복사한다

const content = JSON.parse(readFileSync(join(APP_PUBLIC, 'content.json'), 'utf8'));
const labels = JSON.parse(readFileSync(join(ROOT, 'app', 'src', 'lib', 'labels.json'), 'utf8'));

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function page({ path, title, description, image, hash }) {
  const url = `${BASE}${path}`;
  // 장소 이미지가 없으면 기본 이미지(app/public/og.png)를 쓴다. 그것도 없으면 이미지 없이 만든다.
  // 카카오톡·X·페이스북은 og:image로 SVG를 보여 주지 않으므로 SVG 이미지도 기본 이미지로 대신한다.
  const raster = image && !/\.svg$/i.test(image.file) ? image : undefined;
  const img = raster ? `${BASE}/images/${raster.file}` : DEFAULT_OG ? `${BASE}/og.png` : undefined;
  // hash에 이미 ?가 있으면 &로 이어 붙인다.
  const sep = hash.includes('?') ? '&' : '?';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(url)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${SITE}" />
<meta property="og:locale" content="ko_KR" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
${img ? `<meta property="og:image" content="${esc(img)}" />\n<meta name="twitter:card" content="summary_large_image" />` : '<meta name="twitter:card" content="summary" />'}
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<script>
  (function () {
    var q = location.search.slice(1);
    location.replace('/#${hash}' + (q ? '${sep}' + q : ''));
  })();
</script>
</head>
<body>
<h1>${esc(title)}</h1>
<p>${esc(description)}</p>
<p><a href="/#${esc(hash)}">츠기에서 보기</a></p>
</body>
</html>
`;
}

function write(path, html) {
  const dir = join(DIST, ...path.split('/').filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}

let n = 0;

for (const p of content.places) {
  if (!SAFE_ID.test(p.id)) continue;
  const take = content.takes.find((t) => t.placeId === p.id);
  const hood = labels.hood[p.hood] ?? '';
  write(`/p/${p.id}/`, page({
    path: `/p/${p.id}/`,
    title: `${p.name.ko} · ${hood} — ${SITE}`,
    description: take?.why ?? `${hood}에서 ${TAGLINE}`,
    image: p.image,
    hash: `/p/${p.id}`,
  }));
  n++;
}

const topics = [
  ...Object.entries(labels.hood).map(([k, label]) => ({ k, label, param: 'hood', match: (p) => p.hood === k, phrase: `${label}에서` })),
  ...Object.entries(labels.tag).map(([k, label]) => ({ k, label, param: 'tag', match: (p) => p.tags.includes(k), phrase: `${label} 취향으로` })),
];

for (const t of topics) {
  const places = content.places.filter(t.match);
  const names = places.slice(0, 4).map((p) => p.name.ko).join(', ');
  write(`/c/${t.k}/`, page({
    path: `/c/${t.k}/`,
    title: `${t.phrase} 끼울 한 곳 — ${SITE}`,
    description: places.length ? `${places.length}곳 중에서 고르기: ${names}${places.length > 4 ? ' 외' : ''}` : `${t.phrase} ${TAGLINE}`,
    image: places.find((p) => p.image)?.image,
    hash: `/?${t.param}=${t.k}`,
  }));
  n++;
}

console.log(`공유 페이지 ${n}개 생성 (장소 ${n - topics.length}, 주제 ${topics.length})`);
