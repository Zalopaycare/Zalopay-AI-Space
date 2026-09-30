export default {
  id: 'c5',
  postedAt: '2026-09-23',
  title: 'Để AI viết bài blog, tin tức cho website Zalopay, bớt thuê Agency',
  toolName: 'zlpws-admin-mcp',
  desc: 'Người vận hành website gõ yêu cầu cho trợ lý AI, nhận bài blog nháp đã tạo sẵn trên trang thử nghiệm của zalopay.vn.',
  type: 'tool',
  status: 'inuse',
  statusNote: 'Kết quả AI Week 2026 · trạng thái DONE',
  kind: 'tech',
  level: 'ready',
  category: 'Marketing',
  topics: ['Nội dung website', 'Viết bài bằng AI'],
  tools: ['Codex', 'Claude', 'ChatGPT'],
  promptTarget: 'Codex (đã cài plugin zlpws-admin)', // where the sample prompts are sent (shown on each prompt box)
  audience: 'Business/Ops, Marketing & Content',
  difficulty: 'Trung bình',
  access: '[cần bổ sung]',
  author: 'LuanNA',
  ownerName: 'Luân. Nguyễn Anh',
  ownerTeam: 'MS',
  updated: '',
  cover: '/use-cases/c5/human-score-ai.png',
  stats: [
    { value: '6%', extra: '', label: 'human score của bài AI, bằng bài Agency đang live (6%) — đo trên 1–2 bài mẫu đầu' },
  ],

  tldr: [
    ['Vấn đề', 'Biz phải thuê Agency viết bài: hơn 300k/bài, 2–3 ngày/bài; bài AI viết thì nghe quá "máy".'],
    ['Giải pháp', 'Cài bộ kết nối cho trợ lý AI, gõ yêu cầu bằng tiếng Việt, AI tự viết và tạo bài nháp trên website.'],
    ['Kết quả', 'Bài AI đầu tiên đạt human score 6%, tương đồng bài Agency đang live trên zalopay.vn (1–2 mẫu).'],
    ['Dùng khi', 'Bạn cần lên bài Blog hoặc Tin tức (News items) cho zalopay.vn.'],
  ],

  problem: {
    text: 'Đội vận hành website zalopay.vn đang dùng một trang quản trị khó dùng và đã cũ. Phần lớn bài viết phải thuê Agency.',
    bullets: [
      'Ai gặp: Operator và Biz, những người đang vận hành website.',
      'Việc tốn công: mỗi bài qua nhiều bên và nhiều vòng duyệt, mất 2–3 ngày/bài.',
      'Tốn bao nhiêu: thuê Agency hơn 300k/bài (nguồn: bảng chi phí viết bài của Agency 2025).',
      'Số bài mới mỗi tháng: 39 bài năm 2025 (tổng 469), khoảng 10 bài năm 2026 (tổng 119 đến tháng 7).',
      'Rào cản lớn nhất để Biz tự dùng AI: giọng văn thiếu tính con người, quá "màu AI", dễ nhận ra.',
    ],
    tables: [
      {
        title: 'Chi phí viết bài của Agency (2025)',
        note: 'Hạng mục "Phát triển nội dung". Dòng đầu gồm: lên dàn ý chi tiết theo từ khoá chính, lên từ khoá phụ, phát triển bài viết, cung cấp chuẩn SEO (chưa gồm hình ảnh).',
        cols: ['Loại bài', 'Đơn giá (đồng)', 'Số lượng', 'Thành tiền (đồng)'],
        rows: [
          ['Bài viết 1000–1200 từ', '315,000', '150', '47,250,000'],
          ['Bài viết 1200–2000 từ', '630,000', '50', '31,500,000'],
          ['Bài viết 2000–3000 từ', '945,000', '30', '28,350,000'],
          ['Bài viết trên 3000 từ', '1,260,000', '20', '25,200,000'],
        ],
      },
    ],
    images: [
      { src: '/use-cases/c5/agency-cost-2025.png', caption: 'Bảng chi phí viết bài của Agency năm 2025, hạng mục "Phát triển nội dung".' },
    ],
  },

  solution: {
    analogy: 'Hiểu đơn giản: như có một người viết bài nội bộ ngồi sẵn trong trang quản trị, bạn chỉ cần giao đề bài.',
    steps: [
      'Bạn: cài bộ kết nối cho AI (MCP) và bộ hướng dẫn (skill) vào trợ lý AI một lần.',
      'Bạn: gõ yêu cầu bằng tiếng Việt, ví dụ chủ đề bài và cách lấy ảnh minh hoạ.',
      'AI: viết bài, tìm hoặc tạo ảnh minh hoạ, rồi tạo bài nháp trên trang thử nghiệm (sandbox) của website.',
      'Bạn kiểm tra: mở link bài nháp, đọc lại, chấm human score trước khi cho lên trang chính.',
    ],
    images: [],
  },

  result: {
    beforeAfter: {
      cols: ['Chỉ số', 'Trước (Agency)', 'Sau (AI)'],
      rows: [
        ['Human score (humalingo.com)', '6% (bài Agency đang live)', '6% (bài AI mẫu)'],
        ['Chi phí mỗi bài', 'Hơn 300k/bài', 'Chưa đo — dự kiến đo "chi phí mỗi bài tạo bằng AI"'],
        ['Thời gian lên 1 bài', '2–3 ngày', 'Chưa đo'],
        ['Tỉ lệ bài tạo bằng AI', '—', 'Chưa đo — gắn cờ bài tạo qua AI, đếm trong dữ liệu trang quản trị'],
      ],
      note: 'Human score đo bằng humalingo.com/public/detect trên 1–2 bài mẫu đầu của AI và 1 bài Agency đang live.',
    },
    bullets: [
      'Kết luận trong tài liệu: 1–2 bài mẫu đầu của AI có human score tương đồng bài đã duyệt và đang live trên zalopay.vn.',
      'Đã có 2 bài AI tạo trên trang thử nghiệm: review phim The Odyssey 2026 và tin Zalopay được vinh danh tại Mastercard Customer Forum 2025.',
      'Đã hỗ trợ toàn bộ việc vận hành bài News items (Blogs và Tin tức), loại nội dung dùng nhiều nhất.',
    ],
    tables: [
      {
        title: 'Chi tiết báo cáo humalingo (Deep Analysis report)',
        note: 'Bài AI: review phim The Odyssey 2026 (sandbox). Bài Agency: review phim Moana live action 2026 (zalopay.vn).',
        cols: ['Chỉ số', 'Bài AI', 'Bài Agency'],
        rows: [
          ['Human score', '6%', '6%'],
          ['AI score', '94%', '94%'],
          ['Sentence structure', '3% (Critical)', '3% (Critical)'],
          ['Readability', '31%', '33%'],
          ['Human written / Mixed', '0 / 0', '0 / 0'],
          ['AI Generated phrasing', '41', '24'],
        ],
      },
    ],
    note: 'Đo trên 1–2 bài mẫu. Tỉ lệ bài AI và chi phí AI mỗi bài: chưa đo.',
    images: [
      { src: '/use-cases/c5/human-score-ai.png', caption: 'Bài AI (review phim The Odyssey 2026): human score 6%, AI score 94%, readability 31%.' },
      { src: '/use-cases/c5/human-score-agency.png', caption: 'Bài Agency đang live (review phim Moana 2026): human score 6%, AI score 94%, readability 33%.' },
    ],
  },

  apply: {
    intro: 'Hiện cài qua Codex bằng 2 lệnh. Sau đó bạn chỉ cần gõ yêu cầu bằng tiếng Việt như prompt mẫu bên dưới.',
    fit: {
      yes: [
        'Bạn vận hành bài Blog hoặc Tin tức (News items) trên zalopay.vn.',
        'Bạn muốn tự lên bài thay vì thuê Agency và chờ 2–3 ngày.',
      ],
      no: [
        'Bạn cần AI hỗ trợ SEO (chưa làm ở giai đoạn này).',
        'Bạn cần vận hành loại nội dung khác ngoài News items.',
      ],
    },
    prep: [
      'Trợ lý AI Codex trên máy của bạn (cài bộ kết nối qua kho plugin nội bộ).',
      'Quyền truy cập kho plugin nội bộ trên GitLab: [cần bổ sung nơi xin quyền]',
      'Tài khoản trang quản trị website để AI tạo bài: [cần bổ sung nơi xin quyền]',
      'Chủ đề bài viết, và nguồn ảnh bạn cho phép AI dùng.',
    ],
    steps: [
      'Mở Codex, chạy 2 lệnh cài bên dưới (một lần duy nhất).',
      'Gõ yêu cầu cho AI; sửa chủ đề và phần ảnh theo bài của bạn.',
      'Đợi AI viết bài và trả về link bài nháp trên sandbox.zalopay.vn.',
      'Mở link, đọc lại bài, chấm human score tại humalingo.com/public/detect.',
      'Đưa bài lên trang chính: [cần bổ sung]',
    ],
    blocks: [
      {
        type: 'prompt',
        label: 'Prompt mẫu (dùng cho bài review phim The Odyssey 2026)',
        text: 'Hãy tạo một bài blog draft cho zalopay.vn.\nChủ đề: Review phim The Odyssey 2026\nCác ảnh của bài viết tạo mới giúp tôi hoặc tìm và tải các poster, ảnh\nchụp phân cảnh trong phim từ các nguồn public về để minh họa giúp tôi,\nvui lòng ghi rõ nguồn nếu sử dụng y nguyên từ nguồn',
      },
      {
        type: 'result',
        label: 'Kết quả mẫu',
        title: '2 bài AI đã tạo trên trang thử nghiệm (sandbox)',
        code: 'https://sandbox.zalopay.vn/review-phim-the-odyssey-2026-christopher-nolan-bien-hanh-trinh-hoi-huong-thanh-mot-con-song-imax-du-doi-63\nhttps://sandbox.zalopay.vn/zalopay-duoc-vinh-danh-unified-wallet-pioneer-tai-mastercard-customer-forum-2025-64',
      },
      {
        type: 'note',
        tone: 'info',
        title: 'Cách chấm "giống người viết"',
        text: 'Dán bài vào humalingo.com/public/detect và so human score với bài Agency đang live, ví dụ bài review phim Moana 2026 trên zalopay.vn.',
      },
    ],
    code: [
      {
        title: 'Install',
        code: 'codex plugin marketplace add https://gitlab.zalopay.vn/zpp/ai/zpp-agent-marketplace.git\ncodex plugin add zlpws-admin@zpp-agent',
        note: 'Lệnh này dùng để thêm kho plugin nội bộ vào Codex, rồi cài bộ kết nối zlpws-admin.',
      },
    ],
    success: [
      'AI trả về link bài trên sandbox.zalopay.vn, mở ra thấy bài nháp.',
      'Human score của bài tương đồng bài Agency đang live (bài mẫu: 6% so với 6%).',
    ],
    images: [],
    pitfalls: [],
  },

  safety: {
    rules: [
      'Bài do AI tạo được gắn cờ, để đếm riêng trong dữ liệu trang quản trị.',
      'Prompt mẫu yêu cầu AI ghi rõ nguồn khi dùng ảnh y nguyên từ nguồn public.',
      'AI được và không được làm gì trên trang quản trị: [cần bổ sung]',
      'Dữ liệu nào đi qua AI: [cần bổ sung]',
    ],
    limits: [
      'Mới hỗ trợ bài News items (Blogs và Tin tức).',
      'Chưa hỗ trợ SEO bằng AI; chưa vận hành loại nội dung mới.',
      'Phải cài trên máy từng người; chưa đăng nhập bằng SSO nên người non-tech còn khó cài.',
      'Human score mới đo trên 1–2 bài mẫu; cần chỉnh thêm để điểm cao hơn.',
    ],
    tables: [],
  },

  demo: [],

  tech: {
    bullets: [
      'Cung cấp MCP + skill admin operate để vận hành website bằng AI Agents (Claude/ChatGPT).',
      'Update Admin Strapi hỗ trợ Authen MCP.',
      'Hướng đi: chuyển dần vai trò Admin Strapi thành một System Provider, để dễ upgrade, replace hay remove về sau.',
      'Hiện chạy bằng npx package; cài qua Codex plugin marketplace (zpp-agent-marketplace), plugin zlpws-admin@zpp-agent.',
      'Đo % AI post: gắn cờ các bài tạo bằng AI qua MCP, measure bằng query trên Admin tool data. AI cost: Cost per post created.',
    ],
    tables: [],
    code: [],
    images: [],
    repo: { label: 'cms/zlp-website/zlpws-admin-mcp', href: 'https://gitlab.zalopay.vn/cms/zlp-website/zlpws-admin-mcp' },
  },

  next: {
    steps: [
      'Đưa lên máy chủ chung (HTTP MCP thay vì npx) và đăng nhập bằng SSO, để ai cũng cài và dùng được, kể cả người non-tech.',
      'Chỉnh lại bài AI viết để human score cao hơn; tối ưu AEO, GEO để bài xuất hiện trong gợi ý của công cụ tìm kiếm AI.',
      'Mở rộng sang các việc vận hành website khác ngoài bài News items.',
    ],
    contact: [
      'Phụ trách: Luân. Nguyễn Anh (MS)',
      'Kênh liên hệ: [cần bổ sung]',
      'Tài liệu liên quan: Apply AI for Website — https://confluence.zalopay.vn/display/~trangnht2/Apply+AI+for+Website',
    ],
    link: '',
  },
}
