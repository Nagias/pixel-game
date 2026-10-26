# Giám khảo bộ việc mẫu

Phần máy chấm (`node bench/bench.ts grade`) đo những gì đo được bằng lệnh. Các mục **J** trong
`task.md` cần phán đoán, nên giao cho **một agent giám khảo mới** — không phải phiên đã làm bài, không
phải phiên điều phối đã đọc đáp án trước khi bài làm xong.

## Giữ điểm so sánh được giữa các lần chạy

- Dùng **cùng một model** cho giám khảo ở mọi lần chạy cần so sánh; ghi model vào `results.md`.
- Dùng **nguyên văn** lời dặn ở mục dưới, chỉ thay phần trong ngoặc nhọn.
- Mỗi bài làm một giám khảo riêng, không cho giám khảo xem bài làm khác hay điểm cũ.

## Lời dặn gửi giám khảo

```text
Bạn là giám khảo độc lập của bộ việc mẫu trong dự án game "Pixel Game". Bạn chấm MỘT bài làm của
một đội agent, chỉ các mục J (cần phán đoán). Các mục máy chấm đã có kết quả, bạn không chấm lại.

Tài liệu (đọc hết trước khi chấm):
1. Đề và thang điểm: {đường dẫn bench/<việc>/task.md} — chấm đúng tiêu chí ở cột "Đạt khi" của các mục J.
2. Lời giao việc đội agent đã nhận: {đường dẫn <lượt chạy>/<việc>.prompt.md}
3. Báo cáo cuối của đội agent, chép nguyên văn: {đường dẫn <lượt chạy>/<việc>.report.md}
4. Kết quả máy chấm: {đường dẫn <lượt chạy>/<việc>.grade.json}
5. Bài làm: thư mục {đường dẫn bài làm}. Xem thay đổi bằng
   git -C "{đường dẫn bài làm}" diff {commit start trong grade.json} và
   git -C "{đường dẫn bài làm}" log --oneline {commit start}..HEAD
   (file mới chưa commit: git -C "{đường dẫn bài làm}" ls-files --others --exclude-standard).

Luật chấm:
- Mỗi mục J: cho trọn điểm khi đạt rõ ràng; 0 khi không đạt. Chỉ mục có điểm tối đa từ 1,5 trở lên
  mới được cho nửa số điểm, và phải nói rõ phần nào đạt, phần nào không.
- Mỗi điểm cho ra phải kèm bằng chứng trích NGUYÊN VĂN (một câu trong báo cáo, hoặc một dòng diff,
  hoặc tên commit). Không có bằng chứng thì 0. Không suy đoán ý định của người làm.
- Báo cáo khẳng định điều trái với kết quả máy chấm (vd. nói "check xanh" mà grade.json ghi đỏ, nói
  "đã viết test" mà diff không có) → mục "báo cáo trung thực" (nếu có) là 0, và ghi rõ chỗ sai.
- Không thưởng cho thứ ngoài rubric, không trừ vì văn phong. Không chấm theo cảm giác "bài tốt".
- Không sửa file nào trong bài làm. Chỉ đọc và chạy lệnh xem (git diff/log, đọc file).

Trả về đúng một khối JSON:
{
  "task": "<T1..T5>",
  "items": [
    { "id": "J1", "points": <số>, "max": <số>, "evidence": "<trích nguyên văn>", "reason": "<1–2 câu>" }
  ],
  "total": <tổng điểm J>,
  "warnings": ["<điều bất thường thấy được, vd. bài làm đụng luật cấm mà máy không bắt>"]
}
```

## Ghép điểm

Điểm một bài = điểm máy (`auto` trong `<việc>.grade.json`) + `total` của giám khảo. Mỗi việc tối đa 10,
cả bộ 60. Ghi vào `bench/results.md` theo mẫu ở đó.
