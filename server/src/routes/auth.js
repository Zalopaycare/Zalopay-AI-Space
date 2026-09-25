import express from 'express'
import * as client from 'openid-client'
import { db } from '../db.js'
import { isCompanyEmail, getOrCreateUser, issueSession, clearSession, publicUser } from '../auth.js'
import { sendMail, devLoginCodeAllowed } from '../mailer.js'
import { ssoConfigured, getOidcConfig, SSO_SCOPE, SSO_REDIRECT_URI } from '../sso.js'
import { AVATAR_COLORS } from '../avatarColors.js'

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

    res.cookie(SSO_COOKIE, JSON.stringify({ state, codeVerifier }), {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 5 * 60 * 1000,
    })

    const authUrl = client.buildAuthorizationUrl(config, {
      redirect_uri: SSO_REDIRECT_URI,
      scope: SSO_SCOPE,
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
    const { state, codeVerifier } = JSON.parse(pendingRaw)
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
    issueSession(res, db.prepare('SELECT * FROM users WHERE id = ?').get(user.id))
    res.redirect('/')
  } catch (err) {
    console.error('[sso] callback failed', err)
    res.status(500).send('Đăng nhập SSO thất bại, vui lòng thử lại hoặc dùng đăng nhập bằng mã email.')
  }
})

router.post('/logout', (req, res) => {
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

export default router
