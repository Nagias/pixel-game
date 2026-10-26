import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import {
  createBattle,
  isGameCleared,
  isThreatening,
  nextLevelIndex,
  playTurn,
  selectWeapon,
} from './battle';
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

// Cấu hình riêng cho test: con số cố định để kỳ vọng tính tay được,
// không gãy khi chỉnh cân bằng trong battleConfig.ts.
// Một vũ khí với tới cả sân — để các test luật đánh/di chuyển không phụ thuộc chuyện đổi vũ khí.
const ALL_REACH: WeaponConfig = {
  name: 'Kiếm thử',
  rangeLabel: 'cả sân',
  push: 'none',
  widthSectors: 3,
  minRing: 0,
  maxRing: 5,
  damage: 1,
};

const slimes = (count: number): MonsterKind[] => Array<MonsterKind>(count).fill('slime');

/** Màn thử: 4 slime, 5 lượt, cụm ±2 lát. */
const LEVEL_1: LevelConfig = { turnLimit: 5, monsters: slimes(4), spread: 2 };

const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  weapons: [ALL_REACH],
  monsterKinds: {
    slime: { name: 'Slime thử', hp: 2, advanceChance: 1, attack: 1 },
    slimeKing: { name: 'Vua thử', hp: 6, advanceChance: 1, attack: 2 },
  },
  hero: { hp: 5 },
  levels: [LEVEL_1],
};

/** Cấu hình chỉ có một màn, sửa vài con số của màn đó. */
const oneLevel = (patch: Partial<LevelConfig>): BattleConfig => ({
  ...CONFIG,
  levels: [{ ...LEVEL_1, ...patch }],
});

/** Sửa con số của một loại quái. */
const kindRule = (kind: MonsterKind, patch: Partial<MonsterConfig>): BattleConfig => ({
  ...CONFIG,
  monsterKinds: { ...CONFIG.monsterKinds, [kind]: { ...CONFIG.monsterKinds[kind], ...patch } },
});

/** Ba vũ khí theo tầm như F02: gần (vòng 0–1), vừa (2–3), xa (4–5). */
const THREE_WEAPONS: BattleConfig = {
  ...CONFIG,
  weapons: [
    {
      name: 'Kiếm',
      rangeLabel: 'gần',
      push: 'none',
      widthSectors: 5,
      minRing: 0,
      maxRing: 1,
      damage: 1,
    },
    {
      name: 'Giáo',
      rangeLabel: 'vừa',
      push: 'none',
      widthSectors: 3,
      minRing: 2,
      maxRing: 3,
      damage: 1,
    },
    {
      name: 'Cung',
      rangeLabel: 'xa',
      push: 'none',
      widthSectors: 1,
      minRing: 4,
      maxRing: 5,
      damage: 1,
    },
  ],
};

/** F05: một vũ khí với tới cả sân, đẩy theo kiểu `push`. */
const pushing = (push: WeaponConfig['push'], patch: Partial<WeaponConfig> = {}): BattleConfig => ({
  ...CONFIG,
  weapons: [{ ...ALL_REACH, push, ...patch }],
});

/** Mọi loại quái luôn tiến (advanceChance 1) hoặc luôn đi ngang (0) để kết quả đoán trước được. */
const withAdvanceChance = (advanceChance: number): BattleConfig => ({
  ...CONFIG,
  monsterKinds: {
    slime: { ...CONFIG.monsterKinds.slime, advanceChance },
    slimeKing: { ...CONFIG.monsterKinds.slimeKing, advanceChance },
  },
});

const monster = (
  id: number,
  sector: number,
  ring: number,
  hp = 2,
  kind: MonsterKind = 'slime',
): Monster => ({ id, kind, sector, ring, hp });

function stateWith(monsters: Monster[], overrides: Partial<BattleState> = {}): BattleState {
  return {
    seed: 1,
    rng: seedRng(1),
    level: 0,
    turnsLeft: 5,
    heroHp: 5,
    weaponIndex: 0,
    monsters,
    phase: 'playing',
    lossReason: null,
    lastAttack: null,
    ...overrides,
  };
}

const byId = (state: BattleState, id: number) => state.monsters.find((m) => m.id === id);

/** Khoảng cách ngắn nhất giữa hai lát trên vòng tròn. */
const circularDistance = (a: number, b: number, count: number) => {
  const d = Math.abs(a - b) % count;
  return Math.min(d, count - d);
};

describe('createBattle — mở trận', () => {
  it('tạo đúng số quái, tất cả ở vòng ngoài cùng, máu đầy, id không trùng', () => {
    const battle = createBattle(7, CONFIG, 0);
    expect(battle.monsters).toHaveLength(4);
    for (const m of battle.monsters) {
      expect(m.ring).toBe(5);
      expect(m.hp).toBe(2);
    }
    expect(new Set(battle.monsters.map((m) => m.id)).size).toBe(4);
  });

  it('quái xuất hiện thành cụm (cách nhau tối đa 2×spread lát) và không đứng chồng lên nhau', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const sectors = createBattle(seed, CONFIG, 0).monsters.map((m) => m.sector);
      expect(new Set(sectors).size).toBe(sectors.length);
      for (const a of sectors) {
        for (const b of sectors) {
          expect(circularDistance(a, b, 24)).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it('bắt đầu ở trạng thái đang chơi với đủ lượt và ghi lại seed', () => {
    const battle = createBattle(123, CONFIG, 0);
    expect(battle).toMatchObject({
      seed: 123,
      level: 0,
      turnsLeft: 5,
      weaponIndex: 0,
      phase: 'playing',
      lossReason: null,
      lastAttack: null,
    });
  });

  it('cùng seed cho cùng trận, seed khác cho trận khác', () => {
    expect(createBattle(9, CONFIG, 0)).toEqual(createBattle(9, CONFIG, 0));
    expect(createBattle(1, CONFIG, 0).monsters).not.toEqual(createBattle(2, CONFIG, 0).monsters);
  });

  it('từ chối cấu hình không đủ chỗ cho cụm quái', () => {
    const crowded = oneLevel({ monsters: slimes(6), spread: 2 });
    expect(() => createBattle(1, crowded, 0)).toThrow(RangeError);
  });
});

describe('createBattle — chặn cấu hình sai trước khi mở trận', () => {
  // Vũ khí sai nằm ở vị trí thứ 2 để chắc mọi vũ khí đều được kiểm, không chỉ vũ khí đầu.
  const weapon = (patch: Partial<WeaponConfig>): BattleConfig => ({
    ...CONFIG,
    weapons: [ALL_REACH, { ...ALL_REACH, ...patch }],
  });

  it.each<[string, BattleConfig]>([
    [
      'cụm quái rộng hơn cả vòng tròn (quái chồng ô)',
      oneLevel({ monsters: slimes(25), spread: 12 }),
    ],
    ['vùng đánh rộng số chẵn lát', weapon({ widthSectors: 2 })],
    ['vùng đánh rộng hơn cả vòng tròn', weapon({ widthSectors: 25 })],
    ['vũ khí với tới vòng không tồn tại', weapon({ maxRing: 6 })],
    ['vòng trong của vũ khí lớn hơn vòng ngoài', weapon({ minRing: 3, maxRing: 2 })],
    ['vòng trong của vũ khí âm', weapon({ minRing: -1 })],
    ['vũ khí không gây sát thương', weapon({ damage: 0 })],
    ['không có vũ khí nào', { ...CONFIG, weapons: [] }],
    ['không có lượt nào', oneLevel({ turnLimit: 0 })],
    ['quái không có máu', kindRule('slime', { hp: 0 })],
    ['xác suất tiến vào lớn hơn 1', kindRule('slime', { advanceChance: 1.5 })],
    ['xác suất tiến vào âm', kindRule('slime', { advanceChance: -0.1 })],
    ['nhân vật không có máu', { ...CONFIG, hero: { hp: 0 } }],
    ['quái không có sức đánh', kindRule('slime', { attack: 0 })],
    ['kiểu đẩy không tồn tại', weapon({ push: 'xoay' as WeaponConfig['push'] })],
    // B2: nêm sau lưng nằm đúng lát đối diện → số lát phải chẵn; hai nêm không được chồng nhau.
    ['vũ khí hai phía trên sân số lát lẻ', { ...weapon({ twoSided: true }), sectorCount: 23 }],
    ['vũ khí hai phía có hai nêm chồng nhau', weapon({ twoSided: true, widthSectors: 13 })],
    // F06: mọi loại quái và mọi màn đều được kiểm, kể cả loại/màn chưa dùng tới lúc mở màn 1.
    ['trùm không có máu', kindRule('slimeKing', { hp: 0 })],
    ['trùm không có sức đánh', kindRule('slimeKing', { attack: 0 })],
    ['không có màn nào', { ...CONFIG, levels: [] }],
    ['màn không có quái', oneLevel({ monsters: [] })],
    ['màn có loại quái không tồn tại', oneLevel({ monsters: ['rong' as MonsterKind] })],
    ['màn thứ 2 không có lượt nào', { ...CONFIG, levels: [LEVEL_1, { ...LEVEL_1, turnLimit: 0 }] }],
  ])('từ chối: %s', (_label, config) => {
    expect(() => createBattle(1, config, 0)).toThrow(RangeError);
  });

  it('cấu hình thật của game hợp lệ, mở được mọi màn', () => {
    BATTLE_CONFIG.levels.forEach((_, level) => {
      expect(() => createBattle(1, BATTLE_CONFIG, level)).not.toThrow();
    });
  });
});

describe('selectWeapon — đổi vũ khí (F02)', () => {
  it('trận mới cầm vũ khí đầu tiên trong danh sách', () => {
    expect(createBattle(1, THREE_WEAPONS, 0).weaponIndex).toBe(0);
  });

  it('đổi vũ khí không tốn lượt, quái không di chuyển, không tung số ngẫu nhiên', () => {
    const before = stateWith([monster(1, 12, 5)]);
    expect(selectWeapon(before, 2, THREE_WEAPONS)).toEqual({ ...before, weaponIndex: 2 });
  });

  it('nhát chém dùng vùng của vũ khí đang cầm: cung trúng quái ở rìa, kiếm trúng quái sát người', () => {
    // Quái 1 ở rìa sân (vòng 5), quái 2 sát người (vòng 1), cùng lát 0.
    const monsters = [monster(1, 0, 5), monster(2, 0, 1)];
    const withSword = playTurn(stateWith(monsters, { weaponIndex: 0 }), 0, THREE_WEAPONS);
    const withBow = playTurn(stateWith(monsters, { weaponIndex: 2 }), 0, THREE_WEAPONS);
    expect(withSword.lastAttack?.hits.map((hit) => hit.monsterId)).toEqual([2]);
    expect(withBow.lastAttack?.hits.map((hit) => hit.monsterId)).toEqual([1]);
  });

  it('độ rộng vùng theo vũ khí: kiếm rộng 5 lát trúng quái lệch 2 lát, cung rộng 1 lát thì trượt', () => {
    const swordReach = playTurn(
      stateWith([monster(1, 2, 0)], { weaponIndex: 0 }),
      0,
      THREE_WEAPONS,
    );
    const bowMiss = playTurn(stateWith([monster(1, 1, 5)], { weaponIndex: 2 }), 0, THREE_WEAPONS);
    expect(swordReach.lastAttack?.hits).toHaveLength(1);
    expect(bowMiss.lastAttack?.hits).toEqual([]);
  });

  it('từ chối vũ khí không có trong danh sách', () => {
    const state = stateWith([monster(1, 12, 5)]);
    expect(() => selectWeapon(state, 3, THREE_WEAPONS)).toThrow(RangeError);
    expect(() => selectWeapon(state, -1, THREE_WEAPONS)).toThrow(RangeError);
    expect(() => selectWeapon(state, 1.5, THREE_WEAPONS)).toThrow(RangeError);
  });

  it('không đổi vũ khí khi trận đã kết thúc', () => {
    expect(() => selectWeapon(stateWith([], { phase: 'won' }), 1, THREE_WEAPONS)).toThrow();
  });
});

describe('playTurn — một nhát đánh', () => {
  it('quái trong vùng xanh mất máu, quái ngoài vùng giữ nguyên', () => {
    const before = stateWith([monster(1, 0, 5), monster(3, 5, 5)]);
    const after = playTurn(before, 0, CONFIG);
    expect(byId(after, 1)?.hp).toBe(1);
    expect(byId(after, 3)?.hp).toBe(2);
  });

  it('quái hết máu bị loại khỏi sân', () => {
    const before = stateWith([monster(1, 0, 5, 1), monster(2, 12, 5)]);
    const after = playTurn(before, 0, CONFIG);
    expect(byId(after, 1)).toBeUndefined();
    expect(byId(after, 2)).toBeDefined();
  });

  it('ghi lại nhát đánh (lát ngắm, ai trúng theo thứ tự combo, sát thương, ai chết)', () => {
    // F03: quái 1 (1 máu) bị chém trước ăn 1; quái 2 (2 máu) là con thứ hai, ăn 2 → chết luôn.
    const before = stateWith([monster(1, 0, 5, 1), monster(2, 1, 5), monster(3, 12, 5)]);
    const after = playTurn(before, 0, CONFIG);
    expect(after.lastAttack).toEqual({
      aimSector: 0,
      hits: [
        { monsterId: 1, damage: 1, killed: true },
        { monsterId: 2, damage: 2, killed: true },
      ],
    });
  });

  it('vũ khí không đánh được quái nằm ngoài khoảng vòng của nó', () => {
    const shortReach = { ...CONFIG, weapons: [{ ...ALL_REACH, maxRing: 2 }] };
    const after = playTurn(stateWith([monster(1, 0, 5)]), 0, shortReach);
    expect(after.lastAttack?.hits).toEqual([]);
  });

  it('mỗi nhát đánh tốn đúng 1 lượt', () => {
    const after = playTurn(stateWith([monster(1, 12, 5)], { turnsLeft: 5 }), 0, CONFIG);
    expect(after.turnsLeft).toBe(4);
  });
});

describe('playTurn — combo gom cụm (F03)', () => {
  it('chém trúng 3 quái: con thứ 1 ăn 100%, thứ 2 ăn 200%, thứ 3 ăn 300% sát thương', () => {
    // Cùng 10 máu → con gần nhân vật hơn bị chém trước: quái 2 (vòng 3), quái 3 (vòng 4), quái 1 (vòng 5).
    const before = stateWith([monster(1, 0, 5, 10), monster(2, 1, 3, 10), monster(3, 23, 4, 10)]);
    const after = playTurn(before, 0, withAdvanceChance(0));
    expect(after.lastAttack?.hits).toEqual([
      { monsterId: 2, damage: 1, killed: false },
      { monsterId: 3, damage: 2, killed: false },
      { monsterId: 1, damage: 3, killed: false },
    ]);
    expect(byId(after, 2)?.hp).toBe(9);
    expect(byId(after, 3)?.hp).toBe(8);
    expect(byId(after, 1)?.hp).toBe(7);
  });

  it('con ít máu nhất bị chém trước, để nhát mạnh nhất dồn vào con trâu nhất', () => {
    const before = stateWith([monster(1, 0, 5, 5), monster(2, 1, 5, 1)]);
    const after = playTurn(before, 0, withAdvanceChance(0));
    expect(after.lastAttack?.hits).toEqual([
      { monsterId: 2, damage: 1, killed: true },
      { monsterId: 1, damage: 2, killed: false },
    ]);
    expect(byId(after, 1)?.hp).toBe(3);
  });

  it('bằng máu và cùng vòng thì theo id', () => {
    const before = stateWith([monster(2, 0, 5, 10), monster(1, 1, 5, 10)]);
    const after = playTurn(before, 0, withAdvanceChance(0));
    expect(after.lastAttack?.hits.map((hit) => hit.monsterId)).toEqual([1, 2]);
  });

  it('nhân theo sát thương của vũ khí: vũ khí 2 sát thương → 2, 4', () => {
    const strong = { ...CONFIG, weapons: [{ ...ALL_REACH, damage: 2 }] };
    const before = stateWith([monster(1, 0, 5, 10), monster(2, 1, 5, 10)]);
    const after = playTurn(before, 0, strong);
    expect(after.lastAttack?.hits.map((hit) => hit.damage)).toEqual([2, 4]);
  });
});

describe('playTurn — quái di chuyển sau nhát đánh', () => {
  it('khi luật là luôn tiến: quái còn sống tiến vào đúng 1 vòng, giữ lát', () => {
    const after = playTurn(stateWith([monster(1, 12, 5)]), 0, withAdvanceChance(1));
    expect(byId(after, 1)).toMatchObject({ sector: 12, ring: 4 });
  });

  it('khi luật là luôn đi ngang: quái giữ vòng và lệch đúng 1 lát, có cả hai chiều', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) {
      const before = stateWith([monster(1, 12, 5)], { rng: seedRng(seed) });
      const moved = byId(playTurn(before, 0, withAdvanceChance(0)), 1);
      expect(moved?.ring).toBe(5);
      expect([11, 13]).toContain(moved?.sector);
      seen.add(moved?.sector ?? -1);
    }
    expect([...seen].sort()).toEqual([11, 13]);
  });

  it('mỗi lượt dùng số ngẫu nhiên mới (quái không đi một hướng mãi)', () => {
    const config = withAdvanceChance(0);
    let state = stateWith([monster(1, 12, 5)], { turnsLeft: 99 });
    const steps = new Set<number>();
    for (let turn = 0; turn < 10; turn++) {
      const from = byId(state, 1)?.sector ?? 0;
      state = playTurn(state, 0, config);
      const to = byId(state, 1)?.sector ?? 0;
      steps.add((to - from + 24) % 24);
    }
    expect([...steps].sort((a, b) => a - b)).toEqual([1, 23]);
  });

  it('quái không đi vào ô đang có quái khác — đứng yên; xét lần lượt theo id', () => {
    // Quái 1 muốn tiến vào ô của quái 2 nên đứng yên; sau đó quái 2 mới tiến.
    const before = stateWith([monster(1, 0, 3), monster(2, 0, 2)]);
    const after = playTurn(before, 12, withAdvanceChance(1));
    expect(byId(after, 1)).toMatchObject({ sector: 0, ring: 3 });
    expect(byId(after, 2)).toMatchObject({ sector: 0, ring: 1 });
  });

  it('quái được đi vào ô mà quái id nhỏ hơn vừa rời trong cùng lượt', () => {
    const before = stateWith([monster(1, 0, 2), monster(2, 0, 3)]);
    const after = playTurn(before, 12, withAdvanceChance(1));
    expect(byId(after, 1)).toMatchObject({ sector: 0, ring: 1 });
    expect(byId(after, 2)).toMatchObject({ sector: 0, ring: 2 });
  });

  it('đi ngang mà cả hai bên đều có quái thì đứng yên', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const before = stateWith([monster(1, 12, 5), monster(2, 11, 5), monster(3, 13, 5)], {
        rng: seedRng(seed),
      });
      expect(byId(playTurn(before, 0, withAdvanceChance(0)), 1)).toMatchObject({
        sector: 12,
        ring: 5,
      });
    }
  });

  it.each([
    [0, [1, 23]],
    [23, [0, 22]],
  ])('đi ngang từ lát %i quấn vòng đúng sang %j', (start, expected) => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) {
      const before = stateWith([monster(1, start, 5)], { rng: seedRng(seed) });
      seen.add(byId(playTurn(before, 6, withAdvanceChance(0)), 1)?.sector ?? -1);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual(expected);
  });
});

describe('playTurn — thắng / thua', () => {
  it('giết hết quái thì thắng ngay, không tung số ngẫu nhiên cho lượt di chuyển', () => {
    const before = stateWith([monster(1, 0, 5, 1)]);
    const after = playTurn(before, 0, CONFIG);
    expect(after).toMatchObject({ phase: 'won', lossReason: null, monsters: [] });
    expect(after.rng).toBe(before.rng);
  });

  it('F04: máu nhân vật về 0 → thua vì gục', () => {
    const after = playTurn(stateWith([monster(1, 12, 0)], { heroHp: 1 }), 0, CONFIG);
    expect(after).toMatchObject({ phase: 'lost', lossReason: 'heroDefeated', heroHp: 0 });
  });

  it('dùng hết lượt mà còn quái → thua vì hết lượt', () => {
    const after = playTurn(stateWith([monster(1, 12, 5)], { turnsLeft: 1 }), 0, CONFIG);
    expect(after).toMatchObject({ phase: 'lost', lossReason: 'outOfTurns', turnsLeft: 0 });
  });

  it('nhát cuối giết hết quái thì vẫn thắng dù vừa hết lượt', () => {
    const after = playTurn(stateWith([monster(1, 0, 5, 1)], { turnsLeft: 1 }), 0, CONFIG);
    expect(after).toMatchObject({ phase: 'won', turnsLeft: 0 });
  });

  it('cùng lúc hết lượt và hết máu thì báo lý do hết máu', () => {
    const before = stateWith([monster(1, 12, 0)], { turnsLeft: 1, heroHp: 1 });
    const after = playTurn(before, 0, withAdvanceChance(1));
    expect(after).toMatchObject({ phase: 'lost', lossReason: 'heroDefeated' });
  });
});

describe('F04 — máu nhân vật và quái áp sát đánh', () => {
  it('trận mới: nhân vật đầy máu theo cấu hình', () => {
    expect(createBattle(1, CONFIG, 0).heroHp).toBe(5);
  });

  it('quái ở vòng 0 không tiến nữa mà đứng yên đánh: mỗi con trừ đúng sức đánh của nó', () => {
    const before = stateWith([monster(1, 12, 0), monster(2, 13, 0), monster(3, 20, 5)]);
    const after = playTurn(before, 6, withAdvanceChance(1));
    expect(after.heroHp).toBe(3);
    expect(byId(after, 1)).toMatchObject({ sector: 12, ring: 0 });
    expect(byId(after, 2)).toMatchObject({ sector: 13, ring: 0 });
    expect(after.phase).toBe('playing');
  });

  it('quái áp sát cũng không đi ngang (luật luôn đi ngang vẫn đứng yên)', () => {
    const after = playTurn(stateWith([monster(1, 12, 0)]), 6, withAdvanceChance(0));
    expect(byId(after, 1)).toMatchObject({ sector: 12, ring: 0 });
  });

  it('quái vừa tiến vào vòng 0 trong lượt này chưa đánh ngay — lượt sau mới đánh', () => {
    const after = playTurn(stateWith([monster(1, 12, 1)]), 6, withAdvanceChance(1));
    expect(byId(after, 1)?.ring).toBe(0);
    expect(after.heroHp).toBe(5);
  });

  it('quái áp sát bị diệt trong nhát chém thì không kịp đánh', () => {
    const before = stateWith([monster(1, 0, 0, 1), monster(2, 12, 5)]);
    const after = playTurn(before, 0, CONFIG);
    expect(byId(after, 1)).toBeUndefined();
    expect(after.heroHp).toBe(5);
  });

  it('sức đánh lấy từ cấu hình quái', () => {
    const hard = kindRule('slime', { attack: 2 });
    const after = playTurn(stateWith([monster(1, 12, 0)]), 6, hard);
    expect(after.heroHp).toBe(3);
  });

  it('quái đang đánh không tung số ngẫu nhiên (chỉ quái di chuyển mới tung)', () => {
    const before = stateWith([monster(1, 12, 0)]);
    expect(playTurn(before, 6, withAdvanceChance(0.5)).rng).toBe(before.rng);
  });

  it('isThreatening: chỉ quái ở vòng 0 là sắp đánh (để hiện dấu "!")', () => {
    expect(isThreatening(monster(1, 12, 0))).toBe(true);
    expect(isThreatening(monster(1, 12, 1))).toBe(false);
  });
});

describe('playTurn — hợp đồng hàm thuần', () => {
  it('không chạy tiếp khi trận đã kết thúc', () => {
    expect(() => playTurn(stateWith([], { phase: 'won' }), 0, CONFIG)).toThrow();
  });

  it('từ chối lát ngắm nằm ngoài sân', () => {
    const state = stateWith([monster(1, 12, 5)]);
    expect(() => playTurn(state, 24, CONFIG)).toThrow(RangeError);
    expect(() => playTurn(state, -1, CONFIG)).toThrow(RangeError);
    expect(() => playTurn(state, 1.5, CONFIG)).toThrow(RangeError);
  });

  it('không sửa state đầu vào', () => {
    const before = stateWith([monster(1, 0, 5), monster(2, 12, 3)]);
    const snapshot = structuredClone(before);
    playTurn(before, 0, withAdvanceChance(0.5));
    expect(before).toEqual(snapshot);
  });

  it('cùng state và cùng lát ngắm luôn cho cùng kết quả', () => {
    const state = stateWith([monster(1, 0, 5), monster(2, 12, 3), monster(3, 20, 4)]);
    const config = withAdvanceChance(0.5);
    expect(playTurn(state, 0, config)).toEqual(playTurn(state, 0, config));
  });
});

describe('F05 — đẩy quái theo vũ khí', () => {
  // Quái 5 máu để sống sót sau nhát chém; luật "luôn tiến" để thấy rõ quái bị đẩy thì đứng yên.
  const ALWAYS_ADVANCE = { monsterKinds: withAdvanceChance(1).monsterKinds };

  it('Kiếm (đẩy lùi): quái bị chém còn sống lùi ra 1 vòng và đứng yên lượt đó', () => {
    const config = { ...pushing('out'), ...ALWAYS_ADVANCE };
    const after = playTurn(stateWith([monster(1, 0, 1, 5)]), 0, config);
    expect(byId(after, 1)).toMatchObject({ sector: 0, ring: 2 });
  });

  it('Giáo (đẩy phải): lệch 1 lát theo chiều kim đồng hồ, quấn qua lát 0', () => {
    const config = { ...pushing('clockwise'), ...ALWAYS_ADVANCE };
    const after = playTurn(stateWith([monster(1, 23, 2, 5)]), 0, config);
    expect(byId(after, 1)).toMatchObject({ sector: 0, ring: 2 });
  });

  it('Cung (kéo vào): quái vào gần 1 vòng và đứng yên lượt đó', () => {
    // Luật "luôn đi ngang": nếu không bị kéo, quái sẽ lệch lát chứ không vào vòng 4 cùng lát.
    const config = { ...pushing('in'), monsterKinds: withAdvanceChance(0).monsterKinds };
    const after = playTurn(stateWith([monster(1, 0, 5, 5)]), 0, config);
    expect(byId(after, 1)).toMatchObject({ sector: 0, ring: 4 });
  });

  it('quái không bị chém thì không bị đẩy, vẫn di chuyển bình thường', () => {
    const config = { ...pushing('out'), ...ALWAYS_ADVANCE };
    const after = playTurn(stateWith([monster(1, 12, 3, 5)]), 0, config);
    expect(byId(after, 1)).toMatchObject({ sector: 12, ring: 2 });
  });

  it('ô đích có quái khác thì không bị đẩy — và vẫn hành động bình thường', () => {
    // Kiếm chỉ với tới vòng 0–1: quái 1 bị chém, muốn lùi ra vòng 2 nhưng quái 2 đang đứng đó.
    const config = { ...pushing('out', { minRing: 0, maxRing: 1 }), ...ALWAYS_ADVANCE };
    const before = stateWith([monster(1, 0, 1, 5), monster(2, 0, 2, 5)]);
    const after = playTurn(before, 0, config);
    expect(byId(after, 1)).toMatchObject({ sector: 0, ring: 0 }); // không bị đẩy → tiến vào như thường
  });

  it('ô đích nằm ngoài sân thì không bị đẩy', () => {
    const config = { ...pushing('out'), ...ALWAYS_ADVANCE };
    const after = playTurn(stateWith([monster(1, 0, 5, 5)]), 0, config);
    expect(byId(after, 1)).toMatchObject({ sector: 0, ring: 4 }); // không lùi ra vòng 6 → tiến như thường
  });

  it('đẩy theo thứ tự combo: con bị chém trước được đẩy trước', () => {
    // Quái 1 ít máu hơn nên bị chém trước; nó muốn sang lát 1 nhưng quái 2 còn đứng đó → bị chặn.
    // Sau đó quái 2 mới bị đẩy sang lát 2.
    const config = { ...pushing('clockwise'), ...ALWAYS_ADVANCE };
    const before = stateWith([monster(1, 0, 2, 2), monster(2, 1, 2, 5)]);
    const after = playTurn(before, 0, config);
    expect(byId(after, 1)).toMatchObject({ sector: 0, ring: 1 }); // bị chặn → tiến như thường
    expect(byId(after, 2)).toMatchObject({ sector: 2, ring: 2 }); // bị đẩy → đứng yên ở ô mới
  });

  it('Kiếm đẩy con có dấu "!" ra vòng 1 nên lượt đó nó không đánh được', () => {
    const after = playTurn(stateWith([monster(1, 0, 0, 5)]), 0, pushing('out'));
    expect(byId(after, 1)?.ring).toBe(1);
    expect(after.heroHp).toBe(5);
  });

  it('đẩy không tung số ngẫu nhiên', () => {
    const before = stateWith([monster(1, 0, 1, 5)]);
    const config = { ...pushing('out'), monsterKinds: withAdvanceChance(0.5).monsterKinds };
    expect(playTurn(before, 0, config).rng).toBe(before.rng);
  });
});

describe('B2 — vũ khí chém hai phía (Rìu)', () => {
  // Rìu thử: một lát mỗi nêm, vòng 0–1. Ngắm lát 0 → nêm trước ở lát 0, nêm sau lưng ở lát 12.
  const AXE = { twoSided: true, widthSectors: 1, minRing: 0, maxRing: 1 } as const;

  it('một nhát trúng quái ở cả trước mặt và sau lưng; combo đếm chung cả hai nêm', () => {
    const before = stateWith([monster(1, 0, 0, 2), monster(2, 12, 1, 5), monster(3, 6, 0, 2)]);
    const after = playTurn(before, 0, pushing('none', AXE));
    expect(after.lastAttack?.hits).toEqual([
      { monsterId: 1, damage: 1, killed: false },
      { monsterId: 2, damage: 2, killed: false },
    ]);
    expect(byId(after, 3)?.hp).toBe(2); // lát 6 nằm giữa hai nêm — không trúng
  });

  it('đẩy lùi áp dụng cho quái ở cả hai nêm', () => {
    const config = { ...pushing('out', AXE), monsterKinds: withAdvanceChance(1).monsterKinds };
    const after = playTurn(stateWith([monster(1, 0, 1, 5), monster(2, 12, 1, 5)]), 0, config);
    expect(byId(after, 1)).toMatchObject({ sector: 0, ring: 2 });
    expect(byId(after, 2)).toMatchObject({ sector: 12, ring: 2 });
  });
});

describe('F06 — màn chơi nối tiếp + trùm', () => {
  const BOSS_LEVEL: LevelConfig = {
    turnLimit: 9,
    monsters: ['slimeKing', 'slime', 'slime'],
    spread: 1,
  };
  const TWO_LEVELS: BattleConfig = { ...CONFIG, levels: [LEVEL_1, BOSS_LEVEL] };
  const THREE_LEVELS: BattleConfig = { ...CONFIG, levels: [LEVEL_1, LEVEL_1, BOSS_LEVEL] };

  it('mở màn nào theo cấu hình màn đó: số lượt, đội hình quái theo thứ tự id, máu theo loại quái', () => {
    const battle = createBattle(3, TWO_LEVELS, 1);
    expect(battle).toMatchObject({ level: 1, turnsLeft: 9, phase: 'playing' });
    expect(battle.monsters.map((m) => [m.id, m.kind, m.hp])).toEqual([
      [1, 'slimeKing', 6],
      [2, 'slime', 2],
      [3, 'slime', 2],
    ]);
  });

  it('màn nào cũng bắt đầu đầy máu và cầm vũ khí đầu tiên', () => {
    expect(createBattle(3, TWO_LEVELS, 1)).toMatchObject({ heroHp: 5, weaponIndex: 0 });
  });

  it('cụm quái rộng theo spread của từng màn (±1 lát → 3 con nằm liền nhau)', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const sectors = createBattle(seed, TWO_LEVELS, 1).monsters.map((m) => m.sector);
      for (const a of sectors) {
        for (const b of sectors) {
          expect(circularDistance(a, b, 24)).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('từ chối màn không có trong cấu hình', () => {
    expect(() => createBattle(1, TWO_LEVELS, 2)).toThrow(RangeError);
    expect(() => createBattle(1, TWO_LEVELS, -1)).toThrow(RangeError);
    expect(() => createBattle(1, TWO_LEVELS, 0.5)).toThrow(RangeError);
  });

  it('quái áp sát đánh theo sức đánh của loại nó: trùm 2 + slime 1 → mất 3 máu', () => {
    const before = stateWith([monster(1, 12, 0, 6, 'slimeKing'), monster(2, 14, 0)]);
    expect(playTurn(before, 6, CONFIG).heroHp).toBe(2);
  });

  it('mỗi loại quái di chuyển theo xác suất tiến vào của loại đó', () => {
    const config = {
      ...CONFIG,
      monsterKinds: {
        slime: { ...CONFIG.monsterKinds.slime, advanceChance: 1 },
        slimeKing: { ...CONFIG.monsterKinds.slimeKing, advanceChance: 0 },
      },
    };
    const after = playTurn(
      stateWith([monster(1, 12, 5, 6, 'slimeKing'), monster(2, 0, 5)]),
      6,
      config,
    );
    expect(byId(after, 1)?.ring).toBe(5); // trùm luôn đi ngang
    expect([11, 13]).toContain(byId(after, 1)?.sector);
    expect(byId(after, 2)).toMatchObject({ sector: 0, ring: 4 }); // slime luôn tiến
  });

  it('chém không làm đổi màn đang chơi', () => {
    expect(playTurn(stateWith([monster(1, 12, 5)], { level: 1 }), 0, TWO_LEVELS).level).toBe(1);
  });

  it('thắng màn chưa phải cuối → sang màn kế; thắng màn cuối → về màn 1; thua → chơi lại đúng màn đó', () => {
    const won = (level: number) => stateWith([], { phase: 'won', level });
    const lost = (level: number) =>
      stateWith([monster(1, 0, 0)], { phase: 'lost', lossReason: 'heroDefeated', level });
    expect(nextLevelIndex(won(0), THREE_LEVELS)).toBe(1);
    expect(nextLevelIndex(won(1), THREE_LEVELS)).toBe(2);
    expect(nextLevelIndex(won(2), THREE_LEVELS)).toBe(0);
    expect(nextLevelIndex(lost(0), THREE_LEVELS)).toBe(0);
    expect(nextLevelIndex(lost(2), THREE_LEVELS)).toBe(2);
  });

  it('màn đang chơi dở thì chưa có màn kế', () => {
    expect(() => nextLevelIndex(stateWith([monster(1, 0, 5)]), THREE_LEVELS)).toThrow();
  });

  it('phá đảo chỉ khi thắng màn cuối', () => {
    expect(isGameCleared(stateWith([], { phase: 'won', level: 2 }), THREE_LEVELS)).toBe(true);
    expect(isGameCleared(stateWith([], { phase: 'won', level: 1 }), THREE_LEVELS)).toBe(false);
    const lostLast = stateWith([monster(1, 0, 0)], { phase: 'lost', level: 2 });
    expect(isGameCleared(lostLast, THREE_LEVELS)).toBe(false);
    expect(isGameCleared(stateWith([monster(1, 0, 5)], { level: 2 }), THREE_LEVELS)).toBe(false);
  });
});
