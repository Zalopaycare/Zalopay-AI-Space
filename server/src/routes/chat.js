import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'
import { colorOf, avatarUrlOf } from '../avatarColors.js'
import { domainName, initialsOf } from '../mentions.js'
import { notifyChat } from '../notifications.js'
import { decodeCommentFiles, saveCommentFiles, commentFilesOf } from '../commentFiles.js'

// "Chat với Admin": each person has one conversation with the admin team, Messenger-style.
// People read and write their own (/me, the /chat page); admins share one inbox of every conversation
// (/threads, the Admin Console's "Hộp thư").
// Clients poll with ?after=<last id> for new messages; seen marks drive the unread badges.

const router = express.Router()
const MAX_BODY = 2000

const userById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id)
const who = (u) => (u ? { id: u.id, name: domainName(u.email, u.name), initials: initialsOf(u), avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u) } : null)

// The person chatting sees replies as from "Admin": which admin answered (name, avatar) stays out of their copy.
const ADMIN = { id: 0, name: 'Admin' }
function messagesOf(userId, after = 0, { asUser = false } = {}) {
  const rows = db.prepare('SELECT * FROM admin_chat_messages WHERE user_id = ? AND id > ? ORDER BY id LIMIT 500').all(userId, Number(after) || 0)
  const people = new Map()
  const person = (id) => { if (!people.has(id)) people.set(id, who(userById(id))); return people.get(id) }
  return rows.map((r) => ({ id: r.id, body: r.body, files: commentFilesOf('chat', String(r.id)), fromAdmin: !!r.from_admin, sender: asUser && r.from_admin ? ADMIN : person(r.sender_id), time: r.created_at }))
}

const lastId = (userId) => db.prepare('SELECT MAX(id) n FROM admin_chat_messages WHERE user_id = ?').get(userId).n || 0
function markSeen(userId, side) {
  const col = side === 'admin' ? 'admin_seen' : 'user_seen'
  db.prepare(`INSERT INTO admin_chat_seen (user_id, ${col}) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET ${col} = MAX(${col}, excluded.${col})`).run(userId, lastId(userId))
}
const seenOf = (userId) => db.prepare('SELECT * FROM admin_chat_seen WHERE user_id = ?').get(userId) || { user_seen: 0, admin_seen: 0 }

const adminEmails = (exceptEmail) => {
  const env = String(process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  const dbAdmins = db.prepare('SELECT email FROM users WHERE is_admin = 1').all().map((u) => u.email.toLowerCase())
  return [...new Set([...env, ...dbAdmins])].filter((e) => e !== String(exceptEmail || '').toLowerCase())
}
const preview = (body, files = []) => {
  const s = String(body).replace(/\s+/g, ' ').trim()
  if (!s) return files.some((f) => /^image\//.test(f.mime)) ? '[Hình ảnh]' : '[File]'
  return s.length > 90 ? s.slice(0, 90).trimEnd() + '…' : s
}
const cleanBody = (v) => String(v || '').replace(/\r\n/g, '\n').trim().slice(0, MAX_BODY)

// Text and/or attachments from a request body; null when it can't be sent (nothing in it, or a bad file).
function readMessage(b) {
  const body = cleanBody(b?.body)
  const files = decodeCommentFiles(b?.files)
  if (files === null) return { error: 'bad_files' }
  if (!body && !files.length) return { error: 'empty' }
  return { body, files }
}

function insert(userId, senderId, fromAdmin, body, files = []) {
  const r = db.prepare('INSERT INTO admin_chat_messages (user_id, sender_id, from_admin, body) VALUES (?, ?, ?, ?)').run(userId, senderId, fromAdmin ? 1 : 0, body)
  if (files.length) saveCommentFiles('chat', String(r.lastInsertRowid), files)
  // the sender has obviously seen everything up to their own message
  markSeen(userId, fromAdmin ? 'admin' : 'user')
  return messagesOf(userId, Number(r.lastInsertRowid) - 1)[0]
}

// ---- my own conversation ----
router.get('/me', requireAuth, (req, res) => {
  const messages = messagesOf(req.user.id, req.query.after, { asUser: true })
  if (messages.length || !Number(req.query.after)) markSeen(req.user.id, 'user')
  res.json({ messages })
})

router.post('/me', requireAuth, (req, res) => {
  const { body, files, error } = readMessage(req.body)
  if (error) return res.status(400).json({ error })
  const message = insert(req.user.id, req.user.id, false, body, files)
  const name = domainName(req.user.email, req.user.name)
  for (const to of adminEmails(req.user.email)) {
    notifyChat(to, { ref: 'chat:' + req.user.id, text: `${name} nhắn Admin: "${preview(body, files)}"`, href: '/admin#inbox/' + req.user.id, actor: req.user.name })
  }
  res.status(201).json({ message })
})

// Badges: admin replies I haven't read; for admins also how many conversations wait for an answer.
router.get('/unread', requireAuth, (req, res) => {
  const mine = db.prepare('SELECT COUNT(*) n FROM admin_chat_messages WHERE user_id = ? AND from_admin = 1 AND id > ?').get(req.user.id, seenOf(req.user.id).user_seen).n
  let inbox = 0
  if (req.user.is_admin) {
    inbox = db.prepare(`SELECT COUNT(*) n FROM (SELECT user_id, MAX(id) last FROM admin_chat_messages WHERE from_admin = 0 GROUP BY user_id) m
      LEFT JOIN admin_chat_seen s ON s.user_id = m.user_id WHERE m.last > COALESCE(s.admin_seen, 0)`).get().n
  }
  res.json({ mine, inbox })
})

// ---- admin inbox ----
const requireAdmin = (req, res, next) => (req.user?.is_admin ? next() : res.status(403).json({ error: 'admin_only' }))

router.get('/threads', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT m.user_id, m.id, m.body, m.from_admin, m.sender_id, m.created_at FROM admin_chat_messages m
    JOIN (SELECT user_id, MAX(id) last FROM admin_chat_messages GROUP BY user_id) l ON l.last = m.id ORDER BY m.id DESC`).all()
  const unreadStmt = db.prepare('SELECT COUNT(*) n FROM admin_chat_messages WHERE user_id = ? AND from_admin = 0 AND id > ?')
  res.json({
    threads: rows.map((r) => ({
      user: who(userById(r.user_id)),
      last: { body: preview(r.body, db.prepare("SELECT mime FROM comment_files WHERE kind = 'chat' AND target_id = ?").all(String(r.id))), fromAdmin: !!r.from_admin, by: r.from_admin ? who(userById(r.sender_id)) : null, time: r.created_at },
      unread: unreadStmt.get(r.user_id, seenOf(r.user_id).admin_seen).n,
    })),
  })
})

router.get('/threads/:uid', requireAuth, requireAdmin, (req, res) => {
  const u = userById(Number(req.params.uid))
  if (!u) return res.status(404).json({ error: 'not_found' })
  const messages = messagesOf(u.id, req.query.after)
  if (messages.length || !Number(req.query.after)) markSeen(u.id, 'admin')
  res.json({ user: who(u), messages })
})

router.post('/threads/:uid', requireAuth, requireAdmin, (req, res) => {
  const u = userById(Number(req.params.uid))
  if (!u) return res.status(404).json({ error: 'not_found' })
  const { body, files, error } = readMessage(req.body)
  if (error) return res.status(400).json({ error })
  const message = insert(u.id, req.user.id, true, body, files)
  notifyChat(u.email, { ref: 'chat:' + u.id, text: `Admin đã trả lời bạn: "${preview(body, files)}"`, href: '/chat', actor: 'Admin' })
  // the other admins' copy of this conversation's notification is answered now
  db.prepare("UPDATE notifications SET read = 1 WHERE kind = 'chat' AND ref = ? AND email != ?").run('chat:' + u.id, u.email.toLowerCase())
  res.status(201).json({ message })
})

export default router
