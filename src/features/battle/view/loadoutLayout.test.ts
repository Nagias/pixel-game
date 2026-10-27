import { describe, expect, it } from 'vitest';
import { descriptionY, LOADOUT_LAYOUT, loadoutTapAt, optionRects, rowTop } from './loadoutLayout';

const L = LOADOUT_LAYOUT;
const center = (r: { x: number; y: number; width: number; height: number }) => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
});

describe('B4 — bố cục màn chuẩn bị trận', () => {
  it('nút món nằm trong khung 360×640, bên phải cột chữ, không chồng nhau, cao đủ cho ngón tay', () => {
    for (const count of [1, 2, 3]) {
      const rects = optionRects(0, count, L);
      expect(rects).toHaveLength(count);
      for (const [i, r] of rects.entries()) {
        expect(r.x).toBeGreaterThanOrEqual(L.left + L.labelWidth);
        expect(r.x + r.width).toBeLessThanOrEqual(L.left + L.width + 1e-9);
        expect(r.height).toBeGreaterThanOrEqual(44);
        const next = rects[i + 1];
        if (next) expect(next.x - (r.x + r.width)).toBeCloseTo(L.gap);
      }
    }
  });

  // Mô tả tới 2 dòng chữ 12px (~32px): không đè hàng dưới, không đè nút VÀO TRẬN.
  it('4 hàng (3 tầm + hàng skill B6) và mô tả 2 dòng đều nằm trên nút "VÀO TRẬN"', () => {
    const TWO_LINES = 32;
    for (let row = 0; row < 4; row++) {
      expect(descriptionY(row, L)).toBeGreaterThan(rowTop(row, L) + L.buttonHeight);
      expect(rowTop(row + 1, L)).toBeGreaterThan(descriptionY(row, L) + TWO_LINES);
      expect(descriptionY(row, L) + TWO_LINES).toBeLessThan(L.start.y);
    }
    expect(L.start.y + L.start.height).toBeLessThanOrEqual(640);
  });

  it('chạm giữa nút thì trúng đúng hàng và món; chạm nút "VÀO TRẬN" là bắt đầu', () => {
    const rowCounts = [2, 1, 1];
    for (const [row, count] of rowCounts.entries()) {
      for (const [option, rect] of optionRects(row, count, L).entries()) {
        const p = center(rect);
        expect(loadoutTapAt(p.x, p.y, rowCounts, L)).toEqual({ kind: 'option', row, option });
      }
    }
    const s = center(L.start);
    expect(loadoutTapAt(s.x, s.y, rowCounts, L)).toEqual({ kind: 'start' });
  });

  it('chạm vào khe giữa hai nút, cột chữ hay nền thì không trúng gì', () => {
    const [left, right] = optionRects(0, 2, L);
    if (!left || !right) throw new Error('Thiếu nút');
    const gapX = (left.x + left.width + right.x) / 2;
    const y = left.y + left.height / 2;
    expect(loadoutTapAt(gapX, y, [2], L)).toBeNull();
    expect(loadoutTapAt(L.left + 10, y, [2], L)).toBeNull();
    expect(loadoutTapAt(180, 20, [2], L)).toBeNull();
  });

  // Đợt 4: nút "NÂNG CẤP" ngay dưới nút "VÀO TRẬN", vừa ngón tay, không chồng nút nào, trong khung.
  it('nút "NÂNG CẤP" dưới nút "VÀO TRẬN", không chồng, đủ cao, trong khung; chạm giữa là mở nâng cấp', () => {
    const { start, upgrade } = L;
    expect(upgrade.y).toBeGreaterThanOrEqual(start.y + start.height);
    expect(upgrade.height).toBeGreaterThanOrEqual(44);
    expect(upgrade.y + upgrade.height).toBeLessThanOrEqual(640);
    expect(upgrade.x).toBeGreaterThanOrEqual(0);
    expect(upgrade.x + upgrade.width).toBeLessThanOrEqual(360);
    const u = center(upgrade);
    expect(loadoutTapAt(u.x, u.y, [2, 1, 1], L)).toEqual({ kind: 'upgrade' });
  });
});
