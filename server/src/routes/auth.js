import { touch } from '../presence.js'
import express from 'express'
import * as client from 'openid-client'
import { db } from '../db.js'
import crypto from 'node:crypto'
import { isCompanyEmail, normalizeEmail, getOrCreateUser, issueSession, clearSession, publicUser } from '../auth.js'
import { sendMail, devLoginCodeAllowed } from '../mailer.js'
import { ssoConfigured, getOidcConfig, SSO_SCOPE, SSO_SCOPE_BASE, SSO_REDIRECT_URI } from '../sso.js'
import { saveGraphTokens, dropGraphTokens } from '../graphTokens.js'
import { AVATAR_COLORS, colorOf, avatarUrlOf } from '../avatarColors.js'
import { aliasTaken, ALIAS_TAKEN_MESSAGE } from '../anon.js'
import { requireAuth } from '../auth.js'
import { handleOf, initialsOf } from '../mentions.js'
import { searchDirectory, directoryEnabled, needsRelogin } from '../directory.js'
import { companyDomains } from '../auth.js'
import { maintenanceOn } from '../maintenance.js'
import { orgOf, verdict, saveOrg, accessTicket, readTicket, ACCESS_COOKIE, adminEmails } from '../staffCheck.js'
import { notify } from '../notifications.js'
import { appUrl } from '../mentions.js'

const router = express.Router()
const SSO_COOKIE = 'sso_pending'
// With Microsoft sign-in set up, that's the only way in: an emailed code says nothing about which
// VNG company the person works for (see staffCheck.js). ALLOW_EMAIL_LOGIN=true keeps codes on.
const emailLoginOn = () => !ssoConfigured || process.env.ALLOW_EMAIL_LOGIN === 'true'
const SSO_ONLY = { error: 'sso_only', message: 'Vui lòng đăng nhập bằng tài khoản Microsoft của công ty.' }

function genCode() {
  return String(crypto.randomInt(100000, 1000000))
}

const MAX_ATTEMPTS = 5 // wrong guesses before a code is burned
const RESEND_GAP_SEC = 60 // at most one new code per minute…
const MAX_CODES_PER_HOUR = 5 // …and five per hour, per email

router.post('/request-code', async (req, res) => {
  if (!emailLoginOn()) return res.status(403).json(SSO_ONLY)
  const email = normalizeEmail(req.body?.email)
  if (!isCompanyEmail(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'Vui lòng dùng email công ty.' })
  }
  const recent = db.prepare(`SELECT COUNT(*) AS n, MAX(created_at) AS last FROM login_codes WHERE email = ? AND created_at > datetime('now', '-1 hour')`).get(email)
  if (recent.n >= MAX_CODES_PER_HOUR) {
    return res.status(429).json({ error: 'too_many_codes', message: 'Bạn đã xin mã quá nhiều lần. Vui lòng thử lại sau 1 giờ.' })
  }
  if (recent.last && Date.now() - new Date(recent.last.replace(' ', 'T') + 'Z').getTime() < RESEND_GAP_SEC * 1000) {
    return res.status(429).json({ error: 'too_soon', message: 'Vui lòng đợi 1 phút rồi mới xin mã mới.' })
  }
  const code = genCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  // Only one valid code per email: a new code cancels every earlier one.
  db.transaction(() => {
    db.prepare(`UPDATE login_codes SET consumed_at = datetime('now') WHERE email = ? AND consumed_at IS NULL`).run(email)
    db.prepare('INSERT INTO login_codes (email, code, expires_at) VALUES (?, ?, ?)').run(email, code, expiresAt)
  })()

  const { sent } = await sendMail({
    to: email,
    subject: 'Mã đăng nhập Zalopay AI Space',
    text: `Mã đăng nhập của bạn là: ${code}\nMã có hiệu lực trong 10 phút. Nếu không phải bạn yêu cầu, hãy bỏ qua email này.`,
  })

  const payload = { ok: true, emailed: sent }
  if (!sent && devLoginCodeAllowed) payload.devCode = code
  res.json(payload)
})

router.post('/verify-code', (req, res) => {
  if (!emailLoginOn()) return res.status(403).json(SSO_ONLY)
  const email = normalizeEmail(req.body?.email)
  const code = String(req.body?.code || '').trim()
  if (!isCompanyEmail(email) || !code) return res.status(400).json({ error: 'invalid_input' })

  const row = db.prepare(
    'SELECT * FROM login_codes WHERE email = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1'
  ).get(email)
  if (!row) return res.status(400).json({ error: 'no_code', message: 'Mã đã hết hiệu lực, vui lòng lấy mã mới.' })
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'expired_code', message: 'Mã đã hết hạn, vui lòng lấy mã mới.' })
  }
  const ok = code.length === row.code.length && crypto.timingSafeEqual(Buffer.from(code), Buffer.from(row.code))
  if (!ok) {
    const attempts = row.attempts + 1
    const burned = attempts >= MAX_ATTEMPTS
    db.prepare(`UPDATE login_codes SET attempts = ?, consumed_at = CASE WHEN ? THEN datetime('now') ELSE consumed_at END WHERE id = ?`).run(attempts, burned ? 1 : 0, row.id)
    return burned
      ? res.status(429).json({ error: 'too_many_attempts', message: `Bạn đã nhập sai ${MAX_ATTEMPTS} lần, mã này đã bị huỷ. Vui lòng lấy mã mới.` })
      : res.status(400).json({ error: 'invalid_code', message: `Mã không đúng. Bạn còn ${MAX_ATTEMPTS - attempts} lần thử.` })
  }
  db.prepare('UPDATE login_codes SET consumed_at = datetime(\'now\') WHERE id = ?').run(row.id)

  const user = getOrCreateUser(email)
  issueSession(res, user)
  res.json({ ok: true, user: publicUser(user) })
})

router.get('/config', (req, res) => {
  res.json({ ssoEnabled: ssoConfigured, emailLogin: emailLoginOn(), maintenance: maintenanceOn() })
})

router.get('/sso/login', async (req, res) => {
  if (!ssoConfigured) return res.status(404).send('SSO chưa được cấu hình.')
  try {
    const config = await getOidcConfig()
    const codeVerifier = client.randomPKCECodeVerifier()
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
    const state = client.randomState()
    const rawNext = String(req.query.next || '/')
    const next = /^\/(?![\/\\])/.test(rawNext) && !rawNext.startsWith('/api/') ? rawNext : '/'
    // ?basic=1 is the retry after Microsoft refused the directory permission: plain sign-in only.
    const graph = req.query.basic !== '1' && SSO_SCOPE !== SSO_SCOPE_BASE

    res.cookie(SSO_COOKIE, JSON.stringify({ state, codeVerifier, next, graph }), {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 5 * 60 * 1000,
    })

    const authUrl = client.buildAuthorizationUrl(config, {
      redirect_uri: SSO_REDIRECT_URI,
      scope: graph ? SSO_SCOPE : SSO_SCOPE_BASE,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    })
    res.redirect(authUrl.href)
  } catch (err) {
    console.error('[sso] login init failed', err)
    res.status(500).send('Không khởi tạo được đăng nhập SSO.')
  }
})

router.get('/sso/callback', async (req, res) => {
  if (!ssoConfigured) return res.status(404).send('SSO chưa được cấu hình.')
  const pendingRaw = req.cookies?.[SSO_COOKIE]
  res.clearCookie(SSO_COOKIE)
  if (!pendingRaw) return res.status(400).send('Phiên đăng nhập đã hết hạn, vui lòng thử lại.')

  try {
    const { state, codeVerifier, next, graph } = JSON.parse(pendingRaw)
    // Directory permission not consented (e.g. AADSTS65001): never block sign-in over it —
    // start over asking only for the basic scopes.
    if (graph && req.query.error) {
      console.error('[sso] directory scope refused, retrying basic sign-in:', req.query.error, String(req.query.error_description || '').slice(0, 200))
      return res.redirect('/api/auth/sso/login?basic=1&next=' + encodeURIComponent(typeof next === 'string' ? next : '/'))
    }
    const config = await getOidcConfig()
    const currentUrl = new URL(req.originalUrl, SSO_REDIRECT_URI)
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState: state,
    })
    const claims = tokens.claims()
    const email = normalizeEmail(claims.email || claims.preferred_username)
    if (!isCompanyEmail(email)) {
      return res.status(403).send('Tài khoản Microsoft này không thuộc domain công ty được phép.')
    }
    // Only Zalopay staff: Microsoft's organisation fields decide (staffCheck.js), before any account is made.
    const org = await orgOf(tokens.access_token)
    const v = verdict(email, org)
    if (!v.allowed) {
      console.warn('[staff] sign-in refused:', email, org ? JSON.stringify(org) : 'no org info')
      // The "no access" page can ask the admins for access with this (who Microsoft says they are).
      res.cookie(ACCESS_COOKIE, accessTicket(email, claims.name || '', org), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 2 * 3600 * 1000, path: '/api/auth' })
      return res.redirect('/no-access')
    }
    const user = getOrCreateUser(email)
    saveOrg(user.id, org, v.staff)
    // Name and department always come from Microsoft (people can't edit them, so nobody can pose as someone else).
    if (claims.name && user.name !== claims.name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(claims.name, user.id)
    }
    // Department for the admin "by team" stats.
    const team = String(org?.department || '').trim().slice(0, 120)
    if (team) db.prepare('UPDATE users SET team = ? WHERE id = ?').run(team, user.id)
    if (graph) saveGraphTokens(user.id, tokens)
    issueSession(res, db.prepare('SELECT * FROM users WHERE id = ?').get(user.id))
    res.redirect(typeof next === 'string' && /^\/(?![\/\\])/.test(next) ? next : '/')
  } catch (err) {
    console.error('[sso] callback failed', err)
    res.status(500).send('Đăng nhập SSO thất bại, vui lòng thử lại hoặc dùng đăng nhập bằng mã email.')
  }
})

// ---- Turned away at sign-in: ask the admins for access ----
const lastRequest = (email) => db.prepare('SELECT * FROM access_requests WHERE email = ? ORDER BY id DESC LIMIT 1').get(email)
router.get('/access-request', (req, res) => {
  const tk = readTicket(req.cookies?.[ACCESS_COOKIE])
  if (!tk) return res.json({ ticket: false })
  const last = lastRequest(tk.email)
  res.json({ ticket: true, email: tk.email, name: tk.name, company: tk.org?.companyName || '', department: tk.org?.department || '', status: last ? last.status : 'none' })
})
router.post('/access-request', async (req, res) => {
  const tk = readTicket(req.cookies?.[ACCESS_COOKIE])
  if (!tk) return res.status(401).json({ error: 'no_ticket', message: 'Phiên đã hết hạn. Vui lòng bấm Đăng nhập lại rồi gửi yêu cầu.' })
  const last = lastRequest(tk.email)
  if (last && last.status === 'pending') return res.json({ status: 'pending' })
  const note = String(req.body?.note || '').replace(/\r\n/g, '\n').trim().slice(0, 500)
  db.prepare('INSERT INTO access_requests (email, name, org_info, note) VALUES (?, ?, ?, ?)').run(tk.email, String(tk.name || '').slice(0, 120), tk.org ? JSON.stringify(tk.org) : null, note)
  const who = tk.name || tk.email
  const company = tk.org?.companyName ? ` (công ty trên Microsoft: ${tk.org.companyName})` : ' (Microsoft không ghi công ty)'
  for (const to of adminEmails()) {
    notify(to, { kind: 'access', text: `${who} xin quyền vào AI Space${company}`, href: '/admin#access', actor: tk.name || '' })
    sendMail({ to, subject: `Yêu cầu truy cập Zalopay AI Space: ${who}`, text: `${who} <${tk.email}>${company} bị chặn khi đăng nhập và xin quyền truy cập.${note ? `\n\nLời nhắn: ${note}` : ''}\n\nKiểm tra đúng là nhân viên Zalopay rồi duyệt tại: ${appUrl(req)}/admin#access` }).catch(() => {})
  }
  res.json({ status: 'pending' })
})

router.post('/logout', (req, res) => {
  if (req.user) dropGraphTokens(req.user.id)
  clearSession(req, res)
  res.json({ ok: true })
})

// Heartbeat from the web app: which page this person has open (for the admin "đang online" list).
router.post('/presence', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'login_required' })
  touch(req.user.id, req.body?.path)
  res.json({ ok: true })
})

router.get('/me', (req, res) => {
  res.json({ user: publicUser(req.user) })
})

router.patch('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'login_required' })
  // Name and team are not editable here: they come from the Microsoft account at sign-in (anti-impersonation).
  if (req.body?.anonAlias !== undefined) {
    const alias = String(req.body.anonAlias || '').replace(/\s+/g, ' ').trim().slice(0, 40)
    db.prepare('UPDATE users SET anon_alias = ? WHERE id = ?').run(alias || null, req.user.id)
  }
  if (req.body?.tourSeen === true) db.prepare("UPDATE users SET tour_seen_at = COALESCE(tour_seen_at, datetime('now')) WHERE id = ?").run(req.user.id)
  if (req.body?.avatarColor !== undefined) {
    const color = AVATAR_COLORS.includes(req.body.avatarColor) ? req.body.avatarColor : null
    db.prepare('UPDATE users SET avatar_color = ? WHERE id = ?').run(color, req.user.id)
  }
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json({ user: publicUser(updated) })
})

// Avatar photo: the client crops/resizes to a 256px square first; we only accept a small image.
const MAX_AVATAR = 400 * 1024
router.put('/me/avatar', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'login_required' })
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.image || ''))
  if (!m) return res.status(400).json({ error: 'bad_image' })
  const data = Buffer.from(m[2], 'base64')
  if (!data.length || data.length > MAX_AVATAR) return res.status(400).json({ error: 'too_large' })
  db.prepare('UPDATE users SET avatar_mime = ?, avatar_data = ? WHERE id = ?').run(m[1], data, req.user.id)
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) })
})
router.delete('/me/avatar', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'login_required' })
  db.prepare('UPDATE users SET avatar_mime = NULL, avatar_data = NULL WHERE id = ?').run(req.user.id)
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) })
})
router.get('/avatar/:id', (req, res) => {
  if (!req.user) return res.status(401).end()
  const u = db.prepare('SELECT avatar_mime, avatar_data FROM users WHERE id = ?').get(Number(req.params.id))
  if (!u || !u.avatar_data) return res.status(404).end()
  // URLs carry a content hash (?v=), so the browser can keep each version for a long time.
  res.set('Content-Type', u.avatar_mime).set('Cache-Control', 'private, max-age=31536000, immutable').send(u.avatar_data)
})

// Live check while typing an anonymous display name (the server also blocks it on save).
router.get('/alias-check', requireAuth, (req, res) => {
  const taken = aliasTaken(String(req.query.alias || '').slice(0, 40), req.user.id)
  res.json({ taken, message: taken ? ALIAS_TAKEN_MESSAGE : '' })
})

router.get('/avatar-colors', (req, res) => {
  res.json({ colors: AVATAR_COLORS })
})

// Mention picker directory: people who have signed in, plus (when Graph access is granted)
// anyone in the company directory. `mention` is the token to insert after "@".
const fold = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()
router.get('/users', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase().slice(0, 64)
  const me = req.user.email.toLowerCase()
  const known = db.prepare('SELECT id, email, name, initials, team, avatar_color, avatar_mime, avatar_data FROM users ORDER BY name COLLATE NOCASE').all()
    .filter((u) => u.email.toLowerCase() !== me)
    .filter((u) => !q || fold(u.name).replace(/\s+/g, '').includes(fold(q).replace(/\s+/g, '')) || u.email.toLowerCase().includes(q))
    .slice(0, 8)
    .map((u) => ({ key: u.email.toLowerCase(), name: u.name, mention: handleOf(u.email), sub: '@' + handleOf(u.email) + (u.team ? ' · ' + u.team : ''), initials: initialsOf(u), avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u) }))
  const seen = new Set([me, ...known.map((u) => u.key)])
  const dir = q ? (await searchDirectory(q, req.user.id)).filter((u) => !seen.has(u.email)).map((u) => ({ key: u.email, name: u.name, mention: u.email, sub: u.email + (u.title ? ' · ' + u.title : ''), initials: u.initials, avatarColor: null })) : []
  res.json({ users: [...known, ...dir].slice(0, 10), domains: companyDomains(), directory: directoryEnabled(), relogin: needsRelogin(req.user.id) })
})

export default router
