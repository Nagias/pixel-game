import { describe, expect, it } from 'vitest';
import type { Rect } from './battleLayout';
import { NAV_BAR, navButtonRect } from './navLayout';
import {
  equippedCardRects,
  EQUIPPED_SKILL,
  GRID_CAPACITY,
  gridCardRect,
  weaponsTapAt,
} from './weaponsLayout';

// F18 đợt D: màn Vũ khí kiểu ảnh 2 Micro RPG — hàng "Đang mang" và lưới thẻ. Khung 360×640.
const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const mid = (r: Rect) => [r.x + r.width / 2, r.y + r.height / 2] as const;

describe('bố cục màn Vũ khí', () => {
  const grid = Array.from({ length: GRID_CAPACITY }, (_, i) => gridCardRect(i));
  const all = [...equippedCardRects, EQUIPPED_SKILL, ...grid];

  it('lưới đủ chỗ cho 7 vũ khí + 2 skill (F19), nằm trên thanh nút dưới kể cả nút CHƠI nhô lên', () => {
    expect(GRID_CAPACITY).toBeGreaterThanOrEqual(9);
    for (const r of grid) {
      expect(r.y + r.height).toBeLessThan(NAV_BAR.y);
      expect(r.y + r.height).toBeLessThan(navButtonRect('play').y);
    }
  });

  it('mọi thẻ nằm trong khung, không đè nhau', () => {
    for (const r of all) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(360);
    }
    all.forEach((a, i) => all.forEach((b, j) => i < j && expect(overlap(a, b)).toBe(false)));
  });

  it('chạm thẻ lưới ra đúng thẻ; khe giữa hai thẻ và hàng "Đang mang" không gì; thanh dưới ra nút', () => {
    grid.forEach((r, index) => expect(weaponsTapAt(...mid(r))).toEqual({ kind: 'card', index }));
    const [a, b] = grid;
    if (!a || !b) throw new Error('lưới trống');
    expect(weaponsTapAt((a.x + a.width + b.x) / 2, a.y + 10)).toBeNull();
    const [equipped] = equippedCardRects;
    if (!equipped) throw new Error('thiếu thẻ đang mang');
    expect(weaponsTapAt(...mid(equipped))).toBeNull();
    expect(weaponsTapAt(...mid(navButtonRect('play')))).toEqual({ kind: 'nav', target: 'play' });
  });
});
