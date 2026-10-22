// F01 + F02 — Trận đấu: mở game → đổi vũ khí → chạm sân để chém → thắng/thua → chơi lại.
import { expect, test } from '@playwright/test';
import { isThreatening } from '../src/features/battle/logic/battle';
import { BATTLE_CONFIG } from '../src/features/battle/logic/battleConfig';
import { BattleDriver, bestMove, hitIds, missMove } from './support/battleDriver';

// Seed cố định để ván chơi lặp lại y hệt. Đổi cân bằng mà ván này không còn thắng được
// bằng cách ngắm chuẩn thì chọn seed khác và ghi lý do trong PR.
const SEED = 42;
/** Màn kết quả cần hiện đủ lâu mới cho chơi lại (chống chạm nhầm) — dư ra một chút. */
const RESULT_SCREEN_WAIT_MS = 600;

test('mở game: trận bắt đầu với đủ lượt, cầm vũ khí đầu tiên, quái ở vòng ngoài cùng', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);

  await expect(page.locator('canvas')).toBeVisible();
  const { battle } = await game.snapshot();
  expect(battle.phase).toBe('playing');
  expect(battle.turnsLeft).toBe(BATTLE_CONFIG.turnLimit);
  expect(battle.weaponIndex).toBe(0);
  expect(battle.monsters).toHaveLength(BATTLE_CONFIG.spawn.count);
  for (const monster of battle.monsters) {
    expect(monster.ring).toBe(BATTLE_CONFIG.ringCount - 1);
  }
  await game.advance(50);
  await page.screenshot({ path: test.info().outputPath('1-mo-tran.png') });
});

test('chạm nút vũ khí: đổi vũ khí đang cầm, không tốn lượt', async ({ page }) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);

  await game.selectWeapon(2);
  const withBow = await game.snapshot();
  expect(withBow.battle.weaponIndex).toBe(2);
  expect(withBow.battle.turnsLeft).toBe(BATTLE_CONFIG.turnLimit);
  await game.advance(50); // đồng hồ ảo đang dừng: cho game vẽ lại khung hình rồi mới chụp
  await page.screenshot({ path: test.info().outputPath('2-cam-cung.png') });

  await game.selectWeapon(1);
  expect((await game.snapshot()).battle.weaponIndex).toBe(1);
});

test('chạm sân chém đúng lát vùng xanh, bằng đúng vũ khí đang cầm', async ({ page }) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);

  const before = await game.snapshot();
  const move = bestMove(before);
  const expectedHitIds = hitIds(before, move);
  expect(expectedHitIds.length).toBeGreaterThan(0);

  await game.play(move);

  const after = await game.snapshot();
  expect(after.battle.weaponIndex).toBe(move.weaponIndex);
  expect(after.battle.turnsLeft).toBe(before.battle.turnsLeft - 1);
  expect(after.battle.lastAttack?.aimSector).toBe(move.sector);
  expect(after.battle.lastAttack?.hits.map((hit) => hit.monsterId)).toEqual(expectedHitIds);
});

test('ngắm chuẩn và đổi vũ khí đúng lúc thì thắng; màn thắng chống chạm nhầm rồi cho chơi lại', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);

  // F03: mỗi nhát chém, sát thương phải tăng dần 1×, 2×, 3×… sát thương vũ khí (combo gom cụm).
  let mostHitsInOneStrike = 0;
  for (let turn = 0; turn < BATTLE_CONFIG.turnLimit; turn++) {
    const snapshot = await game.snapshot();
    if (snapshot.battle.phase !== 'playing') break;
    const move = bestMove(snapshot);
    await game.play(move);

    const hits = (await game.snapshot()).battle.lastAttack?.hits ?? [];
    const weaponDamage = BATTLE_CONFIG.weapons[move.weaponIndex]?.damage ?? 0;
    expect(hits.map((hit) => hit.damage)).toEqual(hits.map((_, i) => weaponDamage * (i + 1)));
    mostHitsInOneStrike = Math.max(mostHitsInOneStrike, hits.length);
  }
  // Ván này phải có ít nhất một nhát trúng từ 2 quái trở lên, nếu không combo chưa được thử.
  expect(mostHitsInOneStrike).toBeGreaterThanOrEqual(2);

  const won = await game.snapshot();
  expect(won.battle.phase).toBe('won');
  await game.advance(300); // cho chữ "THẮNG!" kịp vẽ
  await page.screenshot({ path: test.info().outputPath('3-thang.png') });

  // Chạm ngay khi vừa thắng: chưa được chơi lại (tránh chạm nhầm lúc đang chém liên tục).
  await game.tap();
  expect((await game.snapshot()).battle.phase).toBe('won');

  await game.advance(RESULT_SCREEN_WAIT_MS);
  expect((await game.snapshot()).canRestart).toBe(true);
  await game.tap();

  const restarted = await game.snapshot();
  expect(restarted.battle.phase).toBe('playing');
  expect(restarted.battle.turnsLeft).toBe(BATTLE_CONFIG.turnLimit);
  expect(restarted.battle.weaponIndex).toBe(0);
  expect(restarted.battle.monsters).toHaveLength(BATTLE_CONFIG.spawn.count);
});

test('chém trượt mọi lượt: quái áp sát đánh mất máu đúng số con, rồi thua và chơi lại được', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);

  // F04: chém trượt thì không con nào chết → mỗi lượt máu giảm đúng (số quái đang áp sát × sức đánh).
  let tookDamage = false;
  for (let turn = 0; turn < BATTLE_CONFIG.turnLimit; turn++) {
    const before = await game.snapshot();
    if (before.battle.phase !== 'playing') break;
    const attackers = before.battle.monsters.filter(isThreatening).length;
    await game.play(missMove(before));

    const after = await game.snapshot();
    const expected = Math.max(0, before.battle.heroHp - attackers * BATTLE_CONFIG.monster.attack);
    expect(after.battle.heroHp).toBe(expected);
    tookDamage ||= attackers > 0;
  }
  // Ván này phải có lúc quái áp sát và đánh, nếu không luật F04 chưa được thử.
  expect(tookDamage).toBe(true);

  const lost = await game.snapshot();
  expect(lost.battle.phase).toBe('lost');
  expect(['outOfTurns', 'heroDefeated']).toContain(lost.battle.lossReason);
  expect(lost.battle.monsters.length).toBeGreaterThan(0);
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('4-thua.png') });

  await game.advance(RESULT_SCREEN_WAIT_MS);
  expect((await game.snapshot()).canRestart).toBe(true);
  await game.tap();
  const restarted = await game.snapshot();
  expect(restarted.battle.phase).toBe('playing');
  expect(restarted.battle.turnsLeft).toBe(BATTLE_CONFIG.turnLimit);
});
