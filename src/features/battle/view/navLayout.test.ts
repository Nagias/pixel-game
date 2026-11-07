import { describe, expect, it } from 'vitest';
import { NAV_BAR, NAV_TARGETS, navButtonRect, navTapAt } from './navLayout';

// F18 đợt D: thanh nút dưới cùng dùng chung cho Bản đồ, Vũ khí, Nâng cấp — bố cục học Micro RPG. F20 (chủ dự án duyệt
// 07/11/2026): bỏ Cửa hàng — còn Vũ khí · CHƠI · Nâng cấp, nút CHƠI ở giữa.
describe('thanh nút dưới', () => {
  it('đủ 3 nút theo thứ tự trái → phải, nằm trong khung 360×640', () => {
    expect(NAV_TARGETS).toEqual(['weapons', 'play', 'upgrade']);
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
    expect(play.height).toBeGreaterThan(navButtonRect('weapons').height);
    // Nút CHƠI ở chính giữa khung.
    expect(play.x + play.width / 2).toBe(180);
  });

  it('chạm giữa mỗi nút ra đúng nút; chạm khe giữa hai nút hoặc ngoài thanh thì không gì', () => {
    for (const target of NAV_TARGETS) {
      const r = navButtonRect(target);
      expect(navTapAt(r.x + r.width / 2, r.y + r.height / 2)).toBe(target);
    }
    const weapons = navButtonRect('weapons');
    const play = navButtonRect('play');
    expect(navTapAt((weapons.x + weapons.width + play.x) / 2, weapons.y + 10)).toBeNull();
    expect(navTapAt(180, 300)).toBeNull();
  });
});
