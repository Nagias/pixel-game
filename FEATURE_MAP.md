# Bản đồ tính năng

> Quy tắc: PR nào thêm hoặc đổi tính năng thì cập nhật file này **trong cùng PR đó**.
> Luật chơi chính xác nằm trong code + test; ở đây là tóm tắt cho người đọc và chỉ đường tới file.

## Tổng quan

| Mã   | Tính năng                                          | Trạng thái | Code                                                           | Test                                                     |
| ---- | -------------------------------------------------- | ---------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| F01  | Trận đấu tối thiểu (walking skeleton, khuôn mẫu)   | ✅ Xong    | `src/features/battle/`                                         | `src/features/battle/**/*.test.ts`, `e2e/battle.spec.ts` |
| F02  | Thanh 3 nút vũ khí theo tầm (gần / vừa / xa)       | ✅ Xong    | `src/features/battle/` (mở rộng F01)                           | như F01                                                  |
| F03  | Combo gom cụm 100% / 200% / 300%                   | ✅ Xong    | `src/features/battle/` (mở rộng F01)                           | như F01                                                  |
| F04  | Máu nhân vật + dấu "!" báo quái sắp đánh           | ✅ Xong    | `src/features/battle/` (mở rộng F01)                           | như F01                                                  |
| F05  | Đẩy quái theo vũ khí (knockback)                   | ✅ Xong    | `src/features/battle/` (mở rộng F01)                           | như F01                                                  |
| F06  | Màn chơi nối tiếp + trùm Slime Vua                 | ✅ Xong    | `src/features/battle/` (mở rộng F01)                           | như F01                                                  |
| F07a | Rìu chém hai phía + màn 4 quái tới từ hai phía     | ✅ Xong    | `src/features/battle/` (mở rộng F01)                           | như F01                                                  |
| F07  | Màn chuẩn bị trận: chọn mỗi tầm một vũ khí         | ✅ Xong    | `src/features/battle/` (mở rộng F01)                           | như F01                                                  |
| F08  | Skill bấm đánh cả sân + máu, hồi máu, chí mạng     | ✅ Xong    | `src/features/battle/` (mở rộng F01)                           | như F01                                                  |
| F09  | Quái bắn xa Slime Pháo + màn 5                     | ✅ Xong    | `src/features/battle/` (mở rộng F01)                           | như F01                                                  |
| F10  | Tự động cân bằng (mục tiêu, bot nhìn trước, dò số) | ✅ Xong    | `scripts/`, `logic/autoPlay.ts`, `logic/battleConfig.ts`       | `scripts/tuneCore.test.ts`, `logic/balance.test.ts`      |
| F11  | Thắng bằng nhiệm vụ + quái ra theo đợt             | ✅ Xong    | `src/features/battle/` (mở rộng F01)                           | `logic/quest.test.ts`, như F01                           |
| F12  | Thêm Slime Con, Slime Lao, Slime Ma + màn 6–7      | ✅ Xong    | `src/features/battle/` (mở rộng F01)                           | `logic/monsters.test.ts`, như F01                        |
| F13  | Lưu tiến trình + vàng                              | ✅ Xong    | `src/features/profile/`, `battle/logic/battle.ts`              | `profile/logic/profile.test.ts`, `logic/gold.test.ts`    |
| F14  | Nâng cấp nhân vật bằng vàng                        | ✅ Xong    | `battle/logic/upgrades.ts`, `battle/view/UpgradeScene.ts`      | `logic/upgrades.test.ts`, `view/upgradeLayout.test.ts`   |
| F15  | Chủ đề Rừng rậm: 20 màn, 5 quái mới, bộ sinh màn   | ✅ Xong    | `logic/chapters.ts`, `battleConfig.ts`, `scripts/levelGen*.ts` | `logic/chapters.test.ts`, `scripts/levelGenCore.test.ts` |
| F16  | Quái hiếm, may mắn, rơi vũ khí 6 cấp màu, túi đồ   | ✅ Xong    | `logic/loot.ts`, `logic/battle.ts`, `view/weaponTierStyle.ts`  | `logic/loot.test.ts`, `logic/rare.test.ts`               |
| F17  | Cửa hàng: vũ khí cấp Hiếm dùng có hạn              | ✅ Xong    | `logic/shop.ts`, `view/ShopScene.ts`                           | `logic/shop.test.ts`                                     |

## F01 — Trận đấu tối thiểu

**Người chơi thấy và làm gì:** nhân vật đứng giữa sân tròn, một hình nêm xanh quay quanh. Chạm vào
sân để chém mọi quái đang nằm trong vùng xanh. Xong nhiệm vụ của màn (F11 — vd. "hạ 6 Slime") trước khi
hết lượt hoặc trước khi quái hạ mình thì thắng.

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
6. Xong nhiệm vụ → **thắng** (F11; màn không có nhiệm vụ: diệt sạch mọi đợt quái). Nhân vật hết máu →
   **thua** ("Bạn đã gục") — xem F04. Hết lượt mà chưa xong → **thua** ("Hết lượt mà chưa xong nhiệm
   vụ"). Nhát cuối vừa xong nhiệm vụ thì vẫn thắng.
7. Cấu hình sai (vd. vùng đánh rộng số chẵn lát, tầm vũ khí vượt sân, không có vũ khí) bị từ chối ngay
   lúc mở trận.

**Hành vi giao diện** (nằm ở `view/BattleScene.ts`, không phải luật): màn kết quả chờ 0,5 giây mới
nhận chạm "chơi lại" (chống chạm nhầm). Game chỉ cho mobile: mọi thao tác là chạm.

**Con số:** `src/features/battle/logic/battleConfig.ts`.

| File                    | Vai trò                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `logic/battleTypes.ts`  | Kiểu dữ liệu: cấu hình, trạng thái trận                                                                                  |
| `logic/battleConfig.ts` | Con số cân bằng, danh sách vũ khí                                                                                        |
| `logic/arena.ts`        | Hình học sân: lát quấn vòng, vùng đánh, vị trí vùng xanh theo thời gian                                                  |
| `logic/battle.ts`       | `createBattle`, `selectWeapon`, `playTurn`, `nextLevelIndex`, `isGameCleared`                                            |
| `logic/autoPlay.ts`     | Bot chơi thử (nhìn trước — F10, ngắm chuẩn, chém trượt, chém bừa) — dùng chung cho E2E và `npm run sim`; không phải luật |
| `view/BattleScene.ts`   | Vẽ, nhận chạm, thanh nút vũ khí, số sát thương, màn thắng/thua, `BattleSnapshot`                                         |
| `view/battleLayout.ts`  | Đổi (lát, vòng) sang tọa độ màn hình; hình nêm xanh khớp vùng luật; vị trí nút vũ khí                                    |
| `view/battleSprites.ts` | Hình hiệp sĩ, slime, Slime Vua                                                                                           |

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

**Người chơi thấy và làm gì:** đầu màn hình hiện "Máu: 10/10" (F08; trước đó 5/5). Quái lọt vào sát người (vòng 0) có dấu
"!" đỏ trên đầu: nếu không diệt nó bằng nhát chém tới thì nó sẽ đánh. Người chơi không thua ngay khi
một con lọt vào, mà phải cân nhắc chém con nào trước — Kiếm (vòng 0–1) là vũ khí để dọn chúng.

**Luật** (nguồn sự thật: `logic/battle.ts` + `logic/battle.test.ts`, mục F04; chủ dự án duyệt ngày
22/10/2026; **thay** luật cũ "quái chạm tới là thua ngay"):

1. Nhân vật có đầy máu khi mở trận (10 máu từ F08).
2. Quái ở vòng 0 không di chuyển nữa (không tiến, không đi ngang, không tung số ngẫu nhiên) mà đánh:
   sau mỗi nhát chém, mỗi con còn sống ở vòng 0 trừ máu nhân vật theo sức đánh của loại nó (F06; F08:
   slime 2). Quái đang bị đóng băng (F08) không đánh.
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

1. Đội hình mở màn — Màn 1: 4 slime · Màn 2: 6 slime · Màn 3: Slime Vua + 4 slime (F11; chủ dự án duyệt
   26/10/2026 Vua + 3 slime — trước đó 2 slime, dễ hơn màn 2) · Màn 4: xem F07a · Màn 5: xem F09. Nhiệm
   vụ và đợt sau: xem F11. Số lượt màn 1–5: 14/13/6/8/9 (F11 — trước đó 10/11/8/9/8; F10 — trước đó
   10/12/9/8/8; F08 — trước đó 8/10/10/10/10).
2. Slime Vua: 8 máu (F11; trước đó 6), áp sát thì mỗi lượt đánh mất 4 máu (F08; trước đó 2); còn lại y như slime (đi lung tung, combo, bị
   đẩy, dấu "!"). Không có luật trùm riêng.
3. Mỗi loại quái có máu, sức đánh, xác suất tiến vào riêng; quái áp sát đánh theo sức đánh của loại nó.
4. Màn nào cũng bắt đầu đầy máu, cầm món tầm gần đã mang (F07), đủ lượt của màn, skill nạp 0 (F08).
5. Thắng màn chưa phải cuối → sang màn kế; thắng màn cuối → phá đảo, chơi lại từ màn 1; thua → chơi
   lại đúng màn đó.
6. Màn 2 có 6 con nên cụm quái rộng ±3 lát (cụm ±2 chỉ có 5 chỗ); màn 1 giữ ±2; màn 3 ±4 (F11).
7. Cấu hình sai (không có màn, màn không có quái hoặc 0 lượt, loại quái không tồn tại hoặc 0 máu/0 sức
   đánh) bị từ chối lúc mở màn — kiểm cả những màn chưa chơi tới.

**Hành vi giao diện:** thanh trên chia 2 hàng (Lượt · Nhiệm vụ / Màn · Máu — F11: ô nhiệm vụ thay ô "Quái") vì số lượt có thể có 2 chữ số.
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
  thắng không nhiều hơn màn 2 (`logic/balance.test.ts`, 500 ván mỗi màn; F10: đo bằng bot ngắm chuẩn).
- E2E: bot chơi giỏi (F10: nhìn trước) đi liền mọi màn — màn nào cũng đầy máu, cầm Kiếm, đúng đội hình; thắng màn cuối là phá
  đảo, chạm thì về màn 1 (ảnh `3-thang.png` "Chạm để sang màn 2", `6-man-trum.png`, `7-pha-dao.png`);
  qua màn 1 rồi chém trượt ở màn 2 → thua → chạm thì chơi lại đúng màn 2 (ảnh `4-thua.png`).

**Cân bằng (`npm run sim` — 500 ván mỗi màn, seed 1…500, cùng bot với E2E; số **trước F08** — số mới ở mục F08, số hiện tại ở mục F10):** ngắm chuẩn với bộ mặc định (Kiếm + Giáo + Cung, từ F07) thắng màn 1 / 2 / 3 / 4 / 5 = 100% / 99,8% / 94,6% / 86,2% / 84,4%,
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
3. Màn 4: 10 slime, 8 lượt, nhiệm vụ hạ 9 (F11 — trước đó 9 lượt, diệt hết; F10 — trước đó 8 slime, cụm
   ±2, 8 lượt). Nửa đầu đội hình (id 1–5) thành một
   cụm ±3 lát quanh một lát ngẫu nhiên, nửa sau (id 6–10) thành cụm ±3 lát quanh lát đối diện.
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
bằng Cung/Giáo nên quái hiếm khi áp sát cả hai phía cùng lúc. Rìu là vũ khí "cứu nguy". F10: bot nhìn
trước cũng vậy — Rìu và Kiếm ra số như nhau ở màn 4; muốn Rìu có giá trị phải thiết kế màn khác (đợt 7).

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

## F08 — Skill bấm đánh cả sân + máu, hồi máu, chí mạng

**Người chơi thấy và làm gì:** từ màn 3, màn chuẩn bị có hàng **Skill**: chọn **Mưa băng** hoặc **Cầu
lửa**. Trong trận, ô cuối thanh nút là ô skill: tô màu dần từ đáy lên theo số nhát chém đã nạp ("1/3"),
đầy thì viền vàng và chữ **"BẤM!"**. Chạm ô skill khi đầy: sân chớp màu skill, mọi quái mất máu (số bay
lên), không tốn lượt. Mưa băng làm quái còn sống đổi màu băng, không có "!" và đứng im lượt tới. Nhân
vật có **10 máu**; nhát chém trúng từ 3 con trở lên hồi 1 máu (hiện "+1"); thỉnh thoảng nhát chém là
**"CHÍ MẠNG!"** — sát thương ×2.

**Luật** (nguồn sự thật: `logic/battle.ts` `castSkill` / `canCastSkill` / `willAttack` / `playTurn` +
`logic/skill.test.ts`; chủ dự án duyệt ngày 27/10/2026 phương án "2 skill, chọn trước trận" và "máu,
hồi máu, chí mạng làm luôn"):

1. Nạp: mỗi nhát chém (trúng hay trượt) +1, tối đa số nhát của skill; trận mới nạp 0. Đầy thì bấm được;
   bấm xong nạp lại từ 0. Bấm skill **không tốn lượt**, quái không di chuyển, không tung số ngẫu nhiên.
2. Skill trúng **mọi quái trên sân** (không combo, không chí mạng, không đẩy). Hạ hết quái thì thắng ngay.
3. Mưa băng: 1 sát thương, quái còn sống **đóng băng 1 lượt** — lượt ngay sau không đi, không đánh, không
   bắn; hết lượt đó thì hết băng. Quái băng bị chém trúng vẫn bị đẩy theo vũ khí.
4. Cầu lửa: 2 sát thương, không đóng băng, nạp lâu hơn.
5. Skill mở từ màn 3 (`skillUnlockLevel`); màn chưa mở mà mang skill thì bị từ chối.
6. Hồi máu: nhát trúng ≥ 3 con hồi 1 máu, không quá máu tối đa, **trước** khi quái đánh.
7. Chí mạng: tung **một lần cho cả nhát** bằng RNG có seed của trận, chỉ khi nhát có trúng và vũ khí có %
   chí mạng; chí mạng thì mọi con trúng ăn ×2 (combo vẫn 1×, 2×, 3×…). Vũ khí 0% không tung số.
8. Thứ tự một lượt: đánh (chí mạng) → kiểm thắng → hồi máu → đẩy → quái đánh → quái đi → hết đóng băng →
   kiểm thua.
9. Cấu hình sai bị từ chối: skill 0 sát thương / nạp 0 nhát / đóng băng âm, chí mạng ngoài [0, 1], hệ số
   chí mạng < 1, hồi máu khi trúng 0 con hoặc hồi âm, màn mở skill âm, skill không tồn tại.

**Hành vi giao diện:** ô skill là nút thứ 4 của thanh (rộng 72); chưa đầy thì chạm không làm gì. Quái
băng phủ kín màu `cyan` (F15: trước đó nhuộm kiểu nhân màu, quái xanh lá gần như không đổi). Máy không có WebGL (Phaser rơi về Canvas) thì không phủ màu được — chỉ còn dấu hiệu là mất "!"; đồ họa thật sẽ thay bằng hình băng riêng. Màn chuẩn bị nhớ skill chọn gần nhất qua các màn chưa mở skill (vd. sau phá đảo) trong lúc đang chơi. Mô tả
skill / vũ khí trên màn chuẩn bị sinh từ con số (`describeSkill`, `describeWeapon` có "chí mạng 10%").

**Con số** (`src/features/battle/logic/battleConfig.ts`, agent chọn bằng mô phỏng ngày 27/10/2026 theo ủy
quyền của chủ dự án — giữ độ khó gần như trước B6): nhân vật 10 máu, hồi 1 máu khi trúng ≥ 3 con; mọi vũ
khí chí mạng 10%, ×2; Mưa băng nạp 3 nhát, Cầu lửa nạp 5 nhát; **quái mạnh lên**: slime và Slime Pháo
2 → 3 máu, sức đánh ×2 (slime 2, Slime Vua 4, Slime Pháo 2); **số lượt** màn 1–5: 8/10/10/10/10 →
10/12/9/8/8. Vì sao máu quái lên 3: với 2 máu, Cầu lửa (2 sát thương) dọn sạch sân trong một lần bấm —
màn 4–5 thắng 100%.

**Kiểm chứng tự động:**

- Unit (`skill.test.ts`): bấm skill trừ máu mọi quái, quái chết biến mất, đóng băng, không tốn lượt / không
  tung số / nạp về 0; Cầu lửa thắng ngay; không bấm được khi chưa đầy / không mang / trận xong; nạp +1 mỗi
  nhát, tối đa; nhát chém xóa dấu skill; quái băng không đánh / không đi / không bắn, lượt sau bình thường,
  vẫn bị đẩy; hồi máu ≥ 3 con, không hồi 2 con, không quá tối đa, hồi trước khi bị đánh; chí mạng 100% ×2
  combo, trượt không tung số, 0% y như không khai báo, theo seed; từ chối mang skill ở màn chưa mở, skill
  không tồn tại, cấu hình sai. `loadout.test.ts`: chọn skill, bộ đồ theo màn, mô tả. `autoPlay.test.ts`:
  bot không ưu tiên quái bắn đang băng. `battleLayout.test.ts`: ô skill trên thanh.
- E2E: màn 1 chưa có skill, màn 3 có hàng skill Mưa băng chọn sẵn, chọn Cầu lửa thì mang Cầu lửa vào trận
  (ảnh `15-chuan-bi-skill.png`); chưa đầy chạm ô skill không làm gì; chém 3 nhát nạp đầy (ảnh
  `16-skill-day.png`), bấm thì mọi quái mất máu, lượt không đổi, quái còn sống bị băng (ảnh
  `17-mua-bang.png`), lượt sau máu nhân vật không giảm và hết băng; ván seed 42 đi đủ 5 màn, bot bấm
  skill khi đầy, sát thương kiểm cả chí mạng.

**Cân bằng (`npm run sim`, 500 ván, ngắm chuẩn, bộ Kiếm + Giáo + Cung):** thắng màn 1 / 2 = 98,2% /
98,6% (dư 3,04 / 3,43); màn 3 / 4 / 5 với Mưa băng = 97,8% / 81,6% / 78,2% (dư 2,40 / 0,65 / 0,50), với
Cầu lửa = 98,6% / 91,4% / 82,4% (dư 2,65 / 0,88 / 0,48). Trước B6: 100% / 99,8% / 94,6% / 86,2% / 84,4%.
Cầu lửa vẫn nhỉnh hơn Mưa băng ở màn 4 (bot bấm ngay khi đầy, chưa biết để dành Mưa băng lúc quái áp
sát). Lõi mô phỏng dùng chung: `scripts/simCore.ts`. Số hiện tại (bộ số F10, Cầu lửa nạp 6): xem F10.

**Nợ liên quan:** DEBT-007 (chưa có hình hiệu ứng skill thật), DEBT-009.

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
4. Slime Pháo: 3 máu, vòng bắn 4, mỗi phát bắn mất 2 máu (F08; trước đó 2 máu, bắn mất 1), 60%
   tiến vào.
5. Màn 5: mở màn 8 slime + 1 Slime Pháo trong một cụm ±4 lát (F14; F10: 7 slime ±5; trước đó 6 slime + 2
   Pháo, cụm ±4), 9 lượt; F11: nhiệm vụ hạ 2 Slime Pháo — con thứ hai tới cùng đợt sau (F14: 1 slime + 1 Pháo)
   khi sân còn ≤ 2.
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

## F10 — Tự động cân bằng: mục tiêu độ khó, bot nhìn trước, `npm run tune`

**Người chơi thấy và làm gì:** không thấy gì mới — đây là công cụ (đợt 0 của kế hoạch sau B6). Thứ người
chơi cảm nhận được là **con số mới** do công cụ đề xuất (mục Con số bên dưới).

**Luật / cách làm** (nguồn sự thật: `logic/autoPlay.ts` `lookaheadTurn`, `scripts/tuneCore.ts`,
`scripts/simCore.ts`; chủ dự án duyệt kế hoạch và mục tiêu ngày 27/10/2026):

1. **Mục tiêu độ khó** nằm trong cấu hình: mỗi màn có `target: { winRate, spareTurns }`; dung sai chung
   `BALANCE_TOLERANCE` = ±5% thắng, ±0,5 lượt dư (`battleConfig.ts`). Mục tiêu theo gợi ý của agent: màn
   1–5 thắng 98 / 93 / 88 / 83 / 78%, dư 3 / 2,5 / 1,25 / 0,75 / 0,5 lượt.
2. **Đo bằng người chơi trung bình** — bot "Ngắm chuẩn" (`TARGET_PLAYER` trong `scripts/simCore.ts`, chủ
   dự án chốt 27/10/2026) — với bộ mặc định (Kiếm + Giáo + Cung) và **từng skill** nếu màn có skill. Lúc
   đầu đo bằng bot "Nhìn trước" thì bộ dò siết số tới mức người chơi trung bình chỉ thắng màn 4 45–60%.
3. **Bot "Nhìn trước"** (người chơi giỏi, dùng cho E2E và để so): mỗi lượt thử mọi nước khác nhau (vũ khí
   đã mang × nhóm quái trúng, có/không bấm skill) trên 3 tương lai giả lập sinh từ ngẫu nhiên **riêng của
   bot** — không nhìn trộm ngẫu nhiên của trận — rồi chọn nước điểm trung bình cao nhất (thắng > mọi thứ;
   còn lại: máu nhân vật − quái sắp đánh − máu quái, trừ phần skill đang nạp).
4. **`npm run tune`**: thử mọi tổ hợp "núm vặn" khai báo trong `scripts/tune.ts` + số lượt từng màn, in
   3 đề xuất kèm số trước/sau. Đề xuất đạt dung sai ở mọi bộ đồ đứng trước đề xuất lệch ít hơn mà không
   đạt (tổng độ lệch nhỏ chưa chắc đạt). Núm vặn chỉ ảnh hưởng một màn (cụm quái, số quái của màn, loại
   quái chỉ có ở màn đó) dò riêng màn đó — nhanh hơn nhiều so với nhân chéo cả game. **Không tự ghi cấu
   hình**: agent áp tay sau khi chủ dự án duyệt. Kiểm bộ dò (27/10/2026, một lần, script tạm): chạy trên
   đúng cấu hình lúc dò B6 với mục tiêu của B6 thì ra lại bộ số agent dò tay hồi đó.
5. **CI**: sau `npm run check`, job in bảng `npm run sim` (200 ván) vào tóm tắt job — bảng đầu so với mục tiêu
   (✅/❌), bảng sau mọi kiểu chơi × mọi bộ đồ.

**Con số** (`battleConfig.ts`, `npm run tune` đề xuất 27/10/2026, 500 ván, bot ngắm chuẩn): số lượt màn
1–5 10/12/9/8/8 → **10/11/8/9/8**; Cầu lửa nạp 5 → **6** nhát (với nạp 5, Cầu lửa thắng màn 4 hơn Mưa
băng 6–9% — chỉnh quái của màn không đưa được cả hai skill vào dung sai); màn 3 giữ cụm ±2, Slime Vua
6 máu; màn 4: 8 → **10 slime** (cụm 5 + 5), cụm ±2 → ±3; màn 5: 6 slime + 2 Slime Pháo → **7 slime + 1
Slime Pháo**, cụm ±4 → ±5; Slime Pháo giữ 3 máu, bắn mất 2.

**Kiểm chứng tự động:**

- Unit (`autoPlay.test.ts`): bot nhìn trước đổi vũ khí hạ con cuối; hạ con sắp đánh chết người thay vì
  chém trúng nhiều con (bot ngắm chuẩn thì thua); bấm skill khi skill thắng ngay; chưa đầy / không mang
  thì không bấm; đổi rng của trận không đổi nước đi (không nhìn trộm); cùng rng người chơi cùng nước, chỉ
  dùng vũ khí đã mang. `scripts/tuneCore.test.ts`: độ lệch, dung sai, chọn số lượt, bằng điểm giữ số gần
  số cũ, đạt dung sai thắng lệch ít mà không đạt, núm vặn chung nhân chéo / núm vặn riêng dò trong màn,
  không sửa cấu hình gốc, màn thiếu mục tiêu báo lỗi. `battle.test.ts`: mục tiêu sai (thắng ngoài [0, 1],
  dư âm) bị từ chối. `balance.test.ts`: mỗi màn × mỗi skill nằm trong dung sai (500 ván, bot ngắm chuẩn)
  - ba quan hệ độ khó cũ giữa các màn.
- E2E: các ván "chơi giỏi" (đi đủ 5 màn, phá đảo bằng Cầu lửa…) dùng bot nhìn trước; seed 42 thắng đủ 5
  màn với cả hai skill.

**Cân bằng (`npm run sim`, 500 ván, bộ Kiếm + Giáo + Cung):** bot ngắm chuẩn — màn 1 / 2 = 98,2% / 93,6%
(dư 3,04 / 2,62); màn 3 / 4 / 5 với Mưa băng = 88,0% / 83,8% / 81,2% (dư 1,67 / 0,83 / 0,65), với Cầu lửa
= 89,6% / 83,8% / 81,6% (dư 1,55 / 0,68 / 0,50) — mọi ô đạt. Bot nhìn trước (người chơi giỏi): 99,4% /
93,2% / 98–100% / ~95% / 92–95%. Bot nhìn trước chỉ giữ skill khi đã đầy ở ~1–10% số lượt (gần như vẫn
bấm ngay).

**Giới hạn đã biết:** Rìu vẫn không hơn Kiếm ở màn 4 (ngắm chuẩn 84,2–84,4% so với 83,8%; nhìn trước
94,6% so với ~95%): quái hầu như bị hạ trước khi tới vòng 0–1 — chuyện thiết kế màn (đợt 7), không phải
bot. Số lượt là núm vặn thô (đổi 1 lượt thì tỉ lệ thắng nhảy 10–30%), nên cần núm vặn mịn riêng từng màn.
Màn 3 dư 1,67 lượt, sát mép trên dung sai (1,75).

**Nợ liên quan:** DEBT-009 (số chưa qua chơi thử).

## F11 — Thắng bằng nhiệm vụ + quái ra theo đợt

**Người chơi thấy và làm gì:** màn chuẩn bị ghi nhiệm vụ của màn ("Nhiệm vụ: hạ 6 Slime"). Trong trận,
góc trên bên phải đếm tiến độ ("Slime 2/6", "Slime Vua 0/1") thay ô "Quái: n". Xong nhiệm vụ là thắng
ngay, quái còn lại không cần giết ("Xong nhiệm vụ, còn dư n lượt"). Sân còn ít quái thì một đợt quái
mới tràn vào vòng ngoài cùng.

**Luật** (nguồn sự thật: `logic/battle.ts` `playTurn` / `castSkill` / `spawnWave` + `logic/quest.test.ts`;
đợt 1 kế hoạch sau B6, chủ dự án duyệt 27/10/2026 — "cứ làm theo gợi ý"):

1. Mỗi màn có một nhiệm vụ `quest: { kind, count }`: giết đủ `count` con loại `kind` (bằng chém hay skill)
   là **thắng ngay** — kể cả nhát cuối vừa hết lượt. Màn không khai báo nhiệm vụ: diệt sạch mọi đợt quái.
2. Đợt quái: `monsters` là đợt mở màn; `waves` là các đợt sau, ra lần lượt. Sau mỗi nhát chém (khi quái
   cũ đã đi, chưa thua) hoặc mỗi lần bấm skill, nếu sân còn ≤ `nextWaveAt` con (mặc định 0) thì **một**
   đợt kế tràn vào vòng ngoài cùng — cùng luật đặt quái với đợt mở màn (cụm ±spread, hai phía nếu màn
   `splitOpposite`), không đè quái đang đứng; cụm thiếu chỗ thì lấn sang ô trống gần cụm nhất; vòng ngoài
   không đủ chỗ cho cả đợt thì đợt đó chờ lượt sau. Đợt mới đứng yên trong lượt nó vừa ra. Id nối tiếp.
3. **Không có màn bất khả thi:** cấu hình mà mọi đợt cộng lại không đủ quái nhiệm vụ bị từ chối lúc mở
   trận (Micro RPG từng có lỗi này); cùng với nhiệm vụ 0 con / số lẻ, loại quái không tồn tại, đợt rỗng
   hoặc không đủ chỗ trong cụm, ngưỡng ra đợt âm / số lẻ.
4. Đợt mở màn đặt y như trước F11 — cùng seed cùng ván (mọi test cũ giữ nguyên kỳ vọng).

**Con số** (`battleConfig.ts`; agent đề xuất + `npm run tune` + script dò tạm cho màn 3, 27/10/2026):

| Màn | Lượt | Mở màn                               | Đợt sau (ra khi sân còn ≤)         | Nhiệm vụ        |
| --- | ---- | ------------------------------------ | ---------------------------------- | --------------- |
| 1   | 14   | 4 slime, cụm ±2                      | 2 slime (≤ 2)                      | hạ 6 Slime      |
| 2   | 13   | 6 slime, cụm ±3                      | 4 slime (≤ 3)                      | hạ 8 Slime      |
| 3   | 6    | Slime Vua (8 máu) + 4 slime, cụm ±4  | —                                  | hạ 1 Slime Vua  |
| 4   | 8    | 10 slime, hai cụm ±3                 | —                                  | hạ 9 Slime      |
| 5   | 9    | 8 slime + 1 Slime Pháo, cụm ±4 (F14) | 1 slime + 1 Slime Pháo (≤ 2) (F14) | hạ 2 Slime Pháo |

Màn 3 và 4 không có đợt sau: dò thử thấy đợt sau không đổi kết quả (màn 3 nhiệm vụ là trùm; màn 4 đợt sau
chỉ ra khi đã hạ 9 — lúc nhiệm vụ đã xong). Màn 3: Slime Vua 6 → 8 máu, hộ vệ 3 → 4, cụm ±2 → ±4 — cụm hẹp
thì Mưa băng (đóng băng cả trùm lẫn hộ vệ) dễ hơn Cầu lửa ~5%, vượt dung sai.

**Bot** (`logic/autoPlay.ts`, không phải luật): ngắm chuẩn ưu tiên chém quái nhiệm vụ (sau quái bắn đang
"!"); nhìn trước chấm điểm theo "việc còn phải làm" — máu quái nhiệm vụ còn thiếu, cộng máu quái phải dọn
để gọi đợt có quái nhiệm vụ (không có nhiệm vụ: máu quái trên sân + các đợt chưa ra); skill đang nạp đáng
bằng máu nó chém được thật (không quá máu còn lại mỗi con); quái sắp đánh 0,5 → 0,25. `npm run tune` bỏ
qua tổ hợp núm vặn mà game từ chối (vd. nhiệm vụ nhiều hơn số quái).

**Kiểm chứng tự động:**

- Unit (`quest.test.ts`, 27 test): mở trận chưa có tiến độ; 10 ca cấu hình sai bị từ chối; chỉ quái đúng
  loại mới tính; xong nhiệm vụ thắng ngay dù còn quái, không tung số di chuyển; nhát cuối vừa hết lượt vẫn
  thắng; hết lượt chưa xong thì thua; skill tính vào nhiệm vụ và thắng được; màn không nhiệm vụ: còn đợt
  thì chưa thắng, hết đợt mới thắng; đợt kế ra đúng ngưỡng, id nối tiếp qua nhiều đợt, đầy máu, mỗi con một
  lát trong cụm, không đi ngay; thua thì không ra đợt; vòng ngoài đông thì vào ô trống gần nhất, không đủ
  chỗ thì chờ; skill gọi đợt không tốn lượt. `autoPlay.test.ts`: ngắm chuẩn ưu tiên quái nhiệm vụ; nhìn
  trước giết con cuối dù đợt kế sẽ ra, dồn đòn vào trùm nhiệm vụ, dọn sân để gọi đợt có quái nhiệm vụ.
  `tuneCore.test.ts`: tổ hợp làm cấu hình sai bị bỏ qua. `balance.test.ts`: mọi màn × mọi skill trong dung sai.
- E2E: ván seed 42 qua đủ 5 màn bằng nhiệm vụ (thắng ⇒ tiến độ ≥ nhiệm vụ), phải thấy ít nhất một đợt quái
  mới (ảnh `18-dot-quai-moi.png`, "Slime 2/6"); ảnh màn chuẩn bị `12-chuan-bi.png` ghi nhiệm vụ.

**Cân bằng (`npm run sim`, 500 ván, bộ Kiếm + Giáo + Cung, bot ngắm chuẩn):** màn 1 / 2 = 97,8% / 93,2% (dư
3,08 / 2,46); màn 3 / 4 / 5 với Mưa băng = 90,2% / 81,6% / 77,6% (dư 1,31 / 0,79 / 0,76), với Cầu lửa =
84,4% / 83,0% / 77,6% (dư 0,93 / 0,62 / 0,48) — mọi ô đạt mục tiêu F10.

**Giới hạn đã biết:** bot nhìn trước (người chơi giỏi, dùng cho E2E) chỉ nhìn 1 lượt nên không lên kế hoạch
dọn sân để gọi đợt có Slime Pháo thứ hai: màn 5 mang Cầu lửa nó chỉ thắng ~40% (bot thường 78%); các màn
khác bằng hoặc hơn bot thường. Độ khó đo bằng bot thường nên bộ số không bị ảnh hưởng. Ở màn 3–4 đợt quái
không có vai trò (xem Con số); thiết kế màn theo chủ đề (~20 màn mỗi chủ đề — chủ dự án bổ sung 27/10/2026)
để đợt 7.

**Nợ liên quan:** DEBT-009 (số chưa qua chơi thử).

## F12 — Thêm 3 loại quái: Slime Con, Slime Lao, Slime Ma + màn 6–7

**Người chơi thấy và làm gì:** sau màn 5 có thêm 2 màn (game giờ 7 màn), mỗi màn giới thiệu một loại quái
mới với một câu đố riêng; nhiệm vụ là hạ đúng loại đó.

- **Slime Con** (slime đỏ nhỏ): 1 máu, đánh mất 1 — "mồi" kéo dài combo.
- **Slime Lao** (vàng cát, hai sừng trắng): mỗi lần tiến thì **lao 2 vòng** — phải hạ trước khi nó áp sát.
- **Slime Ma** (trắng ngà, đáy gợn sóng): **vô hình ở lượt chẵn** của màn (lượt 2, 4, 6…) — hiện mờ, nhát
  chém và skill đi xuyên qua; canh lượt lẻ mà đánh.

**Luật** (nguồn sự thật: `logic/battle.ts` `moveMonsters` / `canBeHit` + `logic/monsters.test.ts`; đợt 2
kế hoạch sau B6, chủ dự án duyệt 27/10/2026 — "làm theo gợi ý của agent"):

1. Đặc tính khai báo trong cấu hình loại quái, không viết code riêng từng loại: `step` (số vòng lao mỗi lần
   tiến, mặc định 1) và `ghost` (vô hình ở lượt chẵn). Slime Con chỉ là con số.
2. **Lao:** tiến thì đi tới `step` vòng, dừng ở ô trống xa nhất trước ô có quái (không nhảy qua), không quá
   vòng 0; đi ngang vẫn 1 lát; lao vào vòng 0 thì lượt sau mới đánh (như F04).
3. **Ma:** "lượt" = nhát chém sắp tới, đếm từ 1. Lượt chẵn: nhát chém không trúng (không mất máu, không tính
   vào combo, không bị đẩy), skill cũng không trúng (không mất máu, không bị đóng băng). Vẫn đi và vẫn đánh
   khi áp sát. Một hàm `canBeHit` dùng chung cho luật, bot và hình vẽ (mờ 30% lúc vô hình).
4. Cấu hình sai bị từ chối lúc mở trận: số vòng lao không nguyên hoặc < 1.

**Đổi so với đề xuất ban đầu:** lúc đầu agent chọn **Slime Khiên** (chỉ mất máu khi là con thứ ≥ n trong
combo) thay vì Slime Ma. Bỏ vì: khiên chỉ vỡ khi có "mồi" trong cùng nhát, mồi chết dần, hết mồi là màn
**kẹt — không thể thắng dù còn lượt**; dò nhiều biến thể (mồi Slime Con / slime thường, ngưỡng 2–3, skill
xuyên hay không xuyên khiên) không bộ số nào đạt mục tiêu độ khó. Slime Ma là ứng viên khác trong cùng danh
sách của kế hoạch, không có kiểu kẹt này.

**Con số** (`battleConfig.ts`; agent đề xuất + script dò tạm + `npm run tune`, 27/10/2026):

| Màn | Lượt | Mở màn (cụm ±4)       | Đợt sau (ra khi sân còn ≤ 1)                 | Nhiệm vụ       | Mục tiêu (agent đề xuất) |
| --- | ---- | --------------------- | -------------------------------------------- | -------------- | ------------------------ |
| 6   | 9    | 1 Slime Lao + 4 slime | 1 Slime Lao + 2 slime                        | hạ 2 Slime Lao | 90% / 1,5 lượt dư        |
| 7   | 9    | 1 Slime Ma + 5 slime  | 3 Slime Con + 1 Slime Ma (F14: Con ra trước) | hạ 2 Slime Ma  | 85% / 1,0 lượt dư        |

Slime Con 1 máu / đánh 1; Slime Lao 3 máu / đánh 2 / lao 2 vòng; Slime Ma 2 máu / đánh 2; cả ba 60% tiến
vào. Màn giới thiệu quái mới nên mục tiêu dễ hơn màn 5 (cuối chương). Đội hình chỉ 1 con đặc biệt mở màn +
1 con ở đợt sau: nhiều Lao/Ma hơn thì hai skill chênh nhau 10–15% (Mưa băng đóng băng chặn cú lao; Cầu lửa
2 sát thương hạ Ma nhanh) — vượt dung sai ±5%.

**Bot** (không phải luật): bot ngắm chuẩn (`scripts/simCore.ts`) **giữ skill tới lượt Slime Ma hiện hình** —
trước đó bấm ngay khi đầy, nên Mưa băng (đầy sau 3 nhát) hay bấm đúng lượt Ma vô hình còn Cầu lửa (đầy sau
6 nhát) luôn bấm lúc Ma hiện hình: chênh nhau chỉ vì trùng nhịp. `hitIds` (dùng chung bot / E2E) bỏ quái ma
đang vô hình.

**Câu đố có tác dụng** (500 ván, bot ngắm chuẩn so với bot "không biết"): màn 6 — không ưu tiên Slime Lao
thì thắng ~48% thay vì ~92%; màn 7 — tưởng Ma lúc nào cũng đánh được, bấm skill bất kể lượt thì thắng ~77%
thay vì ~85% (Ma chỉ 2 máu nên phí vài nhát vẫn gỡ được).

**Kiểm chứng tự động:**

- Unit (`monsters.test.ts`, 12 test): Lao tiến 2 vòng giữ lát, không quá vòng 0, ô cách 2 vòng có quái thì
  tiến 1, ô ngay trước có quái thì đứng yên, đi ngang 1 lát, lao vào vòng 0 lượt sau mới đánh; Ma lượt lẻ
  trúng như thường, lượt chẵn nhát chém xuyên qua (không mất máu, không vào combo, không bị đẩy), skill xuyên
  qua (không đóng băng), vẫn đánh khi áp sát; từ chối số vòng lao sai. `autoPlay.test.ts`: ngắm chuẩn không
  tính Ma vô hình là trúng. `scripts/simCore.test.ts`: ngắm chuẩn giữ skill lúc Ma vô hình, bấm lúc Ma hiện
  hình, không có Ma thì bấm ngay. `balance.test.ts`: màn 6–7 × mọi skill trong dung sai.
- E2E: ván seed 42 qua đủ 7 màn; mọi nhát chém không trúng con Ma đang vô hình; phải có lúc Ma vô hình (ảnh
  `20-slime-ma-vo-hinh.png`); ảnh mở màn 6 `19-man-slime-lao.png`.

**Cân bằng (`npm run sim`, 500 ván, bộ Kiếm + Giáo + Cung, bot ngắm chuẩn):** màn 6 Mưa băng / Cầu lửa =
93,2% / 91,4% (dư 1,31 / 1,11); màn 7 = 85,8% / 84,8% (dư 1,47 / 1,04) — đạt. Màn 1–5 giữ nguyên số F11.

**Giới hạn đã biết:** mỗi loại quái mới hợp với một skill khác nhau, nên màn dùng nhiều quái đặc biệt khó
đạt dung sai ±5% ở mọi skill — đợt 7 (thiết kế màn theo chủ đề) sẽ gặp lại chuyện này. Màn 7 dư 1,47 lượt
với Mưa băng, sát mép trên (1,5). Hình 3 quái vẽ tạm bằng lưới ký tự (DEBT-007).

**Nợ liên quan:** DEBT-007, DEBT-009.

## F13 — Lưu tiến trình + vàng

**Người chơi thấy và làm gì:** hạ quái thì được vàng; màn kết quả ghi "+6 vàng · tổng 6"; màn chuẩn bị hiện
"Vàng: n" góc trên bên phải. Tắt game mở lại vẫn còn vàng và vào thẳng màn cao nhất đã mở khóa.

**Luật** (đợt 3 kế hoạch sau B6, chủ dự án duyệt 27/10/2026 — "agent đề xuất"):

1. Vàng (`logic/battle.ts` + `logic/gold.test.ts`): mỗi con bị hạ (chém hay skill) cho vàng theo loại
   (`gold` trong cấu hình loại quái): slime, Slime Con **1** · Slime Lao, Slime Ma **2** · Slime Pháo **3** ·
   Slime Vua **5** — theo độ khó hạ nó. Vàng của trận nằm trong `BattleState.gold`.
2. **Thua vẫn giữ vàng đã nhặt** (game mobile chơi nhanh: thua mà mất trắng dễ làm người chơi bỏ; cày màn dễ
   bị giới hạn bởi số quái mỗi màn — đợt 4 chỉnh qua giá nâng cấp).
3. Hồ sơ (`src/features/profile/`, tính năng thứ hai): `{ version, gold, unlockedLevel }` lưu localStorage.
   Hết trận (lúc hiện màn kết quả): cộng vàng; thắng thì mở khóa màn kế (không vượt màn cuối, không tụt).
4. Mở game: vào màn cao nhất đã mở khóa. `?level=N` chỉ mở được màn đã mở khóa (trả DEBT-011).
5. **An toàn dữ liệu:** có số phiên bản (đổi cấu trúc thì viết bước chuyển). Dữ liệu lạ (hỏng, sai kiểu,
   phiên bản mới hơn game) → cất nguyên văn vào khóa dự phòng `pixelGame.profile.backup` (chỉ khi chưa có bản
   sao) rồi chơi bằng hồ sơ trống — không bao giờ sập game hay lặng lẽ mất dữ liệu. Bộ nhớ bị chặn (chế độ
   riêng tư) → chơi được, màn kết quả ghi "(không lưu được)".
6. Kiến trúc: logic hồ sơ là hàm thuần nhận kho lưu truyền vào (`KeyValueStore`), `view/profileStore.ts` gắn
   localStorage. Một tính năng chỉ dùng tính năng khác qua `index.ts` — ESLint chặn import vào ruột (trả
   DEBT-005).

**Con số:** vàng ở `monsterKinds[…].gold` trong `battleConfig.ts`; khóa lưu và phiên bản ở
`src/features/profile/logic/profileConfig.ts`.

| File                                          | Vai trò                                             |
| --------------------------------------------- | --------------------------------------------------- |
| `profile/logic/profile.ts`                    | Đọc/ghi an toàn, cộng kết quả trận, chọn màn mở đầu |
| `profile/logic/profileTypes.ts`, `…Config.ts` | Kiểu hồ sơ, kho lưu; khóa lưu, số phiên bản         |
| `profile/view/profileStore.ts`                | Gắn localStorage (bọc lỗi trình duyệt chặn bộ nhớ)  |
| `profile/index.ts`                            | Cổng công khai                                      |

**Kiểm chứng tự động:**

- Unit: `gold.test.ts` (7 test — vàng theo loại, con chỉ bị thương thì không, thắng/thua đều giữ, skill ra
  vàng, cấu hình vàng sai bị từ chối); `profile.test.ts` (19 test — hồ sơ trống, ghi rồi đọc lại, 7 kiểu dữ
  liệu lạ đều cất bản sao, không đè bản sao cũ, bộ nhớ bị chặn, thắng mở khóa / thua không, không tụt, không
  vượt màn cuối, `?level=` trong / ngoài màn đã mở khóa, hồ sơ nhiều màn hơn game); `levelParam.test.ts`
  (không có / sai → null). ESLint chặn import `../../profile/logic/…` từ `battle/` (thử bằng file tạm).
- E2E: người chơi mới mở `?level=5` vẫn vào màn 1, 0 vàng; thắng màn 1 → lưu đúng vàng + mở khóa màn 2;
  màn chuẩn bị màn 2 hiện đúng tổng vàng; mở trang mới cùng trình duyệt → vào thẳng màn 2 với đúng số vàng
  (ảnh `21-thang-co-vang.png`, `22-mo-lai-con-tien-trinh.png`). Các test mở thẳng màn sau nạp sẵn hồ sơ đã
  mở khóa tới màn đó (`BattleDriver.seedProfile`).

**Giới hạn đã biết:** chưa có chỗ tiêu vàng (đợt 4). Skill chọn gần nhất chưa lưu qua lần tắt game. Chưa có
nút xóa tiến trình / chơi lại từ đầu.

**Nợ liên quan:** DEBT-005, DEBT-011 (đã trả); DEBT-002 (cầu nối test bật cả bản phát hành).

## F14 — Nâng cấp nhân vật bằng vàng

**Người chơi thấy và làm gì:** màn chuẩn bị có nút **NÂNG CẤP** dưới "VÀO TRẬN". Màn Nâng cấp: mỗi chỉ số
một hàng — tên, "Cấp n/3", hiệu lực hiện tại → cấp kế ("10 → 12 máu"), nút "MUA / n vàng" (viền xanh khi đủ
vàng, mờ khi thiếu, "TỐI ĐA" khi hết cấp). "XONG" quay lại màn chuẩn bị đúng màn và bộ đồ đang chọn.

**Luật** (nguồn sự thật: `logic/upgrades.ts` + `logic/upgrades.test.ts`; đợt 4 kế hoạch sau B6, chủ dự án
duyệt 27/10/2026 — "agent đề xuất"):

| Chỉ số     | Mỗi cấp            | Cấp 0 → 3 | Giá cấp 1 / 2 / 3 |
| ---------- | ------------------ | --------- | ----------------- |
| Máu tối đa | +2 máu             | 10 → 16   | 10 / 20 / 40 vàng |
| Chí mạng   | +5% cho mọi vũ khí | 10% → 25% | 10 / 20 / 40 vàng |
| Hồi máu    | +1 máu mỗi lần hồi | 1 → 4     | 10 / 20 / 40 vàng |

1. Nâng hết cả ba: 210 vàng (≈ 3–4 lượt chơi hết 7 màn — một lượt nhặt ~57 vàng). Không có "+1 sát thương"
   (slime 3 máu → game dễ hẳn); không có "may mắn" (đợt 5 mới dùng).
2. Mua: đủ vàng thì trừ đúng giá, lên 1 cấp; thiếu vàng / đã tối đa thì không mua được. Chỉ trừ vàng khi đã
   lưu được hồ sơ ("Không lưu được — chưa mua").
3. Nâng cấp không đổi luật trận: `withUpgrades` trả cấu hình trận đã cộng chỉ số (máu tối đa, chí mạng mọi
   vũ khí, máu hồi); màn chuẩn bị (mô tả vũ khí) và trận dùng cấu hình đó. Cấp trong hồ sơ vượt giới hạn
   (game giảm số cấp) tính theo cấp tối đa; tên lạ bỏ qua. Bảng nâng cấp sai (giá âm / số lẻ, chí mạng cấp
   tối đa vượt 100%…) bị từ chối.
4. Hồ sơ lên **phiên bản 2** (thêm `upgrades`); hồ sơ phiên bản 1 (đợt 3) tự chuyển lên, giữ vàng và màn đã
   mở khóa.
5. **Cân bằng:** mục tiêu độ khó đo theo người chơi lần đầu có nâng cấp dự kiến ở màn đó (`assumedUpgrades`
   của màn, mua ngay khi đủ vàng — mô phỏng: vào màn 3 ~14 vàng, màn 4 ~20, màn 6 ~39): màn 3 Máu 1; màn
   4–5 Máu 1 + Chí mạng 1; màn 6–7 thêm Hồi máu 1. Mô phỏng, bộ dò số và `balance.test.ts` dùng chung
   `simConfig`. Nâng cấp làm độ khó nhích ít (người chơi thua chủ yếu vì hết lượt, không phải vì hết máu).

**Con số:** `UPGRADE_CONFIG` và `assumedUpgrades` trong `battleConfig.ts`. Chỉnh số theo nâng cấp dự kiến
(`npm run tune` + script dò tạm): màn 5 mở màn 7 → 8 slime, cụm ±5 → ±4, đợt sau 3 slime → 1 slime (+ 1 Pháo)
— bộ số duy nhất vừa đạt mục tiêu vừa khó hơn màn 4 (luật B3); màn 7 đợt sau Slime Con ra trước Slime Ma.

| File                    | Vai trò                                                   |
| ----------------------- | --------------------------------------------------------- |
| `logic/upgrades.ts`     | Giá, giới hạn cấp, mua, hiệu lực lên cấu hình trận        |
| `view/UpgradeScene.ts`  | Màn Nâng cấp: vẽ, nhận chạm, lưu hồ sơ, `UpgradeSnapshot` |
| `view/upgradeLayout.ts` | Vị trí hàng, nút mua, nút "XONG"                          |

**Kiểm chứng tự động:**

- Unit: `upgrades.test.ts` (15 test — hiệu lực từng chỉ số, chí mạng cả vũ khí chưa có chí mạng, cấp vượt
  giới hạn / tên lạ, không sửa cấu hình gốc, giá theo bậc, mua đủ / thiếu vàng / tối đa, 6 kiểu bảng sai, bảng
  thật hợp lệ); `profile.test.ts` (chuyển phiên bản 1 → 2, 4 kiểu dữ liệu nâng cấp sai); `upgradeLayout.test.ts`,
  `loadoutLayout.test.ts` (nút NÂNG CẤP); `scripts/simCore.test.ts` (`simConfig` cộng nâng cấp dự kiến);
  `balance.test.ts` (mọi màn × mọi skill với nâng cấp dự kiến + ba quan hệ độ khó cũ).
- E2E: hồ sơ 35 vàng → mua Máu cấp 1 (10) rồi cấp 2 (20) → còn 5, mua Chí mạng (10) không được → lưu đúng →
  "XONG" về màn chuẩn bị → vào trận máu tối đa 14 (ảnh `23-nang-cap.png`, `24-tran-sau-nang-cap.png`).

**Giới hạn đã biết:** màn 5 chỉ "khó hơn màn 4" sát mép (dư 0,76 so với 0,79 lượt — luôn cùng 500 ván nên
không chập chờn). Chưa nâng cấp riêng từng vũ khí (có thể ở đợt đồ vật). Chưa có nút hoàn tiền / đặt lại.

**Nợ liên quan:** DEBT-009 (số chưa qua chơi thử).

## F15 — Chủ đề Rừng rậm: 20 màn, 5 loại quái mới, bộ sinh màn

**Người chơi thấy và làm gì:** game giờ có **20 màn** thuộc chủ đề đầu tiên **Rừng rậm**. Màn chuẩn bị ghi
"MÀN 8/20" và "Rừng rậm · chọn đồ mang vào trận"; thanh trên trận ghi "Màn 8/20". Từ màn 8 gặp 5 loại quái
rừng (không còn chỉ là slime), màn 10 và 20 là trùm **Người Cây**. Màn 1–7 giữ quái cũ nhưng số đã sinh
lại theo đường độ khó mới.

| Quái      | Máu | Đánh | Vàng | Đặc tính (dùng lại luật sẵn có)           | Hình                      |
| --------- | --- | ---- | ---- | ----------------------------------------- | ------------------------- |
| Yêu tinh  | 4   | 2    | 2    | —                                         | người lùn da xanh lá      |
| Sói rừng  | 4   | 3    | 3    | lao 2 vòng (`step: 2`, như Slime Lao)     | sói xám mắt đỏ            |
| Cung thủ  | 3   | 2    | 3    | bắn từ vòng 4 (`shootRing: 4`, như Pháo)  | yêu tinh đội mũ, cầm cung |
| Dơi đêm   | 3   | 2    | 3    | vô hình lượt chẵn (`ghost`, như Slime Ma) | dơi tím sải cánh          |
| Người Cây | 14  | 5    | 10   | trùm, tiến chậm (40%)                     | gốc cây có tán lá, 16×16  |

**Luật** (chủ dự án duyệt 27/10/2026 — lượt duyệt chung "A–E", `docs/plans/2026-10-27-ke-hoach-sau-b6.md`
mục 1b): không thêm cơ chế mới — 5 loại quái chỉ là con số trong `monsterKinds`. Slime không bao giờ là quái
hiếm, không rơi đồ (đợt 5 dùng 5 loại mới này).

1. **Chương** (`logic/chapters.ts` + test): `CHAPTERS` trong `battleConfig.ts` liệt kê chủ đề và số màn;
   `chapterOf` đổi số màn toàn game thành "chủ đề + màn thứ mấy trong chủ đề". Tổng số màn của các chủ đề phải
   bằng số màn trong cấu hình (sai thì từ chối). Thêm chủ đề Băng / Núi lửa = thêm 1 dòng + 20 màn.
2. **Đường độ khó răng cưa** (mục tiêu thắng của bot ngắm chuẩn): màn 1 → 10 giảm dần 98% → 78% (trùm),
   màn 11 → 20 bật lên 92% rồi giảm tới 72% (trùm cuối). Lượt dư mục tiêu = số đo thật làm tròn 0,25 (chủ
   dự án chỉ chốt % thắng).
3. **Dung sai hai lớp:** trung bình các skill ±5% thắng (như cũ); **mỗi skill** ±8% (`LOADOUT_TOLERANCE`) —
   quái mới hợp skill khác nhau nên đòi ±5% cho từng skill thì gần như không màn nào đạt (đã thấy ở F12).
4. Nâng cấp dự kiến (`assumedUpgrades`) tăng dần theo màn: tới màn 20 là Máu 3, Chí mạng 2, Hồi máu 2.
5. Ba quan hệ độ khó cũ giữ nguyên (trùm màn 3 khó hơn màn 2, màn 4 khó hơn 3, màn 5 khó hơn 4).

**Bộ sinh màn** (`npm run levelgen -- --levels 8-12 --games 200`): mỗi màn của chủ đề là một bản mô tả
(`scripts/themeForest.ts`: mục tiêu, nâng cấp dự kiến, khoảng số quái mỗi loại, cụm, đợt, nhiệm vụ, khoảng
số lượt). Máy thử mọi tổ hợp bằng bot ngắm chuẩn (`scripts/levelGenCore.ts`), in ra màn đạt mục tiêu lệch ít
nhất — **không tự ghi** cấu hình, agent chép vào `battleConfig.ts`. Chủ đề mới = viết thêm một file bản mô tả.

| Màn | Lượt | Mở màn (cụm)                                 | Đợt sau                         | Nhiệm vụ        | Mục tiêu (thắng / dư) |
| --- | ---- | -------------------------------------------- | ------------------------------- | --------------- | --------------------- |
| 1   | 23   | 4 Slime (±2)                                 | 2 Slime                         | hạ 5 Slime      | 100% / 13,25          |
| 2   | 25   | 6 Slime (±3)                                 | 3 Slime                         | hạ 5 Slime      | 100% / 13             |
| 3   | 16   | 1 Slime Vua + 4 Slime (±3)                   | —                               | hạ Slime Vua    | 100% / 11             |
| 4   | 19   | 8 Slime (±4, hai phía)                       | —                               | hạ 8 Slime      | 100% / 11             |
| 5   | 19   | 7 Slime + 1 Slime Pháo (±4)                  | 1 Slime + 1 Pháo                | hạ 2 Slime Pháo | 100% / 10,75          |
| 6   | 17   | 1 Slime Lao + 5 Slime (±4)                   | 1 Lao + 3 Slime                 | hạ 2 Slime Lao  | 100% / 8,75           |
| 7   | 16   | 1 Slime Ma + 5 Slime (±4)                    | 3 Slime Con + 1 Ma              | hạ 2 Slime Ma   | 100% / 8              |
| 8   | 16   | 2 Yêu tinh + 3 Slime (±3)                    | 2 Yêu tinh + 2 Slime            | hạ 4 Yêu tinh   | 98% / 6,5             |
| 9   | 13   | 2 Sói + 2 Yêu tinh (±4)                      | 1 Sói + 2 Yêu tinh              | hạ 3 Sói rừng   | 100% / 5,25           |
| 10  | 13   | 1 Người Cây + 2 Yêu tinh (±3)                | —                               | hạ Người Cây    | 99% / 5               |
| 11  | 12   | 2 Cung thủ + 3 Yêu tinh (±4)                 | 1 Cung thủ + 2 Yêu tinh         | hạ 3 Cung thủ   | 100% / 4,25           |
| 12  | 12   | 1 Dơi + 3 Yêu tinh (±5) — F16 sinh lại       | 1 Dơi + 2 Slime                 | hạ 2 Dơi đêm    | 100% / 4              |
| 13  | 11   | 4 Yêu tinh + 1 Sói (±3, hai phía)            | 1 Sói + 2 Yêu tinh              | hạ 4 Yêu tinh   | 97% / 3,75            |
| 14  | 11   | 2 Cung thủ + 4 Yêu tinh (±4)                 | 1 Cung thủ + 1 Yêu tinh         | hạ 3 Cung thủ   | 97% / 2,75            |
| 15  | 13   | 2 Dơi + 2 Sói + 2 Yêu tinh (±5)              | 1 Sói + 1 Dơi                   | hạ 3 Sói rừng   | 98% / 2               |
| 16  | 14   | 3 Yêu tinh + 1 Cung thủ + 1 Dơi (±5)         | 2 Yêu tinh + 1 Cung thủ + 1 Dơi | hạ 5 Yêu tinh   | 93% / 2               |
| 17  | 13   | 2 Sói + 4 Yêu tinh (±3, hai phía)            | 3 Sói                           | hạ 4 Sói rừng   | 79% / 1               |
| 18  | 9    | 2 Cung thủ + 2 Dơi + 2 Yêu tinh (±4)         | 1 Cung thủ + 1 Dơi              | hạ 3 Cung thủ   | 76% / 0,75            |
| 19  | 8    | 2 Yêu tinh + 2 Sói + 2 Cung thủ + 1 Dơi (±4) | 1 Sói + 1 Cung thủ + 2 Dơi      | hạ 2 Sói rừng   | 74% / 1               |
| 20  | 9    | 1 Người Cây + 1 Sói (±3)                     | 3 Yêu tinh                      | hạ Người Cây    | 72% / 1,5             |

Con số màn 1–7 ở các mục F06–F14 phía trên là số cũ lúc làm tính năng đó — số hiện hành là bảng này.

**Màn đầu dễ hơn (chủ dự án duyệt 28/10/2026):** chủ dự án chơi thử thấy màn đầu đã rất khó — mục tiêu cũ đo bằng
bot "Ngắm chuẩn" (luôn chém chỗ tốt nhất, không trượt nhịp), còn người mới (đo bằng bot nửa chuẩn nửa chém bừa,
300 ván) chỉ thắng màn 1–10 khoảng 6–30%. Thêm lượt: màn 1–5 **+10**, màn 6–16 giảm dần **+8, +7, +6, +5, +4,
+3, +3, +2, +2, +1, +1**, màn 17–20 giữ nguyên (độ khó hiện tại để ở màn cao). Người mới giờ thắng màn 1–9
khoảng 56–98%, trùm màn 10 ~50%, rồi khó dần. Bảng trên đã ghi số lượt và mục tiêu mới (bot "Ngắm chuẩn" gần
như luôn thắng màn 1–16 — độ khó của các màn này thể hiện ở số lượt dư). Quan hệ "màn 4 khó hơn màn 3" giờ chỉ
đòi tỉ lệ thắng không nhiều hơn (cả hai 100%) và lượt dư ít hơn, như hai quan hệ còn lại.

**Bot "Người mới" đo màn đầu (chủ dự án duyệt 28/10/2026, trả DEBT-012):** bộ mô phỏng có thêm bot **"Người
mới"** (`scripts/simCore.ts`) — mỗi nhát tung một số: nửa phần chém như bot chuẩn, nửa phần chém bừa; skill đầy
là bấm. Mỗi màn ghi bot đo mục tiêu (`targetPlayer`, game không đọc): **màn 1–16 đo bằng "Người mới"**, màn
17–20 vẫn "Ngắm chuẩn". `npm run sim`, `npm run tune`, `npm run levelgen` và `balance.test.ts` đều đo mỗi màn
bằng bot của nó; bản mô tả bộ sinh màn (`scripts/themeForest.ts`) ghi mục tiêu "Người mới" cho màn 1–16 — sinh
lại màn 1–3 ra màn dễ như hiện tại (màn 1: 23 lượt, người mới thắng 87%).

| Màn                        | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  | 12  | 13  | 14  | 15  | 16  |
| -------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Người mới thắng (mục tiêu) | 87% | 80% | 95% | 92% | 69% | 95% | 95% | 81% | 81% | 45% | 33% | 28% | 65% | 25% | 35% | 21% |

Mục tiêu "Người mới" chỉ xét **trung bình các skill** (±5% thắng, ±0,5 lượt dư): bot chém bừa nửa phần nên chênh
giữa hai skill rất lớn — vd. màn 5 Mưa băng 95% / Cầu lửa 43%, màn 11 55% / 12%, màn 14 42% / 9% (Cầu lửa nạp 6
nhát, người mới bấm sớm và phí). Bảng F15 phía trên (cột mục tiêu) là số đo bằng "Ngắm chuẩn" trước lần đổi
này; số hiện hành ở `battleConfig.ts`. Ba quan hệ độ khó (trùm màn 3, màn 4, màn 5) vẫn so bằng "Ngắm chuẩn" —
đo bằng "Người mới" thì màn 2 từng (54%) khó hơn màn trùm 3 (95%).

**Màn 2 dễ hơn cho người mới (chủ dự án duyệt 28/10/2026):** người mới thua màn 2 gần như toàn vì **hết máu**
(226 ván hết máu, 2 ván hết lượt trên 500) — thêm lượt không giúp (25 → 34 lượt vẫn 55%). Đổi nhiệm vụ **hạ 8 →
hạ 5 Slime** (giữ 6 slime mở màn + đợt 3, 25 lượt): người mới thắng **80%**, bot chuẩn vẫn 100%; màn trùm 3 vẫn
khó hơn. Bản mô tả bộ sinh màn: mục tiêu màn 2 = 80%, nhiệm vụ thử thêm 5–6 — sinh thử ra đúng nhiệm vụ 5.
Màn 4 chọn tay (8 slime, ±4, 9 lượt) vì bộ sinh màn không ra tổ hợp nào vừa đạt mục tiêu vừa giữ được quan hệ
"màn 5 khó hơn màn 4" — đã dò mọi tổ hợp màn 4 nằm giữa màn 3 và 5 (script tạm).

**Hành vi giao diện:** quái đang đóng băng (F08) giờ **phủ kín màu băng** (`setTintFill`) thay vì nhân màu:
nhân màu băng lên quái xanh lá (Yêu tinh, Cung thủ) gần như không đổi màu — thử tay mới thấy.

**Kiểm chứng tự động:**

- Unit: `chapters.test.ts` (chương đầu / giữa / cuối, số màn lệch cấu hình bị từ chối);
  `scripts/levelGenCore.test.ts` (5 test — liệt kê tổ hợp, bỏ tổ hợp bất khả thi, ưu tiên màn đạt rồi lệch
  ít, chỉ khớp % thắng); `scripts/tuneCore.test.ts` (dung sai hai lớp); `balance.test.ts` (20 màn × mọi skill
  với nâng cấp dự kiến, dung sai hai lớp, ba quan hệ độ khó). Cấu hình test thêm 5 loại quái.
- E2E: ván chơi liền 20 màn dùng seed riêng `FULL_RUN_SEED = 1` và hồ sơ đã nâng cấp tối đa (seed 42 không
  còn thắng đủ 20 màn — seed 1 là seed nhỏ nhất bot "Nhìn trước" thắng đủ, script dò tạm); ảnh
  `25-quai-rung.png` (màn 8), `26-nguoi-cay-man-10.png`, `26-nguoi-cay-man-20.png`. Kiểm "hai phía" theo cụm
  của từng màn. Ảnh mở màn chờ 300ms (50ms có lúc chụp khi hình chưa kịp vẽ). Test Mưa băng: lượt sau khi bấm
  chém trượt (chém trúng mà xong nhiệm vụ thì thắng ngay, quái giữ nguyên băng — đúng luật, test cũ ngầm giả
  định không xảy ra).
- Thử tay khung 375×760: màn 8 — màn chuẩn bị ghi "MÀN 8/20 · Rừng rậm", nhiệm vụ "hạ 4 Yêu tinh"; chém, quái
  rừng tiến vào; Mưa băng phủ băng cả Yêu tinh lẫn slime, hết 1 lượt về màu gốc; console không lỗi.

**Giới hạn đã biết:** chưa có hình nền / màu sân riêng cho chủ đề. Số chưa qua chơi thử (DEBT-009).

**Nợ liên quan:** DEBT-007 (hình quái lưới ký tự), DEBT-009.

## F16 — Quái hiếm, may mắn, rơi vũ khí 6 cấp màu, túi đồ

**Người chơi thấy và làm gì:** thỉnh thoảng một con quái rừng **phát sáng vàng và phập phồng** — quái hiếm:
trâu gấp đôi, hạ được nhiều vàng gấp ba và có thể **rơi vũ khí**. Màn kết quả ghi "Rơi: Giáo Sử thi!" tô màu
cấp (hoặc "Quái hiếm không rơi đồ lần này"). Vũ khí rơi là **vĩnh viễn**: màn chuẩn bị và thanh vũ khí trong
trận ghi tên cấp màu dưới tên vũ khí, dòng mô tả cộng đúng chỉ số; cấp **Thần** có sét chớp quanh nút. Màn
Nâng cấp có thêm hàng **May mắn** (tăng xác suất gặp quái hiếm).

**Luật** (chủ dự án duyệt 27/10/2026 — lượt duyệt chung, `docs/plans/2026-10-27-ke-hoach-sau-b6.md` mục 1b;
nguồn sự thật: `logic/battle.ts` `withRare` / `rewardsAfter`, `logic/loot.ts`, test cạnh bên):

1. **Quái hiếm** (`rare` trong `BATTLE_CONFIG`): từ màn 3, mỗi trận 15% có **một** con của đội hình mở màn
   hóa hiếm — chỉ loại `canBeRare` (Yêu tinh, Sói rừng, Cung thủ, Dơi đêm; **slime và trùm không bao giờ**) và
   **không phải loại của nhiệm vụ** (không bao giờ cần để thắng). Máu ×2, vàng ×3. Màn không có nhiệm vụ thì
   không có quái hiếm. Chọn quái hiếm bằng dòng ngẫu nhiên riêng tính từ seed: có hay không thì ván vẫn như
   nhau.
2. **May mắn** (nâng cấp): +5% xác suất quái hiếm mỗi cấp, 3 cấp, 10 / 20 / 40 vàng.
3. **Rơi đồ** (`LOOT_CONFIG`): hạ quái hiếm → 50% rơi một vũ khí, loại **tạm ngẫu nhiên đều** trong 4 vũ khí
   (bảng rơi theo loài chủ dự án chốt sau — chỉ sửa dữ liệu). Cấp theo tỉ lệ:

   | Cấp         | Màu chữ               | Cộng thêm so với vũ khí gốc                   | Tỉ lệ |
   | ----------- | --------------------- | --------------------------------------------- | ----- |
   | Thường      | trắng                 | —                                             | 40%   |
   | Tốt         | xanh lá               | +5% chí mạng                                  | 28%   |
   | Hiếm        | xanh dương            | +10% chí mạng                                 | 17%   |
   | Sử thi      | tím (viền trắng)      | +10% chí mạng, rộng thêm 2 lát                | 10%   |
   | Huyền thoại | cam                   | +15% chí mạng, rộng thêm 2 lát, +1 sát thương | 4%    |
   | Thần        | đỏ (viền trắng) + sét | +20% chí mạng, rộng thêm 2 lát, +1 sát thương | 1%    |

4. **Bảo hiểm:** hụt 3 quái hiếm liền → con thứ 4 chắc rơi; 29 món liền dưới Sử thi → món thứ 30 chắc từ Sử
   thi trở lên (tung trong nhóm cao theo tỉ lệ 10 : 4 : 1). Bộ đếm lưu trong hồ sơ, rơi lúc hết trận (thắng hay
   thua đều tính).
5. **Túi đồ:** mỗi vũ khí giữ **cấp cao nhất đã rơi** (cấp cao hơn luôn mạnh hơn nên không cần chọn cấp); món
   rơi thấp hơn hoặc bằng thì ghi "(đã có)". `withWeaponTiers` trả cấu hình trận đã cộng chỉ số (như
   `withUpgrades`), trận chạy y như cũ.
6. Hồ sơ lên **phiên bản 3** (`weaponTiers`, `lootPity`); hồ sơ bản 1 và 2 tự chuyển lên, không mất gì.
7. Cấu hình sai bị từ chối: xác suất ngoài [0, 1], hệ số máu / vàng không nguyên hoặc < 1; bảng rơi không có
   cấp, tỉ lệ không cộng 100%, rộng thêm số lẻ (vùng đánh phải rộng số lẻ), chí mạng vượt 100%, bảo hiểm sai.

**Thực tế khi chơi** (đo bằng script tạm, 300 ván mỗi màn, bot ngắm chuẩn): quái hiếm chỉ có từ **màn 9**
(màn 3–8 ngoài loại nhiệm vụ chỉ có slime). Ở màn 9–20 khoảng 4–5% số trận hạ được quái hiếm (người chơi phải
chủ động hạ nó trước khi xong nhiệm vụ) → tính cả bảo hiểm, cỡ **20 trận một món**; Sử thi trở lên chắc chắn
sau tối đa 30 món. Chủ dự án duyệt giữ nguyên ngày 28/10/2026 ("giữ các lựa chọn agent tự chọn ở đợt 5–6").

**Cân bằng:** mô phỏng giờ có quái hiếm (15% trận). Màn 12 tụt khỏi dung sai (Cầu lửa 80% so với mục tiêu
90% ± 8%) → sinh lại bằng `npm run levelgen` (4 quái mở màn, cụm ±5, 9 lượt, mục tiêu dư 1,25); 19 màn khác
vẫn đạt.

| File                       | Vai trò                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| `logic/loot.ts`            | Cấp màu lên cấu hình, tung rơi đồ, bảo hiểm, nhận món, đọc bộ đếm |
| `logic/battle.ts`          | Chọn quái hiếm lúc mở trận; vàng ×3 và đánh dấu đã hạ quái hiếm   |
| `view/weaponTierStyle.ts`  | Màu chữ theo cấp, sét quanh nút cấp Thần                          |
| `profile/logic/profile.ts` | Hồ sơ phiên bản 3, ghi cấp vũ khí + bảo hiểm sau trận             |

**Kiểm chứng tự động:**

- Unit: `loot.test.ts` (bảng thật, cộng chỉ số theo cấp, dữ liệu lạ, không tụt cấp, 8 kiểu bảng sai, rơi theo
  tỉ lệ, bảo hiểm 3 lần và 30 món, tỉ lệ cấp 10 000 lần, loại vũ khí đều, lặp lại được); `rare.test.ts` (một
  con duy nhất, máu ×2, không slime / không loại nhiệm vụ / không màn diệt sạch, xác suất 0 và ~15%, ván không
  đổi, cấu hình sai, bảng thật, may mắn +5%, vàng ×3 khi chém và khi skill); `profile.test.ts` (bản 2 → 3, dữ
  liệu đồ rơi lạ, ghi đồ rơi sau trận); `loadout.test.ts` (mô tả có tên cấp và sát thương);
  `upgradeLayout.test.ts` (4 hàng vừa màn hình).
- E2E: seed 34 màn 16 (bảo hiểm đặt sẵn) — có đúng 1 quái hiếm máu ×2 (ảnh `27-quai-hiem.png`), bot hạ nó và
  thắng, món rơi đúng luật và từ Sử thi (ảnh `28-roi-do.png`), hồ sơ lưu cấp + bảo hiểm về 0, màn chuẩn bị màn
  sau hiện cấp (ảnh `29-tui-do.png`); hồ sơ có Kiếm Thần / Giáo Sử thi / Cung Hiếm → màn chuẩn bị và thanh vũ
  khí ghi đúng cấp, có sét (ảnh `30-cap-vu-khi.png`, `31-thanh-vu-khi-cap.png`). Bot của test tính nước đi
  theo cấu hình thật của trận (`snapshot.config`) vì đồ rơi giữa ván làm vũ khí đổi chỉ số.
- Thử tay khung 375×760: hồ sơ phiên bản 2 (100 vàng) mở ra đủ vàng và màn; màn Nâng cấp 4 hàng, mua May mắn
  15% → 20%, hồ sơ lưu bản 3; vào màn 16 thấy Dơi đêm hiếm phát sáng; console không lỗi.

**Giới hạn đã biết:** món rơi không cao hơn món đang có là phí (40% là cấp Thường — trùng vũ khí gốc; chủ dự
án duyệt giữ nguyên 28/10/2026, chưa đổi món trùng ra vàng). Sét và
ánh sáng là hình khối tạm; máy không có WebGL thì quái hiếm chỉ phập phồng, không phát sáng. Bảng Sweetie 16
không có tím sáng nên Sử thi dùng tím đậm + viền trắng.

**Nợ liên quan:** DEBT-007 (hình tạm), DEBT-009 (số chưa qua chơi thử).

## F17 — Cửa hàng: vũ khí cấp Hiếm dùng có hạn

**Người chơi thấy và làm gì:** màn chuẩn bị có nút **CỬA HÀNG** cạnh **NÂNG CẤP** (hàng đáy chia đôi). Màn
Cửa hàng: Kiếm, Rìu, Giáo, Cung — mỗi món cấp **Hiếm** (chữ xanh dương), tình trạng ("Dùng 5 trận" / "Còn
3 trận · mua thêm 5" / "Đã có Sử thi (vĩnh viễn)"), nút "MUA / 25 vàng" (viền xanh khi đủ vàng, mờ khi thiếu,
"ĐÃ CÓ" khi không cần mua). "XONG" quay lại màn chuẩn bị đúng màn và bộ đồ đang chọn; món đang thuê ghi
"Hiếm · 5 trận" dưới tên.

**Luật** (chủ dự án duyệt 27/10/2026 — lượt duyệt chung mục 1b; nguồn sự thật: `logic/shop.ts` +
`logic/shop.test.ts`):

1. Bán cố định 4 món cấp Hiếm, **25 vàng** mỗi món, **dùng 5 trận** — thắng hay thua đều trừ. Nút xem quảng
   cáo để giai đoạn D.
2. **Agent chọn, chủ dự án duyệt giữ nguyên 28/10/2026** (chỗ bản duyệt đầu chưa nói): chỉ trừ **trận có
   mang món đó** vào
   (món nằm im trong túi không mất hạn); mua thêm khi còn hạn thì **cộng dồn** số trận; vũ khí đã có vĩnh
   viễn từ cấp Hiếm trở lên thì **không bán** (mua là phí).
3. Món thuê còn hạn: vũ khí dùng cấp Hiếm, nhưng không bao giờ hạ món vĩnh viễn cao hơn (`effectiveTiers`
   gộp hai thứ, rồi `withWeaponTiers` cộng chỉ số như F16). Đồ rơi vẫn ghi vào cấp vĩnh viễn.
4. Chỉ trừ vàng khi đã lưu được hồ sơ ("Không lưu được — chưa mua"). Hồ sơ lên **phiên bản 4** (`rentals`);
   hồ sơ bản 1–3 tự chuyển lên. Số trận lạ (âm, lẻ) coi như hết hạn.
5. Bảng cửa hàng sai bị từ chối: giá âm, số trận < 1, cấp không có, vũ khí không có, bán trùng.

**Con số:** `SHOP_CONFIG` trong `battleConfig.ts`.

| File                    | Vai trò                                                |
| ----------------------- | ------------------------------------------------------ |
| `logic/shop.ts`         | Mua, cấp dùng trong trận, trừ hạn sau trận, kiểm bảng  |
| `view/ShopScene.ts`     | Màn Cửa hàng (dùng chung bố cục hàng với màn Nâng cấp) |
| `view/loadoutLayout.ts` | Nút "CỬA HÀNG" cạnh "NÂNG CẤP"                         |

**Kiểm chứng tự động:**

- Unit: `shop.test.ts` (14 test — bảng thật, mua trừ giá, cộng dồn, 3 kiểu không mua được, cấp dùng không hạ
  món vĩnh viễn, trừ hạn chỉ món mang vào, dữ liệu lạ, 5 kiểu bảng sai); `profile.test.ts` (bản 3 → 4, món
  thuê lạ, ghi hạn sau trận); `loadoutLayout.test.ts` (nút cửa hàng).
- E2E: hồ sơ 60 vàng → mua Giáo (35, 5 trận) → mua thêm (10, 10 trận) → mua Kiếm không được → lưu đúng (ảnh
  `32-cua-hang.png`) → "XONG" thì Giáo cấp Hiếm (ảnh `33-mon-thue.png`) → vào trận Giáo cộng chỉ số Hiếm, thắng
  xong còn 9 trận.
- Thử tay khung 375×760: hồ sơ bản 3 (Cung Sử thi) mở ra — cửa hàng ghi Cung "ĐÃ CÓ"; mua Kiếm, về màn chuẩn
  bị thấy "Hiếm · 5 trận", chí mạng 20%, còn 15 vàng; console không lỗi.

**Giới hạn đã biết:** chưa có nút xem quảng cáo (giai đoạn D). Trong khung xem trước của Claude Desktop, cú
chạm đầu tiên sau khi tải trang có thể bị bỏ qua nếu khung đang ẩn (game chưa chạy đủ 0,5 giây chống chạm
nhầm) — trên điện thoại thật không gặp.

**Nợ liên quan:** DEBT-009 (giá và hạn chưa qua chơi thử).

## Hàng chờ (thứ tự do chủ dự án chốt — chưa duyệt)

Trống — đã làm hết kế hoạch sau B6 (`docs/plans/2026-10-27-ke-hoach-sau-b6.md`). Việc kế tiếp chờ chủ dự án
chốt: bảng rơi theo loài, chủ đề Băng / Núi lửa, quảng cáo (giai đoạn D).

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
