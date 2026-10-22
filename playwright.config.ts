import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  // Test chập chờn phải được sửa, không được che bằng chạy lại.
  retries: 0,
  forbidOnly: true,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Game làm cho điện thoại trước: test trên khung màn hình điện thoại Android có cảm ứng.
  projects: [{ name: 'phone-chromium', use: { ...devices['Pixel 7'] } }],
  // Chạy bản build thật (dist/) — `npm run e2e` đã build trước.
  webServer: {
    command: 'npm run preview',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
