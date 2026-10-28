export default {
  id: 'c7',
  postedAt: '2026-09-30',
  // Tên lấy theo booth 1 trên Zalopay AI Exhibition 2026.
  title: 'secreq — Trợ lý AI tiếp nhận & chuẩn bị thông tin yêu cầu pentest',
  toolName: 'secreq-bot',
  desc: 'AppSec đưa 1 mã ticket, nhận 1 trang tóm tắt đủ thông tin để bắt đầu test, dòng nào cũng có link nguồn.',
  type: 'tool',
  status: 'building',
  statusNote: 'Đã xong bản AI Week, đã bổ sung bản v2',
  kind: 'tech',
  level: 'ref',
  category: 'Security',
  topics: ['Kiểm thử bảo mật', 'Tóm tắt tài liệu'],
  tools: ['Claude Code'],
  audience: 'Security, Dev',
  difficulty: 'Dễ',
  access: 'Chỉ trong team AppSec',
  author: 'NghiaTG',
  // Owner: dòng "Member" của booth 1 trên Zalopay AI Exhibition 2026.
  members: ['nghiatg', 'haunk'],
  ownerName: 'Nghĩa. Trần Gia',
  ownerTeam: 'Security (AppSec)',
  updated: '',
  cover: '',
  stats: [
    { value: '~4–5 phút', extra: '', label: 'thay vì 0,5–2 ngày chuẩn bị (đo thật, 1 ticket)' },
    { value: '1 trang', extra: '', label: 'thay vì 5 trang Confluence + 27 file đính kèm' },
    { value: '8 API', extra: '', label: 'có sẵn lệnh test, kể cả 2 API tài liệu bỏ sót' },
  ],

  tldr: [
    ['Vấn đề', 'Trước mỗi lần pentest, AppSec mất 0,5–2 ngày mở từng trang tài liệu để tìm thông tin cần test.'],
    ['Giải pháp', 'Nhập 1 mã ticket, công cụ tự đọc ticket, tài liệu và source code rồi viết 1 trang tóm tắt.'],
    ['Kết quả', 'Còn khoảng 4–5 phút; đọc 1 trang thay vì 5 trang và 27 file đính kèm.'],
    ['Dùng khi', 'Bạn nhận một yêu cầu pentest (ticket SECREQ).'],
  ],

  // Bài toán + Giải pháp: nguyên văn booth 1 của Zalopay AI Exhibition 2026 (thay cho bản viết lại từ tài liệu).
  exhibition: {
    problem: 'Trước mỗi lần pentest, kỹ sư bảo mật phải tự tay gom ngữ cảnh từ ticket yêu cầu: đọc ticket Jira, lần theo tài liệu Confluence (kể cả sơ đồ/ảnh), tìm đúng version đang deploy và source trên GitLab, rồi tự dò endpoint/host và gõ tay từng lệnh curl để test. Rất nhiều thao tác thủ công, lặp đi lặp lại, và thường phải chờ/hỏi dev khi thiếu thông tin.\n\n**Ai đang gặp:** Kỹ sư AppSec / pentester (đồng thời giảm việc qua lại với Dev/PO).\n\n**Tác động:** Mỗi lần chuẩn bị tốn nhiều thời gian đọc – tổng hợp – dựng request thủ công; dễ sót endpoint (nhất là API mới trong bản release), test nhầm version, hoặc thiếu ngữ cảnh khiến test không đầy đủ.',
    solution: 'secreq là một tool nội bộ dùng AI (chạy trên Claude), phục vụ team AppSec. Chỉ cần nhập mã ticket Jira, tool tự đọc ticket + tài liệu Confluence liên quan + kéo đúng source đã deploy trên GitLab, rồi xuất ra một trang tóm tắt chuẩn bị test. Dùng qua giao diện web.\n\n**AI làm được gì:**\n- Tự dựng sẵn bộ curl command chạy được cho từng API ngay từ source code (đúng bản đã deploy) — pentester copy-dán test được ngay, khỏi phải tự mò.\n- Đọc được cả sơ đồ/ảnh trong tài liệu, tự tìm "cách vào flow" (link, deeplink, . . .), và đánh dấu API nào là mới trong bản release này để ưu tiên test.\n- Tự trích dẫn nguồn cho từng thông tin, tự che thông tin nhạy cảm, và gom hết endpoint / host / môi trường / câu hỏi cho dev vào một chỗ.\n\n**Kết quả:** Đang được team AppSec dùng thật trên các ticket pentest. Trạng thái: MVP/pilot, đã go-live nội bộ, có dashboard theo dõi lượng sử dụng. Rút ngắn thời gian chuẩn bị pentest từ vài tiếng xuống còn vài phút, giảm sót endpoint và đảm bảo test đúng version đang chạy.',
  },
  problem: {
    text: 'Khi có tính năng mới cần kiểm thử xâm nhập (pentest), dev tạo ticket cho team AppSec. Nhưng thông tin để bắt đầu test hầu như không nằm trong ticket.',
    bullets: [
      'Ai gặp: team AppSec, mỗi khi có tính năng mới cần kiểm thử bảo mật.',
      'Việc tốn công: địa chỉ API, môi trường, tài khoản test, cách vào tính năng rải rác trên các trang Confluence mà dev chỉ để link.',
      'Tốn bao nhiêu: AppSec mất 0,5–2 ngày mở và đọc thủ công từng trang trước mỗi lần pentest.',
      'Đo trên 25 ticket gần nhất: 17/25 ticket chỉ đưa link (trung bình 2–3 link, nhiều nhất 8 link một ticket).',
      'Đây là phần tốn thời gian nhất và chưa được tự động hoá.',
    ],
    tables: [],
    images: [],
  },

  solution: {
    analogy: 'Hiểu đơn giản: như một trợ lý đọc hết hồ sơ giúp bạn, rồi đưa lại bản tóm tắt 1 trang, dòng nào cũng ghi nguồn.',
    steps: [
      'Bạn: dán mã ticket SECREQ (hoặc link Jira) vào trang web của công cụ.',
      'AI: đọc ticket, tài liệu, file đính kèm và source code; tự che mật khẩu, dữ liệu cá nhân.',
      'AI: viết 1 trang gồm lệnh test sẵn cho từng API, địa chỉ và môi trường, cách vào tính năng, tài khoản test, và các câu cần hỏi lại dev.',
      'Bạn: kiểm tra nguồn từng dòng, hỏi dev phần còn thiếu, rồi quyết định bắt đầu test.',
    ],
    images: [
      { src: '/use-cases/c7/demo-web.png', caption: 'Đưa SECREQ-28 (+ CICD-271462) vào web, nhận trang kết quả: lệnh test cho từng API kèm ghi chú và link nguồn.' },
    ],
  },

  result: {
    beforeAfter: {
      cols: ['Chỉ số', 'Trước', 'Sau'],
      rows: [
        ['Thời gian chuẩn bị 1 lần pentest', '0,5–2 ngày đọc tài liệu thủ công', '~4–5 phút chạy công cụ + đọc 1 trang tóm tắt'],
        ['Số trang phải đọc', '5 trang Confluence + 27 file đính kèm', '1 trang tóm tắt'],
        ['Nguồn thông tin được tổng hợp', 'Ticket + trang Confluence (đọc thủ công)', 'Ticket + Confluence + Postman + source code'],
        ['Lệnh test chạy được cho từng API', '0, tester tự đọc source/Postman rồi tự dựng', 'Đủ 8 API, kể cả 2 API mà Postman và tài liệu bỏ sót; copy là test được'],
        ['Chi phí xử lý', '—', '~vài trăm nghìn token mỗi ticket (tăng khi đọc source code)'],
      ],
      note: 'Đo trên 1 ticket thật: TikTok Hub (PSEC).',
    },
    bullets: [
      'AppSec đọc 1 trang thay vì mở 5 trang Confluence + file đính kèm.',
      'Biết ngay thiếu thông tin gì để hỏi dev, thay vì phát hiện giữa lúc test.',
      'Con người vẫn kiểm soát: AI chỉ chuẩn bị thông tin, không tự nhắn dev, không tự quyết.',
    ],
    tables: [],
    note: 'Số liệu trên ticket thật TikTok Hub (PSEC).',
    images: [],
  },

  apply: {
    intro: 'Công cụ hiện dùng trong team AppSec. Bạn chỉ cần mã ticket SECREQ; công cụ tự tìm ticket triển khai (CICD) đi kèm trong nội dung ticket.',
    fit: {
      yes: [
        'Bạn ở team AppSec và nhận ticket SECREQ có link tài liệu Confluence.',
        'Ticket có kèm ticket triển khai (CICD) để công cụ đọc được source code.',
      ],
      no: [
        'Thông tin chỉ nằm trong ảnh, sơ đồ hoặc Figma (công cụ chưa đọc được).',
      ],
    },
    prep: [
      'Quyền vào mạng nội bộ Tailscale để mở web của công cụ.',
      'Mã ticket SECREQ (ví dụ SECREQ-28), hoặc link Jira, hoặc nội dung ticket để dán vào.',
      'Link web của công cụ: [cần bổ sung]',
      'Xin quyền dùng ở đâu: [cần bổ sung]',
    ],
    // Each step once, with its details and screenshots right under it.
    stepSections: [
      {
        title: 'Mở web của công cụ',
        blocks: [
          { type: 'text', text: 'Mở web của công cụ [cần bổ sung link].' },
        ],
      },
      {
        title: 'Dán mã ticket',
        blocks: [
          { type: 'text', text: 'Dán mã ticket, ví dụ SECREQ-28. Ô ticket CICD có thể để trống, công cụ tự tìm trong nội dung ticket.' },
          {
            type: 'table',
            title: 'Bạn có thể đưa vào',
            cols: ['Ô trên web', 'Điền gì'],
            rows: [
              ['Jira ticket', 'Mã ticket, ví dụ SECREQ-28'],
              ['CICD deploy ticket (không bắt buộc)', 'Ví dụ CICD-271462; để trống thì công cụ tự tìm trong nội dung ticket'],
              ['Or paste ticket text', 'Dán nội dung ticket nếu không có mã'],
              ['Drop files', 'Kéo thả file: bộ Postman, tài liệu, ảnh'],
            ],
          },
        ],
      },
      {
        title: 'Bấm "Assess ticket" và đợi',
        blocks: [
          { type: 'text', text: 'Bấm "Assess ticket" và đợi khoảng 4–5 phút.' },
        ],
      },
      {
        title: 'Đọc trang tóm tắt, kiểm tra nguồn',
        blocks: [
          { type: 'text', text: 'Đọc trang tóm tắt, kiểm tra link nguồn từng dòng, gửi câu hỏi còn thiếu cho dev.' },
          {
            type: 'note',
            tone: 'info',
            title: 'Trang tóm tắt gồm',
            text: 'Lệnh test chạy được cho từng API (kèm ghi chú người dùng dùng API đó thế nào) · địa chỉ và môi trường (PROD/SANDBOX/DEV) · cách vào tính năng để test · môi trường và tài khoản test · những gì tài liệu chưa nói, thành câu hỏi cho dev.',
          },
          {
            type: 'note',
            tone: 'warn',
            text: 'Công cụ không hiển thị thông tin không tìm được nguồn. Bạn vẫn là người xác nhận và quyết định trước khi test.',
          },
        ],
      },
      {
        title: 'Gửi link kết quả',
        blocks: [
          { type: 'text', text: 'Gửi link kết quả cho người khác; mở lại kết quả đã lưu không tốn thêm chi phí.' },
        ],
      },
    ],
    code: [],
    success: [
      'Đầu trang hiện số API và số câu hỏi, ví dụ "8 endpoints · 5 questions".',
      'Phần lệnh test cho từng API nằm trên cùng, mỗi mục có nút Copy.',
      'Mỗi dòng có link nguồn (dòng "nguồn: …") để bạn kiểm chứng.',
      'Lần chạy được lưu ở mục "Saved runs", mở lại hoặc chia sẻ bằng link.',
    ],
    images: [],
    pitfalls: [],
  },

  safety: {
    rules: [
      'Dữ liệu đi qua AI: nội dung ticket, trang Confluence, file đính kèm, source code của tính năng.',
    ],
    limits: [
      'AI chỉ đọc Jira, không sửa ticket.',
      'AI chỉ chuẩn bị thông tin: không tự nhắn dev, không tự quyết.',
      'Không hiển thị thông tin nào không tìm được nguồn.',
      'Tự che mật khẩu, khoá bí mật và dữ liệu cá nhân trước khi xử lý; không để lọt ra kết quả.',
      'Chưa đọc được ảnh, sơ đồ trong tài liệu và Figma.',
      'Web chưa có đăng nhập riêng; hiện truy cập qua Tailscale.',
      'Mỗi ticket tốn khoảng vài trăm nghìn token.',
      'Mới đo trên 1 ticket thật (TikTok Hub).',
    ],
    tables: [],
  },

  // Demo pictures sit with the part they illustrate (Giải pháp).
  demo: [],

  tech: {
    bullets: [
      'Runtime: Claude (Claude Code print mode), thay cho Codex ở bản AI Week.',
      'Input: mã ticket / link Jira / dán nội dung, qua web hoặc CLI. Tự fetch ticket (Jira, chỉ đọc), đọc trang Confluence, tải file đính kèm.',
      'Bộ curl source-first: từ Jira CICD deploy ticket → repo GitLab, đọc source rồi dựng curl đầy đủ cho mọi endpoint — method + full path (resolve cả base-path trong config) + auth + body theo request struct thật; phủ cả endpoint mà Postman/docs bỏ sót.',
      'Chạy đúng trên cả Go/Gin và Java/Spring. Tự phát hiện CICD ticket ngay trong body ticket — chỉ cần đưa mã SECREQ.',
      'Knowledge base ZaloPay cho AI: zlp_token là session login ZaloPay (webview → cookie, app ZPA → Authorization Bearer, cùng giá trị) → AI phân tích auth chính xác.',
      'Ghi chú chức năng cho từng API (luồng dùng bình thường của user) để tester hiểu nhanh.',
      'Web UI nhận diện ZaloPay (font Aeonik Pro), sắp xếp curl-first, bảng attack surface (env → host, cờ source-only).',
      'Lưu & chia sẻ run: tự lưu mỗi lần chạy, mở lại không tốn token, link chia sẻ ?run=; truy cập được qua Tailscale.',
      'Redaction cứng hơn: secret (kể cả private-key, client-key) không lọt vào output.',
    ],
    tables: [
      {
        title: 'Luồng xử lý',
        note: 'AppSec kiểm soát ở 2 đầu: chọn ticket đầu vào, và xác nhận + quyết định trước khi test. Phần giữa là tự động.',
        cols: ['Bước', 'Ai làm', 'Việc'],
        rows: [
          ['1', 'AppSec', 'Nhập mã ticket / link Jira'],
          ['2', 'secreq', 'Fetch ticket từ Jira (chỉ đọc)'],
          ['3', 'secreq', 'Trích link Confluence trong ticket'],
          ['4', 'secreq', 'Đọc trang + tải file đính kèm'],
          ['5', 'secreq', 'Đọc CICD deploy ticket -> pull source repo (GitLab)'],
          ['6', 'secreq', 'Che secret / PII'],
          ['7', 'secreq', 'Dựng curl chạy được cho từng API từ source'],
          ['8', 'secreq', 'Tóm tắt — mỗi dòng gắn link nguồn (không có nguồn thì loại)'],
          ['9', 'secreq', 'Xuất SUMMARY 1 trang (kèm bộ curl chạy được)'],
          ['10', 'AppSec', 'Đọc & xác nhận thông tin → Gửi câu hỏi còn thiếu cho dev → Bắt đầu pentest'],
        ],
      },
    ],
    code: [],
    images: [
      { src: '/use-cases/c7/flow.png', caption: 'AppSec kiểm soát ở 2 đầu: chọn ticket đầu vào, và xác nhận + quyết định trước khi test. Phần giữa (đọc tài liệu, tóm tắt) là tự động.' },
    ],
    repo: { label: 'PSE-Security/appsec/secreq-bot (nhánh nghiatg)', href: '' },
  },

  next: {
    steps: [
      'Đọc Figma để mô tả giao diện từng bước, và đọc ảnh/sơ đồ trong tài liệu (điểm vào của tính năng thường chỉ nằm trong ảnh).',
      'Tăng tốc (xử lý trang theo lô); thêm đăng nhập cho web khi mở ra mạng.',
      'Dùng mô hình AI nội bộ và tài khoản dịch vụ dùng chung cho team (để sau).',
    ],
    contact: [
      'Phụ trách: Nghĩa. Trần Gia (Security / AppSec)',
      'Mục tiêu: gửi 1 yêu cầu pentest chỉ cần link Confluence + ticket Jira CICD, có kết quả bảo mật trong vòng 1 ngày.',
      'Kênh liên hệ: [cần bổ sung]',
    ],
    link: '',
  },
}
