// Bảng màu DUY NHẤT của game: Endesga 32 (https://lospec.com/palette-list/endesga-32). Chủ dự án chọn bảng
// 32 màu thay Sweetie 16 (02/11/2026) để khung cảnh có đủ sắc xanh, nâu cho cây, đất. Không thêm màu ngoài bảng.

export const PALETTE = {
  rust: '#be4a2f',
  copper: '#d77643',
  cream: '#ead4aa',
  tan: '#e4a672',
  clay: '#b86f50',
  bark: '#733e39',
  umber: '#3e2731',
  maroon: '#a22633',
  red: '#e43b44',
  orange: '#f77622',
  amber: '#feae34',
  yellow: '#fee761',
  leaf: '#63c74d',
  grass: '#3e8948',
  pine: '#265c42',
  forest: '#193c3e',
  navy: '#124e89',
  blue: '#0099db',
  cyan: '#2ce8f5',
  white: '#ffffff',
  mist: '#c0cbdc',
  steel: '#8b9bb4',
  slate: '#5a6988',
  dusk: '#3a4466',
  shadow: '#262b44',
  ink: '#181425',
  scarlet: '#ff0044',
  plum: '#68386c',
  magenta: '#b55088',
  pink: '#f6757a',
  skin: '#e8b796',
  dune: '#c28569',
} as const;

export type PaletteColor = keyof typeof PALETTE;

/** Mã màu dạng số 0xRRGGBB mà Phaser Graphics cần. */
export function colorNumber(color: PaletteColor): number {
  return Number.parseInt(PALETTE[color].slice(1), 16);
}

/**
 * Bảng chỉ số cho sprite vẽ bằng ký tự: ký tự 0–9, A–V là 32 màu Endesga theo thứ tự chuẩn của bảng
 * (cũng là thứ tự khai báo trong PALETTE ở trên). Dấu '.' là trong suốt.
 */
export const SPRITE_PALETTE = {
  '0': PALETTE.rust,
  '1': PALETTE.copper,
  '2': PALETTE.cream,
  '3': PALETTE.tan,
  '4': PALETTE.clay,
  '5': PALETTE.bark,
  '6': PALETTE.umber,
  '7': PALETTE.maroon,
  '8': PALETTE.red,
  '9': PALETTE.orange,
  A: PALETTE.amber,
  B: PALETTE.yellow,
  C: PALETTE.leaf,
  D: PALETTE.grass,
  E: PALETTE.pine,
  F: PALETTE.forest,
  G: PALETTE.navy,
  H: PALETTE.blue,
  I: PALETTE.cyan,
  J: PALETTE.white,
  K: PALETTE.mist,
  L: PALETTE.steel,
  M: PALETTE.slate,
  N: PALETTE.dusk,
  O: PALETTE.shadow,
  P: PALETTE.ink,
  Q: PALETTE.scarlet,
  R: PALETTE.plum,
  S: PALETTE.magenta,
  T: PALETTE.pink,
  U: PALETTE.skin,
  V: PALETTE.dune,
} as const;
