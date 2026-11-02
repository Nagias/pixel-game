import { describe, expect, it } from 'vitest';
import { PALETTE, type PaletteColor } from '../../../shared/palette';
import { ARENA_LAYOUT } from './battleLayout';
import { itemBounds, paintScenery, type SceneryLayout } from './scenery';
import { LEVEL_COUNT_ON_MAP, levelNodeRect } from './mapLayout';
import { FOREST_BATTLE_SCENERY, FOREST_MAP_SCENERY, FOREST_THEME } from './sceneryForest';

// F18 đợt C: khung cảnh vẽ bằng code (chủ dự án chọn bản 32 màu, bỏ đường lát đá). Hàm thuần nên test được
// đủ: đúng bảng màu, lặp lại được, không đặt cây/ao đè lên sân đấu.

const themeColors = new Set<PaletteColor>(
  Object.values(FOREST_THEME).flatMap((value) => (Array.isArray(value) ? value : [value])),
);

const rectHitsCircle = (
  r: { x: number; y: number; width: number; height: number },
  [cx, cy, radius]: readonly [number, number, number],
) => {
  const nx = Math.max(r.x, Math.min(cx, r.x + r.width));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.height));
  return (nx - cx) ** 2 + (ny - cy) ** 2 < radius ** 2;
};

describe('paintScenery', () => {
  const pixels = paintScenery(FOREST_BATTLE_SCENERY, FOREST_THEME);

  it('trả đủ width×height điểm, mọi điểm là màu của bảng', () => {
    expect(pixels).toHaveLength(FOREST_BATTLE_SCENERY.width * FOREST_BATTLE_SCENERY.height);
    for (const color of pixels) expect(Object.hasOwn(PALETTE, color)).toBe(true);
  });

  it('chỉ dùng các màu của chủ đề (không màu lạ lọt vào)', () => {
    for (const color of new Set(pixels)) expect(themeColors.has(color), color).toBe(true);
  });

  it('cùng đầu vào → cùng hình; đổi hạt giống → hình khác', () => {
    expect(paintScenery(FOREST_BATTLE_SCENERY, FOREST_THEME)).toEqual(pixels);
    expect(paintScenery({ ...FOREST_BATTLE_SCENERY, seed: 7 }, FOREST_THEME)).not.toEqual(pixels);
  });

  it('không có món nào: chỉ còn cỏ, ngọn cỏ, hoa', () => {
    const empty: SceneryLayout = { ...FOREST_BATTLE_SCENERY, items: [] };
    const allowed = new Set([
      ...FOREST_THEME.ground,
      ...FOREST_THEME.tuft,
      ...FOREST_THEME.flowers,
    ]);
    for (const color of new Set(paintScenery(empty, FOREST_THEME))) {
      expect(allowed.has(color), color).toBe(true);
    }
  });

  it('cây thật sự được vẽ: thân cây có màu thân, tán có viền mực', () => {
    const one: SceneryLayout = {
      width: 60,
      height: 60,
      seed: 1,
      items: [{ kind: 'tree', x: 30, y: 50, size: 16 }],
      keepClear: [],
    };
    const out = paintScenery(one, FOREST_THEME);
    expect(FOREST_THEME.trunk).toContain(out[(50 - 4) * 60 + 30]);
    expect(out).toContain(FOREST_THEME.leaf[0]);
    expect(out).toContain(FOREST_THEME.leaf[3]);
  });

  it('ao được vẽ: giữa ao là nước', () => {
    const pond: SceneryLayout = {
      width: 60,
      height: 60,
      seed: 1,
      items: [{ kind: 'pond', ellipses: [[30, 30, 14, 8]] }],
      keepClear: [],
    };
    expect(FOREST_THEME.water).toContain(paintScenery(pond, FOREST_THEME)[30 * 60 + 30]);
  });
});

describe('FOREST_BATTLE_SCENERY', () => {
  it('khung bằng nửa khung game 360×640 (phóng ×2 cho khớp điểm ảnh nhân vật)', () => {
    expect([FOREST_BATTLE_SCENERY.width, FOREST_BATTLE_SCENERY.height]).toEqual([180, 320]);
  });

  it('vùng cấm chứa trọn sân đấu (tâm, bán kính theo ARENA_LAYOUT chia 2)', () => {
    const outer = ARENA_LAYOUT.heroRadius + 6 * ARENA_LAYOUT.ringWidth;
    expect(FOREST_BATTLE_SCENERY.keepClear).toContainEqual({
      circle: [ARENA_LAYOUT.centerX / 2, ARENA_LAYOUT.centerY / 2, outer / 2 + 2],
    });
  });

  it('không cây, bụi, đá, ao nào đè lên vùng cấm', () => {
    for (const item of FOREST_BATTLE_SCENERY.items) {
      const bounds = itemBounds(item);
      for (const zone of FOREST_BATTLE_SCENERY.keepClear) {
        const hit =
          'circle' in zone
            ? rectHitsCircle(bounds, zone.circle)
            : bounds.x < zone.rect.x + zone.rect.width &&
              zone.rect.x < bounds.x + bounds.width &&
              bounds.y < zone.rect.y + zone.rect.height &&
              zone.rect.y < bounds.y + bounds.height;
        expect(hit, JSON.stringify(item)).toBe(false);
      }
    }
  });
});

describe('FOREST_MAP_SCENERY', () => {
  it('khung 180×320; vùng cấm chứa mọi nút màn (chia 2) để cây không che nút', () => {
    expect([FOREST_MAP_SCENERY.width, FOREST_MAP_SCENERY.height]).toEqual([180, 320]);
    const rects = FOREST_MAP_SCENERY.keepClear.flatMap((zone) =>
      'rect' in zone ? [zone.rect] : [],
    );
    for (let level = 0; level < LEVEL_COUNT_ON_MAP; level++) {
      const node = levelNodeRect(level, true);
      const half = { x: node.x / 2, y: node.y / 2, width: node.width / 2, height: node.height / 2 };
      const covered = rects.some(
        (r) =>
          r.x <= half.x &&
          r.y <= half.y &&
          r.x + r.width >= half.x + half.width &&
          r.y + r.height >= half.y + half.height,
      );
      expect(covered, `màn ${level + 1}`).toBe(true);
    }
  });

  it('có cây, bụi, đá; không món nào đè lên nút màn hay đường nối', () => {
    expect(FOREST_MAP_SCENERY.items.length).toBeGreaterThan(8);
    for (const item of FOREST_MAP_SCENERY.items) {
      const b = itemBounds(item);
      for (const zone of FOREST_MAP_SCENERY.keepClear) {
        if (!('rect' in zone)) continue;
        const r = zone.rect;
        const hit =
          b.x < r.x + r.width &&
          r.x < b.x + b.width &&
          b.y < r.y + r.height &&
          r.y < b.y + b.height;
        expect(hit, JSON.stringify(item)).toBe(false);
      }
    }
  });
});
