// F01–F06 — Trận đấu: mở game → đổi vũ khí → chạm sân để chém → thắng/thua → sang màn / chơi lại.
// B4: mở game và mỗi lần hết màn là màn chuẩn bị trận (chọn đồ) trước, rồi mới vào trận.
import { expect, test } from '@playwright/test';
import {
  canBeHit,
  canCastSkill,
  isGameCleared,
  levelAt,
  willAttack,
} from '../src/features/battle/logic/battle';
import {
  BATTLE_CONFIG,
  LOOT_CONFIG,
  SHOP_CONFIG,
  UPGRADE_CONFIG,
} from '../src/features/battle/logic/battleConfig';
import { lootAfterBattle } from '../src/features/battle/logic/loot';
import { withUpgrades } from '../src/features/battle/logic/upgrades';
import {
  barButtonCount,
  WEAPON_BAR,
  weaponButtonRects,
} from '../src/features/battle/view/battleLayout';
import { LOADOUT_LAYOUT } from '../src/features/battle/view/loadoutLayout';
import { seedRng } from '../src/shared/random';
import { BattleDriver, bestMove, hitIds, lookaheadTurn, missMove } from './support/battleDriver';

// Seed cố định để ván chơi lặp lại y hệt (màn nào cũng dùng seed này). Đổi cân bằng mà ván này
// không còn thắng được bằng bot "Nhìn trước" thì chọn seed khác và ghi lý do trong PR.
const SEED = 42;
/**
 * Đợt 7: hai ván chơi liền cả chủ đề (20 màn) dùng seed riêng, với hồ sơ đã nâng cấp (như người chơi đã
 * tiêu vàng): seed 1 là seed nhỏ nhất mà bot "Nhìn trước" thắng đủ 20 màn với Mưa băng và màn cuối với Cầu
 * lửa (script dò tạm 27/10/2026). Đợt 5: dò lại khi có quái hiếm — đồ rơi giữa ván nâng cấp vũ khí cho các
 * màn sau, bot tính theo cấu hình thật của trận (`snapshot.config`); seed 1 vẫn thắng đủ. Đổi cân bằng mà
 * không còn thắng đủ thì dò lại seed và ghi lý do trong PR.
 */
const FULL_RUN_SEED = 1;
const FULL_RUN_UPGRADES = { hp: 3, crit: 3, heal: 3 };
const FULL_RUN_CONFIG = withUpgrades(BATTLE_CONFIG, FULL_RUN_UPGRADES, UPGRADE_CONFIG);
/** 20 màn qua màn chuẩn bị mất vài phút trên máy CI chậm. */
const FULL_RUN_TIMEOUT_MS = 8 * 60_000;
/** Màn mới mở: chờ đủ để hình nhân vật và quái kịp vẽ lên trước khi chụp ảnh (50ms có lúc chưa kịp). */
const LEVEL_DRAWN_MS = 300;
/** Màn kết quả cần hiện đủ lâu mới cho đi tiếp (chống chạm nhầm) — dư ra một chút. */
const RESULT_SCREEN_WAIT_MS = 600;
const LEVEL_1 = levelAt(0, BATTLE_CONFIG);
const LEVEL_2 = levelAt(1, BATTLE_CONFIG);
const LAST_LEVEL = BATTLE_CONFIG.levels.length - 1;

/**
 * Chơi giỏi nhất tới khi màn kết thúc — bot "Nhìn trước" (đợt 0; mục tiêu độ khó đo bằng bot thường
 * "Ngắm chuẩn", bot này giỏi hơn nên dư sức thắng): tự quyết bấm hay giữ skill (B6, không tốn lượt).
 * F03: mỗi nhát, sát thương phải tăng dần 1×, 2×, 3×… sát thương vũ khí (combo gom cụm). Trả về số quái
 * nhiều nhất trúng trong một nhát.
 */
async function playBestUntilOver(
  game: BattleDriver,
  /** Gọi trước mỗi nhát chém (vd. để chụp ảnh đúng lúc). */
  beforeStrike?: (snapshot: Awaited<ReturnType<BattleDriver['snapshot']>>) => Promise<void>,
  /** Seed của ván — ngẫu nhiên riêng của người chơi tính từ đây. */
  seed = SEED,
): Promise<number> {
  let mostHitsInOneStrike = 0;
  // Ngẫu nhiên riêng của người chơi, tách khỏi trận (như scripts/simCore.ts).
  let rng = seedRng(seed + 1_000_000);
  while ((await game.snapshot()).battle.phase === 'playing') {
    const [{ cast, move }, next] = lookaheadTurn(await game.snapshot(), rng);
    rng = next;
    if (cast) {
      const ready = await game.snapshot();
      expect(canCastSkill(ready.battle, ready.config)).toBe(true);
      await game.castSkill();
      if ((await game.snapshot()).battle.phase !== 'playing') break;
    }
    const before = await game.snapshot();
    await beforeStrike?.(before);
    // F12: quái ma đang vô hình thì nhát chém đi xuyên qua.
    const hidden = before.battle.monsters
      .filter((m) => !canBeHit(m, before.battle, before.config))
      .map((m) => m.id);
    await game.play(move);

    const { lastAttack } = (await game.snapshot()).battle;
    const hits = lastAttack?.hits ?? [];
    expect(hits.filter((hit) => hidden.includes(hit.monsterId))).toEqual([]);
    // B6: nhát chí mạng nhân hệ số cho mọi con trúng.
    // Đợt 5: sát thương vũ khí theo cấu hình thật của trận (vũ khí cấp cao có thể +1 sát thương).
    const multiplier = lastAttack?.crit ? before.config.critMultiplier : 1;
    const weaponDamage = (before.config.weapons[move.weaponIndex]?.damage ?? 0) * multiplier;
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
  const gaps = weaponGapCenters(barButtonCount(before.loadout));
  expect(gaps).toHaveLength(barButtonCount(before.loadout) - 1);

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
  const [gap] = weaponGapCenters(barButtonCount((await game.snapshot()).battle.loadout));
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

test('F06: chơi giỏi thắng màn nào sang màn kế, hạ trùm ở màn cuối là phá đảo, rồi chơi lại từ màn 1', async ({
  page,
}) => {
  // Đi đủ mọi màn (mỗi màn qua màn chuẩn bị chờ 0,5 giây).
  test.setTimeout(FULL_RUN_TIMEOUT_MS);
  const game = new BattleDriver(page);
  await game.seedProfile({ upgrades: FULL_RUN_UPGRADES });
  await game.openBattle(FULL_RUN_SEED);

  let mostHitsInOneStrike = 0;
  // F11: lần đầu thấy đợt quái mới tràn vào (id sau đội hình mở màn) thì chụp ảnh làm bằng chứng.
  let waveSeen = false;
  let ghostShot = false;
  let forestShot = false;
  for (let level = 0; level <= LAST_LEVEL; level++) {
    // Màn mới: đầy máu, cầm vũ khí đầu, đủ lượt và đúng đội hình quái của màn (màn cuối có trùm).
    const { turnLimit, monsters } = levelAt(level, BATTLE_CONFIG);
    const start = (await game.snapshot()).battle;
    expect(start).toMatchObject({
      level,
      phase: 'playing',
      heroHp: FULL_RUN_CONFIG.hero.hp,
      weaponIndex: 0,
      turnsLeft: turnLimit,
    });
    expect(start.monsters.map((m) => m.kind)).toEqual(monsters);
    if (monsters.includes('slimeKing')) {
      await game.advance(LEVEL_DRAWN_MS);
      await page.screenshot({ path: test.info().outputPath('6-man-trum.png') });
    }
    if (monsters.includes('slimeCannon')) {
      await game.advance(LEVEL_DRAWN_MS);
      await page.screenshot({ path: test.info().outputPath('10-man-slime-phao.png') });
    }
    if (monsters.includes('slimeCharger')) {
      await game.advance(LEVEL_DRAWN_MS);
      await page.screenshot({ path: test.info().outputPath('19-man-slime-lao.png') });
    }
    // F15: lần đầu gặp quái rừng và trùm Người Cây thì chụp ảnh làm bằng chứng hình mới.
    if (
      !forestShot &&
      monsters.some((kind) => ['goblin', 'wolf', 'goblinArcher', 'bat'].includes(kind))
    ) {
      forestShot = true;
      await game.advance(LEVEL_DRAWN_MS);
      await page.screenshot({ path: test.info().outputPath('25-quai-rung.png') });
    }
    if (monsters.includes('treant')) {
      await game.advance(LEVEL_DRAWN_MS);
      await page.screenshot({ path: test.info().outputPath(`26-nguoi-cay-man-${level + 1}.png`) });
    }
    if (levelAt(level, BATTLE_CONFIG).splitOpposite) {
      // B2: nửa đầu đội hình ở một phía, nửa sau ở phía đối diện (lệch nửa vòng).
      const half = Math.ceil(start.monsters.length / 2);
      const [first, last] = [start.monsters[0], start.monsters[half]];
      if (!first || !last) throw new Error('Thiếu quái ở một trong hai cụm');
      const gap = Math.abs(first.sector - last.sector) % BATTLE_CONFIG.sectorCount;
      const apart = Math.min(gap, BATTLE_CONFIG.sectorCount - gap);
      const { spread } = levelAt(level, BATTLE_CONFIG);
      expect(apart).toBeGreaterThanOrEqual(BATTLE_CONFIG.sectorCount / 2 - 2 * spread);
      await game.advance(LEVEL_DRAWN_MS);
      await page.screenshot({ path: test.info().outputPath('8-man-hai-phia.png') });
    }

    // B3: lần đầu một Slime Pháo đứng ở vòng bắn (có "!") thì chụp ảnh làm bằng chứng.
    let cannonShot = false;
    mostHitsInOneStrike = Math.max(
      mostHitsInOneStrike,
      await playBestUntilOver(
        game,
        async (snapshot) => {
          // F12: lần đầu Slime Ma vô hình (lượt chẵn) thì chụp ảnh — nó phải hiện mờ.
          const hiddenGhost = snapshot.battle.monsters.some(
            (m) => !canBeHit(m, snapshot.battle, BATTLE_CONFIG),
          );
          if (!ghostShot && hiddenGhost) {
            ghostShot = true;
            await game.advance(300);
            await page.screenshot({ path: test.info().outputPath('20-slime-ma-vo-hinh.png') });
          }
          const newcomers = snapshot.battle.monsters.filter((m) => m.id > monsters.length);
          if (!waveSeen && newcomers.length > 0) {
            waveSeen = true;
            expect(snapshot.battle.nextWave).toBeGreaterThan(0);
            await game.advance(300);
            await page.screenshot({ path: test.info().outputPath('18-dot-quai-moi.png') });
          }
          const aiming = snapshot.battle.monsters.find(
            (m) => m.kind === 'slimeCannon' && willAttack(m, BATTLE_CONFIG),
          );
          if (!aiming || cannonShot) return;
          cannonShot = true;
          expect(aiming.ring).toBeLessThanOrEqual(
            BATTLE_CONFIG.monsterKinds.slimeCannon.shootRing ?? -1,
          );
          // Chờ hết hoạt ảnh quái trượt sang ô mới (180ms) để ảnh đúng vị trí.
          await game.advance(300);
          await page.screenshot({ path: test.info().outputPath('11-slime-phao-ngam.png') });
        },
        FULL_RUN_SEED,
      ),
    );
    if (monsters.includes('slimeCannon')) expect(cannonShot).toBe(true);

    const won = (await game.snapshot()).battle;
    expect(won.phase).toBe('won');
    // F11: thắng = xong nhiệm vụ của màn (không cần giết hết quái).
    const { quest } = levelAt(level, BATTLE_CONFIG);
    if (quest) expect(won.questProgress).toBeGreaterThanOrEqual(quest.count);
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
  // F11: phải có lúc đợt quái mới tràn vào, nếu không luật đợt quái chưa được thử.
  expect(waveSeen).toBe(true);
  // F12: phải có lúc Slime Ma vô hình, nếu không luật quái ma chưa được thử.
  expect(ghostShot).toBe(true);

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
      .filter((m) => willAttack(m, BATTLE_CONFIG))
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

test('Đợt 4: màn Nâng cấp — mua bằng vàng, giá tăng theo cấp, thiếu vàng thì không mua được, vào trận máu tối đa tăng', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.seedProfile({ gold: 35 });
  await game.openLoadout(SEED);
  expect(await game.loadoutSnapshot()).toMatchObject({ level: 0, gold: 35 });

  expect(await game.openUpgrade()).toMatchObject({ gold: 35, upgrades: {} });
  await game.buyUpgrade('hp'); // cấp 1: 10 vàng
  expect(await game.upgradeSnapshot()).toMatchObject({ gold: 25, upgrades: { hp: 1 } });
  await game.buyUpgrade('hp'); // cấp 2: 20 vàng
  expect(await game.upgradeSnapshot()).toMatchObject({ gold: 5, upgrades: { hp: 2 } });
  await game.buyUpgrade('crit'); // cần 10, chỉ có 5: không mua được
  expect(await game.upgradeSnapshot()).toMatchObject({ gold: 5, upgrades: { hp: 2 } });
  await game.advance(50);
  await page.screenshot({ path: test.info().outputPath('23-nang-cap.png') });
  expect(await game.storedProfile()).toMatchObject({ gold: 5, upgrades: { hp: 2 } });

  // "XONG" về màn chuẩn bị đúng màn; vào trận thì máu tối đa +2 mỗi cấp.
  await game.closeUpgrade();
  expect(await game.loadoutSnapshot()).toMatchObject({ level: 0, gold: 5 });
  await game.startBattle();
  const hp = BATTLE_CONFIG.hero.hp + 2 * 2;
  expect((await game.snapshot()).battle.heroHp).toBe(hp);
  await game.advance(50);
  await page.screenshot({ path: test.info().outputPath('24-tran-sau-nang-cap.png') });
});

test('Đợt 3: vàng và màn đã mở khóa được lưu — mở lại game vẫn còn; ?level= vượt màn đã mở thì bị chặn', async ({
  page,
  context,
}) => {
  const game = new BattleDriver(page);
  // Người chơi mới: ?level=5 chưa mở khóa nên vẫn vào màn 1, chưa có vàng (DEBT-011 đã trả).
  await game.open(`/?seed=${SEED}&level=5`);
  expect(await game.loadoutSnapshot()).toMatchObject({ level: 0, gold: 0 });
  await game.startBattle();

  await playBestUntilOver(game);
  const won = (await game.snapshot()).battle;
  expect(won.phase).toBe('won');
  expect(won.gold).toBeGreaterThan(0);
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('21-thang-co-vang.png') });
  expect(await game.storedProfile()).toMatchObject({ gold: won.gold, unlockedLevel: 1 });

  // Chạm đi tiếp: màn chuẩn bị màn 2 hiện đúng tổng vàng.
  await game.advance(RESULT_SCREEN_WAIT_MS);
  await game.tap();
  await game.waitSceneSwitch();
  expect(await game.loadoutSnapshot()).toMatchObject({ level: 1, gold: won.gold });

  // Mở lại game (trang mới, cùng trình duyệt): vào thẳng màn 2 với đúng số vàng.
  const page2 = await context.newPage();
  const reopened = new BattleDriver(page2);
  await reopened.open(`/?seed=${SEED}`);
  expect(await reopened.loadoutSnapshot()).toMatchObject({ level: 1, gold: won.gold });
  await reopened.advance(50);
  await page2.screenshot({ path: test.info().outputPath('22-mo-lai-con-tien-trinh.png') });
});

test('B6: màn chuẩn bị từ màn 3 có hàng skill (Mưa băng chọn sẵn), chọn Cầu lửa thì mang Cầu lửa vào trận', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  // Màn 1–2 chưa có skill.
  await game.openLoadout(SEED);
  expect(await game.waitLoadoutReady()).toMatchObject({
    skills: [],
    loadout: { weapons: [0, 1, 2] },
  });

  const unlock = BATTLE_CONFIG.skillUnlockLevel + 1;
  await game.openLoadout(SEED, unlock);
  const prep = await game.waitLoadoutReady();
  expect(prep).toMatchObject({
    level: unlock - 1,
    skills: ['iceRain', 'fireball'],
    loadout: { weapons: [0, 1, 2], skill: 'iceRain' },
  });
  await page.screenshot({ path: test.info().outputPath('15-chuan-bi-skill.png') });

  await game.chooseSkill('fireball');
  expect((await game.loadoutSnapshot()).loadout.skill).toBe('fireball');
  await game.startBattle();
  const { battle } = await game.snapshot();
  expect(battle).toMatchObject({ skillCharge: 0, loadout: { skill: 'fireball' } });
});

test('B6: skill nạp theo nhát chém, đầy thì bấm — mọi quái mất máu, không tốn lượt; Mưa băng đóng băng đúng 1 lượt', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openLoadout(SEED, BATTLE_CONFIG.skillUnlockLevel + 1);
  await game.startBattle();
  const { chargeTurns, damage } = BATTLE_CONFIG.skills.iceRain;

  // Chưa đầy: chạm ô skill không làm gì.
  const fresh = (await game.snapshot()).battle;
  await game.castSkill();
  expect((await game.snapshot()).battle).toEqual(fresh);

  // Chém tới khi nạp đầy.
  for (let strike = 1; strike <= chargeTurns; strike++) {
    await game.play(bestMove(await game.snapshot()));
    const { battle } = await game.snapshot();
    expect(battle.phase).toBe('playing');
    expect(battle.skillCharge).toBe(strike);
  }
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('16-skill-day.png') });

  const before = (await game.snapshot()).battle;
  expect(canCastSkill(before, BATTLE_CONFIG)).toBe(true);
  await game.castSkill();
  const after = (await game.snapshot()).battle;
  expect(after).toMatchObject({ turnsLeft: before.turnsLeft, skillCharge: 0 });
  expect(after.lastSkill?.hits.map((h) => h.monsterId)).toEqual(before.monsters.map((m) => m.id));
  for (const monster of before.monsters) {
    const now = after.monsters.find((m) => m.id === monster.id);
    if (monster.hp <= damage) expect(now).toBeUndefined();
    else expect(now).toMatchObject({ hp: monster.hp - damage, frozenTurns: 1 });
  }
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('17-mua-bang.png') });

  // Lượt ngay sau: mọi quái đang băng không đánh (máu nhân vật không giảm), hết lượt thì hết băng.
  // Chém trượt cho chắc lượt chạy trọn: chém trúng mà xong nhiệm vụ thì thắng ngay, quái giữ nguyên băng.
  await game.play(missMove(await game.snapshot()));
  const next = (await game.snapshot()).battle;
  expect(next.phase).toBe('playing');
  expect(next.heroHp).toBe(after.heroHp);
  expect(next.monsters.every((m) => m.frozenTurns === undefined)).toBe(true);
});

test('B6: màn chuẩn bị nhớ skill đã chọn qua các màn chưa có skill — phá đảo bằng Cầu lửa, lên lại màn 3 vẫn chọn Cầu lửa', async ({
  page,
}) => {
  test.setTimeout(FULL_RUN_TIMEOUT_MS); // chơi màn cuối rồi màn 1, 2 qua màn chuẩn bị
  const game = new BattleDriver(page);
  await game.seedProfile({
    unlockedLevel: BATTLE_CONFIG.levels.length - 1,
    upgrades: FULL_RUN_UPGRADES,
  });
  await game.openLoadout(FULL_RUN_SEED, BATTLE_CONFIG.levels.length);
  await game.chooseSkill('fireball');
  await game.startBattle();
  await playBestUntilOver(game, undefined, FULL_RUN_SEED);
  expect(isGameCleared((await game.snapshot()).battle, BATTLE_CONFIG)).toBe(true);

  // Phá đảo → màn 1, 2 chưa có skill.
  for (let level = 0; level < BATTLE_CONFIG.skillUnlockLevel; level++) {
    await continueFromResult(game);
    const { battle } = await game.snapshot();
    expect(battle.level).toBe(level);
    expect(battle.loadout.skill).toBeUndefined();
    await playBestUntilOver(game, undefined, FULL_RUN_SEED);
    expect((await game.snapshot()).battle.phase).toBe('won');
  }

  await game.advance(RESULT_SCREEN_WAIT_MS);
  await game.tap();
  await game.waitSceneSwitch();
  const prep = await game.waitLoadoutReady();
  expect(prep).toMatchObject({
    level: BATTLE_CONFIG.skillUnlockLevel,
    loadout: { skill: 'fireball' },
  });
});

/**
 * Đợt 5: seed 34 ở màn 16 — có quái hiếm và bot "Nhìn trước" (hồ sơ nâng cấp như ván chơi liền) hạ được nó
 * rồi thắng (script dò tạm 27/10/2026). Màn 3–8 không có quái hiếm: ngoài loại nhiệm vụ chỉ có slime.
 */
const RARE_SEED = 34;
const RARE_LEVEL = 16;

test('Đợt 5: quái hiếm sáng lên, máu ×2; hạ nó thì (bảo hiểm) chắc rơi vũ khí từ Sử thi — lưu vĩnh viễn, màn chuẩn bị hiện cấp màu', async ({
  page,
}) => {
  test.slow();
  const game = new BattleDriver(page);
  // Đã hụt 3 lần liền và 29 món liền dưới Sử thi: lần này chắc rơi, chắc từ Sử thi trở lên.
  const pity = { dryRareKills: 3, dropsSinceHighTier: 29 };
  await game.seedProfile({
    unlockedLevel: RARE_LEVEL - 1,
    upgrades: FULL_RUN_UPGRADES,
    lootPity: pity,
  });
  await game.openLoadout(RARE_SEED, RARE_LEVEL);
  await game.startBattle();
  const start = (await game.snapshot()).battle;
  const rares = start.monsters.filter((m) => m.rare);
  expect(rares).toHaveLength(1);
  const [rare] = rares;
  if (!rare) throw new Error('Thiếu quái hiếm');
  expect(BATTLE_CONFIG.monsterKinds[rare.kind].canBeRare).toBe(true);
  expect(rare.hp).toBe(BATTLE_CONFIG.monsterKinds[rare.kind].hp * 2);
  await game.advance(LEVEL_DRAWN_MS);
  await page.screenshot({ path: test.info().outputPath('27-quai-hiem.png') });

  await playBestUntilOver(game, undefined, RARE_SEED);
  const end = await game.snapshot();
  expect(end.battle).toMatchObject({ phase: 'won', rareKilled: true });
  // Món rơi đúng luật (logic/loot.ts) và từ Sử thi trở lên nhờ bảo hiểm cấp cao.
  const expected = lootAfterBattle(end.battle, pity, FULL_RUN_CONFIG, LOOT_CONFIG).drop;
  expect(end.drop).toEqual(expected);
  const drop = end.drop;
  if (!drop) throw new Error('Bảo hiểm phải làm rơi đồ');
  expect(drop.tier).toBeGreaterThanOrEqual(LOOT_CONFIG.highTier);
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('28-roi-do.png') });
  expect(await game.storedProfile()).toMatchObject({
    weaponTiers: { [drop.weapon]: drop.tier },
    lootPity: { dryRareKills: 0, dropsSinceHighTier: 0 },
  });

  // Chạm đi tiếp: màn chuẩn bị màn sau — vũ khí vừa rơi hiện cấp màu.
  await game.advance(RESULT_SCREEN_WAIT_MS);
  await game.tap();
  await game.waitSceneSwitch();
  const prep = await game.waitLoadoutReady();
  expect(prep.tiers[drop.weapon]).toBe(drop.tier);
  await page.screenshot({ path: test.info().outputPath('29-tui-do.png') });
});

test('Đợt 5: vũ khí có cấp màu — màn chuẩn bị và thanh vũ khí ghi tên cấp; cấp Thần có sét quanh nút', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  // Kiếm Thần, Giáo Sử thi, Cung Hiếm, Rìu chưa rơi.
  await game.seedProfile({ unlockedLevel: 2, weaponTiers: { 0: 5, 1: 3, 2: 2 } });
  await game.openLoadout(SEED, 3);
  const prep = await game.waitLoadoutReady();
  expect(prep.tiers).toEqual([5, 3, 2, 0]);
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('30-cap-vu-khi.png') });
  await game.startBattle();
  await game.advance(LEVEL_DRAWN_MS);
  await page.screenshot({ path: test.info().outputPath('31-thanh-vu-khi-cap.png') });
});

test('Đợt 6: cửa hàng — mua Giáo Hiếm 25 vàng (mua thêm thì cộng dồn), thiếu vàng không mua được; màn chuẩn bị ghi số trận còn dùng; mang vào trận thì trừ 1 trận', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.seedProfile({ gold: 60, unlockedLevel: 2 });
  await game.openLoadout(SEED, 3);
  expect(await game.openShop()).toMatchObject({ gold: 60, rentals: {} });

  const spear = 1;
  await game.buyFromShop(spear);
  expect(await game.shopSnapshot()).toMatchObject({ gold: 35, rentals: { [spear]: 5 } });
  await game.buyFromShop(spear);
  expect(await game.shopSnapshot()).toMatchObject({ gold: 10, rentals: { [spear]: 10 } });
  // Còn 10 vàng: mua Kiếm (25) không được, không trừ gì.
  await game.buyFromShop(0);
  expect(await game.shopSnapshot()).toMatchObject({ gold: 10, rentals: { [spear]: 10 } });
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('32-cua-hang.png') });
  expect(await game.storedProfile()).toMatchObject({ gold: 10, rentals: { [spear]: 10 } });

  // "XONG" về màn chuẩn bị: Giáo dùng cấp Hiếm.
  await game.closeUpgrade();
  const prep = await game.waitLoadoutReady();
  expect(prep.tiers[spear]).toBe(SHOP_CONFIG.tier);
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('33-mon-thue.png') });

  // Vào trận: Giáo cộng chỉ số cấp Hiếm; hết trận trừ 1 trận.
  await game.startBattle();
  const { config } = await game.snapshot();
  expect(config.weapons[spear]?.tier).toBe(SHOP_CONFIG.tier);
  await playBestUntilOver(game);
  expect((await game.snapshot()).battle.phase).toBe('won');
  expect((await game.storedProfile())?.rentals).toEqual({ [spear]: 9 });
});
