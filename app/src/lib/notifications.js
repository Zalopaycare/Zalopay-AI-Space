import { useEffect, useState } from 'react'
import { api, relativeTime } from './api.js'

// Real in-app notifications from the server, shared by the sidebar badge, the profile
// "Thông báo" list and the admin bell. One module-level store so every consumer agrees
// on the unread count; refreshed on focus and every minute while a page is open.

let state = { loaded: false, unread: 0, items: [] }
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn(state))
let inflight = null

export function refreshNotifications() {
  if (inflight) return inflight
  inflight = api.listNotifications()
    .then((d) => { state = { loaded: true, unread: d.unread || 0, items: d.notifications || [] }; emit() })
    .catch(() => { state = { ...state, loaded: true }; emit() })
    .finally(() => { inflight = null })
  return inflight
}

/** ids omitted → mark everything read. */
export function markNotificationsRead(ids) {
  const hit = (n) => !ids || ids.includes(n.id)
  const items = state.items.map((n) => (hit(n) ? { ...n, unread: false } : n))
  state = { ...state, items, unread: items.filter((n) => n.unread).length }
  emit()
  return api.markNotificationsRead(ids).catch(() => {})
}

export function useNotifications(enabled = true) {
  const [s, setS] = useState(state)
  useEffect(() => {
    if (!enabled) return
    listeners.add(setS)
    refreshNotifications()
    const t = setInterval(refreshNotifications, 60_000)
    const onFocus = () => refreshNotifications()
    window.addEventListener('focus', onFocus)
    return () => { listeners.delete(setS); clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [enabled])
  return { ...s, items: s.items.map((n) => ({ ...n, timeLabel: relativeTime(n.time), ...(NOTIF_STYLE[n.kind] || NOTIF_STYLE.answer) })) }
}

export const NOTIF_STYLE = {
  answer: { iconBg: '#E7ECFB', iconFg: '#2c5fff' },
  comment: { iconBg: '#E7ECFB', iconFg: '#2c5fff' },
  mention: { iconBg: '#F1E7FF', iconFg: '#6F0CE2' },
  approved: { iconBg: '#E7F9F0', iconFg: '#00893F' },
  rejected: { iconBg: '#FFECEC', iconFg: '#D8232A' },
  submission: { iconBg: '#FFF1E0', iconFg: '#B45300' },
  report: { iconBg: '#FFECEC', iconFg: '#D8232A' },
  changes: { iconBg: '#FFF4E3', iconFg: '#9A5B00' },
}
