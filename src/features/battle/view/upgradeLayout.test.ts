import { describe, expect, it } from 'vitest';
import { UPGRADE_KINDS } from '../logic/battleTypes';
import type { Rect } from './battleLayout';
import { NAV_BAR, navButtonRect } from './navLayout';
import {
  buyButtonRect,
  cardRect,
  SMALL_CARD_CAPACITY,
  smallBuyRect,
  smallCardRect,
  smallCardTapAt,
  upgradeTapAt,
} from './upgradeLayout';

// F18 đợt E: màn Nâng cấp và Cửa hàng dạng thẻ (học ảnh 2, 3 Micro RPG) — lưới 2×2 thẻ, nút mua trong thẻ,
// thanh nút dưới thay nút "XONG". Hai màn dùng chung bố cục này (4 chỉ số / 4 món).
const COUNT = UPGRADE_KINDS.length;
const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const mid = (r: Rect) => [r.x + r.width / 2, r.y + r.height / 2] as const;

describe('bố cục thẻ Nâng cấp / Cửa hàng', () => {
  const cards = Array.from({ length: COUNT }, (_, i) => cardRect(i));

  it('4 thẻ trong khung, trên thanh nút dưới (kể cả nút CHƠI nhô lên), không đè nhau', () => {
    expect(COUNT).toBe(4);
    for (const r of cards) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(360);
      expect(r.y + r.height).toBeLessThan(navButtonRect('play').y);
      expect(r.y + r.height).toBeLessThan(NAV_BAR.y);
    }
    cards.forEach((a, i) => cards.forEach((b, j) => i < j && expect(overlap(a, b)).toBe(false)));
  });

  it('nút mua nằm trong thẻ, đủ cao cho ngón tay', () => {
    cards.forEach((card, i) => {
      const buy = buyButtonRect(i);
      expect(buy.height).toBeGreaterThanOrEqual(44);
      expect(buy.x).toBeGreaterThanOrEqual(card.x);
      expect(buy.y + buy.height).toBeLessThanOrEqual(card.y + card.height);
    });
  });

  it('chạm nút mua ra đúng thẻ; chạm thân thẻ ngoài nút mua không gì; chạm thanh dưới ra nút', () => {
    for (let i = 0; i < COUNT; i++) {
      expect(upgradeTapAt(...mid(buyButtonRect(i)), COUNT)).toEqual({ kind: 'buy', index: i });
      const card = cardRect(i);
      expect(upgradeTapAt(card.x + card.width / 2, card.y + 20, COUNT)).toBeNull();
    }
    expect(upgradeTapAt(...mid(navButtonRect('play')), COUNT)).toEqual({
      kind: 'nav',
      target: 'play',
    });
  });
});

// F19: cửa hàng bán tới 7 món (3 vũ khí mới) — lưới thẻ nhỏ 3 cột như màn Vũ khí, tối đa 9 thẻ.
describe('bố cục thẻ nhỏ (Cửa hàng 7 món)', () => {
  const cards = Array.from({ length: SMALL_CARD_CAPACITY }, (_, i) => smallCardRect(i));

  it('đủ chỗ 7 món; mọi thẻ trong khung, trên nút CHƠI nhô lên, không đè nhau', () => {
    expect(SMALL_CARD_CAPACITY).toBeGreaterThanOrEqual(7);
    for (const r of cards) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(360);
      expect(r.y).toBeGreaterThan(80);
      expect(r.y + r.height).toBeLessThan(navButtonRect('play').y);
    }
    cards.forEach((a, i) => cards.forEach((b, j) => i < j && expect(overlap(a, b)).toBe(false)));
  });

  it('nút mua nằm trong thẻ, đủ cao cho ngón tay', () => {
    cards.forEach((card, i) => {
      const buy = smallBuyRect(i);
      expect(buy.height).toBeGreaterThanOrEqual(44);
      expect(buy.x).toBeGreaterThanOrEqual(card.x);
      expect(buy.x + buy.width).toBeLessThanOrEqual(card.x + card.width);
      expect(buy.y + buy.height).toBeLessThanOrEqual(card.y + card.height);
    });
  });

  it('chạm nút mua ra đúng thẻ (chỉ trong số thẻ đang có); thân thẻ và khe không gì; thanh dưới ra nút', () => {
    for (let i = 0; i < 7; i++) {
      expect(smallCardTapAt(...mid(smallBuyRect(i)), 7)).toEqual({ kind: 'buy', index: i });
      const card = smallCardRect(i);
      expect(smallCardTapAt(card.x + card.width / 2, card.y + 20, 7)).toBeNull();
    }
    expect(smallCardTapAt(...mid(smallBuyRect(7)), 7)).toBeNull();
    const [a, b] = cards;
    if (!a || !b) throw new Error('thiếu thẻ');
    expect(smallCardTapAt((a.x + a.width + b.x) / 2, a.y + a.height - 20, 7)).toBeNull();
    expect(smallCardTapAt(...mid(navButtonRect('shop')), 7)).toEqual({
      kind: 'nav',
      target: 'shop',
    });
  });
});
