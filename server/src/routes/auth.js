import express from 'express'
import * as client from 'openid-client'
import { db } from '../db.js'
import { isCompanyEmail, getOrCreateUser, issueSession, clearSession, publicUser } from '../auth.js'
import { sendMail, devLoginCodeAllowed } from '../mailer.js'
import { ssoConfigured, getOidcConfig, SSO_SCOPE, SSO_SCOPE_BASE, SSO_REDIRECT_URI } from '../sso.js'
import { saveGraphTokens, dropGraphTokens } from '../graphTokens.js'
import { AVATAR_COLORS } from '../avatarColors.js'
import { requireAuth } from '../auth.js'
import { handleOf } from '../mentions.js'
import { searchDirectory, directoryEnabled, needsRelogin } from '../directory.js'
import { companyDomains } from '../auth.js'

const router = express.Router()
const SSO_COOKIE = 'sso_pending'

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

router.post('/request-code', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!isCompanyEmail(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'Vui lòng dùng email công ty.' })
  }
  const code = genCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  db.prepare('INSERT INTO login_codes (email, code, expires_at) VALUES (?, ?, ?)').run(email, code, expiresAt)

  const { sent } = await sendMail({
    to: email,
    subject: 'Mã đăng nhập Zalopay AI Community',
    text: `Mã đăng nhập của bạn là: ${code}\nMã có hiệu lực trong 10 phút. Nếu không phải bạn yêu cầu, hãy bỏ qua email này.`,
  })

  const payload = { ok: true, emailed: sent }
  if (!sent && devLoginCodeAllowed) payload.devCode = code
  res.json(payload)
})

router.post('/verify-code', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const code = String(req.body?.code || '').trim()
  if (!isCompanyEmail(email) || !code) return res.status(400).json({ error: 'invalid_input' })

  const row = db.prepare(
    'SELECT * FROM login_codes WHERE email = ? AND code = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1'
  ).get(email, code)
  if (!row) return res.status(400).json({ error: 'invalid_code', message: 'Mã không đúng.' })
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'expired_code', message: 'Mã đã hết hạn, vui lòng lấy mã mới.' })
  }
  db.prepare('UPDATE login_codes SET consumed_at = datetime(\'now\') WHERE id = ?').run(row.id)

  const user = getOrCreateUser(email)
  issueSession(res, user)
  res.json({ ok: true, user: publicUser(user) })
})

router.get('/config', (req, res) => {
  res.json({ ssoEnabled: ssoConfigured })
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
    const email = String(claims.email || claims.preferred_username || '').trim().toLowerCase()
    if (!isCompanyEmail(email)) {
      return res.status(403).send('Tài khoản Microsoft này không thuộc domain công ty được phép.')
    }
    const user = getOrCreateUser(email)
    if (claims.name && user.name !== claims.name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(claims.name, user.id)
    }
    if (graph) saveGraphTokens(user.id, tokens)
    issueSession(res, db.prepare('SELECT * FROM users WHERE id = ?').get(user.id))
    res.redirect(typeof next === 'string' && /^\/(?![\/\\])/.test(next) ? next : '/')
  } catch (err) {
    console.error('[sso] callback failed', err)
    res.status(500).send('Đăng nhập SSO thất bại, vui lòng thử lại hoặc dùng đăng nhập bằng mã email.')
  }
})

router.post('/logout', (req, res) => {
  if (req.user) dropGraphTokens(req.user.id)
  clearSession(res)
  res.json({ ok: true })
})

router.get('/me', (req, res) => {
  res.json({ user: publicUser(req.user) })
})

router.patch('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'login_required' })
  const name = String(req.body?.name || '').trim()
  const team = String(req.body?.team || '').trim()
  if (name) {
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || req.user.initials
    db.prepare('UPDATE users SET name = ?, initials = ? WHERE id = ?').run(name, initials, req.user.id)
  }
  if (team) db.prepare('UPDATE users SET team = ? WHERE id = ?').run(team, req.user.id)
  if (req.body?.avatarColor !== undefined) {
    const color = AVATAR_COLORS.includes(req.body.avatarColor) ? req.body.avatarColor : null
    db.prepare('UPDATE users SET avatar_color = ? WHERE id = ?').run(color, req.user.id)
  }
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json({ user: publicUser(updated) })
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
  const known = db.prepare('SELECT id, email, name, initials, team, avatar_color FROM users ORDER BY name COLLATE NOCASE').all()
    .filter((u) => u.email.toLowerCase() !== me)
    .filter((u) => !q || fold(u.name).replace(/\s+/g, '').includes(fold(q).replace(/\s+/g, '')) || u.email.toLowerCase().includes(q))
    .slice(0, 8)
    .map((u) => ({ key: u.email.toLowerCase(), name: u.name, mention: handleOf(u.email), sub: '@' + handleOf(u.email) + (u.team ? ' · ' + u.team : ''), initials: u.initials, avatarColor: u.avatar_color || null }))
  const seen = new Set([me, ...known.map((u) => u.key)])
  const dir = q ? (await searchDirectory(q, req.user.id)).filter((u) => !seen.has(u.email)).map((u) => ({ key: u.email, name: u.name, mention: u.email, sub: u.email + (u.title ? ' · ' + u.title : ''), initials: u.initials, avatarColor: null })) : []
  res.json({ users: [...known, ...dir].slice(0, 10), domains: companyDomains(), directory: directoryEnabled(), relogin: needsRelogin(req.user.id) })
})

export default router
