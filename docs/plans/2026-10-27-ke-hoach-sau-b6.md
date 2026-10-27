# Kế hoạch chỉnh sửa sau B6 (trước đồ họa thật)

> **Trạng thái: chủ dự án duyệt ngày 27/10/2026.** Đợt 0 làm ở F10 (`FEATURE_MAP.md`). Bản đề xuất của agent ngày 27/10/2026, dựa trên nhận xét của chủ
> dự án sau khi chơi thử (26–27/10) và bản nghiên cứu sâu Micro RPG (`.cache/research-micro-rpg-deep.md`,
> nguồn công khai, chưa đưa vào repo). Mọi luật và con số dưới đây là **đề xuất**; ô "Chủ dự án quyết"
> của mỗi đợt phải được trả lời trước khi làm đợt đó. Đồ họa thật (giai đoạn C) làm **sau** kế hoạch này.

## 1. Kết luận

Tám đợt, làm lần lượt. Đợt 0 làm trước vì nó làm mọi đợt sau nhanh hơn và rẻ hơn:

| Đợt | Việc                                                                      | Cỡ  | Phụ thuộc |
| --- | ------------------------------------------------------------------------- | --- | --------- |
| 0   | Tự động hóa: dò số cân bằng tự động, bot chơi khôn hơn, bảng số tự vào PR | M   | —         |
| 1   | Thắng bằng nhiệm vụ "giết N con loại X" + quái ra theo đợt                | L   | 0         |
| 2   | Thêm 3–4 loại quái (dữ liệu hóa đặc tính)                                 | M   | 1         |
| 3   | Lưu tiến trình + vàng                                                     | M   | —         |
| 4   | Nâng cấp nhân vật / vũ khí bằng vàng                                      | M   | 3         |
| 5   | Quái hiếm + rơi đồ theo cấp màu + túi đồ (nối màn chuẩn bị B4)            | L   | 3, 4      |
| 6   | Cửa hàng + vũ khí có hạn (tính theo số trận)                              | M   | 5         |
| 7   | Thiết kế màn (B5): 15–20 màn bằng bộ sinh màn                             | M   | 0, 1, 2   |

Quảng cáo để tới giai đoạn D (đóng gói app): cần SDK quảng cáo và mạng, trái luật "chạy offline" hiện
tại (CLAUDE.md đường cấm #11).

**Cỡ:** S ≈ một buổi, M ≈ 1–2 ngày làm của agent (kể cả 3 lớp kiểm chứng), L ≈ 2–4 ngày.

## 2. Nhận xét của chủ dự án → đợt nào

| Nhận xét (26–27/10/2026)                                                                                                | Đợt               |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Mỗi trận yêu cầu đánh số lượng quái khác nhau, đánh đủ là thắng                                                         | 1                 |
| Cần nhiều loại quái hơn slime                                                                                           | 2                 |
| Máu nhân vật tăng, hồi máu, chí mạng                                                                                    | ✅ B6 (PR #20)    |
| Skill dạng bấm, đủ thời gian thì dùng                                                                                   | ✅ B6 (PR #20)    |
| Nâng cấp vũ khí, nâng cấp nhân vật                                                                                      | 3, 4              |
| Quái hiếm theo may mắn, rơi đồ cấp màu (trắng → legendary), vàng, đồ có hạn/vĩnh viễn, mua bằng vàng hoặc xem quảng cáo | 3, 5, 6, (D)      |
| Thiết kế màn chơi                                                                                                       | 7                 |
| Cần tự động hóa, làm game nhanh hơn                                                                                     | 0 (và xuyên suốt) |

## 3. Đợt 0 — Tự động hóa (làm trước)

**Mục tiêu:** đổi luật hay thêm quái thì máy tự đề xuất con số giữ đúng độ khó mục tiêu, chủ dự án chỉ
duyệt — thay vì agent dò tay mỗi lần (B6 mất ~2 lượt dò, ~10 phút máy).

**Việc:**

1. **Mục tiêu độ khó ghi trong cấu hình:** mỗi màn có `target: { winRate, spareTurns }` (vd. màn 1:
   ~100%, dư ~2,5). Một nguồn sự thật cho cả mô phỏng, `balance.test.ts` và bộ dò số.
2. **`npm run tune`:** tổng quát hóa script dò của B6 (`scripts/simCore.ts` đã tách sẵn). Chỉ định "núm
   vặn" được phép đổi (số lượt, máu quái, số nhát nạp skill…) → in bảng đề xuất gần mục tiêu nhất, kèm
   số trước/sau. Không tự ghi vào cấu hình: chủ dự án duyệt rồi agent mới áp.
3. **Bot khôn hơn:** bot hiện chỉ đếm số quái trúng, nên đo sai giá trị của Rìu và Mưa băng (B4, B6 đều
   thấy). Thêm bot "nhìn trước 1 lượt" (thử mọi nước, chọn nước để lại ít quái nguy hiểm nhất) và bot
   biết để dành skill. Giữ bot cũ làm "người chơi trung bình".
4. **Bảng số tự vào PR:** CI chạy `npm run sim` (số ván nhỏ cho nhanh) và in bảng vào tóm tắt job, để
   PR nào đổi cân bằng cũng có số mà không cần agent dán tay.

**Tiêu chí đạt:**

| #   | Tiêu chí                                                                                                | Kiểm bằng |
| --- | ------------------------------------------------------------------------------------------------------- | --------- |
| 0.1 | `npm run tune` tái tạo được bộ số B6 (máu quái 3, nạp 3/5, lượt 10/12/9/8/8) từ mục tiêu trong cấu hình | Chạy lệnh |
| 0.2 | `balance.test.ts` đọc mục tiêu từ cấu hình, kiểm mỗi màn nằm trong dung sai (đề xuất ±5% thắng)         | Unit      |
| 0.3 | Bot "nhìn trước" thắng nhiều hơn bot cũ ở màn 4–5; mang Rìu ở màn 4 có lợi rõ hơn                       | sim       |
| 0.4 | Job CI có bảng mô phỏng trong tóm tắt                                                                   | Xem CI    |

**Chủ dự án quyết:** (đã trả lời 27/10/2026: "Mục tiêu độ khó và dung sai theo gợi ý của bạn")

1. Mục tiêu độ khó từng màn (agent gợi ý: màn đầu ≥ 98%, tụt dần ~4–5% mỗi màn, màn trùm thấp nhất
   chương ~75–80% với bot giỏi). → Chốt 98 / 93 / 88 / 83 / 78%. Lúc đầu đo bằng bot "Nhìn trước";
   chủ dự án đổi sang đo bằng bot "Ngắm chuẩn" (người chơi trung bình) ngày 27/10/2026, vì đo bằng bot
   giỏi thì người chơi trung bình chỉ thắng màn 4 45–60%.
2. Dung sai chấp nhận (gợi ý ±5% tỉ lệ thắng, ±0,5 lượt dư). → Chốt như gợi ý.

**Kết quả đợt 0** (chi tiết F10): 0.1 ✅ (chạy bộ dò trên cấu hình lúc làm B6), 0.2 ✅, 0.3 một nửa — bot nhìn trước
thắng màn 4–5 nhiều hơn rõ (~95% so với ~81–84% của bot ngắm chuẩn), nhưng Rìu vẫn không hơn Kiếm ở màn 4 (thiết kế màn, đợt 7), 0.4 ✅.

## 4. Đợt 1 — Thắng bằng nhiệm vụ + quái ra theo đợt

**Mục tiêu:** đúng ý chủ dự án: "mỗi trận yêu cầu đánh số lượng quái khác nhau, đánh đủ là thắng". Micro
RPG làm như vậy: mỗi màn có **nhiệm vụ chính + nhiệm vụ phụ** dạng "giết N con loại X"; **không cần giết
hết quái**; xong nhiệm vụ chính thì được **+1 lượt** và được chọn rời màn sớm.

**Hệ quả kỹ thuật:** đây là thay đổi luật lõi lớn nhất. Hiện thắng = "sân hết quái". Nhiệm vụ "giết 6
slime" mà sân chỉ có 6 con thì không khác gì bây giờ — nên cần **quái ra thêm giữa trận** (theo đợt), và
bảo đảm đủ quái nhiệm vụ xuất hiện (Micro RPG từng có màn bất khả thi vì quái nhiệm vụ không ra).
**Code cũ không bị xóa:** `LevelConfig` thêm `quests` và `waves`; `phase: 'won'` đổi điều kiện; giao diện
thêm dòng nhiệm vụ ở thanh trên (thay "Quái: n").

**Đề xuất luật** (để chủ dự án chọn):

1. Mỗi màn 1 nhiệm vụ chính (bắt buộc) + 0–1 nhiệm vụ phụ (thưởng, có từ khi có vàng — đợt 3).
2. Đợt quái: mở màn có một đợt; mỗi khi quái trên sân ít hơn X (hoặc mỗi N lượt) thì đợt mới tràn vào ở
   vòng ngoài cùng, cho tới khi hết danh sách đợt của màn.
3. Xong nhiệm vụ chính → **thắng ngay** (đơn giản) — hoặc +1 lượt và chọn ở lại để làm nhiệm vụ phụ
   (giống Micro RPG, phức tạp hơn).

**Tiêu chí đạt:** unit cho đếm nhiệm vụ, đợt quái, bảo đảm đủ quái; E2E ván seed 42 qua mọi màn bằng
nhiệm vụ; thử tay thấy dòng nhiệm vụ đếm đúng; `npm run tune` đưa mọi màn về mục tiêu (đợt 0).

**Chủ dự án quyết:** luật 1–3 ở trên; nhiệm vụ hiện ở đâu (gợi ý: thay ô "Quái: n" bằng "Slime 3/6").

**Đã quyết (27/10/2026):** "cứ làm theo gợi ý" — 1 nhiệm vụ chính, đợt kế ra khi sân còn ≤ ngưỡng của
màn, xong nhiệm vụ là thắng ngay, ô "Slime 3/6" thay "Quái: n". Nhiệm vụ phụ chờ đợt 3 (vàng). Làm ở F11.

## 5. Đợt 2 — Thêm loại quái

**Mục tiêu:** nhiệm vụ "giết loại X" chỉ có nghĩa khi có nhiều loại. Mỗi loại quái mới phải đặt ra **một
câu đố khác** (như Slime Pháo bắt ưu tiên Cung).

**Cách làm để thêm quái nhanh:** gom hành vi thành **đặc tính** khai báo trong cấu hình (như `shootRing`
của B3) thay vì viết code riêng từng loại. Thêm loại mới = thêm một khối dữ liệu + hình.

**Ứng viên** (từ nghiên cứu Micro RPG, xếp theo công làm tăng dần):

| Quái            | Đặc tính                                                                 | Câu đố                                | Cỡ  |
| --------------- | ------------------------------------------------------------------------ | ------------------------------------- | --- |
| Mob (slime con) | 1 máu, đánh nhẹ                                                          | Làm "mồi" để tăng combo cho quái trâu | S   |
| Lao (charger)   | Mỗi lượt tiến 2 vòng                                                     | Phải xử lý trước khi nó áp sát        | S   |
| Có khiên        | Chỉ mất máu khi là đòn thứ ≥ N trong combo (Micro RPG dùng cho trùm)     | Phải gom cụm để có combo dài          | M   |
| Tách đôi        | Chết thì để lại 2 con nhỏ ở ô bên cạnh                                   | Giết bằng nhát lớn / đúng lúc         | M   |
| Tự nổ           | Áp sát thì nổ (mất nhiều máu), chết cạnh quái khác thì làm chúng mất máu | Hạ từ xa, hoặc dùng để dọn cụm        | M   |
| Ma              | Lượt chẵn không thể bị đánh (vô hình)                                    | Canh đúng lượt                        | M   |

**Tiêu chí đạt:** mỗi loại có unit test hành vi, có màn dùng nó, mô phỏng cho thấy bot "biết" câu đố thắng
nhiều hơn rõ rệt bot không biết (như Slime Pháo: 85% so với 13%).

**Chủ dự án quyết:** chọn 3–4 loại; tên và hình (agent phác lưới ký tự như Slime Pháo).

**Đã quyết (27/10/2026):** "làm theo gợi ý của agent" — agent chọn Slime Con (Mob), Slime Lao (Lao), Slime
Ma (Ma). Lúc đầu chọn Có khiên thay Ma, bỏ vì hết "mồi" là màn kẹt, không bộ số nào đạt mục tiêu. Làm ở F12.

## 6. Đợt 3 — Lưu tiến trình + vàng

**Mục tiêu:** nền cho mọi thứ "ngoài trận": nhớ màn đã qua, vàng, (sau này) đồ và nâng cấp. Tắt game
mở lại vẫn còn.

**Việc:** tính năng mới `src/features/profile/` (lưu vào `localStorage` của trình duyệt, có **số phiên
bản dữ liệu** để sau này đổi cấu trúc không làm mất đồ người chơi); giết quái ra vàng (số do chủ dự án
chốt); màn kết quả hiện vàng nhận được; màn chuẩn bị hiện tổng vàng. Bỏ DEBT-011 (`?level=` chỉ mở màn
đã mở khóa). Đây là tính năng thứ hai → trả DEBT-005 (máy chặn import chéo tính năng).

**Rủi ro:** lỗi ở đây làm người chơi mất tiến trình, khó cứu sau khi phát hành → test kỹ đọc/ghi, dữ
liệu hỏng, phiên bản cũ.

**Chủ dự án quyết:** mỗi loại quái cho bao nhiêu vàng; thua có được giữ vàng đã nhặt không.

**Đã quyết (27/10/2026):** "agent đề xuất" — slime, Slime Con 1 · Lao, Ma 2 · Pháo 3 · Vua 5 vàng; thua vẫn
giữ vàng đã nhặt; mở game vào màn cao nhất đã mở khóa. Làm ở F13.

## 7. Đợt 4 — Nâng cấp nhân vật / vũ khí

**Mục tiêu:** có thứ để tiêu vàng và cảm giác mạnh lên.

**Đề xuất:** màn **Nâng cấp** (từ màn chuẩn bị). Nhân vật: máu tối đa, may mắn (dùng ở đợt 5), hồi máu.
Vũ khí: cấp 1→N, mỗi cấp tăng sát thương hoặc % chí mạng (Micro RPG: nâng cấp chỉ tăng chỉ số). Giá
tăng dần theo cấp.

**Lưu ý cân bằng:** nâng cấp làm màn dễ dần → mục tiêu độ khó phải tính theo "người chơi có mức nâng cấp
dự kiến ở màn đó". Bộ dò số (đợt 0) chạy mô phỏng với mức nâng cấp giả định.

**Chủ dự án quyết:** chỉ số nào được nâng; bậc giá; giới hạn cấp.

## 8. Đợt 5 — Quái hiếm, rơi đồ, cấp màu, túi đồ

**Mục tiêu:** ý tưởng của chủ dự án ngày 27/10: từ các màn có skill, mỗi trận **có thể** có quái hiếm
(xác suất theo chỉ số **may mắn**); hạ quái hiếm có tỉ lệ rơi **vũ khí theo chủng loại quái**, cấp màu
**trắng (common) → … → legendary**, dạng **có hạn hoặc vĩnh viễn**, kèm nhiều vàng hơn.

**Đề xuất để tránh "quá nhiều tầng may rủi"** (lời chê lớn nhất của Micro RPG):

1. **Bảo hiểm rơi đồ (pity):** giết N quái hiếm mà chưa ra đồ thì lần sau chắc chắn ra.
2. Quái hiếm là **thưởng thêm**, không bao giờ cần để thắng màn.
3. Cấp màu chỉ khác **chỉ số** (sát thương, % chí mạng, độ rộng); hiệu ứng đặc biệt để sau.
4. Túi đồ nối vào màn chuẩn bị B4 (đã làm sẵn "danh sách vũ khí sở hữu" — chỉ cần đưa danh sách thật).

**Tiêu chí đạt:** mô phỏng kinh tế (đợt 0 mở rộng): trung bình bao nhiêu trận ra một món mỗi cấp màu,
bao nhiêu trận đủ vàng nâng một cấp — chủ dự án duyệt bảng này trước khi chốt tỉ lệ.

**Chủ dự án quyết:** số cấp màu và tên; tỉ lệ rơi; có bảo hiểm không; ảnh hưởng của may mắn.

## 9. Đợt 6 — Cửa hàng + vũ khí có hạn

**Đề xuất:** vũ khí có hạn tính **theo số trận** (vd. "dùng được 5 trận"), không theo giờ thật — chỉnh
đồng hồ điện thoại không gian lận được, test lặp lại được, và luật thuần không được đọc giờ (đường cấm
#2). Cửa hàng bán một số món bằng vàng; nút "xem quảng cáo" để dành tới giai đoạn D.

**Chủ dự án quyết:** món nào bán, giá; vũ khí có hạn dùng mấy trận.

## 10. Đợt 7 — Thiết kế màn (B5)

**Mục tiêu:** 15–20 màn, chia chương 5 màn, màn cuối chương có trùm.

> **Chủ dự án bổ sung 27/10/2026** (nguyên văn ở CLAUDE.md mục 1): màn chơi chia theo **chủ đề môi trường**
> (núi lửa, băng, rừng rậm…), mỗi chủ đề **khoảng 20 màn**; game phải mở rộng được về sau. Mục tiêu
> 15–20 màn ở trên cần sửa lại theo ý này khi bắt đầu đợt 7.

**Cách làm nhanh:** **bộ sinh màn** — mô tả màn bằng ý ("chương 2, màn 3, có quái lao, khó vừa") → máy
chọn đội hình, đợt quái, nhiệm vụ, số lượt sao cho mô phỏng đúng mục tiêu độ khó (đợt 0) → chủ dự án
chơi thử và duyệt từng chương. Luật trùm riêng (khiên — đợt 2) làm trùm khác quái thường.

**Chủ dự án quyết:** số màn, số chương, trùm mỗi chương; có cơ chế sân riêng theo chương không (Micro RPG:
dưới nước mất máu mỗi lượt, dung nham…).

## 11. Rủi ro chung

- **Thứ tự 1 → 2 → 7 đổi luật lõi** (thắng bằng nhiệm vụ): mọi E2E, mô phỏng, số cân bằng đều phải làm
  lại một lần — làm sớm thì rẻ hơn làm muộn.
- **Phạm vi phình:** đợt 3–6 là cả một lớp "ngoài trận"; mỗi đợt phải chơi được và có giá trị riêng,
  không làm dở dang nhiều đợt cùng lúc.
- **Đồ họa:** mọi màn hình mới (nâng cấp, túi đồ, cửa hàng) đang vẽ bằng khung chữ nhật + chữ; đồ họa thật
  (C) sẽ vẽ lại. Nếu muốn tránh vẽ hai lần, có thể làm C ngay sau đợt 2 (trước các màn hình mới).
