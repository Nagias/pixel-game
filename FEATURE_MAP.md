# Bản đồ tính năng

> Quy tắc: PR nào thêm hoặc đổi tính năng thì cập nhật file này **trong cùng PR đó**.
> Luật chơi chính xác nằm trong code + test; ở đây là tóm tắt cho người đọc và chỉ đường tới file.

## Tổng quan

| Mã  | Tính năng                                        | Trạng thái                                   | Code | Test |
| --- | ------------------------------------------------ | -------------------------------------------- | ---- | ---- |
| F01 | Trận đấu tối thiểu (walking skeleton, khuôn mẫu) | 🚧 Đang làm — branch `feat/walking-skeleton` | —    | —    |

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
