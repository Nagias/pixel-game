# Lộ trình sau F06

> Bản đề xuất ngày 26/10/2026, chủ dự án đã duyệt (PR #9); tiến độ ở mục "Trạng thái". Thứ tự và phạm vi do chủ dự án chốt; agent
> không tự đặt luật chơi hay con số (CLAUDE.md mục 2.3). Mọi phương án và con số trong file này là
> **đề xuất của agent để chủ dự án chọn**, chưa phải luật. Mỗi đợt xong mới bàn đợt sau.
> Nguồn: `FEATURE_MAP.md`, `DEBT.md` (nhánh `feat/levels-boss`), `docs/research/micro-rpg.md`,
> `docs/agent-team.md`, `bench/README.md`; phần nội dung game có góp ý của chuyên gia Game Designer
> (agency-agents); bản này đã qua chấm chéo độc lập (mục 7).

## Trạng thái (cập nhật 27/10/2026)

| Đợt   | Trạng thái | Ghi chú                                                                                                                                                                                                                                                                                                  |
| ----- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1    | ✅ Xong    | F06 gộp vào `main` (PR #7)                                                                                                                                                                                                                                                                               |
| A2–A4 | ⏸️ Dừng    | Đo bài T6 + T2: chưa có đội 19/20, có đội 19/20 nhưng tốn ~3,5 lần token → chủ dự án quyết **tạm không dùng đội agent**; bản cất ở `D:\26. Archive\doi-agent-2026-10-26` (`docs/agent-team.md` mục 10, `bench/results.md`). Các đợt B chạy theo `docs/plans/` + kiểm chứng 3 lớp (`docs/MANUAL_TEST.md`) |
| B1    | ✅ Xong    | Sửa chạm khe (PR #12), công cụ `npm run sim` (PR #13), màn trùm 6 máu + 3 slime, 10 lượt (PR #15) — kế hoạch `docs/plans/2026-10-26-sua-nen.md`                                                                                                                                                          |
| B2    | ✅ Xong    | Rìu chém hai phía + **màn 4** quái tới từ hai phía (PR #16, F07a) — kế hoạch `docs/plans/2026-10-26-riu.md`. Màn 4 thêm vì mô phỏng cho thấy ở màn 1–3 quái không bao giờ ở cả hai phía                                                                                                                  |
| B3    | ✅ Xong    | Quái bắn xa **Slime Pháo** + **màn 5** (F09) — kế hoạch `docs/plans/2026-10-26-quai-ban.md`                                                                                                                                                                                                              |
| B4    | ✅ Xong    | Màn chuẩn bị trận, mỗi tầm một món (F07, kế hoạch `docs/plans/2026-10-27-chon-do.md`)                                                                                                                                                                                                                    |
| B5–B6 | ⏳ Chưa    | B5 (thêm màn) đã có một phần: màn 4, màn 5                                                                                                                                                                                                                                                               |
| C, D  | ⏳ Chưa    | —                                                                                                                                                                                                                                                                                                        |

## 1. Kết luận

Bốn giai đoạn. A rồi B làm tuần tự; C và D làm khi chủ dự án muốn.

- **A — chốt cái đang dở + dựng đội agent:** gộp F06, đo mốc bộ việc mẫu, cài đội agent, đo lại.
- **B — nội dung game:** sửa nền (lỗi chạm khe, công cụ mô phỏng, màn trùm đang dễ hơn màn 2) → Rìu
  → một loại quái mới → chọn 3 món → thêm màn → Skill.
- **C — đồ họa thật** (hình, font pixel). Không bắt buộc trước B, nhưng nên xong trước B4 (màn hình
  chọn món) để khỏi vẽ màn hình mới hai lần.
- **D — trước phát hành.**

Vì sao A trước B: để mọi đợt B chạy qua luồng đội agent (làm và chấm tách nhau) ngay từ đầu, thay vì
một phiên tự làm tự chấm.

## 2. Giai đoạn A — chốt cái đang dở, dựng đội agent

| #   | Việc                                                                                                     | Ai làm                                                                     | Chủ dự án quyết                                     | Xong khi                                                      |
| --- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| A1  | Gộp F06 (PR #7): cập nhật nhánh theo `main`, chờ CI xanh                                                 | Phiên chính                                                                | Duyệt gộp                                           | F06 có trên `main`, CI `main` xanh                            |
| A2  | Chạy mốc "trước" của `bench/` với cấu hình hiện tại                                                      | Mỗi bài một phiên Claude **mới** ở thư mục ngoài dự án (`bench/README.md`) | Thư mục chạy (vd. `D:\26. Bench`), đồng ý tốn quota | `bench/results.md` có điểm 6 bài × 2 lần, đã chấm phần judged |
| A3  | Cài đội: 8 skill đã chỉnh, `nguoi-lam`, `giam-khao`, bảng soát hình, `LESSONS.md`, 2 dòng luật CLAUDE.md | Phiên chính, theo `docs/agent-team.md` mục 5, 8, 9                         | Duyệt PR                                            | PR có bảng điểm trước/sau, điểm không giảm                    |
| A4  | Chọn model cho `giam-khao` (khác người làm)                                                              | Đo bằng `bench/`                                                           | Chỉ khi điểm ngang nhau                             | Model chọn có điểm cao nhất ở phần judged                     |

- **Đã xong trước đó:** viết T6 và kiểm đáp án T1–T3, T6 (selftest đạt cả 6 bài, PR #8). Mục 9 bước 1
  của `agent-team.md` vì vậy đã xong.
- **Chi phí ước lượng:** mỗi cấu hình 6 bài × 2 lần = 12 phiên làm bài + chấm. Mốc "trước" (A2) và
  "sau" (A3) cộng lại khoảng 24 phiên làm bài, mỗi lần đổi model giám khảo (A4) thêm phần chấm. Mỗi
  phiên tương đương một việc code nhỏ, nên tốn quota đáng kể và chiếm máy vài giờ. Chạy lần lượt, không
  song song (E2E dùng chung cổng). Máy cần ≥ 3 GB bộ nhớ ảo trống.
- **A2 và lần đo "sau" của A3 là một đợt đo liền nhau:** `bench/README.md` bắt chạy trước/sau cùng
  ngày, cùng model (model đổi thì điểm đổi). Cài đội xong mà đã sang ngày khác hoặc model đã đổi thì
  chạy lại mốc "trước".
- A1 không phụ thuộc A2/A3, làm trước hay xen giữa đều được — miễn không chen vào giữa một đợt đo.

## 3. Giai đoạn B — nội dung game

**Luồng mỗi đợt (sau khi A3 xong):** Điều phối [giao-viec] lập kế hoạch + tiêu chí → trình chủ dự án
các câu hỏi ở mục 3.2 → `nguoi-lam` [kiem-chung, duy-tri-feature-map] test đỏ → code → `npm run check`
→ ảnh E2E → `giam-khao` chấm độc lập [cham-cheo] → sửa tối đa 3 vòng [loop-toi-chuan] → chủ dự án duyệt
PR. Lỗi phát hiện dọc đường → [sua-thanh-luat] ghi `LESSONS.md`.

### 3.1. Các đợt

| #   | Đợt                                                     | Nguồn                                                     | Người chơi được gì                             | Cỡ · rủi ro                                                    | Xong khi                                                                             |
| --- | ------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| B1  | Sửa nền: lỗi chạm khe + công cụ mô phỏng + cân màn trùm | Lỗi đã thấy; số đo F06                                    | Hết bị chém oan; màn trùm thành thử thách thật | S–M · thấp                                                     | E2E chạm khe không mất lượt; lệnh mô phỏng có trong repo; màn 3 dư ít lượt hơn màn 2 |
| B2  | Rìu                                                     | Hàng chờ F07 (chủ dự án nêu "rìu và vũ khí khác")         | Món thứ 4 có cách đánh khác                    | M · trung bình (hình vùng đánh mới trong `arena.ts`, hình nêm) | Unit: vùng Rìu vẽ ra khớp vùng luật; mô phỏng có tình huống Rìu tốt hơn Kiếm         |
| B3  | Một loại quái mới                                       | Đề xuất (research mục 4 ý 5: mỗi loại quái là một câu đố) | Câu đố mới, ngắm chuẩn thôi không đủ thắng     | S–M · thấp (`monsterKinds` đã có chỗ thêm)                     | Mô phỏng: tỉ lệ thắng màn có quái mới đúng mức chủ dự án chọn                        |
| B4  | Chọn 3 món mang vào trận                                | Hàng chờ F07 (chủ dự án)                                  | Quyết định trước trận                          | M · cao hơn (màn hình mới, sửa luồng E2E)                      | E2E đi đủ luồng chọn → chơi; mô phỏng: các bộ 3 món cho tỉ lệ thắng khác nhau        |
| B5  | Thêm màn                                                | Đề xuất                                                   | Chơi dài hơn                                   | S · thấp (thêm dòng `levels`)                                  | Mô phỏng: lượt dư giảm dần theo màn                                                  |
| B6  | Skill                                                   | Hàng chờ F08 (chủ dự án)                                  | Chờ chủ dự án mô tả cơ chế                     | Chưa ước được                                                  | Đặt tiêu chí khi có mô tả                                                            |

- **B1 gồm công cụ mô phỏng** vì repo hiện **không có** script mô phỏng — các số "500 ván" trong
  FEATURE_MAP và DEBT-009 chỉ còn trên giấy. Các đợt B1–B5 đều đo bằng tỉ lệ thắng và lượt dư, nên cần
  một lệnh cố định (RNG có seed, in thắng % và lượt dư theo màn) để các đợt so được với nhau. Công cụ
  chỉ gọi luật thuần trong `logic/` và `src/shared/random.ts`; cách chơi "giỏi" của nó phải trùng cách
  chơi của `e2e/support/battleDriver.ts` (file này đã ghi "cùng cách chơi với mô phỏng"). Chỗ đặt file
  và tên lệnh chốt trong kế hoạch B1, ghi vào FEATURE_MAP.
- **Lỗi chạm khe là sửa theo tài liệu**, không phải luật mới: FEATURE_MAP F02 đã ghi chạm khe "không
  làm gì"; code đang làm ngược.
- **Đề xuất tách F07 thành B2 + B4** (chưa phải mã chính thức): Rìu trước vì chỉ có 3 vũ khí thì chọn 3
  món chẳng có gì để chọn; quái mới (B3) tạo lý do phải chọn vũ khí. Mở khóa vũ khí dần qua màn cần lưu
  tiến trình — để ở giai đoạn D.
- **Skill để cuối** vì chưa có mô tả và có thể gắn với vũ khí — làm sớm dễ phải làm lại. Nếu Skill là
  của nhân vật, không dính vũ khí, thì chen ngay sau B1 được.
- **Nợ liên quan:** DEBT-009 (con số cân bằng là phỏng đoán) có điều kiện trả "khi thêm vũ khí/quái
  mới" — trả dần ở B1–B3 khi đã có công cụ mô phỏng. DEBT-005 (chặn import chéo tính năng) đến hạn nếu
  màn chọn món ở B4 được làm thành tính năng riêng trong `src/features/`.

### 3.2. Câu hỏi chủ dự án trả lời khi tới đợt đó

Phương án và số dưới đây là **đề xuất minh họa của agent**; gợi ý của agent đánh dấu (gợi ý).

**B1**

- Luật "nút chạm phải đủ to cho ngón tay" (chờ quyết từ 23/10): thêm hay không.
- Tỉ lệ thắng mục tiêu mỗi màn khi chơi giỏi.
- Làm màn trùm khó lên bằng: (a) bớt lượt (gợi ý — chỉ đổi 1 số) · (b) trùm trâu hơn hoặc thêm slime ·
  (c) cơ chế trùm riêng như Micro RPG (research mục 3: trùm chỉ mất máu khi trúng combo ≥ 3, có khiên)
  — luật mới, cỡ M.

**B2 — Rìu**

- Hình vùng đánh: (a) chém trước–sau, hai nêm đối nhau (gợi ý — FEATURE_MAP F02 đã nêu hướng này) ·
  (b) quét trọn một vòng quanh người (dễ quá mạnh) · (c) một dải vòng khác Kiếm/Giáo/Cung.
- Kiểu đẩy: không đẩy, đẩy lùi, hay khác.

**B3 — Quái mới** (các loại Micro RPG có, research mục 3)

- (a) quái lao — tiến nhanh hơn (gợi ý, gần như chỉ thêm con số) · (b) quái bắn xa — đánh từ xa sau
  dấu "!" (cỡ M–L) · (c) quái né đòn đầu.

**B4 — Chọn 3 món**

- Chọn khi nào: trước mỗi màn (gợi ý) · một lần cho cả ván · cố định theo màn.
- Có bắt buộc đủ 3 tầm gần/vừa/xa không (chọn 3 món tầm gần thì đầu trận mất lượt chờ quái lại).

**B5**

- Bao nhiêu màn, màn nào có trùm.

### 3.3. Không nên làm sớm

- **Tiền tệ, rương ngẫu nhiên, quảng cáo, sự kiện:** research mục 7 ghi "không học cho tới khi bạn yêu
  cầu"; mục 5 ghi người chơi chê Micro RPG vì ép xem quảng cáo/nạp tiền và nhiều loại tiền chồng chéo.
- **Lên cấp vũ khí** (Micro RPG có, research mục 3): agent khuyên để sau vì nó che việc cân bằng — thua
  thì đi nâng cấp chứ không phải ngắm tốt hơn.
- **Máu mang sang màn sau** (Micro RPG có): trái luật F06 (màn nào cũng bắt đầu đầy máu; thua thì chơi
  lại đúng màn đó) và làm mô phỏng từng màn hết dùng được.

## 4. Giai đoạn C — đồ họa thật

| Việc                                                                                            | Ai làm                                                         | Chủ dự án quyết            | Xong khi                                                         |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| Trả DEBT-007 (hình nhân vật/quái)                                                               | Agent `thiet-ke-hinh`, tạo lúc bắt đầu (`agent-team.md` mục 8) | Duyệt hình mẫu trước       | Hình mới trong game, giữ tên texture, ảnh E2E qua bảng soát hình |
| Trả DEBT-008 (font pixel có dấu tiếng Việt, co giãn theo bội số nguyên, quái áp sát chồng hình) | `thiet-ke-hinh` + `nguoi-lam`                                  | Duyệt font (giấy phép OFL) | Font đóng gói trong repo, chữ tiếng Việt đọc rõ trên ảnh E2E     |
| Sửa lệch `ART_STYLE.md` (ghi màu `leaf`, bảng màu không có; code vẽ bằng `lime`)                | `nguoi-lam`                                                    | —                          | Tài liệu khớp code                                               |
| DEBT-004 (so ảnh chụp tự động) — điều kiện trả là "khi phong cách đồ họa ổn định"               | `nguoi-lam`                                                    | —                          | `toHaveScreenshot` chạy trong CI                                 |

Thêm agent `thiet-ke-hinh` là sửa agent → phải chạy `bench/` trước/sau, cộng một bài đồ họa riêng.
Chưa kiểm chứng công cụ tạo ảnh nào trên máy — có thể vẫn cần người vẽ.

## 5. Giai đoạn D — trước phát hành (chưa có ngày)

| Việc                                                             | Xong khi                                       |
| ---------------------------------------------------------------- | ---------------------------------------------- |
| DEBT-001: rà Phaser 3 → 4                                        | Có quyết định giữ/chuyển, ghi trong DEBT.md    |
| DEBT-002: chỉ gắn cầu nối test khi build có cờ test              | Bản phát hành không có `window.__PIXEL_GAME__` |
| DEBT-003: thêm E2E Safari/iPhone (`webkit`)                      | CI chạy cả Chromium và WebKit, xanh            |
| Lưu tiến trình + mở khóa vũ khí dần (nếu chủ dự án muốn)         | Tải lại trang không mất màn đã qua; có test    |
| Nơi phát hành (web, itch.io, cửa hàng ứng dụng) — chủ dự án chọn | Bản chơi được ở nơi đã chọn                    |

Nợ hạ tầng không gắn giai đoạn nào, trả khi điều kiện tới: DEBT-006 (cờ IPv4 khi tải Chromium — khi
mạng hết lỗi IPv6), DEBT-010 (ghim máy CI Ubuntu 24.04 — khi Playwright hỗ trợ Ubuntu 26).

## 6. Việc cần chủ dự án quyết ngay để bắt đầu

Ba việc ban đầu (duyệt thứ tự A → B, gộp F06, thư mục chạy `bench/`) đã xong ngày 26/10/2026 — xem
mục "Trạng thái". Việc cần quyết tiếp theo: loại quái của B3 (mục 3.2).

## 7. Chấm chéo bản lộ trình

Giám khảo độc lập (Reality Checker, model Sonnet, không thấy quá trình viết) chấm bản nháp đầu **6/12,
chưa đạt**. Đã sửa: lý do A trước B, cách chạy và chi phí A2, thêm công cụ mô phỏng vào B1, bỏ câu hỏi
thừa về chạm khe, ghi rõ phương án là đề xuất minh họa, sửa trích dẫn research và xếp lại DEBT-004/005/
006/009/010, gỡ mâu thuẫn C với B, gom "lưu tiến trình" về một chỗ, thêm cột "Xong khi" cho C, D.

Chấm lại: **10/12**. Giám khảo công nhận phần kiểm đáp án T1–T3 đã xong ở PR #8 (lần đầu họ chấm sai
chỗ này). Hai lỗi còn lại đã sửa: A2 và A3 phải là một đợt đo cùng ngày, cùng model; nói rõ công cụ mô
phỏng dùng gì. Bản cuối chưa được chấm lần ba.
