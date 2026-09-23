async function request(path, options = {}) {
  const res = await fetch('/api' + path, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  })
  let data = null
  try { data = await res.json() } catch { /* no body */ }
  if (!res.ok) {
    const err = new Error((data && (data.message || data.error)) || 'request_failed')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  requestCode: (email) => request('/auth/request-code', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyCode: (email, code) => request('/auth/verify-code', { method: 'POST', body: JSON.stringify({ email, code }) }),
  me: () => request('/auth/me'),
  updateMe: (patch) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(patch) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  listQuestions: () => request('/questions'),
  postQuestion: (payload) => request('/questions', { method: 'POST', body: JSON.stringify(payload) }),
  reactQuestion: (id) => request(`/questions/${id}/react`, { method: 'POST' }),
  saveQuestion: (id) => request(`/questions/${id}/save`, { method: 'POST' }),
  postAnswer: (id, body) => request(`/questions/${id}/answers`, { method: 'POST', body: JSON.stringify({ body }) }),
  reactAnswer: (id, answerId) => request(`/questions/${id}/answers/${answerId}/react`, { method: 'POST' }),
  acceptAnswer: (id, answerId) => request(`/questions/${id}/answers/${answerId}/accept`, { method: 'POST' }),
  postAnswerComment: (id, answerId, body) => request(`/questions/${id}/answers/${answerId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),

  useCaseMeta: (id) => request(`/use-cases/${id}/meta`),
  reactUseCase: (id) => request(`/use-cases/${id}/react`, { method: 'POST' }),
  saveUseCase: (id) => request(`/use-cases/${id}/save`, { method: 'POST' }),
  mySavedUseCaseIds: () => request('/use-cases/saved/mine'),
  commentUseCase: (id, body) => request(`/use-cases/${id}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  submitUseCase: (payload) => request('/use-cases/submissions', { method: 'POST', body: JSON.stringify(payload) }),
  listSubmissions: (params = '') => request(`/use-cases/submissions${params}`),
  reviewSubmission: (id, status, note) => request(`/use-cases/submissions/${id}/review`, { method: 'POST', body: JSON.stringify({ status, note }) }),
  deleteSubmission: (id) => request(`/use-cases/submissions/${id}`, { method: 'DELETE' }),
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
