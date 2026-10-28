// Mô phỏng cân bằng: chơi tự động mọi màn với mọi bộ đồ mang được (B4 vũ khí × B6 skill), in tỉ lệ
// thắng và số lượt dư. Chạy: `npm run sim` (thêm `-- --games N` để đổi số ván). Bảng đầu so với mục
// tiêu độ khó trong battleConfig.ts (đợt 0); CI in cả hai bảng vào tóm tắt job. Lõi: scripts/simCore.ts.
import {
  BALANCE_TOLERANCE,
  BATTLE_CONFIG,
  LOADOUT_TOLERANCE,
} from '../src/features/battle/logic/battleConfig';
import type { Difficulty } from '../src/features/battle/logic/battleTypes';
import {
  averageSpare,
  gamesArg,
  loadoutName,
  loadoutsForLevel,
  PLAYERS,
  simulateLevel,
  targetLoadouts,
  targetPlayerFor,
  targetPlayerName,
  winRate,
} from './simCore';
import { meanDifficulty, measured, tolerancesFor, withinTolerance } from './tuneCore';

/** Số ván mỗi màn mỗi kiểu chơi; seed chạy từ 1 tới số ván. Mặc định bằng balance.test.ts. */
const GAMES = gamesArg(process.argv.slice(2), 500);
const show = (d: Difficulty) => `${(100 * d.winRate).toFixed(1)}% / ${d.spareTurns.toFixed(2)}`;

console.log(`## Mô phỏng cân bằng — ${GAMES} ván mỗi màn (seed 1…${GAMES})\n`);
console.log(
  `### So với mục tiêu (mỗi màn đo bằng bot ghi ở cột Bot; dung sai từng bộ đồ ±${100 * LOADOUT_TOLERANCE.winRate}% ` +
    `thắng, ±${LOADOUT_TOLERANCE.spareTurns} lượt dư; trung bình ±${100 * BALANCE_TOLERANCE.winRate}%, ` +
    `±${BALANCE_TOLERANCE.spareTurns})\n`,
);
console.log('| Màn | Bot | Bộ đồ | Mục tiêu (thắng / dư) | Đo được | Đạt |');
console.log('| --- | --- | --- | --- | --- | --- |');
BATTLE_CONFIG.levels.forEach((level, index) => {
  const { target } = level;
  const row = (name: string, actual: Difficulty, tolerance: Difficulty) => {
    const ok = target ? (withinTolerance(actual, target, tolerance) ? '✅' : '❌') : '—';
    console.log(
      `| ${index + 1} | ${targetPlayerName(index, BATTLE_CONFIG)} | ${name} | ${target ? show(target) : 'chưa có'} | ${show(actual)} | ${ok} |`,
    );
  };
  const results = targetLoadouts(index, BATTLE_CONFIG).map((loadout) => {
    const player = targetPlayerFor(index, BATTLE_CONFIG);
    const actual = measured(simulateLevel(index, loadout, player, BATTLE_CONFIG, GAMES));
    // Màn đo bằng "Người mới": từng bộ đồ chỉ để xem, không xét (tolerancesFor).
    const { perLoadout } = tolerancesFor(targetPlayerName(index, BATTLE_CONFIG), {
      mean: BALANCE_TOLERANCE,
      perLoadout: LOADOUT_TOLERANCE,
    });
    row(loadoutName(loadout, BATTLE_CONFIG), actual, perLoadout);
    return actual;
  });
  // Màn nhiều bộ đồ (từng skill): thêm dòng trung bình, xét theo dung sai chung.
  if (results.length > 1) row('trung bình', meanDifficulty(results), BALANCE_TOLERANCE);
});

console.log('\n### Mọi kiểu chơi × mọi bộ đồ\n');
console.log(
  '| Kiểu chơi | Bộ đồ | Màn | Thắng | Lượt dư TB (ván thắng) | Thua: hết lượt | Thua: hết máu |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const [name, player] of Object.entries(PLAYERS)) {
  BATTLE_CONFIG.levels.forEach((_, level) => {
    for (const loadout of loadoutsForLevel(level, BATTLE_CONFIG)) {
      const r = simulateLevel(level, loadout, player, BATTLE_CONFIG, GAMES);
      const spare = r.won === 0 ? '—' : averageSpare(r).toFixed(2);
      console.log(
        `| ${name} | ${loadoutName(loadout, BATTLE_CONFIG)} | ${level + 1} | ${(100 * winRate(r)).toFixed(1)}% | ${spare} | ${r.lostOutOfTurns} | ${r.lostDefeated} |`,
      );
    }
  });
}
