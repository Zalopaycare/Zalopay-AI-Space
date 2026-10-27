// Booth 31 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c41',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'Automation Testing Tool - Hỗ trợ QC viết UI automation test bằng prompt',
  desc: '',
  category: 'Test Automation',
  author: 'Merchant Solutions',
  ownerTeam: 'Merchant Solutions',
  tools: [],
  topics: [],
  problem: { text: 'Mỗi lần release feature hoặc regression test, QC phải kiểm tra bằng tay trên điện thoại thật từng luồng của ứng dụng, như đăng nhập, xác thực thiết bị và thanh toán qua nhiều nguồn tiền. Regression test mất nhiều công nhất, vì các bước gần như giống nhau mà release nào cũng phải làm lại. Mỗi lần test còn cần tài khoản sạch hoặc tài khoản ở đúng trạng thái (KYC, đã liên kết ví, có Paylater…). QC phải tự tạo hoặc nhờ người khác chuẩn bị, rồi chờ.\n\nTác động: Đội QC ít người (cứ 1 QC thì có khoảng 4 Dev), không theo kịp lượng task Dev làm ra. Regression test lặp lại khi cần release tính năng. Test tay lặp lại dễ bỏ sót bước, dễ bị lệch giữa các lần chạy, và bằng chứng test (ảnh, video, báo cáo) phải tổng hợp bằng tay. Viết automation theo cách truyền thống thì lại cần người biết code, và mỗi lần UI đổi lại phải sửa script.' },
  solution: { text: 'Một bộ tool UI Automation cho app Zalopay, gồm 3 phần:\n• Một AI Agent, dùng Claude Code với Maestro MCP, đi kèm một skill riêng để viết test case.\n• Một runner tự động chạy test trên một hoặc nhiều thiết bị cùng lúc.\n• Tích hợp với tool UM để tạo và cấp phát tài khoản test.\nBộ tool đang được dùng cho QC suite Pay by Wallet và QuickPay Native.\n\nQC viết test bằng prompt, không cần code: QC mô tả test case bằng ngôn ngữ tự nhiên hoặc đưa vào test case có sẵn. AI tự mở app trên thiết bị thật, xem màn hình, tìm các thành phần ổn định để thao tác, rồi viết kịch bản test. Sau đó AI tự chạy thử, và nếu fail thì tự sửa cho tới khi chạy ổn định.\nChạy tự động từ đầu đến cuối: Chỉ cần một lệnh hoặc chọn trên menu, tool sẽ tự tạo hoặc nhận tài khoản sạch qua UM, hoặc lấy tài khoản đã chuẩn bị sẵn trạng thái.\nReport được generated sau mỗi lần chạy, có AI tóm tắt: Sau mỗi lần chạy, tool tự tạo báo cáo Markdown/HTML. Báo cáo có kết quả pass/fail, ảnh chụp màn hình lỗi, video ghi lại quá trình chạy và so sánh với lần chạy trước. AI viết thêm một đoạn tóm tắt ngắn, và báo cáo có thể đăng thẳng lên Confluence.\n\nKết quả: Đã áp dụng cho 2 suite với hơn 30 test case automation. Thiết kế dưới dạng platform dùng chung, nên team khác có thể thêm suite sản phẩm của mình mà không phải sửa phần lõi.' },
}
