import { describe, expect, it } from 'vitest';
import { arcSectorAt, isInZone, wrapSector, zoneSectors } from './arena';
import type { WeaponConfig } from './battleTypes';

const SECTORS = 24;

const weapon = (overrides: Partial<WeaponConfig> = {}): WeaponConfig => ({
  name: 'test',
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
