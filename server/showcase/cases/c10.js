export default {
  id: 'c10',
  title: 'Cho AI tra cứu hạ tầng PROD mà không cần đưa mật khẩu cho dev',
  toolName: 'MCP Platform',
  desc: 'Dev tự tạo 1 khoá kết nối (MCP key) cho các tài nguyên mình sở hữu, rồi để AI tra cứu Redis, database, Kafka, service trên PROD an toàn.',
  type: 'proposal',
  status: 'planning',
  statusNote: 'Đề xuất · đã xong bản MVP, đã test trên DEV và QC',
  kind: 'tech',
  level: 'ref',
  category: 'Engineering',
  topics: ['Kết nối AI với hạ tầng', 'Bảo mật PROD', 'Tự phục vụ cho dev'],
  tools: ['Codex', 'Claude', 'Cursor', 'Gemini'],
  audience: 'Dev, SRE/Platform, QC',
  difficulty: 'Khó',
  access: 'Cần xin quyền: là owner/co-owner của tài nguyên trên Gear, và admin đã publish tài nguyên đó; nơi đăng ký thử [cần bổ sung]',
  author: 'SRE',
  ownerName: '[cần bổ sung]',
  ownerTeam: 'SRE',
  updated: '',
  cover: '/use-cases/c10/landing.png',
  stats: [
    { value: '0', extra: '', label: 'mật khẩu PROD SRE phải đưa cho dev' },
    { value: '1 key', extra: '', label: 'dùng chung cho mọi tài nguyên dev chọn' },
    { value: '171', extra: '+ 1.811 service', label: 'tài nguyên đã tự dò thấy trên màn hình admin' },
  ],

  tldr: [
    ['Vấn đề', 'Theo quy định của PTO, AI không được nối thẳng vào PROD; thông tin hạ tầng lại rải rác nên việc gì dev cũng phải nhờ SRE.'],
    ['Giải pháp', 'Một cổng trung gian: admin mở sẵn từng tài nguyên, dev tự tạo 1 khoá cho AI, AI chỉ dùng các thao tác đã được duyệt.'],
    ['Kết quả', 'Đã xong bản MVP, test trên DEV và QC. Chưa đo thời gian tiết kiệm.'],
    ['Dùng khi', 'Bạn cần AI xem cấu hình, trạng thái, dữ liệu Redis, database, Kafka hay service của mình để debug.'],
  ],

  problem: {
    text: 'Theo policy của PTO, tất cả các AI Agent đều không được phép connect vào thẳng hệ thống PROD. Trong khi đó dev vẫn cần thông tin hạ tầng hằng ngày.',
    bullets: [
      'Ai gặp: dev và QC muốn dùng AI để tra cứu, debug hệ thống thật; SRE phải trả lời thay.',
      'Sao không dùng kết nối AI có sẵn (MCP mã nguồn mở)? Vì chúng cần tài khoản, mật khẩu của database; SRE phải đưa cho dev, điều này bị CẤM trên PROD.',
      'Thông tin cấu hình, công nghệ, trạng thái hạ tầng nằm rải rác, không có chỗ tra cứu chung. Mỗi lần check config hay debug, dev phải đi qua SRE.',
      'SRE thành điểm nghẽn: mọi câu hỏi dồn về họ, tốn thời gian cả hai phía.',
      'Dev thiết kế thiếu thông tin về giới hạn hạ tầng nên phải làm lại; tài liệu lệch với thực tế, người mới vào làm quen chậm. Tốn bao nhiêu: [cần bổ sung]',
    ],
    tables: [],
    images: [
      { src: '/use-cases/c10/pto-policy.png', caption: 'Quy định của PTO: cấm dùng AI nối thẳng vào PROD, kể cả QC; ai vi phạm bị ảnh hưởng KPI và thu quyền ngay.' },
    ],
  },

  solution: {
    analogy: 'Hiểu đơn giản: như quầy lễ tân của toà nhà. AI không cầm chìa khoá phòng nào, chỉ đưa thẻ khách; lễ tân mở đúng những phòng đã được cho phép và ghi sổ mọi lượt ra vào.',
    steps: [
      'Admin: chọn tài nguyên (Redis, database, Kafka, service) được mở cho AI và chọn các thao tác AI được phép làm.',
      'Bạn: đăng nhập bằng tài khoản O365, thấy các tài nguyên mình là owner, tích chọn rồi đặt tên để tạo 1 khoá kết nối (MCP key).',
      'Bạn: đưa khoá này cho AI của mình (Claude, Codex, AI trong IDE) và đặt câu hỏi bằng lời.',
      'AI: dùng các thao tác đã được duyệt để lấy thông tin, rồi tóm tắt lại cho bạn. Mật khẩu và giá trị nhạy cảm được che.',
      'SRE / admin: xem lại nhật ký mọi lượt AI gọi: khoá do ai tạo, đã làm gì.',
    ],
    images: [],
  },

  result: {
    beforeAfter: {
      cols: ['Mục tiêu sẽ đo', 'Trước', 'Sau (theo thiết kế)'],
      rows: [
        ['Mật khẩu PROD dev phải cầm', 'Phải xin SRE (MCP có sẵn cần mật khẩu), bị cấm', '0, chỉ cần 1 MCP key'],
        ['Số khoá cho nhiều tài nguyên', '[cần bổ sung]', '1 khoá cho tất cả tài nguyên dev chọn'],
        ['Việc tra config / debug phải nhờ SRE', 'Mọi lần đều qua SRE', 'Chưa đo'],
        ['Thời gian chờ SRE trả lời', 'Chưa đo', 'Chưa đo'],
      ],
      note: 'Chưa đo: tài liệu gốc chưa có số trước/sau. Dự kiến đo gì, đo khi nào: [cần bổ sung]',
    },
    bullets: [
      'Đã xong bản MVP: kết nối cho Redis, Percona (database), Kafka, dò tìm service; đăng nhập tập trung; công cụ có sẵn và công cụ tự tạo; trang admin.',
      'Quyền của người dùng và danh sách tài nguyên được đồng bộ từ Gear; danh sách dự án đồng bộ từ CSM.',
      'Đã test trên môi trường DEV và QC cho Redis, Percona và dò tìm service.',
    ],
    tables: [],
    note: 'Chưa đo: chưa có số liệu vận hành thật.',
    images: [],
  },

  apply: {
    intro: 'Đây là đề xuất, chưa mở rộng rãi. Nếu team bạn muốn thử cùng, dưới đây là điều kiện và luồng dùng thử như trong bản MVP.',
    fit: {
      yes: [
        'Bạn là dev hoặc QC, muốn AI xem cấu hình, trạng thái, dữ liệu của Redis, database, Kafka hay service của mình.',
        'Bạn là owner (hoặc co-owner) của tài nguyên đó trên Gear.',
        'Bạn dùng một AI có thể gắn kết nối MCP: Claude, Codex, hoặc AI trong IDE.',
      ],
      no: [
        'Bạn cần xem log (OpenSearch) hoặc số đo hệ thống (Prometheus, VictoriaMetrics): phần này mới ở mức đề xuất mở rộng.',
        'Bạn không phải owner và chưa được owner thêm làm co-owner.',
        'Tài nguyên chưa được admin publish: bạn sẽ không tạo khoá được cho nó.',
      ],
    },
    prep: [
      'Tài khoản O365 để đăng nhập MCP Platform.',
      'Quyền owner/co-owner của tài nguyên trên Gear (nếu chưa có, nhờ owner thêm bạn, hoặc nhờ owner tạo giúp khoá).',
      'Admin đã publish tài nguyên bạn cần.',
      'Một AI có hỗ trợ kết nối MCP (ví dụ Codex).',
      'Địa chỉ trang MCP Platform và nơi đăng ký thử: [cần bổ sung]',
    ],
    steps: [
      'Bạn: đăng nhập MCP Platform bằng O365, mở mục "My resources" để xem tài nguyên của mình và tài nguyên nào đã sẵn sàng.',
      'Bạn: vào mục "MCP keys", đặt tên khoá, tích chọn các tài nguyên, bấm "Create key".',
      'Bạn: chép khoá ngay (khoá chỉ hiện 1 lần) và gắn vào AI của bạn. Lệnh mẫu cho Codex nằm ở phần Chi tiết kỹ thuật.',
      'Bạn: hỏi AI bằng lời về tài nguyên hoặc service của mình.',
      'Bạn kiểm tra: đọc bản tóm tắt AI trả về, đối chiếu trước khi ra quyết định.',
    ],
    blocks: [
      { type: 'steps', title: 'Bước 1 · Xem tài nguyên của bạn', items: [
        'Mặc định chỉ tài nguyên bạn là OWNER trên Gear mới hiện ra.',
        'Thẻ "Available" nghĩa là admin đã publish, dùng được; "Not published" là chưa dùng được.',
      ] },
      { type: 'image', src: '/use-cases/c10/my-resources.png', caption: 'Trang "My resources": 3 tài nguyên của dev, 2 cái đã sẵn sàng, 1 cái chưa được publish.' },
      { type: 'steps', title: 'Bước 2 · Tạo 1 khoá cho nhiều tài nguyên', items: [
        'Nhập tên khoá, tích các tài nguyên cần dùng (ở đây là 1 Redis và 1 database).',
        'Không cần tạo mỗi tài nguyên một khoá.',
      ] },
      { type: 'image', src: '/use-cases/c10/create-key.png', caption: 'Tạo khoá "codex-test-key" cho cả 2 tài nguyên Redis và Percona, mỗi tài nguyên ở chế độ chỉ đọc.' },
      { type: 'image', src: '/use-cases/c10/key-created.png', caption: 'Khoá mới tạo chỉ hiện 1 lần; bảng dưới cho thấy khoá đang hoạt động với 2 tài nguyên, 28 công cụ.' },
      { type: 'note', tone: 'warn', title: 'Chép khoá ngay', text: 'Màn hình ghi rõ "This value is shown once": khoá chỉ hiện một lần. Không gửi khoá cho người khác.' },
      { type: 'text', title: 'Bước 3 · Gắn khoá vào AI', text: 'Gắn khoá vào Codex bằng lệnh mẫu trong phần "Chi tiết kỹ thuật" (Dành cho dev). SRE không cần đưa bạn thêm mật khẩu nào.' },
      { type: 'prompt', label: 'Câu hỏi mẫu dev đã gõ cho Codex (giữ nguyên bản gốc)', text: 'hey give me infomation about database clan?' },
      { type: 'text', title: 'Bước 4 · Hỏi về cả service', text: 'Nếu service của bạn đã được dò thấy, bạn tạo 1 khoá cho service và các tài nguyên nó dùng, rồi hỏi AI về service đó và mọi thứ nó kết nối tới.' },
      { type: 'image', src: '/use-cases/c10/topology-detected.png', caption: 'Service CSM được dò thấy đang nối tới 1 database và 1 Redis, nhưng 2 tài nguyên này chưa được publish.' },
      { type: 'image', src: '/use-cases/c10/my-resources-service.png', caption: 'Sau khi admin publish, 2 tài nguyên của service CSM hiện "Available" trong "My resources".' },
      { type: 'image', src: '/use-cases/c10/topology-ready.png', caption: 'Sơ đồ kết nối của service CSM: cả 2 tài nguyên đã "READY" để AI tra cứu.' },
    ],
    code: [],
    success: [
      'AI trả lời bằng bản tóm tắt: tên cụm, phiên bản, số bảng, số dòng ước tính của database bạn hỏi.',
      'Với service: AI tóm tắt trạng thái, cấu hình và các tài nguyên đi kèm, và ghi rõ mật khẩu, giá trị nhạy cảm đã được che.',
      'Trong bảng MCP keys, khoá của bạn có trạng thái "Active".',
    ],
    images: [
      { src: '/use-cases/c10/codex-clan.png', caption: 'Kết quả mẫu: Codex tự gọi các công cụ của MCP Platform và tóm tắt database "clan" (12 bảng, khoảng 102 dòng).' },
      { src: '/use-cases/c10/codex-service-1.png', caption: 'Kết quả mẫu khi hỏi về service CSM: trạng thái service, cấu hình và database đi kèm.' },
      { src: '/use-cases/c10/codex-service-2.png', caption: 'Phần tiếp theo: số dòng từng bảng, nhận xét về dung lượng và các câu truy vấn quét toàn bảng.' },
      { src: '/use-cases/c10/codex-service-3.png', caption: 'Phần cuối: tình trạng Redis đi kèm; AI ghi rõ mọi thứ được lấy ở chế độ chỉ đọc và thông tin nhạy cảm đã được che.' },
    ],
    pitfalls: [
      { meet: 'Không thấy tài nguyên mình cần trong danh sách', why: 'Bạn không phải owner của tài nguyên đó trên Gear', fix: 'Nhờ owner thêm bạn làm co-owner trên Gear, hoặc nhờ owner tạo giúp khoá.' },
      { meet: 'Tài nguyên hiện "Not published" hoặc sơ đồ báo "MCP access is not ready for every connection"', why: 'Admin chưa publish tài nguyên đó', fix: 'Nhờ admin publish từng tài nguyên được dò thấy.' },
      { meet: 'AI báo "selected resource is unavailable"', why: 'AI gọi vào tài nguyên không nằm trong khoá của bạn', fix: 'Kiểm tra khoá đã chọn đúng tài nguyên chưa; nếu thiếu, tạo khoá mới có tài nguyên đó.' },
      { meet: 'Mất khoá sau khi đóng màn hình', why: 'Khoá chỉ hiện 1 lần', fix: 'Tạo khoá mới trong mục "MCP keys".' },
    ],
  },

  safety: {
    rules: [
      'Dev không nhận bất kỳ mật khẩu, tài khoản nào của tài nguyên PROD; chỉ nhận 1 MCP key.',
      'AI chỉ dùng các công cụ đã được định sẵn. Dev có thể tự tạo công cụ riêng nhưng phải được duyệt (APPROVED); ai duyệt: [cần bổ sung].',
      'Admin đặt mức tối đa cho từng tài nguyên: chỉ đọc hay đọc và ghi, công cụ nào được dùng, database nào AI được nối tới.',
      'Cấu hình trả về cho AI đã che mật khẩu và giá trị nhạy cảm. Mọi lượt AI gọi đều được ghi nhật ký: khoá của ai, đã làm gì.',
      'Theo quy định PTO: dev nên dùng kết nối riêng cho môi trường dev, không dùng chung dev và prod để tránh nhầm môi trường.',
    ],
    limits: [
      'Mới là bản MVP; đã test trên DEV và QC cho Redis, Percona và dò tìm service. Chưa ghi nhận test Kafka.',
      'Chưa có kết nối cho log (OpenSearch) và số đo hệ thống (Prometheus, VictoriaMetrics); dò service trên PROD3 mới là đề xuất mở rộng.',
      'Dữ liệu đi qua AI: kết quả truy vấn database, Redis, cấu hình service (đã che phần nhạy cảm) được gửi về AI của dev.',
      'Số dòng AI báo là ước tính từ thông tin hệ thống, có thể không chính xác.',
    ],
    tables: [],
  },

  demo: [
    { src: '/use-cases/c10/landing.png', caption: 'Trang đăng nhập MCP Platform: AI đi qua một cổng kiểm soát để tới service, log, số đo, Redis, Percona, Kafka.' },
    { src: '/use-cases/c10/admin-redis-list.png', caption: 'Admin xem danh sách tài nguyên tự dò được (Redis 107, Percona 63, Kafka 1, Services 1.811) và bấm Publish.' },
    { src: '/use-cases/c10/admin-services-list.png', caption: 'Danh sách service trên môi trường Dev và QC được dò từ cụm Kubernetes, kèm trạng thái.' },
    { src: '/use-cases/c10/publish-redis.png', caption: 'Admin publish một Redis: chọn chỉ đọc hay đọc và ghi, tích các công cụ AI được dùng.' },
    { src: '/use-cases/c10/publish-percona.png', caption: 'Admin publish database Percona: chọn database AI được nối tới (ở đây là "clan") và các công cụ được phép.' },
    { src: '/use-cases/c10/admin-resources.png', caption: 'Trang quản trị: các tài nguyên đã publish, số công cụ được phép và trạng thái.' },
    { src: '/use-cases/c10/custom-tool-redis.png', caption: 'Dev tự tạo công cụ riêng cho Redis: chọn kiểu Pipeline, Transaction hoặc Lua chỉ đọc và các lệnh được phép.' },
    { src: '/use-cases/c10/custom-tool-percona.png', caption: 'Dev tự tạo công cụ Transaction cho Percona: chọn bảng, cột trả về, bộ lọc và số dòng tối đa.' },
    { src: '/use-cases/c10/publish-service.png', caption: 'Admin publish service CSM trên DEV với 6 công cụ tra cứu service.' },
  ],

  tech: {
    bullets: [
      'Đề xuất build MCP Platform cho AI Agent trên hạ tầng K8S của Zalopay, gồm các MCP server: Redis, Percona, Kafka, Service, Log, Prometheus.',
      'Phạm vi: Service Discovery + Service MCP (trạng thái deploy, tech stack, dependency topology); Data MCP (Redis, Percona XtraDB Cluster, Kafka); Log MCP (OpenSearch); Metrics MCP (Prometheus, VictoriaMetrics).',
      'Ưu tiên MCP server cho Redis, Percona, Kafka trên K8S platform và Service Discovery trên K8S SRE CICD: 4 workers watch các K8S Custom Resource và Service, collect trạng thái từng resource gửi về MCP Platform (reconcile).',
      'Credential: Redis gọi Resource Controller để get credentials; Percona tạo user/password riêng cho MCP Platform (managed, least-privilege, rotate qua Resource Controller); Kafka không cần gọi Resource Controller vì không cần credential để access topic.',
      'AI Agent (Claude/Codex/IDE) xác thực qua IAM central Auth bằng MCP key; Admin/Dev đăng nhập O365 (CAS). User role và user\'s resource đồng bộ từ Gear (ZLPSaaS Gear API); user project đồng bộ từ CSM.',
      'Service Discovery: lấy config generation từ pipeline Jenkins gửi về MCP Platform (bắt IP, port, username, password), UI visualize topology của service. Sơ đồ có thêm coroot cạnh Jenkins.',
      'Mọi tool calling từ agent được log vào database và Langfuse để tracing, audit log (key do ai tạo, đã làm gì).',
      'Custom tool engines: Redis có Pipeline (batch commands, one round trip), Transaction, Read-only Lua; Percona có SQL Transaction (atomic statements).',
    ],
    tables: [
      {
        title: 'Sao không dùng MCP open-source có sẵn?',
        note: '',
        cols: ['MCP open-source', 'MCP Platform'],
        rows: [
          ['Phải có credentials của resource (DB host, DB password…), SRE phải đưa cho dev — bị CẤM trên PROD', 'Dev chỉ cầm MCP key; MCP server tự lấy credential qua Resource Controller'],
          ['Mỗi resource một cấu hình riêng', '1 MCP key cho tất cả resource dev chọn'],
          ['Không có lớp kiểm soát tool', 'Chỉ tool được define sẵn; custom tool phải được APPROVED; admin đặt guardrail tối đa'],
        ],
      },
      {
        title: 'Tool cơ bản của Service MCP (luồng CICD trên K8S PROD3)',
        note: '',
        cols: ['Tool', 'Chức năng'],
        rows: [
          ['platform_list_services', 'Liệt kê tất cả services created by dev qua luồng CICD'],
          ['service_get_config', 'Trả config hiện tại, env vars (mask secrets)'],
          ['service_get_status', 'Health, version đang chạy, dependencies'],
          ['service_get_techstack', 'Ngôn ngữ, framework, DB, message queue đang dùng'],
          ['service_get_infra_topology', 'Service này chạy ở đâu, kết nối với gì'],
          ['service_get_recent_events', 'Cho debug cơ bản mà không cần SRE'],
        ],
      },
      {
        title: 'Tính năng đã xong trong bản MVP',
        note: 'Đã test trên DEV và QC cho Redis, Percona và Service Discovery.',
        cols: ['Hạng mục', 'Nội dung'],
        rows: [
          ['MCP server', 'Redis / Percona / Kafka / Service Discovery'],
          ['Xác thực', 'IAM central Auth'],
          ['Tools', 'Default tools và Custom tools'],
          ['Quản trị', 'Admin portal'],
          ['Đồng bộ', 'User role và User\'s resource từ Gear; User project từ CSM'],
        ],
      },
    ],
    code: [
      {
        title: 'Thêm MCP Platform vào Codex',
        code: 'codex mcp add mcp-platform \\\n        --url "http://127.0.0.1:5000/mcp" \\\n    --bearer-token-env-var MCP_PLATFORM_KEY # key dev va mi to',
        note: 'Lệnh này dùng để gắn MCP Platform vào Codex, đọc MCP key từ biến môi trường MCP_PLATFORM_KEY (địa chỉ trong ví dụ là máy local).',
      },
    ],
    images: [
      { src: '/use-cases/c10/architecture.png', caption: 'Kiến trúc: AI Agent đi qua IAM central Auth tới các MCP server; 4 worker watch K8S Platform và K8S SRE (PROD3).' },
      { src: '/use-cases/c10/tracing.png', caption: 'Tracing trên Langfuse: mọi tool call của agent (percona_query, redis_info…) được ghi lại kèm input, output.' },
      { src: '/use-cases/c10/trace-detail.png', caption: 'Chi tiết 1 trace percona_query: thời điểm, User ID, môi trường, phiên bản.' },
    ],
    repo: null,
  },

  next: {
    steps: [
      'Mở rộng Service Discovery sang K8S PROD3 qua luồng CICD.',
      'Log MCP: tích hợp cụm log OpenSearch.',
      'Metrics MCP: tích hợp Prometheus và VictoriaMetrics.',
    ],
    contact: ['Người phụ trách, kênh liên hệ: [cần bổ sung]'],
    link: '',
  },
}
