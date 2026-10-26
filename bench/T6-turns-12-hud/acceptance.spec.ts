// Test ẩn của việc mẫu T6 (bench/) — không chấm điểm: chỉ chụp thanh trên cùng làm bằng chứng chung
// cho giám khảo (chữ có đè nhau không). Ảnh nằm ở thư mục kết quả của test, đường dẫn in ra log.
import { expect, test } from '@playwright/test';
import { BattleDriver } from './support/battleDriver';

test('bench T6: chụp thanh trên cùng khi mở trận', async ({ page }) => {
  const game = new BattleDriver(page);
  await game.openBattle(42);
  await game.advance(50); // đồng hồ ảo đang dừng: cho game vẽ xong khung hình rồi mới chụp

  const canvas = await page.locator('canvas').boundingBox();
  if (!canvas) throw new Error('Không thấy canvas của game');
  const path = test.info().outputPath('T6-hud.png');
  // Thanh trên cùng nằm trong 1/6 chiều cao khung game (HUD ở y ≈ 16–70 trên khung 640).
  await page.screenshot({
    path,
    clip: { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height / 6 },
  });
  console.log(`T6-hud: ${path}`);
  expect((await game.snapshot()).battle.phase).toBe('playing');
});
