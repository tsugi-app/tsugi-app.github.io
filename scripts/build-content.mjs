// content/ 네 폴더를 app/public/content.json 하나로 합치고 이미지를 복사한다.
// 클라이언트는 이 파일만 읽는다. 리사이즈는 이미지가 실제로 들어올 때(D3) 붙인다.
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_PUBLIC, CONTENT, readDir } from './lib.mjs';

const strip = ({ _note, ...rest }) => rest; // _note는 편집자 메모, 번들에서 제외

const content = {
  builtAt: new Date().toISOString(),
  places: readDir('places').map((x) => strip(x.data)),
  updates: readDir('updates').map((x) => strip(x.data)),
  takes: readDir('takes').map((x) => strip(x.data)),
  checks: readDir('checks').map((x) => strip(x.data)),
};

mkdirSync(APP_PUBLIC, { recursive: true });
writeFileSync(join(APP_PUBLIC, 'content.json'), JSON.stringify(content));

const imgSrc = join(CONTENT, 'images');
const imgDst = join(APP_PUBLIC, 'images');
mkdirSync(imgDst, { recursive: true });
if (existsSync(imgSrc)) {
  for (const f of readdirSync(imgSrc)) {
    if (!f.startsWith('.')) copyFileSync(join(imgSrc, f), join(imgDst, f));
  }
}

console.log(`content.json 생성: 장소 ${content.places.length}, 소식 ${content.updates.length}`);
