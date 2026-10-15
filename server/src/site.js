import fs from 'node:fs'
import path from 'node:path'

// Site-wide switches an admin can flip without a redeploy, kept in a small JSON file next to the DB.
// "Trailer" mode: only admins get in; everyone else sees the Coming soon screen and the API refuses them.
const FILE = path.join(process.env.DATA_DIR || '/data', 'site.json')
const DEFAULTS = { trailer: true }

export function siteSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) } } catch { return { ...DEFAULTS } }
}
export function saveSiteSettings(patch) {
  const next = { ...siteSettings(), ...patch }
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2))
  return next
}

// What a non-admin may still call in trailer mode: signing in/out and the bits the Coming soon screen needs.
const OPEN = [/^\/auth\/(config|me|logout|presence|request-code|verify-code)$/, /^\/auth\/sso\//]

/** Middleware for /api: in trailer mode, everything except sign-in is admin-only. */
export function trailerGate(req, res, next) {
  if (req.user && req.user.is_admin) return next()
  if (!siteSettings().trailer) return next()
  if (OPEN.some((re) => re.test(req.path))) return next()
  res.status(403).json({ error: 'coming_soon', message: 'Zalopay AI Space sắp ra mắt.' })
}
