import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import { bestMove } from './autoPlay';
import { castSkill, createBattle, playTurn } from './battle';
import { BATTLE_CONFIG } from './battleConfig';
import type { BattleConfig, BattleState, Monster, MonsterKind, WeaponConfig } from './battleTypes';

// F19 PR D (chủ dự án duyệt 03/11/2026, mục 5): trùm Người Cây có luật riêng.
// - Vỏ cứng (`minComboOrder`): chỉ mất máu khi là con thứ 2 trở lên trong combo của một nhát chém; skill (đánh cả
//   sân, không combo) không làm nó mất máu (agent chọn: vẫn bị đóng băng).
// - Gọi quái (`summon`): cứ 3 lượt gọi 2 Yêu tinh ra ô trống sát bên — luôn có "mồi" để combo, không bao giờ kẹt
//   (bài học Slime Khiên: hết mồi là màn không thắng được).

/** Vũ khí với tới cả sân, rộng 3 lát, 1 sát thương, không đẩy, không chí mạng. */
const ALL_REACH: WeaponConfig = {
  name: 'Kiếm thử',
  slot: 'near',
  rangeLabel: 'cả sân',
  push: 'none',
  widthSectors: 3,
  minRing: 0,
  maxRing: 5,
  damage: 1,
};

const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  weapons: [ALL_REACH],
  monsterKinds: {
    slime: { name: 'Slime thử', hp: 2, advanceChance: 0, attack: 1 },
    slimeKing: { name: 'Vua thử', hp: 6, advanceChance: 1, attack: 2 },
    slimeCannon: { name: 'Pháo thử', hp: 2, advanceChance: 1, attack: 1, shootRing: 4 },
    slimeMini: { name: 'Con thử', hp: 1, advanceChance: 1, attack: 1 },
    slimeCharger: { name: 'Lao thử', hp: 2, advanceChance: 1, attack: 1, step: 2 },
    slimeGhost: { name: 'Ma thử', hp: 2, advanceChance: 1, attack: 1, ghost: true },
    goblin: { name: 'Yêu tinh thử', hp: 4, advanceChance: 1, attack: 2 },
    wolf: { name: 'Sói thử', hp: 4, advanceChance: 1, attack: 3, step: 2 },
    goblinArcher: { name: 'Cung thủ thử', hp: 3, advanceChance: 1, attack: 2, shootRing: 4 },
    bat: { name: 'Dơi thử', hp: 3, advanceChance: 1, attack: 1, ghost: true },
    treant: {
      name: 'Cây thử',
      hp: 14,
      advanceChance: 0,
      attack: 5,
      minComboOrder: 2,
      summon: { kind: 'goblin', count: 2, every: 3 },
    },
  },
  hero: { hp: 30, healMinHits: 9, healAmount: 0 },
  critMultiplier: 2,
  skills: {
    iceRain: { name: 'Băng thử', damage: 1, freezeTurns: 1, chargeTurns: 1 },
    fireball: { name: 'Lửa thử', damage: 3, freezeTurns: 0, chargeTurns: 1 },
  },
  skillUnlockLevel: 0,
  levels: [
    {
      turnLimit: 12,
      monsters: ['treant'],
      spread: 2,
      quest: { kind: 'treant', count: 1 },
      waves: [['slime']],
      nextWaveAt: 0,
    },
  ],
};

const monster = (
  id: number,
  sector: number,
  ring: number,
  kind: MonsterKind = 'slime',
  hp = CONFIG.monsterKinds[kind].hp,
): Monster => ({ id, kind, sector, ring, hp });

function stateWith(monsters: Monster[], overrides: Partial<BattleState> = {}): BattleState {
  return {
    seed: 1,
    rng: seedRng(1),
    level: 0,
    turnsLeft: 12,
    heroHp: 30,
    loadout: { weapons: [0], skill: 'iceRain' },
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
    nextId: 10,
    ...overrides,
  };
}

const byId = (state: BattleState, id: number) => state.monsters.find((m) => m.id === id);
/** Lát không trúng con nào trong các test dưới (vùng rộng 3 lát quanh lát ngắm). */
const EMPTY_SECTOR = 18;

describe('Người Cây — vỏ cứng: chỉ mất máu khi là con thứ ≥ 2 trong combo', () => {
  it('chém trúng mình trùm (con thứ 1): không mất máu, hiện trong nhát chém với 0 sát thương', () => {
    const after = playTurn(stateWith([monster(1, 5, 3, 'treant')]), 5, CONFIG);
    expect(byId(after, 1)?.hp).toBe(14);
    expect(after.lastAttack?.hits).toEqual([{ monsterId: 1, damage: 0, killed: false }]);
  });

  it('chém trúng trùm cùng một con khác (trùm trâu hơn nên là con thứ 2): trùm mất 2 × sát thương', () => {
    const after = playTurn(stateWith([monster(1, 5, 3, 'treant'), monster(2, 6, 3)]), 5, CONFIG);
    expect(byId(after, 1)?.hp).toBe(12);
    expect(after.lastAttack?.hits.map((h) => h.damage)).toEqual([1, 2]);
  });

  it('trùm yếu hơn con kia (đứng đầu combo) thì vẫn không mất máu', () => {
    const after = playTurn(
      stateWith([monster(1, 5, 3, 'treant', 3), monster(2, 6, 3, 'goblin')]),
      5,
      CONFIG,
    );
    expect(byId(after, 1)?.hp).toBe(3);
    expect(byId(after, 2)?.hp).toBe(2);
  });

  it('skill không làm trùm mất máu nhưng vẫn đóng băng nó; quái khác mất máu như thường', () => {
    const after = castSkill(
      stateWith([monster(1, 5, 3, 'treant'), monster(2, 12, 3, 'goblin')], { skillCharge: 1 }),
      CONFIG,
    );
    expect(byId(after, 1)).toMatchObject({ hp: 14, frozenTurns: 1 });
    expect(byId(after, 2)?.hp).toBe(3);
  });
});

// Trùm đặt ở vòng 0 (quái áp sát đứng yên, không đi lung tung) để vị trí quái được gọi tính tay được.
describe('Người Cây — cứ 3 lượt gọi 2 Yêu tinh ra ô trống sát bên', () => {
  const treantAt = (sector: number, ring: number) => monster(1, sector, ring, 'treant');

  it('chưa tới lượt thứ 3 thì không gọi; hết lượt thứ 3 thì có thêm 2 Yêu tinh ở ô trống sát bên theo thứ tự cố định', () => {
    let state = stateWith([treantAt(5, 0)]);
    state = playTurn(state, EMPTY_SECTOR, CONFIG);
    state = playTurn(state, EMPTY_SECTOR, CONFIG);
    expect(state.monsters).toHaveLength(1);
    state = playTurn(state, EMPTY_SECTOR, CONFIG);
    const goblins = state.monsters.filter((m) => m.kind === 'goblin');
    // Thứ tự: vào trong (không có — đã ở vòng 0), bên trái, bên phải, chéo trong, ra ngoài.
    expect(goblins.map((m) => [m.sector, m.ring])).toEqual([
      [4, 0],
      [6, 0],
    ]);
    expect(goblins.map((m) => m.hp)).toEqual([4, 4]);
  });

  it('quái được gọi mang id mới, không trùng; đợt quái ra sau đó cũng không trùng id', () => {
    let state = stateWith([treantAt(5, 0)], { nextId: 7 });
    for (let i = 0; i < 3; i++) state = playTurn(state, EMPTY_SECTOR, CONFIG);
    expect(state.monsters.map((m) => m.id).sort()).toEqual([1, 7, 8]);
    expect(state.nextId).toBe(9);
  });

  it('ô sát bên có quái thì gọi vào ô kế trong thứ tự; hết ô trống thì gọi ít hơn', () => {
    // Ô sát bên chỉ còn (lát 6, vòng 1) trống; quái ở vòng 1 bị đóng băng để đứng yên.
    const crowded = [
      treantAt(5, 0),
      monster(2, 4, 0),
      monster(3, 6, 0),
      { ...monster(4, 5, 1), frozenTurns: 2 },
      { ...monster(5, 4, 1), frozenTurns: 2 },
    ];
    // Còn 10 lượt: nhát này là lượt thứ 3 của màn (12 lượt).
    let state = stateWith(crowded, { turnsLeft: 10 });
    state = playTurn(state, EMPTY_SECTOR, CONFIG);
    const goblins = state.monsters.filter((m) => m.kind === 'goblin');
    expect(goblins.map((m) => [m.sector, m.ring])).toEqual([[6, 1]]);
  });

  it('trùm đang bị đóng băng thì không gọi', () => {
    const frozen = { ...treantAt(5, 0), frozenTurns: 1 };
    const state = playTurn(stateWith([frozen], { turnsLeft: 10 }), EMPTY_SECTOR, CONFIG);
    expect(state.monsters.filter((m) => m.kind === 'goblin')).toHaveLength(0);
  });

  it('nhát chém xong nhiệm vụ thì thắng ngay, không gọi thêm', () => {
    const state = stateWith([monster(1, 5, 3, 'treant', 2), monster(2, 6, 3, 'slime', 1)], {
      turnsLeft: 10,
    });
    const after = playTurn(state, 5, CONFIG);
    expect(after.phase).toBe('won');
    expect(after.monsters.filter((m) => m.kind === 'goblin')).toHaveLength(0);
  });
});

describe('cấu hình trùm sai bị từ chối', () => {
  const withTreant = (patch: Partial<BattleConfig['monsterKinds']['treant']>): BattleConfig => ({
    ...CONFIG,
    monsterKinds: { ...CONFIG.monsterKinds, treant: { ...CONFIG.monsterKinds.treant, ...patch } },
  });

  it.each<[string, Partial<BattleConfig['monsterKinds']['treant']>]>([
    ['thứ tự combo tối thiểu không nguyên', { minComboOrder: 1.5 }],
    ['thứ tự combo tối thiểu < 1', { minComboOrder: 0 }],
    ['gọi loài quái không có', { summon: { kind: 'rong' as MonsterKind, count: 2, every: 3 } }],
    ['gọi 0 con', { summon: { kind: 'goblin', count: 0, every: 3 } }],
    ['gọi mỗi 0 lượt', { summon: { kind: 'goblin', count: 2, every: 0 } }],
  ])('%s', (_, patch) => {
    expect(() => createBattle(1, withTreant(patch), 0)).toThrow(RangeError);
  });

  it('cấu hình thật: Người Cây vỏ cứng 2, cứ 3 lượt gọi 2 Yêu tinh', () => {
    expect(BATTLE_CONFIG.monsterKinds.treant).toMatchObject({
      minComboOrder: 2,
      summon: { kind: 'goblin', count: 2, every: 3 },
    });
  });
});

describe('bot ngắm chuẩn hiểu vỏ cứng', () => {
  it('không chém mình trùm (vô ích) mà chém cụm quái khác', () => {
    const state = stateWith([monster(1, 5, 3, 'treant'), monster(2, 15, 3), monster(3, 16, 3)]);
    const move = bestMove(state, CONFIG);
    expect([14, 15, 16, 17]).toContain(move.sector);
  });

  it('trùm đứng cạnh quái khác thì chém cả hai (trùm là con thứ 2, mất máu)', () => {
    const state = stateWith([monster(1, 5, 3, 'treant'), monster(2, 6, 3), monster(3, 15, 3)]);
    expect([5, 6]).toContain(bestMove(state, CONFIG).sector);
  });
});
