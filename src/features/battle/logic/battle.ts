// Luật trận đấu: hàm thuần (state cũ + hành động → state mới). Không Phaser, không đồng hồ.
// Thứ tự một lượt: đánh → kiểm thắng → quái di chuyển → kiểm bị chạm → kiểm hết lượt.
import { nextFloat, nextInt, seedRng, type RngState } from '../../../shared/random';
import { isInZone, wrapSector } from './arena';
import type { BattleConfig, BattleState, Hit, Monster } from './battleTypes';

/** Mở trận mới: một cụm quái xuất hiện ở vòng ngoài cùng, mỗi con một lát khác nhau. */
export function createBattle(seed: number, config: BattleConfig): BattleState {
  const { count, spread } = config.spawn;
  const slotCount = spread * 2 + 1;
  if (count > slotCount) {
    throw new RangeError(`Không đủ ${count} chỗ trong cụm rộng ${slotCount} lát`);
  }

  const [center, rngAfterCenter] = nextInt(seedRng(seed), config.sectorCount);
  let rng = rngAfterCenter;

  // Xáo một phần (Fisher–Yates) để chọn `count` lát khác nhau trong cụm.
  const offsets = Array.from({ length: slotCount }, (_, i) => i - spread);
  for (let i = 0; i < count; i++) {
    let pick: number;
    [pick, rng] = nextInt(rng, slotCount - i);
    const j = i + pick;
    [offsets[i], offsets[j]] = [offsets[j] as number, offsets[i] as number];
  }

  const monsters: Monster[] = offsets.slice(0, count).map((offset, index) => ({
    id: index + 1,
    sector: wrapSector(center + offset, config.sectorCount),
    ring: config.ringCount - 1,
    hp: config.monster.hp,
  }));

  return {
    seed,
    rng,
    turnsLeft: config.turnLimit,
    monsters,
    phase: 'playing',
    lossReason: null,
    lastAttack: null,
  };
}

/** Một lượt: người chơi đánh vào `aimSector`, rồi quái còn sống di chuyển. */
export function playTurn(state: BattleState, aimSector: number, config: BattleConfig): BattleState {
  if (state.phase !== 'playing') {
    throw new Error(`Trận đã kết thúc (${state.phase}), không thể đánh tiếp`);
  }
  if (!Number.isInteger(aimSector) || aimSector < 0 || aimSector >= config.sectorCount) {
    throw new RangeError(`aimSector phải trong [0, ${config.sectorCount}), nhận ${aimSector}`);
  }

  const { weapon } = config;
  const hits: Hit[] = [];
  const survivors: Monster[] = [];
  for (const monster of state.monsters) {
    if (!isInZone(monster, aimSector, weapon, config.sectorCount)) {
      survivors.push(monster);
      continue;
    }
    const hp = monster.hp - weapon.damage;
    hits.push({ monsterId: monster.id, damage: weapon.damage, killed: hp <= 0 });
    if (hp > 0) survivors.push({ ...monster, hp });
  }

  const lastAttack = { aimSector, hits };
  const turnsLeft = state.turnsLeft - 1;

  if (survivors.length === 0) {
    return { ...state, turnsLeft, monsters: [], phase: 'won', lossReason: null, lastAttack };
  }

  const moved = moveMonsters(survivors, state.rng, config);
  const base = { ...state, turnsLeft, monsters: moved.monsters, rng: moved.rng, lastAttack };

  if (moved.monsters.some((m) => m.ring < 0)) {
    return { ...base, phase: 'lost', lossReason: 'reachedHero' };
  }
  if (turnsLeft <= 0) {
    return { ...base, phase: 'lost', lossReason: 'outOfTurns' };
  }
  return { ...base, phase: 'playing', lossReason: null };
}

/**
 * Quái "đi lung tung": mỗi con tiến vào 1 vòng với xác suất advanceChance, còn lại đi ngang 1 lát.
 * Xét lần lượt theo id; không đi vào ô đang có quái khác (đứng yên). Vòng -1 = đã chạm nhân vật.
 */
function moveMonsters(
  monsters: readonly Monster[],
  rngIn: RngState,
  config: BattleConfig,
): { monsters: Monster[]; rng: RngState } {
  let rng = rngIn;
  const key = (sector: number, ring: number) => `${sector}:${ring}`;
  const occupied = new Set(monsters.map((m) => key(m.sector, m.ring)));
  const positions = new Map(monsters.map((m) => [m.id, m]));

  for (const monster of [...monsters].sort((a, b) => a.id - b.id)) {
    let roll: number;
    [roll, rng] = nextFloat(rng);

    let target = { sector: monster.sector, ring: monster.ring - 1 };
    if (roll >= config.monster.advanceChance) {
      let directionRoll: number;
      [directionRoll, rng] = nextFloat(rng);
      const step = directionRoll < 0.5 ? -1 : 1;
      target = {
        sector: wrapSector(monster.sector + step, config.sectorCount),
        ring: monster.ring,
      };
    }

    if (target.ring >= 0 && occupied.has(key(target.sector, target.ring))) continue;

    occupied.delete(key(monster.sector, monster.ring));
    if (target.ring >= 0) occupied.add(key(target.sector, target.ring));
    positions.set(monster.id, { ...monster, ...target });
  }

  return { monsters: monsters.map((m) => positions.get(m.id) ?? m), rng };
}
