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
- [ ] CI xanh trên PR #1 → chủ dự án duyệt nền → gộp (squash) vào `main`
- [ ] Bắt đầu tính năng thứ hai theo quy trình (sau khi nền được duyệt)
