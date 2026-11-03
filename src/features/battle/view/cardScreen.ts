// F18 đợt E: phần dùng chung của màn Nâng cấp và Cửa hàng dạng thẻ (học ảnh 2, 3 Micro RPG): nền, ô vàng,
// băng rôn tên màn, dòng báo, thanh nút dưới, nút mua; và cách đi theo thanh nút dưới. Chỉ vẽ và chuyển scene.
import type { GameObjects, Scene } from 'phaser';
import { colorNumber, PALETTE } from '../../../shared/palette';
import { startLevel, type Profile } from '../../profile';
import { BATTLE_CONFIG } from '../logic/battleConfig';
import type { MapSceneData } from './MapScene';
import { MAP_GOLD_PILL } from './mapLayout';
import { drawNavBar } from './navBar';
import type { NavTarget } from './navLayout';
import type { Rect } from './battleLayout';
import { drawPanel, goldPill } from './uiKit';
import type { UiSprite } from './uiSprites';

export const CARD_TEXT = {
  fontFamily: 'monospace',
  fontStyle: 'bold',
  color: PALETTE.white,
  stroke: PALETTE.ink,
  strokeThickness: 4,
} as const;

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;

/** Nền, ô vàng, băng rôn `title`, dòng báo (trả về để ghi "Không lưu được…"), thanh nút dưới. */
export function drawCardScreen(
  scene: Scene,
  title: string,
  active: NavTarget,
  uiKeys: Readonly<Record<UiSprite, string>>,
): { gold: { set(text: string): void }; notice: GameObjects.Text } {
  scene.add
    .graphics()
    .fillStyle(colorNumber('shadow'))
    .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    .fillStyle(colorNumber('dusk'))
    .fillRect(0, 0, GAME_WIDTH, 46);
  const gold = goldPill(scene, MAP_GOLD_PILL, uiKeys.coin, 5);
  const ribbon = { x: 140, y: 6, width: 212, height: 36 };
  drawPanel(scene, ribbon, 'orange', 5, 3);
  scene.add
    .text(ribbon.x + ribbon.width / 2, ribbon.y + ribbon.height / 2, title, {
      ...CARD_TEXT,
      fontSize: '20px',
    })
    .setOrigin(0.5)
    .setDepth(5);
  // F19: dòng báo ở đáy (trên thanh nút) — phía trên đã có nút thẻ chọn của màn Nâng cấp.
  const notice = scene.add
    .text(GAME_WIDTH / 2, 563, '', { ...CARD_TEXT, fontSize: '13px', color: PALETTE.orange })
    .setOrigin(0.5)
    .setDepth(5);
  drawNavBar(scene, uiKeys, active, 5);
  return { gold, notice };
}

/** Thẻ: viền 3 điểm, nền xanh đậm. Trả về hình để màn có thể xóa khi vẽ lại (thẻ chọn của Nâng cấp). */
export function drawCardFrame(scene: Scene, rect: Rect): GameObjects.Graphics {
  return drawPanel(scene, rect, 'navy', 5, 4);
}

/** Nút mua (vẽ lại theo hồ sơ): mua được thì sáng viền xanh lá, không thì tối. */
export function drawBuyButton(g: GameObjects.Graphics, rect: Rect, enabled: boolean): void {
  g.clear()
    .fillStyle(colorNumber(enabled ? 'leaf' : 'ink'))
    .fillRect(rect.x, rect.y, rect.width, rect.height)
    .fillStyle(colorNumber(enabled ? 'grass' : 'dusk'))
    .fillRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6);
}

/**
 * Đi theo thanh nút dưới từ một màn phụ: CHƠI về Bản đồ mở bảng trước trận (màn đang xem dở, không thì màn
 * đang tới); các nút khác mở màn đó.
 */
export function goFromNav(
  scene: Scene,
  target: NavTarget,
  returnTo: MapSceneData,
  profile: Profile,
): void {
  if (target === 'play') {
    const level = returnTo.popupLevel ?? startLevel(profile, null, BATTLE_CONFIG.levels.length);
    const data: MapSceneData = { popupLevel: level };
    scene.scene.start('map', data);
  } else if (target === 'weapons') {
    scene.scene.start('weapons', { returnTo });
  } else {
    scene.scene.start(target, returnTo);
  }
}
