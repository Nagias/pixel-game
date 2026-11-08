// Luật trận đấu: hàm thuần (state cũ + hành động → state mới). Không Phaser, không đồng hồ.
// Thứ tự một lượt: đánh (B6: chí mạng) → kiểm thắng → hồi máu (B6) → đẩy quái (F05) → quái áp sát
// đánh (F04) → quái di chuyển → hết đóng băng (B6) → kiểm hết máu → kiểm hết lượt. F06: mỗi màn mở
// bằng createBattle(seed, config, màn). B6: castSkill đánh cả sân giữa hai nhát chém, không tốn lượt.
import { nextFloat, nextInt, seedRng, type RngState } from '../../../shared/random';
import { aimSectors, isInZone, knockbackCell, wrapSector, zoneSectors } from './arena';
import { defaultLoadout, skillUnlockLevelOf, validateLoadout } from './loadout';
import {
  PUSH_DIRECTIONS,
  type BattleConfig,
  type Cell,
  type BattleState,
  type Hit,
  type LevelConfig,
  type Loadout,
  type Monster,
  type MonsterKind,
  type SkillConfig,
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
    const crit = weapon.critChance ?? 0;
    if (!(crit >= 0 && crit <= 1)) problems.push(`${label}: chí mạng ${crit} nằm ngoài [0, 1]`);
    const stun = weapon.stunTurns ?? 0;
    if (!Number.isInteger(stun) || stun < 0) {
      problems.push(`${label}: số lượt choáng phải là số nguyên ≥ 0`);
    }
    const unlock = weapon.unlockAfterLevel;
    if (
      unlock !== undefined &&
      (!Number.isInteger(unlock) || unlock < 0 || unlock >= levels.length)
    ) {
      problems.push(`${label}: mốc mở khóa ${unlock} không phải màn có trong game`);
    }
  }
  if (!(config.critMultiplier >= 1)) problems.push('hệ số chí mạng phải từ 1 trở lên');
  for (const [kind, skill] of Object.entries(config.skills)) {
    const label = `skill "${kind}"`;
    if (!(skill.damage >= 1)) problems.push(`${label}: phải gây ít nhất 1 sát thương`);
    if (!Number.isInteger(skill.freezeTurns) || skill.freezeTurns < 0) {
      problems.push(`${label}: số lượt đóng băng phải là số nguyên ≥ 0`);
    }
    if (!Number.isInteger(skill.chargeTurns) || skill.chargeTurns < 1) {
      problems.push(`${label}: số nhát nạp phải là số nguyên ≥ 1`);
    }
  }
  if (!Number.isInteger(config.skillUnlockLevel) || config.skillUnlockLevel < 0) {
    problems.push('màn mở skill phải là số nguyên ≥ 0');
  }
  for (const [kind, skill] of Object.entries(config.skills)) {
    const own = skill.unlockLevel;
    if (own !== undefined && (!Number.isInteger(own) || own < config.skillUnlockLevel)) {
      problems.push(`skill "${kind}": màn mở riêng phải là số nguyên ≥ màn mở skill chung`);
    }
  }
  for (const [kind, rule] of Object.entries(monsterKinds)) {
    const label = `quái "${kind}"`;
    if (rule.hp < 1) problems.push(`${label}: phải có ít nhất 1 máu`);
    if (rule.attack < 1) problems.push(`${label}: phải có sức đánh ít nhất 1`);
    if (rule.advanceChance < 0 || rule.advanceChance > 1) {
      problems.push(`${label}: xác suất tiến vào phải trong [0, 1]`);
    }
    // Quái xuất hiện ở vòng ngoài cùng (ringCount − 1): vòng bắn phải nằm phía trong để nó còn phải tiến.
    if (
      rule.shootRing !== undefined &&
      (!Number.isInteger(rule.shootRing) || rule.shootRing < 1 || rule.shootRing > ringCount - 2)
    ) {
      problems.push(
        `${label}: vòng bắn ${rule.shootRing} phải là số nguyên trong [1, ${ringCount - 2}]`,
      );
    }
    if (rule.gold !== undefined && (!Number.isInteger(rule.gold) || rule.gold < 0)) {
      problems.push(`${label}: vàng ${rule.gold} phải là số nguyên ≥ 0`);
    }
    if (rule.step !== undefined && (!Number.isInteger(rule.step) || rule.step < 1)) {
      problems.push(`${label}: số vòng lao ${rule.step} phải là số nguyên ≥ 1`);
    }
    for (const [field, value] of [
      ['sức nổ', rule.explode],
      ['phản đòn', rule.thorns],
    ] as const) {
      if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
        problems.push(`${label}: ${field} ${value} phải là số nguyên ≥ 1`);
      }
    }
    const order = rule.minComboOrder;
    if (order !== undefined && (!Number.isInteger(order) || order < 1)) {
      problems.push(`${label}: thứ tự combo tối thiểu ${order} phải là số nguyên ≥ 1`);
    }
    if (rule.summon) {
      const { kind: summoned, count, every } = rule.summon;
      if (!Object.hasOwn(monsterKinds, summoned)) {
        problems.push(`${label}: gọi loài quái "${String(summoned)}" không có`);
      }
      if (!Number.isInteger(count) || count < 1) problems.push(`${label}: số quái gọi phải ≥ 1`);
      if (!Number.isInteger(every) || every < 1) problems.push(`${label}: gọi mỗi số lượt ≥ 1`);
      const { whenAlone } = rule.summon;
      if (whenAlone !== undefined && typeof whenAlone !== 'boolean') {
        problems.push(`${label}: "gọi khi quanh trống" phải là true / false`);
      }
    }
    // F19: quái hiếm rơi vũ khí theo loài — loài hóa hiếm được phải có món rơi là vũ khí trong game.
    if (rule.canBeRare && !weapons.some((weapon) => weapon.name === rule.drop)) {
      problems.push(`${label}: hóa hiếm được nhưng món rơi "${String(rule.drop)}" không có`);
    }
  }
  if (config.rare) {
    const { fromLevel, chance, hpMultiplier, goldMultiplier } = config.rare;
    if (!Number.isInteger(fromLevel) || fromLevel < 0) {
      problems.push('màn mở quái hiếm phải là số nguyên ≥ 0');
    }
    if (!(chance >= 0 && chance <= 1))
      problems.push(`xác suất quái hiếm ${chance} nằm ngoài [0, 1]`);
    if (!Number.isInteger(hpMultiplier) || hpMultiplier < 1) {
      problems.push('hệ số máu quái hiếm phải là số nguyên ≥ 1');
    }
    if (!Number.isInteger(goldMultiplier) || goldMultiplier < 1) {
      problems.push('hệ số vàng quái hiếm phải là số nguyên ≥ 1');
    }
  }
  if (config.hero.hp < 1) problems.push('nhân vật phải có ít nhất 1 máu');
  if (!Number.isInteger(config.hero.healMinHits) || config.hero.healMinHits < 1) {
    problems.push('hồi máu phải cần ít nhất 1 con trúng');
  }
  if (!Number.isInteger(config.hero.healAmount) || config.hero.healAmount < 0) {
    problems.push('số máu hồi phải là số nguyên ≥ 0');
  }
  if (levels.length === 0) problems.push('phải có ít nhất 1 màn');
  levels.forEach((level, i) => {
    const label = `màn ${i + 1}`;
    const slotCount = level.spread * 2 + 1;
    if (level.turnLimit < 1) problems.push(`${label}: phải có ít nhất 1 lượt`);
    if (level.target) {
      const { winRate, spareTurns } = level.target;
      if (!(winRate >= 0 && winRate <= 1)) {
        problems.push(`${label}: mục tiêu thắng ${winRate} nằm ngoài [0, 1]`);
      }
      if (!(spareTurns >= 0)) problems.push(`${label}: mục tiêu lượt dư phải ≥ 0`);
    }
    if (slotCount > sectorCount) {
      problems.push(`${label}: cụm quái ${slotCount} lát rộng hơn vòng tròn`);
    }
    if (level.splitOpposite && sectorCount % 2 !== 0) {
      problems.push(`${label}: quái hai phía cần số lát chẵn để có lát đối diện`);
    }
    if (level.splitOpposite && slotCount * 2 > sectorCount) {
      problems.push(`${label}: hai cụm ${slotCount} lát chồng lên nhau`);
    }
    // F11: đợt mở màn và mọi đợt sau cùng một luật đặt quái.
    const lineups = [level.monsters, ...(level.waves ?? [])];
    lineups.forEach((lineup, wave) => {
      const where = wave === 0 ? label : `${label}, đợt ${wave + 1}`;
      // Màn hai phía: cụm đông nhất là cụm trước (nửa đầu, làm tròn lên).
      const count = level.splitOpposite ? Math.ceil(lineup.length / 2) : lineup.length;
      if (count === 0) problems.push(`${where}: phải có ít nhất 1 quái`);
      if (count > slotCount) {
        problems.push(`${where}: không đủ ${count} chỗ trong cụm ${slotCount} lát`);
      }
      for (const kind of lineup) {
        if (!Object.hasOwn(monsterKinds, kind)) {
          problems.push(`${where}: loại quái "${String(kind)}" không tồn tại`);
        }
      }
    });
    const nextWaveAt = level.nextWaveAt ?? 0;
    if (!Number.isInteger(nextWaveAt) || nextWaveAt < 0) {
      problems.push(`${label}: ngưỡng ra đợt phải là số nguyên ≥ 0`);
    }
    if (level.quest) {
      const { kind, count } = level.quest;
      if (!Number.isInteger(count) || count < 1) {
        problems.push(`${label}: nhiệm vụ phải giết số nguyên ≥ 1 con`);
      }
      if (!Object.hasOwn(monsterKinds, kind)) {
        problems.push(`${label}: nhiệm vụ giết loại quái "${String(kind)}" không tồn tại`);
      }
      // Micro RPG từng có màn bất khả thi vì quái nhiệm vụ không ra đủ: chặn ngay từ cấu hình.
      const available = lineups.flat().filter((k) => k === kind).length;
      if (available < count) {
        problems.push(
          `${label}: nhiệm vụ cần ${count} con "${kind}" mà mọi đợt chỉ có ${available}`,
        );
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
 * Chọn `count` lát trống khác nhau quanh `center`: trước hết ngẫu nhiên trong cụm ±spread (xáo một phần
 * Fisher–Yates); F11: cụm thiếu lát trống thì lấy thêm lát trống gần cụm nhất. Lát chọn được ghi vào
 * `taken`. Người gọi bảo đảm vòng còn đủ lát trống.
 */
function pickSectors(
  rng: RngState,
  center: number,
  count: number,
  spread: number,
  taken: Set<number>,
  sectorCount: number,
): [number[], RngState] {
  const at = (offset: number) => wrapSector(center + offset, sectorCount);
  const offsets = Array.from({ length: spread * 2 + 1 }, (_, i) => i - spread).filter(
    (offset) => !taken.has(at(offset)),
  );
  const inCluster = Math.min(count, offsets.length);
  let next = rng;
  for (let i = 0; i < inCluster; i++) {
    let pick: number;
    [pick, next] = nextInt(next, offsets.length - i);
    const j = i + pick;
    [offsets[i], offsets[j]] = [offsets[j] as number, offsets[i] as number];
  }
  const sectors = offsets.slice(0, inCluster).map(at);
  for (const sector of sectors) taken.add(sector);
  for (let distance = spread + 1; sectors.length < count && distance <= sectorCount; distance++) {
    for (const sector of [at(distance), at(-distance)]) {
      if (sectors.length < count && !taken.has(sector)) {
        sectors.push(sector);
        taken.add(sector);
      }
    }
  }
  return [sectors, next];
}

/**
 * Đặt một tốp quái lên vòng ngoài cùng, đầy máu, id từ `firstId`: một cụm ±spread quanh một lát ngẫu
 * nhiên, mỗi con một lát — hoặc hai cụm đối diện nếu màn `splitOpposite` (B2). F11: không đặt lên lát
 * đã có quái ở vòng ngoài (`taken`).
 */
function placeLineup(
  rngIn: RngState,
  lineup: readonly MonsterKind[],
  firstId: number,
  level: LevelConfig,
  taken: Set<number>,
  config: BattleConfig,
): [Monster[], RngState] {
  const { sectorCount } = config;
  const [center, rngAfterCenter] = nextInt(rngIn, sectorCount);
  const frontCount = level.splitOpposite ? Math.ceil(lineup.length / 2) : lineup.length;
  const pick = (rng: RngState, at: number, count: number) =>
    pickSectors(rng, at, count, level.spread, taken, sectorCount);
  const [front, rngAfterFront] = pick(rngAfterCenter, center, frontCount);
  const [back, rng] = pick(rngAfterFront, center + sectorCount / 2, lineup.length - frontCount);
  const sectors = [...front, ...back];
  const monsters = lineup.map((kind, index) => ({
    id: firstId + index,
    kind,
    sector: sectors[index] as number,
    ring: config.ringCount - 1,
    hp: config.monsterKinds[kind].hp,
  }));
  return [monsters, rng];
}

/**
 * Mở màn `level`: đội hình mở màn xuất hiện ở vòng ngoài cùng (placeLineup). Màn nào cũng bắt đầu đầy
 * máu, cầm món đầu tiên của bộ đồ mang vào (B4; không truyền thì mang bộ mặc định — món đầu mỗi tầm).
 */
export function createBattle(
  seed: number,
  config: BattleConfig,
  level: number,
  loadout: Loadout = defaultLoadout(config),
): BattleState {
  validateBattleConfig(config);
  validateLoadout(loadout, config);
  if (loadout.skill !== undefined && level < skillUnlockLevelOf(loadout.skill, config)) {
    throw new RangeError(
      `Màn ${level + 1} chưa được mang skill này (mở từ màn ${skillUnlockLevelOf(loadout.skill, config) + 1})`,
    );
  }
  const levelConfig = levelAt(level, config);
  const [lineup, rng] = placeLineup(
    seedRng(seed),
    levelConfig.monsters,
    1,
    levelConfig,
    new Set(),
    config,
  );
  const monsters = withRare(seed, lineup, level, config);

  return {
    seed,
    rng,
    level,
    turnsLeft: levelConfig.turnLimit,
    heroHp: config.hero.hp,
    loadout,
    weaponIndex: loadout.weapons[0] as number,
    monsters,
    phase: 'playing',
    lossReason: null,
    lastAttack: null,
    skillCharge: 0,
    lastSkill: null,
    questProgress: 0,
    nextWave: 0,
    gold: 0,
    nextId: monsters.length + 1,
  };
}

/**
 * F19: id cho con quái ra tiếp theo. Trạng thái cũ chưa ghi thì tính như trước: sau đội hình mở màn và mọi đợt đã
 * ra (chưa từng có quái được gọi).
 */
function nextIdOf(state: BattleState, level: LevelConfig): number {
  if (state.nextId !== undefined) return state.nextId;
  const spawned = (level.waves ?? [])
    .slice(0, state.nextWave)
    .reduce((sum, wave) => sum + wave.length, 0);
  return level.monsters.length + spawned + 1;
}

/** F11: tiến độ nhiệm vụ sau khi các quái trong `hits` trúng đòn (đếm con chết đúng loại nhiệm vụ). */
function questProgressAfter(state: BattleState, hits: readonly Hit[], level: LevelConfig): number {
  const { quest } = level;
  if (!quest) return state.questProgress;
  const kindById = new Map(state.monsters.map((m) => [m.id, m.kind]));
  const killed = hits.filter((hit) => hit.killed && kindById.get(hit.monsterId) === quest.kind);
  return state.questProgress + killed.length;
}

/**
 * Đợt 3: vàng sau khi các quái trong `hits` trúng đòn — cộng vàng theo loại của từng con bị hạ. Đợt 5:
 * quái hiếm cho vàng × goldMultiplier và đánh dấu trận đã hạ quái hiếm.
 */
function rewardsAfter(
  state: BattleState,
  hits: readonly Hit[],
  config: BattleConfig,
): { gold: number; rareKilled?: MonsterKind } {
  const byId = new Map(state.monsters.map((m) => [m.id, m]));
  const killed = hits.flatMap((hit) => {
    const monster = byId.get(hit.monsterId);
    return hit.killed && monster ? [monster] : [];
  });
  const gold = killed.reduce((sum, m) => {
    const base = config.monsterKinds[m.kind].gold ?? 0;
    return sum + (m.rare ? base * (config.rare?.goldMultiplier ?? 1) : base);
  }, state.gold);
  // F19: ghi loài quái hiếm vừa hạ — món rơi theo loài.
  const rare = killed.find((m) => m.rare);
  return rare ? { gold, rareKilled: rare.kind } : { gold };
}

/** Dòng ngẫu nhiên riêng để chọn quái hiếm (tách khỏi dòng của trận): có hay không thì ván vẫn như nhau. */
const RARE_STREAM = 0x52415245;

/**
 * Đợt 5: từ màn `rare.fromLevel`, xác suất `rare.chance` một con của đội hình mở màn hóa hiếm (máu ×
 * hpMultiplier) — chỉ loại `canBeRare`, không phải loại của nhiệm vụ (quái hiếm không bao giờ cần để
 * thắng); màn không có nhiệm vụ (phải diệt sạch) thì không có.
 */
function withRare(
  seed: number,
  monsters: Monster[],
  level: number,
  config: BattleConfig,
): Monster[] {
  const { rare } = config;
  const { quest } = levelAt(level, config);
  if (!rare || !quest || level < rare.fromLevel) return monsters;
  const candidates = monsters.filter(
    (m) => config.monsterKinds[m.kind].canBeRare && m.kind !== quest.kind,
  );
  const [roll, afterRoll] = nextFloat(seedRng(seed + RARE_STREAM));
  if (candidates.length === 0 || !(roll < rare.chance)) return monsters;
  const [pick] = nextInt(afterRoll, candidates.length);
  const chosen = candidates[pick];
  return monsters.map((m) =>
    m === chosen ? { ...m, hp: m.hp * rare.hpMultiplier, rare: true } : m,
  );
}

/**
 * F11: màn đã thắng — xong nhiệm vụ; màn không có nhiệm vụ thì sân sạch và đã ra hết các đợt quái.
 */
function isLevelCleared(
  level: LevelConfig,
  questProgress: number,
  monsters: readonly Monster[],
  nextWave: number,
): boolean {
  if (level.quest) return questProgress >= level.quest.count;
  return monsters.length === 0 && nextWave >= (level.waves?.length ?? 0);
}

/**
 * F11: sân còn ≤ nextWaveAt con và còn đợt chưa ra thì đợt kế tràn vào vòng ngoài cùng (placeLineup),
 * id nối tiếp mọi con đã ra. Vòng ngoài không đủ lát trống cho cả đợt thì đợt đó chờ lượt sau.
 */
function spawnWave(state: BattleState, config: BattleConfig): BattleState {
  const level = levelAt(state.level, config);
  const waves = level.waves ?? [];
  const lineup = waves[state.nextWave];
  if (!lineup || state.monsters.length > (level.nextWaveAt ?? 0)) return state;
  const outer = config.ringCount - 1;
  const taken = new Set(state.monsters.filter((m) => m.ring === outer).map((m) => m.sector));
  if (config.sectorCount - taken.size < lineup.length) return state;
  const firstId = nextIdOf(state, level);
  const [monsters, rng] = placeLineup(state.rng, lineup, firstId, level, taken, config);
  return {
    ...state,
    rng,
    monsters: [...state.monsters, ...monsters],
    nextWave: state.nextWave + 1,
    nextId: firstId + monsters.length,
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

/**
 * Đổi vũ khí đang cầm. Không tốn lượt, quái không di chuyển — chỉ chém mới tốn lượt. B4: chỉ được
 * cầm vũ khí đã mang vào trận.
 */
export function selectWeapon(state: BattleState, index: number, config: BattleConfig): BattleState {
  if (state.phase !== 'playing') {
    throw new Error(`Trận đã kết thúc (${state.phase}), không thể đổi vũ khí`);
  }
  const weapon = weaponAt(index, config);
  if (!state.loadout.weapons.includes(index)) {
    throw new RangeError(`Không mang "${weapon.name}" vào trận này`);
  }
  return { ...state, weaponIndex: index };
}

/**
 * F12: quái đánh trúng được ở lượt này không — quái ma vô hình ở lượt chẵn của màn (lượt 2, 4, 6…, đếm
 * nhát chém sắp tới từ 1), nhát chém và skill đi xuyên qua. Nguồn duy nhất cho luật, bot và hình vẽ.
 */
export function canBeHit(monster: Monster, state: BattleState, config: BattleConfig): boolean {
  if (!config.monsterKinds[monster.kind].ghost) return true;
  const strike = levelAt(state.level, config).turnLimit - state.turnsLeft + 1;
  return strike % 2 === 1;
}

/**
 * F03 — combo gom cụm: các con trúng nhát chém theo thứ tự combo. Con ít máu bị chém trước để nhát mạnh nhất dồn
 * vào con trâu nhất; bằng máu thì con gần nhân vật hơn trước, rồi theo id.
 */
function strikeTargets(
  state: BattleState,
  aimSector: number,
  weapon: WeaponConfig,
  config: BattleConfig,
): Monster[] {
  return state.monsters
    .filter(
      (monster) =>
        canBeHit(monster, state, config) &&
        isInZone(monster, aimSector, weapon, config.sectorCount),
    )
    .sort(
      (a, b) =>
        armoredRank(a, config) - armoredRank(b, config) ||
        a.hp - b.hp ||
        a.ring - b.ring ||
        a.id - b.id,
    );
}

/**
 * F20 PR B (chủ dự án duyệt 07/11/2026, mục 2 — agent chọn cách sửa): quái vỏ cứng (`minComboOrder` > 1) luôn xếp sau
 * quái thường trong combo — "chém trúng trùm cùng quái khác thì trùm mất máu", không phụ thuộc máu ai thấp hơn.
 */
function armoredRank(monster: Monster, config: BattleConfig): number {
  return (config.monsterKinds[monster.kind].minComboOrder ?? 1) > 1 ? 1 : 0;
}

/** Con thứ n ăn n × sát thương vũ khí × hệ số chí mạng. F19: vỏ cứng — đứng trước thứ tự tối thiểu thì 0. */
function strikeHits(
  targets: readonly Monster[],
  weapon: WeaponConfig,
  multiplier: number,
  config: BattleConfig,
): Hit[] {
  return targets.map((monster, order) => {
    const armored = order + 1 < (config.monsterKinds[monster.kind].minComboOrder ?? 1);
    // F19: khiên của Pháp sư đỡ trọn đòn (con có khiên vẫn giữ chỗ trong combo).
    const damage = armored || monster.shield ? 0 : weapon.damage * (order + 1) * multiplier;
    return { monsterId: monster.id, damage, killed: monster.hp - damage <= 0 };
  });
}

/**
 * F19: nhát chém bằng vũ khí `weaponIndex` vào `aimSector` sẽ trúng ai, mỗi con bao nhiêu (chưa tính chí mạng) —
 * cùng phép tính với playTurn, cho bot và hình vẽ dùng chung.
 */
export function previewHits(
  state: BattleState,
  weaponIndex: number,
  aimSector: number,
  config: BattleConfig,
): Hit[] {
  const weapon = weaponAt(weaponIndex, config);
  return strikeHits(strikeTargets(state, aimSector, weapon, config), weapon, 1, config);
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
  const targets = strikeTargets(state, aimSector, weapon, config);

  // B6 — chí mạng: tung một lần cho cả nhát, chỉ khi có trúng và vũ khí có % chí mạng (0% không tung
  // số, để ván không chí mạng y như trước).
  let rng = state.rng;
  let crit = false;
  const critChance = weapon.critChance ?? 0;
  if (targets.length > 0 && critChance > 0) {
    let roll: number;
    [roll, rng] = nextFloat(rng);
    crit = roll < critChance;
  }
  const hits = strikeHits(targets, weapon, crit ? config.critMultiplier : 1, config);

  const damageById = new Map(hits.map((hit) => [hit.monsterId, hit.damage]));
  // F19: vũ khí choáng (Búa) — con trúng mà còn sống đứng im như bị đóng băng (không đi, không đánh). Con có
  // khiên đỡ trọn đòn: chỉ mất khiên, không choáng.
  const stun = weapon.stunTurns ?? 0;
  const struck: Monster[] = [];
  const killed: Monster[] = [];
  for (const monster of state.monsters) {
    const damage = damageById.get(monster.id);
    if (damage === undefined) {
      struck.push(monster);
      continue;
    }
    const hp = monster.hp - damage;
    if (hp <= 0) {
      killed.push(monster);
      continue;
    }
    const { shield, ...rest } = monster;
    if (shield) struck.push(rest);
    else if (stun > 0)
      struck.push({ ...rest, hp, frozenTurns: Math.max(monster.frozenTurns ?? 0, stun) });
    else struck.push({ ...rest, hp });
  }
  // F19: Nấm nổ bị hạ thì nổ (dây chuyền).
  const blast = resolveBlasts(struck, killed, config);
  const survivors = blast.monsters;
  const allHits = [...hits, ...blast.hits];

  // B6 — hồi máu: nhát trúng đủ nhiều con thì hồi, không quá máu tối đa, trước khi quái đánh.
  const { hp: maxHp, healMinHits, healAmount } = config.hero;
  const healed = hits.length >= healMinHits ? Math.min(healAmount, maxHp - state.heroHp) : 0;
  // F19: Rùa gai phản đòn vũ khí tầm gần (mỗi con trúng); Nấm nổ nổ sát nhân vật — ghi vào kết quả nhát chém.
  const kindOf = new Map(state.monsters.map((m) => [m.id, m.kind]));
  const thorns =
    weapon.slot === 'near'
      ? hits.reduce((sum, hit) => {
          const kind = kindOf.get(hit.monsterId);
          return sum + (kind ? (config.monsterKinds[kind].thorns ?? 0) : 0);
        }, 0)
      : 0;
  const lastAttack = {
    aimSector,
    hits,
    crit,
    healed,
    ...(blast.hits.length > 0 ? { blasts: blast.hits } : {}),
    ...(thorns > 0 ? { thorns } : {}),
    ...(blast.heroDamage > 0 ? { heroBlast: blast.heroDamage } : {}),
  };
  const turnsLeft = state.turnsLeft - 1;
  const skill = state.loadout.skill;
  const skillCharge =
    skill === undefined ? 0 : Math.min(state.skillCharge + 1, config.skills[skill].chargeTurns);
  const level = levelAt(state.level, config);
  const questProgress = questProgressAfter(state, allHits, level);
  const rewards = rewardsAfter(state, allHits, config);
  const common = { turnsLeft, skillCharge, lastAttack, lastSkill: null, questProgress, ...rewards };

  // F11: xong nhiệm vụ thì thắng ngay — quái còn lại không đánh, không đi nữa.
  if (isLevelCleared(level, questProgress, survivors, state.nextWave)) {
    return {
      ...state,
      ...common,
      rng,
      heroHp: state.heroHp + healed,
      monsters: survivors,
      phase: 'won',
      lossReason: null,
    };
  }

  // F05: đẩy quái ngay sau nhát chém, trước khi quái hành động.
  const knocked = applyKnockback(survivors, hits, weapon, aimSector, config);

  // F04: quái đang áp sát (còn sống sau nhát chém và sau khi bị đẩy) đánh; quái vừa tiến vào vòng 0
  // lượt này chỉ đánh từ lượt sau — đúng những con người chơi đã thấy dấu "!" trước khi chém.
  // F06: mỗi con trừ máu theo sức đánh của loại nó (trùm đánh đau hơn slime).
  // B3: quái bắn đánh từ vòng bắn; bị chém trúng lúc đang có "!" mà còn sống thì choáng, không bắn.
  const stunnedIds = new Set(
    state.monsters
      .filter(
        (m) =>
          config.monsterKinds[m.kind].shootRing !== undefined &&
          damageById.has(m.id) &&
          isThreatening(m, config),
      )
      .map((m) => m.id),
  );
  // B6: quái bị đóng băng không đánh, không bắn (willAttack).
  const damageTaken = knocked.monsters
    .filter((m) => willAttack(m, config) && !stunnedIds.has(m.id))
    .reduce((sum, m) => sum + config.monsterKinds[m.kind].attack, 0);
  const heroHp = Math.max(0, state.heroHp + healed - damageTaken - thorns - blast.heroDamage);

  const moved = moveMonsters(knocked.monsters, rng, config, knocked.pushedIds);
  // F19: quái gọi quái (trùm) — sau khi quái đi, trước khi hết đóng băng (con đang bị băng không gọi).
  const strikes = level.turnLimit - turnsLeft;
  const summoned = summonMonsters(moved.monsters, strikes, nextIdOf(state, level), config);
  const base = {
    ...state,
    ...common,
    heroHp,
    // F19: Pháp sư phủ khiên sau khi quái đi (người chơi thấy khiên trước nhát chém tới). B6: hết lượt này thì bớt
    // một lượt đóng băng.
    monsters: applyShields(summoned.monsters, config).map(thaw),
    rng: moved.rng,
    nextId: summoned.nextId,
  };

  if (heroHp <= 0) {
    return { ...base, phase: 'lost', lossReason: 'heroDefeated' };
  }
  if (turnsLeft <= 0) {
    return { ...base, phase: 'lost', lossReason: 'outOfTurns' };
  }
  // F11: đợt mới ra sau khi quái cũ đã đi — nó đứng ở vòng ngoài, lượt sau mới đi.
  return spawnWave({ ...base, phase: 'playing', lossReason: null }, config);
}

/**
 * F05: quái bị chém mà còn sống bị đẩy theo kiểu đẩy của vũ khí, lần lượt theo thứ tự combo.
 * Ô đích có quái khác hoặc nằm ngoài sân thì không bị đẩy. Trả về id những con bị đẩy thành công
 * (chúng đứng yên lượt đó). Không tung số ngẫu nhiên. F19: kiểu `gather` dời về lát giữa của nêm chứa quái.
 */
function applyKnockback(
  survivors: readonly Monster[],
  hits: readonly Hit[],
  weapon: WeaponConfig,
  aimSector: number,
  config: BattleConfig,
): { monsters: Monster[]; pushedIds: Set<number> } {
  const pushedIds = new Set<number>();
  if (weapon.push === 'none') return { monsters: [...survivors], pushedIds };

  const key = (cell: { sector: number; ring: number }) => `${cell.sector}:${cell.ring}`;
  const positions = new Map(survivors.map((m) => [m.id, m]));
  const occupied = new Set(survivors.map(key));
  const centers = aimSectors(aimSector, weapon, config.sectorCount);
  const centerOf = (sector: number) =>
    centers.find((c) => zoneSectors(c, weapon.widthSectors, config.sectorCount).includes(sector)) ??
    sector;

  for (const hit of hits) {
    const monster = positions.get(hit.monsterId);
    if (!monster) continue; // đã chết trong nhát chém
    const center = centerOf(monster.sector);
    const target = knockbackCell(monster, weapon.push, config.sectorCount, center);
    const insideArena = target.ring >= 0 && target.ring < config.ringCount;
    const moved = target.sector !== monster.sector || target.ring !== monster.ring;
    if (!moved || !insideArena || occupied.has(key(target))) continue;

    occupied.delete(key(monster));
    occupied.add(key(target));
    positions.set(monster.id, { ...monster, ...target });
    pushedIds.add(monster.id);
  }

  return { monsters: survivors.map((m) => positions.get(m.id) ?? m), pushedIds };
}

/**
 * Quái sắp đánh sau nhát chém tới — view hiện dấu "!" cho nó. F04: quái cận chiến ở vòng 0. B3: quái
 * bắn ở vòng bắn của loại nó hoặc gần hơn. Quái sắp đánh thì đứng yên, không di chuyển.
 */
export function isThreatening(monster: Monster, config: BattleConfig): boolean {
  return monster.ring <= (config.monsterKinds[monster.kind].shootRing ?? 0);
}

/** B6: quái đang bị đóng băng — đứng im, không đánh, không bắn. */
function isFrozen(monster: Monster): boolean {
  return (monster.frozenTurns ?? 0) > 0;
}

/**
 * Quái sẽ đánh (hoặc bắn) sau nhát chém tới nếu không bị choáng: đang ở vị trí đánh (isThreatening) và
 * không bị đóng băng (B6). View hiện dấu "!" cho đúng những con này.
 */
export function willAttack(monster: Monster, config: BattleConfig): boolean {
  return isThreatening(monster, config) && !isFrozen(monster);
}

/** B6: bớt một lượt đóng băng; hết băng thì bỏ hẳn dấu băng. */
function thaw(monster: Monster): Monster {
  if (monster.frozenTurns === undefined) return monster;
  const { frozenTurns, ...rest } = monster;
  return frozenTurns > 1 ? { ...rest, frozenTurns: frozenTurns - 1 } : rest;
}

function skillAt(state: BattleState, config: BattleConfig): SkillConfig | null {
  const kind = state.loadout.skill;
  return kind === undefined ? null : config.skills[kind];
}

/** B6: skill đang mang đã nạp đầy và trận còn đang chơi — nút skill sáng, bấm được. */
export function canCastSkill(state: BattleState, config: BattleConfig): boolean {
  const skill = skillAt(state, config);
  return state.phase === 'playing' && skill !== null && state.skillCharge >= skill.chargeTurns;
}

/**
 * B6: bấm skill — mọi quái trên sân mất `damage` máu (không combo, không chí mạng, không đẩy), con còn
 * sống bị đóng băng `freezeTurns` lượt. Không tốn lượt, quái không di chuyển; nạp lại từ 0. F11: quái
 * chết tính vào nhiệm vụ, xong nhiệm vụ thì thắng ngay; sân còn ít quái thì đợt kế ra ngay (spawnWave —
 * chỉ lúc đó mới tung số ngẫu nhiên).
 */
export function castSkill(state: BattleState, config: BattleConfig): BattleState {
  if (state.phase !== 'playing') {
    throw new Error(`Trận đã kết thúc (${state.phase}), không thể bấm skill`);
  }
  const kind = state.loadout.skill;
  const skill = skillAt(state, config);
  if (kind === undefined || skill === null) throw new Error('Không mang skill vào trận này');
  if (state.skillCharge < skill.chargeTurns) {
    throw new Error(`Skill mới nạp ${state.skillCharge}/${skill.chargeTurns}, chưa bấm được`);
  }

  // F12: quái ma đang vô hình thì skill đi xuyên qua — không mất máu, không bị đóng băng. F19: quái vỏ cứng
  // (trùm) không mất máu vì skill không phải combo, nhưng vẫn bị đóng băng.
  // F19: khiên của Pháp sư đỡ trọn skill (không mất máu, không bị băng; mất khiên).
  const damageOf = (m: Monster) =>
    (config.monsterKinds[m.kind].minComboOrder ?? 1) > 1 || m.shield ? 0 : skill.damage;
  const hits: Hit[] = [...state.monsters]
    .filter((m) => canBeHit(m, state, config))
    .sort((a, b) => a.id - b.id)
    .map((m) => ({ monsterId: m.id, damage: damageOf(m), killed: m.hp - damageOf(m) <= 0 }));
  const struckIds = new Set(hits.map((hit) => hit.monsterId));
  const alive: Monster[] = [];
  const killed: Monster[] = [];
  for (const m of state.monsters) {
    if (!struckIds.has(m.id)) {
      alive.push(m);
      continue;
    }
    const hp = m.hp - damageOf(m);
    if (hp <= 0) {
      killed.push(m);
      continue;
    }
    const { shield, ...rest } = m;
    if (shield || skill.freezeTurns === 0) alive.push({ ...rest, hp });
    else alive.push({ ...rest, hp, frozenTurns: Math.max(m.frozenTurns ?? 0, skill.freezeTurns) });
  }
  // F19: Nấm nổ bị skill hạ cũng nổ.
  const blast = resolveBlasts(alive, killed, config);
  const monsters = blast.monsters;
  const allHits = [...hits, ...blast.hits];
  const lastSkill = {
    skill: kind,
    hits,
    ...(blast.hits.length > 0 ? { blasts: blast.hits } : {}),
  };
  const level = levelAt(state.level, config);
  const questProgress = questProgressAfter(state, allHits, level);
  const rewards = rewardsAfter(state, allHits, config);
  const heroHp = Math.max(0, state.heroHp - blast.heroDamage);
  const after = {
    ...state,
    monsters,
    heroHp,
    skillCharge: 0,
    lastSkill,
    questProgress,
    ...rewards,
  };

  if (isLevelCleared(level, questProgress, monsters, state.nextWave)) {
    return { ...after, heroHp: state.heroHp, phase: 'won', lossReason: null };
  }
  if (heroHp <= 0) return { ...after, phase: 'lost', lossReason: 'heroDefeated' };
  return spawnWave(after, config);
}

/** F19: hai ô sát nhau (8 ô quanh một ô, quấn qua lát 0) — vùng nổ của Nấm nổ, vùng phủ khiên của Pháp sư. */
function isAdjacent(a: Cell, b: Cell, sectorCount: number): boolean {
  const dSector = Math.abs(wrapSector(a.sector - b.sector + 1, sectorCount) - 1);
  return Math.abs(a.ring - b.ring) <= 1 && dSector <= 1 && (dSector !== 0 || a.ring !== b.ring);
}

/**
 * F19: Nấm nổ trong `killed` (theo thứ tự) nổ — quái còn sống ở 8 ô quanh nó mất `explode` máu (khiên đỡ, vỏ cứng
 * không mất); con chết vì nổ mà cũng là Nấm nổ thì nổ tiếp. Nổ ở vòng 0 thì nhân vật mất máu. Không tung số ngẫu
 * nhiên.
 */
function resolveBlasts(
  alive: readonly Monster[],
  killed: readonly Monster[],
  config: BattleConfig,
): { monsters: Monster[]; hits: Hit[]; heroDamage: number } {
  let monsters = [...alive];
  const hits: Hit[] = [];
  let heroDamage = 0;
  const queue = killed.filter((m) => (config.monsterKinds[m.kind].explode ?? 0) > 0);
  for (let i = 0; i < queue.length; i++) {
    const bomb = queue[i] as Monster;
    const power = config.monsterKinds[bomb.kind].explode ?? 0;
    if (bomb.ring === 0) heroDamage += power;
    const next: Monster[] = [];
    for (const m of monsters) {
      if (!isAdjacent(bomb, m, config.sectorCount)) {
        next.push(m);
        continue;
      }
      const armored = (config.monsterKinds[m.kind].minComboOrder ?? 1) > 1;
      const damage = armored || m.shield ? 0 : power;
      const hp = m.hp - damage;
      hits.push({ monsterId: m.id, damage, killed: hp <= 0 });
      if (hp <= 0) {
        if ((config.monsterKinds[m.kind].explode ?? 0) > 0) queue.push(m);
        continue;
      }
      const { shield, ...rest } = m;
      next.push(shield ? rest : { ...rest, hp });
    }
    monsters = next;
  }
  return { monsters, hits, heroDamage };
}

/** F19: Pháp sư (còn sống, không bị đóng băng) phủ khiên cho quái ở 8 ô quanh nó (không cho chính nó). */
function applyShields(monsters: readonly Monster[], config: BattleConfig): Monster[] {
  const casters = monsters.filter((m) => config.monsterKinds[m.kind].shieldAllies && !isFrozen(m));
  if (casters.length === 0) return [...monsters];
  return monsters.map((m) =>
    !m.shield && casters.some((c) => c.id !== m.id && isAdjacent(c, m, config.sectorCount))
      ? { ...m, shield: true }
      : m,
  );
}

/**
 * F19: thứ tự ô sát bên để đặt quái được gọi — vào trong, hai bên, chéo trong, ra ngoài, chéo ngoài. Cố định để
 * không tung số ngẫu nhiên (ván lặp lại được, người chơi đoán trước được).
 */
const NEIGHBOR_ORDER: readonly (readonly [ring: number, sector: number])[] = [
  [-1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [-1, 1],
  [1, 0],
  [1, -1],
  [1, 1],
];

/**
 * F19: sau lượt thứ every, 2·every… mỗi con quái có `summon`, còn sống và không bị đóng băng, gọi tối đa `count`
 * con ra ô trống sát bên (theo NEIGHBOR_ORDER, trong sân); hết ô thì gọi ít hơn. Xét theo id; quái mới đầy máu,
 * id nối tiếp `firstId`, lượt sau mới đi. F20: `whenAlone` — gọi cả khi 8 ô quanh nó không còn quái nào.
 */
function summonMonsters(
  monsters: readonly Monster[],
  strikes: number,
  firstId: number,
  config: BattleConfig,
): { monsters: Monster[]; nextId: number } {
  const key = (sector: number, ring: number) => `${sector}:${ring}`;
  const occupied = new Set(monsters.map((m) => key(m.sector, m.ring)));
  const added: Monster[] = [];
  let nextId = firstId;
  for (const caller of [...monsters].sort((a, b) => a.id - b.id)) {
    const summon = config.monsterKinds[caller.kind].summon;
    if (!summon || isFrozen(caller)) continue;
    const onTurn = strikes > 0 && strikes % summon.every === 0;
    const alone =
      summon.whenAlone === true &&
      !monsters.some(
        (other) => other.id !== caller.id && isAdjacent(other, caller, config.sectorCount),
      );
    if (!onTurn && !alone) continue;
    let left = summon.count;
    for (const [dRing, dSector] of NEIGHBOR_ORDER) {
      if (left === 0) break;
      const ring = caller.ring + dRing;
      const sector = wrapSector(caller.sector + dSector, config.sectorCount);
      if (ring < 0 || ring >= config.ringCount || occupied.has(key(sector, ring))) continue;
      occupied.add(key(sector, ring));
      added.push({
        id: nextId++,
        kind: summon.kind,
        sector,
        ring,
        hp: config.monsterKinds[summon.kind].hp,
      });
      left--;
    }
  }
  return { monsters: [...monsters, ...added], nextId };
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
    // B6: quái bị đóng băng đứng im, không tung số ngẫu nhiên. F19: quái đứng yên (Tổ nhện) không tự đi.
    if (
      isThreatening(monster, config) ||
      isFrozen(monster) ||
      pushedIds.has(monster.id) ||
      config.monsterKinds[monster.kind].stationary
    )
      continue;
    let roll: number;
    [roll, rng] = nextFloat(rng);

    // F12: quái lao tiến tới `step` vòng — dừng ở ô trống xa nhất trước ô có quái, không quá vòng 0.
    const rule = config.monsterKinds[monster.kind];
    let target = { sector: monster.sector, ring: monster.ring - 1 };
    const deepest = Math.max(0, monster.ring - (rule.step ?? 1));
    for (let ring = target.ring - 1; ring >= deepest; ring--) {
      if (occupied.has(key(target.sector, target.ring)) || occupied.has(key(monster.sector, ring)))
        break;
      target = { sector: monster.sector, ring };
    }
    if (roll >= rule.advanceChance) {
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
