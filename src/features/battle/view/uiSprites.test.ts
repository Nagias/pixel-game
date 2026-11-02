import { describe, expect, it } from 'vitest';
import { BATTLE_CONFIG } from '../logic/battleConfig';
import { UPGRADE_KINDS } from '../logic/battleTypes';
import { SKILL_ICON, UI_SPRITES, UPGRADE_ICON, WEAPON_ICON } from './uiSprites';

// F18 đợt C: biểu tượng cho thẻ vũ khí, nút, ô vàng. Lưới ký tự gõ tay dễ lệch ô — kiểm như hình nhân vật.
describe('UI_SPRITES', () => {
  for (const [name, rows] of Object.entries(UI_SPRITES)) {
    it(`${name}: mọi hàng dài bằng nhau, chỉ dùng ký tự của bảng, có viền mực`, () => {
      const width = rows[0]?.length ?? 0;
      expect(width).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row).toHaveLength(width);
        expect(row).toMatch(/^[0-9A-V.]+$/);
      }
      expect(rows.join('')).toContain('P');
    });
  }

  it('mọi vũ khí trong cấu hình có hình', () => {
    for (const weapon of BATTLE_CONFIG.weapons)
      expect(WEAPON_ICON[weapon.name], weapon.name).toBeDefined();
  });

  it('mọi skill và mọi chỉ số nâng cấp có hình', () => {
    for (const skill of Object.keys(BATTLE_CONFIG.skills)) {
      expect(Object.hasOwn(SKILL_ICON, skill), skill).toBe(true);
    }
    for (const kind of UPGRADE_KINDS) expect(UPGRADE_ICON[kind], kind).toBeDefined();
  });
});
