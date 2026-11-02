// F18 đợt D: bố cục màn Vũ khí (học ảnh 2 Micro RPG): hàng "Đang mang" (gần, vừa, xa) và ô skill đang mang ở
// trên, lưới thẻ mọi vũ khí và skill ở dưới, thanh nút dưới cùng. Phép tính tọa độ thuần, không Phaser.
import type { Rect } from './battleLayout';
import { navTapAt, type NavTarget } from './navLayout';

const COLUMNS = [18, 130, 242] as const;
const CARD = { width: 100, height: 92 } as const;

/** 3 thẻ đồ đang mang: gần, vừa, xa. */
export const equippedCardRects: readonly Rect[] = COLUMNS.map((x) => ({ x, y: 74, ...CARD }));
/** Ô skill đang mang (chỉ hiện từ màn mở skill). */
export const EQUIPPED_SKILL: Rect = { x: 18, y: 214, width: 324, height: 40 };

const GRID_TOP = 290;
const GRID_PITCH = 104;
/** Số thẻ lưới tối đa (2 hàng × 3 cột). */
export const GRID_CAPACITY = 6;

/** Thẻ thứ `index` của lưới (trái → phải, trên → dưới). */
export function gridCardRect(index: number): Rect {
  const x = COLUMNS[index % COLUMNS.length] ?? COLUMNS[0];
  return { x, y: GRID_TOP + Math.floor(index / COLUMNS.length) * GRID_PITCH, ...CARD };
}

export type WeaponsTap = { kind: 'card'; index: number } | { kind: 'nav'; target: NavTarget };

/** Chạm trên màn Vũ khí: thẻ lưới, nút thanh dưới, hoặc null (khe, hàng "Đang mang", chỗ trống). */
export function weaponsTapAt(x: number, y: number): WeaponsTap | null {
  for (let index = 0; index < GRID_CAPACITY; index++) {
    const r = gridCardRect(index);
    if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height)
      return { kind: 'card', index };
  }
  const target = navTapAt(x, y);
  return target ? { kind: 'nav', target } : null;
}
