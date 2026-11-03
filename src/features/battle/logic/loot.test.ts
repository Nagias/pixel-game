import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import { BATTLE_CONFIG, LOOT_CONFIG } from './battleConfig';
import type { LootConfig, LootPity, MonsterKind } from './battleTypes';
import { applyDrop, lootAfterBattle, rollLoot, validateLootConfig, withWeaponTiers } from './loot';

// Đợt 5 kế hoạch sau B6 (chủ dự án duyệt 27/10/2026, lượt duyệt chung mục 1b): hạ quái hiếm thì 50% rơi
// vũ khí; 6 cấp màu, mỗi cấp chỉ cộng chỉ số; bảo hiểm 3 quái hiếm liền không rơi → con thứ 4 chắc rơi;
// 30 món chưa có từ Sử thi trở lên → món thứ 30 chắc từ Sử thi. Loại vũ khí tạm ngẫu nhiên. Đồ vĩnh viễn.

const NO_PITY: LootPity = { dryRareKills: 0, dropsSinceHighTier: 0 };

/** Bảng rơi để test: tỉ lệ rơi và cấp do test chọn. */
const loot = (patch: Partial<LootConfig> = {}): LootConfig => ({ ...LOOT_CONFIG, ...patch });

describe('cấp màu vũ khí', () => {
  it('bảng thật đúng bản chủ dự án duyệt: 6 cấp, tỉ lệ 40/28/17/10/4/1, bảo hiểm 3 và 30 từ Sử thi', () => {
    expect(LOOT_CONFIG.tiers.map((t) => [t.name, t.dropRate])).toEqual([
      ['Thường', 0.4],
      ['Tốt', 0.28],
      ['Hiếm', 0.17],
      ['Sử thi', 0.1],
      ['Huyền thoại', 0.04],
      ['Thần', 0.01],
    ]);
    expect(LOOT_CONFIG).toMatchObject({ dropChance: 0.5, dryPity: 3, highPity: 30 });
    // F19 PR B (chủ dự án duyệt 03/11/2026): 30% vĩnh viễn, món có hạn dùng 10 trận; món thừa đổi vàng theo cấp.
    expect(LOOT_CONFIG).toMatchObject({
      permanentChance: 0.3,
      rentalBattles: 10,
      salvageGold: [1, 2, 4, 8, 15, 30],
    });
    expect(LOOT_CONFIG.tiers[LOOT_CONFIG.highTier]?.name).toBe('Sử thi');
    expect(() => validateLootConfig(LOOT_CONFIG, BATTLE_CONFIG)).not.toThrow();
  });

  it('vũ khí ở cấp nào thì cộng đúng chỉ số cấp đó; cấp Thường (0) giữ nguyên vũ khí gốc', () => {
    // Kiếm (0) Thần, Giáo (1) Sử thi, Cung (2) Tốt, Rìu (3) chưa rơi.
    const config = withWeaponTiers(BATTLE_CONFIG, { 0: 5, 1: 3, 2: 1 }, LOOT_CONFIG);
    const [sword, spear, bow, axe] = config.weapons;
    const base = BATTLE_CONFIG.weapons;
    expect(sword).toMatchObject({
      tier: 5,
      critChance: (base[0]?.critChance ?? 0) + 0.2,
      widthSectors: (base[0]?.widthSectors ?? 0) + 2,
      damage: (base[0]?.damage ?? 0) + 1,
    });
    expect(spear).toMatchObject({
      tier: 3,
      critChance: (base[1]?.critChance ?? 0) + 0.1,
      widthSectors: (base[1]?.widthSectors ?? 0) + 2,
      damage: base[1]?.damage,
    });
    expect(bow).toMatchObject({ tier: 1, critChance: (base[2]?.critChance ?? 0) + 0.05 });
    expect(axe).toEqual(base[3]);
  });

  it('dữ liệu hồ sơ lạ: cấp vượt bảng tính theo cấp cao nhất, vũ khí không có hoặc cấp sai thì bỏ qua', () => {
    const config = withWeaponTiers(BATTLE_CONFIG, { 0: 99, 9: 3, 1: -1, 2: 1.5 }, LOOT_CONFIG);
    expect(config.weapons[0]?.tier).toBe(LOOT_CONFIG.tiers.length - 1);
    expect(config.weapons.slice(1)).toEqual(BATTLE_CONFIG.weapons.slice(1));
  });

  it('không sửa cấu hình gốc, chưa có cấp nào thì trả nguyên cấu hình', () => {
    const before = JSON.stringify(BATTLE_CONFIG);
    withWeaponTiers(BATTLE_CONFIG, { 0: 5 }, LOOT_CONFIG);
    expect(JSON.stringify(BATTLE_CONFIG)).toBe(before);
    expect(withWeaponTiers(BATTLE_CONFIG, {}, LOOT_CONFIG)).toBe(BATTLE_CONFIG);
  });

  it.each<[string, Partial<LootConfig>]>([
    ['không có cấp nào', { tiers: [] }],
    ['tổng tỉ lệ khác 100%', { tiers: LOOT_CONFIG.tiers.map((t) => ({ ...t, dropRate: 0.1 })) }],
    ['tỉ lệ rơi ngoài [0, 1]', { dropChance: 1.5 }],
    ['bảo hiểm rơi không phải số nguyên ≥ 1', { dryPity: 0 }],
    ['cấp bảo hiểm cao không có', { highTier: 9 }],
    ['bảo hiểm cấp cao không phải số nguyên ≥ 1', { highPity: 2.5 }],
    [
      'rộng thêm số lẻ (vùng đánh phải rộng số lẻ lát)',
      { tiers: LOOT_CONFIG.tiers.map((t) => ({ ...t, widthBonus: 1 })) },
    ],
    [
      'chí mạng cấp cao nhất vượt 100%',
      { tiers: LOOT_CONFIG.tiers.map((t) => ({ ...t, critBonus: 0.95 })) },
    ],
  ])('bảng rơi sai bị từ chối: %s', (_, patch) => {
    expect(() => validateLootConfig(loot(patch), BATTLE_CONFIG)).toThrow(RangeError);
  });
});

describe('rơi đồ khi hạ quái hiếm', () => {
  it('rơi hay không theo tỉ lệ: 100% thì luôn rơi, 0% thì không rơi', () => {
    const [always] = rollLoot(NO_PITY, seedRng(7), 0, loot({ dropChance: 1 }));
    const [never] = rollLoot(NO_PITY, seedRng(7), 0, loot({ dropChance: 0 }));
    expect(always).not.toBeNull();
    expect(never).toBeNull();
  });

  it('không rơi thì đếm thêm 1 lần hụt; rơi thì đếm lại từ 0', () => {
    const [, dry] = rollLoot(NO_PITY, seedRng(7), 0, loot({ dropChance: 0 }));
    expect(dry).toEqual({ dryRareKills: 1, dropsSinceHighTier: 0 });
    const [, after] = rollLoot(
      { dryRareKills: 2, dropsSinceHighTier: 0 },
      seedRng(7),
      0,
      loot({ dropChance: 1 }),
    );
    expect(after.dryRareKills).toBe(0);
  });

  it('bảo hiểm: hụt 3 lần liền thì lần thứ 4 chắc chắn rơi (dù tỉ lệ 0%)', () => {
    const config = loot({ dropChance: 0 });
    let pity = NO_PITY;
    for (let kill = 1; kill <= 3; kill++) {
      const [drop, next] = rollLoot(pity, seedRng(kill), 0, config);
      expect(drop).toBeNull();
      pity = next;
    }
    const [fourth, reset] = rollLoot(pity, seedRng(4), 0, config);
    expect(fourth).not.toBeNull();
    expect(reset.dryRareKills).toBe(0);
  });

  it('bảo hiểm cấp cao: 29 món dưới Sử thi liền thì món thứ 30 chắc chắn từ Sử thi trở lên', () => {
    // Chỉ cấp Thường có tỉ lệ: bình thường món nào cũng Thường.
    const onlyCommon = loot({
      dropChance: 1,
      tiers: LOOT_CONFIG.tiers.map((t, i) => ({ ...t, dropRate: i === 0 ? 1 : 0 })),
    });
    let pity = NO_PITY;
    for (let n = 1; n <= 29; n++) {
      const [drop, next] = rollLoot(pity, seedRng(n), 0, onlyCommon);
      expect(drop?.tier).toBe(0);
      pity = next;
    }
    expect(pity.dropsSinceHighTier).toBe(29);
    // Các cấp từ Sử thi đều 0% trong bảng này: món bảo hiểm lấy cấp Sử thi (thấp nhất trong nhóm cao).
    const [thirtieth, reset] = rollLoot(pity, seedRng(30), 0, onlyCommon);
    expect(thirtieth?.tier).toBe(LOOT_CONFIG.highTier);
    expect(reset.dropsSinceHighTier).toBe(0);
  });

  it('bảo hiểm cấp cao chia theo tỉ lệ của nhóm cao (Sử thi : Huyền thoại : Thần = 10 : 4 : 1)', () => {
    const counts = [0, 0, 0, 0, 0, 0];
    const pity = { dryRareKills: 0, dropsSinceHighTier: 29 };
    for (let seed = 0; seed < 3000; seed++) {
      const [drop] = rollLoot(pity, seedRng(seed), 0, loot({ dropChance: 1 }));
      const t = drop?.tier ?? 0;
      counts[t] = (counts[t] ?? 0) + 1;
    }
    expect(counts.slice(0, 3)).toEqual([0, 0, 0]);
    expect((counts[3] ?? 0) / 3000).toBeCloseTo(10 / 15, 1);
    expect((counts[4] ?? 0) / 3000).toBeCloseTo(4 / 15, 1);
  });

  it('món rơi tự nhiên từ Sử thi trở lên cũng đếm lại bảo hiểm cấp cao từ 0', () => {
    const onlyGod = loot({
      dropChance: 1,
      tiers: LOOT_CONFIG.tiers.map((t, i) => ({ ...t, dropRate: i === 5 ? 1 : 0 })),
    });
    const [drop, pity] = rollLoot(
      { dryRareKills: 0, dropsSinceHighTier: 12 },
      seedRng(1),
      0,
      onlyGod,
    );
    expect(drop?.tier).toBe(5);
    expect(pity.dropsSinceHighTier).toBe(0);
  });

  it('tỉ lệ cấp theo bảng (10 000 lần rơi, không bảo hiểm): Thường ~40%, Thần ~1%', () => {
    const counts = [0, 0, 0, 0, 0, 0];
    for (let seed = 0; seed < 10_000; seed++) {
      const [drop] = rollLoot(NO_PITY, seedRng(seed), 0, loot({ dropChance: 1 }));
      const t = drop?.tier ?? 0;
      counts[t] = (counts[t] ?? 0) + 1;
    }
    LOOT_CONFIG.tiers.forEach((tier, i) => {
      expect(Math.abs((counts[i] ?? 0) / 10_000 - tier.dropRate)).toBeLessThan(0.015);
    });
  });

  // F19 PR B (chủ dự án duyệt 03/11/2026, mục 1): mỗi loài quái hiếm rơi đúng một loại vũ khí.
  it('món rơi luôn là vũ khí của loài quái hiếm (không còn ngẫu nhiên loại)', () => {
    for (let seed = 0; seed < 200; seed++) {
      const [drop] = rollLoot(NO_PITY, seedRng(seed), 5, loot({ dropChance: 1 }));
      expect(drop?.weapon).toBe(5);
    }
  });

  // F19 PR B (mục 2): 70% có hạn (dùng 10 trận), 30% vĩnh viễn; món bảo hiểm cấp cao luôn vĩnh viễn.
  it('dạng món: ~30% vĩnh viễn, còn lại có hạn 10 trận (10 000 lần rơi)', () => {
    let permanent = 0;
    for (let seed = 0; seed < 10_000; seed++) {
      const [drop] = rollLoot(NO_PITY, seedRng(seed), 0, loot({ dropChance: 1 }));
      if (drop?.battles === undefined) permanent++;
      else expect(drop.battles).toBe(10);
    }
    expect(Math.abs(permanent / 10_000 - 0.3)).toBeLessThan(0.015);
  });

  it('món chắc chắn nhờ bảo hiểm cấp cao luôn vĩnh viễn', () => {
    const pity = { dryRareKills: 0, dropsSinceHighTier: 29 };
    for (let seed = 0; seed < 300; seed++) {
      const [drop] = rollLoot(pity, seedRng(seed), 0, loot({ dropChance: 1 }));
      expect(drop?.battles).toBeUndefined();
    }
  });

  it('hết trận: món rơi là vũ khí của loài đã hạ (Yêu tinh → Kiếm, Dơi đêm → Lưỡi hái…)', () => {
    const pity = { dryRareKills: 3, dropsSinceHighTier: 0 };
    const weaponOf = (name: string) => BATTLE_CONFIG.weapons.findIndex((w) => w.name === name);
    const cases: [MonsterKind, string][] = [
      ['goblin', 'Kiếm'],
      ['wolf', 'Rìu'],
      ['goblinArcher', 'Cung'],
      ['bat', 'Lưỡi hái'],
    ];
    for (const [kind, weapon] of cases) {
      const { drop } = lootAfterBattle(
        { seed: 5, rareKilled: kind },
        pity,
        BATTLE_CONFIG,
        LOOT_CONFIG,
      );
      expect(drop?.weapon, kind).toBe(weaponOf(weapon));
    }
  });

  it('cùng trận (cùng seed) thì cùng kết quả — lặp lại được', () => {
    const won = { seed: 123, rareKilled: 'goblin' } as const;
    expect(lootAfterBattle(won, NO_PITY, BATTLE_CONFIG, LOOT_CONFIG)).toEqual(
      lootAfterBattle(won, NO_PITY, BATTLE_CONFIG, LOOT_CONFIG),
    );
  });

  it('trận không hạ quái hiếm: không rơi gì, bảo hiểm giữ nguyên', () => {
    const pity = { dryRareKills: 2, dropsSinceHighTier: 7 };
    expect(lootAfterBattle({ seed: 1 }, pity, BATTLE_CONFIG, LOOT_CONFIG)).toEqual({
      drop: null,
      pity,
    });
  });
});

// F19 PR B (chủ dự án duyệt 03/11/2026, mục 2 và 6): nhận món rơi vào túi đồ. Mỗi vũ khí có một món vĩnh viễn
// (cấp cao nhất đã rơi) và tối đa một món có hạn (cấp + số trận). Món không làm mạnh hơn đồ đang có thì đổi vàng.
describe('nhận món rơi vào túi đồ', () => {
  const SHOP_TIER = 2;
  const EMPTY = { tiers: {}, rentals: {}, rentalTiers: {} };
  /** `unlocked`: vũ khí đã mở khóa theo màn — bản Thường coi như đã có. */
  const apply = (
    inventory: Parameters<typeof applyDrop>[0],
    drop: Parameters<typeof applyDrop>[1],
    unlocked = true,
  ) => applyDrop(inventory, drop, LOOT_CONFIG, SHOP_TIER, unlocked);

  it('món vĩnh viễn cao hơn đồ đang có: lên cấp vĩnh viễn, không đổi vàng', () => {
    expect(apply({ ...EMPTY, tiers: { 0: 1 } }, { weapon: 0, tier: 3 })).toEqual({
      inventory: { ...EMPTY, tiers: { 0: 3 } },
      outcome: 'permanent',
      salvage: 0,
    });
  });

  it('món vĩnh viễn không cao hơn đồ vĩnh viễn đang có: giữ đồ cũ, đổi vàng theo cấp món rơi', () => {
    const inventory = { ...EMPTY, tiers: { 0: 3 } };
    expect(apply(inventory, { weapon: 0, tier: 3 })).toEqual({
      inventory,
      outcome: 'salvaged',
      salvage: 8,
    });
    expect(apply(inventory, { weapon: 0, tier: 1 }).salvage).toBe(2);
  });

  it('món có hạn cao hơn đồ vĩnh viễn, chưa có món có hạn: thành món có hạn (cấp + 10 trận)', () => {
    expect(apply({ ...EMPTY, tiers: { 0: 1 } }, { weapon: 0, tier: 4, battles: 10 })).toEqual({
      inventory: { tiers: { 0: 1 }, rentals: { 0: 10 }, rentalTiers: { 0: 4 } },
      outcome: 'rental',
      salvage: 0,
    });
  });

  it('món có hạn cùng cấp món có hạn đang có: cộng dồn trận', () => {
    const inventory = { tiers: {}, rentals: { 0: 3 }, rentalTiers: { 0: 4 } };
    expect(apply(inventory, { weapon: 0, tier: 4, battles: 10 })).toEqual({
      inventory: { tiers: {}, rentals: { 0: 13 }, rentalTiers: { 0: 4 } },
      outcome: 'extended',
      salvage: 0,
    });
  });

  it('món có hạn cao hơn món có hạn đang có: thay hẳn (cấp mới, 10 trận)', () => {
    const inventory = { tiers: {}, rentals: { 0: 3 }, rentalTiers: { 0: 1 } };
    expect(apply(inventory, { weapon: 0, tier: 2, battles: 10 }).inventory).toEqual({
      tiers: {},
      rentals: { 0: 10 },
      rentalTiers: { 0: 2 },
    });
  });

  it('món có hạn thấp hơn món có hạn đang có, hoặc không cao hơn đồ vĩnh viễn: đổi vàng', () => {
    const renting = { tiers: {}, rentals: { 0: 3 }, rentalTiers: { 0: 4 } };
    expect(apply(renting, { weapon: 0, tier: 2, battles: 10 })).toMatchObject({
      inventory: renting,
      outcome: 'salvaged',
      salvage: 4,
    });
    const owning = { ...EMPTY, tiers: { 0: 3 } };
    expect(apply(owning, { weapon: 0, tier: 3, battles: 10 })).toMatchObject({
      inventory: owning,
      outcome: 'salvaged',
      salvage: 8,
    });
  });

  it('món thuê ở cửa hàng không ghi cấp (hồ sơ cũ) là cấp cửa hàng (Hiếm)', () => {
    const shopRental = { tiers: {}, rentals: { 0: 2 }, rentalTiers: {} };
    expect(apply(shopRental, { weapon: 0, tier: 2, battles: 10 }).outcome).toBe('extended');
    expect(apply(shopRental, { weapon: 0, tier: 1, battles: 10 }).outcome).toBe('salvaged');
  });

  it('món có hạn đã hết trận thì như chưa có', () => {
    const expired = { tiers: {}, rentals: { 0: 0 }, rentalTiers: { 0: 5 } };
    expect(apply(expired, { weapon: 0, tier: 1, battles: 10 })).toMatchObject({
      inventory: { rentals: { 0: 10 }, rentalTiers: { 0: 1 } },
      outcome: 'rental',
    });
  });

  it('vũ khí chưa mở khóa: món Thường rơi ra vẫn nhận (vĩnh viễn ghi cấp 0, có hạn thành món có hạn)', () => {
    expect(apply(EMPTY, { weapon: 4, tier: 0 }, false)).toEqual({
      inventory: { ...EMPTY, tiers: { 4: 0 } },
      outcome: 'permanent',
      salvage: 0,
    });
    expect(apply(EMPTY, { weapon: 4, tier: 0, battles: 10 }, false)).toMatchObject({
      inventory: { rentals: { 4: 10 }, rentalTiers: { 4: 0 } },
      outcome: 'rental',
    });
  });

  it('vũ khí đã mở khóa: món Thường là món thừa, đổi vàng', () => {
    expect(apply(EMPTY, { weapon: 4, tier: 0, battles: 10 })).toMatchObject({
      inventory: EMPTY,
      outcome: 'salvaged',
      salvage: 1,
    });
  });

  it('chưa mở khóa nhưng đang có món có hạn: món vĩnh viễn Thường vẫn nhận (giữ được mãi)', () => {
    const renting = { tiers: {}, rentals: { 4: 3 }, rentalTiers: { 4: 1 } };
    expect(apply(renting, { weapon: 4, tier: 0 }, false)).toMatchObject({
      inventory: { tiers: { 4: 0 }, rentals: { 4: 3 } },
      outcome: 'permanent',
    });
  });
});
