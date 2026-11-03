// Phần điều khiển riêng của tính năng "battle" (F01–F06): đổi vũ khí, ngắm vùng xanh, chém.
// F18 đợt D: mở game là Bản đồ — chạm CHƠI/nút màn mở bảng trước trận, chạm nút chơi vào trận; đổi đồ ở màn
// Vũ khí (chọn xong chạm CHƠI về bảng trước trận).
import type {
  BattleSnapshot,
  MapSnapshot,
  ShopSnapshot,
  UpgradeSnapshot,
  WeaponsSnapshot,
} from '../../src/features/battle';
import * as autoPlay from '../../src/features/battle/logic/autoPlay';
import type { Move } from '../../src/features/battle/logic/autoPlay';
import { BATTLE_CONFIG } from '../../src/features/battle/logic/battleConfig';
import {
  UPGRADE_KINDS,
  type SkillKind,
  type UpgradeKind,
} from '../../src/features/battle/logic/battleTypes';
import {
  barButtonCount,
  skillButtonIndex,
  WEAPON_BAR,
  weaponButtonRects,
} from '../../src/features/battle/view/battleLayout';
import { levelNodeRect, PREBATTLE_LAYOUT } from '../../src/features/battle/view/mapLayout';
import { navButtonRect, type NavTarget } from '../../src/features/battle/view/navLayout';
import { gridCardRect } from '../../src/features/battle/view/weaponsLayout';
import {
  buyButtonRect,
  smallBuyRect,
  UPGRADE_TABS,
  type UpgradeTab,
} from '../../src/features/battle/view/upgradeLayout';
import { PROFILE_KEY, PROFILE_VERSION } from '../../src/features/profile/logic/profileConfig';
import type { RngState } from '../../src/shared/random';
import { GameDriver } from './gameDriver';

const FRAME_MS = 16;
/** Đổi scene (scene.start) cần vài khung hình mới xong. */
const SCENE_SWITCH_MS = 100;

export type { Move };

/** Bảng trước trận đang mở (đọc từ ảnh chụp trạng thái của Bản đồ) kèm vàng và cờ nhận chạm. */
export type PrebattleView = NonNullable<MapSnapshot['popup']> & {
  readonly gold: number;
  readonly canTap: boolean;
};

const center = (r: { x: number; y: number; width: number; height: number }) =>
  [r.x + r.width / 2, r.y + r.height / 2] as const;

/** Hồ sơ đã lưu trong localStorage (đọc thô — test so với kỳ vọng). */
interface StoredProfile {
  readonly gold: number;
  readonly unlockedLevel: number;
  readonly weaponTiers: Record<string, number>;
  readonly lootPity: Record<string, number>;
  readonly rentals: Record<string, number>;
  readonly rentalTiers: Record<string, number>;
  readonly weaponLevels: Record<string, number>;
  readonly clearedAll: boolean;
  readonly loadout: { readonly weapons: readonly string[]; readonly skill: string | null } | null;
}

export class BattleDriver extends GameDriver {
  /**
   * Mở game với seed cố định rồi chờ bảng trước trận mở và nhận chạm. `level` (đếm từ 1) mở thẳng bảng của màn
   * đó qua `?level=` — nạp sẵn hồ sơ đã mở khóa tới màn đó (như người chơi đã qua các màn trước).
   */
  async openPrebattle(seed: number, level?: number): Promise<PrebattleView> {
    if (level !== undefined) await this.seedProfile({ unlockedLevel: level - 1 });
    await this.open(`/?seed=${seed}${level === undefined ? '' : `&level=${level}`}`);
    return this.waitPrebattleReady();
  }

  /**
   * Đợt 3: đặt hồ sơ người chơi trước khi game chạy — chỉ khi trình duyệt chưa có hồ sơ, để mở lại game
   * (trang mới cùng trình duyệt) vẫn thấy đúng tiến trình đã lưu.
   */
  async seedProfile(patch: {
    gold?: number;
    unlockedLevel?: number;
    upgrades?: Record<string, number>;
    weaponTiers?: Record<string, number>;
    lootPity?: Record<string, number>;
    rentals?: Record<string, number>;
    rentalTiers?: Record<string, number>;
    weaponLevels?: Record<string, number>;
    clearedAll?: boolean;
    loadout?: { weapons: string[]; skill: string | null } | null;
  }): Promise<void> {
    const value = JSON.stringify({
      version: PROFILE_VERSION,
      gold: 0,
      unlockedLevel: 0,
      upgrades: {},
      weaponTiers: {},
      lootPity: {},
      rentals: {},
      rentalTiers: {},
      weaponLevels: {},
      clearedAll: false,
      loadout: null,
      ...patch,
    });
    await this.page.addInitScript(
      ([key, raw]) => {
        if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, raw);
      },
      [PROFILE_KEY, value] as const,
    );
  }

  upgradeSnapshot(): Promise<UpgradeSnapshot> {
    return this.snapshotOf<UpgradeSnapshot>('upgrade');
  }

  /** Đợt 4: từ Bản đồ (đóng bảng trước trận nếu đang mở) chạm nút Nâng cấp ở thanh dưới, chờ màn mở. */
  async openUpgrade(): Promise<UpgradeSnapshot> {
    await this.goToNav('upgrade');
    for (let attempt = 0; attempt < 20; attempt++) {
      const snapshot = await this.upgradeSnapshot();
      if (snapshot.canTap) return snapshot;
      await this.advance(SCENE_SWITCH_MS);
    }
    throw new Error('Màn Nâng cấp không nhận chạm sau 2 giây');
  }

  /** Đợt 4: màn Nâng cấp — chạm nút mua của chỉ số `kind`. */
  async buyUpgrade(kind: UpgradeKind): Promise<void> {
    const rect = buyButtonRect(UPGRADE_KINDS.indexOf(kind));
    await this.tapAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  /** F19: màn Nâng cấp — chạm nút thẻ chọn ("Nhân vật" / "Vũ khí"). */
  async openUpgradeTab(tab: UpgradeTab): Promise<UpgradeSnapshot> {
    const button = UPGRADE_TABS.find((t) => t.tab === tab);
    if (!button) throw new Error(`Không có thẻ chọn ${tab}`);
    await this.tapAt(...center(button.rect));
    await this.advance(FRAME_MS * 2);
    return this.upgradeSnapshot();
  }

  /** F19: thẻ chọn "Vũ khí" của màn Nâng cấp — chạm nút mua của vũ khí `weaponIndex`. */
  async buyWeaponUpgrade(weaponIndex: number): Promise<void> {
    const index = (await this.upgradeSnapshot()).weapons.indexOf(weaponIndex);
    if (index === -1) throw new Error(`Chưa có vũ khí số ${weaponIndex}`);
    await this.tapAt(...center(smallBuyRect(index)));
    await this.advance(FRAME_MS * 2);
  }

  /** Màn Nâng cấp / Cửa hàng (F18 đợt E: không còn "XONG") — chạm CHƠI ở thanh dưới, về bảng trước trận. */
  async closeUpgrade(): Promise<void> {
    await this.tapAt(...center(navButtonRect('play')));
    await this.waitSceneSwitch();
  }

  shopSnapshot(): Promise<ShopSnapshot> {
    return this.snapshotOf<ShopSnapshot>('shop');
  }

  /** Đợt 6: từ Bản đồ chạm nút Cửa hàng ở thanh dưới, chờ màn Cửa hàng mở và nhận chạm. */
  async openShop(): Promise<ShopSnapshot> {
    await this.goToNav('shop');
    for (let attempt = 0; attempt < 20; attempt++) {
      const snapshot = await this.shopSnapshot();
      if (snapshot.canTap) return snapshot;
      await this.advance(SCENE_SWITCH_MS);
    }
    throw new Error('Màn Cửa hàng không nhận chạm sau 2 giây');
  }

  /** Đợt 6: màn Cửa hàng — chạm nút mua của vũ khí `weaponIndex` (F19: thẻ nhỏ, chỉ món đang bày). */
  async buyFromShop(weaponIndex: number): Promise<void> {
    const index = (await this.shopSnapshot()).weapons.indexOf(weaponIndex);
    if (index === -1) throw new Error(`Cửa hàng không bày vũ khí số ${weaponIndex}`);
    const rect = smallBuyRect(index);
    await this.tapAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  /** Đợt 3: hồ sơ đang lưu trong trình duyệt (null nếu chưa có). */
  async storedProfile(): Promise<StoredProfile | null> {
    const raw = await this.page.evaluate((key) => window.localStorage.getItem(key), PROFILE_KEY);
    return raw === null ? null : (JSON.parse(raw) as StoredProfile);
  }

  /** Mở game rồi vào trận ngay với bộ đồ mặc định. */
  async openBattle(seed: number, level?: number): Promise<void> {
    await this.openPrebattle(seed, level);
    await this.startBattle();
  }

  snapshot(): Promise<BattleSnapshot> {
    return this.snapshotOf<BattleSnapshot>('battle');
  }

  mapSnapshot(): Promise<MapSnapshot> {
    return this.snapshotOf<MapSnapshot>('map');
  }

  weaponsSnapshot(): Promise<WeaponsSnapshot> {
    return this.snapshotOf<WeaponsSnapshot>('weapons');
  }

  /** Cho vài khung hình chạy để scene vừa gọi scene.start() kịp mở. */
  async waitSceneSwitch(): Promise<void> {
    await this.advance(SCENE_SWITCH_MS);
  }

  /** Bản đồ vừa mở chưa nhận chạm (chống chạm nhầm): cho thời gian trôi tới khi nhận. */
  async waitMapReady(): Promise<MapSnapshot> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const snapshot = await this.mapSnapshot();
      if (snapshot.canTap) return snapshot;
      await this.advance(SCENE_SWITCH_MS);
    }
    throw new Error('Bản đồ không nhận chạm sau 2 giây');
  }

  /** Bảng trước trận đang mở (lỗi nếu bảng đang đóng). */
  async prebattleSnapshot(): Promise<PrebattleView> {
    const snapshot = await this.mapSnapshot();
    if (!snapshot.popup) throw new Error('Bảng trước trận đang đóng');
    return { ...snapshot.popup, gold: snapshot.gold, canTap: snapshot.canTap };
  }

  /** Chờ Bản đồ nhận chạm; bảng trước trận chưa mở thì chạm CHƠI ở thanh dưới để mở bảng màn đang tới. */
  async waitPrebattleReady(): Promise<PrebattleView> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const snapshot = await this.waitMapReady();
      if (snapshot.popup) return this.prebattleSnapshot();
      await this.tapAt(...center(navButtonRect('play')));
      await this.advance(FRAME_MS * 2);
    }
    throw new Error('Không mở được bảng trước trận');
  }

  /** Bản đồ: chạm nút màn `level` (đếm từ 0). */
  async tapLevel(level: number): Promise<void> {
    await this.tapAt(...center(levelNodeRect(level, true)));
    await this.advance(FRAME_MS * 2);
  }

  /** Bảng trước trận: chạm nút đóng. */
  async closePrebattle(): Promise<void> {
    await this.tapAt(...center(PREBATTLE_LAYOUT.close));
    await this.advance(FRAME_MS * 2);
  }

  /** Từ Bản đồ (đóng bảng nếu đang mở) chạm một nút ở thanh dưới rồi chờ đổi scene. */
  async goToNav(target: NavTarget): Promise<void> {
    if ((await this.waitMapReady()).popup) await this.closePrebattle();
    await this.tapAt(...center(navButtonRect(target)));
    await this.waitSceneSwitch();
  }

  /** Màn Vũ khí vừa mở chưa nhận chạm: cho thời gian trôi tới khi nhận. */
  async waitWeaponsReady(): Promise<WeaponsSnapshot> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const snapshot = await this.weaponsSnapshot();
      if (snapshot.canTap) return snapshot;
      await this.advance(SCENE_SWITCH_MS);
    }
    throw new Error('Màn Vũ khí không nhận chạm sau 2 giây');
  }

  /** Bảng trước trận đang mở thì chạm thẻ vũ khí; không thì chạm nút Vũ khí ở thanh dưới. */
  async openWeapons(): Promise<WeaponsSnapshot> {
    if ((await this.waitMapReady()).popup) {
      await this.tapAt(...center(PREBATTLE_LAYOUT.gearCards[1] ?? PREBATTLE_LAYOUT.skillCard));
      await this.waitSceneSwitch();
    } else {
      await this.goToNav('weapons');
    }
    return this.waitWeaponsReady();
  }

  /** Màn Vũ khí: chạm CHƠI ở thanh dưới, về bảng trước trận. */
  async backToPrebattle(): Promise<PrebattleView> {
    await this.tapAt(...center(navButtonRect('play')));
    await this.waitSceneSwitch();
    return this.waitPrebattleReady();
  }

  /** Màn Vũ khí: chạm thẻ thứ `index` của lưới rồi về bảng trước trận. */
  private async chooseCard(index: number): Promise<void> {
    if (index < 0) throw new Error('Màn Vũ khí không có thẻ này');
    await this.tapAt(...center(gridCardRect(index)));
    await this.advance(FRAME_MS * 2);
    await this.backToPrebattle();
  }

  /** Mở màn Vũ khí, chạm thẻ vũ khí `weaponIndex` (chỉ số trong config.weapons), về bảng trước trận. */
  async chooseWeapon(weaponIndex: number): Promise<void> {
    const { cards } = await this.openWeapons();
    await this.chooseCard(cards.findIndex((c) => c.kind === 'weapon' && c.weapon === weaponIndex));
  }

  /** B6: mở màn Vũ khí, chạm thẻ skill `skill`, về bảng trước trận. */
  async chooseSkill(skill: SkillKind): Promise<void> {
    const { cards } = await this.openWeapons();
    await this.chooseCard(cards.findIndex((c) => c.kind === 'skill' && c.skill === skill));
  }

  /** B6: chạm ô skill cuối thanh nút (bấm skill nếu đã đầy; chưa đầy thì không có gì xảy ra). */
  async castSkill(): Promise<void> {
    const { loadout } = (await this.snapshot()).battle;
    const index = skillButtonIndex(loadout);
    const rect =
      index === null ? undefined : weaponButtonRects(barButtonCount(loadout), WEAPON_BAR)[index];
    if (!rect) throw new Error('Trận này không mang skill');
    await this.tapAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  /** Bảng trước trận (mở bảng màn đang tới nếu chưa mở): chạm nút chơi, chờ scene trận mở. */
  async startBattle(): Promise<void> {
    await this.waitPrebattleReady();
    await this.tapAt(...center(PREBATTLE_LAYOUT.play));
    await this.waitSceneSwitch();
    await this.snapshot();
  }

  /** Chạm vào nút của vũ khí `weaponIndex` (chỉ số trong config.weapons) ở đáy màn hình. */
  async selectWeapon(weaponIndex: number): Promise<void> {
    const { loadout } = (await this.snapshot()).battle;
    const rect = weaponButtonRects(barButtonCount(loadout), WEAPON_BAR)[
      loadout.weapons.indexOf(weaponIndex)
    ];
    if (!rect) throw new Error(`Không mang vũ khí số ${weaponIndex} vào trận`);
    await this.tapAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  /**
   * Cho thời gian trôi tới khi vùng xanh chỉ vào `sector`: tính trước rồi nhảy một lần tới gần
   * giữa lát đó, sau đó mới dò từng khung hình (mỗi lần dò là một lượt hỏi trình duyệt — tốn).
   */
  async waitArcAt(sector: number): Promise<void> {
    const { arcPeriodMs, sectorCount } = BATTLE_CONFIG;
    const msPerSector = arcPeriodMs / sectorCount;
    const { arcElapsedMs } = await this.snapshot();
    const middleOfTarget = (sector + 0.5) * msPerSector;
    const wait = (middleOfTarget - (arcElapsedMs % arcPeriodMs) + arcPeriodMs) % arcPeriodMs;
    if (wait > 2 * FRAME_MS) await this.advance(wait - FRAME_MS);

    const maxFrames = Math.ceil(arcPeriodMs / FRAME_MS);
    for (let frame = 0; frame < maxFrames; frame++) {
      if ((await this.snapshot()).arcSector === sector) return;
      await this.advance(FRAME_MS);
    }
    throw new Error(`Vùng xanh không tới lát ${sector} sau ${maxFrames} khung hình`);
  }

  /** Chờ vùng xanh tới `sector` rồi chạm vào sân — một nhát chém có chủ đích. */
  async attackAt(sector: number): Promise<void> {
    await this.waitArcAt(sector);
    await this.tap();
  }

  /** Thực hiện một nước đi: đổi vũ khí nếu cần, rồi chém. */
  async play(move: Move): Promise<void> {
    if ((await this.snapshot()).battle.weaponIndex !== move.weaponIndex) {
      await this.selectWeapon(move.weaponIndex);
    }
    await this.attackAt(move.sector);
  }
}

/** Id các quái sẽ trúng nếu chém bằng vũ khí `move.weaponIndex` vào lát `move.sector`. */
export function hitIds(snapshot: BattleSnapshot, move: Move): number[] {
  return autoPlay.hitIds(snapshot.battle, move, snapshot.config);
}

/** Người chơi ngắm chuẩn — cùng bot với mô phỏng cân bằng (`npm run sim`). */
export function bestMove(snapshot: BattleSnapshot): Move {
  return autoPlay.bestMove(snapshot.battle, snapshot.config);
}

/**
 * Đợt 0: người chơi nhìn trước 1 lượt — bot giỏi nhất của mô phỏng, tự quyết bấm hay giữ skill.
 * `rng` là ngẫu nhiên riêng của người chơi (không phải của trận).
 */
export function lookaheadTurn(
  snapshot: BattleSnapshot,
  rng: RngState,
): [plan: autoPlay.TurnPlan, next: RngState] {
  return autoPlay.lookaheadTurn(snapshot.battle, rng, snapshot.config);
}

/** Người chơi chém trượt: một lát không trúng con quái nào. */
export function missMove(snapshot: BattleSnapshot): Move {
  return autoPlay.missMove(snapshot.battle, snapshot.config);
}
