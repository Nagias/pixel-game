import { describe, expect, it } from 'vitest';
import {
  applyBattleResult,
  clearedLevelCount,
  emptyProfile,
  isReplay,
  levelStatus,
  readProfile,
  startLevel,
  withSavedLoadout,
  writeProfile,
} from './profile';
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
      upgrades: {},
      weaponTiers: {},
      lootPity: {},
      rentals: {},
      rentalTiers: {},
      weaponLevels: {},
      clearedAll: false,
      loadout: null,
    });
  });

  it('ghi rồi đọc lại ra y hệt', () => {
    const { store } = memoryStore();
    const saved = profile({
      gold: 42,
      unlockedLevel: 3,
      upgrades: { hp: 2, crit: 1 },
      weaponTiers: { 0: 3, 2: 1 },
      lootPity: { dryRareKills: 2, dropsSinceHighTier: 11 },
      rentals: { 1: 4 },
      rentalTiers: { 1: 3 },
      weaponLevels: { 0: 2, 4: 1 },
      clearedAll: true,
      loadout: { weapons: ['Rìu', 'Giáo', 'Cung'], skill: 'fireball' },
    });
    expect(writeProfile(store, saved)).toBe(true);
    expect(readProfile(store)).toEqual(saved);
  });

  // Đợt 4: phiên bản 2 thêm các cấp đã nâng. Hồ sơ phiên bản 1 (đợt 3) tự chuyển lên, không mất gì.
  it('hồ sơ phiên bản 1 chuyển lên phiên bản 2: giữ vàng và màn đã mở khóa, chưa nâng cấp gì', () => {
    const raw = JSON.stringify({ version: 1, gold: 37, unlockedLevel: 4 });
    const { store, data } = memoryStore({ [PROFILE_KEY]: raw });
    expect(readProfile(store)).toEqual(profile({ gold: 37, unlockedLevel: 4 }));
    expect(data.get(PROFILE_BACKUP_KEY)).toBeUndefined();
  });

  // Đợt 5: phiên bản 3 thêm cấp vũ khí đã rơi và bộ đếm bảo hiểm rơi đồ. Bản 2 (đợt 4) tự chuyển lên.
  it('hồ sơ phiên bản 2 chuyển lên phiên bản 3: giữ vàng, màn, nâng cấp; chưa có đồ rơi', () => {
    const raw = JSON.stringify({ version: 2, gold: 50, unlockedLevel: 9, upgrades: { hp: 3 } });
    const { store, data } = memoryStore({ [PROFILE_KEY]: raw });
    expect(readProfile(store)).toEqual(
      profile({ gold: 50, unlockedLevel: 9, upgrades: { hp: 3 } }),
    );
    expect(data.get(PROFILE_BACKUP_KEY)).toBeUndefined();
  });

  // Đợt 6: phiên bản 4 thêm món thuê ở cửa hàng. Bản 3 (đợt 5) tự chuyển lên.
  it('hồ sơ phiên bản 3 chuyển lên phiên bản 4: giữ đồ rơi và bảo hiểm, chưa thuê món nào', () => {
    const loot = { weaponTiers: { 0: 3 }, lootPity: { dryRareKills: 1 } };
    const raw = JSON.stringify({ version: 3, gold: 8, unlockedLevel: 2, upgrades: {}, ...loot });
    const { store, data } = memoryStore({ [PROFILE_KEY]: raw });
    expect(readProfile(store)).toEqual(profile({ gold: 8, unlockedLevel: 2, ...loot }));
    expect(data.get(PROFILE_BACKUP_KEY)).toBeUndefined();
  });

  // F18 đợt B: phiên bản 5 thêm "đã phá đảo" và đồ đang mang. Bản 4 (đợt 6) tự chuyển lên.
  it('hồ sơ phiên bản 4 chuyển lên phiên bản 5: giữ mọi thứ, chưa phá đảo, chưa lưu đồ', () => {
    const v4 = {
      version: 4,
      gold: 7,
      unlockedLevel: 3,
      upgrades: { hp: 1 },
      weaponTiers: { 0: 2 },
      lootPity: { dryRareKills: 1 },
      rentals: { 1: 2 },
    };
    const { store, data } = memoryStore({ [PROFILE_KEY]: JSON.stringify(v4) });
    expect(readProfile(store)).toEqual({
      ...v4,
      version: PROFILE_VERSION,
      rentalTiers: {},
      weaponLevels: {},
      clearedAll: false,
      loadout: null,
    });
    expect(data.get(PROFILE_BACKUP_KEY)).toBeUndefined();
  });

  // F19 PR C: phiên bản 7 thêm cấp nâng của từng vũ khí. Bản 6 tự chuyển lên, chưa nâng vũ khí nào.
  it('hồ sơ phiên bản 6 chuyển lên phiên bản 7: giữ mọi thứ, chưa nâng vũ khí nào', () => {
    const v6 = {
      version: 6,
      gold: 30,
      unlockedLevel: 8,
      upgrades: { hp: 1 },
      weaponTiers: { 2: 3 },
      lootPity: {},
      rentals: { 5: 7 },
      rentalTiers: { 5: 1 },
      clearedAll: false,
      loadout: null,
    };
    const { store, data } = memoryStore({ [PROFILE_KEY]: JSON.stringify(v6) });
    expect(readProfile(store)).toEqual({ ...v6, version: 7, weaponLevels: {} });
    expect(data.get(PROFILE_BACKUP_KEY)).toBeUndefined();
  });

  // F19 PR B: phiên bản 6 thêm cấp của món có hạn (món rơi có hạn có cấp riêng). Bản 5 tự chuyển lên: món thuê
  // cũ chưa ghi cấp — luật rơi đồ coi là cấp cửa hàng (Hiếm), nên không mất gì.
  it('hồ sơ phiên bản 5 chuyển lên phiên bản 6: giữ mọi thứ, món thuê cũ chưa ghi cấp', () => {
    const v5 = {
      version: 5,
      gold: 12,
      unlockedLevel: 6,
      upgrades: { crit: 2 },
      weaponTiers: { 3: 4 },
      lootPity: { dropsSinceHighTier: 5 },
      rentals: { 0: 3 },
      clearedAll: true,
      loadout: { weapons: ['Rìu', 'Giáo', 'Cung'], skill: 'iceRain' },
    };
    const { store, data } = memoryStore({ [PROFILE_KEY]: JSON.stringify(v5) });
    expect(readProfile(store)).toEqual({
      ...v5,
      version: PROFILE_VERSION,
      rentalTiers: {},
      weaponLevels: {},
    });
    expect(data.get(PROFILE_BACKUP_KEY)).toBeUndefined();
  });

  it('lưu đồ đang mang rồi đọc lại ra y hệt (kể cả không mang skill)', () => {
    const { store } = memoryStore();
    const saved = withSavedLoadout(emptyProfile(), {
      weapons: ['Kiếm', 'Giáo', 'Cung'],
      skill: null,
    });
    writeProfile(store, saved);
    expect(readProfile(store).loadout).toEqual({ weapons: ['Kiếm', 'Giáo', 'Cung'], skill: null });
  });

  it.each([
    ['không phải JSON', '{vang: 5'],
    ['vàng âm', JSON.stringify({ version: 1, gold: -1, unlockedLevel: 0 })],
    ['vàng là chữ', JSON.stringify({ version: 1, gold: '5', unlockedLevel: 0 })],
    ['màn mở khóa số lẻ', JSON.stringify({ version: 1, gold: 0, unlockedLevel: 1.5 })],
    ['thiếu trường', JSON.stringify({ version: 1, gold: 3 })],
    ['không phải object', JSON.stringify([1, 2])],
    [
      'cấp nâng cấp âm',
      JSON.stringify({ version: 2, gold: 0, unlockedLevel: 0, upgrades: { hp: -1 } }),
    ],
    [
      'cấp nâng cấp số lẻ',
      JSON.stringify({ version: 2, gold: 0, unlockedLevel: 0, upgrades: { hp: 0.5 } }),
    ],
    [
      'nâng cấp không phải object',
      JSON.stringify({ version: 2, gold: 0, unlockedLevel: 0, upgrades: [1] }),
    ],
    ['phiên bản 2 thiếu nâng cấp', JSON.stringify({ version: 2, gold: 0, unlockedLevel: 0 })],
    [
      'phiên bản 3 thiếu cấp vũ khí',
      JSON.stringify({ version: 3, gold: 0, unlockedLevel: 0, upgrades: {}, lootPity: {} }),
    ],
    [
      'cấp vũ khí âm',
      JSON.stringify({
        version: 3,
        gold: 0,
        unlockedLevel: 0,
        upgrades: {},
        weaponTiers: { 0: -2 },
        lootPity: {},
      }),
    ],
    [
      'bảo hiểm rơi đồ là chữ',
      JSON.stringify({
        version: 3,
        gold: 0,
        unlockedLevel: 0,
        upgrades: {},
        weaponTiers: {},
        lootPity: { dryRareKills: 'ba' },
      }),
    ],
    // Người chơi mở bản game cũ hơn dữ liệu: không hiểu thì không được phá.
    [
      'món thuê số trận lẻ',
      JSON.stringify({
        version: 4,
        gold: 0,
        unlockedLevel: 0,
        upgrades: {},
        weaponTiers: {},
        lootPity: {},
        rentals: { 0: 2.5 },
      }),
    ],
    [
      'phiên bản 4 thiếu món thuê',
      JSON.stringify({
        version: 4,
        gold: 0,
        unlockedLevel: 0,
        upgrades: {},
        weaponTiers: {},
        lootPity: {},
      }),
    ],
    [
      'phiên bản 5 thiếu phá đảo',
      JSON.stringify({
        version: 5,
        gold: 0,
        unlockedLevel: 0,
        upgrades: {},
        weaponTiers: {},
        lootPity: {},
        rentals: {},
        loadout: null,
      }),
    ],
    [
      'phá đảo không phải true/false',
      JSON.stringify({
        version: 5,
        gold: 0,
        unlockedLevel: 0,
        upgrades: {},
        weaponTiers: {},
        lootPity: {},
        rentals: {},
        clearedAll: 'có',
        loadout: null,
      }),
    ],
    [
      'đồ đang mang không phải object',
      JSON.stringify({
        version: 5,
        gold: 0,
        unlockedLevel: 0,
        upgrades: {},
        weaponTiers: {},
        lootPity: {},
        rentals: {},
        clearedAll: false,
        loadout: 'Rìu',
      }),
    ],
    [
      'vũ khí đang mang không phải mảng chữ',
      JSON.stringify({
        version: 5,
        gold: 0,
        unlockedLevel: 0,
        upgrades: {},
        weaponTiers: {},
        lootPity: {},
        rentals: {},
        clearedAll: false,
        loadout: { weapons: [1, 2], skill: null },
      }),
    ],
    [
      'skill đang mang là số',
      JSON.stringify({
        version: 5,
        gold: 0,
        unlockedLevel: 0,
        upgrades: {},
        weaponTiers: {},
        lootPity: {},
        rentals: {},
        clearedAll: false,
        loadout: { weapons: ['Kiếm'], skill: 3 },
      }),
    ],
    [
      'phiên bản mới hơn game',
      JSON.stringify({
        version: 6,
        gold: 9,
        unlockedLevel: 4,
        upgrades: {},
        weaponTiers: {},
        lootPity: {},
      }),
    ],
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

  it('đợt 5: trận có kết quả rơi đồ thì ghi cấp vũ khí và bộ đếm bảo hiểm mới (thắng hay thua đều giữ)', () => {
    const loot = { weaponTiers: { 1: 4 }, lootPity: { dryRareKills: 0, dropsSinceHighTier: 0 } };
    expect(
      applyBattleResult(
        profile({ gold: 3, weaponTiers: { 1: 2 }, lootPity: { dryRareKills: 2 } }),
        { level: 9, won: false, gold: 6, loot },
        20,
      ),
    ).toEqual(profile({ gold: 9, ...loot }));
  });

  it('đợt 6: trận có kết quả món thuê thì ghi số trận còn lại mới', () => {
    expect(
      applyBattleResult(
        profile({ rentals: { 0: 5, 2: 1 } }),
        { level: 0, won: false, gold: 0, rentals: { 0: 4 } },
        7,
      ),
    ).toEqual(profile({ rentals: { 0: 4 } }));
  });

  it('F19: kết quả món có hạn ghi cả cấp của món có hạn', () => {
    expect(
      applyBattleResult(
        profile({ rentals: { 0: 5 }, rentalTiers: { 0: 2 } }),
        { level: 0, won: false, gold: 0, rentals: { 0: 4, 1: 10 }, rentalTiers: { 0: 2, 1: 4 } },
        7,
      ),
    ).toEqual(profile({ rentals: { 0: 4, 1: 10 }, rentalTiers: { 0: 2, 1: 4 } }));
  });

  it('trận không có kết quả rơi đồ: giữ nguyên đồ và bảo hiểm', () => {
    const before = profile({ weaponTiers: { 0: 1 }, lootPity: { dryRareKills: 1 } });
    expect(applyBattleResult(before, { level: 0, won: false, gold: 0 }, 7)).toEqual(before);
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

// F18 đợt B (chủ dự án quyết 02/11/2026): "Cho chơi lại không có vàng" — chơi lại màn đã qua để luyện tay,
// không cày được vàng hay đồ rơi ở màn dễ.
describe('trạng thái màn trên bản đồ', () => {
  const p = profile({ unlockedLevel: 3 });

  it('màn nhỏ hơn màn đã mở là đã qua, bằng là đang tới, lớn hơn là chưa mở', () => {
    expect(levelStatus(p, 2, 20)).toBe('cleared');
    expect(levelStatus(p, 3, 20)).toBe('current');
    expect(levelStatus(p, 4, 20)).toBe('locked');
  });

  it('đã phá đảo thì màn cuối cũng là đã qua; chưa thì vẫn là đang tới', () => {
    expect(levelStatus(profile({ unlockedLevel: 19, clearedAll: true }), 19, 20)).toBe('cleared');
    expect(levelStatus(profile({ unlockedLevel: 19 }), 19, 20)).toBe('current');
  });

  it('chơi lại = màn đã qua', () => {
    expect(isReplay(p, 0, 20)).toBe(true);
    expect(isReplay(p, 3, 20)).toBe(false);
  });

  // F19: vũ khí mới mở khóa khi đã thắng màn mốc — cần biết đã qua bao nhiêu màn.
  it('số màn đã qua: bằng màn đang tới; phá đảo thì đủ mọi màn; không vượt số màn của game', () => {
    expect(clearedLevelCount(profile({ unlockedLevel: 0 }), 20)).toBe(0);
    expect(clearedLevelCount(p, 20)).toBe(3);
    expect(clearedLevelCount(profile({ unlockedLevel: 19 }), 20)).toBe(19);
    expect(clearedLevelCount(profile({ unlockedLevel: 19, clearedAll: true }), 20)).toBe(20);
    expect(clearedLevelCount(profile({ unlockedLevel: 30 }), 20)).toBe(19);
  });
});

describe('cộng kết quả trận chơi lại', () => {
  const p = profile({
    gold: 50,
    unlockedLevel: 5,
    weaponTiers: { 0: 1 },
    lootPity: { dryRareKills: 2 },
  });
  const loot = { weaponTiers: { 0: 3 }, lootPity: { dryRareKills: 0 } };

  it('chơi lại màn đã qua: không cộng vàng, không nhận đồ rơi, không đổi màn đã mở', () => {
    const next = applyBattleResult(p, { level: 2, won: true, gold: 9, loot }, 20);
    expect(next.gold).toBe(50);
    expect(next.weaponTiers).toEqual({ 0: 1 });
    expect(next.lootPity).toEqual({ dryRareKills: 2 });
    expect(next.unlockedLevel).toBe(5);
  });

  it('chơi lại vẫn trừ món thuê mang vào trận', () => {
    const next = applyBattleResult(
      profile({ ...p, rentals: { 2: 3 } }),
      { level: 2, won: false, gold: 0, rentals: { 2: 2 } },
      20,
    );
    expect(next.rentals).toEqual({ 2: 2 });
  });

  it('thắng màn cuối lần đầu thì phá đảo và nhận vàng; chơi lại màn cuối sau đó không nhận vàng', () => {
    const won = applyBattleResult(
      profile({ gold: 50, unlockedLevel: 19 }),
      { level: 19, won: true, gold: 10 },
      20,
    );
    expect(won.clearedAll).toBe(true);
    expect(won.gold).toBe(60);
    const again = applyBattleResult(won, { level: 19, won: true, gold: 10 }, 20);
    expect(again.gold).toBe(60);
    expect(again.clearedAll).toBe(true);
  });

  it('thua màn cuối không phá đảo', () => {
    expect(
      applyBattleResult(profile({ unlockedLevel: 19 }), { level: 19, won: false, gold: 1 }, 20)
        .clearedAll,
    ).toBe(false);
  });

  it('màn đang tới vẫn cộng vàng như cũ', () => {
    expect(applyBattleResult(p, { level: 5, won: false, gold: 4 }, 20).gold).toBe(54);
  });
});
