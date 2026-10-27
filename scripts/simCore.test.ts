import { describe, expect, it } from 'vitest';
import { seedRng } from '../src/shared/random';
import type { BattleConfig, BattleState, Monster } from '../src/features/battle/logic/battleTypes';
import { PLAYERS, type Player } from './simCore';

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
