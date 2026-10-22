import { describe, expect, it } from 'vitest';
import { BATTLE_SPRITES } from './battleSprites';

// Lưới ký tự gõ tay rất dễ lệch một ô; lệch là hình vẽ ra bị méo mà không báo lỗi gì.
describe('BATTLE_SPRITES', () => {
  for (const [name, rows] of Object.entries(BATTLE_SPRITES)) {
    it(`${name}: mọi hàng dài bằng nhau và chỉ dùng ký tự 0–F hoặc '.'`, () => {
      const width = rows[0]?.length ?? 0;
      expect(width).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row).toHaveLength(width);
        expect(row).toMatch(/^[0-9A-F.]+$/);
      }
    });
  }
});
