// F18 đợt D: màn Vũ khí — VỎ hiển thị (học ảnh 2 Micro RPG). Nơi DUY NHẤT đổi đồ: hàng "Đang mang" (gần, vừa,
// xa + skill), lưới thẻ mọi vũ khí và skill; chạm thẻ là mang món đó. Luật chọn ở logic/loadout.ts; đồ chọn lưu
// vào hồ sơ và bộ nhớ phiên. Chạm CHƠI về bảng trước trận (màn đang xem dở, không thì màn đang tới).
import { Scene, Scenes, type GameObjects, type Input } from 'phaser';
import { registerPixelSprites } from '../../../app/pixelSprites';
import { setSnapshotProvider } from '../../../app/testBridge';
import { colorNumber, PALETTE } from '../../../shared/palette';
import {
  clearedLevelCount,
  loadProfile,
  saveProfile,
  startLevel,
  withSavedLoadout,
  type SavedLoadout,
} from '../../profile';
import { BATTLE_CONFIG, LOOT_CONFIG, UPGRADE_CONFIG } from '../logic/battleConfig';
import type { Loadout, SkillKind } from '../logic/battleTypes';
import {
  chooseSkill,
  chooseWeapon,
  defaultLoadout,
  describeSkill,
  describeWeapon,
  fromSavedLoadout,
  isSkillUnlocked,
  ownedWeapons,
  skillOptions,
  toSavedLoadout,
} from '../logic/loadout';
import { withWeaponTiers } from '../logic/loot';
import { withUpgrades } from '../logic/upgrades';
import type { MapSceneData } from './MapScene';
import { MAP_GOLD_PILL } from './mapLayout';
import { goFromNav } from './cardScreen';
import { drawNavBar } from './navBar';
import { drawPanel, goldPill, SESSION_LOADOUT } from './uiKit';
import { SKILL_ICON, UI_SPRITES, WEAPON_ICON, type UiSprite } from './uiSprites';
import { styleTierText, tierColor } from './weaponTierStyle';
import {
  equippedCardRects,
  EQUIPPED_SKILL,
  GRID_HINT_Y,
  gridCardRect,
  weaponsTapAt,
} from './weaponsLayout';

/** Mở màn Vũ khí; `returnTo` = Bản đồ mở lại thế nào khi chạm CHƠI (bảng trước trận của màn nào). */
export interface WeaponsSceneData {
  readonly returnTo: MapSceneData;
}

export type WeaponsCard = { kind: 'weapon'; weapon: number } | { kind: 'skill'; skill: SkillKind };

/** Thứ test E2E đọc được qua window.__PIXEL_GAME__.snapshot(). */
export interface WeaponsSnapshot {
  readonly scene: 'weapons';
  readonly gold: number;
  /** Đồ đang mang (cả skill đã chọn, kể cả khi màn sắp chơi chưa mở skill). */
  readonly loadout: Loadout;
  /** Các thẻ của lưới, theo thứ tự trái → phải, trên → dưới. */
  readonly cards: readonly WeaponsCard[];
  readonly tiers: readonly number[];
  readonly canTap: boolean;
}

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
const TAP_DELAY_MS = 500;
const DEPTH = { bg: 0, ui: 5 } as const;
const SLOT_LABEL = { near: 'Tầm gần', mid: 'Tầm vừa', far: 'Tầm xa' } as const;

const TEXT = {
  fontFamily: 'monospace',
  fontStyle: 'bold',
  color: PALETTE.white,
  stroke: PALETTE.ink,
  strokeThickness: 4,
} as const;

export class WeaponsScene extends Scene {
  private config = BATTLE_CONFIG;
  private returnTo: MapSceneData = {};
  private gold = 0;
  private loadout: Loadout = { weapons: [] };
  private cards: WeaponsCard[] = [];
  /** Hình vẽ theo bộ đồ đang mang — xóa và vẽ lại mỗi lần đổi. */
  private dynamic: GameObjects.GameObject[] = [];
  private uiKeys!: Record<UiSprite, string>;
  private openElapsedMs = 0;
  private leaving = false;

  constructor() {
    super('weapons');
  }

  init(data: Partial<WeaponsSceneData>): void {
    const profile = loadProfile();
    this.config = withWeaponTiers(
      withUpgrades(BATTLE_CONFIG, profile.upgrades, UPGRADE_CONFIG),
      profile.weaponTiers,
      LOOT_CONFIG,
    );
    this.returnTo = data.returnTo ?? {};
    this.gold = profile.gold;
    const session = this.registry.get(SESSION_LOADOUT) as SavedLoadout | undefined;
    // F19: chỉ các món đang có (mở khóa theo màn, hoặc có đồ rơi).
    const owned = ownedWeapons(this.config, {
      clearedLevels: clearedLevelCount(profile, this.config.levels.length),
      tiers: profile.weaponTiers,
    });
    this.loadout =
      fromSavedLoadout(session ?? profile.loadout, this.config, owned) ??
      defaultLoadout(this.config, owned);
    // Skill chỉ hiện khi màn sắp chơi (bảng đang mở, hoặc màn đang tới) đã mở skill.
    const count = this.config.levels.length;
    const level = this.returnTo.popupLevel ?? startLevel(profile, null, count);
    this.cards = [
      ...owned.map((weapon): WeaponsCard => ({ kind: 'weapon', weapon })),
      ...(isSkillUnlocked(level, this.config) ? skillOptions(this.config) : []).map(
        (skill): WeaponsCard => ({ kind: 'skill', skill }),
      ),
    ];
    if (isSkillUnlocked(level, this.config) && this.loadout.skill === undefined) {
      const [first] = skillOptions(this.config);
      if (first) this.loadout = chooseSkill(this.loadout, first);
    }
  }

  create(): void {
    this.dynamic = [];
    this.openElapsedMs = 0;
    this.leaving = false;
    this.uiKeys = registerPixelSprites(this, 'ui', UI_SPRITES);
    this.add
      .graphics()
      .fillStyle(colorNumber('shadow'))
      .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .fillStyle(colorNumber('dusk'))
      .fillRect(0, 0, GAME_WIDTH, 46)
      .setDepth(DEPTH.bg);
    goldPill(this, MAP_GOLD_PILL, this.uiKeys.coin, DEPTH.ui).set(String(this.gold));
    this.add
      .text(GAME_WIDTH - 16, 24, 'VŨ KHÍ', { ...TEXT, fontSize: '20px' })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.ui);
    this.add
      .text(GAME_WIDTH / 2, 62, 'Đang mang', { ...TEXT, fontSize: '13px', color: PALETTE.mist })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);
    this.add
      .text(GAME_WIDTH / 2, GRID_HINT_Y, 'Chạm thẻ để mang món đó', {
        ...TEXT,
        fontSize: '13px',
        color: PALETTE.mist,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);
    drawNavBar(this, this.uiKeys, 'weapons', DEPTH.ui);
    this.redraw();

    this.input.on('pointerdown', (pointer: Input.Pointer) => this.handleTap(pointer.x, pointer.y));
    const clearSnapshot = setSnapshotProvider(() => this.snapshot());
    this.events.once(Scenes.Events.SHUTDOWN, clearSnapshot);
  }

  override update(_time: number, delta: number): void {
    this.openElapsedMs += delta;
  }

  private canTap(): boolean {
    return this.openElapsedMs >= TAP_DELAY_MS && !this.leaving;
  }

  private snapshot(): WeaponsSnapshot {
    return {
      scene: 'weapons',
      gold: this.gold,
      loadout: this.loadout,
      cards: this.cards,
      tiers: this.config.weapons.map((w) => w.tier ?? 0),
      canTap: this.canTap(),
    };
  }

  private handleTap(x: number, y: number): void {
    if (!this.canTap()) return;
    const tap = weaponsTapAt(x, y);
    if (tap?.kind === 'card') {
      const card = this.cards[tap.index];
      if (!card) return;
      this.loadout =
        card.kind === 'weapon'
          ? chooseWeapon(this.loadout, card.weapon, this.config)
          : chooseSkill(this.loadout, card.skill);
      // Lưu vào hồ sơ ngay, và vào bộ nhớ phiên: bộ nhớ trình duyệt bị chặn thì vẫn dùng đúng đồ tới khi tắt game.
      const saved = toSavedLoadout(this.loadout, this.config);
      this.registry.set(SESSION_LOADOUT, saved);
      saveProfile(withSavedLoadout(loadProfile(), saved));
      this.redraw();
    } else if (tap?.kind === 'nav' && tap.target !== 'weapons') {
      this.leaving = true;
      goFromNav(this, tap.target, this.returnTo, loadProfile());
    }
  }

  private redraw(): void {
    for (const object of this.dynamic) object.destroy();
    this.dynamic = [];
    const add = <T extends GameObjects.GameObject>(object: T): T => {
      this.dynamic.push(object);
      return object;
    };
    this.loadout.weapons.forEach((weaponIndex, i) => {
      const rect = equippedCardRects[i];
      const weapon = this.config.weapons[weaponIndex];
      if (!rect || !weapon) return;
      this.drawCard(rect, weaponIndex, true, add);
      add(
        this.add
          .text(rect.x + rect.width / 2, rect.y + rect.height + 12, SLOT_LABEL[weapon.slot], {
            ...TEXT,
            fontSize: '11px',
            color: PALETTE.mist,
          })
          .setOrigin(0.5)
          .setDepth(DEPTH.ui),
      );
    });
    // Dòng mô tả món tầm gần đang mang (món đầu) — đủ để người chơi so khi đổi.
    const first = this.config.weapons[this.loadout.weapons[0] ?? -1];
    const skillUnlocked = this.cards.some((c) => c.kind === 'skill');
    if (skillUnlocked && this.loadout.skill) {
      const skill = this.loadout.skill;
      add(drawPanel(this, EQUIPPED_SKILL, 'plum', DEPTH.ui, 0));
      add(
        this.add
          .image(
            EQUIPPED_SKILL.x + 22,
            EQUIPPED_SKILL.y + EQUIPPED_SKILL.height / 2,
            this.uiKeys[SKILL_ICON[skill]],
          )
          .setScale(2)
          .setDepth(DEPTH.ui),
      );
      add(
        this.add
          .text(
            EQUIPPED_SKILL.x + 44,
            EQUIPPED_SKILL.y + EQUIPPED_SKILL.height / 2,
            describeSkill(this.config.skills[skill]),
            {
              ...TEXT,
              fontSize: '11px',
              color: PALETTE.cyan,
              wordWrap: { width: EQUIPPED_SKILL.width - 52 },
            },
          )
          .setOrigin(0, 0.5)
          .setDepth(DEPTH.ui),
      );
    } else if (first) {
      add(
        this.add
          .text(
            GAME_WIDTH / 2,
            EQUIPPED_SKILL.y + EQUIPPED_SKILL.height / 2,
            describeWeapon(first, LOOT_CONFIG),
            {
              ...TEXT,
              fontSize: '11px',
              color: PALETTE.mist,
              align: 'center',
              wordWrap: { width: 320 },
            },
          )
          .setOrigin(0.5)
          .setDepth(DEPTH.ui),
      );
    }
    this.cards.forEach((card, index) => {
      const rect = gridCardRect(index);
      if (card.kind === 'weapon') {
        this.drawCard(rect, card.weapon, this.loadout.weapons.includes(card.weapon), add);
        return;
      }
      const chosen = this.loadout.skill === card.skill;
      add(drawPanel(this, rect, chosen ? 'leaf' : 'ink', DEPTH.ui, 0));
      add(
        this.add
          .graphics()
          .fillStyle(colorNumber('plum'))
          .fillRect(rect.x + 6, rect.y + 6, rect.width - 12, rect.height - 12)
          .setDepth(DEPTH.ui),
      );
      add(
        this.add
          .image(rect.x + rect.width / 2, rect.y + 34, this.uiKeys[SKILL_ICON[card.skill]])
          .setScale(3)
          .setDepth(DEPTH.ui),
      );
      add(
        this.add
          .text(rect.x + rect.width / 2, rect.y + 72, this.config.skills[card.skill].name, {
            ...TEXT,
            fontSize: '12px',
          })
          .setOrigin(0.5)
          .setDepth(DEPTH.ui),
      );
    });
  }

  /** Thẻ vũ khí: viền xanh lá khi đang mang, vạch màu cấp, hình, tên, tên cấp (F20: luôn ghi, kể cả "Thường"), tầm. */
  private drawCard(
    rect: { x: number; y: number; width: number; height: number },
    weaponIndex: number,
    chosen: boolean,
    add: <T extends GameObjects.GameObject>(object: T) => T,
  ): void {
    const weapon = this.config.weapons[weaponIndex];
    if (!weapon) return;
    const tier = weapon.tier ?? 0;
    add(drawPanel(this, rect, chosen ? 'leaf' : 'ink', DEPTH.ui, 0));
    add(
      this.add
        .graphics()
        .fillStyle(colorNumber('navy'))
        .fillRect(rect.x + 6, rect.y + 6, rect.width - 12, rect.height - 12)
        .fillStyle(colorNumber(tierColor(tier)))
        .fillRect(rect.x + 6, rect.y + 6, rect.width - 12, 4)
        .setDepth(DEPTH.ui),
    );
    // Ba dòng chữ dưới hình: tên, tên cấp (tô màu cấp), tầm ("gần", "2 phía"…).
    const cx = rect.x + rect.width / 2;
    const icon = WEAPON_ICON[weapon.name];
    if (icon) {
      add(
        this.add
          .image(cx, rect.y + 24, this.uiKeys[icon])
          .setScale(3)
          .setDepth(DEPTH.ui),
      );
    }
    add(
      this.add
        .text(cx, rect.y + 50, weapon.name, { ...TEXT, fontSize: '13px' })
        .setOrigin(0.5)
        .setDepth(DEPTH.ui),
    );
    const sub = add(
      this.add
        .text(cx, rect.y + 64, LOOT_CONFIG.tiers[tier]?.name ?? '', {
          ...TEXT,
          fontSize: '11px',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.ui),
    );
    styleTierText(sub, tier);
    add(
      this.add
        .text(cx, rect.y + 77, weapon.rangeLabel, {
          ...TEXT,
          fontSize: '10px',
          color: PALETTE.mist,
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.ui),
    );
  }
}
