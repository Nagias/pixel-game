# Lịch sử điểm bộ việc mẫu

Mỗi lần sửa skill hoặc agent: chạy bộ việc mẫu cho **cấu hình cũ** và **cấu hình mới** (cùng ngày, cùng
model), rồi thêm một khối kết quả vào đầu file này. Cách chạy: `bench/README.md`.

Mỗi ô là điểm trung bình các lần chạy của việc đó (mặc định 2 lần), kèm khoảng thấp–cao.

## Mẫu một khối kết quả

```markdown
## <ngày> — <thay đổi gì ở skill/agent, PR nào>

Model đội agent: <…> · Model giám khảo: <…> · Số lần chạy mỗi việc: <…>

| Cấu hình         | T1 (/10) | T2 (/10) | T3 (/10) | T4 (/10) | T5 (/10) | T6 (/10) | Tổng (/60) |
| ---------------- | -------- | -------- | -------- | -------- | -------- | -------- | ---------- |
| Trước: <git ref> |          |          |          |          |          |          |            |
| Sau: <git ref>   |          |          |          |          |          |          |            |
| Chênh lệch       |          |          |          |          |          |          |            |

Mục đổi điểm nhiều nhất và vì sao: …
Kết luận: giữ thay đổi / bỏ / sửa tiếp — vì …
```

## Kết quả

Chưa có lần chạy nào. Lần đầu tiên sẽ là **mốc trước**: cấu hình hiện tại (CLAUDE.md, chưa có skill
và agent riêng của dự án), chạy trước khi cài bộ skill/agent mới.
