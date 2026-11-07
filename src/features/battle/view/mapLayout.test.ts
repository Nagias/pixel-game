import { describe, expect, it } from 'vitest';
import type { Rect } from './battleLayout';
import {
  BANNER,
  LEVEL_COUNT_ON_MAP,
  levelNodeRect,
  mapTapAt,
  PREBATTLE_LAYOUT,
  prebattleTapAt,
} from './mapLayout';
import { NAV_BAR, navButtonRect } from './navLayout';

// F18 đợt D: bản đồ Rừng rậm — 20 nút màn nối thành đường rắn 5 hàng × 4 cột (học ảnh 1 Micro RPG), bảng trước
// trận (ảnh 6). Phép tính tọa độ thuần, không Phaser.

const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const center = (r: Rect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
const levels = Array.from({ length: LEVEL_COUNT_ON_MAP }, (_, i) => i);

describe('nút màn trên bản đồ', () => {
  it('20 nút nằm trong khung, dưới băng rôn, trên thanh nút dưới (kể cả nút CHƠI nhô lên), không đè nhau', () => {
    expect(LEVEL_COUNT_ON_MAP).toBe(20);
    const rects = levels.map((level) => levelNodeRect(level, true));
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(360);
      expect(r.y).toBeGreaterThan(BANNER.y + BANNER.height);
      expect(r.y + r.height).toBeLessThan(navButtonRect('play').y);
      expect(r.y + r.height).toBeLessThan(NAV_BAR.y);
    }
    rects.forEach((a, i) =>
      rects.forEach((b, j) => i < j && expect(overlap(a, b), `${i}/${j}`).toBe(false)),
    );
  });

  it('màn 1 ở góc dưới trái; nút n và n+1 kề nhau (cùng hàng, hoặc thẳng cột khi lên hàng) — đường rắn', () => {
    const first = center(levelNodeRect(0));
    expect(first.x).toBeLessThan(180);
    expect(first.y).toBeGreaterThan(center(levelNodeRect(19)).y);
    for (let level = 0; level < LEVEL_COUNT_ON_MAP - 1; level++) {
      const a = center(levelNodeRect(level));
      const b = center(levelNodeRect(level + 1));
      const sameRow = a.y === b.y;
      const sameColumn = a.x === b.x;
      expect(sameRow !== sameColumn, `${level}→${level + 1}`).toBe(true);
      if (sameColumn) expect(b.y).toBeLessThan(a.y);
    }
  });

  it('nút có trùm to hơn nút thường, cùng tâm', () => {
    const normal = levelNodeRect(9);
    const boss = levelNodeRect(9, true);
    expect(boss.width).toBeGreaterThan(normal.width);
    expect(center(boss)).toEqual(center(normal));
  });

  it('chạm giữa nút ra đúng màn; chạm khe giữa hai nút không gì; chạm thanh dưới ra nút thanh dưới', () => {
    for (const level of levels) {
      const c = center(levelNodeRect(level));
      expect(mapTapAt(c.x, c.y)).toEqual({ kind: 'level', level });
    }
    const a = center(levelNodeRect(0));
    const b = center(levelNodeRect(1));
    expect(mapTapAt((a.x + b.x) / 2, a.y)).toBeNull();
    const weapons = center(navButtonRect('weapons'));
    expect(mapTapAt(weapons.x, weapons.y)).toEqual({ kind: 'nav', target: 'weapons' });
  });
});

describe('bảng trước trận', () => {
  const { panel, play, close, gearCards, skillCard } = PREBATTLE_LAYOUT;

  it('4 thẻ đồ (hiệp sĩ + 3 vũ khí) và ô skill nằm trong bảng, không đè nhau', () => {
    expect(gearCards).toHaveLength(4);
    const boxes = [...gearCards, skillCard];
    for (const r of boxes) {
      expect(r.x).toBeGreaterThanOrEqual(panel.x);
      expect(r.x + r.width).toBeLessThanOrEqual(panel.x + panel.width);
      expect(r.y).toBeGreaterThanOrEqual(panel.y);
      expect(r.y + r.height).toBeLessThanOrEqual(panel.y + panel.height);
    }
    boxes.forEach((a, i) => boxes.forEach((b, j) => i < j && expect(overlap(a, b)).toBe(false)));
  });

  it('nút chơi của bảng không trùng chỗ nút CHƠI của thanh dưới, không đè nút đóng', () => {
    expect(overlap(play, navButtonRect('play'))).toBe(false);
    expect(overlap(play, close)).toBe(false);
  });

  it('chạm: nút chơi, nút đóng, thẻ vũ khí/skill; thẻ hiệp sĩ và chỗ ngoài bảng thì không gì', () => {
    expect(prebattleTapAt(center(play).x, center(play).y)).toBe('play');
    expect(prebattleTapAt(center(close).x, center(close).y)).toBe('close');
    for (const card of gearCards.slice(1))
      expect(prebattleTapAt(center(card).x, center(card).y)).toBe('gear');
    expect(prebattleTapAt(center(skillCard).x, center(skillCard).y)).toBe('gear');
    const [hero] = gearCards;
    if (!hero) throw new Error('thiếu thẻ hiệp sĩ');
    expect(prebattleTapAt(center(hero).x, center(hero).y)).toBeNull();
    expect(prebattleTapAt(5, 5)).toBeNull();
  });
});
