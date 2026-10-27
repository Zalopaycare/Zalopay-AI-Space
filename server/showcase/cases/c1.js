export default {
  id: 'c1',
  postedAt: '2026-09-23',
  title: 'QC làm mẫu một lần, máy tự chạy lại kịch bản kiểm thử trên điện thoại Android',
  toolName: 'Android UI Regression Automation',
  desc: 'QC thao tác mẫu một lần trên điện thoại Android, máy ghi lại rồi tự chạy lại kịch bản và lưu bằng chứng khi có lỗi.',
  type: 'case',
  status: 'prototype',
  statusNote: 'PoC, chạy trên một loại máy cố định',
  kind: 'tech',
  level: 'ref',
  category: 'Engineering',
  topics: ['Kiểm thử', 'Tự động hoá', 'Ứng dụng di động'],
  tools: [],
  audience: 'QC',
  difficulty: 'Khó',
  access: '[cần bổ sung]',
  author: 'AI Space',
  ownerName: '[cần bổ sung]',
  ownerTeam: '[cần bổ sung]',
  updated: '',
  cover: '/use-cases/c1/workspace.png',
  stats: [],

  tldr: [
    ['Vấn đề', 'Sau mỗi thay đổi của app, QC phải làm lại cùng một kịch bản kiểm thử (Regression Test) bằng tay trên điện thoại.'],
    ['Giải pháp', 'QC làm mẫu một lần, máy ghi lại. Các lần sau máy tự làm lại, kiểm tra màn hình trước mỗi bước.'],
    ['Kết quả', 'Bản thử nghiệm đã chạy được nhiều kịch bản liên tiếp, có video và báo cáo lỗi. Mức tiết kiệm chưa đo.'],
    ['Dùng khi', 'Bạn phải lặp lại cùng kịch bản kiểm thử trên app Android, trình duyệt hoặc trang web nhúng trong app.'],
  ],

  problem: {
    text: 'Kiểm thử lại (Regression Test) trên điện thoại tốn nhiều công, vì cùng một kịch bản phải làm lại sau mỗi thay đổi.',
    bullets: [
      'Ai gặp: QC, ví dụ với các kịch bản Visa Tap to Pay (đăng nhập, làm quen app, OTP/PIN, nhiều máy, nhiều tài khoản).',
      'Việc tốn công: chuẩn bị tài khoản và trạng thái app, bấm lại từng bước, chờ màn hình tải, chụp bằng chứng khi lỗi.',
      'Thời gian tăng theo số kịch bản và số lần lặp; kết quả phụ thuộc người làm và tình trạng máy.',
      'Script chờ theo thời gian cố định dễ bấm khi màn hình chưa sẵn sàng.',
      'Tốn bao nhiêu: [cần bổ sung]',
    ],
    tables: [],
    images: [],
  },

  solution: {
    analogy: 'Hiểu đơn giản: như ghi hình lại cách bạn bấm điện thoại, rồi để máy tự bấm lại đúng như thế, nhưng chỉ bấm khi màn hình giống lúc ghi.',
    steps: [
      'Bạn (QC): chọn kịch bản, chuẩn bị tài khoản, trạng thái app và điện thoại đã kết nối.',
      'Bạn: làm mẫu kịch bản một lần trên điện thoại, như người dùng thật.',
      'Máy: ghi từng cú chạm, vuốt, chữ và PIN đã nhập, kèm ảnh màn hình trước mỗi bước, lưu thành 1 file kịch bản.',
      'Máy: các lần sau tự làm lại; chỉ bấm tiếp khi màn hình khớp ảnh đã ghi, không khớp thì dừng và ghi lỗi.',
      'Bạn kiểm tra: xem kết quả, mở ảnh và video khi có lỗi; chỉ can thiệp khi kịch bản cần dữ liệu đặc biệt.',
    ],
    images: [],
  },

  result: {
    beforeAfter: {
      cols: ['Chỉ số', 'Trước', 'Sau'],
      rows: [
        ['Thời gian chuẩn bị, chạy và điều tra lỗi', 'Chưa đo', 'Chưa đo'],
        ['Số liệu đo đạc của QE', '[cần bổ sung]', '[cần bổ sung]'],
      ],
      note: 'Chưa đo: cần pilot, so sánh thời gian chuẩn bị, chạy và điều tra trên cùng một tập test case.',
    },
    bullets: [
      'Bản thử nghiệm đã ghi và tự làm lại được: chạm, vuốt, nhập chữ, nhập PIN và điểm kiểm tra.',
      'Đã chạy được nhiều kịch bản liên tiếp, tự chuẩn bị trạng thái đầu và tài khoản test.',
      'Tự lưu nhật ký, ảnh chụp, ảnh khác biệt, video và báo cáo để QC/dev điều tra.',
      'Có giao diện trên máy tính và bản chạy bằng dòng lệnh.',
    ],
    tables: [
      {
        title: 'Công việc của QC và phần hệ thống hỗ trợ',
        note: 'Effort nằm ở cả chuẩn bị trạng thái, thao tác lặp lại, thời gian chờ và thu thập bằng chứng; không chỉ ở số lần chạm màn hình.',
        cols: ['Công việc của QC', 'Hệ thống hỗ trợ'],
        rows: [
          ['Thực hiện lại từng thao tác và chờ đúng màn hình', 'Record một lần, replay tự động theo cùng thứ tự; chỉ chạm tiếp khi màn hình khớp.'],
          ['Reset app, chuẩn bị trạng thái và chọn case', 'Precondition, account pool và batch hỗ trợ chuẩn bị/chạy nhiều case tuần tự.'],
          ['Theo dõi toàn bộ lúc chạy', 'Máy tự chạy; QC chỉ cần theo dõi kết quả và can thiệp khi case yêu cầu dữ liệu đặc biệt.'],
          ['Chụp bằng chứng', 'Tự lưu log, screenshot, ảnh khác biệt để QC/dev điều tra.'],
        ],
      },
    ],
    note: 'Chưa đo: mức tiết kiệm thực tế cần đo qua pilot. Mục "Số liệu đo đạc của QE" trong tài liệu gốc còn trống [cần bổ sung].',
    images: [],
  },

  apply: {
    intro: 'Cách làm có thể lặp lại: kiểm thử "hộp đen" (black-box testing), không cần xem source code, không cần developer thêm gì. Chỉ cần cài bản Sandbox lên máy, làm mẫu một lần và để hệ thống ghi lại.',
    fit: {
      yes: [
        'Bạn là QC, phải lặp lại cùng kịch bản kiểm thử sau mỗi thay đổi của app.',
        'App cần kiểm là app Android, trang web trên trình duyệt, hoặc trang web nhúng trong app (WebView).',
        'Bạn chỉ có bản cài app (APK), không có source code.',
      ],
      no: [
        'Bạn cần chạy trên nhiều loại máy, nhiều độ phân giải: bản hiện tại mới chạy trên một loại máy cố định.',
        'Kịch bản có thao tác vuốt, cử chỉ phức tạp: hệ thống chưa hỗ trợ tốt.',
      ],
    },
    prep: [
      'Bản Sandbox của app đã cài trên điện thoại Android thật.',
      'Điện thoại kết nối được với máy tính chạy công cụ.',
      'Tài khoản test và trạng thái app cần cho kịch bản.',
      'Mã nguồn công cụ: GitLab ZaloPay – ui-automation-test.',
      'Xin quyền dùng ở đâu: [cần bổ sung]',
    ],
    steps: [
      'Chọn kịch bản, chuẩn bị tài khoản, trạng thái app và điện thoại có kết nối.',
      'Làm mẫu kịch bản một lần trên điện thoại.',
      'Để hệ thống ghi lại thao tác và ảnh màn hình trước mỗi bước; che (mask) các vùng hay đổi như đồng hồ, số dư, ảnh động.',
      'Chạy lại: chọn một hoặc nhiều kịch bản, để máy tự làm lần lượt.',
      'Xem kết quả; kịch bản lỗi thì mở báo cáo, ảnh khác biệt và video.',
    ],
    blocks: [
      {
        type: 'note',
        tone: 'info',
        title: 'Vì sao che (mask) một số vùng',
        text: 'Máy so màn hình hiện tại với ảnh đã ghi. Các vùng luôn đổi như thời gian đồng hồ, số dư hoặc ảnh động được bỏ qua khi so sánh.',
      },
      {
        type: 'note',
        tone: 'warn',
        text: 'Nếu màn hình không khớp hoặc chờ quá lâu, kịch bản dừng và ghi lỗi, thay vì bấm tiếp sai màn hình.',
      },
      {
        type: 'note',
        tone: 'info',
        title: 'Prompt khởi đầu',
        text: '[cần bổ sung] — tài liệu gốc không có prompt mẫu.',
      },
    ],
    code: [],
    success: [
      'Kịch bản chạy hết từ đầu đến cuối và hiện PASSED trong danh sách.',
      'Kịch bản lỗi hiện FAILED, kèm báo cáo và ảnh hiện tại / ảnh đã ghi / ảnh khác biệt.',
    ],
    images: [],
    pitfalls: [],
  },

  safety: {
    rules: [
      'Máy chỉ bấm tiếp khi màn hình khớp ảnh đã ghi; không khớp thì dừng và ghi lỗi.',
      'QC vẫn theo dõi kết quả và can thiệp khi kịch bản cần dữ liệu đặc biệt.',
      'Bản hiện tại không dùng AI để chạy kiểm thử; hướng dùng AI mới là đề xuất, cần giới hạn công cụ, bảo vệ dữ liệu, lưu vết và QC duyệt.',
    ],
    limits: [
      'Đây vẫn là PoC, chạy trên một loại máy cố định.',
      'Chưa hỗ trợ tốt nhiều độ phân giải màn hình và cử chỉ phức tạp.',
      'Cần thêm đo thử trên máy thật trước khi mở rộng.',
      'Chưa đo mức tiết kiệm thực tế.',
    ],
    tables: [],
  },

  demo: [
    { src: '/use-cases/c1/workspace.png', caption: 'Màn hình QC Regression: danh sách test case, kết quả PASSED/FAILED và lịch sử chạy, bên cạnh điện thoại đang chạy màn Chạm thanh toán.' },
  ],

  tech: {
    bullets: [
      'Dùng Android Debug Bridge (ADB) để record/replay thao tác người dùng.',
      'Dùng Structural Similarity Index Measure (SSIM) để xác nhận trạng thái màn hình trước mỗi hành động; mask loại vùng dữ liệu động khỏi phép so sánh.',
      'Record: ghi tap, scroll, text/PIN cùng ảnh màn hình trước mỗi bước, lưu event, ảnh, mask thành test case (1 file text có cấu trúc).',
      'Replay: so màn hình hiện tại với ảnh đã ghi; khớp thì ADB phát lại thao tác tại tọa độ tương ứng; không khớp/timeout thì dừng và ghi lỗi.',
      'Đã có: record/replay tap, scroll, text, PIN và checkpoint; SSIM, mask, vùng so sánh và artifact failure; precondition, account pool, batch, video, report, desktop GUI và CLI.',
      'Hướng tọa độ được chọn cho bản đầu vì gần với cách QC đang test nhất. Hạn chế: input mức thấp từ ADB không luôn đủ ngữ nghĩa cho đa độ phân giải và gesture phức tạp.',
      'Hướng 5.1 – Component inspection thay cho tọa độ: record UI hierarchy, lưu selector ưu tiên resource_id → content-desc → text. Khi replay, Appium mở session trên thiết bị, chờ component sẵn sàng rồi thao tác; SSIM vẫn là lớp đối chiếu/fallback cho màn hình chưa có selector ổn định.',
      'Flow 5.1: record thao tác và XML evidence → AI LLM đọc evidence/description → tạo pytest Appium semantic → chạy trên thiết bị thật, lưu log, screenshot, result. Selector cũ có thể giữ làm fallback khi UI thay đổi nhỏ.',
      'Kết quả kỳ vọng 5.1: giảm phụ thuộc độ phân giải/layout; dễ đọc và tái sử dụng test hơn; log chỉ rõ selector nào fail.',
      'Kết quả hiện tại 5.1: file pytest được gen chưa ổn định, đôi lúc thất bại vì timeout, xác nhận sai selector do input snapshot sai và nhầm lẫn, mô tả sai, thiếu fallback click toạ độ. Cần benchmark thêm trên thiết bị, màn hình và trạng thái dữ liệu khác nhau.',
      'Ưu điểm 5.1: chạy độc lập với source code ứng dụng, phù hợp khi QC chỉ có APK, tái sử dụng selector giữa nhiều case. Nhược điểm: cần Appium, UiAutomator2, Android SDK và device thật; selector vẫn có thể đổi theo phiên bản UI hoặc WebView; vẫn cần AI LLM gen file từ dữ liệu được cung cấp.',
      'Hướng 5.2 – Full AI cho build/run test: AI đọc yêu cầu, khám phá UI, tạo test specification, điều khiển run và tổng hợp kết quả. Cần tool giới hạn, bảo vệ dữ liệu, audit log và QC review; deterministic replay vẫn là phương án kiểm chứng và fallback.',
    ],
    tables: [],
    code: [
      {
        title: 'Sample Pytest (hướng 5.1: component inspection)',
        code: `from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

def open_transfer(driver):
    wait = WebDriverWait(driver, 20, poll_frequency=0.2)
    button = wait.until(
        EC.element_to_be_clickable((AppiumBy.ID, "vn.com.vng.zalopay:id/transfer"))
    )
    button.click()
    wait.until(EC.visibility_of_element_located(
        (AppiumBy.ANDROID_UIAUTOMATOR, 'new UiSelector().text("Chuyển tiền")')
    ))`,
        note: 'Chép nguyên từ tài liệu gốc. Chữ "Chuyển tiền" bị mất dấu ngay trong bản PDF ("Chuyn tin") và đã được khôi phục dấu.',
      },
    ],
    images: [
      { src: '/use-cases/c1/record-replay-flow.png', caption: 'Luồng Record (ADB đọc touch event + chụp màn hình trước event) và Replay (loại bỏ vùng mask, so khớp SSIM, đạt thì phát lại event, không đạt/timeout thì report).' },
    ],
    repo: { label: 'GitLab ZaloPay – ui-automation-test', href: 'https://gitlab.zalopay.vn/dunc/ui-automation-test' },
  },

  next: {
    steps: [
      'Pilot trên một nhóm Regression Test thực tế, đo effort tiết kiệm và độ ổn định, rồi quyết định phạm vi đầu tư.',
      'Bấm theo nút trên màn hình thay vì theo vị trí chạm, để ít phụ thuộc cỡ màn hình. Bản thử hiện chưa ổn định, cần đo thêm.',
      'Dùng AI xuyên suốt: đọc yêu cầu, khám phá màn hình, tạo kịch bản, điều khiển chạy và tổng hợp kết quả; QC vẫn duyệt.',
    ],
    contact: [
      'Phụ trách: [cần bổ sung]',
      'Kênh liên hệ: [cần bổ sung]',
    ],
    link: '',
  },
}
