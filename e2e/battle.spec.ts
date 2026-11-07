// F01–F06 — Trận đấu: mở game → đổi vũ khí → chạm sân để chém → thắng/thua → sang màn / chơi lại.
// F18 đợt D: mở game là Bản đồ; mỗi lần hết màn về Bản đồ với bảng trước trận của màn chơi tiếp mở sẵn.
import { expect, test } from '@playwright/test';
import type { BattleSnapshot } from '../src/features/battle';
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
  UPGRADE_CONFIG,
} from '../src/features/battle/logic/battleConfig';
import { lootAfterBattle } from '../src/features/battle/logic/loot';
import { withUpgrades } from '../src/features/battle/logic/upgrades';
import {
  barButtonCount,
  WEAPON_BAR,
  weaponButtonRects,
} from '../src/features/battle/view/battleLayout';
import { levelNodeRect, PREBATTLE_LAYOUT } from '../src/features/battle/view/mapLayout';
import { PROFILE_KEY } from '../src/features/profile/logic/profileConfig';
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
 * không còn thắng đủ thì dò lại seed và ghi lý do trong PR. F19 PR D (03/11/2026): trùm Người Cây có vỏ cứng — seed 1
 * thua màn 20 với Cầu lửa; seed 6 là seed nhỏ nhất thắng đủ cả hai ván (script dò tạm `.cache/f19-seed-search.ts`,
 * chơi y như game: đồ rơi theo loài, món có hạn). F20 PR B (07/11/2026): trùm đứng sau trong combo, màn 10 còn 10 lượt —
 * seed 6 thua màn 10; seed 4 là seed nhỏ nhất thắng đủ cả hai ván (cùng script, luật F20: cấp màu vĩnh viễn).
 */
const FULL_RUN_SEED = 4;
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
    // F19: quái vỏ cứng (trùm) đứng trước thứ tự combo tối thiểu, hay quái đang có khiên của Pháp sư, không mất máu.
    const monsterOf = (id: number) => before.battle.monsters.find((m) => m.id === id);
    const blocked = (id: number, order: number) => {
      const monster = monsterOf(id);
      if (!monster) return false;
      return (
        monster.shield === true ||
        order < (before.config.monsterKinds[monster.kind].minComboOrder ?? 1)
      );
    };
    expect(hits.map((hit) => hit.damage)).toEqual(
      hits.map((hit, i) => (blocked(hit.monsterId, i + 1) ? 0 : weaponDamage * (i + 1))),
    );
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
  expect((await game.waitPrebattleReady()).level).toBe(0);
});

test('B2: mang Rìu vào trận thì cầm Rìu (không tốn lượt), chém bằng Rìu đúng vùng hai nêm', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openPrebattle(SEED);
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

test('Đợt C (F18): mỗi quái có thanh máu ghi đúng máu hiện tại, kể cả sau khi trúng đòn', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);
  const hpOf = (snapshot: BattleSnapshot) =>
    snapshot.battle.monsters.map((m) => ({ id: m.id, hp: m.hp })).sort((a, b) => a.id - b.id);
  const barsOf = (snapshot: BattleSnapshot) => [...snapshot.hpBars].sort((a, b) => a.id - b.id);

  const before = await game.snapshot();
  expect(barsOf(before)).toEqual(hpOf(before));
  await game.play(bestMove(before));
  await game.advance(400); // quái bị hạ teo lại rồi biến mất
  const after = await game.snapshot();
  expect(barsOf(after)).toEqual(hpOf(after));
  await page.screenshot({ path: test.info().outputPath('35-thanh-mau.png') });
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

test('B4/F18: mở game, bảng trước trận màn 1 — chọn Rìu thay Kiếm, vào trận mang đúng bộ đó, sang màn sau vẫn chọn sẵn', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openPrebattle(SEED);
  const axeIndex = BATTLE_CONFIG.weapons.findIndex((w) => w.twoSided);
  const prep = await game.prebattleSnapshot();
  expect(prep.level).toBe(0);
  expect(prep.loadout).toEqual({ weapons: [0, 1, 2] });
  // Màn Vũ khí: lưới có đủ 4 vũ khí (Kiếm, Giáo, Cung, Rìu); màn 1 chưa có skill.
  const weapons = await game.openWeapons();
  expect(weapons.cards).toEqual([0, 1, 2, 3].map((weapon) => ({ kind: 'weapon', weapon })));
  await game.backToPrebattle();
  await game.advance(50);
  await page.screenshot({ path: test.info().outputPath('12-chuan-bi.png') });

  await game.chooseWeapon(axeIndex);
  expect((await game.waitPrebattleReady()).loadout).toEqual({ weapons: [axeIndex, 1, 2] });
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
  const next = await game.prebattleSnapshot();
  expect(next).toMatchObject({ level: 1, loadout: { weapons: [axeIndex, 1, 2] }, canTap: false });

  // Chạm đúp ở màn kết quả: chạm thứ hai rơi đúng chỗ nút chơi của bảng trước trận lúc Bản đồ vừa mở —
  // không được vào trận (chống chạm nhầm).
  const { play } = PREBATTLE_LAYOUT;
  await game.tapAt(play.x + play.width / 2, play.y + play.height / 2);
  await game.waitSceneSwitch();
  expect((await game.prebattleSnapshot()).level).toBe(1);
});

test('B4/F18: ?level=4 mở thẳng bảng trước trận màn 4 (thử tay / E2E nhanh), vào trận đúng màn 4', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openPrebattle(SEED, 4);
  expect((await game.waitPrebattleReady()).level).toBe(3);
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
  await game.openPrebattle(SEED);
  expect(await game.waitPrebattleReady()).toMatchObject({ level: 0, gold: 35 });

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

  // Chạm CHƠI ở thanh dưới về bảng trước trận đúng màn; vào trận thì máu tối đa +2 mỗi cấp.
  await game.closeUpgrade();
  expect(await game.waitPrebattleReady()).toMatchObject({ level: 0, gold: 5 });
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
  expect(await game.waitPrebattleReady()).toMatchObject({ level: 0, gold: 0 });
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
  expect(await game.waitPrebattleReady()).toMatchObject({ level: 1, gold: won.gold });

  // Mở lại game (trang mới, cùng trình duyệt): vào thẳng màn 2 với đúng số vàng.
  const page2 = await context.newPage();
  const reopened = new BattleDriver(page2);
  await reopened.open(`/?seed=${SEED}`);
  expect(await reopened.waitPrebattleReady()).toMatchObject({ level: 1, gold: won.gold });
  await reopened.advance(50);
  await page2.screenshot({ path: test.info().outputPath('22-mo-lai-con-tien-trinh.png') });
});

test('Đợt B (F18): đồ đang mang được lưu — chọn Rìu, mở lại game thì màn chuẩn bị vẫn chọn Rìu', async ({
  page,
  context,
}) => {
  const game = new BattleDriver(page);
  await game.openPrebattle(SEED);
  const axeIndex = BATTLE_CONFIG.weapons.findIndex((w) => w.twoSided);
  await game.chooseWeapon(axeIndex);
  expect((await game.storedProfile())?.loadout).toEqual({
    weapons: ['Rìu', 'Giáo', 'Cung'],
    skill: null,
  });

  // Mở lại game (trang mới, cùng trình duyệt): Rìu vẫn được chọn, vào trận cầm Rìu.
  const reopened = new BattleDriver(await context.newPage());
  await reopened.open(`/?seed=${SEED}`);
  expect((await reopened.waitPrebattleReady()).loadout).toEqual({ weapons: [axeIndex, 1, 2] });
  await reopened.startBattle();
  expect((await reopened.snapshot()).battle.weaponIndex).toBe(axeIndex);
});

test('Đợt B (F18): chơi lại màn đã qua không nhận vàng — đã mở tới màn 3, chơi lại màn 1 và thắng: vàng giữ nguyên', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.seedProfile({ gold: 30, unlockedLevel: 2 });
  await game.open(`/?seed=${SEED}&level=1`);
  expect(await game.waitPrebattleReady()).toMatchObject({ level: 0, gold: 30 });
  await game.startBattle();
  expect((await game.snapshot()).replay).toBe(true);
  await playBestUntilOver(game);
  const { battle } = await game.snapshot();
  expect(battle.phase).toBe('won');
  expect(battle.gold).toBeGreaterThan(0); // có nhặt vàng trong trận, nhưng không được cộng
  expect(await game.storedProfile()).toMatchObject({ gold: 30, unlockedLevel: 2 });
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('34-choi-lai-khong-vang.png') });
});

test('Đợt D (F18): mở game là Bản đồ — 20 nút, màn 1 đang tới, còn lại chưa mở; chạm màn chưa mở không có gì', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.open(`/?seed=${SEED}`);
  const map = await game.waitMapReady();
  expect(map.popup).toBeNull();
  expect(map.levels).toEqual(['current', ...Array.from({ length: 19 }, () => 'locked')]);
  await page.screenshot({ path: test.info().outputPath('36-ban-do.png') });
  await game.tapLevel(2);
  expect((await game.mapSnapshot()).popup).toBeNull();
});

test('Đợt D (F18): CHƠI mở bảng trước trận màn đang tới — đúng nhiệm vụ, số lượt, quái sẽ gặp; X đóng bảng', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.open(`/?seed=${SEED}`);
  const prep = await game.waitPrebattleReady();
  expect(prep).toMatchObject({
    level: 0,
    replay: false,
    turns: LEVEL_1.turnLimit,
    quest: LEVEL_1.quest ?? null,
    monsterKinds: [...new Set([...LEVEL_1.monsters, ...(LEVEL_1.waves ?? []).flat()])],
  });
  await game.advance(50);
  await page.screenshot({ path: test.info().outputPath('37-bang-truoc-tran.png') });
  await game.closePrebattle();
  expect((await game.mapSnapshot()).popup).toBeNull();
});

test('Đợt D (F18): thắng màn 1 → về Bản đồ, bảng màn 2 mở sẵn; màn 1 hiện đã qua, chạm màn 1 thì bảng ghi chơi lại', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openBattle(SEED);
  await playBestUntilOver(game);
  expect((await game.snapshot()).battle.phase).toBe('won');
  await game.advance(RESULT_SCREEN_WAIT_MS);
  await page.screenshot({ path: test.info().outputPath('38-ket-qua.png') });
  await game.tap();
  await game.waitSceneSwitch();
  const map = await game.waitMapReady();
  expect(map.popup?.level).toBe(1);
  expect(map.levels.slice(0, 3)).toEqual(['cleared', 'current', 'locked']);
  await game.closePrebattle();
  await game.tapLevel(0);
  expect(await game.prebattleSnapshot()).toMatchObject({ level: 0, replay: true });
  await page.screenshot({ path: test.info().outputPath('39-choi-lai.png') });
});

test('Đợt D (F18): chạm đúp nút chơi của bảng trước trận chỉ vào một trận', async ({ page }) => {
  const game = new BattleDriver(page);
  await game.openPrebattle(SEED);
  const { play } = PREBATTLE_LAYOUT;
  await game.tapAt(play.x + play.width / 2, play.y + play.height / 2);
  await game.tapAt(play.x + play.width / 2, play.y + play.height / 2);
  await game.waitSceneSwitch();
  const { battle } = await game.snapshot();
  expect(battle).toMatchObject({ level: 0, turnsLeft: LEVEL_1.turnLimit });
  expect(battle.lastAttack).toBeNull();
});

test('Đợt D (F18): chạm đúp nút màn 2 trên bản đồ chỉ mở bảng, không lọt vào nút chơi của bảng', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.seedProfile({ unlockedLevel: 1 });
  await game.open(`/?seed=${SEED}`);
  await game.waitMapReady();
  // Điểm nằm trong vùng chạm của nút màn 2 và cũng trong nút chơi của bảng sẽ bật lên.
  const node = levelNodeRect(1, true);
  const { play } = PREBATTLE_LAYOUT;
  const x = Math.max(node.x, play.x) + 4;
  const y = Math.max(node.y, play.y) + 4;
  expect(x).toBeLessThan(Math.min(node.x + node.width, play.x + play.width));
  await game.tapAt(x, y);
  await game.advance(150);
  await game.tapAt(x, y);
  await game.waitSceneSwitch();
  expect((await game.mapSnapshot()).popup?.level).toBe(1);
});

test('Đợt D (F18): bộ nhớ bị chặn — thắng màn 1 vẫn sang được bảng màn 2', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem = () => {
      throw new Error('bộ nhớ bị chặn');
    };
  });
  const game = new BattleDriver(page);
  await game.openBattle(SEED);
  await playBestUntilOver(game);
  expect((await game.snapshot()).battle.phase).toBe('won');
  await game.advance(RESULT_SCREEN_WAIT_MS);
  await game.tap();
  await game.waitSceneSwitch();
  expect((await game.waitMapReady()).popup?.level).toBe(1);
});

test('Đợt D (F18): bộ nhớ trình duyệt bị chặn — chọn Rìu ở màn Vũ khí vẫn mang Rìu vào trận', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem = () => {
      throw new Error('bộ nhớ bị chặn');
    };
  });
  const game = new BattleDriver(page);
  await game.openPrebattle(SEED);
  const axeIndex = BATTLE_CONFIG.weapons.findIndex((w) => w.twoSided);
  await game.chooseWeapon(axeIndex);
  expect((await game.prebattleSnapshot()).loadout.weapons).toContain(axeIndex);
  await game.startBattle();
  expect((await game.snapshot()).battle.weaponIndex).toBe(axeIndex);
});

test('Đợt D (F18): màn Vũ khí chỉ có thẻ skill từ màn mở skill', async ({ page }) => {
  const game = new BattleDriver(page);
  await game.openPrebattle(SEED);
  expect((await game.openWeapons()).cards.some((c) => c.kind === 'skill')).toBe(false);
  await game.openPrebattle(SEED, BATTLE_CONFIG.skillUnlockLevel + 1);
  const weapons = await game.openWeapons();
  // F20: chưa phá đảo thì chỉ có Mưa băng (Cầu lửa là phần thưởng phá đảo).
  expect(weapons.cards.filter((c) => c.kind === 'skill')).toEqual([
    { kind: 'skill', skill: 'iceRain' },
  ]);
  await game.advance(50);
  await page.screenshot({ path: test.info().outputPath('40-man-vu-khi.png') });
});

test('F20: skill là phần thưởng — màn 1–10 không có hàng skill; màn 11 chỉ có Mưa băng; đã phá đảo thì chọn được Cầu lửa và mang vào trận', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  // Màn 1 chưa có skill.
  await game.openPrebattle(SEED);
  expect(await game.waitPrebattleReady()).toMatchObject({
    skills: [],
    loadout: { weapons: [0, 1, 2] },
  });
  const unlock = BATTLE_CONFIG.skillUnlockLevel + 1;
  expect(unlock).toBe(11);
  // Màn 11 (hồ sơ đã qua 10 màn): hạ trùm màn 10 rồi — có Mưa băng, chọn sẵn; chưa phá đảo nên chưa có Cầu lửa.
  await game.openPrebattle(SEED, unlock);
  expect(await game.waitPrebattleReady()).toMatchObject({
    level: unlock - 1,
    skills: ['iceRain'],
    loadout: { weapons: [0, 1, 2], skill: 'iceRain' },
  });
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('15-chuan-bi-skill.png') });
  // Màn 10 (trùm): chưa có skill.
  await game.openPrebattle(SEED, unlock - 1);
  expect((await game.waitPrebattleReady()).skills).toEqual([]);

  // Đã phá đảo: có thêm Cầu lửa, chọn được và mang vào trận.
  await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (raw)
      window.localStorage.setItem(key, JSON.stringify({ ...JSON.parse(raw), clearedAll: true }));
  }, PROFILE_KEY);
  await game.openPrebattle(SEED, unlock);
  expect((await game.waitPrebattleReady()).skills).toEqual(['iceRain', 'fireball']);
  await game.chooseSkill('fireball');
  expect((await game.waitPrebattleReady()).loadout.skill).toBe('fireball');
  await game.startBattle();
  const { battle } = await game.snapshot();
  expect(battle).toMatchObject({ skillCharge: 0, loadout: { skill: 'fireball' } });
});

test('B6: skill nạp theo nhát chém, đầy thì bấm — mọi quái mất máu, không tốn lượt; Mưa băng đóng băng đúng 1 lượt', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openPrebattle(SEED, BATTLE_CONFIG.skillUnlockLevel + 1);
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

test('F20: phá đảo (bằng Mưa băng) thì mở Cầu lửa; chọn Cầu lửa ở màn 11, sang màn chưa có skill rồi về màn 11 vẫn chọn Cầu lửa', async ({
  page,
}) => {
  test.setTimeout(FULL_RUN_TIMEOUT_MS); // chơi màn cuối rồi màn 1 qua màn chuẩn bị
  const game = new BattleDriver(page);
  await game.seedProfile({
    unlockedLevel: BATTLE_CONFIG.levels.length - 1,
    upgrades: FULL_RUN_UPGRADES,
  });
  await game.openPrebattle(FULL_RUN_SEED, BATTLE_CONFIG.levels.length);
  // Chưa phá đảo: màn cuối chỉ có Mưa băng.
  expect(await game.waitPrebattleReady()).toMatchObject({
    skills: ['iceRain'],
    loadout: { skill: 'iceRain' },
  });
  await game.startBattle();
  await playBestUntilOver(game, undefined, FULL_RUN_SEED);
  expect(isGameCleared((await game.snapshot()).battle, BATTLE_CONFIG)).toBe(true);
  expect(await game.storedProfile()).toMatchObject({ clearedAll: true });

  // Phá đảo → chơi lại từ màn 1 (chưa có skill).
  await continueFromResult(game);
  const { battle } = await game.snapshot();
  expect(battle.level).toBe(0);
  expect(battle.loadout.skill).toBeUndefined();

  // Màn 11 giờ có Cầu lửa; chọn Cầu lửa.
  const unlock = BATTLE_CONFIG.skillUnlockLevel + 1;
  await game.openPrebattle(FULL_RUN_SEED, unlock);
  expect((await game.waitPrebattleReady()).skills).toEqual(['iceRain', 'fireball']);
  await game.chooseSkill('fireball');
  expect((await game.waitPrebattleReady()).loadout.skill).toBe('fireball');
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('18-cau-lua-mo.png') });

  // Sang màn 2 (chưa có skill) rồi về màn 11: vẫn chọn Cầu lửa.
  await game.openPrebattle(FULL_RUN_SEED, 2);
  expect((await game.waitPrebattleReady()).loadout.skill).toBeUndefined();
  await game.openPrebattle(FULL_RUN_SEED, unlock);
  expect((await game.waitPrebattleReady()).loadout.skill).toBe('fireball');
});

/**
 * Đợt 5: seed 34 ở màn 17 — có quái hiếm (Pháp sư yêu tinh) và bot "Nhìn trước" (hồ sơ nâng cấp như ván chơi
 * liền) hạ được nó rồi thắng (F19 PR E dò lại sau khi sinh lại màn 13–19, `.cache/f19-rare-seed.ts`; màn 16 mới
 * không seed nào trong 1–100 vừa thắng vừa hạ quái hiếm). Màn 3–8 không có quái hiếm: ngoài loại nhiệm vụ chỉ có slime.
 */
const RARE_SEED = 34;
const RARE_LEVEL = 17;

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
  await game.openPrebattle(RARE_SEED, RARE_LEVEL);
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
  // F19: trận ghi loài quái hiếm đã hạ — món rơi theo loài.
  expect(end.battle).toMatchObject({ phase: 'won', rareKilled: rare.kind });
  // Món rơi đúng luật (logic/loot.ts) và từ Sử thi trở lên nhờ bảo hiểm cấp cao.
  const expected = lootAfterBattle(end.battle, pity, FULL_RUN_CONFIG, LOOT_CONFIG).drop;
  expect(end.drop).toEqual(expected);
  const drop = end.drop;
  if (!drop) throw new Error('Bảo hiểm phải làm rơi đồ');
  expect(drop.tier).toBeGreaterThanOrEqual(LOOT_CONFIG.highTier);
  // F19: đúng vũ khí của loài.
  expect(BATTLE_CONFIG.weapons[drop.weapon]?.name).toBe(BATTLE_CONFIG.monsterKinds[rare.kind].drop);
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
  const prep = await game.waitPrebattleReady();
  expect(prep.tiers[drop.weapon]).toBe(drop.tier);
  await page.screenshot({ path: test.info().outputPath('29-tui-do.png') });
});

test('Đợt 5: vũ khí có cấp màu — màn chuẩn bị và thanh vũ khí ghi tên cấp; cấp Thần có sét quanh nút', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  // Kiếm Thần, Giáo Sử thi, Cung Hiếm, Rìu chưa rơi.
  await game.seedProfile({ unlockedLevel: 2, weaponTiers: { 0: 5, 1: 3, 2: 2 } });
  await game.openPrebattle(SEED, 3);
  const prep = await game.waitPrebattleReady();
  // F19: 7 vũ khí — Rìu, Búa, Lưỡi hái, Nỏ chưa rơi.
  expect(prep.tiers).toEqual([5, 3, 2, 0, 0, 0, 0]);
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('30-cap-vu-khi.png') });
  await game.startBattle();
  await game.advance(LEVEL_DRAWN_MS);
  await page.screenshot({ path: test.info().outputPath('31-thanh-vu-khi-cap.png') });
});

test('F19: vũ khí mới — đã qua màn 14 thì màn Vũ khí có Búa, Lưỡi hái (chưa có Nỏ); mang Lưỡi hái chém thì quái ở mép bị kéo vào lát giữa', async ({
  page,
}) => {
  test.slow();
  const game = new BattleDriver(page);
  const scythe = BATTLE_CONFIG.weapons.findIndex((w) => w.push === 'gather');
  const hammer = BATTLE_CONFIG.weapons.findIndex((w) => (w.stunTurns ?? 0) > 0);
  const crossbow = BATTLE_CONFIG.weapons.findIndex((w) => w.name === 'Nỏ');
  // Đã thắng 14 màn: Lưỡi hái (mốc sau màn 12) và Búa (sau màn 14) mở, Nỏ (sau màn 16) chưa.
  await game.openPrebattle(SEED, 15);
  const weapons = await game.openWeapons();
  const owned = weapons.cards.flatMap((c) => (c.kind === 'weapon' ? [c.weapon] : []));
  expect(owned).toEqual([0, 1, 2, 3, hammer, scythe]);
  expect(owned).not.toContain(crossbow);
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('41-vu-khi-moi.png') });
  await game.backToPrebattle();

  await game.chooseWeapon(scythe);
  expect((await game.waitPrebattleReady()).loadout.weapons).toEqual([0, scythe, 2]);
  await game.startBattle();

  // Chém trượt cho quái tiến vào tầm Lưỡi hái (vòng 2–3), tới khi có một con đứng một mình ở mép vùng đánh.
  const { sectorCount } = BATTLE_CONFIG;
  const wrap = (s: number) => ((s % sectorCount) + sectorCount) % sectorCount;
  for (let turn = 0; turn < 8; turn++) {
    const before = await game.snapshot();
    expect(before.battle.phase).toBe('playing');
    const ids = (aim: number) => hitIds(before, { weaponIndex: scythe, sector: aim });
    const target = before.battle.monsters.find((m) => {
      const aim = wrap(m.sector + 1);
      const centerFree = !before.battle.monsters.some((o) => o.sector === aim && o.ring === m.ring);
      return m.hp > 1 && centerFree && ids(aim).length === 1 && ids(aim)[0] === m.id;
    });
    if (!target) {
      await game.play(missMove(before));
      continue;
    }
    const aim = wrap(target.sector + 1);
    await game.play({ weaponIndex: scythe, sector: aim });
    const after = await game.snapshot();
    expect(after.battle.lastAttack?.hits.map((h) => h.monsterId)).toEqual([target.id]);
    expect(after.battle.monsters.find((m) => m.id === target.id)).toMatchObject({
      sector: aim,
      ring: target.ring,
    });
    await game.advance(300);
    await page.screenshot({ path: test.info().outputPath('42-luoi-hai-gom.png') });
    return;
  }
  throw new Error('Không có lúc nào quái đứng một mình ở mép vùng Lưỡi hái');
});

/**
 * F19: seed 143 ở màn 17 — quái hiếm là Yêu tinh, bot "Nhìn trước" hạ được rồi thắng; bảo hiểm chắc rơi
 * (không ép cấp cao) ra Kiếm Tốt (script dò tạm 03/11/2026, `.cache/f19-rare-seed.ts`).
 */
const UPGRADE_DROP_SEED = 143;

test('F20: quái hiếm rơi đúng vũ khí của loài; món cao hơn cấp đang có thì vũ khí lên cấp vĩnh viễn — màn Vũ khí ghi cấp mới', async ({
  page,
}) => {
  test.slow();
  const game = new BattleDriver(page);
  // Đã hụt 3 lần liền: lần này chắc rơi; không ép cấp cao.
  const pity = { dryRareKills: 3, dropsSinceHighTier: 0 };
  await game.seedProfile({
    unlockedLevel: RARE_LEVEL - 1,
    upgrades: FULL_RUN_UPGRADES,
    lootPity: pity,
  });
  await game.openPrebattle(UPGRADE_DROP_SEED, RARE_LEVEL);
  await game.startBattle();
  const rare = (await game.snapshot()).battle.monsters.find((m) => m.rare);
  if (!rare) throw new Error('Thiếu quái hiếm');
  await playBestUntilOver(game, undefined, UPGRADE_DROP_SEED);
  const end = await game.snapshot();
  expect(end.battle).toMatchObject({ phase: 'won', rareKilled: rare.kind });
  const drop = end.drop;
  expect(drop).toEqual(lootAfterBattle(end.battle, pity, FULL_RUN_CONFIG, LOOT_CONFIG).drop);
  if (!drop || drop.tier < 1) throw new Error('Seed này phải rơi món trên cấp Thường');
  expect(BATTLE_CONFIG.weapons[drop.weapon]?.name).toBe(BATTLE_CONFIG.monsterKinds[rare.kind].drop);
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('43-roi-len-cap.png') });
  // F20: món rơi luôn vĩnh viễn — ghi thẳng cấp của vũ khí, không có số trận.
  const stored = await game.storedProfile();
  expect(stored?.weaponTiers).toEqual({ [drop.weapon]: drop.tier });
  expect(stored).not.toHaveProperty('rentals');

  // Màn Vũ khí: thẻ món đó mang cấp mới.
  await game.advance(RESULT_SCREEN_WAIT_MS);
  await game.tap();
  await game.waitSceneSwitch();
  const weapons = await game.openWeapons();
  expect(weapons.tiers[drop.weapon]).toBe(drop.tier);
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('44-the-cap-moi.png') });
});

test('F19: món rơi không mạnh hơn đồ đang có thì đổi vàng — màn kết quả ghi "đã có", vàng cộng thêm', async ({
  page,
}) => {
  test.slow();
  const game = new BattleDriver(page);
  // Seed 34 với bảo hiểm chắc rơi (không ép cấp cao): Giáo Thường — món Thường của vũ khí đã có là thừa, đổi vàng.
  const pity = { dryRareKills: 3, dropsSinceHighTier: 0 };
  await game.seedProfile({
    unlockedLevel: RARE_LEVEL - 1,
    upgrades: FULL_RUN_UPGRADES,
    lootPity: pity,
  });
  await game.openPrebattle(RARE_SEED, RARE_LEVEL);
  await game.startBattle();
  await playBestUntilOver(game, undefined, RARE_SEED);
  const end = await game.snapshot();
  const drop = end.drop;
  expect(drop).toEqual(lootAfterBattle(end.battle, pity, FULL_RUN_CONFIG, LOOT_CONFIG).drop);
  if (!drop) throw new Error('Bảo hiểm phải làm rơi đồ');
  expect(drop.tier).toBe(0);
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('45-mon-thua-doi-vang.png') });
  const salvage = LOOT_CONFIG.salvageGold[drop.tier] ?? 0;
  expect(salvage).toBeGreaterThan(0);
  expect(await game.storedProfile()).toMatchObject({
    gold: end.battle.gold + salvage,
    weaponTiers: {},
  });
});

test('F20: lên cấp vũ khí bằng vàng — thẻ chọn "Vũ khí": Kiếm Thường → Tốt (35) → Hiếm (70), từ Hiếm hết mua bằng vàng; vào trận Kiếm dài thêm 1 vòng, rộng thêm 2 lát', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.seedProfile({ gold: 110, unlockedLevel: 2 });
  await game.openPrebattle(SEED, 3);
  await game.openUpgrade();
  const tab = await game.openUpgradeTab('weapons');
  expect(tab).toMatchObject({ tab: 'weapons', weapons: [0, 1, 2, 3], weaponTiers: {} });
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('46-len-cap-vu-khi.png') });

  await game.buyTierUp(0);
  expect(await game.upgradeSnapshot()).toMatchObject({ gold: 75, weaponTiers: { 0: 1 } });
  await game.buyTierUp(0);
  expect(await game.upgradeSnapshot()).toMatchObject({ gold: 5, weaponTiers: { 0: 2 } });
  // Từ Hiếm không mua bằng vàng được nữa (cấp cao hơn chỉ rơi từ quái hiếm): chạm chỗ nút cũ không gì.
  await game.buyTierUp(0);
  expect(await game.upgradeSnapshot()).toMatchObject({ gold: 5, weaponTiers: { 0: 2 } });
  // Thiếu vàng (Giáo lên Tốt cần 35): không mua được.
  await game.buyTierUp(1);
  expect(await game.upgradeSnapshot()).toMatchObject({ gold: 5, weaponTiers: { 0: 2 } });
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('47-kiem-hiem.png') });
  expect(await game.storedProfile()).toMatchObject({ gold: 5, weaponTiers: { 0: 2 } });

  await game.closeUpgrade();
  const prep = await game.waitPrebattleReady();
  expect(prep.tiers[0]).toBe(2);
  await game.startBattle();
  const { config } = await game.snapshot();
  const base = BATTLE_CONFIG.weapons[0];
  expect(config.weapons[0]).toMatchObject({
    maxRing: (base?.maxRing ?? 0) + 1,
    widthSectors: (base?.widthSectors ?? 0) + 2,
    damage: base?.damage,
  });
  expect(config.weapons[1]).toEqual(BATTLE_CONFIG.weapons[1]);
  await game.advance(LEVEL_DRAWN_MS);
  await page.screenshot({ path: test.info().outputPath('47b-kiem-hiem-trong-tran.png') });
});

test('F19/F20: trùm Người Cây — bắn trúng mình nó thì bị vỏ cứng chặn (không mất máu); nó gọi Yêu tinh ra sát bên', async ({
  page,
}) => {
  const game = new BattleDriver(page);
  await game.openPrebattle(SEED, 10);
  await game.startBattle();
  const start = await game.snapshot();
  const treant = start.battle.monsters.find((m) => m.kind === 'treant');
  if (!treant) throw new Error('Màn 10 phải có Người Cây');
  await game.advance(LEVEL_DRAWN_MS);
  await page.screenshot({ path: test.info().outputPath('48-trum-vo-cung.png') });

  // Cung rộng 1 lát: bắn đúng lát của trùm khi chỉ mình nó ở đó — nó là con thứ 1 của combo.
  const bow = BATTLE_CONFIG.weapons.findIndex((w) => w.name === 'Cung');
  const move = { weaponIndex: bow, sector: treant.sector };
  expect(hitIds(start, move)).toEqual([treant.id]);
  await game.play(move);
  const blocked = await game.snapshot();
  expect(blocked.battle.lastAttack?.hits).toEqual([
    { monsterId: treant.id, damage: 0, killed: false },
  ]);
  expect(blocked.battle.monsters.find((m) => m.id === treant.id)?.hp).toBe(treant.hp);
  await page.screenshot({ path: test.info().outputPath('49-trum-chan.png') });

  // Trùm gọi Yêu tinh (id mới) ra ô trống sát bên — cứ 3 lượt, hoặc ngay khi quanh nó trống (F20, có thể ngay lượt
  // đầu). Xét ngay sau lượt gọi (lượt sau Yêu tinh tự đi): chém trượt tới khi có quái mới, tối đa hết lượt thứ 3.
  const isNew = (m: { id: number }) => m.id >= (start.battle.nextId ?? 0);
  let after = blocked;
  for (let turn = 1; turn < 3 && !after.battle.monsters.some(isNew); turn++) {
    await game.play(missMove(after));
    after = await game.snapshot();
  }
  const boss = after.battle.monsters.find((m) => m.id === treant.id);
  const summoned = after.battle.monsters.filter(isNew);
  expect(summoned.length).toBeGreaterThan(0);
  for (const goblin of summoned) {
    expect(goblin.kind).toBe('goblin');
    expect(Math.abs(goblin.ring - (boss?.ring ?? 0))).toBeLessThanOrEqual(1);
  }
  await game.advance(300);
  await page.screenshot({ path: test.info().outputPath('50-trum-goi-quai.png') });
});

/**
 * F19 PR E: mỗi màn giới thiệu quái mới (13 Nấm nổ, 14 Rùa gai, 15 Pháp sư yêu tinh, 16 Tổ nhện) — mở màn, chơi
 * vài nhát bằng bot "Nhìn trước", chụp ảnh; quái mới phải có mặt và luật của nó phải hiện ra trên sân.
 */
test('F19: quái mới — màn 13–16 mỗi màn có loài mới; Pháp sư phủ khiên, Tổ nhện đẻ Nhện con', async ({
  page,
}) => {
  test.slow();
  const intro: [level: number, kind: string][] = [
    [13, 'mushroom'],
    [14, 'turtle'],
    [15, 'goblinShaman'],
    [16, 'spiderNest'],
  ];
  const game = new BattleDriver(page);
  await game.seedProfile({ unlockedLevel: 16, upgrades: FULL_RUN_UPGRADES });
  let shot = 51;
  for (const [level, kind] of intro) {
    await game.open(`/?seed=${SEED}&level=${level}`);
    await game.startBattle();
    const start = await game.snapshot();
    expect(start.battle.level).toBe(level - 1);
    const all = [
      levelAt(level - 1, BATTLE_CONFIG).monsters,
      ...(levelAt(level - 1, BATTLE_CONFIG).waves ?? []),
    ];
    expect(all.flat()).toContain(kind);
    await game.advance(LEVEL_DRAWN_MS);
    await page.screenshot({ path: test.info().outputPath(`${shot++}-man-${level}-${kind}.png`) });
    // Ba nhát: hết lượt thứ 3 Tổ nhện đẻ Nhện con; Pháp sư phủ khiên ngay từ lượt đầu.
    let rng = seedRng(SEED + 1_000_000);
    for (let i = 0; i < 3 && (await game.snapshot()).battle.phase === 'playing'; i++) {
      const [{ move }, next] = lookaheadTurn(await game.snapshot(), rng);
      rng = next;
      await game.play(move);
    }
    const after = (await game.snapshot()).battle;
    if (kind === 'goblinShaman' && after.monsters.some((m) => m.kind === 'goblinShaman')) {
      expect(after.monsters.some((m) => m.shield)).toBe(true);
    }
    if (kind === 'spiderNest') {
      // Tổ còn sống và không bị đóng băng thì hết lượt 3 đã đẻ Nhện con (Cung có thể kéo tổ vào — không kiểm vị trí).
      const nests = after.monsters.filter((m) => m.kind === 'spiderNest');
      if (nests.length > 0) expect(after.monsters.some((m) => m.kind === 'spiderling')).toBe(true);
    }
    await game.advance(300);
    await page.screenshot({
      path: test.info().outputPath(`${shot++}-man-${level}-sau-3-nhat.png`),
    });
  }
});
