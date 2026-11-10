# 지도 탭 설계

> 2026-11-09 만들고 같은 날 지도를 국토지리원 타일(Leaflet) → OpenFreeMap(MapLibre)으로 바꿨다.
> 이 문서는 지금 코드 기준이다. Leaflet 시절 계획·메모는 git 기록(이 파일의 2026-11-09 판)에 있다.

목표: **상업적으로 써도 되고, 돈이 들지 않고, 서버 없이** 동작하는 지도 탭.

## 1. 지켜야 할 조건

| 조건 | 출처 | 지도에 주는 뜻 |
|---|---|---|
| 서버·DB·계정 없음 | CLAUDE.md | 타일 서버를 직접 돌리지 않는다. 남이 공개한 타일이나 정적 파일만 쓴다. |
| 지도 라이브러리는 maplibre-gl 하나 | CLAUDE.md | 플러그인(클러스터 등)을 더하지 않는다. |
| 상업 이용 | 앱인토스 출시 | 무료 요금제라도 "비상업 한정"인 곳은 쓸 수 없다. |
| 돈이 들지 않음, 한도 없음 | 사용자 결정 | 호출량 과금·카드 등록·월 한도가 있는 곳은 제외한다. |
| 색은 tokens.css에서만 | CLAUDE.md, DESIGN.md | 마커는 HTML+CSS 클래스, 지도 위 선·원은 토큰 값을 읽어 넣는다. |
| 웹 + 토스 WebView 공용 | CLAUDE.md | 외부 링크·위치는 `lib/channel.ts`(`openExternal`·`getPosition`)로만. |

## 2. 지도 서비스 — OpenFreeMap

- 스타일: `https://tiles.openfreemap.org/styles/positron`, 다크 모드는 `/styles/dark`.
- 고른 이유: 공식 FAQ "Is commercial usage allowed? Yes.", 조회·요청 한도 없음, 가입·키·쿠키 없음, MIT. 데이터는 OpenStreetMap(ODbL) — 출처 표시는 MapLibre가 자동으로 단다.
- 위험: 공개 서버는 기부 운영이라 SLA가 없다. 멈추면 같은 오픈소스 구성으로 **필요한 지역만 잘라 GitHub Pages에 올리는** 길이 있다(비용 0 유지).
- 제외한 곳: 국토지리원 淡色地図(기호·한자 지명이 많아 모바일에서 고지도처럼 보임), CARTO(월 100만 타일 한도), Protomaps 호스팅(상업 조건), 지리원 벡터 타일(시험 공개), OSM 공식 타일(대량 이용 차단 가능), Google Maps JS(과금) — 구글 지도는 「길찾기」 바깥 링크로만 쓴다.

## 3. 화면 (DESIGN.md에 맞춤)

- **주소**: `#/map`(첫 도시의 첫 장소를 가운데), `?city=all`, `?city=…&hood=…`(발견 탭과 같은 `areaFilter`), `?saved=1`(저장한 곳만), `?view=list`(동네별 목록 — 지도가 불편한 사람·스크린리더용 대체 경로).
- **마커**: `.map-pin` 유형색 원, 누르는 영역 44px(`.map-pin-hit`). 같은 좌표(`lib/geo.ts`의 `coordKey`)는 한 마커에 개수를 달고, 누르면 카드 여러 장을 옆으로 넘긴다(scroll-snap).
- **이름 라벨**: 마커 옆 한국어 이름 알약(12px, 최대 132px). `MapView`의 `layoutLabels`가 고른 곳 → 기간 한정 → 새로 오픈 → 최근 변화 → 편집 추천 순으로 자리를 주고, 겹치면 왼쪽, 그래도 겹치면 숨긴다. 줌 14 미만은 숨긴다.
- **미리보기 카드**: 이름·유형 배지·기간·하트·「길찾기」. 누르면 상세. 고른 곳이 화면 밖이면 카드에 가리지 않게 위로 띄워 `easeTo`.
- **짝 장소**(`take.pairWith`): 브랜드색 점선 + 짝 마커 테두리. 카드에 "근처 한 곳 · 이름 · 직선 80m"(30m 미만은 "같은 건물"). 도보 시간은 출처 없는 값이라 쓰지 않는다.
- **내 위치**: 확대·축소 아래 버튼. 누를 때만 묻고(정확도 낮음, 10초 제한, 1분 캐시) 저장하지 않는다. 장소들에서 약 3km 넘게 떨어져 있으면 지도를 옮기지 않고 스낵바로 알린다.
- **종료된 소식만 남은 곳**은 지도에서도 뺀다(발견 피드와 같은 `cardTypeOf`).
- **분석**: 새 이벤트 없이 `place_opened`·`map_opened`·`place_saved`에 `from: 'map'`.

## 4. 구현 메모

- 지도 코드(`components/MapView.tsx`, maplibre-gl JS gzip 약 219KB + CSS 9KB)는 지도 탭에 들어갈 때만 `lazy` import한다. 발견 첫 화면 번들은 늘지 않는다.
- 지명: 스타일을 불러올 때마다 모든 글자 레이어의 `text-field`를 `coalesce(name:ko, name:ja, name)`로 바꾼다.
- 다크 모드: `<html data-theme>`이 바뀌면 `setStyle(…, { diff: false })` — 그래야 `style.load`가 다시 불려 한국어 지명·점선·정확도 원을 다시 얹는다.
- 회전·기울이기는 끈다(`dragRotate`·`touchPitch` false, 두 손가락 회전 끔). 확대·축소 버튼만.
- MapLibre가 마커 `aria-label`을 "Map marker"로 덮어써서 만든 뒤 다시 단다. `.map-pin-hit`에 `position`을 주면 마커 위치가 깨진다.
- 키보드: 마커에 Enter·Space `keydown`을 직접 달고, 마커를 다시 그려도 포커스를 되돌린다. Esc로 카드 닫기. 지도 영역에 스크린리더용 안내, 카드 영역은 `aria-live="polite"`.
- 출처 링크 클릭은 가로채 `openExternal`로 연다(토스 WebView에서 `target=_blank`가 막힐 수 있다).
- 높이: `.app.is-map`은 `min-height: 100dvh`, `overscroll-behavior: none` — iOS Safari의 `100vh` 때문에 지도 보기에서 페이지가 살짝 스크롤되던 것을 막는다.
- 대비: 마커 채움 vs 테두리 라이트 3.96~8.37:1, 다크 7.7~8.91:1(비텍스트 3:1 통과).

## 5. 남은 확인 (사람·환경이 필요)

- [ ] 실제 iPhone Safari·Android Chrome에서 한 손가락 이동, 두 손가락 확대, 카드 옆으로 넘기기.
- [ ] 실제 위치 권한 창(허용·거부)과 현장 위치.
- [ ] 앱인토스 샌드박스: `tiles.openfreemap.org` 타일·글꼴 로딩, WebGL, `navigator.geolocation`(안 되면 `lib/channel.ts`의 `getPosition`을 SDK로), 바깥 링크 열기.
- [ ] 미리보기 카드가 지도 출처 표시를 덮지 않는지.

## 6. 하지 않는 것

- 타일을 미리 내려받아 저장(오프라인 지도).
- 길찾기·도보 시간 계산 — 구글 지도 바깥 링크로 넘긴다.
- 유료·한도 있는 지도 SDK(Google Maps JS, Mapbox 등).

## 참고

- OpenFreeMap: https://openfreemap.org/quick_start/
- OpenStreetMap 저작권: https://www.openstreetmap.org/copyright
