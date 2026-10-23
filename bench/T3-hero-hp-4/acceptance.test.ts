// Test ẩn của việc mẫu T3 (bench/) — chỉ chép vào bài làm lúc chấm, người làm bài không thấy.
import { describe, expect, it } from 'vitest';
import { BATTLE_CONFIG } from './battleConfig';

/** Cấu hình ở commit gốc (58c9d29) — mọi con số ngoài máu nhân vật phải giữ nguyên y hệt. */
const BASE_CONFIG = {
  sectorCount: 24,
  ringCount: 6,
  turnLimit: 8,
  arcPeriodMs: 2_400,
  weapons: [
    {
      name: 'Kiếm',
      rangeLabel: 'gần',
      push: 'out',
      widthSectors: 5,
      minRing: 0,
      maxRing: 1,
      damage: 1,
    },
    {
      name: 'Giáo',
      rangeLabel: 'vừa',
      push: 'clockwise',
      widthSectors: 3,
      minRing: 2,
      maxRing: 3,
      damage: 1,
    },
    {
      name: 'Cung',
      rangeLabel: 'xa',
      push: 'in',
      widthSectors: 1,
      minRing: 4,
      maxRing: 5,
      damage: 1,
    },
  ],
  monster: { name: 'Slime', hp: 2, advanceChance: 0.6, attack: 1 },
  hero: { hp: 5 },
  spawn: { count: 4, spread: 2 },
};

describe('bench T3 — máu nhân vật 5 → 4', () => {
  it('máu nhân vật là 4', () => {
    expect(BATTLE_CONFIG.hero.hp).toBe(4);
  });

  it('mọi con số khác giữ nguyên như commit gốc', () => {
    expect({ ...BATTLE_CONFIG, hero: { ...BATTLE_CONFIG.hero, hp: 5 } }).toEqual(BASE_CONFIG);
  });
});
