// Đợt 6: cửa hàng — mua vũ khí cấp cao dùng có hạn theo số trận. Hàm thuần. Món thuê không đổi luật trận:
// effectiveTiers gộp cấp vĩnh viễn (đồ rơi) với cấp món thuê còn hạn, rồi withWeaponTiers cộng chỉ số như cũ.
import type {
  BattleConfig,
  Loadout,
  LootConfig,
  ShopConfig,
  WeaponRentals,
  WeaponTiers,
} from './battleTypes';

/** Chặn bảng cửa hàng sai ngay khi dùng. */
export function validateShopConfig(shop: ShopConfig, config: BattleConfig, loot: LootConfig): void {
  const problems: string[] = [];
  if (!Number.isInteger(shop.price) || shop.price < 0) problems.push('giá phải là số nguyên ≥ 0');
  if (!Number.isInteger(shop.battles) || shop.battles < 1) {
    problems.push('số trận dùng phải là số nguyên ≥ 1');
  }
  if (!Number.isInteger(shop.tier) || !loot.tiers[shop.tier]) {
    problems.push(`cấp ${shop.tier} không có trong bảng rơi`);
  }
  for (const weapon of shop.weapons) {
    if (!Number.isInteger(weapon) || !config.weapons[weapon]) {
      problems.push(`không có vũ khí số ${weapon}`);
    }
  }
  if (new Set(shop.weapons).size !== shop.weapons.length) problems.push('bán trùng vũ khí');
  if (problems.length > 0) {
    throw new RangeError(`Bảng cửa hàng sai: ${problems.join('; ')}`);
  }
}

/** Số trận còn dùng được của món thuê: số nguyên > 0, còn lại (thiếu, âm, lẻ — dữ liệu lạ) là hết hạn. */
function battlesLeft(rentals: WeaponRentals, weapon: number | string): number {
  const raw = rentals[weapon] ?? 0;
  return Number.isInteger(raw) && raw > 0 ? raw : 0;
}

/** Ví người chơi khi mua ở cửa hàng: vàng, các món có hạn và cấp của chúng (phần của hồ sơ). */
export interface ShopWallet {
  readonly gold: number;
  readonly rentals: WeaponRentals;
  /** F19: cấp của món có hạn (món rơi có hạn có cấp riêng); không ghi = cấp cửa hàng. */
  readonly rentalTiers: WeaponTiers;
}

/** F19: cấp của món có hạn còn hạn của vũ khí `weapon`; không có món có hạn còn hạn thì -1. */
export function rentalTierOf(
  rentals: WeaponRentals,
  rentalTiers: WeaponTiers,
  weapon: number | string,
  shop: ShopConfig,
): number {
  return battlesLeft(rentals, weapon) > 0 ? (rentalTiers[weapon] ?? shop.tier) : -1;
}

/**
 * Mua món `weapon`: trừ đúng giá, món dùng được thêm `battles` trận (cộng dồn nếu còn hạn). Thiếu vàng, cửa
 * hàng không bán, hoặc vũ khí đã có cấp vĩnh viễn từ cấp cửa hàng trở lên (mua là phí) thì từ chối. F19: đang có
 * món có hạn cấp cao hơn cấp cửa hàng thì từ chối; cấp thấp hơn thì món mua thay hẳn món đó.
 */
export function buyRental(
  wallet: ShopWallet,
  weapon: number,
  owned: WeaponTiers,
  shop: ShopConfig,
): ShopWallet {
  if (!shop.weapons.includes(weapon)) {
    throw new RangeError(`Cửa hàng không bán vũ khí số ${weapon}`);
  }
  if ((owned[weapon] ?? 0) >= shop.tier) {
    throw new RangeError('Đã có vũ khí này ở cấp bằng hoặc cao hơn');
  }
  const current = rentalTierOf(wallet.rentals, wallet.rentalTiers, weapon, shop);
  if (current > shop.tier) {
    throw new RangeError('Đang có món có hạn cấp cao hơn');
  }
  if (wallet.gold < shop.price) {
    throw new RangeError(`Thiếu vàng: cần ${shop.price}, có ${wallet.gold}`);
  }
  const kept = current === shop.tier ? battlesLeft(wallet.rentals, weapon) : 0;
  return {
    gold: wallet.gold - shop.price,
    rentals: { ...wallet.rentals, [weapon]: kept + shop.battles },
    rentalTiers: { ...wallet.rentalTiers, [weapon]: shop.tier },
  };
}

/**
 * Cấp dùng trong trận: cấp vĩnh viễn, nâng lên cấp món có hạn nếu còn hạn (không bao giờ hạ). F19: món có hạn
 * có cấp riêng; không ghi cấp thì là cấp cửa hàng.
 */
export function effectiveTiers(
  owned: WeaponTiers,
  rentals: WeaponRentals,
  rentalTiers: WeaponTiers,
  shop: ShopConfig,
): WeaponTiers {
  const tiers: Record<string, number> = { ...owned };
  for (const weapon of Object.keys(rentals)) {
    const tier = rentalTierOf(rentals, rentalTiers, weapon, shop);
    if (tier >= 0) tiers[weapon] = Math.max(owned[weapon] ?? 0, tier);
  }
  return tiers;
}

/**
 * Hết trận (thắng hay thua): món có hạn có mang vào trận bớt 1 trận; hết hạn (hoặc dữ liệu lạ) thì bỏ cả số trận
 * lẫn cấp của nó.
 */
export function rentalsAfterBattle(
  wallet: Pick<ShopWallet, 'rentals' | 'rentalTiers'>,
  loadout: Loadout,
): Pick<ShopWallet, 'rentals' | 'rentalTiers'> {
  const rentals: Record<string, number> = {};
  const rentalTiers: Record<string, number> = {};
  for (const weapon of Object.keys(wallet.rentals)) {
    const used = loadout.weapons.includes(Number(weapon)) ? 1 : 0;
    const left = battlesLeft(wallet.rentals, weapon) - used;
    if (left <= 0) continue;
    rentals[weapon] = left;
    const tier = wallet.rentalTiers[weapon];
    if (tier !== undefined) rentalTiers[weapon] = tier;
  }
  return { rentals, rentalTiers };
}
