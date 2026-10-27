import { useEffect, useState } from 'react'
import { api } from './api.js'

// Unread counts for "Chat với Admin", shared by the sidebar badge and the chat page:
// `mine` = admin replies I haven't read, `inbox` = conversations waiting for an admin (admins only).
// Refreshed on focus and every 30 s; the chat page calls refreshChatUnread() after reading.

let state = { mine: 0, inbox: 0 }
const listeners = new Set()
let inflight = null

export function refreshChatUnread() {
  if (inflight) return inflight
  inflight = api.chatUnread()
    .then((d) => { state = { mine: d.mine || 0, inbox: d.inbox || 0 }; listeners.forEach((fn) => fn(state)) })
    .catch(() => {})
    .finally(() => { inflight = null })
  return inflight
}

export function useChatUnread(enabled = true) {
  const [s, setS] = useState(state)
  useEffect(() => {
    if (!enabled) return undefined
    listeners.add(setS)
    refreshChatUnread()
    const t = setInterval(refreshChatUnread, 30_000)
    const onFocus = () => refreshChatUnread()
    window.addEventListener('focus', onFocus)
    return () => { listeners.delete(setS); clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [enabled])
  return s
}
