import { describe, expect, it } from 'vitest';
import { BATTLE_CONFIG } from './battleConfig';
import type { BattleConfig, LevelConfig } from './battleTypes';
import { levelMonsterKinds } from './levelInfo';

// F18 đợt D: bảng trước trận liệt kê "Quái sẽ gặp", bản đồ vẽ hình trùm cạnh nút màn — cần biết màn có những
// loại quái nào (đội hình mở màn và mọi đợt sau).
describe('levelMonsterKinds', () => {
  const level = (patch: Partial<LevelConfig>): BattleConfig => ({
    ...BATTLE_CONFIG,
    levels: [{ turnLimit: 5, monsters: [], spread: 1, ...patch }],
  });

  it('không trùng, theo thứ tự xuất hiện: đội hình mở màn rồi các đợt sau', () => {
    const config = level({
      monsters: ['slime', 'goblin', 'slime'],
      waves: [['wolf', 'goblin'], ['treant']],
    });
    expect(levelMonsterKinds(0, config)).toEqual(['slime', 'goblin', 'wolf', 'treant']);
  });

  it('màn 10 của game thật có trùm Người Cây', () => {
    expect(levelMonsterKinds(9, BATTLE_CONFIG)).toContain('treant');
  });
});
