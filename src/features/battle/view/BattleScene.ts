// Scene trận đấu: VỎ hiển thị. Chỉ vẽ state và chuyển cú chạm thành playTurn() — không chứa luật chơi.
import { Scene, Scenes, type GameObjects } from 'phaser';
import { registerPixelSprites } from '../../../app/pixelSprites';
import { setSnapshotProvider } from '../../../app/testBridge';
import { colorNumber, PALETTE } from '../../../shared/palette';
import { parseSeedParam } from '../../../shared/seedParam';
import { arcSectorAt } from '../logic/arena';
import { createBattle, playTurn } from '../logic/battle';
import { BATTLE_CONFIG } from '../logic/battleConfig';
import type { BattleState, Monster } from '../logic/battleTypes';
import {
  ARENA_LAYOUT,
  cellToPoint,
  type Point,
  polarToPoint,
  ringInnerRadius,
  sectorStartAngle,
  toPhaserAngle,
  zoneArc,
  zoneRadii,
} from './battleLayout';
import { BATTLE_SPRITES, SPRITE_SCALE } from './battleSprites';

/** Thứ test E2E đọc được qua window.__PIXEL_GAME__.snapshot(). */
export interface BattleSnapshot {
  readonly scene: 'battle';
  /** Lát vùng xanh đang chỉ — chạm lúc này sẽ đánh vào lát đó. */
  readonly arcSector: number;
  /** Thời gian vùng xanh đã quay trong trận này (ms) — để test tính trước lúc nó tới một lát. */
  readonly arcElapsedMs: number;
  /** Màn kết quả đã hiện đủ lâu để chạm chơi lại (chống chạm nhầm). */
  readonly canRestart: boolean;
  readonly battle: BattleState;
}

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
/** Hành vi giao diện, không phải luật chơi: màn kết quả chờ chút mới nhận chạm "chơi lại". */
const RESTART_DELAY_MS = 500;
const MOVE_TWEEN_MS = 180;

const DEPTH = { arena: 0, zone: 1, monster: 2, hero: 3, popup: 4, hud: 5, result: 10 } as const;

const TEXT = {
  fontFamily: 'monospace',
  fontStyle: 'bold',
  color: PALETTE.white,
  stroke: PALETTE.ink,
  strokeThickness: 4,
} as const;

export class BattleScene extends Scene {
  private readonly config = BATTLE_CONFIG;
  private readonly fixedSeed = parseSeedParam(window.location.search);
  private battle!: BattleState;
  private arcElapsedMs = 0;
  private arcSector = 0;
  private endedAtMs: number | null = null;

  private zone!: GameObjects.Graphics;
  private turnsText!: GameObjects.Text;
  private monstersText!: GameObjects.Text;
  private resultLayer!: GameObjects.Container;
  private resultTitle!: GameObjects.Text;
  private resultDetail!: GameObjects.Text;
  private readonly monsterSprites = new Map<number, GameObjects.Image>();
  private spriteKeys!: Record<keyof typeof BATTLE_SPRITES, string>;

  constructor() {
    super('battle');
  }

  create(): void {
    this.spriteKeys = registerPixelSprites(this, 'battle', BATTLE_SPRITES);
    this.drawArena();
    this.zone = this.add.graphics().setDepth(DEPTH.zone);
    this.add
      .image(ARENA_LAYOUT.centerX, ARENA_LAYOUT.centerY, this.spriteKeys.hero)
      .setScale(SPRITE_SCALE.hero)
      .setDepth(DEPTH.hero);
    this.createHud();
    this.createResultLayer();

    this.input.on('pointerdown', () => this.handleTap());
    // Giữ phím thì trình duyệt tự lặp sự kiện nhấn; chỉ tính lần nhấn đầu, nếu không sẽ đốt hết lượt.
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
      if (!event.repeat) this.handleTap();
    });
    const clearSnapshot = setSnapshotProvider(() => this.snapshot());
    this.events.once(Scenes.Events.SHUTDOWN, clearSnapshot);

    this.startBattle();
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

  private startBattle(): void {
    const seed = this.fixedSeed ?? Math.floor(Math.random() * 2 ** 32);
    this.battle = createBattle(seed, this.config);
    this.arcElapsedMs = 0;
    this.arcSector = 0;
    this.endedAtMs = null;

    // Trận mới: bỏ hết hình cũ (kể cả hiệu ứng đang chạy) rồi vẽ lại từ state.
    for (const sprite of this.monsterSprites.values()) {
      this.tweens.killTweensOf(sprite);
      sprite.destroy();
    }
    this.monsterSprites.clear();
    this.syncMonsters(this.battle);

    this.resultLayer.setVisible(false);
    this.drawZone();
    this.updateHud();
  }

  private handleTap(): void {
    if (this.battle.phase === 'playing') {
      this.attack();
    } else if (this.canRestart()) {
      this.startBattle();
    }
  }

  private attack(): void {
    const next = playTurn(this.battle, this.arcSector, this.config);
    this.battle = next;
    this.showHits(next);
    this.syncMonsters(next);
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

  /** Hình nêm xanh: đúng các lát và vòng mà luật chơi coi là trúng (đã kiểm bằng test layout). */
  private drawZone(): void {
    const { weapon, sectorCount } = this.config;
    const { centerX, centerY } = ARENA_LAYOUT;
    const arc = zoneArc(this.arcSector, weapon.widthSectors, sectorCount);
    const { inner, outer } = zoneRadii(weapon, ARENA_LAYOUT);
    const start = toPhaserAngle(arc.start);
    const end = toPhaserAngle(arc.end);

    const g = this.zone.clear();
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
      const sprite = this.monsterSprites.get(monster.id);
      if (sprite) {
        this.tweens.add({ targets: sprite, x: point.x, y: point.y, duration: MOVE_TWEEN_MS });
      } else {
        this.spawnMonster(monster, point);
      }
    }
  }

  private spawnMonster(monster: Monster, point: Point): void {
    const sprite = this.add
      .image(point.x, point.y, this.spriteKeys.slime)
      .setScale(SPRITE_SCALE.slime)
      .setDepth(DEPTH.monster);
    this.monsterSprites.set(monster.id, sprite);
  }

  /** Số sát thương bay lên kiểu Pixel Chaos; quái trúng đòn mà còn sống thì nhấp nháy. */
  private showHits(state: BattleState): void {
    for (const hit of state.lastAttack?.hits ?? []) {
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

  // ---------- Chữ trên màn hình ----------

  private createHud(): void {
    this.turnsText = this.add.text(16, 16, '', { ...TEXT, fontSize: '20px' }).setDepth(DEPTH.hud);
    this.monstersText = this.add
      .text(GAME_WIDTH - 16, 16, '', { ...TEXT, fontSize: '20px' })
      .setOrigin(1, 0)
      .setDepth(DEPTH.hud);
    this.add
      .text(GAME_WIDTH / 2, 560, 'Chạm để chém vào vùng xanh', {
        ...TEXT,
        fontSize: '16px',
        color: PALETTE.mist,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }

  private updateHud(): void {
    this.turnsText.setText(`Lượt: ${this.battle.turnsLeft}/${this.config.turnLimit}`);
    this.monstersText.setText(`Quái: ${this.battle.monsters.length}`);
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
    const hint = this.add
      .text(GAME_WIDTH / 2, 380, 'Chạm để chơi lại', {
        ...TEXT,
        fontSize: '18px',
        color: PALETTE.sand,
      })
      .setOrigin(0.5);
    this.resultLayer = this.add
      .container(0, 0, [backdrop, this.resultTitle, this.resultDetail, hint])
      .setDepth(DEPTH.result)
      .setVisible(false);
  }

  private showResult(state: BattleState): void {
    this.endedAtMs = this.time.now;
    if (state.phase === 'won') {
      this.resultTitle.setText('THẮNG!').setColor(PALETTE.lime);
      this.resultDetail.setText(`Diệt sạch quái, còn dư ${state.turnsLeft} lượt`);
    } else {
      this.resultTitle.setText('THUA').setColor(PALETTE.orange);
      this.resultDetail.setText(
        state.lossReason === 'reachedHero' ? 'Quái đã chạm tới bạn' : 'Hết lượt mà quái vẫn còn',
      );
    }
    this.resultLayer.setVisible(true);
  }
}
