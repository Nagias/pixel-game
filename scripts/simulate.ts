// Mô phỏng cân bằng: chơi tự động mọi màn với mọi bộ đồ mang được (B4 vũ khí × B6 skill), in tỉ lệ
// thắng và số lượt dư. Chạy: `npm run sim`. Lõi dùng chung ở scripts/simCore.ts.
import { BATTLE_CONFIG } from '../src/features/battle/logic/battleConfig';
import {
  averageSpare,
  loadoutName,
  loadoutsForLevel,
  PLAYERS,
  simulateLevel,
  winRate,
} from './simCore';

/** Số ván mỗi màn mỗi kiểu chơi; seed chạy từ 1 tới GAMES. */
const GAMES = 500;

console.log(`Mô phỏng ${GAMES} ván mỗi màn (seed 1…${GAMES})\n`);
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
