# Phân tích Micro RPG (tham chiếu lối chơi)

> Tài liệu nghiên cứu, không phải đặc tả. Mục đích: hiểu vì sao Micro RPG hay để chọn
> đúng phần nên học, phần nên bỏ. Luật chơi của game mình nằm trong code
> (`src/features/*/logic/`) và test, tóm tắt ở `FEATURE_MAP.md`.

## 1. Thông tin chung

| Mục            | Nội dung                                                                        |
| -------------- | ------------------------------------------------------------------------------- |
| Nhà phát triển | JoliYeti Games (studio 2 người, làm từ 2017 như dự án phụ)                      |
| Ra mắt         | 26/01/2022, iOS + Android; năm 2026 có bản Steam "Theobald's Adventure"         |
| Mô hình        | Miễn phí, có quảng cáo + bán vật phẩm (IAP 0,99–14,99 USD), có rương ngẫu nhiên |
| Khẩu hiệu      | "All the fun, none of the complexity" — RPG rút gọn, chơi nhanh hoặc chơi lâu   |

## 2. Một lượt chơi (vòng lặp cốt lõi, tính bằng giây)

1. **Sân đấu hình tròn.** Nhân vật đứng giữa. Vòng tròn chia **24 lát** (như bánh pizza),
   mỗi lát sâu **6 ô** từ trong ra ngoài → 144 ô. Quái đứng trên các ô.
2. **Chọn vũ khí.** Mỗi màn mang 3 vũ khí: **tầm gần** (2–3 vòng trong), **tầm vừa**
   (vòng giữa), **tầm xa** (vòng ngoài, không đánh được 4 vòng trong). _Tầm đánh do
   vũ khí quyết định_, không tự co giãn (bạn đã xác nhận khi chơi thử).
3. **Ngắm bằng thời điểm.** Vùng đánh (hình nón/dải) tự **xoay vòng liên tục theo chiều
   kim đồng hồ**. Người chơi **chạm để dừng** → đánh **mọi quái trong vùng**.
4. **Thưởng gom cụm (combo).** Quái thứ 1 ăn 100% sát thương, thứ 2 ăn 200%, thứ 3 ăn
   300%… Nhân vật ưu tiên đánh con yếu trước để nhát mạnh cuối rơi vào con trâu.
5. **Đẩy quái (knockback).** Kiếm đẩy lùi 1 ô; búa đẩy lệch sang phải; cung kéo vào gần.
   Dùng để dồn cụm cho combo sau, hoặc đẩy quái vào đường lao của quái khác.
6. **Lượt của quái.** Sau nhát đánh, quái hành động: tiến lại gần, đi lung tung
   (bạn quan sát thấy khi chơi), bắn từ xa, lao thẳng. Con sắp ra đòn có **dấu "!" đỏ**.
   Đánh trúng quái bắn xa ngay trước khi nó bắn → nó choáng, bắn trượt.
7. **Áp lực.** Tối đa **15 lượt/màn**. Mục tiêu: giết đủ số lượng vài loại quái
   (nhiệm vụ chính + nhiệm vụ phụ). Xong nhiệm vụ chính trước → thêm 1 lượt và được rời sớm.

## 3. Các hệ thống bao quanh vòng lặp

| Hệ thống       | Cách làm của Micro RPG                                                           | Vai trò                         |
| -------------- | -------------------------------------------------------------------------------- | ------------------------------- |
| Thế giới / màn | 10 màn mỗi thế giới, màn 10 là trùm; 12–13 thế giới tuyến tính                   | Nhịp tiến độ dài hạn            |
| Trùm           | Có cơ chế riêng (vd. chỉ mất máu khi trúng combo ≥ 3, có khiên)                  | Bắt người chơi dùng hết kỹ năng |
| Loại quái      | Cận chiến, lao xa, bắn xa, bắn xuyên, hóa đá (mất lượt), ma (né đòn đầu)         | Mỗi loại ép một cách xử lý khác |
| Máu nhân vật   | Máu mang sang màn sau, hồi chậm hoặc hồi bằng tiền/quảng cáo                     | Giữ hậu quả giữa các màn        |
| Nhân vật       | Mỗi nhân vật 1 nội tại nhỏ (10% né cận chiến / né tầm xa / thêm xu)              | Đa dạng nhẹ, không phức tạp     |
| Vũ khí         | Hàng chục món, mỗi món có hình vùng đánh + hiệu ứng đẩy riêng; trùng thì lên cấp | Chiều sâu chiến thuật           |
| Tiền tệ        | Xu, Ruby (trả tiền), King's Token (mở rương trong màn), Gem (sự kiện)            | Kiếm tiền, giữ chân             |
| Sự kiện        | Chế độ sóng vô tận, mỗi 5 sóng 1 trùm, chọn bùa trước mỗi sóng, bảng xếp hạng    | Chơi lại                        |

## 4. Vì sao nó hay — phần đáng học

1. **Một nút bấm, ba tầng quyết định.** Chọn _tầm_ (vũ khí nào) → chọn _chỗ_ (chạm lúc nào)
   → _tính trước_ (ai sắp đánh, đẩy ai vào đâu). Điều khiển cực đơn giản mà vẫn có chiều sâu.
   **Đây là cốt lõi lean nhất và là thứ game mình giữ.**
2. **Thưởng gom cụm** biến "bắn từng con" thành "sắp xếp thế trận".
3. **Giới hạn lượt** tạo áp lực rõ ràng; màn 1–2 phút, hợp điện thoại.
4. **Thông tin minh bạch**: vùng đánh hiện rõ, dấu "!" báo trước. Thua vì tính sai, không vì
   không hiểu chuyện gì xảy ra.
5. **Mỗi loại quái là một câu đố nhỏ**: thêm quái mới = thêm chiều sâu mà không thêm nút bấm.

## 5. Điểm yếu reviewer chê — phần nên tránh

- Tiến độ bị chặn để ép xem quảng cáo / nạp tiền (TapSmart, 148Apps).
- Thế giới tuyến tính, ít lựa chọn đường đi.
- Nhiều loại tiền tệ chồng chéo — trái với tinh thần "lean".

## 6. Đối chiếu với ý tưởng của bạn

| Ý của bạn                                          | Micro RPG                     | Hướng cho game mình                    |
| -------------------------------------------------- | ----------------------------- | -------------------------------------- |
| 1 người đứng giữa, người chơi điều khiển           | Giống                         | Giữ                                    |
| Vòng tròn có diện tích, khoảng xanh = phạm vi đánh | Vùng đánh xoay, chạm để dừng  | Giữ; vùng xanh xoay, chạm để đánh      |
| Mọi quái trong vùng đều bị đánh                    | Giống                         | Giữ                                    |
| Số lượt tấn công có giới hạn                       | 15 lượt/màn                   | Giữ; con số chỉnh trong file config    |
| Quái xuất hiện xa rồi tiến lại                     | Giống, kèm đi lung tung       | Giữ: tiến vào hoặc đi ngang ngẫu nhiên |
| Phạm vi vòng tròn thay đổi (logic chốt sau)        | Phạm vi theo vũ khí đang chọn | **Chờ bạn chốt** — tính năng sau       |
| Đồ họa pixel màu rõ (ảnh tham chiếu)               | Pixel dễ thương               | Bảng màu Sweetie 16, viền đậm, chibi   |

## 7. Thứ tự học đề xuất (mỗi dòng là một tính năng ứng viên)

1. ✅ Trận đấu tối thiểu: vùng xanh xoay, chạm để đánh, quái tiến lại, hết lượt/thắng/thua
   (walking skeleton).
2. Chọn 1 trong 3 vũ khí theo tầm (gần/vừa/xa) → vùng xanh đổi theo vũ khí.
3. Combo gom cụm 100% / 200% / 300%.
4. Dấu "!" báo quái sắp đánh + máu nhân vật.
5. Đẩy quái (knockback) theo vũ khí.
6. Màn chơi nối tiếp + trùm.

Những thứ **không học** cho tới khi bạn yêu cầu: tiền tệ nhiều lớp, rương ngẫu nhiên,
quảng cáo, sự kiện.

## Nguồn

- LevelWinner — Beginner's Guide: https://www.levelwinner.com/micro-rpg-beginners-guide-tips-tricks-strategies/
- TapSmart — review: https://www.tapsmart.com/games/review-micro-rpg/
- 148Apps — review: https://www.148apps.com/micro-rpg/micro-rpg-review/
- TouchArcade — Game of the Week: https://toucharcade.com/2022/01/28/toucharcade-game-of-the-week-micro-rpg/
- TouchArcade forum: https://toucharcade.com/community/threads/micro-rpg-by-joliyeti-games-inc.418868/
- App Store: https://apps.apple.com/py/app/micro-rpg/id1598053040?l=en-GB
- Playtester: https://playtester.io/micro-rpg
- Minireview: https://minireview.io/role-playing/micro-rpg
