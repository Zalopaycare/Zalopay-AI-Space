import { repairLabels } from './taxonomy.js'
// DELETE with an optional reason (required when an admin removes someone else's post).
const delBody = (reason) => (reason ? { method: 'DELETE', body: JSON.stringify({ reason }) } : { method: 'DELETE' })

// Tags saved with a broken encoding ("T�i li�u d�i") are fixed up as they arrive, so every page shows them right.
const TAG_KEYS = ['topics', 'tools', 'category']
function repairTags(o, depth = 0) {
  if (!o || typeof o !== 'object' || depth > 6) return
  if (Array.isArray(o)) { for (const x of o) repairTags(x, depth + 1); return }
  for (const k of Object.keys(o)) {
    const v = o[k]
    if (TAG_KEYS.includes(k) && Array.isArray(v) && v.some((x) => typeof x === 'string' && x.includes('\uFFFD'))) o[k] = repairLabels(v)
    else if (v && typeof v === 'object') repairTags(v, depth + 1)
  }
}

async function request(path, options = {}) {
  const res = await fetch('/api' + path, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  })
  let data = null
  try { data = await res.json() } catch { /* no body */ }
  if (data) repairTags(data)
  if (!res.ok) {
    const err = new Error((data && (data.message || data.error)) || 'request_failed')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  config: () => request('/auth/config'),
  // turned away at sign-in (not listed under Zalopay): see who Microsoft says you are, ask the admins for access
  accessRequestInfo: () => request('/auth/access-request'),
  sendAccessRequest: (note) => request('/auth/access-request', { method: 'POST', body: JSON.stringify({ note }) }),
  adminAccess: () => request('/admin/access'),
  // Quản trị viên: list, add by company email, take the role back
  adminAdmins: () => request('/admin/admins'),
  addAdmin: (email) => request('/admin/admins', { method: 'POST', body: JSON.stringify({ email }) }),
  removeAdmin: (email) => request(`/admin/admins/${encodeURIComponent(email)}`, { method: 'DELETE' }),
  decideAccess: (id, decision) => request(`/admin/access/${id}/${decision}`, { method: 'POST' }),
  revokeAccess: (email) => request(`/admin/access/grants/${encodeURIComponent(email)}`, { method: 'DELETE' }),
  requestCode: (email) => request('/auth/request-code', { method: 'POST', body: JSON.stringify({ email }) }),
  aliasCheck: (alias) => request('/auth/alias-check?alias=' + encodeURIComponent(alias)),
  verifyCode: (email, code) => request('/auth/verify-code', { method: 'POST', body: JSON.stringify({ email, code }) }),
  me: () => request('/auth/me'),
  updateMe: (patch) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(patch) }),
  uploadAvatar: (image) => request('/auth/me/avatar', { method: 'PUT', body: JSON.stringify({ image }) }),
  removeAvatar: () => request('/auth/me/avatar', { method: 'DELETE' }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  listNotifications: () => request('/notifications'),
  markNotificationsRead: (ids) => request('/notifications/read', { method: 'POST', body: JSON.stringify(ids ? { ids } : {}) }),
  adminUsers: () => request('/admin/users'),
  directoryStatus: () => request('/admin/directory-status'),
  adminStats: () => request('/admin/stats'),
  listUsers: (q) => request('/auth/users?q=' + encodeURIComponent(q || '')),

  listQuestions: () => request('/questions'),
  deleteQuestion: (id, reason) => request(`/questions/${id}`, delBody(reason)),
  updateQuestion: (id, payload) => request(`/questions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  postQuestion: (payload) => request('/questions', { method: 'POST', body: JSON.stringify(payload) }),
  reactQuestion: (id) => request(`/questions/${id}/react`, { method: 'POST' }),
  saveQuestion: (id) => request(`/questions/${id}/save`, { method: 'POST' }),
  postAnswer: (id, body, opts = {}) => request(`/questions/${id}/answers`, { method: 'POST', body: JSON.stringify({ body, ...opts }) }),
  // reactions: type = like | haha | wow | sad | angry (the same again takes it back)
  reactAnswer: (id, answerId, type = 'like') => request(`/questions/${id}/answers/${answerId}/react`, { method: 'POST', body: JSON.stringify({ type }) }),
  reactAnswerComment: (id, answerId, commentId, type = 'like') => request(`/questions/${id}/answers/${answerId}/comments/${commentId}/react`, { method: 'POST', body: JSON.stringify({ type }) }),
  reactUseCaseComment: (id, commentId, type = 'like') => request(`/use-cases/${id}/comments/${commentId}/react`, { method: 'POST', body: JSON.stringify({ type }) }),
  acceptAnswer: (id, answerId) => request(`/questions/${id}/answers/${answerId}/accept`, { method: 'POST' }),
  editAnswer: (id, answerId, body) => request(`/questions/${id}/answers/${answerId}`, { method: 'PATCH', body: JSON.stringify({ body }) }),
  deleteAnswer: (id, answerId, reason) => request(`/questions/${id}/answers/${answerId}`, delBody(reason)),
  editAnswerComment: (id, answerId, commentId, body) => request(`/questions/${id}/answers/${answerId}/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ body }) }),
  deleteAnswerComment: (id, answerId, commentId, reason) => request(`/questions/${id}/answers/${answerId}/comments/${commentId}`, delBody(reason)),
  editUseCaseComment: (id, commentId, body) => request(`/use-cases/${id}/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ body }) }),
  deleteUseCaseComment: (id, commentId, reason) => request(`/use-cases/${id}/comments/${commentId}`, delBody(reason)),
  report: (type, id, reason) => request('/reports', { method: 'POST', body: JSON.stringify({ type, id, reason }) }),
  adminReports: () => request('/admin/reports'),
  resolveReport: (id, action) => request(`/admin/reports/${id}/resolve`, { method: 'POST', body: JSON.stringify({ action }) }),
  postAnswerComment: (id, answerId, body, parentId, replyToId, opts = {}) => request(`/questions/${id}/answers/${answerId}/comments`, { method: 'POST', body: JSON.stringify({ body, parentId: parentId || null, replyToId: replyToId || null, ...opts }) }),

  useCaseMeta: (id) => request(`/use-cases/${id}/meta`),
  reactUseCase: (id) => request(`/use-cases/${id}/react`, { method: 'POST' }),
  showcase: () => request('/showcase'),
  interestPending: (id) => request(`/showcase/pending/${encodeURIComponent(id)}/interest`, { method: 'POST' }),
  // Admin Console "Booth Exhibition": every booth's write-up status, and inviting owners to write it up
  adminBooths: () => request('/showcase/admin/booths'),
  // a 1920×1080 cover for a case or booth that had none (admins)
  // an admin's edit of a use case already on the site (laid over its case file)
  adminEditCase: (id, edit) => request(`/showcase/admin/edit/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify(edit) }),
  adminSetCover: (id, cover) => request(`/showcase/admin/cover/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ cover }) }),
  inviteBooth: (id) => request(`/showcase/admin/booths/${encodeURIComponent(id)}/invite`, { method: 'POST' }),
  inviteAllBooths: () => request('/showcase/admin/booths/invite', { method: 'POST' }),
  // "Chat với Admin": my conversation, and the admins' shared inbox. `after` = last message id I have.
  chatMine: (after = 0) => request('/chat/me?after=' + after),
  chatSend: (body, files = []) => request('/chat/me', { method: 'POST', body: JSON.stringify({ body, files }) }),
  chatUnread: () => request('/chat/unread'),
  chatThreads: () => request('/chat/threads'),
  chatThread: (uid, after = 0) => request(`/chat/threads/${uid}?after=${after}`),
  chatReply: (uid, body, files = []) => request(`/chat/threads/${uid}`, { method: 'POST', body: JSON.stringify({ body, files }) }),
  presence: (path) => request('/auth/presence', { method: 'POST', body: JSON.stringify({ path }) }),
  adminLive: () => request('/admin/live'),
  adminPublished: () => request('/admin/published'),
  adminHideShowcase: (id) => request(`/admin/showcase/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  toggleApplied: (id) => request(`/use-cases/${id}/applied`, { method: 'POST' }),
  rateUseCase: (id, stars) => request(`/use-cases/${id}/rate`, { method: 'POST', body: JSON.stringify({ stars }) }),
  saveUseCase: (id) => request(`/use-cases/${id}/save`, { method: 'POST' }),
  deleteUseCase: (id, reason) => request(`/use-cases/${id}`, delBody(reason)),
  mySavedUseCaseIds: () => request('/use-cases/saved/mine'),
  commentUseCase: (id, body, parentId, title, extra = {}) => request(`/use-cases/${id}/comments`, { method: 'POST', body: JSON.stringify({ body, parentId: parentId || null, title: title || '', ...extra }) }),
  submitUseCase: (payload) => request('/use-cases/submissions', { method: 'POST', body: JSON.stringify(payload) }),
  listSubmissions: (params = '') => request(`/use-cases/submissions${params}`),
  updateSubmission: (id, payload) => request(`/use-cases/submissions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getReview: (id) => request(`/review/${encodeURIComponent(id)}`),
  addReviewComment: (id, c) => request(`/review/${encodeURIComponent(id)}/comments`, { method: 'POST', body: JSON.stringify(c) }),
  resolveReviewComment: (id, cid, resolved) => request(`/review/${encodeURIComponent(id)}/comments/${cid}`, { method: 'PATCH', body: JSON.stringify({ resolved }) }),
  deleteReviewComment: (id, cid) => request(`/review/${encodeURIComponent(id)}/comments/${cid}`, { method: 'DELETE' }),
  reviewSubmission: (id, status, note) => request(`/use-cases/submissions/${id}/review`, { method: 'POST', body: JSON.stringify({ status, note }) }),
  deleteSubmission: (id, reason) => request(`/use-cases/submissions/${id}`, delBody(reason)),
}

/** A thread's posting time: relative within a day ("3 giờ trước"), "Hôm qua" for the day before,
 *  then the date like the use case cards ("Posted 28/10/26"). */
export function threadTime(iso) {
  const raw = String(iso || '')
  const then = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z')
  if (Number.isNaN(then.getTime())) return ''
  if (Date.now() - then.getTime() < 86_400_000) return relativeTime(raw)
  const yesterday = new Date(Date.now() - 86_400_000)
  if (then.toDateString() === yesterday.toDateString()) return 'Hôm qua'
  const p = (n) => String(n).padStart(2, '0')
  return `Posted ${p(then.getDate())}/${p(then.getMonth() + 1)}/${String(then.getFullYear()).slice(2)}`
}

export function relativeTime(iso) {
  const then = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z').getTime()
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (diffSec < 60) return 'Vừa xong'
  const m = Math.floor(diffSec / 60)
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} ngày trước`
  return new Date(then).toLocaleDateString('vi-VN')
}
