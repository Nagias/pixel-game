// Nơi DUY NHẤT chứa con số cân bằng của trận đấu. Đổi số ở đây, không viết cứng ở chỗ khác.
// NỢ DEBT-009: các con số hiện là phỏng đoán ban đầu, chưa qua chơi thử.
import type { BattleConfig } from './battleTypes';

export const BATTLE_CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  turnLimit: 8,
  arcPeriodMs: 2_400,
  // F02: 3 vũ khí theo tầm. Quái mới xuất hiện ở vòng 5 nên chỉ Cung với tới lúc đầu.
  weapons: [
    { name: 'Kiếm', rangeLabel: 'gần', widthSectors: 5, minRing: 0, maxRing: 1, damage: 1 },
    { name: 'Giáo', rangeLabel: 'vừa', widthSectors: 3, minRing: 2, maxRing: 3, damage: 1 },
    { name: 'Cung', rangeLabel: 'xa', widthSectors: 1, minRing: 4, maxRing: 5, damage: 1 },
  ],
  monster: {
    name: 'Slime',
    hp: 2,
    advanceChance: 0.6,
    // F04: quái áp sát (vòng 0) đánh mỗi lượt, mỗi con trừ 1 máu nhân vật.
    attack: 1,
  },
  hero: {
    hp: 5,
  },
  spawn: {
    count: 4,
    spread: 2,
  },
};
