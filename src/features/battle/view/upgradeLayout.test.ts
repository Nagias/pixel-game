import { describe, expect, it } from 'vitest';
import { UPGRADE_KINDS } from '../logic/battleTypes';
import { buyButtonRect, UPGRADE_LAYOUT, upgradeRowTop, upgradeTapAt } from './upgradeLayout';

const L = UPGRADE_LAYOUT;
/** Đợt 5: 4 hàng (thêm May mắn). */
const ROWS = UPGRADE_KINDS.length;
const center = (r: { x: number; y: number; width: number; height: number }) => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
});

// Đợt 4: màn Nâng cấp — mỗi chỉ số một hàng (tên, cấp, hiệu lực bên trái; nút mua bên phải), nút "XONG"
// ở đáy đúng chỗ nút "VÀO TRẬN" của màn chuẩn bị.
describe('bố cục màn Nâng cấp', () => {
  it('mỗi chỉ số một hàng: nút mua trong khung, đủ cao cho ngón tay, hàng không chồng nhau, nằm trên nút "XONG"', () => {
    for (let row = 0; row < ROWS; row++) {
      const r = buyButtonRect(row, L);
      expect(r.x + r.width).toBeLessThanOrEqual(360);
      expect(r.height).toBeGreaterThanOrEqual(44);
      expect(upgradeRowTop(row + 1, L)).toBeGreaterThanOrEqual(upgradeRowTop(row, L) + L.rowHeight);
    }
    expect(upgradeRowTop(ROWS - 1, L) + L.rowHeight).toBeLessThanOrEqual(L.back.y);
    expect(L.back.y + L.back.height).toBeLessThanOrEqual(640);
  });

  it('chạm giữa nút mua thì trúng đúng hàng; chạm "XONG" là quay lại; chạm nền không trúng gì', () => {
    for (let row = 0; row < ROWS; row++) {
      const p = center(buyButtonRect(row, L));
      expect(upgradeTapAt(p.x, p.y, ROWS, L)).toEqual({ kind: 'buy', row });
    }
    const b = center(L.back);
    expect(upgradeTapAt(b.x, b.y, ROWS, L)).toEqual({ kind: 'back' });
    expect(upgradeTapAt(30, upgradeRowTop(0, L) + 10, ROWS, L)).toBeNull();
    expect(upgradeTapAt(180, 20, ROWS, L)).toBeNull();
  });
});
