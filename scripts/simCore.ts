// Lõi mô phỏng cân bằng — dùng chung cho `npm run sim` và các script dò số tạm (vd. .cache/*.ts thử
// nhiều bộ con số rồi chọn bộ gần mục tiêu nhất). Chỉ gọi luật thuần trong logic/: cùng seed cùng kết quả.
import { seedRng, type RngState } from '../src/shared/random';
import { bestMove, randomMove, type Move } from '../src/features/battle/logic/autoPlay';
import {
  canCastSkill,
  castSkill,
  createBattle,
  playTurn,
  selectWeapon,
} from '../src/features/battle/logic/battle';
import type {
  BattleConfig,
  BattleState,
  Loadout,
  SkillKind,
} from '../src/features/battle/logic/battleTypes';
import { allLoadouts, allWeapons } from '../src/features/battle/logic/loadout';

/** Kiểu chơi: chọn nước đi từ trạng thái trận và trạng thái ngẫu nhiên riêng của người chơi. */
export type Player = (state: BattleState, rng: RngState, config: BattleConfig) => [Move, RngState];

export const PLAYERS: Record<string, Player> = {
  'Ngắm chuẩn': (state, rng, config) => [bestMove(state, config), rng],
  'Chém bừa': (state, rng, config) => randomMove(state, rng, config),
};

export interface LevelResult {
  readonly games: number;
  readonly won: number;
  /** Tổng số lượt còn dư của các ván thắng. */
  readonly spareTurns: number;
  readonly lostOutOfTurns: number;
  readonly lostDefeated: number;
}

/** Một ván: bot bấm skill ngay khi đầy (B6, không tốn lượt), rồi đổi vũ khí nếu cần và chém. */
export function playGame(
  seed: number,
  level: number,
  loadout: Loadout,
  player: Player,
  config: BattleConfig,
): BattleState {
  let state = createBattle(seed, config, level, loadout);
  // Ngẫu nhiên của người chơi tách khỏi ngẫu nhiên của trận, để đổi cách chơi không đổi ván.
  let rng = seedRng(seed + 1_000_000);
  while (state.phase === 'playing') {
    if (canCastSkill(state, config)) {
      state = castSkill(state, config);
      if (state.phase !== 'playing') break;
    }
    const [move, next] = player(state, rng, config);
    rng = next;
    if (move.weaponIndex !== state.weaponIndex) {
      state = selectWeapon(state, move.weaponIndex, config);
    }
    state = playTurn(state, move.sector, config);
  }
  return state;
}

/** Chơi `games` ván (seed 1…games) của một màn với một bộ đồ và một kiểu chơi. */
export function simulateLevel(
  level: number,
  loadout: Loadout,
  player: Player,
  config: BattleConfig,
  games: number,
): LevelResult {
  let won = 0;
  let spareTurns = 0;
  let lostOutOfTurns = 0;
  let lostDefeated = 0;
  for (let seed = 1; seed <= games; seed++) {
    const end = playGame(seed, level, loadout, player, config);
    if (end.phase === 'won') {
      won++;
      spareTurns += end.turnsLeft;
    } else if (end.lossReason === 'heroDefeated') {
      lostDefeated++;
    } else {
      lostOutOfTurns++;
    }
  }
  return { games, won, spareTurns, lostOutOfTurns, lostDefeated };
}

/**
 * Mọi bộ đồ mang được vào màn `level`: mọi cách ghép vũ khí (B4) × mọi skill nếu màn đã mở skill (B6),
 * hoặc không skill nếu chưa.
 */
export function loadoutsForLevel(level: number, config: BattleConfig): Loadout[] {
  const weaponSets = allLoadouts(config, allWeapons(config));
  if (level < config.skillUnlockLevel) return weaponSets;
  const skills = Object.keys(config.skills) as SkillKind[];
  return weaponSets.flatMap((loadout) => skills.map((skill) => ({ ...loadout, skill })));
}

export function loadoutName(loadout: Loadout, config: BattleConfig): string {
  const weapons = loadout.weapons.map((index) => config.weapons[index]?.name).join('+');
  return loadout.skill === undefined
    ? weapons
    : `${weapons} · ${config.skills[loadout.skill].name}`;
}

export const winRate = (r: LevelResult) => r.won / r.games;
export const averageSpare = (r: LevelResult) => (r.won === 0 ? 0 : r.spareTurns / r.won);
