import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import { castSkill, createBattle, playTurn } from './battle';
import type { BattleConfig, BattleState, Monster, MonsterKind } from './battleTypes';

// Đợt 3 kế hoạch sau B6 (chủ dự án duyệt 27/10/2026 — "agent đề xuất"): mỗi con quái bị hạ (bằng chém
// hay skill) cho số vàng theo loại của nó (`gold` trong cấu hình loại quái, không có = 0). Vàng của trận
// nằm trong state; cộng vào hồ sơ người chơi là việc của tính năng profile.

const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  weapons: [
    {
      name: 'Kiếm thử',
      slot: 'near',
      rangeLabel: 'cả sân',
      push: 'none',
      widthSectors: 3,
      minRing: 0,
      maxRing: 5,
      damage: 1,
    },
  ],
  monsterKinds: {
    slime: { name: 'Slime thử', hp: 1, advanceChance: 1, attack: 1, gold: 1 },
    slimeKing: { name: 'Vua thử', hp: 1, advanceChance: 1, attack: 2, gold: 5 },
    slimeCannon: { name: 'Pháo thử', hp: 2, advanceChance: 1, attack: 1, shootRing: 4 },
    slimeMini: { name: 'Con thử', hp: 1, advanceChance: 1, attack: 1 },
    slimeCharger: { name: 'Lao thử', hp: 2, advanceChance: 1, attack: 1, step: 2 },
    slimeGhost: { name: 'Ma thử', hp: 2, advanceChance: 1, attack: 1, ghost: true },
    goblin: { name: 'Yêu tinh thử', hp: 4, advanceChance: 1, attack: 2 },
    wolf: { name: 'Sói thử', hp: 4, advanceChance: 1, attack: 3, step: 2 },
    goblinArcher: { name: 'Cung thủ thử', hp: 3, advanceChance: 1, attack: 2, shootRing: 4 },
    bat: { name: 'Dơi thử', hp: 3, advanceChance: 1, attack: 1, ghost: true },
    treant: { name: 'Cây thử', hp: 14, advanceChance: 1, attack: 5 },
  },
  hero: { hp: 5, healMinHits: 9, healAmount: 0 },
  critMultiplier: 2,
  skills: {
    iceRain: { name: 'Băng thử', damage: 1, freezeTurns: 1, chargeTurns: 2 },
    fireball: { name: 'Lửa thử', damage: 2, freezeTurns: 0, chargeTurns: 3 },
  },
  skillUnlockLevel: 0,
  levels: [{ turnLimit: 5, monsters: ['slime', 'slime', 'slime'], spread: 2 }],
};

const monster = (id: number, sector: number, kind: MonsterKind = 'slime', hp = 1): Monster => ({
  id,
  kind,
  sector,
  ring: 5,
  hp,
});

function stateWith(monsters: Monster[], overrides: Partial<BattleState> = {}): BattleState {
  return {
    seed: 1,
    rng: seedRng(1),
    level: 0,
    turnsLeft: 5,
    heroHp: 5,
    loadout: { weapons: [0] },
    weaponIndex: 0,
    monsters,
    phase: 'playing',
    lossReason: null,
    lastAttack: null,
    skillCharge: 0,
    lastSkill: null,
    questProgress: 0,
    nextWave: 0,
    gold: 0,
    ...overrides,
  };
}

describe('vàng — hạ quái thì được vàng theo loại', () => {
  it('trận mới chưa có vàng', () => {
    expect(createBattle(1, CONFIG, 0).gold).toBe(0);
  });

  it('nhát chém hạ quái: cộng vàng từng con theo loại; con chỉ bị thương thì không', () => {
    const before = stateWith(
      [monster(1, 2), monster(2, 3, 'slimeKing'), monster(3, 4, 'slime', 4), monster(4, 12)],
      { gold: 7 },
    );
    const after = playTurn(before, 3, CONFIG);
    // Slime (1) + Slime Vua (5); slime 4 máu là con thứ 3 (ăn 3) nên chỉ mất máu; con ở lát 12 không trúng.
    expect(after.gold).toBe(7 + 1 + 5);
  });

  it('loại quái không khai báo vàng thì cho 0', () => {
    const after = playTurn(stateWith([monster(1, 3, 'slimeMini'), monster(2, 12)]), 3, CONFIG);
    expect(after.gold).toBe(0);
  });

  it('nhát hạ con cuối (thắng) vẫn cộng vàng', () => {
    const after = playTurn(stateWith([monster(1, 3)]), 3, CONFIG);
    expect(after).toMatchObject({ phase: 'won', gold: 1 });
  });

  it('thua thì vàng đã nhặt trong trận vẫn còn trong state', () => {
    const after = playTurn(stateWith([monster(1, 3), monster(2, 12)], { turnsLeft: 1 }), 3, CONFIG);
    expect(after).toMatchObject({ phase: 'lost', gold: 1 });
  });

  it('skill hạ quái cũng ra vàng', () => {
    const before = stateWith(
      [monster(1, 3), monster(2, 12, 'slimeKing'), monster(3, 6, 'slime', 3)],
      {
        loadout: { weapons: [0], skill: 'iceRain' },
        skillCharge: 2,
      },
    );
    expect(castSkill(before, CONFIG).gold).toBe(1 + 5);
  });

  it('vàng âm hoặc số lẻ trong cấu hình bị từ chối', () => {
    const bad = (gold: number): BattleConfig => ({
      ...CONFIG,
      monsterKinds: { ...CONFIG.monsterKinds, slime: { ...CONFIG.monsterKinds.slime, gold } },
    });
    expect(() => createBattle(1, bad(-1), 0)).toThrow(RangeError);
    expect(() => createBattle(1, bad(1.5), 0)).toThrow(RangeError);
  });
});
