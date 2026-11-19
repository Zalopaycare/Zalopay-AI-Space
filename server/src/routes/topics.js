import express from 'express'
import { db, nextId } from '../db.js'
import { requireAuth } from '../auth.js'
import { colorOf, avatarUrlOf } from '../avatarColors.js'
import { domainName, initialsOf, appUrl, notifyMentions, handleOf } from '../mentions.js'
import { notify, notifyOnce, notifyParticipants } from '../notifications.js'
import { sendMail } from '../mailer.js'
import { removalCheck, afterRemoval } from '../moderation.js'

// "Muốn nghe" (the second tab of the AI Space page): topics people would like someone to share about.
// Anyone posts one (a title and a few lines), others press "Mình cũng muốn nghe" (+1) so the most wanted
// rise to the top, and talk about it in the comments (replies and likes as under an event), tagging
// colleagues who could share it. The one who posted hears of every +1 and comment.

db.exec(`
CREATE TABLE IF NOT EXISTS topic_requests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  author_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT
);
CREATE TABLE IF NOT EXISTS topic_votes (
  topic_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (topic_id, user_id)
);
CREATE TABLE IF NOT EXISTS topic_saves (
  topic_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (topic_id, user_id)
);
CREATE TABLE IF NOT EXISTS topic_comments (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  parent_id TEXT,
  reply_to_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS topic_comments_topic ON topic_comments (topic_id, created_at);
CREATE TABLE IF NOT EXISTS topic_comment_likes (
  comment_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (comment_id, user_id)
);
`)

const router = express.Router()
const byId = (id) => db.prepare('SELECT * FROM topic_requests WHERE id = ?').get(id)
const userById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id)
const person = (u) => (u ? { id: u.id, name: domainName(u.email, u.name), fullName: u.name, initials: initialsOf(u), avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u) } : null)
const voterIds = (id) => db.prepare('SELECT user_id FROM topic_votes WHERE topic_id = ? ORDER BY created_at').all(id).map((r) => r.user_id)
const commentCount = (id) => db.prepare('SELECT COUNT(*) n FROM topic_comments WHERE topic_id = ?').get(id).n
const clean = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max)
const href = (id) => `/?tab=wish&topic=${encodeURIComponent(id)}`

function shape(t, me) {
  const ids = voterIds(t.id)
  return {
    id: t.id, title: t.title, detail: t.detail, createdAt: t.created_at, author: person(userById(t.author_id)),
    // only the one who posted it edits or deletes it (others report it; admins remove it from the Admin Console)
    isMine: !!me && t.author_id === me.id,
    saved: !!me && !!db.prepare('SELECT 1 FROM topic_saves WHERE topic_id = ? AND user_id = ?').get(t.id, me.id),
    votes: ids.length, voted: !!me && ids.includes(me.id), voters: ids.slice(0, 8).map((uid) => person(userById(uid))).filter(Boolean),
    commentCount: commentCount(t.id),
  }
}
// as under an event: replies hang under a top-level comment (one level), likes { total, mine }
function commentsOf(id, me) {
  const rows = db.prepare('SELECT * FROM topic_comments WHERE topic_id = ? ORDER BY created_at, id').all(id)
  const authorOf = Object.fromEntries(rows.map((c) => [c.id, c.author_id]))
  return rows.map((c) => {
    const to = c.reply_to_id && authorOf[c.reply_to_id] ? userById(authorOf[c.reply_to_id]) : null
    return {
      id: c.id, body: c.body, time: c.created_at, author: person(userById(c.author_id)),
      parentId: c.parent_id || null, replyTo: to ? { name: domainName(to.email, to.name), handle: handleOf(to.email) } : null,
      likes: { total: db.prepare('SELECT COUNT(*) n FROM topic_comment_likes WHERE comment_id = ?').get(c.id).n, mine: !!me && !!db.prepare('SELECT 1 FROM topic_comment_likes WHERE comment_id = ? AND user_id = ?').get(c.id, me.id) },
      canDelete: !!me && (c.author_id === me.id || !!me.is_admin), isMine: !!me && c.author_id === me.id,
    }
  })
}
const withComments = (t, me) => ({ comments: commentsOf(t.id, me), commentCount: commentCount(t.id) })

// most wanted first, then the newest
router.get('/', (req, res) => {
  const rows = db.prepare(`SELECT t.*, (SELECT COUNT(*) FROM topic_votes v WHERE v.topic_id = t.id) votes FROM topic_requests t ORDER BY votes DESC, t.created_at DESC LIMIT 300`).all()
  res.json({ topics: rows.map((t) => shape(t, req.user)) })
})

router.get('/:id', (req, res) => {
  const t = byId(req.params.id)
  if (!t) return res.status(404).json({ error: 'not_found' })
  res.json({ topic: { ...shape(t, req.user), comments: commentsOf(t.id, req.user) } })
})

router.post('/', requireAuth, (req, res) => {
  const title = clean(req.body?.title, 160)
  const detail = clean(req.body?.detail, 2000)
  if (!title) return res.status(400).json({ error: 'invalid', message: 'Cần ghi nội dung bạn muốn nghe.' })
  const id = nextId('tp')
  db.prepare('INSERT INTO topic_requests (id, title, detail, author_id) VALUES (?, ?, ?, ?)').run(id, title, detail, req.user.id)
  // the one who posts it wants to hear it too
  db.prepare('INSERT INTO topic_votes (topic_id, user_id) VALUES (?, ?)').run(id, req.user.id)
  res.status(201).json({ topic: shape(byId(id), req.user) })
})

router.patch('/:id', requireAuth, (req, res) => {
  const t = byId(req.params.id)
  if (!t) return res.status(404).json({ error: 'not_found' })
  if (t.author_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'not_owner' })
  const title = clean(req.body?.title, 160)
  if (!title) return res.status(400).json({ error: 'invalid', message: 'Cần ghi nội dung bạn muốn nghe.' })
  // (the form asks only for the topic now; a detail written before stays unless one is sent)
  db.prepare("UPDATE topic_requests SET title = ?, detail = ?, edited_at = datetime('now') WHERE id = ?").run(title, req.body?.detail !== undefined ? clean(req.body.detail, 2000) : t.detail, t.id)
  res.json({ topic: shape(byId(t.id), req.user) })
})

router.delete('/:id', requireAuth, (req, res) => {
  const t = byId(req.params.id)
  if (!t) return res.status(404).json({ error: 'not_found' })
  const block = removalCheck(req, t.author_id)
  if (block) return res.status(block.status).json({ error: block.error })
  db.transaction(() => {
    for (const { id } of db.prepare('SELECT id FROM topic_comments WHERE topic_id = ?').all(t.id)) db.prepare('DELETE FROM topic_comment_likes WHERE comment_id = ?').run(id)
    db.prepare('DELETE FROM topic_comments WHERE topic_id = ?').run(t.id)
    db.prepare('DELETE FROM topic_votes WHERE topic_id = ?').run(t.id)
    db.prepare('DELETE FROM topic_saves WHERE topic_id = ?').run(t.id)
    db.prepare('DELETE FROM topic_requests WHERE id = ?').run(t.id)
  })()
  afterRemoval(req, { authorId: t.author_id, what: 'nội dung muốn nghe', title: t.title, content: t.detail || t.title })
  res.json({ ok: true })
})

// "Lưu": keep it in "Đã lưu" (a click saves, again takes it back)
router.post('/:id/save', requireAuth, (req, res) => {
  const t = byId(req.params.id)
  if (!t) return res.status(404).json({ error: 'not_found' })
  const had = db.prepare('SELECT 1 FROM topic_saves WHERE topic_id = ? AND user_id = ?').get(t.id, req.user.id)
  if (had) db.prepare('DELETE FROM topic_saves WHERE topic_id = ? AND user_id = ?').run(t.id, req.user.id)
  else db.prepare('INSERT INTO topic_saves (topic_id, user_id) VALUES (?, ?)').run(t.id, req.user.id)
  res.json({ topic: shape(byId(t.id), req.user) })
})

// "Mình cũng muốn nghe": a click adds you, again takes it back; the one who posted it sees the count grow
router.post('/:id/vote', requireAuth, (req, res) => {
  const t = byId(req.params.id)
  if (!t) return res.status(404).json({ error: 'not_found' })
  const had = db.prepare('SELECT 1 FROM topic_votes WHERE topic_id = ? AND user_id = ?').get(t.id, req.user.id)
  if (had) db.prepare('DELETE FROM topic_votes WHERE topic_id = ? AND user_id = ?').run(t.id, req.user.id)
  else db.prepare('INSERT INTO topic_votes (topic_id, user_id) VALUES (?, ?)').run(t.id, req.user.id)
  const author = userById(t.author_id)
  const others = voterIds(t.id).filter((uid) => uid !== t.author_id).length
  if (!had && author && author.id !== req.user.id) {
    notifyOnce(author.email, 'upvote', { ref: 'topicvote:' + t.id, text: others === 1 ? `${domainName(req.user.email, req.user.name)} cũng muốn nghe "${t.title}"` : `${others} người cũng muốn nghe "${t.title}"`, href: href(t.id), actor: req.user.name })
  }
  res.json({ topic: shape(byId(t.id), req.user) })
})

const MAX_COMMENT = 2000
router.post('/:id/comments', requireAuth, (req, res) => {
  const t = byId(req.params.id)
  if (!t) return res.status(404).json({ error: 'not_found' })
  const body = clean(req.body?.body, MAX_COMMENT)
  if (!body) return res.status(400).json({ error: 'empty_body' })
  const target = req.body?.replyToId ? db.prepare('SELECT * FROM topic_comments WHERE id = ? AND topic_id = ?').get(String(req.body.replyToId), t.id) : null
  const cid = nextId('tc')
  db.prepare('INSERT INTO topic_comments (id, topic_id, author_id, body, parent_id, reply_to_id) VALUES (?, ?, ?, ?, ?, ?)').run(cid, t.id, req.user.id, body, target ? target.parent_id || target.id : null, target ? target.id : null)
  const who = domainName(req.user.email, req.user.name)
  const link = href(t.id)
  const told = new Set([req.user.email.toLowerCase()])
  const tell = (u, text) => {
    if (!u || told.has(u.email.toLowerCase())) return
    told.add(u.email.toLowerCase())
    notify(u.email, { kind: 'comment', text, href: link, actor: req.user.name })
    sendMail({ to: u.email, subject: text, text: `${req.user.name}: "${body}"\n\nXem tại: ${appUrl(req)}${link}` }).catch(() => {})
  }
  tell(target ? userById(target.author_id) : null, `${who} đã trả lời bình luận của bạn ở "${t.title}"`)
  tell(userById(t.author_id), `${who} đã bình luận về nội dung bạn muốn nghe "${t.title}"`)
  notifyMentions(req, { text: body, where: `nội dung muốn nghe "${t.title}"`, path: link, skip: [...told] })
  const before = db.prepare('SELECT DISTINCT author_id FROM topic_comments WHERE topic_id = ? AND id != ?').all(t.id, cid).map((r) => r.author_id)
  notifyParticipants(before, [...told], { ref: 'joined:tp:' + t.id, text: `${who} cũng đã bình luận ở "${t.title}"`, href: link, actor: req.user.name })
  res.status(201).json(withComments(t, req.user))
})
router.delete('/:id/comments/:cid', requireAuth, (req, res) => {
  const c = db.prepare('SELECT * FROM topic_comments WHERE id = ? AND topic_id = ?').get(req.params.cid, req.params.id)
  if (!c) return res.status(404).json({ error: 'not_found' })
  const block = removalCheck(req, c.author_id)
  if (block) return res.status(block.status).json({ error: block.error })
  db.transaction(() => {
    const ids = [c.id, ...db.prepare('SELECT id FROM topic_comments WHERE parent_id = ?').all(c.id).map((r) => r.id)]
    for (const x of ids) db.prepare('DELETE FROM topic_comment_likes WHERE comment_id = ?').run(x)
    db.prepare('DELETE FROM topic_comments WHERE id = ? OR parent_id = ?').run(c.id, c.id)
  })()
  afterRemoval(req, { authorId: c.author_id, what: 'bình luận', title: '', content: c.body })
  res.json(withComments(byId(req.params.id), req.user))
})
router.post('/:id/comments/:cid/like', requireAuth, (req, res) => {
  const t = byId(req.params.id)
  const c = t && db.prepare('SELECT * FROM topic_comments WHERE id = ? AND topic_id = ?').get(req.params.cid, t.id)
  if (!c) return res.status(404).json({ error: 'not_found' })
  const had = db.prepare('SELECT 1 FROM topic_comment_likes WHERE comment_id = ? AND user_id = ?').get(c.id, req.user.id)
  if (had) db.prepare('DELETE FROM topic_comment_likes WHERE comment_id = ? AND user_id = ?').run(c.id, req.user.id)
  else db.prepare('INSERT INTO topic_comment_likes (comment_id, user_id) VALUES (?, ?)').run(c.id, req.user.id)
  const author = userById(c.author_id)
  const n = db.prepare('SELECT COUNT(*) n FROM topic_comment_likes WHERE comment_id = ?').get(c.id).n
  if (!had && author && author.id !== req.user.id) {
    notifyOnce(author.email, 'upvote', { ref: 'tclike:' + c.id, text: n === 1 ? `${domainName(req.user.email, req.user.name)} đã thích bình luận của bạn ở "${t.title}"` : `Bình luận của bạn ở "${t.title}" có ${n} lượt thích`, href: href(t.id), actor: req.user.name })
  }
  res.json(withComments(t, req.user))
})

export default router
