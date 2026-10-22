// Đọc seed từ chuỗi query của đường link (vd. "?seed=42"). Chỉ nhận số nguyên 0…2^32−1.
const MAX_SEED = 4_294_967_295;

export function parseSeedParam(search: string): number | null {
  const raw = new URLSearchParams(search).get('seed');
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const seed = Number(raw);
  return seed <= MAX_SEED ? seed : null;
}
