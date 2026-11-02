# Phong cách hình ảnh

Tham chiếu: ảnh chụp màn hình game "Pixel Chaos" chủ dự án gửi ngày 21/10/2026 (không lưu ảnh vào
repo vì là tài sản của game khác).

## Những gì ảnh tham chiếu cho thấy

- **Nhân vật chibi**: đầu to, thân ngắn (tỉ lệ khoảng 2 đầu), mắt to, dễ nhận ra ở kích thước nhỏ.
- **Viền tối đậm 1 pixel** quanh mọi nhân vật → nổi bật trên nền cỏ.
- **Màu bão hòa, tươi**: cỏ xanh lá sáng, nước xanh dương, quái tím/hồng/đỏ, hiệu ứng xanh lơ phát sáng.
- **Số sát thương nổi** màu sắc (trắng, cam, tím, xanh lá) có viền tối, bay lên trên đầu quái.
- **Góc nhìn từ trên xuống**, nền lát gạch ô vuông.

## Quy tắc cho game mình

1. Chỉ dùng 32 màu của bảng **Endesga 32** trong `src/shared/palette.ts` (chủ dự án chọn 02/11/2026, thay
   Sweetie 16). Bảng này phổ biến trong cộng đồng pixel art, có đủ sắc xanh lá, nâu, xám để vẽ khung cảnh có
   khối mà nhân vật vẫn "màu sắc rõ ràng".
2. Mọi sprite có viền màu `ink` (gần đen) — test `battleSprites.test.ts` kiểm. Mỗi mảng màu chính có sắc sáng ở
   mép trên/trái, sắc tối ở mép phải/dưới. Nhân vật chính tông xanh dương/vàng, quái tông đỏ/tím/xanh lá →
   nhìn là phân biệt phe.
3. Vùng tấn công luôn là **khoảng xanh sáng** trên sân, viền `white`, đúng mô tả "khoảng màu xanh" của chủ
   dự án.
4. Sprite 16×16 pixel, phóng to nguyên lần (×2, ×3) và tắt làm mịn (`pixelArt: true`) để giữ nét.
5. Số sát thương: chữ đậm, viền `ink`, bay lên rồi mờ dần.

Sprite hiện vẽ bằng lưới ký tự trong code — xem `DEBT.md` về việc thay bằng bộ hình thật.
