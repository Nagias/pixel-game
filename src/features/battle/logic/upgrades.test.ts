import { describe, expect, it } from 'vitest';
import { BATTLE_CONFIG, UPGRADE_CONFIG } from './battleConfig';
import type { BattleConfig, UpgradeConfig } from './battleTypes';
import { buyUpgrade, upgradeCost, validateUpgradeConfig, withUpgrades } from './upgrades';

// Đợt 4 kế hoạch sau B6 (chủ dự án duyệt 27/10/2026 — "agent đề xuất"): nâng cấp bằng vàng — máu tối đa,
// chí mạng (mọi vũ khí), hồi máu; mỗi chỉ số tối đa 3 cấp, giá tăng dần. Nâng cấp chỉ đổi con số của trận
// (withUpgrades trả cấu hình mới), không đổi luật. Cấu hình riêng cho test để kỳ vọng tính tay được.

const UPGRADES: UpgradeConfig = {
  hp: { name: 'Máu thử', perLevel: 2, costs: [10, 20, 40] },
  crit: { name: 'Chí mạng thử', perLevel: 0.05, costs: [10, 20, 40] },
  heal: { name: 'Hồi máu thử', perLevel: 1, costs: [5] },
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
