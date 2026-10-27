// Booths from Zalopay AI Exhibition 2026 that are not written up on the site yet. The library shows
// them as small "Chưa có thông tin" tiles with a "Quan tâm" button. Booths 1, 2, 3, 4, 5, 10, 24, 27 are left out:
// their projects already have a full use case (c7, c4, c2, c9, c8, c3, c6, c5).
//
// members: PIC first, then the team, as company account names (the part before @), from the booth's
// "Member:" line on ai-exhibition.zalopay.vn (pics.js). They are shown on the tile and get the
// "Quan tâm" notification at <account>@ every company domain; interest counted earlier reaches them on start.
export default [
  { id: 'ex6', booth: 6, title: 'Zalopay MCP', team: 'UM', label: 'AI Week - Tech', category: 'Software Development', members: ['BonPV', 'NhuVTH', 'Minh2', 'HauNT2', 'NguyenC2', 'KhoaCH', 'BinhHQ', 'VinhPT2', 'DungNT26', 'ViNT8'] },
  { id: 'ex7', booth: 7, title: 'Edge-case detection', team: 'Product', label: 'AI Week - Product', category: 'Software Development', members: ['ThaiNLQ', 'TuTTM3'] },
  { id: 'ex8', booth: 8, title: 'Zalopay Product Knowledge Base', team: 'Product', label: 'AI Week - Product', category: 'Chatbot & Knowledge Search', members: ['DuyNQ5'] },
  { id: 'ex9', booth: 9, title: 'Clio KA - Chatbot trích xuất thông tin Link miniapp và gắn UTM tracking', team: 'Product', label: 'AI Week - Product', category: 'Chatbot & Knowledge Search', members: ['YenLTL', 'AnhTH4', 'VyTT8'] },
  { id: 'ex11', booth: 11, title: 'Zalopay Product Assistant – Pota MS Teams chatbot', team: 'Product', label: 'AI Week - Product', category: 'Chatbot & Knowledge Search', members: ['MinhHQ3', 'ThaiTV2', 'DuyNM'] },
  { id: 'ex12', booth: 12, title: 'ToTo – Agent hỏi đáp nội bộ, tận dụng Knowledge hub của SO/BD', team: 'TEAM SMEX & SO', label: 'Claw-a-thon - TEAM SMEX & SO', category: 'Chatbot & Knowledge Search', members: ['HieuLTN', 'HuyenVHK', 'SonDT6', 'SangNT6'] },
  { id: 'ex13', booth: 13, title: 'GRC Assistant – Tra cứu chính sách, quy trình, tiêu chuẩn và tài liệu ISMS của Zalopay', team: 'TEAM GRC', label: 'Claw-a-thon - TEAM GRC', category: 'Chatbot & Knowledge Search', members: ['HauLND', 'ThuNT6', 'ThiTTK2'] },
  { id: 'ex14', booth: 14, title: 'Agent tư vấn Luật – Hỗ trợ tư vấn pháp lý và rà soát rủi ro cho nhánh Business', team: 'TEAM LG', label: 'Claw-a-thon - TEAM LG', category: 'Chatbot & Knowledge Search', members: ['LongVT', 'ThaoPTX', 'TuPNC'] },
  { id: 'ex15', booth: 15, title: 'OAO Config tool', team: 'Bank Solutions', label: 'AI Week - Tech & Product', category: 'Config & Operations Automation', members: ['BachNT', 'NganTK3', 'KhoiNLM2', 'TuLHM', 'HieuNT28'] },
  { id: 'ex16', booth: 16, title: 'Cài đặt và test phí người dùng', team: 'Cashier Solutions', label: 'AI Week - Tech', category: 'Config & Operations Automation', members: ['QuangLTP'] },
  { id: 'ex17', booth: 17, title: 'AI Home Configurator', team: 'Product', label: 'AI Week - Product', category: 'Config & Operations Automation', members: ['QuynhTNK', 'LinhHNG'] },
  { id: 'ex18', booth: 18, title: 'Merchant Global: Human and Tool', team: 'ACC', label: 'Business Operations', category: 'Config & Operations Automation', members: ['ThuyVTT', 'HiepNDH', 'TrangPNP', 'MinhNNN', 'ChienNM2', 'QuyenNPT', 'ThanhLT3', 'CanhNH', 'DungNTT7', 'TuanNM4'] },
  { id: 'ex19', booth: 19, title: 'Operations Gallery & Full workflow - From prepare data to sharing dashboard.', team: 'ZOP', label: 'Business Operations', category: 'Config & Operations Automation', members: ['LinhTTC', 'HungNM10', 'HoaBTQ', 'HienTTD', 'ThamLH'] },
  { id: 'ex20', booth: 20, title: 'VNGMeet – Trợ lý AI tìm và đặt phòng họp', team: 'TEAM TEXAS CHICKEN', label: 'Claw-a-thon - TEAM TEXAS CHICKEN', category: 'Config & Operations Automation', members: ['CuongDM4', 'HuyenNN', 'AnhDT11'] },
  { id: 'ex21', booth: 21, title: 'NodeZhub – Agent tự động hoá quy trình quản lý và thanh toán cho dự án UGC', team: 'TEAM TRIPLE H', label: 'Claw-a-thon - TEAM TRIPLE H', category: 'Config & Operations Automation', members: ['HangLT5', 'HoangPT2', 'HuyLG4'] },
  { id: 'ex22', booth: 22, title: '1-star review monitoring', team: 'Product', label: 'AI Week - Product', category: 'Data Analytics & Monitoring', members: ['HaoHN'] },
  { id: 'ex23', booth: 23, title: 'Routing & traffic simulator', team: 'Product', label: 'AI Week - Product', category: 'Data Analytics & Monitoring', members: ['VuN'] },
  { id: 'ex25', booth: 25, title: 'Agreement Pay Success Monitoring Chatbot', team: 'Product', label: 'AI Week - Product', category: 'Data Analytics & Monitoring', members: ['ThangNT2', 'TuanDA9'] },
  { id: 'ex26', booth: 26, title: 'Protolysis - In-house AI-powered Usability Testing Analysis', team: 'Product', label: 'AI Week - Product', category: 'Data Analytics & Monitoring', members: ['KhaiNM', 'TrangKH', 'NamLH6'] },
  { id: 'ex28', booth: 28, title: 'Product Backlog Assistant', team: 'Product', label: 'AI Week - Product', category: 'Docs, Content & Design', members: ['VuongVX'] },
  { id: 'ex29', booth: 29, title: 'PO Tool Kit: bộ AI skill giúp PO đi từ ý tưởng tới ticket, prototype và báo cáo', team: 'Product', label: 'AI Week - Product', category: 'Docs, Content & Design', members: ['TinTK', 'NguyenTT7', 'LinhNP2', 'AnhNHM3', 'AnhDQ5'] },
  { id: 'ex30', booth: 30, title: 'MotionHub: Thư viện motion cho Zalopay', team: 'Product', label: 'AI Week - Product', category: 'Docs, Content & Design', members: ['HungPA2', 'KhangDLH'] },
  { id: 'ex31', booth: 31, title: 'Automation Testing Tool - Hỗ trợ QC viết UI automation test bằng prompt', team: 'Merchant Solutions', label: 'AI Week - Tech', category: 'Test Automation', members: ['DuNC', 'ThaiNA'] },
  { id: 'ex32', booth: 32, title: 'CE Agent – Trợ lý AI cho QE Customer Experience', team: 'Operations Platform', label: 'AI Week - Tech', category: 'Test Automation', members: ['TrangTT2', 'NhuVTH2'] },
]
