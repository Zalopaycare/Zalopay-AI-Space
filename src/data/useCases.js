// Ported near-verbatim from Zalopay Use Case Library v2.dc.html's Logic class
// (prdMeta / caseDetail / allCases / teamsData getters) — the 5 real use cases,
// sourced from the PDFs in project/uploads, exactly as the design session wrote them.

export const prdMeta = {
  c1: { problem: 'Sau mỗi lần sửa app, QC phải bấm tay lại cùng một chuỗi thao tác trên điện thoại; kết quả phụ thuộc người bấm và tình trạng máy.', result: 'Bản thử nghiệm đã ghi và tự bấm lại được kịch bản, chạy nhiều kịch bản liên tiếp, tự chuẩn bị tài khoản test, quay video và xuất báo cáo lỗi. Mức tiết kiệm còn phải đo thực tế.', topics: ['Kiểm thử', 'Tự động hoá', 'Ứng dụng di động'], helpful: 0, comments: 0 },
  c2: { problem: 'Mỗi người tự cài công cụ và tự đặt cách làm việc với AI, nên cùng một yêu cầu lại ra quy trình và chất lượng khác nhau, người mới phải dò lại từ đầu.', result: 'Một bộ trợ lý dùng chung: cài một lần là cả team có cùng bộ lệnh, cùng cách kết nối hệ thống nội bộ và cùng tiêu chuẩn kỹ thuật, trên cả Claude Code, Cursor và Codex.', topics: ['Trợ lý AI cho developer', 'Chuẩn hoá quy trình'], helpful: 0, comments: 0 },
  c3: { problem: 'Người làm nghiệp vụ nhập sai thiết lập chiến dịch khuyến mãi và không có cách tự kiểm tra trước khi chiến dịch chạy.', result: 'Nguyên nhân lớn nhất là người cấu hình sai: 289/1.881 yêu cầu hỗ trợ (15,4%), trong đó sai ứng dụng/kênh áp dụng 109 và sai nhóm khách hàng 51. Phần giải pháp kỹ thuật đã xong.', topics: ['Phân tích dữ liệu hỗ trợ', 'Thiết lập khuyến mãi'], helpful: 0, comments: 0 },
  c4: { problem: 'Người không rành kỹ thuật muốn đưa trợ lý AI của mình lên chạy thật nhưng luôn phải nhờ người kỹ thuật làm.', result: 'Bộ hướng dẫn để AI tự làm phần kỹ thuật: ra lệnh bằng tiếng Việt và nhận về một đường link chạy thật. Hiện chỉ ở môi trường thử nghiệm, mới kiểm tra trên máy macOS.', topics: ['Hướng dẫn cho non-tech', 'Deploy agent'], helpful: 0, comments: 0 },
  c5: { problem: 'Trang quản trị website cũ và khó dùng; phía kinh doanh phải thuê agency viết bài (hơn 300k/bài, 2-3 ngày) vì bài do AI viết nghe như máy.', result: 'Bộ kết nối cho trợ lý AI tự viết và đăng bài tin tức; bài đầu tiên được chấm giống người viết ngang bài agency đang đăng. Đã có bài mẫu trên môi trường thử nghiệm.', topics: ['Nội dung website', 'Trợ lý AI'], helpful: 0, comments: 0 },
}

export const caseDetail = {
  c1: {
    summary: 'Sau mỗi lần sửa app, QC phải bấm tay lại cùng một chuỗi thao tác trên điện thoại. Giải pháp cho phép bấm mẫu một lần, máy ghi lại rồi tự bấm lại y như vậy trên điện thoại thật, có so ảnh màn hình trước mỗi bước để chắc chắn đang đi đúng luồng. Bản thử nghiệm đã chạy nhiều kịch bản liên tiếp, quay video và xuất báo cáo khi có lỗi.',
    tables: [
      { title: 'Công việc của QC và phần hệ thống hỗ trợ', note: 'Effort nằm ở cả chuẩn bị trạng thái, thao tác lặp lại, thời gian chờ và thu thập bằng chứng.', cols: ['Công việc của QC', 'Hệ thống hỗ trợ'], rows: [
        ['Thực hiện lại từng thao tác và chờ đúng màn hình', 'Record một lần, replay tự động theo cùng thứ tự; chỉ chạm tiếp khi màn hình khớp.'],
        ['Reset app, chuẩn bị trạng thái và chọn case', 'Precondition, account pool và batch hỗ trợ chuẩn bị/chạy nhiều case tuần tự.'],
        ['Theo dõi toàn bộ lúc chạy', 'Máy tự chạy; QC chỉ theo dõi kết quả và can thiệp khi case yêu cầu dữ liệu đặc biệt.'],
        ['Chụp bằng chứng', 'Tự lưu log, screenshot, ảnh khác biệt để QC/dev điều tra.'],
      ] },
      { title: 'Luồng hoạt động', note: 'Kiểm thử hộp đen, không cần source code hay test ID từ developer.', cols: ['Bước', 'Nội dung'], rows: [
        ['1. Chuẩn bị', 'QC chọn kịch bản, chuẩn bị tài khoản, trạng thái app và thiết bị có kết nối với ứng dụng.'],
        ['2. Làm mẫu', 'QC thực hiện mẫu test case trên một thiết bị.'],
        ['3. Record', 'Ghi thao tác chạm, vuốt, nhập text/PIN cùng ảnh màn hình trước mỗi bước, áp mask, lưu thành test case (1 file text có cấu trúc).'],
        ['4. Replay', 'So sánh màn hình hiện tại với ảnh đã ghi; khớp thì ADB phát lại thao tác tại toạ độ tương ứng.'],
        ['5. Xử lý lỗi', 'Nếu màn hình không khớp hoặc quá thời gian chờ, case dừng và ghi nhận lỗi thay vì chạm tiếp sai màn hình.'],
      ] },
    ],
    gallery: [
      { id: 'uc-c1-flow', placeholder: 'sơ đồ luồng record/replay', caption: 'Sơ đồ luồng record → replay trong tài liệu.' },
      { id: 'uc-c1-report', placeholder: 'report / video chẩn đoán', caption: 'Report chẩn đoán và video khi case fail.' },
      { id: 'uc-c1-qe', placeholder: 'số liệu đo đạc của QE', caption: 'Số liệu đo đạc của QE (mục 3 tài liệu).' },
    ],
    level: 'ref',
    howto: {
      prep: [
        'Bản app thử nghiệm (APK) đã cài trên máy Android thật — không cần source code, không cần developer mở thêm gì.',
        'Máy tính kết nối được với điện thoại qua ADB để phát lại thao tác.',
        '※ Đúng dòng máy mà bản thử nghiệm đang chạy ổn — hiện mới cố định một loại máy.',
        '※ Tài khoản test riêng cho kịch bản, không dùng tài khoản thật vì kịch bản có nhập PIN.',
      ],
      steps: [
        'Chuẩn bị: chọn kịch bản, chuẩn bị tài khoản, trạng thái app và thiết bị.',
        'Làm mẫu: QC thực hiện tay trọn kịch bản một lần trên thiết bị.',
        'Record: hệ thống ghi từng cú chạm, vuốt, chữ và PIN đã nhập kèm ảnh màn hình trước mỗi bước; đánh dấu (mask) vùng dữ liệu động rồi lưu thành một file test case.',
        'Replay: trước mỗi bước máy so màn hình hiện tại với ảnh đã ghi, khớp mới chạm tiếp.',
        '※ Xem kết quả: case chạy xong thì đọc report; case fail thì mở video và ảnh khác biệt để tìm bước hỏng.',
      ],
      success: [
        'Kịch bản chạy hết từ đầu đến cuối, không dừng ở điểm kiểm tra giữa chừng.',
        '※ Chạy lại cùng một kịch bản hai lần cho cùng kết quả — đây là điểm khác so với bấm tay.',
        'Khi fail, hệ thống tự lưu log, screenshot và ảnh khác biệt đủ để dev điều tra mà QC không phải chụp tay.',
      ],
      pitfalls: [
        'Quên mask vùng luôn đổi (đồng hồ, số dư, ảnh động) → case báo lỗi oan.',
        'Màn hình load chậm hơn lúc ghi → quá thời gian chờ, case dừng giữa chừng.',
        '※ Đổi sang máy khác kích thước màn hình → toạ độ lệch, phải ghi lại kịch bản từ đầu.',
        '※ App đã đổi giao diện sau khi ghi → ảnh so sánh không khớp, cần record lại case đó.',
      ],
      contact: [
        'Tài liệu không ghi PIC.',
        '※ Chưa mở cho người ngoài dùng thử — muốn tham gia thử nghiệm thì hỏi trong kênh AI Hub để được nối với team QE đang làm.',
      ],
    },
    audience: 'QC / QE, team mobile',
    pain: [
      'Cùng một kịch bản phải bấm tay lại sau mỗi lần app thay đổi; càng nhiều kịch bản, càng nhiều lần lặp thì càng tốn thời gian.',
      'Kết quả phụ thuộc vào người bấm và tình trạng máy, nên hai lần chạy có thể cho kết quả khác nhau.',
      'Khi có lỗi, phải tự chụp ảnh và ghi chú lại để chứng minh; công cụ chỉ chờ theo thời gian cố định nên dễ bấm khi màn hình còn chưa hiện xong.',
    ],
    solution: [
      'Chỉ cần bản app thử nghiệm cài lên máy — không cần đọc code hay xin developer mở thêm gì (kiểm thử kiểu "hộp đen").',
      'Ghi kịch bản: QC bấm mẫu một lần, hệ thống lưu lại từng cú chạm, cú vuốt, chữ và mã PIN đã nhập, kèm ảnh màn hình trước mỗi bước.',
      'Chạy lại: trước mỗi bước, máy so ảnh màn hình hiện tại với ảnh đã lưu; giống thì bấm tiếp đúng vị trí, khác hoặc chờ quá lâu thì dừng và ghi nhận lỗi.',
      'Những vùng luôn đổi như đồng hồ, số dư, ảnh động được đánh dấu để bỏ qua khi so sánh, tránh báo lỗi oan.',
    ],
    result: [
      'Bản thử nghiệm đã ghi và chạy lại được các thao tác chính: chạm, vuốt, nhập chữ, nhập PIN và điểm kiểm tra giữa kịch bản.',
      'Có sẵn: so ảnh màn hình, bỏ qua vùng dữ liệu động, lưu bằng chứng khi lỗi, tự chuẩn bị trạng thái và tài khoản test, chạy nhiều kịch bản liên tiếp, quay video, xuất báo cáo, dùng được qua cả giao diện trên máy tính và dòng lệnh.',
      'Vì điều khiển ở mức điện thoại nên dùng được cho app Android, web trên trình duyệt và màn hình web nhúng trong app.',
    ],
    next: [
      'Vẫn là bản thử nghiệm, chỉ chạy ổn trên một loại máy cố định; chưa hỗ trợ tốt nhiều kích thước màn hình và các cử chỉ phức tạp.',
      'Chưa biết tiết kiệm được bao nhiêu thời gian: cần chạy thử thực tế rồi so thời gian chuẩn bị, chạy và tìm lỗi trên cùng một tập kịch bản.',
      'Hướng phát triển: nhận diện đúng thành phần trên màn hình thay vì bấm theo toạ độ, và để AI lo luôn phần dựng và chạy kịch bản.',
    ],
  },
  c2: {
    summary: 'Mỗi người tự cài công cụ và tự đặt cách làm việc với AI, nên cùng một yêu cầu lại ra chất lượng khác nhau. us-hive gom lại thành một bộ trợ lý cài sẵn cho Claude Code, Cursor và Codex: cài một lần là có cùng bộ lệnh, cùng cách kết nối hệ thống nội bộ và cùng tiêu chuẩn kỹ thuật của Zalopay.',
    tables: [
      { title: 'Danh sách trợ lý', note: 'Mỗi trợ lý gọi bằng đúng một câu lệnh giống nhau trên mọi công cụ.', cols: ['Agent / Command', 'Mục đích'], rows: [
        ['bee-dev', 'Viết service backend: thiết kế, viết test trước, tự rà soát, chuyển cho QC và dựng sẵn yêu cầu merge code.'],
        ['bee-figma-ui <link Figma>', 'Dựng hoặc kiểm tra giao diện từ bản thiết kế Figma, có so sánh lệch từng pixel.'],
        ['bee-integrator <đối tác> <tài liệu>', 'Tích hợp kết nối với đối tác theo 4 giai đoạn, có viết test, tự rà soát theo tiêu chuẩn Zalopay và chuyển cho QC.'],
        ['bee-review-code <link yêu cầu merge>', 'Review code: ghi nhận từng điểm cần sửa ngay tại dòng code và hỏi xác nhận trước khi đăng.'],
        ['bee-qc jira= prd= mr= refs=', 'Sinh kịch bản kiểm thử từ yêu cầu, kèm bộ lệnh kiểm tra API nếu cần.'],
        ['bee-db-audit', 'Rà soát cơ sở dữ liệu ở mức cơ bản, không kết nối vào hệ thống thật.'],
        ['bee-docs', 'Viết tài liệu kỹ thuật dựa trên code hiện có.'],
      ] },
      { title: 'Vấn đề đang gặp', note: 'Công cụ kết nối, hướng dẫn cho AI và tiêu chuẩn kỹ thuật đang nằm rải rác ở máy từng người.', cols: ['Vấn đề', 'Hệ quả'], rows: [
        ['Phân mảnh tri thức', 'Workflow và kinh nghiệm tồn tại dưới nhiều phiên bản khác nhau.'],
        ['Khó kiểm soát thay đổi', 'Mỗi lần cập nhật phải thực hiện thủ công trên từng môi trường.'],
        ['Workflow dễ lệch chuẩn', 'Cùng một yêu cầu nhưng cách thực thi và chất lượng đầu ra khác nhau.'],
        ['Khó kế thừa', 'Thành viên mới phải tự thiết lập và học lại những kinh nghiệm đã có.'],
        ['Khó mở rộng', 'Cải tiến ở cấp cá nhân chưa nhanh chóng trở thành capability chung của team.'],
      ] },
    ],
    code: [
      { title: 'INSTALL', code: 'glab auth login --hostname gitlab.zalopay.vn\nglab repo clone https://gitlab.zalopay.vn/aqr/bill/us-hive.git\ncd us-hive\n./install.sh\n\n# chỉ cài một số agent trên Codex\n./install.sh codex --plugins bee-dev,bee-review-code' },
      { title: 'GỌI AGENT', code: '# Codex\n$bee-dev jira=ABC-123\n$bee-review-code https://gitlab.zalopay.vn/.../merge_requests/123\n$bee-integrator partner-name document\n\n# Claude Code / Cursor\n/bee-dev jira=ABC-123\n/bee-review-code https://gitlab.zalopay.vn/.../merge_requests/123' },
    ],
    gallery: [
      { id: 'uc-c2-suite', placeholder: 'sơ đồ us-hive suite', caption: 'Kiến trúc shared agent suite.' },
      { id: 'uc-c2-install', placeholder: 'ảnh chụp health check sau install', caption: 'Kết quả health check sau khi cài.' },
    ],
    level: 'ready',
    howto: {
      prep: [
        'Máy đã có Git, Bash và công cụ dòng lệnh GitLab (glab); máy Windows cần bật WSL.',
        'Ít nhất một trong ba công cụ: Claude Code, Cursor hoặc Codex.',
        '※ Quyền truy cập repo aqr/bill/us-hive trên GitLab — chưa vào được thì nhắn NamNTH.',
      ],
      steps: [
        'Đăng nhập GitLab: glab auth login --hostname gitlab.zalopay.vn',
        'Clone repo us-hive rồi chạy ./install.sh — script tự cài agent cho cả ba công cụ, tự cấu hình và tự health check.',
        'Chỉ cần vài agent thì cài chọn lọc: ./install.sh codex --plugins bee-dev,bee-review-code',
        '※ Khởi động lại công cụ AI để nó nhận agent mới.',
        'Gọi agent bằng một câu lệnh: /bee-dev jira=ABC-123 (Claude Code, Cursor) hoặc $bee-dev jira=ABC-123 (Codex).',
      ],
      success: [
        'Health check chạy tự động sau khi cài và báo pass.',
        '※ Gõ /bee- hoặc $bee- thấy đủ 7 agent trong danh sách gợi ý.',
        '※ Chạy thử /bee-docs trên một repo nhỏ, ra được tài liệu là dùng được.',
      ],
      pitfalls: [
        '※ Chưa chạy glab auth login → lệnh clone báo lỗi quyền truy cập.',
        '※ Windows chạy thẳng trên PowerShell không được, phải vào WSL.',
        '※ Cài bản mới đè bản cũ mà chưa restart công cụ → vẫn đang chạy agent phiên bản cũ.',
        'Agent luôn hỏi xác nhận trước khi làm thay đổi quan trọng — đừng bấm qua cho nhanh.',
      ],
      contact: [
        'NamNTH · Utility Solutions.',
        'Repo gitlab.zalopay.vn/aqr/bill/us-hive — quy trình, cách cài và cách góp thêm agent đều nằm ở đây.',
      ],
    },
    audience: 'Developer dùng Claude Code, Cursor hoặc Codex',
    pain: [
      'Công cụ kết nối, bộ hướng dẫn cho AI và tiêu chuẩn kỹ thuật nằm rải rác ở máy từng người.',
      'Cùng một quy trình tồn tại nhiều phiên bản; mỗi lần cập nhật phải sửa tay trên từng máy.',
      'Cùng một yêu cầu nhưng mỗi người làm một kiểu, chất lượng đầu ra khác nhau; người mới vào phải tự dò lại từ đầu.',
    ],
    solution: [
      'us-hive là nơi duy nhất chứa quy trình cho AI, cách kết nối vào hệ thống nội bộ, tiêu chuẩn kỹ thuật của Zalopay, cách cài đặt và cách góp thêm quy trình mới.',
      'Chạy một lệnh cài là có đủ trợ lý cho cả ba công cụ, tự cấu hình và tự kiểm tra xem đã chạy được chưa; ai chỉ cần vài trợ lý thì cài chọn lọc.',
      'Mỗi trợ lý gọi bằng đúng một câu lệnh giống nhau trên mọi công cụ, tự làm theo quy trình chuẩn và hỏi xác nhận trước khi thay đổi việc quan trọng.',
      'Danh sách trợ lý: viết service, làm UI từ Figma, tích hợp đối tác, review code, sinh kịch bản kiểm thử, rà soát cơ sở dữ liệu và viết tài liệu.',
    ],
    result: [
      'Người mới hay người lâu năm đều làm theo cùng một quy trình.',
      'Việc lặp lại giảm đi: quy trình và danh sách kiểm tra được áp dụng tự động cho viết code, rà soát, viết tài liệu, tích hợp đối tác và review code.',
      'Cải tiến của một người trở thành thứ cả team dùng được và có thể góp thêm về sau.',
    ],
    next: [
      'Máy cần cài sẵn vài công cụ dành cho developer (Git, Bash, công cụ dòng lệnh của GitLab) và ít nhất một trong ba công cụ AI; máy Windows cần bật thêm môi trường Linux.',
      'Càng nhiều trợ lý và quy trình thì càng tốn công đồng bộ, nên cần gom về một chỗ càng sớm càng tốt.',
    ],
  },
  c3: {
    summary: 'Từ tháng 01 đến 07/2026 có khoảng 1.900 yêu cầu hỗ trợ liên quan đến khuyến mãi, trong đó nhóm nguyên nhân lớn nhất là người cấu hình sai: 289 yêu cầu, 15,4%. Phần lớn do nhập sai thiết lập chiến dịch trong CRM tool, khiến Product và Tech phải điều tra và trả lời lại những câu hỏi giống nhau.',
    tables: [
      { title: 'Tóm tắt nhanh', note: 'Dữ liệu trong khoảng tháng 01 – 07/2026.', cols: ['Mục', 'Nội dung'], rows: [
        ['Trọng tâm', 'Những lỗi thiết lập chiến dịch mà người làm nghiệp vụ có thể tránh được (Preventable Business-user configuration errors)'],
        ['Dữ liệu lấy trong', 'Tháng 01 – 07/2026'],
        ['Trạng thái tài liệu', 'Đã hoàn tất'],
        ['Giải pháp kỹ thuật', 'Đã xong'],
      ] },
      { title: 'Phân bổ nguyên nhân gốc', note: 'Toàn bộ yêu cầu hỗ trợ về khuyến mãi trong 01–07/2026.', cols: ['Nguyên nhân gốc', 'Số yêu cầu', 'Tỉ lệ'], rows: [
        ['Người cấu hình sai (Human - Configuration)', '289', '15,4%'],
        ['Khách hiểu sai chương trình', '282', '15,0%'],
        ['Khác', '251', '13,3%'],
        ['Khách cần thêm thông tin', '222', '11,8%'],
        ['Hệ thống – phần mềm', '173', '9,2%'],
        ['Truyền đạt thông tin chưa rõ', '168', '8,9%'],
        ['Yếu tố bên ngoài', '128', '6,8%'],
        ['Hết ngân sách chương trình', '125', '6,6%'],
        ['Điều khoản chương trình chưa rõ', '41', '2,2%'],
        ['Hệ thống – mạng', '31', '1,6%'],
        ['Lỗi code', '28', '1,5%'],
        ['Hệ thống – thiết bị', '11', '0,6%'],
        ['Lỗi khi phát hành', '4', '0,2%'],
        ['Chưa gán nguyên nhân', '128', '6,8%'],
      ] },
      { title: 'Bóc tách nhóm "người cấu hình sai"', note: 'Số liệu và mẫu so sánh còn cần đối chiếu lại theo mục 1.5 của tài liệu.', cols: ['Thiết lập bị nhập sai', 'Số yêu cầu', 'Tỉ lệ'], rows: [
        ['Sai ứng dụng / kênh áp dụng (AppID, SubAppID)', '109', '36,1%'],
        ['Sai nhóm khách hàng hoặc danh sách được hưởng', '51', '16,9%'],
        ['Sai điều kiện kích hoạt chương trình', '28', '9,3%'],
        ['Sai điều kiện lọc hoặc cách áp dụng ưu đãi', '23', '7,6%'],
        ['Ưu đãi hoặc chiến dịch đã hết hiệu lực', '16', '5,3%'],
        ['Sai hình thức / nguồn tiền thanh toán', '13', '4,3%'],
        ['Sai ưu đãi, số lượng hoặc ngân sách', '4', '1,3%'],
        ['Sai thông báo, cách hiển thị hoặc nội dung', '3', '1,0%'],
      ] },
      { title: 'Phạm vi', note: 'Phụ trách: Kiệt. Tô Thế · Hoàng. Nguyễn Việt · Thắng. Hoàng Mạnh · Trọng. Dương Đức.', cols: ['Thuộc phạm vi', 'Ngoài phạm vi'], rows: [
        ['Thiết lập chiến dịch khuyến mãi do người làm nghiệp vụ thực hiện trong công cụ khuyến mãi', 'Công cụ sự kiện và phần gợi ý hành động tiếp theo'],
        ['Những lỗi có thể chặn được ở phần nhóm khách hàng và ưu đãi (có thể kiểm tra dữ liệu tự động)', 'Sự cố hạ tầng, mạng, thiết bị, lỗi code hay lỗi khi phát hành'],
        ['Những câu hỏi thiết lập lặp lại phải nhờ Product hoặc Tech', 'Cách triển khai kỹ thuật (do team kỹ thuật phụ trách)'],
      ] },
    ],
    gallery: [
      { id: 'uc-c3-chart', placeholder: 'biểu đồ root-cause breakdown', caption: 'Biểu đồ phân bổ root cause trong tài liệu.' },
      { id: 'uc-c3-crm', placeholder: 'ảnh chụp màn hình CRM tool', caption: 'Màn hình cấu hình campaign trong CRM tool.' },
    ],
    level: 'report',
    howto: {
      prep: [
        '※ Không cần cài gì — đây là báo cáo phân tích, đọc để biết nên soát lại chỗ nào.',
        '※ Phù hợp nếu bạn đang cấu hình campaign khuyến mãi trong CRM tool, hoặc đang hỗ trợ người cấu hình.',
      ],
      steps: [
        'Xem bảng phân bổ nguyên nhân gốc: nhóm người cấu hình sai chiếm 289/1.881 yêu cầu (15,4%), lớn nhất trong tất cả các nhóm.',
        'Xem bảng bóc tách để biết bốn chỗ hay sai nhất: ứng dụng/kênh áp dụng, nhóm khách hàng, điều kiện kích hoạt, điều kiện lọc.',
        '※ Trước khi bật campaign, tự soát lại đúng bốn mục đó trên màn hình cấu hình.',
        '※ Lỗi bạn gặp mà không nằm trong bốn nhóm này thì ghi lại và gửi team Promotion để bổ sung vào đợt phân tích sau.',
      ],
      success: [
        '※ Số yêu cầu hỗ trợ thuộc nhóm người cấu hình sai giảm so với mức nền 289 yêu cầu trong 7 tháng.',
        '※ Số câu hỏi cấu hình lặp lại phải nhờ Product hoặc Tech giảm.',
        'Phần giải pháp kỹ thuật để chặn lỗi trước đã xong.',
      ],
      pitfalls: [
        'Số liệu chỉ tính công cụ khuyến mãi; công cụ sự kiện và phần gợi ý hành động tiếp theo nằm ngoài phạm vi.',
        'Cách phân loại còn cần đối chiếu lại với bảng bóc tách chi tiết trước khi trích dẫn như kết luận cuối cùng.',
        '※ Còn 128 yêu cầu chưa gán nguyên nhân (6,8%), nên tỉ lệ thật của nhóm cấu hình sai có thể cao hơn 15,4%.',
      ],
      contact: [
        'Kiệt. Tô Thế · Promotion · CRM.',
        'Cùng tham gia: Hoàng. Nguyễn Việt, Thắng. Hoàng Mạnh, Trọng. Dương Đức.',
      ],
    },
    audience: 'Business user cấu hình campaign Promotion, Product & Tech support',
    pain: [
      'Nhập sai rất khó tự phát hiện trước khi chiến dịch chạy, nhất là khi điều kiện khuyến mãi phức tạp.',
      'Lỗi lặp lại ở vài chỗ quen thuộc: điều kiện để khách được dùng voucher, chọn sai ứng dụng/kênh áp dụng, chọn sai nhóm khách hàng, giá trị đơn tối thiểu và điều khoản chương trình.',
      'Product và Tech mất thời gian điều tra lỗi thiết lập và trả lời những câu hỏi giống nhau nhiều lần.',
    ],
    solution: [
      'Rà lại toàn bộ 1.881 yêu cầu hỗ trợ về khuyến mãi trong 01–07/2026 và phân loại theo nguyên nhân gốc.',
      'Bóc riêng nhóm "người cấu hình sai" theo từng loại thiết lập, để biết chỗ nào nên chặn lỗi trước.',
      'Loại các lỗi thiết lập nằm ngoài công cụ khuyến mãi (công cụ sự kiện, gợi ý hành động tiếp theo) ra khỏi số liệu nền.',
    ],
    result: [
      'Nhóm nguyên nhân lớn nhất là người cấu hình sai: 289 yêu cầu (15,4%).',
      'Chi tiết: chọn sai ứng dụng/kênh áp dụng 109 (36,1%), sai nhóm khách hàng hoặc danh sách được hưởng 51 (16,9%), sai điều kiện kích hoạt 28, sai điều kiện lọc/áp dụng 23.',
      'Tài liệu đã hoàn tất; phần giải pháp kỹ thuật đã xong.',
    ],
    next: [
      'Cách phân loại nguyên nhân cần đối chiếu lại với bảng bóc tách chi tiết trước khi xem kết luận là cuối cùng.',
      'Không nằm trong phạm vi: công cụ sự kiện, gợi ý hành động tiếp theo, và các sự cố hạ tầng, mạng, thiết bị, lỗi code hay lỗi khi phát hành.',
    ],
  },
  c4: {
    summary: 'Agent Base là hệ thống nội bộ dùng để đưa ứng dụng lên chạy thật trên internet và trả về một đường link chia sẻ được. Bộ Zalopay Agent Base Skills cài thêm vào Claude Code, Codex hoặc Cursor giúp AI làm phần kỹ thuật thay bạn, dành cho người chưa rành kỹ thuật.',
    tables: [
      { title: 'Chuẩn bị trước khi cài', note: 'Kiểm tra đủ 6 mục trước khi bắt đầu.', cols: ['Cần có', 'Ghi chú'], rows: [
        ['macOS hoặc Linux, Windows', 'Bộ skill chạy trên các hệ điều hành này'],
        ['Một công cụ AI', 'Chọn một trong ba: Claude Code, Codex hoặc Cursor'],
        ['Node.js (bản LTS)', 'Dùng để chạy MCP Server Agentbase'],
        ['python3 và git', 'Dùng cho các script của Agentbase'],
        ['File cấu hình <tên_bạn>_zlpagentbase.env', 'Do SRE cấp riêng cho bạn — liên hệ SRE nếu chưa có'],
        ['Bộ skill ZLP_AgentBase_Skills_V2', '5 thư mục con bắt đầu bằng zlp-agentbase-, tải và giải nén từ link đính kèm'],
      ] },
      { title: 'Đọc kết quả sau khi cài', note: 'AI sẽ báo lại một bảng kết quả.', cols: ['Dòng kết quả', 'Ý nghĩa'], rows: [
        ['API check: PASS', 'Kết nối thành công, dùng được.'],
        ['API check: FAIL', 'Chưa dùng được — xem mục 7 (Lỗi hay gặp) của tài liệu.'],
        ['ALREADY OK (unchanged)', 'Không cần khởi động lại công cụ.'],
      ] },
    ],
    code: [
      { title: 'PROMPT — KIỂM TRA MÁY', code: 'Kiểm tra giúp tôi máy đã cài Node.js, python3, git và Docker chưa.\nCái nào chưa có thì chỉ tôi cách cài nhé.' },
      { title: 'PROMPT — CÀI VÀO CLAUDE CODE', code: 'Tôi cần cài bộ skill ZLP Agent Base vào Claude Code.\n- Thư mục skill sau khi giải nén: ~/Downloads/ZLP_AgentBase_Skills_V2\n- File cấu hình SRE cấp cho tôi: ~/Downloads/luanpd_zlpagentbase.env\n\nHãy làm giúp tôi theo đúng thứ tự:\n1. Tạo thư mục ~/.claude/skills nếu chưa có, rồi copy 5 thư mục bắt đầu bằng zlp-agentbase- vào đó.\n2. Copy file cấu hình thành ~/.claude/zlpagentbase.env rồi đặt quyền chmod 600.\n3. Chạy skill zlp-agentbase-init để kết nối máy tôi với Agent Base.\n4. Báo lại kết quả và cho tôi biết có cần khởi động lại Claude Code không.' },
    ],
    gallery: [
      { id: 'uc-c4-result', placeholder: 'bảng kết quả AI báo sau khi cài', caption: 'Bảng kết quả với dòng API check.' },
      { id: 'uc-c4-link', placeholder: 'ảnh app đã deploy và link chạy thật', caption: 'Ứng dụng sau khi đưa lên Agent Base.' },
    ],
    level: 'ready',
    howto: {
      prep: [
        'macOS, Linux hoặc Windows.',
        'Một công cụ AI: Claude Code, Codex hoặc Cursor.',
        'Node.js bản LTS — dùng để chạy MCP Server Agentbase.',
        'python3 và git — dùng cho các script của Agentbase.',
        'File cấu hình <tên_bạn>_zlpagentbase.env do SRE cấp riêng; chưa có thì liên hệ SRE.',
        'Bộ ZLP_AgentBase_Skills_V2 đã tải và giải nén (5 thư mục bắt đầu bằng zlp-agentbase-).',
      ],
      steps: [
        'Nhờ AI kiểm tra máy: "Kiểm tra giúp tôi máy đã cài Node.js, python3, git và Docker chưa. Cái nào chưa có thì chỉ tôi cách cài nhé."',
        'Dán prompt cài đặt ở khối PROMPT bên dưới: AI tạo thư mục skills, copy 5 thư mục zlp-agentbase-, đặt file cấu hình và chmod 600.',
        'AI chạy skill zlp-agentbase-init để nối máy bạn với Agent Base.',
        'Đọc bảng kết quả AI báo lại, nhìn dòng API check.',
        '※ API check PASS thì ra lệnh tiếp bằng tiếng Việt, ví dụ: "Deploy app trong thư mục này lên Agent Base và cho tôi link."',
      ],
      success: [
        'Bảng kết quả hiện dòng API check: PASS.',
        'Dòng ALREADY OK (unchanged) nghĩa là không cần khởi động lại công cụ.',
        '※ Mở link Agent Base trả về bằng trình duyệt thấy app chạy, gửi link cho người khác cũng mở được.',
      ],
      pitfalls: [
        'API check: FAIL → xem mục 7 (Lỗi hay gặp) trong tài liệu trước khi hỏi ai.',
        '※ File cấu hình sau khi copy phải đúng tên zlpagentbase.env; để nguyên tên có tiền tố thì init không tìm thấy.',
        'Mỗi app giới hạn 2 CPU / 4 GB RAM nên chưa chạy được model local như ollama hay vllm.',
        'Hiện mới triển khai ở môi trường dev và bộ skill mới test trên macOS.',
      ],
      contact: [
        'SRE (HienLQ) — cấp file cấu hình .env và xử lý khi cần thêm tài nguyên.',
      ],
    },
    audience: 'Người không rành kỹ thuật muốn tự deploy agent',
    pain: [
      'Đưa ứng dụng lên chạy thật bình thường cần người kỹ thuật làm.',
      'Người mới không biết lập trình, không biết server, không muốn gõ lệnh phức tạp.',
    ],
    solution: [
      'Agent Base là hệ thống nội bộ để đưa ứng dụng lên chạy thật và trả về link mở bằng trình duyệt.',
      'Bộ Zalopay Agent Base Skills cài thêm vào Claude Code, Codex hoặc Cursor để AI biết cách làm phần kỹ thuật.',
      'Người dùng ra lệnh bằng tiếng Việt; AI thực hiện theo hướng dẫn trong bộ skill rồi tự thao tác trên Agent Base.',
      'Cài bằng cách nhờ AI copy 5 thư mục skill vào client, đặt file cấu hình SRE cấp, rồi chạy skill init và đọc kết quả API check.',
    ],
    result: [
      'Người non-tech tự đưa agent lên chạy thật mà không cần biết lập trình hay server.',
      'Quy trình cài đặt gói thành prompt sẵn cho Claude Code, Codex và Cursor.',
    ],
    next: [
      'Hiện chỉ triển khai ở môi trường dev; bộ skill mới test trên macOS.',
      'Mỗi ứng dụng bị giới hạn 2 CPU / 4 GB RAM nên chưa chạy được model local như ollama, vllm — cần liên hệ SRE nếu có nhu cầu.',
      'Cần Node.js LTS, python3, git và file cấu hình <tên>_zlpagentbase.env do SRE cấp.',
    ],
  },
  c5: {
    summary: 'Trang quản trị cũ và khó dùng, còn kinh doanh phải thuê agency viết bài: hơn 300 nghìn đồng một bài, mất 2–3 ngày. Dự án làm bộ kết nối để trợ lý AI (Claude hoặc ChatGPT) tự viết và xuất bản bài lên website, người vận hành chỉ ra yêu cầu và duyệt.',
    tables: [
      { title: 'Vì sao cần làm', note: 'Phụ trách: Luân. Nguyễn Anh · Trạng thái: đã xong.', cols: ['Chỉ số', 'Hiện trạng'], rows: [
        ['Chi phí thuê agency', 'Hơn 300k / bài'],
        ['Thời gian lên một bài viết', '2–3 ngày, qua nhiều bên và nhiều round review'],
        ['Bài viết tạo mới (2025)', '39 bài / tháng (tổng 469 bài)'],
        ['Bài viết tạo mới (2026)', 'Khoảng 10 bài / tháng (tổng 119 bài tính đến tháng 7)'],
      ] },
      { title: 'Cách đo kết quả', note: 'Điểm "giống người viết" đo bằng humalingo.com/public/detect.', cols: ['Chỉ số', 'Cách đo'], rows: [
        ['Điểm "giống người viết"', 'So bài AI với bài agency đang đăng trên zalopay.vn'],
        ['Tỉ lệ bài do AI tạo', 'Bài viết do AI tạo được gắn dấu, đếm lại trong dữ liệu trang quản trị'],
        ['Chi phí', 'Chi phí cho mỗi bài khi dùng AI'],
      ] },
      { title: 'Phạm vi', note: 'Phạm vi hiện tại: toàn bộ mục tin tức và blog.', cols: ['In scope', 'Out of scope'], rows: [
        ['Để AI vận hành website và tự viết bài, tiết kiệm chi phí thuê agency', 'Hỗ trợ tối ưu tìm kiếm (chưa làm ở giai đoạn này)'],
        ['Tách trang quản trị thành thành phần độc lập để dễ nâng cấp, thay thế', 'Vận hành thêm loại nội dung mới trên website'],
      ] },
    ],
    code: [
      { title: 'INSTALL', code: 'codex plugin marketplace add https://gitlab.zalopay.vn/zpp/ai/zpp-agent-marketplace.git\ncodex plugin add zlpws-admin@zpp-agent' },
      { title: 'OUTPUT', code: 'https://sandbox.zalopay.vn/review-phim-the-odyssey-2026-...-63\nhttps://sandbox.zalopay.vn/zalopay-duoc-vinh-danh-unified-wallet-pioneer-...-64' },
    ],
    gallery: [
      { id: 'uc-c5-score', placeholder: 'ảnh so sánh human score AI vs Agency', caption: 'So sánh human score giữa bài AI và bài Agency.' },
      { id: 'uc-c5-post', placeholder: 'ảnh bài viết publish trên sandbox', caption: 'Bài viết do AI tạo, publish trên sandbox.' },
    ],
    level: 'ready',
    howto: {
      prep: [
        'Một trợ lý AI: Claude hoặc ChatGPT (tài liệu cài qua plugin marketplace nội bộ của Codex).',
        '※ Tài khoản có quyền đăng bài trên trang quản trị website — xin LuanNA hoặc team CMS.',
        '※ Làm trên sandbox.zalopay.vn trước, chỉ đăng lên website thật khi bài đã được duyệt.',
      ],
      steps: [
        'Thêm kho plugin nội bộ: codex plugin marketplace add https://gitlab.zalopay.vn/zpp/ai/zpp-agent-marketplace.git',
        'Cài bộ kết nối: codex plugin add zlpws-admin@zpp-agent',
        '※ Ra yêu cầu bằng tiếng Việt, ví dụ: "Viết và đăng lên sandbox một bài tin tức về <chủ đề>, khoảng 800 chữ, giọng văn giống các bài đang đăng trên zalopay.vn."',
        '※ Đọc lại bản nháp AI trả về: sửa số liệu, tên riêng và những câu nghe máy móc.',
        'Cho AI xuất bản; nó trả về link bài trên sandbox.zalopay.vn để kiểm tra trước khi đăng thật.',
      ],
      success: [
        'Chấm điểm "giống người viết" tại humalingo.com/public/detect, ngang mức bài agency đang đăng trên zalopay.vn.',
        '※ Từ lúc ra yêu cầu đến khi có bài duyệt được dưới một giờ, thay vì 2–3 ngày qua agency.',
        'Bài do AI tạo được gắn dấu nên đếm được tỉ lệ và chi phí mỗi bài trong dữ liệu trang quản trị.',
      ],
      pitfalls: [
        'Văn phong nghe như máy là rào cản lớn nhất — luôn đọc lại trước khi xuất bản.',
        '※ AI có thể bịa số liệu, tên riêng và ngày tháng; phải đối chiếu lại nguồn.',
        '※ Hiện mỗi người tự cài trên máy mình nên cấu hình mỗi máy một khác; bản chạy chung trên mạng nội bộ đang làm.',
        'Giai đoạn này chưa hỗ trợ tối ưu tìm kiếm và chưa mở cho loại nội dung khác ngoài tin tức, blog.',
      ],
      contact: [
        'Luân. Nguyễn Anh · CMS · Website.',
        'Repo gitlab.zalopay.vn/cms/zlp-website/zlpws-admin-mcp.',
      ],
    },
    audience: 'Operator và Biz vận hành website',
    pain: [
      'Trang quản trị website khó dùng, đã cũ và không theo kịp khi website lớn dần.',
      'Phía kinh doanh phải thuê agency viết bài: hơn 300 nghìn đồng một bài, 2–3 ngày mỗi bài vì qua nhiều vòng duyệt.',
      'Rào cản lớn nhất khi để AI viết là văn phong nghe như máy, đọc là nhận ra ngay.',
    ],
    solution: [
      'Làm một bộ kết nối kèm hướng dẫn để trợ lý AI (Claude hoặc ChatGPT) thao tác được trên trang quản trị website.',
      'Sửa trang quản trị để nhận kết nối này một cách an toàn, và tách nó thành thành phần độc lập cho dễ nâng cấp, thay thế về sau.',
      'Phạm vi hiện tại: toàn bộ mục tin tức và blog, với văn phong gần với người viết hơn.',
      'Cài bằng một lệnh thêm plugin từ kho nội bộ của Zalopay.',
    ],
    result: [
      '1–2 bài đầu do AI viết được công cụ chấm "giống người viết" ngang với bài agency đang đăng trên zalopay.vn.',
      'Đã đăng bài mẫu trên môi trường thử nghiệm sandbox.zalopay.vn.',
      'Đo được tỉ lệ bài do AI tạo và chi phí mỗi bài.',
    ],
    next: [
      'Đưa bộ kết nối lên chạy như một dịch vụ trên mạng nội bộ, thay vì mỗi người tự cài trên máy, để ai cũng dùng được.',
      'Cho đăng nhập bằng tài khoản công ty để người không rành kỹ thuật cài một lần là dùng ngay.',
      'Chỉnh cho văn phong tự nhiên hơn, hỗ trợ tối ưu hiển thị trên công cụ tìm kiếm và AI, rồi mở rộng sang các loại nội dung khác.',
    ],
  },
}

export const allCases = [
  { id: 'c1', title: 'Tự động chạy lại toàn bộ kịch bản kiểm thử trên máy Android, giảm thao tác lặp cho QC', desc: 'Ghi lại thao tác của QC một lần rồi cho máy tự bấm lại trên điện thoại thật, có so ảnh màn hình trước mỗi bước để không bấm sai.', author: 'Chưa rõ', team: 'Tài liệu không ghi PIC', category: 'Engineering', tools: [], repo: '', repoHref: '', audience: ['tech'] },
  { id: 'c2', title: 'Bộ agent dùng chung cho Claude Code, Cursor và Codex, giúp cả team làm việc với AI theo một chuẩn', desc: 'Cài một lần là cả team có cùng bộ trợ lý AI, cùng bộ lệnh và cùng tiêu chuẩn kỹ thuật, thay vì mỗi người tự dựng một kiểu.', author: 'NamNTH', team: 'Utility Solutions', category: 'Engineering', tools: ['Claude', 'Cursor', 'Codex'], repo: 'GitLab · aqr/bill/us-hive', repoHref: 'https://gitlab.zalopay.vn/aqr/bill/us-hive', audience: ['tech'] },
  { id: 'c3', title: 'Giảm lỗi cấu hình campaign trong CRM tool, chặn sai sót trước khi campaign chạy', desc: 'Rà 1.881 yêu cầu hỗ trợ về khuyến mãi (01–07/2026) để tìm những chỗ hay nhập sai khi thiết lập chiến dịch và cách chặn lỗi trước khi chạy.', author: 'KietTT', team: 'Promotion · CRM', category: 'Operations', tools: [], repo: '', repoHref: '', audience: ['nontech'] },
  { id: 'c4', title: 'Giúp người không rành kỹ thuật tự đưa AI agent lên chạy thật bằng lệnh tiếng Việt', desc: 'Hướng dẫn người không rành kỹ thuật tự đưa trợ lý AI lên chạy thật: ra lệnh bằng tiếng Việt, AI lo phần kỹ thuật và trả về một đường link dùng được.', author: 'Chưa rõ', team: 'Hỗ trợ: SRE (HienLQ)', category: 'People Enablement', tools: ['Claude', 'Codex', 'Cursor'], repo: '', repoHref: '', audience: ['nontech'] },
  { id: 'c5', title: 'Để AI agent tự viết và đăng bài trên website, giảm chi phí thuê Agency', desc: 'Bộ kết nối cho trợ lý AI tự viết và đăng bài tin tức lên website, giữ văn phong giống người viết và giảm chi phí thuê agency.', author: 'LuanNA', team: 'CMS · Website', category: 'Marketing', tools: ['Claude', 'GPT'], repo: 'GitLab · zlpws-admin-mcp', repoHref: 'https://gitlab.zalopay.vn/cms/zlp-website/zlpws-admin-mcp', audience: ['tech', 'nontech'] },
]

export const teamsData = [
  { key: 'product', name: 'Product', count: 32, color: '#3b82f6', match: ['Product'] },
  { key: 'engineering', name: 'Engineering', count: 58, color: '#14b8a6', match: ['Engineering'] },
  { key: 'operations', name: 'Operations', count: 21, color: '#f59e0b', match: ['Corporate Ops', 'Operations'] },
  { key: 'customerService', name: 'Customer Service', count: 27, color: '#6366f1', match: ['People Enablement', 'Customer'] },
  { key: 'risk', name: 'Risk', count: 18, color: '#22c55e', match: ['Risk'] },
  { key: 'marketing', name: 'Marketing', count: 24, color: '#ef4444', match: ['Marketing'] },
  { key: 'businessDev', name: 'Business Dev.', count: 16, color: '#16a34a', match: ['Business', 'AI Transformation'] },
  { key: 'data', name: 'Data', count: 29, color: '#0ea5e9', match: ['Data', 'Business Intelligence'] },
  { key: 'hr', name: 'HR', count: 12, color: '#f43f5e', match: ['People', 'HR'] },
  { key: 'finance', name: 'Finance', count: 23, color: '#10b981', match: ['Finance', 'Legal'] },
]

const authorInfo = {
  'Chưa rõ': { name: 'Chưa rõ trong tài liệu', role: 'Zalopay' },
  NamNTH: { name: 'Nam. Nguyễn Trần Hoàng', role: 'Zalopay · Utility Solutions' },
  KietTT: { name: 'Kiệt. Tô Thế', role: 'Zalopay · Promotion / CRM' },
  LuanNA: { name: 'Luân. Nguyễn Anh', role: 'Zalopay · CMS / Website' },
}

export function authorInfoFor(author) {
  return authorInfo[author] || { name: author, role: 'Zalopay' }
}

export function toolColor(t) {
  return ({ GPT: '#10a37f', Claude: '#d97757', Gemini: '#4285f4', Magnify: '#2b2f45', Kling: '#2563eb', Perplexity: '#20808d', Copilot: '#6a5cff' })[t] || '#64748b'
}

export function avatarColor(name) {
  const p = ['#3b82f6', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#22c55e', '#6366f1']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return p[h % p.length]
}

const STATUS_META = {
  inuse: { label: 'In use', up: 'IN USE', color: '#16c47f' },
  pilot: { label: 'Pilot', up: 'PILOT', color: '#2563eb' },
  planning: { label: 'Planning', up: 'PLANNING', color: '#f59e0b' },
  prototype: { label: 'Prototype', up: 'PROTOTYPE', color: '#f59e0b' },
}
export function statusMeta(s) {
  return STATUS_META[s] || STATUS_META.inuse
}

const KIND_BY_ID = { c1: 'tech', c2: 'tech', c3: 'nontech', c4: 'nontech', c5: 'tech' }
const STATUS_BY_ID = { c1: 'prototype', c2: 'inuse', c3: 'planning', c4: 'prototype', c5: 'inuse' }
export function kindOf(id) {
  return KIND_BY_ID[id] || 'tech'
}
export function statusOf(id) {
  return STATUS_BY_ID[id] || 'inuse'
}

const LEVEL_META = {
  ready: { label: 'Làm theo được ngay', c: '#00723C', bg: '#E6F7EE', b: '#BFE8D2', dc: '#6ee7a8', dbg: 'rgba(59,255,168,.14)', db: 'rgba(59,255,168,.32)' },
  ref: { label: 'Tham khảo · chưa mở cho người ngoài', c: '#9A5B00', bg: '#FFF4E3', b: '#F3DCB4', dc: '#f6c96b', dbg: 'rgba(246,201,107,.16)', db: 'rgba(246,201,107,.34)' },
  report: { label: 'Báo cáo phân tích', c: '#3D4DA6', bg: '#EEF1FB', b: '#D3DAF3', dc: '#9fd0ff', dbg: 'rgba(159,208,255,.14)', db: 'rgba(159,208,255,.3)' },
}
export function levelMeta(k) {
  return LEVEL_META[k] || LEVEL_META.ready
}
export function levelChip(k, dark) {
  const m = levelMeta(k)
  return 'display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:20px;font-size:10.5px;font-weight:800;letter-spacing:.3px;white-space:nowrap;'
    + 'background:' + (dark ? m.dbg : m.bg) + ';border:1px solid ' + (dark ? m.db : m.b) + ';color:' + (dark ? m.dc : m.c) + ';'
}

/** Marks "※"-prefixed strings (content the design session proposed, not from source docs) in red. */
export function hlList(arr) {
  return (arr || []).map((s) => {
    const made = s.charAt(0) === '※'
    const text = made ? s.slice(1).trim() : s
    return { text, made, color: made ? '#C8102E' : '#3A4757', dot: made ? '#C8102E' : '#9FB6E8' }
  })
}
