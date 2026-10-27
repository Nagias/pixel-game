// Scene trận đấu: VỎ hiển thị. Chỉ vẽ state và chuyển cú chạm thành selectWeapon()/playTurn() —
// không chứa luật chơi. Game chỉ cho mobile: mọi thao tác là chạm, không có bàn phím.
// B4: mở từ màn chuẩn bị (LoadoutScene) với màn + bộ đồ; hết màn thì quay về màn chuẩn bị màn kế.
import { Scene, Scenes, type GameObjects, type Input } from 'phaser';
import { registerPixelSprites } from '../../../app/pixelSprites';
import { setSnapshotProvider } from '../../../app/testBridge';
import { colorNumber, PALETTE, type PaletteColor } from '../../../shared/palette';
import { parseSeedParam } from '../../../shared/seedParam';
import { applyBattleResult, loadProfile, saveProfile } from '../../profile';
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
import { BATTLE_CONFIG, UPGRADE_CONFIG } from '../logic/battleConfig';
import { withUpgrades } from '../logic/upgrades';
import type { BattleState, Hit, Loadout, Monster, SkillKind } from '../logic/battleTypes';
import { defaultLoadout } from '../logic/loadout';
import {
  ARENA_LAYOUT,
  barButtonCount,
  cellToPoint,
  type Point,
  polarToPoint,
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
import type { LoadoutSceneData } from './LoadoutScene';

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
}

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
/** Hành vi giao diện, không phải luật chơi: màn kết quả chờ chút mới nhận chạm đi tiếp. */
const RESTART_DELAY_MS = 500;
const MOVE_TWEEN_MS = 180;

const DEPTH = { arena: 0, zone: 1, monster: 2, hero: 3, popup: 4, hud: 5, result: 10 } as const;

/** B6: màu riêng của từng skill — nút nạp, chớp sân khi bấm. */
const SKILL_COLOR: Record<SkillKind, PaletteColor> = { iceRain: 'sky', fireball: 'orange' };
/** B6: quái bị đóng băng nhuộm màu này. */
const FROZEN_TINT: PaletteColor = 'cyan';
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
  /** Cấu hình trận đã cộng nâng cấp trong hồ sơ (đợt 4): máu tối đa, chí mạng, hồi máu. */
  private config = BATTLE_CONFIG;
  private readonly fixedSeed = parseSeedParam(window.location.search);
  private level = 0;
  private loadout!: Loadout;
  private battle!: BattleState;
  private arcElapsedMs = 0;
  private arcSector = 0;
  private endedAtMs: number | null = null;

  private zone!: GameObjects.Graphics;
  private turnsText!: GameObjects.Text;
  private levelText!: GameObjects.Text;
  private heroHpText!: GameObjects.Text;
  /** F11: tiến độ nhiệm vụ (góc trên bên phải). */
  private questText!: GameObjects.Text;
  /** F04: dấu "!" trên đầu quái sắp đánh, theo id quái. */
  private readonly threatMarks = new Map<number, GameObjects.Text>();
  private resultLayer!: GameObjects.Container;
  private resultTitle!: GameObjects.Text;
  private resultDetail!: GameObjects.Text;
  /** Đợt 3: vàng nhặt trong trận + tổng vàng trong hồ sơ. */
  private resultGold!: GameObjects.Text;
  private resultHint!: GameObjects.Text;
  private readonly monsterSprites = new Map<number, GameObjects.Image>();
  private spriteKeys!: Record<keyof typeof BATTLE_SPRITES, string>;
  private weaponButtons: {
    frame: GameObjects.Rectangle;
    name: GameObjects.Text;
    range: GameObjects.Text;
  }[] = [];
  /** B6: ô skill cuối thanh nút (null nếu không mang skill). */
  private skillButton: {
    frame: GameObjects.Rectangle;
    fill: GameObjects.Rectangle;
    name: GameObjects.Text;
    charge: GameObjects.Text;
  } | null = null;

  constructor() {
    super('battle');
  }

  /** Màn chuẩn bị gửi màn + bộ đồ. Không có (chỉ khi mở thẳng scene này) thì màn 1, bộ mặc định. */
  init(data: Partial<LoadoutSceneData>): void {
    this.config = withUpgrades(BATTLE_CONFIG, loadProfile().upgrades, UPGRADE_CONFIG);
    this.level = data.level ?? 0;
    this.loadout = data.loadout ?? defaultLoadout(this.config);
  }

  create(): void {
    // Phaser dùng lại cùng đối tượng scene mỗi lần mở: bỏ tham chiếu tới hình của lần trước.
    this.monsterSprites.clear();
    this.threatMarks.clear();
    this.weaponButtons = [];
    this.skillButton = null;

    this.spriteKeys = registerPixelSprites(this, 'battle', BATTLE_SPRITES);
    this.drawArena();
    this.zone = this.add.graphics().setDepth(DEPTH.zone);
    this.add
      .image(ARENA_LAYOUT.centerX, ARENA_LAYOUT.centerY, this.spriteKeys.hero)
      .setScale(SPRITE_SCALE.hero)
      .setDepth(DEPTH.hero);
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
   * là chém. Màn kết quả: chạm để sang màn
   * chuẩn bị của màn sau hoặc của màn vừa thua — màn nào do luật quyết (nextLevelIndex).
   */
  private handleTap(x: number, y: number): void {
    if (this.battle.phase !== 'playing') {
      if (this.canRestart()) {
        const data: LoadoutSceneData = {
          level: nextLevelIndex(this.battle, this.config),
          loadout: this.battle.loadout,
        };
        this.scene.start('loadout', data);
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
    };
  }

  // ---------- Vẽ ----------

  private drawArena(): void {
    const { centerX, centerY, heroRadius } = ARENA_LAYOUT;
    const { ringCount, sectorCount } = this.config;
    const outer = ringInnerRadius(ringCount, ARENA_LAYOUT);
    const g = this.add.graphics().setDepth(DEPTH.arena);

    g.fillStyle(colorNumber('teal')).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(colorNumber('grass')).fillCircle(centerX, centerY, outer);

    // Vạch chia 24 lát và các vòng, mờ để không lấn vùng xanh.
    g.lineStyle(1, colorNumber('teal'), 0.5);
    for (let sector = 0; sector < sectorCount; sector++) {
      const angle = sectorStartAngle(sector, sectorCount);
      const from = polarToPoint(angle, heroRadius, ARENA_LAYOUT);
      const to = polarToPoint(angle, outer, ARENA_LAYOUT);
      g.lineBetween(from.x, from.y, to.x, to.y);
    }
    for (let ring = 1; ring < ringCount; ring++) {
      g.strokeCircle(centerX, centerY, ringInnerRadius(ring, ARENA_LAYOUT));
    }

    g.fillStyle(colorNumber('teal')).fillCircle(centerX, centerY, heroRadius);
    g.lineStyle(3, colorNumber('ink')).strokeCircle(centerX, centerY, outer);
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
      g.fillStyle(colorNumber('lime'), 0.6);
      wedge();
      g.fillPath();
      g.lineStyle(2, colorNumber('white'), 0.9);
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
      // B6: quái đang bị đóng băng nhuộm màu băng; hết băng thì về màu gốc.
      if ((monster.frozenTurns ?? 0) > 0) sprite.setTint(colorNumber(FROZEN_TINT));
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
          .text(0, 0, '!', { ...TEXT, fontSize: '18px', color: PALETTE.crimson })
          .setOrigin(0.5)
          .setDepth(DEPTH.popup);
      mark.setPosition(point.x, point.y - 20);
      this.threatMarks.set(id, mark);
    }
  }

  private spawnMonster(monster: Monster, point: Point): GameObjects.Image {
    const sprite = this.add
      .image(point.x, point.y, this.spriteKeys[monster.kind])
      .setScale(SPRITE_SCALE[monster.kind])
      .setDepth(DEPTH.monster);
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
          color: hit.killed ? PALETTE.orange : PALETTE.sand,
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
    if (state.lastAttack?.crit) this.popText(centerX, centerY - 44, 'CHÍ MẠNG!', PALETTE.crimson);
    const healed = state.lastAttack?.healed ?? 0;
    // Hồi máu rồi vẫn gục trong cùng lượt: không hiện "+n" chồng lên màn THUA.
    if (healed > 0 && state.phase !== 'lost')
      this.popText(centerX + 34, centerY - 6, `+${healed}`, PALETTE.lime, '20px');
  }

  /** B6: chớp cả sân màu của skill vừa bấm. */
  private flashArena(color: PaletteColor): void {
    const { centerX, centerY } = ARENA_LAYOUT;
    const flash = this.add
      .circle(
        centerX,
        centerY,
        ringInnerRadius(this.config.ringCount, ARENA_LAYOUT),
        colorNumber(color),
      )
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

  private createHud(): void {
    this.turnsText = this.add.text(16, 16, '', { ...TEXT, fontSize: '20px' }).setDepth(DEPTH.hud);
    // F06: số lượt có thể 2 chữ số ("Lượt: 12/12") nên thanh trên chia 2 hàng, mỗi hàng chỉ 2 ô
    // ở hai mép — không ô nào đè ô nào.
    this.heroHpText = this.add
      .text(GAME_WIDTH - 16, 46, '', { ...TEXT, fontSize: '20px', color: PALETTE.lime })
      .setOrigin(1, 0)
      .setDepth(DEPTH.hud);
    this.levelText = this.add
      .text(16, 46, '', { ...TEXT, fontSize: '20px', color: PALETTE.sand })
      .setDepth(DEPTH.hud);
    this.questText = this.add
      .text(GAME_WIDTH - 16, 16, '', { ...TEXT, fontSize: '20px' })
      .setOrigin(1, 0)
      .setDepth(DEPTH.hud);
    this.add
      .text(GAME_WIDTH / 2, 490, 'Chạm sân: chém · Chạm nút: đổi vũ khí', {
        ...TEXT,
        fontSize: '14px',
        color: PALETTE.mist,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }

  private updateHud(): void {
    const { turnLimit, quest } = levelAt(this.battle.level, this.config);
    this.turnsText.setText(`Lượt: ${this.battle.turnsLeft}/${turnLimit}`);
    this.levelText.setText(`Màn ${this.battle.level + 1}/${this.config.levels.length}`);
    this.heroHpText.setText(`Máu: ${this.battle.heroHp}/${this.config.hero.hp}`);
    // F11: ô nhiệm vụ thay ô "Quái: n" — "Slime 3/6" (màn không có nhiệm vụ thì vẫn đếm quái).
    this.questText.setText(
      quest
        ? `${this.config.monsterKinds[quest.kind].name} ${this.battle.questProgress}/${quest.count}`
        : `Quái: ${this.battle.monsters.length}`,
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
    this.createSkillButton(rects);
    weapons.forEach((weaponIndex, i) => {
      const rect = rects[i];
      const weapon = this.config.weapons[weaponIndex];
      if (!rect || !weapon) return;
      const centerX = rect.x + rect.width / 2;
      const frame = this.add
        .rectangle(rect.x, rect.y, rect.width, rect.height, colorNumber('navy'))
        .setOrigin(0)
        .setDepth(DEPTH.hud);
      const name = this.add
        .text(centerX, rect.y + 26, weapon.name, { ...TEXT, fontSize: '18px' })
        .setOrigin(0.5)
        .setDepth(DEPTH.hud);
      const range = this.add
        .text(centerX, rect.y + 50, weapon.rangeLabel, { ...TEXT, fontSize: '14px' })
        .setOrigin(0.5)
        .setDepth(DEPTH.hud);
      this.weaponButtons.push({ frame, name, range });
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
    const frame = this.add
      .rectangle(rect.x, rect.y, rect.width, rect.height, colorNumber('navy'))
      .setOrigin(0)
      .setDepth(DEPTH.hud);
    // Mức nạp: hình chữ nhật mọc từ đáy ô lên (syncSkillButton đặt chiều cao và mép trên).
    const fill = this.add
      .rectangle(rect.x, rect.y + rect.height, rect.width, 0, colorNumber(SKILL_COLOR[kind]), 0.55)
      .setOrigin(0)
      .setDepth(DEPTH.hud);
    const name = this.add
      .text(centerX, rect.y + 24, this.config.skills[kind].name, { ...TEXT, fontSize: '13px' })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    const charge = this.add
      .text(centerX, rect.y + 50, '', { ...TEXT, fontSize: '15px' })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.skillButton = { frame, fill, name, charge };
  }

  /** B6: cập nhật ô skill theo state — mức nạp, chữ, viền vàng khi bấm được. */
  private syncSkillButton(state: BattleState): void {
    const button = this.skillButton;
    const kind = state.loadout.skill;
    if (!button || kind === undefined) return;
    const { chargeTurns } = this.config.skills[kind];
    const ready = canCastSkill(state, this.config);
    // Đổi cả kích thước lẫn mép trên (setSize): gán .height trực tiếp thì Phaser không tính lại tâm hình
    // nên khối nạp mọc tràn xuống dưới ô.
    const { frame } = button;
    const height = (frame.height * Math.min(state.skillCharge, chargeTurns)) / chargeTurns;
    button.fill.setSize(frame.width, height).setPosition(frame.x, frame.y + frame.height - height);
    button.frame.setStrokeStyle(ready ? 3 : 1, colorNumber(ready ? 'sand' : 'slate'));
    button.name.setColor(ready ? PALETTE.white : PALETTE.mist);
    button.charge
      .setText(ready ? 'BẤM!' : `${state.skillCharge}/${chargeTurns}`)
      .setColor(ready ? PALETTE.sand : PALETTE.mist);
  }

  /** Nút của vũ khí đang cầm có viền xanh lá và chữ sáng; các nút khác mờ đi. */
  private syncWeaponBar(state: BattleState): void {
    this.weaponButtons.forEach((button, i) => {
      const selected = state.loadout.weapons[i] === state.weaponIndex;
      button.frame.setStrokeStyle(selected ? 3 : 1, colorNumber(selected ? 'lime' : 'slate'));
      button.name.setColor(selected ? PALETTE.white : PALETTE.mist);
      button.range.setColor(selected ? PALETTE.sand : PALETTE.mist);
    });
  }

  private createResultLayer(): void {
    const backdrop = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, colorNumber('ink'), 0.8)
      .setOrigin(0);
    this.resultTitle = this.add
      .text(GAME_WIDTH / 2, 250, '', { ...TEXT, fontSize: '44px' })
      .setOrigin(0.5);
    this.resultDetail = this.add
      .text(GAME_WIDTH / 2, 310, '', { ...TEXT, fontSize: '16px' })
      .setOrigin(0.5);
    this.resultGold = this.add
      .text(GAME_WIDTH / 2, 342, '', { ...TEXT, fontSize: '16px', color: PALETTE.sand })
      .setOrigin(0.5);
    this.resultHint = this.add
      .text(GAME_WIDTH / 2, 380, '', { ...TEXT, fontSize: '18px', color: PALETTE.sand })
      .setOrigin(0.5);
    this.resultLayer = this.add
      .container(0, 0, [
        backdrop,
        this.resultTitle,
        this.resultDetail,
        this.resultGold,
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
      this.resultTitle.setText('PHÁ ĐẢO!').setColor(PALETTE.sand);
      this.resultDetail.setText(done);
      this.resultHint.setText(`Chạm để chơi lại từ màn ${next}`);
    } else if (state.phase === 'won') {
      this.resultTitle.setText('THẮNG!').setColor(PALETTE.lime);
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
    this.showGold(state);
    this.resultLayer.setVisible(true);
  }

  /**
   * Đợt 3: cộng trận vào hồ sơ (vàng — thắng hay thua đều giữ; thắng thì mở khóa màn kế), lưu lại, và
   * hiện số vàng. Gọi đúng một lần mỗi trận (lúc hiện màn kết quả). Không lưu được thì vẫn chơi tiếp.
   */
  private showGold(state: BattleState): void {
    const profile = applyBattleResult(
      loadProfile(),
      { level: state.level, won: state.phase === 'won', gold: state.gold },
      this.config.levels.length,
    );
    const saved = saveProfile(profile);
    this.resultGold.setText(
      saved ? `+${state.gold} vàng · tổng ${profile.gold}` : `+${state.gold} vàng (không lưu được)`,
    );
  }
}
