// place.media 링크가 아직 살아 있는지 본다. 매주 재확인 이슈(recheck.yml)에서 돈다.
// 출력은 validate.mjs 경고와 같은 꼴: "places/<id>.json: … — 재확인 필요". 네트워크 오류는 판정하지 않고 넘긴다.
import { readDir } from './lib.mjs';

const UA = 'Mozilla/5.0 (compatible; tsugi-link-check)';

// 유튜브는 oEmbed가 삭제·비공개 영상에 4xx를 준다. 나머지는 페이지 상태 코드만 본다.
async function alive(m) {
  const target =
    m.kind === 'youtube' ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(m.url)}` : m.url;
  const res = await fetch(target, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
  if (res.status >= 400 && res.status < 500 && res.status !== 429) return false;
  if (m.kind === 'blog' && res.ok) {
    const html = await res.text();
    if (/존재하지 않는|삭제되었거나|비공개/.test(html.slice(0, 20000))) return false;
  }
  return true;
}

let dead = 0;
for (const { file, data: p } of readDir('places')) {
  for (const m of p.media ?? []) {
    try {
      if (!(await alive(m))) {
        dead++;
        console.log(`${file}: 관련 글 링크가 열리지 않는다 (${m.url}) — 재확인 필요`);
      }
    } catch {
      // 일시 오류는 다음 주에 다시 본다
    }
  }
}
console.error(`관련 글 링크 점검 완료: 열리지 않는 링크 ${dead}`);
