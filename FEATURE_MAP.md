# Bản đồ tính năng

> Quy tắc: PR nào thêm hoặc đổi tính năng thì cập nhật file này **trong cùng PR đó**.
> Luật chơi chính xác nằm trong code + test; ở đây là tóm tắt cho người đọc và chỉ đường tới file.

## Tổng quan

| Mã  | Tính năng                                        | Trạng thái | Code                                 | Test                                                     |
| --- | ------------------------------------------------ | ---------- | ------------------------------------ | -------------------------------------------------------- |
| F01 | Trận đấu tối thiểu (walking skeleton, khuôn mẫu) | ✅ Xong    | `src/features/battle/`               | `src/features/battle/**/*.test.ts`, `e2e/battle.spec.ts` |
| F02 | Thanh 3 nút vũ khí theo tầm (gần / vừa / xa)     | ✅ Xong    | `src/features/battle/` (mở rộng F01) | như F01                                                  |
| F03 | Combo gom cụm 100% / 200% / 300%                 | ✅ Xong    | `src/features/battle/` (mở rộng F01) | như F01                                                  |

## F01 — Trận đấu tối thiểu

**Người chơi thấy và làm gì:** nhân vật đứng giữa sân tròn, một hình nêm xanh quay quanh. Chạm vào
sân để chém mọi quái đang nằm trong vùng xanh. Diệt hết quái trước khi hết lượt hoặc trước khi quái
chạm tới mình thì thắng.

**Luật** (nguồn sự thật: `logic/battle.ts` + `logic/battle.test.ts`):

1. Sân chia 24 lát × 6 vòng; vòng 0 sát nhân vật.
2. Mở trận: 4 slime (2 máu) xuất hiện thành cụm ở vòng ngoài cùng, mỗi con một lát.
3. Vùng xanh quay đều theo chiều kim đồng hồ, hết một vòng sau 2,4 giây. Hình vùng (vòng nào, rộng
   mấy lát) theo vũ khí đang cầm — xem F02.
4. Mỗi lần chém tốn 1 lượt (tối đa 8): mọi quái trong vùng mất máu theo vũ khí và combo (F03), hết
   máu thì biến mất.
5. Sau nhát chém, từng con quái còn sống (theo thứ tự id): 60% tiến vào 1 vòng, 40% đi ngang 1 lát
   ("đi lung tung"); không đi vào ô đã có quái khác.
6. Hết quái → **thắng**. Quái tiến vào từ vòng 0 → **thua** ("Quái đã chạm tới bạn").
   Hết lượt mà còn quái → **thua** ("Hết lượt mà quái vẫn còn"). Nhát cuối vừa diệt hết quái thì vẫn thắng.
7. Cấu hình sai (vd. vùng đánh rộng số chẵn lát, tầm vũ khí vượt sân, không có vũ khí) bị từ chối ngay
   lúc mở trận.

**Hành vi giao diện** (nằm ở `view/BattleScene.ts`, không phải luật): màn kết quả chờ 0,5 giây mới
nhận chạm "chơi lại" (chống chạm nhầm). Game chỉ cho mobile: mọi thao tác là chạm.

**Con số:** `src/features/battle/logic/battleConfig.ts`.

| File                    | Vai trò                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `logic/battleTypes.ts`  | Kiểu dữ liệu: cấu hình, trạng thái trận                                               |
| `logic/battleConfig.ts` | Con số cân bằng, danh sách vũ khí                                                     |
| `logic/arena.ts`        | Hình học sân: lát quấn vòng, vùng đánh, vị trí vùng xanh theo thời gian               |
| `logic/battle.ts`       | `createBattle`, `selectWeapon`, `playTurn`                                            |
| `view/BattleScene.ts`   | Vẽ, nhận chạm, thanh nút vũ khí, số sát thương, màn thắng/thua, `BattleSnapshot`      |
| `view/battleLayout.ts`  | Đổi (lát, vòng) sang tọa độ màn hình; hình nêm xanh khớp vùng luật; vị trí nút vũ khí |
| `view/battleSprites.ts` | Hình hiệp sĩ và slime                                                                 |

**Kiểm chứng tự động:**

- Unit (Vitest): luật đánh, di chuyển quái (chặn ô, quấn vòng lát 0↔23), thắng/thua, từ chối cấu
  hình sai, hàm thuần không sửa đầu vào; hình nêm vẽ ra trùng khít vùng luật coi là trúng (cả góc lẫn
  bán kính); hình sprite không lệch hàng.
- E2E (`e2e/battle.spec.ts` + `e2e/support/battleDriver.ts`, Playwright, khung Pixel 7): mở trận;
  chạm sân chém đúng lát vùng xanh đang chỉ; ngắm chuẩn thì thắng + chống chạm nhầm + chơi lại; chém
  trượt thì thua + chơi lại. Ảnh bằng chứng lưu ở `test-results/`.

**Tự xem:** `npm run dev` → http://localhost:5173/?seed=42 (bỏ `?seed=` để mỗi ván một khác).

**Nợ liên quan:** DEBT-007, DEBT-008, DEBT-009.

## F02 — Thanh 3 nút vũ khí theo tầm

**Người chơi thấy và làm gì:** đáy màn hình có 3 nút Kiếm (gần) · Giáo (vừa) · Cung (xa). Chạm một
nút là cầm vũ khí đó, vùng xanh đổi hình ngay. Chạm vào sân là chém bằng vũ khí đang cầm. Quái mới
xuất hiện ở rìa sân nên lúc đầu chỉ Cung với tới; quái càng áp sát càng phải đổi sang Giáo, Kiếm.
Đây là cách "phạm vi vòng tròn thay đổi" trong ý tưởng ban đầu: phạm vi đổi theo vũ khí đang chọn.

**Luật** (nguồn sự thật: `logic/battle.ts` + `logic/battle.test.ts`, mục `selectWeapon`):

1. Trận mới cầm vũ khí đầu tiên (Kiếm).
2. Đổi vũ khí **không tốn lượt**, quái không di chuyển; chỉ chém mới tốn lượt.
3. Nhát chém dùng vùng của vũ khí đang cầm: Kiếm vòng 0–1 rộng 5 lát; Giáo vòng 2–3 rộng 3 lát;
   Cung vòng 4–5 rộng 1 lát; cùng 1 sát thương.
4. Không đổi được sang vũ khí không có trong danh sách, không đổi khi trận đã kết thúc.

**Hành vi giao diện:** nút đang cầm có viền xanh lá; chạm vào khe giữa hai nút không làm gì (không
tính là chém).

**Con số:** `weapons` trong `src/features/battle/logic/battleConfig.ts`. Thêm vũ khí = thêm một dòng
(đủ cho vũ khí dạng "dải vòng × độ rộng"; vũ khí hình khác như rìu chém trước–sau cần mở rộng luật).

**Kiểm chứng tự động:**

- Unit: trận mới cầm vũ khí đầu; đổi vũ khí không tốn lượt/không tung số ngẫu nhiên; cung trúng quái ở
  rìa còn kiếm thì không; độ rộng theo vũ khí; từ chối vũ khí không tồn tại; chạm điểm nào thì trúng
  nút nào (kể cả khe giữa nút); thanh nút không đè lên sân.
- E2E: chạm nút đổi vũ khí không tốn lượt; chém bằng đúng vũ khí đang cầm; ván thắng phải đổi vũ khí
  đúng lúc (ảnh `2-cam-cung.png`, `3-thang.png`).

**Cân bằng (mô phỏng 500 ván):** ngắm chuẩn thắng 100% nhưng chỉ dư trung bình ~1,6 lượt (F01 dư ~4);
chém bừa thua 100%. Seed 42 dùng cho E2E thắng được, dư 3 lượt.

**Nợ liên quan:** DEBT-009.

## F03 — Combo gom cụm

**Người chơi thấy và làm gì:** chém trúng nhiều quái trong một nhát thì sát thương tăng dần — số bay
lên hiện -1, -2, -3… Người chơi được thưởng khi canh lúc quái đứng sát nhau rồi mới chém.

**Luật** (nguồn sự thật: `logic/battle.ts` + `logic/battle.test.ts`, mục "combo gom cụm"; chủ dự án
duyệt ngày 22/10/2026):

1. Trong một nhát chém, con thứ n bị chém ăn n × sát thương vũ khí: 100%, 200%, 300%… không giới hạn.
2. Thứ tự bị chém: con ít máu nhất trước (nhát mạnh nhất dồn vào con trâu nhất); bằng máu thì con gần
   nhân vật hơn trước; vẫn bằng thì theo id.

**Hành vi giao diện:** không thêm hiệu ứng — số sát thương bay lên sẵn có tự hiện đúng con số combo.

**Kiểm chứng tự động:**

- Unit: 3 quái ăn 1×/2×/3×; con ít máu trước; bằng máu theo vòng rồi theo id; nhân theo sát thương
  vũ khí; ghi lại thứ tự combo trong `lastAttack`.
- E2E: trong ván thắng, mọi nhát chém có sát thương đúng 1×, 2×, 3×… và có ít nhất một nhát trúng từ
  2 quái trở lên (ảnh `3-thang.png` thấy -1, -2 từ cùng một nhát).

**Cân bằng (mô phỏng 500 ván):** ngắm chuẩn thắng 100%, dư trung bình ~2,2 lượt (F02: ~1,6); chém bừa
thắng 0,2%. Seed 42 thắng, dư 4 lượt.

**Nợ liên quan:** DEBT-009.

## Hàng chờ (thứ tự do chủ dự án chốt — chưa duyệt)

| Mã  | Tính năng                                                  | Ghi chú                                                     |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| F04 | Dấu "!" báo quái sắp đánh + máu nhân vật                   | Thay luật "chạm là thua" bằng mất máu                       |
| F05 | Đẩy quái theo vũ khí (knockback)                           |                                                             |
| F06 | Màn chơi nối tiếp + trùm                                   |                                                             |
| F07 | Kho vũ khí (rìu và vũ khí khác) + chọn 3 món mang vào trận | Chủ dự án nêu ngày 22/10; rìu có thể cần hình vùng đánh mới |
| F08 | Skill                                                      | Chủ dự án nêu ngày 22/10; chờ mô tả cơ chế                  |

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
