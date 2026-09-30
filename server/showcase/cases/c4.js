export default {
  id: 'c4',
  postedAt: '2026-09-23',
  title: 'Tự đưa AI agent lên chạy thật bằng lệnh tiếng Việt, không cần biết lập trình',
  toolName: 'Zalopay Agent Base Skills',
  desc: 'Người chưa rành kỹ thuật cài bộ skill vào Claude Code, Codex hoặc Cursor, ra lệnh bằng tiếng Việt và nhận đường link ứng dụng chạy thật.',
  type: 'guide',
  status: 'prototype',
  statusNote: 'Mới triển khai ở môi trường dev, bộ skill mới test trên macOS',
  kind: 'tech',
  level: 'ready',
  category: 'People Enablement',
  topics: ['Deploy agent', 'Hướng dẫn cho non-tech'],
  tools: ['Claude Code', 'Codex', 'Cursor'],
  audience: 'Người mới, chưa rành kỹ thuật (Business/Ops, PO/PM)',
  difficulty: 'Trung bình',
  access: 'Cần xin quyền: liên hệ SRE để được cấp file cấu hình <tên_bạn>_zlpagentbase.env',
  author: 'SRE',
  ownerName: '[cần bổ sung]',
  ownerTeam: '[cần bổ sung]',
  updated: '',
  cover: '',
  stats: [],

  tldr: [
    ['Vấn đề', 'Đưa ứng dụng lên chạy thật trên internet bình thường cần người kỹ thuật làm.'],
    ['Giải pháp', 'Cài bộ skill vào công cụ AI; bạn ra lệnh bằng tiếng Việt, AI tự làm phần kỹ thuật trên Agent Base.'],
    ['Kết quả', 'Nhận một đường link để mở bằng trình duyệt và gửi cho người khác dùng. Chưa đo thời gian tiết kiệm.'],
    ['Dùng khi', 'Bạn có ứng dụng hoặc AI agent tự làm và muốn đưa lên chạy thật mà không cần biết lập trình, server.'],
  ],

  problem: {
    text: 'Agent Base là hệ thống nội bộ của ZaloPay để đưa ứng dụng của bạn lên chạy thật trên internet. Bình thường việc này cần người kỹ thuật làm.',
    bullets: [
      'Ai gặp: người mới hoặc chưa rành kỹ thuật, muốn tự đưa AI agent của mình lên chạy thật.',
      'Việc tốn công: phải biết lập trình, biết server và gõ lệnh phức tạp mới tự làm được.',
      'Tốn bao nhiêu: [cần bổ sung]',
    ],
    tables: [],
    images: [],
  },

  solution: {
    analogy: 'Hiểu đơn giản: bạn ra lệnh bằng tiếng Việt, AI làm theo hướng dẫn trong bộ skill rồi tự thao tác trên Agent Base.',
    steps: [
      'Bạn: xin SRE file cấu hình riêng, rồi nhờ AI cài bộ skill vào Claude Code, Codex hoặc Cursor.',
      'Bạn: mở công cụ AI ngay tại thư mục chứa code, gõ một câu nhờ deploy.',
      'AI: hỏi lại vài câu (tên ứng dụng, có cần địa chỉ web, có đặt mật khẩu không), rồi tự đưa ứng dụng lên.',
      'Bạn kiểm tra: mở đường link AI trả về và lưu lại mật khẩu bảo vệ (chỉ hiện một lần).',
      'Bạn: sau này sửa code, kiểm tra, đổi tên miền, tạm dừng hay xoá đều bằng một câu tiếng Việt.',
    ],
    images: [],
  },

  result: {
    beforeAfter: null,
    bullets: [
      'Sau khi đưa lên, bạn nhận được một đường link để mở bằng trình duyệt và gửi cho người khác dùng.',
      'Phần kỹ thuật do AI làm; việc của bạn là ra lệnh (prompt) cho AI.',
    ],
    tables: [],
    note: 'Chưa đo: tài liệu gốc không có số liệu về thời gian hay số ứng dụng đã deploy.',
    images: [],
  },

  apply: {
    intro: 'Bạn không cần biết lập trình, không cần biết server, không cần gõ lệnh phức tạp. Việc của bạn là prompt cho AI, phần kỹ thuật để AI làm. Mỗi bước dưới đây có prompt copy sẵn.',
    fit: {
      yes: [
        'Bạn dùng một trong ba công cụ AI: Claude Code, Codex hoặc Cursor.',
        'Bạn có ứng dụng muốn mở bằng trình duyệt và gửi cho người khác dùng.',
        'Bạn đã có (hoặc xin được SRE) file cấu hình <tên_bạn>_zlpagentbase.env.',
      ],
      no: [
        'Bạn cần chạy model local như ollama, vllm: mỗi ứng dụng chỉ có 2 CPU / 4 GB RAM (liên hệ SRE HienLQ).',
        'Bạn cần chạy thật ở môi trường production: hiện Agent Base mới triển khai ở môi trường dev.',
      ],
    },
    prep: [
      'Máy macOS hoặc Linux, Windows (bộ skill mới được test trên macOS).',
      'Một công cụ AI: chọn một trong ba Claude Code, Codex hoặc Cursor.',
      'Node.js (bản LTS), python3 và git đã cài trên máy.',
      'File cấu hình <tên_bạn>_zlpagentbase.env: do SRE cấp riêng cho bạn, liên hệ SRE nếu chưa có.',
      'File zip ZLP_AgentBase_Skills_V2.zip: đính kèm trong tài liệu gốc; link tải: [cần bổ sung]',
    ],
    steps: [
      'Liên hệ SRE để được cấp file cấu hình <tên_bạn>_zlpagentbase.env. Giai đoạn test đã có sẵn một bộ cấu hình và key dùng chung, thời hạn 30 ngày.',
      'Tải file zip bộ skill, giải nén.',
      'Cài đặt bằng prompt ở bước "Cài đặt". Xác nhận thấy API check: PASS.',
      'Đặt tên thư mục ứng dụng đúng quy tắc (chữ thường, không dấu, nối bằng dấu -).',
      'Mở công cụ AI tại thư mục ứng dụng, chạy prompt deploy.',
      'Lưu lại mật khẩu bảo vệ mà AI in ra.',
      'Mở đường link nhận được để kiểm tra.',
      'Sửa code sau này: chạy lại prompt deploy để cập nhật.',
    ],
    blocks: [
      { type: 'note', tone: 'warn', title: 'Lưu ý quan trọng', text: 'Hiện Agent Base chỉ mới triển khai ở môi trường dev và bộ skill chỉ mới test trên máy macOS.' },

      // Chuẩn bị
      { type: 'table', title: 'Chuẩn bị trước khi cài', note: 'Kiểm tra đủ các mục dưới đây trước khi bắt đầu.', cols: ['Cần có', 'Ghi chú'], rows: [
        ['Máy macOS hoặc Linux, Windows', 'Bộ skill chạy trên các hệ điều hành này'],
        ['Một công cụ AI', 'Chọn một trong ba: Claude Code, Codex, hoặc Cursor'],
        ['Node.js (bản LTS)', 'Dùng để chạy MCP Server Agentbase'],
        ['python3 và git', 'Dùng cho các script của Agentbase'],
        ['File cấu hình <tên_bạn>_zlpagentbase.env', 'Do SRE cấp riêng cho bạn. Liên hệ SRE nếu chưa có.'],
      ] },
      { type: 'note', tone: 'warn', title: 'Giới hạn tài nguyên', text: 'Do là môi trường dev, mỗi ứng dụng đang bị giới hạn cố định 2 CPU / 4 GB RAM, nên đừng chạy model local như ollama, vllm. Nếu cần chạy model local, liên hệ SRE (HienLQ) để được hỗ trợ.' },
      { type: 'prompt', label: 'Không biết máy đã có đủ chưa? Mở công cụ AI và gõ nguyên câu này', text: 'Kiểm tra giúp tôi máy đã cài Node.js, python3, git và Docker chưa.\nCái nào chưa có thì chỉ tôi cách cài nhé.' },

      // Cài đặt
      { type: 'steps', title: 'Cài đặt — Bước 0: Tải và giải nén', items: [
        'Tải file zip đính kèm về máy.',
        'Giải nén. Bạn sẽ được một thư mục tên ZLP_AgentBase_Skills_V2 chứa 5 thư mục con bắt đầu bằng zlp-agentbase-.',
        'Để ý xem thư mục đó nằm ở đâu (thường là Downloads). Bạn sẽ cần đường dẫn này ở bước sau.',
        'Chuẩn bị sẵn file cấu hình SRE cấp cho bạn, ví dụ luanpd_zlpagentbase.env.',
      ] },
      { type: 'image', src: '/use-cases/c4/skills-zip.png', caption: 'File đính kèm trong tài liệu gốc: ZLP_AgentBase_Skills_V2.zip (bộ skill cần tải về).' },
      { type: 'text', title: 'Cách A — Nhờ AI cài hộ (khuyên dùng)', text: 'Mở công cụ AI của bạn, copy nguyên khối prompt bên dưới, sửa hai dòng đường dẫn cho đúng máy bạn rồi gửi đi. Chọn đúng prompt cho công cụ bạn dùng.' },
      { type: 'prompt', label: 'Nếu bạn dùng Claude Code', text: 'Tôi cần cài bộ skill ZLP Agent Base vào Claude Code.\n- Thư mục skill sau khi giải nén: ~/Downloads/ZLP_AgentBase_Skills_V2\n- File cấu hình SRE cấp cho tôi: ~/Downloads/luanpd_zlpagentbase.env\nHãy làm giúp tôi theo đúng thứ tự:\n1. Tạo thư mục ~/.claude/skills nếu chưa có, rồi copy 5 thư mục bắt đầu bằng\nzlp-agentbase- từ thư mục skill vào đó.\n2. Copy file cấu hình thành ~/.claude/zlpagentbase.env rồi đặt quyền chmod 600.\n3. Chạy skill zlp-agentbase-init để kết nối máy tôi với Agent Base.\n4. Báo lại kết quả và cho tôi biết có cần khởi động lại Claude Code không.' },
      { type: 'prompt', label: 'Nếu bạn dùng Codex', text: 'Tôi cần cài bộ skill ZLP Agent Base vào Codex.\n- Thư mục skill sau khi giải nén: ~/Downloads/ZLP_AgentBase_Skills_V2\n- File cấu hình SRE cấp cho tôi: ~/Downloads/luanpd_zlpagentbase.env\nHãy làm giúp tôi theo đúng thứ tự:\n1. Tạo thư mục ~/.codex/skills nếu chưa có, rồi copy 5 thư mục bắt đầu bằng\nzlp-agentbase- từ thư mục skill vào đó. Không đụng vào thư mục .system.\n2. Copy file cấu hình thành ~/.claude/zlpagentbase.env rồi đặt quyền chmod 600.\n(Đúng là ~/.claude, các script luôn tìm ở đó trước.)\n3. Chạy skill zlp-agentbase-init và cài kết nối cho Codex (client=codex).\n4. Báo lại kết quả và cho tôi biết có cần khởi động lại Codex không.' },
      { type: 'prompt', label: 'Nếu bạn dùng Cursor', text: 'Tôi cần cài bộ skill ZLP Agent Base vào Cursor.\n- Thư mục skill sau khi giải nén: ~/Downloads/ZLP_AgentBase_Skills_V2\n- File cấu hình SRE cấp cho tôi: ~/Downloads/luanpd_zlpagentbase.env\nHãy làm giúp tôi theo đúng thứ tự:\n1. Tạo thư mục ~/.cursor/skills nếu chưa có, rồi copy 5 thư mục bắt đầu bằng\nzlp-agentbase- từ thư mục skill vào đó.\nLưu ý: KHÔNG phải ~/.cursor/skills-cursor, đó là thư mục nội bộ của Cursor.\n2. Copy file cấu hình thành ~/.claude/zlpagentbase.env rồi đặt quyền chmod 600.\n(Đúng là ~/.claude, các script luôn tìm ở đó trước.)\n3. Chạy skill zlp-agentbase-init và cài kết nối cho Cursor (client=cursor).\n4. Báo lại kết quả và cho tôi biết có cần khởi động lại Cursor không.' },
      { type: 'result', label: 'AI sẽ báo lại một bảng kết quả tương tự sau khi chạy', title: 'Kết quả', code: 'ZLP Agent Base — Coolify MCP\nEnv file : /Users/<your_user>/.claude/zlpagentbase.env\nBase URL : https://...\nStatus : INSTALLED\nAPI check : PASS (HTTP 200)' },
      { type: 'table', title: 'Cần nhìn đúng hai dòng', cols: ['Bạn thấy', 'Nghĩa là'], rows: [
        ['API check: PASS', 'Kết nối thành công, dùng được.'],
        ['API check: FAIL', 'Chưa dùng được. Xem bảng "Lỗi hay gặp" bên dưới.'],
      ] },
      { type: 'note', tone: 'info', text: 'Nếu AI báo cần khởi động lại công cụ thì hãy tắt và mở lại. Nếu AI báo ALREADY OK (unchanged) thì không cần khởi động lại gì cả.' },

      // Quy tắc đặt tên
      { type: 'note', tone: 'info', title: 'Quy tắc đặt tên thư mục (đọc trước khi deploy)', text: 'Đây là điều quan trọng nhất cần nhớ: tên ứng dụng trên Agent Base được lấy tự động từ tên thư mục chứa code của bạn. Bạn không được chọn tên, và AI cũng sẽ không hỏi.' },
      { type: 'bullets', items: ['Chữ thường, không dấu tiếng Việt', 'Không có khoảng trắng — nối bằng dấu gạch ngang -', 'Ngắn gọn, dễ nhận ra'] },
      { type: 'table', cols: ['Tên thư mục', 'Kết quả'], rows: [
        ['bao-cao-chi-phi', 'Tốt'],
        ['demo-chatbot', 'Tốt'],
        ['Báo Cáo Chi Phí', 'Bị đổi thành b-o-c-o-chi-ph — khó nhận ra'],
        ['App 1', 'Bị đổi thành app-1'],
      ] },
      { type: 'note', tone: 'danger', title: 'Cảnh báo', text: 'Nếu bạn đổi tên thư mục rồi deploy lại, hệ thống sẽ hiểu đó là một ứng dụng hoàn toàn mới và tạo thêm một ứng dụng thứ hai, thay vì cập nhật cái cũ. Đặt tên thư mục một lần rồi giữ nguyên.' },

      // Deploy
      { type: 'note', tone: 'warn', title: 'Đưa ứng dụng lên chạy thật (deploy) — chuẩn bị', text: 'Đây là việc bạn dùng nhiều nhất. Phải mở công cụ AI ngay tại thư mục chứa code ứng dụng, không phải thư mục bất kỳ. Nếu mở sai chỗ, AI sẽ deploy nhầm thư mục.' },
      { type: 'prompt', label: 'Prompt deploy', text: 'Deploy ứng dụng này lên Zalopay agent base dùm nhé.' },
      { type: 'table', title: 'AI sẽ hỏi lại bạn vài câu — cách trả lời', cols: ['AI hỏi', 'Trả lời thế nào'], rows: [
        ['Xác nhận tên ứng dụng và cách đóng gói', 'Đọc qua rồi trả lời "ok" nếu tên đúng như bạn mong đợi'],
        ['Có cần địa chỉ web để truy cập từ trình duyệt không?', 'Hầu hết trả lời có. Trả lời "không" chỉ khi ứng dụng chạy ngầm, không có giao diện'],
        ['Có đặt mật khẩu bảo vệ trang web không?', 'Nên có, nếu ứng dụng chứa dữ liệu nội bộ. AI sẽ tự tạo mật khẩu ngẫu nhiên cho bạn'],
        ['Ứng dụng chạy ở cổng số mấy?', 'Nếu không biết, nói "tôi không rõ, bạn xem trong code giúp tôi". Câu này có thể không xuất hiện nếu AI tự nhận ra thông qua docker file'],
      ] },
      { type: 'note', tone: 'danger', title: 'Rất quan trọng', text: 'Nếu bạn chọn đặt mật khẩu bảo vệ, AI sẽ in mật khẩu ra đúng một lần lúc tạo. Lưu lại ngay vào nơi an toàn — sau đó sẽ không hiện lại nữa.' },
      { type: 'result', label: 'Kết quả sau khi AI deploy xong lên Agent Base — mở dòng Domain bằng trình duyệt là thấy ứng dụng', title: 'Kết quả', code: 'ZLP Deploy — luanpd_demo-chatbot\nKết quả : THÀNH CÔNG\nDomain : https://xxxxx.ai.zalopay.xyz\nBasic auth : user=luanpd pass=AbCd1234EfGh5678\nEnv vars : đã nạp 3 biến (API_KEY, DB_HOST, DB_USER)\n\nResource   : 2 CPU / 4 GB' },
      { type: 'note', tone: 'info', text: 'Nếu kết quả là THẤT BẠI, AI sẽ nói rõ lý do — xem bảng "Lỗi hay gặp" bên dưới.' },
      { type: 'text', title: 'Nếu ứng dụng cần mật khẩu, API key, chuỗi kết nối database', text: 'Đặt chúng vào một file tên .env nằm cùng thư mục với code, mỗi dòng một mục. AI sẽ tự nạp lên Agent Base. AI không bao giờ in ra giá trị của những dòng này, chỉ in ra tên.' },
      { type: 'result', label: 'Ví dụ file .env', title: 'Env Config', code: 'API_KEY=abc123\nDB_HOST=10.0.0.5' },
      { type: 'note', tone: 'warn', text: 'Nếu AI cảnh báo rằng file .env chưa được loại trừ khỏi git — hãy đồng ý cho AI sửa giúp, đây là cách lộ mật khẩu phổ biến nhất.' },
      { type: 'prompt', label: 'Sửa code xong, muốn cập nhật lại — vẫn mở AI tại đúng thư mục đó và gõ', text: 'Tôi vừa sửa code xong. Hãy cập nhật lại ứng dụng này lên zalopay agent base nhé.' },
      { type: 'note', tone: 'ok', text: 'AI sẽ tự nhận ra ứng dụng đã tồn tại và chỉ cập nhật, không hỏi lại các câu ở trên.' },

      // Kiểm tra
      { type: 'text', title: 'Kiểm tra ứng dụng đang thế nào', text: 'Dùng khi: trang web không mở được; ứng dụng tự dừng; muốn xem đang dùng domain nào; muốn biết deploy đã lên thật chưa.' },
      { type: 'prompt', label: 'Prompt kiểm tra', text: 'Kiểm tra dùm tình trạng của ứng dụng trên zalopay agent base dùm tôi nhé.' },
      { type: 'result', label: 'Kết quả', title: 'Kết quả', code: 'ZLP Status — luanpd_demo-chatbot\nTrạng thái : running | HTTP thực tế: 200\nDomain : https://xxxxx.ai.zalopay.xyz\nResource limit: 2 CPU / 4 GB\nResource usage: không khả dụng qua API — xem Agent Base UI, tab Metrics\nEnv vars : 3 biến (API_KEY, DB_HOST, DB_USER)\nDeploy cuối : finished lúc ...\nLog : <phân tích lỗi nếu có>' },
      { type: 'table', title: 'Đọc hai dòng đầu thế nào', cols: ['Trạng thái', 'HTTP thực tế', 'Nghĩa là'], rows: [
        ['running', '200 / 401 / 404', 'Bình thường, ứng dụng đang trả lời'],
        ['running', '502 / 503', 'Máy chủ vẫn sống nhưng ứng dụng bên trong không phục vụ được — thường do lỗi code hoặc sai cổng'],
        ['running', '000', 'Vấn đề về tên miền hoặc chứng chỉ, không phải lỗi ứng dụng'],
        ['exited', '503', 'Ứng dụng đang dừng'],
      ] },
      { type: 'note', tone: 'info', text: 'Nếu thấy running:unknown, đó không phải lỗi — chỉ nghĩa là ứng dụng không cấu hình kiểm tra sức khoẻ tự động. Vì lý do bảo mật, AI chỉ in tên các biến môi trường, không bao giờ in giá trị — kể cả khi bạn yêu cầu.' },

      // Đổi tên miền
      { type: 'text', title: 'Đổi sang tên miền dễ nhớ', text: 'Sau khi deploy, ứng dụng của bạn có địa chỉ tự sinh kiểu https://a1b2c3.ai.zalopay.xyz. Bạn có thể nhờ AI đổi nó sang một tên miền dễ nhớ hơn.' },
      { type: 'note', tone: 'warn', title: 'Điều kiện bắt buộc', text: 'Tên miền mới phải được trỏ sẵn về server Agent Base trước. Các tên miền kết thúc bằng ai.zalopay.xyz là vùng do hệ thống tự quản lý, bạn không tự đặt được.' },
      { type: 'prompt', label: 'Prompt đổi tên miền', text: 'update ứng dụng luanpd_demo-chatbot sang domain chatbot-demo.zalopay.vn dùm nhé.' },
      { type: 'result', label: 'Kết quả', title: 'Kết quả', code: 'ZLP Update Domain — luanpd_demo-chatbot\nKết quả : THÀNH CÔNG\nDomain cũ : https://a1b2c3.ai.zalopay.xyz\nDomain mới : https://chatbot-demo.zalopay.vn\nRedeploy : finished' },
      { type: 'note', tone: 'info', text: 'Nếu ngay sau đó trình duyệt báo lỗi chứng chỉ bảo mật, thường là do hệ thống đang cấp chứng chỉ cho tên miền mới — đợi một lúc rồi thử lại.' },

      // Dừng / xoá
      { type: 'text', title: 'Dừng / Xoá ứng dụng', text: 'Dùng khi: cần dừng tạm thời, hoặc đã thử nghiệm xong cần xoá, không dùng nữa.' },
      { type: 'prompt', label: 'Tạm dừng', text: 'Tạm dừng ứng dụng luanpd_demo-chatbot trên zalopay agent base dùm nhé.' },
      { type: 'prompt', label: 'Xóa', text: 'xoá ứng dụng luanpd_demo-chatbot trên zalopay agent base dùm nhé.' },
      { type: 'note', tone: 'info', text: 'Để tránh xoá nhầm, AI luôn hiển thị đầy đủ thông tin ứng dụng sắp xoá rồi hỏi lại bạn hai câu riêng biệt. Nếu bạn gõ tên không đầy đủ và có nhiều ứng dụng giống nhau, AI sẽ hỏi lại chứ không tự đoán.' },

      // Lỗi ngoài bảng
      { type: 'prompt', label: 'Lỗi không nằm trong bảng "Lỗi hay gặp"? Cứ mô tả bằng tiếng Việt bình thường, ví dụ', text: 'Tôi vừa deploy ứng dụng lên agent base nhưng mở link ra không thấy gì. Kiểm tra giúp tôi và giải thích bằng tiếng Việt, tôi không rành kỹ thuật.' },
    ],
    code: [],
    success: [
      'Sau khi cài: dòng "API check : PASS (HTTP 200)" nghĩa là kết nối thành công, dùng được.',
      'Sau khi deploy: dòng "Kết quả : THÀNH CÔNG" và dòng Domain là đường link mở được bằng trình duyệt.',
      'Khi kiểm tra: "running" kèm HTTP 200 / 401 / 404 là bình thường, ứng dụng đang trả lời.',
      'Khi đổi tên miền: dòng "Domain mới" hiện tên miền bạn chọn và "Redeploy : finished".',
    ],
    images: [],
    pitfalls: [
      { meet: 'AI báo không tìm thấy công cụ Agent Base', why: 'Chưa cài kết nối, hoặc chưa khởi động lại công cụ', fix: 'Cài dùm tôi MCP Zalopay agentbase nhé' },
      { meet: 'API check: FAIL kèm 401 hoặc 403', why: 'Mã truy cập trong file cấu hình đã hết hạn hoặc thiếu quyền', fix: 'Liên hệ SRE để kiểm tra lại key.' },
      { meet: 'AI báo thiếu node hoặc npx', why: 'Chưa cài Node.js', fix: 'Máy tôi chưa có Node.js. Hướng dẫn tôi cài bản LTS.' },
      { meet: 'Deploy xong nhưng mở link ra lỗi 502 / 503', why: 'Ứng dụng chạy sai cổng, hoặc lỗi lúc khởi động', fix: 'kiểm tra ứng dụng <tên> trên zalopay agent base lỗi gì và giải thích cho tôi bằng tiếng Việt dễ hiểu.' },
      { meet: 'Ứng dụng tự dừng', why: 'Có thể lỗi, có thể ai đó dừng chủ động', fix: 'kiểm tra ứng dụng <tên> trên zalopay agent base , xem log lần deploy gần nhất giúp tôi.' },
      { meet: 'AI báo "bạn không có quyền"', why: 'Ứng dụng đó không phải của bạn', fix: 'Đúng như vậy. Nhờ chính chủ thao tác' },
      { meet: 'Tự nhiên có hai ứng dụng gần giống nhau', why: 'Bạn đã đổi tên thư mục rồi deploy lại', fix: 'Xoá cái không dùng theo mục Dừng / Xoá ứng dụng, rồi giữ nguyên tên thư mục từ nay' },
      { meet: 'Quên mất mật khẩu bảo vệ trang web', why: 'Mật khẩu chỉ hiện một lần', fix: 'Liên hệ SRE để xem lại mật khẩu hoặc nhờ AI tạo lại mật khẩu của ứng dụng' },
    ],
  },

  safety: {
    rules: [
      'File cấu hình zlpagentbase.env là của riêng bạn: không gửi cho ai, không đưa lên chat nhóm, không copy vào thư mục dự án. Nó chứa mã truy cập vào toàn bộ hệ thống với quyền của bạn.',
      'Không dán mã truy cập, mật khẩu vào khung chat với AI. Bộ skill được thiết kế để đọc trực tiếp từ file, không cần bạn gõ ra.',
      'File .env của ứng dụng không được đưa lên kho code. AI sẽ cảnh báo nếu phát hiện — hãy để AI sửa giúp.',
      'AI sẽ không in giá trị biến môi trường dù bạn yêu cầu. Đây là thiết kế cố ý để nâng cao tính bảo mật.',
      'Trước khi xoá, AI luôn hiện đủ thông tin ứng dụng và hỏi lại hai câu riêng biệt; tên không rõ thì AI hỏi lại, không tự đoán.',
    ],
    limits: [
      'Agent Base hiện chỉ mới triển khai ở môi trường dev; bộ skill chỉ mới test trên macOS.',
      'Mỗi ứng dụng giới hạn cố định 2 CPU / 4 GB RAM, không chạy được model local như ollama, vllm.',
      'Không tự đặt được tên miền kết thúc bằng ai.zalopay.xyz; tên miền riêng phải được trỏ sẵn về server Agent Base.',
      'Mức dùng tài nguyên không xem được qua AI — phải xem trên giao diện Agent Base, tab Metrics.',
      'Giai đoạn test dùng một bộ cấu hình và key dùng chung, thời hạn 30 ngày.',
    ],
    tables: [],
  },

  demo: [],

  tech: {
    bullets: [
      'Bộ Zalopay Agent Base Skills gồm 5 thư mục skill zlp-agentbase-* (đóng gói trong ZLP_AgentBase_Skills_V2.zip); skill khởi tạo là zlp-agentbase-init.',
      'Nơi cài skill: ~/.claude/skills (Claude Code), ~/.codex/skills (Codex, không đụng thư mục .system), ~/.cursor/skills (Cursor, không phải ~/.cursor/skills-cursor).',
      'File cấu hình luôn đặt ở ~/.claude/zlpagentbase.env với quyền chmod 600, cho cả ba công cụ; các script luôn tìm ở đó trước.',
      'Kết nối cho AI (MCP): MCP Server Agentbase chạy bằng Node.js; bảng kết quả cài đặt ghi "ZLP Agent Base — Coolify MCP". Với Codex/Cursor, init cài kết nối theo client=codex / client=cursor.',
      'Các script của Agentbase dùng python3 và git. Tên ứng dụng lấy tự động từ tên thư mục code (ví dụ trong tài liệu: luanpd_demo-chatbot); cổng có thể được AI tự nhận ra qua docker file.',
      'Mỗi ứng dụng: giới hạn 2 CPU / 4 GB, domain tự sinh *.ai.zalopay.xyz, tuỳ chọn Basic auth, biến môi trường nạp từ file .env cùng thư mục code.',
    ],
    tables: [],
    code: [],
    images: [],
    repo: null,
  },

  next: {
    steps: [
      'Hỗ trợ dùng model local của Zalopay, và gọi API các tool nội bộ nhưng có kiểm soát.',
      'Triển khai lên production, chạy nhiều server (multi server) thay vì standalone để mở rộng khi được dùng nhiều; hỗ trợ rollback.',
      'Phân quyền chặt chẽ hơn qua tính năng Team của Agent Base; kiểm tra và hỗ trợ skill chính thức trên Windows.',
    ],
    contact: [
      'SRE: cấp file cấu hình <tên_bạn>_zlpagentbase.env, kiểm tra lại key, xem lại mật khẩu bảo vệ.',
      'SRE (HienLQ): khi cần chạy model local.',
      'Người phụ trách tài liệu: [cần bổ sung]',
    ],
    link: '',
  },
}
