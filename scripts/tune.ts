// Dò số cân bằng (đợt 0): `npm run tune` (thêm `-- --games N` để đổi số ván). Đo bằng bot giỏi nhất so
// với mục tiêu độ khó trong battleConfig.ts, in bảng đề xuất gần mục tiêu nhất kèm số trước/sau — KHÔNG
// ghi vào cấu hình: chủ dự án duyệt rồi agent mới áp tay vào battleConfig.ts.
// Đổi luật hay thêm quái: sửa danh sách KNOBS bên dưới cho đúng việc đang làm (núm vặn = con số được đổi).
import { BALANCE_TOLERANCE, BATTLE_CONFIG } from '../src/features/battle/logic/battleConfig';
import type {
  BattleConfig,
  Difficulty,
  MonsterKind,
} from '../src/features/battle/logic/battleTypes';
import { gamesArg, PLAYERS, targetLoadouts, type Player } from './simCore';
import {
  measured,
  measureLevel,
  tune,
  withinTolerance,
  type Knob,
  type TuneSetup,
} from './tuneCore';

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
const KNOBS: readonly Knob[] = [
  levelSpread(2, [2, 3]),
  monsterStat('máu Slime Vua', ['slimeKing'], 'hp', [6, 7, 8], 2),
  levelCount(3, 'slime', [6, 7, 8]),
  levelSpread(3, [2, 3]),
  levelSpread(4, [4, 5, 6]),
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
  player: PLAYERS['Nhìn trước'] as Player,
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
    const ok = pick.results.every((r) => withinTolerance(measured(r), target, setup.tolerance));
    const now = current[level]?.results.map((r) => show(measured(r))).join(' · ');
    const after = pick.results.map((r) => show(measured(r))).join(' · ');
    const before = BATTLE_CONFIG.levels[level]?.turnLimit;
    console.log(
      `| ${level + 1} | ${show(target)} | ${before} → ${pick.turnLimit} | ${named(pick.knobs) || '—'} | ${now} | ${after} | ${ok ? '✅' : '❌'} |`,
    );
  });
  console.log('');
});
console.log(
  `(${proposals.length} tổ hợp núm vặn, ${((Date.now() - started) / 1000).toFixed(0)} giây)`,
);
