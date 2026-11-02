// F18 đợt D: thanh nút dưới cùng dùng chung cho Bản đồ, Vũ khí, Nâng cấp, Cửa hàng (học Micro RPG). Khung
// 360×640. Phép tính tọa độ thuần, không Phaser, không luật chơi.
import type { Rect } from './battleLayout';

export type NavTarget = 'shop' | 'weapons' | 'play' | 'upgrade';

/** Thứ tự trái → phải. */
export const NAV_TARGETS: readonly NavTarget[] = ['shop', 'weapons', 'play', 'upgrade'];

/** Dải nền thanh dưới. */
export const NAV_BAR: Rect = { x: 0, y: 584, width: 360, height: 56 };

const BUTTONS: Readonly<Record<NavTarget, Rect>> = {
  shop: { x: 10, y: 592, width: 76, height: 44 },
  weapons: { x: 94, y: 592, width: 76, height: 44 },
  // Nút CHƠI to hơn, nhô lên khỏi dải nền 12 điểm cho dễ thấy, dễ chạm.
  play: { x: 178, y: 572, width: 84, height: 64 },
  upgrade: { x: 270, y: 592, width: 80, height: 44 },
};

export function navButtonRect(target: NavTarget): Rect {
  return BUTTONS[target];
}

/** Nút ở điểm chạm, hoặc null (khe giữa hai nút, ngoài thanh). */
export function navTapAt(x: number, y: number): NavTarget | null {
  return (
    NAV_TARGETS.find((target) => {
      const r = BUTTONS[target];
      return x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height;
    }) ?? null
  );
}
