import jwt from 'jsonwebtoken'
import { db } from './db.js'

// Only Zalopay staff may use the site, but every VNG company signs in with the same @vng.com.vn
// Microsoft accounts. So at the SSO callback we read the person's organisation fields from Microsoft
// (Graph /me) and let them in only when their company (companyName: Zalopay's is "Zion") matches
// STAFF_MATCH, a case-insensitive regex such as "^(zion|zalopay)\b". Only the company counts: the
// AD path and office are the same for every VNG company, and a department or name could contain the
// word by chance. Until STAFF_MATCH is set nobody is blocked: the fields are only recorded, so an
// admin can see what Microsoft returns before switching the check on.
// ADMIN_EMAILS, STAFF_EXTRA_EMAILS, admins and the people an admin granted access always pass (so a
// wrong pattern can't lock the admins out, and someone Microsoft lists elsewhere can be let in).

const ORG_FIELDS = ['companyName', 'department', 'officeLocation', 'jobTitle', 'onPremisesDistinguishedName']
const list = (v) => String(v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
const ALWAYS = new Set([...list(process.env.ADMIN_EMAILS), ...list(process.env.STAFF_EXTRA_EMAILS)])

let pattern = null
try { if (process.env.STAFF_MATCH) pattern = new RegExp(process.env.STAFF_MATCH, 'i') } catch (e) { console.error('[staff] STAFF_MATCH is not a valid regex:', e.message) }
// A pattern that doesn't compile keeps the check on and lets nobody through but ALWAYS.
export const staffCheckOn = () => !!process.env.STAFF_MATCH
const matches = (org) => !!pattern && !!org.companyName && pattern.test(String(org.companyName).trim())

/** The signed-in person's organisation fields from Microsoft, or null when Graph can't be read. */
export async function orgOf(accessToken) {
  try {
    const r = await fetch('https://graph.microsoft.com/v1.0/me?$select=' + ORG_FIELDS.join(','), { headers: { authorization: `Bearer ${accessToken}` } })
    if (!r.ok) { console.error('[staff] Graph /me refused:', r.status); return null }
    const me = await r.json()
    return Object.fromEntries(ORG_FIELDS.map((k) => [k, me[k] == null ? '' : String(me[k]).slice(0, 300)]))
  } catch (e) {
    console.error('[staff] Graph /me failed:', e.message)
    return null
  }
}

/** `staff`: the account is Zalopay staff by STAFF_MATCH (or listed in ALWAYS); `allowed`: it may get a
 *  session now (everyone, while the check is off). `org` null = Microsoft didn't say. */
export function verdict(email, org) {
  const staff = letIn(email) || (!!org && matches(org))
  return { staff, allowed: staff || !staffCheckOn() }
}

/** Record what Microsoft said and the verdict, so existing sessions can be held to it too. */
export function saveOrg(userId, org, ok) {
  db.prepare('UPDATE users SET org_info = ?, staff_ok = ? WHERE id = ?').run(org ? JSON.stringify(org) : null, ok ? 1 : 0, userId)
}

/** For every request once the check is on: a session from before it (or from an email code) no longer counts. */
export const sessionAllowed = (user) => !staffCheckOn() || user.staff_ok === 1 || !!user.is_admin || letIn(user.email)

/** Listed in the env, an admin in the database, or granted access by an admin. */
function letIn(email) {
  const e = String(email || '').toLowerCase()
  return ALWAYS.has(e) || !!db.prepare('SELECT 1 FROM staff_grants WHERE email = ?').get(e) || !!db.prepare('SELECT 1 FROM users WHERE email = ? AND is_admin = 1').get(e)
}

// Someone turned away at sign-in gets a short-lived signed note of who Microsoft said they are, so the
// "no access" page can send an access request without a session (and without trusting what the page sends).
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
export const ACCESS_COOKIE = 'access_req'
export const accessTicket = (email, name, org) => jwt.sign({ email, name, org }, SECRET, { expiresIn: '2h', audience: 'access-request' })
export function readTicket(token) {
  try { const { email, name, org } = jwt.verify(String(token || ''), SECRET, { audience: 'access-request' }); return { email, name, org } } catch { return null }
}

/** Every admin's mailbox (env + database), for access requests. */
export const adminEmails = () => [...new Set([...list(process.env.ADMIN_EMAILS), ...db.prepare('SELECT email FROM users WHERE is_admin = 1').all().map((u) => u.email.toLowerCase())])]
