// Bot chơi thử: cách chọn nước đi của "người chơi" trong E2E và trong mô phỏng cân bằng
// (`npm run sim`). Một nguồn duy nhất để ván E2E và số đo độ khó luôn cùng một cách chơi.
// Không phải luật chơi — game không dùng file này.
import { nextInt, seedRng, type RngState } from '../../../shared/random';
import { isInZone } from './arena';
import { canCastSkill, castSkill, playTurn, selectWeapon, willAttack } from './battle';
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

/** Một lượt của bot: có bấm skill trước không (B6, không tốn lượt), rồi chém thế nào. */
export interface TurnPlan {
  readonly cast: boolean;
  readonly move: Move;
}

// Trọng số chấm điểm của bot nhìn trước — agent dò bằng mô phỏng 27/10/2026 (đợt 0): coi trọng máu
// quái còn lại nhất; máu nhân vật và quái sắp đánh nhẹ hơn (nặng hơn thì bot chơi rụt rè, thua hết
// lượt ở màn 5). Không phải con số cân bằng của game: chỉ đổi cách bot chơi.
const WEIGHT_HERO_HP = 1;
const WEIGHT_THREAT = 0.5;
/** Skill đang nạp đáng bằng ngần này phần sát thương nó sẽ gây — để bot biết giữ skill. */
const WEIGHT_STORED_SKILL = 0.7;
/** Số tương lai giả lập cho mỗi nước thử. */
const LOOKAHEAD_SAMPLES = 3;
const WIN_SCORE = 1_000;

/**
 * Điểm một trạng thái sau lượt: thắng (càng dư lượt càng tốt) hơn mọi thứ, thua kém mọi thứ; còn
 * lại = máu nhân vật − quái sắp đánh − máu quái còn lại (trừ phần skill đang nạp sẽ gây).
 */
function scoreState(state: BattleState, config: BattleConfig): number {
  if (state.phase === 'won') return WIN_SCORE + state.turnsLeft;
  if (state.phase === 'lost') return -WIN_SCORE;
  const monsterHp = state.monsters.reduce((sum, m) => sum + m.hp, 0);
  const threat = state.monsters
    .filter((m) => willAttack(m, config))
    .reduce((sum, m) => sum + config.monsterKinds[m.kind].attack, 0);
  const kind = state.loadout.skill;
  const stored =
    kind === undefined
      ? 0
      : (state.skillCharge / config.skills[kind].chargeTurns) *
        config.skills[kind].damage *
        state.monsters.length;
  return (
    WEIGHT_HERO_HP * state.heroHp -
    WEIGHT_THREAT * threat -
    (monsterHp - WEIGHT_STORED_SKILL * stored)
  );
}

/**
 * Người chơi nhìn trước 1 lượt: thử mọi nước khác nhau (vũ khí đã mang × nhóm quái trúng, có/không
 * bấm skill khi đầy) trên vài tương lai giả lập — sinh từ ngẫu nhiên RIÊNG của người chơi, không nhìn
 * trộm ngẫu nhiên của trận — rồi chọn nước có điểm trung bình cao nhất (scoreState).
 */
export function lookaheadTurn(
  state: BattleState,
  rng: RngState,
  config: BattleConfig,
): [plan: TurnPlan, next: RngState] {
  const futures: RngState[] = [];
  let next = rng;
  for (let i = 0; i < LOOKAHEAD_SAMPLES; i++) {
    let value: number;
    [value, next] = nextInt(next, 2 ** 32);
    futures.push(seedRng(value));
  }
  const starts: { cast: boolean; state: BattleState }[] = [{ cast: false, state }];
  if (canCastSkill(state, config)) starts.push({ cast: true, state: castSkill(state, config) });

  let best: TurnPlan = { cast: false, move: bestMove(state, config) };
  let bestScore = -Infinity;
  for (const start of starts) {
    if (start.state.phase === 'won') return [{ cast: true, move: best.move }, next];
    const seen = new Set<string>();
    for (const weaponIndex of start.state.loadout.weapons) {
      for (let sector = 0; sector < config.sectorCount; sector++) {
        const move = { weaponIndex, sector };
        const ids = hitIds(start.state, move, config);
        // Chém trượt thì vũ khí nào cũng như nhau; cùng vũ khí cùng nhóm quái trúng thì như nhau.
        const key = ids.length === 0 ? 'trượt' : `${weaponIndex}:${ids.join(',')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const armed =
          weaponIndex === start.state.weaponIndex
            ? start.state
            : selectWeapon(start.state, weaponIndex, config);
        let total = 0;
        for (const future of futures) {
          total += scoreState(playTurn({ ...armed, rng: future }, sector, config), config);
        }
        if (total > bestScore) {
          bestScore = total;
          best = { cast: start.cast, move };
        }
      }
    }
  }
  return [best, next];
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
