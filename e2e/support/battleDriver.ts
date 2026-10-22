// Phần điều khiển riêng của tính năng "battle" (F01, F02): đổi vũ khí, ngắm vùng xanh, chém.
import type { BattleSnapshot } from '../../src/features/battle';
import { isInZone } from '../../src/features/battle/logic/arena';
import { BATTLE_CONFIG } from '../../src/features/battle/logic/battleConfig';
import { WEAPON_BAR, weaponButtonRects } from '../../src/features/battle/view/battleLayout';
import { GameDriver } from './gameDriver';

const FRAME_MS = 16;

/** Một nước đi của người chơi: cầm vũ khí nào, chém vào lát nào. */
export interface Move {
  readonly weaponIndex: number;
  readonly sector: number;
}

export class BattleDriver extends GameDriver {
  /** Mở trận với seed cố định để ván chơi lặp lại y hệt. */
  async openBattle(seed: number): Promise<void> {
    await this.open(`/?seed=${seed}`);
  }

  snapshot(): Promise<BattleSnapshot> {
    return this.snapshotOf<BattleSnapshot>('battle');
  }

  /** Chạm vào nút vũ khí thứ `index` ở đáy màn hình. */
  async selectWeapon(index: number): Promise<void> {
    const rect = weaponButtonRects(BATTLE_CONFIG.weapons.length, WEAPON_BAR)[index];
    if (!rect) throw new Error(`Không có nút vũ khí số ${index}`);
    await this.tapAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
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

  /** Chờ vùng xanh tới `sector` rồi chạm vào sân — một nhát chém có chủ đích. */
  async attackAt(sector: number): Promise<void> {
    await this.waitArcAt(sector);
    await this.tap();
  }

  /** Thực hiện một nước đi: đổi vũ khí nếu cần, rồi chém. */
  async play(move: Move): Promise<void> {
    if ((await this.snapshot()).battle.weaponIndex !== move.weaponIndex) {
      await this.selectWeapon(move.weaponIndex);
    }
    await this.attackAt(move.sector);
  }
}

/** Id các quái sẽ trúng nếu chém bằng vũ khí `weaponIndex` vào lát `sector`. */
export function hitIds(snapshot: BattleSnapshot, move: Move): number[] {
  const weapon = BATTLE_CONFIG.weapons[move.weaponIndex];
  if (!weapon) throw new Error(`Không có vũ khí số ${move.weaponIndex}`);
  return snapshot.battle.monsters
    .filter((m) => isInZone(m, move.sector, weapon, BATTLE_CONFIG.sectorCount))
    .map((m) => m.id);
}

/**
 * Người chơi ngắm chuẩn: vũ khí + lát trúng nhiều quái nhất; hòa thì ưu tiên chém quái đang ở
 * gần nhân vật hơn (nguy hiểm hơn). Cùng cách chơi với mô phỏng cân bằng ghi ở DEBT-009.
 */
export function bestMove(snapshot: BattleSnapshot): Move {
  const byId = new Map(snapshot.battle.monsters.map((m) => [m.id, m]));
  let best: Move = { weaponIndex: 0, sector: 0 };
  let bestScore = [-1, -1];
  BATTLE_CONFIG.weapons.forEach((_, weaponIndex) => {
    for (let sector = 0; sector < BATTLE_CONFIG.sectorCount; sector++) {
      const ids = hitIds(snapshot, { weaponIndex, sector });
      const closeness = ids.reduce(
        (sum, id) => sum + (BATTLE_CONFIG.ringCount - (byId.get(id)?.ring ?? 0)),
        0,
      );
      const [hits = -1, close = -1] = bestScore;
      if (ids.length > hits || (ids.length === hits && closeness > close)) {
        best = { weaponIndex, sector };
        bestScore = [ids.length, closeness];
      }
    }
  });
  return best;
}

/** Người chơi chém trượt bằng vũ khí đang cầm: một lát không trúng con quái nào. */
export function missMove(snapshot: BattleSnapshot): Move {
  const { weaponIndex } = snapshot.battle;
  for (let sector = 0; sector < BATTLE_CONFIG.sectorCount; sector++) {
    if (hitIds(snapshot, { weaponIndex, sector }).length === 0) return { weaponIndex, sector };
  }
  throw new Error('Không còn lát trống để chém trượt');
}
