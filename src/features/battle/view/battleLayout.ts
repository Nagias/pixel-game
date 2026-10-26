// Phép tính đổi ô trên sân (lát, vòng) sang tọa độ màn hình. Không chứa luật chơi.
// Quy ước góc: 0 = hướng 12 giờ, tăng theo chiều kim đồng hồ (giống chiều quay vùng xanh).
import { aimSectors } from '../logic/arena';
import type { Cell, WeaponConfig } from '../logic/battleTypes';

export interface ArenaLayout {
  readonly centerX: number;
  readonly centerY: number;
  /** Bán kính vùng của nhân vật ở giữa (vòng 0 bắt đầu từ đây). */
  readonly heroRadius: number;
  /** Độ dày mỗi vòng (px). */
  readonly ringWidth: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Bố cục cho khung 360×640: sân tròn bán kính ngoài 160 px, nằm giữa phần trên màn hình. */
export const ARENA_LAYOUT: ArenaLayout = {
  centerX: 180,
  centerY: 300,
  heroRadius: 34,
  ringWidth: 21,
};

const TAU = Math.PI * 2;

export function sectorStartAngle(sector: number, sectorCount: number): number {
  return (sector * TAU) / sectorCount;
}

export function sectorCenterAngle(sector: number, sectorCount: number): number {
  return ((sector + 0.5) * TAU) / sectorCount;
}

export function ringInnerRadius(ring: number, layout: ArenaLayout): number {
  return layout.heroRadius + ring * layout.ringWidth;
}

export function ringCenterRadius(ring: number, layout: ArenaLayout): number {
  return layout.heroRadius + (ring + 0.5) * layout.ringWidth;
}

export function polarToPoint(angle: number, radius: number, layout: ArenaLayout): Point {
  return {
    x: layout.centerX + radius * Math.sin(angle),
    y: layout.centerY - radius * Math.cos(angle),
  };
}

export function cellToPoint(cell: Cell, sectorCount: number, layout: ArenaLayout): Point {
  return polarToPoint(
    sectorCenterAngle(cell.sector, sectorCount),
    ringCenterRadius(cell.ring, layout),
    layout,
  );
}

/** Cung của hình nêm xanh: từ mép đầu lát (aim − half) tới mép cuối lát (aim + half). Không quấn góc. */
export function zoneArc(
  aimSector: number,
  widthSectors: number,
  sectorCount: number,
): { start: number; end: number } {
  const half = (widthSectors - 1) / 2;
  return {
    start: sectorStartAngle(aimSector - half, sectorCount),
    end: sectorStartAngle(aimSector + half + 1, sectorCount),
  };
}

/** Mọi hình nêm xanh cần vẽ khi ngắm `aimSector`: một nêm, hoặc hai nêm đối nhau (B2 — chém hai phía). */
export function zoneArcs(
  aimSector: number,
  weapon: WeaponConfig,
  sectorCount: number,
): { start: number; end: number }[] {
  return aimSectors(aimSector, weapon, sectorCount).map((aim) =>
    zoneArc(aim, weapon.widthSectors, sectorCount),
  );
}

/** Bán kính trong/ngoài của hình nêm xanh: từ mép trong vòng minRing tới mép ngoài vòng maxRing. */
export function zoneRadii(
  reach: Pick<WeaponConfig, 'minRing' | 'maxRing'>,
  layout: ArenaLayout,
): { inner: number; outer: number } {
  return {
    inner: ringInnerRadius(reach.minRing, layout),
    outer: ringInnerRadius(reach.maxRing + 1, layout),
  };
}

// ---------- Thanh nút vũ khí ở đáy màn hình (F02) ----------

export interface WeaponBarLayout {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** Khe giữa hai nút — chạm vào khe không tính là chạm nút nào. */
  readonly gap: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Thanh nút cho khung 360×640: nằm dưới sân tròn (đáy sân ở y = 460), vừa tầm ngón cái. */
export const WEAPON_BAR: WeaponBarLayout = { left: 18, top: 520, width: 324, height: 72, gap: 12 };

/** Chia thanh thành `count` nút bằng nhau, từ trái sang phải. */
export function weaponButtonRects(count: number, bar: WeaponBarLayout): Rect[] {
  const width = (bar.width - bar.gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => ({
    x: bar.left + i * (width + bar.gap),
    y: bar.top,
    width,
    height: bar.height,
  }));
}

/** Nút vũ khí ở điểm chạm (x, y), hoặc null nếu chạm ngoài các nút (tức là chạm vào sân). */
export function weaponButtonAt(
  x: number,
  y: number,
  count: number,
  bar: WeaponBarLayout,
): number | null {
  const index = weaponButtonRects(count, bar).findIndex(
    (r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height,
  );
  return index === -1 ? null : index;
}

/** Điểm chạm nằm trong khung thanh nút vũ khí (kể cả khe giữa hai nút) — vùng này không bao giờ là chém. */
export function isInWeaponBar(x: number, y: number, bar: WeaponBarLayout): boolean {
  return x >= bar.left && x < bar.left + bar.width && y >= bar.top && y < bar.top + bar.height;
}

/** Đổi góc của game (0 = 12 giờ) sang góc Phaser Graphics (0 = 3 giờ). */
export function toPhaserAngle(angle: number): number {
  return angle - Math.PI / 2;
}
