export default {
  id: 'c3',
  postedAt: '2026-09-23',
  title: 'Bớt lỗi nhập sai khi cấu hình khuyến mãi trong CRM tool nhờ trợ lý tóm tắt và kiểm tra',
  toolName: 'CRM Assistant',
  desc: 'Người làm nghiệp vụ hỏi cách dùng CRM hoặc bấm 1 nút, nhận lời giải thích dễ đọc về nhóm khách hàng và ưu đãi đã cấu hình, kèm góp ý.',
  type: 'tool',
  status: 'inuse',
  statusNote: 'Giải pháp kỹ thuật: DONE · demo trên môi trường SBQC · nút áp dụng đề xuất đang làm',
  kind: 'tech',
  level: 'ref',
  category: 'Operations',
  topics: ['Thiết lập khuyến mãi', 'Kiểm tra cấu hình', 'Phân tích dữ liệu hỗ trợ'],
  tools: ['n8n', 'Gemini'],
  promptTarget: 'CRM Assistant (ô chat trong CRM tool)', // where the sample prompts are sent (shown on each prompt box)
  audience: 'Business/Ops, PO/PM',
  difficulty: 'Dễ',
  access: 'Cần xin quyền: tài khoản CRM tool (xin ở đâu: [cần bổ sung])',
  author: 'KietTT',
  ownerName: 'Kiệt. Tô Thế (8), Hoàng. Nguyễn Việt (6), Thắng. Hoàng Mạnh (3), Trọng. Dương Đức (2)',
  ownerTeam: '[cần bổ sung]',
  updated: '',
  cover: '/use-cases/c3/segment-summarize.png',
  stats: [],

  tldr: [
    ['Vấn đề', 'Từ 01 đến 07/2026, cấu hình sai là nhóm nguyên nhân lớn nhất: 289/1.881 yêu cầu hỗ trợ về khuyến mãi (15,4%).'],
    ['Giải pháp', 'Trợ lý trong CRM tool tóm tắt cấu hình thành câu dễ đọc, so ưu đãi với điều khoản, và trả lời câu hỏi cách dùng.'],
    ['Kết quả', 'Chưa đo. Tài liệu mới đặt chỉ số mục tiêu, mức nền còn cần đối chiếu.'],
    ['Dùng khi', 'Bạn cấu hình nhóm khách hàng hoặc ưu đãi voucher trong CRM tool và muốn tự kiểm tra trước khi chạy.'],
  ],

  problem: {
    text: 'Người làm nghiệp vụ (Business) có thể nhập sai khi thiết lập chiến dịch khuyến mãi (Promotion) trong CRM tool. Lỗi khó phát hiện trước khi chiến dịch chạy, nhất là khi điều kiện phức tạp, khó hiểu.',
    bullets: [
      'Ai gặp: người làm nghiệp vụ cấu hình chiến dịch khuyến mãi, nhất là người mới; và team Product, Tech phải hỗ trợ.',
      'Hay sai ở: điều kiện được dùng voucher, ứng dụng áp dụng (AppID/SubAppID), nhóm khách hàng hoặc danh sách được hưởng (Segment/whitelist), giá trị đơn tối thiểu, điều khoản chương trình.',
      'Tốn bao nhiêu: 01–07/2026 có 1.881 yêu cầu hỗ trợ (CS ticket) về khuyến mãi; cấu hình sai là nhóm lớn nhất, 289 yêu cầu (15,4%).',
      'Hậu quả: khách khiếu nại vì ưu đãi không như kỳ vọng; Product và Tech mất công điều tra và trả lời câu hỏi lặp lại.',
      'Một phần lỗi cấu hình nằm ngoài CRM tool (Event Tool, NBA), cần tách ra khỏi số liệu nền.',
    ],
    tables: [
      {
        title: 'Phân bổ nguyên nhân gốc, 01–07/2026',
        note: 'Toàn bộ 1.881 yêu cầu hỗ trợ về khuyến mãi. Tài liệu gốc có link Jira cho từng dòng. Dòng có dấu * giữ nguyên như tài liệu gốc (không có chú thích).',
        cols: ['Nguyên nhân gốc', 'Số yêu cầu', 'Tỉ lệ'],
        rows: [
          ['Cấu hình sai (Human - Configuration)', '289', '15,4%'],
          ['Khách hiểu sai (User misunderstanding*)', '282', '15,0%'],
          ['Khác (Others)', '251', '13,3%'],
          ['Khách cần thêm thông tin (User need more Information)', '222', '11,8%'],
          ['Hạ tầng – phần mềm (Infrastructure - Software)', '173', '9,2%'],
          ['Truyền đạt sai (Human - Communication)', '168', '8,9%'],
          ['Yếu tố bên ngoài (External Factors)', '128', '6,8%'],
          ['Hết ngân sách (Out of budget)', '125', '6,6%'],
          ['Điều khoản chưa rõ (Terms and Conditions not clear)', '41', '2,2%'],
          ['Hạ tầng – mạng (Infrastructure - Network)', '31', '1,6%'],
          ['Lỗi code (Human - Coding)', '28', '1,5%'],
          ['Hạ tầng – thiết bị (Infrastructure - Hardware)', '11', '0,6%'],
          ['Lỗi khi triển khai (Human - Deployment)', '4', '0,2%'],
          ['Chưa gán nguyên nhân (Not Assign Root Cause Type)', '128', '6,8%'],
        ],
      },
      {
        title: 'Bóc tách nhóm "cấu hình sai" theo loại thiết lập',
        note: 'Tài liệu gốc ghi: số lượng và mẫu số tính tỉ lệ còn cần đối chiếu lại. Tài liệu gốc có link Jira cho từng dòng.',
        cols: ['Thiết lập bị nhập sai', 'Số yêu cầu', 'Tỉ lệ'],
        rows: [
          ['Ứng dụng áp dụng (AppID / SubAppID)', '109', '36,1%'],
          ['Nhóm khách hàng / danh sách được hưởng (Segment / whitelist)', '51', '16,9%'],
          ['Điều kiện kích hoạt, sự kiện, nhiệm vụ, luồng (Trigger / event / task / flow)', '28', '9,3%'],
          ['Điều kiện, bộ lọc, cách áp dụng (Condition / filter / rule apply)', '23', '7,6%'],
          ['Ưu đãi hoặc chiến dịch hết hạn (Expired rule reward / campaign)', '16', '5,3%'],
          ['Hình thức, nguồn tiền thanh toán (Payment type / SOF / payment method)', '13', '4,3%'],
          ['Ưu đãi, số lượng, ngân sách (Reward / quota / budget)', '4', '1,3%'],
          ['Thông báo, hiển thị, nội dung (Notification / Display / Content)', '3', '1,0%'],
        ],
      },
      {
        title: 'Phạm vi',
        note: '',
        cols: ['Thuộc phạm vi', 'Ngoài phạm vi'],
        rows: [
          ['Thiết lập chiến dịch khuyến mãi do người làm nghiệp vụ thực hiện trong CRM tool', 'Cấu hình trong Event Tool và NBA'],
          ['Lỗi có thể chặn trước ở phần nhóm khách hàng (Segment) và ưu đãi (Reward), tuỳ kết quả kiểm tra dữ liệu', 'Sự cố hạ tầng, mạng, thiết bị, lỗi code, lỗi triển khai'],
          ['Câu hỏi thiết lập CRM lặp lại phải nhờ Product hoặc Tech', 'Cách triển khai kỹ thuật (do team kỹ thuật phụ trách)'],
        ],
      },
    ],
    images: [
      { src: '/use-cases/c3/voucher-loi-cau-hinh.png', caption: 'Ví dụ trong phần bằng chứng: voucher "Giảm tối đa 100K" báo khách cần thanh toán thêm 996.528.197đ.' },
    ],
  },

  solution: {
    analogy: 'Hiểu đơn giản: như có người đọc lại thiết lập của bạn thành câu tiếng Việt dễ hiểu, và chỉ ra chỗ lệch so với điều khoản chương trình.',
    steps: [
      'Bạn: mở màn hình cấu hình nhóm khách hàng hoặc ưu đãi trong CRM tool, bấm nút CRM Assistant cạnh tên bạn.',
      'AI (nhóm khách hàng): bấm "Summarize", AI viết lại toàn bộ điều kiện thành đoạn tiếng Việt dễ đọc để bạn so với nhu cầu thật.',
      'AI (ưu đãi voucher): bấm "Analyze", AI tóm tắt cách giảm giá, điều kiện áp dụng và báo chỗ lệch với điều khoản (T&C), kèm đề xuất.',
      'AI (hỏi đáp): gõ câu hỏi về quyền, cách cấu hình; AI trả lời từng bước kèm link nguồn và ảnh, không chắc thì hỏi lại.',
      'Bạn kiểm tra: đối chiếu kết quả với nhu cầu, tự sửa và lưu. Trợ lý chỉ đọc, không tự lưu hay áp dụng cấu hình.',
    ],
    images: [],
  },

  result: {
    beforeAfter: {
      cols: ['Chỉ số', 'Trước', 'Sau'],
      rows: [
        ['Tỉ lệ yêu cầu hỗ trợ do cấu hình sai trên số chiến dịch CRM', 'Sẽ tính sau khi chốt phạm vi CRM và số chiến dịch', 'Chưa đo. Mục tiêu: giảm X% trong 3 tháng liên tiếp (tài liệu chưa điền X)'],
        ['Số yêu cầu hỗ trợ do cấu hình sai mỗi tháng', 'Sẽ lấy từ bộ yêu cầu 01–07/2026', 'Chưa đo. Mục tiêu: giảm từ mức A xuống B mỗi tháng (tài liệu chưa điền số)'],
        ['Công sức Product và Tech hỗ trợ', '[cần bổ sung]', 'Chưa đo. Mục tiêu: giảm 50% thời gian trả lời tin nhắn, hỗ trợ'],
        ['Yêu cầu tự giải quyết, không cần nhờ Product hoặc Tech', '[cần bổ sung]', 'Chưa đo. Mục tiêu: đạt X% (tài liệu chưa điền X)'],
      ],
      note: 'Chưa đo: tài liệu mới đặt mục tiêu. Mức nền lấy từ yêu cầu hỗ trợ 01–07/2026, còn cần đối chiếu.',
    },
    bullets: [
      'Phần giải pháp kỹ thuật đã xong (DONE), tài liệu ở trạng thái READY.',
      'Đã có demo 3 tính năng gắn vào CRM tool trên môi trường SBQC: hỏi đáp cách dùng, giải thích nhóm khách hàng, kiểm tra cấu hình ưu đãi.',
    ],
    tables: [
      {
        title: 'Chỉ số mục tiêu và cách tính',
        note: 'Theo mục 3 (Target Metrics) của tài liệu gốc.',
        cols: ['Loại', 'Chỉ số', 'Cách tính', 'Nguồn / Phụ trách'],
        rows: [
          ['Kết quả chính', 'Tỉ lệ yêu cầu hỗ trợ do cấu hình CRM sai', 'Số yêu cầu CRM (không trùng) gắn nhãn Human - Configuration / số chiến dịch CRM đã chạy × 100', 'Jira + dữ liệu chiến dịch CRM / Product & Data'],
          ['Chẩn đoán', 'Số yêu cầu do cấu hình CRM sai mỗi tháng', 'Số yêu cầu (không trùng) đúng phạm vi CRM và định nghĩa Human - Configuration đã thống nhất', 'Jira / Product'],
          ['Hiệu quả', 'Công sức hỗ trợ của Product và Tech', 'Tổng số giờ mỗi tháng trả lời câu hỏi thiết lập lặp lại và điều tra lỗi cấu hình', 'Nhật ký hỗ trợ hoặc lấy mẫu thời gian / Product & Tech'],
          ['Tự phục vụ', 'Yêu cầu tự giải quyết, không cần nhờ Product hoặc Tech', 'Số yêu cầu cấu hình CRM tự giải quyết / tổng số yêu cầu cấu hình CRM × 100', 'Kênh hỗ trợ (Chatbot)'],
        ],
      },
    ],
    note: 'Chưa đo: chưa có số trước/sau khi dùng trợ lý.',
    images: [],
  },

  apply: {
    intro: 'Trợ lý nằm ngay trong CRM tool. Bạn không cần cài gì, chỉ cần mở màn hình cấu hình và bấm nút.',
    fit: {
      yes: [
        'Bạn cấu hình chiến dịch khuyến mãi trong CRM tool, nhất là nhóm khách hàng (Segment) hoặc ưu đãi voucher (Reward).',
        'Bạn mới dùng CRM và cần hướng dẫn từng bước (quyền, cách cấu hình).',
        'Bạn ở team Product hoặc Tech, hay phải trả lời câu hỏi cấu hình lặp lại.',
      ],
      no: [
        'Bạn cấu hình trong Event Tool hoặc NBA (ngoài phạm vi).',
        'Bạn cần trợ lý tự sửa cấu hình giúp: trợ lý chỉ đọc; nút áp dụng đề xuất đang làm.',
      ],
    },
    prep: [
      'Tài khoản CRM tool có quyền cấu hình chiến dịch. Xin ở đâu: [cần bổ sung]',
      'Link mở CRM tool: [cần bổ sung]',
      'Một cấu hình nhóm khách hàng hoặc ưu đãi đang soạn, để bấm kiểm tra.',
    ],
    steps: [
      'Mở CRM tool. Ở màn hình chính có khung chat CRM Assistant để hỏi về cách dùng (quyền, cách cấu hình…).',
      'Ở màn hình cấu hình nhóm khách hàng hoặc ưu đãi, bấm nút CRM Assistant nhỏ ở trên cùng, cạnh tên bạn.',
      'Nhóm khách hàng: bấm "Summarize" để nhận đoạn tóm tắt điều kiện. Ưu đãi: bấm "Analyze" để nhận phân tích và đề xuất.',
      'Đọc kết quả, so với nhu cầu thật và điều khoản chương trình. Thấy lệch thì tự sửa rồi lưu.',
      'Có câu hỏi khác thì gõ vào ô "Ask a question...", hoặc bấm một câu hỏi gợi ý có sẵn.',
    ],
    blocks: [
      { type: 'image', src: '/use-cases/c3/crm-assistant-nut.png', caption: 'Nút CRM Assistant nằm ở góc trên, cạnh tên người dùng.' },
      { type: 'prompt', label: 'Câu hỏi gợi ý có sẵn trong CRM Assistant', text: 'Tôi có thể hỏi bạn những gì?' },
      { type: 'prompt', label: 'Câu hỏi gợi ý có sẵn trong CRM Assistant', text: 'Cách xin quyền vào CRM?' },
      { type: 'prompt', label: 'Câu hỏi gợi ý có sẵn trong CRM Assistant', text: 'Không thấy nút Add New trong Merchant Code thì làm sao?' },
      { type: 'note', tone: 'info', title: 'Video demo', text: 'Tài liệu gốc có video "[Demo] Chatbot Config + Segment Explain + Reward Config Validation.mov" quay trên môi trường SBQC (bản sao lúc 31/07/2026 15:00).' },
    ],
    code: [],
    success: [
      'Khung chat hiện tiêu đề "CRM Assistant" và dòng "Hỏi về cách dùng CRM, quyền truy cập, hoặc các thao tác vận hành thường gặp."',
      'Ở màn hình nhóm khách hàng có nút "Summarize"; ở màn hình ưu đãi có nút "Analyze", ngay trên ô hỏi đáp.',
      'Câu trả lời hỏi đáp chia thành từng bước, có link nguồn và ảnh minh hoạ gắn vào đúng bước.',
    ],
    images: [],
    pitfalls: [
      { meet: 'Trợ lý hỏi lại một câu thay vì trả lời', why: 'Câu hỏi thiếu thông tin, ví dụ chưa rõ bạn đang ở mục nào hay gặp lỗi gì', fix: 'Trả lời câu hỏi đó, nói rõ màn hình, trường và lỗi bạn gặp' },
      { meet: 'Trợ lý đưa danh sách mục để bạn chọn', why: 'Tên bạn gõ khớp với nhiều mục trong CRM', fix: 'Chọn đúng đường dẫn mục bạn đang cấu hình' },
      { meet: 'Trợ lý báo chưa có hướng dẫn hoặc tạm thời không trả lời được', why: 'Không đủ tài liệu đã duyệt, hoặc hệ thống tạm thời gián đoạn; trợ lý không đoán', fix: 'Thử lại sau, hoặc hỏi team Product / Tech' },
    ],
  },

  safety: {
    rules: [
      'Trợ lý chỉ đọc: không lưu, không áp dụng, không xuất bản cấu hình nhóm khách hàng.',
      'Chỉ trả lời từ hướng dẫn CRM đã được duyệt; mỗi câu trả lời có link nguồn.',
      'Không đủ bằng chứng thì hỏi lại hoặc báo chưa có hướng dẫn, không tự bịa cách làm.',
      'Bạn là người quyết định: xem kết quả kiểm tra ưu đãi rồi mới lưu, xác nhận hoặc dừng.',
      'Dữ liệu đi qua AI: câu hỏi của bạn, cấu hình nhóm khách hàng/ưu đãi, điều khoản chương trình, hướng dẫn trên Confluence, thông tin ứng dụng và mẫu nhật ký giao dịch đã lược bớt.',
    ],
    limits: [
      'Chưa có nút áp dụng đề xuất vào cấu hình ngay trên màn hình (đang làm).',
      'Khi ưu đãi áp dụng cho hơn 5 ứng dụng (AppID), phần kiểm tra theo dữ liệu từng ứng dụng bị bỏ qua.',
      'Chưa dùng cho Event Tool và NBA.',
      'Demo đang chạy trên môi trường SBQC.',
      'Chưa đo hiệu quả; cách phân loại nguyên nhân còn cần đối chiếu với bảng chi tiết.',
    ],
    tables: [],
  },

  demo: [
    { src: '/use-cases/c3/segment-summarize.png', caption: 'Màn hình cấu hình nhóm khách hàng: bấm "Summarize" trong CRM Assistant để tóm tắt điều kiện.' },
    { src: '/use-cases/c3/reward-analyze.png', caption: 'Màn hình cấu hình ưu đãi voucher: bấm "Analyze" để phân tích và nhận đề xuất.' },
  ],

  tech: {
    bullets: [
      'CRM chatbot: trợ lý dựa trên bằng chứng, điều phối bằng n8n. Biến hướng dẫn CRM đã duyệt thành câu trả lời từng bước, có link nguồn và ảnh; chỉ trả lời khi bằng chứng qua kiểm tra, nếu không thì hỏi lại hoặc fail an toàn.',
      'Segment config: segment-config parser → normalized AST → condition-catalog resolver → semantic validator → canonical renderer → AI refiner (tuỳ chọn) → AI output guard.',
      'Các bước segment: load config + condition catalog; parse raw JSON thành AST (giữ nested group, thứ tự con, ưu tiên AND/OR, phạm vi phủ định, where, having, timeframe, source path); enrich node bằng metadata catalog; validate theo luật cấu trúc và ràng buộc catalog (condition ID, type, field, scope, operator, value); render deterministic ra tóm tắt tiếng Việt, giải thích từng node, canonical expression, coverage, warning; AI refine lời văn tuỳ chọn — output phải chứa đúng tập node AST và qua safety validation, nếu không thì fallback về bản deterministic.',
      'AST chuẩn hoá là biểu diễn ngữ nghĩa dùng chung cho summarize, validate, logic inspection và kiểm tra draft từ ngôn ngữ tự nhiên. Mọi thao tác đều read-only.',
      'Segment MCP: 9 tool read-only có xác thực qua Streamable HTTP — tìm condition trong catalog, lấy định nghĩa condition, validate/inspect segment config, summarize logic, sinh draft config bám catalog từ yêu cầu ngôn ngữ tự nhiên. Owner: Technical team.',
      'Voucher reward config: tóm tắt reward config thành văn bản dễ đọc; phân tích discount scheme + application rules so với TnC, báo mismatch. Luồng: Reward Config UI (Verify/Save) → Admin BFF gửi draft + draft_revision → n8n verifier (webhook) → Code JS chuẩn hoá TnC, rules, chạy deterministic checks → nếu whitelist 1–5 app ID: lấy evidence từ AppInfo (MB question 4172), Requests (Redis cache, cache miss thì 7 truy vấn log theo ngày trên OS, chỉ cache evidence hợp lệ); nếu > 5 app ID: ghi nhận bỏ qua → AI agent nhận TnC, rules, facts, evidence (tuỳ chọn tra neighbour app theo merchant/category/name) → gộp checks, tính verdict → UI hiển thị findings, cho Save/confirm/block.',
      'RAG flow: (1) Route — segment action sang Segment Agent + MCP read-only, câu hỏi khác vào RAG; (2) Hiểu câu hỏi — rule deterministic + Gemini tách intent, entity, field, lifecycle phase, error; thiếu thì hỏi lại 1 câu; (3) Resolve canonical entity bằng Qdrant metadata facets, nhiều entity khớp thì hỏi chọn module path; (4) Retrieve — embed bằng Qwen3 Embedding 8B, canonical-entity search tối đa 24 chunk, fallback tối đa 40, giới hạn dataset crm-guide; (5) Lọc & chấm bằng chứng — bắt buộc rag_status=approved, check entity/intent/lifecycle/troubleshooting/source status, match không chắc qua evidence grader với ngưỡng ≥ 0.72; (6) Gemini chỉ nhận evidence đã duyệt để sinh câu trả lời; (7) n8n chuẩn hoá thành block giới thiệu + từng bước, gắn nguồn và ảnh (URL ảnh Confluence validate và lấy qua proxy có xác thực); (8) Fail closed khi thiếu context, bằng chứng yếu hoặc Qdrant/model không truy cập được.',
      'Key safeguards: read-only Segment tools, approved-document filtering, entity-aware retrieval, evidence thresholding, source traceability, authenticated Confluence image access, low-temperature generation, fail-closed behaviour.',
    ],
    tables: [
      {
        title: 'Technology stack (CRM chatbot)',
        note: '',
        cols: ['Lớp', 'Công nghệ', 'Mục đích'],
        rows: [
          ['Orchestration', 'n8n 1.120.4 + LangChain nodes', 'Điều hướng request, chạy RAG, gọi model và tool, chuẩn hoá response cuối.'],
          ['CRM chat interface', 'n8n Webhook + HTML/JavaScript UI', 'Màn hình chat nhúng, quản lý session, response block, link, hiển thị ảnh.'],
          ['Query understanding', 'gemini/gemini-3.1-flash-lite, temperature 0', 'Tách intent, CRM entity, field, lifecycle phase, error context từ câu hỏi tiếng Việt hoặc trộn ngôn ngữ.'],
          ['Embedding model', 'qwen/qwen3-embedding-8b, 4,096 dimensions', 'Chuyển câu hỏi đã resolve thành vector để tìm kiến thức.'],
          ['Vector database', 'Qdrant, collection ge_crm_guide', 'Lưu chunk hướng dẫn CRM, metadata, link nguồn, tham chiếu ảnh.'],
          ['Answer and evidence models', 'gemini/gemini-3.1-flash-lite', 'Chấm bằng chứng chưa chắc và sinh câu trả lời chỉ từ bằng chứng đã chọn; temperature 0.1, giới hạn 4,096 token.'],
          ['Segment capability', 'LangChain Agent + authenticated Segment MCP', 'Segment summary, validation, logic inspection, gợi ý draft read-only.'],
          ['Conversation memory', 'Conversation state + Redis cho Segment chat', 'Hỗ trợ câu hỏi nối tiếp; Segment memory giữ 7 tin nhắn, TTL 45 phút.'],
          ['Knowledge and media source', 'Confluence + authenticated n8n image proxy', 'Dùng tài liệu nội bộ làm bằng chứng, hiển thị ảnh Confluence an toàn theo từng bước.'],
        ],
      },
    ],
    code: [],
    images: [
      { src: '/use-cases/c3/reward-verify-flow.png', caption: 'Sequence diagram kiểm tra voucher reward config: từ Verify/Save trên UI qua n8n verifier, thu thập evidence, AI agent, tới báo cáo hiển thị lại cho người dùng.' },
    ],
    repo: null,
  },

  next: {
    steps: [
      'Cho phép áp dụng cấu hình đề xuất (từ phần phân tích ưu đãi) vào cấu hình hiện tại ngay trên màn hình (đang làm).',
      'Đối chiếu cách phân loại nguyên nhân và mẫu số tỉ lệ với bảng chi tiết trước khi chốt kết luận.',
      'Tính mức nền sau khi chốt phạm vi CRM và số chiến dịch, rồi điền số mục tiêu (X%, A, B).',
    ],
    contact: [
      'Phụ trách (PIC): Kiệt. Tô Thế (8), Hoàng. Nguyễn Việt (6), Thắng. Hoàng Mạnh (3), Trọng. Dương Đức (2).',
      'Giải pháp kỹ thuật: Technical team.',
      'Bằng chứng gốc: trang "Summary CS Ticket" trên Confluence (link trong tài liệu gốc).',
      'Kênh liên hệ: [cần bổ sung]',
    ],
    link: '',
  },
}
