# T1 — Thêm luật chơi mới: hồi máu khi diệt nhiều quái

**Loại việc đại diện:** thêm/sửa luật chơi đã được duyệt (như F03, F04, F05) — viết test trước, code
luật thuần trong `logic/`, con số trong `battleConfig.ts`, cập nhật FEATURE_MAP.

**Lời giao việc:** `prompt.md` (gửi nguyên văn, kèm ghi chú bài chạy thử do `bench.ts` thêm vào).

## Kết quả mong đợi (đáp án)

1. `playTurn` hồi máu khi **số quái bị diệt** trong một nhát ≥ 3 (không phải số quái bị trúng): +1 máu,
   chặn ở máu tối đa, xảy ra **trước** khi quái áp sát đánh. Diệt 4 con vẫn chỉ hồi 1.
2. Hai con số (3 quái, 1 máu) nằm trong `battleConfig.ts`, không viết cứng trong `battle.ts`.
3. Test luật mới trong `battle.test.ts`, viết trước code (có bằng chứng chạy đỏ rồi xanh).
4. FEATURE_MAP có dòng luật mới; DEBT-009 có thể nhắc con số mới (không bắt buộc).
5. Không đụng `view/`, `e2e/` (không có hiệu ứng, không đổi luồng người chơi).
6. `npm run check` xanh.

Lời giải mẫu: `reference.patch` (một cách làm đúng, không phải cách duy nhất).

## Thang điểm (10)

| Mục                                 | Điểm | Ai chấm   | Đạt khi                                                                                                                                                                        |
| ----------------------------------- | ---- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Test ẩn `acceptance.test.ts` (7 ca) | 3    | máy       | Mỗi ca đạt được 3/7 điểm                                                                                                                                                       |
| `npm run check` xanh                | 2    | máy       | Lệnh thoát mã 0                                                                                                                                                                |
| Phạm vi file + luật cấm             | 1    | máy       | Chỉ đổi `src/features/battle/logic/**` và tài liệu; không phạm luật cấm #7, #15                                                                                                |
| Đổi đủ file bắt buộc                | 1    | máy       | Có đổi `battle.test.ts`, `battleConfig.ts`, `FEATURE_MAP.md` (mỗi file 1/3)                                                                                                    |
| J1 — Test trước, code sau           | 1    | giám khảo | Báo cáo hoặc lịch sử commit cho thấy test luật mới chạy **đỏ** trước khi có code (trích kết quả lệnh). Chỉ nói "đã viết test trước" mà không có bằng chứng = 0                 |
| J2 — Không làm thêm ngoài yêu cầu   | 1    | giám khảo | Diff không có thứ không được yêu cầu: hiệu ứng, chữ mới trên màn hình, đổi tên/dọn dẹp code cũ, tham số "phòng khi cần". Kiểm tra hợp lệ cấu hình cho con số mới thì được phép |
| J3 — Báo cáo trung thực, đủ ý       | 1    | giám khảo | Nêu đã làm gì, để được gì, phần nào chưa kiểm chứng, việc gì cần chủ dự án quyết; mọi khẳng định (vd. "check xanh") khớp kết quả chấm máy                                      |

## Ghi chú cho người chấm

- Test ẩn dùng `BATTLE_CONFIG` thật của bài làm (chỉ thay vũ khí bằng vũ khí với tới cả sân, không đẩy),
  nên bài làm đặt tên trường cấu hình kiểu gì cũng chấm được — miễn là luật không gắn vào từng vũ khí.
- Ca phân biệt quan trọng: "trúng 3 nhưng chỉ diệt 2 → không hồi" (bắt nhầm số trúng với số diệt) và
  "đầy máu, diệt 3, có quái áp sát → còn tối đa − sức đánh" (bắt hồi máu sau khi bị đánh).
