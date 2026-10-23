// Test ẩn của việc mẫu T1 (bench/) — chỉ chép vào bài làm lúc chấm, người làm bài không thấy.
// Chỉ dùng API có sẵn ở commit gốc và cấu hình THẬT của bài làm, để không phụ thuộc tên trường mới.
import { describe, expect, it } from 'vitest';
import { seedRng } from '../../../shared/random';
import { playTurn } from './battle';
import { BATTLE_CONFIG } from './battleConfig';
import type { BattleConfig, BattleState, Monster } from './battleTypes';

// Vũ khí với tới cả sân, không đẩy quái — để chỉ còn luật hồi máu tác động.
const CONFIG: BattleConfig = {
  ...BATTLE_CONFIG,
  weapons: [
    {
      name: 'Thử',
      rangeLabel: 'cả sân',
      push: 'none',
      widthSectors: 3,
      minRing: 0,
      maxRing: 5,
      damage: 1,
    },
  ],
};
const MAX_HP = BATTLE_CONFIG.hero.hp;
const ATTACK = BATTLE_CONFIG.monster.attack;

const monster = (id: number, sector: number, ring: number, hp = 1): Monster => ({
  id,
  sector,
  ring,
  hp,
});

function stateWith(monsters: Monster[], heroHp: number): BattleState {
  return {
    seed: 1,
    rng: seedRng(1),
    turnsLeft: 5,
    heroHp,
    weaponIndex: 0,
    monsters,
    phase: 'playing',
    lossReason: null,
    lastAttack: null,
  };
}

// Ngắm lát 0, vùng rộng 3 → trúng lát 23, 0, 1. Quái 1 máu bị combo 1×/2×/3× nên trúng là chết.
const THREE_IN_ZONE = [monster(1, 0, 3), monster(2, 1, 4), monster(3, 23, 5)];
/** Ngoài vùng, ở xa: còn sống để trận chưa thắng, và không đánh lượt này. */
const FAR = monster(9, 12, 5, 2);
/** Ngoài vùng, áp sát: còn sống và đánh lượt này. */
const ADJACENT = monster(9, 12, 0, 2);

const kills = (state: BattleState) =>
  (state.lastAttack?.hits ?? []).filter((hit) => hit.killed).length;

describe('bench T1 — hồi máu khi một nhát diệt từ 3 quái trở lên', () => {
  it('diệt 3 quái trong một nhát → hồi 1 máu', () => {
    const after = playTurn(stateWith([...THREE_IN_ZONE, FAR], 2), 0, CONFIG);
    expect(kills(after)).toBe(3);
    expect(after.heroHp).toBe(3);
  });

  it('diệt 4 quái trong một nhát → vẫn chỉ hồi 1 máu', () => {
    const four = [monster(1, 0, 1), monster(2, 0, 2), monster(3, 1, 3), monster(4, 23, 4)];
    const after = playTurn(stateWith([...four, FAR], 2), 0, CONFIG);
    expect(kills(after)).toBe(4);
    expect(after.heroHp).toBe(3);
  });

  it('diệt 2 quái → không hồi', () => {
    const after = playTurn(stateWith([monster(1, 0, 3), monster(2, 1, 4), FAR], 2), 0, CONFIG);
    expect(kills(after)).toBe(2);
    expect(after.heroHp).toBe(2);
  });

  it('trúng 3 quái nhưng chỉ diệt 2 → không hồi (luật tính số diệt, không tính số trúng)', () => {
    const tough = [monster(1, 0, 3), monster(2, 1, 4), monster(3, 23, 5, 10)];
    const after = playTurn(stateWith([...tough, FAR], 2), 0, CONFIG);
    expect(after.lastAttack?.hits).toHaveLength(3);
    expect(kills(after)).toBe(2);
    expect(after.heroHp).toBe(2);
  });

  it('đang đầy máu thì không hồi vượt máu tối đa', () => {
    const after = playTurn(stateWith([...THREE_IN_ZONE, FAR], MAX_HP), 0, CONFIG);
    expect(after.heroHp).toBe(MAX_HP);
  });

  it('hồi máu trước khi quái áp sát đánh: đầy máu, diệt 3, bị đánh → còn tối đa trừ sức đánh', () => {
    const after = playTurn(stateWith([...THREE_IN_ZONE, ADJACENT], MAX_HP), 0, CONFIG);
    expect(after.heroHp).toBe(MAX_HP - ATTACK);
  });

  it('còn 1 máu, diệt 3, bị đánh 1 → được hồi kịp nên không gục', () => {
    const after = playTurn(stateWith([...THREE_IN_ZONE, ADJACENT], 1), 0, CONFIG);
    expect(after.heroHp).toBe(1 + 1 - ATTACK);
    expect(after.phase).toBe('playing');
  });
});
