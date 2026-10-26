// Đọc màn mở đầu từ chuỗi query của đường link (vd. "?level=4" = màn 4). Để thử tay / E2E tới màn sau
// nhanh, giống "?seed=". NỢ DEBT-011: bản phát hành cũng nhảy màn được.

/** Chỉ số màn (đếm từ 0) theo `?level=` (đếm từ 1); thiếu hoặc không hợp lệ thì là màn đầu (0). */
export function parseLevelParam(search: string, levelCount: number): number {
  const raw = new URLSearchParams(search).get('level');
  if (raw === null || !/^\d+$/.test(raw)) return 0;
  const level = Number(raw);
  return level >= 1 && level <= levelCount ? level - 1 : 0;
}
