import { db } from './db.js'

// Maintenance: MAINTENANCE=on (a Coolify setting) closes the site to everyone but the admins and the
// people listed in MAINTENANCE_ALLOW (comma-separated emails, e.g. the team trying it out first). People
// can still sign in (so they can), but every other API answers 503 and the app shows
// "Web đang được sửa chữa". Turning it off is removing the setting (or setting it to off).
export const maintenanceOn = () => /^(1|on|true|yes)$/i.test(String(process.env.MAINTENANCE || '').trim())

// quotes a config screen may wrap the value in don't count
const allowed = () => new Set(String(process.env.MAINTENANCE_ALLOW || '').replace(/['"]/g, '').split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))
/** May this signed-in user use the site while it is under maintenance? */
export const passesMaintenance = (user) => !!user && (!!user.is_admin || allowed().has(String(user.email || '').toLowerCase()))

export function maintenanceGate(req, res, next) {
  if (!maintenanceOn() || !req.path.startsWith('/api/')) return next()
  if (passesMaintenance(req.user)) return next()
  if (req.path === '/api/health' || req.path.startsWith('/api/auth/')) return next()
  res.status(503).json({ error: 'maintenance', message: 'Zalopay AI Space đang được sửa chữa, vui lòng quay lại sau.' })
}

// Who tried to use the site while it was closed (Admin › Bị chặn khi bảo trì). The same person on the same
// page within 10 minutes counts once. Visitors not signed in are told apart only by `key`, kept in memory.
const SAME_VISIT_MS = 10 * 60_000
const MAX_ANON_PER_DAY = 2000
const recent = new Map()
let anonDay = '', anonCount = 0
export function recordMaintenanceHit({ kind, user = null, email = '', name = '', path = '', key = '' }) {
  if (!maintenanceOn()) return
  const now = Date.now()
  const k = (user ? 'u' + user.id : email ? 'e' + email : 'a' + key) + '|' + path
  if (now - (recent.get(k) || 0) < SAME_VISIT_MS) return
  recent.set(k, now)
  if (recent.size > 5000) for (const [kk, t] of recent) if (now - t > SAME_VISIT_MS) recent.delete(kk)
  if (kind === 'anon') {
    const day = new Date(now).toISOString().slice(0, 10)
    if (day !== anonDay) { anonDay = day; anonCount = 0 }
    if (++anonCount > MAX_ANON_PER_DAY) return
  }
  try {
    db.prepare('INSERT INTO maintenance_hits (user_id, email, name, kind, path) VALUES (?, ?, ?, ?, ?)')
      .run(user?.id ?? null, String(user?.email || email).toLowerCase().slice(0, 200), String(user?.name || name).slice(0, 120), kind, String(path).slice(0, 200))
  } catch { /* ignore */ }
}
