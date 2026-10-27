// Luật trận đấu: hàm thuần (state cũ + hành động → state mới). Không Phaser, không đồng hồ.
// Thứ tự một lượt: đánh (B6: chí mạng) → kiểm thắng → hồi máu (B6) → đẩy quái (F05) → quái áp sát
// đánh (F04) → quái di chuyển → hết đóng băng (B6) → kiểm hết máu → kiểm hết lượt. F06: mỗi màn mở
// bằng createBattle(seed, config, màn). B6: castSkill đánh cả sân giữa hai nhát chém, không tốn lượt.
import { nextFloat, nextInt, seedRng, type RngState } from '../../../shared/random';
import { isInZone, knockbackCell, wrapSector } from './arena';
import { defaultLoadout, validateLoadout } from './loadout';
import {
  PUSH_DIRECTIONS,
  type BattleConfig,
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
  if (loadout.skill !== undefined && level < config.skillUnlockLevel) {
    throw new RangeError(
      `Màn ${level + 1} chưa được mang skill (mở từ màn ${config.skillUnlockLevel + 1})`,
    );
  }
  const levelConfig = levelAt(level, config);
  const [monsters, rng] = placeLineup(
    seedRng(seed),
    levelConfig.monsters,
    1,
    levelConfig,
    new Set(),
    config,
  );

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
  };
}

/** F11: tiến độ nhiệm vụ sau khi các quái trong `hits` trúng đòn (đếm con chết đúng loại nhiệm vụ). */
function questProgressAfter(state: BattleState, hits: readonly Hit[], level: LevelConfig): number {
  const { quest } = level;
  if (!quest) return state.questProgress;
  const kindById = new Map(state.monsters.map((m) => [m.id, m.kind]));
  const killed = hits.filter((hit) => hit.killed && kindById.get(hit.monsterId) === quest.kind);
  return state.questProgress + killed.length;
}

/** Đợt 3: vàng sau khi các quái trong `hits` trúng đòn — cộng vàng theo loại của từng con bị hạ. */
function goldAfter(state: BattleState, hits: readonly Hit[], config: BattleConfig): number {
  const kindById = new Map(state.monsters.map((m) => [m.id, m.kind]));
  return hits.reduce((sum, hit) => {
    const kind = kindById.get(hit.monsterId);
    return hit.killed && kind !== undefined ? sum + (config.monsterKinds[kind].gold ?? 0) : sum;
  }, state.gold);
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
  const spawned = waves.slice(0, state.nextWave).reduce((sum, wave) => sum + wave.length, 0);
  const firstId = level.monsters.length + spawned + 1;
  const [monsters, rng] = placeLineup(state.rng, lineup, firstId, level, taken, config);
  return {
    ...state,
    rng,
    monsters: [...state.monsters, ...monsters],
    nextWave: state.nextWave + 1,
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
  const targets = state.monsters
    .filter(
      (monster) =>
        canBeHit(monster, state, config) &&
        isInZone(monster, aimSector, weapon, config.sectorCount),
    )
    .sort((a, b) => a.hp - b.hp || a.ring - b.ring || a.id - b.id);

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
  const multiplier = crit ? config.critMultiplier : 1;
  const hits: Hit[] = targets.map((monster, order) => {
    const damage = weapon.damage * (order + 1) * multiplier;
    return { monsterId: monster.id, damage, killed: monster.hp - damage <= 0 };
  });

  const damageById = new Map(hits.map((hit) => [hit.monsterId, hit.damage]));
  const survivors: Monster[] = [];
  for (const monster of state.monsters) {
    const hp = monster.hp - (damageById.get(monster.id) ?? 0);
    if (hp > 0) survivors.push(hp === monster.hp ? monster : { ...monster, hp });
  }

  // B6 — hồi máu: nhát trúng đủ nhiều con thì hồi, không quá máu tối đa, trước khi quái đánh.
  const { hp: maxHp, healMinHits, healAmount } = config.hero;
  const healed = hits.length >= healMinHits ? Math.min(healAmount, maxHp - state.heroHp) : 0;
  const lastAttack = { aimSector, hits, crit, healed };
  const turnsLeft = state.turnsLeft - 1;
  const skill = state.loadout.skill;
  const skillCharge =
    skill === undefined ? 0 : Math.min(state.skillCharge + 1, config.skills[skill].chargeTurns);
  const level = levelAt(state.level, config);
  const questProgress = questProgressAfter(state, hits, level);
  const gold = goldAfter(state, hits, config);
  const common = { turnsLeft, skillCharge, lastAttack, lastSkill: null, questProgress, gold };

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
  const knocked = applyKnockback(survivors, hits, weapon, config);

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
  const heroHp = Math.max(0, state.heroHp + healed - damageTaken);

  const moved = moveMonsters(knocked.monsters, rng, config, knocked.pushedIds);
  const base = {
    ...state,
    ...common,
    heroHp,
    // B6: hết lượt này thì bớt một lượt đóng băng.
    monsters: moved.monsters.map(thaw),
    rng: moved.rng,
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

  // F12: quái ma đang vô hình thì skill đi xuyên qua — không mất máu, không bị đóng băng.
  const hits: Hit[] = [...state.monsters]
    .filter((m) => canBeHit(m, state, config))
    .sort((a, b) => a.id - b.id)
    .map((m) => ({ monsterId: m.id, damage: skill.damage, killed: m.hp - skill.damage <= 0 }));
  const struck = new Set(hits.map((hit) => hit.monsterId));
  const monsters: Monster[] = state.monsters
    .filter((m) => !struck.has(m.id) || m.hp - skill.damage > 0)
    .map((m) => {
      if (!struck.has(m.id)) return m;
      const hp = m.hp - skill.damage;
      if (skill.freezeTurns === 0) return { ...m, hp };
      return { ...m, hp, frozenTurns: Math.max(m.frozenTurns ?? 0, skill.freezeTurns) };
    });
  const lastSkill = { skill: kind, hits };
  const level = levelAt(state.level, config);
  const questProgress = questProgressAfter(state, hits, level);
  const gold = goldAfter(state, hits, config);
  const after = { ...state, monsters, skillCharge: 0, lastSkill, questProgress, gold };

  if (isLevelCleared(level, questProgress, monsters, state.nextWave)) {
    return { ...after, phase: 'won', lossReason: null };
  }
  return spawnWave(after, config);
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
    // B6: quái bị đóng băng đứng im, không tung số ngẫu nhiên.
    if (isThreatening(monster, config) || isFrozen(monster) || pushedIds.has(monster.id)) continue;
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
