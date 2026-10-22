import { describe, expect, it } from 'vitest';
import { zoneSectors } from '../logic/arena';
import {
  cellToPoint,
  polarToPoint,
  ringCenterRadius,
  sectorCenterAngle,
  zoneArc,
  type ArenaLayout,
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
