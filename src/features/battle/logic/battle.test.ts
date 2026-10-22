import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import { createBattle, playTurn, selectWeapon } from './battle';
import { BATTLE_CONFIG } from './battleConfig';
import type { BattleConfig, BattleState, Monster, WeaponConfig } from './battleTypes';

// Cấu hình riêng cho test: con số cố định để kỳ vọng tính tay được,
// không gãy khi chỉnh cân bằng trong battleConfig.ts.
// Một vũ khí với tới cả sân — để các test luật đánh/di chuyển không phụ thuộc chuyện đổi vũ khí.
const ALL_REACH: WeaponConfig = {
  name: 'Kiếm thử',
  rangeLabel: 'cả sân',
  widthSectors: 3,
  minRing: 0,
  maxRing: 5,
  damage: 1,
};

const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  turnLimit: 5,
  arcPeriodMs: 2_400,
  weapons: [ALL_REACH],
  monster: { name: 'Slime thử', hp: 2, advanceChance: 1 },
  spawn: { count: 4, spread: 2 },
};

/** Ba vũ khí theo tầm như F02: gần (vòng 0–1), vừa (2–3), xa (4–5). */
const THREE_WEAPONS: BattleConfig = {
  ...CONFIG,
  weapons: [
    { name: 'Kiếm', rangeLabel: 'gần', widthSectors: 5, minRing: 0, maxRing: 1, damage: 1 },
    { name: 'Giáo', rangeLabel: 'vừa', widthSectors: 3, minRing: 2, maxRing: 3, damage: 1 },
    { name: 'Cung', rangeLabel: 'xa', widthSectors: 1, minRing: 4, maxRing: 5, damage: 1 },
  ],
};

/** Quái luôn tiến (advanceChance 1) hoặc luôn đi ngang (0) để kết quả đoán trước được. */
const withAdvanceChance = (advanceChance: number): BattleConfig => ({
  ...CONFIG,
  monster: { ...CONFIG.monster, advanceChance },
});

const monster = (id: number, sector: number, ring: number, hp = 2): Monster => ({
  id,
  sector,
  ring,
  hp,
});

function stateWith(monsters: Monster[], overrides: Partial<BattleState> = {}): BattleState {
  return {
    seed: 1,
    rng: seedRng(1),
    turnsLeft: 5,
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
    const battle = createBattle(7, CONFIG);
    expect(battle.monsters).toHaveLength(4);
    for (const m of battle.monsters) {
      expect(m.ring).toBe(5);
      expect(m.hp).toBe(2);
    }
    expect(new Set(battle.monsters.map((m) => m.id)).size).toBe(4);
  });

  it('quái xuất hiện thành cụm (cách nhau tối đa 2×spread lát) và không đứng chồng lên nhau', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const sectors = createBattle(seed, CONFIG).monsters.map((m) => m.sector);
      expect(new Set(sectors).size).toBe(sectors.length);
      for (const a of sectors) {
        for (const b of sectors) {
          expect(circularDistance(a, b, 24)).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it('bắt đầu ở trạng thái đang chơi với đủ lượt và ghi lại seed', () => {
    const battle = createBattle(123, CONFIG);
    expect(battle).toMatchObject({
      seed: 123,
      turnsLeft: 5,
      weaponIndex: 0,
      phase: 'playing',
      lossReason: null,
      lastAttack: null,
    });
  });

  it('cùng seed cho cùng trận, seed khác cho trận khác', () => {
    expect(createBattle(9, CONFIG)).toEqual(createBattle(9, CONFIG));
    expect(createBattle(1, CONFIG).monsters).not.toEqual(createBattle(2, CONFIG).monsters);
  });

  it('từ chối cấu hình không đủ chỗ cho cụm quái', () => {
    const crowded = { ...CONFIG, spawn: { count: 6, spread: 2 } };
    expect(() => createBattle(1, crowded)).toThrow(RangeError);
  });
});

describe('createBattle — chặn cấu hình sai trước khi mở trận', () => {
  // Vũ khí sai nằm ở vị trí thứ 2 để chắc mọi vũ khí đều được kiểm, không chỉ vũ khí đầu.
  const weapon = (patch: Partial<WeaponConfig>): BattleConfig => ({
    ...CONFIG,
    weapons: [ALL_REACH, { ...ALL_REACH, ...patch }],
  });
  const monsterRule = (patch: Partial<BattleConfig['monster']>): BattleConfig => ({
    ...CONFIG,
    monster: { ...CONFIG.monster, ...patch },
  });

  it.each<[string, BattleConfig]>([
    [
      'cụm quái rộng hơn cả vòng tròn (quái chồng ô)',
      { ...CONFIG, spawn: { count: 25, spread: 12 } },
    ],
    ['vùng đánh rộng số chẵn lát', weapon({ widthSectors: 2 })],
    ['vùng đánh rộng hơn cả vòng tròn', weapon({ widthSectors: 25 })],
    ['vũ khí với tới vòng không tồn tại', weapon({ maxRing: 6 })],
    ['vòng trong của vũ khí lớn hơn vòng ngoài', weapon({ minRing: 3, maxRing: 2 })],
    ['vòng trong của vũ khí âm', weapon({ minRing: -1 })],
    ['vũ khí không gây sát thương', weapon({ damage: 0 })],
    ['không có vũ khí nào', { ...CONFIG, weapons: [] }],
    ['không có lượt nào', { ...CONFIG, turnLimit: 0 }],
    ['quái không có máu', monsterRule({ hp: 0 })],
    ['xác suất tiến vào lớn hơn 1', monsterRule({ advanceChance: 1.5 })],
    ['xác suất tiến vào âm', monsterRule({ advanceChance: -0.1 })],
  ])('từ chối: %s', (_label, config) => {
    expect(() => createBattle(1, config)).toThrow(RangeError);
  });

  it('cấu hình thật của game hợp lệ', () => {
    expect(() => createBattle(1, BATTLE_CONFIG)).not.toThrow();
  });
});

describe('selectWeapon — đổi vũ khí (F02)', () => {
  it('trận mới cầm vũ khí đầu tiên trong danh sách', () => {
    expect(createBattle(1, THREE_WEAPONS).weaponIndex).toBe(0);
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
    const before = stateWith([monster(1, 0, 5), monster(2, 1, 5), monster(3, 5, 5)]);
    const after = playTurn(before, 0, CONFIG);
    expect(byId(after, 1)?.hp).toBe(1);
    expect(byId(after, 2)?.hp).toBe(1);
    expect(byId(after, 3)?.hp).toBe(2);
  });

  it('quái hết máu bị loại khỏi sân', () => {
    const before = stateWith([monster(1, 0, 5, 1), monster(2, 12, 5)]);
    const after = playTurn(before, 0, CONFIG);
    expect(byId(after, 1)).toBeUndefined();
    expect(byId(after, 2)).toBeDefined();
  });

  it('ghi lại nhát đánh (lát ngắm, ai trúng, ai chết) để hiển thị số sát thương', () => {
    const before = stateWith([monster(1, 0, 5, 1), monster(2, 1, 5), monster(3, 12, 5)]);
    const after = playTurn(before, 0, CONFIG);
    expect(after.lastAttack).toEqual({
      aimSector: 0,
      hits: [
        { monsterId: 1, damage: 1, killed: true },
        { monsterId: 2, damage: 1, killed: false },
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

  it('quái đang ở vòng 0 tiến thêm là chạm nhân vật → thua', () => {
    const after = playTurn(stateWith([monster(1, 0, 0)]), 12, withAdvanceChance(1));
    expect(after).toMatchObject({ phase: 'lost', lossReason: 'reachedHero' });
  });

  it('dùng hết lượt mà còn quái → thua vì hết lượt', () => {
    const after = playTurn(stateWith([monster(1, 12, 5)], { turnsLeft: 1 }), 0, CONFIG);
    expect(after).toMatchObject({ phase: 'lost', lossReason: 'outOfTurns', turnsLeft: 0 });
  });

  it('nhát cuối giết hết quái thì vẫn thắng dù vừa hết lượt', () => {
    const after = playTurn(stateWith([monster(1, 0, 5, 1)], { turnsLeft: 1 }), 0, CONFIG);
    expect(after).toMatchObject({ phase: 'won', turnsLeft: 0 });
  });

  it('cùng lúc hết lượt và bị chạm thì báo lý do bị chạm', () => {
    const before = stateWith([monster(1, 12, 0)], { turnsLeft: 1 });
    const after = playTurn(before, 0, withAdvanceChance(1));
    expect(after).toMatchObject({ phase: 'lost', lossReason: 'reachedHero' });
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
