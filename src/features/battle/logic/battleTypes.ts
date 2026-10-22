import type { RngState } from '../../../shared/random';

// ---------- Cấu hình (con số cân bằng — giá trị thật nằm ở battleConfig.ts) ----------

export interface WeaponConfig {
  readonly name: string;
  /** Độ rộng vùng xanh tính bằng số lát; phải là số lẻ để có lát chính giữa. */
  readonly widthSectors: number;
  /** Vòng trong cùng (0 = sát nhân vật) mà vũ khí với tới. */
  readonly minRing: number;
  /** Vòng ngoài cùng mà vũ khí với tới. */
  readonly maxRing: number;
  readonly damage: number;
}

export interface MonsterConfig {
  readonly name: string;
  readonly hp: number;
  /** Xác suất mỗi lượt quái tiến vào 1 vòng; còn lại nó đi ngang 1 lát (đi lung tung). */
  readonly advanceChance: number;
}

export interface BattleConfig {
  /** Số lát của vòng tròn (Micro RPG dùng 24). */
  readonly sectorCount: number;
  /** Số vòng từ trong ra ngoài (Micro RPG dùng 6). */
  readonly ringCount: number;
  /** Số lượt tấn công tối đa mỗi trận. */
  readonly turnLimit: number;
  /** Thời gian vùng xanh quay hết một vòng (ms). */
  readonly arcPeriodMs: number;
  readonly weapon: WeaponConfig;
  readonly monster: MonsterConfig;
  readonly spawn: {
    readonly count: number;
    /** Quái xuất hiện thành cụm trong khoảng ±spread lát quanh một lát ngẫu nhiên. */
    readonly spread: number;
  };
}

// ---------- Trạng thái trận đấu (dữ liệu thuần, JSON được) ----------

/** Vị trí trên sân: lát (0 = hướng 12 giờ, tăng theo chiều kim đồng hồ) và vòng (0 = sát nhân vật). */
export interface Cell {
  readonly sector: number;
  readonly ring: number;
}

export interface Monster extends Cell {
  readonly id: number;
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
export type LossReason = 'outOfTurns' | 'reachedHero';

export interface BattleState {
  /** Seed ban đầu — đủ để tái hiện nguyên trận. */
  readonly seed: number;
  readonly rng: RngState;
  readonly turnsLeft: number;
  readonly monsters: readonly Monster[];
  readonly phase: BattlePhase;
  readonly lossReason: LossReason | null;
  readonly lastAttack: AttackRecord | null;
}
