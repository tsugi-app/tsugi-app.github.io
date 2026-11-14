# 츠기 (TSUGI) — 작업 규칙

츠기는 "이미 짠 일본 여행 일정에 끼울 한 곳"을 고르는 정적 웹앱이다. 서버 없음. 한 코드베이스를 GitHub Pages(웹)와 앱인토스(.ait)로 두 번 빌드한다.

## 구조
- `app/` — Vite + React 18 + TypeScript. 화면 4개(`screens/`), 공용 로직은 `lib/`.
- 지역은 도시 → 동네 2단계. 목록은 `app/src/lib/labels.json` 한 곳(도시 5곳: 도쿄·오사카·교토·후쿠오카·삿포로, 동네마다 소속 도시). 카드(place)에는 `hood`만 쓰고 도시는 거기서 정해진다. 앱·검사·공유 페이지·레이더가 모두 이 파일을 읽는다. 동네를 늘릴 땐 이 파일과 `scripts/radar-lib.mjs`의 `AREAS`를 같이 고친다. 장소가 없는 도시·동네는 화면 칩과 공유 페이지에 나오지 않는다.
- `docs/DESIGN.md` — UI/UX 가이드라인(당근 SEED 기반). 화면·컴포넌트·문구를 바꿀 땐 먼저 이 문서를 따른다.
- `docs/IMAGES.md` — 장소 대표 이미지(Claude가 그린 SVG) 화풍·팔레트·캔버스·검토 규칙.
- `content/` — 장소·소식·편집 판단·확인 기록 JSON. 장소 1개 = 파일 1개.
- `scripts/` — `validate.mjs`(규칙 검사), `build-content.mjs`(→ `app/public/content.json`), `build-share.mjs`(vite build 뒤 `dist/p/<id>/`·`dist/c/<도시|동네|취향>/`에 OG 미리보기 페이지 생성, 웹 채널만). 의존성 없는 Node 스크립트.
- `.github/workflows/` — `ci.yml`(PR 검사), `deploy-pages.yml`(main → Pages, 매일 03:00 KST 재빌드), `recheck.yml`(매주 월 재확인 이슈), `radar.yml`(10분마다 후보 레이더), `watchdog.yml`(매일: 레이더 24시간 무실행·리포 50일 무활동이면 이슈).

## 후보 레이더
- `scripts/radar.mjs`가 PR TIMES 공식 RSS와 뉴스 사이트맵(발표사 키워드)을 10분마다 읽어, 본사 주소를 지운 뒤 지역어(渋谷·梅田·祇園·天神·すすきの… 동네·시설 이름. 도시 이름은 넣지 않는다)와 소식어(オープン·期間限定…)가 함께 있는 보도자료를 이번 주 `radar` 라벨 이슈에 댓글로 쌓는다. 판정 규칙은 `scripts/radar-lib.mjs` 한 곳.
- 레이더는 후보만 모은다. 카드(content/)를 자동으로 만들거나 바꾸지 않는다.
- "레이더에서 체크한 후보로 카드 초안"을 요청받으면: 이번 주 레이더 이슈의 체크된 항목을 읽고, 각 보도자료와 공식 페이지에서 날짜·장소를 확인해 place·update·take·check를 쓰고 PR을 연다. 확인 못 한 값은 비우고 `uncertain`에 적는다. 아래 「Claude 카드 검토」를 마치면 CI 통과 후 Claude가 바로 병합(=발행)한다. 사용자 검토를 기다리지 않는다 (2026-11-09 사용자 결정).
- X·야후 리얼타임 검색·LINE은 자동 수집하지 않는다(API 유료·비공개·약관 위험). 편집자가 직접 열어 참고만 한다.

## 하지 않는 것
- 백엔드 서버, DB, 계정, 알림을 추가하지 않는다. 저장은 `lib/storage.ts`의 localStorage뿐이다. 사파리가 7일 미방문 시 지울 수 있어서, 저장 목록은 `#/saved?keep=…` 보관 링크(`lib/savedLink.ts`)로 옮길 수 있게 한다.
- 라이브러리를 늘리지 않는다. 허용: react, react-dom, vite, typescript, vitest, `@apps-in-toss/web-framework`(앱인토스 SDK, 버전 고정 — 2026-11-14 사용자 결정. `lib/channel.ts`에서만 동적 import로 부르고 웹 번들에는 실리지 않는다). 지도는 maplibre-gl만(OpenFreeMap 타일, 2026-11-09 leaflet에서 교체 — 사용자 결정). 지도 서비스는 상업 이용 무료·한도 없음인 곳만 쓴다(docs/MAP_PLAN.md).
- 콘텐츠의 날짜·가격·예약 조건을 출처 없이 채우지 않는다. 모르면 비우고 `checks/*.json`의 `uncertain`에 적는다.
- 컴포넌트에 색 코드를 직접 쓰지 않는다. 색·글꼴·간격·모서리는 `app/src/styles/tokens.css`에서만, 컴포넌트는 `--color-*` 시맨틱 토큰만 쓴다. 아이콘은 `components/Icon.tsx`의 인라인 SVG.
- 분석 호출은 `lib/analytics.ts`의 `track()`을 통해서만. 웹은 PostHog Cloud 수집 API에 직접 POST한다(SDK 없음, 쿠키 없음). 이벤트·속성이나 기기 저장 항목을 바꾸면 `screens/Privacy.tsx`(`#/privacy`)의 처리방침과 시행일도 같이 고친다. 채널 분기는 `lib/channel.ts`와 `lib/analytics.ts` 두 곳에서만.
- 다크 모드는 웹만. 기본은 기기 설정을 따르고, 설정 화면(`#/settings`)에서 시스템·라이트·다크를 고를 수 있다(`lib/storage.ts`의 `tsugi:theme`). 앱인토스는 다크 모드를 지원하지 않아 라이트로 고정하고 설정의 테마 항목을 숨긴다(`lib/channel.ts`의 `SUPPORTS_THEME`·`applyColorMode`). 다크 색 값은 `tokens.css`의 `[data-theme='dark']` 블록에만 쓴다.

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
  3. take의 `why`는 80자 이내, 금지 문구 없음. `why`·`notFor`·`differsFrom`은 해요체·마침표 없음, `forWhom`은 「~ 사람」(docs/DESIGN.md 4.1). `notFor`는 출처에서 읽히는 사실(휴무·입장 제한·연령 등)에 기댄다.
  4. 행사 장소가 카드의 `hood` 동네가 맞다 (`labels.json`에 있는 동네, 본사 주소·다른 지역 순회지 아님).
  5. 검토를 마친 날짜가 `checkedAt`, 행사 시작 전이나 기간 중간이 `recheckBy`.
  6. `evergreen` 카드의 take에는 날짜·회기·이번 전시 내용을 쓰지 않는다. 행사가 끝나도 편집 추천으로 남기 때문이다. 그런 내용은 update의 `note`에 쓰고, take에는 장소가 오래 가진 성격만 남긴다.
  7. 장소 공식 페이지가 접속을 막거나(봇 확인·연결 끊김·403) 게시가 없으면, 그 사유를 `uncertain`에 구체적으로 적는다. 재확인 때 편집자가 직접 열어 볼 곳이다.
- 취향 태그는 `cafe`·`design`·`goods`·`walk`·`food`(먹거리: 술집·노포 간식 등 식사 중심 가게). 목록은 `labels.json`의 `tag`와 `scripts/lib.mjs`의 `TAGS`를 같이 고친다.
- take의 `why`는 80자 이내, "핫한·인생·현지인만" 금지.
- 이미지는 `credit`·`license` 없이 넣지 않는다. 대표 이미지는 Claude(Opus)가 그린 SVG만 쓰고, 그리기 전에 `docs/IMAGES.md`를 따른다.

## 커밋
- 커밋은 사용자 본인의 git 계정(erabi-pecu)으로 한다. GitHub 예약 실행은 워크플로의 cron 줄을 마지막으로 수정한 사용자 기준으로 돌기 때문에, 리포 권한이 없는 계정(예: `noreply@anthropic.com` → `claude` 계정)으로 cron 줄을 커밋하면 레이더·재빌드가 멈춘다. `git config user.email`이 `306176449+erabi-pecu@users.noreply.github.com`인지 확인하고 시작한다.
- 남은 작업 목록은 GitHub 이슈 `next` 라벨에 있다. 시작할 때 `gh issue list --label next`로 확인한다.

작업 브랜치 → PR → CI 통과 → main 병합. main 병합이 곧 웹 배포다. 앱인토스는 `cd app && npm run build:toss`로 만든 `app/tsugi.ait`를 콘솔에 수동 업로드한다. 카드 콘텐츠는 실행 때 Pages의 `content.json`을 받아 쓰므로 콘텐츠만 바뀌면 다시 올리지 않아도 된다.

## 앱인토스 (비게임 출시 체크리스트)
- 설정은 `app/apps-in-toss.config.ts`(`appName: tsugi`, 위치 권한). 토스 분기는 `lib/channel.ts`의 `setupChannel`·`openExternal`·`getPosition`·`sharePlace`·`SHOW_IN_APP_BACK`·`SUPPORTS_KEEP_LINK`.
- 화면 안 뒤로 버튼은 웹만. 토스는 상단 바·시스템 뒤로가기(`backEvent`)를 받아 한 단계 뒤로, 발견 화면이면 미니앱을 닫는다.
- 바깥 링크는 미니앱 안에서 띄우지 않고 `Device.openURL`로 기기 브라우저에 연다. `<a target="_blank">`를 새로 쓰지 않는다.
- 공유는 `intoss://tsugi?p=<placeId>` 공유 링크. 토스 안에서 웹 주소(보관 링크 등)로 내보내지 않는다(자사 서비스 이동 유도 금지).
- 진입 직후 바텀시트·권한 요청을 띄우지 않는다. 위치는 버튼을 누른 뒤에만 묻는다.
