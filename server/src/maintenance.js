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
