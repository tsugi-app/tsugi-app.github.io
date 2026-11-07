import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const CONTENT = join(ROOT, 'content');
export const APP_PUBLIC = join(ROOT, 'app', 'public');

export const HOODS = ['shibuya', 'harajuku', 'omotesando'];
export const TAGS = ['cafe', 'design', 'goods', 'walk'];
export const UPDATE_TYPES = ['new', 'limited', 'changed'];

export function readDir(kind) {
  const dir = join(CONTENT, kind);
  if (!existsSync(dir)) return []; // 비어 있는 폴더는 git에 남지 않는다
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const file = `${kind}/${f}`;
      try {
        return { file, data: JSON.parse(readFileSync(join(dir, f), 'utf8')) };
      } catch (e) {
        throw new Error(`${file}: JSON 파싱 실패 — ${e.message}`);
      }
    });
}

export function todayTokyo() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
