/** Hồ sơ người chơi lưu lâu dài (đợt 3): vàng và màn đã mở khóa. JSON được. */
export interface Profile {
  /** Phiên bản cấu trúc dữ liệu — đổi cấu trúc thì tăng và viết bước chuyển, để không mất đồ người chơi. */
  readonly version: number;
  readonly gold: number;
  /** Màn cao nhất được chơi (đếm từ 0; 0 = mới mở màn 1). */
  readonly unlockedLevel: number;
  /** Đợt 4 (phiên bản 2): cấp đã nâng theo tên chỉ số (luật nâng cấp nằm ở tính năng battle). */
  readonly upgrades: Readonly<Record<string, number>>;
}

/** Kết quả một trận cần cộng vào hồ sơ. */
export interface BattleResult {
  /** Màn vừa chơi (đếm từ 0). */
  readonly level: number;
  readonly won: boolean;
  /** Vàng nhặt được trong trận (thắng hay thua đều giữ). */
  readonly gold: number;
}

/** Phần nhỏ của `Storage` (localStorage) mà hồ sơ cần — để logic test được không cần trình duyệt. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
