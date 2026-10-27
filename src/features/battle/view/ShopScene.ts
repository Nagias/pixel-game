// Đợt 6: màn Cửa hàng — VỎ hiển thị. Mở từ màn chuẩn bị; mỗi món một hàng: tên + cấp, tình trạng (còn mấy
// trận / đã có cấp cao hơn), nút mua. Luật giá / hạn dùng nằm ở logic/shop.ts; scene chỉ vẽ, chuyển cú chạm
// thành buyRental() và lưu hồ sơ. Dùng chung bố cục hàng với màn Nâng cấp. "XONG" quay lại màn chuẩn bị.
import { Scene, Scenes, type GameObjects, type Input } from 'phaser';
import { setSnapshotProvider } from '../../../app/testBridge';
import { colorNumber, PALETTE } from '../../../shared/palette';
import { loadProfile, saveProfile, type Profile } from '../../profile';
import { BATTLE_CONFIG, LOOT_CONFIG, SHOP_CONFIG } from '../logic/battleConfig';
import type { WeaponRentals } from '../logic/battleTypes';
import { buyRental } from '../logic/shop';
import type { LoadoutSceneData } from './LoadoutScene';
import { buyButtonRect, UPGRADE_LAYOUT, upgradeRowTop, upgradeTapAt } from './upgradeLayout';
import { styleTierText } from './weaponTierStyle';

/** Thứ test E2E đọc được qua window.__PIXEL_GAME__.snapshot(). */
export interface ShopSnapshot {
  readonly scene: 'shop';
  readonly gold: number;
  readonly rentals: WeaponRentals;
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

interface ShopRow {
  readonly weapon: number;
  readonly status: GameObjects.Text;
  readonly frame: GameObjects.Rectangle;
  readonly price: GameObjects.Text;
}

export class ShopScene extends Scene {
  /** Màn chuẩn bị để quay lại (màn sắp chơi + bộ đồ đang chọn). */
  private returnTo!: LoadoutSceneData;
  private profile!: Profile;
  private rows: ShopRow[] = [];
  private goldText!: GameObjects.Text;
  private notice!: GameObjects.Text;
  private openElapsedMs = 0;
  private leaving = false;

  constructor() {
    super('shop');
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
      .text(GAME_WIDTH / 2, 40, 'CỬA HÀNG', { ...TEXT, fontSize: '32px', color: PALETTE.sand })
      .setOrigin(0.5);
    this.goldText = this.add
      .text(GAME_WIDTH / 2, 82, '', { ...TEXT, fontSize: '18px', color: PALETTE.sand })
      .setOrigin(0.5);
    SHOP_CONFIG.weapons.forEach((weapon, row) => this.createRow(weapon, row));
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
    const tap = upgradeTapAt(x, y, SHOP_CONFIG.weapons.length, UPGRADE_LAYOUT);
    if (tap?.kind === 'back') {
      this.leaving = true;
      this.scene.start('loadout', this.returnTo);
    } else if (tap?.kind === 'buy') {
      const weapon = SHOP_CONFIG.weapons[tap.row];
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
      canTap: this.canTap(),
    };
  }

  // ---------- Vẽ ----------

  private createRow(weapon: number, row: number): void {
    const L = UPGRADE_LAYOUT;
    const top = upgradeRowTop(row, L);
    const name = BATTLE_CONFIG.weapons[weapon]?.name ?? '';
    this.add.text(L.left, top + 4, name, { ...TEXT, fontSize: '18px' });
    const tier = this.add.text(L.left, top + 30, LOOT_CONFIG.tiers[SHOP_CONFIG.tier]?.name ?? '', {
      ...TEXT,
      fontSize: '14px',
    });
    styleTierText(tier, SHOP_CONFIG.tier);
    const status = this.add.text(L.left, top + 52, '', {
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
    this.rows.push({ weapon, status, frame, price });
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

  /** Vẽ lại theo hồ sơ hiện tại: vàng, tình trạng từng món, nút mua sáng/tối. */
  private sync(): void {
    const { gold, rentals, weaponTiers } = this.profile;
    this.goldText.setText(`Vàng: ${gold}`);
    for (const row of this.rows) {
      const left = rentals[row.weapon] ?? 0;
      const owned = LOOT_CONFIG.tiers[weaponTiers[row.weapon] ?? 0]?.name ?? '';
      row.status.setText(
        this.ownsBetter(row.weapon)
          ? `Đã có ${owned} (vĩnh viễn)`
          : left > 0
            ? `Còn ${left} trận · mua thêm ${SHOP_CONFIG.battles}`
            : `Dùng ${SHOP_CONFIG.battles} trận`,
      );
      const affordable = this.canBuy(row.weapon);
      row.frame.setStrokeStyle(affordable ? 3 : 1, colorNumber(affordable ? 'lime' : 'slate'));
      row.price
        .setText(this.ownsBetter(row.weapon) ? 'ĐÃ CÓ' : `MUA\n${SHOP_CONFIG.price} vàng`)
        .setColor(affordable ? PALETTE.white : PALETTE.mist);
    }
  }
}
