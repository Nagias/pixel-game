/** Hồ sơ người chơi lưu lâu dài (đợt 3): vàng và màn đã mở khóa. JSON được. */
export interface Profile {
  /** Phiên bản cấu trúc dữ liệu — đổi cấu trúc thì tăng và viết bước chuyển, để không mất đồ người chơi. */
  readonly version: number;
  readonly gold: number;
  /** Màn cao nhất được chơi (đếm từ 0; 0 = mới mở màn 1). */
  readonly unlockedLevel: number;
  /** Đợt 4 (phiên bản 2): cấp đã nâng theo tên chỉ số (luật nâng cấp nằm ở tính năng battle). */
  readonly upgrades: Readonly<Record<string, number>>;
  /** Đợt 5 (phiên bản 3): cấp cao nhất đã có của từng vũ khí (luật rơi đồ nằm ở tính năng battle). */
  readonly weaponTiers: Readonly<Record<string, number>>;
  /** Đợt 5 (phiên bản 3): bộ đếm bảo hiểm rơi đồ theo tên (tính năng battle đọc). */
  readonly lootPity: Readonly<Record<string, number>>;
  /** Đợt 6 (phiên bản 4): món thuê ở cửa hàng — số trận còn dùng của từng vũ khí. F19: cả món rơi có hạn. */
  readonly rentals: Readonly<Record<string, number>>;
  /**
   * F19 (phiên bản 6): cấp của món có hạn (món rơi có hạn có cấp riêng). Món không ghi cấp (thuê ở cửa hàng
   * trước phiên bản 6) — tính năng battle coi là cấp cửa hàng.
   */
  readonly rentalTiers: Readonly<Record<string, number>>;
  /** F18 (phiên bản 5): đã thắng màn cuối — để màn cuối hiện "đã qua" và chơi lại không nhận vàng. */
  readonly clearedAll: boolean;
  /** F18 (phiên bản 5): đồ đang mang, lưu để tắt game mở lại vẫn còn. Chưa chọn lần nào = null. */
  readonly loadout: SavedLoadout | null;
}

/**
 * Đồ đang mang ở dạng lưu: tên vũ khí theo thứ tự tầm gần → xa và tên skill (null = không mang). Lưu bằng tên
 * để đổi thứ tự vũ khí trong cấu hình không làm lệch đồ (tính năng battle đổi qua lại).
 */
export interface SavedLoadout {
  readonly weapons: readonly string[];
  readonly skill: string | null;
}

/** F18: trạng thái một màn trên bản đồ. */
export type LevelStatus = 'cleared' | 'current' | 'locked';

/** Kết quả một trận cần cộng vào hồ sơ. */
export interface BattleResult {
  /** Màn vừa chơi (đếm từ 0). */
  readonly level: number;
  readonly won: boolean;
  /** Vàng nhặt được trong trận (thắng hay thua đều giữ). */
  readonly gold: number;
  /** Đợt 5: trận có hạ quái hiếm — cấp vũ khí và bộ đếm bảo hiểm sau khi tung rơi đồ (thay cái cũ). */
  readonly loot?: Pick<Profile, 'weaponTiers' | 'lootPity'>;
  /** Đợt 6: số trận còn lại của món thuê sau trận (thay cái cũ). */
  readonly rentals?: Profile['rentals'];
  /** F19: cấp của món có hạn sau trận (thay cái cũ) — đi cùng `rentals`. */
  readonly rentalTiers?: Profile['rentalTiers'];
}

/** Phần nhỏ của `Storage` (localStorage) mà hồ sơ cần — để logic test được không cần trình duyệt. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
