// Danh sách scene của game. Scene đầu tiên chạy khi mở game. Thêm tính năng có scene mới → thêm vào đây.
import type { Scene } from 'phaser';
import { BattleScene } from '../features/battle';

export const SCENES: (typeof Scene)[] = [BattleScene];
