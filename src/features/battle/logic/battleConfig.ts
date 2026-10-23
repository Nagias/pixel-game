// Nơi DUY NHẤT chứa con số cân bằng của trận đấu. Đổi số ở đây, không viết cứng ở chỗ khác.
// NỢ DEBT-009: các con số hiện là phỏng đoán ban đầu, chưa qua chơi thử.
import type { BattleConfig } from './battleTypes';

export const BATTLE_CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  // F02: 3 vũ khí theo tầm. Quái mới xuất hiện ở vòng 5 nên chỉ Cung với tới lúc đầu.
  weapons: [
    // F05: Kiếm đẩy lùi ra xa, Giáo đẩy lệch phải, Cung kéo vào gần.
    {
      name: 'Kiếm',
      rangeLabel: 'gần',
      push: 'out',
      widthSectors: 5,
      minRing: 0,
      maxRing: 1,
      damage: 1,
    },
    {
      name: 'Giáo',
      rangeLabel: 'vừa',
      push: 'clockwise',
      widthSectors: 3,
      minRing: 2,
      maxRing: 3,
      damage: 1,
    },
    {
      name: 'Cung',
      rangeLabel: 'xa',
      push: 'in',
      widthSectors: 1,
      minRing: 4,
      maxRing: 5,
      damage: 1,
    },
  ],
  monsterKinds: {
    slime: {
      name: 'Slime',
      hp: 2,
      advanceChance: 0.6,
      // F04: quái áp sát (vòng 0) đánh mỗi lượt, mỗi con trừ 1 máu nhân vật.
      attack: 1,
    },
    // F06: trùm màn cuối — trâu hơn, đánh đau hơn, còn lại y như slime.
    slimeKing: {
      name: 'Slime Vua',
      hp: 6,
      advanceChance: 0.6,
      attack: 2,
    },
  },
  hero: {
    hp: 5,
  },
  // F06: 3 màn nối tiếp. Màn 2 có 6 con nên cụm rộng ±3 lát (cụm ±2 chỉ có 5 chỗ).
  levels: [
    { turnLimit: 8, monsters: ['slime', 'slime', 'slime', 'slime'], spread: 2 },
    {
      turnLimit: 10,
      monsters: ['slime', 'slime', 'slime', 'slime', 'slime', 'slime'],
      spread: 3,
    },
    { turnLimit: 12, monsters: ['slimeKing', 'slime', 'slime'], spread: 2 },
  ],
};
