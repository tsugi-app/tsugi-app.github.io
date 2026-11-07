import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate } from './watchdog.mjs';

const ago = (h) => new Date(Date.now() - h * 3_600_000).toISOString();

test('레이더가 최근에 돌았고 커밋도 최근이면 문제 없음', () => {
  assert.deepEqual(evaluate({ lastRadarSuccess: ago(2), lastCommitAt: ago(24) }), []);
});

test('레이더 24시간 초과 또는 기록 없음', () => {
  assert.equal(evaluate({ lastRadarSuccess: ago(30), lastCommitAt: ago(1) }).length, 1);
  assert.equal(evaluate({ lastRadarSuccess: null, lastCommitAt: ago(1) }).length, 1);
});

test('마지막 커밋 50일 초과면 60일 규칙 경고', () => {
  const p = evaluate({ lastRadarSuccess: ago(1), lastCommitAt: ago(51 * 24) });
  assert.equal(p.length, 1);
  assert.match(p[0].title, /60일/);
});
