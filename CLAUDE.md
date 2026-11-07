# 츠기 (TSUGI) — 작업 규칙

츠기는 "이미 짠 일본 여행 일정에 끼울 한 곳"을 고르는 정적 웹앱이다. 서버 없음. 한 코드베이스를 GitHub Pages(웹)와 앱인토스(.ait)로 두 번 빌드한다.

## 구조
- `app/` — Vite + React 18 + TypeScript. 화면 4개(`screens/`), 공용 로직은 `lib/`.
- `content/` — 장소·소식·편집 판단·확인 기록 JSON. 장소 1개 = 파일 1개.
- `scripts/` — `validate.mjs`(규칙 검사), `build-content.mjs`(→ `app/public/content.json`). 의존성 없는 Node 스크립트.
- `.github/workflows/` — `ci.yml`(PR 검사), `deploy-pages.yml`(main → Pages, 매일 03:00 KST 재빌드), `recheck.yml`(매주 월 재확인 이슈), `radar.yml`(매시간 후보 레이더), `watchdog.yml`(매일: 레이더 24시간 무실행·리포 50일 무활동이면 이슈).

## 후보 레이더
- `scripts/radar.mjs`가 PR TIMES 공식 RSS를 매시간 읽어, 지역어(渋谷·原宿·表参道…)와 소식어(オープン·期間限定…)가 함께 있는 보도자료를 이번 주 `radar` 라벨 이슈에 댓글로 쌓는다. 판정 규칙은 `scripts/radar-lib.mjs` 한 곳.
- 레이더는 후보만 모은다. 카드(content/)를 자동으로 만들거나 바꾸지 않는다.
- "레이더에서 체크한 후보로 카드 초안"을 요청받으면: 이번 주 레이더 이슈의 체크된 항목을 읽고, 각 보도자료와 공식 페이지에서 날짜·장소를 확인해 place·update·take·check 초안을 쓰고 PR을 연다. 확인 못 한 값은 비우고 `uncertain`에 적는다.
- X·야후 리얼타임 검색·LINE은 자동 수집하지 않는다(API 유료·비공개·약관 위험). 편집자가 직접 열어 참고만 한다.

## 하지 않는 것
- 백엔드 서버, DB, 계정, 알림을 추가하지 않는다. 저장은 `lib/storage.ts`의 localStorage뿐이다. 사파리가 7일 미방문 시 지울 수 있어서, 저장 목록은 `#/saved?keep=…` 보관 링크(`lib/savedLink.ts`)로 옮길 수 있게 한다.
- 라이브러리를 늘리지 않는다. 허용: react, react-dom, vite, typescript, vitest. 지도는 D6에 leaflet만 추가.
- 콘텐츠의 날짜·가격·예약 조건을 출처 없이 채우지 않는다. 모르면 비우고 `checks/*.json`의 `uncertain`에 적는다.
- 컴포넌트에 색 코드를 직접 쓰지 않는다. 색·글꼴은 `app/src/styles/tokens.css`에서만.
- 분석 호출은 `lib/analytics.ts`의 `track()`을 통해서만. 채널 분기는 `lib/channel.ts`와 `lib/analytics.ts` 두 곳에서만.
- 다크 모드를 만들지 않는다 (앱인토스 미지원, 웹도 라이트만).

## 검사
모든 PR은 `cd app && npm run validate && npm test && npm run build`와 `node --test scripts/*.test.mjs`가 통과해야 한다. 단위 테스트는 날짜 필터·만료·저장(보관 링크 포함) 로직과 레이더·감시 판정 규칙에만 쓴다.

## 콘텐츠 규칙 (scripts/validate.mjs가 강제)
- place마다 check(확인일)가 있어야 발행된다. 없으면 빌드 실패.
- `limited` 소식은 `end` 필수. 종료된 소식은 클라이언트에서 자동으로 피드에서 빠진다.
- `new`·`changed` 소식에 `end`가 없으면 시작 후 60일(`FRESH_DAYS`)까지만 새 소식이다. 그 뒤엔 take에 `evergreen: true`가 있으면 편집 추천으로 남고, 없으면 피드에서 빠진다. 계속 영업하는 가게는 `evergreen: true`.
- Claude가 쓴 초안 카드는 check의 `checkedBy`를 `claude-draft`로 둔다. 편집자가 공식 페이지를 다시 확인하면 자기 이름과 날짜로 바꾼다.
- take의 `why`는 80자 이내, "핫한·인생·현지인만" 금지.
- 이미지는 `credit`·`license` 없이 넣지 않는다.

## 커밋
작업 브랜치 → PR → CI 통과 → main 병합. main 병합이 곧 웹 배포다. 앱인토스는 `VITE_CHANNEL=toss npm run build`로 만든 번들을 콘솔에 수동 업로드한다.
