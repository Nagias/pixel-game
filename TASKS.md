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
- [ ] `npm run check`, mở PR #3, CI xanh, chủ dự án duyệt → gộp

## Việc lẻ — CI không tự hủy lần chạy trên main (22/10/2026)

Phát hiện khi gộp PR #3: GitHub tạo 2 lần chạy CI cho cùng commit gộp, lần đầu bị hủy.

- [x] Đổi nhóm chạy CI theo mẫu chính thức của GitHub: PR chung nhóm theo nhánh, main mỗi lần chạy một nhóm
- [ ] Kiểm chứng trên PR: đẩy commit mới → lần chạy cũ của PR bị hủy, lần mới xanh
- [ ] Chủ dự án duyệt → gộp → xác nhận lần chạy trên main xanh, không bị hủy
