import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import { bestMove, hitIds, lookaheadTurn, missMove, randomMove } from './autoPlay';
import type { BattleConfig, BattleState, Monster, WeaponConfig } from './battleTypes';

// Cấu hình riêng cho test (không phụ thuộc battleConfig.ts): 3 vũ khí theo tầm như F02.
const weapon = (
  name: string,
  slot: WeaponConfig['slot'],
  widthSectors: number,
  minRing: number,
  maxRing: number,
) =>
  ({
    name,
    slot,
    rangeLabel: name,
    push: 'none',
    widthSectors,
    minRing,
    maxRing,
    damage: 1,
  }) satisfies WeaponConfig;

const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  weapons: [
    weapon('Kiếm', 'near', 5, 0, 1),
    weapon('Giáo', 'mid', 3, 2, 3),
    weapon('Cung', 'far', 1, 4, 5),
  ],
  monsterKinds: {
    slime: { name: 'Slime thử', hp: 2, advanceChance: 0.6, attack: 1 },
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
  skillUnlockLevel: 0,
  levels: [{ turnLimit: 8, monsters: ['slime'], spread: 2 }],
};

const monster = (id: number, sector: number, ring: number): Monster => ({
  id,
  kind: 'slime',
  sector,
  ring,
  hp: 2,
});

function stateWith(monsters: Monster[], weaponIndex = 0, weapons = [0, 1, 2]): BattleState {
  return {
    seed: 1,
    rng: seedRng(1),
    level: 0,
    turnsLeft: 8,
    heroHp: 5,
    loadout: { weapons },
    weaponIndex,
    monsters,
    phase: 'playing',
    lossReason: null,
    lastAttack: null,
    skillCharge: 0,
    lastSkill: null,
    questProgress: 0,
    nextWave: 0,
    gold: 0,
  };
}

describe('bot chơi thử — dùng chung cho E2E và mô phỏng cân bằng', () => {
  it('hitIds: quái nằm trong vùng của vũ khí khi chém vào lát đó', () => {
    const state = stateWith([monster(1, 10, 1), monster(2, 12, 1), monster(3, 10, 4)]);
    expect(hitIds(state, { weaponIndex: 0, sector: 11 }, CONFIG)).toEqual([1, 2]);
    expect(hitIds(state, { weaponIndex: 2, sector: 10 }, CONFIG)).toEqual([3]);
  });

  it('ngắm chuẩn: chọn vũ khí + lát trúng nhiều quái nhất (bằng nhau thì lát nhỏ nhất)', () => {
    const state = stateWith([
      monster(1, 10, 1),
      monster(2, 11, 1),
      monster(3, 12, 1),
      monster(4, 3, 5), // Cung chỉ trúng được 1 con
    ]);
    expect(bestMove(state, CONFIG)).toEqual({ weaponIndex: 0, sector: 10 });
  });

  it('ngắm chuẩn: trúng bằng nhau thì chém con ở gần nhân vật hơn', () => {
    const state = stateWith([monster(1, 15, 5), monster(2, 5, 1)]);
    const move = bestMove(state, CONFIG);
    expect(move.weaponIndex).toBe(0);
    expect(hitIds(state, move, CONFIG)).toEqual([2]);
  });

  it('chém trượt: lát không trúng con nào, ưu tiên vũ khí đang cầm', () => {
    const state = stateWith([monster(1, 0, 4), monster(2, 12, 2)], 2);
    const move = missMove(state, CONFIG);
    expect(move.weaponIndex).toBe(2);
    expect(hitIds(state, move, CONFIG)).toEqual([]);
  });

  it('chém bừa: cùng trạng thái ngẫu nhiên → cùng nước đi, nằm trong giới hạn', () => {
    const rng = seedRng(7);
    const state = stateWith([monster(1, 0, 4)]);
    const [first, next] = randomMove(state, rng, CONFIG);
    expect(randomMove(state, rng, CONFIG)).toEqual([first, next]);
    expect(next).not.toBe(rng);
    expect(first.weaponIndex).toBeGreaterThanOrEqual(0);
    expect(first.weaponIndex).toBeLessThan(CONFIG.weapons.length);
    expect(first.sector).toBeGreaterThanOrEqual(0);
    expect(first.sector).toBeLessThan(CONFIG.sectorCount);
  });

  // B3 (chủ dự án duyệt 26/10/2026): người chơi giỏi ưu tiên chém quái bắn đang có "!" — để hạ hoặc
  // làm nó choáng — trước cả nhát trúng nhiều quái hơn.
  it('ngắm chuẩn: có quái bắn đang "!" thì ưu tiên chém trúng nó', () => {
    const withShooter: BattleConfig = {
      ...CONFIG,
      monsterKinds: {
        ...CONFIG.monsterKinds,
        slimeKing: { ...CONFIG.monsterKinds.slimeKing, shootRing: 4 },
      },
    };
    const cannon: Monster = { id: 3, kind: 'slimeKing', sector: 3, ring: 4, hp: 6 };
    const state = stateWith([monster(1, 10, 1), monster(2, 11, 1), cannon]);
    expect(bestMove(state, CONFIG).weaponIndex).toBe(0); // không có quái bắn: Kiếm trúng 2 con
    const move = bestMove(state, withShooter);
    expect(hitIds(state, move, withShooter)).toContain(3);
  });

  // F11: người chơi nhắm vào quái của nhiệm vụ trước nhát trúng nhiều quái hơn (sau quái bắn đang "!").
  it('ngắm chuẩn: ưu tiên chém trúng quái nhiệm vụ hơn trúng nhiều quái', () => {
    const withQuest: BattleConfig = {
      ...CONFIG,
      levels: [
        {
          turnLimit: 8,
          monsters: ['slime', 'slime', 'slimeKing'],
          spread: 2,
          quest: { kind: 'slimeKing', count: 1 },
        },
      ],
    };
    const king: Monster = { id: 3, kind: 'slimeKing', sector: 3, ring: 4, hp: 6 };
    const state = stateWith([monster(1, 10, 1), monster(2, 11, 1), king]);
    expect(bestMove(state, CONFIG).weaponIndex).toBe(0); // không có nhiệm vụ: Kiếm trúng 2 con
    expect(hitIds(state, bestMove(state, withQuest), withQuest)).toEqual([3]);
  });

  // F12: quái ma vô hình ở lượt chẵn — chém vào nó lúc đó là chém vào không khí.
  it('ngắm chuẩn: lượt chẵn không tính quái ma là trúng; lượt lẻ thì có', () => {
    const ghost: Monster = { id: 1, kind: 'slimeGhost', sector: 10, ring: 1, hp: 2 };
    // Kiếm (rộng 5): quanh lát 10 trúng ma + 1 slime; quanh lát 21 trúng 2 slime.
    const monsters = [ghost, monster(2, 11, 1), monster(3, 20, 1), monster(4, 21, 1)];
    const odd = stateWith(monsters); // 8/8 lượt: nhát sắp tới là nhát 1
    expect(hitIds(odd, bestMove(odd, CONFIG), CONFIG)).toEqual([1, 2]);
    const even = { ...odd, turnsLeft: 7 }; // nhát 2
    expect(hitIds(even, { weaponIndex: 0, sector: 10 }, CONFIG)).toEqual([2]);
    expect(hitIds(even, bestMove(even, CONFIG), CONFIG)).toEqual([3, 4]);
  });

  it('ngắm chuẩn: quái bắn chưa tới vòng bắn (chưa "!") thì không được ưu tiên', () => {
    const withShooter: BattleConfig = {
      ...CONFIG,
      monsterKinds: {
        ...CONFIG.monsterKinds,
        slimeKing: { ...CONFIG.monsterKinds.slimeKing, shootRing: 3 },
      },
    };
    const far: Monster = { id: 3, kind: 'slimeKing', sector: 3, ring: 4, hp: 6 };
    const state = stateWith([monster(1, 10, 1), monster(2, 11, 1), far]);
    expect(bestMove(state, withShooter)).toEqual(bestMove(state, CONFIG));
  });

  // B6: quái bắn đang bị đóng băng lượt tới không bắn — không cần ưu tiên nó.
  it('ngắm chuẩn: quái bắn đang bị đóng băng thì không được ưu tiên', () => {
    const withShooter: BattleConfig = {
      ...CONFIG,
      monsterKinds: {
        ...CONFIG.monsterKinds,
        slimeKing: { ...CONFIG.monsterKinds.slimeKing, shootRing: 4 },
      },
    };
    const frozen: Monster = { id: 3, kind: 'slimeKing', sector: 3, ring: 4, hp: 6, frozenTurns: 1 };
    const state = stateWith([monster(1, 10, 1), monster(2, 11, 1), frozen]);
    expect(bestMove(state, withShooter)).toEqual(bestMove(state, CONFIG));
    expect(hitIds(state, bestMove(state, withShooter), withShooter)).not.toContain(3);
  });

  // B4: bot chỉ dùng vũ khí đã mang vào trận — nếu không, E2E chạm nút không có và số mô phỏng sai.
  it('ngắm chuẩn, chém trượt, chém bừa chỉ dùng vũ khí đã mang', () => {
    // Cụm 3 con sát người: Kiếm (không mang) trúng cả 3; chỉ mang Giáo + Cung.
    const state = stateWith([monster(1, 10, 1), monster(2, 11, 1), monster(3, 12, 1)], 1, [1, 2]);
    expect([1, 2]).toContain(bestMove(state, CONFIG).weaponIndex);
    expect([1, 2]).toContain(missMove(state, CONFIG).weaponIndex);
    let rng = seedRng(3);
    for (let i = 0; i < 50; i++) {
      const [move, next] = randomMove(state, rng, CONFIG);
      expect([1, 2]).toContain(move.weaponIndex);
      rng = next;
    }
  });

  it('không sửa trạng thái đầu vào', () => {
    const state = stateWith([monster(1, 10, 1), monster(2, 3, 5)]);
    const before = JSON.stringify(state);
    bestMove(state, CONFIG);
    missMove(state, CONFIG);
    lookaheadTurn(state, seedRng(5), CONFIG);
    expect(JSON.stringify(state)).toBe(before);
  });
});

// Đợt 0 (chủ dự án duyệt 27/10/2026): bot "nhìn trước 1 lượt" — mục tiêu độ khó đo bằng bot này.
describe('bot nhìn trước 1 lượt', () => {
  const withHp = (m: Monster, hp: number): Monster => ({ ...m, hp });

  it('đổi vũ khí để hạ con cuối cùng — thắng ngay', () => {
    const state = stateWith([withHp(monster(1, 7, 5), 1)]);
    const [plan] = lookaheadTurn(state, seedRng(1), CONFIG);
    expect(plan).toEqual({ cast: false, move: { weaponIndex: 2, sector: 7 } });
  });

  it('hạ con sắp đánh chết người thay vì chém trúng nhiều con (bot ngắm chuẩn thì thua)', () => {
    const state = {
      ...stateWith([
        withHp(monster(1, 10, 1), 5),
        withHp(monster(2, 11, 1), 5),
        withHp(monster(3, 20, 0), 1),
      ]),
      heroHp: 1,
    };
    expect(hitIds(state, bestMove(state, CONFIG), CONFIG)).toEqual([1, 2]);
    const [plan] = lookaheadTurn(state, seedRng(1), CONFIG);
    expect(hitIds(state, plan.move, CONFIG)).toEqual([3]);
  });

  // F11: giết con cuối làm đợt kế tràn vào (máu quái trên sân tăng) — bot vẫn phải giết, vì việc còn
  // phải làm cho màn giảm đi.
  it('hạ con cuối dù đợt kế sẽ tràn vào', () => {
    const withWaves: BattleConfig = {
      ...CONFIG,
      levels: [
        { turnLimit: 8, monsters: ['slime'], spread: 2, waves: [['slime', 'slime', 'slime']] },
      ],
    };
    const state = stateWith([withHp(monster(1, 7, 5), 1)]);
    const [plan] = lookaheadTurn(state, seedRng(1), withWaves);
    expect(hitIds(state, plan.move, withWaves)).toEqual([1]);
  });

  // F11: quái nhiệm vụ còn thiếu chỉ tới cùng đợt sau, mà đợt sau chỉ ra khi sân còn ít quái — phải dọn
  // quái khác để gọi đợt đó (lỗi gặp ở màn 5: bot chỉ nhắm Slime Pháo, Pháo thứ hai không bao giờ ra).
  it('nhiệm vụ cần quái của đợt sau: dọn quái trên sân để đợt đó ra', () => {
    const withGate: BattleConfig = {
      ...CONFIG,
      levels: [
        {
          turnLimit: 8,
          monsters: ['slime', 'slime'],
          spread: 2,
          waves: [['slimeCannon']],
          nextWaveAt: 1,
          quest: { kind: 'slimeCannon', count: 1 },
        },
      ],
    };
    const state = stateWith([withHp(monster(1, 7, 5), 1), withHp(monster(2, 15, 5), 1)]);
    const [plan] = lookaheadTurn(state, seedRng(1), withGate);
    expect(hitIds(state, plan.move, withGate)).toHaveLength(1);
  });

  it('nhiệm vụ giết trùm: dồn đòn vào trùm thay vì chém trúng nhiều slime', () => {
    const withQuest: BattleConfig = {
      ...CONFIG,
      levels: [
        {
          turnLimit: 8,
          monsters: ['slime', 'slime', 'slimeKing'],
          spread: 2,
          quest: { kind: 'slimeKing', count: 1 },
        },
      ],
    };
    const king: Monster = { id: 3, kind: 'slimeKing', sector: 3, ring: 4, hp: 6 };
    const state = stateWith([withHp(monster(1, 10, 3), 1), withHp(monster(2, 11, 3), 1), king]);
    const [plan] = lookaheadTurn(state, seedRng(1), withQuest);
    expect(hitIds(state, plan.move, withQuest)).toEqual([3]);
  });

  it('bấm skill khi skill hạ hết quái — thắng không tốn lượt', () => {
    const state = {
      ...stateWith([monster(1, 0, 5), monster(2, 12, 3)]),
      loadout: { weapons: [0, 1, 2], skill: 'fireball' as const },
      skillCharge: 3,
    };
    expect(lookaheadTurn(state, seedRng(1), CONFIG)[0].cast).toBe(true);
  });

  it('chưa đầy hoặc không mang skill thì không bấm', () => {
    const notFull = {
      ...stateWith([monster(1, 0, 5), monster(2, 12, 3)]),
      loadout: { weapons: [0, 1, 2], skill: 'fireball' as const },
      skillCharge: 2,
    };
    expect(lookaheadTurn(notFull, seedRng(1), CONFIG)[0].cast).toBe(false);
    const none = stateWith([monster(1, 0, 5)]);
    expect(lookaheadTurn(none, seedRng(1), CONFIG)[0].cast).toBe(false);
  });

  it('không nhìn trộm ngẫu nhiên của trận: đổi rng của trận không đổi nước đi', () => {
    const monsters = [monster(1, 10, 1), monster(2, 11, 2), monster(3, 3, 5), monster(4, 4, 4)];
    const a = lookaheadTurn({ ...stateWith(monsters), rng: seedRng(1) }, seedRng(9), CONFIG);
    const b = lookaheadTurn({ ...stateWith(monsters), rng: seedRng(424_242) }, seedRng(9), CONFIG);
    expect(a).toEqual(b);
  });

  it('cùng ngẫu nhiên của người chơi → cùng nước đi; ngẫu nhiên đi tiếp; chỉ dùng vũ khí đã mang', () => {
    const state = stateWith([monster(1, 10, 1), monster(2, 11, 1), monster(3, 12, 1)], 1, [1, 2]);
    const first = lookaheadTurn(state, seedRng(3), CONFIG);
    expect(lookaheadTurn(state, seedRng(3), CONFIG)).toEqual(first);
    expect(first[1]).not.toBe(seedRng(3));
    expect([1, 2]).toContain(first[0].move.weaponIndex);
  });
});
