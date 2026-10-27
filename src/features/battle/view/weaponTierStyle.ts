// Đợt 5: màu và hiệu ứng cấp vũ khí — dùng chung cho màn chuẩn bị và thanh vũ khí trong trận. Chỉ là hình:
// cấp và chỉ số nằm ở logic/loot.ts.
import type { GameObjects, Scene } from 'phaser';
import { colorNumber, PALETTE, type PaletteColor } from '../../../shared/palette';
import type { Rect } from './battleLayout';

/**
 * Màu chữ theo cấp (chỉ số trong LOOT_CONFIG.tiers), chủ dự án duyệt: trắng, xanh lá, xanh dương, tím, cam,
 * đỏ. Bảng Sweetie 16 không có tím sáng — dùng `plum` (tím đậm) kèm viền trắng cho dễ đọc.
 */
const TIER_COLORS: readonly PaletteColor[] = ['white', 'lime', 'sky', 'plum', 'orange', 'crimson'];

export function tierColor(tier: number): PaletteColor {
  return TIER_COLORS[Math.min(Math.max(tier, 0), TIER_COLORS.length - 1)] ?? 'white';
}

/** Màu cấp quá tối trên nền xanh đậm — đổi viền chữ sang trắng mới đọc được. */
const DARK_TIER_COLORS: readonly PaletteColor[] = ['plum', 'crimson'];

/** Tô chữ theo màu cấp; màu tối (tím, đỏ) đổi viền sang trắng mới đọc được trên nền xanh đậm. */
export function styleTierText(text: GameObjects.Text, tier: number): void {
  const color = tierColor(tier);
  text
    .setColor(PALETTE[color])
    .setStroke(
      DARK_TIER_COLORS.includes(color) ? PALETTE.white : PALETTE.ink,
      text.style.strokeThickness,
    );
}

/**
 * Cấp cao nhất ("Thần"): sét sáng quanh nút vũ khí — hai khung vàng / trắng chớp lệch nhịp nhau. Tạm bằng
 * hình khối (DEBT-007: đồ họa thật sau).
 */
export function addLightning(scene: Scene, rect: Rect, depth = 0): void {
  const frame = (pad: number, color: PaletteColor) =>
    scene.add
      .rectangle(rect.x - pad, rect.y - pad, rect.width + pad * 2, rect.height + pad * 2)
      .setOrigin(0)
      .setStrokeStyle(2, colorNumber(color))
      .setDepth(depth);
  const outer = frame(4, 'sand');
  const inner = frame(1, 'white');
  scene.tweens.add({
    targets: outer,
    alpha: 0.15,
    duration: 80,
    yoyo: true,
    repeat: -1,
    repeatDelay: 520,
  });
  scene.tweens.add({
    targets: inner,
    alpha: 0.1,
    duration: 60,
    yoyo: true,
    repeat: -1,
    repeatDelay: 830,
  });
}
