// Booth 17 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c27',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'AI Home Configurator',
  desc: '',
  category: 'Config & Operations Automation',
  author: 'Product',
  ownerTeam: 'Product',
  tools: [],
  topics: [],
  problem: { text: 'Mỗi khi một team muốn hiển thị badge/animation/ app profile mới trên Home, PO Home phải tự đọc ticket, đối chiếu từng field và setup thủ công trên Home Tool. Mỗi loại badge/animation/app profile lại cần một bộ field khác nhau, nên rất dễ thiếu hoặc sai. Ticket thường chưa đủ thông tin ngay từ đầu, dẫn đến nhiều vòng hỏi qua lại với team yêu cầu trước khi config được.\n\nAi đang gặp: PO Home (người config) và các team domain gửi yêu cầu (phải chờ đợi).\n\nTác động: Mỗi lần config mất khoảng 3–5 ngày làm việc, chủ yếu do kiểm tra thông tin, chờ phản hồi và nhập tay nhiều field. Ngoài ra còn có rủi ro sai config trên màn hình có traffic cao nhất app.' },
  solution: { text: 'Một AI agent hỗ trợ PO Home trong quy trình config badge/animation cho app profile trên Home Tool.\n\nAI làm được gì:\n• Tự review ticket, kiểm tra team đã cung cấp đủ thông tin theo đúng loại badge/animation chưa.\n• Phản hồi lại team nếu còn thiếu, chỉ rõ thiếu gì, giúp giảm các vòng hỏi qua lại.\n• Khi ticket đã đủ thông tin, AI hỗ trợ setup trực tiếp trên Home Tool thay vì nhập tay từng field.\n\nKết quả: Thời gian config rút ngắn từ khoảng 3–5 ngày xuống còn khoảng 2 tiếng. Trạng thái: ready sandbox, đang áp dụng cho toàn bộ yêu cầu badge/animation/ app profile trên Home ở môi trường sandbox' },
}
