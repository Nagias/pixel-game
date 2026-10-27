// Đợt 4: bố cục màn Nâng cấp (khung 360×640) — phép tính tọa độ thuần, không Phaser, không luật chơi.
// Mỗi chỉ số một hàng: chữ bên trái (tên, cấp, hiệu lực), nút mua bên phải. Nút "XONG" ở đáy, đúng chỗ
// nút "VÀO TRẬN" của màn chuẩn bị.
import type { Rect } from './battleLayout';

export interface UpgradeLayout {
  readonly left: number;
  readonly width: number;
  readonly firstRowTop: number;
  /** Chiều cao mỗi hàng (kể cả khoảng thở tới hàng dưới). */
  readonly rowHeight: number;
  readonly buyWidth: number;
  readonly buyHeight: number;
  readonly back: Rect;
}

export const UPGRADE_LAYOUT: UpgradeLayout = {
  left: 18,
  width: 324,
  firstRowTop: 120,
  // Đợt 5: 4 hàng (thêm May mắn) — hàng cuối vẫn trên dòng báo lỗi (y 500) và nút "XONG".
  rowHeight: 96,
  buyWidth: 120,
  buyHeight: 56,
  back: { x: 18, y: 520, width: 324, height: 64 },
};

export function upgradeRowTop(row: number, layout: UpgradeLayout): number {
  return layout.firstRowTop + row * layout.rowHeight;
}

/** Nút mua của hàng `row`: sát mép phải, giữa hàng theo chiều dọc phần chữ. */
export function buyButtonRect(row: number, layout: UpgradeLayout): Rect {
  return {
    x: layout.left + layout.width - layout.buyWidth,
    y: upgradeRowTop(row, layout) + 8,
    width: layout.buyWidth,
    height: layout.buyHeight,
  };
}

export type UpgradeTap = { readonly kind: 'buy'; readonly row: number } | { readonly kind: 'back' };

const inside = (x: number, y: number, r: Rect) =>
  x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height;

/** Điểm chạm (x, y) trúng nút mua của hàng nào, nút "XONG", hay không trúng gì. */
export function upgradeTapAt(
  x: number,
  y: number,
  rowCount: number,
  layout: UpgradeLayout,
): UpgradeTap | null {
  if (inside(x, y, layout.back)) return { kind: 'back' };
  for (let row = 0; row < rowCount; row++) {
    if (inside(x, y, buyButtonRect(row, layout))) return { kind: 'buy', row };
  }
  return null;
}
