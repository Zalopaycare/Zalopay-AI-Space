export default {
  id: 'c2',
  postedAt: '2026-09-23',
  title: 'Cả team làm việc với AI theo một quy trình chung trên Claude Code, Cursor và Codex',
  toolName: 'us-hive',
  desc: 'Developer cài một lần, gọi trợ lý AI bằng một câu lệnh, và được làm theo cùng quy trình, cùng tiêu chuẩn kỹ thuật Zalopay như cả team.',
  type: 'tool',
  status: 'inuse',
  statusNote: '',
  kind: 'tech',
  level: 'ready',
  category: 'Engineering',
  topics: ['Trợ lý AI cho developer', 'Chuẩn hoá quy trình'],
  tools: ['Claude Code', 'Cursor', 'Codex'],
  audience: 'Dev, QC',
  difficulty: 'Trung bình',
  access: 'Cài từ kho code GitLab nội bộ aqr/bill/us-hive; cách xin quyền [cần bổ sung]',
  author: 'US',
  ownerName: '[cần bổ sung]',
  ownerTeam: 'Utility Solutions (US)',
  updated: '',
  cover: '',
  stats: [],

  tldr: [
    ['Vấn đề', 'Kết nối cho AI, bộ hướng dẫn cho AI và tiêu chuẩn kỹ thuật nằm rải rác ở máy từng người trong team.'],
    ['Giải pháp', 'Một bộ trợ lý AI dùng chung: cài một lần, gọi bằng một câu lệnh, tự làm theo quy trình của team.'],
    ['Kết quả', 'Chưa đo bằng số; bài gốc so sánh trước/sau theo 7 khía cạnh như cài đặt, quy trình, cập nhật.'],
    ['Dùng khi', 'Bạn là dev hoặc QC dùng Claude Code, Cursor hoặc Codex và muốn làm theo chuẩn chung của team.'],
  ],

  problem: {
    text: 'Team Utility Solutions (US) có kết nối cho AI (MCP), bộ hướng dẫn cho AI (skill) và tiêu chuẩn kỹ thuật đang nằm rải rác theo từng người.',
    bullets: [
      'Ai gặp: các thành viên team Utility Solutions (US) làm việc với AI.',
      'Việc tốn công: mỗi lần cập nhật phải làm tay trên từng máy; người mới phải tự cài và học lại từ đầu.',
      'Hệ quả: cùng một yêu cầu nhưng mỗi người làm một kiểu, chất lượng đầu ra khác nhau.',
      'Vì sao cần làm ngay: số trợ lý, kết nối và quy trình càng tăng thì gộp lại về sau càng khó và tốn kém.',
      'Tốn bao nhiêu: [cần bổ sung] (bài gốc không có số).',
    ],
    tables: [
      {
        title: 'Vấn đề đang gặp',
        note: '',
        cols: ['Vấn đề', 'Hệ quả'],
        rows: [
          ['Phân mảnh tri thức', 'Quy trình và kinh nghiệm tồn tại dưới nhiều phiên bản khác nhau.'],
          ['Khó kiểm soát thay đổi', 'Mỗi lần cập nhật phải làm thủ công trên từng môi trường.'],
          ['Quy trình dễ lệch chuẩn', 'Cùng một yêu cầu nhưng cách làm và chất lượng đầu ra có thể khác nhau.'],
          ['Khó kế thừa', 'Thành viên mới phải tự thiết lập và học lại những kinh nghiệm đã có.'],
          ['Khó mở rộng', 'Một cải tiến của cá nhân chưa thể nhanh chóng thành năng lực chung của team.'],
        ],
      },
    ],
    images: [],
  },

  solution: {
    analogy: 'Hiểu đơn giản: như một tổ ong chung, mỗi "chú ong" là một trợ lý AI giỏi một việc; ai góp cải tiến một lần thì cả team cùng dùng.',
    steps: [
      'Bạn: cài bộ trợ lý một lần trên máy, cho công cụ AI bạn đang dùng.',
      'Bạn: gọi trợ lý phù hợp bằng một câu lệnh, kèm mã Jira, link yêu cầu merge code hoặc tài liệu.',
      'AI: tự chọn đúng bộ hướng dẫn, kết nối, tiêu chuẩn và quy trình đã được team định nghĩa.',
      'Bạn duyệt: AI có thể hỏi xác nhận trước việc quan trọng như sửa code, đăng nội dung hoặc tạo yêu cầu merge code.',
    ],
    images: [
      { src: '/use-cases/c2/us-hive-overview.png', caption: 'us-hive và các trợ lý: bee-dev, bee-figma-ui, bee-integrator, bee-db-audit, bee-review-code, bee-qc; sẽ có thêm trợ lý mới.' },
    ],
  },

  result: {
    beforeAfter: {
      cols: ['Khía cạnh', 'Trước us-hive', 'Với us-hive'],
      rows: [
        ['Cài đặt', 'Cài và cấu hình thủ công theo từng người', 'Một bộ cài dùng chung, có tự kiểm tra (health check)'],
        ['Quy trình', 'Phụ thuộc kinh nghiệm và cấu hình cá nhân', 'Một quy trình chuẩn, có đánh số phiên bản'],
        ['Tiêu chuẩn', 'Có thể áp dụng thiếu hoặc không đồng nhất', 'Tiêu chuẩn gắn sẵn vào trợ lý'],
        ['Cập nhật', 'Cập nhật lặp lại trên từng máy, từng công cụ', 'Phát hành tập trung, cập nhật bằng một lệnh'],
        ['Kinh nghiệm', 'Rời rạc ở từng cá nhân', 'Đóng gói thành năng lực dùng chung'],
        ['Đóng góp', 'Khó chia sẻ và gộp cải tiến', 'Có quy ước đóng góp và cách kiểm chứng thống nhất'],
        ['Mở rộng', 'Thêm quy trình là tăng chi phí quản lý', 'Trợ lý mới được tự động gắn vào bộ'],
      ],
      note: 'So sánh định tính trong bài gốc, chưa đo bằng số.',
    },
    bullets: [
      'Chuẩn hoá: người mới hay người nhiều kinh nghiệm, dùng công cụ nào, đều làm theo cùng một quy trình.',
      'Giảm việc lặp lại: các việc phát triển, rà soát, viết tài liệu, tích hợp đối tác, review code tự theo sẵn checklist và tiêu chuẩn.',
      'Giá trị không nằm ở một lần tiết kiệm lớn, mà ở việc giảm vướng víu hằng ngày và bớt sai sót do bỏ sót bước.',
      'Năng lực chung: Dev hay QE góp cải tiến một lần là cả team được dùng; người mới bắt đầu ngay, không học lại từ đầu.',
    ],
    tables: [],
    note: 'Chưa đo: bài gốc không có số liệu thời gian hay chất lượng. [cần bổ sung]',
    images: [],
  },

  apply: {
    intro: 'Bạn cài us-hive một lần bằng vài lệnh trong cửa sổ dòng lệnh (terminal), rồi gọi trợ lý ngay trong Claude Code, Cursor hoặc Codex.',
    fit: {
      yes: [
        'Bạn dùng ít nhất một trong ba công cụ: Claude Code, Cursor hoặc Codex.',
        'Bạn làm các việc có trong danh sách trợ lý: phát triển service Go, dựng giao diện từ Figma, tích hợp đối tác, review code, viết kịch bản kiểm thử, rà soát database, viết tài liệu.',
      ],
      no: [
        'Bạn không dùng Claude Code, Cursor hay Codex.',
        'Bạn dùng Windows mà chưa có WSL (môi trường Linux trên Windows).',
      ],
    },
    prep: [
      'Máy có Git, Bash và công cụ dòng lệnh của GitLab (glab).',
      'Ít nhất một công cụ AI được hỗ trợ: Claude Code, Cursor hoặc Codex.',
      'Máy Windows: dùng WSL.',
      'Tài khoản đăng nhập gitlab.zalopay.vn và quyền vào kho code aqr/bill/us-hive: xin ở đâu [cần bổ sung].',
    ],
    steps: [
      'Đăng nhập GitLab và tải us-hive về máy, rồi chạy bộ cài (lệnh ở dưới).',
      'Bộ cài mặc định cài toàn bộ trợ lý cho cả Claude Code, Cursor và Codex, tự cấu hình và tự chạy kiểm tra.',
      'Nếu chỉ cần vài trợ lý trên Codex, chạy lệnh cài chọn lọc.',
      'Trong công cụ AI, gọi trợ lý bằng một câu lệnh (xem bảng danh sách trợ lý).',
      'Khi trợ lý hỏi xác nhận trước việc quan trọng, đọc kỹ rồi mới đồng ý.',
    ],
    blocks: [
      {
        type: 'table',
        title: 'Danh sách trợ lý',
        cols: ['Trợ lý', 'Cách gọi', 'Dùng để'],
        rows: [
          ['bee-dev', 'bee-dev spec= jira= confluence= ...', 'Phát triển service Go: thiết kế, viết test trước (TDD), rà soát (audit), bàn giao QC và tạo bản nháp yêu cầu merge code (MR).'],
          ['bee-figma-ui', 'bee-figma-ui <figma-node-url>', 'Dựng hoặc review giao diện từ Figma, có đề xuất Code Connect và so lệch từng pixel.'],
          ['bee-integrator', 'bee-integrator <partner> <document>', 'Tích hợp API đối tác: 4 giai đoạn, TDD, rà soát theo ZES, bàn giao QC và bản nháp MR.'],
          ['bee-review-code', 'bee-review-code <MR-url>', 'Review MR: chụp lại trạng thái, ghi nhận xét ngay tại dòng code, dừng để bạn duyệt trước khi đăng.'],
          ['bee-qc', 'bee-qc jira= prd= mr= refs= ,...', 'Sinh kịch bản kiểm thử hộp đen (black-box), tuỳ chọn kèm bộ Postman.'],
          ['bee-db-audit', 'bee-db-audit', 'Rà soát database mức L1 cho MySQL/TiDB, không kết nối vào production.'],
          ['bee-docs', 'bee-docs', 'Sinh tài liệu kỹ thuật từ code và chuẩn bị bản nháp MR.'],
        ],
      },
      {
        type: 'note',
        tone: 'info',
        title: 'Một trợ lý, một câu lệnh',
        text: 'Mỗi trợ lý chỉ có một câu lệnh chuẩn trên mọi công cụ. Trên Codex gõ $ ở đầu, trên Claude Code / Cursor gõ / ở đầu.',
      },
    ],
    code: [
      {
        title: 'Install us-hive',
        code: 'glab auth login --hostname gitlab.zalopay.vn\nglab repo clone https://gitlab.zalopay.vn/aqr/bill/us-hive.git\ncd us-hive\n./install.sh',
        note: 'Lệnh này dùng để đăng nhập GitLab, tải us-hive về máy và cài toàn bộ trợ lý cho Claude Code, Cursor, Codex (kèm kiểm tra sau cài).',
      },
      {
        title: 'Chỉ cài một số agent trên Codex',
        code: './install.sh codex --plugins bee-dev,bee-review-code',
        note: 'Lệnh này dùng để chỉ cài 2 trợ lý bee-dev và bee-review-code cho Codex.',
      },
      {
        title: 'Codex — gọi trực tiếp Agent Skill',
        code: '$bee-dev jira=ABC-123 // đưa nội dung, yêu cầu,...\n$bee-review-code https://gitlab.zalopay.vn/.../merge_requests/123\n$bee-integrator partner-name document',
        note: 'Lệnh này dùng để gọi trợ lý trong Codex; thay ABC-123, link MR, tên đối tác và tài liệu bằng của bạn.',
      },
      {
        title: 'Codex — chọn agent từ danh sách',
        code: '/skills',
        note: 'Lệnh này dùng để mở danh sách trợ lý trong Codex và chọn một trợ lý.',
      },
      {
        title: 'Claude Code / Cursor — gọi bằng slash command',
        code: '/bee-dev jira=ABC-123/ đưa nội dung, yêu cầu,...\n/bee-review-code https://gitlab.zalopay.vn/.../merge_requests/123\n/bee-integrator partner-name document',
        note: 'Lệnh này dùng để gọi trợ lý trong Claude Code hoặc Cursor; thay phần ví dụ bằng của bạn.',
      },
    ],
    success: [
      'Bộ cài chạy xong phần kiểm tra (health check) sau khi cài. Dấu hiệu cụ thể: [cần bổ sung]',
      'Trong Codex, gõ /skills thấy danh sách trợ lý để chọn.',
    ],
    images: [],
    pitfalls: [],
  },

  safety: {
    rules: [
      'Trợ lý có thể hỏi bạn xác nhận trước thay đổi quan trọng: ghi code, đăng nội dung, tạo yêu cầu merge code.',
      'bee-review-code dừng ở một điểm kiểm tra để bạn xem trước khi đăng nhận xét.',
      'bee-db-audit không kết nối vào database production.',
      'bee-dev, bee-integrator, bee-docs chỉ tạo bản nháp yêu cầu merge code (draft MR).',
      'Dữ liệu đi qua AI: [cần bổ sung]',
    ],
    limits: [
      'Chỉ hỗ trợ Claude Code, Cursor và Codex.',
      'Trên Windows phải dùng WSL.',
      'Chưa có số đo về thời gian hay chất lượng.',
    ],
    tables: [],
  },

  demo: [],

  tech: {
    bullets: [
      'us-hive cung cấp các workflow agent chuyên biệt cho Claude Code, Cursor và Codex, dùng chung MCP runtime, cơ chế cài đặt và Zalopay Engineering/Team Standards.',
      'Single source of truth cho: agent workflow; MCP runtime và integration; Zalopay Engineering/Team Standards; installation, update và health check; contribution contract và release lifecycle.',
      'Người dùng chỉ gọi agent; us-hive tự orchestration đúng skill, MCP, standard và workflow đã định nghĩa.',
      'Canonical workflow: mỗi agent chỉ có một canonical command trên các platform, được version hóa.',
      'Update: phân phối tập trung qua release và `us-hive update`. Plugin mới được tự động tích hợp từ manifest; có plugin contract và verification thống nhất.',
      'Yêu cầu: Git, Bash, glab và ít nhất một client được hỗ trợ; Windows dùng WSL.',
    ],
    tables: [
      {
        title: 'Agent Catalog',
        note: 'Theo bảng gốc; ô Contributor để trống là bài gốc không ghi.',
        cols: ['Agent/Command', 'Detail', 'Mục đích', 'Contributor'],
        rows: [
          ['bee-dev', 'bee-dev spec= jira= confluence= ...', 'Phát triển service Go: design, TDD, audit, QC handoff và draft MR', ''],
          ['bee-figma-ui', 'bee-figma-ui <figma-node-url>', 'Implement hoặc review UI từ Figma, có Code Connect proposal và pixel diff', 'Nam. Nguyễn Trần Hoàng (3)'],
          ['bee-integrator', 'bee-integrator <partner> <document>', 'Tích hợp partner API: 4 phase, TDD, audit ZES, QC handoff và draft MR', ''],
          ['bee-review-code', 'bee-review-code <MR-url>', 'Review MR có snapshot, inline finding và checkpoint trước khi đăng', ''],
          ['bee-qc', 'bee-qc jira= prd= mr= refs= ,...', 'Sinh test case black-box và Postman collection tùy chọn', 'Yên. Hoàng Thị Thanh; Đăng. Phạm Hồng Hải'],
          ['bee-db-audit', 'bee-db-audit', 'Audit database L1 cho MySQL/TiDB, không kết nối production', ''],
          ['bee-docs', 'bee-docs', 'Sinh tài liệu kỹ thuật từ codebase và chuẩn bị draft MR', ''],
        ],
      },
    ],
    code: [],
    images: [],
    repo: { label: 'GitLab · aqr/bill/us-hive', href: 'https://gitlab.zalopay.vn/aqr/bill/us-hive' },
  },

  next: {
    steps: [
      'Sẽ có thêm trợ lý mới ("More Agents Coming Soon").',
    ],
    contact: [
      'Team: Utility Solutions (US). Người phụ trách: [cần bổ sung]',
      'Người đóng góp: Nam. Nguyễn Trần Hoàng (3) (bee-figma-ui); Yên. Hoàng Thị Thanh, Đăng. Phạm Hồng Hải (bee-qc).',
      'Mã nguồn, hướng dẫn cài và cách đóng góp: kho code us-hive trên GitLab.',
      'Kênh liên hệ: [cần bổ sung]',
    ],
    link: 'https://gitlab.zalopay.vn/aqr/bill/us-hive',
  },
}
