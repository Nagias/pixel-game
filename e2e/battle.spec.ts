// F01–F06 — Trận đấu: mở game → đổi vũ khí → chạm sân để chém → thắng/thua → sang màn / chơi lại.
import { expect, test } from '@playwright/test';
import { isGameCleared, isThreatening, levelAt } from '../src/features/battle/logic/battle';
import { BATTLE_CONFIG } from '../src/features/battle/logic/battleConfig';
import { BattleDriver, bestMove, hitIds, missMove } from './support/battleDriver';

// Seed cố định để ván chơi lặp lại y hệt (màn nào cũng dùng seed này). Đổi cân bằng mà ván này
// không còn thắng được bằng cách ngắm chuẩn thì chọn seed khác và ghi lý do trong PR.
const SEED = 42;
/** Màn kết quả cần hiện đủ lâu mới cho đi tiếp (chống chạm nhầm) — dư ra một chút. */
const RESULT_SCREEN_WAIT_MS = 600;
const LEVEL_1 = levelAt(0, BATTLE_CONFIG);
const LEVEL_2 = levelAt(1, BATTLE_CONFIG);
const LAST_LEVEL = BATTLE_CONFIG.levels.length - 1;

/**
 * Ngắm chuẩn tới khi màn kết thúc. F03: mỗi nhát, sát thương phải tăng dần 1×, 2×, 3×… sát thương
 * vũ khí (combo gom cụm). Trả về số quái nhiều nhất trúng trong một nhát.
 */
async function playBestUntilOver(game: BattleDriver): Promise<number> {
  let mostHitsInOneStrike = 0;
  while ((await game.snapshot()).battle.phase === 'playing') {
    const move = bestMove(await game.snapshot());
    await game.play(move);

    const hits = (await game.snapshot()).battle.lastAttack?.hits ?? [];
    const weaponDamage = BATTLE_CONFIG.weapons[move.weaponIndex]?.damage ?? 0;
    expect(hits.map((hit) => hit.damage)).toEqual(hits.map((_, i) => weaponDamage * (i + 1)));
    mostHitsInOneStrike = Math.max(mostHitsInOneStrike, hits.length);
  }
  return mostHitsInOneStrike;
}

/** Chờ màn kết quả nhận chạm rồi chạm để đi tiếp (sang màn sau hoặc chơi lại). */
async function continueFromResult(game: BattleDriver): Promise<void> {
  await game.advance(RESULT_SCREEN_WAIT_MS);
  expect((await game.snapshot()).canRestart).toBe(true);
  await game.tap();
}

test('mở game: vào màn 1 với đủ lượt, cầm vũ khí đầu tiên, đúng đội hình quái ở vòng ngoài cùng', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);

  await expect(page.locator('canvas')).toBeVisible();
  const { battle } = await game.snapshot();
  expect(battle).toMatchObject({
    level: 0,
    phase: 'playing',
    turnsLeft: LEVEL_1.turnLimit,
    weaponIndex: 0,
  });
  expect(battle.monsters.map((m) => m.kind)).toEqual(LEVEL_1.monsters);
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
  expect(withBow.battle.turnsLeft).toBe(LEVEL_1.turnLimit);
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

test('F06: ngắm chuẩn thắng màn nào sang màn kế, hạ trùm ở màn cuối là phá đảo, rồi chơi lại từ màn 1', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);

  let mostHitsInOneStrike = 0;
  for (let level = 0; level <= LAST_LEVEL; level++) {
    // Màn mới: đầy máu, cầm vũ khí đầu, đủ lượt và đúng đội hình quái của màn (màn cuối có trùm).
    const { turnLimit, monsters } = levelAt(level, BATTLE_CONFIG);
    const start = (await game.snapshot()).battle;
    expect(start).toMatchObject({
      level,
      phase: 'playing',
      heroHp: BATTLE_CONFIG.hero.hp,
      weaponIndex: 0,
      turnsLeft: turnLimit,
    });
    expect(start.monsters.map((m) => m.kind)).toEqual(monsters);
    if (level === LAST_LEVEL) {
      await game.advance(50);
      await page.screenshot({ path: test.info().outputPath('6-man-trum.png') });
    }

    mostHitsInOneStrike = Math.max(mostHitsInOneStrike, await playBestUntilOver(game));

    const won = (await game.snapshot()).battle;
    expect(won.phase).toBe('won');
    expect(isGameCleared(won, BATTLE_CONFIG)).toBe(level === LAST_LEVEL);
    await game.advance(300); // cho chữ "THẮNG!" / "PHÁ ĐẢO!" kịp vẽ
    if (level === 0) {
      await page.screenshot({ path: test.info().outputPath('3-thang.png') });
      // Chạm ngay khi vừa thắng: chưa được đi tiếp (tránh chạm nhầm lúc đang chém liên tục).
      await game.tap();
      expect((await game.snapshot()).battle).toMatchObject({ phase: 'won', level: 0 });
    }
    if (level === LAST_LEVEL) {
      await page.screenshot({ path: test.info().outputPath('7-pha-dao.png') });
    }
    await continueFromResult(game);
  }
  // Ván này phải có ít nhất một nhát trúng từ 2 quái trở lên, nếu không combo chưa được thử.
  expect(mostHitsInOneStrike).toBeGreaterThanOrEqual(2);

  // Phá đảo xong, chạm là chơi lại từ màn 1.
  expect((await game.snapshot()).battle).toMatchObject({
    level: 0,
    phase: 'playing',
    turnsLeft: LEVEL_1.turnLimit,
  });
});

test('F06: thua thì chơi lại đúng màn đó — qua màn 1, chém trượt mọi lượt ở màn 2 nên quái áp sát đánh', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);
  await playBestUntilOver(game);
  expect((await game.snapshot()).battle.phase).toBe('won');
  await continueFromResult(game);
  expect((await game.snapshot()).battle.level).toBe(1);

  // F04 + F06: chém trượt thì không con nào chết → mỗi lượt máu giảm đúng tổng sức đánh của
  // các quái đang áp sát (theo loại quái).
  let tookDamage = false;
  for (let turn = 0; turn < LEVEL_2.turnLimit; turn++) {
    const before = await game.snapshot();
    if (before.battle.phase !== 'playing') break;
    const damage = before.battle.monsters
      .filter(isThreatening)
      .reduce((sum, m) => sum + BATTLE_CONFIG.monsterKinds[m.kind].attack, 0);
    await game.play(missMove(before));

    const after = await game.snapshot();
    expect(after.battle.heroHp).toBe(Math.max(0, before.battle.heroHp - damage));
    tookDamage ||= damage > 0;
  }
  // Ván này phải có lúc quái áp sát và đánh, nếu không luật F04 chưa được thử.
  expect(tookDamage).toBe(true);

  const lost = (await game.snapshot()).battle;
  expect(lost).toMatchObject({ phase: 'lost', level: 1 });
  expect(['outOfTurns', 'heroDefeated']).toContain(lost.lossReason);
  expect(lost.monsters.length).toBeGreaterThan(0);
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('4-thua.png') });

  await continueFromResult(game);
  expect((await game.snapshot()).battle).toMatchObject({
    level: 1,
    phase: 'playing',
    heroHp: BATTLE_CONFIG.hero.hp,
    turnsLeft: LEVEL_2.turnLimit,
  });
});

test('F05: Cung bắn trúng quái ở rìa sân thì kéo nó vào gần đúng 1 vòng, giữ lát, đứng yên', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);

  // Mở trận mọi quái đều ở vòng ngoài cùng; Cung rộng 1 lát nên trúng đúng con ở lát ngắm.
  const before = await game.snapshot();
  const target = before.battle.monsters[0];
  if (!target) throw new Error('Trận không có quái');
  const bowIndex = BATTLE_CONFIG.weapons.findIndex((w) => w.push === 'in');
  await game.play({ weaponIndex: bowIndex, sector: target.sector });

  const after = await game.snapshot();
  expect(after.battle.lastAttack?.hits.map((hit) => hit.monsterId)).toEqual([target.id]);
  expect(after.battle.monsters.find((m) => m.id === target.id)).toMatchObject({
    sector: target.sector,
    ring: target.ring - 1,
  });
  await game.advance(300); // cho quái kịp lướt tới ô mới rồi chụp
  await page.screenshot({ path: test.info().outputPath('5-cung-keo.png') });
});
