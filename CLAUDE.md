# 츠기 (TSUGI) — 작업 규칙

츠기는 "이미 짠 일본 여행 일정에 끼울 한 곳"을 고르는 정적 웹앱이다. 서버 없음. 한 코드베이스를 GitHub Pages(웹)와 앱인토스(.ait)로 두 번 빌드한다.

## 구조
- `app/` — Vite + React 18 + TypeScript. 화면 4개(`screens/`), 공용 로직은 `lib/`.
- `docs/DESIGN.md` — UI/UX 가이드라인(당근 SEED 기반). 화면·컴포넌트·문구를 바꿀 땐 먼저 이 문서를 따른다.
- `docs/IMAGES.md` — 장소 대표 이미지(Claude가 그린 SVG) 화풍·팔레트·캔버스·검토 규칙.
- `content/` — 장소·소식·편집 판단·확인 기록 JSON. 장소 1개 = 파일 1개.
- `scripts/` — `validate.mjs`(규칙 검사), `build-content.mjs`(→ `app/public/content.json`), `build-share.mjs`(vite build 뒤 `dist/p/<id>/`·`dist/c/<동네|취향>/`에 OG 미리보기 페이지 생성, 웹 채널만). 의존성 없는 Node 스크립트.
- `.github/workflows/` — `ci.yml`(PR 검사), `deploy-pages.yml`(main → Pages, 매일 03:00 KST 재빌드), `recheck.yml`(매주 월 재확인 이슈), `radar.yml`(10분마다 후보 레이더), `watchdog.yml`(매일: 레이더 24시간 무실행·리포 50일 무활동이면 이슈).

## 후보 레이더
- `scripts/radar.mjs`가 PR TIMES 공식 RSS와 뉴스 사이트맵(발표사 키워드)을 10분마다 읽어, 본사 주소를 지운 뒤 지역어(渋谷·原宿·表参道…)와 소식어(オープン·期間限定…)가 함께 있는 보도자료를 이번 주 `radar` 라벨 이슈에 댓글로 쌓는다. 판정 규칙은 `scripts/radar-lib.mjs` 한 곳.
- 레이더는 후보만 모은다. 카드(content/)를 자동으로 만들거나 바꾸지 않는다.
- "레이더에서 체크한 후보로 카드 초안"을 요청받으면: 이번 주 레이더 이슈의 체크된 항목을 읽고, 각 보도자료와 공식 페이지에서 날짜·장소를 확인해 place·update·take·check를 쓰고 PR을 연다. 확인 못 한 값은 비우고 `uncertain`에 적는다. 아래 「Claude 카드 검토」를 마치면 CI 통과 후 Claude가 바로 병합(=발행)한다. 사용자 검토를 기다리지 않는다 (2026-11-09 사용자 결정).
- X·야후 리얼타임 검색·LINE은 자동 수집하지 않는다(API 유료·비공개·약관 위험). 편집자가 직접 열어 참고만 한다.

## 하지 않는 것
- 백엔드 서버, DB, 계정, 알림을 추가하지 않는다. 저장은 `lib/storage.ts`의 localStorage뿐이다. 사파리가 7일 미방문 시 지울 수 있어서, 저장 목록은 `#/saved?keep=…` 보관 링크(`lib/savedLink.ts`)로 옮길 수 있게 한다.
- 라이브러리를 늘리지 않는다. 허용: react, react-dom, vite, typescript, vitest. 지도는 D6에 leaflet만 추가.
- 콘텐츠의 날짜·가격·예약 조건을 출처 없이 채우지 않는다. 모르면 비우고 `checks/*.json`의 `uncertain`에 적는다.
- 컴포넌트에 색 코드를 직접 쓰지 않는다. 색·글꼴·간격·모서리는 `app/src/styles/tokens.css`에서만, 컴포넌트는 `--color-*` 시맨틱 토큰만 쓴다. 아이콘은 `components/Icon.tsx`의 인라인 SVG.
- 분석 호출은 `lib/analytics.ts`의 `track()`을 통해서만. 채널 분기는 `lib/channel.ts`와 `lib/analytics.ts` 두 곳에서만.
- 다크 모드는 웹만. 기본은 기기 설정을 따르고, 설정 화면(`#/settings`)에서 시스템·라이트·다크를 고를 수 있다(`lib/storage.ts`의 `tsugi:theme`). 앱인토스는 다크 모드를 지원하지 않아 라이트로 고정하고 설정 버튼도 숨긴다(`lib/channel.ts`의 `SUPPORTS_THEME`·`applyColorMode`). 다크 색 값은 `tokens.css`의 `[data-theme='dark']` 블록에만 쓴다.

## 검사
모든 PR은 `cd app && npm run validate && npm test && npm run build`와 `node --test scripts/*.test.mjs`가 통과해야 한다. 단위 테스트는 날짜 필터·만료·저장(보관 링크 포함) 로직과 레이더·감시 판정 규칙에만 쓴다.

## 콘텐츠 규칙 (scripts/validate.mjs가 강제)
- place마다 check(확인일)가 있어야 발행된다. 없으면 빌드 실패.
- `limited` 소식은 `end` 필수. 종료된 소식은 클라이언트에서 자동으로 피드에서 빠진다.
- `new`·`changed` 소식에 `end`가 없으면 시작 후 60일(`FRESH_DAYS`)까지만 새 소식이다. 그 뒤엔 take에 `evergreen: true`가 있으면 편집 추천으로 남고, 없으면 피드에서 빠진다. 계속 영업하는 가게는 `evergreen: true`.
- Claude가 쓰고 검토한 카드는 check의 `checkedBy`를 `claude`로 둔다. 검토 전이면 `claude-draft`로 두고 병합하지 않는다. 편집자가 직접 다시 확인하면 자기 이름과 날짜로 바꾼다. 화면에는 `checkedBy`를 표시하지 않는다.
- Claude 카드 검토 (병합 전에 모두 확인):
  1. update의 `start`·`end`와 장소 주소가 공식 출처에 있다. 주최 측이나 장소 운영사가 직접 낸 보도자료는 공식 출처로 본다. 장소 공식 페이지에도 게시돼 있으면 함께 대조하고, 둘이 다르면 장소 공식 페이지를 따르고 `uncertain`에 적는다. 장소 쪽에 아직 없으면 그 사실을 `uncertain`에 적는다.
  2. note·take에 쓴 가격·시간·예약 조건은 출처에 그대로 있는 값이다. 출처에 없으면 쓰지 않고 `uncertain`에 적는다.
  3. take의 `why`는 80자 이내, 금지 문구 없음. `notFor`는 출처에서 읽히는 사실(휴무·입장 제한·연령 등)에 기댄다.
  4. 행사 장소가 시부야·하라주쿠·오모테산도가 맞다 (본사 주소·다른 지역 순회지 아님).
  5. 검토를 마친 날짜가 `checkedAt`, 행사 시작 전이나 기간 중간이 `recheckBy`.
- take의 `why`는 80자 이내, "핫한·인생·현지인만" 금지.
- 이미지는 `credit`·`license` 없이 넣지 않는다. 대표 이미지는 Claude(Opus)가 그린 SVG만 쓰고, 그리기 전에 `docs/IMAGES.md`를 따른다.

## 커밋
- 커밋은 사용자 본인의 git 계정(erabi-pecu)으로 한다. GitHub 예약 실행은 워크플로의 cron 줄을 마지막으로 수정한 사용자 기준으로 돌기 때문에, 리포 권한이 없는 계정(예: `noreply@anthropic.com` → `claude` 계정)으로 cron 줄을 커밋하면 레이더·재빌드가 멈춘다. `git config user.email`이 `306176449+erabi-pecu@users.noreply.github.com`인지 확인하고 시작한다.
- 남은 작업 목록은 GitHub 이슈 `next` 라벨에 있다. 시작할 때 `gh issue list --label next`로 확인한다.

작업 브랜치 → PR → CI 통과 → main 병합. main 병합이 곧 웹 배포다. 앱인토스는 `VITE_CHANNEL=toss npm run build`로 만든 번들을 콘솔에 수동 업로드한다.
