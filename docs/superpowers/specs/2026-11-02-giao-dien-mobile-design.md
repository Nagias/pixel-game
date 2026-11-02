# Thiết kế: làm lại giao diện cho ra game mobile (bố cục Micro RPG, khung cảnh pixel 32 màu)

Ngày: 02/11/2026. Trạng thái: chờ chủ dự án duyệt.

Bản phác đi kèm (mở bằng trình duyệt, chỉ là hình minh họa, số liệu trên hình là ví dụ):

- `mockups/2026-11-02-bo-cuc-3-man.html` — bố cục 3 màn: bản đồ, bảng trước trận, trong trận. Bản này vẽ
  bằng bảng 16 màu cũ và khung cao 360×740; chỉ dùng để xem **bố cục**.
- `mockups/2026-11-02-khung-canh-32-mau.html` — **phong cách hình** đã chốt: khung cảnh trận đấu vẽ bằng
  code, bảng 32 màu, không có đường lát đá.

## 1. Ý định và lý do

Chủ dự án chơi game hiện tại và nhận xét (nguyên văn, 02/11/2026):

> tôi đang thấy cách hiển thị và homepage này không giống game mobile chút nào luôn ấy, nhìn khác hẳn so
> với game micro rpg, trong khi bạn bảo đã tham khảo game ý.

Nhận xét đúng: `docs/research/micro-rpg.md` chỉ phân tích **lối chơi**, chưa phân tích **giao diện**. Game
hiện trông như một bảng cài đặt: ô chữ nhật, chữ thông số kỹ thuật ("vòng 0–1, rộng 5 lát"), sân đấu là đĩa
xanh trơn trên nền màu đặc, không có khung cảnh, không có hình vũ khí.

Chủ dự án gửi 7 ảnh chụp Micro RPG và giải thích: ảnh 1 là màn chính dạng bản đồ nhiều màn, ảnh 2 trang bị,
ảnh 3 gói nạp, ảnh 4 sự kiện, ảnh 5 chọn hero, ảnh 6 bảng thông tin trước trận, ảnh 7 trong trận. Sau đó chủ
dự án gửi một ảnh khung cảnh pixel (rừng, nhà, ao, ruộng; vài chục sắc xanh, cây nhiều chùm lá có đổ bóng)
và nói (nguyên văn):

> Chỉ còn cảnh môi trường là chưa được đẹp như tôi nghĩ thôi, cách thiết kế đồ họa vẫn khá đơn giản. tôi muốn
> đồ họa giống ảnh tôi gửi hơn

Mục đích của đợt này: người chơi mở game lên thấy ngay **một game mobile thật** — bản đồ màn chơi có khung
cảnh, các bảng và thẻ có hình, thanh thông tin gọn — thay cho các màn toàn chữ hiện nay. Luật chơi giữ nguyên.

## 2. Mục tiêu, không làm, phản mục tiêu

**Mục tiêu**

1. Bố cục 6 màn theo cách trình bày của Micro RPG: bản đồ màn chính, bảng trước trận, trận đấu (kèm màn
   kết quả), Vũ khí, Nâng cấp, Cửa hàng.
2. Khung cảnh pixel vẽ bằng code, đẹp và đồng bộ, theo phong cách bản phác `khung-canh-32-mau`.
3. Nhân vật, quái, biểu tượng và nút bấm đổi sang cùng bảng 32 màu để đồng bộ với khung cảnh.
4. Thông tin chuyển từ chữ sang hình ở mọi chỗ làm được: nhiệm vụ là hình quái × số, máu là thanh máu trên
   đầu, vũ khí là thẻ có hình.

**Không làm trong đợt này** (chủ dự án chốt 02/11/2026: để đợt sau vì là tính năng mới, cần bàn luật riêng)

- Sự kiện (ảnh 4), bộ sưu tập hero (ảnh 5), nạp tiền thật và các loại tiền khác ngoài vàng (ảnh 3).
- Mua bộ hình làm sẵn hoặc thuê họa sĩ (chủ dự án: "mất tiền mua tôi sẽ tính toán sau").
- Font pixel (DEBT-008 giữ nguyên, vẫn dùng font `monospace`).
- Âm thanh, rung, quảng cáo.

**Phản mục tiêu** (làm xong mà dính một trong các điều này thì coi như hỏng)

- Đổi luật chơi hoặc con số cân bằng (máu, sát thương, số lượt, giá, tỉ lệ rơi). Đợt này chỉ đổi phần nhìn.
- Người chơi cũ mất vàng, màn đã mở khóa, cấp nâng cấp, vũ khí đã rơi hoặc món đang thuê.
- Game mở màn chậm thấy rõ trên điện thoại tầm trung vì vẽ khung cảnh.
- Thêm thư viện, tải hình hay font từ mạng lúc chạy game (đường cấm #11).
- Thêm cách điều khiển ngoài chạm (đường cấm #15).
- Hình lấy từ game khác hoặc bộ hình có bản quyền lọt vào repo.

## 3. Ràng buộc

- Game chỉ cho mobile, mọi thao tác là chạm. Khung game giữ **360×640** như hiện tại (bản phác bố cục vẽ ở
  360×740 nên khi làm thật phải co các khoảng cách cho vừa).
- Phaser 3.90 (DEBT-001). Không thêm thư viện.
- Mọi luật nằm trong `logic/`, view chỉ đọc state (CLAUDE.md mục 3, đường cấm #3). Đợt này không cần sửa
  luật; nếu thấy cần đổi một hàm trong `logic/` để lấy dữ liệu hiển thị thì chỉ thêm hàm đọc, không đổi kết quả.
- Màu chỉ khai báo ở `src/shared/palette.ts` (đường cấm #4 vẫn giữ, chỉ đổi bảng màu bên trong).
- Hồ sơ người chơi (`src/features/profile/`) không đổi cấu trúc trừ khi thật cần; nếu đổi thì tăng
  `version` và viết bước chuyển như các đợt trước.
- "Xong" theo 3 lớp: `npm run check` xanh, E2E có ảnh chụp, thử tay trong khung điện thoại theo
  `docs/MANUAL_TEST.md` (CLAUDE.md mục 6).

## 4. Những gì chủ dự án đã quyết (02/11/2026)

1. **Bố cục theo Micro RPG.** Chủ dự án xem bản phác 3 màn (bản đồ, bảng trước trận, trong trận) và chỉ
   chê phần khung cảnh — tức là bố cục được chấp nhận.
2. **Hình tự vẽ bằng code**, chưa mua bộ hình, chưa thuê họa sĩ.
3. **Bảng 32 màu (bản B)**: bảng Endesga 32 (miễn phí, phổ biến trong giới vẽ pixel), thay bảng Sweetie 16.
   Luật "chỉ dùng 16 màu Sweetie 16" trong `CLAUDE.md` và `docs/ART_STYLE.md` đổi thành "chỉ dùng 32 màu
   Endesga 32".
4. **Cách vẽ khung cảnh như bản phác**: cây ghép nhiều chùm lá tròn, sáng phía trên trái, tối phía dưới, viền
   tối; cây, bụi, đá có bóng đổ; nền cỏ có mảng đậm nhạt, ngọn cỏ, hoa nhiều màu; ao có bờ đất và vệt sáng;
   xen vài cây lá đỏ cam. **Không có con đường lát đá** (chủ dự án: "bỏ cái bức tường đi").
5. **Phạm vi**: chỉ làm lại giao diện các màn đã có; sự kiện, hero, nạp tiền để đợt sau.
6. **Được chơi lại màn đã qua nhưng không nhận vàng** (chủ dự án: "Cho chơi lại không có vàng"). Chi tiết ở
   mục 9.

## 5. Các màn hình

Thứ tự màn: mở game → **Bản đồ** → chạm màn → **Bảng trước trận** → **Trận đấu** → **Màn kết quả** → về
**Bản đồ**. Từ Bản đồ đi được sang **Vũ khí**, **Nâng cấp**, **Cửa hàng** bằng thanh nút dưới cùng.

### 5.1 Thanh trên và thanh nút dưới (dùng chung)

- **Thanh trên** ở Bản đồ, Vũ khí, Nâng cấp, Cửa hàng: ô vàng có hình đồng xu và số vàng hiện có. Không có
  dấu "+" (không có nạp tiền).
- **Thanh nút dưới** ở cùng 4 màn đó: Cửa hàng · Vũ khí · nút **CHƠI** to ở giữa · Nâng cấp. Nút của màn
  đang mở được làm nổi (như Micro RPG tô nền tối cho nút đang chọn). CHƠI mở Bảng trước trận của màn đang
  tới (màn cao nhất đã mở khóa).

### 5.2 Bản đồ (thay màn chuẩn bị hiện nay làm màn mở game)

- Nền là khung cảnh Rừng rậm vẽ theo mục 6, có cây ở mép, bụi, đá, hoa.
- Băng rôn trên cùng: nhãn nhỏ "CHỦ ĐỀ 1", băng lớn "RỪNG RẬM", dòng nhỏ tiến độ (ví dụ "2/20 màn").
- 20 nút màn nối thành đường đi uốn lượn (đường rắn 5 hàng × 4 nút như bản phác). Màn 10 và 20 có hình trùm
  Người Cây cạnh nút.
- Màu nút: màn đã qua tô xanh, màn đang tới tô vàng và có hiệp sĩ đứng trên, màn chưa mở tô xám. Đường nối
  giữa các màn đã qua sáng, phần chưa mở tối. **Không có sao** (bản phác có vẽ sao nhưng game không có hệ
  thống chấm sao).
- Chạm nút màn đang tới hoặc CHƠI → Bảng trước trận. Chạm màn chưa mở → không có gì xảy ra. Chạm màn đã qua → Bảng trước
  trận của màn đó, ghi rõ "Chơi lại: không nhận vàng" (mục 9).
- 20 màn vừa một màn hình, không cuộn. Khi có chủ đề thứ hai sẽ thiết kế cách chuyển chủ đề.

### 5.3 Bảng trước trận (học ảnh 6)

Hiện đè lên Bản đồ đã làm tối. Gồm:

- Thẻ tiêu đề "MÀN n".
- **Nhiệm vụ**: hình quái của nhiệm vụ × số lượng (ví dụ hình slime ×5), và số lượt của màn. Màn không có
  nhiệm vụ thì ghi "Hạ hết quái".
- **Quái sẽ gặp**: các ô hình mỗi loại quái có trong màn (lấy từ cấu hình màn, không trùng lặp).
- **Mang vào trận**: thẻ hiệp sĩ và 3 thẻ vũ khí đang mang (gần, vừa, xa), mỗi thẻ có hình vũ khí, tên, tầm,
  và vạch màu theo cấp vũ khí (F16). Từ màn mở skill thì có thêm ô skill đang mang.
- Nút **chơi** to (vào trận) và nút **X** (đóng, về Bản đồ).

### 5.4 Trận đấu (học ảnh 7)

- **Khung cảnh** Rừng rậm phía sau sân: hàng cây phía trên, cây hai bên mép, ao và bụi phía dưới, cỏ hoa
  khắp nền (như bản phác 32 màu).
- **Sân đấu mờ** trên mặt cỏ: 24 lát × 6 vòng tô ô xen kẽ đậm nhạt nhẹ, viền ngoài mờ — không còn là đĩa
  xanh đặc. Vùng đánh tô sáng (trắng phủ lên cỏ, ra màu xanh nhạt) và có viền trắng; vẫn khớp đúng vùng luật
  như test hiện có đang kiểm.
- **Thanh trên**: vàng nhặt trong trận (trái), thẻ treo "LƯỢT" và số lượt còn lại (giữa), nhiệm vụ bằng hình
  quái và "đã hạ/cần hạ" (phải). Số màn ("Màn 8/20") giữ ở chỗ nhỏ dễ thấy.
- **Thanh máu** trên đầu hiệp sĩ và từng con quái (thay dòng chữ "Máu: 10/10"). Quái hiếm, dấu "!", số sát
  thương, combo, hồi máu giữ hành vi hiện có, chỉ đổi màu theo bảng mới.
- **Thanh dưới**: 3 thẻ vũ khí có hình (thẻ đang cầm viền sáng) và nút Skill (tên, nạp bao nhiêu/bao nhiêu).
- Mọi bóng đổ dưới chân nhân vật và quái.

### 5.5 Màn kết quả

Bảng giống Bảng trước trận (cùng khung, cùng kiểu chữ): THẮNG hoặc THUA, lý do thua, vàng nhặt và tổng vàng,
đồ rơi (tô màu cấp) như hiện nay. Chạm (sau 0,5 giây chống chạm nhầm như hiện nay) → về Bản đồ và mở sẵn
Bảng trước trận của màn chơi tiếp: thắng thì màn kế, thua thì màn vừa chơi. Nhờ vậy người chơi vẫn chỉ cần
hai lần chạm để chơi tiếp như bây giờ.

### 5.6 Vũ khí (học ảnh 2)

- Hàng trên "Đang mang": 3 thẻ to (gần, vừa, xa) có hình vũ khí, tên, cấp màu, sức đánh; dưới mỗi thẻ ghi
  tầm. Từ màn mở skill có thêm hàng skill đang mang.
- Lưới thẻ bên dưới: mọi vũ khí và skill đang có (Kiếm, Rìu, Giáo, Cung; Mưa băng, Cầu lửa). Món đang thuê
  ghi "Hiếm · n trận". Chạm một thẻ → mang món đó vào đúng tầm của nó (luật chọn vẫn là `chooseWeapon` /
  `chooseSkill` trong `logic/loadout.ts`).
- Mô tả chỉ số của món đang chọn hiện ở một dòng dưới hàng "Đang mang", viết bằng lời thường thay cho "vòng
  0–1, rộng 5 lát" khi làm được mà không sai luật.
- Đồ đang mang (3 vũ khí và skill) **được lưu vào hồ sơ**, tắt game mở lại vẫn còn (mục 8).
- Đây là **nơi duy nhất** đổi đồ. Chạm thẻ vũ khí trong Bảng trước trận sẽ mở màn Vũ khí, chọn xong quay về
  đúng bảng đó.

### 5.7 Nâng cấp

Giữ luật và dữ liệu của F14/F16 (Máu tối đa, Chí mạng, Hồi máu, May mắn). Mỗi chỉ số là một thẻ: hình biểu
tượng, tên, "Cấp n/3", hiệu lực hiện tại → cấp kế, nút mua có hình đồng xu và giá. Nút đủ vàng thì sáng, thiếu
thì mờ, hết cấp ghi "TỐI ĐA".

### 5.8 Cửa hàng (học cách trình bày của ảnh 3, vẫn mua bằng vàng)

Giữ luật F17 (4 món cấp Hiếm, 25 vàng, dùng 5 trận). Băng rôn "CỬA HÀNG", lưới thẻ: hình vũ khí, tên, chữ
"Hiếm" màu cấp, tình trạng ("Dùng 5 trận" / "Còn 3 trận" / "Đã có Sử thi"), nút giá có hình đồng xu.

## 6. Phong cách hình

- **Bảng màu**: Endesga 32, đủ 32 màu, thay toàn bộ Sweetie 16 trong `palette.ts`. Mã màu trong bản phác
  `khung-canh-32-mau.html` là các màu của bảng này.
- **Cỡ điểm ảnh**: khung cảnh vẽ ở nửa độ phân giải khung game (180×320 điểm) rồi phóng to ×2, để mỗi điểm
  ảnh khung cảnh to bằng điểm ảnh của nhân vật (nhân vật đang vẽ ở ×2). Không làm mịn.
- **Khung cảnh vẽ bằng code theo quy tắc** (như bản phác): nền cỏ theo nhiễu có mảng đậm và rìa chấm xen
  kẽ; ngọn cỏ và hoa rải ngẫu nhiên có hạt giống cố định; cây = thân có 3 sắc + tán ghép 6–8 chùm tròn, mỗi
  chùm sáng trên trái, tối dưới, viền tối; bụi và đá dùng cùng cách chùm tròn; ao = vài hình elip ghép, mép
  tối, giữa sâu, rìa nông, bờ đất, vệt sáng. Mỗi chủ đề có **hai bố cục khung cảnh cố định**: một cho Bản đồ, một
  cho Trận đấu (dùng chung cho cả 20 màn Rừng rậm). Cây, ao, bụi không được che sân đấu, nút màn hay thanh
  thông tin.
- **Theo chủ đề**: các dải màu (cỏ, lá, lá thu, thân cây, đất, nước, đá, hoa) gom thành một bộ cho chủ đề Rừng
  rậm, để chủ đề sau (Băng, Núi lửa) chỉ cần thêm một bộ dải màu và danh sách đồ trang trí.
- **Nhân vật và quái**: giữ hình dáng và kích thước hiện có, tô lại theo bảng 32 màu, thêm sắc sáng/tối để có
  khối như khung cảnh. Nhân vật chính vẫn tông xanh dương + vàng, quái tông đỏ/tím/xanh lá như
  `ART_STYLE.md`.
- **Hình mới cần vẽ** (lưới ký tự như hình hiện có): đồng xu, Kiếm, Rìu, Giáo, Cung, Mưa băng, Cầu lửa, biểu
  tượng cho 4 chỉ số nâng cấp, nút chơi, nút đóng, biểu tượng thanh nút dưới.
- **Khung, thẻ, nút**: khối vuông viền tối 3 điểm ảnh, đổ bóng xuống 4 điểm ảnh (kiểu pixel, không bo tròn) như
  bản phác bố cục.

## 7. Để lại cho người làm quyết

- Tên và cách chia scene mới (ví dụ `MapScene`, `WeaponsScene`), có tách bảng trước trận thành scene riêng hay
  vẽ trong `MapScene`.
- Cách mã hóa 32 màu trong lưới ký tự sprite (hiện mỗi ký tự 0–F là một trong 16 màu).
- Cách đưa khung cảnh vào Phaser (vẽ một lần ra texture rồi dùng lại là hướng hợp lý) và vị trí đặt hàm sinh
  khung cảnh — nên là hàm thuần không dùng Phaser để test được.
- Tọa độ, cỡ chữ, khoảng cách cụ thể trong khung 360×640.
- Thứ tự chia PR (gợi ý: bảng màu + tô lại hình → khung cảnh + trận đấu → bản đồ + bảng trước trận + thanh nút
  → Vũ khí, Nâng cấp, Cửa hàng).
- Cập nhật E2E cho luồng mới (mở game giờ là Bản đồ) và các file bố cục thuần kèm test.

## 8. Lựa chọn agent tự quyết (chủ dự án kiểm khi đọc, sửa nếu khác ý)

Những điểm dưới đây người đọc thử bản thiết kế hỏi lại hoặc bản phác chưa nói rõ. Agent chọn như sau:

1. **Đồ đang mang được lưu vào hồ sơ.** Hiện nay đồ chọn chỉ nằm trong bộ nhớ, tắt game là về bộ mặc định.
   Màn Vũ khí thành một nút trên thanh dưới nên người chơi sẽ chờ đồ đã chọn được giữ. Hồ sơ lên phiên bản 5
   có bước chuyển: hồ sơ cũ nhận bộ đồ mặc định, không mất gì khác.
2. **Khung cảnh cố định theo màn hình, không theo từng cấp màn**: một bố cục cho Bản đồ, một cho Trận đấu,
   dùng chung cho 20 màn Rừng rậm. Làm khác nhau cho từng màn tốn công gấp nhiều lần mà chưa ai yêu cầu.
3. **Thẻ hiệp sĩ** trong Bảng trước trận ghi "Hiệp sĩ" và máu tối đa, không ghi "cấp 2" như bản phác (game không
   có cấp nhân vật).
4. **Hình trùm cạnh nút màn** đặt cho mọi màn có trùm trong cấu hình (Người Cây ở màn 10, 20 và Slime Vua nếu
   còn trong cấu hình), không chỉ màn 10 và 20.
5. **Đường link `?level=N`** giờ mở Bản đồ kèm Bảng trước trận của màn N (nếu đã mở khóa), thay vì mở màn
   chuẩn bị như trước.
6. **Khung 360×640 giữ nguyên** để không phải đổi cách co giãn và toàn bộ tọa độ E2E. Điện thoại dài hơn sẽ
   có viền tối trên dưới như hiện nay.

## 9. Chơi lại màn đã qua (chủ dự án quyết 02/11/2026)

Chủ dự án chọn: **cho chơi lại màn đã qua, không nhận vàng** — để người chơi luyện tay mà không cày được vàng
ở màn dễ. Đây là luật mới nên viết test trước trong `logic/` (CLAUDE.md nguyên tắc 5).

1. Màn đã qua là màn có số thứ tự nhỏ hơn màn cao nhất đã mở khóa, hoặc màn 20 khi đã thắng màn 20. Hồ sơ
   phải ghi được việc đã thắng màn 20 (hiện chưa ghi được); gộp vào lần lên phiên bản 5 ở mục 8.
2. Chơi lại thì vàng nhặt trong trận **không cộng vào hồ sơ**. Bảng trước trận và màn kết quả ghi rõ "Chơi
   lại: không nhận vàng"; ô vàng trên thanh trận đấu ẩn hoặc ghi 0.
3. **Agent hiểu thêm, chủ dự án sửa nếu khác ý:** chơi lại cũng **không rơi vũ khí** từ quái hiếm, vì rơi đồ
   cũng là phần thưởng cày được như vàng. Món đang thuê ở cửa hàng vẫn bị trừ một trận nếu mang vào, như mọi
   trận khác. Thắng hay thua khi chơi lại không đổi màn đã mở khóa.
4. Sau màn kết quả của trận chơi lại, về Bản đồ và mở Bảng trước trận của màn kế (thắng) hoặc màn vừa chơi
   (thua), như mục 5.5.
