import { describe, expect, it } from 'vitest';
import { parseSeedParam } from './seedParam';

describe('parseSeedParam — đọc ?seed= trên đường link để tái hiện đúng một ván', () => {
  it.each([
    ['?seed=42', 42],
    ['?x=1&seed=7', 7],
    ['?seed=0', 0],
    ['?seed=4294967295', 4_294_967_295],
  ])('%s → %i', (search, expected) => {
    expect(parseSeedParam(search)).toBe(expected);
  });

  it.each(['', '?seed=', '?seed=abc', '?seed=-5', '?seed=1.5', '?seed=4294967296', '?seed=1e3'])(
    '%s → không có seed hợp lệ',
    (search) => {
      expect(parseSeedParam(search)).toBeNull();
    },
  );
});
