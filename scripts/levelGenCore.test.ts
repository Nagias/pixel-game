import { describe, expect, it } from 'vitest';
import type { BattleConfig, WeaponConfig } from '../src/features/battle/logic/battleTypes';
import { generateLevel, specCombinations, type LevelSpec } from './levelGenCore';
import { PLAYERS, type Player } from './simCore';

// Bộ sinh màn (đợt 7, chủ dự án duyệt 27/10/2026): mô tả màn bằng "bản mô tả" (loài + khoảng số lượng, đợt
// sau, nhiệm vụ, khoảng số lượt, mục tiêu độ khó) → máy thử mọi tổ hợp, giữ tổ hợp đạt mục tiêu và lệch ít
// nhất. Cấu hình riêng cho test: một slime 1 máu ở vòng ngoài, Cung với tới — bot luôn hạ nó sau đúng 1
// nhát mỗi con, nên lượt dư = số lượt − số slime phải hạ.

const weapon = (name: string, slot: WeaponConfig['slot'], minRing: number, maxRing: number) =>
  ({
    name,
    slot,
    rangeLabel: name,
    push: 'none',
    widthSectors: 1,
    minRing,
    maxRing,
    damage: 1,
  }) satisfies WeaponConfig;

const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  weapons: [weapon('Kiếm', 'near', 0, 1), weapon('Giáo', 'mid', 2, 3), weapon('Cung', 'far', 4, 5)],
  monsterKinds: {
    slime: { name: 'Slime thử', hp: 1, advanceChance: 0, attack: 1 },
    slimeKing: { name: 'Vua thử', hp: 6, advanceChance: 0, attack: 2 },
    slimeCannon: { name: 'Pháo thử', hp: 2, advanceChance: 0, attack: 1, shootRing: 4 },
    slimeMini: { name: 'Con thử', hp: 1, advanceChance: 0, attack: 1 },
    slimeCharger: { name: 'Lao thử', hp: 2, advanceChance: 0, attack: 1, step: 2 },
    slimeGhost: { name: 'Ma thử', hp: 2, advanceChance: 0, attack: 1, ghost: true },
    goblin: { name: 'Yêu tinh thử', hp: 4, advanceChance: 0, attack: 2 },
    wolf: { name: 'Sói thử', hp: 4, advanceChance: 0, attack: 3, step: 2 },
    goblinArcher: { name: 'Cung thủ thử', hp: 3, advanceChance: 0, attack: 2, shootRing: 4 },
    bat: { name: 'Dơi thử', hp: 3, advanceChance: 0, attack: 1, ghost: true },
    treant: { name: 'Cây thử', hp: 14, advanceChance: 0, attack: 5 },
  },
  hero: { hp: 5, healMinHits: 9, healAmount: 0 },
  critMultiplier: 2,
  skills: {
    iceRain: { name: 'Băng thử', damage: 1, freezeTurns: 1, chargeTurns: 2 },
    fireball: { name: 'Lửa thử', damage: 2, freezeTurns: 0, chargeTurns: 3 },
  },
  skillUnlockLevel: 5,
  levels: [{ turnLimit: 8, monsters: ['slime'], spread: 0 }],
};

const TOLERANCE = {
  mean: { winRate: 0.05, spareTurns: 0.5 },
  perLoadout: { winRate: 0.05, spareTurns: 0.5 },
};
const setup = { player: PLAYERS['Nhìn trước'] as Player, games: 10, tolerance: TOLERANCE };

const SPEC: LevelSpec = {
  target: { winRate: 1, spareTurns: 3 },
  opening: [{ kind: 'slime', counts: [1, 2] }],
  spread: [1],
  quest: { kind: 'slime', counts: [2, 3] },
  waves: [{ kind: 'slime', counts: [1] }],
  nextWaveAt: [0],
  turns: [2, 8],
};

describe('bộ sinh màn', () => {
  it('liệt kê đủ tổ hợp của bản mô tả (đội hình × cụm × đợt × ngưỡng × nhiệm vụ)', () => {
    const combos = specCombinations(SPEC);
    expect(combos).toHaveLength(2 * 2);
    expect(combos[0]).toMatchObject({
      monsters: ['slime'],
      spread: 1,
      waves: [['slime']],
      nextWaveAt: 0,
      quest: { kind: 'slime', count: 2 },
    });
  });

  it('chọn tổ hợp + số lượt trúng mục tiêu; bỏ qua tổ hợp game từ chối (nhiệm vụ nhiều hơn số quái)', () => {
    const picked = generateLevel(CONFIG, 0, SPEC, setup);
    expect(picked.ok).toBe(true);
    // Mở màn 1 slime + đợt 1 slime = 2 con: nhiệm vụ 3 bị từ chối. Hạ 2 con, dư 3 → 5 lượt.
    expect(picked.level).toMatchObject({ monsters: ['slime'], quest: { count: 2 }, turnLimit: 5 });
    expect(picked.level.target).toEqual(SPEC.target);
  });

  it('giữ mục tiêu, bot đo, nâng cấp dự kiến và hai phía của bản mô tả trong màn sinh ra', () => {
    const spec: LevelSpec = {
      ...SPEC,
      assumedUpgrades: { hp: 1 },
      splitOpposite: true,
      spread: [2],
      targetPlayer: 'Người mới',
    };
    const picked = generateLevel(CONFIG, 0, spec, setup);
    expect(picked.level).toMatchObject({
      assumedUpgrades: { hp: 1 },
      splitOpposite: true,
      targetPlayer: 'Người mới',
    });
  });

  // Chủ dự án duyệt % thắng theo răng cưa; lượt dư mục tiêu suy từ công thức thì mâu thuẫn với cách màn
  // chạy (màn trùm ngắn: trùm chết nhanh hoặc không chết). Chế độ chỉ khớp % thắng ghi lượt dư mục tiêu
  // bằng số đo của màn sinh ra (làm tròn 0,25) — test cân bằng vẫn canh được nếu số bị lệch về sau.
  it('chỉ khớp % thắng: bỏ qua lượt dư khi chọn, ghi lượt dư mục tiêu bằng số đo (làm tròn 0,25)', () => {
    const spec: LevelSpec = { ...SPEC, target: { winRate: 1, spareTurns: 0 } };
    const picked = generateLevel(CONFIG, 0, spec, { ...setup, matchWinOnly: true });
    expect(picked.ok).toBe(true);
    // Thắng 100% ở mọi số lượt đủ hạ 2 con; ít lượt nhất thì dư 0 — chọn lượt sớm nhất trong các lựa
    // chọn ngang điểm, lượt dư ghi lại đúng số đo.
    expect(picked.level.turnLimit).toBe(2);
    expect(picked.level.target).toEqual({ winRate: 1, spareTurns: 0 });
    const roomy = generateLevel(
      CONFIG,
      0,
      { ...spec, turns: [5, 5] },
      { ...setup, matchWinOnly: true },
    );
    expect(roomy.level.target).toEqual({ winRate: 1, spareTurns: 3 });
  });

  it('không có tổ hợp hợp lệ nào thì báo lỗi rõ ràng', () => {
    const impossible: LevelSpec = { ...SPEC, quest: { kind: 'slime', counts: [9] } };
    expect(() => generateLevel(CONFIG, 0, impossible, setup)).toThrow('không có tổ hợp');
  });
});
