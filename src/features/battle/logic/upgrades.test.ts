import { describe, expect, it } from 'vitest';
import { BATTLE_CONFIG, LOOT_CONFIG, TIER_UP_CONFIG, UPGRADE_CONFIG } from './battleConfig';
import type { BattleConfig, TierUpConfig, UpgradeConfig } from './battleTypes';
import {
  buyTierUp,
  buyUpgrade,
  tierUpCost,
  upgradeCost,
  validateTierUpConfig,
  validateUpgradeConfig,
  withUpgrades,
} from './upgrades';

// Đợt 4 kế hoạch sau B6 (chủ dự án duyệt 27/10/2026 — "agent đề xuất"): nâng cấp bằng vàng — máu tối đa,
// chí mạng (mọi vũ khí), hồi máu; mỗi chỉ số tối đa 3 cấp, giá tăng dần. Nâng cấp chỉ đổi con số của trận
// (withUpgrades trả cấu hình mới), không đổi luật. Cấu hình riêng cho test để kỳ vọng tính tay được.

const UPGRADES: UpgradeConfig = {
  hp: { name: 'Máu thử', perLevel: 2, costs: [10, 20, 40] },
  crit: { name: 'Chí mạng thử', perLevel: 0.05, costs: [10, 20, 40] },
  heal: { name: 'Hồi máu thử', perLevel: 1, costs: [5] },
  luck: { name: 'May mắn thử', perLevel: 0.05, costs: [10, 20, 40] },
};

const BASE: BattleConfig = {
  ...BATTLE_CONFIG,
  hero: { hp: 10, healMinHits: 3, healAmount: 1 },
  weapons: BATTLE_CONFIG.weapons.map((w, i) => ({ ...w, critChance: i === 0 ? 0.1 : undefined })),
};

describe('hiệu lực nâng cấp lên trận (withUpgrades)', () => {
  it('chưa nâng gì: cấu hình y nguyên', () => {
    expect(withUpgrades(BASE, {}, UPGRADES)).toEqual(BASE);
  });

  it('máu tối đa +2 mỗi cấp, hồi máu +1 mỗi cấp', () => {
    const up = withUpgrades(BASE, { hp: 2, heal: 1 }, UPGRADES);
    expect(up.hero).toEqual({ hp: 14, healMinHits: 3, healAmount: 2 });
  });

  it('chí mạng +5% mỗi cấp cho mọi vũ khí (vũ khí chưa có chí mạng tính từ 0%)', () => {
    const up = withUpgrades(BASE, { crit: 3 }, UPGRADES);
    expect(up.weapons[0]?.critChance).toBeCloseTo(0.25);
    expect(up.weapons[1]?.critChance).toBeCloseTo(0.15);
  });

  it('cấp lưu trong hồ sơ vượt giới hạn (game giảm số cấp) thì tính theo cấp tối đa; loại lạ bỏ qua', () => {
    const up = withUpgrades(BASE, { hp: 9, heal: 4, bay: 3 }, UPGRADES);
    expect(up.hero.hp).toBe(16);
    expect(up.hero.healAmount).toBe(2);
  });

  it('không sửa cấu hình gốc', () => {
    const before = JSON.stringify(BASE);
    withUpgrades(BASE, { hp: 1, crit: 1, heal: 1 }, UPGRADES);
    expect(JSON.stringify(BASE)).toBe(before);
  });
});

describe('mua nâng cấp', () => {
  it('giá cấp kế: theo bậc giá; đã tối đa thì null', () => {
    expect(upgradeCost({}, 'hp', UPGRADES)).toBe(10);
    expect(upgradeCost({ hp: 2 }, 'hp', UPGRADES)).toBe(40);
    expect(upgradeCost({ hp: 3 }, 'hp', UPGRADES)).toBeNull();
    expect(upgradeCost({ heal: 1 }, 'heal', UPGRADES)).toBeNull();
  });

  it('đủ vàng: trừ đúng giá, lên 1 cấp, các chỉ số khác giữ nguyên', () => {
    expect(buyUpgrade({ gold: 25, upgrades: { crit: 1 } }, 'hp', UPGRADES)).toEqual({
      gold: 15,
      upgrades: { crit: 1, hp: 1 },
    });
  });

  it('thiếu vàng hoặc đã tối đa thì từ chối (không trừ vàng)', () => {
    expect(() => buyUpgrade({ gold: 9, upgrades: {} }, 'hp', UPGRADES)).toThrow(RangeError);
    expect(() => buyUpgrade({ gold: 999, upgrades: { hp: 3 } }, 'hp', UPGRADES)).toThrow(
      RangeError,
    );
  });
});

describe('cấu hình nâng cấp sai bị từ chối', () => {
  it.each<[string, UpgradeConfig]>([
    ['không có bậc giá nào', { ...UPGRADES, hp: { ...UPGRADES.hp, costs: [] } }],
    ['giá âm', { ...UPGRADES, hp: { ...UPGRADES.hp, costs: [10, -1] } }],
    ['giá số lẻ', { ...UPGRADES, hp: { ...UPGRADES.hp, costs: [1.5] } }],
    ['máu mỗi cấp không nguyên', { ...UPGRADES, hp: { ...UPGRADES.hp, perLevel: 1.5 } }],
    ['hồi máu mỗi cấp âm', { ...UPGRADES, heal: { ...UPGRADES.heal, perLevel: -1 } }],
    ['chí mạng cấp tối đa vượt 100%', { ...UPGRADES, crit: { ...UPGRADES.crit, perLevel: 0.5 } }],
  ])('%s', (_name, upgrades) => {
    expect(() => validateUpgradeConfig(upgrades, BASE)).toThrow(RangeError);
  });

  it('bảng nâng cấp thật của game hợp lệ', () => {
    expect(() => validateUpgradeConfig(UPGRADE_CONFIG, BATTLE_CONFIG)).not.toThrow();
  });
});

// F20 (chủ dự án duyệt 07/11/2026): lên cấp màu vũ khí bằng vàng — lên Tốt 35, lên Hiếm 70 (tổng 105 = tổng giá
// nâng vũ khí F19 đã duyệt). Sử thi trở lên chỉ có từ quái hiếm. Cấp màu là cấp duy nhất, luôn vĩnh viễn.

const UP: TierUpConfig = { costs: [35, 70] };

describe('lên cấp vũ khí bằng vàng', () => {
  const owned = [0, 1, 2];

  it('bảng thật đúng bản chủ dự án duyệt: lên Tốt 35, lên Hiếm 70', () => {
    expect(TIER_UP_CONFIG).toEqual(UP);
    expect(() => validateTierUpConfig(TIER_UP_CONFIG, LOOT_CONFIG)).not.toThrow();
  });

  it('giá lên cấp kế: Thường 35, Tốt 70; từ Hiếm trở lên không mua được (null)', () => {
    expect(tierUpCost({}, 0, UP)).toBe(35);
    expect(tierUpCost({ 0: 1 }, 0, UP)).toBe(70);
    expect(tierUpCost({ 0: 2 }, 0, UP)).toBeNull();
    expect(tierUpCost({ 0: 5 }, 0, UP)).toBeNull();
  });

  it('dữ liệu hồ sơ lạ (âm, lẻ) tính như cấp Thường', () => {
    expect(tierUpCost({ 0: -1 }, 0, UP)).toBe(35);
    expect(tierUpCost({ 0: 1.5 }, 0, UP)).toBe(35);
  });

  it('mua: trừ đúng giá, vũ khí lên 1 cấp, vũ khí khác giữ nguyên', () => {
    expect(buyTierUp({ gold: 100, weaponTiers: { 1: 2 } }, 0, owned, UP)).toEqual({
      gold: 65,
      weaponTiers: { 0: 1, 1: 2 },
    });
    expect(buyTierUp({ gold: 70, weaponTiers: { 0: 1 } }, 0, owned, UP)).toEqual({
      gold: 0,
      weaponTiers: { 0: 2 },
    });
  });

  it.each<[string, Parameters<typeof buyTierUp>]>([
    ['thiếu vàng', [{ gold: 34, weaponTiers: {} }, 0, owned, UP]],
    ['đã tới Hiếm', [{ gold: 999, weaponTiers: { 0: 2 } }, 0, owned, UP]],
    ['vũ khí chưa có', [{ gold: 999, weaponTiers: {} }, 5, owned, UP]],
  ])('không mua được (%s): từ chối, không trừ gì', (_, args) => {
    expect(() => buyTierUp(...args)).toThrow(RangeError);
  });

  it.each<[string, TierUpConfig]>([
    ['không có giá nào', { costs: [] }],
    ['giá âm', { costs: [35, -1] }],
    ['mua tới cấp không có trong bảng', { costs: [1, 2, 3, 4, 5, 6] }],
  ])('bảng sai bị từ chối: %s', (_, tierUp) => {
    expect(() => validateTierUpConfig(tierUp, LOOT_CONFIG)).toThrow(RangeError);
  });
});
