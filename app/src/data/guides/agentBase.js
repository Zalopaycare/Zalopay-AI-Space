// Step-by-step guide for use case c4 — "Zalopay Agent Base User Guide" (source: SRE's Agent Base user guide PDF).
// Rendered by components/UseCaseGuide.jsx. Block types:
//   text · bullets · steps · prompt · result · table · note · tabs · file · flow

const INSTALL = (tool, dir, extra = []) => [
  `Tôi cần cài bộ skill ZLP Agent Base vào ${tool}.`,
  '- Thư mục skill sau khi giải nén: ~/Downloads/ZLP_AgentBase_Skills_V2',
  '- File cấu hình SRE cấp cho tôi: ~/Downloads/luanpd_zlpagentbase.env',
  'Hãy làm giúp tôi theo đúng thứ tự:',
  `1. Tạo thư mục ${dir} nếu chưa có, rồi copy 5 thư mục bắt đầu bằng`,
  `zlp-agentbase- từ thư mục skill vào đó.${extra[0] ? ' ' + extra[0] : ''}`,
  ...(extra[1] ? [extra[1]] : []),
  '2. Copy file cấu hình thành ~/.claude/zlpagentbase.env rồi đặt quyền chmod 600.',
  ...(tool === 'Claude Code' ? [] : ['(Đúng là ~/.claude, các script luôn tìm ở đó trước.)']),
  tool === 'Claude Code'
    ? '3. Chạy skill zlp-agentbase-init để kết nối máy tôi với Agent Base.'
    : `3. Chạy skill zlp-agentbase-init và cài kết nối cho ${tool} (client=${tool.toLowerCase()}).`,
  `4. Báo lại kết quả và cho tôi biết có cần khởi động lại ${tool} không.`,
].join('\n')

export const agentBaseGuide = {
  intro: 'Dành cho người mới hoặc chưa rành kỹ thuật nhưng muốn tự đưa AI agent của mình lên chạy thật. Không cần biết lập trình, không cần biết server, không cần gõ lệnh phức tạp — việc của bạn là prompt cho AI, phần kỹ thuật để AI làm.',
  flow: [
    { title: 'Chuẩn bị', sub: 'Node.js, python3, git + file cấu hình SRE cấp' },
    { title: 'Cài bộ skill', sub: 'Nhờ AI cài, thấy API check: PASS' },
    { title: 'Deploy', sub: 'Mở AI trong thư mục code, gõ 1 câu' },
    { title: 'Có link chạy thật', sub: 'Mở bằng trình duyệt, gửi cho người khác' },
  ],
  sections: [
    {
      id: 'what', title: 'Agent Base là gì?',
      blocks: [
        { type: 'text', text: 'Agent Base là hệ thống nội bộ của ZaloPay dùng để đưa ứng dụng của bạn lên chạy thật trên internet. Sau khi đưa lên, bạn nhận được một đường link để mở bằng trình duyệt và gửi cho người khác dùng.' },
        { type: 'text', text: 'Bình thường việc này cần người kỹ thuật làm. Bộ Zalopay Agent Base Skills là phần hướng dẫn cài thêm vào công cụ AI (Claude Code, Codex hoặc Cursor), giúp AI biết cách làm toàn bộ phần kỹ thuật đó thay bạn.' },
        { type: 'note', tone: 'info', title: 'Hiểu đơn giản', text: 'Bạn ra lệnh bằng tiếng Việt → AI thực hiện theo hướng dẫn trong bộ skill → AI tự thao tác trên Agent Base.' },
        { type: 'note', tone: 'warn', title: 'Lưu ý quan trọng', text: 'Hiện Agent Base mới triển khai ở môi trường dev và bộ skill mới được test trên máy macOS.' },
      ],
    },
    {
      id: 'prep', title: 'Chuẩn bị trước khi cài', sub: 'Kiểm tra đủ các mục dưới đây trước khi bắt đầu.',
      blocks: [
        { type: 'table', cols: ['Cần có', 'Ghi chú'], rows: [
          ['Máy macOS hoặc Linux, Windows', 'Bộ skill chạy trên các hệ điều hành này'],
          ['Một công cụ AI', 'Chọn một trong ba: Claude Code, Codex hoặc Cursor'],
          ['Node.js (bản LTS)', 'Dùng để chạy MCP Server Agentbase'],
          ['python3 và git', 'Dùng cho các script của Agentbase'],
          ['File cấu hình <tên_bạn>_zlpagentbase.env', 'Do SRE cấp riêng cho bạn — liên hệ SRE nếu chưa có'],
        ] },
        { type: 'note', tone: 'warn', title: 'Giới hạn tài nguyên', text: 'Môi trường dev đang giới hạn cố định 2 CPU / 4 GB RAM cho mỗi ứng dụng, nên đừng chạy model local như ollama, vllm. Cần chạy model local thì liên hệ SRE (HienLQ).' },
        { type: 'prompt', label: 'Không biết máy đã đủ chưa? Mở công cụ AI và gõ', text: 'Kiểm tra giúp tôi máy đã cài Node.js, python3, git và Docker chưa.\nCái nào chưa có thì chỉ tôi cách cài nhé.' },
      ],
    },
    {
      id: 'install', title: 'Cài đặt bộ skill',
      blocks: [
        { type: 'steps', title: 'Bước 0 — Tải và giải nén', items: [
          'Tải file zip ZLP_AgentBase_Skills_V2 (đính kèm trong tài liệu Agent Base của SRE) về máy.',
          'Giải nén, bạn được thư mục ZLP_AgentBase_Skills_V2 chứa 5 thư mục con bắt đầu bằng zlp-agentbase-.',
          'Để ý thư mục nằm ở đâu (thường là Downloads) — bước sau cần đường dẫn này.',
          'Chuẩn bị sẵn file cấu hình SRE cấp, ví dụ luanpd_zlpagentbase.env.',
        ] },
        { type: 'file', name: 'ZLP_AgentBase_Skills_V2.zip', sub: '5 thư mục zlp-agentbase-* · giải nén vào Downloads' },
        { type: 'text', title: 'Cách A — Nhờ AI cài hộ (khuyên dùng)', text: 'Mở công cụ AI của bạn, copy nguyên khối prompt bên dưới, sửa hai dòng đường dẫn cho đúng máy bạn rồi gửi đi.' },
        { type: 'tabs', tabs: [
          { label: 'Claude Code', blocks: [{ type: 'prompt', label: 'Prompt cài vào Claude Code', text: INSTALL('Claude Code', '~/.claude/skills') }] },
          { label: 'Codex', blocks: [{ type: 'prompt', label: 'Prompt cài vào Codex', text: INSTALL('Codex', '~/.codex/skills', ['Không đụng vào thư mục .system.']) }] },
          { label: 'Cursor', blocks: [{ type: 'prompt', label: 'Prompt cài vào Cursor', text: INSTALL('Cursor', '~/.cursor/skills', ['', 'Lưu ý: KHÔNG phải ~/.cursor/skills-cursor, đó là thư mục nội bộ của Cursor.']) }] },
        ] },
        { type: 'result', label: 'AI sẽ báo lại một bảng kết quả tương tự', title: 'ZLP Agent Base — Coolify MCP', lines: [
          ['Env file', '/Users/<your_user>/.claude/zlpagentbase.env'],
          ['Base URL', 'https://...'],
          ['Status', 'INSTALLED'],
          ['API check', 'PASS (HTTP 200)', 'ok'],
        ] },
        { type: 'table', title: 'Đọc kết quả thế nào', cols: ['Bạn thấy', 'Nghĩa là'], rows: [
          ['API check: PASS', 'Kết nối thành công, dùng được.'],
          ['API check: FAIL', 'Chưa dùng được — xem mục "Lỗi hay gặp" bên dưới.'],
          ['AI báo cần khởi động lại', 'Tắt và mở lại công cụ AI.'],
          ['ALREADY OK (unchanged)', 'Không cần khởi động lại gì cả.'],
        ] },
      ],
    },
    {
      id: 'naming', title: 'Quy tắc đặt tên thư mục ứng dụng', sub: 'Đọc trước khi deploy — đây là điều quan trọng nhất cần nhớ.',
      blocks: [
        { type: 'note', tone: 'info', title: 'Tên ứng dụng = tên thư mục', text: 'Tên ứng dụng trên Agent Base được lấy tự động từ tên thư mục chứa code của bạn. Bạn không được chọn tên, và AI cũng sẽ không hỏi.' },
        { type: 'bullets', items: ['Chữ thường, không dấu tiếng Việt', 'Không có khoảng trắng — nối bằng dấu gạch ngang -', 'Ngắn gọn, dễ nhận ra'] },
        { type: 'table', cols: ['Tên thư mục', 'Kết quả'], rows: [
          ['bao-cao-chi-phi', '✅ Tốt'],
          ['demo-chatbot', '✅ Tốt'],
          ['Báo Cáo Chi Phí', '⚠️ Bị đổi thành b-o-c-o-chi-ph — khó nhận ra'],
          ['App 1', '⚠️ Bị đổi thành app-1'],
        ] },
        { type: 'note', tone: 'danger', title: 'Cảnh báo', text: 'Nếu đổi tên thư mục rồi deploy lại, hệ thống hiểu đó là một ứng dụng hoàn toàn mới và tạo thêm ứng dụng thứ hai thay vì cập nhật cái cũ. Đặt tên một lần rồi giữ nguyên.' },
      ],
    },
    {
      id: 'deploy', title: 'Đưa ứng dụng lên chạy thật (deploy)', sub: 'Đây là việc bạn dùng nhiều nhất.',
      blocks: [
        { type: 'note', tone: 'warn', title: 'Chuẩn bị', text: 'Phải mở công cụ AI ngay tại thư mục chứa code ứng dụng, không phải thư mục bất kỳ. Mở sai chỗ, AI sẽ deploy nhầm thư mục.' },
        { type: 'prompt', label: 'Prompt deploy', text: 'Deploy ứng dụng này lên Zalopay agent base dùm nhé.' },
        { type: 'table', title: 'AI sẽ hỏi lại vài câu — trả lời thế nào', cols: ['AI hỏi', 'Trả lời thế nào'], rows: [
          ['Xác nhận tên ứng dụng và cách đóng gói', 'Đọc qua rồi trả lời "ok" nếu tên đúng như bạn mong đợi'],
          ['Có cần địa chỉ web để truy cập từ trình duyệt không?', 'Hầu hết trả lời "có". Chỉ trả lời "không" khi ứng dụng chạy ngầm, không có giao diện'],
          ['Có đặt mật khẩu bảo vệ trang web không?', 'Nên "có" nếu ứng dụng chứa dữ liệu nội bộ — AI sẽ tự tạo mật khẩu ngẫu nhiên'],
          ['Ứng dụng chạy ở cổng số mấy?', 'Không biết thì nói "tôi không rõ, bạn xem trong code giúp tôi". Câu này có thể không xuất hiện nếu AI tự nhận ra qua Dockerfile'],
        ] },
        { type: 'note', tone: 'danger', title: 'Rất quan trọng', text: 'Nếu chọn đặt mật khẩu bảo vệ, AI chỉ in mật khẩu ra đúng một lần lúc tạo. Lưu lại ngay vào nơi an toàn — sau đó sẽ không hiện lại nữa.' },
        { type: 'result', label: 'Kết quả sau khi AI deploy xong — mở dòng Domain bằng trình duyệt là thấy ứng dụng', title: 'ZLP Deploy — luanpd_demo-chatbot', lines: [
          ['Kết quả', 'THÀNH CÔNG', 'ok'],
          ['Domain', 'https://xxxxx.ai.zalopay.xyz', 'link'],
          ['Basic auth', 'user=luanpd pass=AbCd1234EfGh5678'],
          ['Env vars', 'đã nạp 3 biến (API_KEY, DB_HOST, DB_USER)'],
          ['Resource', '2 CPU / 4 GB'],
        ] },
        { type: 'text', title: 'Ứng dụng cần mật khẩu, API key, chuỗi kết nối database?', text: 'Đặt chúng vào file tên .env nằm cùng thư mục với code, mỗi dòng một mục. AI sẽ tự nạp lên Agent Base và không bao giờ in ra giá trị, chỉ in tên. Nếu AI cảnh báo file .env chưa được loại trừ khỏi git — hãy đồng ý cho AI sửa, đây là cách lộ mật khẩu phổ biến nhất.' },
        { type: 'result', label: 'Ví dụ file .env', title: '.env', code: 'API_KEY=abc123\nDB_HOST=10.0.0.5' },
        { type: 'prompt', label: 'Sửa code xong, muốn cập nhật lại — vẫn mở AI tại đúng thư mục đó và gõ', text: 'Tôi vừa sửa code xong. Hãy cập nhật lại ứng dụng này lên zalopay agent base nhé.' },
        { type: 'note', tone: 'ok', text: 'AI tự nhận ra ứng dụng đã tồn tại và chỉ cập nhật, không hỏi lại các câu ở trên.' },
      ],
    },
    {
      id: 'status', title: 'Kiểm tra ứng dụng đang thế nào', sub: 'Dùng khi trang web không mở được, ứng dụng tự dừng, muốn xem domain đang dùng hoặc biết deploy đã lên thật chưa.',
      blocks: [
        { type: 'prompt', label: 'Prompt', text: 'Kiểm tra dùm tình trạng của ứng dụng trên zalopay agent base dùm tôi nhé.' },
        { type: 'result', label: 'Kết quả', title: 'ZLP Status — luanpd_demo-chatbot', lines: [
          ['Trạng thái', 'running | HTTP thực tế: 200', 'ok'],
          ['Domain', 'https://xxxxx.ai.zalopay.xyz', 'link'],
          ['Resource limit', '2 CPU / 4 GB'],
          ['Resource usage', 'không khả dụng qua API — xem Agent Base UI, tab Metrics'],
          ['Env vars', '3 biến (API_KEY, DB_HOST, DB_USER)'],
          ['Deploy cuối', 'finished lúc ...'],
          ['Log', '<phân tích lỗi nếu có>'],
        ] },
        { type: 'table', title: 'Đọc hai dòng đầu thế nào', cols: ['Trạng thái', 'HTTP thực tế', 'Nghĩa là'], rows: [
          ['running', '200 / 401 / 404', '✅ Bình thường, ứng dụng đang trả lời'],
          ['running', '502 / 503', '⚠️ Máy chủ vẫn sống nhưng ứng dụng bên trong không phục vụ được — thường do lỗi code hoặc sai cổng'],
          ['running', '000', '⚠️ Vấn đề về tên miền hoặc chứng chỉ, không phải lỗi ứng dụng'],
          ['exited', '503', '⛔ Ứng dụng đang dừng'],
        ] },
        { type: 'note', tone: 'info', text: 'Thấy running:unknown không phải lỗi — chỉ nghĩa là ứng dụng không cấu hình kiểm tra sức khoẻ tự động. Vì bảo mật, AI chỉ in tên các biến môi trường, không bao giờ in giá trị, kể cả khi bạn yêu cầu.' },
      ],
    },
    {
      id: 'domain', title: 'Đổi sang tên miền dễ nhớ', sub: 'Địa chỉ tự sinh kiểu https://a1b2c3.ai.zalopay.xyz có thể đổi sang tên miền dễ nhớ hơn.',
      blocks: [
        { type: 'note', tone: 'warn', title: 'Điều kiện bắt buộc', text: 'Tên miền mới phải được trỏ sẵn về server Agent Base trước. Các tên miền kết thúc bằng ai.zalopay.xyz là vùng hệ thống tự quản lý, bạn không tự đặt được.' },
        { type: 'prompt', label: 'Prompt', text: 'update ứng dụng luanpd_demo-chatbot sang domain chatbot-demo.zalopay.vn dùm nhé.' },
        { type: 'result', label: 'Kết quả', title: 'ZLP Update Domain — luanpd_demo-chatbot', lines: [
          ['Kết quả', 'THÀNH CÔNG', 'ok'],
          ['Domain cũ', 'https://a1b2c3.ai.zalopay.xyz'],
          ['Domain mới', 'https://chatbot-demo.zalopay.vn', 'link'],
          ['Redeploy', 'finished'],
        ] },
        { type: 'note', tone: 'info', text: 'Nếu ngay sau đó trình duyệt báo lỗi chứng chỉ bảo mật, thường là hệ thống đang cấp chứng chỉ cho tên miền mới — đợi một lúc rồi thử lại.' },
      ],
    },
    {
      id: 'stop', title: 'Dừng hoặc xoá ứng dụng', sub: 'Khi cần dừng tạm thời, hoặc đã thử nghiệm xong và không dùng nữa.',
      blocks: [
        { type: 'tabs', tabs: [
          { label: 'Tạm dừng', blocks: [{ type: 'prompt', label: 'Prompt', text: 'Tạm dừng ứng dụng luanpd_demo-chatbot trên zalopay agent base dùm nhé.' }] },
          { label: 'Xoá', blocks: [{ type: 'prompt', label: 'Prompt', text: 'xoá ứng dụng luanpd_demo-chatbot trên zalopay agent base dùm nhé.' }] },
        ] },
        { type: 'note', tone: 'info', text: 'Để tránh xoá nhầm, AI luôn hiển thị đầy đủ thông tin ứng dụng sắp xoá rồi hỏi lại hai câu riêng biệt. Nếu bạn gõ tên không đầy đủ và có nhiều ứng dụng giống nhau, AI sẽ hỏi lại chứ không tự đoán.' },
      ],
    },
    {
      id: 'flow', title: 'Quy trình chuẩn cho người mới',
      blocks: [
        { type: 'steps', items: [
          'Liên hệ SRE để được cấp file cấu hình <tên_bạn>_zlpagentbase.env. (Giai đoạn test đã có sẵn một bộ cấu hình và key dùng chung, thời hạn 30 ngày.)',
          'Tải file zip bộ skill, giải nén.',
          'Cài đặt theo mục "Cài đặt bộ skill" — xác nhận thấy API check: PASS.',
          'Đặt tên thư mục ứng dụng đúng quy tắc.',
          'Mở công cụ AI tại thư mục ứng dụng, chạy prompt deploy.',
          'Lưu lại mật khẩu bảo vệ mà AI in ra.',
          'Mở đường link nhận được để kiểm tra.',
          'Sửa code sau này → chạy lại prompt deploy để cập nhật.',
        ] },
      ],
    },
    {
      id: 'errors', title: 'Lỗi hay gặp và cách xử lý', sub: 'Cột bên phải là câu bạn copy gửi cho AI.',
      blocks: [
        { type: 'table', copyCol: 2, cols: ['Bạn gặp', 'Nguyên nhân thường thấy', 'Nói gì với AI'], rows: [
          ['AI báo không tìm thấy công cụ Agent Base', 'Chưa cài kết nối, hoặc chưa khởi động lại công cụ', 'Cài dùm tôi MCP Zalopay agentbase nhé'],
          ['API check: FAIL kèm 401 hoặc 403', 'Mã truy cập trong file cấu hình đã hết hạn hoặc thiếu quyền', '— Liên hệ SRE để kiểm tra lại key'],
          ['AI báo thiếu node hoặc npx', 'Chưa cài Node.js', 'Máy tôi chưa có Node.js. Hướng dẫn tôi cài bản LTS.'],
          ['Deploy xong nhưng mở link ra lỗi 502 / 503', 'Ứng dụng chạy sai cổng, hoặc lỗi lúc khởi động', 'kiểm tra ứng dụng <tên> trên zalopay agent base lỗi gì và giải thích cho tôi bằng tiếng Việt dễ hiểu.'],
          ['Ứng dụng tự dừng', 'Có thể lỗi, có thể ai đó dừng chủ động', 'kiểm tra ứng dụng <tên> trên zalopay agent base, xem log lần deploy gần nhất giúp tôi.'],
          ['AI báo "bạn không có quyền"', 'Ứng dụng đó không phải của bạn', '— Nhờ chính chủ thao tác'],
          ['Tự nhiên có hai ứng dụng gần giống nhau', 'Bạn đã đổi tên thư mục rồi deploy lại', '— Xoá cái không dùng (mục Dừng/Xoá), rồi giữ nguyên tên thư mục'],
          ['Quên mật khẩu bảo vệ trang web', 'Mật khẩu chỉ hiện một lần', '— Liên hệ SRE, hoặc nhờ AI tạo lại mật khẩu cho ứng dụng'],
        ] },
        { type: 'prompt', label: 'Không nằm trong bảng trên? Cứ mô tả bằng tiếng Việt bình thường, ví dụ', text: 'Tôi vừa deploy ứng dụng lên agent base nhưng mở link ra không thấy gì. Kiểm tra giúp tôi và giải thích bằng tiếng Việt, tôi không rành kỹ thuật.' },
      ],
    },
    {
      id: 'security', title: 'Nguyên tắc bảo mật cần nhớ',
      blocks: [
        { type: 'bullets', tone: 'danger', items: [
          'File cấu hình zlpagentbase.env là của riêng bạn: không gửi cho ai, không đưa lên chat nhóm, không copy vào thư mục dự án. Nó chứa mã truy cập vào toàn bộ hệ thống với quyền của bạn.',
          'Không dán mã truy cập, mật khẩu vào khung chat với AI. Bộ skill được thiết kế để đọc trực tiếp từ file, không cần bạn gõ ra.',
          'File .env của ứng dụng không được đưa lên kho code. AI sẽ cảnh báo nếu phát hiện — hãy để AI sửa giúp.',
          'AI sẽ không in giá trị biến môi trường dù bạn yêu cầu. Đây là thiết kế cố ý để nâng cao bảo mật.',
        ] },
      ],
    },
    {
      id: 'roadmap', title: 'Kế hoạch phát triển tiếp theo',
      blocks: [
        { type: 'bullets', items: [
          'Hỗ trợ dùng model local của Zalopay.',
          'Hỗ trợ gọi API của các tool nội bộ, có kiểm soát.',
          'Triển khai lên production, chạy nhiều server thay vì standalone để mở rộng khi Agent Base được dùng nhiều.',
          'Quản lý phân quyền chặt hơn qua tính năng Team của Agent Base.',
          'Hỗ trợ rollback.',
          'Kiểm tra và hỗ trợ skill chính thức trên Windows.',
        ] },
      ],
    },
  ],
}
