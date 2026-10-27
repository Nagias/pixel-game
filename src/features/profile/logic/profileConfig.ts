// Nơi DUY NHẤT chứa hằng số của hồ sơ người chơi.

/** Phiên bản cấu trúc dữ liệu hiện tại. Đổi cấu trúc → tăng số này + thêm bước chuyển trong profile.ts. */
export const PROFILE_VERSION = 1;

/** Khóa lưu hồ sơ trong localStorage. */
export const PROFILE_KEY = 'pixelGame.profile';

/** Khóa cất bản sao dữ liệu lạ/hỏng trước khi chơi tiếp bằng hồ sơ trống — để còn cứu tay. */
export const PROFILE_BACKUP_KEY = 'pixelGame.profile.backup';
