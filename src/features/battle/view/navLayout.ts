// F18 đợt D: thanh nút dưới cùng dùng chung cho Bản đồ, Vũ khí, Nâng cấp (học Micro RPG). F20: bỏ Cửa hàng. Khung
// 360×640. Phép tính tọa độ thuần, không Phaser, không luật chơi.
import type { Rect } from './battleLayout';

export type NavTarget = 'weapons' | 'play' | 'upgrade';

/** Thứ tự trái → phải. */
export const NAV_TARGETS: readonly NavTarget[] = ['weapons', 'play', 'upgrade'];

/** Dải nền thanh dưới. */
export const NAV_BAR: Rect = { x: 0, y: 584, width: 360, height: 56 };

const BUTTONS: Readonly<Record<NavTarget, Rect>> = {
  weapons: { x: 22, y: 592, width: 108, height: 44 },
  // Nút CHƠI ở giữa, to hơn, nhô lên khỏi dải nền 12 điểm cho dễ thấy, dễ chạm.
  play: { x: 138, y: 572, width: 84, height: 64 },
  upgrade: { x: 230, y: 592, width: 108, height: 44 },
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
