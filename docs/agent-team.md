# Đội agent cho dự án — đánh giá và phương án chốt

Ngày 23/10/2026. Đầu vào: bộ 10 skill "claude-skills-mau" (bản Muse phỏng theo Lauren Tan) chủ dự án
gửi, và 133 agent chuyên gia của bộ agency-agents đã cài ở `~/.claude/agents/` (máy không có bản clone
riêng của repo). Thước đo mọi thay đổi về sau: `bench/` (bộ việc mẫu).

## 1. Kết luận (bản chốt ngày 23/10/2026 — chờ chủ dự án duyệt)

- **Đội:** phiên Claude chính làm điều phối + 2 agent thường trực `nguoi-lam`, `giam-khao` + 1 agent
  khi cần `thiet-ke-hinh` (chỉ tạo khi bắt đầu làm hình thật). Chuyên gia có sẵn gọi khi cần, không
  chép thành file.
- **Luồng tự động:** chủ dự án nói việc bằng lời thường → làm → chấm độc lập → làm lại tối đa 3 vòng →
  báo cáo. Không gõ lệnh, không gọi skill bằng tay. Chi tiết: mục 5.
- **Nguồn:** hai vai và 8 skill quy trình lấy từ thư mục skill của chủ dự án; cách làm nghề của từng
  vai học từ agency-agents và repo Claude-Code-Game-Studios; luật riêng lấy từ CLAUDE.md. Chi tiết:
  mục 6.
- **Không cài nguyên repo Game Studios** vào dự án (mục 7).
- Skill là _quy trình_; agent là _người giữ vai_. Skill của agent khai trong trường `skills:` của file
  agent — Claude Code nạp sẵn toàn văn khi agent khởi động, nên không phụ thuộc chuyện skill có tự
  kích hoạt hay không.

## 2. Bộ skill trong thư mục: dùng được không, kích hoạt khi nào

"Kích hoạt khi" lấy từ `description` — chính là điều kiện Claude dùng để tự nạp skill.

| Skill               | Kích hoạt khi                                                                      | Dùng ở dự án này | Lý do / phải chỉnh gì                                                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| giao-viec           | Chủ dự án giao việc mới, hoặc nhận việc từ hàng đợi có tiêu chí rõ                 | Có, cần chỉnh    | Gần như mọi lượt đều khớp. Trùng việc với CLAUDE.md mục 6–7 và skill superpowers (brainstorming, writing-plans). Phải ghi rõ thứ tự với luật cá nhân "tính năng lớn bắt đầu bằng brainstorming" |
| kiem-chung          | Trước khi nói "xong/đã sửa"; khi xác nhận thay đổi đúng yêu cầu; khi tái hiện lỗi  | Có               | Khớp gần trọn "bài thử gom jabbar" (`npm run check`, ảnh E2E, tra FEATURE_MAP). Trùng superpowers:verification-before-completion — chọn một                                                     |
| cham-cheo           | Trước khi chốt sản phẩm/PR quan trọng; khi người làm cũng là người chấm            | Có               | Claude Desktop cho agent phụ dùng model khác (Sonnet, Haiku…). Trùng một phần superpowers:requesting-code-review và lệnh `/code-review`                                                         |
| loop-toi-chuan      | Đầu ra chưa đạt rubric, hoặc chủ dự án đòi chất lượng cao                          | Có, cần chỉnh    | Cần rubric theo loại việc — `bench/*/task.md` là bộ rubric đầu tiên. Chủ dự án hay nói "chất lượng ưu tiên" nên sẽ kích hoạt thường xuyên, tốn thêm vòng                                        |
| sua-thanh-luat      | Mỗi khi phát hiện lỗi                                                              | Có, cần chỉnh    | Dự án chưa có "sổ lỗi" (DEBT.md là sổ đi tắt cố ý, khác sổ lỗi) — phải chỉ định nơi ghi. "Mức tự chủ" = phân quyền 3 vòng (CLAUDE.md mục 4). Rất hợp: xem ví dụ lỗi chạm khe ở mục 6            |
| tao-feature-map     | Chưa có FEATURE_MAP.md, hoặc có khu vực sản phẩm chưa có trong bản đồ              | Không cài        | Dự án đã có bản đồ. Skill đòi khuôn 5 ý/tính năng khác khuôn hiện tại → nếu kích hoạt có thể viết lại bản đồ. Muốn 5 ý thì sửa khuôn FEATURE_MAP một lần (chủ dự án quyết)                      |
| duy-tri-feature-map | Mọi thay đổi đụng tính năng, giao diện, luồng người dùng, cách thao tác            | Có, cần chỉnh    | Trùng luật sẵn có (cập nhật trong cùng PR) nhưng thêm dòng xác nhận "Feature map: đã cập nhật mục X / không bị ảnh hưởng" — có ích. Bỏ tham chiếu khuôn 5 ý                                     |
| lam-vuon            | Chủ dự án yêu cầu rà soát chất lượng, hoặc cùng một mẫu xấu xuất hiện từ 3 lần     | Có               | "Cầm máu" ở dự án này chính là thêm luật ESLint (cột "Máy chặn bằng"). Khi quét thì giao cho chuyên gia Codebase Archaeologist                                                                  |
| truc-ca             | Có đợt đầu vào mới (issue, báo lỗi, phản hồi), hoặc đầu một phiên vận hành tự động | Không cài (chưa) | CLAUDE.md chưa định nghĩa nguồn đầu vào (chưa dùng GitHub Issues), chưa có phiên tự động. Chữ "đầu một phiên" dễ làm skill kích hoạt nhầm ở đầu phiên thường                                    |
| ban-giao            | Kết thúc phiên/ca dài, hoặc trước khi dừng một chuỗi việc chưa xong                | Có               | "File trạng thái" = `TASKS.md` (luật cá nhân của chủ dự án đã yêu cầu)                                                                                                                          |

Ba vấn đề chung của bộ skill:

1. **6/10 `description` tóm tắt luôn quy trình** (giao-viec, lam-vuon, cham-cheo, loop-toi-chuan,
   tao-feature-map, truc-ca). Theo hướng dẫn viết skill (superpowers:writing-skills), khi description
   tóm tắt các bước, agent hay làm theo bản tóm tắt mà bỏ qua thân skill. Description chỉ nên nói
   "dùng khi nào".
2. **Trùng giờ kích hoạt với skill superpowers** đang bật cho mọi project. Hai skill cùng khớp một lúc
   thì không đoán trước được cái nào chạy. Cách gọn: thêm một dòng ưu tiên vào CLAUDE.md (CLAUDE.md đè
   lên skill), hoặc tắt plugin superpowers riêng cho dự án này — chủ dự án quyết.
3. **Tên gọi phải khớp dự án**: "sổ lỗi", "mức tự chủ", "file trạng thái", "nguồn đầu vào" chưa có hoặc
   mang tên khác ở đây.

## 3. Chuyên gia agency-agents: ai hợp dự án

Đã đọc toàn văn 16 agent, đọc phần sứ mệnh và luật của 10 agent khác, và mô tả của toàn bộ 69 agent
thuộc nhóm code, test, chuyên biệt, game. Điểm hợp (1–5) xét theo dự án này: game web canvas (Phaser),
luật thuần có test, cực gọn, chủ dự án quyết luật, chỉ cho mobile.

| Chuyên gia                    | Hợp | Vì sao                                                                                                                                                                                                                   |
| ----------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Minimal Change Engineer       | 5   | Đúng nguyên tắc "nước là sự sống": diff nhỏ nhất, không làm thêm, ghi việc thấy được thành việc riêng. Lệch một chỗ: "không thêm kiểm tra cho trường hợp không thể xảy ra" — dự án và luật cá nhân giữ kiểm tra cấu hình |
| Codebase Archaeologist        | 4   | Chuyên bắt lệch giữa tài liệu và code, nửa sửa nửa không — đúng loại lỗi chạm khe (mục 6). Chỉ đọc, không sửa. Sổ 4 góc nhìn hơi nặng cho dự án nhỏ                                                                      |
| Test Automation Engineer      | 4   | Playwright sâu: không ngủ chờ, dữ liệu tự lo, đồng hồ ảo `page.clock`. Lệch: chọn phần tử theo vai trò (role) không áp được cho canvas — dự án dùng cầu `window.__PIXEL_GAME__` + chạm theo tọa độ                       |
| Multi-Agent Systems Architect | 4   | Dùng để thiết kế chính đội này: chuỗi ≤ 5 agent, chỉ tách khi là việc tư duy khác hẳn, người chấm khác người làm, đổi agent phải có bộ đánh giá + mốc so sánh (đúng tinh thần `bench/`)                                  |
| Reality Checker               | 3   | Tinh thần đúng: mặc định "CHƯA ĐẠT", không tin điểm tuyệt đối. Nhưng lệnh bắt buộc viết cho web Laravel (`qa-playwright-capture.sh` không tồn tại, grep chữ "luxury") — phải viết lại cho game                           |
| Evidence Collector            | 3   | Hay: ghi "CHƯA KIỂM ĐƯỢC" thay vì đoán, "không có lỗi nào" cũng là kết quả hợp lệ. Cùng vấn đề lệnh web, còn trỏ tới `ai/agents/qa.md` không có                                                                          |
| Code Reviewer                 | 3   | Ngắn (76 dòng), chung chung kiểu web/backend (SQL injection). Giữ được cách phân mức 🔴/🟡/💭 và "một lần review đủ ý"; không biết luật Dune và đường cấm của dự án                                                      |
| Game Designer                 | 3   | Khuôn mô tả cơ chế tốt (mục đích, đầu vào/ra, ca biên, đòn bẩy cân bằng, số "[PLACEHOLDER]"). Có phần tâm lý giữ chân/kiếm tiền không liên quan; phải giới hạn "chỉ đề xuất" (luật Butlerian)                            |
| Prompt Engineer               | 3   | Dùng khi sửa skill/agent: mỗi lần đổi một thứ, chạy lại mọi ca thử, ghi phiên bản — khớp luật `bench/`                                                                                                                   |
| Master Plan Architect         | 2   | Chỉ lập kế hoạch, chống phình phạm vi tốt; nhưng khuôn 5 phần (có kế hoạch quay lui, cầu dao…) quá nặng cho game nhỏ                                                                                                     |
| Software Architect            | 2   | Kiến trúc dự án đã chốt; chỉ cần khi có quyết định kiến trúc mới                                                                                                                                                         |
| Agents Orchestrator           | 2   | Gọi tới các agent không có trong bộ đã cài, giả định thư mục `project-specs/`, chạy tự động "không cần người" — trái nguyên tắc chủ dự án duyệt                                                                          |
| Git Workflow Master           | 2   | Luật git của dự án đã đủ; còn khuyên `rebase -i` + `--force-with-lease`, đụng luật cấm force push                                                                                                                        |
| Frontend Developer            | 1   | React/DOM, ví dụ dùng `any` (đường cấm #5); không hợp game canvas                                                                                                                                                        |
| Senior Developer              | 1   | Laravel/FluxUI, "hiệu ứng cao cấp" — ngược nguyên tắc gọn                                                                                                                                                                |
| Rapid Prototyper              | 1   | Gắn phân tích, A/B test, dịch vụ đám mây từ ngày đầu — ngược nguyên tắc gọn và chạy offline                                                                                                                              |
| Mobile App Builder            | 1   | App gốc iOS/Android; game này là web                                                                                                                                                                                     |
| Level Designer                | 1   | Màn chơi 3D (phòng, ánh sáng, chỗ nấp); "màn" của game này là đội hình quái trên sân cố định                                                                                                                             |

## 4. Đối chiếu skill trong thư mục ↔ chuyên gia

| Skill                    | Chuyên gia gần nhất                                  | Giống nhau                                                         | Khác nhau                                                                                                           | Nên dùng                                                                                                |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| giao-viec                | Agents Orchestrator, Master Plan Architect           | Lên kế hoạch → làm từng bước → kiểm từng bước; giới hạn số lần thử | Skill 5 dòng, biết CLAUDE.md/FEATURE_MAP, báo cáo 4 mục. Chuyên gia dài, viết cho web, chạy tự động không hỏi người | Skill (sửa description); không dùng Orchestrator                                                        |
| kiem-chung               | Evidence Collector, Reality Checker                  | Chỉ tin bằng chứng, mặc định chưa đạt                              | Chuyên gia sâu về chống "báo cáo ảo" nhưng lệnh viết cho web                                                        | Skill làm khung, mượn 2 ý của chuyên gia: ghi "chưa kiểm được"; điểm tuyệt đối là dấu hiệu phải soi lại |
| cham-cheo                | Code Reviewer, Reality Checker                       | Chấm độc lập, có mức nghiêm trọng                                  | Skill nói _quy trình_ (độc lập, khác model, rubric, trích bằng chứng); chuyên gia nói _soi cái gì_                  | Skill ở phiên chính (gọi `giam-khao`); phần "soi cái gì" của chuyên gia vào `giam-khao`                 |
| loop-toi-chuan           | Multi-Agent Architect (vòng sinh–chấm), Orchestrator | Tối đa 3 vòng rồi báo người                                        | Chuyên gia thêm: người chấm phải khác người làm; điểm đứng yên 2 vòng thì dừng sớm                                  | Skill, thêm điều kiện dừng sớm                                                                          |
| sua-thanh-luat           | (không có tương đương rõ)                            | —                                                                  | Archaeologist có ý "nửa sửa" nhưng không biến lỗi thành luật                                                        | Skill — giá trị riêng                                                                                   |
| tao-/duy-tri-feature-map | Technical Writer, Workflow Architect                 | Tài liệu luôn khớp sản phẩm                                        | Chuyên gia nặng (dựng hệ thống tài liệu, sổ 4 góc nhìn)                                                             | duy-tri: skill; tao: không cài                                                                          |
| lam-vuon                 | Codebase Archaeologist                               | Quét nợ, mẫu xấu, lệch giữa các phần                               | Chuyên gia sâu hơn nhiều (lệch tài liệu–code, nửa sửa, giá trị khác đơn vị)                                         | Skill gọi Codebase Archaeologist để quét                                                                |
| truc-ca                  | Workflow Optimizer, Orchestrator                     | Gom và xếp việc                                                    | Không chuyên gia nào khớp; dự án chưa có nguồn đầu vào                                                              | Chưa dùng                                                                                               |
| ban-giao                 | (không có tương đương rõ)                            | —                                                                  | —                                                                                                                   | Skill                                                                                                   |
| _(không có skill)_       | Minimal Change Engineer                              | —                                                                  | Bộ skill **thiếu hẳn** kỷ luật "đúng phạm vi" — đúng chỗ đội đã sai ở F02–F06 (làm vượt yêu cầu)                    | Đưa vào agent người làm                                                                                 |
| _(không có skill)_       | Test Automation Engineer                             | —                                                                  | Bộ skill không nói gì về E2E                                                                                        | Đưa vài luật cốt lõi vào agent người làm                                                                |
| _(không có skill)_       | Game Designer                                        | —                                                                  | Bộ skill không có vai đề xuất luật chơi                                                                             | Chưa dùng: phiên chính tự đề xuất luật; chỉ cân nhắc nếu `bench/` T4 thấp                               |

## 5. Phương án chốt: đội và luồng

| Vai                    | Loại               | Việc                                                                                                                         | Skill mang theo                                                                         | Model                               |
| ---------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------- |
| Điều phối              | Phiên Claude chính | Nhận việc, lập kế hoạch, giao việc, gọi giám khảo, báo cáo, xin duyệt                                                        | giao-viec, cham-cheo, loop-toi-chuan, sua-thanh-luat, lam-vuon, ban-giao (tự kích hoạt) | Model chủ dự án đang dùng           |
| `nguoi-lam`            | Agent thường trực  | Test trước → code tối thiểu → `npm run check` → ảnh E2E → tự kiểm → cập nhật FEATURE_MAP                                     | kiem-chung, duy-tri-feature-map (nạp sẵn qua `skills:`)                                 | Opus                                |
| `giam-khao`            | Agent thường trực  | Chấm độc lập: chạy lại check, soát diff theo tiêu chí và luật cấm, soát ảnh theo bảng soát hình (mục 8); mặc định "chưa đạt" | kiem-chung (nạp sẵn)                                                                    | Khác người làm — chọn bằng `bench/` |
| `thiet-ke-hinh`        | Agent khi cần      | Định hướng mỹ thuật, làm hình thật và font (DEBT-007, DEBT-008); chỉ đề xuất, chủ dự án duyệt hình mẫu                       | — (học quy trình từ skill `create-game-assets` của plugin gamedev)                      | Chọn khi tạo                        |
| Codebase Archaeologist | Chuyên gia có sẵn  | Rà soát định kỳ khi chủ dự án yêu cầu (skill lam-vuon) — chỉ báo cáo, không sửa                                              | —                                                                                       | —                                   |

**Luồng tự động:**

```text
Chủ dự án nói việc (lời thường)
  → Điều phối [giao-viec]: đọc CLAUDE.md, FEATURE_MAP; lập kế hoạch + tiêu chí "đạt"
       luật chơi mới / việc lớn / số cân bằng ngoài phạm vi → trình chủ dự án duyệt, chờ
  → nguoi-lam [kiem-chung, duy-tri-feature-map]: test đỏ → code xanh → npm run check → ảnh E2E → tự kiểm
  → Điều phối [cham-cheo] → giam-khao [kiem-chung]: chấm độc lập (không thấy quá trình làm)
       chưa đạt → Điều phối [loop-toi-chuan] → nguoi-lam sửa (tối đa 3 vòng; quá thì báo 2 phương án)
       đạt → Điều phối báo chủ dự án (đã làm gì, để được gì, chưa kiểm chứng gì, cần quyết gì)
  → Chủ dự án duyệt gộp PR

Dọc đường: phát hiện lỗi → [sua-thanh-luat] · cuối phiên dài → [ban-giao]
Chủ dự án yêu cầu rà soát → [lam-vuon] → Codebase Archaeologist
```

**Luôn dừng hỏi chủ dự án:** luật chơi mới, số cân bằng ngoài phạm vi được giao, hình mẫu mỹ thuật,
xoá dữ liệu (phân quyền vòng 2), gộp PR.

**Để luồng tự chạy, CLAUDE.md mục 3 cần thêm 2 dòng:** mọi việc đổi code → giao `nguoi-lam`, chấm
bằng `giam-khao` trước khi báo xong; skill của dự án được ưu tiên hơn skill superpowers khi trùng việc.
`description` của hai agent ghi "dùng chủ động" (Claude Code dựa vào `description` để tự giao việc).

**Vì sao 2 agent thường trực:** "làm" và "chấm" là hai việc khác hẳn và phải tách để chấm độc lập —
bằng chứng: chữ đè nhau ở F06 chỉ lộ khi xem ảnh; lỗi chạm khe (mục 11) do người viết FEATURE_MAP viết
luôn test ngược lại mà không thấy. Thêm vai thường trực nữa chỉ thêm một lần chuyển giao (mất ngữ cảnh,
tốn token). Điều phối để ở phiên chính vì đó là nơi chủ dự án trò chuyện và duyệt (Claude Code cho agent
gọi agent khác tới 3 tầng — làm được, nhưng không cần).

## 6. Nguồn gốc từng phần

### 6.1. Từ thư mục skill của chủ dự án (claude-skills-mau)

- **Hai vai** người làm / người chấm: README của thư mục nêu đúng hai vai "worker, verifier" (không kèm
  file agent).
- **8 skill dùng**, giữ ý, chỉnh lời: giao-viec, kiem-chung, cham-cheo, loop-toi-chuan, sua-thanh-luat,
  duy-tri-feature-map, lam-vuon, ban-giao.
- **Chỉnh cho khớp dự án:** `description` chỉ nói "dùng khi nào" (6/10 bản gốc tóm tắt luôn quy trình);
  "sổ lỗi" → file do chủ dự án chọn (mục 10); "mức tự chủ" → phân quyền 3 vòng; "file trạng thái" →
  `TASKS.md`; bỏ tham chiếu khuôn 5 ý của tao-feature-map; loop-toi-chuan thêm "điểm đứng yên 2 vòng
  thì dừng sớm".
- **Không dùng:** truc-ca (chưa có nguồn việc đầu vào), tao-feature-map (đã có bản đồ, khuôn khác).

### 6.2. Học từ agency-agents (133 agent đã cài ở `~/.claude/agents`)

| Học gì                                                                                                                                                              | Từ                            | Vào đâu                   | Không lấy                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| Đọc đề theo đúng động từ; diff nhỏ nhất; mỗi dòng phải trả lời "đề có cần dòng này không"; thấy việc khác thì ghi thành việc riêng, không làm lén; đề mơ hồ thì hỏi | Minimal Change Engineer       | `nguoi-lam`               | "Bỏ kiểm tra cho trường hợp không thể xảy ra" — trái luật không cắt validation |
| E2E chờ theo điều kiện, không ngủ chờ; test tự lo dữ liệu; cái gì unit test được thì không đưa lên E2E; test chập chờn phải tìm gốc, không che bằng chạy lại        | Test Automation Engineer      | `nguoi-lam`               | Chọn phần tử theo vai trò (không áp được cho canvas)                           |
| Mặc định "chưa đạt"; điểm tuyệt đối hay "không có lỗi nào" là dấu hiệu phải soi lại; đối chiếu mọi khẳng định với file và ảnh thật                                  | Reality Checker               | `giam-khao`               | Lệnh bắt buộc viết cho web (Laravel, `qa-playwright-capture.sh`)               |
| Ghi "chưa kiểm được" thay vì đoán; "không có lỗi" là hợp lệ khi đã nêu phạm vi đã kiểm; không bịa thêm yêu cầu ngoài đề                                             | Evidence Collector            | `giam-khao`               | Như trên                                                                       |
| Phân mức lỗi chặn / nên sửa / tuỳ ý; một lần chấm nói đủ ý; nói rõ vì sao                                                                                           | Code Reviewer                 | `giam-khao`               | Danh mục lỗi web (SQL injection…)                                              |
| Chuỗi ≤ 5 agent; chỉ tách khi việc tư duy khác hẳn; người chấm khác người làm; đổi agent phải có bộ đo và mốc so sánh                                               | Multi-Agent Systems Architect | Thiết kế đội, `bench/`    | Hạ tầng log/trace của hệ thống lớn                                             |
| Mỗi lần đổi một thứ; chạy lại mọi ca; ghi phiên bản                                                                                                                 | Prompt Engineer               | Quy trình sửa skill/agent | —                                                                              |
| Rà lệch tài liệu–code, chỗ nửa sửa nửa không                                                                                                                        | Codebase Archaeologist        | Gọi khi cần (lam-vuon)    | Sổ 4 góc nhìn đầy đủ                                                           |

Không dùng: Agents Orchestrator, Frontend Developer, Senior Developer, Rapid Prototyper, Mobile App
Builder, Level Designer, Git Workflow Master, các agent thiết kế web (lý do: mục 3).

### 6.3. Học từ repo Claude-Code-Game-Studios (bản 1.2.0)

| Học gì                                                                                                                                                                                              | Từ                             | Vào đâu                      | Không lấy                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Chuẩn code game: luật tách khỏi hiển thị để test không cần chạy game; số liệu từ cấu hình; chuyển trạng thái rõ ràng, không có trạng thái vô lý; xử lý ca biên; lệch thiết kế thì báo, không tự đổi | agent `gameplay-programmer`    | `nguoi-lam`                  | Hỏi "cho ghi file không" mỗi lần; phím bấm đổi được (trái luật #15); bắt mọi hệ thống có interface/DI; kiểm phiên bản Godot |
| Thay đổi người chơi nhìn thấy thì phải chạy game, nhìn tận mắt và lưu ảnh mới được đóng việc                                                                                                        | luật đóng việc (`/story-done`) | `giam-khao` — bảng soát hình | Thư mục bằng chứng `production/qa/`                                                                                         |
| Giữ sách phong cách; soát mọi hình theo phong cách; thứ bậc thị giác, dễ đọc                                                                                                                        | agent `art-director`           | `thiet-ke-hinh` (khi tạo)    | Quy ước đặt tên tài sản, ngân sách 3D                                                                                       |
| _Chỉ thêm nếu `bench/` thấy cần:_ cảnh báo khi agent dừng mà chưa ghi file được giao                                                                                                                | hook `validate-agent-artifact` | Luồng                        | 14 hook còn lại                                                                                                             |
| _Để sau:_ kiểm khuôn skill/agent bằng máy, bổ sung `bench/`                                                                                                                                         | `studio-tests`                 | Quy trình sửa skill/agent    | —                                                                                                                           |

Ngoài repo: skill `create-game-assets` của plugin gamedev (cài riêng) → `thiet-ke-hinh`: chốt khung
kỹ thuật (cỡ, bảng màu) trước; duyệt **một hình mẫu** rồi mới làm cả bộ; pixel art máy tạo chỉ là bản
nháp, phải sửa theo lưới và bảng màu; ghi nguồn gốc, bản quyền từng hình.

### 6.4. Từ chính dự án

CLAUDE.md (nguyên tắc Dune, đường cấm, `npm run check`, PR), `docs/ART_STYLE.md` (bảng soát hình),
`bench/` (thước đo mọi thay đổi).

## 7. Vì sao không cài nguyên repo Game Studios

1. Không hỗ trợ Phaser/TypeScript: chuyên gia động cơ, tài liệu tham chiếu, bước kiểm code và luật theo
   thư mục đều cho Godot/Unity/Unreal.
2. Ngược "luồng tự động": `/dev-story`, `/story-done` khoá chỉ cho gõ tay; agent hỏi "cho ghi file
   không" trước mỗi lần ghi.
3. Ngược "test trước": mức `minimal` bỏ test; mức `standard` viết ~30 tài liệu trước dòng code đầu tiên
   (chính tác giả đo được game kém nhất).
4. Nặng: 49 agent + 74 skill trong ngữ cảnh mỗi phiên; 15 hook mở bash ở mọi lần đọc/sửa/chạy lệnh;
   cần Python (`python` trên máy chủ dự án đi qua lối tắt WindowsApps).
5. Đè lên nền đã có: CLAUDE.md, quyền, cấu trúc thư mục, quy trình PR, `bench/`.

Hợp khi: làm game mới bằng Godot/Unity/Unreal và muốn quy trình kiểu studio duyệt từng bước.

## 8. Đồ họa và giao diện

- **Hình đi kèm tính năng** (chữ HUD, nút, màn kết quả, sprite lưới ký tự): `nguoi-lam` làm,
  `giam-khao` soát ảnh E2E ở khung điện thoại theo bảng: chữ không đè nhau, không tràn khung, đọc được
  ở cỡ điện thoại; chỉ màu `PALETTE`; sprite có viền `ink`, phe ta xanh dương/vàng, quái đỏ/tím; vùng
  tấn công xanh lá; không thêm cách điều khiển ngoài chạm; không thêm hiệu ứng khi không được yêu cầu.
- **Mỹ thuật, hình thật, font pixel** (DEBT-007, DEBT-008): `thiet-ke-hinh`, tạo khi bắt đầu việc này.
  Chưa kiểm chứng công cụ tạo ảnh nào trên máy — có thể vẫn cần người vẽ.
- Lệch nhỏ cần sửa khi làm: `ART_STYLE.md` ghi vùng tấn công `grass`/`leaf`, nhưng bảng màu không có
  `leaf` và code vẽ bằng `lime`.

## 9. Triển khai và đo

1. Hoàn thiện `bench/`: viết bài T6 soát hình ("tăng số lượt lên 12" — ở commit gốc sẽ làm chữ "Lượt"
   đè chữ "Máu"); kiểm chứng nốt đáp án T1–T3 (cần máy còn ≥ 3 GB bộ nhớ trống).
2. Chạy mốc **trước** với cấu hình hiện tại.
3. Cài trọn luồng: 8 skill đã chỉnh + 2 agent + 2 dòng luật CLAUDE.md + bảng soát hình → chạy lại, so
   điểm.
4. Tinh chỉnh từng thứ một, mỗi lần đo lại: model của `giam-khao`, câu chữ từng skill, các ý "chỉ thêm
   nếu cần" ở mục 6.3.
5. `thiet-ke-hinh`: tạo khi bắt đầu trả DEBT-007/008, đo bằng T6 và bài đồ họa riêng khi đó.

Lần đo nào điểm giảm thì không giữ thay đổi đó, hoặc sửa tới khi không giảm.

## 10. Quyết định của chủ dự án

Đã chốt ngày 23/10/2026:

- **Duyệt phương án này.** Chưa cài agent/skill: trước hết hoàn thiện `bench/` (viết T6, kiểm chứng
  nốt đáp án T1–T3) rồi mới chạy mốc "trước".
- **Sổ lỗi** của skill sua-thanh-luat: file `LESSONS.md` ở gốc (tách khỏi `DEBT.md` vì DEBT là sổ đi
  tắt cố ý). Tạo khi cài skill.
- **Skill của dự án được ưu tiên hơn skill superpowers** khi trùng việc — ghi vào CLAUDE.md khi cài.

Còn chờ quyết:

- Luật mới "nút chạm phải đủ to cho ngón tay".
- Thư mục ngoài dự án để chạy `bench/`.

## 11. Phát hiện khi làm bộ việc mẫu: lỗi chạm khe

Ở game hiện tại (cả `main` lẫn nhánh F06): chạm hụt vào khe giữa hai nút vũ khí **bị tính là một nhát
chém, mất 1 lượt**. FEATURE_MAP F02 ghi chạm vào khe "không làm gì", nhưng `BattleScene.handleTap` coi
mọi điểm không trúng nút là chém, và test trong `battleLayout.test.ts` còn ghi khe là "chạm vào sân".
Chưa sửa (chủ dự án đang cho tạm dừng); dùng làm việc mẫu T2.
