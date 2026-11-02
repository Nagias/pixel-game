// Cổng công khai của tính năng "profile" (hồ sơ người chơi: vàng, màn đã mở khóa). Nơi khác chỉ import
// từ file này (CLAUDE.md đường cấm #10).
export {
  applyBattleResult,
  isReplay,
  levelStatus,
  startLevel,
  withSavedLoadout,
} from './logic/profile';
export type { LevelStatus, Profile, SavedLoadout } from './logic/profileTypes';
export { loadProfile, saveProfile } from './view/profileStore';
