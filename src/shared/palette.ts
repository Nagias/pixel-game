// Bảng màu DUY NHẤT của game: Sweetie 16 (GrafxKid, https://lospec.com/palette-list/sweetie-16).
// Màu tươi, tách bạch → nhân vật "màu sắc rõ ràng" như ảnh tham chiếu. Không thêm màu ngoài bảng.

export const PALETTE = {
  ink: '#1a1c2c',
  plum: '#5d275d',
  crimson: '#b13e53',
  orange: '#ef7d57',
  sand: '#ffcd75',
  lime: '#a7f070',
  grass: '#38b764',
  teal: '#257179',
  navy: '#29366f',
  blue: '#3b5dc9',
  sky: '#41a6f6',
  cyan: '#73eff7',
  white: '#f4f4f4',
  mist: '#94b0c2',
  slate: '#566c86',
  shadow: '#333c57',
} as const;

export type PaletteColor = keyof typeof PALETTE;

/** Mã màu dạng số 0xRRGGBB mà Phaser Graphics cần. */
export function colorNumber(color: PaletteColor): number {
  return Number.parseInt(PALETTE[color].slice(1), 16);
}

/**
 * Bảng chỉ số cho sprite vẽ bằng ký tự: mỗi ký tự 0–F là một màu Sweetie 16 theo thứ tự chuẩn.
 * Dấu '.' là trong suốt.
 */
export const SPRITE_PALETTE = {
  '0': PALETTE.ink,
  '1': PALETTE.plum,
  '2': PALETTE.crimson,
  '3': PALETTE.orange,
  '4': PALETTE.sand,
  '5': PALETTE.lime,
  '6': PALETTE.grass,
  '7': PALETTE.teal,
  '8': PALETTE.navy,
  '9': PALETTE.blue,
  A: PALETTE.sky,
  B: PALETTE.cyan,
  C: PALETTE.white,
  D: PALETTE.mist,
  E: PALETTE.slate,
  F: PALETTE.shadow,
} as const;
