import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Đường dẫn tương đối để bản build chạy được ở mọi thư mục (vd. GitHub Pages).
  base: './',
  build: {
    // Phaser nặng ~1,2 MB; cảnh báo mặc định 500 kB chỉ gây nhiễu.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    // Unit test chỉ cho luật chơi thuần; E2E nằm ở e2e/ và do Playwright chạy.
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
