// Dò số cân bằng (đợt 0): `npm run tune` (thêm `-- --games N` để đổi số ván). Đo bằng kiểu chơi
// TARGET_PLAYER (simCore.ts) so với mục tiêu độ khó trong battleConfig.ts, in bảng đề xuất gần mục tiêu
// nhất kèm số trước/sau — KHÔNG ghi vào cấu hình: chủ dự án duyệt rồi agent mới áp tay vào battleConfig.ts.
// Đổi luật hay thêm quái: sửa danh sách KNOBS bên dưới cho đúng việc đang làm (núm vặn = con số được đổi).
import { BALANCE_TOLERANCE, BATTLE_CONFIG } from '../src/features/battle/logic/battleConfig';
import type {
  BattleConfig,
  Difficulty,
  MonsterKind,
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

/** F11: số con nhiệm vụ phải giết của một màn. */
const questCount = (level: number, values: readonly number[]): Knob => ({
  name: `nhiệm vụ màn ${level + 1}`,
  values,
  level,
  apply: (config, count) => ({
    ...config,
    levels: config.levels.map((l, i) =>
      i === level && l.quest ? { ...l, quest: { ...l.quest, count } } : l,
    ),
  }),
});

/** F11: số quái loại `kind` trong đợt sau đầu tiên của một màn (thêm/bớt ở đầu đợt). */
const waveCount = (level: number, kind: MonsterKind, values: readonly number[]): Knob => ({
  name: `đợt 2 ${BATTLE_CONFIG.monsterKinds[kind].name} màn ${level + 1}`,
  values,
  level,
  apply: (config, count) => ({
    ...config,
    levels: config.levels.map((l, i) => {
      const [first, ...rest] = l.waves ?? [];
      if (i !== level || !first) return l;
      const others = first.filter((k) => k !== kind);
      return { ...l, waves: [[...Array<MonsterKind>(count).fill(kind), ...others], ...rest] };
    }),
  }),
});

/** F11: sân còn ≤ ngần này con thì đợt kế tràn vào. */
const nextWaveAt = (level: number, values: readonly number[]): Knob => ({
  name: `ra đợt khi còn ≤ màn ${level + 1}`,
  values,
  level,
  apply: (config, at) => ({
    ...config,
    levels: config.levels.map((l, i) => (i === level ? { ...l, nextWaveAt: at } : l)),
  }),
});

// F11 (đợt 1): mỗi màn có nhiệm vụ + đợt quái sau, nên núm vặn mịn là số con nhiệm vụ, cỡ đợt sau và
// ngưỡng ra đợt; giữ thêm máu Slime Vua (chỉ ở màn 3). Giá trị thử quanh bộ số hiện tại (27/10/2026).
// Cầu lửa nạp 6 (chủ dự án duyệt 27/10/2026) không dò lại. Màn 3 và 4 không có đợt sau (dò thử: đợt sau
// không đổi kết quả); đội hình màn 3 (4 hộ vệ, cụm ±4) do script dò tạm chọn.
const KNOBS: readonly Knob[] = [
  // Màn 1 dạy đợt quái: nhiệm vụ nhiều hơn 4 con mở màn để đợt sau phải ra.
  questCount(0, [5, 6]),
  waveCount(0, 'slime', [2, 3]),
  nextWaveAt(0, [1, 2]),
  questCount(1, [7, 8, 9]),
  waveCount(1, 'slime', [3, 4]),
  nextWaveAt(1, [2, 3]),
  monsterStat('máu Slime Vua', ['slimeKing'], 'hp', [7, 8, 9], 2),
  questCount(3, [8, 9, 10]),
  waveCount(4, 'slime', [2, 3]),
  nextWaveAt(4, [2, 3]),
  // F12 (đợt 2): màn 6 giới thiệu Slime Lao, màn 7 giới thiệu Slime Ma (mỗi loại chỉ ở màn của nó). Đội
  // hình 2 màn do script dò tạm chọn (nhiều Lao/Ma hơn thì hai skill chênh nhau 10–15%).
  monsterStat('máu Slime Lao', ['slimeCharger'], 'hp', [2, 3, 4], 5),
  waveCount(5, 'slime', [1, 2, 3]),
  nextWaveAt(5, [1, 2]),
  monsterStat('máu Slime Ma', ['slimeGhost'], 'hp', [2, 3], 6),
  waveCount(6, 'slimeMini', [2, 3]),
  nextWaveAt(6, [1, 2]),
];
const TURN_RANGE: readonly [number, number] = [4, 16];
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
