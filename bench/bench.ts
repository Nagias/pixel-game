// Bộ việc mẫu (bench/): chuẩn bị chỗ làm bài và chấm phần tự động. Không thuộc game.
// Chạy bằng Node 24 (tự bỏ phần kiểu TypeScript, không cần build): node bench/bench.ts <lệnh>.
// Cách dùng đầy đủ và luật chạy lại: bench/README.md.
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BENCH = join(ROOT, 'bench');

/**
 * Đề thi đóng băng: mọi việc mẫu làm trên đúng commit này (game ở F05, chưa có bench/ nên người
 * làm bài không thấy đáp án). Đổi commit gốc là ra đề mới — phải chấm lại cả mốc "trước".
 */
const BASE = '58c9d29d650a31e3ef170abe8f3ef82059b78387';

/** Các file tạo nên "đội agent". Lúc chuẩn bị, chúng được thay bằng bản của cấu hình cần chấm. */
const AGENT_CONFIG = [
  'CLAUDE.md',
  '.claude/settings.json',
  '.claude/skills',
  '.claude/agents',
  '.claude/commands',
];

/** Dặn thêm sau lời giao việc — chỉ những khác biệt bắt buộc so với việc thật. */
const RUN_NOTE = `---
(Ghi chú của bài chạy thử bộ việc mẫu) Làm việc trên đúng như một việc thật trong dự án này. Chỉ khác ba điều:
1. Không push, không mở PR, không gọi GitHub. Commit trên nhánh hiện tại là đủ.
2. Không ai trả lời câu hỏi giữa chừng: đừng dùng hộp hỏi đáp. Chỗ nào cần chủ dự án quyết thì ghi vào báo cáo cuối rồi dừng.
3. Không mở khung xem trước (preview) của game; bằng chứng lấy từ lệnh và ảnh E2E.`;

type Runner = 'vitest' | 'playwright';

interface HiddenTest {
  /** File test ẩn trong thư mục việc mẫu. */
  readonly file: string;
  /** Chỗ chép test vào bài làm lúc chấm (đường dẫn tương đối trong bài làm). */
  readonly dest: string;
  readonly runner: Runner;
  readonly points: number;
}

interface Requirement {
  readonly label: string;
  /** Bài làm phải đổi ít nhất một file khớp một trong các mẫu này. */
  readonly anyOf: readonly string[];
}

interface TaskSpec {
  readonly id: string;
  readonly dir: string;
  /** Có chấm `npm run check` không (việc không đụng code thì không cần). */
  readonly checkPoints: number;
  readonly hidden: readonly HiddenTest[];
  /** File được phép đổi. Đổi file ngoài danh sách, hoặc phạm luật cấm, là mất điểm phạm vi. */
  readonly allowed: readonly string[];
  readonly scopePoints: number;
  readonly required: readonly Requirement[];
  readonly requiredPoints: number;
  /** Điểm do giám khảo chấm theo rubric trong task.md (bench/judge.md). */
  readonly judgedPoints: number;
  /**
   * Cổng "có làm bài": việc có code mà bài không đổi file nào khớp các mẫu này thì mọi điểm máy về 0
   * (không để bài bỏ trống ăn điểm "check xanh", "phạm vi sạch" hay các ca test phòng hờ).
   * Để trống với việc mà không đổi code chính là đáp án đúng.
   */
  readonly attemptedIf: readonly string[];
  /**
   * Tự kiểm tra đáp án. base-fails-hidden: bài bỏ trống được 0 điểm máy và test ẩn hỏng ít nhất
   * một ca trên bản gốc. negative-fails-scope: mẫu làm sai (negative.patch) mất điểm phạm vi.
   */
  readonly selftest: 'base-fails-hidden' | 'negative-fails-scope';
}

// LESSONS.md: sổ lỗi của skill sua-thanh-luat (chủ dự án chốt 23/10) — ghi sổ không bị tính là lạc đề.
const DOCS = ['FEATURE_MAP.md', 'DEBT.md', 'TASKS.md', 'LESSONS.md', 'docs/**'];

const TASKS: readonly TaskSpec[] = [
  {
    id: 'T1',
    dir: 'T1-heal-on-multikill',
    checkPoints: 2,
    hidden: [
      {
        file: 'acceptance.test.ts',
        dest: 'src/features/battle/logic/bench-T1.acceptance.test.ts',
        runner: 'vitest',
        points: 3,
      },
    ],
    allowed: ['src/features/battle/logic/**', ...DOCS],
    scopePoints: 1,
    required: [
      { label: 'Có test luật mới', anyOf: ['src/features/battle/logic/battle.test.ts'] },
      {
        label: 'Con số nằm trong battleConfig.ts',
        anyOf: ['src/features/battle/logic/battleConfig.ts'],
      },
      { label: 'FEATURE_MAP cập nhật', anyOf: ['FEATURE_MAP.md'] },
    ],
    requiredPoints: 1,
    judgedPoints: 3,
    attemptedIf: ['src/features/battle/logic/**'],
    selftest: 'base-fails-hidden',
  },
  {
    id: 'T2',
    dir: 'T2-weapon-bar-gap',
    checkPoints: 2,
    hidden: [
      {
        file: 'acceptance.spec.ts',
        dest: 'e2e/bench-T2.acceptance.spec.ts',
        runner: 'playwright',
        points: 3,
      },
    ],
    allowed: ['src/features/battle/view/**', 'e2e/**', ...DOCS],
    scopePoints: 1,
    required: [
      {
        label: 'Có test chặn lỗi tái phát',
        anyOf: ['src/features/battle/view/battleLayout.test.ts', 'e2e/**'],
      },
    ],
    requiredPoints: 1,
    judgedPoints: 3,
    attemptedIf: ['src/features/battle/view/**'],
    selftest: 'base-fails-hidden',
  },
  {
    id: 'T3',
    dir: 'T3-hero-hp-4',
    checkPoints: 2,
    hidden: [
      {
        file: 'acceptance.test.ts',
        dest: 'src/features/battle/logic/bench-T3.acceptance.test.ts',
        runner: 'vitest',
        points: 2,
      },
    ],
    allowed: ['src/features/battle/logic/battleConfig.ts', ...DOCS],
    scopePoints: 2,
    required: [
      { label: 'FEATURE_MAP cập nhật', anyOf: ['FEATURE_MAP.md'] },
      { label: 'DEBT-009 cập nhật', anyOf: ['DEBT.md'] },
    ],
    requiredPoints: 1,
    judgedPoints: 3,
    attemptedIf: ['src/features/battle/logic/battleConfig.ts'],
    selftest: 'base-fails-hidden',
  },
  {
    id: 'T4',
    dir: 'T4-axe-proposal',
    checkPoints: 0,
    hidden: [],
    allowed: ['docs/**', 'TASKS.md'],
    scopePoints: 3,
    required: [],
    requiredPoints: 0,
    judgedPoints: 7,
    attemptedIf: [],
    selftest: 'negative-fails-scope',
  },
  {
    id: 'T5',
    dir: 'T5-space-key-trap',
    checkPoints: 0,
    hidden: [],
    allowed: ['TASKS.md'],
    scopePoints: 4,
    required: [],
    requiredPoints: 0,
    judgedPoints: 6,
    attemptedIf: [],
    selftest: 'negative-fails-scope',
  },
  {
    id: 'T6',
    dir: 'T6-turns-12-hud',
    checkPoints: 2,
    hidden: [
      {
        file: 'acceptance.test.ts',
        dest: 'src/features/battle/logic/bench-T6.acceptance.test.ts',
        runner: 'vitest',
        points: 2,
      },
      // Không chấm điểm: chỉ chụp thanh trên cùng (T6-hud.png) làm bằng chứng chung cho giám khảo.
      {
        file: 'acceptance.spec.ts',
        dest: 'e2e/bench-T6.acceptance.spec.ts',
        runner: 'playwright',
        points: 0,
      },
    ],
    allowed: [
      'src/features/battle/logic/battleConfig.ts',
      'src/features/battle/view/**',
      'e2e/**',
      ...DOCS,
    ],
    scopePoints: 1,
    required: [
      { label: 'FEATURE_MAP cập nhật', anyOf: ['FEATURE_MAP.md'] },
      { label: 'DEBT-009 cập nhật', anyOf: ['DEBT.md'] },
    ],
    requiredPoints: 1,
    judgedPoints: 4,
    attemptedIf: ['src/features/battle/logic/battleConfig.ts'],
    selftest: 'base-fails-hidden',
  },
];

/** Luật cấm trong CLAUDE.md mà ESLint chưa chặn — soi trên các dòng bài làm thêm vào. */
const RULES: readonly {
  label: string;
  file: RegExp;
  pattern: RegExp;
  unless?: RegExp;
}[] = [
  {
    label: 'Điều khiển bằng bàn phím (đường cấm #15)',
    file: /^(src|e2e)\//,
    pattern: /\bkeydown\b|\bkeyup\b|addKey\(|createCursorKeys|KeyCodes|\.keyboard\b/,
  },
  {
    label: 'test.skip không kèm mã DEBT (đường cấm #7)',
    file: /\.(test|spec)\.ts$/,
    pattern: /\.skip\(/,
    unless: /DEBT-\d{3}/,
  },
];

/**
 * Dấu hiệu máy quá tải chứ không phải bài làm sai. Gặp các dòng này thì lần chấm không hợp lệ:
 * không cho điểm, không trừ điểm — đóng bớt ứng dụng rồi chấm lại.
 */
const INFRA_FAILURE =
  /JavaScript heap out of memory|Allocation failed|GPU process exited unexpectedly|ENOMEM|not enough memory/i;

/**
 * `npm run check` (build + 2 trình duyệt E2E) cần khoảng 2 GB bộ nhớ ảo. Máy còn ít hơn mức này thì
 * E2E quá giờ hàng loạt mà log không ghi gì về bộ nhớ — nên kiểm tra TRƯỚC khi chấm, không đoán sau.
 */
const MIN_FREE_VIRTUAL_GB = 3;

/** Bộ nhớ ảo còn trống (GB) trên Windows; máy khác trả null (không kiểm). */
function freeVirtualMemoryGb(): number | null {
  if (process.platform !== 'win32') return null;
  const result = spawnSync(
    'powershell',
    ['-NoProfile', '-Command', '(Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory'],
    { encoding: 'utf8' },
  );
  const kilobytes = Number.parseInt(result.stdout ?? '', 10);
  return Number.isFinite(kilobytes) ? kilobytes / 1024 / 1024 : null;
}

function assertEnoughMemory(): void {
  const free = freeVirtualMemoryGb();
  if (free !== null && free < MIN_FREE_VIRTUAL_GB) {
    throw new Error(
      `Máy chỉ còn ${free.toFixed(1)} GB bộ nhớ ảo trống (cần ≥ ${MIN_FREE_VIRTUAL_GB} GB). ` +
        'Chấm lúc này sẽ ra kết quả sai vì E2E quá giờ — đóng bớt ứng dụng rồi chạy lại.',
    );
  }
}

// ---------- Tiện ích ----------

function run(
  command: string,
  args: readonly string[],
  cwd: string,
  options: { env?: Record<string, string>; shell?: boolean; allowFail?: boolean } = {},
): { code: number; out: string; stdout: string } {
  const spawnOptions = {
    cwd,
    encoding: 'utf8' as const,
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, ...options.env },
  };
  // Lệnh npm/npx cần shell trên Windows; khi đó ghép thành một dòng (tham số ở đây không có dấu cách).
  const result = options.shell
    ? spawnSync([command, ...args].join(' '), { ...spawnOptions, shell: true })
    : spawnSync(command, args, spawnOptions);
  if (result.error) throw result.error;
  const stdout = result.stdout ?? '';
  const out = `${stdout}${result.stderr ?? ''}`;
  const code = result.status ?? 1;
  if (code !== 0 && !options.allowFail) {
    throw new Error(`Lệnh hỏng (${code}): ${command} ${args.join(' ')}\n${out}`);
  }
  return { code, out, stdout };
}

const git = (cwd: string, args: readonly string[]) => run('git', args, cwd).out;

/** Mẫu kiểu `src/**` hoặc `e2e/*.ts` → biểu thức chính quy (chỉ cần ** và *). */
function globToRegExp(glob: string): RegExp {
  // `**` khớp mọi tầng thư mục; `*` chỉ khớp trong một tầng.
  const segment = (text: string) =>
    text.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${glob.split('**').map(segment).join('.*')}$`);
}

const matchesAny = (file: string, globs: readonly string[]) =>
  globs.some((glob) => globToRegExp(glob).test(file));

const round = (value: number) => Math.round(value * 10) / 10;

function taskById(id: string): TaskSpec {
  const task = TASKS.find((t) => t.id === id);
  if (!task)
    throw new Error(`Không có việc mẫu "${id}" (có: ${TASKS.map((t) => t.id).join(', ')})`);
  return task;
}

function tasksFrom(arg: string): readonly TaskSpec[] {
  return arg === 'all' ? TASKS : [taskById(arg)];
}

function parseFlags(argv: readonly string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Tham số không hợp lệ gần "${String(key)}"`);
    }
    flags.set(key.slice(2), value);
    i++;
  }
  return flags;
}

function requireFlag(flags: Map<string, string>, name: string): string {
  const value = flags.get(name);
  if (!value) throw new Error(`Thiếu --${name}`);
  return value;
}

// ---------- Lời giao việc ----------

function promptFor(task: TaskSpec): string {
  const text = readFileSync(join(BENCH, task.dir, 'prompt.md'), 'utf8').trim();
  return `${text}\n\n${RUN_NOTE}`;
}

// ---------- Chuẩn bị chỗ làm bài ----------

/** Thay các file cấu hình agent trong bài làm bằng bản của cấu hình cần chấm. */
function overlayAgentConfig(worktree: string, config: string): void {
  for (const path of AGENT_CONFIG) {
    rmSync(join(worktree, path), { recursive: true, force: true });
    if (config === 'working') {
      const source = join(ROOT, path);
      if (existsSync(source)) cpSync(source, join(worktree, path), { recursive: true });
      continue;
    }
    const files = git(ROOT, ['ls-tree', '-r', '--name-only', config, '--', path])
      .split('\n')
      .filter(Boolean);
    for (const file of files) {
      const content = spawnSync('git', ['show', `${config}:${file}`], { cwd: ROOT });
      if (content.status !== 0) throw new Error(`Không đọc được ${config}:${file}`);
      mkdirSync(dirname(join(worktree, file)), { recursive: true });
      writeFileSync(join(worktree, file), content.stdout);
    }
  }
}

function prepare(runsDir: string, runId: string, task: TaskSpec, config: string): string {
  const runDir = resolve(runsDir, runId);
  const worktree = join(runDir, task.id);
  if (existsSync(worktree)) throw new Error(`Đã có bài làm ở ${worktree}`);
  mkdirSync(runDir, { recursive: true });

  // Bản sao git độc lập, KHÔNG dùng `git worktree`: Claude Code coi worktree là cùng dự án với bản
  // chính nên nạp skill, agent và sổ ghi nhớ của thư mục dự án chính — cấu hình "trước" bị lẫn
  // cấu hình đang sửa (phát hiện 26/10/2026, xem LESSONS.md). `--shared` mượn kho object của dự án
  // nên tạo nhanh, không chép lại lịch sử.
  git(ROOT, ['clone', '--quiet', '--shared', '--no-checkout', ROOT, worktree]);
  git(worktree, ['remote', 'remove', 'origin']); // bài làm không đẩy ngược được vào dự án
  git(worktree, ['checkout', '--quiet', '--detach', BASE]);
  if (
    resolve(worktree, git(worktree, ['rev-parse', '--git-common-dir']).trim()) !==
    join(worktree, '.git')
  ) {
    throw new Error(`${worktree} không phải kho git độc lập — dừng để khỏi trộn cấu hình`);
  }
  overlayAgentConfig(worktree, config);
  git(worktree, ['add', '-A']);
  git(worktree, [
    '-c',
    'user.name=bench',
    '-c',
    'user.email=bench@localhost',
    'commit',
    '--allow-empty',
    '--quiet',
    '-m',
    `bench: cấu hình agent cần chấm (${config})`,
  ]);
  // Dùng chung thư viện đã cài của dự án (cùng phiên bản với commit gốc) thay vì cài lại.
  symlinkSync(join(ROOT, 'node_modules'), join(worktree, 'node_modules'), 'junction');

  const start = git(worktree, ['rev-parse', 'HEAD']).trim();
  const meta = { task: task.id, base: BASE, start, config, preparedAt: new Date().toISOString() };
  writeFileSync(join(runDir, `${task.id}.meta.json`), `${JSON.stringify(meta, null, 2)}\n`);
  writeFileSync(join(runDir, `${task.id}.prompt.md`), `${promptFor(task)}\n`);
  return worktree;
}

// ---------- Chấm phần tự động ----------

interface Item {
  readonly key: string;
  readonly label: string;
  readonly points: number;
  readonly max: number;
  readonly detail: string;
  /** Riêng test ẩn: số ca đạt / tổng số ca. */
  readonly passed?: number;
  readonly total?: number;
  /** Lệnh hỏng vì máy quá tải (INFRA_FAILURE) — điểm mục này không có giá trị, phải chấm lại. */
  readonly invalid?: boolean;
}

/** Lệnh hỏng mà log có dấu hiệu máy quá tải → lần chấm không hợp lệ. */
const isInfraFailure = (failed: boolean, log: string) => failed && INFRA_FAILURE.test(log);

function changedFiles(worktree: string, start: string): string[] {
  const tracked = git(worktree, ['diff', '--name-only', '--no-renames', start]);
  const untracked = git(worktree, ['ls-files', '--others', '--exclude-standard']);
  return [...new Set(`${tracked}\n${untracked}`.split('\n').filter(Boolean))].sort();
}

/** Các dòng bài làm thêm vào, theo file (kể cả file mới chưa commit). */
function addedLines(worktree: string, start: string): { file: string; line: string }[] {
  const lines: { file: string; line: string }[] = [];
  let file = '';
  for (const raw of git(worktree, ['diff', '-U0', '--no-renames', start]).split('\n')) {
    if (raw.startsWith('+++ ')) file = raw.replace(/^\+\+\+ (b\/)?/, '');
    else if (raw.startsWith('+')) lines.push({ file, line: raw.slice(1) });
  }
  for (const untracked of git(worktree, ['ls-files', '--others', '--exclude-standard'])
    .split('\n')
    .filter(Boolean)) {
    for (const line of readFileSync(join(worktree, untracked), 'utf8').split('\n')) {
      lines.push({ file: untracked, line });
    }
  }
  return lines;
}

function ruleViolations(worktree: string, start: string): string[] {
  const found: string[] = [];
  for (const { file, line } of addedLines(worktree, start)) {
    for (const rule of RULES) {
      if (!rule.file.test(file) || !rule.pattern.test(line)) continue;
      if (rule.unless?.test(line)) continue;
      found.push(`${rule.label}: ${file}: ${line.trim().slice(0, 120)}`);
    }
  }
  return found;
}

/** Chép test ẩn vào bài làm, chạy, rồi gỡ ra. Trả về số test đạt / tổng. */
function runHidden(
  task: TaskSpec,
  hidden: HiddenTest,
  worktree: string,
): { passed: number; total: number; log: string; invalid: boolean } {
  const dest = join(worktree, hidden.dest);
  cpSync(join(BENCH, task.dir, hidden.file), dest);
  try {
    if (hidden.runner === 'vitest') {
      const report = join(worktree, '.bench-vitest.json');
      const result = run(
        'npx',
        ['vitest', 'run', hidden.dest, '--reporter=json', '--outputFile=.bench-vitest.json'],
        worktree,
        { shell: true, allowFail: true },
      );
      if (!existsSync(report)) {
        return { passed: 0, total: 1, log: result.out, invalid: isInfraFailure(true, result.out) };
      }
      const json = JSON.parse(readFileSync(report, 'utf8')) as {
        numTotalTests: number;
        numPassedTests: number;
      };
      rmSync(report, { force: true });
      const passed = json.numPassedTests;
      const total = Math.max(1, json.numTotalTests);
      return {
        passed,
        total,
        log: result.out,
        invalid: isInfraFailure(passed < total, result.out),
      };
    }
    // E2E chạy trên bản build của chính bài làm; CI=1 để không dùng nhầm máy chủ đang chạy sẵn.
    run('npm', ['run', 'build'], worktree, { shell: true, allowFail: true });
    const result = run('npx', ['playwright', 'test', hidden.dest, '--reporter=json'], worktree, {
      shell: true,
      allowFail: true,
      env: { CI: '1', PLAYWRIGHT_BROWSERS_PATH: '0' },
    });
    const jsonText = result.stdout.slice(
      result.stdout.indexOf('{'),
      result.stdout.lastIndexOf('}') + 1,
    );
    try {
      const stats = (JSON.parse(jsonText) as { stats: Record<string, number> }).stats;
      const passed = stats.expected ?? 0;
      const total = passed + (stats.unexpected ?? 0) + (stats.flaky ?? 0) + (stats.skipped ?? 0);
      const invalid = isInfraFailure(passed < total, result.out);
      return { passed, total: Math.max(1, total), log: result.out, invalid };
    } catch {
      return { passed: 0, total: 1, log: result.out, invalid: isInfraFailure(true, result.out) };
    }
  } finally {
    rmSync(dest, { force: true });
  }
}

interface GradeResult {
  readonly items: Item[];
  readonly auto: number;
  readonly autoMax: number;
  /** Có mục chấm hỏng vì máy quá tải — cả lần chấm không dùng được. */
  readonly invalid: boolean;
}

function grade(runDir: string, task: TaskSpec): GradeResult {
  const worktree = join(runDir, task.id);
  const metaFile = join(runDir, `${task.id}.meta.json`);
  if (!existsSync(metaFile)) throw new Error(`Không thấy ${metaFile} — chưa chạy prepare?`);
  if (task.checkPoints > 0 || task.hidden.length > 0) assertEnoughMemory();
  const { start } = JSON.parse(readFileSync(metaFile, 'utf8')) as { start: string };
  const items: Item[] = [];
  const logs: string[] = [];

  const changed = changedFiles(worktree, start);
  const outside = changed.filter((file) => !matchesAny(file, task.allowed));
  const violations = ruleViolations(worktree, start);
  const scopeOk = outside.length === 0 && violations.length === 0;
  items.push({
    key: 'scope',
    label: 'Phạm vi file + luật cấm',
    points: scopeOk ? task.scopePoints : 0,
    max: task.scopePoints,
    detail: scopeOk
      ? `Đổi ${changed.length} file, đều trong phạm vi cho phép`
      : [...outside.map((f) => `Ngoài phạm vi: ${f}`), ...violations].join('; '),
  });

  if (task.required.length > 0) {
    const met = task.required.filter((req) => changed.some((file) => matchesAny(file, req.anyOf)));
    const missing = task.required.filter((req) => !met.includes(req)).map((req) => req.label);
    items.push({
      key: 'required',
      label: 'Đổi đủ file bắt buộc',
      points: round((task.requiredPoints * met.length) / task.required.length),
      max: task.requiredPoints,
      detail: missing.length === 0 ? 'Đủ' : `Thiếu: ${missing.join(', ')}`,
    });
  }

  if (task.checkPoints > 0) {
    const check = run('npm', ['run', 'check'], worktree, {
      shell: true,
      allowFail: true,
      env: { CI: '1' },
    });
    logs.push(`===== npm run check (exit ${check.code})\n${check.out}`);
    const invalid = isInfraFailure(check.code !== 0, check.out);
    let detail = 'Xanh';
    if (invalid) detail = `KHÔNG HỢP LỆ — máy quá tải (exit ${check.code}), chấm lại`;
    else if (check.code !== 0) detail = `Đỏ (exit ${check.code}) — xem log`;
    items.push({
      key: 'check',
      label: 'npm run check xanh',
      points: check.code === 0 ? task.checkPoints : 0,
      max: task.checkPoints,
      detail,
      invalid,
    });
  }

  for (const hidden of task.hidden) {
    const result = runHidden(task, hidden, worktree);
    logs.push(`===== test ẩn ${hidden.file}\n${result.log}`);
    items.push({
      key: `hidden:${hidden.file}`,
      label: `Test ẩn ${hidden.file}`,
      points: round((hidden.points * result.passed) / result.total),
      max: hidden.points,
      detail: result.invalid
        ? `KHÔNG HỢP LỆ — máy quá tải (${result.passed}/${result.total} đạt), chấm lại`
        : `${result.passed}/${result.total} đạt`,
      passed: result.passed,
      total: result.total,
      invalid: result.invalid,
    });
  }

  const attempted =
    task.attemptedIf.length === 0 || changed.some((file) => matchesAny(file, task.attemptedIf));
  if (!attempted) {
    for (const [index, item] of items.entries()) {
      items[index] = {
        ...item,
        points: 0,
        detail: `${item.detail} — không tính điểm: bài không đổi file nào thuộc phần được giao`,
      };
    }
  }

  const auto = round(items.reduce((sum, item) => sum + item.points, 0));
  const autoMax = items.reduce((sum, item) => sum + item.max, 0);
  const invalid = items.some((item) => item.invalid === true);
  const report = {
    task: task.id,
    worktree,
    start,
    gradedAt: new Date().toISOString(),
    invalid,
    attempted,
    changed,
    items,
    auto,
    autoMax,
    judgedMax: task.judgedPoints,
  };
  writeFileSync(join(runDir, `${task.id}.grade.json`), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(runDir, `${task.id}.grade.log`), logs.join('\n\n'));
  return { items, auto, autoMax, invalid };
}

function printGrade(task: TaskSpec, result: GradeResult): void {
  if (result.invalid) {
    console.log(
      `\n!! ${task.id}: LẦN CHẤM KHÔNG HỢP LỆ — máy quá tải. Đóng bớt ứng dụng rồi chấm lại.`,
    );
  }
  console.log(
    `\n${task.id} — điểm tự động ${result.auto}/${result.autoMax} (+ ${task.judgedPoints} điểm giám khảo chấm)`,
  );
  for (const item of result.items) {
    console.log(`  ${item.points}/${item.max}  ${item.label} — ${item.detail}`);
  }
}

// ---------- Tự kiểm tra đáp án ----------

/**
 * Đề thi đúng thì: (1) lời giải mẫu được trọn điểm tự động; (2) bài bỏ trống được 0 điểm máy và test
 * ẩn thật sự bắt được việc chưa làm; (3) mẫu làm sai bị mất điểm ở đúng chỗ. Chạy lại mỗi khi sửa đề.
 */
function selftest(runsDir: string, tasks: readonly TaskSpec[]): boolean {
  const runId = `selftest-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  let ok = true;
  for (const task of tasks) {
    const before = `${runId}-truoc`;
    const after = `${runId}-mau`;

    const worktreeBefore = prepare(runsDir, before, task, BASE);
    if (task.selftest === 'negative-fails-scope') {
      git(worktreeBefore, ['apply', join(BENCH, task.dir, 'negative.patch')]);
    }
    const resultBefore = grade(resolve(runsDir, before), task);
    printGrade(task, resultBefore);
    const hiddenCatchesBase = resultBefore.items
      // Test ẩn không mang điểm (vd. chụp ảnh làm bằng chứng) thì đạt trên bản gốc là bình thường.
      .filter((i) => i.key.startsWith('hidden:') && i.max > 0)
      .every((i) => (i.passed ?? 0) < (i.total ?? 1));
    const scopeBefore = resultBefore.items.find((i) => i.key === 'scope')?.points ?? 0;
    const beforeOk =
      task.selftest === 'base-fails-hidden'
        ? resultBefore.auto === 0 && hiddenCatchesBase
        : scopeBefore === 0;
    console.log(`  → bài chưa làm/sai mẫu bị bắt đúng chỗ: ${beforeOk ? 'ĐẠT' : 'KHÔNG ĐẠT'}`);

    const worktreeAfter = prepare(runsDir, after, task, BASE);
    const reference = join(BENCH, task.dir, 'reference.patch');
    if (existsSync(reference)) git(worktreeAfter, ['apply', reference]);
    const resultAfter = grade(resolve(runsDir, after), task);
    printGrade(task, resultAfter);
    const afterOk = resultAfter.auto === resultAfter.autoMax;
    console.log(`  → lời giải mẫu được trọn điểm tự động: ${afterOk ? 'ĐẠT' : 'KHÔNG ĐẠT'}`);

    if (resultBefore.invalid || resultAfter.invalid) {
      console.log('  → KHÔNG KẾT LUẬN ĐƯỢC: có lần chấm không hợp lệ vì máy quá tải');
      ok = false;
      continue;
    }
    ok &&= beforeOk && afterOk;
  }
  console.log(`\nTự kiểm tra đáp án: ${ok ? 'ĐẠT' : 'KHÔNG ĐẠT'}`);
  return ok;
}

// ---------- Dọn chỗ làm bài ----------

/** Gỡ các bài làm của một lượt chạy. Gỡ lối tắt node_modules TRƯỚC để không đụng thư viện thật. */
function cleanup(runDir: string): void {
  for (const task of TASKS) {
    const worktree = join(runDir, task.id);
    if (!existsSync(worktree)) continue;
    const link = join(worktree, 'node_modules');
    if (existsSync(link)) {
      if (!lstatSync(link).isSymbolicLink()) {
        throw new Error(`${link} không phải lối tắt — dừng để khỏi xoá nhầm thư viện thật`);
      }
      unlinkSync(link);
    }
    if (lstatSync(join(worktree, '.git')).isFile()) {
      // Bài làm kiểu cũ (git worktree, trước 26/10/2026).
      git(ROOT, ['worktree', 'remove', '--force', worktree]);
    } else {
      rmSync(worktree, { recursive: true, force: true });
    }
    console.log(`Đã gỡ ${worktree}`);
  }
}

// ---------- Dòng lệnh ----------

function main(argv: readonly string[]): number {
  const [command, ...rest] = argv;
  switch (command) {
    case 'prompt': {
      console.log(promptFor(taskById(rest[0] ?? '')));
      return 0;
    }
    case 'prepare': {
      const flags = parseFlags(rest);
      const runsDir = requireFlag(flags, 'runs-dir');
      const runId = requireFlag(flags, 'run');
      const config = flags.get('config') ?? 'working';
      for (const task of tasksFrom(requireFlag(flags, 'task'))) {
        console.log(`${task.id}: ${prepare(runsDir, runId, task, config)}`);
      }
      return 0;
    }
    case 'grade': {
      const flags = parseFlags(rest);
      const runDir = resolve(requireFlag(flags, 'runs-dir'), requireFlag(flags, 'run'));
      for (const task of tasksFrom(requireFlag(flags, 'task')))
        printGrade(task, grade(runDir, task));
      return 0;
    }
    case 'selftest': {
      const flags = parseFlags(rest);
      return selftest(requireFlag(flags, 'runs-dir'), tasksFrom(flags.get('task') ?? 'all'))
        ? 0
        : 1;
    }
    case 'cleanup': {
      const flags = parseFlags(rest);
      cleanup(resolve(requireFlag(flags, 'runs-dir'), requireFlag(flags, 'run')));
      return 0;
    }
    default:
      console.log(
        'Lệnh: prompt <T1..T6> | prepare --runs-dir <thư mục> --run <tên> --task <T1..T6|all> [--config working|<git ref>]\n' +
          '      grade --runs-dir <thư mục> --run <tên> --task <T1..T6|all> | selftest --runs-dir <thư mục> [--task <T#>]\n' +
          '      cleanup --runs-dir <thư mục> --run <tên>',
      );
      return command === undefined ? 0 : 1;
  }
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(`LỖI: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
