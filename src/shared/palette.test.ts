import { describe, expect, it } from 'vitest';
import { colorNumber } from './palette';

describe('colorNumber', () => {
  it('đổi màu bảng sang số 0xRRGGBB mà Phaser Graphics cần', () => {
    // ink = #1a1c2c = 26·65536 + 28·256 + 44
    expect(colorNumber('ink')).toBe(1_711_148);
    // white = #f4f4f4 = 244·65536 + 244·256 + 244
    expect(colorNumber('white')).toBe(16_053_492);
  });
});
