// Booth 29 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c39',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'PO Tool Kit: bộ AI skill giúp PO đi từ ý tưởng tới ticket, prototype và báo cáo',
  desc: '',
  category: 'Docs, Content & Design',
  author: 'Product',
  ownerTeam: 'Product',
  tools: [],
  topics: [],
  problem: { text: 'Mỗi tháng PO mất nhiều thời gian cho những việc viết tài liệu như viết ticket Jira, PRD, ticket kick-off cho designer, tài liệu vận hành cho team Operation và báo cáo tháng. Cần số liệu thì phải gửi request rồi chờ 2 đến 5 ngày. PRD khó lường hết các edge case, nhiều trường hợp tới lúc dev bắt đầu thực hiện code mới gặp nhiều vấn đề cần giải quyết, khiến tính năng bị trễ release, có khi phải dừng lại để làm lại requirement. Mỗi PO lại tự viết prompt riêng, nên cách làm hay của người này không truyền sang được người khác.\n\nNgười bị ảnh hưởng trước tiên là PO, sau đó tới designer và dev, vì họ phải chờ đầu vào từ PO mới làm tiếp được.\n\nNếu làm hoàn toàn bằng tay, riêng một PO đã mất khoảng 130 giờ mỗi tháng cho nhóm việc này, gần 80% thời gian làm việc, nên còn rất ít thời gian cho việc tìm hiểu người dùng và định hướng sản phẩm.' },
  solution: { text: 'PO Tool Kit là bộ 32 AI skill chạy trên Claude Code. Mỗi skill là quy trình chuẩn cho một đầu việc của PO, nằm trong repo chung có review và ai cũng cài được. AI soạn bản đầu, PO duyệt trước khi AI ghi vào Jira hay Confluence.\n\nToolkit giúp PO ở 3 điểm:\n\nGiảm execution effort. Ticket, PRD, SOP và báo cáo tháng đều có template sẵn, AI viết bản đầu và PO chỉnh. PO tự lấy số trên Jupyter, Metabase ngay. Trong Q3, một PO tiết kiệm ước tính khoảng 44 giờ mỗi tháng.\n\nNâng chất lượng đầu ra. Ticket và PRD viết đủ 7 mục theo chuẩn của team UXD, có kèm wireframe. PO tự dựng được prototype bấm thử để bàn giao cho designer. Requirement được phản biện bằng code thật trước khi chốt, phát hiện edge case sớm. Tài liệu trên Confluence được cập nhật đều đặn, có cả bản VN và EN. Ở tính năng QR login, designer ra prototype trong khoảng 1 ngày, tính năng lên production và 0 bug khi test.\nCó thêm thời gian cho việc quan trọng. Số giờ tiết kiệm được dồn sang discovery, lên ý tưởng, lập kế hoạch và chiến lược sản phẩm. Q3 đã có 13 ticket Design kèm wireframe và 5 prototype, đều là việc trước đây PO không đủ effort làm.\n\nTrạng thái: đang dùng trong việc thật, skill repo có 4 người đóng góp. Q4 mở rộng cho 3 đến 5 PO của 2 squad.' },
}
