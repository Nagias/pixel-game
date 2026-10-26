# Thử tay — chơi thật như chủ dự án

> Bắt buộc cho mọi việc đổi thứ người chơi thấy hoặc chạm vào (chủ dự án chốt 26/10/2026). Đây là lớp
> thứ 3, sau unit test và E2E — không thay được hai lớp kia, và hai lớp kia không thay được nó.

## Vì sao cần

Unit test và E2E điều khiển game qua cầu nối `window.__PIXEL_GAME__` và tọa độ tính sẵn — chúng không
"nhìn" như người. Lỗi chạm khe (LESSONS.md) và chữ đè (F06) đều lọt qua test xanh. Thử tay bắt loại lỗi
đó.

## Cách làm

1. Mở game bằng preview `game-dev` (`.claude/launch.json`) trong trình duyệt của Claude Desktop, đường
   dẫn `/?seed=42` (ván lặp lại được) và thêm một ván không seed. Thêm `&level=N` để mở thẳng màn N
   (vd. thử màn 4 mà không phải chơi lại màn 1–3).
2. Đặt khung điện thoại **375×760** (`resize_window`), mở lại trang cho game co giãn theo khung. Không
   dùng khung máy tính. Không dùng khung lớn hơn ô trình duyệt (vd. 412×839 của Pixel 7): ô thu nhỏ hình
   và cú bấm rơi sai chỗ (đo 26/10/2026). Khung 375×760 không bị thu nhỏ. Tọa độ bấm theo "coordinate
   frame" báo kèm ảnh chụp (đã gặp ×1,5 và ×1 so với tọa độ CSS — đọc lại mỗi phiên, đừng nhớ số cũ).
   Đổi tọa độ game (khung 360×640) sang tọa độ bấm: đọc `getBoundingClientRect()` của canvas một lần.
   Lần đầu bấm, ghi lại vị trí chạm (lắng nghe `pointerdown`, chỉ đọc) để chắc phép đổi đúng.
3. **Chỉ thao tác như người:** bấm chuột vào đúng chỗ ngón tay sẽ chạm, dựa trên ảnh chụp màn hình. Không
   dùng cầu nối test hay gọi hàm trong game để điều khiển. Cầu nối chỉ được dùng **sau** khi thao tác,
   để đối chiếu điều mắt thấy với trạng thái thật.
4. Mỗi bước: chụp ảnh → nhìn → ghi "thấy gì" so với "mong gì".
5. Xem console trình duyệt: không có lỗi đỏ. Trình đọc console giữ cả lỗi của lần tải trước (vd. lúc code
   đang sửa dở): lỗi nào có đường dẫn module mang dấu ?t= cũ hơn module trang đang chạy thì là lỗi cũ.

## Kịch bản chung (chạy mọi lần)

| #   | Làm                                | Đạt khi                                                                                                  |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| C1  | Mở game, chạm "VÀO TRẬN"           | Thấy màn chuẩn bị (F07) rồi sân tròn, nhân vật giữa, quái ở rìa, thanh trên đọc rõ, các nút vũ khí ở đáy |
| C2  | Chạm từng nút vũ khí               | Viền xanh lá chuyển sang nút vừa chạm; vùng xanh đổi hình; số lượt không đổi                             |
| C3  | Chạm vào sân                       | Số lượt giảm 1; quái trong vùng xanh mất máu (số bay lên)                                                |
| C4  | Chơi tới hết màn (thắng hoặc thua) | Có màn kết quả, ghi rõ chạm để làm gì; chạm thì đi đúng nơi đã ghi                                       |
| C5  | Soát hình mọi màn hình đã đi qua   | Chữ không đè, không tràn khung; chỉ màu bảng Sweetie 16; không lỗi console                               |

Cộng thêm **kịch bản riêng** của từng việc (ghi trong kế hoạch của việc đó).

## Ghi bằng chứng

Trong PR, mục "Tự kiểm chứng": bảng các bước đã làm, thấy gì, đạt/không, và ảnh chụp các bước chính.
Bước nào không làm được thì ghi "chưa thử tay được" + lý do — không được bỏ trống.
