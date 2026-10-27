# Việc đang làm

## Đợt 0 — Dựng nền (21/10/2026)

- [x] Tìm hiểu và phân tích lối chơi Micro RPG → `docs/research/micro-rpg.md`
- [x] Chốt phong cách hình từ ảnh tham chiếu → `docs/ART_STYLE.md`
- [x] Cài Node 24 LTS và GitHub CLI (chủ dự án đã cho phép)
- [x] Đề xuất kiến trúc → `docs/ARCHITECTURE.md`
- [x] `CLAUDE.md`: mục đích nguyên văn, nguyên tắc kiểu Dune, đường cấm, lệnh, branch + tự kiểm chứng
- [x] `FEATURE_MAP.md` (khung)
- [x] `.claude/settings.json` phân quyền 3 vòng (chủ dự án chỉnh: chỉ hỏi khi xóa file)
- [x] CI GitHub Actions + luật bảo vệ nhánh dạng file (`.github/rulesets/main-protection.json`)
- [x] Bộ công cụ: package.json, TypeScript, Vite, Vitest, Playwright, ESLint, Prettier
- [x] `DEBT.md` — sổ nợ có chủ đích (nợ của phần nền)
- [x] Commit nền lên `main` (vỏ game + test khởi động, `npm run check` xanh)
- [x] Walking skeleton F01 "Trận đấu tối thiểu" trên branch `feat/walking-skeleton`
      (luật thuần + test viết trước, scene Phaser, E2E thắng/thua, nợ DEBT-007…009)
- [x] Tạo repo công khai `Nagias/pixel-game`, chủ dự án đẩy `main` lần đầu, CI `main` xanh
- [x] Bật luật bảo vệ nhánh `main` (ruleset 5 quy tắc, GitHub xác nhận đang áp dụng)
- [x] Agent rà code độc lập → sửa cả 8 điểm (lỗi giữ phím Space, vẽ theo state, chặn cấu hình sai…)
- [x] Đẩy branch `feat/walking-skeleton`, mở PR #1
- [x] CI xanh trên PR #1 → chủ dự án duyệt nền → gộp (squash) vào `main` (22/10/2026)

## Đợt 1 — F02 Thanh 3 nút vũ khí (22/10/2026)

Phạm vi chủ dự án chốt: thanh 3 nút, đổi vùng xanh, test; bỏ phím Space; không hiệu ứng mới,
không rìu, không skill.

- [x] Chốt luật cùng chủ dự án (có phác thảo màn hình): chỉ mobile, đổi vũ khí không tốn lượt
- [x] Luật: danh sách vũ khí trong config, `selectWeapon`, chém bằng vũ khí đang cầm (test trước)
- [x] Bố cục thanh nút + xác định chạm nút hay chạm sân (test trước)
- [x] Scene: thanh 3 nút, vùng xanh theo vũ khí; bỏ phím Space
- [x] E2E: đổi vũ khí, chém đúng vũ khí, thắng phải đổi vũ khí đúng lúc, thua
- [x] CLAUDE.md (chỉ mobile, đường cấm #15), FEATURE_MAP (F02, hàng chờ F07 kho vũ khí, F08 skill), DEBT-009
- [x] `npm run check`, mở PR #2, CI xanh, chủ dự án duyệt → gộp (22/10/2026)

## Đợt 2 — F03 Combo gom cụm (22/10/2026)

Phạm vi chủ dự án chốt: luật combo như đề xuất, mức tối thiểu, không thêm hiệu ứng.

- [x] Chốt luật cùng chủ dự án: con thứ n ăn n × sát thương; con ít máu trước, rồi gần nhân vật, rồi id
- [x] Test trước (đỏ) → code combo trong `playTurn` (xanh); sửa 2 test cũ theo luật mới đã duyệt
- [x] Mô phỏng 500 ván: ngắm chuẩn thắng 100% dư ~2,2 lượt; chém bừa thắng 0,2%
- [x] E2E: sát thương mỗi nhát đúng 1×, 2×, 3×…; có nhát trúng từ 2 quái trở lên
- [x] FEATURE_MAP (F03), DEBT-009
- [x] `npm run check`, mở PR #3, CI xanh, chủ dự án duyệt → gộp (22/10/2026)

## Việc lẻ — CI không tự hủy lần chạy trên main (22/10/2026)

Phát hiện khi gộp PR #3: GitHub tạo 2 lần chạy CI cho cùng commit gộp, lần đầu bị hủy.

- [x] Đổi nhóm chạy CI theo mẫu chính thức của GitHub: PR chung nhóm theo nhánh, main mỗi lần chạy một nhóm
- [x] Kiểm chứng trên PR #4: đẩy commit mới → lần chạy cũ (1ccc3ba) bị hủy, lần mới (b716d83) xanh
- [x] Chủ dự án duyệt → gộp PR #4 → lần chạy trên main (2e2fd07) xanh, không bị hủy

## Đợt 3 — F04 Máu nhân vật + dấu "!" (22/10/2026)

Phạm vi chủ dự án chốt: luật như đề xuất, mức tối thiểu, không thêm hiệu ứng.

- [x] Chốt luật: 5 máu; quái vòng 0 đứng yên đánh 1; hết máu thì thua (thay luật chạm là thua)
- [x] Test trước (đỏ) → code (xanh); `isThreatening` là nguồn duy nhất cho dấu "!"
- [x] Mô phỏng 500 ván: ngắm chuẩn thắng 100% dư ~2,2 lượt; chém bừa thắng 0,2%
- [x] Hiển thị: ô "Máu", dấu "!" đỏ, màn thua "Bạn đã gục"
- [x] E2E: máu giảm đúng số quái áp sát × sức đánh, có lượt bị đánh
- [x] FEATURE_MAP (F04), DEBT-008, DEBT-009
- [x] `npm run check`, mở PR #5, CI xanh, chủ dự án duyệt → gộp (22/10/2026)

## Đợt 4 — F05 Đẩy quái theo vũ khí (23/10/2026)

Phạm vi chủ dự án chốt: luật như đề xuất, mức tối thiểu, không thêm hiệu ứng/chữ mới.

- [x] Chốt luật: Kiếm đẩy lùi, Giáo đẩy phải, Cung kéo vào; bị chặn thì đứng yên; đẩy trước khi quái hành động; bị đẩy thì đứng yên lượt đó
- [x] Test trước (đỏ) → code (xanh); sửa 1 test "xanh nhầm" (ca Cung) để nó thật sự bắt được lỗi
- [x] Mô phỏng 500 ván: ngắm chuẩn thắng 100% dư ~2,36 lượt; chém bừa thắng 0,2%
- [x] E2E: Cung kéo quái vào đúng 1 vòng, giữ lát
- [x] FEATURE_MAP (F05), DEBT-009
- [x] `npm run check`, mở PR #6, CI xanh, chủ dự án duyệt → gộp (23/10/2026)

## Đợt 5 — F06 Màn chơi nối tiếp + trùm (23/10/2026)

Phạm vi chủ dự án chốt: luật như đề xuất, mức tối thiểu; không luật trùm riêng, không bản đồ màn,
không lưu tiến trình, không phần thưởng.

- [x] Chốt luật: 3 màn (4 slime/8 lượt · 6 slime/10 lượt · Slime Vua + 2 slime/12 lượt); Slime Vua 6 máu đánh 2; thua chơi lại màn đó; màn nào cũng đầy máu, cầm Kiếm
- [x] Test trước (đỏ) → code (xanh): loại quái + danh sách màn trong cấu hình, `nextLevelIndex`, `isGameCleared`
- [x] Hình Slime Vua (lưới ký tự, tạm như DEBT-007)
- [x] Mô phỏng 500 ván mỗi màn: ngắm chuẩn thắng 100% / 99,8% / 100%; màn trùm dư nhiều lượt nhất → báo chủ dự án
- [x] Hiển thị: "Màn x/3", màn kết quả ghi rõ chạm để làm gì, "PHÁ ĐẢO!"; sửa thanh trên đè chữ khi số lượt có 2 chữ số
- [x] E2E: đi liền 3 màn tới phá đảo rồi về màn 1; thua ở màn 2 thì chơi lại màn 2
- [x] FEATURE_MAP (F06), DEBT-007, DEBT-009
- [ ] `npm run check`, mở PR #7, CI xanh, chủ dự án duyệt → gộp

## Kế hoạch sau B6, đợt 1 — F11 Thắng bằng nhiệm vụ + quái ra theo đợt (27/10/2026)

Phạm vi chủ dự án chốt: "cứ làm theo gợi ý" — 1 nhiệm vụ chính "giết N con loại X", đợt kế ra khi sân
còn ≤ ngưỡng, xong nhiệm vụ là thắng ngay, ô "Slime 3/6" thay "Quái: n". Màn theo chủ đề (~20 màn mỗi
chủ đề) để đợt 7; đợt này chỉ làm cho dữ liệu màn mở rộng được.

- [x] Test luật trước (đỏ) → code (xanh): `quest`, `waves`, `nextWaveAt`, chặn màn bất khả thi
- [x] Thanh trên "Slime 2/6", màn chuẩn bị ghi nhiệm vụ, màn kết quả "Xong nhiệm vụ"
- [x] Bot: ngắm chuẩn ưu tiên quái nhiệm vụ; nhìn trước tính "việc còn phải làm" (test trước)
- [x] `npm run tune` → áp số cho 5 màn, `balance.test.ts` xanh
- [x] E2E: ván seed 42 qua 5 màn bằng nhiệm vụ, ảnh đợt quái mới
- [x] Thử tay khung 375×760 theo `docs/MANUAL_TEST.md`
- [x] FEATURE_MAP (F11), `npm run check`, mở PR, chủ dự án duyệt (PR #23 gộp 27/10/2026)

## Kế hoạch sau B6, đợt 2 — F12 Thêm loại quái (27/10/2026)

Phạm vi chủ dự án chốt: "làm theo gợi ý của agent" — chọn 3–4 loại, tên và hình agent phác.

- [x] Chọn Slime Con, Slime Lao, Slime Khiên → bỏ Khiên (hết mồi là màn kẹt), thay Slime Ma
- [x] Test luật trước → code: `step`, `ghost`; hình 3 quái; màn 6–7
- [x] Bot: ngắm chuẩn giữ skill tới lượt Ma hiện hình (test trước)
- [x] Dò số màn 6–7 (script tạm + `npm run tune`), đo người biết câu đố so với không biết
- [x] E2E qua đủ 7 màn, ảnh màn 6 và Ma vô hình; thử tay màn 6–7 khung 375×760
- [ ] FEATURE_MAP (F12), `npm run check`, mở PR, chủ dự án duyệt
