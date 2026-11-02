// Đợt 4: màn Nâng cấp — VỎ hiển thị. F18 đợt E: dạng thẻ (học ảnh 2 Micro RPG) — mỗi chỉ số một thẻ: hình,
// tên, cấp, hiệu lực hiện tại → cấp kế, nút mua có đồng xu. Mở từ thanh nút dưới, đi tiếp cũng bằng thanh đó.
// Luật giá / giới hạn / hiệu lực nằm ở logic/upgrades.ts; scene chỉ vẽ, chuyển cú chạm thành buyUpgrade() và lưu.
import { Scene, Scenes, type GameObjects, type Input } from 'phaser';
import { registerPixelSprites } from '../../../app/pixelSprites';
import { setSnapshotProvider } from '../../../app/testBridge';
import { PALETTE } from '../../../shared/palette';
import { loadProfile, saveProfile, type Profile } from '../../profile';
import { BATTLE_CONFIG, UPGRADE_CONFIG } from '../logic/battleConfig';
import { UPGRADE_KINDS, type UpgradeKind, type UpgradeLevels } from '../logic/battleTypes';
import { buyUpgrade, upgradeCost, withUpgrades } from '../logic/upgrades';
import { CARD_TEXT, drawBuyButton, drawCardFrame, drawCardScreen, goFromNav } from './cardScreen';
import type { MapSceneData } from './MapScene';
import { UI_SPRITES, UPGRADE_ICON, type UiSprite } from './uiSprites';
import { buyButtonRect, cardRect, upgradeTapAt } from './upgradeLayout';

/** Thứ test E2E đọc được qua window.__PIXEL_GAME__.snapshot(). */
export interface UpgradeSnapshot {
  readonly scene: 'upgrade';
  readonly gold: number;
  readonly upgrades: UpgradeLevels;
  /** Màn đã hiện đủ lâu để nhận chạm (chống chạm nhầm nối từ màn trước). */
  readonly canTap: boolean;
}

/** Hành vi giao diện: màn vừa mở chờ chút mới nhận chạm (như Bản đồ). */
const TAP_DELAY_MS = 500;

interface UpgradeCard {
  readonly kind: UpgradeKind;
  readonly level: GameObjects.Text;
  readonly effect: GameObjects.Text;
  readonly buy: GameObjects.Graphics;
  readonly coin: GameObjects.Image;
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
  /** Bản đồ mở lại thế nào khi chạm CHƠI. */
  private returnTo: MapSceneData = {};
  private profile!: Profile;
  private cards: UpgradeCard[] = [];
  private gold!: { set(text: string): void };
  private notice!: GameObjects.Text;
  private uiKeys!: Record<UiSprite, string>;
  private openElapsedMs = 0;
  private leaving = false;

  constructor() {
    super('upgrade');
  }

  init(data: Partial<MapSceneData>): void {
    this.returnTo = data;
    this.profile = loadProfile();
  }

  create(): void {
    // Phaser dùng lại cùng đối tượng scene mỗi lần mở: bỏ tham chiếu tới hình của lần trước.
    this.cards = [];
    this.openElapsedMs = 0;
    this.leaving = false;
    this.uiKeys = registerPixelSprites(this, 'ui', UI_SPRITES);
    ({ gold: this.gold, notice: this.notice } = drawCardScreen(
      this,
      'NÂNG CẤP',
      'upgrade',
      this.uiKeys,
    ));
    UPGRADE_KINDS.forEach((kind, index) => this.createCard(kind, index));

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
    const tap = upgradeTapAt(x, y, UPGRADE_KINDS.length);
    if (tap?.kind === 'nav' && tap.target !== 'upgrade') {
      this.leaving = true;
      goFromNav(this, tap.target, this.returnTo, this.profile);
    } else if (tap?.kind === 'buy') {
      const kind = UPGRADE_KINDS[tap.index];
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

  private createCard(kind: UpgradeKind, index: number): void {
    const card = cardRect(index);
    const cx = card.x + card.width / 2;
    drawCardFrame(this, card);
    this.add
      .image(cx, card.y + 36, this.uiKeys[UPGRADE_ICON[kind]])
      .setScale(3)
      .setDepth(5);
    this.add
      .text(cx, card.y + 74, UPGRADE_CONFIG[kind].name, { ...CARD_TEXT, fontSize: '15px' })
      .setOrigin(0.5)
      .setDepth(5);
    const level = this.add
      .text(cx, card.y + 96, '', { ...CARD_TEXT, fontSize: '13px', color: PALETTE.yellow })
      .setOrigin(0.5)
      .setDepth(5);
    const effect = this.add
      .text(cx, card.y + 126, '', {
        ...CARD_TEXT,
        fontSize: '12px',
        color: PALETTE.mist,
        align: 'center',
        wordWrap: { width: card.width - 16 },
      })
      .setOrigin(0.5)
      .setDepth(5);
    const rect = buyButtonRect(index);
    const buy = this.add.graphics().setDepth(5);
    const coin = this.add
      .image(rect.x + 22, rect.y + rect.height / 2, this.uiKeys.coin)
      .setScale(2)
      .setDepth(5);
    const price = this.add
      .text(rect.x + rect.width / 2 + 12, rect.y + rect.height / 2, '', {
        ...CARD_TEXT,
        fontSize: '16px',
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.cards.push({ kind, level, effect, buy, coin, price });
  }

  /** Vẽ lại theo hồ sơ hiện tại: vàng, cấp, hiệu lực hiện tại → cấp kế, nút mua sáng/tối. */
  private sync(): void {
    const { gold, upgrades } = this.profile;
    this.gold.set(String(gold));
    this.cards.forEach((card, index) => {
      const max = UPGRADE_CONFIG[card.kind].costs.length;
      const level = Math.min(upgrades[card.kind] ?? 0, max);
      const cost = upgradeCost(upgrades, card.kind, UPGRADE_CONFIG);
      const now = effectValue(card.kind, upgrades);
      const unit = EFFECT_UNIT[card.kind];
      card.level.setText(`Cấp ${level}/${max}`);
      card.effect.setText(
        cost === null
          ? `${now}${unit}`
          : `${now} → ${effectValue(card.kind, { ...upgrades, [card.kind]: level + 1 })}${unit}`,
      );
      const affordable = cost !== null && cost <= gold;
      drawBuyButton(card.buy, buyButtonRect(index), affordable);
      card.coin.setVisible(cost !== null);
      card.price
        .setText(cost === null ? 'TỐI ĐA' : String(cost))
        .setX(buyButtonRect(index).x + buyButtonRect(index).width / 2 + (cost === null ? 0 : 12))
        .setColor(affordable || cost === null ? PALETTE.white : PALETTE.mist);
    });
  }
}
