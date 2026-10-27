import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import { castSkill, createBattle, playTurn } from './battle';
import type {
  BattleConfig,
  BattleState,
  Monster,
  MonsterConfig,
  MonsterKind,
  WeaponConfig,
} from './battleTypes';

// Đợt 2 kế hoạch sau B6 (chủ dự án duyệt 27/10/2026 — "làm theo gợi ý của agent"): thêm 3 loại quái, mỗi
// loại một câu đố, khai báo bằng đặc tính trong cấu hình:
// - Slime Con: 1 máu, đánh nhẹ — chỉ là con số, không có luật riêng (làm "mồi" kéo dài combo).
// - Slime Lao (`step`): mỗi lần tiến thì lao nhiều vòng — phải hạ trước khi nó áp sát.
// - Slime Ma (`ghost`): vô hình ở lượt chẵn của màn — nhát chém và skill đi xuyên qua; canh đúng lượt.
//   (Lúc đầu chọn Slime Khiên — chỉ mất máu khi là con thứ ≥ n trong combo — nhưng hết "mồi" là màn kẹt,
//   không thắng được dù còn lượt; mô phỏng không bộ số nào đạt mục tiêu. Đổi sang ứng viên khác của kế hoạch.)
// Cấu hình riêng cho test: con số cố định để kỳ vọng tính tay được.

/** Một vũ khí với tới cả sân (vòng 0–5), rộng 3 lát, không đẩy, không chí mạng. */
const ALL_REACH: WeaponConfig = {
  name: 'Kiếm thử',
  slot: 'near',
  rangeLabel: 'cả sân',
  push: 'none',
  widthSectors: 3,
  minRing: 0,
  maxRing: 5,
  damage: 1,
};

const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  weapons: [ALL_REACH],
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
  levels: [{ turnLimit: 5, monsters: ['slime'], spread: 2 }],
};

const kindRule = (kind: MonsterKind, patch: Partial<MonsterConfig>): BattleConfig => ({
  ...CONFIG,
  monsterKinds: { ...CONFIG.monsterKinds, [kind]: { ...CONFIG.monsterKinds[kind], ...patch } },
});

const monster = (
  id: number,
  sector: number,
  ring: number,
  kind: MonsterKind = 'slime',
  hp = CONFIG.monsterKinds[kind].hp,
): Monster => ({ id, kind, sector, ring, hp });

function stateWith(monsters: Monster[], overrides: Partial<BattleState> = {}): BattleState {
  return {
    seed: 1,
    rng: seedRng(1),
    level: 0,
    turnsLeft: 5,
    heroHp: 5,
    loadout: { weapons: [0] },
    weaponIndex: 0,
    monsters,
    phase: 'playing',
    lossReason: null,
    lastAttack: null,
    skillCharge: 0,
    lastSkill: null,
    questProgress: 0,
    nextWave: 0,
    ...overrides,
  };
}

const byId = (state: BattleState, id: number) => state.monsters.find((m) => m.id === id);
/** Lát không trúng con nào (vùng rộng 3 lát quanh lát ngắm) trong các test dưới. */
const EMPTY_SECTOR = 18;

describe('Slime Lao — mỗi lần tiến lao `step` vòng', () => {
  it('tiến thì lao 2 vòng, giữ lát', () => {
    const after = playTurn(stateWith([monster(1, 3, 5, 'slimeCharger')]), EMPTY_SECTOR, CONFIG);
    expect(byId(after, 1)).toMatchObject({ sector: 3, ring: 3 });
  });

  it('không lao quá vòng 0', () => {
    const after = playTurn(stateWith([monster(1, 3, 1, 'slimeCharger')]), EMPTY_SECTOR, CONFIG);
    expect(byId(after, 1)).toMatchObject({ ring: 0 });
  });

  it('ô cách 2 vòng có quái thì chỉ tiến 1 vòng; ô ngay trước có quái thì đứng yên (không nhảy qua)', () => {
    const blockedFar = stateWith([monster(1, 3, 5, 'slimeCharger'), monster(2, 3, 3, 'slime')]);
    const far = playTurn(blockedFar, EMPTY_SECTOR, kindRule('slime', { advanceChance: 0 }));
    expect(byId(far, 1)).toMatchObject({ ring: 4 });

    const blockedNear = stateWith([monster(1, 3, 5, 'slimeCharger'), monster(2, 3, 4, 'slime')]);
    // Slime chặn đứng yên (bị đóng băng) để ô ngay trước Slime Lao vẫn có quái.
    const frozen = {
      ...blockedNear,
      monsters: blockedNear.monsters.map((m) => (m.id === 2 ? { ...m, frozenTurns: 2 } : m)),
    };
    expect(byId(playTurn(frozen, EMPTY_SECTOR, CONFIG), 1)).toMatchObject({ ring: 5 });
  });

  it('đi ngang vẫn chỉ 1 lát', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const before = stateWith([monster(1, 3, 5, 'slimeCharger')], { rng: seedRng(seed) });
      const after = playTurn(before, EMPTY_SECTOR, kindRule('slimeCharger', { advanceChance: 0 }));
      expect([2, 4]).toContain(byId(after, 1)?.sector);
      expect(byId(after, 1)?.ring).toBe(5);
    }
  });

  it('lao vào vòng 0 thì lượt sau mới đánh (như quái áp sát thường)', () => {
    const after = playTurn(stateWith([monster(1, 3, 2, 'slimeCharger')]), EMPTY_SECTOR, CONFIG);
    expect(after).toMatchObject({ heroHp: 5 });
    expect(byId(after, 1)?.ring).toBe(0);
  });
});

describe('Slime Ma — vô hình ở lượt chẵn', () => {
  // Màn thử 5 lượt: còn 5 lượt = nhát 1 (lẻ, thấy), còn 4 lượt = nhát 2 (chẵn, vô hình).
  it('lượt lẻ: chém trúng như quái thường', () => {
    const after = playTurn(stateWith([monster(1, 3, 5, 'slimeGhost')]), 3, CONFIG);
    expect(after.lastAttack?.hits).toEqual([{ monsterId: 1, damage: 1, killed: false }]);
  });

  it('lượt chẵn: nhát chém đi xuyên qua — không trúng, không mất máu, không tính vào combo', () => {
    const before = stateWith([monster(1, 3, 5, 'slimeGhost'), monster(2, 4, 5)], { turnsLeft: 4 });
    const after = playTurn(before, 3, CONFIG);
    // Slime là con duy nhất trúng nên ăn 1× (không phải 2× như khi ma cũng trúng).
    expect(after.lastAttack?.hits).toEqual([{ monsterId: 2, damage: 1, killed: false }]);
    expect(byId(after, 1)?.hp).toBe(2);
  });

  it('lượt chẵn: không bị đẩy (không trúng thì không đẩy)', () => {
    const pushing = { ...CONFIG, weapons: [{ ...ALL_REACH, push: 'out' as const }] };
    const before = stateWith([monster(1, 3, 2, 'slimeGhost')], { turnsLeft: 4 });
    const frozen = { ...before, monsters: before.monsters.map((m) => ({ ...m, frozenTurns: 2 })) };
    expect(byId(playTurn(frozen, 3, pushing), 1)).toMatchObject({ ring: 2 });
  });

  it('lượt chẵn: skill đi xuyên qua — không mất máu, không bị đóng băng', () => {
    const before = stateWith([monster(1, 3, 5, 'slimeGhost'), monster(2, 12, 5)], {
      turnsLeft: 4,
      loadout: { weapons: [0], skill: 'iceRain' },
      skillCharge: 2,
    });
    const after = castSkill(before, CONFIG);
    expect(byId(after, 1)).toEqual(monster(1, 3, 5, 'slimeGhost'));
    expect(byId(after, 2)).toMatchObject({ hp: 1, frozenTurns: 1 });
    expect(after.lastSkill?.hits).toEqual([{ monsterId: 2, damage: 1, killed: false }]);
  });

  it('vô hình vẫn đi và vẫn đánh khi áp sát', () => {
    const before = stateWith([monster(1, 3, 0, 'slimeGhost')], { turnsLeft: 4 });
    expect(playTurn(before, EMPTY_SECTOR, CONFIG).heroHp).toBe(4);
  });
});

describe('đặc tính quái sai bị từ chối lúc mở trận', () => {
  it.each<[string, BattleConfig]>([
    ['lao 0 vòng', kindRule('slimeCharger', { step: 0 })],
    ['lao số lẻ vòng', kindRule('slimeCharger', { step: 1.5 })],
  ])('%s', (_name, config) => {
    expect(() => createBattle(1, config, 0)).toThrow(RangeError);
  });
});
