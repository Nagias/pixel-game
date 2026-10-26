# Thử tay — chơi thật như chủ dự án

> Bắt buộc cho mọi việc đổi thứ người chơi thấy hoặc chạm vào (chủ dự án chốt 26/10/2026). Đây là lớp
> thứ 3, sau unit test và E2E — không thay được hai lớp kia, và hai lớp kia không thay được nó.

## Vì sao cần

Unit test và E2E điều khiển game qua cầu nối `window.__PIXEL_GAME__` và tọa độ tính sẵn — chúng không
"nhìn" như người. Lỗi chạm khe (LESSONS.md) và chữ đè (F06) đều lọt qua test xanh. Thử tay bắt loại lỗi
đó.

## Cách làm

1. Mở game bằng preview `game-dev` (`.claude/launch.json`) trong trình duyệt của Claude Desktop, đường
   dẫn `/?seed=42` (ván lặp lại được) và thêm một ván không seed.
2. Đặt khung điện thoại **412×839** (cùng cỡ Pixel 7 của E2E). Không dùng khung máy tính.
3. **Chỉ thao tác như người:** bấm chuột vào đúng chỗ ngón tay sẽ chạm, dựa trên ảnh chụp màn hình. Không
   dùng cầu nối test hay gọi hàm trong game để điều khiển. Cầu nối chỉ được dùng **sau** khi thao tác,
   để đối chiếu điều mắt thấy với trạng thái thật.
4. Mỗi bước: chụp ảnh → nhìn → ghi "thấy gì" so với "mong gì".
5. Xem console trình duyệt: không có lỗi đỏ.

## Kịch bản chung (chạy mọi lần)

| #   | Làm                                | Đạt khi                                                                      |
| --- | ---------------------------------- | ---------------------------------------------------------------------------- |
| C1  | Mở game                            | Thấy sân tròn, nhân vật giữa, quái ở rìa, thanh trên đọc rõ, 3 nút ở đáy     |
| C2  | Chạm từng nút vũ khí               | Viền xanh lá chuyển sang nút vừa chạm; vùng xanh đổi hình; số lượt không đổi |
| C3  | Chạm vào sân                       | Số lượt giảm 1; quái trong vùng xanh mất máu (số bay lên)                    |
| C4  | Chơi tới hết màn (thắng hoặc thua) | Có màn kết quả, ghi rõ chạm để làm gì; chạm thì đi đúng nơi đã ghi           |
| C5  | Soát hình mọi màn hình đã đi qua   | Chữ không đè, không tràn khung; chỉ màu bảng Sweetie 16; không lỗi console   |

Cộng thêm **kịch bản riêng** của từng việc (ghi trong kế hoạch của việc đó).

## Ghi bằng chứng

Trong PR, mục "Tự kiểm chứng": bảng các bước đã làm, thấy gì, đạt/không, và ảnh chụp các bước chính.
Bước nào không làm được thì ghi "chưa thử tay được" + lý do — không được bỏ trống.
