// Booth 22 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c32',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: '1-star review monitoring',
  desc: '',
  category: 'Data Analytics & Monitoring',
  author: 'Product',
  ownerTeam: 'Product',
  tools: [],
  topics: [],
  problem: { text: 'Công ty đang đặt KPI giảm số lượng review 1-star trên App Store/Google Play. Để theo dõi và tìm nguyên nhân, các PO hiện phải thu thập, tổng hợp và phân loại feedback thủ công mỗi tuần. Đây là công việc lặp đi lặp lại, tốn thời gian và khiến team mất nhiều effort cho việc xử lý dữ liệu thay vì tập trung vào phân tích insight và cải thiện sản phẩm.\n\nAi đang gặp: Tất cả Product Owner (PO) có sản phẩm/tính năng nhận feedback từ người dùng trên Store đều đang gặp vấn đề này.\n\nTác động: Việc collect và thống kê feedback thủ công hiện chiếm khoảng 5% thời gian/effort của PO, bao gồm các bước thu thập review, phân loại, tổng hợp và xác định nhóm vấn đề người dùng phản ánh nhiều nhất.\nVới số lượng feedback lớn, việc xử lý thủ công không chỉ mất nhiều thời gian mà còn có nguy cơ bỏ sót feedback, phân loại không nhất quán và chậm phát hiện các vấn đề nổi bật của người dùng.' },
  solution: { text: 'Công cụ AI Agent tự động thu thập và phân tích review 1->5 sao của ứng dụng Zalopay từ Google Play và Apple App Store. Giải pháp đã go-live dưới dạng dashboard dành cho các team sản phẩm.\n\nAI làm được gì: Tự xác định review thuộc phạm vi của từng team, phân loại vấn đề theo nhóm nguyên nhân và loại bỏ nội dung không liên quan. Mỗi team có thể mô tả sản phẩm bằng ngôn ngữ tự nhiên; AI sẽ gợi ý bộ tiêu chí phân loại phù hợp\n\nKết quả: Đã tổng hợp xxx review User Management, trong đó có xxx review 1 sao, từ hơn xx.xxx review. Dashboard được cập nhật định kỳ, giúp team nhanh chóng nhận diện vấn đề nổi bật và ưu tiên cải thiện sản phẩm.' },
}
