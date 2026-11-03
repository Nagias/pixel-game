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
   Ảnh chụp chỉ còn góc trên bên trái (bị cắt, phóng to) dù cú bấm vẫn trúng: pane trình duyệt đang
   **bị ẩn** (`tabs_context` báo "hidden"). Mở lại pane bằng `preview_start` với `url` của game rồi đặt
   lại khung 375×760 trên tab mới (gặp 27/10/2026). Pane ẩn còn làm ảnh chụp **chậm một nhịp** (chạm
   xong mà ảnh vẫn như cũ): đọc `window.__PIXEL_GAME__.snapshot()` (chỉ đọc) xem đã đổi chưa rồi chụp
   lại, đừng chạm thêm lần nữa (gặp 27/10/2026, đợt 0).
   Pane vẫn ẩn sau khi mở lại (chủ dự án không xem pane) thì game đứng hẳn — trình duyệt dừng vẽ trang ẩn,
   cú bấm không có tác dụng. Khi đó thử tay bằng trình duyệt Playwright riêng (công cụ `mcp__playwright__*`):
   khung 375×760, chụp ảnh rồi bấm chuột (`page.mouse.click`) vào đúng chỗ thấy trên ảnh (gặp 03/11/2026).
   **Cần hồ sơ giả** (vd. đã qua màn 12): nạp trong trình duyệt Playwright riêng — bộ nhớ của nó tách khỏi
   preview nên không đè hồ sơ chủ dự án đang chơi dở. Bắt buộc dùng preview thì cất hồ sơ cũ sang khóa khác
   trước khi ghi (LESSONS.md 03/11/2026).
3. **Chỉ thao tác như người:** bấm chuột vào đúng chỗ ngón tay sẽ chạm, dựa trên ảnh chụp màn hình. Không
   dùng cầu nối test hay gọi hàm trong game để điều khiển. Cầu nối chỉ được dùng **sau** khi thao tác,
   để đối chiếu điều mắt thấy với trạng thái thật.
4. Mỗi bước: chụp ảnh → nhìn → ghi "thấy gì" so với "mong gì".
5. Xem console trình duyệt: không có lỗi đỏ. Trình đọc console giữ cả lỗi của lần tải trước (vd. lúc code
   đang sửa dở): lỗi nào có đường dẫn module mang dấu ?t= cũ hơn module trang đang chạy thì là lỗi cũ.

## Kịch bản chung (chạy mọi lần)

| #   | Làm                                | Đạt khi                                                                                                                                                                                                          |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Mở game                            | Thấy Bản đồ Rừng rậm: băng rôn, 20 nút màn nối đường rắn, hiệp sĩ đứng ở màn đang tới, hình trùm cạnh màn có trùm, thanh nút dưới (Cửa hàng · Vũ khí · CHƠI · Nâng cấp)                                          |
| C1b | Chạm CHƠI rồi nút chơi của bảng    | Bảng trước trận đọc rõ (nhiệm vụ bằng hình quái, quái sẽ gặp, đồ mang vào); vào trận: khung cảnh rừng, sân mờ trên cỏ, quái có thanh máu, thanh trên (vàng, LƯỢT, nhiệm vụ), thẻ vũ khí có hình trên dải nền tối |
| C2  | Chạm từng nút vũ khí               | Viền xanh lá chuyển sang thẻ vừa chạm; khoảng sáng (vùng đánh) đổi hình; số lượt không đổi                                                                                                                       |
| C3  | Chạm vào sân                       | Số lượt giảm 1; quái trong vùng đánh mất máu (số bay lên, thanh máu ngắn lại)                                                                                                                                    |
| C4  | Chơi tới hết màn (thắng hoặc thua) | Có màn kết quả, ghi rõ chạm để làm gì; chạm thì đi đúng nơi đã ghi                                                                                                                                               |
| C6  | Chạm thẻ vũ khí ở bảng trước trận  | Mở màn Vũ khí; chạm Rìu → thẻ Rìu viền xanh ở hàng "Đang mang"; chạm CHƠI → về bảng, thẻ đồ là Rìu                                                                                                               |
| C7  | Đóng bảng (X), chạm màn đã qua     | Bảng màn đó ghi "Chơi lại: không nhận vàng"; chạm màn chưa mở → không gì                                                                                                                                         |
| C8  | Đi qua 4 nút thanh dưới            | Cửa hàng, Vũ khí, Nâng cấp mở đúng màn (nút của màn đang mở tô tối); CHƠI từ màn phụ mở bảng trước trận                                                                                                          |
| C5  | Soát hình mọi màn hình đã đi qua   | Chữ không đè, không tràn khung; chỉ màu bảng Endesga 32; không lỗi console                                                                                                                                       |

Cộng thêm **kịch bản riêng** của từng việc (ghi trong kế hoạch của việc đó).

## Ghi bằng chứng

Trong PR, mục "Tự kiểm chứng": bảng các bước đã làm, thấy gì, đạt/không, và ảnh chụp các bước chính.
Bước nào không làm được thì ghi "chưa thử tay được" + lý do — không được bỏ trống.
