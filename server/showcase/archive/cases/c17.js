// Booth 7 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c17',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'Edge-case detection',
  desc: '',
  category: 'Software Development',
  author: 'Product',
  ownerTeam: 'Product',
  tools: [],
  topics: [],
  problem: { text: 'Khi lên ticket cho các flow nghiệp vụ có nhiều luật chồng chéo, PO không thể lường hết mọi edge case ngay từ đầu vì logic trải rộng qua thời gian, nhiều đối tác (XXX, XXX, XXX,...), nhiều entry-point khác nhau. Hệ quả: edge case thường chỉ lộ ra sau grooming — khi dev đã bắt đầu đọc code để implement, hoặc khi QA test — buộc phải quay ngược lại sửa ticket giữa chừng, đôi khi lộ ra thiếu use case ở phần Design, phải workaround nhiều bên.\n\nAi đang gặp: PO (ticket phải sửa lại giữa chừng), Dev (phát hiện impact muộn, phải dừng lại báo ngược thay vì code thẳng), Design (bị động bổ sung use case khi đã quá trễ), và cả team grooming nói chung (phải trao đổi qua lại nhiều vòng).\n\nTác động: Mỗi lần edge case phát hiện trễ kéo theo ít nhất một vòng grooming nhanh lại, dev phải rework phần đã code, design phải chạy bổ sung gấp. Vấn đề này càng rõ hơn ở các domain phức tạp — nhiều đối tác, nhiều điểm vào cùng chạm 1 lõi hệ thống — nơi một thay đổi tưởng nhỏ có thể ảnh hưởng dây chuyền ra ngoài phạm vi ticket ban đầu mà PO không có cách nào thấy trước chỉ bằng mắt thường.' },
  solution: { text: 'Edgecase Detection — bộ AI agent chạy trên Claude Code, build riêng cho từng flow nghiệp vụ, có nhiệm vụ đọc code thật và "đánh" ra các edge case trước khi ticket vào grooming. PO dùng trực tiếp trong workflow cá nhân, kích hoạt ngay khi có ticket/thay đổi, trước khi đưa vào lịch grooming.\n\nAI làm được gì:\n• Tự đọc code thật trong các repo liên quan thay vì chỉ dựa trên tài liệu, đối chiếu với bộ invariant/business rule đã được hệ thống hóa cho từng flow.\n• Tự lần theo các nhánh phụ thuộc chéo flow/chéo repo (blast radius) để phát hiện impact mà PO hay dev khó thấy chỉ từ nội dung ticket.\n• Trả về báo cáo nêu rõ edge case cần lưu ý và những phần "chưa kiểm chứng được bằng code" — đóng vai trò như một dev sắp bắt tay vào implement, chủ động hỏi ngược trước khi code thay vì sau khi code xong.\n\nKết quả: Đang ở giai đoạn pilot, PO tự vận hành song song trên nhiều flow. Kết quả ghi nhận được: giảm số vòng grooming phải họp lại, phát hiện sớm các rủi ro liên repo/liên flow trước khi dev chạm vào code. Nhánh thử nghiệm mới nhất (PayLater luồng Onboarding) mở rộng Edgecase Detection sang một domain phức tạp hơn — nhiều đối tác cho vay, nhiều điểm vào cùng chạm chung 1 lõi hệ thống — để kiểm chứng liệu pattern này có scale được lên độ phức tạp cao hơn hay không.' },
}
