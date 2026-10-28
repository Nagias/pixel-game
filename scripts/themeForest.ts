// Bản mô tả chủ đề Rừng rậm (đợt 7, chủ dự án duyệt 27/10/2026) cho bộ sinh màn — 20 màn. Thêm chủ đề mới
// = thêm một file như thế này (themeIce.ts, themeVolcano.ts…) và nối vào scripts/levelGen.ts.
import type {
  Difficulty,
  TargetPlayer,
  UpgradeLevels,
} from '../src/features/battle/logic/battleTypes';
import type { LevelSpec } from './levelGenCore';

/**
 * Màn 1–16 đo bằng bot "Người mới" (chủ dự án duyệt 28/10/2026 — màn đầu dễ hơn, trả DEBT-012): mục tiêu là
 * số đo của các màn hiện có sau khi thêm lượt (500 ván, trung bình các skill). Màn 17–20 giữ răng cưa cũ
 * đo bằng "Ngắm chuẩn" (chủ dự án duyệt 27/10/2026). Bộ sinh chỉ khớp % thắng (matchWinOnly); lượt dư mục
 * tiêu ghi bằng số đo của màn sinh ra — lượt dư suy từ công thức mâu thuẫn với cách màn chạy (màn trùm ngắn).
 */
const NOVICE_LEVELS = 16;
const WINS = [87, 54, 95, 92, 69, 95, 95, 81, 81, 45, 33, 28, 65, 25, 35, 21, 79, 76, 74, 72];
/** Màn 1–16 thêm lượt (28/10/2026): số lượt thử tối đa phải bao được số lượt hiện có (+4 để còn chỗ dò). */
const NOVICE_TURN_MAX = [27, 29, 20, 23, 23, 21, 20, 20, 17, 17, 16, 16, 15, 15, 17, 18];
const playerOf = (level: number): TargetPlayer =>
  level < NOVICE_LEVELS ? 'Người mới' : 'Ngắm chuẩn';
const target = (level: number): Difficulty => {
  const win = WINS[level] as number;
  return { winRate: win / 100, spareTurns: 0 };
};

/**
 * Nâng cấp dự kiến khi tới màn (người chơi lần đầu, mua ngay khi đủ vàng — màn 1–7 theo mô phỏng đợt 4;
 * màn 8–20 agent ước lượng theo vàng tăng dần của quái rừng: 2–3 vàng mỗi con, trùm 10).
 */
const UPGRADES: (UpgradeLevels | undefined)[] = [
  undefined,
  undefined,
  { hp: 1 },
  { hp: 1, crit: 1 },
  { hp: 1, crit: 1 },
  ...Array<UpgradeLevels>(4).fill({ hp: 1, crit: 1, heal: 1 }),
  ...Array<UpgradeLevels>(3).fill({ hp: 2, crit: 1, heal: 1 }),
  ...Array<UpgradeLevels>(3).fill({ hp: 2, crit: 2, heal: 1 }),
  ...Array<UpgradeLevels>(3).fill({ hp: 2, crit: 2, heal: 2 }),
  ...Array<UpgradeLevels>(2).fill({ hp: 3, crit: 2, heal: 2 }),
];

type Shape = Omit<LevelSpec, 'target' | 'assumedUpgrades'>;

/** Chủ đề Rừng rậm, 20 màn: 7 màn đầu giữ đội hình đã duyệt; 8–20 giới thiệu rồi trộn các loài rừng. */
const THEME: Shape[] = [
  // 1–7: đội hình đã duyệt (F11, F12, F14), dò lại số theo mục tiêu răng cưa.
  {
    opening: [{ kind: 'slime', counts: [4] }],
    spread: [2],
    waves: [{ kind: 'slime', counts: [1, 2, 3] }],
    nextWaveAt: [1, 2],
    quest: { kind: 'slime', counts: [5, 6] },
    turns: [8, 16],
  },
  {
    opening: [{ kind: 'slime', counts: [6] }],
    spread: [3],
    waves: [{ kind: 'slime', counts: [3, 4] }],
    nextWaveAt: [2, 3],
    quest: { kind: 'slime', counts: [7, 8, 9] },
    turns: [8, 16],
  },
  {
    opening: [
      { kind: 'slimeKing', counts: [1] },
      { kind: 'slime', counts: [2, 3, 4, 5] },
    ],
    spread: [2, 3, 4],
    quest: { kind: 'slimeKing', counts: [1] },
    turns: [3, 11],
  },
  {
    splitOpposite: true,
    opening: [{ kind: 'slime', counts: [8, 10] }],
    spread: [3, 4],
    quest: { kind: 'slime', counts: [7, 8, 9, 10] },
    turns: [4, 13],
  },
  {
    opening: [
      { kind: 'slime', counts: [6, 7, 8] },
      { kind: 'slimeCannon', counts: [1] },
    ],
    spread: [4, 5],
    waves: [
      { kind: 'slime', counts: [1, 2] },
      { kind: 'slimeCannon', counts: [1] },
    ],
    nextWaveAt: [2],
    quest: { kind: 'slimeCannon', counts: [2] },
    turns: [6, 13],
  },
  {
    opening: [
      { kind: 'slimeCharger', counts: [1] },
      { kind: 'slime', counts: [3, 4, 5] },
    ],
    spread: [3, 4, 5],
    waves: [
      { kind: 'slimeCharger', counts: [1] },
      { kind: 'slime', counts: [1, 2, 3] },
    ],
    nextWaveAt: [1, 2, 3],
    quest: { kind: 'slimeCharger', counts: [2] },
    turns: [6, 13],
  },
  {
    opening: [
      { kind: 'slimeGhost', counts: [1] },
      { kind: 'slime', counts: [4, 5] },
    ],
    spread: [4],
    waves: [
      { kind: 'slimeMini', counts: [3] },
      { kind: 'slimeGhost', counts: [1] },
    ],
    nextWaveAt: [1, 2],
    quest: { kind: 'slimeGhost', counts: [2] },
    turns: [6, 13],
  },
  // 8: Yêu tinh — lính rừng, cứng hơn slime.
  {
    opening: [
      { kind: 'goblin', counts: [2, 3] },
      { kind: 'slime', counts: [3, 4] },
    ],
    spread: [3, 4],
    waves: [
      { kind: 'goblin', counts: [1, 2] },
      { kind: 'slime', counts: [2] },
    ],
    nextWaveAt: [1, 2],
    quest: { kind: 'goblin', counts: [3, 4] },
    turns: [7, 15],
  },
  // 9: Sói rừng — lao 2 vòng.
  {
    opening: [
      { kind: 'wolf', counts: [1, 2] },
      { kind: 'goblin', counts: [2, 3] },
    ],
    spread: [4],
    waves: [
      { kind: 'wolf', counts: [1] },
      { kind: 'goblin', counts: [1, 2] },
    ],
    nextWaveAt: [1, 2],
    quest: { kind: 'wolf', counts: [2, 3] },
    turns: [7, 15],
  },
  // 10: TRÙM Người Cây giữa đám Yêu tinh.
  {
    opening: [
      { kind: 'treant', counts: [1] },
      { kind: 'goblin', counts: [0, 1, 2, 3] },
    ],
    spread: [2, 3, 4],
    quest: { kind: 'treant', counts: [1] },
    turns: [5, 16],
  },
  // 11: Yêu tinh cung thủ — bắn từ vòng 4.
  {
    opening: [
      { kind: 'goblinArcher', counts: [1, 2] },
      { kind: 'goblin', counts: [2, 3] },
    ],
    spread: [4, 5],
    waves: [
      { kind: 'goblinArcher', counts: [1] },
      { kind: 'goblin', counts: [1, 2] },
    ],
    nextWaveAt: [1, 2],
    quest: { kind: 'goblinArcher', counts: [2, 3] },
    turns: [7, 15],
  },
  // 12: Dơi đêm — lượt chẵn vô hình.
  {
    opening: [
      { kind: 'bat', counts: [1, 2, 3] },
      { kind: 'goblin', counts: [2, 3, 4] },
    ],
    spread: [3, 4, 5],
    waves: [
      { kind: 'bat', counts: [1] },
      { kind: 'slime', counts: [2] },
    ],
    nextWaveAt: [1, 2],
    quest: { kind: 'bat', counts: [2, 3] },
    turns: [7, 15],
  },
  // 13: Yêu tinh + Sói tới từ hai phía.
  {
    splitOpposite: true,
    opening: [
      { kind: 'goblin', counts: [3, 4] },
      { kind: 'wolf', counts: [1, 2] },
    ],
    spread: [3],
    waves: [
      { kind: 'wolf', counts: [1] },
      { kind: 'goblin', counts: [2] },
    ],
    nextWaveAt: [2, 3],
    quest: { kind: 'goblin', counts: [4, 5, 6] },
    turns: [7, 15],
  },
  // 14: Cung thủ được Yêu tinh che chắn.
  {
    opening: [
      { kind: 'goblinArcher', counts: [2] },
      { kind: 'goblin', counts: [3, 4] },
    ],
    spread: [4, 5],
    waves: [
      { kind: 'goblinArcher', counts: [1] },
      { kind: 'goblin', counts: [1, 2] },
    ],
    nextWaveAt: [1, 2],
    quest: { kind: 'goblinArcher', counts: [3] },
    turns: [7, 15],
  },
  // 15: Dơi + Sói.
  {
    opening: [
      { kind: 'bat', counts: [2] },
      { kind: 'wolf', counts: [1, 2] },
      { kind: 'goblin', counts: [1, 2] },
    ],
    spread: [4, 5],
    waves: [
      { kind: 'wolf', counts: [1] },
      { kind: 'bat', counts: [1] },
    ],
    nextWaveAt: [1, 2],
    quest: { kind: 'wolf', counts: [2, 3] },
    turns: [7, 15],
  },
  // 16: trộn Yêu tinh, Cung thủ, Dơi.
  {
    opening: [
      { kind: 'goblin', counts: [3] },
      { kind: 'goblinArcher', counts: [1] },
      { kind: 'bat', counts: [1, 2] },
    ],
    spread: [4, 5],
    waves: [
      { kind: 'goblin', counts: [1, 2] },
      { kind: 'goblinArcher', counts: [1] },
      { kind: 'bat', counts: [1] },
    ],
    nextWaveAt: [2, 3],
    quest: { kind: 'goblin', counts: [4, 5] },
    turns: [7, 15],
  },
  // 17: bầy Sói hai phía.
  {
    splitOpposite: true,
    opening: [
      { kind: 'wolf', counts: [2, 3, 4] },
      { kind: 'goblin', counts: [2, 3, 4] },
    ],
    spread: [3],
    waves: [{ kind: 'wolf', counts: [2, 3] }],
    nextWaveAt: [1, 2, 3],
    quest: { kind: 'wolf', counts: [3, 4, 5] },
    turns: [5, 14],
  },
  // 18: Cung thủ + Dơi.
  {
    opening: [
      { kind: 'goblinArcher', counts: [2] },
      { kind: 'bat', counts: [2] },
      { kind: 'goblin', counts: [1, 2] },
    ],
    spread: [4, 5],
    waves: [
      { kind: 'goblinArcher', counts: [1] },
      { kind: 'bat', counts: [1] },
    ],
    nextWaveAt: [1, 2],
    quest: { kind: 'goblinArcher', counts: [3] },
    turns: [7, 15],
  },
  // 19: mọi loài rừng.
  {
    opening: [
      { kind: 'goblin', counts: [2] },
      { kind: 'wolf', counts: [1, 2] },
      { kind: 'goblinArcher', counts: [1, 2] },
      { kind: 'bat', counts: [1] },
    ],
    spread: [4, 5],
    waves: [
      { kind: 'wolf', counts: [1] },
      { kind: 'goblinArcher', counts: [1] },
      { kind: 'bat', counts: [1, 2] },
    ],
    nextWaveAt: [2, 3],
    quest: { kind: 'wolf', counts: [2, 3] },
    turns: [6, 15],
  },
  // 20: TRÙM CUỐI Người Cây cùng Sói và Cung thủ.
  {
    opening: [
      { kind: 'treant', counts: [1] },
      { kind: 'wolf', counts: [0, 1, 2] },
      { kind: 'goblinArcher', counts: [0, 1] },
    ],
    spread: [3, 4, 5],
    waves: [{ kind: 'goblin', counts: [0, 2, 3] }],
    nextWaveAt: [1, 2],
    quest: { kind: 'treant', counts: [1] },
    turns: [5, 16],
  },
];

export const FOREST_SPECS: LevelSpec[] = THEME.map((shape, level) => ({
  ...shape,
  turns: [shape.turns[0], Math.max(shape.turns[1], NOVICE_TURN_MAX[level] ?? 0)],
  target: target(level),
  ...(playerOf(level) === 'Người mới' ? { targetPlayer: 'Người mới' as const } : {}),
  ...(UPGRADES[level] ? { assumedUpgrades: UPGRADES[level] } : {}),
}));
