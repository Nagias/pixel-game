import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import { bestMove } from './autoPlay';
import { castSkill, createBattle, playTurn } from './battle';
import { BATTLE_CONFIG } from './battleConfig';
import type {
  BattleConfig,
  BattleState,
  LevelConfig,
  Monster,
  MonsterConfig,
  MonsterKind,
  WeaponConfig,
} from './battleTypes';

// F19 PR E (chủ dự án duyệt 03/11/2026, mục 4): bốn quái có hành vi riêng — mỗi loài ít nhất hai cách hạ, không bao
// giờ làm màn kẹt.
// - Nấm nổ (`explode`): chết (chém, skill, nổ) thì nổ — quái ở 8 ô quanh nó mất máu; nổ ở vòng 0 thì nhân vật mất
//   máu; nổ dây chuyền được. Nổ tính nhiệm vụ, vàng, quái hiếm; không làm quái vỏ cứng (trùm) mất máu.
// - Pháp sư yêu tinh (`shieldAllies`): hết lượt (sau khi quái đi) phủ khiên cho quái ở 8 ô quanh nó. Khiên đỡ trọn
//   một đòn (chém, skill, nổ) — quái có khiên vẫn giữ chỗ trong combo.
// - Tổ nhện (`stationary` + `summon`): không tự đi; cứ 3 lượt đẻ 1 Nhện con ra ô trống sát bên.
// - Rùa gai (`thorns`): mỗi lần vũ khí tầm gần chém trúng nó, nhân vật mất máu (sau khi kiểm thắng).

const weapon = (patch: Partial<WeaponConfig>): WeaponConfig => ({
  name: 'Kiếm thử',
  slot: 'near',
  rangeLabel: 'gần',
  push: 'none',
  widthSectors: 3,
  minRing: 0,
  maxRing: 5,
  damage: 1,
  ...patch,
});

const NEAR = 0;
const FAR = 1;

const kinds: Record<MonsterKind, MonsterConfig> = {
  slime: { name: 'Slime thử', hp: 2, advanceChance: 1, attack: 1, gold: 1 },
  slimeKing: { name: 'Vua thử', hp: 6, advanceChance: 1, attack: 2 },
  slimeCannon: { name: 'Pháo thử', hp: 2, advanceChance: 1, attack: 1, shootRing: 4 },
  slimeMini: { name: 'Con thử', hp: 1, advanceChance: 1, attack: 1 },
  slimeCharger: { name: 'Lao thử', hp: 2, advanceChance: 1, attack: 1, step: 2 },
  slimeGhost: { name: 'Ma thử', hp: 2, advanceChance: 1, attack: 1, ghost: true },
  goblin: { name: 'Yêu tinh thử', hp: 4, advanceChance: 1, attack: 2, gold: 2 },
  wolf: { name: 'Sói thử', hp: 4, advanceChance: 1, attack: 3, step: 2 },
  goblinArcher: { name: 'Cung thủ thử', hp: 3, advanceChance: 1, attack: 2, shootRing: 4 },
  bat: { name: 'Dơi thử', hp: 3, advanceChance: 1, attack: 1, ghost: true },
  treant: { name: 'Cây thử', hp: 9, advanceChance: 1, attack: 5, minComboOrder: 2 },
  mushroom: { name: 'Nấm thử', hp: 2, advanceChance: 1, attack: 1, gold: 2, explode: 2 },
  goblinShaman: { name: 'Pháp sư thử', hp: 3, advanceChance: 1, attack: 1, shieldAllies: true },
  spiderNest: {
    name: 'Tổ thử',
    hp: 5,
    advanceChance: 0,
    attack: 1,
    stationary: true,
    summon: { kind: 'spiderling', count: 1, every: 3 },
  },
  spiderling: { name: 'Nhện thử', hp: 1, advanceChance: 1, attack: 1 },
  turtle: { name: 'Rùa thử', hp: 5, advanceChance: 1, attack: 2, thorns: 1 },
};

const FAR_WEAPON = weapon({ name: 'Cung thử', slot: 'far', push: 'in' });
const BASE_LEVEL: LevelConfig = {
  turnLimit: 12,
  monsters: ['slime'],
  spread: 2,
  quest: { kind: 'goblin', count: 9 },
};

const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  weapons: [weapon({}), FAR_WEAPON],
  monsterKinds: kinds,
  hero: { hp: 20, healMinHits: 9, healAmount: 0 },
  critMultiplier: 2,
  skills: {
    iceRain: { name: 'Băng thử', damage: 1, freezeTurns: 1, chargeTurns: 1 },
    fireball: { name: 'Lửa thử', damage: 2, freezeTurns: 0, chargeTurns: 1 },
  },
  skillUnlockLevel: 0,
  levels: [BASE_LEVEL],
};

const monster = (
  id: number,
  sector: number,
  ring: number,
  kind: MonsterKind = 'slime',
  hp = kinds[kind].hp,
): Monster => ({ id, kind, sector, ring, hp });

function stateWith(monsters: Monster[], overrides: Partial<BattleState> = {}): BattleState {
  return {
    seed: 1,
    rng: seedRng(1),
    level: 0,
    turnsLeft: 12,
    heroHp: 20,
    loadout: { weapons: [NEAR, FAR], skill: 'fireball' },
    weaponIndex: NEAR,
    monsters,
    phase: 'playing',
    lossReason: null,
    lastAttack: null,
    skillCharge: 0,
    lastSkill: null,
    questProgress: 0,
    nextWave: 0,
    gold: 0,
    nextId: 50,
    ...overrides,
  };
}

const byId = (state: BattleState, id: number) => state.monsters.find((m) => m.id === id);
const EMPTY_SECTOR = 18;

// Quái đặt ở vòng 0 (áp sát — không tự đi) hoặc bị đóng băng để vị trí tính tay được.
describe('Nấm nổ', () => {
  it('chém chết nấm: quái ở 8 ô quanh nó mất 2 máu, quái xa hơn không', () => {
    const after = playTurn(
      stateWith([
        monster(1, 5, 1, 'mushroom', 1),
        monster(2, 4, 2, 'goblin'),
        monster(3, 7, 1, 'goblin'),
      ]),
      5,
      { ...CONFIG, weapons: [weapon({ widthSectors: 1, maxRing: 1 }), FAR_WEAPON] },
    );
    expect(byId(after, 1)).toBeUndefined();
    expect(byId(after, 2)?.hp).toBe(2);
    expect(byId(after, 3)?.hp).toBe(4);
    expect(after.lastAttack?.blasts).toEqual([{ monsterId: 2, damage: 2, killed: false }]);
  });

  it('nổ dây chuyền: nổ hạ nấm bên cạnh thì nấm đó nổ tiếp', () => {
    const narrow = { ...CONFIG, weapons: [weapon({ widthSectors: 1 }), FAR_WEAPON] };
    const after = playTurn(
      stateWith([
        monster(1, 5, 0, 'mushroom', 1),
        monster(2, 6, 0, 'mushroom'),
        monster(3, 7, 0, 'goblin'),
      ]),
      5,
      narrow,
    );
    expect(after.monsters.map((m) => m.id)).toEqual([3]);
    expect(byId(after, 3)?.hp).toBe(2);
  });

  it('nấm nổ ở vòng 0 (sát nhân vật) thì nhân vật mất 2 máu', () => {
    const after = playTurn(stateWith([monster(1, 5, 0, 'mushroom', 1)]), 5, CONFIG);
    expect(after.heroHp).toBe(18);
  });

  it('nổ tính nhiệm vụ và vàng; không làm quái vỏ cứng mất máu', () => {
    const narrow = { ...CONFIG, weapons: [weapon({ widthSectors: 1 }), FAR_WEAPON] };
    const after = playTurn(
      stateWith([
        monster(1, 5, 1, 'mushroom', 1),
        monster(2, 6, 1, 'goblin', 2),
        monster(3, 4, 1, 'treant'),
      ]),
      5,
      narrow,
    );
    expect(after.questProgress).toBe(1);
    expect(after.gold).toBe(2 + 2);
    expect(byId(after, 3)?.hp).toBe(9);
  });

  it('skill hạ nấm thì nấm cũng nổ', () => {
    const after = castSkill(
      stateWith([monster(1, 5, 1, 'mushroom'), monster(2, 6, 1, 'goblin', 9)], { skillCharge: 1 }),
      CONFIG,
    );
    expect(byId(after, 1)).toBeUndefined();
    expect(byId(after, 2)?.hp).toBe(9 - 2 - 2);
  });
});

describe('Pháp sư yêu tinh', () => {
  it('hết lượt: quái ở 8 ô quanh pháp sư có khiên; chính nó và quái xa thì không', () => {
    const after = playTurn(
      stateWith([
        monster(1, 5, 0, 'goblinShaman'),
        monster(2, 6, 0, 'goblin'),
        monster(3, 9, 0, 'goblin'),
      ]),
      EMPTY_SECTOR,
      CONFIG,
    );
    expect(byId(after, 2)?.shield).toBe(true);
    expect(byId(after, 1)?.shield).toBeUndefined();
    expect(byId(after, 3)?.shield).toBeUndefined();
  });

  it('khiên đỡ trọn một nhát chém (0 sát thương, mất khiên) nhưng vẫn giữ chỗ trong combo', () => {
    const after = playTurn(
      stateWith([
        { ...monster(1, 5, 0, 'goblin', 2), shield: true },
        monster(2, 6, 0, 'goblin', 9),
      ]),
      5,
      CONFIG,
    );
    expect(after.lastAttack?.hits.map((h) => h.damage)).toEqual([0, 2]);
    expect(byId(after, 1)).toMatchObject({ hp: 2 });
    expect(byId(after, 1)?.shield).toBeUndefined();
  });

  it('khiên đỡ skill và đỡ nổ', () => {
    const skilled = castSkill(
      stateWith([{ ...monster(1, 5, 1, 'goblin'), shield: true }], { skillCharge: 1 }),
      CONFIG,
    );
    expect(byId(skilled, 1)).toMatchObject({ hp: 4 });
    expect(byId(skilled, 1)?.shield).toBeUndefined();
    const narrow = { ...CONFIG, weapons: [weapon({ widthSectors: 1 }), FAR_WEAPON] };
    const blasted = playTurn(
      stateWith([monster(1, 5, 0, 'mushroom', 1), { ...monster(2, 6, 0, 'goblin'), shield: true }]),
      5,
      narrow,
    );
    expect(byId(blasted, 2)?.hp).toBe(4);
  });

  it('pháp sư đang bị đóng băng không phủ khiên', () => {
    const after = playTurn(
      stateWith([
        { ...monster(1, 5, 0, 'goblinShaman'), frozenTurns: 1 },
        monster(2, 6, 0, 'goblin'),
      ]),
      EMPTY_SECTOR,
      CONFIG,
    );
    expect(byId(after, 2)?.shield).toBeUndefined();
  });
});

describe('Tổ nhện', () => {
  it('không tự đi; hết lượt thứ 3 đẻ 1 Nhện con ở ô trống sát bên (vào trong trước)', () => {
    let state = stateWith([monster(1, 5, 5, 'spiderNest')]);
    for (let i = 0; i < 3; i++) state = playTurn(state, EMPTY_SECTOR, CONFIG);
    expect(byId(state, 1)).toMatchObject({ sector: 5, ring: 5 });
    expect(
      state.monsters.filter((m) => m.kind === 'spiderling').map((m) => [m.sector, m.ring]),
    ).toEqual([[5, 4]]);
  });

  it('vẫn bị đẩy / kéo bởi vũ khí (Cung kéo vào 1 vòng)', () => {
    const after = playTurn(
      stateWith([monster(1, 5, 5, 'spiderNest')], { weaponIndex: FAR }),
      5,
      CONFIG,
    );
    expect(byId(after, 1)).toMatchObject({ sector: 5, ring: 4 });
  });
});

describe('Rùa gai', () => {
  it('vũ khí tầm gần chém trúng rùa: nhân vật mất 1 máu mỗi con rùa trúng', () => {
    const after = playTurn(
      stateWith([monster(1, 5, 3, 'turtle'), monster(2, 6, 3, 'turtle')]),
      5,
      CONFIG,
    );
    expect(after.heroHp).toBe(18);
  });

  it('vũ khí tầm xa trúng rùa: không bị phản đòn', () => {
    const after = playTurn(
      stateWith([monster(1, 5, 3, 'turtle')], { weaponIndex: FAR }),
      5,
      CONFIG,
    );
    expect(after.heroHp).toBe(20);
  });

  it('nhát vừa xong nhiệm vụ thì thắng, không bị phản đòn', () => {
    const quick = {
      ...CONFIG,
      levels: [{ ...BASE_LEVEL, quest: { kind: 'turtle' as const, count: 1 } }],
    };
    const after = playTurn(stateWith([monster(1, 5, 3, 'turtle', 1)]), 5, quick);
    expect(after).toMatchObject({ phase: 'won', heroHp: 20 });
  });
});

describe('cấu hình quái mới', () => {
  const withKind = (kind: MonsterKind, patch: Partial<MonsterConfig>): BattleConfig => ({
    ...CONFIG,
    monsterKinds: { ...kinds, [kind]: { ...kinds[kind], ...patch } },
  });

  it.each<[string, MonsterKind, Partial<MonsterConfig>]>([
    ['sức nổ không nguyên', 'mushroom', { explode: 1.5 }],
    ['sức nổ < 1', 'mushroom', { explode: 0 }],
    ['phản đòn không nguyên', 'turtle', { thorns: 0.5 }],
  ])('sai bị từ chối: %s', (_, kind, patch) => {
    expect(() => createBattle(1, withKind(kind, patch), 0)).toThrow(RangeError);
  });

  it('cấu hình thật: món rơi theo loài mới đúng bảng duyệt; Nấm nổ và Nhện con không hóa hiếm', () => {
    const k = BATTLE_CONFIG.monsterKinds;
    expect(k.turtle).toMatchObject({ canBeRare: true, drop: 'Búa' });
    expect(k.goblinShaman).toMatchObject({ canBeRare: true, drop: 'Giáo' });
    expect(k.spiderNest).toMatchObject({ canBeRare: true, drop: 'Nỏ' });
    expect(k.mushroom.canBeRare).toBeFalsy();
    expect(k.spiderling.canBeRare).toBeFalsy();
  });

  it('mốc mở khóa vũ khí = màn đầu tiên có loài rơi món đó', () => {
    BATTLE_CONFIG.weapons.forEach((w) => {
      if (w.unlockAfterLevel === undefined) return;
      const droppers = Object.entries(BATTLE_CONFIG.monsterKinds)
        .filter(([, rule]) => rule.drop === w.name)
        .map(([kind]) => kind);
      const first = BATTLE_CONFIG.levels.findIndex((l) =>
        [l.monsters, ...(l.waves ?? [])].flat().some((kind) => droppers.includes(kind)),
      );
      expect(first, w.name).toBeGreaterThanOrEqual(0);
      expect(w.unlockAfterLevel, w.name).toBe(first);
    });
  });
});

describe('kết quả nhát chém ghi phần máu nhân vật mất vì quái mới (cho màn hình hiện)', () => {
  it('ghi số máu mất vì phản đòn và vì nổ sát nhân vật', () => {
    const thorned = playTurn(stateWith([monster(1, 5, 3, 'turtle')]), 5, CONFIG);
    expect(thorned.lastAttack).toMatchObject({ thorns: 1 });
    const blasted = playTurn(stateWith([monster(1, 5, 0, 'mushroom', 1)]), 5, CONFIG);
    expect(blasted.lastAttack).toMatchObject({ heroBlast: 2 });
  });
});

describe('bot ngắm chuẩn hiểu quái mới', () => {
  it('không chém Rùa gai bằng vũ khí tầm gần khi có nước khác (bị phản đòn)', () => {
    const narrowFar = weapon({
      name: 'Cung thử',
      slot: 'far',
      minRing: 4,
      maxRing: 5,
      widthSectors: 1,
    });
    // Nhiệm vụ là loài khác (không có trên sân): chỉ còn so số quái trúng và độ gần.
    const config = {
      ...CONFIG,
      weapons: [weapon({ maxRing: 1 }), narrowFar],
      levels: [{ ...BASE_LEVEL, quest: { kind: 'bat' as const, count: 1 } }],
    };
    const state = stateWith([monster(1, 5, 1, 'turtle'), monster(2, 15, 4, 'goblin')]);
    expect(bestMove(state, config)).toMatchObject({ weaponIndex: FAR, sector: 15 });
  });
});
