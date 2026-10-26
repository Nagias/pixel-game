// Luật trận đấu: hàm thuần (state cũ + hành động → state mới). Không Phaser, không đồng hồ.
// Thứ tự một lượt: đánh → kiểm thắng → đẩy quái (F05) → quái áp sát đánh (F04) → quái di chuyển
// → kiểm hết máu → kiểm hết lượt. F06: mỗi màn mở bằng createBattle(seed, config, màn).
import { nextFloat, nextInt, seedRng, type RngState } from '../../../shared/random';
import { isInZone, knockbackCell, wrapSector } from './arena';
import {
  PUSH_DIRECTIONS,
  type BattleConfig,
  type BattleState,
  type Hit,
  type LevelConfig,
  type Monster,
  type WeaponConfig,
} from './battleTypes';

/** Chặn cấu hình sai ngay lúc mở trận, thay vì để game chạy với luật vô nghĩa. */
function validateBattleConfig(config: BattleConfig): void {
  const { sectorCount, ringCount, weapons, monsterKinds, levels } = config;
  const problems: string[] = [];

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
    if (weapon.twoSided && sectorCount % 2 !== 0) {
      problems.push(`${label}: chém hai phía cần số lát chẵn để có lát đối diện`);
    }
    if (weapon.twoSided && weapon.widthSectors * 2 > sectorCount) {
      problems.push(`${label}: hai nêm rộng ${weapon.widthSectors} lát chồng lên nhau`);
    }
    if (!PUSH_DIRECTIONS.includes(weapon.push)) {
      problems.push(`${label}: kiểu đẩy "${String(weapon.push)}" không tồn tại`);
    }
  }
  for (const [kind, rule] of Object.entries(monsterKinds)) {
    const label = `quái "${kind}"`;
    if (rule.hp < 1) problems.push(`${label}: phải có ít nhất 1 máu`);
    if (rule.attack < 1) problems.push(`${label}: phải có sức đánh ít nhất 1`);
    if (rule.advanceChance < 0 || rule.advanceChance > 1) {
      problems.push(`${label}: xác suất tiến vào phải trong [0, 1]`);
    }
  }
  if (config.hero.hp < 1) problems.push('nhân vật phải có ít nhất 1 máu');
  if (levels.length === 0) problems.push('phải có ít nhất 1 màn');
  levels.forEach((level, i) => {
    const label = `màn ${i + 1}`;
    const count = level.monsters.length;
    const slotCount = level.spread * 2 + 1;
    if (level.turnLimit < 1) problems.push(`${label}: phải có ít nhất 1 lượt`);
    if (count === 0) problems.push(`${label}: phải có ít nhất 1 quái`);
    if (count > slotCount)
      problems.push(`${label}: không đủ ${count} chỗ trong cụm ${slotCount} lát`);
    if (slotCount > sectorCount) {
      problems.push(`${label}: cụm quái ${slotCount} lát rộng hơn vòng tròn`);
    }
    for (const kind of level.monsters) {
      if (!Object.hasOwn(monsterKinds, kind)) {
        problems.push(`${label}: loại quái "${String(kind)}" không tồn tại`);
      }
    }
  });

  if (problems.length > 0) {
    throw new RangeError(`Cấu hình trận đấu sai: ${problems.join('; ')}`);
  }
}

/** F06: cấu hình của màn số `index` (0 = màn 1); báo lỗi nếu không có. */
export function levelAt(index: number, config: BattleConfig): LevelConfig {
  const level = Number.isInteger(index) ? config.levels[index] : undefined;
  if (!level) {
    throw new RangeError(`Không có màn số ${index} (có ${config.levels.length} màn)`);
  }
  return level;
}

/**
 * Mở màn `level`: đội hình quái của màn xuất hiện thành cụm ở vòng ngoài cùng, mỗi con một lát
 * khác nhau. Màn nào cũng bắt đầu đầy máu, cầm vũ khí đầu tiên.
 */
export function createBattle(seed: number, config: BattleConfig, level: number): BattleState {
  validateBattleConfig(config);
  const { turnLimit, monsters: lineup, spread } = levelAt(level, config);
  const slotCount = spread * 2 + 1;

  const [center, rngAfterCenter] = nextInt(seedRng(seed), config.sectorCount);
  let rng = rngAfterCenter;

  // Xáo một phần (Fisher–Yates) để chọn đủ lát khác nhau trong cụm cho cả đội hình.
  const offsets = Array.from({ length: slotCount }, (_, i) => i - spread);
  for (let i = 0; i < lineup.length; i++) {
    let pick: number;
    [pick, rng] = nextInt(rng, slotCount - i);
    const j = i + pick;
    [offsets[i], offsets[j]] = [offsets[j] as number, offsets[i] as number];
  }

  const monsters: Monster[] = lineup.map((kind, index) => ({
    id: index + 1,
    kind,
    sector: wrapSector(center + (offsets[index] as number), config.sectorCount),
    ring: config.ringCount - 1,
    hp: config.monsterKinds[kind].hp,
  }));

  return {
    seed,
    rng,
    level,
    turnsLeft: turnLimit,
    heroHp: config.hero.hp,
    weaponIndex: 0,
    monsters,
    phase: 'playing',
    lossReason: null,
    lastAttack: null,
  };
}

/**
 * F06: màn chơi tiếp khi màn hiện tại đã kết thúc. Thắng → màn kế; thắng màn cuối (phá đảo) → về
 * màn 1; thua → chơi lại đúng màn đó.
 */
export function nextLevelIndex(state: BattleState, config: BattleConfig): number {
  if (state.phase === 'playing') throw new Error('Màn chưa kết thúc, chưa có màn kế');
  if (state.phase === 'lost') return state.level;
  return (state.level + 1) % config.levels.length;
}

/** F06: phá đảo — vừa thắng màn cuối. */
export function isGameCleared(state: BattleState, config: BattleConfig): boolean {
  return state.phase === 'won' && state.level === config.levels.length - 1;
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

  // F05: đẩy quái ngay sau nhát chém, trước khi quái hành động.
  const knocked = applyKnockback(survivors, hits, weapon, config);

  // F04: quái đang áp sát (còn sống sau nhát chém và sau khi bị đẩy) đánh; quái vừa tiến vào vòng 0
  // lượt này chỉ đánh từ lượt sau — đúng những con người chơi đã thấy dấu "!" trước khi chém.
  // F06: mỗi con trừ máu theo sức đánh của loại nó (trùm đánh đau hơn slime).
  const damageTaken = knocked.monsters
    .filter(isThreatening)
    .reduce((sum, m) => sum + config.monsterKinds[m.kind].attack, 0);
  const heroHp = Math.max(0, state.heroHp - damageTaken);

  const moved = moveMonsters(knocked.monsters, state.rng, config, knocked.pushedIds);
  const base = {
    ...state,
    turnsLeft,
    heroHp,
    monsters: moved.monsters,
    rng: moved.rng,
    lastAttack,
  };

  if (heroHp <= 0) {
    return { ...base, phase: 'lost', lossReason: 'heroDefeated' };
  }
  if (turnsLeft <= 0) {
    return { ...base, phase: 'lost', lossReason: 'outOfTurns' };
  }
  return { ...base, phase: 'playing', lossReason: null };
}

/**
 * F05: quái bị chém mà còn sống bị đẩy theo kiểu đẩy của vũ khí, lần lượt theo thứ tự combo.
 * Ô đích có quái khác hoặc nằm ngoài sân thì không bị đẩy. Trả về id những con bị đẩy thành công
 * (chúng đứng yên lượt đó). Không tung số ngẫu nhiên.
 */
function applyKnockback(
  survivors: readonly Monster[],
  hits: readonly Hit[],
  weapon: WeaponConfig,
  config: BattleConfig,
): { monsters: Monster[]; pushedIds: Set<number> } {
  const pushedIds = new Set<number>();
  if (weapon.push === 'none') return { monsters: [...survivors], pushedIds };

  const key = (cell: { sector: number; ring: number }) => `${cell.sector}:${cell.ring}`;
  const positions = new Map(survivors.map((m) => [m.id, m]));
  const occupied = new Set(survivors.map(key));

  for (const hit of hits) {
    const monster = positions.get(hit.monsterId);
    if (!monster) continue; // đã chết trong nhát chém
    const target = knockbackCell(monster, weapon.push, config.sectorCount);
    const insideArena = target.ring >= 0 && target.ring < config.ringCount;
    if (!insideArena || occupied.has(key(target))) continue;

    occupied.delete(key(monster));
    occupied.add(key(target));
    positions.set(monster.id, { ...monster, ...target });
    pushedIds.add(monster.id);
  }

  return { monsters: survivors.map((m) => positions.get(m.id) ?? m), pushedIds };
}

/** F04: quái đang áp sát nhân vật (vòng 0) sẽ đánh sau nhát chém tới — view hiện dấu "!" cho nó. */
export function isThreatening(monster: Monster): boolean {
  return monster.ring === 0;
}

/**
 * Quái "đi lung tung": mỗi con tiến vào 1 vòng với xác suất advanceChance, còn lại đi ngang 1 lát.
 * Xét lần lượt theo id; không đi vào ô đang có quái khác (đứng yên). Quái áp sát (vòng 0) đứng yên
 * đánh, không di chuyển và không tung số ngẫu nhiên.
 */
function moveMonsters(
  monsters: readonly Monster[],
  rngIn: RngState,
  config: BattleConfig,
  /** F05: quái vừa bị đẩy thành công đứng yên lượt này. */
  pushedIds: ReadonlySet<number>,
): { monsters: Monster[]; rng: RngState } {
  let rng = rngIn;
  const key = (sector: number, ring: number) => `${sector}:${ring}`;
  const occupied = new Set(monsters.map((m) => key(m.sector, m.ring)));
  const positions = new Map(monsters.map((m) => [m.id, m]));

  for (const monster of [...monsters].sort((a, b) => a.id - b.id)) {
    if (isThreatening(monster) || pushedIds.has(monster.id)) continue;
    let roll: number;
    [roll, rng] = nextFloat(rng);

    let target = { sector: monster.sector, ring: monster.ring - 1 };
    if (roll >= config.monsterKinds[monster.kind].advanceChance) {
      let directionRoll: number;
      [directionRoll, rng] = nextFloat(rng);
      const step = directionRoll < 0.5 ? -1 : 1;
      target = {
        sector: wrapSector(monster.sector + step, config.sectorCount),
        ring: monster.ring,
      };
    }

    if (occupied.has(key(target.sector, target.ring))) continue;

    occupied.delete(key(monster.sector, monster.ring));
    occupied.add(key(target.sector, target.ring));
    positions.set(monster.id, { ...monster, ...target });
  }

  return { monsters: monsters.map((m) => positions.get(m.id) ?? m), rng };
}
