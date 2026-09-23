import jwt from 'jsonwebtoken'
import { db } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const COOKIE_NAME = 'session'

const ALLOWED_DOMAINS = String(process.env.COMPANY_EMAIL_DOMAINS || 'zalopay.vn,vng.com.vn')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)

export function isCompanyEmail(email) {
  const e = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false
  return ALLOWED_DOMAINS.some((d) => e.endsWith('@' + d))
}

function initialsFor(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)

export function getOrCreateUser(email) {
  const isAdmin = ADMIN_EMAILS.includes(email) ? 1 : 0
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (existing) {
    if (isAdmin && !existing.is_admin) db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(existing.id)
    return db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id)
  }
  const localPart = email.split('@')[0]
  const name = localPart.replace(/[._]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const id = db.prepare('INSERT INTO users (email, name, initials, team, is_admin) VALUES (?, ?, ?, ?, ?)')
    .run(email, name, initialsFor(name), '', isAdmin).lastInsertRowid
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
}

export function issueSession(res, user) {
  const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '30d' })
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME)
}

export function currentUser(req) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    return db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid) || null
  } catch {
    return null
  }
}

export function attachUser(req, _res, next) {
  req.user = currentUser(req)
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'login_required' })
  next()
}

export function publicUser(u) {
  if (!u) return null
  return { id: u.id, name: u.name, initials: u.initials, team: u.team, email: u.email, isAdmin: !!u.is_admin }
}
