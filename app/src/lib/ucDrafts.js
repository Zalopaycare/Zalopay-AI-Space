// Use case drafts kept in this browser: several at once, newest first. The share form autosaves the one
// being written; opening the form lists them all ("Tiếp tục điền" one, or start a new one: the others stay).
// Hồ sơ shows them too. The single draft of before (zp-usecase-draft-v1) moves in here the first time.

const KEY = 'zp-usecase-drafts-v2'
const OLD_KEY = 'zp-usecase-draft-v1'
const MAX = 20

export const newDraftId = () => 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export function listUcDrafts() {
  try {
    let list = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!Array.isArray(list)) {
      list = []
      const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null')
      if (old && typeof old === 'object') list.push({ ...old, id: newDraftId(), savedTs: '' })
      localStorage.setItem(KEY, JSON.stringify(list))
      localStorage.removeItem(OLD_KEY)
    }
    return list.filter((d) => d && d.id)
  } catch { return [] }
}

const write = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))) } catch { /* full: keep what was there */ } }

/** Save (or update) draft `id`; it moves to the top of the list. */
export function saveUcDraft(id, payload) {
  const now = new Date()
  const d = { ...payload, id, savedTs: now.toISOString(), savedAt: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }
  write([d, ...listUcDrafts().filter((x) => x.id !== id)])
  return d
}

export function removeUcDraft(id) {
  if (!id) return
  write(listUcDrafts().filter((x) => x.id !== id))
}

export const ucDraftTitle = (d) => String((d && d.shareForm && d.shareForm.title) || '').trim()

/** "lưu lúc 18:03" today, "lưu 02/11 18:03" on an earlier day. */
export function ucDraftWhen(d) {
  if (!d) return ''
  const ts = d.savedTs ? new Date(d.savedTs) : null
  if (!ts || Number.isNaN(ts.getTime())) return d.savedAt ? 'lưu lúc ' + d.savedAt : ''
  const hm = ts.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  if (ts.toDateString() === new Date().toDateString()) return 'lưu lúc ' + hm
  return 'lưu ' + ts.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + hm
}
