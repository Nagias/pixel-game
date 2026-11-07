// Nơi DUY NHẤT chứa hằng số của hồ sơ người chơi.

/** Phiên bản cấu trúc dữ liệu hiện tại. Đổi cấu trúc → tăng số này + thêm bước chuyển trong profile.ts. */
// Lịch sử: 1 — vàng + màn đã mở khóa (đợt 3); 2 — thêm cấp nâng cấp (đợt 4); 3 — thêm cấp vũ khí đã rơi và
// bộ đếm bảo hiểm rơi đồ (đợt 5); 4 — thêm món thuê ở cửa hàng (đợt 6); 5 — thêm đã phá đảo và đồ đang mang
// (F18 đợt B); 6 — thêm cấp của món có hạn (F19 PR B); 7 — thêm cấp nâng của từng vũ khí (F19 PR C); 8 — bỏ món
// có hạn và cấp nâng vũ khí, đổi ra vàng (F20 PR A).
export const PROFILE_VERSION = 8;

/**
 * F20 (chủ dự án duyệt 07/11/2026): con số CŨ đóng băng để chuyển hồ sơ bản 4–7 lên bản 8 không mất gì — món có hạn
 * còn hạn đổi vàng theo bảng đổi món thừa (theo cấp; món thuê không ghi cấp là cấp cửa hàng — Hiếm), vàng đã tiêu nâng
 * vũ khí (giá từng cấp) trả lại. Không phải con số cân bằng đang dùng — đừng đổi.
 */
export const LEGACY_REFUND = {
  rentalGold: [1, 2, 4, 8, 15, 30],
  shopTier: 2,
  weaponUpgradeCosts: [15, 30, 60],
} as const;

/** Khóa lưu hồ sơ trong localStorage. */
export const PROFILE_KEY = 'pixelGame.profile';

/** Khóa cất bản sao dữ liệu lạ/hỏng trước khi chơi tiếp bằng hồ sơ trống — để còn cứu tay. */
export const PROFILE_BACKUP_KEY = 'pixelGame.profile.backup';
