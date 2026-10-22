// RNG có seed, dạng hàm thuần: trạng thái được truyền vào và trả ra, không giữ biến toàn cục.
// Nhờ vậy luật chơi lặp lại được 100% (cùng seed → cùng ván) và test không chập chờn.
// Thuật toán mulberry32: nhỏ, nhanh, đủ tốt cho game (không dùng cho mật mã).

/** Trạng thái RNG: số nguyên 32 bit không dấu. Lưu thẳng trong state của game. */
export type RngState = number;

/** Chuẩn hóa seed bất kỳ thành trạng thái RNG hợp lệ. */
export function seedRng(seed: number): RngState {
  return Math.trunc(seed) >>> 0;
}

/** Số thực trong [0, 1) và trạng thái kế tiếp. */
export function nextFloat(state: RngState): [value: number, next: RngState] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  return [value, next];
}

/** Số nguyên trong [0, maxExclusive) và trạng thái kế tiếp. */
export function nextInt(state: RngState, maxExclusive: number): [value: number, next: RngState] {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError(`maxExclusive phải là số nguyên dương, nhận ${maxExclusive}`);
  }
  const [value, next] = nextFloat(state);
  return [Math.floor(value * maxExclusive), next];
}
