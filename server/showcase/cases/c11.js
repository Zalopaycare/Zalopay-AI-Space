// Booth 1 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c11',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'secreq — Trợ lý AI tiếp nhận & chuẩn bị thông tin yêu cầu pentest',
  desc: '',
  category: 'Software Development',
  author: 'Security',
  ownerTeam: 'Security',
  tools: [],
  topics: [],
  problem: { text: 'Trước mỗi lần pentest, kỹ sư bảo mật phải tự tay gom ngữ cảnh từ ticket yêu cầu: đọc ticket Jira, lần theo tài liệu Confluence (kể cả sơ đồ/ảnh), tìm đúng version đang deploy và source trên GitLab, rồi tự dò endpoint/host và gõ tay từng lệnh curl để test. Rất nhiều thao tác thủ công, lặp đi lặp lại, và thường phải chờ/hỏi dev khi thiếu thông tin.\n\nAi đang gặp: Kỹ sư AppSec / pentester (đồng thời giảm việc qua lại với Dev/PO).\n\nTác động: Mỗi lần chuẩn bị tốn nhiều thời gian đọc – tổng hợp – dựng request thủ công; dễ sót endpoint (nhất là API mới trong bản release), test nhầm version, hoặc thiếu ngữ cảnh khiến test không đầy đủ.' },
  solution: { text: 'secreq là một tool nội bộ dùng AI (chạy trên Claude), phục vụ team AppSec. Chỉ cần nhập mã ticket Jira, tool tự đọc ticket + tài liệu Confluence liên quan + kéo đúng source đã deploy trên GitLab, rồi xuất ra một trang tóm tắt chuẩn bị test. Dùng qua giao diện web.\n\nAI làm được gì:\n• Tự dựng sẵn bộ curl command chạy được cho từng API ngay từ source code (đúng bản đã deploy) — pentester copy-dán test được ngay, khỏi phải tự mò.\n• Đọc được cả sơ đồ/ảnh trong tài liệu, tự tìm "cách vào flow" (link, deeplink, . . .), và đánh dấu API nào là mới trong bản release này để ưu tiên test.\n• Tự trích dẫn nguồn cho từng thông tin, tự che thông tin nhạy cảm, và gom hết endpoint / host / môi trường / câu hỏi cho dev vào một chỗ.\n\nKết quả: Đang được team AppSec dùng thật trên các ticket pentest. Trạng thái: MVP/pilot, đã go-live nội bộ, có dashboard theo dõi lượng sử dụng. Rút ngắn thời gian chuẩn bị pentest từ vài tiếng xuống còn vài phút, giảm sót endpoint và đảm bảo test đúng version đang chạy.' },
}
