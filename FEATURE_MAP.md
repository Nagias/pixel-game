# Bản đồ tính năng

> Quy tắc: PR nào thêm hoặc đổi tính năng thì cập nhật file này **trong cùng PR đó**.
> Luật chơi chính xác nằm trong code + test; ở đây là tóm tắt cho người đọc và chỉ đường tới file.

## Tổng quan

| Mã   | Tính năng                                        | Trạng thái | Code                                 | Test                                                     |
| ---- | ------------------------------------------------ | ---------- | ------------------------------------ | -------------------------------------------------------- |
| F01  | Trận đấu tối thiểu (walking skeleton, khuôn mẫu) | ✅ Xong    | `src/features/battle/`               | `src/features/battle/**/*.test.ts`, `e2e/battle.spec.ts` |
| F02  | Thanh 3 nút vũ khí theo tầm (gần / vừa / xa)     | ✅ Xong    | `src/features/battle/` (mở rộng F01) | như F01                                                  |
| F03  | Combo gom cụm 100% / 200% / 300%                 | ✅ Xong    | `src/features/battle/` (mở rộng F01) | như F01                                                  |
| F04  | Máu nhân vật + dấu "!" báo quái sắp đánh         | ✅ Xong    | `src/features/battle/` (mở rộng F01) | như F01                                                  |
| F05  | Đẩy quái theo vũ khí (knockback)                 | ✅ Xong    | `src/features/battle/` (mở rộng F01) | như F01                                                  |
| F06  | Màn chơi nối tiếp + trùm Slime Vua               | ✅ Xong    | `src/features/battle/` (mở rộng F01) | như F01                                                  |
| F07a | Rìu chém hai phía + màn 4 quái tới từ hai phía   | ✅ Xong    | `src/features/battle/` (mở rộng F01) | như F01                                                  |
| F07  | Màn chuẩn bị trận: chọn mỗi tầm một vũ khí       | ✅ Xong    | `src/features/battle/` (mở rộng F01) | như F01                                                  |
| F09  | Quái bắn xa Slime Pháo + màn 5                   | ✅ Xong    | `src/features/battle/` (mở rộng F01) | như F01                                                  |

## F01 — Trận đấu tối thiểu

**Người chơi thấy và làm gì:** nhân vật đứng giữa sân tròn, một hình nêm xanh quay quanh. Chạm vào
sân để chém mọi quái đang nằm trong vùng xanh. Diệt hết quái trước khi hết lượt hoặc trước khi quái
chạm tới mình thì thắng.

**Luật** (nguồn sự thật: `logic/battle.ts` + `logic/battle.test.ts`):

1. Sân chia 24 lát × 6 vòng; vòng 0 sát nhân vật.
2. Mở trận: đội hình quái của màn (màn 1: 4 slime 2 máu — xem F06) xuất hiện thành cụm ở vòng ngoài
   cùng, mỗi con một lát.
3. Vùng xanh quay đều theo chiều kim đồng hồ, hết một vòng sau 2,4 giây. Hình vùng (vòng nào, rộng
   mấy lát) theo vũ khí đang cầm — xem F02.
4. Mỗi lần chém tốn 1 lượt (màn 1 tối đa 8): mọi quái trong vùng mất máu theo vũ khí và combo (F03), hết
   máu thì biến mất.
5. Sau nhát chém, từng con quái còn sống (theo thứ tự id): 60% tiến vào 1 vòng, 40% đi ngang 1 lát
   ("đi lung tung"); không đi vào ô đã có quái khác.
6. Hết quái → **thắng**. Nhân vật hết máu → **thua** ("Bạn đã gục") — xem F04.
   Hết lượt mà còn quái → **thua** ("Hết lượt mà quái vẫn còn"). Nhát cuối vừa diệt hết quái thì vẫn thắng.
7. Cấu hình sai (vd. vùng đánh rộng số chẵn lát, tầm vũ khí vượt sân, không có vũ khí) bị từ chối ngay
   lúc mở trận.

**Hành vi giao diện** (nằm ở `view/BattleScene.ts`, không phải luật): màn kết quả chờ 0,5 giây mới
nhận chạm "chơi lại" (chống chạm nhầm). Game chỉ cho mobile: mọi thao tác là chạm.

**Con số:** `src/features/battle/logic/battleConfig.ts`.

| File                    | Vai trò                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `logic/battleTypes.ts`  | Kiểu dữ liệu: cấu hình, trạng thái trận                                                                |
| `logic/battleConfig.ts` | Con số cân bằng, danh sách vũ khí                                                                      |
| `logic/arena.ts`        | Hình học sân: lát quấn vòng, vùng đánh, vị trí vùng xanh theo thời gian                                |
| `logic/battle.ts`       | `createBattle`, `selectWeapon`, `playTurn`, `nextLevelIndex`, `isGameCleared`                          |
| `logic/autoPlay.ts`     | Bot chơi thử (ngắm chuẩn, chém trượt, chém bừa) — dùng chung cho E2E và `npm run sim`; không phải luật |
| `view/BattleScene.ts`   | Vẽ, nhận chạm, thanh nút vũ khí, số sát thương, màn thắng/thua, `BattleSnapshot`                       |
| `view/battleLayout.ts`  | Đổi (lát, vòng) sang tọa độ màn hình; hình nêm xanh khớp vùng luật; vị trí nút vũ khí                  |
| `view/battleSprites.ts` | Hình hiệp sĩ, slime, Slime Vua                                                                         |

**Kiểm chứng tự động:**

- Unit (Vitest): luật đánh, di chuyển quái (chặn ô, quấn vòng lát 0↔23), thắng/thua, từ chối cấu
  hình sai, hàm thuần không sửa đầu vào; hình nêm vẽ ra trùng khít vùng luật coi là trúng (cả góc lẫn
  bán kính); hình sprite không lệch hàng.
- E2E (`e2e/battle.spec.ts` + `e2e/support/battleDriver.ts`, Playwright, khung Pixel 7): mở trận;
  chạm sân chém đúng lát vùng xanh đang chỉ; ngắm chuẩn thì thắng + chống chạm nhầm + chơi lại; chém
  trượt thì thua + chơi lại. Ảnh bằng chứng lưu ở `test-results/`.

**Tự xem:** `npm run dev` → http://localhost:5173/?seed=42 (bỏ `?seed=` để mỗi ván một khác).

**Nợ liên quan:** DEBT-007, DEBT-008, DEBT-009.

## F02 — Thanh 3 nút vũ khí theo tầm

**Người chơi thấy và làm gì:** đáy màn hình có 3 nút Kiếm (gần) · Giáo (vừa) · Cung (xa) — từ F07a
thêm Rìu (2 phía); từ F07 thanh nút chỉ hiện 3 món đã mang vào trận (mỗi tầm một món). Chạm một
nút là cầm vũ khí đó, vùng xanh đổi hình ngay. Chạm vào sân là chém bằng vũ khí đang cầm. Quái mới
xuất hiện ở rìa sân nên lúc đầu chỉ Cung với tới; quái càng áp sát càng phải đổi sang Giáo, Kiếm.
Đây là cách "phạm vi vòng tròn thay đổi" trong ý tưởng ban đầu: phạm vi đổi theo vũ khí đang chọn.

**Luật** (nguồn sự thật: `logic/battle.ts` + `logic/battle.test.ts`, mục `selectWeapon`):

1. Trận mới cầm món đầu tiên của bộ đồ mang vào (món tầm gần — F07).
2. Đổi vũ khí **không tốn lượt**, quái không di chuyển; chỉ chém mới tốn lượt.
3. Nhát chém dùng vùng của vũ khí đang cầm: Kiếm vòng 0–1 rộng 5 lát; Giáo vòng 2–3 rộng 3 lát;
   Cung vòng 4–5 rộng 1 lát; cùng 1 sát thương.
4. Không đổi được sang vũ khí không có trong danh sách hoặc không mang vào trận (F07), không đổi khi
   trận đã kết thúc.

**Hành vi giao diện:** nút đang cầm có viền xanh lá; chạm vào khe giữa hai nút không làm gì (không
tính là chém).

**Con số:** `weapons` trong `src/features/battle/logic/battleConfig.ts`. Thêm vũ khí = thêm một dòng
(đủ cho vũ khí dạng "dải vòng × độ rộng"; vũ khí hình khác như rìu chém trước–sau cần mở rộng luật).

**Kiểm chứng tự động:**

- Unit: trận mới cầm vũ khí đầu; đổi vũ khí không tốn lượt/không tung số ngẫu nhiên; cung trúng quái ở
  rìa còn kiếm thì không; độ rộng theo vũ khí; từ chối vũ khí không tồn tại; chạm điểm nào thì trúng
  nút nào (kể cả khe giữa nút và sát mép khe); điểm nào thuộc thanh nút (`isInWeaponBar` — khe là
  thanh nút, không phải sân); thanh nút không đè lên sân.
- E2E: chạm nút đổi vũ khí không tốn lượt; chạm vào từng khe giữa hai nút không chém, không mất lượt,
  không đổi vũ khí, quái đứng yên (ảnh `cham-khe.png`); ở màn kết quả chạm chỗ khe vẫn đi tiếp; chém
  bằng đúng vũ khí đang cầm; ván thắng phải đổi vũ khí đúng lúc (ảnh `2-cam-cung.png`, `3-thang.png`).

**Cân bằng (mô phỏng 500 ván):** ngắm chuẩn thắng 100% nhưng chỉ dư trung bình ~1,6 lượt (F01 dư ~4);
chém bừa thua 100%. Seed 42 dùng cho E2E thắng được, dư 3 lượt.

**Nợ liên quan:** DEBT-009.

## F03 — Combo gom cụm

**Người chơi thấy và làm gì:** chém trúng nhiều quái trong một nhát thì sát thương tăng dần — số bay
lên hiện -1, -2, -3… Người chơi được thưởng khi canh lúc quái đứng sát nhau rồi mới chém.

**Luật** (nguồn sự thật: `logic/battle.ts` + `logic/battle.test.ts`, mục "combo gom cụm"; chủ dự án
duyệt ngày 22/10/2026):

1. Trong một nhát chém, con thứ n bị chém ăn n × sát thương vũ khí: 100%, 200%, 300%… không giới hạn.
2. Thứ tự bị chém: con ít máu nhất trước (nhát mạnh nhất dồn vào con trâu nhất); bằng máu thì con gần
   nhân vật hơn trước; vẫn bằng thì theo id.

**Hành vi giao diện:** không thêm hiệu ứng — số sát thương bay lên sẵn có tự hiện đúng con số combo.

**Kiểm chứng tự động:**

- Unit: 3 quái ăn 1×/2×/3×; con ít máu trước; bằng máu theo vòng rồi theo id; nhân theo sát thương
  vũ khí; ghi lại thứ tự combo trong `lastAttack`.
- E2E: trong ván thắng, mọi nhát chém có sát thương đúng 1×, 2×, 3×… và có ít nhất một nhát trúng từ
  2 quái trở lên (ảnh `3-thang.png` thấy -1, -2 từ cùng một nhát).

**Cân bằng (mô phỏng 500 ván):** ngắm chuẩn thắng 100%, dư trung bình ~2,2 lượt (F02: ~1,6); chém bừa
thắng 0,2%. Seed 42 thắng, dư 4 lượt.

**Nợ liên quan:** DEBT-009.

## F04 — Máu nhân vật + dấu "!" báo quái sắp đánh

**Người chơi thấy và làm gì:** đầu màn hình hiện "Máu: 5/5". Quái lọt vào sát người (vòng 0) có dấu
"!" đỏ trên đầu: nếu không diệt nó bằng nhát chém tới thì nó sẽ đánh. Người chơi không thua ngay khi
một con lọt vào, mà phải cân nhắc chém con nào trước — Kiếm (vòng 0–1) là vũ khí để dọn chúng.

**Luật** (nguồn sự thật: `logic/battle.ts` + `logic/battle.test.ts`, mục F04; chủ dự án duyệt ngày
22/10/2026; **thay** luật cũ "quái chạm tới là thua ngay"):

1. Nhân vật có 5 máu khi mở trận.
2. Quái ở vòng 0 không di chuyển nữa (không tiến, không đi ngang, không tung số ngẫu nhiên) mà đánh:
   sau mỗi nhát chém, mỗi con còn sống ở vòng 0 trừ 1 máu nhân vật.
3. Quái vừa tiến vào vòng 0 trong lượt này chưa đánh ngay — lượt sau mới đánh (đúng những con đã có
   dấu "!" trước khi người chơi chém). Quái bị diệt trong nhát chém thì không kịp đánh.
4. Hết máu → **thua** ("Bạn đã gục"); cùng lúc hết máu và hết lượt thì báo hết máu.
5. `isThreatening` (vòng 0; quái bắn xa: vòng bắn của nó — F09) là nguồn duy nhất quyết định con nào
   có dấu "!", đứng yên và đánh.

**Hành vi giao diện:** dấu "!" đỏ trên đầu quái sắp đánh; ô "Máu" giữa thanh trên cùng. Không thêm
hiệu ứng mới.

**Con số:** `hero.hp`, `monster.attack` trong `src/features/battle/logic/battleConfig.ts`.

**Kiểm chứng tự động:**

- Unit: đầy máu khi mở trận; quái vòng 0 đứng yên và đánh đúng sức đánh; không đi ngang; vừa vào vòng 0
  chưa đánh; bị diệt thì không đánh; sức đánh theo cấu hình; không tung số ngẫu nhiên; hết máu thì thua;
  chặn cấu hình 0 máu / 0 sức đánh.
- E2E: trong ván chém trượt, mỗi lượt máu giảm đúng (số quái áp sát × sức đánh), có ít nhất một lượt bị
  đánh; ảnh `4-thua.png` thấy "Máu: 0/5", dấu "!" và "Bạn đã gục".

**Cân bằng (mô phỏng 500 ván):** ngắm chuẩn vẫn thắng 100%, dư ~2,2 lượt (không đổi); chém bừa thắng
0,2% — giờ thua chủ yếu vì hết lượt (427 ván) thay vì bị chạm là thua ngay; 72 ván thua vì hết máu.

**Nợ liên quan:** DEBT-008 (quái áp sát đứng chồng hình nhau), DEBT-009.

## F05 — Đẩy quái theo vũ khí

**Người chơi thấy và làm gì:** quái bị chém trúng mà còn sống bị đẩy theo vũ khí: Kiếm đẩy lùi ra xa,
Giáo đẩy lệch sang phải, Cung kéo vào gần. Người chơi dùng cú đẩy để gỡ quái áp sát (Kiếm), dồn quái
cho combo (Giáo), hoặc kéo quái ở rìa vào tầm (Cung).

**Luật** (nguồn sự thật: `logic/battle.ts` `applyKnockback` + `logic/arena.ts` `knockbackCell` +
test mục F05; chủ dự án duyệt ngày 23/10/2026):

1. Kiếm: lùi ra xa 1 vòng · Giáo: lệch sang phải 1 lát (theo chiều kim đồng hồ) · Cung: kéo vào gần 1 vòng.
2. Chỉ quái bị chém trúng mà còn sống mới bị đẩy.
3. Ô đích có quái khác hoặc nằm ngoài sân thì không bị đẩy (và con đó hành động bình thường).
4. Đẩy lần lượt theo thứ tự combo (con bị chém trước được đẩy trước).
5. Đẩy xảy ra ngay sau nhát chém, trước khi quái hành động — con có dấu "!" bị Kiếm đẩy ra vòng 1 thì
   lượt đó không đánh được.
6. Quái bị đẩy thành công đứng yên lượt đó (không tiến, không đi ngang). Đẩy không tung số ngẫu nhiên.

**Hành vi giao diện:** không thêm hiệu ứng hay chữ mới — quái lướt tới ô mới bằng chuyển động sẵn có.

**Con số:** `push` của từng vũ khí trong `src/features/battle/logic/battleConfig.ts` (`none` / `out` /
`in` / `clockwise`) — vũ khí mới (F07) chỉ cần khai báo kiểu đẩy.

**Kiểm chứng tự động:**

- Unit: ô đích theo từng kiểu đẩy (kể cả quấn lát 23→0); Kiếm/Giáo/Cung đẩy đúng hướng và quái bị đẩy
  đứng yên; quái không trúng thì không bị đẩy; bị chặn bởi quái khác hoặc mép sân thì không bị đẩy;
  thứ tự đẩy theo combo; Kiếm gỡ con có dấu "!" nên nó không đánh; không tung số ngẫu nhiên; chặn kiểu
  đẩy không tồn tại.
- E2E: Cung bắn trúng quái ở rìa thì kéo nó vào đúng 1 vòng, giữ lát (ảnh `5-cung-keo.png`).

**Cân bằng (mô phỏng 500 ván):** ngắm chuẩn thắng 100%, dư ~2,36 lượt (F04: ~2,2); chém bừa thắng 0,2%,
thua vì hết máu giảm từ 72 xuống 60 ván. Mô phỏng chưa cố ý tận dụng cú đẩy, nên người chơi giỏi còn
dễ hơn số này.

**Nợ liên quan:** DEBT-009.

## F06 — Màn chơi nối tiếp + trùm

**Người chơi thấy và làm gì:** game có 5 màn nối tiếp (màn 4 thêm ở F07a, màn 5 ở F09), thanh trên hiện
"Màn 1/5".
Thắng một màn thì chạm để sang màn kế. Màn 3 có trùm Slime Vua (slime tím đội vương miện, to hơn) —
trâu và đánh đau hơn. Hạ hết màn cuối là "PHÁ ĐẢO!", chạm để chơi lại từ màn 1. Thua thì chạm để chơi lại đúng màn đó.

**Luật** (nguồn sự thật: `logic/battle.ts` `createBattle` / `nextLevelIndex` / `isGameCleared` +
test mục F06; chủ dự án duyệt ngày 23/10/2026):

1. Màn 1: 4 slime, 8 lượt (y như trận trước F06) · Màn 2: 6 slime, 10 lượt · Màn 3: Slime Vua + 3
   slime, 10 lượt (chủ dự án duyệt 26/10/2026 — trước đó 2 slime, 12 lượt, dễ hơn màn 2) · Màn 4: xem
   F07a.
2. Slime Vua: 6 máu, áp sát thì mỗi lượt đánh mất 2 máu; còn lại y như slime (đi lung tung, combo, bị
   đẩy, dấu "!"). Không có luật trùm riêng.
3. Mỗi loại quái có máu, sức đánh, xác suất tiến vào riêng; quái áp sát đánh theo sức đánh của loại nó.
4. Màn nào cũng bắt đầu đầy máu, cầm Kiếm, đủ lượt của màn.
5. Thắng màn chưa phải cuối → sang màn kế; thắng màn cuối → phá đảo, chơi lại từ màn 1; thua → chơi
   lại đúng màn đó.
6. Màn 2 có 6 con nên cụm quái rộng ±3 lát (cụm ±2 chỉ có 5 chỗ); màn 1 và 3 giữ ±2.
7. Cấu hình sai (không có màn, màn không có quái hoặc 0 lượt, loại quái không tồn tại hoặc 0 máu/0 sức
   đánh) bị từ chối lúc mở màn — kiểm cả những màn chưa chơi tới.

**Hành vi giao diện:** thanh trên chia 2 hàng (Lượt · Quái / Màn · Máu) vì số lượt có thể có 2 chữ số.
Màn kết quả ghi rõ chạm để làm gì: "Chạm để sang màn 2", "Chạm để chơi lại màn 2", "Chạm để chơi lại
từ màn 1". Có `?seed=` thì màn nào cũng dùng seed đó. Không lưu tiến trình: tải lại trang là về màn 1.

**Con số:** `monsterKinds` và `levels` trong `src/features/battle/logic/battleConfig.ts`. Thêm màn =
thêm một dòng; thêm loại quái = thêm tên vào `MonsterKind` + con số + hình cùng tên trong
`view/battleSprites.ts` (thiếu hình thì TypeScript báo lỗi).

**Kiểm chứng tự động:**

- Unit: mở màn đúng cấu hình của màn (lượt, đội hình theo thứ tự id, máu theo loại); đầy máu, cầm vũ
  khí đầu; cụm quái theo spread của màn; từ chối màn không tồn tại; trùm + slime áp sát đánh cộng theo
  loại (2 + 1); mỗi loại đi theo xác suất của loại đó; chém không làm đổi màn; màn kế khi thắng / thua /
  phá đảo; màn chưa xong thì chưa có màn kế; phá đảo chỉ khi thắng màn cuối; chặn cấu hình sai của
  loại quái và của màn; hình Slime Vua không lệch hàng; với con số thật, màn trùm ít lượt dư hơn và
  thắng không nhiều hơn màn 2 khi ngắm chuẩn (`logic/balance.test.ts`, 200 ván mỗi màn).
- E2E: ngắm chuẩn đi liền mọi màn — màn nào cũng đầy máu, cầm Kiếm, đúng đội hình; thắng màn cuối là phá
  đảo, chạm thì về màn 1 (ảnh `3-thang.png` "Chạm để sang màn 2", `6-man-trum.png`, `7-pha-dao.png`);
  qua màn 1 rồi chém trượt ở màn 2 → thua → chạm thì chơi lại đúng màn 2 (ảnh `4-thua.png`).

**Cân bằng (`npm run sim` — 500 ván mỗi màn, seed 1…500, cùng bot với E2E):** ngắm chuẩn với bộ mặc định (Kiếm + Giáo + Cung, từ F07) thắng màn 1 / 2 / 3 / 4 / 5 = 100% / 99,8% / 94,6% / 86,2% / 84,4%,
dư trung bình ~2,36 / ~2,89 / ~2,56 / ~1,21 / ~1,05 lượt — màn trùm khó hơn màn 2, màn 4 khó hơn màn 3, màn 5 khó hơn màn 4 (unit test `balance.test.ts` giữ ba quan hệ này, cùng 500 ván với `npm run sim`). Chém bừa (từ khi có 4 vũ khí) thắng 0,2% / 0% / 0% / 0% / 0%.
Seed 42 của E2E qua cả 5 màn (dư 4 / 4 / 4 / 4 / 3 lượt).

**Nợ liên quan:** DEBT-007 (hình Slime Vua tạm), DEBT-008, DEBT-009.

## F07a — Rìu chém hai phía + màn 4 quái tới từ hai phía

**Người chơi thấy và làm gì:** đáy màn hình có thêm nút thứ 4 **Rìu** (chữ phụ "2 phía"). Cầm Rìu thì
vùng xanh là **hai nêm đối nhau** — trước mặt và sau lưng — ở sát nhân vật, quay cùng nhau. Màn 4 quái
xuất hiện thành **hai cụm ở hai phía đối diện**; quái áp sát từ cả hai phía là lúc Rìu chém được cả hai.

**Luật** (nguồn sự thật: `logic/arena.ts` `aimSectors` / `isInZone`, `logic/battle.ts` `createBattle`

- test mục B2; chủ dự án duyệt ngày 26/10/2026):

1. Rìu: mỗi nêm rộng 3 lát, vòng 0–1, 1 sát thương, đẩy lùi. Nêm sau lưng ở lát đối diện (lệch nửa vòng).
2. Một nhát Rìu đếm quái của cả hai nêm cho combo; đẩy áp dụng cho quái ở cả hai nêm.
3. Màn 4: 8 slime, 10 lượt. Nửa đầu đội hình (id 1–4) thành một cụm ±2 lát quanh một lát ngẫu nhiên,
   nửa sau (id 5–8) thành cụm ±2 lát quanh lát đối diện.
4. Cấu hình sai bị từ chối: vũ khí hai phía trên sân lẻ lát hoặc hai nêm chồng nhau; màn hai phía trên
   sân lẻ lát, cụm không đủ chỗ, hoặc hai cụm chồng nhau.

**Hành vi giao diện:** từ F07 Rìu nằm ở ô "gần" của màn chuẩn bị (thay Kiếm); thanh nút trong trận
chỉ có 3 món đã mang (mỗi nút rộng 100, khe 12), vẫn "chạm khe không làm gì". Không thêm hiệu ứng mới.

**Con số:** `weapons` (Rìu: `twoSided: true`) và `levels` (màn 4: `splitOpposite: true`) trong
`src/features/battle/logic/battleConfig.ts`.

**Kiểm chứng tự động:**

- Unit: lát giữa từng nêm (quấn qua lát 0); trúng ở cả hai nêm, mép nêm, ngoài nêm/ngoài vòng; combo đếm
  chung hai nêm; đẩy lùi cả hai phía; hình nêm vẽ ra trùng khít vùng luật với mọi lát ngắm (vũ khí một
  nêm và hai phía rộng 1/3/5); màn hai phía: mỗi cụm gọn, hai cụm đối diện, không chồng ô, đội hình lẻ;
  màn thường mở y như trước; từ chối cấu hình sai; màn 4 khó hơn màn 3 khi ngắm chuẩn.
- E2E: mang Rìu vào trận (F07), đổi sang Giáo rồi chạm lại nút Rìu thì cầm Rìu không tốn lượt, chém
  bằng Rìu đúng vùng luật (ảnh `9-cam-riu.png`); chạm các khe không làm gì; ván seed 42 đi đủ 4 màn, màn 4 hai cụm đối diện (ảnh `8-man-hai-phia.png`).

**Cân bằng:** xem F06 (`npm run sim`). Bot ngắm chuẩn dùng Rìu rất ít (~1% số nhát): nó hạ quái từ xa
bằng Cung/Giáo nên quái hiếm khi áp sát cả hai phía cùng lúc. Rìu là vũ khí "cứu nguy".

**Nợ liên quan:** DEBT-009.

## F07 — Màn chuẩn bị trận: chọn mỗi tầm một vũ khí

**Người chơi thấy và làm gì:** mở game, và mỗi lần hết màn (thắng hay thua), là **màn chuẩn bị** của
màn sắp chơi: tiêu đề "MÀN n/5", ba hàng **Gần / Vừa / Xa**, mỗi hàng các nút vũ khí của tầm đó, món
đang chọn viền xanh lá, dưới mỗi hàng một dòng mô tả món đang chọn. Ô gần chọn **Kiếm hoặc Rìu**; ô vừa
(Giáo) và ô xa (Cung) mỗi ô một món. Chạm **"VÀO TRẬN"** để vào trận với đúng 3 món đã chọn trên thanh
nút. Sang màn sau, lựa chọn cũ được chọn sẵn.

**Luật** (nguồn sự thật: `logic/loadout.ts` + `logic/loadout.test.ts`, `logic/battle.ts` `createBattle`
/ `selectWeapon` + test mục B4; chủ dự án duyệt ngày 27/10/2026 phương án "mỗi tầm 1 món"):

1. Mỗi vũ khí thuộc một tầm (`slot`: gần / vừa / xa). Mang vào trận **mỗi tầm đúng một món**; chọn một
   món thì thay món cùng tầm.
2. Bộ mặc định = món đầu tiên của mỗi tầm theo thứ tự cấu hình (Kiếm, Giáo, Cung).
3. Lựa chọn lấy từ danh sách **vũ khí đang sở hữu**; chưa có túi đồ nên sở hữu = mọi vũ khí.
4. Trận cầm món đầu của bộ (tầm gần); chỉ đổi được sang món đã mang.
5. Bộ đồ sai bị từ chối lúc mở trận: rỗng, vũ khí không có, mang trùng, hai món cùng tầm.
6. Nhớ lựa chọn trong lúc chơi (tắt game là về mặc định — lưu thật khi có "lưu tiến trình").

**Hành vi giao diện:** màn chuẩn bị là scene `loadout` (`view/LoadoutScene.ts`), bố cục thuần ở
`view/loadoutLayout.ts` (nút cao 56, khe 12; chạm khe/chữ/nền không làm gì). Dòng mô tả sinh từ con số
cấu hình (`describeWeapon`, vd. "Rìu: vòng 0–1, rộng 3 lát, 2 phía, đẩy lùi"). Đường link `?level=N`
mở thẳng màn chuẩn bị màn N (thử tay / E2E nhanh, DEBT-011).

**Con số:** `slot` của từng vũ khí trong `src/features/battle/logic/battleConfig.ts`.

**Kiểm chứng tự động:**

- Unit: bộ mặc định (cả khi chỉ sở hữu vài món); lựa chọn theo tầm; chọn món thay đúng món cùng tầm, giữ
  thứ tự, thêm vào tầm trống; mọi bộ ghép được (cho mô phỏng); từ chối bộ sai; mô tả món; trận mang đúng
  bộ, cầm món đầu, không cầm được món không mang; bot ngắm chuẩn / chém trượt / chém bừa chỉ dùng món đã
  mang; bố cục nút (trong khung, không chồng, chạm khe không trúng gì); `?level=` hợp lệ / không hợp lệ.
- E2E: mở game là màn chuẩn bị màn 1 với bộ mặc định (ảnh `12-chuan-bi.png`); chạm Rìu thì Rìu thay
  Kiếm (ảnh `13-chon-riu.png`); vào trận thanh nút Rìu / Giáo / Cung, cầm Rìu (ảnh
  `14-tran-mang-riu.png`); thắng màn 1 thì màn chuẩn bị màn 2 vẫn chọn Rìu; `?level=4` mở thẳng màn 4;
  ván seed 42 đi đủ 5 màn qua màn chuẩn bị.

**Cân bằng (`npm run sim` theo từng bộ đồ):** ngắm chuẩn với Rìu + Giáo + Cung thắng màn 1–5 = 100% /
99,8% / 94,6% / 85,6% / 79,0% — **không** dễ hơn bộ Kiếm ở màn 4 (86,2%) dù màn 4 là "đất của Rìu": bot
chỉ đếm số quái trúng, hạ quái từ xa nên hiếm khi có quái áp sát cả hai phía. Chủ dự án xem lại khi chơi
thử.

**Nợ liên quan:** DEBT-009, DEBT-011.

## F09 — Quái bắn xa Slime Pháo + màn 5

**Người chơi thấy và làm gì:** màn 5 có **Slime Pháo** (slime cam, có nòng pháo trên đầu). Nó không cần
áp sát: tới vòng 4 là dừng lại, hiện dấu **"!"** và bắn mỗi lượt. Chém trúng nó lúc đang có "!" (mà nó
chưa chết) thì nó choáng, lượt đó không bắn. Người chơi phải ưu tiên xử lý nó bằng Cung (vòng 4–5) thay
vì chỉ gom slime.

**Luật** (nguồn sự thật: `logic/battle.ts` `isThreatening` / `playTurn` + test mục B3; chủ dự án duyệt
ngày 26/10/2026):

1. Đi như slime (tiến vào hoặc đi ngang) tới **vòng bắn** thì đứng yên; ở vòng bắn hoặc gần hơn (vd. bị
   Cung kéo vào) thì mỗi lượt bắn sau nhát chém, trừ máu nhân vật theo `attack`.
2. Vừa tới vòng bắn trong lượt này thì lượt sau mới bắn (như quái áp sát F04).
3. **Choáng:** bị chém trúng lúc đang có "!" mà còn sống → lượt đó không bắn. Bị Kiếm đẩy ra ngoài vòng
   bắn thì hết "!", phải tiến vào lại. Quái cận chiến (slime, Slime Vua) không bị choáng.
4. Slime Pháo: 2 máu, vòng bắn 4, mỗi phát bắn mất 1 máu, 60% tiến vào.
5. Màn 5: 6 slime + 2 Slime Pháo trong một cụm ±4 lát, 10 lượt.
6. Cấu hình sai bị từ chối: vòng bắn không nguyên, nhỏ hơn 1, hoặc từ vòng xuất hiện trở ra.

**Hành vi giao diện:** dấu "!" dùng chung với quái áp sát (đỏ, trên đầu quái). Không thêm hiệu ứng bắn.

**Con số:** `monsterKinds.slimeCannon` (`shootRing: 4`) và `levels[4]` trong
`src/features/battle/logic/battleConfig.ts`; hình `slimeCannon` trong `view/battleSprites.ts`.

**Kiểm chứng tự động:**

- Unit: đi như slime ngoài vòng bắn; tới vòng bắn đứng yên, lượt sau mới bắn; ở vòng bắn không tiến,
  không đi ngang, bắn theo sức đánh, không tung số ngẫu nhiên; bị kéo vào gần vẫn bắn; choáng khi trúng
  mà còn sống; không trúng thì vẫn bắn, bị giết thì không; bị Kiếm đẩy ra thì hết "!"; quái cận chiến
  không choáng; từ chối vòng bắn sai; bot ngắm chuẩn ưu tiên quái bắn đang "!"; màn 5 khó hơn màn 4.
- E2E: ván seed 42 đi đủ 5 màn; ảnh `10-man-slime-phao.png` (mở màn 5) và `11-slime-phao-ngam.png`
  (Slime Pháo ở vòng 4 có "!").

**Cân bằng:** xem F06. Người chơi biết ưu tiên Slime Pháo thắng màn 5 ~85%; phớt lờ nó chỉ ~13% (đo
lúc đề xuất bằng bot không ưu tiên) — đúng là một câu đố.

**Nợ liên quan:** DEBT-007 (hình Slime Pháo vẽ tạm bằng lưới ký tự), DEBT-009.

## Hàng chờ (thứ tự do chủ dự án chốt — chưa duyệt)

| Mã  | Tính năng | Ghi chú                                    |
| --- | --------- | ------------------------------------------ |
| F08 | Skill     | Chủ dự án nêu ngày 22/10; chờ mô tả cơ chế |

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
