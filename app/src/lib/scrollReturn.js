import { useEffect } from 'react'

// "Quay lại" lands where you were: before opening a use case from a list we remember the list's URL,
// scroll position and the card; when that list shows again we scroll back to it (retrying while
// the list is still loading, since the showcase cases arrive from the API a moment later).
const KEY = 'zp-scroll-return'
const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null') } catch { return null } }
const here = () => window.location.pathname + window.location.search

export function rememberReturn(id, extra = {}) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ path: here(), y: window.scrollY, id, at: Date.now(), ...extra })) } catch { /* private mode */ }
}

/** True when the page we came from is a remembered list (so "Quay lại" can use history.back()). */
export function hasReturn() {
  const r = read()
  return !!r && Date.now() - r.at < 30 * 60_000
}

/** Saved info for the current list page, if any (e.g. to restore its pagination first). */
export function pendingReturn() {
  const r = read()
  return r && r.path === here() ? r : null
}

/** Call on a list page; `ready` flips/changes when its data has loaded. */
export function useScrollReturn(ready = true) {
  useEffect(() => {
    const r = pendingReturn()
    if (!r || !ready) return undefined
    let tries = 0, done = false
    const attempt = () => {
      if (done) return
      const card = r.id ? document.querySelector(`[data-card-id="${CSS.escape(String(r.id))}"]`) : null
      const tallEnough = document.documentElement.scrollHeight >= r.y + window.innerHeight * 0.5
      if (card || tallEnough || tries > 40) {
        window.scrollTo(0, r.y)
        done = true
        try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
        return
      }
      tries++
      setTimeout(attempt, 60)
    }
    // after PageFade's scroll-to-top (a layout effect) has run
    requestAnimationFrame(() => requestAnimationFrame(attempt))
    return () => { done = true }
  }, [ready])
}
