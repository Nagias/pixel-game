// Lõi bộ sinh màn (đợt 7, chủ dự án duyệt 27/10/2026): mô tả màn bằng bản mô tả — loài + khoảng số lượng,
// cụm, đợt sau, ngưỡng ra đợt, nhiệm vụ, khoảng số lượt, mục tiêu độ khó — rồi thử mọi tổ hợp bằng mô
// phỏng, giữ tổ hợp đạt dung sai và lệch ít nhất. Chỉ đề xuất: agent chép màn sinh ra vào battleConfig.ts.
import type {
  BattleConfig,
  Difficulty,
  LevelConfig,
  MonsterKind,
  UpgradeLevels,
} from '../src/features/battle/logic/battleTypes';
import { simulateLevel, targetLoadouts, type LevelResult, type Player } from './simCore';
import {
  deviation,
  levelWithinTolerance,
  meanDifficulty,
  measured,
  type Tolerances,
} from './tuneCore';

/** Một loài và các số lượng được thử (0 = không có loài này). */
export interface KindRange {
  readonly kind: MonsterKind;
  readonly counts: readonly number[];
}

export interface LevelSpec {
  readonly target: Difficulty;
  readonly assumedUpgrades?: UpgradeLevels;
  readonly splitOpposite?: boolean;
  /** Đội hình mở màn: các loài theo thứ tự id. */
  readonly opening: readonly KindRange[];
  readonly spread: readonly number[];
  /** Một đợt sau (bỏ trống hoặc toàn 0 = không có đợt sau). */
  readonly waves?: readonly KindRange[];
  readonly nextWaveAt?: readonly number[];
  readonly quest: { readonly kind: MonsterKind; readonly counts: readonly number[] };
  /** Số lượt thử, từ…tới (gồm cả hai đầu). */
  readonly turns: readonly [min: number, max: number];
}

/** Phần màn do tổ hợp quyết (chưa có số lượt). */
export type LevelShape = Pick<
  LevelConfig,
  'monsters' | 'spread' | 'waves' | 'nextWaveAt' | 'quest'
>;

/** Mọi cách chọn số lượng cho các loài (theo thứ tự khai báo) → danh sách quái. */
function lineups(ranges: readonly KindRange[]): MonsterKind[][] {
  let result: MonsterKind[][] = [[]];
  for (const { kind, counts } of ranges) {
    result = result.flatMap((prefix) =>
      counts.map((n) => [...prefix, ...Array<MonsterKind>(n).fill(kind)]),
    );
  }
  return result;
}

/** Mọi tổ hợp của bản mô tả: đội hình mở màn × cụm × đợt sau × ngưỡng ra đợt × số con nhiệm vụ. */
export function specCombinations(spec: LevelSpec): LevelShape[] {
  const waves = spec.waves ? lineups(spec.waves) : [[]];
  const thresholds = spec.nextWaveAt ?? [0];
  const shapes: LevelShape[] = [];
  for (const monsters of lineups(spec.opening))
    for (const spread of spec.spread)
      for (const wave of waves)
        for (const nextWaveAt of wave.length > 0 ? thresholds : [0])
          for (const count of spec.quest.counts) {
            shapes.push({
              monsters,
              spread,
              ...(wave.length > 0 ? { waves: [wave], nextWaveAt } : {}),
              quest: { kind: spec.quest.kind, count },
            });
          }
  return shapes;
}

export interface GenerateSetup {
  readonly player: Player;
  readonly games: number;
  readonly tolerance: Tolerances;
  /**
   * Chỉ khớp % thắng (con số chủ dự án duyệt); lượt dư mục tiêu của màn sinh ra = số đo trung bình, làm tròn
   * 0,25 — vì lượt dư suy từ công thức có thể mâu thuẫn với cách màn chạy.
   */
  readonly matchWinOnly?: boolean;
}

export interface GeneratedLevel {
  readonly level: LevelConfig;
  readonly ok: boolean;
  readonly score: number;
  readonly results: readonly LevelResult[];
}

/**
 * Sinh màn số `index` (đếm từ 0; ≤ số màn hiện có) theo bản mô tả: thử mọi tổ hợp × số lượt, bỏ qua tổ hợp
 * game từ chối (RangeError lúc mở trận), giữ tổ hợp đạt dung sai trước, rồi lệch ít nhất, rồi ít lượt hơn.
 */
export function generateLevel(
  config: BattleConfig,
  index: number,
  spec: LevelSpec,
  setup: GenerateSetup,
): GeneratedLevel {
  let best: GeneratedLevel | null = null;
  const [min, max] = spec.turns;
  const ignoreSpare = (d: Difficulty): Difficulty => ({ ...d, spareTurns: Infinity });
  const tolerance = setup.matchWinOnly
    ? {
        mean: ignoreSpare(setup.tolerance.mean),
        perLoadout: ignoreSpare(setup.tolerance.perLoadout),
      }
    : setup.tolerance;
  for (const shape of specCombinations(spec)) {
    for (let turnLimit = min; turnLimit <= max; turnLimit++) {
      const level: LevelConfig = {
        ...shape,
        turnLimit,
        target: spec.target,
        ...(spec.assumedUpgrades ? { assumedUpgrades: spec.assumedUpgrades } : {}),
        ...(spec.splitOpposite ? { splitOpposite: true } : {}),
      };
      const levels = [...config.levels];
      levels[index] = level;
      const tried: BattleConfig = { ...config, levels };
      let results: LevelResult[];
      try {
        results = targetLoadouts(index, tried).map((loadout) =>
          simulateLevel(index, loadout, setup.player, tried, setup.games),
        );
      } catch (error) {
        if (error instanceof RangeError) break; // số lượt không làm tổ hợp hết sai
        throw error;
      }
      const actual = results.map(measured);
      const ok = levelWithinTolerance(actual, spec.target, tolerance);
      const score = actual.reduce((sum, r) => sum + deviation(r, spec.target, tolerance.mean), 0);
      const better = best === null || (ok !== best.ok ? ok : score < best.score - 1e-9);
      if (better) best = { level, ok, score, results };
    }
  }
  if (best === null) throw new Error(`Màn ${index + 1}: không có tổ hợp hợp lệ trong bản mô tả`);
  if (!setup.matchWinOnly) return best;
  const spare = meanDifficulty(best.results.map(measured)).spareTurns;
  const target = { ...spec.target, spareTurns: Math.round(spare * 4) / 4 };
  return { ...best, level: { ...best.level, target } };
}
