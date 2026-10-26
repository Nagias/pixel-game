// Bot chơi thử: cách chọn nước đi của "người chơi" trong E2E và trong mô phỏng cân bằng
// (`npm run sim`). Một nguồn duy nhất để ván E2E và số đo độ khó luôn cùng một cách chơi.
// Không phải luật chơi — game không dùng file này.
import { nextInt, type RngState } from '../../../shared/random';
import { isInZone } from './arena';
import { willAttack } from './battle';
import type { BattleConfig, BattleState } from './battleTypes';

/** Một nước đi: cầm vũ khí nào, chém vào lát nào. */
export interface Move {
  readonly weaponIndex: number;
  readonly sector: number;
}

/** Id các quái sẽ trúng nếu chém bằng vũ khí `move.weaponIndex` vào lát `move.sector`. */
export function hitIds(state: BattleState, move: Move, config: BattleConfig): number[] {
  const weapon = config.weapons[move.weaponIndex];
  if (!weapon) throw new Error(`Không có vũ khí số ${move.weaponIndex}`);
  return state.monsters
    .filter((m) => isInZone(m, move.sector, weapon, config.sectorCount))
    .map((m) => m.id);
}

/**
 * Người chơi ngắm chuẩn: trước hết chém trúng nhiều quái bắn đang có "!" nhất (B3 — hạ hoặc làm nó
 * choáng; quái đang bị đóng băng thì không — B6); rồi vũ khí + lát trúng nhiều quái nhất; hòa thì
 * ưu tiên quái đang ở gần nhân vật hơn (nguy hiểm hơn); vẫn hòa thì vũ khí và lát đứng trước. B4: chỉ
 * xét vũ khí đã mang vào trận. B6: bấm skill thì xem canCastSkill (bot bấm ngay khi đầy).
 */
export function bestMove(state: BattleState, config: BattleConfig): Move {
  const byId = new Map(state.monsters.map((m) => [m.id, m]));
  const aimingShooters = new Set(
    state.monsters
      .filter((m) => config.monsterKinds[m.kind].shootRing !== undefined && willAttack(m, config))
      .map((m) => m.id),
  );
  let best: Move = { weaponIndex: state.weaponIndex, sector: 0 };
  let bestScore = [-1, -1, -1];
  for (const weaponIndex of state.loadout.weapons) {
    for (let sector = 0; sector < config.sectorCount; sector++) {
      const ids = hitIds(state, { weaponIndex, sector }, config);
      const score = [
        ids.filter((id) => aimingShooters.has(id)).length,
        ids.length,
        ids.reduce((sum, id) => sum + (config.ringCount - (byId.get(id)?.ring ?? 0)), 0),
      ];
      const better = score.findIndex((value, i) => value !== bestScore[i]);
      if (better !== -1 && (score[better] ?? 0) > (bestScore[better] ?? 0)) {
        best = { weaponIndex, sector };
        bestScore = score;
      }
    }
  }
  return best;
}

/**
 * Người chơi chém trượt: một lát không trúng con quái nào — ưu tiên vũ khí đang cầm; quái phủ kín
 * vùng của nó (màn đông quái) thì đổi sang vũ khí khác đã mang.
 */
export function missMove(state: BattleState, config: BattleConfig): Move {
  const current = state.weaponIndex;
  const others = state.loadout.weapons.filter((i) => i !== current);
  for (const weaponIndex of [current, ...others]) {
    for (let sector = 0; sector < config.sectorCount; sector++) {
      if (hitIds(state, { weaponIndex, sector }, config).length === 0)
        return { weaponIndex, sector };
    }
  }
  throw new Error('Không còn lát trống để chém trượt');
}

/** Người chơi chém bừa: vũ khí đã mang và lát ngẫu nhiên (RNG có seed — lặp lại được). */
export function randomMove(
  state: BattleState,
  rng: RngState,
  config: BattleConfig,
): [move: Move, next: RngState] {
  const { weapons } = state.loadout;
  const [pick, afterWeapon] = nextInt(rng, weapons.length);
  const weaponIndex = weapons[pick] as number;
  const [sector, next] = nextInt(afterWeapon, config.sectorCount);
  return [{ weaponIndex, sector }, next];
}
