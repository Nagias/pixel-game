import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import { castSkill, createBattle, playTurn } from './battle';
import { BATTLE_CONFIG, UPGRADE_CONFIG } from './battleConfig';
import type { BattleConfig, BattleState, Monster, MonsterKind, RareConfig } from './battleTypes';
import { withUpgrades } from './upgrades';

// Đợt 5 kế hoạch sau B6 (chủ dự án duyệt 27/10/2026, lượt duyệt chung mục 1b): từ màn 3, mỗi trận 15% có
// một con quái KHÔNG phải slime hóa hiếm — ×2 máu, ×3 vàng, không bao giờ cần để thắng. Chỉ số may mắn
// (màn Nâng cấp) +5% mỗi cấp. Slime không bao giờ hóa hiếm.

const RARE: RareConfig = { fromLevel: 1, chance: 1, hpMultiplier: 2, goldMultiplier: 3 };

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
    goblin: { name: 'Yêu tinh thử', hp: 4, advanceChance: 1, attack: 2, gold: 2, canBeRare: true },
    wolf: { name: 'Sói thử', hp: 4, advanceChance: 1, attack: 3, step: 2, canBeRare: true },
    goblinArcher: { name: 'Cung thủ thử', hp: 3, advanceChance: 1, attack: 2, shootRing: 4 },
    bat: { name: 'Dơi thử', hp: 3, advanceChance: 1, attack: 1, ghost: true },
    treant: { name: 'Cây thử', hp: 14, advanceChance: 1, attack: 5 },
  },
  hero: { hp: 5, healMinHits: 9, healAmount: 0 },
  critMultiplier: 2,
  skills: {
    iceRain: { name: 'Băng thử', damage: 1, freezeTurns: 1, chargeTurns: 2 },
    fireball: { name: 'Lửa thử', damage: 9, freezeTurns: 0, chargeTurns: 1 },
  },
  skillUnlockLevel: 0,
  rare: RARE,
  levels: [
    { turnLimit: 5, monsters: ['goblin', 'goblin'], spread: 2 },
    {
      turnLimit: 5,
      monsters: ['slime', 'goblin', 'wolf', 'slime'],
      spread: 2,
      quest: { kind: 'slime', count: 2 },
    },
    {
      turnLimit: 5,
      monsters: ['goblin', 'goblin', 'slime'],
      spread: 2,
      quest: { kind: 'goblin', count: 2 },
    },
    { turnLimit: 5, monsters: ['goblin', 'slime'], spread: 2 },
  ],
};

const withRare = (patch: Partial<RareConfig>): BattleConfig => ({
  ...CONFIG,
  rare: { ...RARE, ...patch },
});

const rares = (state: BattleState) => state.monsters.filter((m) => m.rare);

describe('quái hiếm xuất hiện', () => {
  it('màn trước màn mở quái hiếm thì không có quái hiếm', () => {
    expect(rares(createBattle(1, CONFIG, 0))).toEqual([]);
  });

  it('trúng xác suất: đúng MỘT con hóa hiếm, máu ×2, không bao giờ là slime hay loại không được hiếm', () => {
    for (let seed = 0; seed < 50; seed++) {
      const state = createBattle(seed, CONFIG, 1);
      const [rare, ...more] = rares(state);
      expect(more).toEqual([]);
      expect(rare && ['goblin', 'wolf'].includes(rare.kind)).toBe(true);
      expect(rare?.hp).toBe(CONFIG.monsterKinds[rare?.kind ?? 'goblin'].hp * 2);
    }
  });

  it('quái hiếm không bao giờ là loại của nhiệm vụ (không bao giờ cần để thắng)', () => {
    // Màn 3: nhiệm vụ hạ 2 Yêu tinh — chỉ còn slime (không được hiếm) nên không có quái hiếm.
    expect(rares(createBattle(1, CONFIG, 2))).toEqual([]);
  });

  it('màn không có nhiệm vụ (phải diệt sạch) thì không có quái hiếm', () => {
    expect(rares(createBattle(1, CONFIG, 3))).toEqual([]);
  });

  it('xác suất 0 thì không bao giờ có; 15% thì khoảng 15% số trận', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(rares(createBattle(seed, withRare({ chance: 0 }), 1))).toEqual([]);
    }
    const config = withRare({ chance: 0.15 });
    let count = 0;
    for (let seed = 0; seed < 2000; seed++) count += rares(createBattle(seed, config, 1)).length;
    expect(count / 2000).toBeCloseTo(0.15, 1);
  });

  it('có hay không có quái hiếm thì đội hình và ván vẫn như nhau (dòng ngẫu nhiên riêng)', () => {
    const plain = createBattle(5, withRare({ chance: 0 }), 1);
    const rare = createBattle(5, CONFIG, 1);
    expect(rare.rng).toBe(plain.rng);
    expect(rare.monsters.map(({ id, kind, sector, ring }) => ({ id, kind, sector, ring }))).toEqual(
      plain.monsters.map(({ id, kind, sector, ring }) => ({ id, kind, sector, ring })),
    );
  });

  it('cấu hình không có quái hiếm (thiếu `rare`) thì không có quái hiếm', () => {
    const { rare, ...without } = CONFIG;
    expect(rare).toBeDefined();
    expect(rares(createBattle(1, without, 1))).toEqual([]);
  });

  it.each<[string, Partial<RareConfig>]>([
    ['xác suất ngoài [0, 1]', { chance: 1.2 }],
    ['màn mở âm', { fromLevel: -1 }],
    ['hệ số máu < 1', { hpMultiplier: 0 }],
    ['hệ số vàng không nguyên', { goldMultiplier: 2.5 }],
  ])('cấu hình quái hiếm sai bị từ chối: %s', (_, patch) => {
    expect(() => createBattle(1, withRare(patch), 1)).toThrow(RangeError);
  });

  it('bảng thật: từ màn 3, 15%, máu ×2, vàng ×3; slime không bao giờ hiếm, 4 loài rừng thường thì được', () => {
    expect(BATTLE_CONFIG.rare).toEqual({
      fromLevel: 2,
      chance: 0.15,
      hpMultiplier: 2,
      goldMultiplier: 3,
    });
    const canBeRare = (Object.keys(BATTLE_CONFIG.monsterKinds) as MonsterKind[]).filter(
      (kind) => BATTLE_CONFIG.monsterKinds[kind].canBeRare,
    );
    expect(canBeRare.sort()).toEqual(['bat', 'goblin', 'goblinArcher', 'wolf']);
  });
});

describe('may mắn (nâng cấp)', () => {
  it('mỗi cấp may mắn cộng 5% xác suất quái hiếm; giá 10 / 20 / 40', () => {
    expect(UPGRADE_CONFIG.luck).toMatchObject({ perLevel: 0.05, costs: [10, 20, 40] });
    const lucky = withUpgrades(BATTLE_CONFIG, { luck: 3 }, UPGRADE_CONFIG);
    expect(lucky.rare?.chance).toBeCloseTo(0.15 + 0.15);
    expect(withUpgrades(BATTLE_CONFIG, { luck: 1 }, UPGRADE_CONFIG).rare?.chance).toBeCloseTo(0.2);
  });

  it('bảng may mắn làm xác suất cấp tối đa vượt 100% thì bị từ chối', () => {
    const tooLucky = { ...UPGRADE_CONFIG, luck: { ...UPGRADE_CONFIG.luck, perLevel: 0.5 } };
    expect(() => withUpgrades(BATTLE_CONFIG, { luck: 1 }, tooLucky)).toThrow(RangeError);
  });
});

const monster = (
  id: number,
  sector: number,
  kind: MonsterKind,
  hp: number,
  rare = false,
): Monster => ({
  id,
  kind,
  sector,
  ring: 5,
  hp,
  ...(rare ? { rare: true } : {}),
});

function stateWith(monsters: Monster[]): BattleState {
  return {
    seed: 1,
    rng: seedRng(1),
    level: 1,
    turnsLeft: 5,
    heroHp: 5,
    loadout: { weapons: [0], skill: 'fireball' },
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
  };
}

describe('hạ quái hiếm', () => {
  it('chém hạ quái hiếm: vàng ×3 và trận ghi đã hạ quái hiếm', () => {
    const before = stateWith([monster(1, 3, 'goblin', 1, true), monster(2, 12, 'slime', 1)]);
    const after = playTurn(before, 3, CONFIG);
    expect(after.gold).toBe(2 * 3);
    expect(after.rareKilled).toBe(true);
  });

  it('quái hiếm chỉ bị thương: chưa tính đã hạ', () => {
    const after = playTurn(
      stateWith([monster(1, 3, 'goblin', 5, true), monster(2, 12, 'slime', 1)]),
      3,
      CONFIG,
    );
    expect(after.rareKilled).toBeUndefined();
  });

  it('skill hạ quái hiếm cũng tính (vàng ×3, đã hạ)', () => {
    const before = {
      ...stateWith([monster(1, 3, 'goblin', 2, true), monster(2, 12, 'slime', 20)]),
      skillCharge: 1,
    };
    const after = castSkill(before, CONFIG);
    expect(after.gold).toBe(2 * 3);
    expect(after.rareKilled).toBe(true);
  });

  it('quái thường cùng loại vẫn cho vàng thường', () => {
    const after = playTurn(
      stateWith([monster(1, 3, 'goblin', 1), monster(2, 12, 'slime', 1)]),
      3,
      CONFIG,
    );
    expect(after.gold).toBe(2);
    expect(after.rareKilled).toBeUndefined();
  });
});
