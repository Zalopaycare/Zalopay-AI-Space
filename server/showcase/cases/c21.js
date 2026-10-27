// Booth 11 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c21',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'Zalopay Product Assistant – Pota MS Teams chatbot',
  desc: '',
  category: 'Chatbot & Knowledge Search',
  author: 'Product',
  ownerTeam: 'Product',
  tools: [],
  topics: [],
  problem: { text: 'Bối cảnh: Khi cần tìm hiểu về một sản phẩm hoặc xử lý một giao dịch gặp lỗi, các team thường phải tự tìm tài liệu ở nhiều nơi trên Confluence, hỏi người đang nắm context, rồi dev phải lần theo logs bằng các identifier như bc_trans_id, requestId hoặc user_id.\n\nVấn đề: Việc tra cứu kiến thức và điều tra incident vẫn mang tính thủ công, lặp lại và phụ thuộc nhiều vào một vài Dev PIC của từng product. Các câu hỏi cơ bản cũng phải chờ phản hồi; với một case lỗi cụ thể, nhiều team phải handoff qua lại trước khi bắt đầu điều tra.\n\nAi đang gặp: Dev, QC, PO, Biz/Ops, CS và đặc biệt là các thành viên mới tham gia project.\n\nTác động: Dev PIC dễ trở thành bottleneck vì vừa phải xử lý công việc chuyên môn, vừa liên tục giải đáp câu hỏi và hỗ trợ truy vết incident. Điều này làm chậm thời gian phản hồi, tạo rủi ro hiểu sai do knowledge phân tán, đồng thời khiến Dev PIC không thể tập trung vào các việc có giá trị cao hơn như phát triển tính năng, xử lý vấn đề phức tạp hoặc cải thiện hệ thống.' },
  solution: { text: 'Product Assistant là chatbot nội bộ trên Microsoft Teams, có thể được @mention trực tiếp trong cuộc hội thoại, đóng vai trò là điểm truy cập thống nhất cho product knowledge và investigation. Bot hiện ở giai đoạn MVP/pilot cho product Cross-border, dùng knowledge base của product để trả lời câu hỏi, đồng thời có thể chuyển yêu cầu điều tra một case thực tế sang investigation service.\n\nAI làm được gì:\n• Trả lời câu hỏi về product bằng tiếng Việt hoặc tiếng Anh, dựa trên tài liệu được cung cấp. Nếu tài liệu không có thông tin, bot sẽ nói rõ thay vì tự tạo câu trả lời.\n• Phân biệt câu hỏi kiến thức chung và incident thực tế. Ví dụ, "Quick Pay là gì?" được trả lời từ tài liệu; còn "Kiểm tra vì sao giao dịch này timeout" sẽ được chuyển sang luồng investigation.\n• Hỗ trợ khởi động quá trình điều tra từ mô tả và identifier người dùng cung cấp, rồi trả kết quả ngay trong Teams thay vì phải nhờ dev tìm log trên nhiều hệ thống.\n\nKết quả: MVP giúp giảm sự phụ thuộc vào Dev PIC đối với các câu hỏi lặp lại và nhu cầu tra cứu ban đầu. Dev PIC được giải phóng khỏi các tác vụ hỗ trợ thường xuyên để tập trung vào công việc quan trọng hơn; các team khác có thể tự tra cứu thông tin nhanh, chính xác và bắt đầu investigation nhanh hơn ngay trong workflow quen thuộc trên Teams.' },
}
