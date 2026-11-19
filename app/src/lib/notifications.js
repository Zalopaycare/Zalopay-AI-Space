import { useEffect, useState } from 'react'
import { api, relativeTime } from './api.js'
import { playSound } from './sound.js'

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
    .then((d) => {
      // a new one since the last check: the chime (not on the first load of the page)
      if (state.loaded && (d.unread || 0) > state.unread) playSound('notify')
      state = { loaded: true, unread: d.unread || 0, items: d.notifications || [] }; emit()
    })
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
  return { ...s, items: s.items.map((n) => { const icon = variantOf(n); return { ...n, icon, timeLabel: relativeTime(n.time), ...(NOTIF_STYLE[icon] || NOTIF_STYLE[n.kind] || NOTIF_STYLE.answer) } }) }
}

/** Which icon (and colour) a notification gets: its kind, with event news and "upvotes" told apart by what they say. */
export function variantOf(n) {
  const text = String(n.text || '')
  if (n.kind === 'event') {
    if (/^Nhắc bạn/.test(text)) return 'eventReminder'
    if (/(đã bị hủy|đã huỷ)/.test(text)) return 'eventCancel'
    if (/đổi sang/.test(text)) return 'eventChange'
    if (/đồng tổ chức/.test(text)) return 'eventHost'
    if (/đã tạo sự kiện/.test(text)) return 'eventNew'
    if (/quan tâm/.test(text)) return 'eventInterest'
    return 'event'
  }
  if (n.kind === 'upvote') return /thích/.test(text) ? 'like' : /(chủ đề|muốn nghe)/.test(text) ? 'hand' : 'upvote'
  return n.kind
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
  upvote: { iconBg: '#E4ECFF', iconFg: '#2c5fff' },
  interest: { iconBg: '#FFF4E3', iconFg: '#B45300' },
  chat: { iconBg: '#E4ECFF', iconFg: '#2c5fff' },
  invite: { iconBg: '#FFF4E3', iconFg: '#B45300' },
  access: { iconBg: '#FFECEC', iconFg: '#D8232A' },
  removed: { iconBg: '#FFECEC', iconFg: '#D8232A' },
  // events: calendar blue-green; reminders amber; cancelled red; co-host violet; Quan tâm orange
  event: { iconBg: '#E0F4F8', iconFg: '#0E7490' },
  eventNew: { iconBg: '#E0F4F8', iconFg: '#0E7490' },
  eventChange: { iconBg: '#E0F4F8', iconFg: '#0E7490' },
  eventReminder: { iconBg: '#FFF4E3', iconFg: '#B45300' },
  eventCancel: { iconBg: '#FFECEC', iconFg: '#D8232A' },
  eventHost: { iconBg: '#F1E7FF', iconFg: '#6F0CE2' },
  eventInterest: { iconBg: '#FFF4E3', iconFg: '#B45300' },
  like: { iconBg: '#FFE8EF', iconFg: '#E11D48' },
  hand: { iconBg: '#FFF4E3', iconFg: '#B45300' },
}
