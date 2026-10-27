import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import {
  canCastSkill,
  castSkill,
  createBattle,
  isThreatening,
  playTurn,
  willAttack,
} from './battle';
import { BATTLE_CONFIG } from './battleConfig';
import type {
  BattleConfig,
  BattleState,
  LevelConfig,
  Monster,
  MonsterKind,
  SkillConfig,
  WeaponConfig,
} from './battleTypes';
import { defaultLoadout } from './loadout';

// B6 (chủ dự án duyệt 27/10/2026): skill bấm đánh cả sân, nạp theo nhát chém, không tốn lượt; Mưa băng
// đóng băng 1 lượt; máu nhân vật, hồi máu khi nhát trúng ≥ 3 con, chí mạng ×2.
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

const ICE: SkillConfig = { name: 'Băng thử', damage: 1, freezeTurns: 1, chargeTurns: 2 };
const FIRE: SkillConfig = { name: 'Lửa thử', damage: 2, freezeTurns: 0, chargeTurns: 3 };

const LEVEL: LevelConfig = { turnLimit: 5, monsters: ['slime', 'slime'], spread: 2 };

const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  weapons: [ALL_REACH],
  monsterKinds: {
    slime: { name: 'Slime thử', hp: 2, advanceChance: 1, attack: 1 },
    slimeKing: { name: 'Vua thử', hp: 6, advanceChance: 1, attack: 2 },
    slimeCannon: { name: 'Pháo thử', hp: 2, advanceChance: 1, attack: 1, shootRing: 4 },
    slimeMini: { name: 'Con thử', hp: 1, advanceChance: 1, attack: 1 },
    slimeCharger: { name: 'Lao thử', hp: 2, advanceChance: 1, attack: 1, step: 2 },
    slimeGhost: { name: 'Ma thử', hp: 2, advanceChance: 1, attack: 1, ghost: true },
  },
  hero: { hp: 10, healMinHits: 3, healAmount: 1 },
  critMultiplier: 2,
  skills: { iceRain: ICE, fireball: FIRE },
  // Màn 1 (chỉ số 0) chưa có skill, màn 2 (chỉ số 1) có.
  skillUnlockLevel: 1,
  levels: [LEVEL, LEVEL],
};

const withWeapon = (patch: Partial<WeaponConfig>): BattleConfig => ({
  ...CONFIG,
  weapons: [{ ...ALL_REACH, ...patch }],
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
    level: 1,
    turnsLeft: 5,
    heroHp: 10,
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
    ...overrides,
  };
}

const byId = (state: BattleState, id: number) => state.monsters.find((m) => m.id === id);

/** Lát không trúng con nào (vùng rộng 3 lát quanh lát ngắm): xa mọi quái trong các test dưới. */
const EMPTY_SECTOR = 18;

describe('castSkill — bấm skill đánh cả sân (B6)', () => {
  it('Mưa băng: mọi quái mất 1 máu, con hết máu biến mất, con còn sống bị đóng băng 1 lượt', () => {
    const before = stateWith([monster(1, 0, 5, 2), monster(2, 9, 3, 1)], { skillCharge: 2 });
    const after = castSkill(before, CONFIG);
    expect(after.monsters).toEqual([{ ...monster(1, 0, 5, 1), frozenTurns: 1 }]);
    expect(after.lastSkill).toEqual({
      skill: 'iceRain',
      hits: [
        { monsterId: 1, damage: 1, killed: false },
        { monsterId: 2, damage: 1, killed: true },
      ],
    });
  });

  it('không tốn lượt, quái không di chuyển, không tung số ngẫu nhiên; nạp về 0', () => {
    const before = stateWith([monster(1, 0, 5, 2)], { skillCharge: 2 });
    const after = castSkill(before, CONFIG);
    expect(after).toMatchObject({
      turnsLeft: before.turnsLeft,
      rng: before.rng,
      heroHp: before.heroHp,
      skillCharge: 0,
      phase: 'playing',
    });
    expect(byId(after, 1)).toMatchObject({ sector: 0, ring: 5 });
  });

  it('Cầu lửa: mọi quái mất 2 máu, không đóng băng; hạ hết quái thì thắng ngay, không mất lượt', () => {
    const before = stateWith([monster(1, 0, 5, 2), monster(2, 9, 0, 3)], {
      loadout: { weapons: [0], skill: 'fireball' },
      skillCharge: 3,
    });
    const after = castSkill(before, CONFIG);
    expect(after.monsters).toEqual([monster(2, 9, 0, 1)]);
    const last = castSkill({ ...after, skillCharge: 3 }, CONFIG);
    expect(last).toMatchObject({ phase: 'won', monsters: [], turnsLeft: before.turnsLeft });
  });

  it('không bấm được khi chưa nạp đủ, khi không mang skill, khi trận đã xong', () => {
    const monsters = [monster(1, 0, 5)];
    const notReady = stateWith(monsters, { skillCharge: 1 });
    expect(canCastSkill(notReady, CONFIG)).toBe(false);
    expect(() => castSkill(notReady, CONFIG)).toThrow();

    const noSkill = stateWith(monsters, { loadout: { weapons: [0] }, skillCharge: 9 });
    expect(canCastSkill(noSkill, CONFIG)).toBe(false);
    expect(() => castSkill(noSkill, CONFIG)).toThrow();

    const over = stateWith(monsters, { skillCharge: 2, phase: 'won' });
    expect(canCastSkill(over, CONFIG)).toBe(false);
    expect(() => castSkill(over, CONFIG)).toThrow();

    expect(canCastSkill(stateWith(monsters, { skillCharge: 2 }), CONFIG)).toBe(true);
  });
});

describe('nạp skill theo nhát chém (B6)', () => {
  it('trận mới nạp 0; mỗi nhát chém (trúng hay trượt) +1, tối đa đúng số nhát cần để đầy', () => {
    let state = createBattle(1, CONFIG, 1, { weapons: [0], skill: 'iceRain' });
    expect(state.skillCharge).toBe(0);
    state = playTurn(state, EMPTY_SECTOR, CONFIG);
    expect(state.skillCharge).toBe(1);
    state = playTurn(state, EMPTY_SECTOR, CONFIG);
    expect(state.skillCharge).toBe(2);
    expect(canCastSkill(state, CONFIG)).toBe(true);
    state = playTurn(state, EMPTY_SECTOR, CONFIG);
    expect(state.skillCharge).toBe(2);
  });

  it('không mang skill thì không nạp', () => {
    const state = playTurn(
      stateWith([monster(1, 0, 5)], { loadout: { weapons: [0] } }),
      18,
      CONFIG,
    );
    expect(state.skillCharge).toBe(0);
  });

  it('nhát chém xóa dấu của lần bấm skill trước (view không hiện lại số cũ)', () => {
    const cast = castSkill(stateWith([monster(1, 0, 5, 3)], { skillCharge: 2 }), CONFIG);
    expect(cast.lastSkill).not.toBeNull();
    expect(playTurn(cast, EMPTY_SECTOR, CONFIG).lastSkill).toBeNull();
  });
});

describe('đóng băng (Mưa băng, B6)', () => {
  it('quái áp sát bị băng: lượt ngay sau không đánh, không có "!"; lượt sau nữa đánh lại', () => {
    const cast = castSkill(stateWith([monster(1, 0, 0, 3)], { skillCharge: 2 }), CONFIG);
    const frozen = byId(cast, 1);
    if (!frozen) throw new Error('mất quái');
    expect(isThreatening(frozen, CONFIG)).toBe(true);
    expect(willAttack(frozen, CONFIG)).toBe(false);

    const next = playTurn(cast, EMPTY_SECTOR, CONFIG);
    expect(next.heroHp).toBe(10);
    expect(byId(next, 1)?.frozenTurns).toBeUndefined();

    const after = playTurn(next, EMPTY_SECTOR, CONFIG);
    expect(after.heroHp).toBe(9);
  });

  it('quái băng không đi (luôn tiến nếu không băng); lượt sau đi lại bình thường', () => {
    const cast = castSkill(stateWith([monster(1, 0, 5, 3)], { skillCharge: 2 }), CONFIG);
    const next = playTurn(cast, EMPTY_SECTOR, CONFIG);
    expect(byId(next, 1)).toMatchObject({ sector: 0, ring: 5 });
    expect(byId(playTurn(next, EMPTY_SECTOR, CONFIG), 1)).toMatchObject({ sector: 0, ring: 4 });
  });

  it('quái bắn bị băng không bắn lượt đó', () => {
    const cannon = monster(1, 0, 4, 3, 'slimeCannon');
    const cast = castSkill(stateWith([cannon], { skillCharge: 2 }), CONFIG);
    expect(playTurn(cast, EMPTY_SECTOR, CONFIG).heroHp).toBe(10);
  });

  it('quái băng bị chém trúng mà còn sống vẫn bị đẩy theo vũ khí', () => {
    const config = withWeapon({ push: 'out' });
    const cast = castSkill(stateWith([monster(1, 0, 2, 3)], { skillCharge: 2 }), config);
    expect(byId(playTurn(cast, 0, config), 1)).toMatchObject({ sector: 0, ring: 3 });
  });
});

describe('máu nhân vật và hồi máu (B6)', () => {
  it('trận mới đầy máu theo cấu hình', () => {
    expect(createBattle(1, CONFIG, 0).heroHp).toBe(10);
  });

  it('nhát trúng từ 3 con trở lên hồi 1 máu', () => {
    const monsters = [monster(1, 0, 5, 9), monster(2, 1, 5, 9), monster(3, 23, 5, 9)];
    const after = playTurn(stateWith(monsters, { heroHp: 6 }), 0, CONFIG);
    expect(after.lastAttack?.hits).toHaveLength(3);
    expect(after.lastAttack?.healed).toBe(1);
    expect(after.heroHp).toBe(7);
  });

  it('nhát trúng 2 con không hồi', () => {
    const monsters = [monster(1, 0, 5, 9), monster(2, 1, 5, 9)];
    const after = playTurn(stateWith(monsters, { heroHp: 6 }), 0, CONFIG);
    expect(after.lastAttack?.healed).toBe(0);
    expect(after.heroHp).toBe(6);
  });

  it('không hồi quá máu tối đa', () => {
    const monsters = [monster(1, 0, 5, 9), monster(2, 1, 5, 9), monster(3, 23, 5, 9)];
    const after = playTurn(stateWith(monsters, { heroHp: 10 }), 0, CONFIG);
    expect(after.lastAttack?.healed).toBe(0);
    expect(after.heroHp).toBe(10);
  });

  it('hồi trước khi quái đánh: đang 1 máu, gom 3 con mà bị 1 con áp sát đánh vẫn sống', () => {
    const monsters = [
      monster(1, 0, 3, 9),
      monster(2, 1, 3, 9),
      monster(3, 23, 3, 9),
      monster(4, 12, 0, 9), // áp sát ở phía bên kia, đánh 1
    ];
    const after = playTurn(stateWith(monsters, { heroHp: 1 }), 0, CONFIG);
    expect(after).toMatchObject({ heroHp: 1, phase: 'playing' });
  });
});

describe('chí mạng (B6)', () => {
  it('vũ khí chí mạng 100%: mọi con trúng ăn × hệ số, combo vẫn 1×, 2×, 3×', () => {
    const config = withWeapon({ critChance: 1 });
    const monsters = [monster(1, 0, 5, 9), monster(2, 1, 5, 9), monster(3, 23, 5, 9)];
    const after = playTurn(stateWith(monsters), 0, config);
    expect(after.lastAttack?.crit).toBe(true);
    expect(after.lastAttack?.hits.map((h) => h.damage)).toEqual([2, 4, 6]);
  });

  it('chém trượt thì không chí mạng và không tung số', () => {
    const before = stateWith([monster(1, 0, 5)]);
    const always = playTurn(before, EMPTY_SECTOR, withWeapon({ critChance: 1 }));
    expect(always.lastAttack?.crit).toBe(false);
    expect(always).toEqual(playTurn(before, EMPTY_SECTOR, CONFIG));
  });

  it('vũ khí 0% chí mạng không tung số: y hệt vũ khí không khai báo chí mạng', () => {
    const before = stateWith([monster(1, 0, 5), monster(2, 1, 5)]);
    expect(playTurn(before, 0, withWeapon({ critChance: 0 }))).toEqual(playTurn(before, 0, CONFIG));
  });

  it('chí mạng theo RNG có seed của trận: cùng seed cùng kết quả, đổi seed thì có nhát có nhát không', () => {
    const config = withWeapon({ critChance: 0.5 });
    const strike = (seed: number) =>
      playTurn(stateWith([monster(1, 0, 5, 9)], { rng: seedRng(seed) }), 0, config).lastAttack
        ?.crit;
    expect(strike(7)).toBe(strike(7));
    const results = new Set(Array.from({ length: 40 }, (_, i) => strike(i + 1)));
    expect(results).toEqual(new Set([true, false]));
  });
});

describe('mang skill vào trận và cấu hình sai (B6)', () => {
  it('màn chưa mở skill mà mang skill thì bị từ chối; màn đã mở thì được', () => {
    expect(() => createBattle(1, CONFIG, 0, { weapons: [0], skill: 'iceRain' })).toThrow(
      RangeError,
    );
    expect(createBattle(1, CONFIG, 1, { weapons: [0], skill: 'iceRain' }).loadout.skill).toBe(
      'iceRain',
    );
  });

  it('skill không tồn tại bị từ chối', () => {
    const skill = 'sấm' as 'iceRain';
    expect(() => createBattle(1, CONFIG, 1, { weapons: [0], skill })).toThrow(RangeError);
  });

  it.each<[string, BattleConfig]>([
    [
      'skill không gây sát thương',
      { ...CONFIG, skills: { ...CONFIG.skills, fireball: { ...FIRE, damage: 0 } } },
    ],
    [
      'skill nạp 0 nhát',
      { ...CONFIG, skills: { ...CONFIG.skills, iceRain: { ...ICE, chargeTurns: 0 } } },
    ],
    [
      'đóng băng âm',
      { ...CONFIG, skills: { ...CONFIG.skills, iceRain: { ...ICE, freezeTurns: -1 } } },
    ],
    ['chí mạng trên 100%', withWeapon({ critChance: 1.5 })],
    ['chí mạng âm', withWeapon({ critChance: -0.1 })],
    ['hệ số chí mạng nhỏ hơn 1', { ...CONFIG, critMultiplier: 0.5 }],
    ['hồi máu khi trúng 0 con', { ...CONFIG, hero: { ...CONFIG.hero, healMinHits: 0 } }],
    ['hồi máu âm', { ...CONFIG, hero: { ...CONFIG.hero, healAmount: -1 } }],
    ['màn mở skill âm', { ...CONFIG, skillUnlockLevel: -1 }],
  ])('từ chối cấu hình: %s', (_label, config) => {
    expect(() => createBattle(1, config, 0)).toThrow(RangeError);
  });

  it('cấu hình thật: mở được mọi màn; từ màn mở skill mang được mọi skill', () => {
    BATTLE_CONFIG.levels.forEach((_, level) => {
      const base = defaultLoadout(BATTLE_CONFIG);
      expect(() => createBattle(1, BATTLE_CONFIG, level, base)).not.toThrow();
      if (level < BATTLE_CONFIG.skillUnlockLevel) return;
      for (const skill of ['iceRain', 'fireball'] as const) {
        expect(() => createBattle(1, BATTLE_CONFIG, level, { ...base, skill })).not.toThrow();
      }
    });
  });
});
