import { describe, expect, it } from 'vitest';
import { BATTLE_CONFIG, CHAPTERS } from './battleConfig';
import { chapterOf, validateChapters } from './chapters';

// Đợt 7 (chủ dự án duyệt 27/10/2026): màn chơi chia theo chủ đề môi trường (Rừng rậm, sau này Băng, Núi
// lửa…), mỗi chủ đề ~20 màn. Chương chỉ là cách gom và đặt tên màn — luật trận không đổi.

const TWO = [
  { name: 'Rừng rậm', levelCount: 3 },
  { name: 'Băng', levelCount: 2 },
];

describe('chương (chủ đề môi trường)', () => {
  it('màn thuộc chương nào, là màn thứ mấy trong chương', () => {
    expect(chapterOf(0, TWO)).toEqual({ name: 'Rừng rậm', number: 1, levelCount: 3 });
    expect(chapterOf(2, TWO)).toEqual({ name: 'Rừng rậm', number: 3, levelCount: 3 });
    expect(chapterOf(3, TWO)).toEqual({ name: 'Băng', number: 1, levelCount: 2 });
    expect(chapterOf(4, TWO)).toEqual({ name: 'Băng', number: 2, levelCount: 2 });
  });

  it('màn ngoài mọi chương thì báo lỗi', () => {
    expect(() => chapterOf(5, TWO)).toThrow(RangeError);
  });

  it('các chương phải phủ đúng mọi màn, chương nào cũng có màn và có tên', () => {
    expect(() => validateChapters(TWO, 5)).not.toThrow();
    expect(() => validateChapters(TWO, 6)).toThrow(RangeError);
    expect(() => validateChapters([{ name: 'Rỗng', levelCount: 0 }], 0)).toThrow(RangeError);
    expect(() => validateChapters([{ name: '', levelCount: 5 }], 5)).toThrow(RangeError);
  });

  it('bảng chương thật phủ đúng mọi màn của game', () => {
    expect(() => validateChapters(CHAPTERS, BATTLE_CONFIG.levels.length)).not.toThrow();
  });
});
