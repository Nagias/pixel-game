// Nơi DUY NHẤT chứa con số cân bằng của trận đấu. Đổi số ở đây, không viết cứng ở chỗ khác.
// NỢ DEBT-009: các con số hiện là phỏng đoán ban đầu, chưa qua chơi thử.
import type { BattleConfig, Difficulty } from './battleTypes';

/**
 * Đợt 0 (chủ dự án duyệt 27/10/2026): dung sai của mục tiêu độ khó (`target` của mỗi màn) — kết quả mô
 * phỏng lệch trong khoảng này thì coi là đạt (balance.test.ts, `npm run sim`, `npm run tune`).
 */
export const BALANCE_TOLERANCE: Difficulty = { winRate: 0.05, spareTurns: 0.5 };

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
    // F06: trùm màn 3 — trâu hơn, đánh đau hơn, còn lại y như slime. F11: 6 → 8 máu (nhiệm vụ màn 3 là hạ
    // trùm, xong là thắng — 6 máu thì thắng 100%).
    slimeKing: {
      name: 'Slime Vua',
      hp: 8,
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
    // F12 (đợt 2, chủ dự án duyệt 27/10/2026 — "làm theo gợi ý của agent"): mỗi loại một câu đố.
    // Slime Con: 1 máu, đánh nhẹ — "mồi" kéo dài combo: chém trúng nó cùng quái trâu thì quái trâu ăn ×2, ×3.
    slimeMini: {
      name: 'Slime Con',
      hp: 1,
      advanceChance: 0.6,
      attack: 1,
    },
    // Slime Lao: mỗi lần tiến lao 2 vòng — phải hạ trước khi nó áp sát.
    slimeCharger: {
      name: 'Slime Lao',
      hp: 3,
      advanceChance: 0.6,
      attack: 2,
      step: 2,
    },
    // Slime Ma: vô hình ở lượt chẵn (chém, skill đều xuyên qua) — canh đúng lượt. Thay Slime Khiên: khiên chỉ
    // vỡ khi có "mồi" trong cùng nhát, hết mồi là màn kẹt; mô phỏng không bộ số nào đạt mục tiêu.
    slimeGhost: {
      name: 'Slime Ma',
      hp: 2,
      advanceChance: 0.6,
      attack: 2,
      ghost: true,
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
    // Đợt 0: nạp 5 → 6 nhát (`npm run tune` 27/10/2026): với người chơi trung bình, Cầu lửa nạp 5 thắng
    // màn 4 hơn Mưa băng 6–9% — chỉnh quái của màn không đưa được cả hai skill vào dung sai.
    fireball: { name: 'Cầu lửa', damage: 2, freezeTurns: 0, chargeTurns: 6 },
  },
  skillUnlockLevel: 2,
  // F06: các màn nối tiếp. Màn 2 có 6 con trong một cụm nên cụm rộng ±3 lát (cụm ±2 chỉ có 5 chỗ).
  // Đợt 0 (chủ dự án duyệt 27/10/2026): mục tiêu độ khó theo gợi ý của agent — màn đầu ≥ 98%, tụt dần
  // ~5% mỗi màn, màn cuối chương ~78%; lượt dư tụt dần theo. Đo bằng người chơi trung bình (bot "Ngắm
  // chuẩn", chủ dự án chốt 27/10/2026).
  // F11 (đợt 1, chủ dự án duyệt luật 27/10/2026): mỗi màn một nhiệm vụ, xong là thắng; đợt sau tràn vào
  // khi sân còn ≤ nextWaveAt con. Nhiệm vụ, đợt quái, số lượt do agent đề xuất + `npm run tune` 27/10/2026
  // (số lượt màn 1–5: 10/11/8/9/8 → 14/13/6/8/9).
  levels: [
    // Màn 1 dạy đợt quái: hạ 6 mà mở màn chỉ 4 con, đợt 2 (2 con) ra khi sân còn ≤ 2.
    {
      turnLimit: 14,
      monsters: ['slime', 'slime', 'slime', 'slime'],
      spread: 2,
      waves: [['slime', 'slime']],
      nextWaveAt: 2,
      quest: { kind: 'slime', count: 6 },
      target: { winRate: 0.98, spareTurns: 3 },
    },
    {
      turnLimit: 13,
      monsters: ['slime', 'slime', 'slime', 'slime', 'slime', 'slime'],
      spread: 3,
      waves: [['slime', 'slime', 'slime', 'slime']],
      nextWaveAt: 3,
      quest: { kind: 'slime', count: 8 },
      target: { winRate: 0.93, spareTurns: 2.5 },
    },
    // Màn trùm (chủ dự án duyệt 26/10/2026). F11: nhiệm vụ hạ Slime Vua, slime chỉ là hộ vệ nên không cần
    // đợt sau (dò thử: đợt sau không đổi kết quả). Hộ vệ 3 → 4 con, cụm ±2 → ±4 (script dò tạm 27/10/2026:
    // với cụm hẹp, Mưa băng dễ hơn Cầu lửa ~5%, vượt dung sai).
    {
      turnLimit: 6,
      monsters: ['slimeKing', 'slime', 'slime', 'slime', 'slime'],
      spread: 4,
      quest: { kind: 'slimeKing', count: 1 },
      target: { winRate: 0.88, spareTurns: 1.25 },
    },
    // B2 (chủ dự án duyệt 26/10/2026): quái tới từ hai phía — 2 cụm đối diện (5 + 5), đất của Rìu. F11:
    // hạ 9 trong 10 con; không cần đợt sau (nó chỉ ra khi đã hạ 9 — lúc nhiệm vụ đã xong).
    {
      turnLimit: 8,
      monsters: [
        'slime',
        'slime',
        'slime',
        'slime',
        'slime',
        'slime',
        'slime',
        'slime',
        'slime',
        'slime',
      ],
      spread: 3,
      splitOpposite: true,
      quest: { kind: 'slime', count: 9 },
      target: { winRate: 0.83, spareTurns: 0.75 },
    },
    // B3 (chủ dự án duyệt 26/10/2026): slime + Slime Pháo trong một cụm ±5. F11: nhiệm vụ hạ 2 Slime Pháo —
    // con thứ hai tới cùng đợt sau (3 slime + 1 Pháo) khi sân còn ≤ 2.
    {
      turnLimit: 9,
      monsters: ['slime', 'slime', 'slime', 'slime', 'slime', 'slime', 'slime', 'slimeCannon'],
      spread: 5,
      waves: [['slime', 'slime', 'slime', 'slimeCannon']],
      nextWaveAt: 2,
      quest: { kind: 'slimeCannon', count: 2 },
      target: { winRate: 0.78, spareTurns: 0.5 },
    },
    // F12: màn giới thiệu Slime Lao — hạ 2 Slime Lao, con thứ hai tới cùng đợt sau. Màn giới thiệu quái mới
    // nên mục tiêu dễ hơn màn 5 (cuối chương) — agent đề xuất, chủ dự án duyệt qua PR. Đội hình do script
    // dò tạm chọn: 2–3 Slime Lao mở màn, hoặc đợt sau ra sớm, thì Mưa băng (đóng băng, chặn cú lao) dễ hơn Cầu
    // lửa ~10%.
    {
      turnLimit: 9,
      monsters: ['slimeCharger', 'slime', 'slime', 'slime', 'slime'],
      spread: 4,
      waves: [['slimeCharger', 'slime', 'slime']],
      nextWaveAt: 1,
      quest: { kind: 'slimeCharger', count: 2 },
      target: { winRate: 0.9, spareTurns: 1.5 },
    },
    // F12: màn giới thiệu Slime Ma — hạ 2 Slime Ma, con thứ hai tới cùng đợt sau (kèm 3 Slime Con làm mồi
    // combo). Đội hình do script dò tạm chọn: nhiều Ma hơn thì skill nào hợp (Cầu lửa 2 sát thương hạ Ma
    // nhanh, Mưa băng đóng băng) chênh nhau 10–15%.
    {
      turnLimit: 9,
      monsters: ['slimeGhost', 'slime', 'slime', 'slime', 'slime', 'slime'],
      spread: 4,
      waves: [['slimeGhost', 'slimeMini', 'slimeMini', 'slimeMini']],
      nextWaveAt: 1,
      quest: { kind: 'slimeGhost', count: 2 },
      target: { winRate: 0.85, spareTurns: 1 },
    },
  ],
};
