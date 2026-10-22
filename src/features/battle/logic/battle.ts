// Luật trận đấu: hàm thuần (state cũ + hành động → state mới). Không Phaser, không đồng hồ.
// Thứ tự một lượt: đánh → kiểm thắng → quái di chuyển → kiểm bị chạm → kiểm hết lượt.
import { nextFloat, nextInt, seedRng, type RngState } from '../../../shared/random';
import { isInZone, wrapSector } from './arena';
import type { BattleConfig, BattleState, Hit, Monster, WeaponConfig } from './battleTypes';

/** Chặn cấu hình sai ngay lúc mở trận, thay vì để game chạy với luật vô nghĩa. */
function validateBattleConfig(config: BattleConfig): void {
  const { sectorCount, ringCount, turnLimit, weapons, monster, spawn } = config;
  const slotCount = spawn.spread * 2 + 1;
  const problems: string[] = [];

  if (spawn.count > slotCount)
    problems.push(`không đủ ${spawn.count} chỗ trong cụm ${slotCount} lát`);
  if (slotCount > sectorCount) problems.push(`cụm quái ${slotCount} lát rộng hơn vòng tròn`);
  if (weapons.length === 0) problems.push('phải có ít nhất 1 vũ khí');
  for (const weapon of weapons) {
    const label = `vũ khí "${weapon.name}"`;
    if (weapon.widthSectors % 2 === 0) problems.push(`${label}: vùng đánh phải rộng số lẻ lát`);
    if (weapon.widthSectors < 1 || weapon.widthSectors > sectorCount) {
      problems.push(`${label}: rộng ${weapon.widthSectors} lát nằm ngoài [1, ${sectorCount}]`);
    }
    if (weapon.minRing < 0 || weapon.minRing > weapon.maxRing || weapon.maxRing >= ringCount) {
      problems.push(`${label}: tầm vòng ${weapon.minRing}–${weapon.maxRing} không hợp lệ`);
    }
    if (weapon.damage < 1) problems.push(`${label}: phải gây ít nhất 1 sát thương`);
  }
  if (turnLimit < 1) problems.push('phải có ít nhất 1 lượt');
  if (monster.hp < 1) problems.push('quái phải có ít nhất 1 máu');
  if (monster.advanceChance < 0 || monster.advanceChance > 1) {
    problems.push('xác suất tiến vào phải trong [0, 1]');
  }

  if (problems.length > 0) {
    throw new RangeError(`Cấu hình trận đấu sai: ${problems.join('; ')}`);
  }
}

/** Mở trận mới: một cụm quái xuất hiện ở vòng ngoài cùng, mỗi con một lát khác nhau. */
export function createBattle(seed: number, config: BattleConfig): BattleState {
  validateBattleConfig(config);
  const { count, spread } = config.spawn;
  const slotCount = spread * 2 + 1;

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
    weaponIndex: 0,
    monsters,
    phase: 'playing',
    lossReason: null,
    lastAttack: null,
  };
}

/** Vũ khí ở vị trí `index` trên thanh nút; báo lỗi nếu không có. */
function weaponAt(index: number, config: BattleConfig): WeaponConfig {
  const weapon = Number.isInteger(index) ? config.weapons[index] : undefined;
  if (!weapon) {
    throw new RangeError(`Không có vũ khí số ${index} (có ${config.weapons.length} vũ khí)`);
  }
  return weapon;
}

/** Đổi vũ khí đang cầm. Không tốn lượt, quái không di chuyển — chỉ chém mới tốn lượt. */
export function selectWeapon(state: BattleState, index: number, config: BattleConfig): BattleState {
  if (state.phase !== 'playing') {
    throw new Error(`Trận đã kết thúc (${state.phase}), không thể đổi vũ khí`);
  }
  weaponAt(index, config);
  return { ...state, weaponIndex: index };
}

/** Một lượt: người chơi đánh vào `aimSector` bằng vũ khí đang cầm, rồi quái còn sống di chuyển. */
export function playTurn(state: BattleState, aimSector: number, config: BattleConfig): BattleState {
  if (state.phase !== 'playing') {
    throw new Error(`Trận đã kết thúc (${state.phase}), không thể đánh tiếp`);
  }
  if (!Number.isInteger(aimSector) || aimSector < 0 || aimSector >= config.sectorCount) {
    throw new RangeError(`aimSector phải trong [0, ${config.sectorCount}), nhận ${aimSector}`);
  }

  const weapon = weaponAt(state.weaponIndex, config);

  // F03 — combo gom cụm: con thứ n bị chém ăn n × sát thương vũ khí. Con ít máu bị chém trước để
  // nhát mạnh nhất dồn vào con trâu nhất; bằng máu thì con gần nhân vật hơn trước, rồi theo id.
  const hits: Hit[] = [...state.monsters]
    .filter((monster) => isInZone(monster, aimSector, weapon, config.sectorCount))
    .sort((a, b) => a.hp - b.hp || a.ring - b.ring || a.id - b.id)
    .map((monster, order) => {
      const damage = weapon.damage * (order + 1);
      return { monsterId: monster.id, damage, killed: monster.hp - damage <= 0 };
    });

  const damageById = new Map(hits.map((hit) => [hit.monsterId, hit.damage]));
  const survivors: Monster[] = [];
  for (const monster of state.monsters) {
    const hp = monster.hp - (damageById.get(monster.id) ?? 0);
    if (hp > 0) survivors.push(hp === monster.hp ? monster : { ...monster, hp });
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
