// Đợt 5: cấp màu vũ khí và rơi đồ khi hạ quái hiếm. Hàm thuần. Cấp màu không đổi luật trận: withWeaponTiers
// trả cấu hình trận đã cộng chỉ số của cấp (như withUpgrades), trận chạy y như cũ trên cấu hình đó.
import { nextFloat, seedRng, type RngState } from '../../../shared/random';
import type {
  BattleConfig,
  BattleState,
  Drop,
  LootConfig,
  LootPity,
  WeaponRentals,
  WeaponTiers,
} from './battleTypes';

/** Dòng ngẫu nhiên riêng của rơi đồ (tách khỏi dòng của trận): thêm rơi đồ không làm đổi ván đấu. */
const LOOT_STREAM = 0x4c4f4f54;

/** Chặn bảng rơi sai ngay khi dùng, thay vì để rơi ra cấp không có hay vũ khí vô nghĩa. */
export function validateLootConfig(loot: LootConfig, config: BattleConfig): void {
  const problems: string[] = [];
  const { tiers } = loot;
  if (tiers.length === 0) problems.push('phải có ít nhất 1 cấp');
  const total = tiers.reduce((sum, tier) => sum + tier.dropRate, 0);
  if (tiers.some((tier) => !(tier.dropRate >= 0)) || Math.abs(total - 1) > 1e-9) {
    problems.push(`tỉ lệ các cấp phải ≥ 0 và cộng lại 100% (đang ${Math.round(total * 100)}%)`);
  }
  if (!(loot.dropChance >= 0 && loot.dropChance <= 1)) problems.push('tỉ lệ rơi phải trong [0, 1]');
  if (!Number.isInteger(loot.dryPity) || loot.dryPity < 1) {
    problems.push('bảo hiểm rơi phải là số nguyên ≥ 1');
  }
  if (!Number.isInteger(loot.highTier) || !tiers[loot.highTier]) {
    problems.push(`cấp bảo hiểm cao ${loot.highTier} không có`);
  }
  if (!Number.isInteger(loot.highPity) || loot.highPity < 1) {
    problems.push('bảo hiểm cấp cao phải là số nguyên ≥ 1');
  }
  if (!(loot.permanentChance >= 0 && loot.permanentChance <= 1)) {
    problems.push('tỉ lệ món vĩnh viễn phải trong [0, 1]');
  }
  if (!Number.isInteger(loot.rentalBattles) || loot.rentalBattles < 1) {
    problems.push('số trận của món có hạn phải là số nguyên ≥ 1');
  }
  if (
    loot.salvageGold.length !== tiers.length ||
    !loot.salvageGold.every((gold) => Number.isInteger(gold) && gold >= 0)
  ) {
    problems.push('vàng đổi món thừa phải có đúng một số nguyên ≥ 0 cho mỗi cấp');
  }
  const strongest = Math.max(0, ...config.weapons.map((w) => w.critChance ?? 0));
  for (const tier of tiers) {
    const label = `cấp "${tier.name}"`;
    // Vùng đánh phải rộng số lẻ lát: chỉ được rộng thêm số chẵn.
    if (!Number.isInteger(tier.widthBonus) || tier.widthBonus < 0 || tier.widthBonus % 2 !== 0) {
      problems.push(`${label}: rộng thêm phải là số chẵn ≥ 0`);
    }
    if (!Number.isInteger(tier.damageBonus) || tier.damageBonus < 0) {
      problems.push(`${label}: sát thương thêm phải là số nguyên ≥ 0`);
    }
    if (!(tier.critBonus >= 0 && strongest + tier.critBonus <= 1)) {
      problems.push(`${label}: chí mạng cộng thêm làm vũ khí vượt [0, 1]`);
    }
  }
  if (problems.length > 0) {
    throw new RangeError(`Bảng rơi đồ sai: ${problems.join('; ')}`);
  }
}

/** Cấp hiện có của vũ khí `weapon`: số nguyên ≥ 0, không vượt cấp cao nhất (dữ liệu hồ sơ có thể lạ). */
function tierOf(tiers: WeaponTiers, weapon: number, loot: LootConfig): number {
  const raw = tiers[weapon] ?? 0;
  const tier = Number.isInteger(raw) && raw > 0 ? raw : 0;
  return Math.min(tier, loot.tiers.length - 1);
}

/** Cấu hình trận với mỗi vũ khí ở cấp cao nhất đã có: cộng chí mạng, độ rộng, sát thương của cấp. */
export function withWeaponTiers(
  config: BattleConfig,
  tiers: WeaponTiers,
  loot: LootConfig,
): BattleConfig {
  validateLootConfig(loot, config);
  if (config.weapons.every((_, index) => tierOf(tiers, index, loot) === 0)) return config;
  return {
    ...config,
    weapons: config.weapons.map((weapon, index) => {
      const tier = tierOf(tiers, index, loot);
      const bonus = loot.tiers[tier];
      if (tier === 0 || !bonus) return weapon;
      return {
        ...weapon,
        tier,
        critChance: (weapon.critChance ?? 0) + bonus.critBonus,
        widthSectors: weapon.widthSectors + bonus.widthBonus,
        damage: weapon.damage + bonus.damageBonus,
      };
    }),
  };
}

/** Bộ đếm bảo hiểm từ dữ liệu hồ sơ (tên lạ bỏ qua, thiếu hoặc sai thì 0). */
export function readPity(record: Readonly<Record<string, number>>): LootPity {
  const count = (value: number | undefined) =>
    value !== undefined && Number.isInteger(value) && value > 0 ? value : 0;
  return {
    dryRareKills: count(record.dryRareKills),
    dropsSinceHighTier: count(record.dropsSinceHighTier),
  };
}

/** Chọn cấp theo tỉ lệ trong các cấp từ `lowest` trở lên; nhóm đó không có tỉ lệ nào thì lấy `lowest`. */
function pickTier(rng: RngState, lowest: number, loot: LootConfig): [number, RngState] {
  const candidates = loot.tiers.slice(lowest);
  const total = candidates.reduce((sum, tier) => sum + tier.dropRate, 0);
  const [roll, next] = nextFloat(rng);
  let left = roll * total;
  let lastWithRate = 0;
  for (let i = 0; i < candidates.length; i++) {
    const rate = candidates[i]?.dropRate ?? 0;
    if (rate > 0) lastWithRate = i;
    left -= rate;
    if (left < 0) return [lowest + i, next];
  }
  // Sai số làm tròn (hoặc nhóm không có tỉ lệ nào): lấy cấp cuối có tỉ lệ, không có thì `lowest`.
  return [lowest + lastWithRate, next];
}

/**
 * Hạ một quái hiếm: tung xem có rơi không (hụt `dryPity` lần liền thì chắc rơi), rơi thì tung cấp (món
 * thứ `highPity` liền dưới `highTier` thì chỉ tung trong các cấp từ `highTier`). F19: món là vũ khí
 * `weapon` của loài quái hiếm (chủ dự án duyệt 03/11/2026); tung thêm vĩnh viễn hay có hạn — món bảo hiểm
 * cấp cao luôn vĩnh viễn.
 */
export function rollLoot(
  pity: LootPity,
  rng: RngState,
  weapon: number,
  loot: LootConfig,
): [drop: Drop | null, pity: LootPity, rng: RngState] {
  const [roll, afterRoll] = nextFloat(rng);
  const sure = pity.dryRareKills >= loot.dryPity;
  if (!sure && !(roll < loot.dropChance)) {
    return [null, { ...pity, dryRareKills: pity.dryRareKills + 1 }, afterRoll];
  }
  const forcedHigh = pity.dropsSinceHighTier >= loot.highPity - 1;
  const [tier, afterTier] = pickTier(afterRoll, forcedHigh ? loot.highTier : 0, loot);
  const [form, next] = nextFloat(afterTier);
  const permanent = forcedHigh || form < loot.permanentChance;
  const high = tier >= loot.highTier;
  return [
    permanent ? { weapon, tier } : { weapon, tier, battles: loot.rentalBattles },
    { dryRareKills: 0, dropsSinceHighTier: high ? 0 : pity.dropsSinceHighTier + 1 },
    next,
  ];
}

/**
 * Hết trận: đã hạ quái hiếm thì tung rơi đồ (dòng ngẫu nhiên riêng tính từ seed của trận — cùng trận thì
 * cùng kết quả); không hạ thì không rơi gì, bảo hiểm giữ nguyên.
 */
export function lootAfterBattle(
  state: Pick<BattleState, 'seed' | 'rareKilled'>,
  pity: LootPity,
  config: BattleConfig,
  loot: LootConfig,
): { drop: Drop | null; pity: LootPity } {
  validateLootConfig(loot, config);
  if (!state.rareKilled) return { drop: null, pity };
  // F19: món rơi là vũ khí của loài quái hiếm vừa hạ (cấu hình đã chặn loài hóa hiếm được mà không có món).
  const name = config.monsterKinds[state.rareKilled].drop;
  const weapon = config.weapons.findIndex((w) => w.name === name);
  if (weapon === -1) return { drop: null, pity };
  const [drop, next] = rollLoot(pity, seedRng(state.seed + LOOT_STREAM), weapon, loot);
  return { drop, pity: next };
}

// ---------- F19: túi đồ — món vĩnh viễn và món có hạn ----------

/** Túi đồ của người chơi (phần của hồ sơ): cấp vĩnh viễn, số trận còn của món có hạn và cấp của món đó. */
export interface Inventory {
  readonly tiers: WeaponTiers;
  readonly rentals: WeaponRentals;
  /** Cấp của món có hạn; không ghi (món thuê ở cửa hàng từ hồ sơ cũ) = cấp cửa hàng. */
  readonly rentalTiers: WeaponTiers;
}

/** Kết quả nhận món: thành vĩnh viễn, thành món có hạn mới, cộng dồn trận, hay thừa nên đổi vàng. */
export type DropOutcome = 'permanent' | 'rental' | 'extended' | 'salvaged';

const count = (value: number | undefined) =>
  value !== undefined && Number.isInteger(value) && value > 0 ? value : 0;

/** Cấp vĩnh viễn đã ghi của vũ khí (kể cả 0 — món Thường rơi khi chưa mở khóa); chưa ghi hoặc dữ liệu lạ = undefined. */
export function permanentTierOf(tiers: WeaponTiers, weapon: number): number | undefined {
  const raw = tiers[weapon];
  return raw !== undefined && Number.isInteger(raw) && raw >= 0 ? raw : undefined;
}

/**
 * Nhận một món rơi vào túi đồ (chủ dự án duyệt 03/11/2026, mục 2 và 6). Món vĩnh viễn cao hơn cấp vĩnh viễn
 * đang có thì lên cấp. Món có hạn cao hơn cấp vĩnh viễn: chưa có món có hạn (hoặc món đang có thấp hơn) thì
 * thay; cùng cấp thì cộng dồn trận. Còn lại là món thừa — giữ túi đồ, đổi vàng theo cấp món rơi. `unlocked`:
 * vũ khí đã mở khóa theo màn — bản Thường coi như đã có vĩnh viễn; chưa mở khóa thì món Thường vẫn nhận.
 */
export function applyDrop(
  inventory: Inventory,
  drop: Drop,
  loot: LootConfig,
  shopTier: number,
  unlocked: boolean,
): { inventory: Inventory; outcome: DropOutcome; salvage: number } {
  const recorded = permanentTierOf(inventory.tiers, drop.weapon);
  const owned = recorded ?? (unlocked ? 0 : -1);
  const salvaged = {
    inventory,
    outcome: 'salvaged' as const,
    salvage: loot.salvageGold[drop.tier] ?? 0,
  };
  if (drop.tier <= owned) return salvaged;
  if (drop.battles === undefined) {
    return {
      inventory: { ...inventory, tiers: { ...inventory.tiers, [drop.weapon]: drop.tier } },
      outcome: 'permanent',
      salvage: 0,
    };
  }
  const left = count(inventory.rentals[drop.weapon]);
  const current = left > 0 ? (inventory.rentalTiers[drop.weapon] ?? shopTier) : -1;
  if (drop.tier < current) return salvaged;
  const extended = drop.tier === current;
  return {
    inventory: {
      ...inventory,
      rentals: { ...inventory.rentals, [drop.weapon]: (extended ? left : 0) + drop.battles },
      rentalTiers: { ...inventory.rentalTiers, [drop.weapon]: drop.tier },
    },
    outcome: extended ? 'extended' : 'rental',
    salvage: 0,
  };
}
