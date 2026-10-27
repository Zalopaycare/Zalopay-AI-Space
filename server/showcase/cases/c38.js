// Booth 28 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c38',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'Product Backlog Assistant',
  desc: '',
  category: 'Docs, Content & Design',
  author: 'Product',
  ownerTeam: 'Product',
  tools: [],
  topics: [],
  problem: { text: 'PO phải tự đọc PRD rồi viết tay từng Feature, Epic, User Story trên Jira. Họ phải copy lại business rule, Acceptance Criteria, event tracking và link design cho từng ticket. Việc này lặp đi lặp lại, dễ sót hoặc lệch so với PRD. Khi PRD đổi thì backlog và PRD dễ không còn khớp nhau. Review PRD hay backlog đủ chưa cũng làm thủ công, không có checklist thống nhất.\n\nAi đang gặp: PO, Dev và QC\n\nTác động: Mỗi sprint PO mất tầm 3h để tạo tay từng feature, epic, và US\n\nRủi ro chính:\n+ Ticket thiếu hoặc sai so với PRD, dẫn đến hiểu nhầm scope khi grooming;\n+ Dev phải hỏi lại PO nhiều vòng;\n+ Backlog lệch PRD mà không ai phát hiện.' },
  solution: { text: 'Một AI skill chạy trong Claude, dùng PRD làm nguồn sự thật duy nhất. Skill đọc PRD trên Confluence rồi tạo Feature, Epic, User Story theo template cố định, mỗi trường có ghi rõ lấy từ mục nào của PRD. Người dùng là PO và PM. Skill có sẵn trong bộ PM Skills nội bộ, gọi bằng /product-backlog-assistant.\n\nAI làm được gì:\n+ Chuyển PRD thành backlog có truy vết. Skill copy nguyên văn các phần Context, Business Impact, Success Metrics, Acceptance Criteria (Given/When/Then), rồi tách Epic và Story một cách thận trọng. Nếu PRD thiếu thông tin, skill ghi Not found in PRD. thay vì tự bịa.\n+ Review PRD và backlog. Skill chỉ báo các gap, mâu thuẫn hoặc thiếu truy vết, và gắn nhãn Fact, Inference hoặc Recommendation để không lẫn khuyến nghị vào nội dung bắt buộc. Nó cũng so sánh PRD với backlog hiện có (thêm, sửa, xóa, không đổi).\n+ Kiểm soát trước khi ghi. Với mọi thao tác cập nhật trang Confluence hoặc tạo issue Jira, skill hiển thị patch preview hoặc publish plan trước, và chỉ ghi sau khi PO duyệt rõ ràng.\n\nKết quả: Đã triển khai trong thực tế' },
}
