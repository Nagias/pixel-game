import { describe, expect, it } from 'vitest';
import { aimSectors, arcSectorAt, isInZone, knockbackCell, wrapSector, zoneSectors } from './arena';
import type { WeaponConfig } from './battleTypes';

const SECTORS = 24;

const weapon = (overrides: Partial<WeaponConfig> = {}): WeaponConfig => ({
  name: 'test',
  slot: 'near',
  rangeLabel: 'cả sân',
  push: 'none',
  widthSectors: 3,
  minRing: 0,
  maxRing: 5,
  damage: 1,
  ...overrides,
});

describe('wrapSector', () => {
  it.each([
    [0, 0],
    [23, 23],
    [24, 0],
    [25, 1],
    [-1, 23],
    [-25, 23],
  ])('lát %i quấn vòng thành %i', (input, expected) => {
    expect(wrapSector(input, SECTORS)).toBe(expected);
  });
});

describe('zoneSectors', () => {
  it('vùng rộng 3 quanh lát 5 là 4, 5, 6', () => {
    expect(zoneSectors(5, 3, SECTORS)).toEqual([4, 5, 6]);
  });

  it('vùng quanh lát 0 quấn qua lát cuối', () => {
    expect(zoneSectors(0, 3, SECTORS)).toEqual([23, 0, 1]);
  });

  it('vùng rộng 1 chỉ gồm đúng lát ngắm', () => {
    expect(zoneSectors(10, 1, SECTORS)).toEqual([10]);
  });

  it('từ chối độ rộng chẵn hoặc không dương', () => {
    expect(() => zoneSectors(0, 2, SECTORS)).toThrow(RangeError);
    expect(() => zoneSectors(0, 0, SECTORS)).toThrow(RangeError);
  });
});

describe('isInZone', () => {
  it('ô cùng lát, trong khoảng vòng của vũ khí thì bị đánh', () => {
    expect(isInZone({ sector: 3, ring: 2 }, 3, weapon(), SECTORS)).toBe(true);
  });

  it('ô ở lát cạnh lát ngắm (trong độ rộng 3) thì bị đánh', () => {
    expect(isInZone({ sector: 23, ring: 0 }, 0, weapon(), SECTORS)).toBe(true);
    expect(isInZone({ sector: 1, ring: 0 }, 0, weapon(), SECTORS)).toBe(true);
  });

  it('ô cách lát ngắm 2 lát thì không bị đánh với độ rộng 3', () => {
    expect(isInZone({ sector: 2, ring: 0 }, 0, weapon(), SECTORS)).toBe(false);
  });

  it('ô ngoài khoảng vòng của vũ khí thì không bị đánh dù cùng lát', () => {
    const shortSword = weapon({ minRing: 1, maxRing: 2 });
    expect(isInZone({ sector: 0, ring: 0 }, 0, shortSword, SECTORS)).toBe(false);
    expect(isInZone({ sector: 0, ring: 1 }, 0, shortSword, SECTORS)).toBe(true);
    expect(isInZone({ sector: 0, ring: 2 }, 0, shortSword, SECTORS)).toBe(true);
    expect(isInZone({ sector: 0, ring: 3 }, 0, shortSword, SECTORS)).toBe(false);
  });
});

describe('B2 — vũ khí chém hai phía (twoSided): thêm một nêm y hệt ở lát đối diện', () => {
  const axe = weapon({ twoSided: true, minRing: 0, maxRing: 1 });

  it('vũ khí thường chỉ ngắm một lát; vũ khí hai phía ngắm thêm lát đối diện (nửa vòng)', () => {
    expect(aimSectors(5, weapon(), SECTORS)).toEqual([5]);
    expect(aimSectors(5, axe, SECTORS)).toEqual([5, 17]);
  });

  it.each([
    [20, [20, 8]],
    [2, [2, 14]],
    [12, [12, 0]],
  ])('ngắm lát %i → hai nêm ở lát %j (quấn qua lát 0)', (aim, expected) => {
    expect(aimSectors(aim, axe, SECTORS)).toEqual(expected);
  });

  it('trúng quái ở nêm trước và nêm sau lưng, cả mép nêm', () => {
    expect(isInZone({ sector: 5, ring: 0 }, 5, axe, SECTORS)).toBe(true);
    expect(isInZone({ sector: 17, ring: 1 }, 5, axe, SECTORS)).toBe(true);
    expect(isInZone({ sector: 16, ring: 0 }, 5, axe, SECTORS)).toBe(true); // mép nêm sau (rộng 3)
    expect(isInZone({ sector: 18, ring: 1 }, 5, axe, SECTORS)).toBe(true);
  });

  it('nêm sau lưng quấn qua lát 0: ngắm lát 13 → nêm sau gồm lát 0, 1, 2', () => {
    expect(isInZone({ sector: 0, ring: 0 }, 13, axe, SECTORS)).toBe(true);
    expect(isInZone({ sector: 2, ring: 0 }, 13, axe, SECTORS)).toBe(true);
    expect(isInZone({ sector: 3, ring: 0 }, 13, axe, SECTORS)).toBe(false);
  });

  it('không trúng ngoài hai nêm, hoặc ngoài dải vòng của vũ khí', () => {
    expect(isInZone({ sector: 11, ring: 0 }, 5, axe, SECTORS)).toBe(false); // giữa hai nêm
    expect(isInZone({ sector: 23, ring: 1 }, 5, axe, SECTORS)).toBe(false);
    expect(isInZone({ sector: 17, ring: 2 }, 5, axe, SECTORS)).toBe(false); // ngoài vòng 0–1
  });
});

describe('arcSectorAt (vùng xanh quay theo thời gian)', () => {
  // Chu kỳ 2400 ms, 24 lát → mỗi lát 100 ms.
  it.each([
    [0, 0],
    [99, 0],
    [100, 1],
    [1_250, 12],
    [2_399, 23],
    [2_400, 0],
    [4_850, 0],
    [4_950, 1],
  ])('sau %i ms vùng xanh ở lát %i', (elapsedMs, expected) => {
    expect(arcSectorAt(elapsedMs, 2_400, SECTORS)).toBe(expected);
  });

  it('từ chối chu kỳ không dương', () => {
    expect(() => arcSectorAt(0, 0, SECTORS)).toThrow(RangeError);
  });
});

describe('knockbackCell — ô đích khi bị vũ khí đẩy (F05)', () => {
  it.each([
    ['out', { sector: 5, ring: 1 }, { sector: 5, ring: 2 }], // Kiếm: lùi ra xa 1 vòng
    ['in', { sector: 5, ring: 4 }, { sector: 5, ring: 3 }], // Cung: kéo vào gần 1 vòng
    ['clockwise', { sector: 5, ring: 2 }, { sector: 6, ring: 2 }], // Giáo: lệch phải 1 lát
    ['clockwise', { sector: 23, ring: 2 }, { sector: 0, ring: 2 }], // quấn qua lát 0
    ['none', { sector: 5, ring: 2 }, { sector: 5, ring: 2 }],
  ] as const)('đẩy kiểu %s: %j → %j', (push, from, expected) => {
    expect(knockbackCell(from, push, SECTORS)).toEqual(expected);
  });
});
