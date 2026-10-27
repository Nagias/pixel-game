// B4: màn chuẩn bị trận — VỎ hiển thị. Hiện trước mỗi màn: chọn mỗi tầm một vũ khí (B6: và một skill
// từ màn mở skill) rồi chạm "VÀO TRẬN". Luật chọn nằm ở logic/loadout.ts; scene này chỉ vẽ và chuyển cú
// chạm thành chooseWeapon() / chooseSkill().
import { Scene, Scenes, type GameObjects, type Input } from 'phaser';
import { setSnapshotProvider } from '../../../app/testBridge';
import { colorNumber, PALETTE } from '../../../shared/palette';
import { parseLevelParam } from '../../../shared/levelParam';
import { loadProfile, startLevel } from '../../profile';
import { levelAt } from '../logic/battle';
import { BATTLE_CONFIG } from '../logic/battleConfig';
import type { Loadout, SkillKind, WeaponSlot } from '../logic/battleTypes';
import {
  allWeapons,
  chooseSkill,
  chooseWeapon,
  defaultLoadout,
  describeSkill,
  describeWeapon,
  isSkillUnlocked,
  loadoutForLevel,
  skillOptions,
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
  /** Các hàng vũ khí, trên xuống: tầm và các món chọn được (chỉ số trong config.weapons). */
  readonly rows: readonly { readonly slot: WeaponSlot; readonly weapons: readonly number[] }[];
  /** B6: các nút của hàng skill (ngay dưới các hàng vũ khí); rỗng nếu màn này chưa mở skill. */
  readonly skills: readonly SkillKind[];
  /** Màn đã hiện đủ lâu để nhận chạm (chống chạm nhầm nối từ màn kết quả). */
  readonly canTap: boolean;
  /** Đợt 3: tổng vàng trong hồ sơ người chơi (hiện góc trên bên phải). */
  readonly gold: number;
}

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
/**
 * Hành vi giao diện, không phải luật chơi: màn vừa mở chờ chút mới nhận chạm — chạm đúp ở màn kết quả
 * không được lọt thành chạm "VÀO TRẬN" (nút này nằm đúng chỗ thanh vũ khí trong trận).
 */
const TAP_DELAY_MS = 500;

const SLOT_LABEL: Record<WeaponSlot, string> = { near: 'Gần', mid: 'Vừa', far: 'Xa' };

const TEXT = {
  fontFamily: 'monospace',
  fontStyle: 'bold',
  color: PALETTE.white,
  stroke: PALETTE.ink,
  strokeThickness: 4,
} as const;

/** Một nút chọn trên màn: một vũ khí hoặc một skill. */
interface OptionButton {
  readonly isSelected: (loadout: Loadout) => boolean;
  readonly frame: GameObjects.Rectangle;
  readonly name: GameObjects.Text;
  readonly sub: GameObjects.Text;
}

export class LoadoutScene extends Scene {
  private readonly config = BATTLE_CONFIG;
  private level = 0;
  /** Đợt 3: tổng vàng trong hồ sơ, đọc mỗi lần mở màn. */
  private gold = 0;
  private loadout!: Loadout;
  private rows: { slot: WeaponSlot; weapons: number[] }[] = [];
  private skills: SkillKind[] = [];
  private buttons: OptionButton[] = [];
  private descriptions: GameObjects.Text[] = [];
  /**
   * Thời gian màn đã hiện, cộng dồn theo khung hình. Không dùng this.time.now lúc create(): scene mở lại
   * thì đồng hồ của nó còn giữ giờ của lần trước, mới cập nhật ở khung hình đầu.
   */
  private openElapsedMs = 0;
  /** Đã chạm "VÀO TRẬN" — bỏ qua mọi chạm sau đó (tránh mở trận hai lần). */
  private starting = false;
  /**
   * B6: skill người chơi chọn gần nhất. Cố ý KHÔNG xóa khi mở lại scene (Phaser dùng lại cùng đối tượng
   * scene): đó chính là trí nhớ qua các màn chưa mở skill. Tắt game là mất (hồ sơ đợt 3 chỉ lưu vàng và màn đã mở khóa).
   */
  private lastSkill: SkillKind | undefined = undefined;

  constructor() {
    super('loadout');
  }

  /**
   * Lần đầu mở game không có dữ liệu: đợt 3 — màn cao nhất đã mở khóa trong hồ sơ (hoặc màn `?level=` nếu
   * đã mở khóa), bộ đồ mặc định.
   */
  init(data: Partial<LoadoutSceneData>): void {
    // Chưa có túi đồ: sở hữu = mọi vũ khí trong cấu hình.
    const owned = allWeapons(this.config);
    this.rows = slotOptions(this.config, owned);
    const levelCount = this.config.levels.length;
    const profile = loadProfile();
    this.gold = profile.gold;
    this.level =
      data.level ??
      startLevel(profile, parseLevelParam(window.location.search, levelCount), levelCount);
    this.skills = isSkillUnlocked(this.level, this.config) ? skillOptions(this.config) : [];
    // B6: màn chưa mở skill thì bỏ skill; màn đã mở thì chọn sẵn skill người chơi chọn lần gần nhất
    // (nhớ qua cả các màn chưa có skill, vd. sau phá đảo), chưa từng chọn thì skill đầu.
    const previous = data.loadout ?? defaultLoadout(this.config, owned);
    if (previous.skill !== undefined) this.lastSkill = previous.skill;
    const remembered =
      previous.skill === undefined && this.lastSkill !== undefined
        ? { ...previous, skill: this.lastSkill }
        : previous;
    this.loadout = loadoutForLevel(remembered, this.level, this.config);
  }

  create(): void {
    // Phaser dùng lại cùng đối tượng scene mỗi lần mở: bỏ tham chiếu tới hình của lần trước.
    this.buttons = [];
    this.descriptions = [];
    this.openElapsedMs = 0;
    this.starting = false;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, colorNumber('teal')).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, 30, `MÀN ${this.level + 1}/${this.config.levels.length}`, {
        ...TEXT,
        fontSize: '32px',
        color: PALETTE.sand,
      })
      .setOrigin(0.5);
    // Đợt 3: tổng vàng trong hồ sơ, góc trên bên phải (chữ nhỏ, không đè tiêu đề ở giữa).
    this.add
      .text(GAME_WIDTH - 12, 8, `Vàng: ${this.gold}`, {
        ...TEXT,
        fontSize: '14px',
        color: PALETTE.sand,
      })
      .setOrigin(1, 0);
    // F11: báo nhiệm vụ trước trận để người chơi chọn đồ theo nó.
    const { quest } = levelAt(this.level, this.config);
    this.add
      .text(
        GAME_WIDTH / 2,
        62,
        quest
          ? `Nhiệm vụ: hạ ${quest.count} ${this.config.monsterKinds[quest.kind].name}`
          : 'Nhiệm vụ: diệt sạch quái',
        { ...TEXT, fontSize: '16px', color: PALETTE.lime },
      )
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 86, 'Chọn đồ mang vào trận', {
        ...TEXT,
        fontSize: '14px',
        color: PALETTE.mist,
      })
      .setOrigin(0.5);

    this.rows.forEach((row, rowIndex) => this.createWeaponRow(row, rowIndex));
    this.createSkillRow(this.rows.length);
    this.createStartButton();

    this.input.on('pointerdown', (pointer: Input.Pointer) => this.handleTap(pointer.x, pointer.y));
    const clearSnapshot = setSnapshotProvider(() => this.snapshot());
    this.events.once(Scenes.Events.SHUTDOWN, clearSnapshot);

    this.sync();
  }

  override update(_time: number, delta: number): void {
    this.openElapsedMs += delta;
  }

  private canTap(): boolean {
    return !this.starting && this.openElapsedMs >= TAP_DELAY_MS;
  }

  private handleTap(x: number, y: number): void {
    if (!this.canTap()) return;
    const counts = [...this.rows.map((row) => row.weapons.length), this.skills.length];
    const tap = loadoutTapAt(x, y, counts, LOADOUT_LAYOUT);
    if (tap?.kind === 'start') {
      this.starting = true;
      const data: LoadoutSceneData = { level: this.level, loadout: this.loadout };
      this.scene.start('battle', data);
    } else if (tap?.kind === 'option') {
      if (tap.row === this.rows.length) {
        const skill = this.skills[tap.option];
        if (skill === undefined) return;
        this.loadout = chooseSkill(this.loadout, skill);
        this.lastSkill = skill;
      } else {
        const weaponIndex = this.rows[tap.row]?.weapons[tap.option];
        if (weaponIndex === undefined) return;
        this.loadout = chooseWeapon(this.loadout, weaponIndex, this.config);
      }
      this.sync();
    }
  }

  private snapshot(): LoadoutSnapshot {
    return {
      scene: 'loadout',
      level: this.level,
      loadout: this.loadout,
      rows: this.rows,
      skills: this.skills,
      canTap: this.canTap(),
      gold: this.gold,
    };
  }

  // ---------- Vẽ ----------

  private createRowLabel(rowIndex: number, label: string): void {
    const L = LOADOUT_LAYOUT;
    this.add
      .text(L.left, rowTop(rowIndex, L) + L.buttonHeight / 2, label, {
        ...TEXT,
        fontSize: '18px',
        color: PALETTE.sand,
      })
      .setOrigin(0, 0.5);
    this.descriptions[rowIndex] = this.add.text(L.left, descriptionY(rowIndex, L), '', {
      ...TEXT,
      fontSize: '12px',
      strokeThickness: 3,
      color: PALETTE.white,
      wordWrap: { width: L.width },
    });
  }

  private createButtons(
    rowIndex: number,
    options: readonly { name: string; sub: string; isSelected: (l: Loadout) => boolean }[],
  ): void {
    const rects = optionRects(rowIndex, options.length, LOADOUT_LAYOUT);
    options.forEach((option, i) => {
      const rect = rects[i];
      if (!rect) return;
      const centerX = rect.x + rect.width / 2;
      const frame = this.add
        .rectangle(rect.x, rect.y, rect.width, rect.height, colorNumber('navy'))
        .setOrigin(0);
      const name = this.add
        .text(centerX, rect.y + 18, option.name, { ...TEXT, fontSize: '17px' })
        .setOrigin(0.5);
      const sub = this.add
        .text(centerX, rect.y + 38, option.sub, { ...TEXT, fontSize: '12px', strokeThickness: 3 })
        .setOrigin(0.5);
      this.buttons.push({ isSelected: option.isSelected, frame, name, sub });
    });
  }

  private createWeaponRow(row: { slot: WeaponSlot; weapons: number[] }, rowIndex: number): void {
    this.createRowLabel(rowIndex, SLOT_LABEL[row.slot]);
    this.createButtons(
      rowIndex,
      row.weapons.flatMap((weaponIndex) => {
        const weapon = this.config.weapons[weaponIndex];
        if (!weapon) return [];
        return [
          {
            name: weapon.name,
            sub: weapon.rangeLabel,
            isSelected: (l: Loadout) => l.weapons.includes(weaponIndex),
          },
        ];
      }),
    );
  }

  /** B6: hàng skill — màn chưa mở skill thì chỉ ghi "Mở từ màn n". */
  private createSkillRow(rowIndex: number): void {
    this.createRowLabel(rowIndex, 'Skill');
    if (this.skills.length === 0) {
      const L = LOADOUT_LAYOUT;
      this.add
        .text(
          L.left + L.labelWidth,
          rowTop(rowIndex, L) + L.buttonHeight / 2,
          `Mở từ màn ${this.config.skillUnlockLevel + 1}`,
          { ...TEXT, fontSize: '16px', color: PALETTE.mist },
        )
        .setOrigin(0, 0.5);
      return;
    }
    this.createButtons(
      rowIndex,
      this.skills.map((kind) => ({
        name: this.config.skills[kind].name,
        sub: `nạp ${this.config.skills[kind].chargeTurns} nhát`,
        isSelected: (l: Loadout) => l.skill === kind,
      })),
    );
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

  /** Món / skill đang mang có viền xanh lá, chữ sáng; dòng mô tả mỗi hàng là thứ đang mang ở hàng đó. */
  private sync(): void {
    for (const button of this.buttons) {
      const selected = button.isSelected(this.loadout);
      button.frame.setStrokeStyle(selected ? 3 : 1, colorNumber(selected ? 'lime' : 'slate'));
      button.name.setColor(selected ? PALETTE.white : PALETTE.mist);
      button.sub.setColor(selected ? PALETTE.sand : PALETTE.mist);
    }
    this.rows.forEach((row, rowIndex) => {
      const chosen = this.loadout.weapons
        .map((index) => this.config.weapons[index])
        .find((weapon) => weapon?.slot === row.slot);
      this.descriptions[rowIndex]?.setText(chosen ? describeWeapon(chosen) : '');
    });
    const skill = this.loadout.skill;
    this.descriptions[this.rows.length]?.setText(
      skill === undefined ? '' : describeSkill(this.config.skills[skill]),
    );
  }
}
