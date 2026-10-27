// Lõi bộ dò số cân bằng (`npm run tune`, đợt 0): thử mọi tổ hợp "núm vặn" chung (máu quái, số nhát
// nạp skill…), mỗi tổ hợp chọn số lượt riêng từng màn cho gần mục tiêu nhất — các màn độc lập với nhau
// khi núm vặn chung đã cố định. Chỉ đề xuất, không ghi vào cấu hình: chủ dự án duyệt rồi mới áp.
import type { BattleConfig, Difficulty, Loadout } from '../src/features/battle/logic/battleTypes';
import { averageSpare, simulateLevel, winRate, type LevelResult, type Player } from './simCore';

/** Một con số được phép đổi: tên hiện trong bảng, các giá trị thử, cách áp vào cấu hình. */
export interface Knob {
  readonly name: string;
  readonly values: readonly number[];
  readonly apply: (config: BattleConfig, value: number) => BattleConfig;
  /**
   * Núm vặn chỉ ảnh hưởng màn này (đếm từ 0) — vd. độ rộng cụm quái của màn, quái chỉ có ở màn đó:
   * dò riêng cùng số lượt của màn, không nhân chéo với cả game (nhanh hơn nhiều).
   */
  readonly level?: number;
}

export interface TuneSetup {
  readonly player: Player;
  readonly games: number;
  /** Số lượt thử cho mỗi màn, từ…tới (gồm cả hai đầu). */
  readonly turnRange: readonly [min: number, max: number];
  readonly knobs: readonly Knob[];
  /** Các bộ đồ cần đạt mục tiêu ở mỗi màn (vd. bộ mặc định với từng skill). */
  readonly loadouts: (level: number, config: BattleConfig) => Loadout[];
  /** Mục tiêu từng màn, theo thứ tự màn. */
  readonly targets: readonly Difficulty[];
  readonly tolerance: Tolerances;
}

/**
 * Dung sai của một màn (chủ dự án duyệt 27/10/2026): trung bình các bộ đồ trong `mean`, từng bộ đồ riêng trong
 * `perLoadout` (rộng hơn — mỗi loại quái hợp một skill khác nhau).
 */
export interface Tolerances {
  readonly mean: Difficulty;
  readonly perLoadout: Difficulty;
}

export interface LevelPick {
  readonly turnLimit: number;
  /** Giá trị đã chọn của các núm vặn riêng của màn, theo tên. */
  readonly knobs: Readonly<Record<string, number>>;
  readonly score: number;
  /** Mọi bộ đồ đều nằm trong dung sai. */
  readonly ok: boolean;
  readonly results: readonly LevelResult[];
}

export interface Proposal {
  /** Giá trị đã chọn của từng núm vặn chung (không có `level`), theo tên. */
  readonly knobs: Readonly<Record<string, number>>;
  readonly levels: readonly LevelPick[];
  readonly score: number;
  readonly config: BattleConfig;
}

/** Kết quả đo được của một bộ đồ: tỉ lệ thắng và lượt dư trung bình. */
export function measured(result: LevelResult): Difficulty {
  return { winRate: winRate(result), spareTurns: averageSpare(result) };
}

/** Độ lệch so với mục tiêu, tính bằng "số lần dung sai" (cộng hai phần) — 0 là trúng mục tiêu. */
export function deviation(actual: Difficulty, target: Difficulty, tolerance: Difficulty): number {
  return (
    Math.abs(actual.winRate - target.winRate) / tolerance.winRate +
    Math.abs(actual.spareTurns - target.spareTurns) / tolerance.spareTurns
  );
}

/** Trung bình kết quả của các bộ đồ. */
export function meanDifficulty(results: readonly Difficulty[]): Difficulty {
  const n = results.length;
  return {
    winRate: results.reduce((sum, r) => sum + r.winRate, 0) / n,
    spareTurns: results.reduce((sum, r) => sum + r.spareTurns, 0) / n,
  };
}

/** Màn đạt: trung bình các bộ đồ trong dung sai chung, và từng bộ đồ trong dung sai từng bộ đồ. */
export function levelWithinTolerance(
  results: readonly Difficulty[],
  target: Difficulty,
  tolerance: Tolerances,
): boolean {
  return (
    results.length > 0 &&
    withinTolerance(meanDifficulty(results), target, tolerance.mean) &&
    results.every((r) => withinTolerance(r, target, tolerance.perLoadout))
  );
}

/** Nằm trong dung sai: cả tỉ lệ thắng lẫn lượt dư đều không lệch quá dung sai. */
export function withinTolerance(
  actual: Difficulty,
  target: Difficulty,
  tolerance: Difficulty,
): boolean {
  return (
    Math.abs(actual.winRate - target.winRate) <= tolerance.winRate &&
    Math.abs(actual.spareTurns - target.spareTurns) <= tolerance.spareTurns
  );
}

export function withTurnLimit(
  config: BattleConfig,
  level: number,
  turnLimit: number,
): BattleConfig {
  return {
    ...config,
    levels: config.levels.map((l, i) => (i === level ? { ...l, turnLimit } : l)),
  };
}

/** Đo một màn với mọi bộ đồ cần xét: kết quả và tổng độ lệch. */
export function measureLevel(
  config: BattleConfig,
  level: number,
  setup: TuneSetup,
): { score: number; ok: boolean; results: LevelResult[] } {
  const target = setup.targets[level];
  if (!target) throw new Error(`Màn ${level + 1} chưa có mục tiêu độ khó`);
  const results = setup
    .loadouts(level, config)
    .map((loadout) => simulateLevel(level, loadout, setup.player, config, setup.games));
  const score = results.reduce(
    (sum, r) => sum + deviation(measured(r), target, setup.tolerance.mean),
    0,
  );
  const ok = levelWithinTolerance(results.map(measured), target, setup.tolerance);
  return { score, ok, results };
}

/** Mọi tổ hợp giá trị của các núm vặn (theo thứ tự khai báo), kèm cấu hình đã áp. */
function combinations(
  config: BattleConfig,
  knobs: readonly Knob[],
): { knobs: Record<string, number>; config: BattleConfig }[] {
  let combos: { knobs: Record<string, number>; config: BattleConfig }[] = [{ knobs: {}, config }];
  for (const knob of knobs) {
    combos = combos.flatMap((combo) =>
      knob.values.map((value) => ({
        knobs: { ...combo.knobs, [knob.name]: value },
        config: knob.apply(combo.config, value),
      })),
    );
  }
  return combos;
}

/**
 * `a` tốt hơn `b` không: đạt dung sai ở mọi bộ đồ trước (tổng độ lệch nhỏ chưa chắc đạt — một bộ đồ lệch
 * xa, bộ kia trúng mục tiêu), rồi lệch ít hơn, rồi số lượt gần số hiện tại hơn.
 */
export function betterPick(a: LevelPick, b: LevelPick | null, currentTurns: number): boolean {
  if (b === null) return true;
  if (a.ok !== b.ok) return a.ok;
  if (a.score !== b.score) return a.score < b.score;
  return Math.abs(a.turnLimit - currentTurns) < Math.abs(b.turnLimit - currentTurns);
}

/**
 * Số lượt (và giá trị các núm vặn riêng của màn) tốt nhất cho một màn theo `betterPick`; ngang nhau thì
 * giữ tổ hợp khai báo trước. F11: tổ hợp mà game từ chối (RangeError lúc mở trận — vd. nhiệm vụ cần
 * nhiều quái hơn mọi đợt cộng lại) bị bỏ qua.
 */
export function pickTurns(config: BattleConfig, level: number, setup: TuneSetup): LevelPick {
  const current = config.levels[level]?.turnLimit ?? 0;
  const local = setup.knobs.filter((knob) => knob.level === level);
  let best: LevelPick | null = null;
  const [min, max] = setup.turnRange;
  for (const combo of combinations(config, local)) {
    for (let turnLimit = min; turnLimit <= max; turnLimit++) {
      const tried = withTurnLimit(combo.config, level, turnLimit);
      let measuredLevel: ReturnType<typeof measureLevel>;
      try {
        measuredLevel = measureLevel(tried, level, setup);
      } catch (error) {
        if (error instanceof RangeError) continue; // game từ chối ngay khi mở trận, không tốn thời gian
        throw error;
      }
      const candidate = { turnLimit, knobs: combo.knobs, ...measuredLevel };
      if (betterPick(candidate, best, current)) best = candidate;
    }
  }
  if (best === null) {
    throw new Error(`Màn ${level + 1}: không có tổ hợp hợp lệ (số lượt ${min}…${max})`);
  }
  return best;
}

/**
 * Mọi tổ hợp núm vặn chung, mỗi tổ hợp kèm lựa chọn tốt nhất từng màn; tốt nhất (ít màn không đạt
 * nhất, rồi lệch ít nhất) đứng đầu.
 */
export function tune(config: BattleConfig, setup: TuneSetup): Proposal[] {
  const global = setup.knobs.filter((knob) => knob.level === undefined);
  const proposals = combinations(config, global).map((combo) => {
    const levels = combo.config.levels.map((_, level) => pickTurns(combo.config, level, setup));
    // Mỗi màn chỉ lấy phần của nó từ cấu hình đã dò riêng (núm vặn riêng có thể đổi chỗ khác của
    // cấu hình, vd. con số của loại quái chỉ có ở màn đó).
    const tuned = levels.reduce((c, pick, level) => {
      const own = setup.knobs.filter((knob) => knob.level === level);
      const withLocal = own.reduce((acc, knob) => {
        const value = pick.knobs[knob.name];
        return value === undefined ? acc : knob.apply(acc, value);
      }, c);
      return withTurnLimit(withLocal, level, pick.turnLimit);
    }, combo.config);
    const score = levels.reduce((sum, pick) => sum + pick.score, 0);
    return { knobs: combo.knobs, levels, score, config: tuned };
  });
  const failing = (p: Proposal) => p.levels.filter((pick) => !pick.ok).length;
  return proposals.sort((a, b) => failing(a) - failing(b) || a.score - b.score);
}
