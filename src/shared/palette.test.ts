import { describe, expect, it } from 'vitest';
import { colorNumber, PALETTE, SPRITE_PALETTE } from './palette';

describe('PALETTE', () => {
  it('bảng có đúng 32 màu, không trùng mã', () => {
    expect(Object.keys(PALETTE)).toHaveLength(32);
    expect(new Set(Object.values(PALETTE)).size).toBe(32);
  });
});

describe('colorNumber', () => {
  it('đổi màu bảng sang số 0xRRGGBB mà Phaser Graphics cần', () => {
    // ink = #181425 = 24·65536 + 20·256 + 37
    expect(colorNumber('ink')).toBe(1_578_021);
    // white = #ffffff = 255·65536 + 255·256 + 255
    expect(colorNumber('white')).toBe(16_777_215);
  });
});

describe('SPRITE_PALETTE', () => {
  it('ký tự sprite 0–9, A–V theo đúng thứ tự Endesga 32', () => {
    expect(Object.keys(SPRITE_PALETTE).join('')).toBe('0123456789ABCDEFGHIJKLMNOPQRSTUV');
    expect(SPRITE_PALETTE['0']).toBe(PALETTE.rust);
    expect(SPRITE_PALETTE.P).toBe(PALETTE.ink);
    expect(SPRITE_PALETTE.V).toBe(PALETTE.dune);
  });
});
