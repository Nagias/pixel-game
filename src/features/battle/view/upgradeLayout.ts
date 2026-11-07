// F18 đợt E: bố cục màn Nâng cấp dạng thẻ (học ảnh 2, 3 Micro RPG): lưới 2×2 thẻ, nút mua trong
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

// ---------- F19: thẻ nhỏ 3 cột (thẻ chọn "Vũ khí" của màn Nâng cấp — 7 món) ----------

const SMALL_COLUMNS = [18, 130, 242] as const;
const SMALL_CARD = { width: 100, height: 148 } as const;
const SMALL_TOP = 96;
const SMALL_PITCH = 156;
/** Số thẻ nhỏ tối đa (3 hàng × 3 cột). */
export const SMALL_CARD_CAPACITY = 9;

/** Thẻ nhỏ thứ `index` (trái → phải, trên → dưới). */
export function smallCardRect(index: number): Rect {
  const x = SMALL_COLUMNS[index % SMALL_COLUMNS.length] ?? SMALL_COLUMNS[0];
  return {
    x,
    y: SMALL_TOP + Math.floor(index / SMALL_COLUMNS.length) * SMALL_PITCH,
    ...SMALL_CARD,
  };
}

/** Nút mua ở đáy thẻ nhỏ `index`. */
export function smallBuyRect(index: number): Rect {
  const card = smallCardRect(index);
  return { x: card.x + 8, y: card.y + card.height - 52, width: card.width - 16, height: 44 };
}

/** Chạm: nút mua của thẻ nhỏ nào (trong `count` thẻ), nút thanh dưới, hoặc null. */
export function smallCardTapAt(x: number, y: number, count: number): UpgradeTap | null {
  for (let index = 0; index < count; index++) {
    const r = smallBuyRect(index);
    if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height)
      return { kind: 'buy', index };
  }
  const target = navTapAt(x, y);
  return target ? { kind: 'nav', target } : null;
}

// ---------- F19 PR C: hai thẻ chọn của màn Nâng cấp ----------

/** Thẻ đang mở của màn Nâng cấp: nâng nhân vật (lưới 2×2) hay nâng từng vũ khí (lưới thẻ nhỏ). */
export type UpgradeTab = 'character' | 'weapons';

/** Hai nút thẻ chọn dưới thanh trên, trên lưới thẻ. */
export const UPGRADE_TABS: readonly { readonly tab: UpgradeTab; readonly rect: Rect }[] = [
  { tab: 'character', rect: { x: 18, y: 50, width: 156, height: 42 } },
  { tab: 'weapons', rect: { x: 186, y: 50, width: 156, height: 42 } },
];

export type UpgradeScreenTap = UpgradeTap | { kind: 'tab'; tab: UpgradeTab };

/** Chạm trên màn Nâng cấp: nút thẻ chọn, nút mua theo bố cục của thẻ đang mở (`count` thẻ), thanh dưới, hoặc null. */
export function upgradeScreenTapAt(
  x: number,
  y: number,
  tab: UpgradeTab,
  count: number,
): UpgradeScreenTap | null {
  for (const { tab: target, rect } of UPGRADE_TABS) {
    if (x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height)
      return { kind: 'tab', tab: target };
  }
  return tab === 'character' ? upgradeTapAt(x, y, count) : smallCardTapAt(x, y, count);
}
