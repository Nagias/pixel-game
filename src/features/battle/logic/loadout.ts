// B4: đồ mang vào trận — bộ mặc định, đổi món theo tầm, lựa chọn trên màn chuẩn bị, mô tả món.
// Hàm thuần. "Sở hữu" là danh sách chỉ số vũ khí; chưa có túi đồ thì sở hữu = mọi vũ khí (allWeapons).
import {
  WEAPON_SLOTS,
  type BattleConfig,
  type Loadout,
  type PushDirection,
  type SkillConfig,
  type SkillKind,
  type WeaponConfig,
  type WeaponSlot,
} from './battleTypes';

/** Mọi vũ khí trong cấu hình — "sở hữu" khi chưa có túi đồ. */
export function allWeapons(config: BattleConfig): number[] {
  return config.weapons.map((_, index) => index);
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

/** Chọn món `weaponIndex`: thay món cùng tầm (hoặc thêm vào nếu tầm đó đang trống), giữ thứ tự tầm. */
export function chooseWeapon(loadout: Loadout, weaponIndex: number, config: BattleConfig): Loadout {
  const slot = weaponAt(weaponIndex, config).slot;
  const others = loadout.weapons.filter((index) => weaponAt(index, config).slot !== slot);
  const order = (index: number) => WEAPON_SLOTS.indexOf(weaponAt(index, config).slot);
  return { weapons: [...others, weaponIndex].sort((a, b) => order(a) - order(b)) };
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
};

/** Một dòng mô tả món trên màn chuẩn bị, sinh từ con số cấu hình (thêm vũ khí không phải viết tay). */
export function describeWeapon(weapon: WeaponConfig): string {
  const parts = [
    `vòng ${weapon.minRing}–${weapon.maxRing}`,
    `rộng ${weapon.widthSectors} lát`,
    ...(weapon.twoSided ? ['2 phía'] : []),
    PUSH_LABEL[weapon.push],
    ...((weapon.critChance ?? 0) > 0
      ? [`chí mạng ${Math.round((weapon.critChance ?? 0) * 100)}%`]
      : []),
  ];
  return `${weapon.name}: ${parts.join(', ')}`;
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

/** Một dòng mô tả skill trên màn chuẩn bị, sinh từ con số cấu hình. */
export function describeSkill(skill: SkillConfig): string {
  const freeze = skill.freezeTurns > 0 ? `, đứng im ${skill.freezeTurns} lượt` : '';
  return `${skill.name}: mọi quái mất ${skill.damage} máu${freeze}; nạp ${skill.chargeTurns} nhát`;
}
