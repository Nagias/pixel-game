// Nơi DUY NHẤT chứa con số cân bằng của trận đấu. Đổi số ở đây, không viết cứng ở chỗ khác.
// NỢ DEBT-009: các con số hiện là phỏng đoán ban đầu, chưa qua chơi thử.
import type { BattleConfig } from './battleTypes';

export const BATTLE_CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  // F02: vũ khí theo tầm; quái mới ở vòng 5 nên lúc đầu chỉ Cung với tới. B2 thêm Rìu (hai phía).
  // B4: mỗi trận mang một món mỗi tầm — ô gần chọn Kiếm hoặc Rìu; món đầu mỗi tầm là mặc định.
  weapons: [
    // F05: Kiếm đẩy lùi ra xa, Giáo đẩy lệch phải, Cung kéo vào gần.
    {
      name: 'Kiếm',
      slot: 'near',
      rangeLabel: 'gần',
      push: 'out',
      widthSectors: 5,
      minRing: 0,
      maxRing: 1,
      damage: 1,
      critChance: 0.1,
    },
    {
      name: 'Giáo',
      slot: 'mid',
      rangeLabel: 'vừa',
      push: 'clockwise',
      widthSectors: 3,
      minRing: 2,
      maxRing: 3,
      damage: 1,
      critChance: 0.1,
    },
    {
      name: 'Cung',
      slot: 'far',
      rangeLabel: 'xa',
      push: 'in',
      widthSectors: 1,
      minRing: 4,
      maxRing: 5,
      damage: 1,
      critChance: 0.1,
    },
    // B2 (chủ dự án duyệt 26/10/2026): Rìu chém hai nêm đối nhau — trước mặt và sau lưng.
    {
      name: 'Rìu',
      slot: 'near',
      rangeLabel: '2 phía',
      push: 'out',
      widthSectors: 3,
      minRing: 0,
      maxRing: 1,
      damage: 1,
      critChance: 0.1,
      twoSided: true,
    },
  ],
  // B6: quái mạnh lên cùng lúc nhân vật có máu 10, hồi máu, chí mạng, skill — máu slime 2 → 3, sức đánh
  // ×2 (agent chọn bằng mô phỏng 27/10/2026; trước đó Cầu lửa 2 sát thương dọn sạch slime 2 máu).
  monsterKinds: {
    slime: {
      name: 'Slime',
      hp: 3,
      advanceChance: 0.6,
      // F04: quái áp sát (vòng 0) đánh mỗi lượt, mỗi con trừ máu nhân vật theo sức đánh.
      attack: 2,
    },
    // F06: trùm màn 3 — trâu hơn, đánh đau hơn, còn lại y như slime.
    slimeKing: {
      name: 'Slime Vua',
      hp: 6,
      advanceChance: 0.6,
      attack: 4,
    },
    // B3 (chủ dự án duyệt 26/10/2026): quái bắn xa — tới vòng 4 thì đứng yên, hiện "!" và bắn.
    slimeCannon: {
      name: 'Slime Pháo',
      hp: 3,
      advanceChance: 0.6,
      attack: 2,
      shootRing: 4,
    },
  },
  // B6 (chủ dự án duyệt 27/10/2026): máu 10, nhát trúng ≥ 3 con hồi 1 máu, chí mạng ×2, hai skill
  // đánh cả sân mở từ màn 3. Con số cụ thể agent chọn bằng mô phỏng (giữ độ khó như trước B6).
  hero: {
    hp: 10,
    healMinHits: 3,
    healAmount: 1,
  },
  critMultiplier: 2,
  skills: {
    iceRain: { name: 'Mưa băng', damage: 1, freezeTurns: 1, chargeTurns: 3 },
    fireball: { name: 'Cầu lửa', damage: 2, freezeTurns: 0, chargeTurns: 5 },
  },
  skillUnlockLevel: 2,
  // F06: các màn nối tiếp. Màn 2 có 6 con trong một cụm nên cụm rộng ±3 lát (cụm ±2 chỉ có 5 chỗ).
  // B6: số lượt chỉnh lại theo máu quái mới và skill (màn 1–5: 8/10/10/10/10 → 10/12/9/8/8).
  levels: [
    { turnLimit: 10, monsters: ['slime', 'slime', 'slime', 'slime'], spread: 2 },
    {
      turnLimit: 12,
      monsters: ['slime', 'slime', 'slime', 'slime', 'slime', 'slime'],
      spread: 3,
    },
    // Màn trùm: chủ dự án duyệt 26/10/2026 (trước đó 2 slime, 12 lượt — dễ hơn màn 2).
    { turnLimit: 9, monsters: ['slimeKing', 'slime', 'slime', 'slime'], spread: 2 },
    // B2 (chủ dự án duyệt 26/10/2026): quái tới từ hai phía — 2 cụm 4 con đối diện, đất của Rìu.
    {
      turnLimit: 8,
      monsters: ['slime', 'slime', 'slime', 'slime', 'slime', 'slime', 'slime', 'slime'],
      spread: 2,
      splitOpposite: true,
    },
    // B3 (chủ dự án duyệt 26/10/2026): 6 slime + 2 Slime Pháo trong một cụm ±4 lát.
    {
      turnLimit: 8,
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
