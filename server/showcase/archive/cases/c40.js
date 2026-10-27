// Booth 30 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c40',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'MotionHub: Thư viện motion cho Zalopay',
  desc: '',
  category: 'Docs, Content & Design',
  author: 'Product',
  ownerTeam: 'Product',
  tools: [],
  topics: [],
  problem: { text: 'Zalopay chưa có một nơi chung cho chuyển động. Mỗi khi cần một interaction như mở bottom sheet, báo thanh toán thành công, coin fly hay số dư nhảy số, mỗi người tự quyết định theo cảm giác: chọn duration nào, easing nào,vv. Code, prompt và kinh nghiệm motion nằm rải rác ở từng cá nhân và từng dự án. Muốn làm đúng thì phải đi hỏi designer, tự tìm lại dự án cũ, hoặc làm lại từ đầu. Khâu review cũng dựa vào trí nhớ của người duyệt, vì chưa có bộ tiêu chí nào để đối chiếu.\n\nAi đang gặp: Designer khi làm prototype, Dev khi đưa animation lên production, PO và Biz khi muốn tham khảo hoặc đề xuất một hiệu ứng nhưng không biết gọi tên nó là gì.\n\nTác động:\n• Mất thời gian lặp lại: cùng một hiệu ứng bị làm đi làm lại ở nhiều dự án\n• Motion thiếu nhất quán: cùng một hành động nhưng mỗi sản phẩm chuyển động một kiểu.' },
  solution: { text: 'MotionHub là hệ thống motion dùng chung của Zalopay, gồm principles, motion tokens, glossary và tổng hợp các transition, interaction, animation dưới định dạng .riv & .json để các team có thể xem, tái sử dụng và copy prompt hoặc css animation.\n\nMotionHub sẽ có Motion assistant được đóng gói lại thành 1 skill để các team có thể sử dụng dễ dàng hơn. Bộ skill này giúp:\n• Tìm và áp dụng animation bằng prompt: Bạn chỉ cần copy tên hiệu ứng có ở website MotionHub, AI sẽ tự động apply animation vào code\n• Gợi ý animation: Chỉ cần mô tả use case ví dụ như  "hiệu ứng khi user nhận thưởng"  hoặc gửi vào 1 ảnh chụp màn hình. AI sẽ gợi ý nên dùng dạng motion nào dựa vào motion principles\n• Đánh giá motion trong màn hình hoặc use case' },
}
