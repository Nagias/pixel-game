// F18 đợt C: các mảnh giao diện dùng chung kiểu pixel (bố cục học Micro RPG): khung viền mực đổ bóng, ô vàng,
// thanh máu. Chỉ vẽ — không luật chơi. Màu chỉ lấy từ PALETTE.
import type { GameObjects, Scene } from 'phaser';
import { colorNumber, PALETTE, type PaletteColor } from '../../../shared/palette';
import type { Rect } from './battleLayout';

/** Khóa trong registry của Phaser: đồ đang mang của phiên chơi (dạng lưu) — dùng khi bộ nhớ trình duyệt bị chặn. */
export const SESSION_LOADOUT = 'battle.sessionLoadout';

const TEXT = {
  fontFamily: 'monospace',
  fontStyle: 'bold',
  color: PALETTE.white,
  stroke: PALETTE.ink,
  strokeThickness: 4,
} as const;

/** Khối vuông viền mực 3 điểm, bóng mực lệch xuống `drop` điểm — kiểu pixel, không bo góc. */
export function drawPanel(
  scene: Scene,
  rect: Rect,
  fill: PaletteColor,
  depth: number,
  drop = 4,
): GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(colorNumber('ink'));
  if (drop > 0) g.fillRect(rect.x, rect.y + drop, rect.width, rect.height);
  g.fillRect(rect.x, rect.y, rect.width, rect.height);
  g.fillStyle(colorNumber(fill));
  g.fillRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6);
  return g;
}

/** Ô vàng: khung trắng, đồng xu bên trái, số bên phải. `coinKey` là texture đồng xu đã nạp. */
export function goldPill(
  scene: Scene,
  rect: Rect,
  coinKey: string,
  depth: number,
): { set(text: string): void } {
  drawPanel(scene, rect, 'white', depth, 3);
  scene.add
    .image(rect.x + 8, rect.y + rect.height / 2, coinKey)
    .setOrigin(0, 0.5)
    .setScale(2)
    .setDepth(depth);
  const label = scene.add
    .text(rect.x + rect.width - 10, rect.y + rect.height / 2, '', {
      ...TEXT,
      fontSize: '15px',
      color: PALETTE.ink,
      strokeThickness: 0,
    })
    .setOrigin(1, 0.5)
    .setDepth(depth);
  return { set: (text) => label.setText(text) };
}

/** Thanh máu nhỏ trên đầu nhân vật/quái: nền tối, máu vàng, số máu trắng viền mực phía trên. */
export class HpBar {
  static readonly WIDTH = 30;
  private readonly bar: GameObjects.Graphics;
  private readonly label: GameObjects.Text;

  constructor(scene: Scene, depth: number) {
    this.bar = scene.add.graphics().setDepth(depth);
    this.label = scene.add
      .text(0, 0, '', { ...TEXT, fontSize: '11px', strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(depth);
  }

  /** Đặt thanh với tâm trên tại (x, y) và vẽ theo máu hiện tại. */
  draw(hp: number, max: number): void {
    const w = HpBar.WIDTH;
    const ratio = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
    this.bar
      .clear()
      .fillStyle(colorNumber('ink'))
      .fillRect(-w / 2, 0, w, 8)
      .fillStyle(colorNumber('shadow'))
      .fillRect(-w / 2 + 2, 2, w - 4, 4)
      .fillStyle(colorNumber('yellow'))
      .fillRect(-w / 2 + 2, 2, Math.round((w - 4) * ratio), 4);
    this.label.setText(String(hp));
  }

  moveTo(x: number, y: number): void {
    this.bar.setPosition(x, y);
    this.label.setPosition(x, y - 1);
  }

  /** Các đối tượng để tween di chuyển cùng hình quái. */
  get parts(): readonly (GameObjects.Graphics | GameObjects.Text)[] {
    return [this.bar, this.label];
  }

  destroy(): void {
    this.bar.destroy();
    this.label.destroy();
  }
}
