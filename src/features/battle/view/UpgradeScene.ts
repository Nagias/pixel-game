// Đợt 4: màn Nâng cấp — VỎ hiển thị. F18 đợt E: dạng thẻ (học ảnh 2 Micro RPG) — mỗi chỉ số một thẻ: hình,
// tên, cấp, hiệu lực hiện tại → cấp kế, nút mua có đồng xu. Mở từ thanh nút dưới, đi tiếp cũng bằng thanh đó.
// F19 PR C: hai thẻ chọn "Nhân vật" (4 chỉ số) / "Vũ khí" (nâng từng vũ khí đang có, lưới thẻ nhỏ).
// Luật giá / giới hạn / hiệu lực nằm ở logic/upgrades.ts; scene chỉ vẽ, chuyển cú chạm thành lệnh mua và lưu.
import { Scene, Scenes, type GameObjects, type Input } from 'phaser';
import { registerPixelSprites } from '../../../app/pixelSprites';
import { setSnapshotProvider } from '../../../app/testBridge';
import { colorNumber, PALETTE } from '../../../shared/palette';
import { clearedLevelCount, loadProfile, saveProfile, type Profile } from '../../profile';
import { BATTLE_CONFIG, UPGRADE_CONFIG, WEAPON_UPGRADE_CONFIG } from '../logic/battleConfig';
import {
  UPGRADE_KINDS,
  type UpgradeKind,
  type UpgradeLevels,
  type WeaponLevels,
} from '../logic/battleTypes';
import { ownedWeapons } from '../logic/loadout';
import {
  buyUpgrade,
  buyWeaponUpgrade,
  upgradeCost,
  weaponUpgradeCost,
  withUpgrades,
} from '../logic/upgrades';
import { CARD_TEXT, drawBuyButton, drawCardFrame, drawCardScreen, goFromNav } from './cardScreen';
import type { MapSceneData } from './MapScene';
import { drawPanel } from './uiKit';
import { UI_SPRITES, UPGRADE_ICON, WEAPON_ICON, type UiSprite } from './uiSprites';
import {
  buyButtonRect,
  cardRect,
  smallBuyRect,
  smallCardRect,
  UPGRADE_TABS,
  upgradeScreenTapAt,
  type UpgradeTab,
} from './upgradeLayout';

/** Thứ test E2E đọc được qua window.__PIXEL_GAME__.snapshot(). */
export interface UpgradeSnapshot {
  readonly scene: 'upgrade';
  readonly gold: number;
  readonly upgrades: UpgradeLevels;
  /** F19: thẻ chọn đang mở. */
  readonly tab: UpgradeTab;
  /** F19: cấp đã nâng của từng vũ khí. */
  readonly weaponLevels: WeaponLevels;
  /** F19: các vũ khí đang có — thứ tự thẻ ở thẻ chọn "Vũ khí". */
  readonly weapons: readonly number[];
  /** Màn đã hiện đủ lâu để nhận chạm (chống chạm nhầm nối từ màn trước). */
  readonly canTap: boolean;
}

/** Hành vi giao diện: màn vừa mở chờ chút mới nhận chạm (như Bản đồ). */
const TAP_DELAY_MS = 500;

const TAB_LABEL: Record<UpgradeTab, string> = { character: 'Nhân vật', weapons: 'Vũ khí' };

/** Phần chung của một thẻ có nút mua: nút, đồng xu, giá. */
interface BuyParts {
  readonly buy: GameObjects.Graphics;
  readonly coin: GameObjects.Image;
  readonly price: GameObjects.Text;
}

interface UpgradeCard extends BuyParts {
  readonly kind: UpgradeKind;
  readonly level: GameObjects.Text;
  readonly effect: GameObjects.Text;
}

interface WeaponCard extends BuyParts {
  readonly weapon: number;
  readonly level: GameObjects.Text;
  readonly gain: GameObjects.Text;
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
  private tab: UpgradeTab = 'character';
  /** F19: vũ khí đang có (mở khóa theo màn / rơi / thuê) — chỉ nâng được các món này. */
  private weapons: number[] = [];
  private cards: UpgradeCard[] = [];
  private weaponCards: WeaponCard[] = [];
  /** Hình của thẻ chọn đang mở — xóa và vẽ lại khi đổi thẻ chọn. */
  private tabObjects: GameObjects.GameObject[] = [];
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
    this.tab = 'character';
    this.weapons = ownedWeapons(BATTLE_CONFIG, {
      clearedLevels: clearedLevelCount(this.profile, BATTLE_CONFIG.levels.length),
      tiers: this.profile.weaponTiers,
      rentals: this.profile.rentals,
    });
  }

  create(): void {
    // Phaser dùng lại cùng đối tượng scene mỗi lần mở: bỏ tham chiếu tới hình của lần trước.
    this.cards = [];
    this.weaponCards = [];
    this.tabObjects = [];
    this.openElapsedMs = 0;
    this.leaving = false;
    this.uiKeys = registerPixelSprites(this, 'ui', UI_SPRITES);
    ({ gold: this.gold, notice: this.notice } = drawCardScreen(
      this,
      'NÂNG CẤP',
      'upgrade',
      this.uiKeys,
    ));
    this.drawTab();

    this.input.on('pointerdown', (pointer: Input.Pointer) => this.handleTap(pointer.x, pointer.y));
    const clearSnapshot = setSnapshotProvider(() => this.snapshot());
    this.events.once(Scenes.Events.SHUTDOWN, clearSnapshot);
  }

  override update(_time: number, delta: number): void {
    this.openElapsedMs += delta;
  }

  private canTap(): boolean {
    return !this.leaving && this.openElapsedMs >= TAP_DELAY_MS;
  }

  private handleTap(x: number, y: number): void {
    if (!this.canTap()) return;
    const count = this.tab === 'character' ? UPGRADE_KINDS.length : this.weapons.length;
    const tap = upgradeScreenTapAt(x, y, this.tab, count);
    if (tap?.kind === 'nav' && tap.target !== 'upgrade') {
      this.leaving = true;
      goFromNav(this, tap.target, this.returnTo, this.profile);
    } else if (tap?.kind === 'tab' && tap.tab !== this.tab) {
      this.tab = tap.tab;
      this.drawTab();
    } else if (tap?.kind === 'buy') {
      if (this.tab === 'character') {
        const kind = UPGRADE_KINDS[tap.index];
        if (kind !== undefined) this.buy(kind);
      } else {
        const weapon = this.weapons[tap.index];
        if (weapon !== undefined) this.buyWeapon(weapon);
      }
    }
  }

  /** Mua một cấp nếu mua được; chỉ trừ vàng khi đã lưu được hồ sơ. Không mua được thì không làm gì. */
  private buy(kind: UpgradeKind): void {
    const cost = upgradeCost(this.profile.upgrades, kind, UPGRADE_CONFIG);
    if (cost === null || cost > this.profile.gold) return;
    this.save({ ...this.profile, ...buyUpgrade(this.profile, kind, UPGRADE_CONFIG) });
  }

  /** F19: nâng vũ khí một cấp nếu được (như buy). */
  private buyWeapon(weapon: number): void {
    const cost = weaponUpgradeCost(this.profile.weaponLevels, weapon, WEAPON_UPGRADE_CONFIG);
    if (cost === null || cost > this.profile.gold) return;
    const wallet = buyWeaponUpgrade(this.profile, weapon, this.weapons, WEAPON_UPGRADE_CONFIG);
    this.save({ ...this.profile, ...wallet });
  }

  private save(next: Profile): void {
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
      tab: this.tab,
      weaponLevels: this.profile.weaponLevels,
      weapons: this.weapons,
      canTap: this.canTap(),
    };
  }

  // ---------- Vẽ ----------

  /** Vẽ lại phần của thẻ chọn đang mở: hai nút thẻ chọn và các thẻ của nó. */
  private drawTab(): void {
    for (const object of this.tabObjects) object.destroy();
    this.tabObjects = [];
    this.cards = [];
    this.weaponCards = [];
    for (const { tab, rect } of UPGRADE_TABS) {
      const active = tab === this.tab;
      this.keep(drawPanel(this, rect, active ? 'leaf' : 'dusk', 5, active ? 0 : 3));
      if (active) {
        this.keep(
          this.add
            .graphics()
            .fillStyle(colorNumber('grass'))
            .fillRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6)
            .setDepth(5),
        );
      }
      this.keep(
        this.add
          .text(rect.x + rect.width / 2, rect.y + rect.height / 2, TAB_LABEL[tab], {
            ...CARD_TEXT,
            fontSize: '15px',
            color: active ? PALETTE.white : PALETTE.mist,
          })
          .setOrigin(0.5)
          .setDepth(5),
      );
    }
    if (this.tab === 'character') {
      UPGRADE_KINDS.forEach((kind, index) => this.createCard(kind, index));
    } else {
      this.weapons.forEach((weapon, index) => this.createWeaponCard(weapon, index));
    }
    this.sync();
  }

  /** Ghi lại hình thuộc thẻ chọn đang mở (để xóa khi đổi thẻ chọn). */
  private keep<T extends GameObjects.GameObject>(object: T): T {
    this.tabObjects.push(object);
    return object;
  }

  private createBuyParts(rect: { x: number; y: number; width: number; height: number }): BuyParts {
    const buy = this.keep(this.add.graphics().setDepth(5));
    const coin = this.keep(
      this.add
        .image(rect.x + (rect.width > 100 ? 22 : 16), rect.y + rect.height / 2, this.uiKeys.coin)
        .setScale(2)
        .setDepth(5),
    );
    const price = this.keep(
      this.add
        .text(rect.x + rect.width / 2 + 12, rect.y + rect.height / 2, '', {
          ...CARD_TEXT,
          fontSize: rect.width > 100 ? '16px' : '15px',
        })
        .setOrigin(0.5)
        .setDepth(5),
    );
    return { buy, coin, price };
  }

  private createCard(kind: UpgradeKind, index: number): void {
    const card = cardRect(index);
    const cx = card.x + card.width / 2;
    this.keep(drawCardFrame(this, card));
    this.keep(
      this.add
        .image(cx, card.y + 36, this.uiKeys[UPGRADE_ICON[kind]])
        .setScale(3)
        .setDepth(5),
    );
    this.keep(
      this.add
        .text(cx, card.y + 74, UPGRADE_CONFIG[kind].name, { ...CARD_TEXT, fontSize: '15px' })
        .setOrigin(0.5)
        .setDepth(5),
    );
    const level = this.keep(
      this.add
        .text(cx, card.y + 96, '', { ...CARD_TEXT, fontSize: '13px', color: PALETTE.yellow })
        .setOrigin(0.5)
        .setDepth(5),
    );
    const effect = this.keep(
      this.add
        .text(cx, card.y + 126, '', {
          ...CARD_TEXT,
          fontSize: '12px',
          color: PALETTE.mist,
          align: 'center',
          wordWrap: { width: card.width - 16 },
        })
        .setOrigin(0.5)
        .setDepth(5),
    );
    this.cards.push({ kind, level, effect, ...this.createBuyParts(buyButtonRect(index)) });
  }

  /** F19: thẻ nhỏ của một vũ khí: hình, tên, cấp, phần tăng ở cấp kế, nút mua. */
  private createWeaponCard(weapon: number, index: number): void {
    const card = smallCardRect(index);
    const cx = card.x + card.width / 2;
    const name = BATTLE_CONFIG.weapons[weapon]?.name ?? '';
    this.keep(drawCardFrame(this, card));
    const icon = WEAPON_ICON[name];
    if (icon) {
      this.keep(
        this.add
          .image(cx, card.y + 24, this.uiKeys[icon])
          .setScale(3)
          .setDepth(5),
      );
    }
    this.keep(
      this.add
        .text(cx, card.y + 52, name, { ...CARD_TEXT, fontSize: '13px' })
        .setOrigin(0.5)
        .setDepth(5),
    );
    const level = this.keep(
      this.add
        .text(cx, card.y + 67, '', { ...CARD_TEXT, fontSize: '11px', color: PALETTE.yellow })
        .setOrigin(0.5)
        .setDepth(5),
    );
    const gain = this.keep(
      this.add
        .text(cx, card.y + 84, '', {
          ...CARD_TEXT,
          fontSize: '9px',
          strokeThickness: 3,
          color: PALETTE.mist,
          align: 'center',
          lineSpacing: -2,
        })
        .setOrigin(0.5)
        .setDepth(5),
    );
    this.weaponCards.push({ weapon, level, gain, ...this.createBuyParts(smallBuyRect(index)) });
  }

  /** Vẽ lại theo hồ sơ hiện tại: vàng, cấp, hiệu lực / phần tăng ở cấp kế, nút mua sáng/tối. */
  private sync(): void {
    const { gold, upgrades, weaponLevels } = this.profile;
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
      this.syncBuy(card, buyButtonRect(index), cost);
    });
    const { costs, critPerLevel, damageAtLevel } = WEAPON_UPGRADE_CONFIG;
    this.weaponCards.forEach((card, index) => {
      const level = Math.min(weaponLevels[card.weapon] ?? 0, costs.length);
      const cost = weaponUpgradeCost(weaponLevels, card.weapon, WEAPON_UPGRADE_CONFIG);
      card.level.setText(`Cấp ${level}/${costs.length}`);
      const crit = `+${Math.round(critPerLevel * 100)}% chí mạng`;
      card.gain.setText(
        cost === null ? 'Tối đa' : level + 1 === damageAtLevel ? `${crit}\n+1 sát thương` : crit,
      );
      this.syncBuy(card, smallBuyRect(index), cost);
    });
  }

  private syncBuy(
    card: BuyParts,
    rect: { x: number; y: number; width: number; height: number },
    cost: number | null,
  ): void {
    const affordable = cost !== null && cost <= this.profile.gold;
    drawBuyButton(card.buy, rect, affordable);
    card.coin.setVisible(cost !== null);
    card.price
      .setText(cost === null ? 'TỐI ĐA' : String(cost))
      .setX(rect.x + rect.width / 2 + (cost === null ? 0 : 12))
      .setColor(affordable || cost === null ? PALETTE.white : PALETTE.mist);
  }
}
