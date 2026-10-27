// Gắn hồ sơ người chơi vào bộ nhớ trình duyệt (localStorage). Mọi luật nằm ở logic/profile.ts; file này
// chỉ đưa localStorage vào — truy cập nó cũng có thể ném lỗi (trình duyệt chặn), nên bọc lại.
import { emptyProfile, readProfile, writeProfile } from '../logic/profile';
import type { Profile } from '../logic/profileTypes';

export function loadProfile(): Profile {
  try {
    return readProfile(window.localStorage);
  } catch {
    return emptyProfile();
  }
}

/** Lưu hồ sơ; false nếu không lưu được (game vẫn chơi tiếp). */
export function saveProfile(profile: Profile): boolean {
  try {
    return writeProfile(window.localStorage, profile);
  } catch {
    return false;
  }
}
