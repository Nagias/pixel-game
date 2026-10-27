// Đợt 5: cấp màu vũ khí và rơi đồ khi hạ quái hiếm. Hàm thuần. Cấp màu không đổi luật trận: withWeaponTiers
// trả cấu hình trận đã cộng chỉ số của cấp (như withUpgrades), trận chạy y như cũ trên cấu hình đó.
import { nextFloat, nextInt, seedRng, type RngState } from '../../../shared/random';
import type {
  BattleConfig,
  BattleState,
  Drop,
  LootConfig,
  LootPity,
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

/** Nhận một món: vũ khí lên cấp của món nếu cao hơn cấp đang có — đồ vĩnh viễn, không bao giờ tụt. */
export function addDrop(tiers: WeaponTiers, drop: Drop): WeaponTiers {
  const current = tiers[drop.weapon] ?? 0;
  return drop.tier > current ? { ...tiers, [drop.weapon]: drop.tier } : tiers;
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
 * thứ `highPity` liền dưới `highTier` thì chỉ tung trong các cấp từ `highTier`) và loại vũ khí (đều nhau
 * trong `weaponCount` vũ khí — bảng rơi theo loài chủ dự án chốt sau).
 */
export function rollLoot(
  pity: LootPity,
  rng: RngState,
  weaponCount: number,
  loot: LootConfig,
): [drop: Drop | null, pity: LootPity, rng: RngState] {
  const [roll, afterRoll] = nextFloat(rng);
  const sure = pity.dryRareKills >= loot.dryPity;
  if (!sure && !(roll < loot.dropChance)) {
    return [null, { ...pity, dryRareKills: pity.dryRareKills + 1 }, afterRoll];
  }
  const forcedHigh = pity.dropsSinceHighTier >= loot.highPity - 1;
  const [tier, afterTier] = pickTier(afterRoll, forcedHigh ? loot.highTier : 0, loot);
  const [weapon, next] = nextInt(afterTier, weaponCount);
  const high = tier >= loot.highTier;
  return [
    { weapon, tier },
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
  const [drop, next] = rollLoot(
    pity,
    seedRng(state.seed + LOOT_STREAM),
    config.weapons.length,
    loot,
  );
  return { drop, pity: next };
}
