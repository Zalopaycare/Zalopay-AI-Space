// Booth 21 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c31',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'NodeZhub – Agent tự động hoá quy trình quản lý và thanh toán cho dự án UGC',
  desc: '',
  category: 'Config & Operations Automation',
  author: 'TEAM TRIPLE H',
  ownerTeam: 'TEAM TRIPLE H',
  tools: [],
  topics: [],
  problem: { text: 'Bối cảnh: Chương trình UGC hàng tháng của Zalopay, với 20+ Creator gồm 2 giai đoạn: pre-air (nộp, QC nội dung) và post-air (nghiệm thu). Thủ tục thanh toán yêu cầu Creator tự lập BBNT, gửi qua Admin để các phòng ban (FA, Legal, Accounting) duyệt, cuối cùng in ấn và ký tay để trình ký tiếp.\n\nVấn đề: Điểm nghẽn lớn nhất khiến dự án không thể scale up (giữ chân và tuyển thêm Creator) nằm ở khâu vận hành thanh toán. Do quy trình nhạy cảm với sai sót, chỉ một lỗi nhập tay nhỏ trong BBNT (sai metric, sai tiền, thiếu 1 chữ số tài khoản) cũng khiến quy trình phải bắt đầu lại từ đầu. Điều này dẫn đến hệ quả là Creator phải chờ 2-3 tháng mới nhận được tiền, trong khi một Admin duy nhất phải quá tải xử lý thủ công cho cả 20 người mỗi tháng.' },
  solution: { text: 'NodeZhub chuẩn hóa quy trình UGC từ onboard Creator, QC content 2 lớp đến xây dựng database để tự động hóa nghiệm thu và thanh toán nhờ 4 tính năng:\n• AI tự động trích xuất metrics từ link bài đăng: Trong thời gian air, hệ thống trích xuất real-time ngày đăng, view, like, save/share, reup trực tiếp từ link bài đăng để monitor performance. Cuối tháng, AI đọc view từ hình ảnh bài đăng để lập BBNT, đảm bảo view trên hình khớp view trên biên bản. Không nhập tay, không sai lệch.\n• Tự động tạo BBNT: Một click, BBNT hoàn chỉnh được tạo ra, đúng mã sản phẩm, đúng đơn giá theo rate card, tự động tính bonus và thuế TNCN (10% khi vượt ngưỡng 5 triệu), đúng cấu trúc. Gửi thẳng đến Creator.\n• AI Chatbot: Admin và Creator hỏi trực tiếp về performance bài đăng, trạng thái duyệt, số liệu, lịch sử thanh toán, không cần mở file, không cần hỏi qua lại.\n• Email báo cáo tự động: Kết thúc mỗi kỳ, Creator nhận email về trạng thái BBNT, rõ ràng, có thể truy vết.\n\nKhả năng mở rộng (beyond UGC): Một trong những core feature của agent là thu thập và chuẩn hoá dữ liệu đầu vào - trích xuất metrics real-time từ social platform - chuẩn hoá dữ liệu vào template biên bản có sẵn → có thể apply model này cho các dự án khác cần trích xuất metrics, cần làm hợp đồng/ nghiệm thu (cùng flow chỉ thay đổi dữ liệu đầu vào).\n\nKết quả: Đang pilot cho internal Zalopay và creators sử dụng\n\nKPI kỳ vọng: Hiện tại với quy trình thủ công, 95% biên bản nghiệm thu hằng tháng phải làm lại và mất 15 ngày mới có thể dùng BBNT để nộp eform. NodeZ Hub tự trích xuất số liệu và tạo BBNT, đưa tỉ lệ lỗi xuống còn 3% và thời gian nghiệm thu còn 4 ngày, ngay cả khi khối lượng tăng gấp 3 lần.' },
}
