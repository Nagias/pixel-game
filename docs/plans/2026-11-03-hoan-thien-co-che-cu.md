# Kế hoạch hoàn thiện cơ chế cũ (rơi đồ, vũ khí mới, quái mới, trùm)

> **Trạng thái: chủ dự án duyệt cả 8 mục ngày 03/11/2026 ("Duyệt hết").** Chạy liên tục như lượt duyệt ngày
> 27/10: mỗi phần một PR, tự gộp khi CI xanh; đề xuất nào làm không được thì chọn phương án gần nhất và ghi lý
> do trong PR. Đề xuất lối chơi mới (va chạm, địa hình, 3 sao…) **không** thuộc kế hoạch này — xem
> `docs/plans/2026-11-03-de-xuat-loi-choi-moi.md` (chưa chốt).

## 1. Vì sao

Chủ dự án (03/11/2026): "làm trước cơ chế cũ chưa hoàn thiện đi, cơ chế về rơi trang bị, vũ khí mới, quái
đó". Rà hồ sơ thấy 7 chỗ chủ dự án đã nêu mà game chưa làm xong hoặc làm lệch ý:

1. Ý ngày 27/10 (nguyên văn, trích): "quái hiếm sẽ tùy theo chủng loại mà xuất hiện vũ khí theo chủng loại
   đó" — game đang rơi ngẫu nhiên đều 4 loại.
2. Cùng đoạn: "vũ khí rớt từ quái hiếm đó sẽ có dạng thời gian và dạng vĩnh viễn với tỷ lệ % xuất hiện khác
   nhau" — game: đồ rơi luôn vĩnh viễn (bản duyệt chung 27/10 rút mất phần "dạng thời gian").
3. "Nâng cấp vũ khí, nâng cấp nhân vật" (26–27/10) — mới có nâng cấp nhân vật.
4. "Rìu và vũ khí khác" (22/10) — mới có Rìu.
5. "Cần nhiều loại quái hơn slime" — 5 quái rừng dùng lại đặc tính của slime.
6. Kế hoạch sau B6 mục 10: luật trùm riêng — Người Cây chỉ nhiều máu.
7. Mua bằng vàng hoặc xem quảng cáo — quảng cáo để giai đoạn D (cần mạng), giữ nguyên.

## 2. Tám mục chủ dự án đã duyệt (03/11/2026)

1. **Bảng rơi theo loài:** mỗi loài quái hiếm rơi đúng một loại vũ khí. Yêu tinh → Kiếm, Sói rừng → Rìu,
   Cung thủ → Cung, Dơi đêm → Lưỡi hái, Rùa gai → Búa, Pháp sư yêu tinh → Giáo, Tổ nhện → Nỏ. Nấm nổ không
   bao giờ hóa hiếm.
2. **Có hạn / vĩnh viễn:** 70% món rơi có hạn (dùng 10 trận), 30% vĩnh viễn, mọi cấp như nhau. Món chắc chắn
   nhờ bảo hiểm luôn vĩnh viễn. Trừ hạn như cửa hàng (chỉ khi mang vào trận). Đồ đã rơi trước đây giữ vĩnh viễn.
3. **Ba vũ khí mới:** Búa (gần, hẹp, 2 sát thương, choáng 1 lượt), Lưỡi hái (vừa, quét rộng, kéo quái ở hai
   mép vào giữa), Nỏ (xa, xuyên một hàng từ vòng 2 ra vòng 5). Mở bản Thường khi thắng màn đầu tiên có loài
   rơi món đó; cấp cao rơi từ quái hiếm; cửa hàng bán bản Hiếm 25 vàng / 5 trận.
4. **Bốn quái có hành vi riêng** (mỗi loài ít nhất hai cách hạ, không bao giờ kẹt màn): Nấm nổ (chết thì nổ,
   quái sát bên mất máu, nổ sát nhân vật thì nhân vật mất máu), Pháp sư yêu tinh (mỗi lượt phủ khiên đỡ một
   đòn cho quái cạnh nó), Tổ nhện (đứng yên, 3 lượt đẻ một con nhện), Rùa gai (bị vũ khí tầm gần đánh thì nhân
   vật bị phản đòn).
5. **Trùm Người Cây:** chỉ mất máu khi là con thứ 2 trở lên trong một nhát combo; cứ 3 lượt gọi 2 Yêu tinh ra
   sát bên (luôn có mồi để combo).
6. **Nâng cấp từng vũ khí:** 3 cấp, mỗi cấp +5% chí mạng, cấp 3 thêm +1 sát thương, giá 15 / 30 / 60 vàng. Món
   rơi trùng hoặc thấp hơn đổi thành vàng (sửa điều chủ dự án duyệt 28/10: trước là không được gì).
7. **Sinh lại màn 8–20** đưa quái và vũ khí mới vào; giữ đường độ khó đã chốt (màn 1 ~98% giảm tới trùm màn 10
   ~78%, màn 11 ~92% giảm tới màn 20 ~72%) và mức thêm lượt cho người mới. Màn 1–7 giữ nguyên.
8. **Cách chạy:** duyệt một lần, làm liên tục, mỗi phần một PR, tự gộp khi CI xanh.

## 3. Thứ tự làm (đổi so với lúc đề xuất — lý do)

| PR  | Phần                                                         | Vì sao ở vị trí này                                                           |
| --- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| A   | Vũ khí mới (mục 3)                                           | Bảng rơi theo loài (mục 1) cần Lưỡi hái, Búa, Nỏ có sẵn trong game            |
| B   | Rơi theo loài + có hạn / vĩnh viễn + đổi vàng (mục 1, 2, 6b) | Cần vũ khí mới; không đổi luật trận nên không đụng cân bằng                   |
| C   | Nâng cấp từng vũ khí (mục 6a)                                | Dùng màn Nâng cấp; độc lập với quái                                           |
| D   | Trùm Người Cây (mục 5)                                       | Màn 10, 20 đã có trùm nên chơi thử được ngay; luật "gọi quái" dùng lại ở E    |
| E   | Quái mới + sinh lại màn 8–20 (mục 4, 7)                      | Gộp vì quái mới chỉ chơi thử được khi đã có trong màn (luật 3 lớp kiểm chứng) |

Lúc đề xuất thứ tự là rơi đồ → vũ khí → quái → trùm → nâng cấp → sinh lại màn. Đổi theo mục 8 ("chọn phương
án gần nhất và ghi lý do").

## 4. Lựa chọn agent tự chốt (chủ dự án xem khi đọc PR)

- **Vũ khí mới thêm vào cuối danh sách** (chỉ số 4, 5, 6) để đồ đã lưu trong hồ sơ (lưu theo chỉ số) không lệch.
- **Choáng của Búa = đứng im 1 lượt**, dùng lại trạng thái đóng băng của Mưa băng (không đi, không đánh, không bắn).
- **Lưỡi hái "kéo vào giữa":** quái trúng ở lát lệch tâm dời 1 lát về phía lát giữa; ô đích có quái thì đứng yên.
- **Nỏ:** vòng 2–5, rộng 1 lát, không đẩy. Con số cuối (sát thương, chí mạng) chỉnh bằng mô phỏng nếu Nỏ lấn hẳn Cung.
- **Mở khóa:** vũ khí có mốc "mở sau màn n". Ở PR A: Lưỡi hái sau màn 12 (Dơi đêm ra lần đầu — đúng luật), Búa
  và Nỏ tạm sau màn 10 và màn 14; PR E sửa đúng theo màn Rùa gai, Tổ nhện ra lần đầu, có test giữ luật này. Có món
  đó ở dạng rơi (vĩnh viễn hoặc còn hạn) cũng tính là đã có.
- **Cửa hàng chỉ bày món đã mở khóa** (không bán món chưa gặp).
- **Món thuê có cấp:** hồ sơ lưu thêm cấp của món thuê (trước đây món thuê luôn là cấp Hiếm). Một vũ khí chỉ có
  một món thuê: món mới cấp cao hơn thì thay, cùng cấp thì cộng dồn trận, thấp hơn hoặc không hơn đồ vĩnh viễn
  thì đổi vàng.
- **Vàng đổi từ món thừa** theo cấp: Thường 1, Tốt 2, Hiếm 4, Sử thi 8, Huyền thoại 15, Thần 30 (dưới giá một
  cấp nâng cấp rẻ nhất nhân với cấp — không thành nguồn vàng chính).
- **Nấm nổ:** nổ trúng 8 ô quanh nó, mất 2 máu; nổ ở vòng 0 thì nhân vật mất 2 máu; nổ dây chuyền được. Nổ cũng
  tính nhiệm vụ, vàng, quái hiếm.
- **Khiên của Pháp sư:** đỡ trọn một đòn bất kỳ (chém, skill, nổ). Quái có khiên vẫn chiếm một chỗ trong combo
  và vẫn bị đẩy. Pháp sư phủ khiên sau khi quái đi, nên người chơi thấy khiên trước khi chém.
- **Tổ nhện, gọi quái của trùm:** con mới ra ở ô trống sát bên theo thứ tự cố định (vào trong trước), không tung
  số ngẫu nhiên; hết ô thì gọi ít hơn. Nhện con 1 máu, đánh 1, không cho vàng (tránh "nuôi tổ lấy vàng").
- **Rùa gai:** mỗi lần vũ khí tầm gần chém trúng nó, nhân vật mất 1 máu (sau khi kiểm thắng — nhát thắng thì không).
- **Trùm:** skill và nổ không làm trùm mất máu (không phải combo). Hiện số "2" trên trùm để báo luật.
- **Nâng cấp vũ khí** không tính vào nâng cấp dự kiến khi đo độ khó (như cấp màu đồ rơi trước giờ).

## 5. Từng PR và cách kiểm chứng

Mỗi PR: viết test luật trước (đỏ) → code (xanh) → view → `npm run check` xanh (định dạng, lint, kiểu, unit, E2E)
→ xem ảnh E2E → thử tay trong preview khung 375×760 theo `docs/MANUAL_TEST.md` → `FEATURE_MAP.md`, `DEBT.md`,
`TASKS.md` → PR → CI xanh → gộp.

### PR A — Vũ khí mới

- Luật: kiểu đẩy `gather`, choáng khi trúng (`stunTurns`), mốc mở khóa, danh sách vũ khí đang có.
- Màn Vũ khí 9 thẻ (7 vũ khí + 2 skill), cửa hàng bày 7 món, hình 3 vũ khí, mô tả món.
- **Kiểm chứng:** unit — Lưỡi hái kéo đúng hướng / bị chặn đứng yên, Búa choáng đúng 1 lượt, Nỏ trúng cả hàng
  vòng 2–5, chưa thắng màn mốc thì không có món, có đồ rơi thì có món, bố cục 9 thẻ và cửa hàng nằm trong khung
  không chồng nhau. E2E — hồ sơ đã qua màn 12 thì màn Vũ khí có Lưỡi hái, mang vào trận chém kéo quái vào giữa
  (ảnh); hồ sơ mới thì không thấy 3 món mới. Thử tay — mở màn Vũ khí, Cửa hàng ở khung điện thoại, chơi một trận
  dùng Búa. Mô phỏng `npm run sim` các màn không đổi số (bộ mặc định vẫn Kiếm + Giáo + Cung).

### PR B — Rơi theo loài, có hạn / vĩnh viễn, đổi vàng

- Luật: loài → vũ khí, tung vĩnh viễn 30%, bảo hiểm luôn vĩnh viễn, món thuê có cấp, đổi vàng; hồ sơ phiên bản 6.
- **Kiểm chứng:** unit — Yêu tinh hiếm chỉ rơi Kiếm…, 10.000 lần tung ra ~30% vĩnh viễn, món bảo hiểm vĩnh viễn,
  từng ca thay / cộng dồn / đổi vàng, hồ sơ bản 5 chuyển lên bản 6 không mất đồ, cửa hàng với món thuê có cấp, mọi
  loài hiếm được đều có món rơi. E2E — hạ quái hiếm (bảo hiểm chắc rơi) ra đúng vũ khí của loài, màn kết quả ghi
  "vĩnh viễn" hoặc "10 trận", màn Vũ khí ghi số trận; món thừa ra vàng. Thử tay — xem màn kết quả và màn Vũ khí.

### PR C — Nâng cấp từng vũ khí

- Màn Nâng cấp có hai thẻ chọn "Nhân vật" / "Vũ khí"; hồ sơ phiên bản 7.
- **Kiểm chứng:** unit — giá 15/30/60, tối đa 3 cấp, thiếu vàng từ chối, cộng chí mạng và sát thương đúng cấp,
  chỉ nâng món đang có, hồ sơ bản 6 lên bản 7. E2E — mua 3 cấp Kiếm, vào trận thấy sát thương Kiếm tăng (ảnh).
  Thử tay — đổi thẻ Nhân vật / Vũ khí, mua, thiếu vàng.

### PR D — Trùm Người Cây

- Luật: chỉ mất máu khi là con thứ ≥ 2 trong combo; cứ 3 lượt gọi 2 Yêu tinh; chỉnh lại số lượt màn 10, 20.
- **Kiểm chứng:** unit — chém trúng mình trùm không mất máu, trúng cùng 1 con khác thì mất, skill không làm mất
  máu, gọi đúng lượt / đúng ô / hết ô thì gọi ít hơn, id quái mới không trùng. Mô phỏng — màn 10, 20 về đúng mục
  tiêu (`balance.test.ts`). E2E — ván chạy hết 20 màn vẫn qua; ảnh trùm có số "2" và Yêu tinh được gọi. Thử tay
  màn 10.

### PR E — Quái mới + sinh lại màn 8–20

- Luật: Nấm nổ, Pháp sư yêu tinh, Tổ nhện, Nhện con, Rùa gai; hình 5 loài; bot hiểu luật mới; bản mô tả màn mới,
  `npm run levelgen` cho màn 8–20, mốc mở khóa Búa / Nỏ đúng màn ra quái.
- **Kiểm chứng:** unit — từng luật quái (nổ, dây chuyền, nổ vòng 0, khiên đỡ đòn, phủ khiên, đẻ nhện, đứng yên,
  phản đòn chỉ với tầm gần), không loài nào làm màn kẹt, mốc mở khóa = màn đầu có loài rơi món đó. Mô phỏng — màn
  8–20 trong dung sai (`balance.test.ts`), bot biết câu đố thắng hơn bot không biết. E2E — ván 20 màn vẫn qua, ảnh
  từng quái mới. Thử tay — chơi màn giới thiệu từng quái.

### Kiểm chứng cuối

Sau PR E: `npm run check` trên `main`, chơi tay cả luồng từ hồ sơ mới (bản đồ, bảng trước trận, trận, kết quả,
Vũ khí, Cửa hàng, Nâng cấp) trong preview khung 375×760; cập nhật `FEATURE_MAP.md` hàng chờ.

## 6. Rủi ro

- **Bot đo độ khó:** bot "Ngắm chuẩn" chấm nước đi theo số quái trúng, không giả lập — phải dạy riêng từng luật
  mới, nếu không số đo màn 8–20 sai.
- **Màn kẹt:** bài học Slime Khiên — mỗi luật quái phải có test "luôn thắng được nếu chơi đúng".
- **Hồ sơ người chơi:** hai lần lên phiên bản (6, 7) — test chuyển phiên bản trước, không mất đồ.
- **Thời gian chạy test:** thêm vũ khí làm `npm run sim` thử nhiều bộ đồ hơn; `balance.test.ts` chỉ đo bộ mặc
  định nên không chậm thêm.
