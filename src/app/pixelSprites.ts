// Nạp sprite vẽ bằng lưới ký tự (pixel art dạng code) thành texture của Phaser.
// Mỗi ký tự 0–F là một màu Sweetie 16 (xem SPRITE_PALETTE), '.' là trong suốt.
import type { Scene } from 'phaser';
import { SPRITE_PALETTE } from '../shared/palette';

/** Một sprite: các hàng ký tự dài bằng nhau. */
export type PixelSprite = readonly string[];

/**
 * Nạp các sprite của một tính năng; tên texture luôn là "<tính năng>.<tên>" để hai tính năng
 * cùng đặt tên "hero" không đè hình của nhau. Trả về bảng tên texture để scene dùng.
 */
export function registerPixelSprites<Name extends string>(
  scene: Scene,
  feature: string,
  sprites: Readonly<Record<Name, PixelSprite>>,
): Record<Name, string> {
  const keys = {} as Record<Name, string>;
  for (const name of Object.keys(sprites) as Name[]) {
    const key = `${feature}.${name}`;
    keys[name] = key;
    // Scene chạy lại (chơi lại) thì texture đã có sẵn từ lần trước — cùng tính năng, cùng hình.
    if (!scene.textures.exists(key)) {
      scene.textures.generate(key, {
        data: [...sprites[name]],
        pixelWidth: 1,
        palette: SPRITE_PALETTE,
      });
    }
  }
  return keys;
}
