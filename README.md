# 츠기 (TSUGI)

**다음 일본 여행에 넣을 한 곳.** 유명한 곳은 이미 아는 사람에게, 이번 여행에 추가할 이유가 있는 한 곳을 고르게 돕는 서비스.

- 웹: https://tsugi-app.github.io
- 앱인토스: `intoss://tsugi` (출시 준비 중)

## 개발

```sh
cd app
npm ci
npm run dev        # content.json 생성 후 Vite dev 서버
npm run validate   # content/ 규칙 검사
npm test           # 날짜·만료·저장 로직 단위 테스트
npm run build      # content.json → 타입 체크 → dist/ → 공유 페이지
node --test ../scripts/*.test.mjs   # 레이더·감시 판정 테스트
```

| 폴더 | 내용 |
| --- | --- |
| `app/src/screens/` | 화면 (발견·지도·저장·상세·설정·처리방침) |
| `app/src/components/` | 공용 컴포넌트. 장소 카드 조각(배지·하트·썸네일)은 `PlaceParts.tsx` |
| `app/src/lib/` | 날짜·저장·채널·분석 등 로직. 도시·동네·취향 이름은 `labels.json` 한 곳 |
| `content/` | 장소·소식·편집 판단·확인 기록·대표 이미지 |
| `scripts/` | 검사·빌드·레이더·감시 (의존성 없는 Node). 공용 함수는 `lib.mjs` |
| `docs/` | 디자인(`DESIGN.md`)·이미지(`IMAGES.md`)·지도(`MAP_PLAN.md`) 가이드 |

## 콘텐츠 추가

`content/` 아래에 네 파일을 만들고 PR을 연다. 규칙은 [CLAUDE.md](CLAUDE.md)와 `scripts/validate.mjs`에 있다.

| 폴더 | 한 파일 = | 필수 |
| --- | --- | --- |
| `places/<id>.json` | 장소 | id, name.ko, hood, category, tags, geo |
| `updates/<id>.json` | 소식(새로 오픈·기간 한정·최근 변화) | placeId, type, start, source (limited는 end) |
| `takes/<placeId>.json` | 편집 판단 | placeId, why |
| `checks/<placeId>.json` | 확인 기록 | placeId, checkedAt, checkedBy |

대표 이미지는 `content/images/`의 SVG이고 `docs/IMAGES.md`를 따른다.

## 후보 레이더

10분마다 PR TIMES 공식 RSS와 뉴스 사이트맵(발표사 지정 키워드)에서 츠기가 다루는 동네(`app/src/lib/labels.json`)의 새로 오픈·기간 한정·리뉴얼 보도자료를 골라 이번 주 [`radar` 이슈](../../issues?q=label%3Aradar)에 댓글로 쌓는다. 카드로 만들 후보에 체크하고 Claude에게 초안을 요청한다. Claude가 출처를 대조해 검토를 마친 카드는 CI 통과 후 바로 병합·발행된다(`checkedBy: "claude"`).

```sh
node scripts/radar.mjs                 # 지금 후보를 콘솔에 출력 (이슈는 안 건드림)
node --test scripts/radar.test.mjs     # 판정 규칙 테스트
```

엉뚱한 항목이 자주 섞이면 `scripts/radar-lib.mjs`의 `EXCLUDE`에 단어를 추가한다.

## 공유 링크

카톡·X에 붙이면 미리보기가 뜨는 주소. 열면 앱 화면으로 바로 넘어가고, `?c=` 캠페인 값도 넘어간다.

- 장소: `https://tsugi-app.github.io/p/<placeId>/` (상세 화면 「공유」 버튼이 이 주소를 쓴다)
- 주제: `https://tsugi-app.github.io/c/<도시|동네|취향>/` — 예: `/c/omotesando/?c=insta`

미리보기 이미지는 장소 `image`가 있으면 그 사진, 없으면 앱 아이콘 `app/public/icon-1024.png`(정사각, 원본 `app/public/icon.svg` — 다시 만드는 명령은 `scripts/icon/icon.html` 주석)를 쓴다. 둘 다 없으면 글자만 있는 카드가 된다.

## 배포

- `main`에 병합되면 GitHub Actions가 Pages에 배포한다. 매일 03:00 KST에도 재빌드한다.
- 앱인토스는 `cd app && npm run build:toss`로 만든 `app/tsugi.ait`를 콘솔에 올린다. 카드만 바뀐 경우는 다시 올리지 않아도 된다(실행 때 Pages의 `content.json`을 받는다).

## 라이선스

코드: MIT. `content/`의 글과 이미지는 별도 — 각 파일의 `credit`·`license`를 따른다.
