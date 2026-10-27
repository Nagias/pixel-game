import { describe, expect, it } from 'vitest';
import { applyBattleResult, emptyProfile, readProfile, startLevel, writeProfile } from './profile';
import { PROFILE_BACKUP_KEY, PROFILE_KEY, PROFILE_VERSION } from './profileConfig';
import type { KeyValueStore, Profile } from './profileTypes';

// Đợt 3 kế hoạch sau B6 (chủ dự án duyệt 27/10/2026 — "agent đề xuất"): hồ sơ người chơi — vàng và màn
// đã mở khóa — lưu lâu dài (localStorage), có số phiên bản dữ liệu. Lỗi ở đây làm người chơi mất tiến
// trình, nên test kỹ đọc/ghi, dữ liệu hỏng, phiên bản lạ, bộ nhớ bị chặn.

/** Kho giả trong bộ nhớ; `failing` làm mọi thao tác ném lỗi như trình duyệt chặn bộ nhớ. */
function memoryStore(initial: Record<string, string> = {}, failing = false) {
  const data = new Map(Object.entries(initial));
  const store: KeyValueStore = {
    getItem: (key) => {
      if (failing) throw new Error('bộ nhớ bị chặn');
      return data.get(key) ?? null;
    },
    setItem: (key, value) => {
      if (failing) throw new Error('bộ nhớ bị chặn');
      data.set(key, value);
    },
  };
  return { store, data };
}

const profile = (patch: Partial<Profile> = {}): Profile => ({ ...emptyProfile(), ...patch });

describe('đọc / ghi hồ sơ', () => {
  it('người chơi mới (chưa có gì): hồ sơ trống — 0 vàng, mới mở màn 1', () => {
    expect(readProfile(memoryStore().store)).toEqual({
      version: PROFILE_VERSION,
      gold: 0,
      unlockedLevel: 0,
    });
  });

  it('ghi rồi đọc lại ra y hệt', () => {
    const { store } = memoryStore();
    expect(writeProfile(store, profile({ gold: 42, unlockedLevel: 3 }))).toBe(true);
    expect(readProfile(store)).toEqual(profile({ gold: 42, unlockedLevel: 3 }));
  });

  it.each([
    ['không phải JSON', '{vang: 5'],
    ['vàng âm', JSON.stringify({ version: 1, gold: -1, unlockedLevel: 0 })],
    ['vàng là chữ', JSON.stringify({ version: 1, gold: '5', unlockedLevel: 0 })],
    ['màn mở khóa số lẻ', JSON.stringify({ version: 1, gold: 0, unlockedLevel: 1.5 })],
    ['thiếu trường', JSON.stringify({ version: 1, gold: 3 })],
    ['không phải object', JSON.stringify([1, 2])],
    // Người chơi mở bản game cũ hơn dữ liệu: không hiểu thì không được phá.
    ['phiên bản mới hơn game', JSON.stringify({ version: 2, gold: 9, unlockedLevel: 4 })],
  ])('dữ liệu lạ (%s): cất bản sao để còn cứu, chơi tiếp bằng hồ sơ trống', (_name, raw) => {
    const { store, data } = memoryStore({ [PROFILE_KEY]: raw });
    expect(readProfile(store)).toEqual(emptyProfile());
    expect(data.get(PROFILE_BACKUP_KEY)).toBe(raw);
  });

  it('dữ liệu lạ không làm mất bản sao cũ hơn đã cất (chỉ cất khi chưa có)', () => {
    const { store, data } = memoryStore({
      [PROFILE_KEY]: 'hỏng lần 2',
      [PROFILE_BACKUP_KEY]: 'hỏng lần 1',
    });
    readProfile(store);
    expect(data.get(PROFILE_BACKUP_KEY)).toBe('hỏng lần 1');
  });

  it('bộ nhớ bị chặn (chế độ riêng tư…): đọc ra hồ sơ trống, ghi báo thất bại — không làm sập game', () => {
    const { store } = memoryStore({}, true);
    expect(readProfile(store)).toEqual(emptyProfile());
    expect(writeProfile(store, profile({ gold: 1 }))).toBe(false);
  });
});

describe('cộng kết quả trận vào hồ sơ', () => {
  it('thắng: cộng vàng, mở khóa màn kế', () => {
    expect(applyBattleResult(profile({ gold: 10 }), { level: 0, won: true, gold: 6 }, 7)).toEqual(
      profile({ gold: 16, unlockedLevel: 1 }),
    );
  });

  it('thua: vẫn giữ vàng đã nhặt, không mở khóa', () => {
    expect(
      applyBattleResult(
        profile({ gold: 10, unlockedLevel: 2 }),
        { level: 2, won: false, gold: 4 },
        7,
      ),
    ).toEqual(profile({ gold: 14, unlockedLevel: 2 }));
  });

  it('thắng lại màn cũ không làm tụt màn đã mở khóa', () => {
    expect(
      applyBattleResult(profile({ unlockedLevel: 5 }), { level: 1, won: true, gold: 0 }, 7)
        .unlockedLevel,
    ).toBe(5);
  });

  it('thắng màn cuối: giữ mở khóa ở màn cuối (không vượt số màn)', () => {
    expect(
      applyBattleResult(profile({ unlockedLevel: 6 }), { level: 6, won: true, gold: 0 }, 7)
        .unlockedLevel,
    ).toBe(6);
  });
});

describe('màn mở đầu khi vào game', () => {
  it('mặc định: màn cao nhất đã mở khóa (chơi tiếp chỗ đang dở)', () => {
    expect(startLevel(profile({ unlockedLevel: 3 }), null, 7)).toBe(3);
  });

  it('?level= tới màn đã mở khóa thì được', () => {
    expect(startLevel(profile({ unlockedLevel: 3 }), 1, 7)).toBe(1);
    expect(startLevel(profile({ unlockedLevel: 3 }), 3, 7)).toBe(3);
  });

  it('?level= vượt màn đã mở khóa thì về màn cao nhất đã mở (không cho nhảy cóc — DEBT-011)', () => {
    expect(startLevel(profile({ unlockedLevel: 3 }), 6, 7)).toBe(3);
  });

  it('hồ sơ mở khóa nhiều màn hơn game hiện có (game bớt màn) thì về màn cuối', () => {
    expect(startLevel(profile({ unlockedLevel: 12 }), null, 7)).toBe(6);
  });
});
