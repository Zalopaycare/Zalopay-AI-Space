// Booth 6 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c16',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'Zalopay MCP',
  desc: '',
  category: 'Software Development',
  author: 'UM',
  ownerTeam: 'UM',
  tools: [],
  topics: [],
  problem: { text: 'Một số công việc lặp đi lặp lại như sau:\n• Điều tra lỗi: Jira → CS Tool → log → Grafana → event → code.\n• Trả lời các các sếp: tại sao user A đi thanh toán bị otp, face authen ...\n• Kiểm tra log/chart của hệ thống khi có alert ...\n• Xuất thông tin user cho compliant\n• Tra cứu: user, OTP, giao dịch, eKYC, DB, API docs\n• Hành chính: tạo ticket đúng template, chuyển trạng thái hàng loạt, report sprint lên Confluence, mail report, mở MR, báo kết quả vào group Teams.\n• Copy–paste thủ công, lặp lại mỗi lần\n• Kiến thức tra cứu chỉ vài người nắm.\n• Thiếu quyền thì phải chờ người khác.\n\nAi đang gặp:\n• Dev, QC: trace ticket, alert, step sinh lỗi, nguyên nhân lỗi\n• PO/Biz: chờ người lấy số liệu.\n• CSKH: chờ dev trả lời ticket.\n• Lead: report sprint, giao task.\n\nTác động:\n• Tốn thời gian (ước lượng): trace 1 ticket mất 1–3 giờ, report sprint mất 1–2 giờ.\n• Dễ sai: đọc nhầm log, đổ lỗi sai bên, ticket lệch template.\n• Bỏ sót lỗi vì làm tay không đo nổi\n• Mất bằng chứng: log chỉ giữ ~5 tuần.\n• Phụ thuộc người: người nắm hệ thống vắng thì việc dừng.' },
  solution: { text: '• Bộ công cụ + skill cho AI agent (Claude Code / Codex), chạy ngay trên máy dev.\n• Nối AI vào hệ thống nội bộ: Jira, Confluence, CS Tool, log, Grafana, Superset, DB, Teams, mail, source code.\n• Đang dùng trong team PCF-UM.\n\nAI làm được gì:\n• Hỏi bằng tiếng Việt, AI tự đi tra các hệ thống rồi ghép thành câu trả lời. Ví dụ "vì sao user này lỗi" thì AI tự đọc ticket, log, thao tác trên app và code để chỉ ra nguyên nhân.\n• Tự lấy số liệu: bao nhiêu user bị ảnh hưởng, tỉ lệ lỗi, không cần nhờ data/dev query.\n• Làm thay việc lặp lại: tạo ticket Jira, report sprint, mở MR, soạn mail, nhắn Teams.\n\nKết quả:\n• Trạng thái: dùng nội bộ team PCF-UM hỗ trợ trace log/trace và trả lời csticket, tự động gửi mail/report ....' },
}
