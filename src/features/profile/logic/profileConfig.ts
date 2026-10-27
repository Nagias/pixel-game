// Nơi DUY NHẤT chứa hằng số của hồ sơ người chơi.

/** Phiên bản cấu trúc dữ liệu hiện tại. Đổi cấu trúc → tăng số này + thêm bước chuyển trong profile.ts. */
// Lịch sử: 1 — vàng + màn đã mở khóa (đợt 3); 2 — thêm cấp nâng cấp (đợt 4); 3 — thêm cấp vũ khí đã rơi và
// bộ đếm bảo hiểm rơi đồ (đợt 5); 4 — thêm món thuê ở cửa hàng (đợt 6).
export const PROFILE_VERSION = 4;

/** Khóa lưu hồ sơ trong localStorage. */
export const PROFILE_KEY = 'pixelGame.profile';

/** Khóa cất bản sao dữ liệu lạ/hỏng trước khi chơi tiếp bằng hồ sơ trống — để còn cứu tay. */
export const PROFILE_BACKUP_KEY = 'pixelGame.profile.backup';
