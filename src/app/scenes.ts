// Danh sách scene của game. Scene đầu tiên chạy khi mở game. Thêm tính năng có scene mới → thêm vào đây.
import type { Scene } from 'phaser';
import { BattleScene, MapScene, UpgradeScene, WeaponsScene } from '../features/battle';

// F18 đợt D: mở game là Bản đồ (thay màn chuẩn bị B4); đổi đồ ở màn Vũ khí. Nâng cấp mở từ thanh dưới. F20: bỏ
// Cửa hàng (chủ dự án duyệt 07/11/2026).
export const SCENES: (typeof Scene)[] = [MapScene, BattleScene, WeaponsScene, UpgradeScene];
