// F01 — Trận đấu tối thiểu: luồng xuyên suốt từ mở game → chạm đánh → thắng/thua → chơi lại.
import { expect, test } from '@playwright/test';
import { isInZone } from '../src/features/battle/logic/arena';
import { BATTLE_CONFIG } from '../src/features/battle/logic/battleConfig';
import { BattleDriver, bestAim, missAim } from './support/battleDriver';

// Seed cố định để ván chơi lặp lại y hệt. Đổi cân bằng mà ván này không còn thắng được
// bằng cách ngắm chuẩn thì chọn seed khác và ghi lý do trong PR.
const SEED = 42;
/** Màn kết quả cần hiện đủ lâu mới cho chơi lại (chống chạm nhầm) — dư ra một chút. */
const RESULT_SCREEN_WAIT_MS = 600;

test('mở game: trận bắt đầu với đủ lượt, quái ở vòng ngoài cùng', async ({ page }) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);

  await expect(page.locator('canvas')).toBeVisible();
  const { battle } = await game.snapshot();
  expect(battle.phase).toBe('playing');
  expect(battle.turnsLeft).toBe(BATTLE_CONFIG.turnLimit);
  expect(battle.monsters).toHaveLength(BATTLE_CONFIG.spawn.count);
  for (const monster of battle.monsters) {
    expect(monster.ring).toBe(BATTLE_CONFIG.ringCount - 1);
  }
  await page.screenshot({ path: test.info().outputPath('1-mo-tran.png') });
});

test('chạm màn hình đánh đúng lát vùng xanh đang chỉ, trúng đúng quái trong vùng', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);

  const before = await game.snapshot();
  const aim = bestAim(before);
  const expectedHitIds = before.battle.monsters
    .filter((m) => isInZone(m, aim, BATTLE_CONFIG.weapon, BATTLE_CONFIG.sectorCount))
    .map((m) => m.id);
  expect(expectedHitIds.length).toBeGreaterThan(0);

  await game.attackAt(aim);

  const after = await game.snapshot();
  expect(after.battle.turnsLeft).toBe(before.battle.turnsLeft - 1);
  expect(after.battle.lastAttack?.aimSector).toBe(aim);
  expect(after.battle.lastAttack?.hits.map((hit) => hit.monsterId)).toEqual(expectedHitIds);
});

test('giữ phím Space chỉ chém một nhát, không chém liên tục khi phím tự lặp', async ({ page }) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);

  await game.holdKey('Space', 5);
  await game.advance(50); // Phaser xử lý bàn phím ở khung hình kế tiếp

  expect((await game.snapshot()).battle.turnsLeft).toBe(BATTLE_CONFIG.turnLimit - 1);
});

test('ngắm chuẩn mọi lượt thì thắng; màn thắng chống chạm nhầm rồi cho chơi lại', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);

  for (let turn = 0; turn < BATTLE_CONFIG.turnLimit; turn++) {
    const snapshot = await game.snapshot();
    if (snapshot.battle.phase !== 'playing') break;
    await game.attackAt(bestAim(snapshot));
  }

  const won = await game.snapshot();
  expect(won.battle.phase).toBe('won');
  await game.advance(300); // cho chữ "THẮNG!" kịp vẽ
  await page.screenshot({ path: test.info().outputPath('2-thang.png') });

  // Chạm ngay khi vừa thắng: chưa được chơi lại (tránh chạm nhầm lúc đang chém liên tục).
  await game.tap();
  expect((await game.snapshot()).battle.phase).toBe('won');

  await game.advance(RESULT_SCREEN_WAIT_MS);
  expect((await game.snapshot()).canRestart).toBe(true);
  await game.tap();

  const restarted = await game.snapshot();
  expect(restarted.battle.phase).toBe('playing');
  expect(restarted.battle.turnsLeft).toBe(BATTLE_CONFIG.turnLimit);
  expect(restarted.battle.monsters).toHaveLength(BATTLE_CONFIG.spawn.count);
});

test('chém trượt mọi lượt thì thua, có lý do thua, rồi chơi lại được', async ({ page }) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);

  for (let turn = 0; turn < BATTLE_CONFIG.turnLimit; turn++) {
    const snapshot = await game.snapshot();
    if (snapshot.battle.phase !== 'playing') break;
    await game.attackAt(missAim(snapshot));
  }

  const lost = await game.snapshot();
  expect(lost.battle.phase).toBe('lost');
  expect(['outOfTurns', 'reachedHero']).toContain(lost.battle.lossReason);
  expect(lost.battle.monsters.length).toBeGreaterThan(0);
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('3-thua.png') });

  await game.advance(RESULT_SCREEN_WAIT_MS);
  expect((await game.snapshot()).canRestart).toBe(true);
  await game.tap();
  const restarted = await game.snapshot();
  expect(restarted.battle.phase).toBe('playing');
  expect(restarted.battle.turnsLeft).toBe(BATTLE_CONFIG.turnLimit);
});
