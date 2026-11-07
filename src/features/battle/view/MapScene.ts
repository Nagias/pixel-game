// F18 đợt D: màn Bản đồ — VỎ hiển thị (học ảnh 1 và 6 Micro RPG). Mở game là màn này: khung cảnh rừng, băng
// rôn chủ đề, 20 nút màn nối thành đường rắn, hiệp sĩ đứng ở màn đang tới; chạm màn (hoặc CHƠI) mở bảng trước
// trận. Luật trạng thái màn và chơi lại ở profile/logic; scene chỉ vẽ và chuyển cú chạm.
import { Scene, Scenes, type GameObjects, type Input, type Types } from 'phaser';
import { registerPixelSprites } from '../../../app/pixelSprites';
import { registerSceneryTexture } from '../../../app/sceneryTexture';
import { setSnapshotProvider } from '../../../app/testBridge';
import { colorNumber, PALETTE } from '../../../shared/palette';
import { parseLevelParam } from '../../../shared/levelParam';
import {
  clearedLevelCount,
  isReplay,
  levelStatus,
  loadProfile,
  startLevel,
  type LevelStatus,
  type SavedLoadout,
} from '../../profile';
import { levelAt } from '../logic/battle';
import { BATTLE_CONFIG, CHAPTERS, LOOT_CONFIG, UPGRADE_CONFIG } from '../logic/battleConfig';
import type { Loadout, MonsterKind, QuestConfig, SkillKind } from '../logic/battleTypes';
import { chapterOf } from '../logic/chapters';
import { levelMonsterKinds } from '../logic/levelInfo';
import {
  defaultLoadout,
  fromSavedLoadout,
  isSkillUnlocked,
  loadoutForLevel,
  ownedWeapons,
  skillOptions,
} from '../logic/loadout';
import { withWeaponTiers } from '../logic/loot';
import { withUpgrades } from '../logic/upgrades';
import type { BattleSceneData } from './BattleScene';
import { BATTLE_SPRITES } from './battleSprites';
import {
  BANNER,
  LEVEL_COUNT_ON_MAP,
  levelNodeRect,
  MAP_GOLD_PILL,
  mapTapAt,
  PREBATTLE_LAYOUT,
  prebattleTapAt,
} from './mapLayout';
import { drawNavBar } from './navBar';
import { paintScenery } from './scenery';
import { FOREST_MAP_SCENERY, FOREST_THEME } from './sceneryForest';
import { drawPanel, goldPill, SESSION_LOADOUT } from './uiKit';
import { SKILL_ICON, UI_SPRITES, WEAPON_ICON, type UiSprite } from './uiSprites';
import { styleTierText, tierColor } from './weaponTierStyle';

/** Mở Bản đồ; `popupLevel` (đếm từ 0) = mở sẵn bảng trước trận của màn đó (nếu đã mở khóa). */
export interface MapSceneData {
  readonly popupLevel?: number;
}

/** Thứ test E2E đọc được qua window.__PIXEL_GAME__.snapshot(). */
export interface MapSnapshot {
  readonly scene: 'map';
  readonly gold: number;
  /** Trạng thái 20 nút màn, theo thứ tự màn. */
  readonly levels: readonly LevelStatus[];
  /** Bảng trước trận đang mở, hoặc null. */
  readonly popup: null | {
    readonly level: number;
    readonly replay: boolean;
    readonly turns: number;
    readonly quest: QuestConfig | null;
    readonly monsterKinds: readonly MonsterKind[];
    readonly loadout: Loadout;
    /** Cấp màu từng vũ khí (theo chỉ số trong config.weapons; 0 = Thường). */
    readonly tiers: readonly number[];
    /** Skill chọn được ở màn này (rỗng nếu màn chưa mở skill). */
    readonly skills: readonly SkillKind[];
  };
  /** Màn đã hiện đủ lâu để nhận chạm (chống chạm nhầm nối từ màn trước). */
  readonly canTap: boolean;
}

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
/** Hành vi giao diện: màn vừa mở chờ chút mới nhận chạm (chạm đúp ở màn kết quả không lọt sang đây). */
const TAP_DELAY_MS = 500;
/**
 * Bảng trước trận vừa bật lên chờ chút mới nhận chạm: nhiều nút màn nằm đúng chỗ nút chơi / thẻ vũ khí của bảng,
 * chạm đúp vào nút màn không được lọt thành "vào trận" (rà soát cuối F18).
 */
const POPUP_TAP_DELAY_MS = 400;
/** Quái trùm — vẽ hình cạnh nút màn có nó (chỉ là hình, không phải luật). */
const BOSS_KINDS: readonly MonsterKind[] = ['slimeKing', 'treant'];
const DEPTH = { scenery: -1, map: 0, hud: 5, popup: 20 } as const;

const TEXT = {
  fontFamily: 'monospace',
  fontStyle: 'bold',
  color: PALETTE.white,
  stroke: PALETTE.ink,
  strokeThickness: 4,
} as const;

export class MapScene extends Scene {
  private config = BATTLE_CONFIG;
  private gold = 0;
  /** F20: đã phá đảo — mở Cầu lửa (phần thưởng). */
  private clearedAll = false;
  private statuses: LevelStatus[] = [];
  /** Màn đang tới (nút có hiệp sĩ; nút CHƠI mở bảng màn này). */
  private current = 0;
  private savedLoadout: Loadout = { weapons: [] };
  private replayOf: (level: number) => boolean = () => false;
  private popupLevel: number | null = null;
  private popup: GameObjects.Container | null = null;
  private openElapsedMs = 0;
  /** Thời gian bảng trước trận đang mở đã hiện (đếm theo khung hình, như openElapsedMs). */
  private popupElapsedMs = POPUP_TAP_DELAY_MS;
  /** Đã chạm vào trận / sang màn khác — bỏ qua mọi chạm sau đó. */
  private leaving = false;
  private spriteKeys!: Record<keyof typeof BATTLE_SPRITES, string>;
  private uiKeys!: Record<UiSprite, string>;

  constructor() {
    super('map');
  }

  init(data: Partial<MapSceneData>): void {
    const profile = loadProfile();
    this.config = withWeaponTiers(
      withUpgrades(BATTLE_CONFIG, profile.upgrades, UPGRADE_CONFIG),
      profile.weaponTiers,
      LOOT_CONFIG,
    );
    const count = Math.min(this.config.levels.length, LEVEL_COUNT_ON_MAP);
    this.gold = profile.gold;
    this.clearedAll = profile.clearedAll;
    this.statuses = Array.from({ length: count }, (_, level) => levelStatus(profile, level, count));
    this.current = startLevel(profile, null, count);
    this.replayOf = (level) => isReplay(profile, level, count);
    // F18 đợt B: đồ đang mang nằm trong hồ sơ (màn Vũ khí ghi cả vào bộ nhớ phiên, phòng bộ nhớ trình duyệt bị
    // chặn); hồ sơ trỏ tới món không còn thì bộ mặc định.
    const session = this.registry.get(SESSION_LOADOUT) as SavedLoadout | undefined;
    const owned = ownedWeapons(this.config, {
      clearedLevels: clearedLevelCount(profile, this.config.levels.length),
      tiers: profile.weaponTiers,
    });
    this.savedLoadout =
      fromSavedLoadout(session ?? profile.loadout, this.config, owned) ??
      defaultLoadout(this.config, owned);
    // Bảng do màn trong game gửi sang (trận đấu: màn kế theo luật; màn phụ: bảng đang xem dở) thì tin — bộ nhớ
    // trình duyệt bị chặn thì hồ sơ không tiến, nhưng người chơi vẫn phải sang được màn kế trong phiên.
    // `?level=N` (thử tay / E2E) chỉ mở sẵn bảng màn N nếu đã mở khóa.
    const fromUrl = parseLevelParam(window.location.search, count);
    this.popupLevel =
      data.popupLevel ?? (fromUrl !== null && this.statuses[fromUrl] !== 'locked' ? fromUrl : null);
  }

  create(): void {
    // Phaser dùng lại cùng đối tượng scene mỗi lần mở: bỏ tham chiếu của lần trước.
    this.popup = null;
    this.openElapsedMs = 0;
    this.leaving = false;
    this.spriteKeys = registerPixelSprites(this, 'battle', BATTLE_SPRITES);
    this.uiKeys = registerPixelSprites(this, 'ui', UI_SPRITES);

    const { width, height } = FOREST_MAP_SCENERY;
    const scenery = registerSceneryTexture(this, 'scenery.forestMap', width, height, () =>
      paintScenery(FOREST_MAP_SCENERY, FOREST_THEME),
    );
    this.add.image(0, 0, scenery).setOrigin(0).setScale(2).setDepth(DEPTH.scenery);
    this.drawPath();
    this.drawNodes();
    this.drawBanner();
    this.add
      .graphics()
      .fillStyle(colorNumber('ink'), 0.25)
      .fillRect(0, 0, GAME_WIDTH, 46)
      .setDepth(DEPTH.hud);
    goldPill(this, MAP_GOLD_PILL, this.uiKeys.coin, DEPTH.hud).set(String(this.gold));
    drawNavBar(this, this.uiKeys, null, DEPTH.hud);
    if (this.popupLevel !== null) this.openPopup(this.popupLevel);

    this.input.on('pointerdown', (pointer: Input.Pointer) => this.handleTap(pointer.x, pointer.y));
    const clearSnapshot = setSnapshotProvider(() => this.snapshot());
    this.events.once(Scenes.Events.SHUTDOWN, clearSnapshot);
  }

  override update(_time: number, delta: number): void {
    this.openElapsedMs += delta;
    this.popupElapsedMs += delta;
  }

  private canTap(): boolean {
    return (
      this.openElapsedMs >= TAP_DELAY_MS &&
      !this.leaving &&
      (this.popupLevel === null || this.popupElapsedMs >= POPUP_TAP_DELAY_MS)
    );
  }

  private snapshot(): MapSnapshot {
    const level = this.popupLevel;
    return {
      scene: 'map',
      gold: this.gold,
      levels: this.statuses,
      popup:
        level === null
          ? null
          : {
              level,
              replay: this.replayOf(level),
              turns: levelAt(level, this.config).turnLimit,
              quest: levelAt(level, this.config).quest ?? null,
              monsterKinds: levelMonsterKinds(level, this.config),
              loadout: this.loadoutFor(level),
              tiers: this.config.weapons.map((w) => w.tier ?? 0),
              skills: isSkillUnlocked(level, this.config)
                ? skillOptions(this.config, this.clearedAll)
                : [],
            },
      canTap: this.canTap(),
    };
  }

  /** Bộ đồ mang vào màn `level`: đồ đã lưu; màn chưa mở skill thì bỏ skill, màn đã mở mà chưa chọn thì skill đầu. */
  private loadoutFor(level: number): Loadout {
    return loadoutForLevel(this.savedLoadout, level, this.config, this.clearedAll);
  }

  private handleTap(x: number, y: number): void {
    if (!this.canTap()) return;
    if (this.popupLevel !== null) {
      const tap = prebattleTapAt(x, y);
      if (tap === 'play') this.startBattle(this.popupLevel);
      else if (tap === 'close') this.closePopup();
      else if (tap === 'gear') this.leave('weapons', { returnTo: { popupLevel: this.popupLevel } });
      return;
    }
    const tap = mapTapAt(x, y);
    if (tap?.kind === 'level') {
      if (this.statuses[tap.level] !== 'locked') this.openPopup(tap.level, true);
    } else if (tap?.kind === 'nav') {
      if (tap.target === 'play') this.openPopup(this.current, true);
      else if (tap.target === 'weapons') this.leave('weapons', { returnTo: {} });
      else this.leave(tap.target, {});
    }
  }

  private leave(scene: string, data: object): void {
    this.leaving = true;
    this.scene.start(scene, data);
  }

  private startBattle(level: number): void {
    const data: BattleSceneData = { level, loadout: this.loadoutFor(level) };
    this.leave('battle', data);
  }

  // ---------- Bản đồ ----------

  private nodeCenter(level: number): { x: number; y: number } {
    const r = levelNodeRect(level);
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }

  private isBossLevel(level: number): boolean {
    return levelMonsterKinds(level, this.config).some((kind) => BOSS_KINDS.includes(kind));
  }

  /** Đường nối giữa các nút: đoạn đã đi qua sáng, đoạn chưa mở tối. */
  private drawPath(): void {
    const g = this.add.graphics().setDepth(DEPTH.map);
    for (let level = 0; level < this.statuses.length - 1; level++) {
      const a = this.nodeCenter(level);
      const b = this.nodeCenter(level + 1);
      const open = this.statuses[level + 1] !== 'locked';
      g.fillStyle(colorNumber('ink'));
      g.fillRect(
        Math.min(a.x, b.x) - 5,
        Math.min(a.y, b.y) - 5,
        Math.abs(a.x - b.x) + 10,
        Math.abs(a.y - b.y) + 10,
      );
      g.fillStyle(colorNumber(open ? 'white' : 'slate'));
      g.fillRect(
        Math.min(a.x, b.x) - 3,
        Math.min(a.y, b.y) - 3,
        Math.abs(a.x - b.x) + 6,
        Math.abs(a.y - b.y) + 6,
      );
    }
  }

  /** Nút màn: đã qua xanh, đang tới vàng (hiệp sĩ đứng trên), chưa mở xám; màn có trùm có hình trùm cạnh nút. */
  private drawNodes(): void {
    const count = this.statuses.length;
    const heroLevel = this.statuses.every((s) => s === 'cleared') ? count - 1 : this.current;
    for (let level = 0; level < count; level++) {
      const status = this.statuses[level] ?? 'locked';
      const boss = this.isBossLevel(level);
      const r = levelNodeRect(level, boss);
      const fill = status === 'cleared' ? 'blue' : status === 'current' ? 'yellow' : 'mist';
      drawPanel(this, r, fill, DEPTH.map, 3);
      this.add
        .text(r.x + r.width / 2, r.y + r.height / 2, String(chapterOf(level, CHAPTERS).number), {
          ...TEXT,
          fontSize: '14px',
          color:
            status === 'cleared'
              ? PALETTE.white
              : status === 'current'
                ? PALETTE.ink
                : PALETTE.slate,
          strokeThickness: status === 'cleared' ? 3 : 0,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.map);
      if (boss) {
        const kind =
          levelMonsterKinds(level, this.config).find((k) => BOSS_KINDS.includes(k)) ?? 'treant';
        this.add
          .image(r.x + r.width + 14, r.y + r.height / 2 - 6, this.spriteKeys[kind])
          .setScale(1.5)
          .setDepth(DEPTH.map);
      }
    }
    const hero = levelNodeRect(heroLevel, this.isBossLevel(heroLevel));
    this.add
      .image(hero.x + hero.width / 2, hero.y - 14, this.spriteKeys.hero)
      .setScale(2)
      .setDepth(DEPTH.map);
  }

  /** Băng rôn: nhãn "CHỦ ĐỀ 1", tên chủ đề, số màn đã qua. */
  private drawBanner(): void {
    const chapter = CHAPTERS[0];
    const cleared = this.statuses.filter((s) => s === 'cleared').length;
    const tab = { x: 130, y: BANNER.y, width: 100, height: 20 };
    drawPanel(this, tab, 'ink', DEPTH.hud, 0);
    this.add
      .text(tab.x + tab.width / 2, tab.y + tab.height / 2, 'CHỦ ĐỀ 1', {
        ...TEXT,
        fontSize: '11px',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    const ribbon = { x: BANNER.x, y: BANNER.y + 20, width: BANNER.width, height: 42 };
    drawPanel(this, ribbon, 'amber', DEPTH.hud, 5);
    this.add
      .graphics()
      .fillStyle(colorNumber('orange'))
      .fillRect(ribbon.x + 3, ribbon.y + 3, ribbon.width - 6, 6)
      .setDepth(DEPTH.hud);
    this.add
      .text(GAME_WIDTH / 2, ribbon.y + 24, (chapter?.name ?? '').toUpperCase(), {
        ...TEXT,
        fontSize: '22px',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.add
      .text(
        GAME_WIDTH / 2,
        BANNER.y + BANNER.height - 6,
        `${cleared}/${this.statuses.length} màn`,
        {
          ...TEXT,
          fontSize: '12px',
        },
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }

  // ---------- Bảng trước trận ----------

  private closePopup(): void {
    this.popup?.destroy();
    this.popup = null;
    this.popupLevel = null;
  }

  /** Mở (hoặc thay) bảng trước trận của màn `level` (học ảnh 6 Micro RPG). */
  private openPopup(level: number, byTap = false): void {
    this.closePopup();
    this.popupLevel = level;
    // Mở bằng cú chạm thì chờ POPUP_TAP_DELAY_MS; mở sẵn lúc vào màn thì đã có TAP_DELAY_MS của cả màn.
    this.popupElapsedMs = byTap ? 0 : POPUP_TAP_DELAY_MS;
    const { panel, title, quest, monsters, gearCards, skillCard, play, close } = PREBATTLE_LAYOUT;
    const config = levelAt(level, this.config);
    const loadout = this.loadoutFor(level);
    const parts: GameObjects.GameObject[] = [];
    const text = (x: number, y: number, value: string, style: Types.GameObjects.Text.TextStyle) => {
      const t = this.add.text(x, y, value, { ...TEXT, ...style }).setOrigin(0.5);
      parts.push(t);
      return t;
    };
    const image = (x: number, y: number, key: string, scale: number) => {
      const i = this.add.image(x, y, key).setScale(scale);
      parts.push(i);
      return i;
    };
    const ink = { color: PALETTE.ink, strokeThickness: 0 };

    parts.push(
      this.add
        .graphics()
        .fillStyle(colorNumber('ink'), 0.7)
        .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT),
      drawPanel(this, panel, 'white', DEPTH.popup, 6),
      drawPanel(this, title, 'navy', DEPTH.popup, 0),
    );
    text(
      title.x + title.width / 2,
      title.y + title.height / 2,
      `MÀN ${chapterOf(level, CHAPTERS).number}`,
      {
        fontSize: '16px',
      },
    );

    // Nhiệm vụ: hình quái × số; số lượt của màn.
    text(panel.x + 60, quest.y - 12, 'Nhiệm vụ', { fontSize: '14px', ...ink });
    text(panel.x + panel.width - 52, quest.y - 12, `${config.turnLimit} lượt`, {
      fontSize: '13px',
      ...ink,
    });
    parts.push(drawPanel(this, quest, 'cream', DEPTH.popup, 0));
    image(quest.x + 22, quest.y + quest.height / 2, this.uiKeys.star, 3);
    if (config.quest) {
      image(quest.x + 110, quest.y + quest.height / 2, this.spriteKeys[config.quest.kind], 2.5);
      text(quest.x + 170, quest.y + quest.height / 2, `×${config.quest.count}`, {
        fontSize: '20px',
      });
    } else {
      text(quest.x + 160, quest.y + quest.height / 2, 'Hạ hết quái', { fontSize: '16px', ...ink });
    }

    // Quái sẽ gặp.
    text(GAME_WIDTH / 2, monsters.y - 10, 'Quái sẽ gặp', { fontSize: '13px', ...ink });
    levelMonsterKinds(level, this.config)
      .slice(0, 4)
      .forEach((kind, i) => {
        const cell = { x: monsters.x + 10 + i * 72, y: monsters.y + 6, width: 60, height: 58 };
        parts.push(drawPanel(this, cell, 'mist', DEPTH.popup, 3));
        image(cell.x + cell.width / 2, cell.y + cell.height / 2, this.spriteKeys[kind], 2);
      });

    // Mang vào trận: hiệp sĩ + 3 vũ khí (chạm thẻ vũ khí mở màn Vũ khí) + ô skill.
    text(GAME_WIDTH / 2, gearCards[0] ? gearCards[0].y - 10 : 304, 'Mang vào trận', {
      fontSize: '13px',
      ...ink,
    });
    gearCards.forEach((card, i) => {
      parts.push(drawPanel(this, card, 'navy', DEPTH.popup, 3));
      if (i === 0) {
        image(card.x + card.width / 2, card.y + 34, this.spriteKeys.hero, 2.5);
        text(card.x + card.width / 2, card.y + 66, 'Hiệp sĩ', { fontSize: '11px' });
        text(card.x + card.width / 2, card.y + 80, `${this.config.hero.hp} máu`, {
          fontSize: '11px',
          color: PALETTE.yellow,
        });
        return;
      }
      const weaponIndex = loadout.weapons[i - 1];
      const weapon = weaponIndex === undefined ? undefined : this.config.weapons[weaponIndex];
      if (!weapon) return;
      parts.push(
        this.add
          .graphics()
          .fillStyle(colorNumber(tierColor(weapon.tier ?? 0)))
          .fillRect(card.x + 3, card.y + 3, card.width - 6, 4),
      );
      const icon = WEAPON_ICON[weapon.name];
      if (icon) image(card.x + card.width / 2, card.y + 34, this.uiKeys[icon], 3);
      text(card.x + card.width / 2, card.y + 66, weapon.name, { fontSize: '12px' });
      // F20: luôn ghi tên cấp (kể cả "Thường"), tô màu cấp.
      const tier = weapon.tier ?? 0;
      styleTierText(
        text(card.x + card.width / 2, card.y + 80, LOOT_CONFIG.tiers[tier]?.name ?? '', {
          fontSize: '11px',
          strokeThickness: 3,
        }),
        tier,
      );
    });
    const skill = loadout.skill;
    parts.push(drawPanel(this, skillCard, skill ? 'plum' : 'shadow', DEPTH.popup, 0));
    if (skill)
      image(
        skillCard.x + 22,
        skillCard.y + skillCard.height / 2,
        this.uiKeys[SKILL_ICON[skill]],
        2,
      );
    text(
      skillCard.x + skillCard.width / 2 + 10,
      skillCard.y + skillCard.height / 2,
      skill
        ? `Skill: ${this.config.skills[skill].name}`
        : `Skill: mở từ màn ${this.config.skillUnlockLevel + 1}`,
      { fontSize: '13px', color: skill ? PALETTE.cyan : PALETTE.mist },
    );

    if (this.replayOf(level)) {
      text(GAME_WIDTH / 2, skillCard.y + skillCard.height + 14, 'Chơi lại: không nhận vàng', {
        fontSize: '13px',
        color: PALETTE.red,
        strokeThickness: 0,
      });
    }

    // Nút chơi và nút đóng.
    parts.push(drawPanel(this, play, 'red', DEPTH.popup, 5));
    const cx = play.x + play.width / 2;
    const cy = play.y + play.height / 2;
    parts.push(
      this.add
        .graphics()
        .fillStyle(colorNumber('white'))
        .fillTriangle(cx - 12, cy - 17, cx - 12, cy + 17, cx + 16, cy),
    );
    parts.push(drawPanel(this, close, 'shadow', DEPTH.popup, 4));
    text(close.x + close.width / 2, close.y + close.height / 2, 'X', { fontSize: '20px' });

    this.popup = this.add.container(0, 0, parts).setDepth(DEPTH.popup);
  }
}
