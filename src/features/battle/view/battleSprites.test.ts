import { describe, expect, it } from 'vitest';
import { BATTLE_SPRITES } from './battleSprites';

const size = (rows: readonly string[]) => [rows[0]?.length ?? 0, rows.length];

// Lưới ký tự gõ tay rất dễ lệch một ô; lệch là hình vẽ ra bị méo mà không báo lỗi gì.
describe('BATTLE_SPRITES', () => {
  for (const [name, rows] of Object.entries(BATTLE_SPRITES)) {
    it(`${name}: mọi hàng dài bằng nhau và chỉ dùng ký tự 0–9, A–V hoặc '.'`, () => {
      const width = rows[0]?.length ?? 0;
      expect(width).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row).toHaveLength(width);
        expect(row).toMatch(/^[0-9A-V.]+$/);
      }
    });

    // ART_STYLE: mọi hình có viền màu mực (P = ink) để nổi trên nền cỏ.
    it(`${name}: điểm ngoài cùng bên trái và phải của mỗi hàng là viền mực`, () => {
      for (const row of rows) {
        const solid = row.replace(/\./g, '');
        if (solid.length === 0) continue;
        expect(solid[0], row).toBe('P');
        expect(solid[solid.length - 1], row).toBe('P');
      }
    });
  }

  it('giữ nguyên kích thước từng hình (chỗ đứng, bóng, thanh máu không lệch)', () => {
    expect(size(BATTLE_SPRITES.hero)).toEqual([16, 16]);
    expect(size(BATTLE_SPRITES.slime)).toEqual([12, 10]);
    expect(size(BATTLE_SPRITES.slimeKing)).toEqual([16, 14]);
    expect(size(BATTLE_SPRITES.slimeCannon)).toEqual([12, 11]);
    expect(size(BATTLE_SPRITES.slimeMini)).toEqual([8, 7]);
    expect(size(BATTLE_SPRITES.slimeCharger)).toEqual([12, 10]);
    expect(size(BATTLE_SPRITES.slimeGhost)).toEqual([12, 10]);
    expect(size(BATTLE_SPRITES.goblin)).toEqual([12, 11]);
    expect(size(BATTLE_SPRITES.wolf)).toEqual([12, 10]);
    expect(size(BATTLE_SPRITES.goblinArcher)).toEqual([12, 10]);
    expect(size(BATTLE_SPRITES.bat)).toEqual([14, 9]);
    expect(size(BATTLE_SPRITES.treant)).toEqual([16, 16]);
  });
});
