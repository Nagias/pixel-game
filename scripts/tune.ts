// Dò số cân bằng (đợt 0): `npm run tune` (thêm `-- --games N` để đổi số ván). Đo bằng kiểu chơi
// TARGET_PLAYER (simCore.ts) so với mục tiêu độ khó trong battleConfig.ts, in bảng đề xuất gần mục tiêu
// nhất kèm số trước/sau — KHÔNG ghi vào cấu hình: chủ dự án duyệt rồi agent mới áp tay vào battleConfig.ts.
// Đổi luật hay thêm quái: sửa danh sách KNOBS bên dưới cho đúng việc đang làm (núm vặn = con số được đổi).
import { BALANCE_TOLERANCE, BATTLE_CONFIG } from '../src/features/battle/logic/battleConfig';
import type {
  BattleConfig,
  Difficulty,
  MonsterKind,
  SkillKind,
} from '../src/features/battle/logic/battleTypes';
import { gamesArg, PLAYERS, TARGET_PLAYER, targetLoadouts, type Player } from './simCore';
import { measured, measureLevel, tune, type Knob, type TuneSetup } from './tuneCore';

/** `level`: chỉ khai báo khi các loại quái này chỉ có ở đúng màn đó. */
const monsterStat = (
  label: string,
  kinds: readonly MonsterKind[],
  stat: 'hp' | 'attack',
  values: readonly number[],
  level?: number,
): Knob => ({
  name: label,
  values,
  ...(level === undefined ? {} : { level }),
  apply: (config, value) => ({
    ...config,
    monsterKinds: Object.fromEntries(
      Object.entries(config.monsterKinds).map(([kind, rule]) => [
        kind,
        kinds.includes(kind as MonsterKind) ? { ...rule, [stat]: value } : rule,
      ]),
    ) as BattleConfig['monsterKinds'],
  }),
});

/** Độ rộng cụm quái của một màn (quái càng tản càng khó gom combo). */
const levelSpread = (level: number, values: readonly number[]): Knob => ({
  name: `cụm màn ${level + 1}`,
  values,
  level,
  apply: (config, spread) => ({
    ...config,
    levels: config.levels.map((l, i) => (i === level ? { ...l, spread } : l)),
  }),
});

/** Số nhát chém trúng để nạp đầy một skill (núm vặn chung: skill dùng ở mọi màn từ màn mở khóa). */
const skillCharge = (skill: SkillKind, values: readonly number[]): Knob => ({
  name: `nạp ${BATTLE_CONFIG.skills[skill].name}`,
  values,
  apply: (config, chargeTurns) => ({
    ...config,
    skills: { ...config.skills, [skill]: { ...config.skills[skill], chargeTurns } },
  }),
});

/** Số quái loại `kind` trong đội hình một màn (thêm/bớt ở cuối đội hình). */
const levelCount = (level: number, kind: MonsterKind, values: readonly number[]): Knob => ({
  name: `số ${BATTLE_CONFIG.monsterKinds[kind].name} màn ${level + 1}`,
  values,
  level,
  apply: (config, count) => ({
    ...config,
    levels: config.levels.map((l, i) => {
      if (i !== level) return l;
      const others = l.monsters.filter((k) => k !== kind);
      return { ...l, monsters: [...others, ...Array<MonsterKind>(count).fill(kind)] };
    }),
  }),
});

// Số lượt đổi 1 là tỉ lệ thắng nhảy 10–30%, nên có thêm núm vặn mịn hơn chỉ ảnh hưởng một màn: cụm quái,
// số quái của màn, Slime Vua (chỉ ở màn 3), Slime Pháo (chỉ ở màn 5). Giá trị thử gồm cả giá trị hiện tại.
// Nạp skill là núm vặn chung: với người chơi trung bình, Cầu lửa thắng màn 4 hơn Mưa băng 6–9% nên chỉnh
// riêng quái của màn không đưa được cả hai skill vào dung sai.
const KNOBS: readonly Knob[] = [
  skillCharge('fireball', [5, 6]),
  levelSpread(2, [2, 3]),
  monsterStat('máu Slime Vua', ['slimeKing'], 'hp', [5, 6, 7], 2),
  levelCount(3, 'slime', [6, 7, 8, 9, 10]),
  levelSpread(3, [2, 3, 4]),
  levelSpread(4, [4, 5, 6]),
  // Khai báo số slime trước số Slime Pháo: đội hình giữ thứ tự slime rồi tới Pháo như battleConfig.ts.
  levelCount(4, 'slime', [6, 7]),
  levelCount(4, 'slimeCannon', [1, 2]),
  monsterStat('máu Slime Pháo', ['slimeCannon'], 'hp', [3, 4, 5], 4),
  monsterStat('sức đánh Slime Pháo', ['slimeCannon'], 'attack', [2, 3], 4),
];
const TURN_RANGE: readonly [number, number] = [5, 13];
const SHOWN = 3;

const targets = BATTLE_CONFIG.levels.map((level, i) => {
  if (!level.target) throw new Error(`Màn ${i + 1} chưa có target trong battleConfig.ts`);
  return level.target;
});
const setup: TuneSetup = {
  player: PLAYERS[TARGET_PLAYER] as Player,
  // Mặc định 500 ván như balance.test.ts (ít hơn có thể đề xuất bộ số mà test lại thấy lệch).
  games: gamesArg(process.argv.slice(2), 500),
  turnRange: TURN_RANGE,
  knobs: KNOBS,
  loadouts: targetLoadouts,
  targets,
  tolerance: BALANCE_TOLERANCE,
};

const show = (d: Difficulty) => `${(100 * d.winRate).toFixed(0)}% / ${d.spareTurns.toFixed(2)}`;
const named = (knobs: Readonly<Record<string, number>>) =>
  Object.entries(knobs)
    .map(([name, value]) => `${name} ${value}`)
    .join(', ');
const started = Date.now();
const proposals = tune(BATTLE_CONFIG, setup);
const current = BATTLE_CONFIG.levels.map((_, level) => measureLevel(BATTLE_CONFIG, level, setup));

console.log(`# Dò số cân bằng — ${setup.games} ván mỗi màn mỗi bộ đồ\n`);
console.log(
  `Dung sai: ±${100 * setup.tolerance.winRate}% thắng, ±${setup.tolerance.spareTurns} lượt dư. ` +
    'Mỗi ô đo: thắng / lượt dư TB, mỗi bộ đồ một ô (bộ mặc định, từng skill nếu màn có skill).\n',
);
proposals.slice(0, SHOWN).forEach((p, rank) => {
  const global = named(p.knobs);
  console.log(
    `## Đề xuất ${rank + 1} — lệch ${p.score.toFixed(2)}${global ? ` (${global})` : ''}\n`,
  );
  console.log(
    '| Màn | Mục tiêu | Lượt hiện → đề xuất | Núm vặn riêng | Hiện tại đo | Đề xuất đo | Đạt |',
  );
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  p.levels.forEach((pick, level) => {
    const target = targets[level] as Difficulty;
    const now = current[level]?.results.map((r) => show(measured(r))).join(' · ');
    const after = pick.results.map((r) => show(measured(r))).join(' · ');
    const before = BATTLE_CONFIG.levels[level]?.turnLimit;
    console.log(
      `| ${level + 1} | ${show(target)} | ${before} → ${pick.turnLimit} | ${named(pick.knobs) || '—'} | ${now} | ${after} | ${pick.ok ? '✅' : '❌'} |`,
    );
  });
  console.log('');
});
console.log(
  `(${proposals.length} tổ hợp núm vặn, ${((Date.now() - started) / 1000).toFixed(0)} giây)`,
);
