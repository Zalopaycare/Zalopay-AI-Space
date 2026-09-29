import express from 'express'
import { db } from './db.js'
import { requireAuth } from './auth.js'

// In-app notifications, keyed by email so people who were @-mentioned before their first
// sign-in still find them waiting. Every place that emails someone also records one here.

const insert = db.prepare('INSERT INTO notifications (email, kind, text, href, actor) VALUES (?, ?, ?, ?, ?)')

/** kind: answer | comment | mention | approved | rejected | submission */
export function notify(email, { kind, text, href = '', actor = '' }) {
  if (!email) return
  try { insert.run(String(email).toLowerCase(), kind, String(text).slice(0, 500), href, actor) } catch (e) { console.error('[notifications] insert failed:', e.message) }
}

const router = express.Router()

router.get('/', requireAuth, (req, res) => {
  const email = req.user.email.toLowerCase()
  const rows = db.prepare('SELECT * FROM notifications WHERE email = ? ORDER BY created_at DESC, id DESC LIMIT 100').all(email)
  const unread = db.prepare('SELECT COUNT(*) n FROM notifications WHERE email = ? AND read = 0').get(email).n
  res.json({
    unread,
    notifications: rows.map((r) => ({ id: r.id, kind: r.kind, text: r.text, href: r.href, actor: r.actor, time: r.created_at, unread: !r.read })),
  })
})

// Body { ids: [...] } marks those; no ids marks everything.
router.post('/read', requireAuth, (req, res) => {
  const email = req.user.email.toLowerCase()
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : null
  if (ids && ids.length) {
    const stmt = db.prepare('UPDATE notifications SET read = 1 WHERE email = ? AND id = ?')
    db.transaction(() => ids.forEach((id) => stmt.run(email, id)))()
  } else if (!ids) {
    db.prepare('UPDATE notifications SET read = 1 WHERE email = ?').run(email)
  }
  res.json({ ok: true })
})

export default router
