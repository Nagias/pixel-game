// Đợt 4: màn Nâng cấp — VỎ hiển thị. Mở từ màn chuẩn bị; mỗi chỉ số một hàng: tên, cấp, hiệu lực hiện tại →
// cấp kế, nút mua. Luật giá / giới hạn / hiệu lực nằm ở logic/upgrades.ts; scene chỉ vẽ, chuyển cú chạm
// thành buyUpgrade() và lưu hồ sơ. "XONG" quay lại màn chuẩn bị đúng màn và bộ đồ đang chọn.
import { Scene, Scenes, type GameObjects, type Input } from 'phaser';
import { setSnapshotProvider } from '../../../app/testBridge';
import { colorNumber, PALETTE } from '../../../shared/palette';
import { loadProfile, saveProfile, type Profile } from '../../profile';
import { BATTLE_CONFIG, UPGRADE_CONFIG } from '../logic/battleConfig';
import { UPGRADE_KINDS, type UpgradeKind, type UpgradeLevels } from '../logic/battleTypes';
import { buyUpgrade, upgradeCost, withUpgrades } from '../logic/upgrades';
import type { LoadoutSceneData } from './LoadoutScene';
import { buyButtonRect, UPGRADE_LAYOUT, upgradeRowTop, upgradeTapAt } from './upgradeLayout';

/** Thứ test E2E đọc được qua window.__PIXEL_GAME__.snapshot(). */
export interface UpgradeSnapshot {
  readonly scene: 'upgrade';
  readonly gold: number;
  readonly upgrades: UpgradeLevels;
  /** Màn đã hiện đủ lâu để nhận chạm (chống chạm nhầm nối từ màn trước). */
  readonly canTap: boolean;
}

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
/** Hành vi giao diện: màn vừa mở chờ chút mới nhận chạm (như màn chuẩn bị). */
const TAP_DELAY_MS = 500;

const TEXT = {
  fontFamily: 'monospace',
  fontStyle: 'bold',
  color: PALETTE.white,
  stroke: PALETTE.ink,
  strokeThickness: 4,
} as const;

interface UpgradeRow {
  readonly kind: UpgradeKind;
  readonly level: GameObjects.Text;
  readonly effect: GameObjects.Text;
  readonly frame: GameObjects.Rectangle;
  readonly price: GameObjects.Text;
}

/** Giá trị hiệu lực của chỉ số ở các cấp `levels` (tên chỉ số đã ghi ở dòng trên, chỉ cần con số). */
function effectValue(kind: UpgradeKind, levels: UpgradeLevels): string {
  const config = withUpgrades(BATTLE_CONFIG, levels, UPGRADE_CONFIG);
  switch (kind) {
    case 'hp':
      return String(config.hero.hp);
    case 'heal':
      return String(config.hero.healAmount);
    case 'crit':
      return `${Math.round((config.weapons[0]?.critChance ?? 0) * 100)}%`;
    case 'luck':
      return `${Math.round((config.rare?.chance ?? 0) * 100)}%`;
  }
}

/** Đơn vị viết sau con số hiệu lực. */
const EFFECT_UNIT: Record<UpgradeKind, string> = {
  hp: ' máu',
  heal: ' máu mỗi lần',
  crit: '',
  luck: ' trận có quái hiếm',
};

export class UpgradeScene extends Scene {
  /** Màn chuẩn bị để quay lại (màn sắp chơi + bộ đồ đang chọn). */
  private returnTo!: LoadoutSceneData;
  private profile!: Profile;
  private rows: UpgradeRow[] = [];
  private goldText!: GameObjects.Text;
  private notice!: GameObjects.Text;
  private openElapsedMs = 0;
  private leaving = false;

  constructor() {
    super('upgrade');
  }

  init(data: LoadoutSceneData): void {
    this.returnTo = data;
    this.profile = loadProfile();
  }

  create(): void {
    // Phaser dùng lại cùng đối tượng scene mỗi lần mở: bỏ tham chiếu tới hình của lần trước.
    this.rows = [];
    this.openElapsedMs = 0;
    this.leaving = false;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, colorNumber('teal')).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, 40, 'NÂNG CẤP', { ...TEXT, fontSize: '32px', color: PALETTE.sand })
      .setOrigin(0.5);
    this.goldText = this.add
      .text(GAME_WIDTH / 2, 82, '', { ...TEXT, fontSize: '18px', color: PALETTE.sand })
      .setOrigin(0.5);
    UPGRADE_KINDS.forEach((kind, row) => this.createRow(kind, row));
    this.notice = this.add
      .text(GAME_WIDTH / 2, 500, '', { ...TEXT, fontSize: '14px', color: PALETTE.orange })
      .setOrigin(0.5);
    this.createBackButton();

    this.input.on('pointerdown', (pointer: Input.Pointer) => this.handleTap(pointer.x, pointer.y));
    const clearSnapshot = setSnapshotProvider(() => this.snapshot());
    this.events.once(Scenes.Events.SHUTDOWN, clearSnapshot);

    this.sync();
  }

  override update(_time: number, delta: number): void {
    this.openElapsedMs += delta;
  }

  private canTap(): boolean {
    return !this.leaving && this.openElapsedMs >= TAP_DELAY_MS;
  }

  private handleTap(x: number, y: number): void {
    if (!this.canTap()) return;
    const tap = upgradeTapAt(x, y, UPGRADE_KINDS.length, UPGRADE_LAYOUT);
    if (tap?.kind === 'back') {
      this.leaving = true;
      this.scene.start('loadout', this.returnTo);
    } else if (tap?.kind === 'buy') {
      const kind = UPGRADE_KINDS[tap.row];
      if (kind !== undefined) this.buy(kind);
    }
  }

  /** Mua một cấp nếu mua được; chỉ trừ vàng khi đã lưu được hồ sơ. Không mua được thì không làm gì. */
  private buy(kind: UpgradeKind): void {
    const cost = upgradeCost(this.profile.upgrades, kind, UPGRADE_CONFIG);
    if (cost === null || cost > this.profile.gold) return;
    const wallet = buyUpgrade(this.profile, kind, UPGRADE_CONFIG);
    const next = { ...this.profile, ...wallet };
    if (saveProfile(next)) {
      this.profile = next;
      this.notice.setText('');
    } else {
      this.notice.setText('Không lưu được — chưa mua');
    }
    this.sync();
  }

  private snapshot(): UpgradeSnapshot {
    return {
      scene: 'upgrade',
      gold: this.profile.gold,
      upgrades: this.profile.upgrades,
      canTap: this.canTap(),
    };
  }

  // ---------- Vẽ ----------

  private createRow(kind: UpgradeKind, row: number): void {
    const L = UPGRADE_LAYOUT;
    const top = upgradeRowTop(row, L);
    this.add.text(L.left, top + 4, UPGRADE_CONFIG[kind].name, { ...TEXT, fontSize: '18px' });
    const level = this.add.text(L.left, top + 30, '', {
      ...TEXT,
      fontSize: '14px',
      color: PALETTE.sand,
    });
    const effect = this.add.text(L.left, top + 52, '', {
      ...TEXT,
      fontSize: '13px',
      color: PALETTE.mist,
    });
    const rect = buyButtonRect(row, L);
    const frame = this.add
      .rectangle(rect.x, rect.y, rect.width, rect.height, colorNumber('navy'))
      .setOrigin(0);
    const price = this.add
      .text(rect.x + rect.width / 2, rect.y + rect.height / 2, '', {
        ...TEXT,
        fontSize: '14px',
        align: 'center',
      })
      .setOrigin(0.5);
    this.rows.push({ kind, level, effect, frame, price });
  }

  private createBackButton(): void {
    const { back } = UPGRADE_LAYOUT;
    this.add
      .rectangle(back.x, back.y, back.width, back.height, colorNumber('grass'))
      .setOrigin(0)
      .setStrokeStyle(3, colorNumber('lime'));
    this.add
      .text(back.x + back.width / 2, back.y + back.height / 2, 'XONG', {
        ...TEXT,
        fontSize: '26px',
      })
      .setOrigin(0.5);
  }

  /** Vẽ lại theo hồ sơ hiện tại: vàng, cấp, hiệu lực hiện tại → cấp kế, nút mua sáng/tối. */
  private sync(): void {
    const { gold, upgrades } = this.profile;
    this.goldText.setText(`Vàng: ${gold}`);
    for (const row of this.rows) {
      const max = UPGRADE_CONFIG[row.kind].costs.length;
      const level = Math.min(upgrades[row.kind] ?? 0, max);
      const cost = upgradeCost(upgrades, row.kind, UPGRADE_CONFIG);
      const now = effectValue(row.kind, upgrades);
      const unit = EFFECT_UNIT[row.kind];
      row.level.setText(`Cấp ${level}/${max}`);
      row.effect.setText(
        cost === null
          ? `${now}${unit}`
          : `${now} → ${effectValue(row.kind, { ...upgrades, [row.kind]: level + 1 })}${unit}`,
      );
      const affordable = cost !== null && cost <= gold;
      row.frame.setStrokeStyle(affordable ? 3 : 1, colorNumber(affordable ? 'lime' : 'slate'));
      row.price
        .setText(cost === null ? 'TỐI ĐA' : `MUA\n${cost} vàng`)
        .setColor(affordable ? PALETTE.white : PALETTE.mist);
    }
  }
}
