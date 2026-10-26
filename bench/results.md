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

## 26/10/2026 — cài đội agent (8 skill, `nguoi-lam`, `giam-khao`), nhánh `chore/doi-agent`

Model phiên chính: Opus 5.5 (effort high) · `nguoi-lam`: Opus · `giam-khao` của đội: Sonnet · Model
giám khảo bộ việc mẫu: Sonnet · Số lần chạy: **1 lần, chỉ T6** (chủ dự án chọn đo từng việc một).

| Cấu hình                         | T6 (/10) | Máy (/6) | Giám khảo (/4) | Thời gian | Token đầu ra                  | Token đọc cache |
| -------------------------------- | -------- | -------- | -------------- | --------- | ----------------------------- | --------------- |
| Trước: `origin/main` (`7040007`) | 9        | 5        | 4              | ~6 phút   | 15,5 nghìn (Opus)             | 4,1 triệu       |
| Sau: `chore/doi-agent`           | 10       | 6        | 4              | ~17 phút  | 61 nghìn (54 Opus + 7 Sonnet) | 10,3 triệu      |
| Chênh lệch                       | +1       | +1       | 0              | ×2,7      | ×3,9                          | ×2,5            |

Mục đổi điểm: "phạm vi file" — bản trước viết thêm test ghim số vào `logic/battle.test.ts` (ngoài vùng
đề cho phép), bản sau chỉ đổi file trong phạm vi. Cả hai đều tự thấy chữ đè qua ảnh E2E. Bản trước sửa
bằng giảm cỡ chữ 20 → 18px (vừa đủ chỗ); bản sau căn chữ "Máu" theo độ rộng thật, giữ cỡ chữ, thêm 4
unit test và một E2E đo khoảng cách chữ — chắc hơn nhưng ngoài rubric nên không cộng điểm.

### Thêm T2 (cùng ngày, cùng model, 1 lần mỗi bản; bản sau dùng cấu hình `60ca904`)

| Cấu hình               | T2 (/10) | Máy (/7) | Giám khảo (/3) | Thời gian | Token đầu ra                  | Token đọc cache |
| ---------------------- | -------- | -------- | -------------- | --------- | ----------------------------- | --------------- |
| Trước: `origin/main`   | 10       | 7        | 3              | ~3 phút   | 10,5 nghìn (Opus)             | 2,3 triệu       |
| Sau: `chore/doi-agent` | 9        | 7        | 2              | ~7 phút   | 31 nghìn (27 Opus + 4 Sonnet) | 4,2 triệu       |
| Chênh lệch             | −1       | 0        | −1             | ×2,3      | ×2,9                          | ×1,8            |

Mục đổi điểm: J2 — bản sau bỏ cụm "(là chạm vào sân)" khỏi tên test cũ mà báo cáo không nói vì sao
(bản trước nói rõ test cũ mô tả trái FEATURE_MAP). Bản sau làm thêm ngoài rubric: E2E chạm cả hai khe
rồi kiểm chạm sân vẫn chém, tạo `LESSONS.md`, đề xuất luật mới cho skill.

### Tổng hai việc

| Cấu hình | T2 + T6 (/20) | Token đầu ra | Thời gian |
| -------- | ------------- | ------------ | --------- |
| Trước    | 19            | 26 nghìn     | ~9 phút   |
| Sau      | 19            | 92 nghìn     | ~24 phút  |

Kết luận đề xuất: **chưa áp dụng nguyên đội**. Điểm bằng nhau (mỗi bên mất 1 điểm ở một việc khác
nhau — trong mức ngẫu nhiên), chi phí gấp ~3,5 lần token và ~2,7 lần thời gian. Bộ việc mẫu gần chạm
trần (cấu hình cũ 19/20) nên không phân biệt được hai cấu hình — cần đề khó hơn nếu muốn đo lợi ích của
đội. Chờ chủ dự án quyết.

Lần chạy hủy: `truoc-1` (26/10) — bài làm còn là `git worktree` nên phiên "trước" nạp nhầm đội agent
của thư mục dự án chính (xem `LESSONS.md`). Không tính điểm.
