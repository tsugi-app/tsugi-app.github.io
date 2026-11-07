# 츠기 (TSUGI) — 작업 규칙

츠기는 "이미 짠 일본 여행 일정에 끼울 한 곳"을 고르는 정적 웹앱이다. 서버 없음. 한 코드베이스를 GitHub Pages(웹)와 앱인토스(.ait)로 두 번 빌드한다.

## 구조
- `app/` — Vite + React 18 + TypeScript. 화면 4개(`screens/`), 공용 로직은 `lib/`.
- `content/` — 장소·소식·편집 판단·확인 기록 JSON. 장소 1개 = 파일 1개.
- `scripts/` — `validate.mjs`(규칙 검사), `build-content.mjs`(→ `app/public/content.json`). 의존성 없는 Node 스크립트.
- `.github/workflows/` — `ci.yml`(PR 검사), `deploy-pages.yml`(main → Pages, 매일 03:00 KST 재빌드), `recheck.yml`(매주 월 재확인 이슈).

## 하지 않는 것
- 백엔드 서버, DB, 계정, 알림을 추가하지 않는다. 저장은 `lib/storage.ts`의 localStorage뿐이다.
- 라이브러리를 늘리지 않는다. 허용: react, react-dom, vite, typescript, vitest. 지도는 D6에 leaflet만 추가.
- 콘텐츠의 날짜·가격·예약 조건을 출처 없이 채우지 않는다. 모르면 비우고 `checks/*.json`의 `uncertain`에 적는다.
- 컴포넌트에 색 코드를 직접 쓰지 않는다. 색·글꼴은 `app/src/styles/tokens.css`에서만.
- 분석 호출은 `lib/analytics.ts`의 `track()`을 통해서만. 채널 분기는 `lib/channel.ts`와 `lib/analytics.ts` 두 곳에서만.
- 다크 모드를 만들지 않는다 (앱인토스 미지원, 웹도 라이트만).

## 검사
모든 PR은 `cd app && npm run validate && npm test && npm run build`가 통과해야 한다. 단위 테스트는 날짜 필터·만료·저장 로직에만 쓴다.

## 콘텐츠 규칙 (scripts/validate.mjs가 강제)
- place마다 check(확인일)가 있어야 발행된다. 없으면 빌드 실패.
- `limited` 소식은 `end` 필수. 종료된 소식은 클라이언트에서 자동으로 피드에서 빠진다.
- take의 `why`는 80자 이내, "핫한·인생·현지인만" 금지.
- 이미지는 `credit`·`license` 없이 넣지 않는다.

## 커밋
작업 브랜치 → PR → CI 통과 → main 병합. main 병합이 곧 웹 배포다. 앱인토스는 `VITE_CHANNEL=toss npm run build`로 만든 번들을 콘솔에 수동 업로드한다.
