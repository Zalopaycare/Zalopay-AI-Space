// Who is on the site right now. Kept in memory only (no database table): every signed-in request
// marks the user as seen, and the web app sends a small heartbeat with the page it is showing
// every ~45s while its tab is visible. "Online" = seen in the last 2 minutes.
const seen = new Map() // userId -> { at: ms, path: string }
export const ONLINE_MS = 2 * 60_000

export function touch(userId, path) {
  const prev = seen.get(userId)
  seen.set(userId, { at: Date.now(), path: path != null ? String(path).slice(0, 200) : prev?.path || '' })
}

export function lastSeen(userId) {
  return seen.get(userId) || null
}

export function onlineNow() {
  const cut = Date.now() - ONLINE_MS
  return [...seen.entries()].filter(([, v]) => v.at >= cut).map(([id, v]) => ({ id, ...v }))
}
