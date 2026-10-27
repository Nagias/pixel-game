import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import { castSkill, createBattle, playTurn } from './battle';
import type {
  BattleConfig,
  BattleState,
  LevelConfig,
  Monster,
  MonsterKind,
  WeaponConfig,
} from './battleTypes';

// F11 (đợt 1 kế hoạch sau B6, chủ dự án duyệt 27/10/2026 — "cứ làm theo gợi ý"): thắng bằng nhiệm vụ
// "giết N con loại X" (xong là thắng ngay, không cần giết hết quái) + quái ra theo đợt (sân còn ít quái
// thì đợt kế tràn vào vòng ngoài cùng). Màn không có nhiệm vụ = diệt sạch mọi đợt quái (như trước F11).
// Cấu hình riêng cho test: con số cố định để kỳ vọng tính tay được.

/** Một vũ khí với tới cả sân (vòng 0–5), rộng 3 lát, không đẩy, không chí mạng. */
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

const slimes = (count: number): MonsterKind[] => Array<MonsterKind>(count).fill('slime');

/** Màn thử: mở màn 2 slime, đợt sau 3 slime khi sân còn ≤ 1 con; nhiệm vụ giết 4 slime. */
const LEVEL: LevelConfig = {
  turnLimit: 5,
  monsters: slimes(2),
  spread: 2,
  waves: [slimes(3)],
  nextWaveAt: 1,
  quest: { kind: 'slime', count: 4 },
};

const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  weapons: [ALL_REACH],
  monsterKinds: {
    slime: { name: 'Slime thử', hp: 2, advanceChance: 1, attack: 1 },
    slimeKing: { name: 'Vua thử', hp: 6, advanceChance: 1, attack: 2 },
    slimeCannon: { name: 'Pháo thử', hp: 2, advanceChance: 1, attack: 1, shootRing: 4 },
  },
  hero: { hp: 5, healMinHits: 3, healAmount: 0 },
  critMultiplier: 2,
  skills: {
    iceRain: { name: 'Băng thử', damage: 1, freezeTurns: 1, chargeTurns: 2 },
    fireball: { name: 'Lửa thử', damage: 2, freezeTurns: 0, chargeTurns: 3 },
  },
  skillUnlockLevel: 0,
  levels: [LEVEL],
};

const withLevel = (patch: Partial<LevelConfig>): BattleConfig => ({
  ...CONFIG,
  levels: [{ ...LEVEL, ...patch }],
});

/** Màn thử không có nhiệm vụ: thắng khi diệt sạch mọi đợt quái. */
const NO_QUEST: BattleConfig = {
  ...CONFIG,
  levels: [{ turnLimit: 5, monsters: slimes(2), spread: 2, waves: [slimes(3)], nextWaveAt: 1 }],
};

const monster = (
  id: number,
  sector: number,
  ring: number,
  hp = 2,
  kind: MonsterKind = 'slime',
  frozenTurns?: number,
): Monster => ({ id, kind, sector, ring, hp, ...(frozenTurns ? { frozenTurns } : {}) });

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
    ...overrides,
  };
}

/** Lát không trúng con nào (vùng rộng 3 lát quanh lát ngắm) trong các test dưới. */
const EMPTY_SECTOR = 18;

/** Khoảng cách ngắn nhất giữa hai lát trên vòng tròn 24 lát. */
const sectorGap = (a: number, b: number) => Math.min((a - b + 24) % 24, (b - a + 24) % 24);

describe('F11 — mở trận có nhiệm vụ và đợt quái', () => {
  it('trận mới chưa giết con nào, chưa ra đợt nào ngoài đợt mở màn', () => {
    const state = createBattle(7, CONFIG, 0);
    expect(state).toMatchObject({ questProgress: 0, nextWave: 0 });
    expect(state.monsters.map((m) => m.id)).toEqual([1, 2]);
  });

  it.each<[string, BattleConfig]>([
    ['nhiệm vụ giết 0 con', withLevel({ quest: { kind: 'slime', count: 0 } })],
    ['nhiệm vụ giết số lẻ con', withLevel({ quest: { kind: 'slime', count: 1.5 } })],
    [
      'nhiệm vụ giết loại quái không tồn tại',
      withLevel({ quest: { kind: 'rong' as MonsterKind, count: 1 } }),
    ],
    // Micro RPG từng có màn bất khả thi vì quái nhiệm vụ không ra đủ — chặn ngay từ cấu hình.
    ['mọi đợt cộng lại không đủ quái nhiệm vụ', withLevel({ quest: { kind: 'slime', count: 6 } })],
    [
      'nhiệm vụ giết trùm mà màn không có trùm',
      withLevel({ quest: { kind: 'slimeKing', count: 1 } }),
    ],
    ['đợt quái rỗng', withLevel({ waves: [[]] })],
    ['đợt quái có loại không tồn tại', withLevel({ waves: [['rong' as MonsterKind]] })],
    ['đợt quái đông hơn số chỗ trong cụm', withLevel({ waves: [slimes(6)] })],
    ['ngưỡng ra đợt âm', withLevel({ nextWaveAt: -1 })],
    ['ngưỡng ra đợt số lẻ', withLevel({ nextWaveAt: 0.5 })],
  ])('từ chối cấu hình sai: %s', (_name, config) => {
    expect(() => createBattle(1, config, 0)).toThrow(RangeError);
  });
});

describe('F11 — nhiệm vụ "giết N con loại X"', () => {
  it('giết quái đúng loại nhiệm vụ thì cộng tiến độ, loại khác thì không', () => {
    const config = withLevel({
      monsters: ['slimeKing', 'slime', 'slime'],
      quest: { kind: 'slimeKing', count: 1 },
    });
    const before = stateWith([
      monster(1, 0, 5, 1),
      monster(2, 1, 5, 1),
      monster(3, 12, 5, 6, 'slimeKing'),
    ]);
    const after = playTurn(before, 0, config);
    expect(after).toMatchObject({ phase: 'playing', questProgress: 0 });
  });

  it('xong nhiệm vụ thì thắng ngay dù sân còn quái, không tung số ngẫu nhiên cho lượt di chuyển', () => {
    const before = stateWith([monster(1, 0, 5, 1), monster(2, 12, 5)], { questProgress: 3 });
    const after = playTurn(before, 0, CONFIG);
    expect(after).toMatchObject({ phase: 'won', lossReason: null, questProgress: 4 });
    expect(after.monsters.map((m) => m.id)).toEqual([2]);
    expect(after.rng).toBe(before.rng);
  });

  it('nhát cuối xong nhiệm vụ thì vẫn thắng dù vừa hết lượt', () => {
    const before = stateWith([monster(1, 0, 5, 1), monster(2, 12, 5)], {
      questProgress: 3,
      turnsLeft: 1,
    });
    expect(playTurn(before, 0, CONFIG)).toMatchObject({ phase: 'won', turnsLeft: 0 });
  });

  it('hết lượt mà chưa xong nhiệm vụ thì thua vì hết lượt', () => {
    const before = stateWith([monster(1, 0, 5, 1), monster(2, 12, 5)], { turnsLeft: 1 });
    expect(playTurn(before, 0, CONFIG)).toMatchObject({
      phase: 'lost',
      lossReason: 'outOfTurns',
      questProgress: 1,
    });
  });

  it('skill giết quái cũng tính vào nhiệm vụ; xong nhiệm vụ bằng skill là thắng ngay', () => {
    const before = stateWith([monster(1, 0, 5, 1), monster(2, 12, 5, 1), monster(3, 6, 5)], {
      loadout: { weapons: [0], skill: 'iceRain' },
      skillCharge: 2,
      questProgress: 2,
    });
    expect(castSkill(before, CONFIG)).toMatchObject({ phase: 'won', questProgress: 4 });
  });

  it('màn không có nhiệm vụ: sân sạch mà còn đợt quái thì chưa thắng', () => {
    const config = NO_QUEST;
    const after = playTurn(stateWith([monster(1, 0, 5, 1)]), 0, config);
    expect(after.phase).toBe('playing');
    expect(after.monsters).toHaveLength(3);
  });

  it('màn không có nhiệm vụ: diệt sạch đợt cuối thì thắng', () => {
    const config = NO_QUEST;
    const after = playTurn(stateWith([monster(3, 0, 5, 1)], { nextWave: 1 }), 0, config);
    expect(after).toMatchObject({ phase: 'won', monsters: [] });
  });
});

describe('F11 — quái ra theo đợt', () => {
  it('sân còn ≤ ngưỡng thì đợt kế tràn vào vòng ngoài cùng: id nối tiếp, đầy máu, mỗi con một lát', () => {
    const before = stateWith([monster(1, 0, 5, 1), monster(2, 12, 3)]);
    const after = playTurn(before, 0, CONFIG);
    expect(after).toMatchObject({ phase: 'playing', nextWave: 1, questProgress: 1 });
    const wave = after.monsters.filter((m) => m.id > 2);
    expect(wave.map((m) => m.id)).toEqual([3, 4, 5]);
    for (const m of wave) expect(m).toMatchObject({ kind: 'slime', ring: 5, hp: 2 });
    expect(new Set(wave.map((m) => m.sector)).size).toBe(3);
    // Đợt mới tụ thành cụm ±spread (2) quanh một lát: hai con xa nhau nhất cách nhau ≤ 4 lát.
    for (const a of wave)
      for (const b of wave) expect(sectorGap(a.sector, b.sector)).toBeLessThanOrEqual(4);
  });

  it('đợt mới không đi ngay trong lượt nó vừa ra', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const after = playTurn(
        stateWith([monster(1, 0, 5, 1), monster(2, 12, 3)], { rng: seedRng(seed) }),
        0,
        CONFIG,
      );
      expect(after.monsters.filter((m) => m.id > 2).every((m) => m.ring === 5)).toBe(true);
    }
  });

  it('sân còn nhiều hơn ngưỡng thì chưa ra đợt kế', () => {
    const after = playTurn(stateWith([monster(1, 0, 5), monster(2, 12, 3)]), 0, CONFIG);
    expect(after).toMatchObject({ nextWave: 0 });
    expect(after.monsters).toHaveLength(2);
  });

  it('ra hết các đợt thì không ra thêm', () => {
    const after = playTurn(
      stateWith([monster(3, 0, 5, 1), monster(4, 12, 3)], { nextWave: 1 }),
      0,
      CONFIG,
    );
    expect(after.monsters.map((m) => m.id)).toEqual([4]);
    expect(after.nextWave).toBe(1);
  });

  it('id nối tiếp qua nhiều đợt: đợt 2 bắt đầu sau mở màn + đợt 1', () => {
    const config = withLevel({ waves: [slimes(3), slimes(2)], quest: { kind: 'slime', count: 7 } });
    const after = playTurn(
      stateWith([monster(3, 0, 5, 1), monster(4, 12, 3)], { nextWave: 1 }),
      0,
      config,
    );
    expect(after.monsters.filter((m) => m.id > 5).map((m) => m.id)).toEqual([6, 7]);
    expect(after.nextWave).toBe(2);
  });

  it('thua trong lượt thì không ra đợt mới', () => {
    const before = stateWith([monster(1, 0, 5, 1), monster(2, 12, 3)], { turnsLeft: 1 });
    const after = playTurn(before, 0, CONFIG);
    expect(after).toMatchObject({ phase: 'lost', nextWave: 0 });
    expect(after.monsters).toHaveLength(1);
  });

  it('vòng ngoài đông: đợt mới vào các ô trống gần cụm nhất, không chồng lên quái đang đứng', () => {
    // 21 con bị đóng băng (đứng im) chiếm lát 0–20 của vòng ngoài; chỉ còn lát 21, 22, 23. Id 101+
    // để không trùng id của đợt mới (3, 4, 5).
    const blockers = Array.from({ length: 21 }, (_, i) => monster(i + 101, i, 5, 2, 'slime', 5));
    const config = withLevel({ nextWaveAt: 30, quest: { kind: 'slime', count: 3 } });
    const after = playTurn(stateWith(blockers), EMPTY_SECTOR + 4, config);
    const wave = after.monsters.filter((m) => m.id < 100);
    expect(wave.map((m) => m.sector).sort((a, b) => a - b)).toEqual([21, 22, 23]);
  });

  it('vòng ngoài không đủ chỗ cho cả đợt thì đợt đó chờ lượt sau', () => {
    // Chỉ còn lát 22, 23 trống: nhát chém trúng (không giết) con ở lát 21 — không sao.
    const blockers = Array.from({ length: 22 }, (_, i) => monster(i + 101, i, 5, 2, 'slime', 5));
    const config = withLevel({ nextWaveAt: 30, quest: { kind: 'slime', count: 3 } });
    const after = playTurn(stateWith(blockers), EMPTY_SECTOR + 4, config);
    expect(after.nextWave).toBe(0);
    expect(after.monsters).toHaveLength(22);
  });

  it('skill làm sân còn ≤ ngưỡng thì đợt kế ra ngay, không tốn lượt', () => {
    const before = stateWith([monster(1, 0, 5, 1), monster(2, 12, 3)], {
      loadout: { weapons: [0], skill: 'iceRain' },
      skillCharge: 2,
    });
    const after = castSkill(before, CONFIG);
    expect(after).toMatchObject({ phase: 'playing', nextWave: 1, questProgress: 1, turnsLeft: 5 });
    expect(after.monsters.map((m) => m.id)).toEqual([2, 3, 4, 5]);
  });
});
