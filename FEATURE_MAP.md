# Bản đồ tính năng

> Quy tắc: PR nào thêm hoặc đổi tính năng thì cập nhật file này **trong cùng PR đó**.
> Luật chơi chính xác nằm trong code + test; ở đây là tóm tắt cho người đọc và chỉ đường tới file.

## Tổng quan

| Mã  | Tính năng                                        | Trạng thái | Code                   | Test                                                     |
| --- | ------------------------------------------------ | ---------- | ---------------------- | -------------------------------------------------------- |
| F01 | Trận đấu tối thiểu (walking skeleton, khuôn mẫu) | ✅ Xong    | `src/features/battle/` | `src/features/battle/**/*.test.ts`, `e2e/battle.spec.ts` |

## F01 — Trận đấu tối thiểu

**Người chơi thấy và làm gì:** nhân vật đứng giữa sân tròn, một hình nêm xanh quay quanh. Chạm
màn hình (hoặc phím Space) để chém mọi quái đang nằm trong vùng xanh. Diệt hết quái trước khi hết
lượt hoặc trước khi quái chạm tới mình thì thắng.

**Luật** (nguồn sự thật: `logic/battle.ts` + `logic/battle.test.ts`):

1. Sân chia 24 lát × 6 vòng; vòng 0 sát nhân vật.
2. Mở trận: 4 slime (2 máu) xuất hiện thành cụm ở vòng ngoài cùng, mỗi con một lát.
3. Vùng xanh rộng 3 lát, với tới cả 6 vòng, quay đều theo chiều kim đồng hồ, hết một vòng sau 2,4 giây.
4. Mỗi lần chạm tốn 1 lượt (tối đa 8): mọi quái trong vùng mất 1 máu, hết máu thì biến mất.
5. Sau nhát chém, từng con quái còn sống (theo thứ tự id): 60% tiến vào 1 vòng, 40% đi ngang 1 lát
   ("đi lung tung"); không đi vào ô đã có quái khác.
6. Hết quái → **thắng**. Quái tiến vào từ vòng 0 → **thua** ("Quái đã chạm tới bạn").
   Hết lượt mà còn quái → **thua** ("Hết lượt mà quái vẫn còn"). Nhát cuối vừa diệt hết quái thì vẫn thắng.
7. Màn kết quả chờ 0,5 giây mới nhận chạm "chơi lại" (chống chạm nhầm).

**Con số:** `src/features/battle/logic/battleConfig.ts`.

| File                    | Vai trò                                                                         |
| ----------------------- | ------------------------------------------------------------------------------- |
| `logic/battleTypes.ts`  | Kiểu dữ liệu: cấu hình, trạng thái trận                                         |
| `logic/battleConfig.ts` | Con số cân bằng                                                                 |
| `logic/arena.ts`        | Hình học sân: lát quấn vòng, vùng đánh, vị trí vùng xanh theo thời gian         |
| `logic/battle.ts`       | `createBattle`, `playTurn`                                                      |
| `view/BattleScene.ts`   | Vẽ, nhận chạm, số sát thương bay lên, màn thắng/thua, `BattleSnapshot` cho test |
| `view/battleLayout.ts`  | Đổi (lát, vòng) sang tọa độ màn hình; hình nêm xanh khớp vùng luật              |
| `view/battleSprites.ts` | Hình hiệp sĩ và slime                                                           |

**Kiểm chứng tự động:**

- Unit (Vitest): luật đánh, di chuyển quái, thắng/thua, hàm thuần không sửa đầu vào; hình nêm vẽ ra
  trùng khít vùng luật coi là trúng; hình sprite không lệch hàng.
- E2E (`e2e/battle.spec.ts`, Playwright, khung Pixel 7): mở trận; chạm đánh đúng lát vùng xanh đang
  chỉ; ngắm chuẩn thì thắng + màn thắng chống chạm nhầm + chơi lại; chém trượt thì thua. Ảnh bằng
  chứng lưu ở `test-results/`.

**Tự xem:** `npm run dev` → http://localhost:5173/?seed=42 (bỏ `?seed=` để mỗi ván một khác).

**Nợ liên quan:** DEBT-007, DEBT-008, DEBT-009.

**Câu hỏi mở cho chủ dự án:** phạm vi vòng tròn thay đổi theo logic nào (bạn hẹn chốt sau); độ khó.

## Hàng chờ (đề xuất theo thứ tự học từ Micro RPG — chưa duyệt)

| Mã  | Tính năng                                       | Ghi chú                                            |
| --- | ----------------------------------------------- | -------------------------------------------------- |
| F02 | Chọn 1 trong 3 vũ khí theo tầm (gần / vừa / xa) | Vùng xanh đổi theo vũ khí — đúng điều bạn quan sát |
| F03 | Combo gom cụm 100% / 200% / 300%                | Thưởng việc canh lúc quái đứng sát nhau            |
| F04 | Dấu "!" báo quái sắp đánh + máu nhân vật        | Thay luật "chạm là thua" bằng mất máu              |
| F05 | Đẩy quái theo vũ khí (knockback)                |                                                    |
| F06 | Màn chơi nối tiếp + trùm                        |                                                    |

## Mẫu cho tính năng mới (copy khối này)

```markdown
## Fxx — <Tên>

**Người chơi thấy và làm gì:** …
**Luật** (nguồn sự thật: `logic/<f>.ts` + test): 1. … 2. …
**Con số:** `src/features/<f>/logic/<f>Config.ts`
**File:** bảng file → vai trò
**Kiểm chứng tự động:** unit … / E2E …
**Tự xem:** …
**Nợ liên quan:** DEBT-…
**Câu hỏi mở:** …
```
