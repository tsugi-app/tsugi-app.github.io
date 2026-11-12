import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const CONTENT = join(ROOT, 'content');
export const APP_PUBLIC = join(ROOT, 'app', 'public');

// 도시·동네 목록은 앱과 같은 파일(app/src/lib/labels.json)을 읽는다.
export const LABELS = JSON.parse(readFileSync(join(ROOT, 'app', 'src', 'lib', 'labels.json'), 'utf8'));
export const CITIES = Object.keys(LABELS.city);
export const HOODS = Object.keys(LABELS.hood);
export const TAGS = ['cafe', 'design', 'goods', 'walk', 'food'];
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

// Asia/Tokyo 기준 YYYY-MM-DD.
export function todayTokyo(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// GitHub REST 호출 (레이더·감시가 같이 쓴다). 워크플로가 GITHUB_TOKEN·GITHUB_REPOSITORY를 넣어 준다.
export const GITHUB_REPO = process.env.GITHUB_REPOSITORY;
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export async function gh(path, init = {}) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`GitHub ${init.method ?? 'GET'} ${path} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}
