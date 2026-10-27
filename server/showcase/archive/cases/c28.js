// Booth 18 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c28',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'Merchant Global: Human and Tool',
  desc: '',
  category: 'Config & Operations Automation',
  author: 'HùngNM',
  ownerName: 'HùngNM',
  ownerTeam: 'ACC',
  tools: [],
  topics: [],
  problem: { text: 'Mỗi tháng team Kế toán lập hơn xxx bộ hồ sơ thanh toán cho merchant quốc tế (hơn xx merchant đã onboard, x–x merchant mỗi ngày). Phải dò trung bình hơn xxx.xxx dòng giao dịch mỗi ngày (ngày cao điểm tới xxx.xxx dòng) trên nhiều file (AR, SFTP, sao kê ngân hàng), tra tỷ giá từng ngày, rồi copy số liệu sang Excel/Word để lập file Banking, Lệnh chi, bảng Tổng hợp gửi ngân hàng và Hợp đồng mua bán ngoại tệ. Người đối soát phải bàn giao hồ sơ cho người lập chứng từ qua mail/chat, thường phải chờ nhau.\n\nAi đang gặp: Kế toán công nợ (đối soát Merchant Global) và Kế toán thanh toán ngoại tệ (lập chứng từ), mỗi ngày 2 người phụ trách 2 bước trên 2 máy khác nhau (không cố định người: ai được phân quyền đều có thể vào làm). Gián tiếp: bộ phận CM/Treasury nhận file chuyển tiền.\n\nTác động: Khoảng 120 phút thao tác lặp lại mỗi ngày, tương đương 528 giờ ≈ 66 ngày công mỗi năm. Tiền thật được chuyển ra nước ngoài dựa trên những con số gõ tay này: sai một chữ số tỷ giá, số tiền hay số PMR là chi sai hoặc chi trùng tiền thật.' },
  solution: { text: 'Tool "Merchant Global" trên ZDS AI Portal, do chính kế toán (không phải dev) tự xây dựng cùng AI (Claude) trong 2 tháng, kèm 2 extension trình duyệt tự điền tỷ giá và số liệu FABO. Đang dùng hằng ngày tại team Kế toán Zalopay.\n\nAI làm được gì:\n1) Thả tất cả file vào một ô: tool tự nhận diện loại file, tự đối soát và chỉ ra dòng lệch.\n2) Một nút bấm ra trọn bộ chứng từ: file Banking, Lệnh chi, Tổng hợp gửi bank theo từng đợt, Hợp đồng ngoại tệ. Đúng tỷ giá, đúng ngày, tự đặt tên và lưu ZDS Drive theo ngày.\n3) Chặn sai sót và bỏ bước chờ: cảnh báo chi trùng PMR, thiếu tỷ giá; người đối soát bấm Hoàn tất là người lập chứng từ nhận ngay, không cần mail qua lại.\n\nKết quả: Đã go-live, dùng hằng ngày.\n• Trả lại ~66 ngày công mỗi năm (≈ 120 phút/ngày, 44 giờ/tháng).\n• ~xxx bộ hồ sơ thanh toán quốc tế mỗi tháng ra bằng một nút; trung bình hơn xxx.xxx dòng giao dịch mỗi ngày (cao điểm xxx.xxx dòng) được đối chiếu tự động.\n• Tự chặn chi trùng PMR đã lập, cảnh báo thiếu tỷ giá; gần như không còn gõ tay tỷ giá và số tiền.\n• xx+ merchant đã onboard, thêm merchant mới không cần thêm người. Hai bước nghiệp vụ chạy song song trên 2 máy; nhờ phân quyền theo từng tab, ai được cấp quyền đều có thể vào đúng vị trí.' },
}
