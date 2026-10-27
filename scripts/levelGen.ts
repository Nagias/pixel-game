// Bộ sinh màn (đợt 7): `npm run levelgen -- --levels 8-12 --games 200`. Mỗi màn của chủ đề được mô tả bằng
// một bản mô tả (THEME bên dưới); máy thử mọi tổ hợp bằng bot TARGET_PLAYER và in màn đạt mục tiêu, lệch ít
// nhất — KHÔNG tự ghi cấu hình: agent chép vào battleConfig.ts. Thêm chủ đề mới = viết thêm bản mô tả.
import {
  BALANCE_TOLERANCE,
  BATTLE_CONFIG,
  LOADOUT_TOLERANCE,
} from '../src/features/battle/logic/battleConfig';
import type {
  BattleConfig,
  Difficulty,
  LevelConfig,
} from '../src/features/battle/logic/battleTypes';
import { generateLevel } from './levelGenCore';
import { FOREST_SPECS } from './themeForest';
import { gamesArg, PLAYERS, TARGET_PLAYER, type Player } from './simCore';
import { measured } from './tuneCore';

const THEME_SPECS = FOREST_SPECS;

/** Đọc `--levels a-b` (đếm từ 1); không có thì mọi màn của chủ đề. */
function levelRange(argv: readonly string[]): [number, number] {
  const at = argv.indexOf('--levels');
  if (at === -1) return [1, THEME_SPECS.length];
  const match = /^(\d+)(?:-(\d+))?$/.exec(argv[at + 1] ?? '');
  if (!match) throw new RangeError(`--levels phải dạng "8" hoặc "8-12", nhận "${argv[at + 1]}"`);
  const from = Number(match[1]);
  return [from, Number(match[2] ?? from)];
}

const argv = process.argv.slice(2);
const games = gamesArg(argv, 200);
const [from, to] = levelRange(argv);
// Màn chưa sinh nằm giữa: tạm dùng màn 1 cho đủ chỗ (chỉ màn đang sinh được mô phỏng).
const levels: LevelConfig[] = THEME_SPECS.map(
  (_, i) => BATTLE_CONFIG.levels[i] ?? (BATTLE_CONFIG.levels[0] as LevelConfig),
);
const config: BattleConfig = { ...BATTLE_CONFIG, levels };
const setup = {
  player: PLAYERS[TARGET_PLAYER] as Player,
  games,
  tolerance: { mean: BALANCE_TOLERANCE, perLoadout: LOADOUT_TOLERANCE },
  matchWinOnly: true,
};
const show = (d: Difficulty) => `${(100 * d.winRate).toFixed(1)}% / ${d.spareTurns.toFixed(2)}`;

for (let level = from; level <= to; level++) {
  const started = Date.now();
  const spec = THEME_SPECS[level - 1];
  if (!spec) throw new RangeError(`Chủ đề không có màn ${level}`);
  const picked = generateLevel(config, level - 1, spec, setup);
  const measuredText = picked.results.map((r) => show(measured(r))).join(' · ');
  console.log(
    `// Màn ${level} — mục tiêu ${(100 * spec.target.winRate).toFixed(0)}% thắng, đo ${measuredText} ${picked.ok ? '✅' : '❌'} ` +
      `(${games} ván, ${((Date.now() - started) / 1000).toFixed(0)} giây)`,
  );
  console.log(`${JSON.stringify(picked.level)},`);
}
