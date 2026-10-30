import { useEffect, useState } from 'react'
import { api } from './api.js'

// Unread count for "Tin nhắn" (conversations with a message I haven't read), shared by the sidebar
// badge and the messages page. Refreshed on focus and every 30 s; the page calls refreshDmUnread() after reading.

let count = 0
const listeners = new Set()
let inflight = null

export function refreshDmUnread() {
  if (inflight) return inflight
  inflight = api.dmUnread()
    .then((d) => { count = d.unread || 0; listeners.forEach((fn) => fn(count)) })
    .catch(() => {})
    .finally(() => { inflight = null })
  return inflight
}

export function useDmUnread(enabled = true) {
  const [n, setN] = useState(count)
  useEffect(() => {
    if (!enabled) return undefined
    listeners.add(setN)
    refreshDmUnread()
    const t = setInterval(refreshDmUnread, 30_000)
    const onFocus = () => refreshDmUnread()
    window.addEventListener('focus', onFocus)
    return () => { listeners.delete(setN); clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [enabled])
  return n
}
