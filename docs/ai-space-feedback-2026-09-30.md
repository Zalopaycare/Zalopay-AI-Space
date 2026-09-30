# Feedback Zalopay AI Space — test ngày 30/09/2026

Mình test trên ai-space.zalopay.vn bằng tài khoản ThyNDM, màn hình máy tính. Chưa test trên điện thoại.
Mình chỉ xem và bấm thử, **không** gửi, đăng, upvote hay xoá gì.

## Đã sửa đúng từ lần trước

- 3 nút Home / Use Case / Câu hỏi đã căn giữa đúng theo vùng nội dung.
- Sắp xếp đã đổi thành "Mới nhất / Nổi bật".
- Đã bỏ đánh giá sao, đổi thành "Độ khó" 3 vạch.
- Trang chi tiết đã theo template 9 phần: có Tóm tắt 30 giây, "Ứng dụng ngay" nhảy xuống phần 5, checklist tích được, mục lục bên phải, phần kỹ thuật thu gọn.
- Lọc theo Category có lưu vào URL và có nút "Xoá bộ lọc".

---

## 1. Lỗi cần sửa

| Mức | Chỗ | Lỗi | Cách sửa |
| --- | --- | --- | --- |
| Cao | Trang chi tiết | Mở link bài không tồn tại (ví dụ `/use-cases/c99`) lại hiện nội dung bài Android (c1) | Hiện trang "Không tìm thấy use case" kèm nút về Thư viện |
| Cao | Tìm kiếm | Gõ không dấu không ra kết quả: "viet bai" ra 0 bài, "viết bài" thì ra | Bỏ dấu cả từ khoá lẫn nội dung trước khi so khớp |
| Cao | Khung prompt | Khung prompt nào cũng ghi "gửi cho Claude Code / Codex / Cursor", kể cả câu gửi **bot Taxi trên Teams** (c9, 16 khung) và câu hỏi trong **CRM Assistant** (c3) | Cho mỗi khung chọn nơi gửi: Claude Code / Codex / Cursor / Teams bot / CRM Assistant / ChatGPT… |
| Cao | Form "Chia sẻ use case" | Form chưa theo template 9 phần: thiếu Loại, Mô tả 1 câu, Kết quả nổi bật, Phù hợp / Chưa phù hợp, Lỗi hay gặp, Chi tiết kỹ thuật | Chia form thành các bước theo đúng 9 phần; nút "Xem trước" hiện đúng giao diện trang chi tiết |
| Cao | Dữ liệu cá nhân | Thông báo ghi *use case "vsdvs" của bạn đã được duyệt*, nhưng "Use case của tôi" = 0 và "Hoạt động gần đây" trống | Kiểm tra lại: bài gắn nhầm người, hoặc 2 trang lọc theo tài khoản khác nhau |
| Cao | Home, Câu hỏi | Nội dung test đang hiện công khai: câu hỏi "la la / lo lo", "Test @thyndm" | Xoá hoặc ẩn trước khi ra mắt; thay bằng 3–5 câu hỏi thật |
| Vừa | Nhiều bài (c3, c4, c5, c6…) | Nhãn bị lặp: "Hiểu đơn giản: Hiểu đơn giản: …" | Nội dung đã có sẵn chữ "Hiểu đơn giản:" nên giao diện đừng thêm nữa, hoặc xoá chữ trong nội dung |
| Vừa | Thư viện | Sang trang 2 thì URL không đổi, nên bấm Quay lại hay gửi link sẽ về trang 1 | Thêm `?page=2` vào URL |
| Vừa | Thẻ use case | Thẻ không phải link thật: không mở được tab mới, không copy được link | Bọc thẻ bằng thẻ `<a href="/use-cases/…">` |
| Vừa | Trang chi tiết | Khi mở sidebar, mục lục bên phải biến mất và nút tròn "←" nổi đè lên mép sidebar | Giữ mục lục (thu hẹp cột), hoặc bỏ nút tròn vì đã có "← Quay lại" |
| Vừa | c6 Segment | 2 khối log bị mất dấu tiếng Việt ("PHI HI USER", "CT ticket ghi"), code có chú thích lỗi font | Bỏ 2 khối log, thay bằng 1–2 câu tóm tắt (xem mục 5) |
| Vừa | Home | Thẻ use case ở Home chỉ ghi "Use case", chưa có nhãn Loại, Trạng thái, Độ khó như trang chi tiết | Dùng chung một thẻ cho Home và Thư viện |
| Thấp | Mục lục | Số nhảy "6 → 8" khi bài không có Demo, và gộp thành "2–3" | Tự đánh số theo các phần đang hiện |
| Thấp | Tác giả | Chỗ ghi tên team ("SRE", "Platform", "Data Platform"), chỗ ghi username ("ToanNTT", "LuanNA") | Thống nhất "Tên người · Team" |
| Thấp | Menu avatar | Chữ tiếng Anh "Visit Admin Dashboard", không có mục "Hồ sơ của tôi" | "Trang quản trị", thêm "Hồ sơ của tôi" lên đầu |
| Thấp | Trạng thái trống | Tìm không ra chỉ có 1 dòng chữ; "Câu hỏi của tôi" trống thì không có nút tạo | Thêm nút "Đặt câu hỏi về '[từ khoá]'" / "Đặt câu hỏi đầu tiên" |
| Thấp | Ảnh bìa | Ảnh bìa bài Website (c5) bị cắt, chỉ thấy một mảnh lịch | Đổi ảnh, hoặc dùng icon theo danh mục |
| Thấp | Chân trang | Chân trang lệch trái so với cột nội dung | Căn theo cùng độ rộng với nội dung |

---

## 2. Để web trông chuyên nghiệp, bớt "chất AI"

Nhìn tổng thể đã gọn và nhất quán. Mấy chỗ dưới đây làm web trông giống "máy sinh ra":

- **Quá nhiều hộp lưu ý.** Bài Agent Base (c4) có khoảng 12 hộp "!" và "i". Mỗi bài chỉ nên có tối đa 3 hộp, dành cho điều thật sự quan trọng. Phần còn lại viết thành câu bình thường.
- **Nhãn na ná nhau.** Loại (Hướng dẫn / Case study…), Trạng thái và Chủ đề đang dùng kiểu chip gần giống nhau. Nên tách thành 3 kiểu:
  - Loại: nền đặc
  - Trạng thái: chấm màu + chữ
  - Chủ đề: chỉ viền
- **Trộn Anh – Việt trong giao diện:** "Upvote", "Visit Admin Dashboard", "Case study". Chọn một và giữ thống nhất (ví dụ "Hữu ích" thay cho "Upvote").
- **Thiếu 3 ô số nổi bật** ở đầu trang chi tiết (template có). Đây là thứ giúp trang trông như sản phẩm thật: người đọc thấy ngay "2 ngày → 5 phút".
- **Ảnh demo thật.** Mỗi bài có 1–2 ảnh chụp màn hình thật trong phần Demo sẽ đáng tin hơn nhiều so với chữ mô tả ảnh.
- **Danh mục hiện số bài** ("Marketing · 1"), ẩn danh mục đang trống.

---

## 3. Animation và tương tác (mức nhẹ, tinh tế)

Web đã có sẵn quy tắc `prefers-reduced-motion`, nên giữ nguyên: người tắt hiệu ứng trong máy thì không thấy chuyển động.

| Chỗ | Hiệu ứng | Thời lượng gợi ý |
| --- | --- | --- |
| Thẻ use case / câu hỏi | Rê chuột: nhấc lên 2–4px, viền sáng nhẹ, ảnh bìa phóng 1.03 | 150–200ms |
| Khi cuộn trang | Thẻ và các phần hiện dần từ dưới lên, lệch nhau một chút | 250ms, lệch 40ms |
| 3 ô số nổi bật | Số chạy từ 0 lên khi vào màn hình | 800ms |
| Nút Copy | Đổi thành "Đã copy ✓" rồi trở lại | 1,5 giây |
| Upvote / "Tôi đã áp dụng" | Icon nảy nhẹ, số đổi có hiệu ứng lăn | 200ms |
| Checklist "Cần chuẩn bị" | Thanh tiến độ chạy mượt; tích đủ thì khung chuyển viền xanh | 300ms |
| Mục lục | Thêm thanh tiến độ đọc bài ở mép trên hoặc bên cạnh mục lục | theo cuộn |
| Ô tìm kiếm ở Home | Chữ gợi ý đổi dần: "Tóm tắt biên bản họp…", "Viết email…", "Phân tích file Excel…" | 3 giây một câu |
| Phi thuyền ở hero | Bay lên xuống rất nhẹ; tia sáng đậm hơn khi bấm vào ô tìm kiếm | 4–6 giây một vòng |
| Lúc tải | Khung xám mờ (skeleton) có hình giống thẻ, thay cho vòng xoay | — |
| Chuyển trang | Mờ dần 150ms giữa các trang | 150ms |

Không nên dùng: confetti, hiệu ứng nảy mạnh, chữ gõ từng ký tự ở nội dung chính.

---

## 4. Trang Hồ sơ (chỉ bản thân xem)

Gộp 4 mục "Của tôi" trên sidebar (Thông báo, Use case của tôi, Câu hỏi của tôi, Đã lưu) thành **một trang `/profile`**. Sidebar chỉ còn "Hồ sơ của tôi", chuông thông báo giữ riêng.

**Đầu trang**
- Avatar, tên, team / vai trò, giới thiệu ngắn (1–2 câu), nút "Sửa hồ sơ".
- Công cụ AI hay dùng và Chủ đề có thể hỗ trợ, hiện dạng chip.
- Không dùng huy hiệu hay điểm.

**Việc cần làm** (chỉ hiện khi có)
- Use case bị admin trả lại "Cần chỉnh sửa", kèm góp ý.
- Câu hỏi của bạn đã có câu trả lời nhưng chưa chấp nhận câu nào.
- Nháp chưa gửi.

**Các tab**
1. **Hoạt động gần đây:** dòng thời gian gồm đăng, trả lời, bình luận, lưu, "Tôi đã áp dụng". Có lọc theo loại.
2. **Use case của tôi:** giữ các tab trạng thái hiện có (Chờ duyệt / Đã đăng / Cần chỉnh sửa / Từ chối) và thêm Nháp.
3. **Câu hỏi của tôi:** Chờ trả lời / Đã trả lời.
4. **Câu trả lời của tôi:** những câu mình đã trả lời người khác.
5. **Đã lưu:** use case và câu hỏi.
6. **Đã áp dụng:** các use case mình đã bấm "Tôi đã áp dụng", để dễ mở lại khi cần.

**Các trang hồ sơ thường có thêm**
- **Cài đặt thông báo:** nhận qua web, email hay Teams; chọn loại muốn nhận (có trả lời, được nhắc tên, bài được duyệt).
- **Theo dõi chủ đề / công cụ:** chọn "Claude", "Tự động hoá"… để Home ưu tiên gợi ý đúng thứ mình quan tâm.
- **Thống kê đơn giản** (tuỳ chọn): số bài đã đăng, số lượt "Tôi đã áp dụng" bài của mình nhận được. Chỉ là con số, không xếp hạng.
- **Xuất nội dung của tôi** (tuỳ chọn): tải về các use case đã viết.

Một lưu ý: vì hồ sơ chỉ mình xem, mục **"Chủ đề có thể hỗ trợ"** chỉ có ích khi được dùng ở chỗ khác. Ví dụ gợi ý tên bạn khi người khác gõ @ trong câu hỏi cùng chủ đề. Nếu không làm phần đó thì có thể bỏ mục này.

---

## 5. Nội dung use case, đọc bằng góc nhìn người không rành AI

**Nhận xét chung:** cấu trúc đã giúp người mới nhiều. Tóm tắt 30 giây và "Phù hợp / Chưa phù hợp" rất dễ hiểu. Có 3 vấn đề lặp lại ở nhiều bài:

1. **Bài quá dài.** 5/10 bài trên 2.500 chữ, dài nhất 4.020 chữ, trong khi phần người đọc thật sự cần (1–6) nên dưới khoảng 1.500 chữ.
2. **Một ý viết nhiều lần.** Quy trình được kể ở Giải pháp, lại ở Các bước, lại trong bảng, lại ở phần kỹ thuật.
3. **Chỗ trống chặn người đọc.** Nhiều bài thiếu đúng thứ để bắt đầu: link, nơi xin quyền, nơi tìm công cụ. Người đọc hiểu rồi nhưng không làm theo được.

Theo lựa chọn **rút gọn + thu gọn**:
- Mỗi ý chỉ viết 1 lần.
- Bảng dài, log, code đưa vào khối "Xem thêm" đóng sẵn.
- Tối đa 3 hộp lưu ý mỗi bài.

| Bài | Độ dài | Người mới làm theo được không | Đang chặn | Chỗ lặp / nên rút gọn |
| --- | --- | --- | --- | --- |
| c6 Segment Pipeline | 4.020 chữ (dài nhất) | Không, đúng như "Độ khó: Khó", dành cho team Data | Nơi xin quyền repo và kernel | Quy trình 8 bước xuất hiện **4 lần**: Giải pháp, Các bước, bảng "8 bước skill đi qua", bảng "Quy trình 8 phase" ở phần kỹ thuật. Giữ 1 bảng. 2 khối log lỗi dấu thay bằng 1 câu: "AI phát hiện giá trị TF012 trong ticket ra 0 dòng nên dừng lại hỏi". Code dài và tên máy chủ, đường dẫn nội bộ (Server 95, host, đường dẫn HDFS) nên cân nhắc bỏ. Phần "Mang ý tưởng về team bạn" mới có 1 câu cho team khác, nên thêm 1 prompt khởi đầu |
| c9 Taxi Agent | 3.742 chữ | Được, nếu biết bot ở đâu | Chưa ghi tìm bot Taxi trên Teams ở đâu | 10 tình huống xuất hiện **3 lần**: bảng Kết quả, chú thích Demo, bảng kỹ thuật. 16 khung prompt, nhiều khung gần như giống hệt (1, 2, 4 đều là "link + tại sao failed"), nên gom còn 4 mẫu: hỏi lỗi, hỏi quy trình, hỏi tài nguyên, xin sửa. Bài toán có 10 gạch; 5 câu ví dụ nên chuyển thành "Câu hay được hỏi". Prompt chép từ chat thật còn lỗi gõ ("tang thời gian", "Taxi . https") |
| c4 Agent Base | 3.444 chữ | Gần như được: có prompt copy, kết quả mẫu, bảng lỗi | Chưa có link tải file zip bộ skill | Danh sách "Cần chuẩn bị" có **2 lần** (checklist + bảng). "Chỉ môi trường dev, test trên macOS" nhắc **4 lần**; "2 CPU / 4 GB" nhắc **4 lần**. 8 bước tóm tắt rồi lại viết chi tiết từng bước: nên làm 8 bước bấm mở ra được. 3 prompt cài gần giống nhau: 1 prompt + nút chọn công cụ. "Kết quả bạn sẽ thấy" lặp lại các khung kết quả đã có phía trên |
| c3 CRM Assistant | 2.917 chữ | Được, dễ nhất cho Business (chỉ bấm nút trong CRM) | Link mở CRM tool, nơi xin quyền | Bảng Kết quả 4 dòng đều "Chưa đo" có X%, A, B, rồi bảng "Chỉ số mục tiêu" lặp lại đúng 4 chỉ số đó: gộp thành 1 dòng "Chưa đo, mục tiêu giảm 50% thời gian hỗ trợ". 2 bảng phân bổ nguyên nhân đang nằm trong **Giải pháp**, nên chuyển lên **Bài toán**. Số trong ngoặc sau tên người (8)(6)(3)(2) chép từ Confluence nên bỏ. Trạng thái "Đang dùng" nhưng nội dung nói mới demo trên SBQC, nên đổi thành "Thử nghiệm" |
| c8 Mini App Builder | 2.586 chữ | Tương đối, có prompt mẫu | Chưa ghi lấy gói cài ở đâu; "Cách tiếp cận" trống | Phần Kết quả 444 chữ mô tả 5 demo: đổi thành 5 thẻ ảnh, mỗi thẻ 1 dòng |
| c10 MCP Platform | 2.578 chữ | Không, dành cho dev | 8 chỗ trống | Mình mới đếm, chưa đọc kỹ |
| c2 us-hive | 2.042 chữ | Không, dành cho dev | 10 chỗ trống | Mình mới đếm, chưa đọc kỹ |
| c1 Android UI | 2.039 chữ | Không, dành cho QC, còn là PoC | 11 chỗ trống, "Cách tiếp cận" trống | Mình mới đếm, chưa đọc kỹ |
| c7 Pentest | 1.749 chữ | Chỉ team AppSec | Link web của công cụ | Gọn nhất, nên dùng làm bài mẫu |
| c5 Website | 1.576 chữ | Chưa hẳn: cài bằng 2 lệnh Codex, người Biz dễ vướng | Quyền kho plugin, tài khoản trang quản trị | "Human score 6% so với 6%" khó hiểu, nên giải thích: "bài AI viết được chấm giống người viết ngang bài Agency". Vì người dùng chính là Biz, nên thay 2 lệnh cài bằng 1 prompt nhờ AI cài hộ (như bài Agent Base) |

**Quy tắc để giữ các bài gọn về sau**
- Phần 1–6 dưới khoảng 1.500 chữ. Phần 8 kỹ thuật thì không giới hạn, vì đã thu gọn.
- Mỗi ý chỉ viết 1 lần. Muốn nhắc lại thì dẫn link tới chỗ đã viết ("xem Giới hạn").
- Tối đa 3 hộp lưu ý mỗi bài.
- Prompt mẫu viết lại cho sạch, không chép nguyên câu chat có lỗi gõ.
- Log, output máy in ra chỉ giữ khi người đọc cần đối chiếu. Còn lại tóm tắt bằng 1 câu.

---

## 6. Prompt gợi ý cho Claude Code

**Sửa lỗi**
```
Đọc docs/ai-space-feedback-2026-09-30.md, mục 1 "Lỗi cần sửa".
Sửa lần lượt các lỗi mức Cao, rồi tới Vừa, rồi Thấp. Mỗi lỗi sửa xong thì báo mình và nói cách kiểm tra lại.
Riêng lỗi "Dữ liệu cá nhân": điều tra trước, báo nguyên nhân cho mình rồi mới sửa.
```

**Trang hồ sơ**
```
Theo mục 4 của docs/ai-space-feedback-2026-09-30.md, làm trang /profile chỉ chủ tài khoản xem được:
gộp Thông báo, Use case của tôi, Câu hỏi của tôi, Đã lưu vào một trang có đầu trang (thông tin tự sửa được), khối "Việc cần làm" và các tab.
Sidebar chỉ còn mục "Hồ sơ của tôi"; chuông thông báo giữ riêng. Không dùng huy hiệu hay điểm.
Đưa mình xem bố cục trước khi code.
```

**Animation**
```
Theo mục 3 của docs/ai-space-feedback-2026-09-30.md, thêm hiệu ứng mức nhẹ đúng thời lượng trong bảng.
Tất cả phải tắt khi người dùng bật prefers-reduced-motion. Không dùng thư viện nặng; ưu tiên CSS.
Xong thì liệt kê từng hiệu ứng đã thêm ở file nào.
```
