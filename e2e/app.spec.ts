// Vỏ ứng dụng: game khởi động được trong trình duyệt và mở cầu nối cho test.
import { expect, test } from '@playwright/test';

test('game khởi động: có khung vẽ và cầu nối cho test E2E', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => typeof window.__PIXEL_GAME__?.snapshot)).toBe('function');
  expect(errors).toEqual([]);
});
