// Booth 24 của Zalopay AI Exhibition 2026 (ai-exhibition.zalopay.vn). Chỉ có Vấn đề và Giải pháp lấy từ
// booth; các phần khác để trống cho đội bổ sung sau.
export default {
  id: 'c34',
  source: 'exhibition',
  postedAt: '2026-10-27',
  title: 'Segment Pipeline Agent Skill',
  desc: '',
  category: 'Data Analytics & Monitoring',
  author: 'Data Platform',
  ownerTeam: 'Data Platform',
  tools: [],
  topics: [],
  problem: { text: 'Để phát triển mới một segment condition mới, member Data Platform phải review lại ticket xem đã đủ thông tin để build không, cũng như member này phải hiểu rõ cách thức build một segment condition mới. Thông thường việc build một segment condition mới mất khoảng 1-2 ngày làm việc để hoàn thành pipeline cũng như các setup liên quan.' },
  solution: { text: 'Segment pipeline Agent Skill là một Agent Skill giúp tổng hợp lại quy trình phát triển một segment condition. Với đầu vào là một Jira ticket, Agent sẽ phân tích và đánh giá đã đủ thông tin để build chưa, nếu đã đủ thông tin Agent sẽ tiến hành dựa vào Skill để explore data cũng như đưa ra những recommend liên quan đến build segment condition. Kết quả quá trình phát triển một segment condition mới khoảng 2 tiếng (chưa tính thời gian migrate data), member thực hiện ticket không cần phải thật sự strong về cách phát triển segment condition như hiện tại.' },
}
