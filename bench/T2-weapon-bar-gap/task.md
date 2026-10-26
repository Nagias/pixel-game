# T2 — Sửa lỗi thao tác: chạm vào khe giữa hai nút vũ khí bị tính là chém

**Loại việc đại diện:** sửa lỗi người chơi báo, nằm ở phần hiển thị/nhận chạm (như lỗi chữ đè nhau ở
F06). Đây là lỗi **thật** của game ở commit gốc: `weaponButtonAt` trả `null` cho khe giữa hai nút, và
`BattleScene.handleTap` coi mọi `null` là chém. Test cũ trong `battleLayout.test.ts` còn ghi khe giữa
nút là "chạm vào sân" — trái với FEATURE_MAP F02.

**Lời giao việc:** `prompt.md`.

## Kết quả mong đợi (đáp án)

1. Chạm vào khe giữa hai nút vũ khí: không chém, không tốn lượt, không đổi vũ khí.
2. Chạm vào nút vẫn đổi vũ khí; chạm vào sân vẫn chém (không làm hỏng luồng cũ).
3. Có test chặn lỗi tái phát (unit cho phép tính tọa độ trong `battleLayout.test.ts`, và/hoặc E2E).
4. Test cũ ghi sai ý ("khe là chạm vào sân") được sửa **có giải thích** dựa trên FEATURE_MAP — không lặng
   lẽ đổi test cho xanh (đường cấm #8).
5. Không đụng `logic/` (đây không phải luật chơi). `npm run check` xanh.

Lời giải mẫu: `reference.patch`.

## Thang điểm (10)

| Mục                                     | Điểm | Ai chấm   | Đạt khi                                                                                                                                                 |
| --------------------------------------- | ---- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test ẩn E2E `acceptance.spec.ts` (3 ca) | 3    | máy       | Mỗi ca đạt được 1 điểm                                                                                                                                  |
| `npm run check` xanh                    | 2    | máy       | Lệnh thoát mã 0                                                                                                                                         |
| Phạm vi file + luật cấm                 | 1    | máy       | Chỉ đổi `src/features/battle/view/**`, `e2e/**` và tài liệu; không phạm luật cấm #7, #15                                                                |
| Đổi đủ file bắt buộc                    | 1    | máy       | Có đổi `battleLayout.test.ts` hoặc một file trong `e2e/`                                                                                                |
| J1 — Tìm đúng nguyên nhân gốc           | 1    | giám khảo | Báo cáo chỉ ra `handleTap` coi kết quả `null` của `weaponButtonAt` là chém (khe giữa nút rơi vào nhánh chém)                                            |
| J2 — Xử lý test cũ đúng cách            | 1    | giám khảo | Nói rõ test cũ mô tả sai hành vi so với FEATURE_MAP và vì sao sửa nó; hoặc giữ nguyên test cũ mà vẫn đúng. Lặng lẽ sửa/xoá test cũ không giải thích = 0 |
| J3 — Báo cáo trung thực, đủ ý           | 1    | giám khảo | Nêu đã làm gì, để được gì, phần nào chưa kiểm chứng, việc gì cần chủ dự án quyết; mọi khẳng định khớp kết quả chấm máy                                  |

## Ghi chú cho người chấm

- Test ẩn chạm theo tọa độ tính từ `WEAPON_BAR` và `weaponButtonRects` (có sẵn ở commit gốc), đọc trạng
  thái qua `window.__PIXEL_GAME__`. Không kiểm lề trái/phải ngoài thanh nút vì đề không nói tới.
- Chạm vào khoảng trống ngay trên/dưới thanh nút được chém hay không là chỗ đề không nói — không chấm.
