// Booth 12 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c22',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'ToTo – Agent hỏi đáp nội bộ, tận dụng Knowledge hub của SO/BD',
  desc: '',
  category: 'Chatbot & Knowledge Search',
  author: 'TEAM SMEX & SO',
  ownerTeam: 'TEAM SMEX & SO',
  tools: [],
  topics: [],
  problem: { text: 'Quy trình và chính sách nằm rải rác trong nhiều file PDF, Word, Excel, Slide. Mỗi lần tra cứu mất 10–15 phút. Nếu phải hỏi người khác thì có khi chờ nhiều ngày, thậm chí cả tuần.\n\nAi đang gặp: Nhân viên tất cả phòng ban, đặc biệt là Biz, Ops và nhân sự mới, những người thường xuyên cần tra cứu kiến thức nghiệp vụ.\n\nTác động:\n• Mỗi nhân viên mất 30–60 phút/ngày chỉ để tìm thông tin.\n• Kiến thức phụ thuộc vào một vài người, nhân viên phải tìm đúng PIC mới hỏi được. Khi PIC nghỉ phép hoặc nghỉ việc, team không có ai trả lời thay, đôi khi phải đợi vài ngày hoặc cả tuần.\n• Không có câu trả lời kịp thời làm chậm công việc và có thể ảnh hưởng đến SLA.\n• Người có kinh nghiệm bị hỏi đi hỏi lại cùng một câu, mất thời gian cho việc chính.\n• Mỗi người trả lời một kiểu, hoặc dùng tài liệu cũ, dễ dẫn đến xử lý sai.' },
  solution: { text: 'Toto là AI Agent tra cứu tri thức nội bộ, đang triển khai trên web Zalopay. Toto gom kiến thức từ các tài liệu rời rạc thành một nguồn duy nhất, tìm kiếm được ngay lập tức.\n\nAI làm được gì:\n• Nhân viên hỏi bằng ngôn ngữ tự nhiên, Toto trả lời dựa trên tài liệu nội bộ và kèm nguồn tham chiếu để kiểm chứng nhanh, người dùng có thể tự tải file tài liệu để xem và lưu trữ.\n• Toto phân quyền kiến thức theo phòng ban và không tự suy đoán khi không tìm thấy thông tin phù hợp.\n• Toto sẵn sàng phục vụ tra cứu 24/7, không phụ thuộc vào việc PIC có online hay không.\n\nKết quả: Toto đã go-live pilot với BD và OP-SMEX, đạt 91/92 test cases.\n• Nhanh hơn: Thời gian có câu trả lời giảm từ 10–15 phút (có khi vài ngày) xuống dưới 1 phút. Nhân viên chủ động xử lý việc, góp phần đảm bảo SLA.\n• Giảm phụ thuộc vào người: Không cần tìm PIC. Kiến thức vẫn còn khi PIC nghỉ phép hoặc nghỉ việc.\n• Giải phóng thời gian cho người quản lý quy trình: Họ không còn bị hỏi lặp lại và tập trung được vào việc chính.\n• Trả lời đồng nhất: Mọi người dùng chung một nguồn tài liệu, giảm sai sót do mỗi người hiểu một kiểu.\n• Onboarding nhân sự mới nhanh hơn vì họ tự tra cứu được.\n• Dễ mở rộng: Team nào có tài liệu và nhu cầu tra cứu đều có thể xây kho tri thức riêng trên Toto.' },
}
