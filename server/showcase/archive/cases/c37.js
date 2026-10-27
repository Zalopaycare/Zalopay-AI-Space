// Booth 27 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c37',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'Zalopay Website Operation skill',
  desc: '',
  category: 'Docs, Content & Design',
  author: 'Marketing Solutions',
  ownerTeam: 'Marketing Solutions',
  tools: [],
  topics: [],
  problem: { text: '• Brand team/Biz vận hành Zalopay Website dựa vào agency và một Admin Tool cũ, khó dùng.\n• Mỗi bài tốn xxx và 2–3 ngày, đi qua nhiều bên và nhiều vòng chỉnh sửa.\n\nAi đang gặp: Brand team/Biz (người vận hành nội dung website).\n\nTác động:\n• Số bài mới giảm từ ~39 bài/tháng (2025) còn ~10 bài/tháng (2026).\n• Ít bài, ít chủ đề (khuyến mãi, hướng dẫn, blog, tin tức); Zalopay ít xuất hiện trên social và tìm kiếm.\n• Chưa đáp ứng nhu cầu nội dung có cấu trúc chuẩn AIO/GEO để Google AI Overview, ChatGPT hiểu và trích dẫn.' },
  solution: { text: '• Plugin Zalopay Website cho Claude (Admin MCP + Skill): Brand team chat với AI để soạn và đăng bài ngay trong Strapi Admin.\n• Mỗi người dùng token cá nhân nên AI chỉ làm trong quyền của họ (Vd: Composer không publish được).\n• Đã chạy trên Production, cài bằng file vào Claude Desktop, có tài liệu setup.\n\nAI làm được gì:\n• Soạn bài từ brief trong một phiên chat (tin tức, blog review, khuyến mãi) và sửa bài theo feedback của người duyệt.\n• Viết đúng chuẩn AIO/GEO: heading theo ý hoặc câu hỏi, trả lời ngay câu đầu, SEO title/description riêng, alt text, chuyên mục, tag.\n• Giữ đúng sự kiện, lọc cụm văn sáo, ghi nguồn ảnh; AI chỉ tạo draft, publish cần xác nhận.\n\nKết quả:\n• Đã chạy thử nhiều dạng bài.\n• Tiếp theo: pilot với Brand team 2–3 tuần; từ T10/26 dùng làm công cụ nội dung chính cho dự án AIO (use case đầu tiên: sản phẩm cho vay).\n• Chỉ số theo dõi: số bài/tháng (baseline ~10), lead time (2–3 ngày), chi phí/bài (xxx), chất lượng, traffic. Giá trị kỳ vọng chốt sau pilot.' },
}
