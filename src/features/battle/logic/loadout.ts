// B4: đồ mang vào trận — bộ mặc định, đổi món theo tầm, lựa chọn trên màn chuẩn bị, mô tả món.
// Hàm thuần. "Sở hữu" là danh sách chỉ số vũ khí; chưa có túi đồ thì sở hữu = mọi vũ khí (allWeapons).
import type { SavedLoadout } from '../../profile';
import {
  WEAPON_SLOTS,
  type BattleConfig,
  type Loadout,
  type LootConfig,
  type PushDirection,
  type SkillConfig,
  type SkillKind,
  type WeaponConfig,
  type WeaponSlot,
  type WeaponTiers,
} from './battleTypes';

/** Mọi vũ khí trong cấu hình (mô phỏng so mọi bộ đồ; game dùng ownedWeapons). */
export function allWeapons(config: BattleConfig): number[] {
  return config.weapons.map((_, index) => index);
}

/** F19: tiến độ người chơi để biết đang có vũ khí nào (lấy từ hồ sơ). */
export interface WeaponProgress {
  /** Số màn đã thắng tính từ màn 1 (màn đếm từ 0 nhỏ hơn số này là đã qua). */
  readonly clearedLevels: number;
  /** Cấp đã có của từng vũ khí (khóa = chỉ số vũ khí) — đồ rơi hoặc lên cấp bằng vàng. */
  readonly tiers: WeaponTiers;
}

/**
 * F19: các vũ khí người chơi đang có, theo thứ tự cấu hình: món không có mốc mở khóa, món đã thắng màn mốc,
 * và món đã có cấp (đồ rơi — kể cả món Thường của vũ khí chưa mở khóa).
 */
export function ownedWeapons(config: BattleConfig, progress: WeaponProgress): number[] {
  return config.weapons.flatMap((weapon, index) => {
    const unlocked = isUnlocked(weapon, progress.clearedLevels);
    // F19 PR B: món rơi vĩnh viễn ghi cả cấp 0 (món Thường của vũ khí chưa mở khóa).
    const tier = progress.tiers[index];
    const permanent = tier !== undefined && Number.isInteger(tier) && tier >= 0;
    return unlocked || permanent ? [index] : [];
  });
}

/** F19: vũ khí đã mở khóa theo màn (không có mốc, hoặc đã thắng màn mốc) — chưa tính đồ rơi / thuê. */
export function isUnlocked(weapon: WeaponConfig, clearedLevels: number): boolean {
  return weapon.unlockAfterLevel === undefined || clearedLevels > weapon.unlockAfterLevel;
}

/** Các món đang sở hữu theo từng tầm, thứ tự gần → vừa → xa; tầm không có món nào thì bỏ. */
export function slotOptions(
  config: BattleConfig,
  owned: readonly number[],
): { slot: WeaponSlot; weapons: number[] }[] {
  return WEAPON_SLOTS.map((slot) => ({
    slot,
    weapons: [...owned]
      .sort((a, b) => a - b)
      .filter((index) => config.weapons[index]?.slot === slot),
  })).filter((option) => option.weapons.length > 0);
}

/** Bộ mặc định: món đầu tiên (theo thứ tự cấu hình) của mỗi tầm có món. */
export function defaultLoadout(
  config: BattleConfig,
  owned: readonly number[] = allWeapons(config),
): Loadout {
  return {
    weapons: slotOptions(config, owned).flatMap((option) => option.weapons.slice(0, 1)),
  };
}

/** Mọi bộ đồ chọn được — mỗi tầm một món, đủ mọi cách ghép (để mô phỏng so các bộ với nhau). */
export function allLoadouts(config: BattleConfig, owned: readonly number[]): Loadout[] {
  const options = slotOptions(config, owned);
  if (options.length === 0) return [];
  return options.reduce<Loadout[]>(
    (loadouts, option) =>
      loadouts.flatMap((loadout) =>
        option.weapons.map((index) => ({ weapons: [...loadout.weapons, index] })),
      ),
    [{ weapons: [] }],
  );
}

function weaponAt(index: number, config: BattleConfig): WeaponConfig {
  const weapon = Number.isInteger(index) ? config.weapons[index] : undefined;
  if (!weapon) {
    throw new RangeError(`Không có vũ khí số ${index} (có ${config.weapons.length} vũ khí)`);
  }
  return weapon;
}

/**
 * Chọn món `weaponIndex`: thay món cùng tầm (hoặc thêm vào nếu tầm đó đang trống), giữ thứ tự tầm. Skill đang
 * mang giữ nguyên (F19: trước đó bị bỏ, đổi vũ khí là skill về mặc định).
 */
export function chooseWeapon(loadout: Loadout, weaponIndex: number, config: BattleConfig): Loadout {
  const slot = weaponAt(weaponIndex, config).slot;
  const others = loadout.weapons.filter((index) => weaponAt(index, config).slot !== slot);
  const order = (index: number) => WEAPON_SLOTS.indexOf(weaponAt(index, config).slot);
  return { ...loadout, weapons: [...others, weaponIndex].sort((a, b) => order(a) - order(b)) };
}

/**
 * Chặn bộ đồ sai ngay lúc mở trận: rỗng, vũ khí không có, mang trùng, hai món cùng tầm, sai thứ tự tầm
 * (thanh nút luôn gần → xa, trận cầm món đầu).
 */
export function validateLoadout(loadout: Loadout, config: BattleConfig): void {
  const problems: string[] = [];
  if (loadout.weapons.length === 0) problems.push('phải mang ít nhất 1 vũ khí');
  const slots = new Set<WeaponSlot>();
  const seen = new Set<number>();
  let lastOrder = -1;
  for (const index of loadout.weapons) {
    const weapon = Number.isInteger(index) ? config.weapons[index] : undefined;
    if (!weapon) {
      problems.push(`không có vũ khí số ${index}`);
      continue;
    }
    const order = WEAPON_SLOTS.indexOf(weapon.slot);
    if (seen.has(index)) problems.push(`mang trùng "${weapon.name}"`);
    else if (slots.has(weapon.slot)) problems.push(`hai món cùng tầm "${weapon.slot}"`);
    else if (order < lastOrder) problems.push(`"${weapon.name}" sai thứ tự tầm (gần → xa)`);
    lastOrder = Math.max(lastOrder, order);
    seen.add(index);
    slots.add(weapon.slot);
  }
  if (loadout.skill !== undefined && !Object.hasOwn(config.skills, loadout.skill)) {
    problems.push(`skill "${String(loadout.skill)}" không tồn tại`);
  }
  if (problems.length > 0) {
    throw new RangeError(`Đồ mang vào trận sai: ${problems.join('; ')}`);
  }
}

const PUSH_LABEL: Record<PushDirection, string> = {
  none: 'không đẩy',
  out: 'đẩy lùi',
  in: 'kéo vào',
  clockwise: 'đẩy lệch phải',
  gather: 'kéo vào giữa',
};

/**
 * Một dòng mô tả món trên màn chuẩn bị, sinh từ con số cấu hình (thêm vũ khí không phải viết tay). Đợt 5:
 * món có cấp màu thì ghi tên cấp (lấy trong bảng rơi `loot`).
 */
export function describeWeapon(weapon: WeaponConfig, loot?: LootConfig): string {
  const parts = [
    `vòng ${weapon.minRing}–${weapon.maxRing}`,
    `rộng ${weapon.widthSectors} lát`,
    ...(weapon.twoSided ? ['2 phía'] : []),
    PUSH_LABEL[weapon.push],
    ...((weapon.stunTurns ?? 0) > 0 ? [`choáng ${weapon.stunTurns} lượt`] : []),
    ...((weapon.critChance ?? 0) > 0
      ? [`chí mạng ${Math.round((weapon.critChance ?? 0) * 100)}%`]
      : []),
    ...(weapon.damage > 1 ? [`sát thương ${weapon.damage}`] : []),
  ];
  // F20: có bảng cấp thì luôn ghi tên cấp, kể cả cấp Thường.
  const tier = loot?.tiers[weapon.tier ?? 0]?.name;
  return `${weapon.name}${tier ? ` ${tier}` : ''}: ${parts.join(', ')}`;
}

// ---------- B6: skill ----------

/** Các skill chọn được, theo thứ tự cấu hình (skill đầu là mặc định). */
export function skillOptions(config: BattleConfig): SkillKind[] {
  return Object.keys(config.skills) as SkillKind[];
}

/** Màn `level` (đếm từ 0) đã được mang skill vào trận chưa. */
export function isSkillUnlocked(level: number, config: BattleConfig): boolean {
  return level >= config.skillUnlockLevel;
}

/** Chọn skill mang vào trận (thay skill đang mang), giữ nguyên vũ khí. */
export function chooseSkill(loadout: Loadout, skill: SkillKind): Loadout {
  return { ...loadout, skill };
}

/**
 * Bộ đồ hợp với màn `level`: màn chưa mở skill thì bỏ skill; màn đã mở mà chưa chọn skill thì mang skill
 * đầu tiên (mặc định).
 */
export function loadoutForLevel(loadout: Loadout, level: number, config: BattleConfig): Loadout {
  if (!isSkillUnlocked(level, config)) return { weapons: loadout.weapons };
  if (loadout.skill !== undefined) return loadout;
  const [first] = skillOptions(config);
  return first === undefined ? loadout : { ...loadout, skill: first };
}

// ---------- F18 đợt B: đồ đang mang lưu vào hồ sơ ----------

/** Bộ đồ → dạng lưu trong hồ sơ (tên vũ khí gần → xa, tên skill hoặc null). */
export function toSavedLoadout(loadout: Loadout, config: BattleConfig): SavedLoadout {
  return {
    weapons: loadout.weapons.map((index) => weaponAt(index, config).name),
    skill: loadout.skill ?? null,
  };
}

/**
 * Dạng lưu → bộ đồ. Không dùng được (chưa lưu, món đã bỏ khỏi cấu hình, thiếu tầm, sai luật, skill lạ) thì
 * null — người gọi dùng bộ mặc định, không bao giờ để hồ sơ cũ làm hỏng trận. F19: có món không còn trong
 * `owned` (vd. món rơi có hạn đã hết hạn mà chưa tới mốc mở khóa) cũng là null.
 */
export function fromSavedLoadout(
  saved: SavedLoadout | null,
  config: BattleConfig,
  owned: readonly number[] = allWeapons(config),
): Loadout | null {
  if (saved === null) return null;
  const weapons = saved.weapons.map((name) => config.weapons.findIndex((w) => w.name === name));
  if (weapons.includes(-1) || weapons.length !== defaultLoadout(config).weapons.length) return null;
  if (!weapons.every((index) => owned.includes(index))) return null;
  if (saved.skill !== null && !Object.hasOwn(config.skills, saved.skill)) return null;
  const loadout: Loadout =
    saved.skill === null ? { weapons } : { weapons, skill: saved.skill as SkillKind };
  try {
    validateLoadout(loadout, config);
  } catch {
    return null;
  }
  return loadout;
}

/** Một dòng mô tả skill trên màn chuẩn bị, sinh từ con số cấu hình. */
export function describeSkill(skill: SkillConfig): string {
  const freeze = skill.freezeTurns > 0 ? `, đứng im ${skill.freezeTurns} lượt` : '';
  return `${skill.name}: mọi quái mất ${skill.damage} máu${freeze}; nạp ${skill.chargeTurns} nhát`;
}
