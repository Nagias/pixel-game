// Cầu nối cho test E2E: `window.__PIXEL_GAME__.snapshot()` trả về trạng thái scene đang chạy dạng JSON.
// Chỉ để ĐỌC — test vẫn chạm màn hình như người chơi thật, không điều khiển game qua đây.
// NỢ DEBT-002: luôn bật kể cả bản phát hành để E2E test đúng bản build thật.

export interface TestBridge {
  snapshot(): unknown;
}

declare global {
  interface Window {
    __PIXEL_GAME__?: TestBridge;
  }
}

let provider: (() => unknown) | null = null;

/**
 * Scene gọi trong create() để test E2E đọc được trạng thái của nó.
 * Trả về hàm gỡ: scene gọi khi tắt (sự kiện SHUTDOWN) để test không đọc phải trạng thái cũ.
 */
export function setSnapshotProvider(next: () => unknown): () => void {
  provider = next;
  return () => {
    if (provider === next) provider = null;
  };
}

/** Gắn cầu nối vào window. Gọi đúng một lần ở main.ts. */
export function installTestBridge(target: Window): void {
  target.__PIXEL_GAME__ = {
    // Sao chép sâu để test không giữ được tham chiếu vào state thật của game.
    snapshot: () => (provider ? structuredClone(provider()) : null),
  };
}
