// B4: bố cục màn chuẩn bị trận (khung 360×640) — phép tính tọa độ thuần, không Phaser, không luật chơi.
// Mỗi hàng là một tầm (gần / vừa / xa) hoặc hàng skill (B6): cột chữ bên trái, các nút bên phải, dòng
// mô tả (tới 2 dòng) bên dưới.
import type { Rect } from './battleLayout';

export interface LoadoutLayout {
  readonly left: number;
  readonly width: number;
  /** Cột chữ tên tầm ("Gần", "Vừa", "Xa") bên trái các nút. */
  readonly labelWidth: number;
  /** Mép trên của nút hàng đầu. */
  readonly firstRowTop: number;
  /** Khoảng cách mép trên hai hàng liền nhau (nút + dòng mô tả + khoảng thở). */
  readonly rowPitch: number;
  readonly buttonHeight: number;
  /** Khe giữa hai nút — chạm vào khe không chọn gì. */
  readonly gap: number;
  /** Nút "VÀO TRẬN" ở đáy, cùng chỗ thanh nút vũ khí trong trận (vừa tầm ngón cái). */
  readonly start: Rect;
}

export const LOADOUT_LAYOUT: LoadoutLayout = {
  left: 18,
  width: 324,
  labelWidth: 60,
  // 4 hàng (3 tầm + skill B6), dòng mô tả tới 2 dòng (chữ 12px).
  firstRowTop: 106,
  rowPitch: 104,
  buttonHeight: 52,
  gap: 12,
  start: { x: 18, y: 520, width: 324, height: 72 },
};

export function rowTop(row: number, layout: LoadoutLayout): number {
  return layout.firstRowTop + row * layout.rowPitch;
}

/** Tọa độ y của dòng mô tả món đang chọn, ngay dưới các nút của hàng. */
export function descriptionY(row: number, layout: LoadoutLayout): number {
  return rowTop(row, layout) + layout.buttonHeight + 8;
}

/** Các nút món của hàng `row` (có `count` món), chia đều phần bên phải cột chữ. */
export function optionRects(row: number, count: number, layout: LoadoutLayout): Rect[] {
  const x0 = layout.left + layout.labelWidth;
  const span = layout.width - layout.labelWidth;
  const width = (span - layout.gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => ({
    x: x0 + i * (width + layout.gap),
    y: rowTop(row, layout),
    width,
    height: layout.buttonHeight,
  }));
}

export type LoadoutTap =
  | { readonly kind: 'option'; readonly row: number; readonly option: number }
  | { readonly kind: 'start' };

const inside = (x: number, y: number, r: Rect) =>
  x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height;

/**
 * Điểm chạm (x, y) trúng gì: nút món thứ `option` của hàng `row`, nút "VÀO TRẬN", hay không trúng gì
 * (khe, chữ, nền). `rowCounts[i]` = số món của hàng i.
 */
export function loadoutTapAt(
  x: number,
  y: number,
  rowCounts: readonly number[],
  layout: LoadoutLayout,
): LoadoutTap | null {
  if (inside(x, y, layout.start)) return { kind: 'start' };
  for (const [row, count] of rowCounts.entries()) {
    const option = optionRects(row, count, layout).findIndex((r) => inside(x, y, r));
    if (option !== -1) return { kind: 'option', row, option };
  }
  return null;
}
