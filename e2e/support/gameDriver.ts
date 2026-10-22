// Cách DUY NHẤT để test E2E điều khiển game: chạm màn hình như người chơi, đọc trạng thái qua
// window.__PIXEL_GAME__.snapshot(), và tự cầm đồng hồ để kết quả lặp lại 100%.
// E2E chỉ được import kiểu (import type) từ index.ts và hàm thuần từ logic/ — không import view.
import type { Page } from '@playwright/test';
import type { BattleSnapshot } from '../../src/features/battle';
import { isInZone } from '../../src/features/battle/logic/arena';
import { BATTLE_CONFIG } from '../../src/features/battle/logic/battleConfig';

const FRAME_MS = 16;

export class GameDriver {
  constructor(private readonly page: Page) {}

  /** Mở game với seed cố định rồi dừng đồng hồ: từ đây thời gian chỉ trôi khi test cho phép. */
  async open(seed: number): Promise<void> {
    await this.page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await this.page.goto(`/?seed=${seed}`);
    await this.page.waitForFunction(() => window.__PIXEL_GAME__?.snapshot() != null);
    await this.pauseClock();
  }

  /** Dừng đồng hồ ở một mốc ngay phía trước. Máy bận có thể làm mốc đó trôi qua → thử lại. */
  private async pauseClock(): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      const now = await this.page.evaluate(() => Date.now());
      try {
        await this.page.clock.pauseAt(now + 500);
        return;
      } catch (error) {
        const tooLate = error instanceof Error && error.message.includes('past');
        if (!tooLate || attempt >= 3) throw error;
      }
    }
  }

  async snapshot(): Promise<BattleSnapshot> {
    const snapshot = await this.page.evaluate(() => window.__PIXEL_GAME__?.snapshot());
    if (!snapshot) throw new Error('Game chưa sẵn sàng: snapshot rỗng');
    return snapshot as BattleSnapshot;
  }

  /** Cho thời gian trong game trôi thêm. */
  async advance(ms: number): Promise<void> {
    await this.page.clock.runFor(ms);
  }

  /**
   * Cho thời gian trôi tới khi vùng xanh chỉ vào `sector`: tính trước rồi nhảy một lần tới gần
   * giữa lát đó, sau đó mới dò từng khung hình (mỗi lần dò là một lượt hỏi trình duyệt — tốn).
   */
  async waitArcAt(sector: number): Promise<void> {
    const { arcPeriodMs, sectorCount } = BATTLE_CONFIG;
    const msPerSector = arcPeriodMs / sectorCount;
    const { arcElapsedMs } = await this.snapshot();
    const middleOfTarget = (sector + 0.5) * msPerSector;
    const wait = (middleOfTarget - (arcElapsedMs % arcPeriodMs) + arcPeriodMs) % arcPeriodMs;
    if (wait > 2 * FRAME_MS) await this.advance(wait - FRAME_MS);

    const maxFrames = Math.ceil(arcPeriodMs / FRAME_MS);
    for (let frame = 0; frame < maxFrames; frame++) {
      if ((await this.snapshot()).arcSector === sector) return;
      await this.advance(FRAME_MS);
    }
    throw new Error(`Vùng xanh không tới lát ${sector} sau ${maxFrames} khung hình`);
  }

  /** Chạm giữa màn hình bằng ngón tay (cảm ứng), như trên điện thoại. */
  async tap(): Promise<void> {
    const box = await this.page.locator('canvas').boundingBox();
    if (!box) throw new Error('Không thấy canvas của game');
    await this.page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }

  /** Chờ vùng xanh tới `sector` rồi chạm — một nhát đánh có chủ đích. */
  async attackAt(sector: number): Promise<void> {
    await this.waitArcAt(sector);
    await this.tap();
  }
}

/** Số quái sẽ trúng nếu ngắm vào `sector`. */
function hitsAt(snapshot: BattleSnapshot, sector: number): number {
  const { weapon, sectorCount } = BATTLE_CONFIG;
  return snapshot.battle.monsters.filter((m) => isInZone(m, sector, weapon, sectorCount)).length;
}

/** Lát trúng nhiều quái nhất (hòa thì lấy lát nhỏ nhất) — người chơi ngắm chuẩn. */
export function bestAim(snapshot: BattleSnapshot): number {
  let best = 0;
  for (let sector = 1; sector < BATTLE_CONFIG.sectorCount; sector++) {
    if (hitsAt(snapshot, sector) > hitsAt(snapshot, best)) best = sector;
  }
  return best;
}

/** Một lát không trúng con quái nào — người chơi chém trượt. */
export function missAim(snapshot: BattleSnapshot): number {
  for (let sector = 0; sector < BATTLE_CONFIG.sectorCount; sector++) {
    if (hitsAt(snapshot, sector) === 0) return sector;
  }
  throw new Error('Không còn lát trống để chém trượt');
}
