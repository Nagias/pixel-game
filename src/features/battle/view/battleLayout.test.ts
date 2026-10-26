import { describe, expect, it } from 'vitest';
import { isInZone, zoneSectors } from '../logic/arena';
import type { WeaponConfig } from '../logic/battleTypes';
import {
  ARENA_LAYOUT,
  barButtonCount,
  skillButtonIndex,
  cellToPoint,
  polarToPoint,
  ringCenterRadius,
  ringInnerRadius,
  sectorCenterAngle,
  isInWeaponBar,
  WEAPON_BAR,
  weaponButtonAt,
  weaponButtonRects,
  zoneArc,
  zoneArcs,
  zoneRadii,
  type ArenaLayout,
  type WeaponBarLayout,
} from './battleLayout';

const LAYOUT: ArenaLayout = { centerX: 100, centerY: 100, heroRadius: 34, ringWidth: 21 };
const DEG = Math.PI / 180;

describe('polarToPoint — góc tính từ hướng 12 giờ, theo chiều kim đồng hồ', () => {
  it.each([
    [0, 100, 90], // 12 giờ: thẳng lên
    [90, 110, 100], // 3 giờ: sang phải
    [180, 100, 110], // 6 giờ: xuống
    [270, 90, 100], // 9 giờ: sang trái
  ])('%i° bán kính 10 → (%f, %f)', (degrees, x, y) => {
    const point = polarToPoint(degrees * DEG, 10, LAYOUT);
    expect(point.x).toBeCloseTo(x, 6);
    expect(point.y).toBeCloseTo(y, 6);
  });
});

describe('vị trí ô trên sân', () => {
  it('tâm lát 0 lệch 7,5° và lát 6 ở 97,5° (24 lát)', () => {
    expect(sectorCenterAngle(0, 24)).toBeCloseTo(7.5 * DEG, 9);
    expect(sectorCenterAngle(6, 24)).toBeCloseTo(97.5 * DEG, 9);
  });

  it('bán kính tâm vòng tăng đều từ mép nhân vật ra ngoài', () => {
    expect(ringCenterRadius(0, LAYOUT)).toBe(44.5);
    expect(ringCenterRadius(5, LAYOUT)).toBe(149.5);
  });

  it('ô lát 18 vòng 0 nằm bên trái tâm, hơi chếch lên', () => {
    // 277,5°: x = 100 + 44,5·sin(277,5°) ≈ 55,88; y = 100 − 44,5·cos(277,5°) ≈ 94,19
    const point = cellToPoint({ sector: 18, ring: 0 }, 24, LAYOUT);
    expect(point.x).toBeCloseTo(55.88, 1);
    expect(point.y).toBeCloseTo(94.19, 1);
  });
});

describe('zoneArc — hình nêm xanh khớp đúng vùng luật chơi', () => {
  it('ngắm lát 0, rộng 3 lát: từ −15° tới 30°', () => {
    const arc = zoneArc(0, 3, 24);
    expect(arc.start).toBeCloseTo(-15 * DEG, 9);
    expect(arc.end).toBeCloseTo(30 * DEG, 9);
  });

  it('mọi lát luật coi là trúng đều có tâm nằm trong hình nêm, với mọi lát ngắm', () => {
    for (let aim = 0; aim < 24; aim++) {
      const arc = zoneArc(aim, 3, 24);
      for (const sector of zoneSectors(aim, 3, 24)) {
        let angle = sectorCenterAngle(sector, 24);
        if (angle > arc.end) angle -= 2 * Math.PI; // quấn qua 12 giờ
        if (angle < arc.start) angle += 2 * Math.PI;
        expect(angle).toBeGreaterThan(arc.start);
        expect(angle).toBeLessThan(arc.end);
      }
    }
  });

  it('lát ngay ngoài vùng có tâm nằm ngoài hình nêm', () => {
    const arc = zoneArc(5, 3, 24);
    expect(sectorCenterAngle(3, 24)).toBeLessThan(arc.start);
    expect(sectorCenterAngle(7, 24)).toBeGreaterThan(arc.end);
  });
});

describe('zoneArcs — mọi nêm vẽ ra khớp đúng vùng luật, kể cả vũ khí chém hai phía (B2)', () => {
  const weapon = (patch: Partial<WeaponConfig>): WeaponConfig => ({
    name: 'thử',
    slot: 'near',
    rangeLabel: 'thử',
    push: 'none',
    widthSectors: 3,
    minRing: 0,
    maxRing: 1,
    damage: 1,
    ...patch,
  });

  /** Góc `angle` có nằm trong nêm [start, end] không (tính cả quấn qua 12 giờ). */
  const insideArc = (angle: number, arc: { start: number; end: number }) =>
    [angle - 2 * Math.PI, angle, angle + 2 * Math.PI].some((a) => a > arc.start && a < arc.end);

  it('vũ khí một nêm: đúng một nêm, y như zoneArc', () => {
    expect(zoneArcs(5, weapon({}), 24)).toEqual([zoneArc(5, 3, 24)]);
  });

  it('vũ khí hai phía: hai nêm, nêm sau lưng lệch đúng nửa vòng', () => {
    const arcs = zoneArcs(5, weapon({ twoSided: true }), 24);
    expect(arcs).toHaveLength(2);
    expect(arcs[1]?.start).toBeCloseTo((arcs[0]?.start ?? 0) + Math.PI, 9);
  });

  it.each([
    ['một nêm, rộng 3', weapon({})],
    ['hai phía, rộng 1', weapon({ twoSided: true, widthSectors: 1 })],
    ['hai phía, rộng 3', weapon({ twoSided: true })],
    ['hai phía, rộng 5', weapon({ twoSided: true, widthSectors: 5 })],
  ])(
    '%s: với mọi lát ngắm, tâm một lát nằm trong nêm vẽ ra ⇔ luật coi lát đó là trúng',
    (_label, w) => {
      for (let aim = 0; aim < 24; aim++) {
        const arcs = zoneArcs(aim, w, 24);
        for (let sector = 0; sector < 24; sector++) {
          const drawn = arcs.some((arc) => insideArc(sectorCenterAngle(sector, 24), arc));
          expect(drawn).toBe(isInZone({ sector, ring: w.minRing }, aim, w, 24));
        }
      }
    },
  );
});

describe('zoneRadii — hình nêm xanh phủ đúng các vòng vũ khí với tới', () => {
  it('vũ khí vòng 1–2: từ mép trong vòng 1 (34 + 21) tới mép ngoài vòng 2 (34 + 3·21)', () => {
    expect(zoneRadii({ minRing: 1, maxRing: 2 }, LAYOUT)).toEqual({ inner: 55, outer: 97 });
  });

  it('tâm vòng trong tầm nằm trong hình nêm, vòng ngoài tầm nằm ngoài', () => {
    const radii = zoneRadii({ minRing: 1, maxRing: 2 }, LAYOUT);
    for (let ring = 0; ring < 6; ring++) {
      const radius = ringCenterRadius(ring, LAYOUT);
      const inside = radius > radii.inner && radius < radii.outer;
      expect(inside).toBe(ring >= 1 && ring <= 2);
    }
  });
});

describe('thanh nút vũ khí ở đáy màn hình (F02)', () => {
  // Thanh rộng 324 px từ x = 18, 3 nút cách nhau 12 px → mỗi nút rộng (324 − 2·12) / 3 = 100 px.
  const BAR: WeaponBarLayout = { left: 18, top: 520, width: 324, height: 72, gap: 12 };

  it('chia 3 nút đều nhau, có khe giữa các nút', () => {
    expect(weaponButtonRects(3, BAR)).toEqual([
      { x: 18, y: 520, width: 100, height: 72 },
      { x: 130, y: 520, width: 100, height: 72 },
      { x: 242, y: 520, width: 100, height: 72 },
    ]);
  });

  it.each([
    [68, 556, 0],
    [180, 556, 1],
    [292, 556, 2],
    [18, 520, 0], // mép trên-trái của nút đầu vẫn tính là chạm nút
    [341.9, 591.9, 2],
  ])('chạm (%f, %f) → nút %i', (x, y, expected) => {
    expect(weaponButtonAt(x, y, 3, BAR)).toBe(expected);
  });

  it.each([
    [117, 556, 0], // ngay trái khe 1–2: còn trên nút 1
    [130, 556, 1], // ngay phải khe 1–2: đã sang nút 2
  ])('chạm sát ngoài khe (%f, %f) → nút %i', (x, y, expected) => {
    expect(weaponButtonAt(x, y, 3, BAR)).toBe(expected);
  });

  // Bỏ chữ "(là chạm vào sân)" ở tên cũ: khe giữa hai nút không trúng nút nào nhưng KHÔNG phải sân —
  // FEATURE_MAP F02 ghi chạm khe "không làm gì". Tên cũ ghi ngược nên game chém nhầm mà test vẫn xanh.
  it.each([
    [124, 556], // khe giữa nút 1 và 2
    [180, 300], // giữa sân
    [180, 519], // ngay trên thanh
    [180, 592], // ngay dưới thanh
    [10, 556], // lề trái
  ])('chạm (%f, %f) → không trúng nút nào', (x, y) => {
    expect(weaponButtonAt(x, y, 3, BAR)).toBeNull();
  });

  it.each([
    [124, 556, true], // giữa khe 1–2
    [236, 556, true], // giữa khe 2–3
    [118, 556, true], // mép trái khe 1–2
    [129, 556, true], // mép phải khe 1–2
    [68, 556, true], // trên nút
    [18, 520, true], // góc trên-trái thanh
    [180, 300, false], // giữa sân
    [180, 519, false], // ngay trên thanh
    [180, 592, false], // ngay dưới thanh
    [10, 556, false], // lề trái, ngoài thanh
  ])('chạm (%f, %f) nằm trong thanh nút vũ khí: %s', (x, y, expected) => {
    expect(isInWeaponBar(x, y, BAR)).toBe(expected);
  });

  it('thanh nút không đè lên sân tròn', () => {
    const arenaBottom = ARENA_LAYOUT.centerY + ringInnerRadius(6, ARENA_LAYOUT);
    expect(WEAPON_BAR.top).toBeGreaterThan(arenaBottom);
  });
});

describe('B6 — ô skill trên thanh nút', () => {
  it('mang skill thì thanh có thêm một ô cuối cho skill; không mang thì chỉ có các nút vũ khí', () => {
    expect(barButtonCount({ weapons: [0, 1, 2] })).toBe(3);
    expect(barButtonCount({ weapons: [0, 1, 2], skill: 'iceRain' })).toBe(4);
    expect(skillButtonIndex({ weapons: [0, 1, 2], skill: 'iceRain' })).toBe(3);
    expect(skillButtonIndex({ weapons: [0, 1, 2] })).toBeNull();
  });
});
