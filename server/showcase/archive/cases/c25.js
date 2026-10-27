// Booth 15 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c25',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'OAO Config tool',
  desc: '',
  category: 'Config & Operations Automation',
  author: 'Bank Solutions',
  ownerTeam: 'Bank Solutions',
  tools: [],
  topics: [],
  problem: { text: 'Quy trình onboarding đối tác ngân hàng cho sản phẩm OAO hiện đòi hỏi cấu hình thủ công trên nhiều công cụ khác nhau (OAO Core, OAO Hub, OAO TnC, BankCode, Bank Status, OAO Decision, OAO Error Message), qua nhiều bước và tốn thời gian\n\nAi đang gặp: Dev, QC, PO\n\nTác động:\n• Thời gian cấu hình cho một bankCode/luồng mới còn dài, phụ thuộc vào việc thao tác tay trên nhiều bảng cấu hình.\n• Rủi ro sai sót khi clone/sửa cấu hình giữa các bankCode, domain khác nhau, khó review đầy đủ trước khi apply.\n• Kiến thức về cấu trúc cấu hình OAO tập trung ở một số ít người, gây phụ thuộc khi cần scale số lượng đối tác.' },
  solution: { text: 'là một bộ Skill kết hợp MCP Server và chatbot, tích hợp vào AI Agent mà người dùng đang sử dụng để hỗ trợ cấu hình OAO bằng ngôn ngữ tự nhiên\n\nAI làm được gì: AI Agent tự phân tích yêu cầu, xác định loại tác vụ và lựa chọn thao tác phù hợp. Hệ thống có thể hỗ trợ đọc, kiểm tra và thay đổi cấu hình; với các thay đổi, backend sẽ kiểm tra dữ liệu, tạo bản preview để người dùng xác nhận trước khi thực thi\n\nKết quả: Rút ngắn thời gian cấu hình OAO từ khoảng 3 giờ xuống còn 30 phút, tương đương giảm khoảng 83% thời gian thực hiện. Hiện giải pháp đang trong giai đoạn pilot' },
}
