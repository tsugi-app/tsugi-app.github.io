// 예약 실행 감시. 매일 한 번 돌며 다음을 확인하고, 문제가 있으면 이슈를 연다(같은 제목의 열린 이슈가 있으면 생략).
//   1) 레이더(radar.yml)가 마지막으로 성공한 지 RADAR_MAX_HOURS 넘게 지났는가
//   2) main의 마지막 커밋이 STALE_DAYS 넘게 지났는가 — 공개 리포는 60일 무활동이면 예약 워크플로가 자동으로 꺼진다
// 이 감시 자체도 예약 실행이라, 60일 규칙에 걸리면 같이 멈춘다. 그래서 50일에 미리 경고한다.
import { GITHUB_REPO, GITHUB_TOKEN, gh } from './lib.mjs';

const RADAR_MAX_HOURS = 24;
const STALE_DAYS = 50;
const LABEL = 'watchdog';

const dry = !GITHUB_TOKEN || !GITHUB_REPO || process.argv.includes('--dry-run');

const hoursSince = (iso) => (Date.now() - Date.parse(iso)) / 3_600_000;

export function evaluate({ lastRadarSuccess, lastCommitAt }) {
  const problems = [];
  if (!lastRadarSuccess || hoursSince(lastRadarSuccess) > RADAR_MAX_HOURS) {
    const h = lastRadarSuccess ? Math.round(hoursSince(lastRadarSuccess)) : null;
    problems.push({
      key: 'radar-stalled',
      title: '레이더가 24시간 넘게 돌지 않았습니다',
      body: [
        h === null ? '성공한 레이더 실행 기록이 없습니다.' : `마지막 성공 실행: ${lastRadarSuccess} (${h}시간 전)`,
        '',
        'GitHub 예약 실행은 늦어지거나 빠질 수 있습니다. Actions → Candidate radar → Run workflow로 수동 실행해 보고, 계속 안 돌면 워크플로가 비활성화되었는지(Enable workflow 버튼) 확인하세요.',
      ].join('\n'),
    });
  }
  const days = (Date.now() - Date.parse(lastCommitAt)) / 86_400_000;
  if (days > STALE_DAYS) {
    problems.push({
      key: 'repo-stale',
      title: `리포 활동 ${Math.floor(days)}일 — 60일이 되면 예약 작업이 멈춥니다`,
      body: [
        `main의 마지막 커밋: ${lastCommitAt}`,
        '',
        '공개 리포는 60일 동안 활동이 없으면 예약 워크플로(레이더·매일 재빌드·재확인·이 감시)가 자동으로 꺼집니다.',
        '카드 하나를 고치거나 재확인 날짜를 갱신하는 커밋을 하나 병합하면 초기화됩니다. 이미 꺼졌다면 Actions에서 각 워크플로의 Enable workflow를 누르세요.',
      ].join('\n'),
    });
  }
  return problems;
}

async function main() {
  if (dry) {
    console.log('토큰이 없어 dry-run: 판정 로직만 확인합니다.');
    console.log(evaluate({ lastRadarSuccess: null, lastCommitAt: new Date().toISOString() }).map((p) => p.title));
    return;
  }
  const runs = await gh('/actions/workflows/radar.yml/runs?status=success&per_page=1');
  const lastRadarSuccess = runs.workflow_runs[0]?.updated_at ?? null;
  const commits = await gh('/commits?sha=main&per_page=1');
  const lastCommitAt = commits[0].commit.committer.date;
  console.log(`레이더 마지막 성공: ${lastRadarSuccess ?? '없음'} / 마지막 커밋: ${lastCommitAt}`);

  const problems = evaluate({ lastRadarSuccess, lastCommitAt });
  if (problems.length === 0) return console.log('이상 없음');

  const open = await gh(`/issues?labels=${LABEL}&state=open&per_page=50`);
  for (const p of problems) {
    const marker = `<!-- watchdog:${p.key} -->`;
    if (open.some((i) => (i.body ?? '').includes(marker))) {
      console.log(`이미 열린 이슈 있음: ${p.title}`);
      continue;
    }
    const created = await gh('/issues', { method: 'POST', body: JSON.stringify({ title: p.title, body: `${p.body}\n\n${marker}`, labels: [LABEL] }) });
    console.log(`이슈 생성 #${created.number}: ${p.title}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
