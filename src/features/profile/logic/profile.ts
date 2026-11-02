// Luật hồ sơ người chơi (đợt 3): đọc/ghi an toàn, cộng kết quả trận, chọn màn mở đầu. Hàm thuần — kho
// lưu (localStorage) được truyền vào, không đụng trình duyệt.
import { PROFILE_BACKUP_KEY, PROFILE_KEY, PROFILE_VERSION } from './profileConfig';
import type {
  BattleResult,
  KeyValueStore,
  LevelStatus,
  Profile,
  SavedLoadout,
} from './profileTypes';

export function emptyProfile(): Profile {
  return {
    version: PROFILE_VERSION,
    gold: 0,
    unlockedLevel: 0,
    upgrades: {},
    weaponTiers: {},
    lootPity: {},
    rentals: {},
    clearedAll: false,
    loadout: null,
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
  const {
    version,
    gold,
    unlockedLevel,
    upgrades,
    weaponTiers,
    lootPity,
    rentals,
    clearedAll,
    loadout,
  } = data as Record<string, unknown>;
  if (!isCount(gold) || !isCount(unlockedLevel)) return null;
  // Bước chuyển từ phiên bản cũ: 1 → 2 thêm cấp nâng cấp (chưa nâng gì); 2 → 3 thêm đồ rơi (chưa có gì);
  // 3 → 4 thêm món thuê (chưa thuê gì); 4 → 5 thêm đã phá đảo (chưa) và đồ đang mang (chưa lưu).
  if (version === 1) return { ...emptyProfile(), gold, unlockedLevel };
  if (!isLevels(upgrades)) return null;
  if (version === 2) return { ...emptyProfile(), gold, unlockedLevel, upgrades };
  if (!isLevels(weaponTiers) || !isLevels(lootPity)) return null;
  const loot = { weaponTiers, lootPity };
  if (version === 3) return { ...emptyProfile(), gold, unlockedLevel, upgrades, ...loot };
  if (!isLevels(rentals)) return null;
  if (version === 4) return { ...emptyProfile(), gold, unlockedLevel, upgrades, ...loot, rentals };
  if (version !== PROFILE_VERSION || typeof clearedAll !== 'boolean') return null;
  if (loadout !== null && !isSavedLoadout(loadout)) return null;
  return { version, gold, unlockedLevel, upgrades, ...loot, rentals, clearedAll, loadout };
}

const isSavedLoadout = (value: unknown): value is SavedLoadout => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const { weapons, skill } = value as Record<string, unknown>;
  return (
    Array.isArray(weapons) &&
    weapons.every((name) => typeof name === 'string') &&
    (skill === null || typeof skill === 'string')
  );
};

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
 * F18: trạng thái màn trên bản đồ. Màn trước màn cao nhất đã mở là đã qua; màn cuối là đã qua khi đã phá đảo.
 */
export function levelStatus(profile: Profile, level: number, levelCount: number): LevelStatus {
  const current = Math.min(profile.unlockedLevel, levelCount - 1);
  if (level < current || (level === current && profile.clearedAll && level === levelCount - 1)) {
    return 'cleared';
  }
  return level === current ? 'current' : 'locked';
}

/** F18: chơi lại màn đã qua — không nhận vàng, không nhận đồ rơi (chủ dự án quyết 02/11/2026). */
export function isReplay(profile: Profile, level: number, levelCount: number): boolean {
  return levelStatus(profile, level, levelCount) === 'cleared';
}

/**
 * Cộng một trận vào hồ sơ: vàng nhặt được luôn được giữ (thắng hay thua — agent đề xuất, chủ dự án duyệt
 * 27/10/2026); thắng thì mở khóa màn kế (không vượt màn cuối, không làm tụt màn đã mở). F18: chơi lại màn đã
 * qua chỉ trừ món thuê — không vàng, không đồ rơi, không đổi màn đã mở; thắng màn cuối lần đầu là phá đảo.
 */
export function applyBattleResult(
  profile: Profile,
  result: BattleResult,
  levelCount: number,
): Profile {
  const rentals = result.rentals ? { rentals: result.rentals } : {};
  if (isReplay(profile, result.level, levelCount)) return { ...profile, ...rentals };
  const next = result.won ? Math.min(result.level + 1, levelCount - 1) : 0;
  return {
    ...profile,
    gold: profile.gold + result.gold,
    unlockedLevel: Math.max(profile.unlockedLevel, next),
    clearedAll: profile.clearedAll || (result.won && result.level === levelCount - 1),
    ...result.loot,
    ...rentals,
  };
}

/** F18: ghi đồ đang mang vào hồ sơ. */
export function withSavedLoadout(profile: Profile, loadout: SavedLoadout): Profile {
  return { ...profile, loadout };
}

/**
 * Màn mở đầu khi vào game: màn `requested` (vd. từ `?level=`) nếu đã mở khóa, còn lại là màn cao nhất
 * đã mở khóa — chơi tiếp chỗ đang dở, không nhảy cóc. Không vượt màn cuối của game hiện có.
 */
export function startLevel(profile: Profile, requested: number | null, levelCount: number): number {
  const unlocked = Math.min(profile.unlockedLevel, levelCount - 1);
  return requested !== null && requested <= unlocked ? requested : unlocked;
}
