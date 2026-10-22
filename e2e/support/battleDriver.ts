// Phần điều khiển riêng của tính năng "battle" (F01): ngắm vùng xanh, chọn lát để chém.
import type { BattleSnapshot } from '../../src/features/battle';
import { isInZone } from '../../src/features/battle/logic/arena';
import { BATTLE_CONFIG } from '../../src/features/battle/logic/battleConfig';
import { GameDriver } from './gameDriver';

const FRAME_MS = 16;

export class BattleDriver extends GameDriver {
  /** Mở trận với seed cố định để ván chơi lặp lại y hệt. */
  async openBattle(seed: number): Promise<void> {
    await this.open(`/?seed=${seed}`);
  }

  snapshot(): Promise<BattleSnapshot> {
    return this.snapshotOf<BattleSnapshot>('battle');
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
