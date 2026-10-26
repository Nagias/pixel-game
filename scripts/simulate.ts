// Mô phỏng cân bằng: chơi tự động mọi màn với mọi bộ đồ chọn được (B4), in tỉ lệ thắng và số lượt
// dư. Chạy: `npm run sim`.
// Chỉ gọi luật thuần trong logic/ — không cần trình duyệt, cùng seed thì cùng kết quả.
import { seedRng, type RngState } from '../src/shared/random';
import { bestMove, randomMove, type Move } from '../src/features/battle/logic/autoPlay';
import { createBattle, playTurn, selectWeapon } from '../src/features/battle/logic/battle';
import { BATTLE_CONFIG } from '../src/features/battle/logic/battleConfig';
import type { BattleConfig, BattleState, Loadout } from '../src/features/battle/logic/battleTypes';
import { allLoadouts, allWeapons } from '../src/features/battle/logic/loadout';

/** Số ván mỗi màn mỗi kiểu chơi; seed chạy từ 1 tới GAMES. */
const GAMES = 500;

/** Kiểu chơi: chọn nước đi từ trạng thái trận và trạng thái ngẫu nhiên riêng của người chơi. */
type Player = (state: BattleState, rng: RngState, config: BattleConfig) => [Move, RngState];

const PLAYERS: Record<string, Player> = {
  'Ngắm chuẩn': (state, rng, config) => [bestMove(state, config), rng],
  'Chém bừa': (state, rng, config) => randomMove(state, rng, config),
};

interface LevelResult {
  readonly won: number;
  /** Tổng số lượt còn dư của các ván thắng. */
  readonly spareTurns: number;
  readonly lostOutOfTurns: number;
  readonly lostDefeated: number;
}

function playGame(
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
    const [move, next] = player(state, rng, config);
    rng = next;
    if (move.weaponIndex !== state.weaponIndex)
      state = selectWeapon(state, move.weaponIndex, config);
    state = playTurn(state, move.sector, config);
  }
  return state;
}

function simulateLevel(
  level: number,
  loadout: Loadout,
  player: Player,
  config: BattleConfig,
): LevelResult {
  let won = 0;
  let spareTurns = 0;
  let lostOutOfTurns = 0;
  let lostDefeated = 0;
  for (let seed = 1; seed <= GAMES; seed++) {
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
  return { won, spareTurns, lostOutOfTurns, lostDefeated };
}

const percent = (n: number) => `${((100 * n) / GAMES).toFixed(1)}%`;

console.log(`Mô phỏng ${GAMES} ván mỗi màn (seed 1…${GAMES})\n`);
console.log(
  '| Kiểu chơi | Bộ đồ | Màn | Thắng | Lượt dư TB (ván thắng) | Thua: hết lượt | Thua: hết máu |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- |');
const loadoutName = (loadout: Loadout) =>
  loadout.weapons.map((index) => BATTLE_CONFIG.weapons[index]?.name).join('+');
for (const [name, player] of Object.entries(PLAYERS)) {
  for (const loadout of allLoadouts(BATTLE_CONFIG, allWeapons(BATTLE_CONFIG))) {
    BATTLE_CONFIG.levels.forEach((_, level) => {
      const r = simulateLevel(level, loadout, player, BATTLE_CONFIG);
      const spare = r.won === 0 ? '—' : (r.spareTurns / r.won).toFixed(2);
      console.log(
        `| ${name} | ${loadoutName(loadout)} | ${level + 1} | ${percent(r.won)} | ${spare} | ${r.lostOutOfTurns} | ${r.lostDefeated} |`,
      );
    });
  }
}
