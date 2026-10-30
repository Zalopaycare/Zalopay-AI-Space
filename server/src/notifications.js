import { SHOWCASE_IDS, PENDING_BY_ID } from './showcase.js'
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

// "Quan tâm" on a booth with no write-up yet: one notification per booth and owner, updated in place
// like the upvote one, pointing at the share form. Safe to call again with the same count.
export function notifyInterest(ownerEmail, { ref, count, title, href = '/use-cases?share=1' }) {
  if (!ownerEmail) return
  const email = String(ownerEmail).toLowerCase()
  const prev = db.prepare("SELECT * FROM notifications WHERE email = ? AND kind = 'interest' AND ref = ?").get(email, ref)
  if (count <= 0) { if (prev) db.prepare('DELETE FROM notifications WHERE id = ?').run(prev.id); return }
  const label = String(title || '').trim()
  const name = label ? ` "${label.length > 80 ? label.slice(0, 80).trimEnd() + '…' : label}"` : ''
  const text = `Use case${name} của bạn nhận được ${count} lượt quan tâm. Đăng Use Case ngay!`
  try {
    if (prev) {
      const grew = count > (Number((/(\d+) lượt quan tâm/.exec(prev.text) || [])[1]) || 0)
      db.prepare(`UPDATE notifications SET text = ?, href = ?${grew ? ", read = 0, created_at = datetime('now')" : ''} WHERE id = ?`).run(text.slice(0, 500), href, prev.id)
    } else {
      db.prepare("INSERT INTO notifications (email, kind, text, href, actor, ref) VALUES (?, 'interest', ?, ?, '', ?)").run(email, text.slice(0, 500), href, ref)
    }
  } catch (e) { console.error('[notifications] interest failed:', e.message) }
}

// "Chat với Admin": one notification per conversation and reader, rewritten with the newest message
// and marked unread again, so a busy chat doesn't flood the list.
export function notifyChat(email, { ref, text, href, actor = '' }) { notifyOnce(email, 'chat', { ref, text, href, actor }) }

/** Everyone who took part in a post (answered, commented) hears about new activity on it, so nothing
 *  about a post you're in passes you by. One notification per post and reader, rewritten with the
 *  latest each time, and in-app only so a busy post doesn't flood anyone's mailbox.
 *  `skip`: emails already told directly (the actor, the person replied to, the owner…). */
export function notifyParticipants(userIds, skip, { ref, text, href, actor = '' }) {
  const done = new Set([...skip].map((e) => String(e || '').toLowerCase()))
  for (const uid of new Set(userIds)) {
    const u = db.prepare('SELECT email FROM users WHERE id = ?').get(uid)
    if (!u || done.has(u.email.toLowerCase())) continue
    done.add(u.email.toLowerCase())
    notifyOnce(u.email, 'comment', { ref, text, href, actor })
  }
}

/** One notification of `kind` per ref and reader: rewritten, unread again and moved to the top when sent again. */
export function notifyOnce(email, kind, { ref, text, href, actor = '' }) {
  if (!email) return
  const to = String(email).toLowerCase()
  try {
    const prev = db.prepare('SELECT id FROM notifications WHERE email = ? AND kind = ? AND ref = ?').get(to, kind, ref)
    if (prev) db.prepare("UPDATE notifications SET text = ?, href = ?, actor = ?, read = 0, created_at = datetime('now') WHERE id = ?").run(String(text).slice(0, 500), href, actor, prev.id)
    else db.prepare('INSERT INTO notifications (email, kind, text, href, actor, ref) VALUES (?, ?, ?, ?, ?, ?)').run(to, kind, String(text).slice(0, 500), href, actor, ref)
  } catch (e) { console.error(`[notifications] ${kind} failed:`, e.message) }
}

const BUILTIN_CASES = new Set(SHOWCASE_IDS)
// `uid`: the reader; an archived post still exists for its author only.
function stillExists(r, uid) {
  const href = String(r.href || '')
  if (href.startsWith('/messages')) return false // "Tin nhắn" was taken down: its notifications lead nowhere
  let m = /^\/use-cases\/([^/?#]+)/.exec(href)
  if (m) { const id = decodeURIComponent(m[1]); return BUILTIN_CASES.has(id) || PENDING_BY_ID.has(id) || !!db.prepare('SELECT 1 FROM use_case_submissions WHERE id = ? AND (archived_at IS NULL OR author_id = ?)').get(id, uid) }
  m = /^\/questions(?:#q=|\/)([^&/?#]+)/.exec(href) // old "#q=" links and the new /questions/<id>
  if (m) return !!db.prepare('SELECT 1 FROM questions WHERE id = ? AND (archived_at IS NULL OR author_id = ?)').get(decodeURIComponent(m[1]), uid)
  return true
}

const router = express.Router()

router.get('/', requireAuth, (req, res) => {
  const email = req.user.email.toLowerCase()
  // Hide notifications about posts that no longer exist (e.g. a use case its author deleted),
  // so the list and the unread badge only count things you can still open. Rows stay in the DB.
  const rows = db.prepare('SELECT * FROM notifications WHERE email = ? ORDER BY created_at DESC, id DESC LIMIT 200').all(email).filter((r) => stillExists(r, req.user.id)).slice(0, 100)
  const unread = rows.filter((r) => !r.read).length
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
