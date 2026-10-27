// Booth 32 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c42',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'CE Agent – Trợ lý AI cho QE Customer Experience',
  desc: '',
  category: 'Test Automation',
  author: 'Operations Platform',
  ownerTeam: 'Operations Platform',
  tools: [],
  topics: [],
  problem: { text: 'Mỗi lần release, QE phải tự tay kiểm thử lại hàng trăm thao tác trên CS Tool (tra cứu user, giao dịch, phong toả số dư, thu hồi tiền, ticket). Mỗi lần test lại phải chuẩn bị user đúng trạng thái: tạo tài khoản, KYC, nạp tiền. Công việc lặp lại, phải chuyển qua lại giữa 4–5 hệ thống (TestLink, Jira, Confluence, CS Tool), và phụ thuộc kinh nghiệm từng người.\n\nAi đang gặp: QE team CE trực tiếp chịu. PO/Dev nhận lỗi muộn. CS gặp lỗi khi đang hỗ trợ khách thì phải chờ fix.\n\nTác động: Test tay thường đi theo luồng chính nên dễ bỏ sót trường hợp biên, trong khi phong toả và thu hồi tác động trực tiếp vào tiền của khách. Thời gian regression tăng theo mỗi tính năng mới và lấn vào thời gian test tính năng mới.' },
  solution: { text: 'CE Agent là web app nội bộ, được xây dựng cùng AI (Claude Code). Nó gom việc kiểm thử về một chỗ và có robot tự thao tác trên CS Tool thật ở môi trường QC. Một phần testcase đã chuyển sang nền tảng TestAZ dưới dạng test API.\n\nAI làm được gì: Thiết kế testcase: AI khảo sát CS Tool thật để soạn 530 testcase cho 5 tính năng. QE chỉ cần duyệt.\nTự chạy kiểm thử: robot tự tạo user test, thao tác form, đối chiếu kết quả từng bước, báo PASS/FAIL kèm bằng chứng. Bấm 1 nút là chạy, không cần biết code.\nBắt lỗi người dễ bỏ sót: ví dụ robot phát hiện form vẫn tạo phong toả 0đ,...\n\nKết quả: Đang pilot trong team CE trên môi trường QC.\nKhoảng 130 testcase chạy tự động bằng 1 nút, gồm 78 case sinh từ bộ test design đã duyệt.\n31 testcase API trên TestAZ, mỗi case chạy khoảng 1 giây.\nGhi nhận 45 lỗi nghi ngờ của CS Tool (khi khảo sát và khi robot chạy), đang chờ QE/dev/PO xác nhận. 24 case robot đang FAIL được tự phân loại là nghi lỗi sản phẩm, QE xác nhận là tạo được bug Jira ngay.\nToàn bộ công cụ do 1 QE tự xây cùng AI.' },
}
