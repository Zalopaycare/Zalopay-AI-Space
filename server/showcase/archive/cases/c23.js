// Booth 13 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c23',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'GRC Assistant – Tra cứu chính sách, quy trình, tiêu chuẩn và tài liệu ISMS của Zalopay',
  desc: '',
  category: 'Chatbot & Knowledge Search',
  author: 'TEAM GRC',
  ownerTeam: 'TEAM GRC',
  tools: [],
  topics: [],
  problem: { text: 'Bộ tài liệu ISMS của ZION gồm 51 chính sách, quy trình và tiêu chuẩn trên SharePoint, mỗi tài liệu dài hàng chục trang. Mỗi lần cần biết "mật khẩu tối thiểu mấy ký tự", "đưa dịch vụ lên cloud cần ai duyệt" hay "log phải lưu bao lâu", mọi người phải tự lục tài liệu hoặc nhắn hỏi Phòng Tuân thủ rồi chờ trả lời.\n\nAi đang gặp: mọi nhân viên cần làm đúng quy định (Dev, QC, PO, Ops, Biz), và nhóm GRC, những người vừa phải trả lời các câu hỏi lặp đi lặp lại, vừa phải quản lý nhiều file Excel rời: sổ tài liệu, SoA, findings & CAPA, sổ rủi ro, sổ tài sản của từng phòng.\n\nTác động: Người hỏi phải chờ, trong khi nhóm GRC tốn thời gian cho những câu đã có sẵn trong tài liệu.\nDữ liệu nằm rải rác trong Excel nên trước mỗi kỳ audit rất khó thấy ngay CAPA nào đã quá hạn hay laptop nào chưa vào sổ tài sản.' },
  solution: { text: 'GRC Assistant là chatbot AI chạy trên web (grc-assistant.zalopay.xyz, đăng nhập bằng tài khoản Microsoft công ty), kèm bộ trang quản trị cho nhóm GRC. Bản trên Microsoft Teams đang triển khai.\n\nAI làm được gì: Hỏi gì về ISMS cũng có câu trả lời kèm nguồn. Bot chỉ trả lời từ 51 tài liệu đã duyệt, và mỗi câu trả lời có trích dẫn bấm vào là mở đúng trang tài liệu. Tài liệu không có thì bot nói thẳng và chuyển câu hỏi cho Phòng Tuân thủ, không bịa. Bot hỏi được bằng ảnh chụp màn hình hoặc ảnh chụp trang tài liệu.\nChỉ đúng người cần hỏi. Hỏi "phòng Tuân thủ gồm ai" hay "ai phụ trách Security", bot trả lời từ danh bạ 615 nhân sự ZION, kèm nút chat Teams để nhắn ngay.\nThay các file Excel của nhóm GRC bằng web. Sổ tài liệu, SoA, findings & CAPA, sổ rủi ro và sổ tài sản đều sửa trực tiếp trên web, có lịch sử. Laptop được tự đối chiếu với ManageEngine. Mỗi phòng tự cập nhật sổ của mình theo phân quyền và thấy việc quá hạn ngay trên trang chat.\n\nKết quả: Bản web đã go-live.\nTừ 19/09 đến 07/10/2026 bot nhận khoảng 450 câu hỏi và trả lời được 75%; phần còn lại là câu ngoài phạm vi bị từ chối đúng hoặc được chuyển cho Phòng Tuân thủ.\nBộ 83 bài kiểm tra tự động trên production đều đạt.\nBot trên Microsoft Teams đang triển khai, sẽ dùng được cho toàn công ty khi IT phát hành.' },
}
