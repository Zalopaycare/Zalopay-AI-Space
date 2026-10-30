// Maintenance: MAINTENANCE=on (a Coolify setting) closes the site to everyone but the admins. People
// can still sign in (so an admin can), but every other API answers 503 and the app shows
// "Web đang được sửa chữa". Turning it off is removing the setting (or setting it to off).
export const maintenanceOn = () => /^(1|on|true|yes)$/i.test(String(process.env.MAINTENANCE || '').trim())

export function maintenanceGate(req, res, next) {
  if (!maintenanceOn() || !req.path.startsWith('/api/')) return next()
  if (req.user?.is_admin) return next()
  if (req.path === '/api/health' || req.path.startsWith('/api/auth/')) return next()
  res.status(503).json({ error: 'maintenance', message: 'Zalopay AI Space đang được sửa chữa, vui lòng quay lại sau.' })
}
