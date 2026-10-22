# Pixel Game (tên tạm)

Game pixel lấy cảm hứng từ Micro RPG: nhân vật đứng giữa vòng tròn, vùng xanh quay quanh, chạm
đúng lúc để chém mọi quái trong vùng trước khi hết lượt hoặc trước khi quái áp sát.

## Chạy thử

Cần Node 24 LTS.

```bash
npm install
```

```bash
npm run dev
```

Mở http://localhost:5173 (thêm `?seed=42` để chơi lại đúng một ván).

## Kiểm tra trước khi gửi thay đổi

```bash
npm run e2e:setup
```

```bash
npm run check
```

## Tài liệu

- `CLAUDE.md` — luật làm việc (cho người lẫn agent)
- `docs/ARCHITECTURE.md` — kiến trúc và lý do chọn công nghệ
- `FEATURE_MAP.md` — tính năng đang có
- `DEBT.md` — các đường tắt đang nợ
- `docs/research/micro-rpg.md` — phân tích game tham chiếu
