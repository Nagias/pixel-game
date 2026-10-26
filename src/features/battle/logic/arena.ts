// Hình học sân đấu tròn: lát (sector) quấn vòng, vùng đánh của vũ khí, vị trí vùng xanh theo thời gian.
import type { Cell, PushDirection, WeaponConfig } from './battleTypes';

/** F05: ô đích khi một ô bị đẩy theo kiểu `push` (chưa xét ô có trống hay nằm trong sân không). */
export function knockbackCell(cell: Cell, push: PushDirection, sectorCount: number): Cell {
  switch (push) {
    case 'out':
      return { sector: cell.sector, ring: cell.ring + 1 };
    case 'in':
      return { sector: cell.sector, ring: cell.ring - 1 };
    case 'clockwise':
      return { sector: wrapSector(cell.sector + 1, sectorCount), ring: cell.ring };
    case 'none':
      return { sector: cell.sector, ring: cell.ring };
  }
}

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

/**
 * Lát giữa của từng nêm khi ngắm vào `aimSector`: một nêm, hoặc thêm nêm đối diện (lệch nửa vòng) với
 * vũ khí chém hai phía (B2). Nguồn duy nhất cho luật, bot và hình vẽ.
 */
export function aimSectors(aimSector: number, weapon: WeaponConfig, sectorCount: number): number[] {
  if (!weapon.twoSided) return [aimSector];
  return [aimSector, wrapSector(aimSector + sectorCount / 2, sectorCount)];
}

/** Ô có nằm trong vùng đánh của vũ khí (mọi nêm của nó) khi ngắm vào `aimSector` không. */
export function isInZone(
  cell: Cell,
  aimSector: number,
  weapon: WeaponConfig,
  sectorCount: number,
): boolean {
  if (cell.ring < weapon.minRing || cell.ring > weapon.maxRing) return false;
  return aimSectors(aimSector, weapon, sectorCount).some((aim) =>
    zoneSectors(aim, weapon.widthSectors, sectorCount).includes(cell.sector),
  );
}

/** Lát mà vùng xanh đang chỉ vào sau `elapsedMs` mili giây quay đều với chu kỳ `periodMs`. */
export function arcSectorAt(elapsedMs: number, periodMs: number, sectorCount: number): number {
  if (periodMs <= 0) {
    throw new RangeError(`periodMs phải dương, nhận ${periodMs}`);
  }
  const msPerSector = periodMs / sectorCount;
  return wrapSector(Math.floor(elapsedMs / msPerSector), sectorCount);
}
