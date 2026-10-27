// Đọc màn mở đầu từ chuỗi query của đường link (vd. "?level=4" = màn 4). Để thử tay / E2E tới màn sau
// nhanh, giống "?seed=". Đợt 3: chỉ mở được màn đã mở khóa (profile.startLevel — trả DEBT-011).

/** Chỉ số màn (đếm từ 0) theo `?level=` (đếm từ 1); thiếu hoặc không hợp lệ thì null. */
export function parseLevelParam(search: string, levelCount: number): number | null {
  const raw = new URLSearchParams(search).get('level');
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const level = Number(raw);
  return level >= 1 && level <= levelCount ? level - 1 : null;
}
