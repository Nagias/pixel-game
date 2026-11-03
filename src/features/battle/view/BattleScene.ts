// Scene trận đấu: VỎ hiển thị. Chỉ vẽ state và chuyển cú chạm thành selectWeapon()/playTurn() —
// không chứa luật chơi. Game chỉ cho mobile: mọi thao tác là chạm, không có bàn phím.
// F18 đợt D: mở từ bảng trước trận (MapScene) với màn + bộ đồ; hết màn thì về Bản đồ, mở sẵn bảng màn chơi tiếp.
import { Scene, Scenes, type GameObjects, type Input } from 'phaser';
import { registerPixelSprites } from '../../../app/pixelSprites';
import { registerSceneryTexture } from '../../../app/sceneryTexture';
import { setSnapshotProvider } from '../../../app/testBridge';
import { colorNumber, PALETTE, type PaletteColor } from '../../../shared/palette';
import { parseSeedParam } from '../../../shared/seedParam';
import {
  applyBattleResult,
  clearedLevelCount,
  isReplay,
  loadProfile,
  saveProfile,
} from '../../profile';
import { arcSectorAt } from '../logic/arena';
import {
  canBeHit,
  canCastSkill,
  castSkill,
  createBattle,
  isGameCleared,
  levelAt,
  nextLevelIndex,
  playTurn,
  selectWeapon,
  willAttack,
} from '../logic/battle';
import {
  BATTLE_CONFIG,
  CHAPTERS,
  LOOT_CONFIG,
  SHOP_CONFIG,
  UPGRADE_CONFIG,
} from '../logic/battleConfig';
import { chapterOf } from '../logic/chapters';
import {
  applyDrop,
  lootAfterBattle,
  readPity,
  withWeaponTiers,
  type DropOutcome,
  type Inventory,
} from '../logic/loot';
import { effectiveTiers, rentalsAfterBattle } from '../logic/shop';
import { withUpgrades } from '../logic/upgrades';
import type {
  BattleConfig,
  BattleState,
  Drop,
  Hit,
  Loadout,
  Monster,
  SkillKind,
} from '../logic/battleTypes';
import { defaultLoadout, isUnlocked } from '../logic/loadout';
import {
  ARENA_LAYOUT,
  GOLD_PILL,
  hpBarAnchor,
  QUEST_PILL,
  TOP_BAR,
  TURN_TAB,
  barButtonCount,
  cellToPoint,
  type Point,
  type Rect,
  ringInnerRadius,
  sectorStartAngle,
  skillButtonIndex,
  toPhaserAngle,
  isInWeaponBar,
  WEAPON_BAR,
  weaponButtonAt,
  weaponButtonRects,
  zoneArcs,
  zoneRadii,
} from './battleLayout';
import { BATTLE_SPRITES, SPRITE_SCALE } from './battleSprites';
import { paintScenery } from './scenery';
import { FOREST_BATTLE_SCENERY, FOREST_THEME } from './sceneryForest';
import { drawPanel, goldPill, HpBar } from './uiKit';
import { UI_SPRITES, WEAPON_ICON, type UiSprite } from './uiSprites';
import type { MapSceneData } from './MapScene';
import { addLightning, styleTierText } from './weaponTierStyle';

/** Dữ liệu mở trận: màn (đếm từ 0) và bộ đồ mang vào. */
export interface BattleSceneData {
  readonly level: number;
  readonly loadout: Loadout;
}

/** Thứ test E2E đọc được qua window.__PIXEL_GAME__.snapshot(). */
export interface BattleSnapshot {
  readonly scene: 'battle';
  /** Lát vùng xanh đang chỉ — chạm lúc này sẽ đánh vào lát đó. */
  readonly arcSector: number;
  /** Thời gian vùng xanh đã quay trong trận này (ms) — để test tính trước lúc nó tới một lát. */
  readonly arcElapsedMs: number;
  /** Màn kết quả đã hiện đủ lâu để chạm đi tiếp — sang màn sau hoặc chơi lại (chống chạm nhầm). */
  readonly canRestart: boolean;
  readonly battle: BattleState;
  /**
   * Cấu hình trận thật đang dùng — đã cộng nâng cấp (đợt 4) và cấp vũ khí (đợt 5) trong hồ sơ — để bot
   * của test tính nước đi đúng như game.
   */
  readonly config: BattleConfig;
  /** Đợt 5: món rơi lúc hết trận (null nếu không hạ quái hiếm hoặc hạ mà không rơi; chưa hết trận cũng null). */
  readonly drop: Drop | null;
  /** F18 đợt B: trận chơi lại màn đã qua — không nhận vàng, không rơi đồ. */
  readonly replay: boolean;
  /** F18 đợt C: số máu đang ghi trên thanh máu của từng quái đang hiện. */
  readonly hpBars: readonly { readonly id: number; readonly hp: number }[];
}

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
/** Hành vi giao diện, không phải luật chơi: màn kết quả chờ chút mới nhận chạm đi tiếp. */
const RESTART_DELAY_MS = 500;
const MOVE_TWEEN_MS = 180;

const DEPTH = {
  scenery: -1,
  arena: 0,
  zone: 1,
  shadow: 1.5,
  monster: 2,
  hero: 3,
  hpBar: 3.5,
  popup: 4,
  hud: 5,
  result: 10,
} as const;

/** B6: màu riêng của từng skill — nút nạp, chớp sân khi bấm. */
const SKILL_COLOR: Record<SkillKind, PaletteColor> = { iceRain: 'blue', fireball: 'orange' };
/** B6: quái bị đóng băng phủ kín màu này. */
const FROZEN_TINT: PaletteColor = 'cyan';
/** Đợt 5: quái hiếm phát sáng màu này (WebGL) và phập phồng nhẹ (mọi máy). */
const RARE_GLOW: PaletteColor = 'yellow';
/** F12: độ đậm của quái ma lúc vô hình — đủ thấy để người chơi biết nó ở đâu. */
const GHOST_HIDDEN_ALPHA = 0.3;

const TEXT = {
  fontFamily: 'monospace',
  fontStyle: 'bold',
  color: PALETTE.white,
  stroke: PALETTE.ink,
  strokeThickness: 4,
} as const;

export class BattleScene extends Scene {
  /** Cấu hình trận đã cộng nâng cấp (đợt 4) và cấp vũ khí đã rơi (đợt 5) trong hồ sơ. */
  private config = BATTLE_CONFIG;
  private readonly fixedSeed = parseSeedParam(window.location.search);
  private level = 0;
  private loadout!: Loadout;
  private battle!: BattleState;
  private arcElapsedMs = 0;
  private arcSector = 0;
  private endedAtMs: number | null = null;

  private zone!: GameObjects.Graphics;
  /** F18 đợt C: số lượt còn lại trên thẻ treo giữa thanh trên. */
  private turnsText!: GameObjects.Text;
  private levelText!: GameObjects.Text;
  /** F18 đợt C: vàng nhặt trong trận (ô vàng góc trái). */
  private gold!: { set(text: string): void };
  /** F18 đợt C: thanh máu trên đầu hiệp sĩ (thay dòng chữ "Máu: n/m"). */
  private heroHp!: HpBar;
  /** F11: tiến độ nhiệm vụ — hình quái + "đã hạ/cần" (ô bên phải). */
  private questText!: GameObjects.Text;
  private questIcon!: GameObjects.Image;
  /** F18 đợt C: bóng và thanh máu của từng quái, theo id; `max` = máu lúc quái xuất hiện. */
  private readonly monsterUnits = new Map<
    number,
    { shadow: GameObjects.Graphics; hp: HpBar; max: number; shown: number }
  >();
  private uiKeys!: Record<UiSprite, string>;
  /** F04: dấu "!" trên đầu quái sắp đánh, theo id quái. */
  private readonly threatMarks = new Map<number, GameObjects.Text>();
  private resultLayer!: GameObjects.Container;
  private resultTitle!: GameObjects.Text;
  private resultDetail!: GameObjects.Text;
  /** Đợt 3: vàng nhặt trong trận + tổng vàng trong hồ sơ. */
  private resultGold!: GameObjects.Text;
  /** Đợt 5: dòng báo rơi đồ khi hạ quái hiếm. */
  private resultLoot!: GameObjects.Text;
  private resultHint!: GameObjects.Text;
  /** Đợt 5: món rơi của trận vừa hết (cho E2E đọc). */
  private drop: Drop | null = null;
  /** F18 đợt B: màn này đã qua trước khi vào trận — chơi lại không nhận vàng, không rơi đồ. */
  private replay = false;
  private readonly monsterSprites = new Map<number, GameObjects.Image>();
  private spriteKeys!: Record<keyof typeof BATTLE_SPRITES, string>;
  private weaponButtons: {
    /** Khung thẻ (vẽ lại khi chọn): viền 3 điểm xanh lá khi đang cầm. */
    box: GameObjects.Graphics;
    rect: Rect;
    name: GameObjects.Text;
    range: GameObjects.Text;
    /** Đợt 5: cấp màu (> 0 thì dòng dưới ghi tên cấp, tô màu cấp). */
    tier: number;
  }[] = [];
  /** B6: ô skill cuối thanh nút (null nếu không mang skill). */
  private skillButton: {
    /** Khung + mức nạp mọc từ đáy (Graphics vẽ lại theo state). */
    box: GameObjects.Graphics;
    rect: Rect;
    color: PaletteColor;
    name: GameObjects.Text;
    charge: GameObjects.Text;
  } | null = null;

  constructor() {
    super('battle');
  }

  /** Màn chuẩn bị gửi màn + bộ đồ. Không có (chỉ khi mở thẳng scene này) thì màn 1, bộ mặc định. */
  init(data: Partial<BattleSceneData>): void {
    const profile = loadProfile();
    // Đợt 6: món thuê ở cửa hàng còn hạn thì dùng cấp của cửa hàng.
    this.config = withWeaponTiers(
      withUpgrades(BATTLE_CONFIG, profile.upgrades, UPGRADE_CONFIG),
      effectiveTiers(profile.weaponTiers, profile.rentals, profile.rentalTiers, SHOP_CONFIG),
      LOOT_CONFIG,
    );
    this.level = data.level ?? 0;
    this.loadout = data.loadout ?? defaultLoadout(this.config);
    this.replay = isReplay(profile, this.level, this.config.levels.length);
  }

  create(): void {
    // Phaser dùng lại cùng đối tượng scene mỗi lần mở: bỏ tham chiếu tới hình của lần trước.
    this.monsterSprites.clear();
    this.monsterUnits.clear();
    this.threatMarks.clear();
    this.weaponButtons = [];
    this.skillButton = null;

    this.spriteKeys = registerPixelSprites(this, 'battle', BATTLE_SPRITES);
    this.uiKeys = registerPixelSprites(this, 'ui', UI_SPRITES);
    // F18 đợt C: khung cảnh rừng vẽ bằng code (180×320, phóng ×2), vẽ một lần rồi dùng lại.
    const { width, height } = FOREST_BATTLE_SCENERY;
    const scenery = registerSceneryTexture(this, 'scenery.forestBattle', width, height, () =>
      paintScenery(FOREST_BATTLE_SCENERY, FOREST_THEME),
    );
    this.add.image(0, 0, scenery).setOrigin(0).setScale(2).setDepth(DEPTH.scenery);
    this.drawArena();
    this.zone = this.add.graphics().setDepth(DEPTH.zone);
    const heroPoint = { x: ARENA_LAYOUT.centerX, y: ARENA_LAYOUT.centerY };
    const heroHeight = BATTLE_SPRITES.hero.length;
    this.addShadow(heroPoint, heroHeight, SPRITE_SCALE.hero, BATTLE_SPRITES.hero[0]?.length ?? 16);
    this.add
      .image(heroPoint.x, heroPoint.y, this.spriteKeys.hero)
      .setScale(SPRITE_SCALE.hero)
      .setDepth(DEPTH.hero);
    this.heroHp = new HpBar(this, DEPTH.hpBar);
    const anchor = hpBarAnchor(heroPoint, heroHeight, SPRITE_SCALE.hero);
    this.heroHp.moveTo(anchor.x, anchor.y);
    this.createHud();
    this.createWeaponBar();
    this.createResultLayer();

    this.input.on('pointerdown', (pointer: Input.Pointer) => this.handleTap(pointer.x, pointer.y));
    const clearSnapshot = setSnapshotProvider(() => this.snapshot());
    this.events.once(Scenes.Events.SHUTDOWN, clearSnapshot);

    this.startLevel(this.level);
  }

  override update(_time: number, delta: number): void {
    if (this.battle.phase !== 'playing') return;
    this.arcElapsedMs += delta;
    const sector = arcSectorAt(this.arcElapsedMs, this.config.arcPeriodMs, this.config.sectorCount);
    if (sector !== this.arcSector) {
      this.arcSector = sector;
      this.drawZone();
    }
  }

  // ---------- Luồng chơi ----------

  /** F06: mở màn `level`. Có `?seed=` thì màn nào cũng dùng seed đó để ván lặp lại y hệt. */
  private startLevel(level: number): void {
    const seed = this.fixedSeed ?? Math.floor(Math.random() * 2 ** 32);
    this.battle = createBattle(seed, this.config, level, this.loadout);
    this.drop = null;
    this.arcElapsedMs = 0;
    this.arcSector = 0;
    this.endedAtMs = null;

    this.syncMonsters(this.battle);
    this.resultLayer.setVisible(false);
    this.drawZone();
    this.syncWeaponBar(this.battle);
    this.syncSkillButton(this.battle);
    this.updateHud();
  }

  /**
   * Chạm vào nút vũ khí thì đổi vũ khí; chạm ô skill (B6) thì bấm skill nếu đã đầy; chạm vào chỗ khác
   * là chém. Màn kết quả: chạm để về Bản đồ với bảng trước trận của màn sau hoặc của màn vừa thua mở sẵn —
   * màn nào do luật quyết (nextLevelIndex).
   */
  private handleTap(x: number, y: number): void {
    if (this.battle.phase !== 'playing') {
      if (this.canRestart()) {
        const data: MapSceneData = { popupLevel: nextLevelIndex(this.battle, this.config) };
        this.scene.start('map', data);
      }
      return;
    }
    const { loadout } = this.battle;
    const button = weaponButtonAt(x, y, barButtonCount(loadout), WEAPON_BAR);
    if (button !== null && button === skillButtonIndex(loadout)) {
      // Chưa đầy thì ô skill không làm gì (không chém, không tốn lượt).
      if (canCastSkill(this.battle, this.config)) this.cast();
      return;
    }
    const weaponIndex = button === null ? undefined : loadout.weapons[button];
    if (weaponIndex === undefined) {
      // Khe giữa hai nút vẫn thuộc thanh nút: không chém, không tốn lượt (FEATURE_MAP F02).
      if (!isInWeaponBar(x, y, WEAPON_BAR)) this.attack();
    } else {
      this.battle = selectWeapon(this.battle, weaponIndex, this.config);
      this.drawZone();
      this.syncWeaponBar(this.battle);
    }
  }

  private attack(): void {
    const next = playTurn(this.battle, this.arcSector, this.config);
    this.battle = next;
    this.showHits(next.lastAttack?.hits ?? []);
    // F19: Búa — quái trúng mà còn sống hiện "choáng" (luật: nó đứng im, không đánh lượt này).
    if ((this.config.weapons[next.weaponIndex]?.stunTurns ?? 0) > 0) {
      for (const hit of next.lastAttack?.hits ?? []) {
        const sprite = this.monsterSprites.get(hit.monsterId);
        if (sprite && !hit.killed)
          this.popText(sprite.x, sprite.y - 28, 'choáng', PALETTE.mist, '13px');
      }
    }
    this.showStrikeBonus(next);
    this.syncMonsters(next);
    this.syncSkillButton(next);
    this.updateHud();
    if (next.phase !== 'playing') this.showResult(next);
  }

  /** B6: bấm skill — chớp sân màu skill, số sát thương bay lên trên mọi quái, không tốn lượt. */
  private cast(): void {
    const next = castSkill(this.battle, this.config);
    this.battle = next;
    if (next.lastSkill) {
      this.flashArena(SKILL_COLOR[next.lastSkill.skill]);
      this.showHits(next.lastSkill.hits);
    }
    this.syncMonsters(next);
    this.syncSkillButton(next);
    this.updateHud();
    if (next.phase !== 'playing') this.showResult(next);
  }

  private canRestart(): boolean {
    return this.endedAtMs !== null && this.time.now - this.endedAtMs >= RESTART_DELAY_MS;
  }

  private snapshot(): BattleSnapshot {
    return {
      scene: 'battle',
      arcSector: this.arcSector,
      arcElapsedMs: this.arcElapsedMs,
      canRestart: this.canRestart(),
      battle: this.battle,
      config: this.config,
      drop: this.drop,
      replay: this.replay,
      hpBars: [...this.monsterUnits].map(([id, unit]) => ({ id, hp: unit.shown })),
    };
  }

  // ---------- Vẽ ----------

  /**
   * F18 đợt C: sân đấu hiện mờ trên mặt cỏ như Micro RPG — 24 lát × 6 vòng tô ô xen kẽ đậm nhạt nhẹ, vòng giữa
   * sáng, viền ngoài mờ. Không còn đĩa xanh đặc.
   */
  private drawArena(): void {
    // Vẽ 144 ô một lần thành ảnh rồi dùng lại: Graphics vẽ lại mọi đường cong ở mỗi khung hình — máy không có
    // card đồ họa (Chromium chạy E2E trên CI) chậm gấp đôi cả bộ test (đo 02/11/2026).
    const key = 'battle.arena';
    if (!this.textures.exists(key)) {
      const g = this.make.graphics({}, false);
      this.paintArena(g);
      g.generateTexture(key, GAME_WIDTH, GAME_HEIGHT);
      g.destroy();
    }
    this.add.image(0, 0, key).setOrigin(0).setDepth(DEPTH.arena);
  }

  private paintArena(g: GameObjects.Graphics): void {
    const { centerX, centerY, heroRadius } = ARENA_LAYOUT;
    const { ringCount, sectorCount } = this.config;
    const outer = ringInnerRadius(ringCount, ARENA_LAYOUT);
    for (let ring = 0; ring < ringCount; ring++) {
      const inner = ringInnerRadius(ring, ARENA_LAYOUT);
      const outerR = ringInnerRadius(ring + 1, ARENA_LAYOUT);
      for (let sector = 0; sector < sectorCount; sector++) {
        const start = toPhaserAngle(sectorStartAngle(sector, sectorCount));
        const end = toPhaserAngle(sectorStartAngle(sector + 1, sectorCount));
        const dark = (ring + sector) % 2 === 1;
        g.fillStyle(colorNumber(dark ? 'ink' : 'white'), dark ? 0.1 : 0.07);
        g.beginPath();
        g.arc(centerX, centerY, outerR, start, end, false);
        g.arc(centerX, centerY, inner, end, start, true);
        g.closePath();
        g.fillPath();
      }
    }
    g.fillStyle(colorNumber('white'), 0.16).fillCircle(centerX, centerY, heroRadius);
    g.lineStyle(2, colorNumber('ink'), 0.25).strokeCircle(centerX, centerY, outer);
  }

  /** F18 đợt C: bóng elip dưới chân một hình (cao `height`, rộng `width` điểm, phóng `scale`). */
  private addShadow(
    point: Point,
    height: number,
    scale: number,
    width: number,
  ): GameObjects.Graphics {
    return this.add
      .graphics()
      .fillStyle(colorNumber('ink'), 0.25)
      .fillEllipse(0, 0, width * scale * 0.9, 6)
      .setPosition(point.x, point.y + (height * scale) / 2)
      .setDepth(DEPTH.shadow);
  }

  /**
   * Các hình nêm xanh của vũ khí đang cầm (hai nêm đối nhau với vũ khí chém hai phía): đúng các lát
   * và vòng mà luật chơi coi là trúng (đã kiểm bằng test layout). Đổi vũ khí là vẽ lại ngay.
   */
  private drawZone(): void {
    const { sectorCount } = this.config;
    const weapon = this.currentWeapon();
    const { centerX, centerY } = ARENA_LAYOUT;
    const { inner, outer } = zoneRadii(weapon, ARENA_LAYOUT);

    const g = this.zone.clear();
    for (const arc of zoneArcs(this.arcSector, weapon, sectorCount)) {
      const start = toPhaserAngle(arc.start);
      const end = toPhaserAngle(arc.end);
      const wedge = () => {
        g.beginPath();
        g.arc(centerX, centerY, outer, start, end, false);
        g.arc(centerX, centerY, inner, end, start, true);
        g.closePath();
      };
      // F18 đợt C: trắng phủ lên cỏ thành khoảng xanh sáng, viền trắng.
      g.fillStyle(colorNumber('white'), 0.45);
      wedge();
      g.fillPath();
      g.lineStyle(2, colorNumber('white'), 1);
      wedge();
      g.strokePath();
    }
  }

  /**
   * Vẽ quái theo ĐÚNG state, không theo "cái gì vừa đổi": tạo hình cho quái chưa có, dời quái đang
   * có tới ô mới, gỡ quái không còn trong state (teo lại rồi biến mất). Tính năng sau thêm cách
   * quái xuất hiện/biến mất mới thì hình vẫn tự khớp.
   */
  private syncMonsters(state: BattleState): void {
    const present = new Set(state.monsters.map((m) => m.id));
    for (const [id, unit] of this.monsterUnits) {
      if (present.has(id)) continue;
      this.monsterUnits.delete(id);
      this.tweens.killTweensOf([unit.shadow, ...unit.hp.parts]);
      unit.shadow.destroy();
      unit.hp.destroy();
    }
    for (const [id, sprite] of this.monsterSprites) {
      if (present.has(id)) continue;
      this.monsterSprites.delete(id);
      this.tweens.killTweensOf(sprite);
      this.tweens.add({
        targets: sprite,
        scale: 0,
        alpha: 0,
        duration: 220,
        onComplete: () => sprite.destroy(),
      });
    }

    for (const monster of state.monsters) {
      const point = cellToPoint(monster, this.config.sectorCount, ARENA_LAYOUT);
      let sprite = this.monsterSprites.get(monster.id);
      if (sprite) {
        this.tweens.add({ targets: sprite, x: point.x, y: point.y, duration: MOVE_TWEEN_MS });
      } else {
        sprite = this.spawnMonster(monster, point);
      }
      this.syncUnit(monster, point);
      // B6: quái đang bị đóng băng phủ kín màu băng (khối băng); hết băng thì về màu gốc. Phủ kín chứ
      // không nhân màu: nhân màu băng lên quái xanh lá (Yêu tinh…) gần như không đổi, người chơi không thấy.
      if ((monster.frozenTurns ?? 0) > 0) sprite.setTintFill(colorNumber(FROZEN_TINT));
      else sprite.clearTint();
      // F12: quái ma đang vô hình (lượt chẵn) vẽ mờ — chém lúc này là xuyên qua.
      sprite.setAlpha(canBeHit(monster, state, this.config) ? 1 : GHOST_HIDDEN_ALPHA);
    }

    this.syncThreatMarks(state);
  }

  /**
   * F04: dấu "!" đỏ trên đầu đúng những con luật coi là sẽ đánh sau nhát chém tới (willAttack — B6:
   * quái đang bị đóng băng thì không).
   */
  private syncThreatMarks(state: BattleState): void {
    const threatening = new Map(
      state.monsters.filter((m) => willAttack(m, this.config)).map((m) => [m.id, m] as const),
    );
    for (const [id, mark] of this.threatMarks) {
      if (threatening.has(id)) continue;
      mark.destroy();
      this.threatMarks.delete(id);
    }
    for (const [id, monster] of threatening) {
      const point = cellToPoint(monster, this.config.sectorCount, ARENA_LAYOUT);
      const mark =
        this.threatMarks.get(id) ??
        this.add
          .text(0, 0, '!', { ...TEXT, fontSize: '18px', color: PALETTE.red })
          .setOrigin(0.5)
          .setDepth(DEPTH.popup);
      mark.setPosition(point.x, point.y - 20);
      this.threatMarks.set(id, mark);
    }
  }

  /** F18 đợt C: bóng và thanh máu của quái — tạo khi chưa có, dời theo hình, vẽ lại máu theo state. */
  private syncUnit(monster: Monster, point: Point): void {
    const rows = BATTLE_SPRITES[monster.kind];
    const scale = SPRITE_SCALE[monster.kind];
    const anchor = hpBarAnchor(point, rows.length, scale);
    const shadowY = point.y + (rows.length * scale) / 2;
    let unit = this.monsterUnits.get(monster.id);
    if (!unit) {
      unit = {
        shadow: this.addShadow(point, rows.length, scale, rows[0]?.length ?? 12),
        hp: new HpBar(this, DEPTH.hpBar),
        max: monster.hp,
        shown: monster.hp,
      };
      unit.hp.moveTo(anchor.x, anchor.y);
      this.monsterUnits.set(monster.id, unit);
    } else {
      this.tweens.add({ targets: unit.shadow, x: point.x, y: shadowY, duration: MOVE_TWEEN_MS });
      const [bar, label] = unit.hp.parts;
      this.tweens.add({ targets: bar, x: anchor.x, y: anchor.y, duration: MOVE_TWEEN_MS });
      this.tweens.add({ targets: label, x: anchor.x, y: anchor.y - 1, duration: MOVE_TWEEN_MS });
    }
    unit.hp.draw(monster.hp, unit.max);
    unit.shown = monster.hp;
  }

  private spawnMonster(monster: Monster, point: Point): GameObjects.Image {
    const sprite = this.add
      .image(point.x, point.y, this.spriteKeys[monster.kind])
      .setScale(SPRITE_SCALE[monster.kind])
      .setDepth(DEPTH.monster);
    if (monster.rare) {
      // Đợt 5: quái hiếm "sáng" — viền phát sáng (chỉ WebGL) + phập phồng nhẹ (máy nào cũng thấy).
      sprite.preFX?.addGlow(colorNumber(RARE_GLOW), 4, 0, false, 0.1, 12);
      const scale = SPRITE_SCALE[monster.kind];
      this.tweens.add({
        targets: sprite,
        scale: scale * 1.12,
        duration: 420,
        yoyo: true,
        repeat: -1,
      });
    }
    this.monsterSprites.set(monster.id, sprite);
    return sprite;
  }

  /**
   * Số sát thương bay lên kiểu Pixel Chaos; quái trúng đòn mà còn sống thì nhấp nháy. Dùng cho nhát
   * chém và cho skill (B6).
   */
  private showHits(hits: readonly Hit[]): void {
    for (const hit of hits) {
      const sprite = this.monsterSprites.get(hit.monsterId);
      if (!sprite) continue;
      const label = this.add
        .text(sprite.x, sprite.y - 10, `-${hit.damage}`, {
          ...TEXT,
          fontSize: '18px',
          color: hit.killed ? PALETTE.orange : PALETTE.yellow,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.popup);
      this.tweens.add({
        targets: label,
        y: label.y - 28,
        alpha: 0,
        duration: 650,
        onComplete: () => label.destroy(),
      });

      // Quái chết được syncMonsters gỡ (teo lại) ngay sau đây.
      if (!hit.killed) {
        this.tweens.add({ targets: sprite, alpha: 0.3, duration: 70, yoyo: true, repeat: 1 });
      }
    }
  }

  /** Chữ bay lên rồi mờ dần ở (x, y). */
  private popText(x: number, y: number, text: string, color: string, fontSize = '18px'): void {
    const label = this.add
      .text(x, y, text, { ...TEXT, fontSize, color })
      .setOrigin(0.5)
      .setDepth(DEPTH.popup);
    this.tweens.add({
      targets: label,
      y: y - 30,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy(),
    });
  }

  /** B6: nhát chí mạng hiện "CHÍ MẠNG!" trên đầu nhân vật; nhát hồi máu hiện "+n" bên cạnh. */
  private showStrikeBonus(state: BattleState): void {
    const { centerX, centerY } = ARENA_LAYOUT;
    if (state.lastAttack?.crit) this.popText(centerX, centerY - 44, 'CHÍ MẠNG!', PALETTE.red);
    const healed = state.lastAttack?.healed ?? 0;
    // Hồi máu rồi vẫn gục trong cùng lượt: không hiện "+n" chồng lên màn THUA.
    if (healed > 0 && state.phase !== 'lost')
      this.popText(centerX + 34, centerY - 6, `+${healed}`, PALETTE.leaf, '20px');
  }

  /** B6: chớp cả sân màu của skill vừa bấm. */
  private flashArena(color: PaletteColor): void {
    const { centerX, centerY } = ARENA_LAYOUT;
    const flash = this.add
      .graphics()
      .fillStyle(colorNumber(color))
      .fillCircle(centerX, centerY, ringInnerRadius(this.config.ringCount, ARENA_LAYOUT))
      .setAlpha(0.5)
      .setDepth(DEPTH.popup);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 450,
      onComplete: () => flash.destroy(),
    });
  }

  // ---------- Chữ trên màn hình ----------

  /**
   * F18 đợt C: thanh trên kiểu Micro RPG — ô vàng (trái), thẻ treo "LƯỢT" + số lượt còn lại (giữa), ô nhiệm
   * vụ bằng hình quái (phải); số màn chữ nhỏ dưới ô vàng. Máu hiệp sĩ là thanh trên đầu.
   */
  private createHud(): void {
    this.add
      .graphics()
      .fillStyle(colorNumber('shadow'))
      .fillRect(TOP_BAR.x, TOP_BAR.y, TOP_BAR.width, TOP_BAR.height)
      .fillStyle(colorNumber('ink'))
      .fillRect(TOP_BAR.x, TOP_BAR.y + TOP_BAR.height, TOP_BAR.width, 3)
      .setDepth(DEPTH.hud);
    this.gold = goldPill(this, GOLD_PILL, this.uiKeys.coin, DEPTH.hud);
    drawPanel(this, TURN_TAB, 'ink', DEPTH.hud, 0);
    const tabX = TURN_TAB.x + TURN_TAB.width / 2;
    this.add
      .text(tabX, TURN_TAB.y + 18, 'LƯỢT', { ...TEXT, fontSize: '12px', color: PALETTE.mist })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.turnsText = this.add
      .text(tabX, TURN_TAB.y + 45, '', { ...TEXT, fontSize: '26px' })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    drawPanel(this, QUEST_PILL, 'white', DEPTH.hud, 3);
    this.add
      .image(QUEST_PILL.x + 14, QUEST_PILL.y + QUEST_PILL.height / 2, this.uiKeys.star)
      .setScale(2)
      .setDepth(DEPTH.hud);
    this.questIcon = this.add
      .image(QUEST_PILL.x + 46, QUEST_PILL.y + QUEST_PILL.height / 2, this.spriteKeys.slime)
      .setScale(1.5)
      .setDepth(DEPTH.hud);
    this.questText = this.add
      .text(QUEST_PILL.x + QUEST_PILL.width - 10, QUEST_PILL.y + QUEST_PILL.height / 2, '', {
        ...TEXT,
        fontSize: '15px',
        color: PALETTE.ink,
        strokeThickness: 0,
      })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.hud);
    this.levelText = this.add
      .text(GOLD_PILL.x + 4, GOLD_PILL.y + GOLD_PILL.height + 14, '', {
        ...TEXT,
        fontSize: '13px',
        color: PALETTE.yellow,
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);
  }

  private updateHud(): void {
    const { quest } = levelAt(this.battle.level, this.config);
    this.turnsText.setText(String(this.battle.turnsLeft));
    // Đợt 7: số màn đếm trong chương (chủ đề).
    const chapter = chapterOf(this.battle.level, CHAPTERS);
    this.levelText.setText(`Màn ${chapter.number}/${chapter.levelCount}`);
    // F18 đợt B: chơi lại không nhận vàng — ô vàng ghi "—".
    this.gold.set(this.replay ? '—' : String(this.battle.gold));
    this.heroHp.draw(this.battle.heroHp, this.config.hero.hp);
    // F11: nhiệm vụ "đã hạ/cần" với hình quái của nhiệm vụ; màn không nhiệm vụ thì đếm quái còn lại.
    const kind = quest?.kind ?? this.battle.monsters[0]?.kind ?? 'slime';
    this.questIcon.setTexture(this.spriteKeys[kind]);
    this.questText.setText(
      quest ? `${this.battle.questProgress}/${quest.count}` : String(this.battle.monsters.length),
    );
  }

  // ---------- Thanh nút vũ khí (F02) ----------

  private currentWeapon() {
    const weapon = this.config.weapons[this.battle.weaponIndex];
    if (!weapon) throw new RangeError(`Không có vũ khí số ${this.battle.weaponIndex}`);
    return weapon;
  }

  /** Vẽ khung nút một lần; trạng thái chọn/không chọn do syncWeaponBar cập nhật theo state. */
  private createWeaponBar(): void {
    // B4: chỉ các món đã mang vào trận, theo thứ tự tầm gần → xa. B6: ô skill ở cuối nếu mang skill.
    const { weapons } = this.loadout;
    const rects = weaponButtonRects(barButtonCount(this.loadout), WEAPON_BAR);
    // F18 đợt C: dải nền tối sau thanh vũ khí (như bản phác) — viền xanh lá của thẻ đang cầm trùng màu cỏ,
    // đặt thẳng lên khung cảnh thì không thấy.
    const bandTop = WEAPON_BAR.top - 12;
    this.add
      .graphics()
      .fillStyle(colorNumber('ink'))
      .fillRect(0, bandTop - 3, GAME_WIDTH, 3)
      .fillStyle(colorNumber('dusk'))
      .fillRect(0, bandTop, GAME_WIDTH, GAME_HEIGHT - bandTop)
      .setDepth(DEPTH.hud);
    this.createSkillButton(rects);
    weapons.forEach((weaponIndex, i) => {
      const rect = rects[i];
      const weapon = this.config.weapons[weaponIndex];
      if (!rect || !weapon) return;
      // F18 đợt C: thẻ có hình vũ khí bên trái, tên và tầm/cấp bên phải.
      const textX = rect.x + rect.width / 2 + 14;
      const box = this.add.graphics().setDepth(DEPTH.hud);
      const icon = WEAPON_ICON[weapon.name];
      if (icon) {
        this.add
          .image(rect.x + 20, rect.y + rect.height / 2, this.uiKeys[icon])
          .setScale(2)
          .setDepth(DEPTH.hud);
      }
      const name = this.add
        .text(textX, rect.y + 26, weapon.name, { ...TEXT, fontSize: '17px' })
        .setOrigin(0.5)
        .setDepth(DEPTH.hud);
      // F19: tên dài ("Lưỡi hái") không vừa phần bên phải hình vũ khí thì xuống hai dòng, chữ nhỏ hơn.
      const room = rect.width - 26;
      if (name.width > room) {
        name.setFontSize('13px').setWordWrapWidth(room).setAlign('center').setLineSpacing(-4);
        if (name.width > room) name.setScale(room / name.width);
      }
      const range = this.add
        .text(textX, rect.y + 50, this.weaponSubLabel(weaponIndex), { ...TEXT, fontSize: '13px' })
        .setOrigin(0.5)
        .setDepth(DEPTH.hud);
      // Đợt 5: cấp cao nhất ("Thần") có sét sáng quanh nút.
      if (weapon.tier === LOOT_CONFIG.tiers.length - 1) addLightning(this, rect, DEPTH.hud);
      this.weaponButtons.push({ box, rect, name, range, tier: weapon.tier ?? 0 });
    });
  }

  /** B6: ô skill — tên skill, mức nạp tô màu từ đáy lên, số nhát đã nạp hoặc "BẤM!" khi đầy. */
  private createSkillButton(
    rects: readonly { x: number; y: number; width: number; height: number }[],
  ): void {
    const index = skillButtonIndex(this.loadout);
    const kind = this.loadout.skill;
    const rect = index === null ? undefined : rects[index];
    if (!rect || kind === undefined) return;
    const centerX = rect.x + rect.width / 2;
    const box = this.add.graphics().setDepth(DEPTH.hud);
    const name = this.add
      .text(centerX, rect.y + 24, this.config.skills[kind].name, { ...TEXT, fontSize: '13px' })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    const charge = this.add
      .text(centerX, rect.y + 50, '', { ...TEXT, fontSize: '15px' })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.skillButton = { box, rect, color: SKILL_COLOR[kind], name, charge };
  }

  /** B6: cập nhật ô skill theo state — mức nạp, chữ, viền vàng khi bấm được. */
  private syncSkillButton(state: BattleState): void {
    const button = this.skillButton;
    const kind = state.loadout.skill;
    if (!button || kind === undefined) return;
    const { chargeTurns } = this.config.skills[kind];
    const ready = canCastSkill(state, this.config);
    const { rect, box } = button;
    const inner = { x: rect.x + 3, y: rect.y + 3, width: rect.width - 6, height: rect.height - 6 };
    const height = (inner.height * Math.min(state.skillCharge, chargeTurns)) / chargeTurns;
    // Viền 3 điểm vàng khi bấm được; mức nạp mọc từ đáy ô lên.
    box
      .clear()
      .fillStyle(colorNumber(ready ? 'yellow' : 'ink'))
      .fillRect(rect.x, rect.y, rect.width, rect.height)
      .fillStyle(colorNumber('plum'))
      .fillRect(inner.x, inner.y, inner.width, inner.height)
      .fillStyle(colorNumber(button.color), 0.55)
      .fillRect(inner.x, inner.y + inner.height - height, inner.width, height);
    button.name.setColor(ready ? PALETTE.white : PALETTE.mist);
    button.charge
      .setText(ready ? 'BẤM!' : `${state.skillCharge}/${chargeTurns}`)
      .setColor(ready ? PALETTE.yellow : PALETTE.mist);
  }

  /** Nút của vũ khí đang cầm có viền xanh lá và chữ sáng; các nút khác mờ đi. */
  private syncWeaponBar(state: BattleState): void {
    this.weaponButtons.forEach((button, i) => {
      const selected = state.loadout.weapons[i] === state.weaponIndex;
      const { rect } = button;
      button.box
        .clear()
        .fillStyle(colorNumber(selected ? 'leaf' : 'ink'))
        .fillRect(rect.x, rect.y, rect.width, rect.height)
        .fillStyle(colorNumber('navy'))
        .fillRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6);
      button.name.setColor(selected ? PALETTE.white : PALETTE.mist);
      button.range.setColor(selected ? PALETTE.yellow : PALETTE.mist);
      if (button.tier > 0) styleTierText(button.range, button.tier);
    });
  }

  private createResultLayer(): void {
    const backdrop = this.add
      .graphics()
      .fillStyle(colorNumber('ink'), 0.7)
      .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // F18 đợt C: bảng kết quả cùng kiểu khung với các bảng khác (khối viền mực, đổ bóng).
    const panel = drawPanel(this, { x: 24, y: 196, width: 312, height: 250 }, 'dusk', DEPTH.result);
    this.resultTitle = this.add
      .text(GAME_WIDTH / 2, 250, '', { ...TEXT, fontSize: '44px' })
      .setOrigin(0.5);
    this.resultDetail = this.add
      .text(GAME_WIDTH / 2, 310, '', { ...TEXT, fontSize: '16px' })
      .setOrigin(0.5);
    this.resultGold = this.add
      .text(GAME_WIDTH / 2, 342, '', { ...TEXT, fontSize: '16px', color: PALETTE.yellow })
      .setOrigin(0.5);
    this.resultLoot = this.add
      .text(GAME_WIDTH / 2, 370, '', {
        ...TEXT,
        fontSize: '15px',
        align: 'center',
        wordWrap: { width: 320 },
      })
      .setOrigin(0.5);
    this.resultHint = this.add
      .text(GAME_WIDTH / 2, 410, '', { ...TEXT, fontSize: '18px', color: PALETTE.yellow })
      .setOrigin(0.5);
    this.resultLayer = this.add
      .container(0, 0, [
        backdrop,
        panel,
        this.resultTitle,
        this.resultDetail,
        this.resultGold,
        this.resultLoot,
        this.resultHint,
      ])
      .setDepth(DEPTH.result)
      .setVisible(false);
  }

  private showResult(state: BattleState): void {
    this.endedAtMs = this.time.now;
    const next = nextLevelIndex(state, this.config) + 1;
    // F11: thắng = xong nhiệm vụ (màn không có nhiệm vụ: diệt sạch quái).
    const { quest } = levelAt(state.level, this.config);
    const done = `${quest ? 'Xong nhiệm vụ' : 'Diệt sạch quái'}, còn dư ${state.turnsLeft} lượt`;
    if (isGameCleared(state, this.config)) {
      this.resultTitle.setText('PHÁ ĐẢO!').setColor(PALETTE.yellow);
      this.resultDetail.setText(done);
      this.resultHint.setText(`Chạm để chơi lại từ màn ${next}`);
    } else if (state.phase === 'won') {
      this.resultTitle.setText('THẮNG!').setColor(PALETTE.leaf);
      this.resultDetail.setText(done);
      this.resultHint.setText(`Chạm để sang màn ${next}`);
    } else {
      this.resultTitle.setText('THUA').setColor(PALETTE.orange);
      this.resultDetail.setText(
        state.lossReason === 'heroDefeated'
          ? 'Bạn đã gục'
          : `Hết lượt mà ${quest ? 'chưa xong nhiệm vụ' : 'quái vẫn còn'}`,
      );
      this.resultHint.setText(`Chạm để chơi lại màn ${next}`);
    }
    this.saveRewards(state);
    this.resultLayer.setVisible(true);
  }

  /**
   * Đợt 3: cộng trận vào hồ sơ (vàng — thắng hay thua đều giữ; thắng thì mở khóa màn kế), lưu lại, và
   * hiện số vàng. Đợt 5: hạ quái hiếm thì tung rơi đồ (luật ở logic/loot.ts), lưu cấp vũ khí + bảo hiểm,
   * hiện món rơi. F19: món rơi theo loài, vĩnh viễn hoặc có hạn; món thừa đổi vàng (applyDrop). Gọi đúng một
   * lần mỗi trận (lúc hiện màn kết quả). Không lưu được thì vẫn chơi tiếp.
   */
  private saveRewards(state: BattleState): void {
    const before = loadProfile();
    // Đợt 6: món có hạn mang vào trận này bớt 1 trận (thắng hay thua) — trừ trước khi nhận món mới rơi.
    const used = rentalsAfterBattle(before, state.loadout);
    if (this.replay) {
      // F18 đợt B: chơi lại chỉ trừ món thuê (luật ở profile.applyBattleResult); không tung rơi đồ.
      const saved = saveProfile(
        applyBattleResult(
          before,
          { level: state.level, won: state.phase === 'won', gold: state.gold, ...used },
          this.config.levels.length,
        ),
      );
      this.drop = null;
      this.resultGold.setText(
        saved ? 'Chơi lại: không nhận vàng' : 'Chơi lại: không nhận vàng (không lưu được)',
      );
      this.showDrop(state, null, null, 0);
      return;
    }
    const { drop, pity } = lootAfterBattle(
      state,
      readPity(before.lootPity),
      this.config,
      LOOT_CONFIG,
    );
    this.drop = drop;
    let inventory: Inventory = { tiers: before.weaponTiers, ...used };
    let outcome: DropOutcome | null = null;
    let salvage = 0;
    if (drop) {
      // F19: vũ khí chưa mở khóa theo màn thì món Thường rơi ra vẫn nhận (không phải món thừa).
      const weapon = BATTLE_CONFIG.weapons[drop.weapon];
      const cleared = clearedLevelCount(before, this.config.levels.length);
      const unlocked = weapon ? isUnlocked(weapon, cleared) : true;
      ({ inventory, outcome, salvage } = applyDrop(
        inventory,
        drop,
        LOOT_CONFIG,
        SHOP_CONFIG.tier,
        unlocked,
      ));
    }
    const gold = state.gold + salvage;
    const profile = applyBattleResult(
      before,
      {
        level: state.level,
        won: state.phase === 'won',
        gold,
        loot: state.rareKilled
          ? { weaponTiers: inventory.tiers, lootPity: { ...pity } }
          : undefined,
        rentals: inventory.rentals,
        rentalTiers: inventory.rentalTiers,
      },
      this.config.levels.length,
    );
    const saved = saveProfile(profile);
    this.resultGold.setText(
      saved ? `+${gold} vàng · tổng ${profile.gold}` : `+${gold} vàng (không lưu được)`,
    );
    this.showDrop(state, drop, outcome, salvage);
  }

  /**
   * Đợt 5: dòng báo rơi đồ — tên món tô màu cấp. F19: ghi dạng món (vĩnh viễn / số trận); món thừa ghi "đã có" và
   * số vàng đổi được.
   */
  private showDrop(
    state: BattleState,
    drop: Drop | null,
    outcome: DropOutcome | null,
    salvage: number,
  ): void {
    this.resultLoot.setText('').setColor(PALETTE.white).setStroke(PALETTE.ink, 4);
    if (!state.rareKilled || this.replay) return;
    if (!drop || !outcome) {
      this.resultLoot.setText('Quái hiếm không rơi đồ lần này').setColor(PALETTE.mist);
      return;
    }
    const weapon = BATTLE_CONFIG.weapons[drop.weapon]?.name ?? '';
    const tier = LOOT_CONFIG.tiers[drop.tier]?.name ?? '';
    const form = {
      permanent: 'vĩnh viễn!',
      rental: `${drop.battles ?? 0} trận!`,
      extended: `thêm ${drop.battles ?? 0} trận!`,
      salvaged: `đã có · +${salvage} vàng`,
    }[outcome];
    this.resultLoot.setText(`Rơi: ${weapon} ${tier} · ${form}`);
    styleTierText(this.resultLoot, drop.tier);
  }

  /** Dòng dưới tên vũ khí: tên cấp màu nếu có (đợt 5), không thì tầm ("gần", "2 phía"…). */
  private weaponSubLabel(weaponIndex: number): string {
    const weapon = this.config.weapons[weaponIndex];
    if (!weapon) return '';
    return weapon.tier ? (LOOT_CONFIG.tiers[weapon.tier]?.name ?? '') : weapon.rangeLabel;
  }
}
