import { describe, expect, it } from 'vitest';
import { nextFloat, nextInt, seedRng, type RngState } from './random';

function drawFloats(seed: number, count: number): number[] {
  let state: RngState = seedRng(seed);
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const [value, next] = nextFloat(state);
    values.push(value);
    state = next;
  }
  return values;
}

describe('random (RNG có seed)', () => {
  it('cùng seed cho ra đúng cùng một dãy số (để tái hiện được ván chơi)', () => {
    expect(drawFloats(42, 50)).toEqual(drawFloats(42, 50));
  });

  it('seed khác cho ra dãy khác', () => {
    expect(drawFloats(1, 20)).not.toEqual(drawFloats(2, 20));
  });

  it('không đổi trạng thái đầu vào: gọi lại với cùng state cho cùng kết quả', () => {
    const state = seedRng(7);
    expect(nextFloat(state)).toEqual(nextFloat(state));
  });

  it('nextFloat luôn nằm trong [0, 1)', () => {
    for (const value of drawFloats(123, 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('nextInt cho số nguyên trong [0, max) và phủ đủ mọi giá trị', () => {
    let state = seedRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2_000; i++) {
      const [value, next] = nextInt(state, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
      seen.add(value);
      state = next;
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('nextInt từ chối max không hợp lệ', () => {
    const state = seedRng(1);
    expect(() => nextInt(state, 0)).toThrow(RangeError);
    expect(() => nextInt(state, -3)).toThrow(RangeError);
    expect(() => nextInt(state, 2.5)).toThrow(RangeError);
  });

  it('seedRng chấp nhận seed bất kỳ (âm, lớn, thập phân) và luôn cho trạng thái hợp lệ', () => {
    for (const seed of [-1, 0, 2 ** 40, 3.7]) {
      const [value] = nextFloat(seedRng(seed));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
