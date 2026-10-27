// Booth 4 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c14',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'Hỗ trợ CICD',
  desc: '',
  category: 'Software Development',
  author: 'SRE',
  ownerTeam: 'SRE',
  tools: [],
  topics: [],
  problem: { text: 'Trong quá trình vận hành CI/CD, nhiều request lặp lại xuất hiện trên Teams/Jira/Jenkins. Điểm đau chính không chỉ là “pipeline failed”, mà là dev thiếu đủ context để tự kết luận nguyên nhân và hành động tiếp theo.\n\n• Dev thường bị ẩn hoặc không có đủ thông tin log Jenkins, nên không biết rõ vì sao ticket CI/CD failed.\n• Khi CI/CD failed, dev phải hỏi Platform để rebuild, retry staging, retry production hoặc update production success.\n• Dev hay miss các thay đổi trong rule/flow CI/CD, dẫn đến phải hỏi đi hỏi lại cùng một vấn đề. Ví dụ: muốn next step Jira thì cần có Involved Services hoặc field liên quan phải đúng.\n• Dev mới chưa nắm rõ flow CI/CD, bao gồm register CICD, flow Jira, CSM state, Jenkins pipeline stage và điều kiện transit.\n• Không có một tài liệu chuẩn/runnable runbook để tra cứu nhanh khi gặp lỗi; các issue cũ dễ bị quên như thiếu Sonar plugin, thiếu Nacos key, timeout ArgoCD/Kubernetes, lỗi workflow Jira, trạng thái CSM/Jira lệch nhau.\n• Người vận hành Platform phải tự mở nhiều hệ thống để trace thủ công: Jira, Jenkins, CSM, SonarQube, ArgoCD/Kubernetes, Catalog và workload repo.\n• Một số thao tác write action như retry staging, update production success, tăng timeout cần kiểm tra điều kiện và quyền rất cẩn thận.\n\nHệ quả là đội Platform phải hỗ trợ thủ công từng case: đọc log, trace ticket, giải thích workflow, kiểm tra rule, rồi trả lời riêng cho từng người. Cùng một nhóm lỗi có thể lặp lại nhiều lần nhưng vẫn tốn effort vì context nằm rải rác ở nhiều hệ thống.' },
  solution: { text: 'Taxi Agent được xây dựng như một AI Agent cho CI/CD, không phải chatbot hỏi-đáp thuần.\n\nMục tiêu chính:\n• Tự thu thập evidence từ nhiều hệ thống: Jira, Jenkins, CSM API/DB, SonarQube, ArgoCD/Kubernetes, GitLab workload repo.\n• Tổng hợp lỗi lặp lại thành runbook để lần sau trả lời nhanh và nhất quán hơn.\n• Dùng LLM để reasoning, phân loại intent, chọn tool cần gọi, tổng hợp evidence và đưa ra hướng fix có ngữ cảnh.\n• Dùng deterministic guard cho quyền, policy, sensitive data masking và write action.\n• Với mọi thao tác ghi/sửa/xóa, bắt buộc đi qua human-in-the-loop: prepare action → user/admin approve → kiểm tra quyền lại → execute.\n\nTaxi Agent giúp giảm toil bằng cách:\n\n• đọc log Jenkins và chỉ ra đoạn lỗi quan trọng;\n• map ticket Jira ↔ CSM ticket ↔ Jenkins build ↔ workload config;\n• giải thích workflow/validator/condition trên Jira;\n• tạo đề xuất hành động an toàn như retry staging, update production success, tăng deployment timeout;\n• trả lời các câu hỏi resource/workload của project.' },
}
