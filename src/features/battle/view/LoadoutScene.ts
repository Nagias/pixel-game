// B4: màn chuẩn bị trận — VỎ hiển thị. Hiện trước mỗi màn: chọn mỗi tầm một vũ khí rồi chạm "VÀO TRẬN".
// Luật chọn món nằm ở logic/loadout.ts; scene này chỉ vẽ và chuyển cú chạm thành chooseWeapon().
import { Scene, Scenes, type GameObjects, type Input } from 'phaser';
import { setSnapshotProvider } from '../../../app/testBridge';
import { colorNumber, PALETTE } from '../../../shared/palette';
import { parseLevelParam } from '../../../shared/levelParam';
import { BATTLE_CONFIG } from '../logic/battleConfig';
import type { Loadout, WeaponSlot } from '../logic/battleTypes';
import {
  allWeapons,
  chooseWeapon,
  defaultLoadout,
  describeWeapon,
  slotOptions,
} from '../logic/loadout';
import { descriptionY, LOADOUT_LAYOUT, loadoutTapAt, optionRects, rowTop } from './loadoutLayout';

/** Dữ liệu mở màn chuẩn bị: màn sắp chơi và bộ đồ lần trước (để chọn sẵn). */
export interface LoadoutSceneData {
  readonly level: number;
  readonly loadout: Loadout;
}

/** Thứ test E2E đọc được qua window.__PIXEL_GAME__.snapshot(). */
export interface LoadoutSnapshot {
  readonly scene: 'loadout';
  /** Màn sắp chơi (đếm từ 0). */
  readonly level: number;
  readonly loadout: Loadout;
  /** Các hàng trên màn hình, trên xuống: tầm và các món chọn được (chỉ số trong config.weapons). */
  readonly rows: readonly { readonly slot: WeaponSlot; readonly weapons: readonly number[] }[];
}

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;

const SLOT_LABEL: Record<WeaponSlot, string> = { near: 'Gần', mid: 'Vừa', far: 'Xa' };

const TEXT = {
  fontFamily: 'monospace',
  fontStyle: 'bold',
  color: PALETTE.white,
  stroke: PALETTE.ink,
  strokeThickness: 4,
} as const;

export class LoadoutScene extends Scene {
  private readonly config = BATTLE_CONFIG;
  private level = 0;
  private loadout!: Loadout;
  private rows: { slot: WeaponSlot; weapons: number[] }[] = [];
  private buttons: {
    weaponIndex: number;
    frame: GameObjects.Rectangle;
    name: GameObjects.Text;
    range: GameObjects.Text;
  }[] = [];
  private descriptions: GameObjects.Text[] = [];

  constructor() {
    super('loadout');
  }

  /** Lần đầu mở game không có dữ liệu: màn theo `?level=` (mặc định màn 1), bộ đồ mặc định. */
  init(data: Partial<LoadoutSceneData>): void {
    // Chưa có túi đồ: sở hữu = mọi vũ khí trong cấu hình.
    const owned = allWeapons(this.config);
    this.rows = slotOptions(this.config, owned);
    this.level = data.level ?? parseLevelParam(window.location.search, this.config.levels.length);
    this.loadout = data.loadout ?? defaultLoadout(this.config, owned);
  }

  create(): void {
    // Phaser dùng lại cùng đối tượng scene mỗi lần mở: bỏ tham chiếu tới hình của lần trước.
    this.buttons = [];
    this.descriptions = [];

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, colorNumber('teal')).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, 44, `MÀN ${this.level + 1}/${this.config.levels.length}`, {
        ...TEXT,
        fontSize: '32px',
        color: PALETTE.sand,
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 82, 'Chọn đồ mang vào trận', { ...TEXT, fontSize: '16px' })
      .setOrigin(0.5);

    this.rows.forEach((row, rowIndex) => this.createRow(row, rowIndex));
    this.createStartButton();

    this.input.on('pointerdown', (pointer: Input.Pointer) => this.handleTap(pointer.x, pointer.y));
    const clearSnapshot = setSnapshotProvider(() => this.snapshot());
    this.events.once(Scenes.Events.SHUTDOWN, clearSnapshot);

    this.sync();
  }

  private handleTap(x: number, y: number): void {
    const counts = this.rows.map((row) => row.weapons.length);
    const tap = loadoutTapAt(x, y, counts, LOADOUT_LAYOUT);
    if (tap?.kind === 'start') {
      const data: LoadoutSceneData = { level: this.level, loadout: this.loadout };
      this.scene.start('battle', data);
    } else if (tap?.kind === 'option') {
      const weaponIndex = this.rows[tap.row]?.weapons[tap.option];
      if (weaponIndex === undefined) return;
      this.loadout = chooseWeapon(this.loadout, weaponIndex, this.config);
      this.sync();
    }
  }

  private snapshot(): LoadoutSnapshot {
    return { scene: 'loadout', level: this.level, loadout: this.loadout, rows: this.rows };
  }

  // ---------- Vẽ ----------

  private createRow(row: { slot: WeaponSlot; weapons: number[] }, rowIndex: number): void {
    const L = LOADOUT_LAYOUT;
    this.add
      .text(L.left, rowTop(rowIndex, L) + L.buttonHeight / 2, SLOT_LABEL[row.slot], {
        ...TEXT,
        fontSize: '18px',
        color: PALETTE.sand,
      })
      .setOrigin(0, 0.5);

    const rects = optionRects(rowIndex, row.weapons.length, L);
    row.weapons.forEach((weaponIndex, i) => {
      const rect = rects[i];
      const weapon = this.config.weapons[weaponIndex];
      if (!rect || !weapon) return;
      const centerX = rect.x + rect.width / 2;
      const frame = this.add
        .rectangle(rect.x, rect.y, rect.width, rect.height, colorNumber('navy'))
        .setOrigin(0);
      const name = this.add
        .text(centerX, rect.y + 20, weapon.name, { ...TEXT, fontSize: '18px' })
        .setOrigin(0.5);
      const range = this.add
        .text(centerX, rect.y + 41, weapon.rangeLabel, { ...TEXT, fontSize: '13px' })
        .setOrigin(0.5);
      this.buttons.push({ weaponIndex, frame, name, range });
    });

    this.descriptions[rowIndex] = this.add.text(L.left, descriptionY(rowIndex, L), '', {
      ...TEXT,
      fontSize: '12px',
      strokeThickness: 3,
      color: PALETTE.white,
      wordWrap: { width: L.width },
    });
  }

  private createStartButton(): void {
    const { start } = LOADOUT_LAYOUT;
    this.add
      .rectangle(start.x, start.y, start.width, start.height, colorNumber('grass'))
      .setOrigin(0)
      .setStrokeStyle(3, colorNumber('lime'));
    this.add
      .text(start.x + start.width / 2, start.y + start.height / 2, 'VÀO TRẬN', {
        ...TEXT,
        fontSize: '26px',
      })
      .setOrigin(0.5);
  }

  /** Món đang mang có viền xanh lá, chữ sáng; dòng mô tả mỗi hàng là món đang mang ở tầm đó. */
  private sync(): void {
    for (const button of this.buttons) {
      const selected = this.loadout.weapons.includes(button.weaponIndex);
      button.frame.setStrokeStyle(selected ? 3 : 1, colorNumber(selected ? 'lime' : 'slate'));
      button.name.setColor(selected ? PALETTE.white : PALETTE.mist);
      button.range.setColor(selected ? PALETTE.sand : PALETTE.mist);
    }
    this.rows.forEach((row, rowIndex) => {
      const chosen = this.loadout.weapons
        .map((index) => this.config.weapons[index])
        .find((weapon) => weapon?.slot === row.slot);
      this.descriptions[rowIndex]?.setText(chosen ? describeWeapon(chosen) : '');
    });
  }
}
