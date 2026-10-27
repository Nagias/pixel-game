// Nơi DUY NHẤT chứa con số cân bằng của trận đấu. Đổi số ở đây, không viết cứng ở chỗ khác.
// NỢ DEBT-009: các con số hiện là phỏng đoán ban đầu, chưa qua chơi thử.
import type { BattleConfig, Difficulty, LootConfig, UpgradeConfig } from './battleTypes';
import type { Chapter } from './chapters';

/**
 * Đợt 0 (chủ dự án duyệt 27/10/2026): dung sai của mục tiêu độ khó (`target` của mỗi màn) — kết quả mô
 * phỏng lệch trong khoảng này thì coi là đạt (balance.test.ts, `npm run sim`, `npm run tune`).
 */
export const BALANCE_TOLERANCE: Difficulty = { winRate: 0.05, spareTurns: 0.5 };

/**
 * Chủ dự án duyệt 27/10/2026 (lượt duyệt chung, mục 10): dung sai của TỪNG bộ đồ (từng skill) — rộng hơn
 * `BALANCE_TOLERANCE` (giờ là dung sai của trung bình các bộ đồ), vì mỗi loại quái hợp một skill khác nhau.
 */
export const LOADOUT_TOLERANCE: Difficulty = { winRate: 0.08, spareTurns: 0.8 };

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
  // Đợt 3 (chủ dự án duyệt 27/10/2026 — "agent đề xuất"): `gold` = vàng khi hạ một con, theo độ khó hạ nó
  // (slime, Slime Con 1 · Lao, Ma 2 · Pháo 3 · Vua 5). Thua vẫn giữ vàng đã nhặt.
  monsterKinds: {
    slime: {
      name: 'Slime',
      gold: 1,
      hp: 3,
      advanceChance: 0.6,
      // F04: quái áp sát (vòng 0) đánh mỗi lượt, mỗi con trừ máu nhân vật theo sức đánh.
      attack: 2,
    },
    // F06: trùm màn 3 — trâu hơn, đánh đau hơn, còn lại y như slime. F11: 6 → 8 máu (nhiệm vụ màn 3 là hạ
    // trùm, xong là thắng — 6 máu thì thắng 100%).
    slimeKing: {
      name: 'Slime Vua',
      gold: 5,
      hp: 8,
      advanceChance: 0.6,
      attack: 4,
    },
    // B3 (chủ dự án duyệt 26/10/2026): quái bắn xa — tới vòng 4 thì đứng yên, hiện "!" và bắn.
    slimeCannon: {
      name: 'Slime Pháo',
      gold: 3,
      hp: 3,
      advanceChance: 0.6,
      attack: 2,
      shootRing: 4,
    },
    // F12 (đợt 2, chủ dự án duyệt 27/10/2026 — "làm theo gợi ý của agent"): mỗi loại một câu đố.
    // Slime Con: 1 máu, đánh nhẹ — "mồi" kéo dài combo: chém trúng nó cùng quái trâu thì quái trâu ăn ×2, ×3.
    slimeMini: {
      name: 'Slime Con',
      gold: 1,
      hp: 1,
      advanceChance: 0.6,
      attack: 1,
    },
    // Slime Lao: mỗi lần tiến lao 2 vòng — phải hạ trước khi nó áp sát.
    slimeCharger: {
      name: 'Slime Lao',
      gold: 2,
      hp: 3,
      advanceChance: 0.6,
      attack: 2,
      step: 2,
    },
    // Slime Ma: vô hình ở lượt chẵn (chém, skill đều xuyên qua) — canh đúng lượt. Thay Slime Khiên: khiên chỉ
    // vỡ khi có "mồi" trong cùng nhát, hết mồi là màn kẹt; mô phỏng không bộ số nào đạt mục tiêu.
    slimeGhost: {
      name: 'Slime Ma',
      gold: 2,
      hp: 2,
      advanceChance: 0.6,
      attack: 2,
      ghost: true,
    },
    // Chủ đề Rừng rậm (chủ dự án duyệt 27/10/2026): 5 loài không phải slime, dùng lại đặc tính có sẵn. Vàng
    // theo độ khó hạ (agent đề xuất, cùng nguyên tắc đợt 3). Đợt 5: 4 loài thường hóa hiếm được (slime và
    // trùm thì không).
    // Yêu tinh: lính thường của rừng, cứng hơn slime.
    goblin: { name: 'Yêu tinh', gold: 2, hp: 4, advanceChance: 0.6, attack: 2, canBeRare: true },
    // Sói rừng: lao 2 vòng mỗi lần tiến — phải hạ trước khi nó áp sát.
    wolf: {
      name: 'Sói rừng',
      gold: 3,
      hp: 4,
      advanceChance: 0.6,
      attack: 3,
      step: 2,
      canBeRare: true,
    },
    // Yêu tinh cung thủ: tới vòng 4 thì đứng bắn — ưu tiên dùng Cung.
    goblinArcher: {
      name: 'Cung thủ',
      gold: 3,
      hp: 3,
      advanceChance: 0.6,
      attack: 2,
      shootRing: 4,
      canBeRare: true,
    },
    // Dơi đêm: lượt chẵn bay lẩn (vô hình) — canh đúng lượt.
    bat: {
      name: 'Dơi đêm',
      gold: 3,
      hp: 3,
      advanceChance: 0.6,
      attack: 2,
      ghost: true,
      canBeRare: true,
    },
    // Người Cây: trùm màn 10 và 20 — rất trâu, đánh đau, tiến chậm.
    treant: { name: 'Người Cây', gold: 10, hp: 14, advanceChance: 0.4, attack: 5 },
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
  // Đợt 5 (chủ dự án duyệt 27/10/2026, lượt duyệt chung mục 1b): từ màn 3, 15% số trận có một quái hiếm.
  rare: { fromLevel: 2, chance: 0.15, hpMultiplier: 2, goldMultiplier: 3 },
  // Đợt 7 — chủ đề Rừng rậm, 20 màn (chủ dự án duyệt 27/10/2026): độ khó răng cưa — màn 1 ~98% giảm dần tới
  // màn 10 (trùm Người Cây) ~78%, màn 11 nhẹ lại ~92% rồi giảm tới màn 20 (trùm cuối) ~72%; đo bằng bot
  // "Ngắm chuẩn" với nâng cấp dự kiến (`assumedUpgrades`). Đội hình, nhiệm vụ, đợt quái, số lượt do bộ sinh
  // màn chọn (`npm run levelgen`, bản mô tả ở scripts/levelGen.ts) — chỉ khớp % thắng; lượt dư mục tiêu ghi
  // bằng số đo. Màn 1–7 giữ đội hình đã duyệt (F06–F14), chỉ dò lại số. Lịch sử từng màn: FEATURE_MAP.md.
  levels: [
    // Màn 1: slime — dạy đợt quái (hạ nhiều hơn số quái mở màn).
    {
      monsters: ['slime', 'slime', 'slime', 'slime'],
      spread: 2,
      waves: [['slime', 'slime']],
      nextWaveAt: 1,
      quest: { kind: 'slime', count: 5 },
      turnLimit: 13,
      target: { winRate: 0.98, spareTurns: 3.5 },
    },
    // Màn 2: slime đông hơn.
    {
      monsters: ['slime', 'slime', 'slime', 'slime', 'slime', 'slime'],
      spread: 3,
      waves: [['slime', 'slime', 'slime']],
      nextWaveAt: 2,
      quest: { kind: 'slime', count: 8 },
      turnLimit: 15,
      target: { winRate: 0.96, spareTurns: 3.25 },
    },
    // Màn 3: trùm nhỏ Slime Vua (B1) — nhiệm vụ hạ trùm.
    {
      monsters: ['slimeKing', 'slime', 'slime', 'slime', 'slime'],
      spread: 3,
      quest: { kind: 'slimeKing', count: 1 },
      turnLimit: 6,
      target: { winRate: 0.94, spareTurns: 1.25 },
      assumedUpgrades: { hp: 1 },
    },
    // Màn 4: slime tới từ hai phía (B2) — đất của Rìu. Script dò tạm (27/10/2026) chọn trong bản mô tả bộ số
    // nằm giữa màn 3 và màn 5 theo luật thứ tự đã duyệt (ít lượt dư / thắng ít hơn màn 3, hơn màn 5).
    {
      monsters: ['slime', 'slime', 'slime', 'slime', 'slime', 'slime', 'slime', 'slime'],
      spread: 4,
      splitOpposite: true,
      quest: { kind: 'slime', count: 8 },
      turnLimit: 9,
      target: { winRate: 0.91, spareTurns: 1 },
      assumedUpgrades: { hp: 1, crit: 1 },
    },
    // Màn 5: Slime Pháo bắn xa (B3) — hạ 2 Pháo.
    {
      monsters: ['slime', 'slime', 'slime', 'slime', 'slime', 'slime', 'slime', 'slimeCannon'],
      spread: 4,
      waves: [['slime', 'slimeCannon']],
      nextWaveAt: 2,
      quest: { kind: 'slimeCannon', count: 2 },
      turnLimit: 9,
      target: { winRate: 0.89, spareTurns: 1 },
      assumedUpgrades: { hp: 1, crit: 1 },
    },
    // Màn 6: giới thiệu Slime Lao (F12).
    {
      monsters: ['slimeCharger', 'slime', 'slime', 'slime', 'slime', 'slime'],
      spread: 4,
      waves: [['slimeCharger', 'slime', 'slime', 'slime']],
      nextWaveAt: 1,
      quest: { kind: 'slimeCharger', count: 2 },
      turnLimit: 9,
      target: { winRate: 0.87, spareTurns: 0.75 },
      assumedUpgrades: { hp: 1, crit: 1, heal: 1 },
    },
    // Màn 7: giới thiệu Slime Ma (F12), Slime Con làm mồi.
    {
      monsters: ['slimeGhost', 'slime', 'slime', 'slime', 'slime', 'slime'],
      spread: 4,
      waves: [['slimeMini', 'slimeMini', 'slimeMini', 'slimeGhost']],
      nextWaveAt: 1,
      quest: { kind: 'slimeGhost', count: 2 },
      turnLimit: 9,
      target: { winRate: 0.85, spareTurns: 1.25 },
      assumedUpgrades: { hp: 1, crit: 1, heal: 1 },
    },
    // Màn 8: giới thiệu Yêu tinh — lính rừng, cứng hơn slime.
    {
      monsters: ['goblin', 'goblin', 'slime', 'slime', 'slime'],
      spread: 3,
      waves: [['goblin', 'goblin', 'slime', 'slime']],
      nextWaveAt: 2,
      quest: { kind: 'goblin', count: 4 },
      turnLimit: 10,
      target: { winRate: 0.82, spareTurns: 1.25 },
      assumedUpgrades: { hp: 1, crit: 1, heal: 1 },
    },
    // Màn 9: giới thiệu Sói rừng — lao 2 vòng.
    {
      monsters: ['wolf', 'wolf', 'goblin', 'goblin'],
      spread: 4,
      waves: [['wolf', 'goblin', 'goblin']],
      nextWaveAt: 2,
      quest: { kind: 'wolf', count: 3 },
      turnLimit: 8,
      target: { winRate: 0.8, spareTurns: 0.75 },
      assumedUpgrades: { hp: 1, crit: 1, heal: 1 },
    },
    // Màn 10: TRÙM Người Cây.
    {
      monsters: ['treant', 'goblin', 'goblin'],
      spread: 3,
      quest: { kind: 'treant', count: 1 },
      turnLimit: 9,
      target: { winRate: 0.78, spareTurns: 1.5 },
      assumedUpgrades: { hp: 2, crit: 1, heal: 1 },
    },
    // Màn 11: giới thiệu Yêu tinh cung thủ — bắn từ vòng 4.
    {
      monsters: ['goblinArcher', 'goblinArcher', 'goblin', 'goblin', 'goblin'],
      spread: 4,
      waves: [['goblinArcher', 'goblin', 'goblin']],
      nextWaveAt: 2,
      quest: { kind: 'goblinArcher', count: 3 },
      turnLimit: 9,
      target: { winRate: 0.92, spareTurns: 1.75 },
      assumedUpgrades: { hp: 2, crit: 1, heal: 1 },
    },
    // Màn 12: giới thiệu Dơi đêm — lượt chẵn vô hình. Đợt 5: sinh lại khi có quái hiếm (Yêu tinh hiếm ×2
    // máu làm Cầu lửa tụt 80% < 90% − 8%).
    {
      monsters: ['bat', 'goblin', 'goblin', 'goblin'],
      spread: 5,
      waves: [['bat', 'slime', 'slime']],
      nextWaveAt: 2,
      quest: { kind: 'bat', count: 2 },
      turnLimit: 9,
      target: { winRate: 0.9, spareTurns: 1.25 },
      assumedUpgrades: { hp: 2, crit: 1, heal: 1 },
    },
    // Màn 13: Yêu tinh + Sói tới từ hai phía.
    {
      monsters: ['goblin', 'goblin', 'goblin', 'goblin', 'wolf'],
      spread: 3,
      waves: [['wolf', 'goblin', 'goblin']],
      nextWaveAt: 3,
      quest: { kind: 'goblin', count: 4 },
      turnLimit: 9,
      target: { winRate: 0.88, spareTurns: 1.75 },
      assumedUpgrades: { hp: 2, crit: 2, heal: 1 },
      splitOpposite: true,
    },
    // Màn 14: Cung thủ được Yêu tinh che chắn.
    {
      monsters: ['goblinArcher', 'goblinArcher', 'goblin', 'goblin', 'goblin', 'goblin'],
      spread: 4,
      waves: [['goblinArcher', 'goblin']],
      nextWaveAt: 2,
      quest: { kind: 'goblinArcher', count: 3 },
      turnLimit: 9,
      target: { winRate: 0.85, spareTurns: 1 },
      assumedUpgrades: { hp: 2, crit: 2, heal: 1 },
    },
    // Màn 15: Dơi + Sói.
    {
      monsters: ['bat', 'bat', 'wolf', 'wolf', 'goblin', 'goblin'],
      spread: 5,
      waves: [['wolf', 'bat']],
      nextWaveAt: 1,
      quest: { kind: 'wolf', count: 3 },
      turnLimit: 12,
      target: { winRate: 0.83, spareTurns: 1.25 },
      assumedUpgrades: { hp: 2, crit: 2, heal: 1 },
    },
    // Màn 16: trộn Yêu tinh, Cung thủ, Dơi.
    {
      monsters: ['goblin', 'goblin', 'goblin', 'goblinArcher', 'bat'],
      spread: 5,
      waves: [['goblin', 'goblin', 'goblinArcher', 'bat']],
      nextWaveAt: 2,
      quest: { kind: 'goblin', count: 5 },
      turnLimit: 13,
      target: { winRate: 0.81, spareTurns: 1.25 },
      assumedUpgrades: { hp: 2, crit: 2, heal: 2 },
    },
    // Màn 17: bầy Sói hai phía.
    {
      monsters: ['wolf', 'wolf', 'goblin', 'goblin', 'goblin', 'goblin'],
      spread: 3,
      waves: [['wolf', 'wolf', 'wolf']],
      nextWaveAt: 1,
      quest: { kind: 'wolf', count: 4 },
      turnLimit: 13,
      target: { winRate: 0.79, spareTurns: 1 },
      assumedUpgrades: { hp: 2, crit: 2, heal: 2 },
      splitOpposite: true,
    },
    // Màn 18: Cung thủ + Dơi.
    {
      monsters: ['goblinArcher', 'goblinArcher', 'bat', 'bat', 'goblin', 'goblin'],
      spread: 4,
      waves: [['goblinArcher', 'bat']],
      nextWaveAt: 2,
      quest: { kind: 'goblinArcher', count: 3 },
      turnLimit: 9,
      target: { winRate: 0.76, spareTurns: 0.75 },
      assumedUpgrades: { hp: 2, crit: 2, heal: 2 },
    },
    // Màn 19: mọi loài rừng.
    {
      monsters: ['goblin', 'goblin', 'wolf', 'wolf', 'goblinArcher', 'goblinArcher', 'bat'],
      spread: 4,
      waves: [['wolf', 'goblinArcher', 'bat', 'bat']],
      nextWaveAt: 2,
      quest: { kind: 'wolf', count: 2 },
      turnLimit: 8,
      target: { winRate: 0.74, spareTurns: 1 },
      assumedUpgrades: { hp: 3, crit: 2, heal: 2 },
    },
    // Màn 20: TRÙM CUỐI Người Cây cùng Sói, Cung thủ.
    {
      monsters: ['treant', 'wolf'],
      spread: 3,
      waves: [['goblin', 'goblin', 'goblin']],
      nextWaveAt: 2,
      quest: { kind: 'treant', count: 1 },
      turnLimit: 9,
      target: { winRate: 0.72, spareTurns: 1.5 },
      assumedUpgrades: { hp: 3, crit: 2, heal: 2 },
    },
  ],
};

/**
 * Đợt 4 (chủ dự án duyệt 27/10/2026 — "agent đề xuất"): nâng cấp bằng vàng, mỗi chỉ số tối đa 3 cấp, giá
 * 10 / 20 / 40 (nâng hết cả ba: 210 vàng ≈ 3–4 lượt chơi hết 7 màn). Không có "+1 sát thương": slime 3 máu
 * nên +1 sát thương làm game dễ hẳn; các chỉ số dưới tăng sức từ từ.
 */
export const UPGRADE_CONFIG: UpgradeConfig = {
  hp: { name: 'Máu tối đa', perLevel: 2, costs: [10, 20, 40] },
  crit: { name: 'Chí mạng', perLevel: 0.05, costs: [10, 20, 40] },
  heal: { name: 'Hồi máu', perLevel: 1, costs: [10, 20, 40] },
  // Đợt 5 (chủ dự án duyệt 27/10/2026): may mắn +5% xác suất có quái hiếm mỗi cấp.
  luck: { name: 'May mắn', perLevel: 0.05, costs: [10, 20, 40] },
};

/**
 * Đợt 5 (chủ dự án duyệt 27/10/2026, lượt duyệt chung mục 1b): hạ quái hiếm thì 50% rơi một vũ khí (loại
 * tạm ngẫu nhiên trong mọi vũ khí); 6 cấp màu chỉ cộng chỉ số. Bảo hiểm: hụt 3 lần liền thì lần thứ 4 chắc
 * rơi; 29 món liền dưới Sử thi thì món thứ 30 chắc từ Sử thi trở lên.
 */
export const LOOT_CONFIG: LootConfig = {
  dropChance: 0.5,
  dryPity: 3,
  highTier: 3,
  highPity: 30,
  tiers: [
    { name: 'Thường', critBonus: 0, widthBonus: 0, damageBonus: 0, dropRate: 0.4 },
    { name: 'Tốt', critBonus: 0.05, widthBonus: 0, damageBonus: 0, dropRate: 0.28 },
    { name: 'Hiếm', critBonus: 0.1, widthBonus: 0, damageBonus: 0, dropRate: 0.17 },
    { name: 'Sử thi', critBonus: 0.1, widthBonus: 2, damageBonus: 0, dropRate: 0.1 },
    { name: 'Huyền thoại', critBonus: 0.15, widthBonus: 2, damageBonus: 1, dropRate: 0.04 },
    { name: 'Thần', critBonus: 0.2, widthBonus: 2, damageBonus: 1, dropRate: 0.01 },
  ],
};

/**
 * Đợt 7 (chủ dự án duyệt 27/10/2026): các chương theo chủ đề môi trường, theo thứ tự màn. Chủ đề Băng, Núi
 * lửa… để sau — thêm chương = thêm màn vào `levels` + một dòng ở đây.
 */
export const CHAPTERS: readonly Chapter[] = [{ name: 'Rừng rậm', levelCount: 20 }];
