import express from 'express'
import { db } from '../db.js'
import { isCompanyEmail, getOrCreateUser, issueSession, clearSession, publicUser } from '../auth.js'
import { sendMail, devLoginCodeAllowed } from '../mailer.js'

const router = express.Router()

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
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json({ user: publicUser(updated) })
})

export default router
