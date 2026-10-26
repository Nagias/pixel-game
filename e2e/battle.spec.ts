// F01–F06 — Trận đấu: mở game → đổi vũ khí → chạm sân để chém → thắng/thua → sang màn / chơi lại.
// B4: mở game và mỗi lần hết màn là màn chuẩn bị trận (chọn đồ) trước, rồi mới vào trận.
import { expect, test } from '@playwright/test';
import { isGameCleared, isThreatening, levelAt } from '../src/features/battle/logic/battle';
import { BATTLE_CONFIG } from '../src/features/battle/logic/battleConfig';
import { WEAPON_BAR, weaponButtonRects } from '../src/features/battle/view/battleLayout';
import { LOADOUT_LAYOUT } from '../src/features/battle/view/loadoutLayout';
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
async function playBestUntilOver(
  game: BattleDriver,
  /** Gọi trước mỗi nhát chém (vd. để chụp ảnh đúng lúc). */
  beforeStrike?: (snapshot: Awaited<ReturnType<BattleDriver['snapshot']>>) => Promise<void>,
): Promise<number> {
  let mostHitsInOneStrike = 0;
  while ((await game.snapshot()).battle.phase === 'playing') {
    await beforeStrike?.(await game.snapshot());
    const move = bestMove(await game.snapshot());
    await game.play(move);

    const hits = (await game.snapshot()).battle.lastAttack?.hits ?? [];
    const weaponDamage = BATTLE_CONFIG.weapons[move.weaponIndex]?.damage ?? 0;
    expect(hits.map((hit) => hit.damage)).toEqual(hits.map((_, i) => weaponDamage * (i + 1)));
    mostHitsInOneStrike = Math.max(mostHitsInOneStrike, hits.length);
  }
  return mostHitsInOneStrike;
}

/**
 * Chờ màn kết quả nhận chạm rồi chạm để đi tiếp: về màn chuẩn bị của màn sau (hoặc màn vừa thua),
 * rồi chạm "VÀO TRẬN" với bộ đồ đã chọn sẵn.
 */
async function continueFromResult(game: BattleDriver): Promise<void> {
  await game.advance(RESULT_SCREEN_WAIT_MS);
  expect((await game.snapshot()).canRestart).toBe(true);
  await game.tap();
  await game.waitSceneSwitch();
  await game.startBattle();
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
    loadout: { weapons: [0, 1, 2] },
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

/** Tâm các khe giữa `count` nút vũ khí kề nhau, tính từ đúng bố cục game đang dùng. */
function weaponGapCenters(count: number): { x: number; y: number }[] {
  const rects = weaponButtonRects(count, WEAPON_BAR);
  return rects.slice(1).map((right, i) => {
    const left = rects[i];
    if (!left) throw new Error('Thiếu nút vũ khí bên trái khe');
    return { x: (left.x + left.width + right.x) / 2, y: right.y + right.height / 2 };
  });
}

test('F02: chạm vào khe giữa hai nút vũ khí không làm gì — không chém, không mất lượt', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);
  const before = (await game.snapshot()).battle;
  const gaps = weaponGapCenters(before.loadout.weapons.length);
  expect(gaps).toHaveLength(before.loadout.weapons.length - 1);

  for (const gap of gaps) {
    await game.tapAt(gap.x, gap.y);
    const { battle } = await game.snapshot();
    expect(battle.turnsLeft).toBe(before.turnsLeft);
    expect(battle.weaponIndex).toBe(before.weaponIndex);
    expect(battle.monsters).toEqual(before.monsters);
    expect(battle.lastAttack).toBeNull();
  }
  await game.advance(50);
  await page.screenshot({ path: test.info().outputPath('cham-khe.png') });

  // Chạm vào sân thì vẫn chém như cũ.
  await game.tap();
  expect((await game.snapshot()).battle.turnsLeft).toBe(before.turnsLeft - 1);
});

test('F02: ở màn kết quả, chạm vào chỗ khe giữa hai nút vẫn là "chạm để tiếp tục"', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);
  while ((await game.snapshot()).battle.phase === 'playing') {
    await game.play(missMove(await game.snapshot()));
  }
  expect((await game.snapshot()).battle.phase).toBe('lost');

  await game.advance(RESULT_SCREEN_WAIT_MS);
  const [gap] = weaponGapCenters((await game.snapshot()).battle.loadout.weapons.length);
  if (!gap) throw new Error('Không có khe giữa hai nút');
  await game.tapAt(gap.x, gap.y);
  await game.waitSceneSwitch();
  expect((await game.loadoutSnapshot()).level).toBe(0);
});

test('B2: mang Rìu vào trận thì cầm Rìu (không tốn lượt), chém bằng Rìu đúng vùng hai nêm', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openLoadout(SEED);
  const axeIndex = BATTLE_CONFIG.weapons.findIndex((w) => w.twoSided);
  expect(axeIndex).toBeGreaterThanOrEqual(0);
  await game.chooseWeapon(axeIndex);
  await game.startBattle();

  // Đổi qua Giáo rồi chạm lại nút Rìu: cầm Rìu, không tốn lượt.
  await game.selectWeapon(1);
  await game.selectWeapon(axeIndex);
  const before = await game.snapshot();
  expect(before.battle).toMatchObject({ weaponIndex: axeIndex, turnsLeft: LEVEL_1.turnLimit });
  await game.advance(50);
  await page.screenshot({ path: test.info().outputPath('9-cam-riu.png') });

  const move = { weaponIndex: axeIndex, sector: 0 };
  await game.attackAt(move.sector);
  const after = (await game.snapshot()).battle;
  expect(after.turnsLeft).toBe(LEVEL_1.turnLimit - 1);
  expect(after.lastAttack?.aimSector).toBe(move.sector);
  expect(after.lastAttack?.hits.map((hit) => hit.monsterId)).toEqual(hitIds(before, move));
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
  // Đi đủ mọi màn (mỗi màn qua màn chuẩn bị chờ 0,5 giây): lâu hơn mức 30 giây trên máy CI chậm.
  test.slow();
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
    if (monsters.includes('slimeKing')) {
      await game.advance(50);
      await page.screenshot({ path: test.info().outputPath('6-man-trum.png') });
    }
    if (monsters.includes('slimeCannon')) {
      await game.advance(50);
      await page.screenshot({ path: test.info().outputPath('10-man-slime-phao.png') });
    }
    if (levelAt(level, BATTLE_CONFIG).splitOpposite) {
      // B2: nửa đầu đội hình ở một phía, nửa sau ở phía đối diện (lệch nửa vòng).
      const half = Math.ceil(start.monsters.length / 2);
      const [first, last] = [start.monsters[0], start.monsters[half]];
      if (!first || !last) throw new Error('Thiếu quái ở một trong hai cụm');
      const gap = Math.abs(first.sector - last.sector) % BATTLE_CONFIG.sectorCount;
      const apart = Math.min(gap, BATTLE_CONFIG.sectorCount - gap);
      expect(apart).toBeGreaterThanOrEqual(BATTLE_CONFIG.sectorCount / 2 - 2 * 2);
      await game.advance(50);
      await page.screenshot({ path: test.info().outputPath('8-man-hai-phia.png') });
    }

    // B3: lần đầu một Slime Pháo đứng ở vòng bắn (có "!") thì chụp ảnh làm bằng chứng.
    let cannonShot = false;
    mostHitsInOneStrike = Math.max(
      mostHitsInOneStrike,
      await playBestUntilOver(game, async (snapshot) => {
        const aiming = snapshot.battle.monsters.find(
          (m) => m.kind === 'slimeCannon' && isThreatening(m, BATTLE_CONFIG),
        );
        if (!aiming || cannonShot) return;
        cannonShot = true;
        expect(aiming.ring).toBeLessThanOrEqual(
          BATTLE_CONFIG.monsterKinds.slimeCannon.shootRing ?? -1,
        );
        // Chờ hết hoạt ảnh quái trượt sang ô mới (180ms) để ảnh đúng vị trí.
        await game.advance(300);
        await page.screenshot({ path: test.info().outputPath('11-slime-phao-ngam.png') });
      }),
    );
    if (monsters.includes('slimeCannon')) expect(cannonShot).toBe(true);

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

  // Phá đảo xong, chạm là chơi lại từ màn 1 (qua màn chuẩn bị).
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
      .filter((m) => isThreatening(m, BATTLE_CONFIG))
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

test('B4: mở game là màn chuẩn bị màn 1 — chọn Rìu thay Kiếm, vào trận mang đúng bộ đó, sang màn sau vẫn chọn sẵn', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openLoadout(SEED);
  const axeIndex = BATTLE_CONFIG.weapons.findIndex((w) => w.twoSided);
  const prep = await game.loadoutSnapshot();
  expect(prep.level).toBe(0);
  expect(prep.loadout).toEqual({ weapons: [0, 1, 2] });
  // Ô gần có hai món để chọn (Kiếm, Rìu); ô vừa và ô xa mỗi ô một món.
  expect(prep.rows.map((row) => [row.slot, row.weapons.length])).toEqual([
    ['near', 2],
    ['mid', 1],
    ['far', 1],
  ]);
  await game.advance(50);
  await page.screenshot({ path: test.info().outputPath('12-chuan-bi.png') });

  await game.chooseWeapon(axeIndex);
  expect((await game.loadoutSnapshot()).loadout).toEqual({ weapons: [axeIndex, 1, 2] });
  await game.advance(50);
  await page.screenshot({ path: test.info().outputPath('13-chon-riu.png') });

  await game.startBattle();
  const { battle } = await game.snapshot();
  expect(battle).toMatchObject({
    level: 0,
    weaponIndex: axeIndex,
    loadout: { weapons: [axeIndex, 1, 2] },
  });
  await game.advance(50);
  await page.screenshot({ path: test.info().outputPath('14-tran-mang-riu.png') });

  // Kiếm không mang vào trận: bot (và người) chỉ dùng được 3 món đã mang.
  await playBestUntilOver(game);
  expect((await game.snapshot()).battle.phase).toBe('won');
  await game.advance(RESULT_SCREEN_WAIT_MS);
  await game.tap();
  await game.waitSceneSwitch();
  const next = await game.loadoutSnapshot();
  expect(next).toMatchObject({ level: 1, loadout: { weapons: [axeIndex, 1, 2] }, canTap: false });

  // Chạm đúp ở màn kết quả: chạm thứ hai rơi đúng chỗ nút "VÀO TRẬN" lúc màn chuẩn bị vừa mở — không
  // được vào trận (chống chạm nhầm).
  const { start } = LOADOUT_LAYOUT;
  await game.tapAt(start.x + start.width / 2, start.y + start.height / 2);
  await game.waitSceneSwitch();
  expect((await game.loadoutSnapshot()).level).toBe(1);
});

test('B4: ?level=4 mở thẳng màn chuẩn bị màn 4 (thử tay / E2E nhanh), vào trận đúng màn 4', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openLoadout(SEED, 4);
  expect((await game.loadoutSnapshot()).level).toBe(3);
  await game.startBattle();
  const { battle } = await game.snapshot();
  expect(battle.level).toBe(3);
  expect(battle.monsters.map((m) => m.kind)).toEqual(levelAt(3, BATTLE_CONFIG).monsters);
});
