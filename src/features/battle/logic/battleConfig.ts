// Nơi DUY NHẤT chứa con số cân bằng của trận đấu. Đổi số ở đây, không viết cứng ở chỗ khác.
// NỢ DEBT-009: các con số hiện là phỏng đoán ban đầu, chưa qua chơi thử.
import type { BattleConfig } from './battleTypes';

export const BATTLE_CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  turnLimit: 8,
  arcPeriodMs: 2_400,
  weapon: {
    name: 'Kiếm gỗ',
    widthSectors: 3,
    minRing: 0,
    maxRing: 5,
    damage: 1,
  },
  monster: {
    name: 'Slime',
    hp: 2,
    advanceChance: 0.6,
  },
  spawn: {
    count: 4,
    spread: 2,
  },
};
