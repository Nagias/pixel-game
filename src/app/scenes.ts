// Danh sách scene của game. Scene đầu tiên chạy khi mở game. Thêm tính năng có scene mới → thêm vào đây.
import type { Scene } from 'phaser';
import { BattleScene, LoadoutScene, UpgradeScene } from '../features/battle';

// B4: mở game là màn chuẩn bị trận (chọn đồ), rồi mới vào trận.
// Đợt 4: màn Nâng cấp mở từ màn chuẩn bị.
export const SCENES: (typeof Scene)[] = [LoadoutScene, BattleScene, UpgradeScene];
