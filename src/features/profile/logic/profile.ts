// Luật hồ sơ người chơi (đợt 3): đọc/ghi an toàn, cộng kết quả trận, chọn màn mở đầu. Hàm thuần — kho
// lưu (localStorage) được truyền vào, không đụng trình duyệt.
import { PROFILE_BACKUP_KEY, PROFILE_KEY, PROFILE_VERSION } from './profileConfig';
import type { BattleResult, KeyValueStore, Profile } from './profileTypes';

export function emptyProfile(): Profile {
  return {
    version: PROFILE_VERSION,
    gold: 0,
    unlockedLevel: 0,
    upgrades: {},
    weaponTiers: {},
    lootPity: {},
  };
}

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** Dữ liệu đã lưu → hồ sơ; không hiểu (hỏng, sai kiểu, phiên bản khác) thì null. */
function parseProfile(raw: string): Profile | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const { version, gold, unlockedLevel, upgrades, weaponTiers, lootPity } = data as Record<
    string,
    unknown
  >;
  if (!isCount(gold) || !isCount(unlockedLevel)) return null;
  // Bước chuyển từ phiên bản cũ: 1 → 2 thêm cấp nâng cấp (chưa nâng gì); 2 → 3 thêm đồ rơi (chưa có gì).
  if (version === 1) return { ...emptyProfile(), gold, unlockedLevel };
  if (!isLevels(upgrades)) return null;
  if (version === 2) return { ...emptyProfile(), gold, unlockedLevel, upgrades };
  if (version !== PROFILE_VERSION || !isLevels(weaponTiers) || !isLevels(lootPity)) return null;
  return { version, gold, unlockedLevel, upgrades, weaponTiers, lootPity };
}

const isLevels = (value: unknown): value is Record<string, number> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every(isCount);

/**
 * Đọc hồ sơ. Chưa có → hồ sơ trống (người chơi mới). Dữ liệu lạ → cất bản sao vào khóa dự phòng (nếu
 * chưa có bản sao nào) rồi dùng hồ sơ trống — không bao giờ để game sập hay lặng lẽ xóa dữ liệu. Bộ nhớ
 * bị chặn → hồ sơ trống.
 */
export function readProfile(store: KeyValueStore): Profile {
  let raw: string | null;
  try {
    raw = store.getItem(PROFILE_KEY);
  } catch {
    return emptyProfile();
  }
  if (raw === null) return emptyProfile();
  const profile = parseProfile(raw);
  if (profile) return profile;
  try {
    if (store.getItem(PROFILE_BACKUP_KEY) === null) store.setItem(PROFILE_BACKUP_KEY, raw);
  } catch {
    // Không cất được bản sao thì vẫn chơi tiếp được.
  }
  return emptyProfile();
}

/** Ghi hồ sơ; trả về false nếu bộ nhớ bị chặn hoặc đầy (game vẫn chơi tiếp, chỉ không lưu được). */
export function writeProfile(store: KeyValueStore, profile: Profile): boolean {
  try {
    store.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

/**
 * Cộng một trận vào hồ sơ: vàng nhặt được luôn được giữ (thắng hay thua — agent đề xuất, chủ dự án duyệt
 * 27/10/2026); thắng thì mở khóa màn kế (không vượt màn cuối, không làm tụt màn đã mở).
 */
export function applyBattleResult(
  profile: Profile,
  result: BattleResult,
  levelCount: number,
): Profile {
  const next = result.won ? Math.min(result.level + 1, levelCount - 1) : 0;
  return {
    ...profile,
    gold: profile.gold + result.gold,
    unlockedLevel: Math.max(profile.unlockedLevel, next),
    ...result.loot,
  };
}

/**
 * Màn mở đầu khi vào game: màn `requested` (vd. từ `?level=`) nếu đã mở khóa, còn lại là màn cao nhất
 * đã mở khóa — chơi tiếp chỗ đang dở, không nhảy cóc. Không vượt màn cuối của game hiện có.
 */
export function startLevel(profile: Profile, requested: number | null, levelCount: number): number {
  const unlocked = Math.min(profile.unlockedLevel, levelCount - 1);
  return requested !== null && requested <= unlocked ? requested : unlocked;
}
