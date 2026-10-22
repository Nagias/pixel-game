# Kiến trúc — đề xuất thân thiện với agent

> Trạng thái: **đề xuất chờ chủ dự án duyệt** (21/10/2026). Đã dựng thật theo đề xuất này để
> duyệt trên sản phẩm chạy được; đổi lúc này còn rẻ.

## Tóm tắt một dòng

Game web chạy trên trình duyệt (điện thoại trước, máy tính sau), viết bằng **TypeScript + Phaser 3**,
đóng gói bằng **Vite**, test luật chơi bằng **Vitest**, test cả luồng người chơi bằng **Playwright**,
kiểm tra tự động trên **GitHub Actions**. Luật chơi là **hàm thuần** tách hẳn khỏi phần vẽ.

## 1. Tiêu chí chọn (theo yêu cầu của chủ dự án)

1. Công nghệ phổ biến, nhiều tài liệu → agent ít bịa API.
2. Framework có quy ước mạnh sẵn → ít chỗ để tự sáng tác cấu trúc.
3. Thư mục theo tính năng.
4. Mỗi loại việc phổ biến chỉ có **một** đường đúng.
5. Giải thích bằng hệ quả vận hành, không theo mốt.

## 2. Các quyết định

| #   | Quyết định             | Chọn                                                          | Được gì (hệ quả vận hành)                                                                                                                                                             | Đánh đổi / bỏ qua cái gì                                                 | Xem lại khi                                              |
| --- | ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| 1   | Nền tảng               | **Web (HTML5)**, khung dọc 360×640                            | Mở bằng một đường link trên mọi điện thoại/máy tính, không chờ duyệt App Store; test tự động chạy trên trình duyệt thật; đưa lên mạng miễn phí (GitHub Pages)                         | Muốn lên App Store/CH Play phải bọc thêm (Capacitor) — làm sau           | Cần lên chợ ứng dụng                                     |
| 2   | Ngôn ngữ               | **TypeScript strict**                                         | Trình biên dịch bắt lỗi kiểu trước khi chạy → agent sai tên hàm/thiếu trường là đỏ ngay, không lọt vào game                                                                           | Viết dài hơn JavaScript một chút                                         | —                                                        |
| 3   | Engine                 | **Phaser 3.90** (bản cuối dòng 3)                             | Framework game 2D web phổ biến nhất, hơn 10 năm tài liệu và hàng nghìn ví dụ; API đã đóng băng nên tài liệu không lỗi thời; agent kiểm API bằng file kiểu có sẵn trong `node_modules` | Phaser 4 (4/2026) mới hơn nhưng ít ví dụ → agent dễ bịa. Ghi nợ DEBT-001 | Cần tính năng chỉ v4 có, hoặc trình duyệt đổi làm v3 lỗi |
| 4   | Không dùng Unity/Godot | —                                                             | Mọi thứ là file chữ: agent đọc/sửa/diff được hết, CI nhẹ                                                                                                                              | Không có trình chỉnh cảnh kéo-thả                                        | Game cần 3D hoặc vật lý nặng                             |
| 5   | Đóng gói               | **Vite 8**                                                    | Template chính thức của Phaser dùng Vite; khởi động dev < 1 giây, build ~1 giây                                                                                                       | —                                                                        | —                                                        |
| 6   | Test luật chơi         | **Vitest 5**                                                  | Chạy thẳng trong Node, không cần trình duyệt: 77 test trong ~1 giây → agent chạy sau mỗi thay đổi                                                                                     | —                                                                        | —                                                        |
| 7   | Test cả luồng          | **Playwright** + khung điện thoại Pixel 7 + đồng hồ ảo        | Mở game thật, chạm như người chơi, tự cầm đồng hồ nên kết quả lặp lại 100% (80 lượt chạy liên tiếp không sai kết quả; khi máy quá bận có thể quá giờ → chạy 2 trình duyệt song song)  | Tải Chromium ~719 MB vào `node_modules` (ổ D)                            | —                                                        |
| 8   | Lint + định dạng       | **ESLint 10 + typescript-eslint + Prettier**                  | ESLint còn làm "cảnh sát kiến trúc": chặn import Phaser trong luật chơi, chặn `Math.random`, chặn mã màu ngoài bảng… Prettier chấm dứt tranh cãi định dạng, diff sạch                 | 2 công cụ thay vì 1 (Biome) — đổi lại tài liệu nhiều hơn                 | —                                                        |
| 9   | Quản lý gói            | **npm**                                                       | Có sẵn cùng Node, CI không cài thêm gì                                                                                                                                                | pnpm nhanh hơn chút                                                      | —                                                        |
| 10  | Node                   | **24 LTS**, ghim trong `.nvmrc`                               | Hỗ trợ tới 4/2028; CI đọc cùng file nên máy và CI cùng phiên bản                                                                                                                      | Node 20 cũ đã hết hỗ trợ 4/2026                                          | 2028                                                     |
| 11  | CI                     | **GitHub Actions**, 1 job `check` chạy đúng `npm run check`   | Máy local và CI chạy _cùng một lệnh_ → "máy em chạy được" không còn là lý do                                                                                                          | —                                                                        | —                                                        |
| 12  | Bảo vệ nhánh           | **Ruleset dạng file** `.github/rulesets/main-protection.json` | `main` chỉ nhận PR có CI xanh, cấm force push, cấm xóa; cấu hình nằm trong repo nên xem/sửa/khôi phục được                                                                            | Repo phải công khai (gói GitHub miễn phí)                                | Chuyển repo riêng tư                                     |
| 13  | Đồ họa                 | **Sprite vẽ bằng lưới ký tự** + bảng màu **Sweetie 16**       | Agent tự tạo/sửa hình không cần phần mềm vẽ; màu luôn nằm trong bảng → nhân vật "màu sắc rõ ràng"                                                                                     | Hình 16×16 còn đơn giản (DEBT-007)                                       | Có họa sĩ / chốt phong cách                              |

## 3. Kiến trúc mã: lõi thuần + vỏ hiển thị

```text
 Người chơi chạm ──▶ view/BattleScene.ts (Phaser)
                          │ gọi
                          ▼
                logic/battle.ts: playTurn(state, lát đang ngắm, config) ──▶ state mới
                          │                                                    │
                          └──────────── vẽ lại từ state mới ◀──────────────────┘
```

- **`logic/`** — hàm thuần: cùng đầu vào luôn cùng đầu ra. Không Phaser, không DOM, không đồng hồ,
  không `Math.random`; ngẫu nhiên dùng RNG có seed lưu ngay trong state.
  → Test chạy trong mili giây, lặp lại 100%, tái hiện lỗi bằng seed (`?seed=42`), đổi engine đồ
  họa không phải viết lại luật.
- **`view/`** — chỉ đọc state và vẽ; nhận cú chạm rồi gọi logic. Không chứa luật.
- **`*Config.ts`** — mọi con số cân bằng của tính năng ở một file.
- **Cầu nối test** `window.__PIXEL_GAME__.snapshot()` — test E2E đọc trạng thái thật thay vì đoán
  pixel trên màn hình.

## 4. Cấu trúc thư mục (theo tính năng)

```text
src/
  main.ts                    điểm khởi động duy nhất
  app/                       keo dán Phaser dùng chung: tạo game, danh sách scene, cầu nối test, nạp sprite
  shared/                    tiện ích thuần dùng chung: RNG có seed, bảng màu, đọc seed từ link
  features/
    battle/                  ← tính năng mẫu (walking skeleton) — khuôn cho mọi tính năng sau
      logic/                 luật thuần + test đặt cạnh (*.test.ts) + battleConfig.ts
      view/                  scene Phaser, bố cục, sprite
      index.ts               cổng công khai duy nhất của tính năng
e2e/
  *.spec.ts                  test cả luồng, mỗi tính năng một file
  support/gameDriver.ts      cách duy nhất để test điều khiển game
docs/                        kiến trúc, phân tích game tham chiếu, phong cách hình
```

## 5. Một đường đúng cho mỗi việc

Bảng đầy đủ ở `CLAUDE.md` mục 3; các đường cấm và máy chặn bằng gì ở mục 4.

## 6. Chi phí vận hành (đo ngày 21/10/2026)

| Mục                       | Con số                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| Tiền                      | 0 đ — repo công khai: GitHub Actions và Pages miễn phí             |
| Dung lượng trên ổ D       | `node_modules` ~ 1 GB (thư viện 275 MB + Chromium cho test 719 MB) |
| Dung lượng trên ổ C       | 0 (Chromium cố ý đặt trong thư mục dự án)                          |
| Bản game build            | 1,2 MB (nén gzip 323 KB), chủ yếu là Phaser                        |
| `npm run test`            | ~1 giây                                                            |
| `npm run check` (toàn bộ) | 25–60 giây trên máy này, tùy máy đang bận cỡ nào                   |

## 7. Thư viện đang dùng và lý do

| Gói                                                                               | Vai trò                                                        | Lý do có mặt  |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------- |
| `phaser`                                                                          | Engine game                                                    | Quyết định #3 |
| `vite`, `vitest`                                                                  | Build, test luật                                               | #5, #6        |
| `@playwright/test`, `cross-env`                                                   | Test luồng; đặt biến môi trường chạy được cả Windows lẫn Linux | #7            |
| `typescript`, `@types/node`                                                       | Kiểm kiểu                                                      | #2            |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `prettier` | Lint, cảnh sát kiến trúc, định dạng                            | #8            |

Thêm gói mới: ghi một dòng vào bảng này trong cùng PR, kèm lý do.
