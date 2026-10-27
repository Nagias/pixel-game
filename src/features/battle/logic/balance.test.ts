import { describe, expect, it } from 'vitest';
import {
  PLAYERS,
  simulateLevel,
  TARGET_PLAYER,
  targetLoadouts,
  type LevelResult,
  type Player,
} from '../../../../scripts/simCore';
import { levelWithinTolerance, measured } from '../../../../scripts/tuneCore';
import { BALANCE_TOLERANCE, BATTLE_CONFIG, LOADOUT_TOLERANCE } from './battleConfig';

// Kiểm độ khó chủ dự án đã duyệt trên con số THẬT của game (khác các test luật dùng cấu hình riêng).
// Mục tiêu nằm ở `target` của từng màn trong battleConfig.ts (đợt 0), đo bằng kiểu chơi TARGET_PLAYER
// (người chơi trung bình) như `npm run sim` / `npm run tune`. Cùng 500 ván (seed 1…500) với
// `npm run sim`: mẫu nhỏ hơn có thể đảo kết quả khi hai màn chênh nhau ít.
const GAMES = 500;
const player = PLAYERS[TARGET_PLAYER] as Player;

const cache = new Map<string, LevelResult>();
/** Kết quả của từng bộ đồ phải đạt mục tiêu ở màn (bộ mặc định, từng skill nếu màn có skill). */
function playLevel(level: number): LevelResult[] {
  return targetLoadouts(level, BATTLE_CONFIG).map((loadout) => {
    const key = `${level}:${loadout.skill ?? ''}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const result = simulateLevel(level, loadout, player, BATTLE_CONFIG, GAMES);
    cache.set(key, result);
    return result;
  });
}

/** Bộ mặc định với skill đầu (như game chọn sẵn) — để so độ khó giữa các màn. */
const main = (level: number) => measured(playLevel(level)[0] as LevelResult);

describe('cân bằng đã duyệt', () => {
  // Đợt 0 (chủ dự án duyệt 27/10/2026): mục tiêu độ khó và dung sai theo gợi ý của agent.
  it.each(BATTLE_CONFIG.levels.map((_, level) => ({ level, name: level + 1 })))(
    'màn $name đạt mục tiêu độ khó trong dung sai, với mọi skill',
    ({ level }) => {
      const target = BATTLE_CONFIG.levels[level]?.target;
      expect(target, `màn ${level + 1} phải có target`).toBeDefined();
      if (!target) return;
      // Trung bình các skill ±5% / ±0,5 lượt; từng skill ±8% / ±0,8 (chủ dự án duyệt 27/10/2026).
      const actual = playLevel(level).map(measured);
      const tolerance = { mean: BALANCE_TOLERANCE, perLoadout: LOADOUT_TOLERANCE };
      expect(levelWithinTolerance(actual, target, tolerance), JSON.stringify(actual)).toBe(true);
    },
  );

  // Chủ dự án duyệt 26/10/2026: màn trùm (màn có Slime Vua) phải khó hơn màn 2 — trước đó trùm dư
  // 4,67 lượt trong khi màn 2 dư 2,89, tức màn trùm dễ hơn.
  it('màn trùm khó hơn màn 2: ít lượt dư hơn và thắng không nhiều hơn', () => {
    const bossLevel = BATTLE_CONFIG.levels.findIndex((l) => l.monsters.includes('slimeKing'));
    expect(bossLevel).toBeGreaterThan(1);
    expect(main(bossLevel).spareTurns).toBeLessThan(main(1).spareTurns);
    expect(main(bossLevel).winRate).toBeLessThanOrEqual(main(1).winRate);
  });

  // Chủ dự án duyệt 26/10/2026 (B2): màn 4 quái tới từ hai phía, khó hơn màn 3 — độ khó tăng dần.
  it('màn 4 (quái hai phía) khó hơn màn 3', () => {
    expect(BATTLE_CONFIG.levels[3]?.splitOpposite).toBe(true);
    expect(main(3).spareTurns).toBeLessThan(main(2).spareTurns);
    expect(main(3).winRate).toBeLessThan(main(2).winRate);
  });

  // Chủ dự án duyệt 26/10/2026 (B3): màn 5 có Slime Pháo (quái bắn xa), khó hơn màn 4.
  it('màn 5 (có quái bắn xa) khó hơn màn 4', () => {
    const level5 = BATTLE_CONFIG.levels[4];
    expect(
      level5?.monsters.some((kind) => BATTLE_CONFIG.monsterKinds[kind].shootRing !== undefined),
    ).toBe(true);
    expect(main(4).spareTurns).toBeLessThan(main(3).spareTurns);
    expect(main(4).winRate).toBeLessThanOrEqual(main(3).winRate);
  });
});
