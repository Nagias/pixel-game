import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import { createBattle, playTurn } from './battle';
import { BATTLE_CONFIG } from './battleConfig';
import type { BattleConfig, BattleState, Monster, WeaponConfig } from './battleTypes';
import { defaultLoadout, describeWeapon, fromSavedLoadout, ownedWeapons } from './loadout';

// F19 PR A (chủ dự án duyệt 03/11/2026, mục 3): ba vũ khí mới, mỗi món một cách đánh.
// - Búa (tầm gần): hẹp, 2 sát thương, quái trúng mà còn sống bị choáng 1 lượt (đứng im, không đánh).
// - Lưỡi hái (tầm vừa): quét rộng, kéo quái ở hai mép vào giữa — dời 1 lát về phía lát giữa.
// - Nỏ (tầm xa): một lát, vòng 2–5 — xuyên cả hàng.
// Mở bản Thường khi thắng màn mốc (`unlockAfterLevel`); có món ở dạng rơi (vĩnh viễn hoặc còn hạn) cũng là có.

const weapon = (name: string, patch: Partial<WeaponConfig>): WeaponConfig => ({
  name,
  slot: 'near',
  rangeLabel: name,
  push: 'none',
  widthSectors: 1,
  minRing: 0,
  maxRing: 1,
  damage: 1,
  ...patch,
});

const SWORD = weapon('Kiếm thử', { widthSectors: 5 });
const SPEAR = weapon('Giáo thử', { slot: 'mid', minRing: 2, maxRing: 3, widthSectors: 3 });
const BOW = weapon('Cung thử', { slot: 'far', minRing: 4, maxRing: 5 });
const HAMMER = weapon('Búa thử', { damage: 2, stunTurns: 1, unlockAfterLevel: 1 });
// Lưỡi hái thử đánh vòng 0–1 (game thật: vòng 2–3): quái áp sát (vòng 0) không tự đi, nên thấy đúng phần bị kéo.
const SCYTHE = weapon('Lưỡi hái thử', {
  slot: 'mid',
  widthSectors: 5,
  push: 'gather',
  unlockAfterLevel: 2,
});
const CROSSBOW = weapon('Nỏ thử', { slot: 'far', minRing: 2, maxRing: 5 });

const CONFIG: BattleConfig = {
  sectorCount: 24,
  ringCount: 6,
  arcPeriodMs: 2_400,
  weapons: [SWORD, SPEAR, BOW, HAMMER, SCYTHE, CROSSBOW],
  monsterKinds: {
    // Quái đứng yên (tiến 0%, đi ngang 0 lát vì bị chặn hai bên trong các test cần) — dễ tính tay.
    slime: { name: 'Slime thử', hp: 5, advanceChance: 1, attack: 1 },
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
    mushroom: { name: 'Nấm thử', hp: 2, advanceChance: 1, attack: 1, explode: 2 },
    goblinShaman: { name: 'Pháp sư thử', hp: 3, advanceChance: 1, attack: 1, shieldAllies: true },
    spiderNest: { name: 'Tổ thử', hp: 5, advanceChance: 0, attack: 1, stationary: true },
    spiderling: { name: 'Nhện thử', hp: 1, advanceChance: 1, attack: 1 },
    turtle: { name: 'Rùa thử', hp: 5, advanceChance: 1, attack: 2, thorns: 1 },
  },
  hero: { hp: 10, healMinHits: 9, healAmount: 0 },
  critMultiplier: 2,
  skills: {
    iceRain: { name: 'Băng thử', damage: 1, freezeTurns: 1, chargeTurns: 2 },
    fireball: { name: 'Lửa thử', damage: 2, freezeTurns: 0, chargeTurns: 3 },
  },
  skillUnlockLevel: 0,
  levels: [
    { turnLimit: 9, monsters: ['slime'], spread: 2 },
    { turnLimit: 9, monsters: ['slime'], spread: 2 },
    { turnLimit: 9, monsters: ['slime'], spread: 2 },
    { turnLimit: 9, monsters: ['slime'], spread: 2 },
  ],
};

const SWORD_I = 0;
const HAMMER_I = 3;
const SCYTHE_I = 4;
const CROSSBOW_I = 5;

const monster = (id: number, sector: number, ring: number, hp = 5): Monster => ({
  id,
  kind: 'slime',
  sector,
  ring,
  hp,
});

function stateWith(monsters: Monster[], weaponIndex: number): BattleState {
  return {
    seed: 1,
    rng: seedRng(1),
    level: 0,
    turnsLeft: 9,
    heroHp: 10,
    loadout: { weapons: [SWORD_I, SCYTHE_I, CROSSBOW_I] },
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

const withHammer = (state: BattleState): BattleState => ({
  ...state,
  loadout: { weapons: [HAMMER_I, SCYTHE_I, CROSSBOW_I] },
});

const byId = (state: BattleState, id: number) => state.monsters.find((m) => m.id === id);

describe('Lưỡi hái — kéo quái ở hai mép vùng đánh vào giữa 1 lát', () => {
  const play = (monsters: Monster[], aim: number) =>
    playTurn(stateWith(monsters, SCYTHE_I), aim, CONFIG);

  it('quái lệch trái lát giữa dời sang phải 1 lát, lệch phải dời sang trái 1 lát', () => {
    const after = play([monster(1, 8, 0), monster(2, 12, 0)], 10);
    expect(byId(after, 1)).toMatchObject({ sector: 9, ring: 0 });
    expect(byId(after, 2)).toMatchObject({ sector: 11, ring: 0 });
  });

  it('quái ở lát giữa đứng nguyên; quái kề lát giữa mà lát giữa có quái thì đứng yên (không chồng ô)', () => {
    const after = play([monster(1, 10, 0), monster(2, 9, 0)], 10);
    expect(byId(after, 1)).toMatchObject({ sector: 10, ring: 0 });
    expect(byId(after, 2)).toMatchObject({ sector: 9, ring: 0 });
  });

  it('hai con hai bên cùng tới lát giữa đang trống: con đứng trước trong combo vào trước, con kia đứng yên', () => {
    const after = play([monster(1, 9, 0, 4), monster(2, 11, 0, 5)], 10);
    expect(byId(after, 1)).toMatchObject({ sector: 10, ring: 0 });
    expect(byId(after, 2)).toMatchObject({ sector: 11, ring: 0 });
  });

  it('quấn qua lát 0: ngắm lát 0 thì quái ở lát 22 dời sang 23, lát 2 dời sang 1', () => {
    const after = play([monster(1, 22, 0), monster(2, 2, 0)], 0);
    expect(byId(after, 1)).toMatchObject({ sector: 23 });
    expect(byId(after, 2)).toMatchObject({ sector: 1 });
  });

  it('quái bị kéo đứng yên lượt đó (không tiến vào), quái ngoài vùng vẫn đi như thường', () => {
    const after = play([monster(1, 8, 1), monster(2, 20, 4)], 10);
    expect(byId(after, 1)).toMatchObject({ sector: 9, ring: 1 });
    expect(byId(after, 2)).toMatchObject({ sector: 20, ring: 3 });
  });
});

describe('Búa — quái trúng mà còn sống bị choáng 1 lượt', () => {
  it('2 sát thương; con áp sát bị choáng không đánh lượt đó, lượt sau đánh lại', () => {
    const start = withHammer(stateWith([monster(1, 5, 0)], HAMMER_I));
    const first = playTurn(start, 5, CONFIG);
    expect(byId(first, 1)?.hp).toBe(3);
    expect(first.heroHp).toBe(10);
    // Lượt sau chém trượt: hết choáng, con áp sát đánh 1.
    const second = playTurn(first, 15, CONFIG);
    expect(second.heroHp).toBe(9);
  });

  it('con bị choáng không đi lượt đó', () => {
    const start = withHammer(stateWith([monster(1, 5, 1)], HAMMER_I));
    const after = playTurn(start, 5, CONFIG);
    expect(byId(after, 1)).toMatchObject({ sector: 5, ring: 1 });
  });

  it('vũ khí không có choáng thì quái vẫn đánh như cũ', () => {
    const after = playTurn(stateWith([monster(1, 5, 0)], SWORD_I), 5, CONFIG);
    expect(after.heroHp).toBe(9);
  });
});

describe('Nỏ — một lát, vòng 2–5: xuyên cả hàng', () => {
  it('trúng mọi quái cùng lát từ vòng 2 tới 5 (combo 1×, 2×, 3×, 4×), không trúng vòng 0–1', () => {
    const monsters = [
      monster(1, 7, 1),
      monster(2, 7, 2),
      monster(3, 7, 3),
      monster(4, 7, 4),
      monster(5, 7, 5),
    ];
    const after = playTurn(stateWith(monsters, CROSSBOW_I), 7, CONFIG);
    const hits = after.lastAttack?.hits ?? [];
    expect(hits.map((h) => h.monsterId).sort()).toEqual([2, 3, 4, 5]);
    expect(hits.map((h) => h.damage)).toEqual([1, 2, 3, 4]);
  });
});

describe('cấu hình vũ khí mới bị từ chối khi sai', () => {
  const withWeapon = (patch: Partial<WeaponConfig>): BattleConfig => ({
    ...CONFIG,
    weapons: [...CONFIG.weapons, weapon('Sai', patch)],
  });

  it('số lượt choáng phải là số nguyên ≥ 0', () => {
    expect(() => createBattle(1, withWeapon({ stunTurns: -1 }), 0)).toThrow(/choáng/);
    expect(() => createBattle(1, withWeapon({ stunTurns: 0.5 }), 0)).toThrow(/choáng/);
  });

  it('mốc mở khóa phải là một màn có trong game', () => {
    expect(() => createBattle(1, withWeapon({ unlockAfterLevel: 4 }), 0)).toThrow(/mở khóa/);
    expect(() => createBattle(1, withWeapon({ unlockAfterLevel: -1 }), 0)).toThrow(/mở khóa/);
  });
});

describe('vũ khí đang có (mở khóa theo màn, hoặc có đồ rơi / món thuê)', () => {
  const none = { clearedLevels: 0, tiers: {}, rentals: {} };

  it('người chơi mới: chỉ có các món không có mốc mở khóa', () => {
    expect(ownedWeapons(CONFIG, none)).toEqual([0, 1, 2, 5]);
  });

  it('thắng màn mốc thì có món đó (Búa mốc màn 2 — đếm từ 0 là 1)', () => {
    expect(ownedWeapons(CONFIG, { ...none, clearedLevels: 1 })).not.toContain(HAMMER_I);
    expect(ownedWeapons(CONFIG, { ...none, clearedLevels: 2 })).toContain(HAMMER_I);
    expect(ownedWeapons(CONFIG, { ...none, clearedLevels: 3 })).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('chưa tới mốc mà có đồ rơi vĩnh viễn hoặc món thuê còn hạn thì vẫn có', () => {
    expect(ownedWeapons(CONFIG, { ...none, tiers: { [SCYTHE_I]: 1 } })).toContain(SCYTHE_I);
    expect(ownedWeapons(CONFIG, { ...none, rentals: { [SCYTHE_I]: 2 } })).toContain(SCYTHE_I);
    expect(ownedWeapons(CONFIG, { ...none, rentals: { [SCYTHE_I]: 0 } })).not.toContain(SCYTHE_I);
    // F19 PR B: món Thường rơi vĩnh viễn của vũ khí chưa mở khóa ghi cấp 0 — vẫn là có.
    expect(ownedWeapons(CONFIG, { ...none, tiers: { [SCYTHE_I]: 0 } })).toContain(SCYTHE_I);
  });

  it('đồ đã lưu có món không còn trong danh sách đang có thì bỏ, dùng bộ mặc định', () => {
    const saved = { weapons: ['Búa thử', 'Lưỡi hái thử', 'Nỏ thử'], skill: null };
    expect(fromSavedLoadout(saved, CONFIG, [0, 1, 2, 5])).toBeNull();
    expect(fromSavedLoadout(saved, CONFIG, [0, 1, 2, 3, 4, 5])).toEqual({
      weapons: [HAMMER_I, SCYTHE_I, CROSSBOW_I],
    });
  });

  it('bộ mặc định không đổi: món đầu mỗi tầm (Kiếm, Giáo, Cung)', () => {
    expect(defaultLoadout(CONFIG, ownedWeapons(CONFIG, none)).weapons).toEqual([0, 1, 2]);
  });
});

describe('mô tả vũ khí mới', () => {
  it('Búa ghi choáng, Lưỡi hái ghi kéo vào giữa, Nỏ ghi vòng 2–5', () => {
    expect(describeWeapon(HAMMER)).toContain('choáng 1 lượt');
    expect(describeWeapon(SCYTHE)).toContain('kéo vào giữa');
    expect(describeWeapon(CROSSBOW)).toContain('vòng 2–5');
  });
});

describe('cấu hình thật', () => {
  const names = BATTLE_CONFIG.weapons.map((w) => w.name);

  it('4 món cũ giữ nguyên chỗ (đồ đã lưu theo chỉ số không lệch), 3 món mới nối sau', () => {
    expect(names).toEqual(['Kiếm', 'Giáo', 'Cung', 'Rìu', 'Búa', 'Lưỡi hái', 'Nỏ']);
  });

  it('Búa tầm gần choáng, Lưỡi hái tầm vừa kéo vào giữa, Nỏ tầm xa vòng 2–5 rộng 1 lát; cả ba có mốc mở khóa', () => {
    const [hammer, scythe, crossbow] = BATTLE_CONFIG.weapons.slice(4);
    expect(hammer).toMatchObject({ slot: 'near', stunTurns: 1, damage: 2 });
    expect(scythe).toMatchObject({ slot: 'mid', push: 'gather' });
    expect(crossbow).toMatchObject({ slot: 'far', minRing: 2, maxRing: 5, widthSectors: 1 });
    for (const w of [hammer, scythe, crossbow]) expect(w?.unlockAfterLevel).toBeGreaterThan(0);
  });

  it('Lưỡi hái mở sau màn 12 — màn Dơi đêm (loài rơi Lưỡi hái) ra lần đầu', () => {
    const scythe = BATTLE_CONFIG.weapons.find((w) => w.name === 'Lưỡi hái');
    const firstBat = BATTLE_CONFIG.levels.findIndex((l) =>
      [l.monsters, ...(l.waves ?? [])].flat().includes('bat'),
    );
    expect(firstBat).toBe(11);
    expect(scythe?.unlockAfterLevel).toBe(firstBat);
  });

  it('bộ mặc định vẫn là Kiếm + Giáo + Cung', () => {
    expect(defaultLoadout(BATTLE_CONFIG).weapons).toEqual([0, 1, 2]);
  });
});
