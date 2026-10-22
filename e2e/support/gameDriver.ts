// Cách DUY NHẤT để test E2E điều khiển game: chạm màn hình như người chơi trên điện thoại, đọc
// trạng thái qua window.__PIXEL_GAME__.snapshot(), và tự cầm đồng hồ ảo để kết quả lặp lại 100%.
// Phần chung cho mọi tính năng ở đây; phần riêng của từng tính năng ở e2e/support/<f>Driver.ts.
// E2E chỉ được import kiểu (import type) từ index.ts và file thuần không dùng Phaser
// (logic/, view/<f>Layout.ts) — không import scene.
import type { Page } from '@playwright/test';

export class GameDriver {
  constructor(protected readonly page: Page) {}

  /** Mở game rồi dừng đồng hồ: từ đây thời gian trong game chỉ trôi khi test cho phép. */
  async open(path: string): Promise<void> {
    await this.page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await this.page.goto(path);
    await this.page.waitForFunction(() => window.__PIXEL_GAME__?.snapshot() != null);
    await this.pauseClock();
  }

  /** Đọc trạng thái của scene đang chạy; báo lỗi rõ ràng nếu đang ở scene khác. */
  async snapshotOf<T extends { readonly scene: string }>(scene: T['scene']): Promise<T> {
    const snapshot = await this.page.evaluate(() => window.__PIXEL_GAME__?.snapshot());
    const actual = (snapshot as { scene?: unknown } | null)?.scene;
    if (actual !== scene) {
      throw new Error(`Đang ở scene "${String(actual)}", test cần scene "${scene}"`);
    }
    return snapshot as T;
  }

  /** Cho thời gian trong game trôi thêm. */
  async advance(ms: number): Promise<void> {
    await this.page.clock.runFor(ms);
  }

  /**
   * Chạm bằng ngón tay vào điểm (x, y) tính theo tọa độ của game (khung 360×640), dù màn hình
   * thật to nhỏ thế nào — game co giãn vừa màn hình nên phải đổi sang tọa độ trang.
   */
  async tapAt(gameX: number, gameY: number): Promise<void> {
    const canvas = this.page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Không thấy canvas của game');
    const size = await canvas.evaluate((el: HTMLCanvasElement) => [el.width, el.height] as const);
    await this.page.touchscreen.tap(
      box.x + (gameX * box.width) / size[0],
      box.y + (gameY * box.height) / size[1],
    );
  }

  /** Chạm giữa màn hình — trúng sân đấu, không trúng nút nào. */
  async tap(): Promise<void> {
    const canvas = this.page.locator('canvas');
    const size = await canvas.evaluate((el: HTMLCanvasElement) => [el.width, el.height] as const);
    await this.tapAt(size[0] / 2, size[1] / 2);
  }

  /** Dừng đồng hồ ở một mốc ngay phía trước. Máy bận có thể làm mốc đó trôi qua → thử lại. */
  private async pauseClock(): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const now = await this.page.evaluate(() => Date.now());
      try {
        await this.page.clock.pauseAt(now + 500);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
}
