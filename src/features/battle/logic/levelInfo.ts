// F18 đợt D: thông tin đọc từ cấu hình màn cho giao diện (bảng trước trận, bản đồ). Hàm thuần, chỉ đọc.
import { levelAt } from './battle';
import type { BattleConfig, MonsterKind } from './battleTypes';

/** Các loại quái của màn `level` (đếm từ 0): không trùng, theo thứ tự xuất hiện — mở màn rồi các đợt sau. */
export function levelMonsterKinds(level: number, config: BattleConfig): MonsterKind[] {
  const { monsters, waves = [] } = levelAt(level, config);
  return [...new Set([...monsters, ...waves.flat()])];
}
