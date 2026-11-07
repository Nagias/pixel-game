// Luật nâng cấp (đợt 4): giá, giới hạn cấp, hiệu lực lên trận. Hàm thuần. Nâng cấp không đổi luật trận:
// withUpgrades trả cấu hình trận đã cộng chỉ số, trận chạy y như cũ trên cấu hình đó.
import {
  UPGRADE_KINDS,
  type BattleConfig,
  type LootConfig,
  type TierUpConfig,
  type UpgradeConfig,
  type UpgradeKind,
  type UpgradeLevels,
  type WeaponTiers,
} from './battleTypes';
import { permanentTierOf } from './loot';

/** Cấp hiện có của một chỉ số: số nguyên ≥ 0, không vượt cấp tối đa (dữ liệu hồ sơ có thể lạ). */
function levelOf(levels: UpgradeLevels, kind: UpgradeKind, upgrades: UpgradeConfig): number {
  const raw = levels[kind] ?? 0;
  const level = Number.isInteger(raw) && raw > 0 ? raw : 0;
  return Math.min(level, upgrades[kind].costs.length);
}

/** Chặn bảng nâng cấp sai ngay khi dùng, thay vì để nâng cấp ra con số vô nghĩa. */
export function validateUpgradeConfig(upgrades: UpgradeConfig, config: BattleConfig): void {
  const problems: string[] = [];
  for (const kind of UPGRADE_KINDS) {
    const { name, perLevel, costs } = upgrades[kind];
    if (costs.length === 0) problems.push(`"${name}": phải có ít nhất 1 cấp`);
    if (!costs.every((cost) => Number.isInteger(cost) && cost >= 0)) {
      problems.push(`"${name}": giá phải là số nguyên ≥ 0`);
    }
    if (kind === 'crit') {
      const strongest = Math.max(0, ...config.weapons.map((w) => w.critChance ?? 0));
      if (!(perLevel >= 0 && strongest + perLevel * costs.length <= 1)) {
        problems.push(`"${name}": chí mạng ở cấp tối đa phải trong [0, 1]`);
      }
    } else if (kind === 'luck') {
      if (!(perLevel >= 0 && (config.rare?.chance ?? 0) + perLevel * costs.length <= 1)) {
        problems.push(`"${name}": xác suất quái hiếm ở cấp tối đa phải trong [0, 1]`);
      }
    } else if (!Number.isInteger(perLevel) || perLevel < 0) {
      problems.push(`"${name}": mỗi cấp phải cộng số nguyên ≥ 0`);
    }
  }
  if (problems.length > 0) {
    throw new RangeError(`Bảng nâng cấp sai: ${problems.join('; ')}`);
  }
}

/** Cấu hình trận sau khi cộng các cấp đã nâng: máu tối đa, chí mạng mọi vũ khí, máu hồi, may mắn (đợt 5). */
export function withUpgrades(
  config: BattleConfig,
  levels: UpgradeLevels,
  upgrades: UpgradeConfig,
): BattleConfig {
  validateUpgradeConfig(upgrades, config);
  const bonus = (kind: UpgradeKind) => levelOf(levels, kind, upgrades) * upgrades[kind].perLevel;
  if (UPGRADE_KINDS.every((kind) => levelOf(levels, kind, upgrades) === 0)) return config;
  return {
    ...config,
    hero: {
      ...config.hero,
      hp: config.hero.hp + bonus('hp'),
      healAmount: config.hero.healAmount + bonus('heal'),
    },
    weapons: config.weapons.map((weapon) => ({
      ...weapon,
      critChance: (weapon.critChance ?? 0) + bonus('crit'),
    })),
    ...(config.rare
      ? { rare: { ...config.rare, chance: config.rare.chance + bonus('luck') } }
      : {}),
  };
}

/** Giá vàng của cấp kế tiếp; null nếu đã tối đa. */
export function upgradeCost(
  levels: UpgradeLevels,
  kind: UpgradeKind,
  upgrades: UpgradeConfig,
): number | null {
  return upgrades[kind].costs[levelOf(levels, kind, upgrades)] ?? null;
}

/** Ví người chơi khi mua: vàng và các cấp đã nâng (phần của hồ sơ). */
export interface Wallet {
  readonly gold: number;
  readonly upgrades: UpgradeLevels;
}

/** Mua 1 cấp: trừ đúng giá, lên 1 cấp. Đã tối đa hoặc thiếu vàng thì từ chối (không trừ gì). */
export function buyUpgrade(wallet: Wallet, kind: UpgradeKind, upgrades: UpgradeConfig): Wallet {
  const cost = upgradeCost(wallet.upgrades, kind, upgrades);
  if (cost === null) throw new RangeError(`"${upgrades[kind].name}" đã tối đa`);
  if (wallet.gold < cost) {
    throw new RangeError(`Thiếu vàng: cần ${cost}, có ${wallet.gold}`);
  }
  return {
    gold: wallet.gold - cost,
    upgrades: { ...wallet.upgrades, [kind]: levelOf(wallet.upgrades, kind, upgrades) + 1 },
  };
}

// ---------- F20: lên cấp màu vũ khí bằng vàng ----------

/** Chặn bảng lên cấp sai ngay khi dùng: có giá, giá là số nguyên ≥ 0, cấp mua được phải có trong bảng cấp. */
export function validateTierUpConfig(tierUp: TierUpConfig, loot: LootConfig): void {
  const problems: string[] = [];
  const { costs } = tierUp;
  if (costs.length === 0) problems.push('phải có ít nhất 1 giá');
  if (!costs.every((cost) => Number.isInteger(cost) && cost >= 0)) {
    problems.push('giá phải là số nguyên ≥ 0');
  }
  if (costs.length >= loot.tiers.length) {
    problems.push(
      `chỉ có ${loot.tiers.length} cấp — mua được tối đa tới cấp ${loot.tiers.length - 1}`,
    );
  }
  if (problems.length > 0) {
    throw new RangeError(`Bảng lên cấp vũ khí sai: ${problems.join('; ')}`);
  }
}

/** Giá vàng lên cấp kế của vũ khí `weapon`; null nếu cấp đang có không còn mua được bằng vàng. */
export function tierUpCost(
  tiers: WeaponTiers,
  weapon: number,
  tierUp: TierUpConfig,
): number | null {
  return tierUp.costs[permanentTierOf(tiers, weapon) ?? 0] ?? null;
}

/** Ví khi lên cấp vũ khí: vàng và cấp của từng vũ khí (phần của hồ sơ). */
export interface TierWallet {
  readonly gold: number;
  readonly weaponTiers: WeaponTiers;
}

/**
 * Lên vũ khí `weapon` một cấp bằng vàng: trừ đúng giá. Vũ khí chưa có (`owned`), đã tới cấp cao nhất mua được,
 * hoặc thiếu vàng thì từ chối (không trừ gì).
 */
export function buyTierUp(
  wallet: TierWallet,
  weapon: number,
  owned: readonly number[],
  tierUp: TierUpConfig,
): TierWallet {
  if (!owned.includes(weapon)) throw new RangeError(`Chưa có vũ khí số ${weapon}`);
  const cost = tierUpCost(wallet.weaponTiers, weapon, tierUp);
  if (cost === null) throw new RangeError('Cấp cao hơn chỉ có từ quái hiếm');
  if (wallet.gold < cost) throw new RangeError(`Thiếu vàng: cần ${cost}, có ${wallet.gold}`);
  return {
    gold: wallet.gold - cost,
    weaponTiers: {
      ...wallet.weaponTiers,
      [weapon]: (permanentTierOf(wallet.weaponTiers, weapon) ?? 0) + 1,
    },
  };
}
