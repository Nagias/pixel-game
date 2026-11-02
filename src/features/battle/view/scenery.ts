// F18 đợt C: khung cảnh pixel vẽ bằng code (chủ dự án chọn bản 32 màu, 02/11/2026). Hàm thuần, không Phaser:
// trả mảng tên màu để test được và để cầu nối Phaser (app/sceneryTexture.ts) biến thành texture một lần.
// Mẫu: docs/superpowers/specs/mockups/2026-11-02-khung-canh-32-mau.html. Chỉ là hình, không có luật chơi.
import type { PaletteColor } from '../../../shared/palette';
import { nextFloat, seedRng, type RngState } from '../../../shared/random';
import type { Rect } from './battleLayout';

type Ramp4 = readonly [PaletteColor, PaletteColor, PaletteColor, PaletteColor];
/** Dải 5 sắc của tán lá: [viền, tối, vừa, sáng, rất sáng]. */
type Ramp5 = readonly [PaletteColor, PaletteColor, PaletteColor, PaletteColor, PaletteColor];

/** Bộ màu của một chủ đề (Rừng rậm; sau này Băng, Núi lửa chỉ cần thêm một bộ). */
export interface SceneryTheme {
  /** Nền cỏ: [mảng tối, nền]. Bóng đổ cũng tô bằng mảng tối để mọi điểm đúng bảng màu. */
  readonly ground: readonly [dark: PaletteColor, base: PaletteColor];
  readonly leaf: Ramp5;
  readonly autumn: Ramp5;
  /** Thân cây: [viền, tối, vừa, sáng]. */
  readonly trunk: Ramp4;
  /** Đá: [viền, tối, vừa, sáng]. */
  readonly stone: Ramp4;
  /** Nước: [mép, sâu, nông, vệt sáng]. */
  readonly water: Ramp4;
  /** Bờ ao: [mặt đất dốc xuống nước, mép trên]. */
  readonly bank: readonly [PaletteColor, PaletteColor];
  readonly flowers: readonly PaletteColor[];
  /** Ngọn cỏ: [đầu ngọn, gốc]. */
  readonly tuft: readonly [tip: PaletteColor, base: PaletteColor];
}

export type SceneryItem =
  | {
      readonly kind: 'tree' | 'bush';
      readonly x: number;
      readonly y: number;
      readonly size: number;
      readonly autumn?: boolean;
    }
  | { readonly kind: 'rock'; readonly x: number; readonly y: number; readonly size: number }
  | {
      readonly kind: 'pond';
      readonly ellipses: readonly (readonly [cx: number, cy: number, rx: number, ry: number])[];
    };

/** Vùng không được đặt cây, bụi, đá, ao (sân đấu, nút màn…): chỉ còn cỏ, hoa, ngọn cỏ. */
export type KeepClear =
  { readonly circle: readonly [cx: number, cy: number, r: number] } | { readonly rect: Rect };

export interface SceneryLayout {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly items: readonly SceneryItem[];
  readonly keepClear: readonly KeepClear[];
}

// Số đo hình dáng — dùng chung cho lúc vẽ và itemBounds để hình bao luôn chứa trọn hình vẽ.
const TRUNK_HEIGHT = 0.75;
const CANOPY_LIFT = 0.45;
const CANOPY_MAIN_R = 0.62;
const BLOB_DIST_MAX = 0.62;
const BLOB_R_MAX = 0.5;

/** Hình bao (theo điểm ảnh khung cảnh) của một món — kể cả bóng đổ và bờ ao. */
export function itemBounds(item: SceneryItem): Rect {
  if (item.kind === 'pond') {
    const xs = item.ellipses.flatMap(([cx, , rx]) => [cx - rx, cx + rx]);
    const ys = item.ellipses.flatMap(([, cy, , ry]) => [cy - ry, cy + ry]);
    const x = Math.min(...xs) - 3;
    const y = Math.min(...ys) - 3;
    return { x, y, width: Math.max(...xs) + 3 - x, height: Math.max(...ys) + 3 - y };
  }
  const s = item.size;
  if (item.kind === 'tree') {
    const half = s * (BLOB_DIST_MAX * 1.1 + BLOB_R_MAX) + 1;
    const top = item.y - Math.round(s * TRUNK_HEIGHT) - s * CANOPY_LIFT - s * 1.05;
    return { x: item.x - half, y: top, width: half * 2, height: item.y + s * 0.3 + 1 - top };
  }
  if (item.kind === 'bush') {
    const top = item.y - s * 1.55;
    return { x: item.x - s * 1.15, y: top, width: s * 2.3, height: item.y + s * 0.4 - top };
  }
  const top = item.y - s * 1.4;
  return { x: item.x - s * 1.4, y: top, width: s * 2.8, height: item.y + s * 0.45 - top };
}

/** Mảng width×height tên màu, hàng trên xuống, trái sang phải. Cùng đầu vào → cùng kết quả. */
export function paintScenery(layout: SceneryLayout, theme: SceneryTheme): PaletteColor[] {
  const { width: W, height: H } = layout;
  const px = new Array<PaletteColor>(W * H).fill(theme.ground[1]);
  /** Ô đã có nước/bờ ao — không rải hoa, ngọn cỏ lên. */
  const wet = new Uint8Array(W * H);
  let state: RngState = seedRng(layout.seed);
  const rnd = (): number => {
    const [value, next] = nextFloat(state);
    state = next;
    return value;
  };
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const put = (x: number, y: number, color: PaletteColor) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (inside(ix, iy)) px[iy * W + ix] = color;
  };

  // 1. Nền cỏ: nhiễu hai tầng, mảng tối có rìa chấm xen kẽ cho mềm.
  const coarse = valueNoise(W, H, 24, rnd);
  const fine = valueNoise(W, H, 7, rnd);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = coarse(x, y) * 0.75 + fine(x, y) * 0.25;
      if (n < 0.3 || (n < 0.33 && (x + y) % 2 === 0)) px[y * W + x] = theme.ground[0];
    }
  }

  // 2. Ao trước để biết chỗ ướt.
  for (const item of layout.items) if (item.kind === 'pond') paintPond(item.ellipses);

  // 3. Ngọn cỏ và hoa, không rải lên ao.
  for (let i = 0; i < Math.round((W * H) / 380); i++) {
    const x = Math.floor(rnd() * W);
    const y = Math.floor(rnd() * H);
    if (wet[y * W + x]) continue;
    put(x, y - 1, theme.tuft[0]);
    put(x - 1, y, theme.tuft[0]);
    put(x + 1, y, theme.tuft[0]);
    put(x, y, theme.tuft[1]);
  }
  for (let i = 0; i < Math.round((W * H) / 1250); i++) {
    const x = Math.floor(rnd() * W);
    const y = Math.floor(rnd() * H);
    if (wet[y * W + x]) continue;
    const petal = theme.flowers[i % theme.flowers.length] ?? theme.ground[1];
    const heart = theme.flowers[(i + 1) % theme.flowers.length] ?? theme.ground[0];
    put(x - 1, y, petal);
    put(x + 1, y, petal);
    put(x, y - 1, petal);
    put(x, y + 1, petal);
    put(x, y, heart);
  }

  // 4. Cây, bụi, đá theo thứ tự từ xa (y nhỏ) tới gần để món gần đè món xa.
  const solids = layout.items.filter((item) => item.kind !== 'pond');
  for (const item of [...solids].sort((a, b) => a.y - b.y)) {
    if (item.kind === 'tree')
      paintTree(item.x, item.y, item.size, item.autumn ? theme.autumn : theme.leaf);
    else if (item.kind === 'bush')
      paintBush(item.x, item.y, item.size, item.autumn ? theme.autumn : theme.leaf);
    else if (item.kind === 'rock') paintRock(item.x, item.y, item.size);
  }
  return px;

  function paintPond(ellipses: readonly (readonly [number, number, number, number])[]): void {
    const inPond = (x: number, y: number) =>
      ellipses.some(
        ([cx, cy, rx, ry]) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1,
      );
    const b = itemBounds({ kind: 'pond', ellipses });
    for (let y = Math.floor(b.y); y < b.y + b.height; y++) {
      for (let x = Math.floor(b.x); x < b.x + b.width; x++) {
        if (!inside(x, y)) continue;
        if (inPond(x, y)) {
          let edge = false;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) if (!inPond(x + dx, y + dy)) edge = true;
          let shallow = false;
          for (let k = 1; k <= 3; k++) if (!inPond(x, y - k) || !inPond(x - k, y)) shallow = true;
          px[y * W + x] = edge ? theme.water[0] : shallow ? theme.water[2] : theme.water[1];
          wet[y * W + x] = 1;
        } else {
          let near = false;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++)
              if (dx * dx + dy * dy <= 5 && inPond(x + dx, y + dy)) near = true;
          }
          if (near) {
            px[y * W + x] = inPond(x, y + 1) || inPond(x, y + 2) ? theme.bank[0] : theme.bank[1];
            wet[y * W + x] = 1;
          }
        }
      }
    }
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(b.x + rnd() * b.width);
      const y = Math.floor(b.y + rnd() * b.height);
      if (inPond(x, y) && inPond(x + 3, y) && inPond(x, y - 2)) {
        for (let k = 0; k < 3; k++) put(x + k, y, theme.water[3]);
      }
    }
  }

  function shadow(cx: number, cy: number, rx: number, ry: number): void {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1)
          put(x, y, theme.ground[0]);
      }
    }
  }

  /** Các chùm tròn: sáng phía trên trái, mép dưới tối, viền ngoài màu viền. Chùm thấp vẽ trước. */
  function blobs(
    list: { x: number; y: number; r: number; sy?: number }[],
    ramp: Ramp4 | Ramp5,
  ): void {
    const mask = new Set<number>();
    for (const b of [...list].sort((p, q) => q.y - p.y)) {
      const sy = b.sy ?? 1;
      for (let y = Math.floor(b.y - b.r * sy) - 1; y <= b.y + b.r * sy + 1; y++) {
        for (let x = Math.floor(b.x - b.r) - 1; x <= b.x + b.r + 1; x++) {
          const nx = (x + 0.5 - b.x) / b.r;
          const ny = (y + 0.5 - b.y) / (b.r * sy);
          const d2 = nx * nx + ny * ny;
          if (d2 > 1 || !inside(x, y)) continue;
          const light = -(nx * 0.55 + ny * 0.85) + (rnd() - 0.5) * 0.35;
          let tone = light > 0.78 ? 4 : light > 0.2 ? 3 : light > -0.3 ? 2 : 1;
          if (d2 > 0.8 && ny > 0) tone = 1;
          px[y * W + x] = ramp[Math.min(tone, ramp.length - 1)] ?? ramp[0];
          mask.add(y * W + x);
        }
      }
    }
    for (const i of mask) {
      if (!mask.has(i - 1) || !mask.has(i + 1) || !mask.has(i - W) || !mask.has(i + W))
        px[i] = ramp[0];
    }
  }

  function paintTree(x: number, y: number, s: number, ramp: Ramp5): void {
    const trunk = theme.trunk;
    const th = Math.round(s * TRUNK_HEIGHT);
    const tw = Math.max(4, Math.round(s / 3.5));
    shadow(x, y, s * 0.95, s * 0.3);
    for (let yy = y - th; yy <= y; yy++) {
      const flare = yy >= y - 1 ? 1 : 0;
      for (let i = -flare; i < tw + flare; i++) {
        const xx = Math.round(x - tw / 2) + i;
        const edge = i <= -flare || i >= tw - 1 + flare;
        put(
          xx,
          yy,
          edge ? trunk[0] : i === 1 - flare ? trunk[3] : i === tw - 2 + flare ? trunk[1] : trunk[2],
        );
      }
    }
    const cx = x;
    const cy = y - th - s * CANOPY_LIFT;
    const list = [{ x: cx, y: cy, r: s * CANOPY_MAIN_R }];
    const count = 5 + Math.floor(rnd() * 3);
    for (let i = 0; i < count; i++) {
      const angle = rnd() * Math.PI * 2;
      const dist = s * (0.3 + rnd() * (BLOB_DIST_MAX - 0.3));
      list.push({
        x: cx + Math.cos(angle) * dist * 1.1,
        y: cy + Math.sin(angle) * dist * 0.8,
        r: s * (0.34 + rnd() * (BLOB_R_MAX - 0.34)),
      });
    }
    blobs(list, ramp);
  }

  function paintBush(x: number, y: number, s: number, ramp: Ramp5): void {
    shadow(x, y, s * 1.1, s * 0.35);
    blobs(
      [
        { x, y: y - s * 0.6, r: s * 0.7 },
        { x: x - s * 0.55, y: y - s * 0.4, r: s * 0.55 },
        { x: x + s * 0.55, y: y - s * 0.4, r: s * 0.55 },
        { x, y: y - s, r: s * 0.5 },
      ],
      ramp,
    );
  }

  function paintRock(x: number, y: number, s: number): void {
    shadow(x, y, s * 1.3, s * 0.4);
    blobs(
      [
        { x, y: y - s * 0.5, r: s * 1.2, sy: 0.7 },
        { x: x + s * 0.6, y: y - s * 0.3, r: s * 0.7, sy: 0.75 },
      ],
      theme.stone,
    );
  }
}

/** Nhiễu giá trị mượt (ô `cell` điểm) — để mảng cỏ đậm nhạt trông tự nhiên mà vẫn lặp lại được theo hạt giống. */
function valueNoise(
  width: number,
  height: number,
  cell: number,
  rnd: () => number,
): (x: number, y: number) => number {
  const gw = Math.ceil(width / cell) + 2;
  const gh = Math.ceil(height / cell) + 2;
  const grid = Array.from({ length: gw * gh }, rnd);
  const at = (gx: number, gy: number) => grid[gy * gw + gx] ?? 0.5;
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const top = at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx;
    const bottom = at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx;
    return top * (1 - sy) + bottom * sy;
  };
}
