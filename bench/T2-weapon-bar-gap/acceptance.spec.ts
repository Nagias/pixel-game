// Test ẩn của việc mẫu T2 (bench/) — chỉ chép vào bài làm lúc chấm, người làm bài không thấy.
// Chạm vào khe giữa hai nút vũ khí không được tính là chém; luồng cũ (đổi vũ khí, chém) vẫn đúng.
import { expect, test } from '@playwright/test';
import { BATTLE_CONFIG } from '../src/features/battle/logic/battleConfig';
import { WEAPON_BAR, weaponButtonRects } from '../src/features/battle/view/battleLayout';
import { BattleDriver } from './support/battleDriver';

const SEED = 42;
const RECTS = weaponButtonRects(BATTLE_CONFIG.weapons.length, WEAPON_BAR);

/** Điểm giữa khe nằm ngay sau nút thứ `index`. */
function gapAfter(index: number): { x: number; y: number } {
  const rect = RECTS[index];
  if (!rect) throw new Error(`Không có nút số ${index}`);
  return { x: rect.x + rect.width + WEAPON_BAR.gap / 2, y: rect.y + rect.height / 2 };
}

for (const index of [0, 1]) {
  test(`bench T2: chạm vào khe sau nút ${index + 1} không chém, không tốn lượt, không đổi vũ khí`, async ({
    page,
  }) => {
    const game = new BattleDriver(page);
    await game.openBattle(SEED);
    const before = (await game.snapshot()).battle;

    const gap = gapAfter(index);
    await game.tapAt(gap.x, gap.y);
    await game.advance(50);

    const after = (await game.snapshot()).battle;
    expect(after.turnsLeft).toBe(before.turnsLeft);
    expect(after.lastAttack).toBeNull();
    expect(after.weaponIndex).toBe(before.weaponIndex);
    expect(after.monsters).toEqual(before.monsters);
  });
}

test('bench T2: chạm vào nút vẫn đổi vũ khí, chạm vào sân vẫn chém', async ({ page }) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);
  const before = (await game.snapshot()).battle;

  await game.selectWeapon(2);
  await game.advance(50);
  const switched = (await game.snapshot()).battle;
  expect(switched.weaponIndex).toBe(2);
  expect(switched.turnsLeft).toBe(before.turnsLeft);

  await game.tapAt(180, 300);
  await game.advance(50);
  const attacked = (await game.snapshot()).battle;
  expect(attacked.turnsLeft).toBe(before.turnsLeft - 1);
  expect(attacked.lastAttack).not.toBeNull();
});
