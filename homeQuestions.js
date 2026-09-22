// Ported from Zalopay AI Space v2.dc.html — the static QUESTIONS backing the
// "Questions Waiting for Answers" section and its quick-view modal.
export const QUESTIONS = [
  {
    id: 'q1', title: 'Làm sao để Claude tóm tắt PDF 80 trang mà không bỏ mất phần quan trọng?', body: 'Mình đang xử lý hợp đồng và tài liệu vận hành khá dài. Chia nhỏ theo trang thì mất ngữ cảnh, để nguyên thì model tóm tắt sơ sài. Mọi người thường chia tài liệu theo cách nào để giữ được mạch nội dung?', author: 'NgocTA', initials: 'NT', team: 'Product Ops', time: '3 giờ trước', category: 'Research & Knowledge', tools: ['Claude'], resolved: false, avatarBg: '#2c5fff',
    answers: [
      { id: 'a1', author: 'HaiPD', initials: 'HP', team: 'Data', time: '2 giờ trước', helpful: 8, body: 'Chia theo cấu trúc chứ đừng chia theo số trang. Tách theo chương/điều khoản, tóm tắt từng phần rồi mới gộp lại thành bản tổng.', avatarBg: '#2c5fff' },
      { id: 'a2', author: 'LinhVT', initials: 'LV', team: 'Brand', time: '1 giờ trước', helpful: 3, body: 'Mình thêm một bước: yêu cầu model liệt kê các mục quan trọng trước, sau đó mới tóm tắt theo đúng danh sách đó.', avatarBg: '#6F0CE2' },
    ],
  },
  { id: 'q3', title: 'Có cách nào tự động phân loại ticket CSKH theo chủ đề?', body: 'Mỗi ngày team nhận khoảng 400 ticket, phân loại tay không kịp. Mình muốn gắn nhãn tự động rồi mới route sang các nhóm xử lý.', author: 'TrucVN', initials: 'TV', team: 'Customer Support', time: '2 ngày trước', category: 'Automation & Workflow', tools: ['Gemini'], resolved: false, avatarBg: '#00A352', answers: [] },
  { id: 'q4', title: 'Dùng Copilot cho code nội bộ thì kiểm soát rò rỉ dữ liệu thế nào?', body: 'Team đang muốn bật Copilot cho repo nội bộ nhưng chưa rõ ranh giới dữ liệu nào được gửi ra ngoài và cần cấu hình gì.', author: 'DucMH', initials: 'DM', team: 'Engineering', time: '4 ngày trước', category: 'Coding & Technical', tools: ['Copilot', 'Claude'], resolved: false, avatarBg: '#6F0CE2', answers: [] },
  {
    id: 'q5', title: 'Prompt thế nào để AI viết caption đúng tone Zalopay?', body: 'Caption AI viết ra nghe chung chung, không giống giọng brand. Mọi người có cách nào đưa brand voice vào prompt hiệu quả không?', author: 'QuyenNT', initials: 'QN', team: 'Marketing', time: '5 ngày trước', category: 'Content & Communication', tools: ['ChatGPT'], resolved: false, avatarBg: '#B45300',
    answers: [
      { id: 'a5', author: 'MyNT', initials: 'MN', team: 'Marketing', time: '3 ngày trước', helpful: 6, body: 'Đưa 3-5 caption cũ đã được duyệt vào prompt làm mẫu giọng, kèm một danh sách từ nên tránh. Kết quả bám tone rõ hơn hẳn.', avatarBg: '#B45300' },
    ],
  },
  { id: 'q2', title: 'Viết mô tả sản phẩm bằng AI sao cho giữ đúng brand voice?', body: 'Đã giải quyết xong nhờ cách đưa 3-5 đoạn mẫu đã được duyệt vào prompt.', author: 'QuyenNT', initials: 'QN', team: 'Marketing', time: '1 ngày trước', category: 'Content & Communication', tools: ['ChatGPT', 'Gemini'], resolved: true, avatarBg: '#B45300', answers: [] },
]

export function replyLabel(n) {
  return n === 0 ? 'Chưa có trả lời' : n === 1 ? '1 reply' : n + ' replies'
}
