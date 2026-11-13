const B = 'http://localhost:3011'
async function login(email) {
  const r = await fetch(B + '/api/auth/request-code', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })
  const { devCode } = await r.json()
  const v = await fetch(B + '/api/auth/verify-code', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, code: devCode }) })
  const cookie = v.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
  const call = async (method, path, body) => { const x = await fetch(B + path, { method, headers: { 'content-type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined }); const j = await x.json().catch(() => ({})); if (!x.ok) console.log('ERR', path, x.status, j); return j }
  await call('PATCH', '/api/auth/me', { tourSeen: true })
  return call
}
const U = {}
for (const n of ['minh.tran', 'thao.nguyen', 'khoa.le', 'linh.pham', 'an.vo', 'demo.teaser']) U[n] = await login(n + '@zalopay.vn')
const posts = [
  ['khoa.le', 'Mẹo & prompt', 'Prompt mình hay dùng để Claude Code review PR', 'Mình hay nhờ Claude Code đọc diff rồi liệt kê: lỗi có thể gây sai số liệu, chỗ thiếu test, và chỗ đặt tên khó hiểu. Kết quả gọn hơn hẳn so với hỏi chung chung "review giúp mình". Ai có prompt hay hơn thì share nhé!', ['Claude Code']],
  ['thao.nguyen', 'Hỏi đáp về AI', '', 'Mọi người đang dùng AI để tóm tắt biên bản họp thế nào? Team mình họp nhiều mà ghi chú hay bị sót action item 😅', ['ChatGPT']],
  ['minh.tran', 'Ý tưởng ứng dụng AI', 'Tự động phân loại ticket hỗ trợ bằng AI', 'Team mình thử cho AI đọc ticket mới và gợi ý nhóm xử lý + mức ưu tiên. Sau 2 tuần, thời gian phân loại giảm rõ rệt. Đang viết lại thành use case để chia sẻ trên Use Case Library.', ['Agent tự phát triển']],
  ['linh.pham', 'Công cụ AI', '', 'Cursor vs Claude Code cho người mới bắt đầu code: mọi người nghĩ nên chọn cái nào trước?', ['Cursor', 'Claude Code']],
  ['an.vo', 'Bảo mật & dữ liệu', 'Checklist trước khi dán dữ liệu vào công cụ AI', '1. Không dán thông tin khách hàng, số tài khoản\n2. Ẩn tên nội bộ nếu không cần thiết\n3. Dùng công cụ đã được công ty cho phép\nMọi người bổ sung thêm nha!', []],
]
const ids = []
for (const [u, topic, title, body, tools] of posts) { const j = await U[u]('POST', '/api/questions', { title, body, category: [topic], tools }); ids.push(j.question?.id) }
const ans = [[1, 'minh.tran', 'Team mình ghi âm rồi nhờ AI tóm tắt theo 3 mục: quyết định, việc cần làm, người phụ trách. Nhớ xin phép mọi người trước khi ghi âm nhé.'], [1, 'khoa.le', 'Thêm mẹo: yêu cầu AI ghi deadline cạnh từng action item, đỡ sót hơn nhiều.'], [3, 'khoa.le', 'Mới bắt đầu thì Cursor dễ làm quen hơn vì có giao diện quen thuộc, sau đó thử Claude Code cho việc lớn.'], [0, 'linh.pham', 'Hay quá, để mình thử áp dụng cho team!'], [4, 'thao.nguyen', 'Thêm: kiểm tra lại kết quả trước khi gửi ra ngoài 👍']]
for (const [i, u, body] of ans) await U[u]('POST', `/api/questions/${ids[i]}/answers`, { body })
for (const u of Object.keys(U)) for (const id of ids.slice(0, 4)) await U[u]('POST', `/api/questions/${id}/react`, { type: 'like' })
const d = (days, h) => { const t = new Date(); t.setDate(t.getDate() + days); t.setHours(h, 0, 0, 0); return t.toISOString() }
const ev = [['minh.tran', 'AI Sharing: Claude Code cho người mới', d(2, 15), d(2, 16), 'Phòng họp Mercury, tầng 9'], ['thao.nguyen', 'Workshop: Viết prompt hiệu quả', d(6, 14), d(6, 16), 'Online · Microsoft Teams'], ['an.vo', 'AI Coffee Chat', d(9, 9), d(9, 10), 'Pantry tầng 10']]
for (const [u, title, s, e, loc] of ev) { const j = await U[u]('POST', '/api/events', { title, description: 'Cùng trao đổi và thực hành AI trong công việc hằng ngày.', startsAt: s, endsAt: e, location: loc }); for (const x of ['khoa.le', 'linh.pham', 'demo.teaser']) await U[x]('POST', `/api/events/${j.event?.id}/interest`, {}) }
console.log('ok', ids)
