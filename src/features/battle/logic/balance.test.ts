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
  // Chủ dự án duyệt 26/10/2026: màn trùm (màn có Slime Vua) phải khó hơn màn 2 — trước đó trùm dư
  // 4,67 lượt trong khi màn 2 dư 2,89, tức màn trùm dễ hơn.
  it('màn trùm khó hơn màn 2 khi ngắm chuẩn: ít lượt dư hơn và thắng không nhiều hơn', () => {
    const bossLevel = BATTLE_CONFIG.levels.findIndex((l) => l.monsters.includes('slimeKing'));
    expect(bossLevel).toBeGreaterThan(1);
    const level2 = playLevel(1);
    const boss = playLevel(bossLevel);
    expect(boss.spareTurns).toBeLessThan(level2.spareTurns);
    expect(boss.winRate).toBeLessThanOrEqual(level2.winRate);
  });

  // Chủ dự án duyệt 26/10/2026 (B2): màn 4 quái tới từ hai phía, khó hơn màn 3 — độ khó tăng dần.
  it('màn 4 (quái hai phía) khó hơn màn 3 khi ngắm chuẩn', () => {
    expect(BATTLE_CONFIG.levels[3]?.splitOpposite).toBe(true);
    const level3 = playLevel(2);
    const level4 = playLevel(3);
    expect(level4.spareTurns).toBeLessThan(level3.spareTurns);
    expect(level4.winRate).toBeLessThan(level3.winRate);
  });
});
