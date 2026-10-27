// Booth 20 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c30',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'VNGMeet – Trợ lý AI tìm và đặt phòng họp',
  desc: '',
  category: 'Config & Operations Automation',
  author: 'TEAM TEXAS CHICKEN',
  ownerTeam: 'TEAM TEXAS CHICKEN',
  tools: [],
  topics: [],
  problem: { text: 'Đặt phòng họp qua Outlook hiện hoàn toàn thủ công:\n• Không có cái nhìn tổng quan về phòng trống. Người đặt phải mở từng phòng, thử từng khung giờ, thường mất 10-15 phút chỉ để biết khung giờ cần đã hết phòng.\n• Phòng chỉ mở đặt trước 14 ngày. Với lịch họp cố định, người đặt phải canh đúng 0:00 để giữ phòng trước người khác.\n• Phòng bị huỷ hoặc trả lại trong ngày không được thông báo. Ai cần phòng phải tự vào kiểm tra lại nhiều lần.\n\nAi đang gặp: tất cả nhân viên cần đặt phòng họp, đặc biệt là Team Lead và Quản lý có lịch họp định kỳ.\n\nTác động: Giảm thời gian tìm phòng lặp lại mỗi ngày; họp trễ, họp đứng hoặc phải dời họp vì không tìm được phòng kịp.' },
  solution: { text: 'VNGMeet là AI agent dạng chatbot, kết nối trực tiếp với lịch phòng họp Microsoft 365 của công ty, dùng trên web tại https://vng-meet.ai.zalopay.xyz.\n\nAI làm được gì:\n• Đặt phòng bằng một câu chat: chỉ cần nhắn "Chiều nay có phòng nào 1 tiếng không?", agent trả về ngay các khung giờ còn phòng, đặt phòng sau khi người dùng bấm xác nhận và gửi lịch về Outlook. Agent cũng xem, đổi, huỷ lịch và chỉ đường kèm bản đồ đến phòng.\n• Không cần canh giờ mở lịch: người dùng đăng ký trước, agent tự đặt phòng đúng lúc lịch mở, kể cả lúc nửa đêm.\n• Tự động "săn" phòng trống (Room Scout): agent kiểm tra mỗi phút và tự giữ ngay phòng vừa được trả lại trong khung giờ người dùng cần.\n\nKết quả: Đã go-live trên ZaloPay Agent Base, đang sử dụng nội bộ. Trong tháng 8-9/2026:\n• Room Scout tự săn được phòng cho 70% yêu cầu (50/71), trung vị khoảng 30 phút kể từ lúc bật. Tỉ lệ thành công tăng từ 63% (tháng 8) lên 75% (tháng 9).\n• 15/27 cuộc họp đã diễn ra qua VNGMeet dùng phòng do Room Scout săn được.\n• Chatbot trả lời mỗi yêu cầu trong khoảng 10 giây, thay cho 10-15 phút tự dò phòng trên Outlook.' },
}
