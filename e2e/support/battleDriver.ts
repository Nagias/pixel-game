// Phần điều khiển riêng của tính năng "battle" (F01–F06): đổi vũ khí, ngắm vùng xanh, chém.
// B4: màn chuẩn bị trận — chọn món, chạm "VÀO TRẬN".
import type { BattleSnapshot, LoadoutSnapshot } from '../../src/features/battle';
import * as autoPlay from '../../src/features/battle/logic/autoPlay';
import type { Move } from '../../src/features/battle/logic/autoPlay';
import { BATTLE_CONFIG } from '../../src/features/battle/logic/battleConfig';
import type { SkillKind } from '../../src/features/battle/logic/battleTypes';
import {
  barButtonCount,
  skillButtonIndex,
  WEAPON_BAR,
  weaponButtonRects,
} from '../../src/features/battle/view/battleLayout';
import { LOADOUT_LAYOUT, optionRects } from '../../src/features/battle/view/loadoutLayout';
import { GameDriver } from './gameDriver';

const FRAME_MS = 16;
/** Đổi scene (scene.start) cần vài khung hình mới xong. */
const SCENE_SWITCH_MS = 100;

export type { Move };

export class BattleDriver extends GameDriver {
  /**
   * Mở game ở màn chuẩn bị với seed cố định để ván chơi lặp lại y hệt; `level` (đếm từ 1) mở thẳng
   * màn đó qua `?level=`.
   */
  async openLoadout(seed: number, level?: number): Promise<void> {
    await this.open(`/?seed=${seed}${level === undefined ? '' : `&level=${level}`}`);
  }

  /** Mở game rồi vào trận ngay với bộ đồ mặc định. */
  async openBattle(seed: number, level?: number): Promise<void> {
    await this.openLoadout(seed, level);
    await this.startBattle();
  }

  snapshot(): Promise<BattleSnapshot> {
    return this.snapshotOf<BattleSnapshot>('battle');
  }

  loadoutSnapshot(): Promise<LoadoutSnapshot> {
    return this.snapshotOf<LoadoutSnapshot>('loadout');
  }

  /** Cho vài khung hình chạy để scene vừa gọi scene.start() kịp mở. */
  async waitSceneSwitch(): Promise<void> {
    await this.advance(SCENE_SWITCH_MS);
  }

  /** Màn chuẩn bị vừa mở chưa nhận chạm (chống chạm nhầm): cho thời gian trôi tới khi nhận. */
  async waitLoadoutReady(): Promise<LoadoutSnapshot> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const snapshot = await this.loadoutSnapshot();
      if (snapshot.canTap) return snapshot;
      await this.advance(SCENE_SWITCH_MS);
    }
    throw new Error('Màn chuẩn bị không nhận chạm sau 2 giây');
  }

  /** Màn chuẩn bị: chạm nút của vũ khí `weaponIndex` (chỉ số trong config.weapons). */
  async chooseWeapon(weaponIndex: number): Promise<void> {
    const { rows } = await this.waitLoadoutReady();
    const row = rows.findIndex((r) => r.weapons.includes(weaponIndex));
    const rowInfo = rows[row];
    if (!rowInfo) throw new Error(`Màn chuẩn bị không có vũ khí số ${weaponIndex}`);
    const rect = optionRects(row, rowInfo.weapons.length, LOADOUT_LAYOUT)[
      rowInfo.weapons.indexOf(weaponIndex)
    ];
    if (!rect) throw new Error(`Không có nút cho vũ khí số ${weaponIndex}`);
    await this.tapAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  /** B6: màn chuẩn bị — chạm nút skill `skill` ở hàng skill (ngay dưới các hàng vũ khí). */
  async chooseSkill(skill: SkillKind): Promise<void> {
    const { rows, skills } = await this.waitLoadoutReady();
    const rect = optionRects(rows.length, skills.length, LOADOUT_LAYOUT)[skills.indexOf(skill)];
    if (!rect) throw new Error(`Màn chuẩn bị không có nút skill "${skill}"`);
    await this.tapAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  /** B6: chạm ô skill cuối thanh nút (bấm skill nếu đã đầy; chưa đầy thì không có gì xảy ra). */
  async castSkill(): Promise<void> {
    const { loadout } = (await this.snapshot()).battle;
    const index = skillButtonIndex(loadout);
    const rect =
      index === null ? undefined : weaponButtonRects(barButtonCount(loadout), WEAPON_BAR)[index];
    if (!rect) throw new Error('Trận này không mang skill');
    await this.tapAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  /** Màn chuẩn bị: chạm "VÀO TRẬN", chờ scene trận mở. */
  async startBattle(): Promise<void> {
    await this.waitLoadoutReady();
    const { start } = LOADOUT_LAYOUT;
    await this.tapAt(start.x + start.width / 2, start.y + start.height / 2);
    await this.waitSceneSwitch();
    await this.snapshot();
  }

  /** Chạm vào nút của vũ khí `weaponIndex` (chỉ số trong config.weapons) ở đáy màn hình. */
  async selectWeapon(weaponIndex: number): Promise<void> {
    const { loadout } = (await this.snapshot()).battle;
    const rect = weaponButtonRects(barButtonCount(loadout), WEAPON_BAR)[
      loadout.weapons.indexOf(weaponIndex)
    ];
    if (!rect) throw new Error(`Không mang vũ khí số ${weaponIndex} vào trận`);
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

/** Id các quái sẽ trúng nếu chém bằng vũ khí `move.weaponIndex` vào lát `move.sector`. */
export function hitIds(snapshot: BattleSnapshot, move: Move): number[] {
  return autoPlay.hitIds(snapshot.battle, move, BATTLE_CONFIG);
}

/** Người chơi ngắm chuẩn — cùng bot với mô phỏng cân bằng (`npm run sim`). */
export function bestMove(snapshot: BattleSnapshot): Move {
  return autoPlay.bestMove(snapshot.battle, BATTLE_CONFIG);
}

/** Người chơi chém trượt: một lát không trúng con quái nào. */
export function missMove(snapshot: BattleSnapshot): Move {
  return autoPlay.missMove(snapshot.battle, BATTLE_CONFIG);
}
