// F18 đợt D: vẽ thanh nút dưới cùng (Vũ khí · CHƠI · Nâng cấp — F20 bỏ Cửa hàng) cho Bản đồ, Vũ khí, Nâng cấp.
// Chỉ vẽ — vị trí ở navLayout.ts, chạm do từng scene xử lý.
import type { Scene } from 'phaser';
import { colorNumber, PALETTE } from '../../../shared/palette';
import { NAV_BAR, navButtonRect, NAV_TARGETS, type NavTarget } from './navLayout';
import { drawPanel } from './uiKit';
import type { UiSprite } from './uiSprites';

const LABEL: Record<NavTarget, string> = {
  weapons: 'Vũ khí',
  play: 'CHƠI',
  upgrade: 'Nâng cấp',
};
const ICON: Partial<Record<NavTarget, UiSprite>> = { weapons: 'sword', upgrade: 'up' };

/** `active`: nút của màn đang mở (nền tối, như Micro RPG); `uiKeys`: texture biểu tượng đã nạp. */
export function drawNavBar(
  scene: Scene,
  uiKeys: Readonly<Record<UiSprite, string>>,
  active: NavTarget | null,
  depth: number,
): void {
  scene.add
    .graphics()
    .fillStyle(colorNumber('ink'))
    .fillRect(NAV_BAR.x, NAV_BAR.y - 3, NAV_BAR.width, 3)
    .fillStyle(colorNumber('dusk'))
    .fillRect(NAV_BAR.x, NAV_BAR.y, NAV_BAR.width, NAV_BAR.height)
    .setDepth(depth);
  for (const target of NAV_TARGETS) {
    const r = navButtonRect(target);
    const fill = target === 'play' ? 'red' : target === active ? 'ink' : 'navy';
    drawPanel(scene, r, fill, depth, target === 'play' ? 4 : 0);
    const cx = r.x + r.width / 2;
    const icon = ICON[target];
    if (icon) {
      scene.add
        .image(cx, r.y + 15, uiKeys[icon])
        .setScale(2)
        .setDepth(depth);
    } else {
      // Nút CHƠI: tam giác trắng.
      scene.add
        .graphics()
        .fillStyle(colorNumber('white'))
        .fillTriangle(cx - 10, r.y + 12, cx - 10, r.y + 40, cx + 14, r.y + 26)
        .setDepth(depth);
    }
    scene.add
      .text(cx, r.y + r.height - 9, LABEL[target], {
        fontFamily: 'monospace',
        fontStyle: 'bold',
        fontSize: '11px',
        color: PALETTE.white,
        stroke: PALETTE.ink,
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(depth);
  }
}
