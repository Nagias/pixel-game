// Đợt 5: cấp màu vũ khí và rơi đồ khi hạ quái hiếm. Hàm thuần. Cấp màu không đổi luật trận: withWeaponTiers
// trả cấu hình trận đã cộng chỉ số của cấp (như withUpgrades), trận chạy y như cũ trên cấu hình đó. F20 (chủ dự
// án duyệt 07/11/2026): cấp màu là cấp duy nhất của vũ khí, luôn vĩnh viễn; cấp nào cũng thấy khác bằng mắt.
import { nextFloat, seedRng, type RngState } from '../../../shared/random';
import type {
  BattleConfig,
  BattleState,
  Drop,
  LootConfig,
  LootPity,
  WeaponConfig,
  WeaponTier,
  WeaponTiers,
} from './battleTypes';

/** Dòng ngẫu nhiên riêng của rơi đồ (tách khỏi dòng của trận): thêm rơi đồ không làm đổi ván đấu. */
const LOOT_STREAM = 0x4c4f4f54;

/** Chặn bảng rơi sai ngay khi dùng, thay vì để rơi ra cấp không có hay vũ khí vô nghĩa. */
export function validateLootConfig(loot: LootConfig): void {
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
  if (
    loot.salvageGold.length !== tiers.length ||
    !loot.salvageGold.every((gold) => Number.isInteger(gold) && gold >= 0)
  ) {
    problems.push('vàng đổi món thừa phải có đúng một số nguyên ≥ 0 cho mỗi cấp');
  }
  for (const tier of tiers) {
    const label = `cấp "${tier.name}"`;
    // Vùng đánh phải rộng số lẻ lát: chỉ được rộng thêm số chẵn.
    if (!Number.isInteger(tier.widthBonus) || tier.widthBonus < 0 || tier.widthBonus % 2 !== 0) {
      problems.push(`${label}: rộng thêm phải là số chẵn ≥ 0`);
    }
    if (!Number.isInteger(tier.damageBonus) || tier.damageBonus < 0) {
      problems.push(`${label}: sát thương thêm phải là số nguyên ≥ 0`);
    }
    if (!Number.isInteger(tier.reachBonus) || tier.reachBonus < 0) {
      problems.push(`${label}: dài thêm phải là số nguyên ≥ 0`);
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

/**
 * F20: vũ khí ở một cấp — dài thêm `reachBonus` vòng (tầm gần ra phía ngoài, tầm vừa / xa vào phía nhân vật, không
 * vượt sân), rộng thêm `widthBonus` lát, sát thương thêm `damageBonus`.
 */
function atTier(
  weapon: WeaponConfig,
  tier: number,
  bonus: WeaponTier,
  ringCount: number,
): WeaponConfig {
  const near = weapon.slot === 'near';
  return {
    ...weapon,
    tier,
    minRing: near ? weapon.minRing : Math.max(0, weapon.minRing - bonus.reachBonus),
    maxRing: near ? Math.min(ringCount - 1, weapon.maxRing + bonus.reachBonus) : weapon.maxRing,
    widthSectors: weapon.widthSectors + bonus.widthBonus,
    damage: weapon.damage + bonus.damageBonus,
  };
}

/** Cấu hình trận với mỗi vũ khí ở cấp đang có: cộng dài, rộng, sát thương của cấp. */
export function withWeaponTiers(
  config: BattleConfig,
  tiers: WeaponTiers,
  loot: LootConfig,
): BattleConfig {
  validateLootConfig(loot);
  if (config.weapons.every((_, index) => tierOf(tiers, index, loot) === 0)) return config;
  return {
    ...config,
    weapons: config.weapons.map((weapon, index) => {
      const tier = tierOf(tiers, index, loot);
      const bonus = loot.tiers[tier];
      if (tier === 0 || !bonus) return weapon;
      return atTier(weapon, tier, bonus, config.ringCount);
    }),
  };
}

/**
 * F20: phần tăng của cấp `tier` so với cấp ngay dưới, bằng lời (vd. "dài +1 vòng", "rộng +2 lát") — cho thẻ vũ khí ở
 * màn Nâng cấp. Cấp thấp nhất (hoặc cấp không có) = chuỗi rỗng.
 */
export function tierGain(tier: number, loot: LootConfig): string {
  const now = loot.tiers[tier];
  const before = loot.tiers[tier - 1];
  if (!now || !before) return '';
  const parts: string[] = [];
  const reach = now.reachBonus - before.reachBonus;
  const width = now.widthBonus - before.widthBonus;
  const damage = now.damageBonus - before.damageBonus;
  if (reach > 0) parts.push(`dài +${reach} vòng`);
  if (width > 0) parts.push(`rộng +${width} lát`);
  if (damage > 0) parts.push(`sát thương +${damage}`);
  return parts.join(', ');
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
 * `weapon` của loài quái hiếm (chủ dự án duyệt 03/11/2026). F20: món luôn vĩnh viễn.
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
  const [tier, next] = pickTier(afterRoll, forcedHigh ? loot.highTier : 0, loot);
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
  validateLootConfig(loot);
  if (!state.rareKilled) return { drop: null, pity };
  // F19: món rơi là vũ khí của loài quái hiếm vừa hạ (cấu hình đã chặn loài hóa hiếm được mà không có món).
  const name = config.monsterKinds[state.rareKilled].drop;
  const weapon = config.weapons.findIndex((w) => w.name === name);
  if (weapon === -1) return { drop: null, pity };
  const [drop, next] = rollLoot(pity, seedRng(state.seed + LOOT_STREAM), weapon, loot);
  return { drop, pity: next };
}

// ---------- Nhận món rơi ----------

/** Kết quả nhận món: lên cấp, hay thừa nên đổi vàng. */
export type DropOutcome = 'upgraded' | 'salvaged';

/** Cấp đã ghi của vũ khí (kể cả 0 — món Thường rơi khi chưa mở khóa); chưa ghi hoặc dữ liệu lạ = undefined. */
export function permanentTierOf(tiers: WeaponTiers, weapon: number): number | undefined {
  const raw = tiers[weapon];
  return raw !== undefined && Number.isInteger(raw) && raw >= 0 ? raw : undefined;
}

/**
 * Nhận một món rơi (F19 PR B mục 6, F20): cao hơn cấp đang có thì vũ khí lên cấp đó; không thì là món thừa — giữ
 * cấp cũ, đổi vàng theo cấp món rơi. `unlocked`: vũ khí đã mở khóa theo màn — bản Thường coi như đã có; chưa mở
 * khóa thì món Thường vẫn nhận (có vũ khí đó luôn).
 */
export function applyDrop(
  tiers: WeaponTiers,
  drop: Drop,
  loot: LootConfig,
  unlocked: boolean,
): { tiers: WeaponTiers; outcome: DropOutcome; salvage: number } {
  const owned = permanentTierOf(tiers, drop.weapon) ?? (unlocked ? 0 : -1);
  if (drop.tier <= owned) {
    return { tiers, outcome: 'salvaged', salvage: loot.salvageGold[drop.tier] ?? 0 };
  }
  return { tiers: { ...tiers, [drop.weapon]: drop.tier }, outcome: 'upgraded', salvage: 0 };
}
