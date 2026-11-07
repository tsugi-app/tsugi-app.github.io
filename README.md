# 츠기 (TSUGI)

**다음 일본 여행에 넣을 한 곳.** 유명한 곳은 이미 아는 사람에게, 이번 여행에 추가할 이유가 있는 한 곳을 고르게 돕는 서비스.

- 웹: https://tsugi-app.github.io
- 앱인토스: `intoss://tsugi` (준비 중)

## 개발

```sh
cd app
npm install
npm run dev        # content.json 생성 후 Vite dev 서버
npm run validate   # content/ 규칙 검사
npm test           # 날짜·만료 로직 단위 테스트
npm run build      # 검사 → 타입 체크 → dist/
```

처음 `npm install`을 하면 `package-lock.json`이 생긴다. 그 파일을 커밋한 뒤 워크플로의 `npm install`을 `npm ci`로 바꾼다.

## 콘텐츠 추가

`content/` 아래에 네 파일을 만들고 PR을 연다. 규칙은 [CLAUDE.md](CLAUDE.md)와 `scripts/validate.mjs`에 있다.

| 폴더 | 한 파일 = | 필수 |
| --- | --- | --- |
| `places/<id>.json` | 장소 | id, name.ko, hood, category, tags, geo |
| `updates/<id>.json` | 소식(새로 오픈·기간 한정·최근 변화) | placeId, type, start, source (limited는 end) |
| `takes/<placeId>.json` | 편집 판단 | placeId, why |
| `checks/<placeId>.json` | 확인 기록 | placeId, checkedAt, checkedBy |

`content/places/sample-*.json`은 화면 확인용 샘플이다. 첫 실제 카드가 들어오면 지운다.

## 배포

- `main`에 병합되면 GitHub Actions가 Pages에 배포한다. 매일 03:00 KST에도 재빌드한다.
- 앱인토스는 `VITE_CHANNEL=toss npm run build`로 만든 `.ait` 번들을 콘솔에 올린다 (SDK 연동은 D8 예정).

## 라이선스

코드: MIT. `content/`의 글과 이미지는 별도 — 각 파일의 `credit`·`license`를 따른다.
