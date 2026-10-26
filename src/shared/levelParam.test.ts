import { describe, expect, it } from 'vitest';
import { parseLevelParam } from './levelParam';

describe('parseLevelParam — đọc ?level= (đếm từ 1) để mở thẳng một màn khi thử tay / E2E', () => {
  it.each([
    ['?level=1', 0],
    ['?level=4', 3],
    ['?seed=42&level=5', 4],
  ])('%s → màn số %i (đếm từ 0)', (search, expected) => {
    expect(parseLevelParam(search, 5)).toBe(expected);
  });

  it.each(['', '?level=', '?level=0', '?level=6', '?level=-1', '?level=2.5', '?level=abc'])(
    '%s → không hợp lệ thì về màn 1',
    (search) => {
      expect(parseLevelParam(search, 5)).toBe(0);
    },
  );
});
