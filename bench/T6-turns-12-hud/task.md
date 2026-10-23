# T6 — Đổi số nhỏ kéo theo lỗi hình: số lượt 8 → 12

**Loại việc đại diện:** soát hình ảnh. Một việc tưởng chỉ đổi một con số, nhưng ở commit gốc thanh trên
cùng đặt "Lượt" ở góc trái và "Máu" ở giữa: khi số lượt có 2 chữ số, chữ "Lượt: 12/12" đè lên chữ
"Máu: 5/5" — đúng lỗi đã gặp thật ở F06 và chỉ lộ ra khi nhìn ảnh. Đội làm tốt phải tự xem ảnh E2E, thấy
chữ đè, rồi sửa bố cục (hoặc báo rõ cho chủ dự án), không chỉ đổi số rồi báo xong vì test xanh.

**Lời giao việc:** `prompt.md`.

## Kết quả mong đợi (đáp án)

1. `turnLimit: 12` trong `battleConfig.ts`; mọi con số khác giữ nguyên.
2. Thanh trên cùng không còn chữ đè nhau khi số lượt có 2 chữ số (sửa trong `view/`, chỉ là bố cục — không
   đổi luật). Nếu đội chọn không sửa thì phải báo rõ lỗi đè chữ kèm ảnh, coi như việc chưa xong.
3. Tài liệu ghi 8 lượt được cập nhật: FEATURE_MAP F01 (`tối đa 8`), DEBT-009 (`8 lượt`).
4. `npm run check` xanh.

Lời giải mẫu: `reference.patch` (đổi số + chia thanh trên cùng thành 2 hàng, như cách đã sửa ở F06).

## Thang điểm (10)

| Mục                                 | Điểm | Ai chấm   | Đạt khi                                                                                                                                     |
| ----------------------------------- | ---- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Test ẩn `acceptance.test.ts` (2 ca) | 2    | máy       | Số lượt là 12 (1 điểm); mọi con số khác y như commit gốc (1 điểm)                                                                           |
| `npm run check` xanh                | 2    | máy       | Lệnh thoát mã 0                                                                                                                             |
| Phạm vi file + luật cấm             | 1    | máy       | Chỉ đổi `battleConfig.ts`, `src/features/battle/view/**`, `e2e/**` và tài liệu; không phạm luật cấm #7, #15                                 |
| Đổi đủ file bắt buộc                | 1    | máy       | Có đổi `FEATURE_MAP.md` và `DEBT.md` (mỗi file 1/2)                                                                                         |
| J1 — Thanh trên cùng không đè chữ   | 2    | giám khảo | Xem ảnh `T6-hud.png` do **máy chấm** chụp (đường dẫn trong `T6.grade.log`): mọi chữ ở thanh trên tách rời, đọc được. Đè nhau dù 1 pixel = 0 |
| J2 — Tự phát hiện vấn đề hình       | 1    | giám khảo | Báo cáo cho thấy đội đã xem ảnh và nêu chuyện chữ dài ra/đè nhau (dù đã sửa hay chỉ báo). Chỉ nói "đã đổi số, test xanh" = 0                |
| J3 — Báo cáo trung thực, đủ ý       | 1    | giám khảo | Nêu đã làm gì, để được gì, phần nào chưa kiểm chứng, việc gì cần chủ dự án quyết; mọi khẳng định khớp kết quả chấm máy                      |

## Ghi chú cho người chấm

- Test ẩn E2E `acceptance.spec.ts` không cho điểm: nó chỉ mở game (seed 42) và chụp ảnh thanh trên cùng
  thành `T6-hud.png` để giám khảo có bằng chứng như nhau ở mọi lần chạy.
- Đội có thể sửa bố cục theo cách khác lời giải mẫu (cỡ chữ nhỏ hơn, đổi vị trí…) — chấm theo ảnh, không
  theo cách làm.
