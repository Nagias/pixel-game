import { describe, expect, it } from 'vitest';
import { bestMove } from './autoPlay';
import { createBattle, playTurn, selectWeapon } from './battle';
import { BATTLE_CONFIG } from './battleConfig';

// Kiểm quan hệ độ khó chủ dự án đã duyệt trên con số THẬT của game (khác các test luật dùng cấu
// hình riêng). Chỉ kiểm quan hệ giữa các màn, không ghim con số — số nằm trong battleConfig.ts.
const GAMES = 200;

/** Người chơi ngắm chuẩn chơi `GAMES` ván của màn: tỉ lệ thắng và số lượt dư trung bình khi thắng. */
function playLevel(level: number): { winRate: number; spareTurns: number } {
  let won = 0;
  let spare = 0;
  for (let seed = 1; seed <= GAMES; seed++) {
    let state = createBattle(seed, BATTLE_CONFIG, level);
    while (state.phase === 'playing') {
      const move = bestMove(state, BATTLE_CONFIG);
      if (move.weaponIndex !== state.weaponIndex) {
        state = selectWeapon(state, move.weaponIndex, BATTLE_CONFIG);
      }
      state = playTurn(state, move.sector, BATTLE_CONFIG);
    }
    if (state.phase === 'won') {
      won++;
      spare += state.turnsLeft;
    }
  }
  return { winRate: won / GAMES, spareTurns: won === 0 ? 0 : spare / won };
}

describe('cân bằng đã duyệt', () => {
  // Chủ dự án duyệt 26/10/2026: màn trùm (màn cuối) phải khó hơn màn 2 — trước đó trùm dư 4,67
  // lượt trong khi màn 2 dư 2,89, tức màn trùm dễ hơn.
  it('màn trùm khó hơn màn 2 khi ngắm chuẩn: ít lượt dư hơn và thắng không nhiều hơn', () => {
    const level2 = playLevel(1);
    const boss = playLevel(BATTLE_CONFIG.levels.length - 1);
    expect(boss.spareTurns).toBeLessThan(level2.spareTurns);
    expect(boss.winRate).toBeLessThanOrEqual(level2.winRate);
  });
});
