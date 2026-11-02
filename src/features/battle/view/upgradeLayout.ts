// F18 đợt E: bố cục màn Nâng cấp và Cửa hàng dạng thẻ (học ảnh 2, 3 Micro RPG): lưới 2×2 thẻ, nút mua trong
// thẻ, thanh nút dưới (thay nút "XONG" của đợt 4). Khung 360×640. Phép tính tọa độ thuần, không Phaser.
import type { Rect } from './battleLayout';
import { navTapAt, type NavTarget } from './navLayout';

const COLUMNS = [18, 186] as const;
const CARD = { width: 156, height: 222 } as const;
const GRID_TOP = 96;
const ROW_PITCH = 236;

/** Thẻ thứ `index` (trái → phải, trên → dưới). */
export function cardRect(index: number): Rect {
  const x = COLUMNS[index % COLUMNS.length] ?? COLUMNS[0];
  return { x, y: GRID_TOP + Math.floor(index / COLUMNS.length) * ROW_PITCH, ...CARD };
}

/** Nút mua ở đáy thẻ `index`. */
export function buyButtonRect(index: number): Rect {
  const card = cardRect(index);
  return { x: card.x + 12, y: card.y + card.height - 56, width: card.width - 24, height: 44 };
}

export type UpgradeTap = { kind: 'buy'; index: number } | { kind: 'nav'; target: NavTarget };

/** Chạm: nút mua của thẻ nào (trong `count` thẻ), nút thanh dưới, hoặc null. */
export function upgradeTapAt(x: number, y: number, count: number): UpgradeTap | null {
  for (let index = 0; index < count; index++) {
    const r = buyButtonRect(index);
    if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height)
      return { kind: 'buy', index };
  }
  const target = navTapAt(x, y);
  return target ? { kind: 'nav', target } : null;
}
