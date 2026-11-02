// F18 đợt D: bố cục màn Bản đồ (học ảnh 1 Micro RPG) và bảng trước trận (ảnh 6). Khung 360×640. Phép tính tọa
// độ thuần, không Phaser, không luật chơi.
import type { Rect } from './battleLayout';
import { navTapAt, type NavTarget } from './navLayout';

/** Số nút màn trên một bản đồ chủ đề (Rừng rậm 20 màn). */
export const LEVEL_COUNT_ON_MAP = 20;

/** Ô vàng góc trên trái. */
export const MAP_GOLD_PILL: Rect = { x: 8, y: 8, width: 112, height: 32 };
/** Băng rôn tên chủ đề (nhãn nhỏ + băng lớn + dòng tiến độ). */
export const BANNER: Rect = { x: 40, y: 46, width: 280, height: 80 };

const COLUMNS = [54, 138, 222, 306] as const;
/** Tâm theo chiều dọc của 5 hàng, hàng 0 (màn 1–4) ở dưới cùng. */
const ROWS = [540, 455, 370, 285, 200] as const;
const NODE = { width: 40, height: 24 } as const;
const BOSS_NODE = { width: 50, height: 30 } as const;

/** Tâm nút màn `level` (đếm từ 0): đường rắn — hàng chẵn trái → phải, hàng lẻ phải → trái. */
function nodeCenter(level: number): { x: number; y: number } {
  const row = Math.floor(level / COLUMNS.length);
  const k = level % COLUMNS.length;
  const column = row % 2 === 0 ? k : COLUMNS.length - 1 - k;
  return { x: COLUMNS[column] ?? COLUMNS[0], y: ROWS[row] ?? ROWS[0] };
}

/** Khung nút màn; `boss` = màn có trùm (nút to hơn, cùng tâm). */
export function levelNodeRect(level: number, boss = false): Rect {
  const { x, y } = nodeCenter(level);
  const size = boss ? BOSS_NODE : NODE;
  return { x: x - size.width / 2, y: y - size.height / 2, width: size.width, height: size.height };
}

export type MapTap = { kind: 'level'; level: number } | { kind: 'nav'; target: NavTarget };

/** Chạm trên bản đồ: nút màn (vùng chạm bằng nút to cho dễ chạm), nút thanh dưới, hoặc null. */
export function mapTapAt(x: number, y: number): MapTap | null {
  for (let level = 0; level < LEVEL_COUNT_ON_MAP; level++) {
    const r = levelNodeRect(level, true);
    if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height)
      return { kind: 'level', level };
  }
  const target = navTapAt(x, y);
  return target ? { kind: 'nav', target } : null;
}

export interface PrebattleLayout {
  readonly panel: Rect;
  /** Thẻ "MÀN n" ở mép trên bảng. */
  readonly title: Rect;
  /** Dải nhiệm vụ: hình quái × số, số lượt. */
  readonly quest: Rect;
  /** Hàng ô "Quái sẽ gặp". */
  readonly monsters: Rect;
  /** Thẻ hiệp sĩ rồi 3 thẻ vũ khí (gần, vừa, xa). */
  readonly gearCards: readonly Rect[];
  readonly skillCard: Rect;
  readonly play: Rect;
  readonly close: Rect;
}

export const PREBATTLE_LAYOUT: PrebattleLayout = {
  panel: { x: 20, y: 88, width: 320, height: 440 },
  title: { x: 130, y: 72, width: 100, height: 30 },
  quest: { x: 34, y: 140, width: 292, height: 52 },
  monsters: { x: 34, y: 212, width: 292, height: 70 },
  gearCards: [36, 108, 180, 252].map((x) => ({ x, y: 314, width: 64, height: 92 })),
  skillCard: { x: 36, y: 418, width: 280, height: 40 },
  play: { x: 140, y: 494, width: 80, height: 66 },
  close: { x: 284, y: 504, width: 44, height: 44 },
};

export type PrebattleTap = 'play' | 'close' | 'gear';

/**
 * Chạm trên bảng trước trận: nút chơi, nút đóng, thẻ vũ khí/skill (mở màn Vũ khí). Thẻ hiệp sĩ và chỗ ngoài
 * bảng không làm gì — chạm nhầm ra ngoài không đóng bảng.
 */
export function prebattleTapAt(x: number, y: number): PrebattleTap | null {
  const inside = (r: Rect) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height;
  const { play, close, gearCards, skillCard } = PREBATTLE_LAYOUT;
  if (inside(play)) return 'play';
  if (inside(close)) return 'close';
  if (gearCards.slice(1).some(inside) || inside(skillCard)) return 'gear';
  return null;
}
