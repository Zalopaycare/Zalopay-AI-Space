const I = (n) => `/use-cases/c8/${n}.png`

export default {
  id: 'c8',
  postedAt: '2026-09-30',
  title: 'Biến ý tưởng hoặc thiết kế Figma thành Mini App bấm thử được, không cần chờ 2 tuần',
  toolName: 'ZaloPay Mini App Builder',
  desc: 'PO, HR, Marketing, BD mô tả ý tưởng hoặc gửi link Figma, nhận một Mini App bấm thử được và file HTML để lấy feedback.',
  type: 'tool',
  status: 'prototype',
  statusNote: 'Kết quả AI Week · bản MVP (package v0.3.3)',
  kind: 'tech',
  level: 'ready',
  category: 'Product',
  topics: ['Mini App', 'Prototype nhanh', 'Lấy feedback sớm'],
  tools: ['Claude', 'Codex'],
  audience: 'PO/PM, Marketing & Content, Business/Ops',
  difficulty: 'Trung bình',
  access: '[cần bổ sung]',
  author: 'ToanNTT',
  ownerName: 'Toàn. Nguyễn Trần Thiện',
  ownerTeam: 'PCT-CX',
  updated: '',
  cover: I('garden-main'),
  stats: [
    { value: '≥ 2 tuần', extra: '', label: 'để release 1 non-payment Mini App theo quy trình hiện tại' },
    { value: '5', extra: 'Mini App', label: 'demo đã làm xong trong AI Week' },
    { value: '22m 30s', extra: '', label: 'AI làm Mini App Kế hoạch Xóa Nợ từ 1 prompt (ảnh chụp, 1 lần chạy)' },
  ],

  tldr: [
    ['Vấn đề', 'Release một non-payment Mini App mất ít nhất 2 tuần, nên thử ý tưởng và lấy phản hồi sớm rất chậm.'],
    ['Giải pháp', 'Bạn mô tả ý tưởng hoặc gửi link Figma; AI dựng Mini App theo phong cách ZaloPay và xuất file HTML để chia sẻ.'],
    ['Kết quả', 'Đã làm xong 5 Mini App demo. Chưa đo thời gian trung bình; 1 lần chạy mẫu mất 22 phút 30 giây.'],
    ['Dùng khi', 'Bạn có ý tưởng Mini App không liên quan thanh toán và muốn có bản bấm thử để khảo sát trước khi nhờ dev.'],
  ],

  problem: {
    text: 'Quy trình release một non-payment Mini App hiện mất ít nhất hai tuần. Thử nhiều ý tưởng và tìm product–market fit vì thế chậm và tốn nguồn lực dev.',
    bullets: [
      'Ai gặp: PO, HR, Marketing, BD và các team nghiệp vụ có ý tưởng Mini App.',
      'Việc tốn công: muốn có bản bấm thử để lấy feedback thì phải chờ developer làm.',
      'Tốn bao nhiêu: ít nhất 2 tuần cho mỗi lần release (nguồn: bài gốc của PCT-CX).',
      'Mục tiêu: rút ngắn giai đoạn ý tưởng → bản thử → feedback, không thay thế quy trình production.',
    ],
    tables: [],
    images: [],
  },

  solution: {
    analogy: 'Như có một người dựng mẫu nhanh: bạn kể ý tưởng, họ đưa lại một bản app bấm được để mọi người thử trước khi làm thật.',
    steps: [
      'Bạn: mô tả ý tưởng bằng lời thường, hoặc gửi link thiết kế Figma.',
      'AI: hỏi rõ yêu cầu, chọn hướng giao diện theo phong cách ZaloPay và dựng Mini App.',
      'AI: xuất 1 file HTML mở được trên trình duyệt, gửi được qua email hoặc chat.',
      'Bạn: gửi file cho đồng nghiệp, người dùng khảo sát; nhờ AI chỉnh nhanh theo góp ý.',
      'Developer: khi ý tưởng đã được xác nhận, nhận source để hoàn thiện, kiểm thử và release.',
    ],
    images: [],
  },

  result: {
    beforeAfter: {
      cols: ['Chỉ số', 'Trước', 'Sau'],
      rows: [
        ['Thời gian từ ý tưởng tới bản bấm thử được', 'Ít nhất 2 tuần (quy trình release)', 'Chưa đo trung bình; 1 lần chạy mẫu (Kế hoạch Xóa Nợ): 22 phút 30 giây'],
        ['Số Mini App demo đã làm', 'Chưa đo', '5 Mini App'],
        ['Cách lấy feedback', 'Đọc mô tả', 'Bấm thử bản HTML'],
      ],
      note: 'Số 22 phút 30 giây lấy từ ảnh chụp 1 lần chạy; chưa có phép đo trên nhiều mẫu.',
    },
    bullets: [
      'Làm xong bộ skill ZaloPay Mini App Builder bản MVP.',
      'Nhận 2 kiểu đầu vào: ý tưởng viết bằng lời (prompt) và thiết kế Figma.',
      'Tạo được bản review bấm thử và file HTML độc lập để chia sẻ; có thể đưa lên môi trường thử socialdev.',
      '5 Mini App demo: Rune Reading, Quote of the Day, Future Map, Kế hoạch Xóa Nợ, Zalopay Green Garden.',
      'Đã có skill chuẩn bị đưa lên môi trường thử develop/staging, nhưng còn phụ thuộc công cụ khác.',
    ],
    tables: [
      {
        title: '5 Mini App demo',
        note: '',
        cols: ['Mini App', 'Ý tưởng được hiện thực hóa', 'Điểm có thể review/khảo sát'],
        rows: [
          ['Rune Reading', 'Trải nghiệm rút rune để suy ngẫm mỗi ngày', 'Onboarding, cảm xúc thị giác, luồng rút rune, nội dung diễn giải'],
          ['Quote of the Day', 'Nội dung tích cực và kiến thức tài chính ngắn mỗi ngày', 'Phân loại nội dung, refresh, lưu, chia sẻ và bottom sheet giải thích'],
          ['Future Map', 'Mô phỏng con đường tới một mục tiêu tài chính', 'Dữ liệu mục tiêu, biểu đồ, thay đổi giả định và so sánh kịch bản'],
          ['Zalopay Green Garden', 'Biến điểm loyalty thành một khu vườn ảo có lý do quay lại mỗi ngày', 'Tưới cây, quest, giúp bạn bè, cửa hàng, bộ sưu tập và phần thưởng thu hoạch'],
          ['Kế hoạch Xóa Nợ', 'Theo dõi và tối ưu lộ trình trả nhiều khoản nợ', 'Snowball/Avalanche, ngày dự kiến hết nợ, tiến độ và thứ tự ưu tiên'],
        ],
      },
      {
        title: 'Giá trị mang lại',
        note: '',
        cols: ['Giá trị', 'Nghĩa là'],
        rows: [
          ['Thử được nhiều ý tưởng hơn', 'Tạo nhiều concept trước khi chọn hướng đầu tư.'],
          ['Feedback sớm hơn', 'Stakeholder và người dùng được bấm thử thay vì chỉ đọc mô tả.'],
          ['Trao quyền cho non-dev', 'PO, HR, Marketing, BD và team nghiệp vụ tự tạo bản thử nghiệm.'],
          ['Giảm hỗ trợ sớm từ developer', 'Developer chỉ tham gia sâu khi concept có tín hiệu tốt hoặc cần tích hợp thật.'],
          ['Tái sử dụng được', 'Source của bản thử được hoàn thiện tiếp, không phải làm lại từ đầu.'],
        ],
      },
    ],
    note: 'Chưa đo: thời gian từ brief tới prototype, số vòng feedback. Dự kiến đo trong đợt pilot tiếp theo.',
    images: [],
  },

  apply: {
    intro: 'Phần đã sẵn sàng nhất sau AI Week: ý tưởng hoặc Figma → Mini App bấm thử được → file HTML để review và khảo sát. Bạn không cần biết lập trình hay lệnh build.',
    fit: {
      yes: [
        'Bạn là PO, HR, Marketing, BD hoặc team nghiệp vụ, có ý tưởng Mini App không liên quan thanh toán.',
        'Bạn muốn có bản bấm thử để khảo sát, test với người dùng hoặc trình bày cho stakeholder.',
        'Bạn đã có thiết kế Figma và muốn biến nó thành bản chạy được.',
        'Bạn dùng được Claude hoặc Codex trên máy.',
      ],
      no: [
        'Bạn cần đưa Mini App lên chạy thật: đưa lên, kích hoạt, publish vẫn cần developer và người duyệt.',
        'Tính năng có thanh toán (bộ skill hướng tới non-payment Mini App).',
        'Bạn cần tích hợp dữ liệu thật, kiểm thử, bảo mật ở mức production.',
      ],
    },
    prep: [
      'File cài: zalopay-miniapp-skills-v0.3.3-all-in-one.zip — xin ở đâu: [cần bổ sung]',
      'Ứng dụng Claude hoặc Codex trên máy (macOS hoặc Windows).',
      'Nếu làm từ Figma: link chính xác tới frame/node trong Figma Design, và kết nối Figma cho AI (xem README.md trong package).',
      'Một đoạn mô tả ý tưởng: làm app gì, cho ai, muốn kiểm chứng điều gì.',
    ],
    steps: [
      'Cài Mini App Builder từ file zip (khoảng 4 bước, làm 1 lần).',
      'Mở chat mới, dán prompt mô tả ý tưởng hoặc prompt kèm link Figma.',
      'Trả lời các câu AI hỏi thêm, đợi AI dựng Mini App.',
      'Nhờ AI xuất file HTML review, mở thử trên trình duyệt.',
      'Gửi file HTML đi khảo sát; nhờ AI chỉnh theo góp ý rồi xuất lại.',
    ],
    blocks: [
      {
        type: 'steps',
        title: 'Bước 1 · Cài Mini App Builder',
        items: [
          'Giải nén toàn bộ package zalopay-miniapp-skills-v0.3.3-all-in-one.zip.',
          'Mở file install-zalopay-miniapp-builder.html trong folder vừa giải nén.',
          'Làm theo lựa chọn cài đặt dành cho Codex hoặc Claude.',
          'Mở một task/chat mới sau khi cài xong.',
        ],
      },
      { type: 'image', src: I('installer'), caption: 'Trang cài đặt trong package: cột trái cho Codex, cột phải cho Claude.' },
      { type: 'image', src: I('plugin-skills'), caption: 'Sau khi cài: ZaloPay Mini App Builder hiện trong danh sách plugin, có 3 câu lệnh mẫu và 11 skill.' },
      {
        type: 'text',
        title: 'Bước 2 · Vibe một ý tưởng thành Mini App',
        text: 'Chỉ cần mô tả Mini App hoặc tính năng muốn thử. Thay phần trong [ngoặc vuông] bằng ý tưởng của bạn. AI sẽ làm rõ yêu cầu, chọn hướng giao diện, tạo source và chuẩn bị bản review.',
      },
      {
        type: 'prompt',
        label: 'Prompt mẫu · Từ ý tưởng',
        text: 'Use zalopay-miniapp-vibe.\n\nTôi muốn tạo một Mini App [mô tả ý tưởng].\nĐối tượng sử dụng là [nhóm người dùng].\nMục tiêu chính là [giá trị cần kiểm chứng].\nHãy chọn hướng thiết kế phù hợp và cho tôi bản có thể bấm để review.',
      },
      {
        type: 'text',
        title: 'Bước 3 · Xuất file HTML để review',
        text: 'Sau khi có Mini App, nhờ AI tạo bản HTML review (hoặc gõ lệnh /build-html ở mục bên dưới). File HTML mở trực tiếp trên trình duyệt, gửi qua email hoặc chat, dùng cho khảo sát, usability review, stakeholder review, hoặc lưu lại làm ảnh chụp của concept tại thời điểm thử.',
      },
      {
        type: 'text',
        title: 'Bước 4 (tùy chọn) · Tạo Mini App từ Figma',
        text: 'Gửi link chính xác tới frame hoặc node Figma Design. Package có hướng dẫn cho 2 cách kết nối Figma (Figma Official MCP và local Figma WebSocket bridge) trong file README.md đi kèm.',
      },
      {
        type: 'prompt',
        label: 'Prompt mẫu · Từ Figma',
        text: 'Use zalopay-miniapp-vibe.\n\nImplement frame Figma này thành ZaloPay Mini App:\n<Figma Design URL>\nKiểm tra visual fidelity trước khi build bản review.',
      },
      {
        type: 'note',
        tone: 'warn',
        title: 'Đưa lên môi trường thử (deploy) chưa tự động hoàn toàn',
        text: 'Việc upload, thay đổi FP Tool, activate hoặc publish vẫn cần xác nhận và kiểm soát. Hãy nhờ developer khi muốn đưa lên develop/staging.',
      },
      {
        type: 'note',
        tone: 'info',
        title: 'Lỗi hay gặp',
        text: '[cần bổ sung]',
      },
    ],
    code: [
      {
        title: 'Xuất file HTML review',
        code: '/build-html apps/<ten-mini-app>',
        note: 'Lệnh này dùng để tạo file HTML độc lập của Mini App; gõ trong khung chat, thay <ten-mini-app> bằng tên Mini App của bạn.',
      },
    ],
    success: [
      'AI báo đã hoàn thiện Mini App và đưa các link: "Mở bản HTML review", "Xem source chính", "Brief sản phẩm", "Quyết định thiết kế".',
      'Mở file HTML trên trình duyệt thấy Mini App bấm qua lại được giữa các màn hình.',
    ],
    images: [
      { src: I('vibe-chat-debt'), caption: 'Ví dụ thật: 1 prompt mô tả Mini App Kế hoạch Xóa Nợ, AI chạy 22 phút 30 giây rồi trả link bản HTML review, source, brief và quyết định thiết kế.' },
    ],
    pitfalls: [],
  },

  safety: {
    rules: [
      'AI chỉ tạo bản thử để review; không thay thế quy trình production.',
      'Upload, thay đổi FP Tool, activate, publish không tự động hoàn toàn, luôn cần người xác nhận.',
      'Tích hợp thật, kiểm thử, bảo mật và release vẫn do developer làm.',
      'Dữ liệu nào đi qua AI: [cần bổ sung]',
    ],
    limits: [
      'Luồng đưa lên môi trường thử develop/staging còn phụ thuộc công cụ bên ngoài, đang hoàn thiện.',
      'Chưa có guardrail đầy đủ về dữ liệu, bảo mật, accessibility và cổng kiểm tra chất lượng trước khi lên production.',
      'Chưa có template brief và checklist review chuẩn cho từng nhóm PO, HR, Marketing, BD.',
      'Chưa đo thời gian từ brief tới prototype trên nhiều mẫu.',
    ],
    tables: [],
  },

  demo: [
    { src: I('rune-start'), caption: 'Rune Reading · Bắt đầu phiên đọc.' },
    { src: I('rune-result'), caption: 'Rune Reading · Kết quả và diễn giải rune.' },
    { src: I('rune-depth'), caption: 'Rune Reading · Chọn đọc 1 rune hay 3 rune.' },
    { src: I('rune-pick'), caption: 'Rune Reading · Chọn rune đang “gọi” bạn.' },
    { src: I('rune-uruz'), caption: 'Rune Reading · Giải nghĩa một rune và nút đọc tiếp.' },
    { src: I('rune-home'), caption: 'Rune Reading · Màn hình chính để bắt đầu phiên đọc.' },
    { src: I('rune-library'), caption: 'Rune Reading · Khám phá bộ rune.' },
    { src: I('quote-daily'), caption: 'Quote of the Day · Thông điệp hằng ngày, lọc theo chủ đề.' },
    { src: I('quote-expand'), caption: 'Quote of the Day · Nội dung mở rộng và hành động.' },
    { src: I('quote-finance'), caption: 'Quote of the Day · Thông điệp tài chính.' },
    { src: I('future-overview'), caption: 'Future Map · Tổng quan mục tiêu và dự báo thời điểm chạm mục tiêu.' },
    { src: I('future-scenarios'), caption: 'Future Map · Thử các kịch bản tương lai.' },
    { src: I('future-chart'), caption: 'Future Map · Biểu đồ nhịp thu–chi và tùy chỉnh dòng tiền.' },
    { src: I('future-toggles'), caption: 'Future Map · Bật/tắt giả định như tăng lương, trả nợ sớm, giảm chi tiêu.' },
    { src: I('debt-overview'), caption: 'Kế hoạch Xóa Nợ · Tổng quan kế hoạch và chọn chiến lược.' },
    { src: I('debt-map'), caption: 'Kế hoạch Xóa Nợ · Bản đồ các khoản nợ theo thứ tự ưu tiên.' },
    { src: I('garden-main'), caption: 'Khu vườn Zalopay · Chăm cây: tình trạng, độ ẩm, tiến độ luôn hiện cạnh nút tưới.' },
    { src: I('garden-quests'), caption: 'Khu vườn Zalopay · Nhiệm vụ xanh: check-in, học kiến thức, share.' },
    { src: I('garden-friends'), caption: 'Khu vườn Zalopay · Vườn bạn bè và bảng xếp hạng.' },
    { src: I('garden-store'), caption: 'Khu vườn Zalopay · Cửa hàng chọn hạt giống và trang trí.' },
    { src: I('garden-collection'), caption: 'Khu vườn Zalopay · Bộ sưu tập cây đã thu hoạch.' },
  ],

  tech: {
    bullets: [
      'Bộ skill ZaloPay Mini App Builder (MVP), cài vào Codex hoặc Claude dưới dạng plugin; package zalopay-miniapp-skills-v0.3.3-all-in-one.zip.',
      'Sinh source code theo blueprint và định hướng ZaloPay Design System; người dùng không cần biết React, cấu trúc project hay lệnh build.',
      'Mô tả plugin: “A self-contained skill suite for Practical UI product and layout discipline, ZaloPay LooknFeel UI, blueprint architecture, JS-SDK bridges, realistic mocks, review builds, slash commands, and sandbox preparation.”',
      'Đầu vào Figma: hỗ trợ Figma Official MCP và local Figma WebSocket bridge (chi tiết trong README.md của package).',
      'Green Garden dựng cả feature loop: loyalty economy, tiến trình, social action, store, reward state, native bridge và guardrail; đủ trạng thái loading, ready, empty, error, retry, cây khát/héo, hồi sinh, thiếu điểm, mua vật phẩm, share thành công/hủy/lỗi và chặn thao tác trùng. Hành động chính: tưới cây → trừ xu.',
    ],
    tables: [
      {
        title: 'Một số skill trong plugin (theo ảnh chụp, tổng 11 skill)',
        note: 'Còn lại: Zalopay Miniapp Build, Zalopay Miniapp Generate và 4 skill khác.',
        cols: ['Skill', 'Mô tả (theo ảnh)'],
        rows: [
          ['Zalopay Deploy Sandbox', 'Validates, builds, versions, packages, and prepares ZaloPay Mini Apps for develop or staging sandbox…'],
          ['Zalopay Design System', 'Specifies, creatively explores, generates, and audits ZaloPay Mini App Presentation source inside an…'],
          ['ZaloPay Figma Acquisition', 'Choose a Figma connector and normalize evidence'],
          ['ZaloPay Figma Visual Validation', 'Compare Mini App UI against authoritative Figma frames'],
          ['Zalopay Jssdk Bridge', 'Integrates ZaloPay JS-SDK v2 native capabilities through a typed, capability-checked adapter with…'],
        ],
      },
    ],
    code: [
      {
        title: 'Workflow đề xuất (Mermaid)',
        code: 'flowchart LR\n   A["Idea hoặc Figma"] --> B["Trò chuyện với Mini App Builder"]\n   B --> C["ZaloPay Mini App source"]\n   C --> D["HTML review"]\n   D --> E["Survey / Review / Feedback"]\n   E --> F["Điều chỉnh nhanh"]\n   F --> D\n   E --> G["Build và deploy khi concept đạt yêu cầu"]',
        note: 'Tách việc kiểm chứng ý tưởng khỏi phần productization: team nghiệp vụ tự lặp prototype, developer vào khi cần tích hợp thật, kiểm thử, bảo mật và release.',
      },
      {
        title: 'Build và deploy develop/staging sandbox',
        code: '/build apps/<ten-mini-app>\n/deploy apps/<ten-mini-app> develop',
        note: 'Validate, build, đóng gói và chuẩn bị bản develop/staging sandbox. Luồng deploy còn phụ thuộc công cụ bên ngoài; upload, thay đổi FP Tool, activate, publish chưa tự động hoàn toàn.',
      },
    ],
    images: [],
    repo: { label: 'zalopay-miniapp-skills-v0.3.3-all-in-one.zip', href: '' },
  },

  next: {
    steps: [
      'Chuẩn hóa template brief và checklist review cho PO, HR, Marketing, BD; chạy pilot với ý tưởng thật, đo thời gian brief → prototype và số vòng feedback.',
      'Hoàn thiện luồng deploy develop/staging sandbox; bổ sung guardrail về dữ liệu, bảo mật, accessibility và quality gate trước production.',
      'Theo dõi chỉ số: thời gian tạo prototype, số concept được thử, tỷ lệ concept tiếp tục đầu tư, developer effort tiết kiệm được.',
    ],
    contact: [
      'Phụ trách: Toàn. Nguyễn Trần Thiện · PCT-CX',
      'Cùng làm: Khang. Trần Hoàng, Thư. Phạm Ngọc',
      'Review: Viễn. Nguyễn Đức',
      'Kênh liên hệ: [cần bổ sung]',
    ],
    link: '',
  },
}
