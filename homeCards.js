// Ported from Zalopay AI Space v2.dc.html renderVals() — this page keeps its own
// (slightly different) copy of the 5 use cases' summary fields from the Library page.
const STATUS = {
  inuse: { label: 'In use', color: '#00CF6A', glow: 'rgba(0,207,106,.5)' },
  planning: { label: 'Planning', color: '#FF8D00', glow: 'rgba(255,141,0,.5)' },
  pilot: { label: 'Pilot', color: '#2F6BFF', glow: 'rgba(47,107,255,.5)' },
  prototype: { label: 'Prototype', color: '#FFCD00', glow: 'rgba(255,205,0,.55)' },
}

export const homeCards = [
  { title: 'Tự động chạy lại toàn bộ kịch bản kiểm thử trên máy Android, giảm thao tác lặp cho QC', desc: 'Ghi lại thao tác của QC một lần rồi cho máy tự bấm lại trên điện thoại thật, có so ảnh màn hình trước mỗi bước để không bấm sai.', author: 'Chưa rõ', team: 'Engineering', tools: [], category: 'tech', status: 'prototype', id: 'c1' },
  { title: 'Bộ agent dùng chung cho Claude Code, Cursor và Codex, giúp cả team làm việc với AI theo một chuẩn', desc: 'Cài một lần là cả team có cùng bộ trợ lý AI, cùng bộ lệnh và cùng tiêu chuẩn kỹ thuật, thay vì mỗi người tự dựng một kiểu.', author: 'NamNTH', team: 'Utility Solutions', tools: ['Claude', 'Cursor', 'Codex'], category: 'tech', status: 'inuse', id: 'c2' },
  { title: 'Giảm lỗi cấu hình campaign trong CRM tool, chặn sai sót trước khi campaign chạy', desc: 'Rà 1.881 yêu cầu hỗ trợ về khuyến mãi (01–07/2026) để tìm những chỗ hay nhập sai khi thiết lập chiến dịch và cách chặn lỗi trước khi chạy.', author: 'KietTT', team: 'Promotion · CRM', tools: [], category: 'nontech', status: 'planning', id: 'c3' },
  { title: 'Giúp người không rành kỹ thuật tự đưa AI agent lên chạy thật bằng lệnh tiếng Việt', desc: 'Hướng dẫn người không rành kỹ thuật tự đưa trợ lý AI lên chạy thật: ra lệnh bằng tiếng Việt, AI lo phần kỹ thuật và trả về một đường link dùng được.', author: 'Chưa rõ', team: 'Hỗ trợ: SRE', tools: ['Claude', 'Codex', 'Cursor'], category: 'nontech', status: 'prototype', id: 'c4' },
  { title: 'Để AI agent tự viết và đăng bài trên website, giảm chi phí thuê Agency', desc: 'Bộ kết nối cho trợ lý AI tự viết và đăng bài tin tức lên website, giữ văn phong giống người viết và giảm chi phí thuê agency.', author: 'LuanNA', team: 'CMS · Website', tools: ['Claude', 'GPT'], category: 'tech', status: 'inuse', id: 'c5' },
].map((c, i) => ({
  ...c,
  slotId: 'uc-' + (i + 1),
  categoryLabel: c.category === 'tech' ? 'By tech' : 'By non-tech',
  statusLabel: (STATUS[c.status] || STATUS.inuse).label,
  statusColor: (STATUS[c.status] || STATUS.inuse).color,
  statusGlow: (STATUS[c.status] || STATUS.inuse).glow,
}))
