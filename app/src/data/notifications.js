// Ported from Zalopay Use Case Library v2.dc.html renderVals() -> notifDefs.
export const defaultNotifications = [
  {
    text: 'Use case "Tóm tắt phản hồi khách hàng theo tuần" của bạn đã được duyệt',
    href: '/profile#usecase',
    time: 'Hôm qua',
    unread: true,
    icon: 'approved',
    iconBg: '#E7F9F0',
    iconFg: '#00893F',
  },
  {
    text: 'HaiPD đã trả lời câu hỏi của bạn về tóm tắt PDF dài',
    href: '/questions',
    time: '2 giờ trước',
    unread: true,
    icon: 'answer',
    iconBg: '#E7ECFB',
    iconFg: '#2c5fff',
  },
  {
    text: 'QuyenNT đã mention bạn trong một bình luận',
    href: '/questions',
    time: '1 giờ trước',
    unread: true,
    icon: 'mention',
    iconBg: '#F1E7FF',
    iconFg: '#6F0CE2',
  },
  {
    text: 'Use case "Auto QA script" bị từ chối — xem lý do trong Use case của tôi',
    href: '/profile#usecase',
    time: '2 ngày trước',
    unread: false,
    icon: 'rejected',
    iconBg: '#FFECEC',
    iconFg: '#D8232A',
  },
]
