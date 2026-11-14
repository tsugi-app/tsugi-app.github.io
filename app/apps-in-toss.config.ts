import { defineConfig } from '@apps-in-toss/web-framework/config';

// 앱인토스 번들 설정. `npm run build:toss`가 VITE_CHANNEL=toss로 dist/를 만든 뒤 `ait build`로 .ait를 묶는다.
// appName은 콘솔에 등록한 앱 이름과 같아야 업로드된다 (lib/channel.ts의 TOSS_APP_NAME과 같게).
export default defineConfig({
  appName: 'tsugi',
  // 콘솔 앱 정보의 대표 색. tokens.css의 --palette-ai-600(브랜드 색)과 같게 둔다.
  brand: { primaryColor: '#2d4b8e' },
  // 지도 「내 위치」 버튼을 누를 때만 묻는다.
  permissions: [{ name: 'geolocation', access: 'access' }],
  navigationBar: { withBackButton: true },
  webBundleDir: 'dist',
});
