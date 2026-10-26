// Bot chơi thử: cách chọn nước đi của "người chơi" trong E2E và trong mô phỏng cân bằng
// (`npm run sim`). Một nguồn duy nhất để ván E2E và số đo độ khó luôn cùng một cách chơi.
// Không phải luật chơi — game không dùng file này.
import { nextInt, type RngState } from '../../../shared/random';
import { isInZone } from './arena';
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
 * Người chơi ngắm chuẩn: vũ khí + lát trúng nhiều quái nhất; hòa thì ưu tiên chém quái đang ở gần
 * nhân vật hơn (nguy hiểm hơn); vẫn hòa thì vũ khí và lát đứng trước.
 */
export function bestMove(state: BattleState, config: BattleConfig): Move {
  const byId = new Map(state.monsters.map((m) => [m.id, m]));
  let best: Move = { weaponIndex: 0, sector: 0 };
  let bestHits = -1;
  let bestCloseness = -1;
  config.weapons.forEach((_, weaponIndex) => {
    for (let sector = 0; sector < config.sectorCount; sector++) {
      const ids = hitIds(state, { weaponIndex, sector }, config);
      const closeness = ids.reduce(
        (sum, id) => sum + (config.ringCount - (byId.get(id)?.ring ?? 0)),
        0,
      );
      if (ids.length > bestHits || (ids.length === bestHits && closeness > bestCloseness)) {
        best = { weaponIndex, sector };
        bestHits = ids.length;
        bestCloseness = closeness;
      }
    }
  });
  return best;
}

/**
 * Người chơi chém trượt: một lát không trúng con quái nào — ưu tiên vũ khí đang cầm; quái phủ kín
 * vùng của nó (màn đông quái) thì đổi sang vũ khí khác.
 */
export function missMove(state: BattleState, config: BattleConfig): Move {
  const current = state.weaponIndex;
  const others = config.weapons.map((_, i) => i).filter((i) => i !== current);
  for (const weaponIndex of [current, ...others]) {
    for (let sector = 0; sector < config.sectorCount; sector++) {
      if (hitIds(state, { weaponIndex, sector }, config).length === 0)
        return { weaponIndex, sector };
    }
  }
  throw new Error('Không còn lát trống để chém trượt');
}

/** Người chơi chém bừa: vũ khí và lát ngẫu nhiên (RNG có seed — lặp lại được). */
export function randomMove(rng: RngState, config: BattleConfig): [move: Move, next: RngState] {
  const [weaponIndex, afterWeapon] = nextInt(rng, config.weapons.length);
  const [sector, next] = nextInt(afterWeapon, config.sectorCount);
  return [{ weaponIndex, sector }, next];
}
