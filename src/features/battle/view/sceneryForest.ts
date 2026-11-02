// F18 đợt C: chủ đề Rừng rậm — bộ màu và bố cục khung cảnh màn trận đấu (khung 180×320, phóng ×2 thành
// 360×640). Màu lấy đúng bản phác chủ dự án chọn (bản B, 32 màu). Đợt D thêm bố cục màn Bản đồ.
import { ARENA_LAYOUT } from './battleLayout';
import type { Rect } from './battleLayout';
import { LEVEL_COUNT_ON_MAP, levelNodeRect } from './mapLayout';
import type { SceneryLayout, SceneryTheme } from './scenery';

export const FOREST_THEME: SceneryTheme = {
  ground: ['grass', 'leaf'],
  leaf: ['ink', 'forest', 'pine', 'grass', 'leaf'],
  autumn: ['ink', 'bark', 'rust', 'orange', 'amber'],
  trunk: ['ink', 'umber', 'bark', 'clay'],
  stone: ['ink', 'dusk', 'steel', 'mist'],
  water: ['navy', 'blue', 'cyan', 'white'],
  bank: ['umber', 'bark'],
  flowers: ['red', 'yellow', 'white', 'magenta'],
  tuft: ['yellow', 'grass'],
};

const ARENA_OUTER = ARENA_LAYOUT.heroRadius + 6 * ARENA_LAYOUT.ringWidth;

/**
 * Trận đấu: hàng cây phía trên (sau thanh thông tin), cây hai mép khuất một nửa, ao góc dưới trái, bụi và đá
 * rải mép. Sân đấu (cộng 2 điểm lề) để trống. Thanh trên/dưới vẽ đè lên nên không cần cấm.
 */
export const FOREST_BATTLE_SCENERY: SceneryLayout = {
  width: 180,
  height: 320,
  seed: 42,
  keepClear: [
    { circle: [ARENA_LAYOUT.centerX / 2, ARENA_LAYOUT.centerY / 2, ARENA_OUTER / 2 + 2] },
  ],
  items: [
    // Hàng cây xa, nửa trên khuất sau thanh thông tin.
    ...[-4, 18, 40, 62, 118, 140, 162, 184].map((x) => ({
      kind: 'tree' as const,
      x,
      y: 30,
      size: 15,
    })),
    // Hàng cây gần, chừa khoảng giữa cho bụi.
    { kind: 'tree', x: 8, y: 56, size: 17 },
    { kind: 'tree', x: 38, y: 58, size: 15 },
    { kind: 'tree', x: 142, y: 57, size: 16, autumn: true },
    { kind: 'tree', x: 174, y: 55, size: 17 },
    { kind: 'bush', x: 70, y: 58, size: 7 },
    { kind: 'bush', x: 110, y: 60, size: 7, autumn: true },
    // Cây hai mép, khuất một nửa ngoài khung.
    { kind: 'tree', x: -12, y: 160, size: 16 },
    { kind: 'tree', x: 192, y: 150, size: 16 },
    { kind: 'tree', x: -8, y: 252, size: 16, autumn: true },
    { kind: 'tree', x: 188, y: 250, size: 16 },
    { kind: 'rock', x: 12, y: 104, size: 3 },
    { kind: 'rock', x: 168, y: 110, size: 3 },
    // Ao góc dưới trái, bụi, đá ngay trên dải nền thanh vũ khí (y ≥ 254 bị dải nền che).
    {
      kind: 'pond',
      ellipses: [
        [24, 240, 16, 7],
        [38, 245, 10, 5],
      ],
    },
    { kind: 'bush', x: 72, y: 246, size: 6 },
    { kind: 'rock', x: 140, y: 244, size: 4 },
    { kind: 'bush', x: 40, y: 318, size: 8 },
    { kind: 'bush', x: 112, y: 320, size: 7, autumn: true },
    { kind: 'tree', x: 168, y: 332, size: 20 },
  ],
};

/** Hình bao (ở khung cảnh 180×320, có lề 3 điểm) của nút màn `level` và nút kế — để cây không che đường đi. */
function pathZone(level: number): Rect {
  const a = levelNodeRect(level, true);
  const b = levelNodeRect(Math.min(level + 1, LEVEL_COUNT_ON_MAP - 1), true);
  const x = Math.min(a.x, b.x) / 2 - 3;
  const y = Math.min(a.y, b.y) / 2 - 3;
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) / 2 + 3 - x,
    height: Math.max(a.y + a.height, b.y + b.height) / 2 + 3 - y,
  };
}

/**
 * F18 đợt D — Bản đồ: cây viền hai mép và hai góc trên, bụi và đá giữa các hàng nút. Nút màn và đường nối để
 * trống (vùng cấm). Băng rôn, thanh trên/dưới vẽ đè lên.
 */
export const FOREST_MAP_SCENERY: SceneryLayout = {
  width: 180,
  height: 320,
  seed: 7,
  keepClear: Array.from({ length: LEVEL_COUNT_ON_MAP }, (_, level) => ({ rect: pathZone(level) })),
  items: [
    { kind: 'tree', x: 6, y: 82, size: 12 },
    { kind: 'tree', x: 174, y: 82, size: 12, autumn: true },
    ...[250, 207, 165, 122].map((y, i) => ({
      kind: 'tree' as const,
      x: -8,
      y,
      size: 14,
      autumn: i === 2,
    })),
    ...[244, 201, 160, 118].map((y, i) => ({
      kind: 'tree' as const,
      x: 188,
      y,
      size: 14,
      autumn: i === 1,
    })),
    { kind: 'bush', x: 48, y: 256, size: 5 },
    { kind: 'rock', x: 92, y: 255, size: 3 },
    { kind: 'bush', x: 90, y: 213, size: 5, autumn: true },
    { kind: 'bush', x: 128, y: 213, size: 5 },
    { kind: 'bush', x: 48, y: 171, size: 5 },
    { kind: 'rock', x: 92, y: 170, size: 3 },
    { kind: 'bush', x: 90, y: 128, size: 5 },
    { kind: 'rock', x: 126, y: 127, size: 3 },
  ],
};
