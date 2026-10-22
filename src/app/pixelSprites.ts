// Nạp sprite vẽ bằng lưới ký tự (pixel art dạng code) thành texture của Phaser.
// Mỗi ký tự 0–F là một màu Sweetie 16 (xem SPRITE_PALETTE), '.' là trong suốt.
import type { Scene } from 'phaser';
import { SPRITE_PALETTE } from '../shared/palette';

/** Một sprite: các hàng ký tự dài bằng nhau. */
export type PixelSprite = readonly string[];

export function registerPixelSprites(
  scene: Scene,
  sprites: Readonly<Record<string, PixelSprite>>,
): void {
  for (const [key, rows] of Object.entries(sprites)) {
    if (scene.textures.exists(key)) continue;
    scene.textures.generate(key, { data: [...rows], pixelWidth: 1, palette: SPRITE_PALETTE });
  }
}
