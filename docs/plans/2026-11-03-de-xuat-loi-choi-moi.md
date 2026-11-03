# Đề xuất lối chơi mới (CHƯA CHỐT — tạm lưu)

> **Trạng thái: chủ dự án chưa chốt.** Agent đề xuất ngày 03/11/2026, chủ dự án bảo tạm lưu lại để làm
> trước phần cơ chế cũ còn dở (rơi đồ, vũ khí mới, quái mới). Mọi luật và con số dưới đây là đề xuất
> minh họa, không phải luật. Không làm phần nào trong file này khi chưa có chủ dự án duyệt.

## 1. Vì sao có đề xuất này

Chủ dự án chơi thử sau F18 (03/11/2026, nguyên văn):

> Tôi thấy vấn đề lớn là cơ chế chơi của game đang bị đơn giản, quái cũng đơn giản. Nếu chuyển qua các
> màn khác mà cũng chỉ có mỗi mấy vũ khí và lối chơi như này thì rất dễ bỏ game. Cần phải thiết kế cơ chế
> game tốt đã rồi các cái khác mới tính được

Chẩn đoán của agent (số liệu từ `FEATURE_MAP.md`):

- Mỗi lượt người chơi chỉ quyết một việc: quái gần nhất ở vòng nào thì cầm vũ khí tầm đó, chạm lúc vùng
  xanh phủ đông quái nhất.
- Vũ khí chỉ khác vòng và độ rộng. Bot dùng Rìu khoảng 1% số nhát, kết quả như Kiếm (F07a).
- Đẩy quái không có hậu quả gì ngoài đổi chỗ, mô phỏng không cần tận dụng (DEBT-009).
- 5 quái rừng dùng lại đặc tính của slime: Sói = Slime Lao, Cung thủ = Slime Pháo, Dơi = Slime Ma (F15).
- Cấp màu đồ rơi chỉ cộng chỉ số, không đổi cách đánh (F16).
- Trùm Người Cây chỉ nhiều máu và đi chậm. Sân lúc nào cũng trống, 20 màn chỉ khác số quái và số lượt.

## 2. Phần đã chuyển sang làm trước

Vũ khí mới (Búa, Lưỡi hái, Nỏ), quái có hành vi riêng (Nấm nổ, Pháp sư yêu tinh, Tổ nhện, Rùa gai) và
trùm có cơ chế riêng thuộc nhóm "cơ chế cũ chưa hoàn thiện" (chủ dự án đã nêu từ 22/10 và 27/10), nên đi
vào kế hoạch hoàn thiện cơ chế cũ, không nằm trong file này.

## 3. Phần tạm lưu, chưa chốt

### 3.1. Đẩy quái gây va chạm

Quái bị đẩy mà đâm vào quái khác hoặc vật cản thì mất 1 máu, quái bị đâm cũng mất 1 máu. Cú đẩy của
Kiếm, Cung, Giáo trở thành công cụ tính toán (đẩy con này đập con kia, hạ hai con bằng một nhát). Micro
RPG dùng ý này (đẩy quái vào đường lao của quái khác, `docs/research/micro-rpg.md` mục 2).

### 3.2. Địa hình trên sân theo chủ đề

- Rừng rậm: **tảng đá** (quái không đi qua, bị đẩy vào thì mất máu), **bụi gai** (bước vào hoặc bị đẩy
  vào thì mất máu).
- Băng: ô trơn, quái trượt thêm một ô. Núi lửa: dung nham (Micro RPG thế giới 6: đẩy quái vào dung nham).
- Mục đích: mỗi màn có hình sân khác nhau, mỗi chủ đề chơi khác nhau chứ không chỉ khác hình nền.
- Kế hoạch sau B6 (mục 10) đã hỏi "có cơ chế sân riêng theo chương không", lúc đó chốt "chưa có".

### 3.3. Trùm dùng địa hình

Phụ thuộc 3.2: Người Cây dưới nửa máu mọc rễ, biến vài ô quanh nó thành bụi gai.

### 3.4. Nhiệm vụ phụ 3 sao

Mỗi màn thêm 2 thử thách nhỏ (vd. "hạ 4 con trong một nhát", "không mất máu"). Lý do để chơi giỏi hơn và
chơi lại màn cũ. Micro RPG có nhiệm vụ phụ (research mục 2 ý 7).

### 3.5. Vũ khí mạnh / yếu theo loài quái

Micro RPG: màn hình trước trận hiện vũ khí nào ×2 hoặc ×0,5 sát thương với quái của màn. Làm cho việc chọn
đồ trước trận có ý nghĩa. Chưa đề xuất con số.

### 3.6. Để sau nữa

Chọn bùa giữa trận (kiểu sóng vô tận), nhiều nhân vật, chế độ vô tận. Đều là tính năng lớn, nên làm sau
khi lối chơi cốt lõi đã hay.

## 4. Cái giá chung nếu làm

- Bot đo độ khó phải học từng cơ chế mới, nếu không số đo độ khó sai.
- 20 màn Rừng rậm phải sinh lại, số lượt chỉnh cho người mới sẽ đổi.
- Cần hình mới (lưới ký tự như hiện tại) cho địa hình.
- Nên làm bản chơi thử nhanh (bản nháp, xong bỏ) trước khi làm thật, vì vui hay không phải chơi mới biết.
