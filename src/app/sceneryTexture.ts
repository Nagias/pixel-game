// F18 đợt C: đưa khung cảnh vẽ bằng code (mảng tên màu, xem features/battle/view/scenery.ts) vào Phaser thành
// một texture. Vẽ một lần cho mỗi khóa: scene mở lại (chơi tiếp, chơi lại) dùng lại, không vẽ lại.
import type { Scene } from 'phaser';
import { PALETTE, type PaletteColor } from '../shared/palette';

/**
 * Tạo texture `key` từ `paint()` (chỉ gọi khi texture chưa có) — mảng `width × height` tên màu, hàng trên
 * xuống. Trả về `key` để `scene.add.image(…, key)`.
 */
export function registerSceneryTexture(
  scene: Scene,
  key: string,
  width: number,
  height: number,
  paint: () => readonly PaletteColor[],
): string {
  if (scene.textures.exists(key)) return key;
  const pixels = paint();
  if (pixels.length !== width * height) {
    throw new RangeError(`Khung cảnh "${key}" cần ${width * height} điểm, nhận ${pixels.length}`);
  }
  // Vẽ xong trên canvas riêng rồi mới đưa vào Phaser — cùng đường với textures.generate của hình nhân vật.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error(`Không vẽ được khung cảnh "${key}"`);
  const image = context.createImageData(width, height);
  const rgb = new Map<PaletteColor, readonly [number, number, number]>();
  pixels.forEach((color, i) => {
    let value = rgb.get(color);
    if (!value) {
      const hex = PALETTE[color];
      value = [
        Number.parseInt(hex.slice(1, 3), 16),
        Number.parseInt(hex.slice(3, 5), 16),
        Number.parseInt(hex.slice(5, 7), 16),
      ];
      rgb.set(color, value);
    }
    image.data[i * 4] = value[0];
    image.data[i * 4 + 1] = value[1];
    image.data[i * 4 + 2] = value[2];
    image.data[i * 4 + 3] = 255;
  });
  context.putImageData(image, 0, 0);
  if (!scene.textures.addCanvas(key, canvas)) throw new Error(`Không tạo được texture "${key}"`);
  return key;
}
