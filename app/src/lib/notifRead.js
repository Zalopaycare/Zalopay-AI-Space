import { useEffect, useState } from 'react'

// Which notifications the viewer has opened, kept in this browser. Shared by the sidebar badge
// and the notifications list, which stay in sync through a window event.
const KEY = 'zp-notif-read'
const EVT = 'zp-notif-read-change'

function load() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { return new Set() }
}

export const notifKey = (n) => n.text

export function markNotifsRead(keys) {
  const next = load()
  keys.forEach((k) => next.add(k))
  try { localStorage.setItem(KEY, JSON.stringify([...next])) } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVT))
}

export function useNotifRead() {
  const [read, setRead] = useState(load)
  useEffect(() => {
    const sync = () => setRead(load())
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync) }
  }, [])
  return (n) => !!n.unread && !read.has(notifKey(n))
}
