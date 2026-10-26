import { describe, expect, it } from 'vitest';
import { bestMove } from './autoPlay';
import { canCastSkill, castSkill, createBattle, playTurn, selectWeapon } from './battle';
import { BATTLE_CONFIG } from './battleConfig';
import { defaultLoadout, loadoutForLevel } from './loadout';

// Kiểm quan hệ độ khó chủ dự án đã duyệt trên con số THẬT của game (khác các test luật dùng cấu
// hình riêng). Chỉ kiểm quan hệ giữa các màn, không ghim con số — số nằm trong battleConfig.ts.
// Cùng 500 ván (seed 1…500) với `npm run sim` — số chủ dự án xem khi duyệt. Mẫu nhỏ hơn có thể đảo
// kết quả khi hai màn chênh nhau ít (màn 4 và 5 lệch ~0,2 lượt dư: 200 ván thì đảo chiều).
const GAMES = 500;

/**
 * Người chơi ngắm chuẩn chơi `GAMES` ván của màn với bộ đồ mặc định của game (B6: từ màn mở skill thì
 * mang skill đầu, bấm ngay khi đầy — như `npm run sim`): tỉ lệ thắng và số lượt dư trung bình khi thắng.
 */
function playLevel(level: number): { winRate: number; spareTurns: number } {
  let won = 0;
  let spare = 0;
  for (let seed = 1; seed <= GAMES; seed++) {
    const loadout = loadoutForLevel(defaultLoadout(BATTLE_CONFIG), level, BATTLE_CONFIG);
    let state = createBattle(seed, BATTLE_CONFIG, level, loadout);
    while (state.phase === 'playing') {
      if (canCastSkill(state, BATTLE_CONFIG)) {
        state = castSkill(state, BATTLE_CONFIG);
        if (state.phase !== 'playing') break;
      }
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

  // Chủ dự án duyệt 26/10/2026 (B3): màn 5 có Slime Pháo (quái bắn xa), khó hơn màn 4.
  it('màn 5 (có quái bắn xa) khó hơn màn 4 khi ngắm chuẩn', () => {
    const level5 = BATTLE_CONFIG.levels[4];
    expect(
      level5?.monsters.some((kind) => BATTLE_CONFIG.monsterKinds[kind].shootRing !== undefined),
    ).toBe(true);
    const level4 = playLevel(3);
    const fifth = playLevel(4);
    expect(fifth.spareTurns).toBeLessThan(level4.spareTurns);
    expect(fifth.winRate).toBeLessThanOrEqual(level4.winRate);
  });
});
