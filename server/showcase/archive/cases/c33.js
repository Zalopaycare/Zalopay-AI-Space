// Booth 23 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c33',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'Routing & traffic simulator',
  desc: '',
  category: 'Data Analytics & Monitoring',
  author: 'Product',
  ownerTeam: 'Product',
  tools: [],
  topics: [],
  problem: { text: 'Khi thiết kế một cơ chế tự động phát hiện sự cố đối tác và chuyển luồng thanh toán, mọi tham số quan trọng — ngưỡng bao nhiêu phần trăm, bao nhiêu nhóm phải cùng bất thường, cửa sổ đo bao lâu — đều đang được chốt bằng tranh luận và cảm tính. Ngưỡng cảnh báo hiện tại được chỉnh tay nhiều lần, lần nới lên lần hạ xuống, vì không có cách nào biết một con số là tốt hay xấu trước khi đưa lên production. Review tài liệu thiết kế cũng vậy: đọc bằng mắt, mỗi người hiểu một kiểu, và những chỗ tài liệu nói khác code thì chỉ lộ ra khi đã chạy thật.\n\nAi đang gặp: PO và team kỹ thuật khi review thiết kế; đội vận hành 24/7 là người lãnh hậu quả khi ngưỡng đặt sai — hoặc bị cảnh báo nhiễu suốt đêm, hoặc bỏ sót sự cố thật.\n\nTác động: Chuẩn bị dữ liệu phân nhóm merchant cho kế hoạch rollout, và kiểm chứng luật phát hiện trên dữ liệu lịch sử, nếu làm tay mất khoảng 2–3 ngày công cho mỗi vòng. Mà thiết kế thì qua nhiều vòng. Rủi ro lớn hơn: một ngưỡng đặt sai chỉ lộ ra sau khi đã ảnh hưởng giao dịch thật.' },
  solution: { text: 'Không phải một sản phẩm cho người dùng cuối, mà là cách làm việc: dùng AI như một người review thiết kế có khả năng tính toán. Đầu ra gồm ba thứ chạy được — một script backtest tái chạy được trên dữ liệu giám sát thật, một simulator mở bằng trình duyệt để bấm thử từng kịch bản sự cố, và một bộ tài liệu đối chiếu thiết kế với hiện trạng code.\n\nAI làm được gì: Biến câu hỏi "ngưỡng bao nhiêu là đúng?" thành số. Thay vì tranh luận, chạy luật phát hiện trên chuỗi dữ liệu thật rồi đếm: cấu hình này báo nhầm bao nhiêu lần, bỏ sót bao nhiêu lần. Backtest còn tự tìm ra 2 sự cố đối tác chưa từng có trong timeline sự cố của team.\n\nCho phép bấm thử trước khi làm thật. Simulator tái hiện hệ thống với tỷ lệ lưu lượng thật; bấm gây sự cố là thấy ngay hệ thống phản ứng ra sao, chỉnh tham số là thấy ngay hệ quả — không cần chờ đưa lên production.\n\nTự chỉ ra chỗ nó đang không trung thực. Simulator có nút chuyển giữa "đúng theo tài liệu" và "bản đề xuất", kèm một nhãn luôn hiển thị đang lệch tài liệu ở bao nhiêu điểm và lệch chỗ nào. Điều này ngăn đúng cái bẫy dễ mắc nhất: demo một bản đã được sửa khéo rồi tưởng rằng thiết kế gốc chạy tốt.\n\nKết quả: Đã dùng cho design review thật, chưa phải sản phẩm go-live. Cụ thể: phân nhóm ~xxxx merchant thành 5 nhóm rollout; backtest tái chạy được trên dữ liệu giám sát thật; 9 vấn đề biên được ghi nhận, trong đó 1 kết luận bị chính AI rút lại sau khi đo thấy không tái hiện được; simulator có 74 kiểm thử tự động. Tiết kiệm khoảng 50–70% thời gian so với cách làm cũ, nhưng giá trị lớn hơn nằm ở chỗ những quyết định trước đây chốt bằng cảm tính giờ có số đo đi kèm.' },
}
