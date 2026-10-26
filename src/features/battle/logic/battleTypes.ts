import type { RngState } from '../../../shared/random';

// ---------- Cấu hình (con số cân bằng — giá trị thật nằm ở battleConfig.ts) ----------

/**
 * F05: quái bị chém mà còn sống bị đẩy thế nào. out = lùi ra xa 1 vòng, in = kéo vào gần 1 vòng,
 * clockwise = lệch sang phải 1 lát (theo chiều kim đồng hồ), none = không đẩy.
 */
export type PushDirection = 'none' | 'out' | 'in' | 'clockwise';

export const PUSH_DIRECTIONS: readonly PushDirection[] = ['none', 'out', 'in', 'clockwise'];

export interface WeaponConfig {
  readonly name: string;
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
}

/** F06: các loại quái. Thêm loại mới = thêm tên ở đây + con số trong battleConfig.ts + hình. */
export type MonsterKind = 'slime' | 'slimeKing';

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
}

export interface HeroConfig {
  /** F04: máu ban đầu của nhân vật. */
  readonly hp: number;
}

/** F06: một màn chơi. */
export interface LevelConfig {
  /** Số lượt tấn công tối đa của màn. */
  readonly turnLimit: number;
  /** Đội hình mở màn, theo thứ tự id (phần tử đầu là quái id 1). */
  readonly monsters: readonly MonsterKind[];
  /** Quái xuất hiện thành cụm trong khoảng ±spread lát quanh một lát ngẫu nhiên. */
  readonly spread: number;
  /**
   * B2: quái tới từ hai phía — nửa đầu đội hình thành một cụm, nửa sau thành cụm ở lát đối diện
   * (mỗi cụm ±spread lát). Mặc định một cụm.
   */
  readonly splitOpposite?: boolean;
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
  /** F06: các màn theo thứ tự chơi; thắng màn cuối là phá đảo. */
  readonly levels: readonly LevelConfig[];
}

// ---------- Trạng thái trận đấu (dữ liệu thuần, JSON được) ----------

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
}

export interface Hit {
  readonly monsterId: number;
  readonly damage: number;
  readonly killed: boolean;
}

export interface AttackRecord {
  readonly aimSector: number;
  readonly hits: readonly Hit[];
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
  /** Vũ khí đang cầm: chỉ số trong config.weapons. */
  readonly weaponIndex: number;
  readonly monsters: readonly Monster[];
  readonly phase: BattlePhase;
  readonly lossReason: LossReason | null;
  readonly lastAttack: AttackRecord | null;
}
