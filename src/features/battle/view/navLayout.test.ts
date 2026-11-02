import { describe, expect, it } from 'vitest';
import { NAV_BAR, NAV_TARGETS, navButtonRect, navTapAt } from './navLayout';

// F18 đợt D: thanh nút dưới cùng (Cửa hàng · Vũ khí · CHƠI · Nâng cấp) dùng chung cho Bản đồ, Vũ khí, Nâng cấp,
// Cửa hàng — bố cục học Micro RPG.
describe('thanh nút dưới', () => {
  it('đủ 4 nút theo thứ tự trái → phải, nằm trong khung 360×640', () => {
    expect(NAV_TARGETS).toEqual(['shop', 'weapons', 'play', 'upgrade']);
    let lastRight = 0;
    for (const target of NAV_TARGETS) {
      const r = navButtonRect(target);
      expect(r.x).toBeGreaterThanOrEqual(lastRight);
      expect(r.x + r.width).toBeLessThanOrEqual(360);
      expect(r.y + r.height).toBeLessThanOrEqual(640);
      lastRight = r.x + r.width;
    }
  });

  it('nút CHƠI to hơn và nhô lên khỏi dải nền 12 điểm', () => {
    const play = navButtonRect('play');
    expect(play.y).toBe(NAV_BAR.y - 12);
    expect(play.width).toBeGreaterThan(navButtonRect('shop').width);
  });

  it('chạm giữa mỗi nút ra đúng nút; chạm khe giữa hai nút hoặc ngoài thanh thì không gì', () => {
    for (const target of NAV_TARGETS) {
      const r = navButtonRect(target);
      expect(navTapAt(r.x + r.width / 2, r.y + r.height / 2)).toBe(target);
    }
    const shop = navButtonRect('shop');
    const weapons = navButtonRect('weapons');
    expect(navTapAt((shop.x + shop.width + weapons.x) / 2, shop.y + 10)).toBeNull();
    expect(navTapAt(180, 300)).toBeNull();
  });
});
