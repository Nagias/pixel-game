// Nơi DUY NHẤT chứa con số cân bằng của trận đấu. Đổi số ở đây, không viết cứng ở chỗ khác.
// NỢ DEBT-009: các con số hiện là phỏng đoán ban đầu, chưa qua chơi thử.
import type { BattleConfig } from './battleTypes';

export const BATTLE_CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  // F02: vũ khí theo tầm; quái mới ở vòng 5 nên lúc đầu chỉ Cung với tới. B2 thêm Rìu (hai phía).
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
    // B2 (chủ dự án duyệt 26/10/2026): Rìu chém hai nêm đối nhau — trước mặt và sau lưng.
    {
      name: 'Rìu',
      rangeLabel: '2 phía',
      push: 'out',
      widthSectors: 3,
      minRing: 0,
      maxRing: 1,
      damage: 1,
      twoSided: true,
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
    // F06: trùm màn 3 — trâu hơn, đánh đau hơn, còn lại y như slime.
    slimeKing: {
      name: 'Slime Vua',
      hp: 6,
      advanceChance: 0.6,
      attack: 2,
    },
    // B3 (chủ dự án duyệt 26/10/2026): quái bắn xa — tới vòng 4 thì đứng yên, hiện "!" và bắn.
    slimeCannon: {
      name: 'Slime Pháo',
      hp: 2,
      advanceChance: 0.6,
      attack: 1,
      shootRing: 4,
    },
  },
  hero: {
    hp: 5,
  },
  // F06: các màn nối tiếp. Màn 2 có 6 con trong một cụm nên cụm rộng ±3 lát (cụm ±2 chỉ có 5 chỗ).
  levels: [
    { turnLimit: 8, monsters: ['slime', 'slime', 'slime', 'slime'], spread: 2 },
    {
      turnLimit: 10,
      monsters: ['slime', 'slime', 'slime', 'slime', 'slime', 'slime'],
      spread: 3,
    },
    // Màn trùm: chủ dự án duyệt 26/10/2026 (trước đó 2 slime, 12 lượt — dễ hơn màn 2).
    { turnLimit: 10, monsters: ['slimeKing', 'slime', 'slime', 'slime'], spread: 2 },
    // B2 (chủ dự án duyệt 26/10/2026): quái tới từ hai phía — 2 cụm 4 con đối diện, đất của Rìu.
    {
      turnLimit: 10,
      monsters: ['slime', 'slime', 'slime', 'slime', 'slime', 'slime', 'slime', 'slime'],
      spread: 2,
      splitOpposite: true,
    },
    // B3 (chủ dự án duyệt 26/10/2026): 6 slime + 2 Slime Pháo trong một cụm ±4 lát.
    {
      turnLimit: 10,
      monsters: [
        'slime',
        'slime',
        'slime',
        'slime',
        'slime',
        'slime',
        'slimeCannon',
        'slimeCannon',
      ],
      spread: 4,
    },
  ],
};
