// Đợt 6: màn Cửa hàng — VỎ hiển thị. F18 đợt E: dạng thẻ (học cách trình bày ảnh 3 Micro RPG, vẫn mua bằng
// vàng): mỗi món một thẻ: hình, tên, chữ cấp "Hiếm", tình trạng, nút mua có đồng xu. Luật giá / hạn dùng nằm ở
// logic/shop.ts; scene chỉ vẽ, chuyển cú chạm thành buyRental() và lưu. Dùng chung bố cục thẻ với Nâng cấp.
import { Scene, Scenes, type GameObjects, type Input } from 'phaser';
import { registerPixelSprites } from '../../../app/pixelSprites';
import { setSnapshotProvider } from '../../../app/testBridge';
import { PALETTE } from '../../../shared/palette';
import { clearedLevelCount, loadProfile, saveProfile, type Profile } from '../../profile';
import { BATTLE_CONFIG, LOOT_CONFIG, SHOP_CONFIG } from '../logic/battleConfig';
import type { WeaponRentals } from '../logic/battleTypes';
import { ownedWeapons } from '../logic/loadout';
import { buyRental } from '../logic/shop';
import { CARD_TEXT, drawBuyButton, drawCardFrame, drawCardScreen, goFromNav } from './cardScreen';
import type { MapSceneData } from './MapScene';
import { UI_SPRITES, WEAPON_ICON, type UiSprite } from './uiSprites';
import { smallBuyRect, smallCardRect, smallCardTapAt } from './upgradeLayout';
import { styleTierText } from './weaponTierStyle';

/** Thứ test E2E đọc được qua window.__PIXEL_GAME__.snapshot(). */
export interface ShopSnapshot {
  readonly scene: 'shop';
  readonly gold: number;
  readonly rentals: WeaponRentals;
  /** F19: các món đang bày, theo thứ tự thẻ (chỉ món đã mở khóa). */
  readonly weapons: readonly number[];
  /** Màn đã hiện đủ lâu để nhận chạm (chống chạm nhầm nối từ màn trước). */
  readonly canTap: boolean;
}

/** Hành vi giao diện: màn vừa mở chờ chút mới nhận chạm (như Bản đồ). */
const TAP_DELAY_MS = 500;

interface ShopCard {
  readonly weapon: number;
  readonly status: GameObjects.Text;
  readonly buy: GameObjects.Graphics;
  readonly coin: GameObjects.Image;
  readonly price: GameObjects.Text;
}

export class ShopScene extends Scene {
  /** Bản đồ mở lại thế nào khi chạm CHƠI. */
  private returnTo: MapSceneData = {};
  private profile!: Profile;
  private cards: ShopCard[] = [];
  /** F19: món đang bày — món cửa hàng bán mà người chơi đã có (mở khóa theo màn / rơi / thuê). */
  private weapons: number[] = [];
  private gold!: { set(text: string): void };
  private notice!: GameObjects.Text;
  private uiKeys!: Record<UiSprite, string>;
  private openElapsedMs = 0;
  private leaving = false;

  constructor() {
    super('shop');
  }

  init(data: Partial<MapSceneData>): void {
    this.returnTo = data;
    this.profile = loadProfile();
    const owned = ownedWeapons(BATTLE_CONFIG, {
      clearedLevels: clearedLevelCount(this.profile, BATTLE_CONFIG.levels.length),
      tiers: this.profile.weaponTiers,
      rentals: this.profile.rentals,
    });
    this.weapons = SHOP_CONFIG.weapons.filter((weapon) => owned.includes(weapon));
  }

  create(): void {
    // Phaser dùng lại cùng đối tượng scene mỗi lần mở: bỏ tham chiếu tới hình của lần trước.
    this.cards = [];
    this.openElapsedMs = 0;
    this.leaving = false;
    this.uiKeys = registerPixelSprites(this, 'ui', UI_SPRITES);
    ({ gold: this.gold, notice: this.notice } = drawCardScreen(
      this,
      'CỬA HÀNG',
      'shop',
      this.uiKeys,
    ));
    this.weapons.forEach((weapon, index) => this.createCard(weapon, index));

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
    const tap = smallCardTapAt(x, y, this.weapons.length);
    if (tap?.kind === 'nav' && tap.target !== 'shop') {
      this.leaving = true;
      goFromNav(this, tap.target, this.returnTo, this.profile);
    } else if (tap?.kind === 'buy') {
      const weapon = this.weapons[tap.index];
      if (weapon !== undefined) this.buy(weapon);
    }
  }

  /** Mua một món nếu mua được; chỉ trừ vàng khi đã lưu được hồ sơ. Không mua được thì không làm gì. */
  private buy(weapon: number): void {
    if (!this.canBuy(weapon)) return;
    const wallet = buyRental(this.profile, weapon, this.profile.weaponTiers, SHOP_CONFIG);
    const next = { ...this.profile, ...wallet };
    if (saveProfile(next)) {
      this.profile = next;
      this.notice.setText('');
    } else {
      this.notice.setText('Không lưu được — chưa mua');
    }
    this.sync();
  }

  /** Đã có vĩnh viễn từ cấp cửa hàng trở lên — mua là phí, cửa hàng không bán. */
  private ownsBetter(weapon: number): boolean {
    return (this.profile.weaponTiers[weapon] ?? 0) >= SHOP_CONFIG.tier;
  }

  private canBuy(weapon: number): boolean {
    return !this.ownsBetter(weapon) && this.profile.gold >= SHOP_CONFIG.price;
  }

  private snapshot(): ShopSnapshot {
    return {
      scene: 'shop',
      gold: this.profile.gold,
      rentals: this.profile.rentals,
      weapons: this.weapons,
      canTap: this.canTap(),
    };
  }

  // ---------- Vẽ ----------

  private createCard(weapon: number, index: number): void {
    // F19: thẻ nhỏ 3 cột (tới 7 món) — hình, tên, cấp, tình trạng ngắn, nút mua.
    const card = smallCardRect(index);
    const cx = card.x + card.width / 2;
    const name = BATTLE_CONFIG.weapons[weapon]?.name ?? '';
    drawCardFrame(this, card);
    const icon = WEAPON_ICON[name];
    if (icon) {
      this.add
        .image(cx, card.y + 26, this.uiKeys[icon])
        .setScale(3)
        .setDepth(5);
    }
    this.add
      .text(cx, card.y + 56, name, { ...CARD_TEXT, fontSize: '13px' })
      .setOrigin(0.5)
      .setDepth(5);
    const tier = this.add
      .text(cx, card.y + 72, LOOT_CONFIG.tiers[SHOP_CONFIG.tier]?.name ?? '', {
        ...CARD_TEXT,
        fontSize: '11px',
      })
      .setOrigin(0.5)
      .setDepth(5);
    styleTierText(tier, SHOP_CONFIG.tier);
    const status = this.add
      .text(cx, card.y + 87, '', {
        ...CARD_TEXT,
        fontSize: '10px',
        strokeThickness: 3,
        color: PALETTE.mist,
        align: 'center',
        wordWrap: { width: card.width - 16 },
      })
      .setOrigin(0.5)
      .setDepth(5);
    const rect = smallBuyRect(index);
    const buy = this.add.graphics().setDepth(5);
    const coin = this.add
      .image(rect.x + 16, rect.y + rect.height / 2, this.uiKeys.coin)
      .setScale(2)
      .setDepth(5);
    const price = this.add
      .text(rect.x + rect.width / 2 + 10, rect.y + rect.height / 2, '', {
        ...CARD_TEXT,
        fontSize: '15px',
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.cards.push({ weapon, status, buy, coin, price });
  }

  /** Vẽ lại theo hồ sơ hiện tại: vàng, tình trạng từng món, nút mua sáng/tối. */
  private sync(): void {
    const { gold, rentals, weaponTiers } = this.profile;
    this.gold.set(String(gold));
    this.cards.forEach((card, index) => {
      const left = rentals[card.weapon] ?? 0;
      const owned = LOOT_CONFIG.tiers[weaponTiers[card.weapon] ?? 0]?.name ?? '';
      const ownsBetter = this.ownsBetter(card.weapon);
      card.status.setText(
        ownsBetter
          ? `Đã có ${owned}`
          : left > 0
            ? `Còn ${left} trận (+${SHOP_CONFIG.battles})`
            : `Dùng ${SHOP_CONFIG.battles} trận`,
      );
      const rect = smallBuyRect(index);
      const affordable = this.canBuy(card.weapon);
      drawBuyButton(card.buy, rect, affordable);
      card.coin.setVisible(!ownsBetter);
      card.price
        .setText(ownsBetter ? 'ĐÃ CÓ' : String(SHOP_CONFIG.price))
        .setX(rect.x + rect.width / 2 + (ownsBetter ? 0 : 10))
        .setColor(affordable || ownsBetter ? PALETTE.white : PALETTE.mist);
    });
  }
}
