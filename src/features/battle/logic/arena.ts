// Hình học sân đấu tròn: lát (sector) quấn vòng, vùng đánh của vũ khí, vị trí vùng xanh theo thời gian.
import type { Cell, WeaponConfig } from './battleTypes';

/** Đưa chỉ số lát về [0, sectorCount), kể cả số âm. */
export function wrapSector(sector: number, sectorCount: number): number {
  return ((sector % sectorCount) + sectorCount) % sectorCount;
}

/** Các lát nằm trong vùng đánh rộng `widthSectors`, giữa là `aimSector`, theo thứ tự chiều kim đồng hồ. */
export function zoneSectors(
  aimSector: number,
  widthSectors: number,
  sectorCount: number,
): number[] {
  if (!Number.isInteger(widthSectors) || widthSectors <= 0 || widthSectors % 2 === 0) {
    throw new RangeError(`widthSectors phải là số nguyên dương lẻ, nhận ${widthSectors}`);
  }
  const half = (widthSectors - 1) / 2;
  const sectors: number[] = [];
  for (let offset = -half; offset <= half; offset++) {
    sectors.push(wrapSector(aimSector + offset, sectorCount));
  }
  return sectors;
}

/** Ô có nằm trong vùng đánh của vũ khí khi ngắm vào `aimSector` không. */
export function isInZone(
  cell: Cell,
  aimSector: number,
  weapon: WeaponConfig,
  sectorCount: number,
): boolean {
  if (cell.ring < weapon.minRing || cell.ring > weapon.maxRing) return false;
  return zoneSectors(aimSector, weapon.widthSectors, sectorCount).includes(cell.sector);
}

/** Lát mà vùng xanh đang chỉ vào sau `elapsedMs` mili giây quay đều với chu kỳ `periodMs`. */
export function arcSectorAt(elapsedMs: number, periodMs: number, sectorCount: number): number {
  if (periodMs <= 0) {
    throw new RangeError(`periodMs phải dương, nhận ${periodMs}`);
  }
  const msPerSector = periodMs / sectorCount;
  return wrapSector(Math.floor(elapsedMs / msPerSector), sectorCount);
}
