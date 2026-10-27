// Mô phỏng cân bằng: chơi tự động mọi màn với mọi bộ đồ mang được (B4 vũ khí × B6 skill), in tỉ lệ
// thắng và số lượt dư. Chạy: `npm run sim` (thêm `-- --games N` để đổi số ván). Bảng đầu so với mục
// tiêu độ khó trong battleConfig.ts (đợt 0); CI in cả hai bảng vào tóm tắt job. Lõi: scripts/simCore.ts.
import { BALANCE_TOLERANCE, BATTLE_CONFIG } from '../src/features/battle/logic/battleConfig';
import type { Difficulty } from '../src/features/battle/logic/battleTypes';
import {
  averageSpare,
  gamesArg,
  loadoutName,
  loadoutsForLevel,
  PLAYERS,
  simulateLevel,
  targetLoadouts,
  winRate,
  type Player,
} from './simCore';
import { measured, withinTolerance } from './tuneCore';

/** Số ván mỗi màn mỗi kiểu chơi; seed chạy từ 1 tới số ván. Mặc định bằng balance.test.ts. */
const GAMES = gamesArg(process.argv.slice(2), 500);
const [bestName, best] = Object.entries(PLAYERS)[0] as [string, Player];
const show = (d: Difficulty) => `${(100 * d.winRate).toFixed(1)}% / ${d.spareTurns.toFixed(2)}`;

console.log(`## Mô phỏng cân bằng — ${GAMES} ván mỗi màn (seed 1…${GAMES})\n`);
console.log(
  `### So với mục tiêu (bot "${bestName}", dung sai ±${100 * BALANCE_TOLERANCE.winRate}% thắng, ` +
    `±${BALANCE_TOLERANCE.spareTurns} lượt dư)\n`,
);
console.log('| Màn | Bộ đồ | Mục tiêu (thắng / dư) | Đo được | Đạt |');
console.log('| --- | --- | --- | --- | --- |');
BATTLE_CONFIG.levels.forEach((level, index) => {
  for (const loadout of targetLoadouts(index, BATTLE_CONFIG)) {
    const actual = measured(simulateLevel(index, loadout, best, BATTLE_CONFIG, GAMES));
    const target = level.target;
    const ok = target ? (withinTolerance(actual, target, BALANCE_TOLERANCE) ? '✅' : '❌') : '—';
    console.log(
      `| ${index + 1} | ${loadoutName(loadout, BATTLE_CONFIG)} | ${target ? show(target) : 'chưa có'} | ${show(actual)} | ${ok} |`,
    );
  }
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
