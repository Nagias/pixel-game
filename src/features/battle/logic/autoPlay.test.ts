import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import { bestMove, hitIds, missMove, randomMove } from './autoPlay';
import type { BattleConfig, BattleState, Monster, WeaponConfig } from './battleTypes';

// Cấu hình riêng cho test (không phụ thuộc battleConfig.ts): 3 vũ khí theo tầm như F02.
const weapon = (name: string, widthSectors: number, minRing: number, maxRing: number) =>
  ({
    name,
    rangeLabel: name,
    push: 'none',
    widthSectors,
    minRing,
    maxRing,
    damage: 1,
  }) satisfies WeaponConfig;

const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  weapons: [weapon('Kiếm', 5, 0, 1), weapon('Giáo', 3, 2, 3), weapon('Cung', 1, 4, 5)],
  monsterKinds: {
    slime: { name: 'Slime thử', hp: 2, advanceChance: 0.6, attack: 1 },
    slimeKing: { name: 'Vua thử', hp: 6, advanceChance: 0.6, attack: 2 },
  },
  hero: { hp: 5 },
  levels: [{ turnLimit: 8, monsters: ['slime'], spread: 2 }],
};

const monster = (id: number, sector: number, ring: number): Monster => ({
  id,
  kind: 'slime',
  sector,
  ring,
  hp: 2,
});

function stateWith(monsters: Monster[], weaponIndex = 0): BattleState {
  return {
    seed: 1,
    rng: seedRng(1),
    level: 0,
    turnsLeft: 8,
    heroHp: 5,
    weaponIndex,
    monsters,
    phase: 'playing',
    lossReason: null,
    lastAttack: null,
  };
}

describe('bot chơi thử — dùng chung cho E2E và mô phỏng cân bằng', () => {
  it('hitIds: quái nằm trong vùng của vũ khí khi chém vào lát đó', () => {
    const state = stateWith([monster(1, 10, 1), monster(2, 12, 1), monster(3, 10, 4)]);
    expect(hitIds(state, { weaponIndex: 0, sector: 11 }, CONFIG)).toEqual([1, 2]);
    expect(hitIds(state, { weaponIndex: 2, sector: 10 }, CONFIG)).toEqual([3]);
  });

  it('ngắm chuẩn: chọn vũ khí + lát trúng nhiều quái nhất (bằng nhau thì lát nhỏ nhất)', () => {
    const state = stateWith([
      monster(1, 10, 1),
      monster(2, 11, 1),
      monster(3, 12, 1),
      monster(4, 3, 5), // Cung chỉ trúng được 1 con
    ]);
    expect(bestMove(state, CONFIG)).toEqual({ weaponIndex: 0, sector: 10 });
  });

  it('ngắm chuẩn: trúng bằng nhau thì chém con ở gần nhân vật hơn', () => {
    const state = stateWith([monster(1, 15, 5), monster(2, 5, 1)]);
    const move = bestMove(state, CONFIG);
    expect(move.weaponIndex).toBe(0);
    expect(hitIds(state, move, CONFIG)).toEqual([2]);
  });

  it('chém trượt: lát không trúng con nào, ưu tiên vũ khí đang cầm', () => {
    const state = stateWith([monster(1, 0, 4), monster(2, 12, 2)], 2);
    const move = missMove(state, CONFIG);
    expect(move.weaponIndex).toBe(2);
    expect(hitIds(state, move, CONFIG)).toEqual([]);
  });

  it('chém bừa: cùng trạng thái ngẫu nhiên → cùng nước đi, nằm trong giới hạn', () => {
    const rng = seedRng(7);
    const [first, next] = randomMove(rng, CONFIG);
    expect(randomMove(rng, CONFIG)).toEqual([first, next]);
    expect(next).not.toBe(rng);
    expect(first.weaponIndex).toBeGreaterThanOrEqual(0);
    expect(first.weaponIndex).toBeLessThan(CONFIG.weapons.length);
    expect(first.sector).toBeGreaterThanOrEqual(0);
    expect(first.sector).toBeLessThan(CONFIG.sectorCount);
  });

  // B3 (chủ dự án duyệt 26/10/2026): người chơi giỏi ưu tiên chém quái bắn đang có "!" — để hạ hoặc
  // làm nó choáng — trước cả nhát trúng nhiều quái hơn.
  it('ngắm chuẩn: có quái bắn đang "!" thì ưu tiên chém trúng nó', () => {
    const withShooter: BattleConfig = {
      ...CONFIG,
      monsterKinds: {
        ...CONFIG.monsterKinds,
        slimeKing: { ...CONFIG.monsterKinds.slimeKing, shootRing: 4 },
      },
    };
    const cannon: Monster = { id: 3, kind: 'slimeKing', sector: 3, ring: 4, hp: 6 };
    const state = stateWith([monster(1, 10, 1), monster(2, 11, 1), cannon]);
    expect(bestMove(state, CONFIG).weaponIndex).toBe(0); // không có quái bắn: Kiếm trúng 2 con
    const move = bestMove(state, withShooter);
    expect(hitIds(state, move, withShooter)).toContain(3);
  });

  it('ngắm chuẩn: quái bắn chưa tới vòng bắn (chưa "!") thì không được ưu tiên', () => {
    const withShooter: BattleConfig = {
      ...CONFIG,
      monsterKinds: {
        ...CONFIG.monsterKinds,
        slimeKing: { ...CONFIG.monsterKinds.slimeKing, shootRing: 3 },
      },
    };
    const far: Monster = { id: 3, kind: 'slimeKing', sector: 3, ring: 4, hp: 6 };
    const state = stateWith([monster(1, 10, 1), monster(2, 11, 1), far]);
    expect(bestMove(state, withShooter)).toEqual(bestMove(state, CONFIG));
  });

  it('không sửa trạng thái đầu vào', () => {
    const state = stateWith([monster(1, 10, 1), monster(2, 3, 5)]);
    const before = JSON.stringify(state);
    bestMove(state, CONFIG);
    missMove(state, CONFIG);
    expect(JSON.stringify(state)).toBe(before);
  });
});
