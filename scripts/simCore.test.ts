import { describe, expect, it } from 'vitest';
import { nextFloat, seedRng } from '../src/shared/random';
import { bestMove, randomMove } from '../src/features/battle/logic/autoPlay';
import type { BattleConfig, BattleState, Monster } from '../src/features/battle/logic/battleTypes';
import {
  PLAYERS,
  simConfig,
  simulateLevel,
  targetPlayerFor,
  TARGET_PLAYER,
  type Player,
} from './simCore';

// F12: người chơi trung bình (bot Ngắm chuẩn — đo mục tiêu độ khó) biết câu đố Slime Ma: skill bấm lúc
// Ma vô hình thì đi xuyên qua, nên giữ skill tới lượt Ma hiện hình. Không biết điều này thì Mưa băng (đầy
// sau 3 nhát → hay bấm vào lượt chẵn) thua Cầu lửa (đầy sau 6 nhát → luôn bấm vào lượt lẻ) chỉ vì trùng nhịp.
const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  weapons: [
    {
      name: 'Kiếm thử',
      slot: 'near',
      rangeLabel: 'cả sân',
      push: 'none',
      widthSectors: 3,
      minRing: 0,
      maxRing: 5,
      damage: 1,
    },
  ],
  monsterKinds: {
    slime: { name: 'Slime thử', hp: 2, advanceChance: 1, attack: 1 },
    slimeKing: { name: 'Vua thử', hp: 6, advanceChance: 1, attack: 2 },
    slimeCannon: { name: 'Pháo thử', hp: 2, advanceChance: 1, attack: 1, shootRing: 4 },
    slimeMini: { name: 'Con thử', hp: 1, advanceChance: 1, attack: 1 },
    slimeCharger: { name: 'Lao thử', hp: 2, advanceChance: 1, attack: 1, step: 2 },
    slimeGhost: { name: 'Ma thử', hp: 2, advanceChance: 1, attack: 1, ghost: true },
    goblin: { name: 'Yêu tinh thử', hp: 4, advanceChance: 1, attack: 2 },
    wolf: { name: 'Sói thử', hp: 4, advanceChance: 1, attack: 3, step: 2 },
    goblinArcher: { name: 'Cung thủ thử', hp: 3, advanceChance: 1, attack: 2, shootRing: 4 },
    bat: { name: 'Dơi thử', hp: 3, advanceChance: 1, attack: 1, ghost: true },
    treant: { name: 'Cây thử', hp: 14, advanceChance: 1, attack: 5 },
  },
  hero: { hp: 5, healMinHits: 9, healAmount: 0 },
  critMultiplier: 2,
  skills: {
    iceRain: { name: 'Băng thử', damage: 1, freezeTurns: 1, chargeTurns: 2 },
    fireball: { name: 'Lửa thử', damage: 2, freezeTurns: 0, chargeTurns: 3 },
  },
  skillUnlockLevel: 0,
  levels: [{ turnLimit: 6, monsters: ['slimeGhost', 'slime'], spread: 2 }],
};

const monsters: Monster[] = [
  { id: 1, kind: 'slimeGhost', sector: 3, ring: 5, hp: 2 },
  { id: 2, kind: 'slime', sector: 12, ring: 5, hp: 2 },
];

const state = (turnsLeft: number, field: Monster[] = monsters): BattleState => ({
  seed: 1,
  rng: seedRng(1),
  level: 0,
  turnsLeft,
  heroHp: 5,
  loadout: { weapons: [0], skill: 'iceRain' },
  weaponIndex: 0,
  monsters: field,
  phase: 'playing',
  lossReason: null,
  lastAttack: null,
  skillCharge: 2,
  lastSkill: null,
  questProgress: 0,
  nextWave: 0,
  gold: 0,
});

describe('bot Ngắm chuẩn — giữ skill tới lượt Slime Ma hiện hình', () => {
  const player = PLAYERS['Ngắm chuẩn'] as Player;

  it('lượt chẵn (Ma vô hình): skill đầy mà vẫn giữ', () => {
    expect(player(state(5), seedRng(1), CONFIG)[0].cast).toBe(false);
  });

  it('lượt lẻ (Ma hiện hình): bấm ngay', () => {
    expect(player(state(6), seedRng(1), CONFIG)[0].cast).toBe(true);
  });

  it('sân không có Ma: bấm ngay như trước, lượt nào cũng vậy', () => {
    const noGhost = monsters.filter((m) => m.kind !== 'slimeGhost');
    expect(player(state(5, noGhost), seedRng(1), CONFIG)[0].cast).toBe(true);
  });
});

// Đợt 4: mục tiêu độ khó đo theo người chơi có mức nâng cấp dự kiến ở màn đó (`assumedUpgrades` của màn) —
// mô phỏng, bộ dò số và balance.test dùng chung simConfig.
describe('simConfig — cấu hình mô phỏng của màn cộng nâng cấp dự kiến', () => {
  it('màn có nâng cấp dự kiến: cộng vào cấu hình; màn không có: giữ nguyên', () => {
    const [plain] = CONFIG.levels;
    if (!plain) throw new Error('thiếu màn thử');
    const withAssumed: BattleConfig = {
      ...CONFIG,
      levels: [plain, { ...plain, assumedUpgrades: { hp: 1, heal: 2 } }],
    };
    expect(simConfig(withAssumed, 0)).toBe(withAssumed);
    expect(simConfig(withAssumed, 1).hero).toMatchObject({ hp: 7, healAmount: 2 });
  });
});

// Chủ dự án duyệt 28/10/2026 (trả DEBT-012): người thật không chém chuẩn mọi nhát như bot "Ngắm chuẩn". Bot
// "Người mới" — nửa nhát chém chuẩn, nửa chém bừa (hụt nhịp, chọn sai lát) — đo mục tiêu độ khó màn đầu.
describe('bot Người mới — nửa chém chuẩn, nửa chém bừa', () => {
  const novice = PLAYERS['Người mới'] as Player;
  const noGhost = monsters.filter((m) => m.kind !== 'slimeGhost');
  const fresh = { ...state(6, noGhost), skillCharge: 0 };

  it('mỗi nhát tung một số: dưới 50% thì chém như bot chuẩn, còn lại chém bừa', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = seedRng(seed);
      const [roll, next] = nextFloat(rng);
      const [{ move }] = novice(fresh, rng, CONFIG);
      const expected = roll < 0.5 ? bestMove(fresh, CONFIG) : randomMove(fresh, next, CONFIG)[0];
      expect(move).toEqual(expected);
    }
  });

  it('skill đầy thì bấm ngay (không biết canh Slime Ma)', () => {
    expect(novice(state(5), seedRng(1), CONFIG)[0].cast).toBe(true);
  });

  it('giỏi hơn chém bừa, kém hơn ngắm chuẩn (100 ván)', () => {
    const level = CONFIG.levels[0];
    if (!level) throw new Error('thiếu màn thử');
    const config: BattleConfig = {
      ...CONFIG,
      levels: [{ turnLimit: 9, monsters: ['slime', 'slime', 'slime', 'slime'], spread: 3 }],
    };
    const won = (name: string) =>
      simulateLevel(0, { weapons: [0] }, PLAYERS[name] as Player, config, 100).won;
    expect(won('Người mới')).toBeGreaterThan(won('Chém bừa'));
    expect(won('Người mới')).toBeLessThan(won('Ngắm chuẩn'));
  });
});

describe('bot đo mục tiêu của từng màn', () => {
  it('màn ghi `targetPlayer` thì đo bằng bot đó; không ghi thì bot mặc định', () => {
    const [plain] = CONFIG.levels;
    if (!plain) throw new Error('thiếu màn thử');
    const config: BattleConfig = {
      ...CONFIG,
      levels: [plain, { ...plain, targetPlayer: 'Người mới' }],
    };
    expect(targetPlayerFor(0, config)).toBe(PLAYERS[TARGET_PLAYER]);
    expect(targetPlayerFor(1, config)).toBe(PLAYERS['Người mới']);
  });
});
