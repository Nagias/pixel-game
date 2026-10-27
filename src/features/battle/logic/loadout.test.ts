import { describe, expect, it } from 'vitest';
import { BATTLE_CONFIG, LOOT_CONFIG } from './battleConfig';
import type { BattleConfig, WeaponConfig } from './battleTypes';
import {
  allLoadouts,
  allWeapons,
  chooseSkill,
  chooseWeapon,
  defaultLoadout,
  describeSkill,
  describeWeapon,
  isSkillUnlocked,
  loadoutForLevel,
  skillOptions,
  slotOptions,
  validateLoadout,
} from './loadout';

// Cấu hình riêng cho test: 4 vũ khí như game thật — hai món tầm gần (Kiếm, Rìu) để có cái mà chọn.
const weapon = (name: string, slot: WeaponConfig['slot'], patch: Partial<WeaponConfig> = {}) =>
  ({
    name,
    slot,
    rangeLabel: name,
    push: 'none',
    widthSectors: 3,
    minRing: 0,
    maxRing: 1,
    damage: 1,
    ...patch,
  }) satisfies WeaponConfig;

const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  weapons: [
    weapon('Kiếm', 'near'),
    weapon('Giáo', 'mid', { minRing: 2, maxRing: 3 }),
    weapon('Cung', 'far', { minRing: 4, maxRing: 5 }),
    weapon('Rìu', 'near', { twoSided: true }),
  ],
  monsterKinds: {
    slime: { name: 'Slime thử', hp: 2, advanceChance: 1, attack: 1 },
    slimeKing: { name: 'Vua thử', hp: 6, advanceChance: 1, attack: 2 },
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
  hero: { hp: 5, healMinHits: 3, healAmount: 0 },
  critMultiplier: 2,
  skills: {
    iceRain: { name: 'Băng thử', damage: 1, freezeTurns: 1, chargeTurns: 2 },
    fireball: { name: 'Lửa thử', damage: 2, freezeTurns: 0, chargeTurns: 3 },
  },
  skillUnlockLevel: 0,
  levels: [{ turnLimit: 5, monsters: ['slime'], spread: 2 }],
};

describe('B4 — đồ mang vào trận', () => {
  it('bộ mặc định: món đầu tiên của mỗi tầm, theo thứ tự gần → vừa → xa', () => {
    expect(defaultLoadout(CONFIG)).toEqual({ weapons: [0, 1, 2] });
  });

  it('bộ mặc định chỉ lấy món đang sở hữu; tầm không có món nào thì bỏ trống', () => {
    expect(defaultLoadout(CONFIG, [3, 2])).toEqual({ weapons: [3, 2] });
  });

  it('lựa chọn theo tầm: mỗi tầm liệt kê món đang sở hữu, tầm không có món thì không hiện', () => {
    expect(slotOptions(CONFIG, allWeapons(CONFIG))).toEqual([
      { slot: 'near', weapons: [0, 3] },
      { slot: 'mid', weapons: [1] },
      { slot: 'far', weapons: [2] },
    ]);
    expect(slotOptions(CONFIG, [2, 3])).toEqual([
      { slot: 'near', weapons: [3] },
      { slot: 'far', weapons: [2] },
    ]);
  });

  it('chọn một món thì thay đúng món cùng tầm, giữ thứ tự gần → xa, không thêm món thứ 4', () => {
    const withAxe = chooseWeapon(defaultLoadout(CONFIG), 3, CONFIG);
    expect(withAxe).toEqual({ weapons: [3, 1, 2] });
    expect(chooseWeapon(withAxe, 0, CONFIG)).toEqual({ weapons: [0, 1, 2] });
    // Chọn lại món đang mang: không đổi gì.
    expect(chooseWeapon(withAxe, 3, CONFIG)).toEqual(withAxe);
  });

  it('chọn món cho tầm đang trống thì thêm vào đúng chỗ theo tầm', () => {
    expect(chooseWeapon({ weapons: [0, 2] }, 1, CONFIG)).toEqual({ weapons: [0, 1, 2] });
  });

  it('mọi bộ đồ chọn được (cho mô phỏng): mỗi tầm một món, đủ mọi cách ghép', () => {
    expect(allLoadouts(CONFIG, allWeapons(CONFIG))).toEqual([
      { weapons: [0, 1, 2] },
      { weapons: [3, 1, 2] },
    ]);
    // Không sở hữu món nào: không có bộ nào (không phải một bộ rỗng).
    expect(allLoadouts(CONFIG, [])).toEqual([]);
  });

  it('chọn vũ khí không tồn tại thì báo lỗi', () => {
    expect(() => chooseWeapon(defaultLoadout(CONFIG), 9, CONFIG)).toThrow(RangeError);
  });

  it.each<[string, readonly number[]]>([
    ['không mang món nào', []],
    ['chỉ số vũ khí không tồn tại', [0, 7]],
    ['chỉ số không nguyên', [0.5]],
    ['mang trùng một món', [0, 0]],
    ['hai món cùng tầm (Kiếm và Rìu)', [0, 3]],
    ['sai thứ tự tầm (Cung trước Kiếm)', [2, 0, 1]],
  ])('từ chối bộ đồ: %s', (_label, weapons) => {
    expect(() => validateLoadout({ weapons }, CONFIG)).toThrow(RangeError);
  });

  it('bộ mặc định của game thật hợp lệ, và mọi cách chọn ô gần đều hợp lệ', () => {
    const base = defaultLoadout(BATTLE_CONFIG);
    expect(() => validateLoadout(base, BATTLE_CONFIG)).not.toThrow();
    const near = slotOptions(BATTLE_CONFIG, allWeapons(BATTLE_CONFIG))[0];
    expect(near?.weapons.length).toBeGreaterThan(1);
    for (const index of near?.weapons ?? []) {
      expect(() =>
        validateLoadout(chooseWeapon(base, index, BATTLE_CONFIG), BATTLE_CONFIG),
      ).not.toThrow();
    }
  });

  it('mô tả món sinh từ con số cấu hình', () => {
    expect(describeWeapon(weapon('Rìu', 'near', { twoSided: true, push: 'out' }))).toBe(
      'Rìu: vòng 0–1, rộng 3 lát, 2 phía, đẩy lùi',
    );
    expect(
      describeWeapon(
        weapon('Cung', 'far', { widthSectors: 1, minRing: 4, maxRing: 5, push: 'in' }),
      ),
    ).toBe('Cung: vòng 4–5, rộng 1 lát, kéo vào');
    expect(describeWeapon(weapon('Giáo', 'mid', { push: 'clockwise' }))).toBe(
      'Giáo: vòng 0–1, rộng 3 lát, đẩy lệch phải',
    );
    expect(describeWeapon(weapon('Gậy', 'mid'))).toBe('Gậy: vòng 0–1, rộng 3 lát, không đẩy');
    // B6: có chí mạng thì ghi thêm.
    expect(describeWeapon(weapon('Gậy', 'mid', { critChance: 0.1 }))).toBe(
      'Gậy: vòng 0–1, rộng 3 lát, không đẩy, chí mạng 10%',
    );
    // Đợt 5: vũ khí có cấp màu thì ghi tên cấp; sát thương trên 1 thì ghi sát thương.
    expect(
      describeWeapon(
        weapon('Gậy', 'mid', { tier: 4, damage: 2, widthSectors: 5, critChance: 0.25 }),
        LOOT_CONFIG,
      ),
    ).toBe('Gậy Huyền thoại: vòng 0–1, rộng 5 lát, không đẩy, chí mạng 25%, sát thương 2');
  });
});

describe('B6 — skill mang vào trận', () => {
  it('danh sách skill theo thứ tự cấu hình; màn mở skill theo cấu hình', () => {
    expect(skillOptions(CONFIG)).toEqual(['iceRain', 'fireball']);
    expect(isSkillUnlocked(0, { ...CONFIG, skillUnlockLevel: 1 })).toBe(false);
    expect(isSkillUnlocked(1, { ...CONFIG, skillUnlockLevel: 1 })).toBe(true);
  });

  it('chọn skill thì thay skill đang mang, giữ nguyên vũ khí', () => {
    const base = { weapons: [3, 1, 2], skill: 'iceRain' as const };
    expect(chooseSkill(base, 'fireball')).toEqual({ weapons: [3, 1, 2], skill: 'fireball' });
  });

  it('bộ đồ cho màn: màn chưa mở thì bỏ skill; màn đã mở mà chưa chọn thì mang skill đầu tiên', () => {
    const config = { ...CONFIG, skillUnlockLevel: 1 };
    expect(loadoutForLevel({ weapons: [0, 1, 2], skill: 'fireball' }, 0, config)).toEqual({
      weapons: [0, 1, 2],
    });
    expect(loadoutForLevel({ weapons: [0, 1, 2] }, 1, config)).toEqual({
      weapons: [0, 1, 2],
      skill: 'iceRain',
    });
    expect(loadoutForLevel({ weapons: [0, 1, 2], skill: 'fireball' }, 1, config)).toEqual({
      weapons: [0, 1, 2],
      skill: 'fireball',
    });
  });

  it('mô tả skill sinh từ con số cấu hình', () => {
    expect(describeSkill(CONFIG.skills.iceRain)).toBe(
      'Băng thử: mọi quái mất 1 máu, đứng im 1 lượt; nạp 2 nhát',
    );
    expect(describeSkill(CONFIG.skills.fireball)).toBe('Lửa thử: mọi quái mất 2 máu; nạp 3 nhát');
  });
});
