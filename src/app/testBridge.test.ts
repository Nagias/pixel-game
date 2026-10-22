import { beforeEach, describe, expect, it } from 'vitest';
import { installTestBridge, setSnapshotProvider } from './testBridge';

describe('testBridge — cầu nối cho test E2E đọc trạng thái game', () => {
  let target: Window;

  beforeEach(() => {
    target = {} as Window;
    installTestBridge(target);
  });

  it('trả về bản sao: test sửa kết quả cũng không đụng được state thật của game', () => {
    const state = { scene: 'demo', hp: 3 };
    setSnapshotProvider(() => state);
    const copy = target.__PIXEL_GAME__?.snapshot() as { hp: number };
    copy.hp = 0;
    expect(state.hp).toBe(3);
  });

  it('scene tắt thì gỡ được, snapshot trả về null thay vì trạng thái cũ', () => {
    const clear = setSnapshotProvider(() => ({ scene: 'battle' }));
    clear();
    expect(target.__PIXEL_GAME__?.snapshot()).toBeNull();
  });

  it('gỡ của scene cũ không xóa nhầm scene mới đã đăng ký sau', () => {
    const clearOld = setSnapshotProvider(() => ({ scene: 'old' }));
    setSnapshotProvider(() => ({ scene: 'new' }));
    clearOld();
    expect(target.__PIXEL_GAME__?.snapshot()).toEqual({ scene: 'new' });
  });
});
