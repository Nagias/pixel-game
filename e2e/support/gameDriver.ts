// Cách DUY NHẤT để test E2E điều khiển game: chạm/bấm phím như người chơi, đọc trạng thái qua
// window.__PIXEL_GAME__.snapshot(), và tự cầm đồng hồ ảo để kết quả lặp lại 100%.
// Phần chung cho mọi tính năng ở đây; phần riêng của từng tính năng ở e2e/support/<f>Driver.ts.
// E2E chỉ được import kiểu (import type) từ index.ts và hàm thuần từ logic/ — không import view.
import type { Page } from '@playwright/test';

/** Nhịp phím tự lặp khi giữ phím trên Windows/macOS (khoảng 30–35 ms). */
const KEY_REPEAT_MS = 35;

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

  /** Chạm giữa màn hình bằng ngón tay (cảm ứng), như trên điện thoại. */
  async tap(): Promise<void> {
    const box = await this.page.locator('canvas').boundingBox();
    if (!box) throw new Error('Không thấy canvas của game');
    await this.page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }

  /**
   * Giữ một phím: lần nhấn đầu là thật, các lần sau là phím tự lặp (repeat) như khi giữ tay.
   * Giữa các lần lặp cho thời gian trôi đúng nhịp lặp phím của hệ điều hành; bấm dồn cùng một
   * khoảnh khắc thì Phaser coi là trùng lặp và gộp lại — không giống tay người.
   */
  async holdKey(key: string, presses: number): Promise<void> {
    for (let i = 0; i < presses; i++) {
      await this.page.keyboard.down(key);
      await this.advance(KEY_REPEAT_MS);
    }
    await this.page.keyboard.up(key);
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
