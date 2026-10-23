# Bộ việc mẫu chuẩn (bench)

Thước đo **đội agent** của dự án (CLAUDE.md, skill, agent): 6 việc tiêu biểu có đáp án rõ ràng, chấm
được bằng máy và bằng giám khảo độc lập. Không thuộc game — game không import gì từ đây.

## Luật (chủ dự án chốt ngày 23/10/2026)

> Mỗi lần sửa skill hoặc agent, phải chạy lại bộ việc mẫu này và báo cáo điểm trước/sau.

- "Sửa skill hoặc agent" = thêm, xoá hoặc đổi bất kỳ file nào trong `.claude/skills/`,
  `.claude/agents/`, `.claude/commands/`. Sửa phần quy trình trong `CLAUDE.md` cũng nên chạy.
- "Trước/sau" = chạy **cả cấu hình cũ lẫn cấu hình mới**, cùng ngày, cùng model, rồi ghi bảng điểm
  vào `results.md` và dán vào PR. Không so với điểm cũ của tháng trước — model đổi thì điểm đổi.
- Điểm mới thấp hơn điểm cũ thì không gộp thay đổi đó nếu chưa giải thích được vì sao.

## 6 việc mẫu

| Việc | Loại việc đại diện                                   | Lời giao việc (rút gọn)                        | Máy chấm | Giám khảo |
| ---- | ---------------------------------------------------- | ---------------------------------------------- | -------- | --------- |
| T1   | Thêm luật chơi đã duyệt (test trước, code sau)       | Diệt từ 3 quái trong 1 nhát thì hồi 1 máu      | 7        | 3         |
| T2   | Sửa lỗi người chơi báo (phần nhận chạm)              | Chạm vào khe giữa 2 nút vũ khí bị tính là chém | 7        | 3         |
| T3   | Chỉnh số cân bằng + giữ tài liệu khớp                | Giảm máu nhân vật từ 5 xuống 4                 | 7        | 3         |
| T4   | Đề xuất luật để chủ dự án duyệt (không được code)    | Đề xuất luật vũ khí Rìu                        | 3        | 7         |
| T5   | Yêu cầu đụng đường cấm (phải hỏi lại, không làm bừa) | Thêm phím Space để chém                        | 4        | 6         |
| T6   | Soát hình: đổi số nhỏ kéo theo chữ đè nhau           | Tăng số lượt từ 8 lên 12                       | 6        | 4         |
|      |                                                      | **Tổng 60 điểm**                               | **34**   | **26**    |

Mỗi thư mục việc có: `prompt.md` (lời giao việc gửi nguyên văn), `task.md` (đáp án + thang điểm),
test ẩn (`acceptance.*`), `reference.patch` (lời giải mẫu) hoặc `negative.patch` (mẫu làm sai).

**Đề thi đóng băng** ở commit `58c9d29` (game ở F05, trước khi có `bench/`). Người làm bài không thấy
đáp án vì thư mục này chưa tồn tại ở commit đó. Game có đổi bao nhiêu cũng chấm trên cùng một đề, nên
điểm các lần chạy so được với nhau. Khi đề không còn đại diện cho việc thật nữa thì ra đề mới (bench
v2) và chạy lại mốc "trước".

## Máy chấm những gì

`node bench/bench.ts grade …` chấm 4 loại mục (tuỳ việc):

- **Test ẩn**: chép vào bài làm lúc chấm, chạy, rồi gỡ ra. Chỉ dùng API có sẵn ở commit gốc.
- **`npm run check` xanh** (giống CI).
- **Phạm vi file + luật cấm**: chỉ được đổi file trong danh sách cho phép; không phạm đường cấm mà
  ESLint chưa chặn (#7 `test.skip` không mã DEBT, #15 điều khiển bằng bàn phím).
- **Đổi đủ file bắt buộc** (vd. có test mới, có cập nhật FEATURE_MAP).

Hai chốt chặn để điểm không sai:

- **Cổng "có làm bài"**: việc có code mà bài không đổi file nào thuộc phần được giao thì mọi điểm máy
  về 0 (bài bỏ trống không được ăn điểm "check xanh" hay các ca test phòng hờ).
- **Máy quá tải**: còn dưới 3 GB bộ nhớ ảo trống thì bộ chấm từ chối chạy; log có dấu hiệu hết bộ nhớ
  hay trình duyệt sập thì lần chấm bị đánh dấu **không hợp lệ** (không cho, không trừ điểm) — phải
  chấm lại.

Các mục **J** cần phán đoán do giám khảo chấm theo `judge.md`.

## Cách chạy một lượt (cho một cấu hình)

Chạy **lần lượt từng việc**, không chạy song song: E2E của các bài làm dùng chung cổng 4173 và cùng ăn
bộ nhớ máy. Đóng bớt ứng dụng nặng trước khi chạy.

1. **Chuẩn bị chỗ làm bài** ở một thư mục **ngoài thư mục dự án** (cần chủ dự án đồng ý lần đầu):

   ```bash
   node bench/bench.ts prepare --runs-dir "<thư mục ngoài dự án>" --run <tên-lượt> --task all --config <git ref | working>
   ```

   Vì sao phải ngoài dự án: Claude tự đọc cả `CLAUDE.md` của **các thư mục cha**. Chỗ làm bài nằm trong
   dự án thì phiên làm bài đọc cả CLAUDE.md của bản đang mở — cấu hình bị trộn, so trước/sau mất ý
   nghĩa. `--config working` lấy cấu hình agent đang sửa dở trong thư mục dự án; `--config <git ref>`
   lấy từ một commit/nhánh.

2. **Giao việc**: mở một phiên Claude **mới** trong thư mục `<tên-lượt>/<việc>`, gửi nguyên văn nội dung
   file `<tên-lượt>/<việc>.prompt.md`. Không nhắc gì thêm, không trả lời giữa chừng.
3. **Lưu báo cáo**: khi phiên làm xong, chép nguyên văn tin nhắn cuối của nó vào
   `<tên-lượt>/<việc>.report.md`.
4. **Máy chấm**: `node bench/bench.ts grade --runs-dir "<…>" --run <tên-lượt> --task <việc>` → ghi
   `<việc>.grade.json` và `<việc>.grade.log`.
5. **Giám khảo chấm**: theo `judge.md`.
6. **Ghi điểm**: cộng điểm máy + giám khảo, ghi vào `results.md`.

Mặc định chạy **2 lần mỗi việc** cho mỗi cấu hình và lấy trung bình: kết quả của agent dao động giữa các
lần, 6 việc là ít (chuyên gia hệ nhiều agent khuyên ≥ 20 ca), nên chênh lệch nhỏ có thể chỉ là ngẫu
nhiên. Sau vài lượt đầu sẽ đo được mức dao động thật để biết chênh bao nhiêu mới đáng tin.

Dọn chỗ làm bài sau khi đã ghi điểm (xoá thư mục — hỏi chủ dự án trước):

```bash
node bench/bench.ts cleanup --runs-dir "<…>" --run <tên-lượt>
```

Lệnh này gỡ lối tắt `node_modules` trước (không đụng thư viện thật của dự án) rồi mới gỡ bài làm.

## Khi sửa chính bộ việc mẫu

Sửa đề, test ẩn, lời giải mẫu hay `bench.ts` thì phải chạy **tự kiểm tra đáp án**:

```bash
node bench/bench.ts selftest --runs-dir .cache/bench-runs
```

Đạt khi, với mọi việc: lời giải mẫu được trọn điểm máy; bài bỏ trống được 0 điểm máy và test ẩn hỏng ít
nhất một ca trên bản gốc; mẫu làm sai mất điểm phạm vi. (Ở đây dùng `.cache/` trong dự án được vì không
có phiên Claude nào làm bài.)

## Giới hạn đã biết

- 6 việc là mẫu nhỏ: đo được xu hướng lớn, không đo được chênh lệch nhỏ.
- Skill/agent cài cho mọi project (`~/.claude/`) và trí nhớ của Claude cũng tác động lên bài làm; bộ
  việc mẫu chỉ đổi được phần nằm trong repo.
- 22/50 điểm do giám khảo chấm — đã giảm cảm tính bằng tiêu chí có/không và bắt trích dẫn bằng chứng,
  nhưng vẫn có thể lệch giữa các model giám khảo; luôn dùng cùng model khi so sánh.
- Test ẩn chỉ dùng API của commit gốc. Bài làm đổi tên/chữ ký hàm có sẵn thì test ẩn hỏng — đúng ý đồ
  (đề không yêu cầu đổi API), nhưng cần đọc log trước khi kết luận.
