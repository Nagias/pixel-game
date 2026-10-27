import { describe, expect, it } from 'vitest';
import type { BattleConfig, WeaponConfig } from '../src/features/battle/logic/battleTypes';
import { PLAYERS, type Player } from './simCore';
import {
  betterPick,
  deviation,
  pickTurns,
  tune,
  withinTolerance,
  type LevelPick,
  type TuneSetup,
} from './tuneCore';

// Cấu hình riêng cho test: một slime ở vòng ngoài, Cung với tới, không chí mạng, không đẩy — bot nhìn
// trước luôn hạ nó sau đúng `máu` nhát, nên lượt dư = số lượt − máu slime, thắng 100%.
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
    slime: { name: 'Slime thử', hp: 1, advanceChance: 0.6, attack: 1 },
    slimeKing: { name: 'Vua thử', hp: 6, advanceChance: 0.6, attack: 2 },
    slimeCannon: { name: 'Pháo thử', hp: 2, advanceChance: 0.6, attack: 1, shootRing: 4 },
    slimeMini: { name: 'Con thử', hp: 1, advanceChance: 0.6, attack: 1 },
    slimeCharger: { name: 'Lao thử', hp: 2, advanceChance: 0.6, attack: 1, step: 2 },
    slimeGhost: { name: 'Ma thử', hp: 2, advanceChance: 0.6, attack: 1, ghost: true },
  },
  hero: { hp: 5, healMinHits: 3, healAmount: 0 },
  critMultiplier: 2,
  skills: {
    iceRain: { name: 'Băng thử', damage: 1, freezeTurns: 1, chargeTurns: 2 },
    fireball: { name: 'Lửa thử', damage: 2, freezeTurns: 0, chargeTurns: 3 },
  },
  skillUnlockLevel: 1,
  levels: [{ turnLimit: 8, monsters: ['slime'], spread: 0 }],
};

const TOLERANCE = { winRate: 0.05, spareTurns: 0.5 };

const setup = (spareTurns: number, knobs: TuneSetup['knobs'] = []): TuneSetup => ({
  player: PLAYERS['Nhìn trước'] as Player,
  games: 20,
  turnRange: [2, 8],
  knobs,
  loadouts: () => [{ weapons: [0, 1, 2] }],
  targets: [{ winRate: 1, spareTurns }],
  tolerance: TOLERANCE,
});

const slimeHp = {
  name: 'máu slime',
  values: [1, 2],
  apply: (config: BattleConfig, hp: number): BattleConfig => ({
    ...config,
    monsterKinds: { ...config.monsterKinds, slime: { ...config.monsterKinds.slime, hp } },
  }),
};

describe('bộ dò số cân bằng (đợt 0)', () => {
  it('độ lệch tính bằng số lần dung sai, cộng tỉ lệ thắng và lượt dư', () => {
    const target = { winRate: 0.8, spareTurns: 1 };
    expect(deviation(target, target, TOLERANCE)).toBe(0);
    expect(deviation({ winRate: 0.85, spareTurns: 2 }, target, TOLERANCE)).toBeCloseTo(3);
  });

  it('trong dung sai khi cả hai phần không lệch quá dung sai', () => {
    const target = { winRate: 0.8, spareTurns: 1 };
    expect(withinTolerance({ winRate: 0.84, spareTurns: 1.4 }, target, TOLERANCE)).toBe(true);
    expect(withinTolerance({ winRate: 0.86, spareTurns: 1 }, target, TOLERANCE)).toBe(false);
    expect(withinTolerance({ winRate: 0.8, spareTurns: 1.6 }, target, TOLERANCE)).toBe(false);
  });

  it('chọn số lượt cho lượt dư đúng mục tiêu', () => {
    const pick = pickTurns(CONFIG, 0, setup(3));
    expect(pick.turnLimit).toBe(4);
    expect(pick.score).toBe(0);
  });

  it('hai số lượt lệch bằng nhau thì giữ số gần số hiện tại hơn', () => {
    // Mục tiêu dư 3,5: 4 lượt dư 3, 5 lượt dư 4 — lệch bằng nhau; hiện tại 8 lượt → chọn 5.
    expect(pickTurns(CONFIG, 0, setup(3.5)).turnLimit).toBe(5);
    const fewTurns: BattleConfig = {
      ...CONFIG,
      levels: [{ turnLimit: 2, monsters: ['slime'], spread: 0 }],
    };
    expect(pickTurns(fewTurns, 0, setup(3.5)).turnLimit).toBe(4);
  });

  it('mỗi tổ hợp núm vặn có số lượt riêng; tốt nhất đứng đầu; không sửa cấu hình gốc', () => {
    const before = JSON.stringify(CONFIG);
    const proposals = tune(CONFIG, setup(3, [slimeHp]));
    expect(proposals.map((p) => [p.knobs['máu slime'], p.levels[0]?.turnLimit])).toEqual([
      [1, 4],
      [2, 5],
    ]);
    expect(proposals[1]?.config.monsterKinds.slime.hp).toBe(2);
    expect(proposals[1]?.config.levels[0]?.turnLimit).toBe(5);
    expect(JSON.stringify(CONFIG)).toBe(before);
  });

  it('núm vặn riêng của màn được dò cùng số lượt của màn và áp vào đề xuất', () => {
    const local = { ...slimeHp, level: 0 };
    const proposals = tune(CONFIG, setup(4, [local]));
    expect(proposals).toHaveLength(1); // không nhân chéo như núm vặn chung
    // Dư 4: máu 1 cần 5 lượt, máu 2 cần 6 lượt — bằng điểm thì số lượt gần số hiện tại (8) hơn.
    expect(proposals[0]?.levels[0]).toMatchObject({ turnLimit: 6, knobs: { 'máu slime': 2 } });
    expect(proposals[0]?.config.monsterKinds.slime.hp).toBe(2);
    expect(proposals[0]?.config.levels[0]?.turnLimit).toBe(6);
  });

  it('đạt dung sai ở mọi bộ đồ thắng lệch ít hơn mà có bộ đồ không đạt', () => {
    // Tổng độ lệch nhỏ chưa chắc đạt: một bộ đồ lệch xa, bộ kia trúng mục tiêu vẫn có tổng nhỏ.
    const pick = (ok: boolean, score: number, turnLimit = 7): LevelPick => ({
      turnLimit,
      knobs: {},
      score,
      ok,
      results: [],
    });
    expect(betterPick(pick(true, 3), pick(false, 2), 7)).toBe(true);
    expect(betterPick(pick(false, 2), pick(true, 3), 7)).toBe(false);
    expect(betterPick(pick(true, 1), pick(true, 2), 7)).toBe(true);
    expect(betterPick(pick(true, 1, 6), pick(true, 1, 9), 7)).toBe(true);
    expect(betterPick(pick(false, 9), null, 7)).toBe(true);
  });

  // F11: núm vặn nhân chéo có thể sinh màn bất khả thi (nhiệm vụ cần nhiều quái hơn mọi đợt cộng lại) —
  // game từ chối cấu hình đó, bộ dò bỏ qua tổ hợp đó thay vì dừng cả lần dò.
  it('tổ hợp làm cấu hình sai bị bỏ qua; không còn tổ hợp nào hợp lệ thì báo lỗi', () => {
    const quest = (values: number[]) => ({
      name: 'nhiệm vụ',
      level: 0,
      values,
      apply: (config: BattleConfig, count: number): BattleConfig => ({
        ...config,
        levels: config.levels.map((l) => ({ ...l, quest: { kind: 'slime' as const, count } })),
      }),
    });
    const [proposal] = tune(CONFIG, setup(4, [quest([2, 1])]));
    expect(proposal?.levels[0]?.knobs).toEqual({ 'nhiệm vụ': 1 });
    expect(() => tune(CONFIG, setup(4, [quest([2, 3])]))).toThrow('Màn 1: không có tổ hợp');
  });

  it('màn không có mục tiêu thì báo lỗi rõ ràng', () => {
    expect(() => pickTurns(CONFIG, 0, { ...setup(3), targets: [] })).toThrow(
      'Màn 1 chưa có mục tiêu',
    );
  });
});
