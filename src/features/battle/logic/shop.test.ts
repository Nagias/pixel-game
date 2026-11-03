import { describe, expect, it } from 'vitest';
import { BATTLE_CONFIG, LOOT_CONFIG, SHOP_CONFIG } from './battleConfig';
import type { ShopConfig } from './battleTypes';
import { buyRental, effectiveTiers, rentalsAfterBattle, validateShopConfig } from './shop';

// Đợt 6 kế hoạch sau B6 (chủ dự án duyệt 27/10/2026, lượt duyệt chung mục 1b): cửa hàng bán cố định 4 món cấp
// Hiếm (Kiếm, Rìu, Giáo, Cung), 25 vàng mỗi món, có hạn 5 trận — thắng hay thua đều trừ. Agent chọn: chỉ trừ
// trận có mang món đó; mua thêm khi còn hạn thì cộng dồn; vũ khí đã có cấp vĩnh viễn từ Hiếm trở lên thì
// không bán (mua là phí).

const SHOP: ShopConfig = { weapons: [0, 3, 1, 2], tier: 2, price: 25, battles: 5 };

describe('cửa hàng', () => {
  // F19 (chủ dự án duyệt 03/11/2026, mục 3): bán thêm bản Hiếm của Búa, Lưỡi hái, Nỏ, cùng giá và hạn.
  it('bảng thật đúng bản chủ dự án duyệt: Kiếm, Rìu, Giáo, Cung, Búa, Lưỡi hái, Nỏ cấp Hiếm, 25 vàng, 5 trận', () => {
    expect(SHOP_CONFIG).toEqual({ ...SHOP, weapons: [...SHOP.weapons, 4, 5, 6] });
    expect(LOOT_CONFIG.tiers[SHOP_CONFIG.tier]?.name).toBe('Hiếm');
    expect(SHOP_CONFIG.weapons.map((w) => BATTLE_CONFIG.weapons[w]?.name)).toEqual([
      'Kiếm',
      'Rìu',
      'Giáo',
      'Cung',
      'Búa',
      'Lưỡi hái',
      'Nỏ',
    ]);
    expect(() => validateShopConfig(SHOP_CONFIG, BATTLE_CONFIG, LOOT_CONFIG)).not.toThrow();
  });

  it('mua: trừ đúng giá, vũ khí dùng được cấp Hiếm trong 5 trận', () => {
    expect(buyRental({ gold: 30, rentals: {}, rentalTiers: {} }, 1, {}, SHOP)).toEqual({
      gold: 5,
      rentals: { 1: 5 },
      rentalTiers: { 1: 2 },
    });
  });

  it('mua thêm khi còn hạn: cộng dồn số trận', () => {
    expect(
      buyRental({ gold: 25, rentals: { 1: 2 }, rentalTiers: {} }, 1, {}, SHOP).rentals,
    ).toEqual({
      1: 7,
    });
  });

  it.each<[string, Parameters<typeof buyRental>]>([
    ['thiếu vàng', [{ gold: 24, rentals: {}, rentalTiers: {} }, 1, {}, SHOP]],
    ['vũ khí cửa hàng không bán', [{ gold: 99, rentals: {}, rentalTiers: {} }, 9, {}, SHOP]],
    [
      'đã có vĩnh viễn từ cấp Hiếm trở lên (mua là phí)',
      [{ gold: 99, rentals: {}, rentalTiers: {} }, 1, { 1: 2 }, SHOP],
    ],
  ])('không mua được (%s): từ chối, không trừ gì', (_, args) => {
    expect(() => buyRental(...args)).toThrow(RangeError);
  });

  it('cấp dùng trong trận: món thuê còn hạn lên cấp Hiếm, nhưng không làm tụt món vĩnh viễn cao hơn', () => {
    expect(effectiveTiers({ 0: 1, 2: 4 }, { 0: 3, 2: 1, 3: 0 }, {}, SHOP)).toEqual({ 0: 2, 2: 4 });
    expect(effectiveTiers({}, {}, {}, SHOP)).toEqual({});
  });

  it('hết trận (thắng hay thua): món thuê có mang vào trận bớt 1 trận, hết hạn thì bỏ; món không mang giữ nguyên', () => {
    expect(
      rentalsAfterBattle(
        { rentals: { 0: 5, 1: 1, 2: 3 }, rentalTiers: { 1: 4 } },
        { weapons: [0, 1] },
      ),
    ).toEqual({ rentals: { 0: 4, 2: 3 }, rentalTiers: {} });
    expect(rentalsAfterBattle({ rentals: {}, rentalTiers: {} }, { weapons: [0, 1, 2] })).toEqual({
      rentals: {},
      rentalTiers: {},
    });
  });

  it('dữ liệu hồ sơ lạ (số trận âm / lẻ) coi như hết hạn', () => {
    expect(effectiveTiers({}, { 0: -2, 1: 1.5 }, {}, SHOP)).toEqual({});
    expect(
      rentalsAfterBattle({ rentals: { 0: -2, 1: 1.5 }, rentalTiers: {} }, { weapons: [0, 1] }),
    ).toEqual({ rentals: {}, rentalTiers: {} });
  });

  it.each<[string, Partial<ShopConfig>]>([
    ['giá âm', { price: -1 }],
    ['số trận < 1', { battles: 0 }],
    ['cấp không có trong bảng rơi', { tier: 9 }],
    ['vũ khí không có', { weapons: [0, 9] }],
    ['bán trùng vũ khí', { weapons: [0, 0] }],
  ])('bảng cửa hàng sai bị từ chối: %s', (_, patch) => {
    expect(() => validateShopConfig({ ...SHOP, ...patch }, BATTLE_CONFIG, LOOT_CONFIG)).toThrow(
      RangeError,
    );
  });
});

// F19 PR B: món rơi có hạn mang cấp riêng (không chỉ cấp Hiếm của cửa hàng). Một vũ khí một món có hạn.
describe('món có hạn có cấp (đồ rơi có hạn + cửa hàng)', () => {
  it('cấp dùng trong trận theo cấp của món có hạn; không ghi cấp thì là cấp cửa hàng', () => {
    expect(effectiveTiers({ 0: 1 }, { 0: 2, 1: 3 }, { 0: 5 }, SHOP)).toEqual({ 0: 5, 1: 2 });
  });

  it('đang có món có hạn cấp cao hơn cấp cửa hàng: không mua được (mua là phí)', () => {
    expect(() =>
      buyRental({ gold: 99, rentals: { 1: 3 }, rentalTiers: { 1: 4 } }, 1, {}, SHOP),
    ).toThrow(RangeError);
  });

  it('đang có món có hạn cấp thấp hơn cấp cửa hàng: mua thì thay bằng món cửa hàng (cấp Hiếm, 5 trận)', () => {
    expect(buyRental({ gold: 25, rentals: { 1: 8 }, rentalTiers: { 1: 1 } }, 1, {}, SHOP)).toEqual({
      gold: 0,
      rentals: { 1: 5 },
      rentalTiers: { 1: 2 },
    });
  });
});
