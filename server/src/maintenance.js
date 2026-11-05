import { db } from './db.js'

// Maintenance closes the site to everyone but the admins, the people listed in MAINTENANCE_ALLOW
// (comma-separated emails, a Coolify setting) and the people an admin let in from a request
// (maintenance_grants). People can still sign in (so they can ask), but every other API answers 503 and
// the app shows "Web đang được sửa chữa". MAINTENANCE=on on Coolify turns it on; once an admin presses
// Publish / Bật bảo trì (app_settings 'maintenance'), that choice wins over the Coolify setting.
const envOn = () => /^(1|on|true|yes)$/i.test(String(process.env.MAINTENANCE || '').trim())
const setting = () => db.prepare("SELECT value FROM app_settings WHERE key = 'maintenance'").get()?.value
export const maintenanceOn = () => { const v = setting(); return v ? v === 'on' : envOn() }

/** Publish (on = false) or close the site again (on = true). */
export function setMaintenance(on, userId) {
  db.prepare(`INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES ('maintenance', ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`).run(on ? 'on' : 'off', userId)
}
/** Who last pressed the switch, and when ({ by, time }), or null while only Coolify decides. */
export const maintenanceChange = () => db.prepare("SELECT s.updated_at time, u.name by FROM app_settings s LEFT JOIN users u ON u.id = s.updated_by WHERE s.key = 'maintenance'").get() || null

// quotes a config screen may wrap the value in don't count
const allowed = () => new Set(String(process.env.MAINTENANCE_ALLOW || '').replace(/['"]/g, '').split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))
const granted = (email) => !!db.prepare('SELECT 1 FROM maintenance_grants WHERE email = ?').get(String(email || '').toLowerCase())
/** May this signed-in user use the site while it is under maintenance? */
export const passesMaintenance = (user) => !!user && (!!user.is_admin || allowed().has(String(user.email || '').toLowerCase()) || granted(user.email))

export function maintenanceGate(req, res, next) {
  if (!maintenanceOn() || !req.path.startsWith('/api/')) return next()
  if (passesMaintenance(req.user)) return next()
  if (req.path === '/api/health' || req.path.startsWith('/api/auth/')) return next()
  res.status(503).json({ error: 'maintenance', message: 'Zalopay AI Space đang được sửa chữa, vui lòng quay lại sau.' })
}
