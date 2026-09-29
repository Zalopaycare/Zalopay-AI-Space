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

// One upvote notification per post, updated in place as votes come in (and removed when they're
// all taken back): "…1 upvote từ ThyNDM" for the first voter, "…N upvotes" from two voters on.
{
  const cols = db.prepare('PRAGMA table_info(notifications)').all().map((c) => c.name)
  if (!cols.includes('ref')) db.exec('ALTER TABLE notifications ADD COLUMN ref TEXT')
}
export function notifyUpvotes(ownerEmail, { ref, count, lastVoter, title, href }) {
  if (!ownerEmail) return
  const email = String(ownerEmail).toLowerCase()
  const prev = db.prepare("SELECT * FROM notifications WHERE email = ? AND kind = 'upvote' AND ref = ?").get(email, ref)
  if (count <= 0) { if (prev) db.prepare('DELETE FROM notifications WHERE id = ?').run(prev.id); return }
  const label = String(title || '').trim()
  const tail = label ? ` — "${label.length > 80 ? label.slice(0, 80).trimEnd() + '…' : label}"` : ''
  const text = (count === 1 ? `Bài viết của bạn nhận được 1 upvote từ ${lastVoter}` : `Bài viết của bạn nhận được ${count} upvotes`) + tail
  try {
    if (prev) {
      // Only a new vote resurfaces it as unread; a vote being taken back just corrects the number.
      const grew = count > (Number((/(\d+) upvote/.exec(prev.text) || [])[1]) || 0)
      db.prepare(`UPDATE notifications SET text = ?, href = ?, actor = ?${grew ? ", read = 0, created_at = datetime('now')" : ''} WHERE id = ?`).run(text.slice(0, 500), href, lastVoter, prev.id)
    } else {
      db.prepare("INSERT INTO notifications (email, kind, text, href, actor, ref) VALUES (?, 'upvote', ?, ?, ?, ?)").run(email, text.slice(0, 500), href, lastVoter, ref)
    }
  } catch (e) { console.error('[notifications] upvote failed:', e.message) }
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
