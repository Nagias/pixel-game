# Kế hoạch F20 — gom luật vũ khí, sửa trùm màn 20, skill thành phần thưởng

> **Trạng thái: chủ dự án duyệt cả 3 mục ngày 07/11/2026 ("Duyệt hết").** Chạy liên tục như các lượt trước: mỗi
> phần một PR, gộp khi CI xanh; chỗ nào làm không được thì chọn phương án gần nhất và ghi lý do trong PR.

## 1. Vì sao

Chủ dự án (07/11/2026, nguyên văn): "Tôi thấy ngay từ đầu có skill luôn thì không cần thiết. với cả chưa rõ ràng
cơ chế vũ khí, cấp độ vũ khí và rơi." và "tôi chỉ thấy 1 loại màu vũ khí khi vào shop, chỉ có cấp hiếm. Và tôi
cũng không thấy sự khác nhau nào giữa vũ khí hiếm và thường."

Rà luật thấy ba thứ cùng làm vũ khí mạnh lên, mỗi thứ một luật: cấp màu (6 bậc, chỉ cộng chí mạng tới Hiếm),
cấp nâng bằng vàng (0–3, cũng cộng chí mạng), hạn dùng (đồ rơi 10 trận, đồ cửa hàng 5 trận). Thẻ cấp Thường không
ghi chữ "Thường". Mô phỏng (500 ván mỗi màn, 20 màn, `.cache/tier-table.ts`): Hiếm chỉ tăng thắng trung bình
67% → 70%; Hiếm cộng 3 cấp nâng bằng vàng thì 89% — vàng làm game dễ hẳn mà người chơi không nhìn ra vì sao.

Ghi chú: ý chủ dự án ngày 27/10 có "dạng thời gian và dạng vĩnh viễn" cho đồ rơi (F19 PR B làm theo); ngày 07/11
chủ dự án duyệt bỏ đồ có hạn để luật rõ ràng.

## 2. Ba mục đã duyệt

### Mục 1 — Bảng cấp mới, gom một luật

| Cấp         | Cộng so với bản gốc (cộng dồn)          | Thấy khác gì so với cấp trước    |
| ----------- | --------------------------------------- | -------------------------------- |
| Thường      | —                                       | bản gốc                          |
| Tốt         | dài +1 vòng                             | vùng đánh dài thêm 1 vòng        |
| Hiếm        | dài +1 vòng, rộng +2 lát                | rộng thêm 1 lát mỗi bên          |
| Sử thi      | dài +1 vòng, rộng +4 lát                | rộng thêm 1 lát mỗi bên nữa      |
| Huyền thoại | dài +1 vòng, rộng +4 lát, sát thương +1 | sát thương +1                    |
| Thần        | dài +1 vòng, rộng +4 lát, sát thương +2 | sát thương +1 nữa, sét quanh nút |

- Cấp màu là cấp DUY NHẤT của vũ khí, luôn vĩnh viễn; thẻ vũ khí luôn ghi tên cấp (cả "Thường") và tô màu cấp.
- Lên cấp bằng vàng ở màn Nâng cấp (thẻ "Vũ khí"): lên Tốt 35, lên Hiếm 70 (tổng 105 = tổng giá nâng vũ khí F19
  đã duyệt). Sử thi trở lên chỉ có từ quái hiếm.
- Rơi đồ giữ: quái hiếm 50% rơi vũ khí của loài, tỉ lệ cấp 40/28/17/10/4/1%, hai bảo hiểm. Món rơi luôn vĩnh
  viễn; không cao hơn cấp đang có thì đổi vàng (bảng đổi giữ nguyên).
- Bỏ: đồ có hạn (đồ rơi 10 trận, cửa hàng 5 trận), nâng cấp vũ khí 3 cấp (+5% chí mạng), Cửa hàng (gỡ khỏi
  thanh dưới; tính lại khi làm quảng cáo — giai đoạn D).
- Hồ sơ cũ không mất gì: cấp vĩnh viễn giữ; món có hạn còn hạn đổi vàng theo bảng đổi món thừa (món thuê cửa hàng
  tính cấp Hiếm); vàng đã tiêu nâng vũ khí (15 / 30 / 60) trả lại.
- Độ khó các màn không đo lại: đo độ khó vốn không tính cấp vũ khí.

**Agent chọn:** "dài thêm 1 vòng" — vũ khí tầm gần dài ra phía ngoài (Kiếm 0–1 → 0–2), tầm vừa và xa dài vào phía
nhân vật (Giáo 2–3 → 1–3, Cung 4–5 → 3–5, Nỏ 2–5 → 1–5). Thanh nút dưới còn 3 nút: Vũ khí · CHƠI · Nâng cấp.

### Mục 2 — Trùm Người Cây gọi mồi khi quanh nó hết quái

Đo bảng cấp mới thấy vũ khí thêm sát thương làm màn 20 khó hơn (Hiếm 89% → Huyền thoại 55%; bot "Nhìn trước"
cũng tụt): sát thương cao giết hết Yêu tinh mồi, trùm không còn ai đứng trước trong combo nên không mất máu, hết
lượt. Sửa: ngoài cứ 3 lượt, trùm còn gọi Yêu tinh ngay khi 8 ô quanh nó không còn quái nào. Tổ nhện giữ luật cũ.
Chỉnh lại số lượt màn 10, 20 cho đúng mục tiêu % thắng đã duyệt.

**Khi làm (agent chọn, ghi ở PR B):** gọi mồi khi quanh trống chưa đủ — màn 20 vẫn tụt (Hiếm 95% → Huyền thoại 75%)
vì combo xếp con ít máu trước. Thêm: quái vỏ cứng luôn đứng sau quái thường trong combo; máu trùm 9 → 10, màn 10 còn
10 lượt, màn 20 còn 8 lượt.

### Mục 3 — Skill thành phần thưởng

Màn 1–10 chỉ dùng vũ khí. Hạ trùm màn 10 thì có Mưa băng (dùng từ màn 11). Cầu lửa để dành làm phần thưởng sau:
mở khi phá đảo (thắng màn 20). Chỉnh lại màn 3–10 (không còn skill) cho đúng đường % thắng đã duyệt.

**Agent chọn:** chơi lại màn 1–10 sau khi có skill vẫn không mang skill (giữ đúng màn đã thiết kế).

**Đổi khi làm — chủ dự án chọn ngày 07/11/2026 ("Thưởng ở màn 3 và 10"):** đo bằng mô phỏng thấy bản trên không
làm được: không có Mưa băng, người mới bị đánh gục ở màn 3–9 (màn 4: 92% → 27%), muốn về mục tiêu phải rút gần hết
quái mà màn 4, 5, 9 vẫn không đạt; thêm 8 máu cho nhân vật không cứu được; màn 11–20 lại dễ đi (đo lại chỉ với Mưa
băng). Hướng chốt: **mỗi skill là phần thưởng một trận trùm** — hạ Slime Vua (màn 3) có Mưa băng, dùng từ màn 4; hạ
Người Cây (màn 10) có Cầu lửa, dùng từ màn 11. Màn 1–3 chỉ dùng vũ khí. Chỉnh màn 3–6, 8, 9; màn 7, 10–20 giữ.

## 3. Thứ tự làm và cách kiểm chứng

| PR  | Nội dung | Vì sao thứ tự này                                                          |
| --- | -------- | -------------------------------------------------------------------------- |
| A   | Mục 1    | Chủ dự án hỏi trước tiên; không đổi độ khó màn                             |
| B   | Mục 2    | Đổi độ khó màn 10, 20 — làm trước C để C chỉnh màn 3–10 trên luật trùm mới |
| C   | Mục 3    | Chỉnh màn 3–10 sau cùng, một lần                                           |

### PR A — kiểm chứng

- Unit (viết trước, đỏ rồi xanh): bảng cấp cộng đúng dài / rộng / sát thương cho từng tầm; mô tả phần tăng từng
  cấp; lên cấp bằng vàng (giá, tối đa Hiếm, thiếu vàng, vũ khí chưa có); món rơi luôn vĩnh viễn, thấp hơn thì đổi
  vàng; hồ sơ bản 7 → 8 (giữ cấp, đổi món có hạn ra vàng, trả vàng nâng vũ khí); thanh dưới 3 nút.
- E2E: lên cấp vũ khí ở màn Nâng cấp thấy vùng đánh dài ra trong trận; món rơi vĩnh viễn; món thừa đổi vàng; bỏ
  test Cửa hàng; ván chơi liền vẫn qua.
- Thử tay (khung 375×760): thẻ ghi "Thường"; mua Tốt thấy vùng xanh dài thêm 1 vòng; mua Hiếm thấy rộng thêm.

### PR B — kiểm chứng

- Unit: trùm gọi Yêu tinh khi quanh nó trống (cả khi chưa tới lượt thứ 3), không gọi khi còn quái sát bên, Tổ
  nhện không đổi. Mô phỏng: màn 10, 20 trong dung sai; bảng cấp đo lại không còn tụt ở màn 20.
- E2E trùm; thử tay màn 20.

### PR C — kiểm chứng

- Unit: skill mở từ màn 11, Cầu lửa chỉ khi đã phá đảo. Mô phỏng: `balance.test.ts` cả 20 màn trong dung sai.
- E2E: màn 3–10 không có hàng skill, màn 11 có Mưa băng; ván chơi liền qua. Thử tay màn 10 → 11.

### Kiểm chứng cuối

`npm run check` trên mã của main, chơi tay cả luồng từ hồ sơ mới; cập nhật `FEATURE_MAP.md`.
