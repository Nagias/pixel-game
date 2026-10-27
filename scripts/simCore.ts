// Lõi mô phỏng cân bằng — dùng chung cho `npm run sim` và các script dò số tạm (vd. .cache/*.ts thử
// nhiều bộ con số rồi chọn bộ gần mục tiêu nhất). Chỉ gọi luật thuần trong logic/: cùng seed cùng kết quả.
import { seedRng, type RngState } from '../src/shared/random';
import {
  bestMove,
  lookaheadTurn,
  randomMove,
  type Move,
  type TurnPlan,
} from '../src/features/battle/logic/autoPlay';
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
import { allLoadouts, allWeapons, defaultLoadout } from '../src/features/battle/logic/loadout';

/**
 * Kiểu chơi: chọn có bấm skill không và chém thế nào, từ trạng thái trận và trạng thái ngẫu nhiên
 * riêng của người chơi.
 */
export type Player = (
  state: BattleState,
  rng: RngState,
  config: BattleConfig,
) => [TurnPlan, RngState];

/** Hai kiểu chơi cũ bấm skill ngay khi đầy (B6). */
const castWhenReady =
  (pick: (state: BattleState, rng: RngState, config: BattleConfig) => [Move, RngState]): Player =>
  (state, rng, config) => {
    const cast = canCastSkill(state, config);
    const ready = cast ? castSkill(state, config) : state;
    const [move, next] =
      ready.phase === 'playing' ? pick(ready, rng, config) : [bestMove(state, config), rng];
    return [{ cast, move }, next];
  };

/** Bot giỏi nhất đứng đầu — mục tiêu độ khó (`target` của màn) đo bằng bot này. */
export const PLAYERS: Record<string, Player> = {
  'Nhìn trước': (state, rng, config) => lookaheadTurn(state, rng, config),
  'Ngắm chuẩn': castWhenReady((state, rng, config) => [bestMove(state, config), rng]),
  'Chém bừa': castWhenReady((state, rng, config) => randomMove(state, rng, config)),
};

export interface LevelResult {
  readonly games: number;
  readonly won: number;
  /** Tổng số lượt còn dư của các ván thắng. */
  readonly spareTurns: number;
  readonly lostOutOfTurns: number;
  readonly lostDefeated: number;
}

/** Một ván: mỗi lượt bot có thể bấm skill (B6, không tốn lượt), rồi đổi vũ khí nếu cần và chém. */
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
    const [{ cast, move }, next] = player(state, rng, config);
    rng = next;
    if (cast) {
      state = castSkill(state, config);
      if (state.phase !== 'playing') break;
    }
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

/**
 * Đợt 0: các bộ đồ phải đạt mục tiêu độ khó của màn — vũ khí mặc định (Kiếm + Giáo + Cung), với
 * TỪNG skill nếu màn đã mở skill (để không skill nào làm màn dễ/khó hẳn).
 */
export function targetLoadouts(level: number, config: BattleConfig): Loadout[] {
  const weapons = defaultLoadout(config).weapons;
  if (level < config.skillUnlockLevel) return [{ weapons }];
  return (Object.keys(config.skills) as SkillKind[]).map((skill) => ({ weapons, skill }));
}

/** Đọc `--games N` từ dòng lệnh (số ván mỗi màn mỗi bộ đồ); không có thì dùng `fallback`. */
export function gamesArg(argv: readonly string[], fallback: number): number {
  const at = argv.indexOf('--games');
  if (at === -1) return fallback;
  const games = Number(argv[at + 1]);
  if (!Number.isInteger(games) || games < 1) {
    throw new RangeError(`--games phải là số nguyên ≥ 1, nhận "${argv[at + 1]}"`);
  }
  return games;
}

export function loadoutName(loadout: Loadout, config: BattleConfig): string {
  const weapons = loadout.weapons.map((index) => config.weapons[index]?.name).join('+');
  return loadout.skill === undefined
    ? weapons
    : `${weapons} · ${config.skills[loadout.skill].name}`;
}

export const winRate = (r: LevelResult) => r.won / r.games;
export const averageSpare = (r: LevelResult) => (r.won === 0 ? 0 : r.spareTurns / r.won);
