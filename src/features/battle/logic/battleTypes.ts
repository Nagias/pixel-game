import type { RngState } from '../../../shared/random';

// ---------- Cấu hình (con số cân bằng — giá trị thật nằm ở battleConfig.ts) ----------

/**
 * F05: quái bị chém mà còn sống bị đẩy thế nào. out = lùi ra xa 1 vòng, in = kéo vào gần 1 vòng,
 * clockwise = lệch sang phải 1 lát (theo chiều kim đồng hồ), none = không đẩy. F19: gather = dời 1 lát về
 * phía lát giữa của vùng đánh (Lưỡi hái gom quái).
 */
export type PushDirection = 'none' | 'out' | 'in' | 'clockwise' | 'gather';

export const PUSH_DIRECTIONS: readonly PushDirection[] = [
  'none',
  'out',
  'in',
  'clockwise',
  'gather',
];

/** B4: tầm của vũ khí — mỗi trận mang đúng một món mỗi tầm (theo thứ tự này trên thanh nút). */
export type WeaponSlot = 'near' | 'mid' | 'far';

export const WEAPON_SLOTS: readonly WeaponSlot[] = ['near', 'mid', 'far'];

export interface WeaponConfig {
  readonly name: string;
  /** B4: ô tầm của vũ khí trên màn chuẩn bị trận. */
  readonly slot: WeaponSlot;
  /** Chữ ngắn hiện trên nút vũ khí: "gần", "vừa", "xa". */
  readonly rangeLabel: string;
  readonly push: PushDirection;
  /** Độ rộng vùng xanh tính bằng số lát; phải là số lẻ để có lát chính giữa. */
  readonly widthSectors: number;
  /** Vòng trong cùng (0 = sát nhân vật) mà vũ khí với tới. */
  readonly minRing: number;
  /** Vòng ngoài cùng mà vũ khí với tới. */
  readonly maxRing: number;
  readonly damage: number;
  /** B2: chém cả sau lưng — thêm một nêm y hệt ở lát đối diện (vd. Rìu). Mặc định chỉ một nêm. */
  readonly twoSided?: boolean;
  /** B6: xác suất (0–1) một nhát chém trúng quái là chí mạng (sát thương × critMultiplier). Mặc định 0. */
  readonly critChance?: number;
  /** Đợt 5: cấp màu (chỉ số trong LootConfig.tiers) — đã cộng chỉ số của cấp. Không có = Thường (0). */
  readonly tier?: number;
  /** F19: quái trúng mà còn sống bị choáng ngần này lượt (đứng im, không đánh — như đóng băng). Mặc định 0. */
  readonly stunTurns?: number;
  /**
   * F19: món chỉ có sau khi thắng màn này (đếm từ 0) — hoặc khi đã có ở dạng rơi / thuê. Không có = có sẵn
   * từ đầu.
   */
  readonly unlockAfterLevel?: number;
}

/** B6: các skill đánh cả sân (AOE). Thêm skill = thêm tên ở đây + con số trong battleConfig.ts. */
export type SkillKind = 'iceRain' | 'fireball';

export interface SkillConfig {
  readonly name: string;
  /** Số máu mọi quái trên sân mất khi bấm skill. */
  readonly damage: number;
  /** Số lượt quái còn sống bị đóng băng: không đi, không đánh, không bắn. 0 = không đóng băng. */
  readonly freezeTurns: number;
  /** Số nhát chém để nạp đầy skill. */
  readonly chargeTurns: number;
}

/** F06: các loại quái. Thêm loại mới = thêm tên ở đây + con số trong battleConfig.ts + hình. */
export type MonsterKind =
  | 'slime'
  | 'slimeKing'
  | 'slimeCannon'
  | 'slimeMini'
  | 'slimeCharger'
  | 'slimeGhost'
  | 'goblin'
  | 'wolf'
  | 'goblinArcher'
  | 'bat'
  | 'treant'
  | 'mushroom'
  | 'goblinShaman'
  | 'spiderNest'
  | 'spiderling'
  | 'turtle';

export interface MonsterConfig {
  readonly name: string;
  readonly hp: number;
  /** Xác suất mỗi lượt quái tiến vào 1 vòng; còn lại nó đi ngang 1 lát (đi lung tung). */
  readonly advanceChance: number;
  /** F04: số máu nhân vật mất mỗi lần một con quái áp sát (vòng 0) đánh — hoặc mỗi phát bắn (B3). */
  readonly attack: number;
  /**
   * B3: quái bắn xa — tới vòng này (hoặc gần hơn) thì đứng yên, hiện "!" và bắn mỗi lượt; bị chém
   * trúng lúc đang có "!" mà còn sống thì choáng, lượt đó không bắn. Không có = quái cận chiến (vòng 0).
   */
  readonly shootRing?: number;
  /** F12: mỗi lần tiến vào thì lao ngần này vòng (dừng trước ô có quái, không quá vòng 0). Mặc định 1. */
  readonly step?: number;
  /** F12: quái ma — vô hình ở lượt chẵn của màn (lượt 2, 4, 6…): nhát chém và skill đi xuyên qua. */
  readonly ghost?: boolean;
  /** Đợt 3: số vàng người chơi nhận khi hạ một con loại này (chém hay skill). Không có = 0. */
  readonly gold?: number;
  /** Đợt 5: loại này có thể hóa quái hiếm (slime và trùm thì không). Không có = không. */
  readonly canBeRare?: boolean;
  /** F19: quái hiếm loài này rơi vũ khí tên này (bắt buộc với loài `canBeRare`). */
  readonly drop?: string;
  /**
   * F19 (trùm): vỏ cứng — chỉ mất máu khi là con thứ ≥ ngần này trong combo của nhát chém; skill (không combo)
   * không làm mất máu. Không có = 1 (mất máu như thường).
   */
  readonly minComboOrder?: number;
  /** F19 (trùm): gọi quái — xem SummonConfig. */
  readonly summon?: SummonConfig;
  /**
   * F19 (Nấm nổ): chết (chém, skill, nổ) thì nổ — quái ở 8 ô quanh nó mất ngần này máu (dây chuyền được); nổ ở
   * vòng 0 thì nhân vật mất ngần này máu. Quái có khiên đỡ được; quái vỏ cứng không mất máu.
   */
  readonly explode?: number;
  /** F19 (Pháp sư yêu tinh): hết mỗi lượt phủ khiên (đỡ trọn một đòn) cho quái ở 8 ô quanh nó. */
  readonly shieldAllies?: boolean;
  /** F19 (Tổ nhện): không tự đi (vẫn bị đẩy / kéo bởi vũ khí). */
  readonly stationary?: boolean;
  /** F19 (Rùa gai): mỗi lần vũ khí tầm gần chém trúng nó, nhân vật mất ngần này máu (sau khi kiểm thắng). */
  readonly thorns?: number;
}

/**
 * F19: cứ `every` lượt (sau lượt thứ every, 2·every…), con quái này — nếu còn sống và không bị đóng băng — gọi
 * tối đa `count` con loài `kind` ra các ô trống sát bên (thứ tự cố định, không tung số ngẫu nhiên).
 */
export interface SummonConfig {
  readonly kind: MonsterKind;
  readonly count: number;
  readonly every: number;
  /** F20: gọi cả khi 8 ô quanh nó không còn quái nào (giữ "mồi" cho trùm vỏ cứng — chủ dự án duyệt 07/11/2026). */
  readonly whenAlone?: boolean;
}

/**
 * Đợt 5: quái hiếm — từ màn `fromLevel` (đếm từ 0), mỗi trận xác suất `chance` có MỘT con (loại
 * `canBeRare`, không phải loại của nhiệm vụ) hóa hiếm: máu × hpMultiplier, vàng × goldMultiplier.
 */
export interface RareConfig {
  readonly fromLevel: number;
  readonly chance: number;
  readonly hpMultiplier: number;
  readonly goldMultiplier: number;
}

/**
 * Đợt 5: một cấp màu vũ khí — chỉ cộng chỉ số so với vũ khí gốc; `dropRate` là tỉ lệ cấp khi rơi đồ. F20: cấp nào
 * cũng thấy khác bằng mắt — `reachBonus` vòng dài thêm (tầm gần ra ngoài, tầm vừa / xa vào trong), `widthBonus`
 * lát rộng thêm (số chẵn: mỗi bên một nửa), `damageBonus` sát thương thêm.
 */
export interface WeaponTier {
  readonly name: string;
  readonly reachBonus: number;
  readonly widthBonus: number;
  readonly damageBonus: number;
  readonly dropRate: number;
}

/**
 * Đợt 5: rơi đồ khi hạ quái hiếm. `dropChance` — xác suất rơi; hụt `dryPity` lần liền thì lần kế chắc
 * rơi; `highPity` món liền dưới cấp `highTier` thì món thứ `highPity` chắc từ cấp đó trở lên.
 */
export interface LootConfig {
  readonly dropChance: number;
  readonly dryPity: number;
  readonly highTier: number;
  readonly highPity: number;
  readonly tiers: readonly WeaponTier[];
  /** F19: vàng đổi được từ món rơi thừa (không mạnh hơn đồ đang có), theo cấp của món — mỗi cấp một số. */
  readonly salvageGold: readonly number[];
}

/** Đợt 5: bộ đếm bảo hiểm rơi đồ (lưu trong hồ sơ). */
export interface LootPity {
  /** Số quái hiếm đã hạ liền mà không rơi gì. */
  readonly dryRareKills: number;
  /** Số món đã rơi liền mà dưới cấp `highTier`. */
  readonly dropsSinceHighTier: number;
}

/** Đợt 5: một món rơi — vũ khí (chỉ số trong config.weapons) ở cấp nào. F20: món rơi luôn vĩnh viễn. */
export interface Drop {
  readonly weapon: number;
  readonly tier: number;
}

/** Đợt 5: cấp cao nhất đã có của từng vũ khí (khóa = chỉ số vũ khí) — dữ liệu hồ sơ, có thể lạ. */
export type WeaponTiers = Readonly<Record<string, number>>;

export interface HeroConfig {
  /** F04: máu ban đầu (và tối đa) của nhân vật. */
  readonly hp: number;
  /** B6: một nhát chém trúng từ ngần này quái trở lên thì hồi máu. */
  readonly healMinHits: number;
  /** B6: số máu hồi mỗi lần (không quá máu tối đa). 0 = không hồi. */
  readonly healAmount: number;
}

/**
 * Đợt 0: độ khó đo bằng mô phỏng — tỉ lệ thắng (0–1) và số lượt dư trung bình của ván thắng, với
 * người chơi giỏi nhất của bộ mô phỏng (scripts/simCore.ts) và bộ đồ mặc định. Dùng cho cả mục tiêu
 * và dung sai. Game không đọc: chỉ `npm run sim`, `npm run tune` và balance.test.ts.
 */
export interface Difficulty {
  readonly winRate: number;
  readonly spareTurns: number;
}

/** Đợt 4: các chỉ số nâng cấp được bằng vàng. Thêm chỉ số = thêm tên ở đây + con số + hiệu lực ở upgrades.ts. */
export type UpgradeKind = 'hp' | 'crit' | 'heal' | 'luck';

export const UPGRADE_KINDS: readonly UpgradeKind[] = ['hp', 'crit', 'heal', 'luck'];

export interface UpgradeStat {
  readonly name: string;
  /**
   * Hiệu lực mỗi cấp: hp — máu tối đa; crit — xác suất chí mạng (0–1) cộng cho mọi vũ khí; heal — máu hồi;
   * luck (đợt 5) — xác suất có quái hiếm (0–1).
   */
  readonly perLevel: number;
  /** Giá vàng của từng cấp, theo thứ tự (cấp 1, cấp 2…); số phần tử = cấp tối đa. */
  readonly costs: readonly number[];
}

export type UpgradeConfig = Readonly<Record<UpgradeKind, UpgradeStat>>;

/** Đợt 4: cấp đã nâng theo tên chỉ số — dữ liệu hồ sơ, có thể có tên lạ hoặc cấp vượt giới hạn. */
export type UpgradeLevels = Readonly<Record<string, number>>;

/**
 * F20: lên cấp màu vũ khí bằng vàng — `costs[i]` là giá lên cấp i + 1 (số phần tử = cấp cao nhất mua được; cấp cao
 * hơn chỉ có từ quái hiếm).
 */
export interface TierUpConfig {
  readonly costs: readonly number[];
}

/**
 * Bot đo mục tiêu độ khó của màn (tên kiểu chơi trong scripts/simCore.ts). "Ngắm chuẩn" chém đúng chỗ tốt
 * nhất mọi nhát; "Người mới" (chủ dự án duyệt 28/10/2026) nửa chuẩn nửa chém bừa — gần người thật hơn.
 */
export type TargetPlayer = 'Ngắm chuẩn' | 'Người mới';

/** F11: nhiệm vụ chính của màn — giết đủ `count` con loại `kind` là thắng ngay. */
export interface QuestConfig {
  readonly kind: MonsterKind;
  readonly count: number;
}

/** F06: một màn chơi. */
export interface LevelConfig {
  /** Đợt 0: độ khó mục tiêu của màn (chủ dự án duyệt). */
  readonly target?: Difficulty;
  /** Bot đo `target` (game không đọc). Không có = bot mặc định của bộ mô phỏng ("Ngắm chuẩn"). */
  readonly targetPlayer?: TargetPlayer;
  /**
   * Đợt 4: mức nâng cấp người chơi lần đầu có được khi tới màn này (mua ngay khi đủ vàng) — mục tiêu độ khó
   * đo với mức này. Game không đọc: chỉ mô phỏng / bộ dò số / balance.test.
   */
  readonly assumedUpgrades?: UpgradeLevels;
  /** Số lượt tấn công tối đa của màn. */
  readonly turnLimit: number;
  /** Đội hình mở màn, theo thứ tự id (phần tử đầu là quái id 1). */
  readonly monsters: readonly MonsterKind[];
  /** Quái xuất hiện thành cụm trong khoảng ±spread lát quanh một lát ngẫu nhiên. */
  readonly spread: number;
  /**
   * B2: quái tới từ hai phía — nửa đầu đội hình thành một cụm, nửa sau thành cụm ở lát đối diện
   * (mỗi cụm ±spread lát). Mặc định một cụm. F11: áp cho cả các đợt sau.
   */
  readonly splitOpposite?: boolean;
  /** F11: nhiệm vụ của màn. Không có = diệt sạch mọi đợt quái. */
  readonly quest?: QuestConfig;
  /** F11: các đợt quái sau đợt mở màn, theo thứ tự ra; id nối tiếp đội hình mở màn. */
  readonly waves?: readonly (readonly MonsterKind[])[];
  /** F11: sân còn ≤ ngần này con thì đợt kế tràn vào vòng ngoài cùng. Mặc định 0 (sân sạch). */
  readonly nextWaveAt?: number;
}

export interface BattleConfig {
  /** Số lát của vòng tròn (Micro RPG dùng 24). */
  readonly sectorCount: number;
  /** Số vòng từ trong ra ngoài (Micro RPG dùng 6). */
  readonly ringCount: number;
  /** Thời gian vùng xanh quay hết một vòng (ms). */
  readonly arcPeriodMs: number;
  /** Các vũ khí trên thanh nút ở đáy màn hình, theo thứ tự từ trái sang phải. */
  readonly weapons: readonly WeaponConfig[];
  readonly monsterKinds: Readonly<Record<MonsterKind, MonsterConfig>>;
  readonly hero: HeroConfig;
  /** B6: hệ số sát thương của nhát chí mạng. */
  readonly critMultiplier: number;
  readonly skills: Readonly<Record<SkillKind, SkillConfig>>;
  /** B6: màn đầu tiên (đếm từ 0) được mang skill vào trận. */
  readonly skillUnlockLevel: number;
  /** Đợt 5: quái hiếm. Không có = không bao giờ có quái hiếm. */
  readonly rare?: RareConfig;
  /** F06: các màn theo thứ tự chơi; thắng màn cuối là phá đảo. */
  readonly levels: readonly LevelConfig[];
}

// ---------- Trạng thái trận đấu (dữ liệu thuần, JSON được) ----------

/** B4: đồ người chơi mang vào trận (chọn ở màn chuẩn bị). */
export interface Loadout {
  /** Chỉ số trong config.weapons, theo thứ tự trên thanh nút (tầm gần → xa). */
  readonly weapons: readonly number[];
  /** B6: skill mang vào trận (chỉ từ màn skillUnlockLevel). Không có = không mang skill. */
  readonly skill?: SkillKind;
}

/** Vị trí trên sân: lát (0 = hướng 12 giờ, tăng theo chiều kim đồng hồ) và vòng (0 = sát nhân vật). */
export interface Cell {
  readonly sector: number;
  readonly ring: number;
}

export interface Monster extends Cell {
  readonly id: number;
  /** F06: loại quái — sức đánh, cách đi lấy theo loại trong config.monsterKinds. */
  readonly kind: MonsterKind;
  readonly hp: number;
  /** B6: số lượt còn bị đóng băng (đứng im, không đánh). Không có = không bị băng. */
  readonly frozenTurns?: number;
  /** Đợt 5: quái hiếm (máu đã nhân, hạ được nhiều vàng, có thể rơi đồ). */
  readonly rare?: boolean;
  /** F19: có khiên của Pháp sư — đòn kế tiếp (chém, skill, nổ) không làm mất máu; đỡ xong thì mất khiên. */
  readonly shield?: boolean;
}

export interface Hit {
  readonly monsterId: number;
  readonly damage: number;
  readonly killed: boolean;
}

export interface AttackRecord {
  readonly aimSector: number;
  readonly hits: readonly Hit[];
  /** B6: nhát này chí mạng (mọi con trúng ăn × critMultiplier). */
  readonly crit: boolean;
  /** B6: số máu nhân vật hồi nhờ nhát này. */
  readonly healed: number;
  /** F19: quái trúng vụ nổ của Nấm nổ (sau nhát chém), theo thứ tự nổ. Không có = không có vụ nổ. */
  readonly blasts?: readonly Hit[];
  /** F19: máu nhân vật mất vì Rùa gai phản đòn vũ khí tầm gần (nhát thắng thì không bị trừ). */
  readonly thorns?: number;
  /** F19: máu nhân vật mất vì Nấm nổ nổ sát bên (nhát thắng thì không bị trừ). */
  readonly heroBlast?: number;
}

/** B6: lần bấm skill gần nhất — để view hiện số sát thương. */
export interface SkillRecord {
  readonly skill: SkillKind;
  readonly hits: readonly Hit[];
  /** F19: quái trúng vụ nổ của Nấm nổ bị skill hạ. */
  readonly blasts?: readonly Hit[];
}

export type BattlePhase = 'playing' | 'won' | 'lost';
export type LossReason = 'outOfTurns' | 'heroDefeated';

export interface BattleState {
  /** Seed ban đầu — đủ để tái hiện nguyên trận. */
  readonly seed: number;
  readonly rng: RngState;
  /** F06: màn đang chơi — chỉ số trong config.levels (0 = màn 1). */
  readonly level: number;
  readonly turnsLeft: number;
  /** F04: máu còn lại của nhân vật. */
  readonly heroHp: number;
  /** B4: đồ mang vào trận — chỉ được cầm vũ khí có trong đây. */
  readonly loadout: Loadout;
  /** Vũ khí đang cầm: chỉ số trong config.weapons. */
  readonly weaponIndex: number;
  readonly monsters: readonly Monster[];
  readonly phase: BattlePhase;
  readonly lossReason: LossReason | null;
  readonly lastAttack: AttackRecord | null;
  /** B6: số nhát chém đã nạp cho skill (tối đa chargeTurns của skill đang mang). */
  readonly skillCharge: number;
  /** B6: lần bấm skill ngay trước — xóa khi chém nhát tiếp theo. */
  readonly lastSkill: SkillRecord | null;
  /** F11: số quái đúng loại nhiệm vụ đã giết (0 nếu màn không có nhiệm vụ). */
  readonly questProgress: number;
  /** F11: đợt kế sẽ ra — chỉ số trong `waves` của màn (bằng số đợt đã ra sau đợt mở màn). */
  readonly nextWave: number;
  /** Đợt 3: vàng nhặt được trong trận này (thắng hay thua đều giữ — cộng vào hồ sơ ở tính năng profile). */
  readonly gold: number;
  /** Đợt 5: đã hạ quái hiếm của trận (tung rơi đồ lúc hết trận). F19: ghi loài của nó (món rơi theo loài). */
  readonly rareKilled?: MonsterKind;
  /**
   * F19: id cho con quái ra tiếp theo (đợt quái, quái được gọi). Không có = tính từ đội hình và các đợt đã ra
   * (trạng thái cũ, chưa có quái được gọi).
   */
  readonly nextId?: number;
}
