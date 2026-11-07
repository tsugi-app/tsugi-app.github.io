import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 사용자 사이트(tsugi-app.github.io)라 base는 '/'.
// 앱인토스 번들도 같은 설정으로 빌드한다 (VITE_CHANNEL=toss).
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { outDir: 'dist', sourcemap: false },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
