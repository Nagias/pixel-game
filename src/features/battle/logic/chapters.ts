// Chương = chủ đề môi trường (đợt 7): gom các màn liền nhau và đặt tên. Luật trận không đổi theo chương.

export interface Chapter {
  readonly name: string;
  readonly levelCount: number;
}

/** Màn `level` (đếm từ 0, toàn game) thuộc chương nào, là màn thứ `number` (đếm từ 1) trong chương. */
export function chapterOf(
  level: number,
  chapters: readonly Chapter[],
): { name: string; number: number; levelCount: number } {
  let first = 0;
  for (const chapter of chapters) {
    if (level >= first && level < first + chapter.levelCount) {
      return { name: chapter.name, number: level - first + 1, levelCount: chapter.levelCount };
    }
    first += chapter.levelCount;
  }
  throw new RangeError(`Màn ${level + 1} không thuộc chương nào`);
}

/** Chặn bảng chương sai: phải phủ đúng `levelCount` màn, chương nào cũng có tên và có ít nhất 1 màn. */
export function validateChapters(chapters: readonly Chapter[], levelCount: number): void {
  const problems: string[] = [];
  for (const chapter of chapters) {
    if (chapter.name.trim() === '') problems.push('chương phải có tên');
    if (!Number.isInteger(chapter.levelCount) || chapter.levelCount < 1) {
      problems.push(`chương "${chapter.name}": phải có ít nhất 1 màn`);
    }
  }
  const total = chapters.reduce((sum, c) => sum + c.levelCount, 0);
  if (total !== levelCount) problems.push(`các chương có ${total} màn, game có ${levelCount}`);
  if (problems.length > 0) throw new RangeError(`Bảng chương sai: ${problems.join('; ')}`);
}
