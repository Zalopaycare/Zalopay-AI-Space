import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'
import { colorOf, avatarUrlOf } from '../avatarColors.js'
import { domainName, initialsOf, appUrl } from '../mentions.js'
import { sendMail } from '../mailer.js'
import { notifyOnce } from '../notifications.js'
import { decodeCommentFiles, saveCommentFiles, commentFilesOf } from '../commentFiles.js'
import { visibleShowcase, PENDING_BY_ID, coverOf } from '../showcase.js'

// "Tin nhắn": one-to-one conversations between people, like Threads' Messages. A message can carry a
// use case or a thread someone forwarded ("Gửi qua tin nhắn"), shown as a card in the chat.
// Clients poll with ?after=<last id>; seen marks (per person and conversation) drive the unread counts.
// The recipient also gets an email, once per unread run: the first message after they last read the
// conversation sends one, the ones after it don't, until they open it again.

const router = express.Router()
const MAX_BODY = 2000

const userById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id)
const who = (u) => (u ? { id: u.id, name: domainName(u.email, u.name), initials: initialsOf(u), avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u), team: u.team || '' } : null)
const BETWEEN = '((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))'
const preview = (body, files = [], share) => {
  const s = String(body || '').replace(/\s+/g, ' ').trim()
  if (s) return s.length > 90 ? s.slice(0, 90).trimEnd() + '…' : s
  if (share) return share.kind === 'thread' ? '[Đã gửi một thread]' : '[Đã gửi một use case]'
  return files.some((f) => /^image\//.test(f.mime || '')) || files.some((f) => f.image) ? '[Hình ảnh]' : '[File]'
}

// What a forwarded use case / thread looks like in the chat, read fresh each time (so edits and deletes show).
const excerpt = (v, n = 220) => { const s = String(v || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n).trimEnd() + '…' : s }
function shareCard(kind, id) {
  if (!kind || !id) return null
  if (kind === 'thread') {
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id)
    if (!q) return { kind, id, missing: true }
    const author = q.anonymous ? (q.alias || 'Anonymous') : (() => { const u = userById(q.author_id); return u ? domainName(u.email, u.name) : '' })()
    return {
      kind, id, href: '/questions/' + encodeURIComponent(id), author, time: q.created_at,
      text: excerpt([q.title, q.body].filter(Boolean).join('\n')),
      likes: db.prepare('SELECT COUNT(*) n FROM question_reactions WHERE question_id = ?').get(id).n,
      replies: db.prepare('SELECT COUNT(*) n FROM question_answers WHERE question_id = ?').get(id).n,
    }
  }
  if (kind === 'usecase') {
    const c = visibleShowcase().find((x) => x.id === id)
    if (c) return { kind, id, href: '/use-cases/' + id, title: c.title, owner: (c.members || []).join(', '), cover: c.cover ? String(c.cover).replace('/use-cases/', '/api/showcase/media/') : '' }
    const p = PENDING_BY_ID.get(id)
    if (p) return { kind, id, href: '/use-cases/' + id, title: p.title, owner: (p.members || []).join(', '), cover: coverOf(p.id) || '' }
    const s = db.prepare("SELECT id, title, extra, author_id, anonymous, alias, cover_data, edited_at, created_at FROM use_case_submissions WHERE id = ? AND review_status = 'approved'").get(id)
    if (s) {
      let members = []
      try { members = (JSON.parse(s.extra || '{}').members) || [] } catch { /* none */ }
      const u = userById(s.author_id)
      const owner = members.length ? members.join(', ') : s.anonymous ? (s.alias || 'Anonymous') : u ? domainName(u.email, u.name) : ''
      return { kind, id, href: '/use-cases/' + id, title: s.title, owner, cover: s.cover_data ? `/api/use-cases/submissions/${s.id}/cover?v=${encodeURIComponent(s.edited_at || s.created_at)}` : '' }
    }
    return { kind, id, missing: true }
  }
  return null
}

function messagesBetween(me, other, after = 0) {
  const rows = db.prepare(`SELECT * FROM dm_messages WHERE ${BETWEEN} AND id > ? ORDER BY id LIMIT 500`).all(me, other, other, me, Number(after) || 0)
  const people = new Map()
  const person = (id) => { if (!people.has(id)) people.set(id, who(userById(id))); return people.get(id) }
  return rows.map((r) => ({ id: r.id, body: r.body, files: commentFilesOf('dm', String(r.id)), share: shareCard(r.share_kind, r.share_id), sender: person(r.from_id), mine: r.from_id === me, time: r.created_at }))
}
const seenUpTo = (me, other) => (db.prepare('SELECT last_id FROM dm_seen WHERE user_id = ? AND other_id = ?').get(me, other) || { last_id: 0 }).last_id
function markSeen(me, other) {
  const last = db.prepare(`SELECT MAX(id) n FROM dm_messages WHERE ${BETWEEN}`).get(me, other, other, me).n || 0
  db.prepare('INSERT INTO dm_seen (user_id, other_id, last_id) VALUES (?, ?, ?) ON CONFLICT(user_id, other_id) DO UPDATE SET last_id = MAX(last_id, excluded.last_id)').run(me, other, last)
}
const unreadFrom = (me, other) => db.prepare('SELECT COUNT(*) n FROM dm_messages WHERE from_id = ? AND to_id = ? AND id > ?').get(other, me, seenUpTo(me, other)).n

// ---- conversations ----
router.get('/conversations', requireAuth, (req, res) => {
  const me = req.user.id
  const rows = db.prepare(`SELECT CASE WHEN from_id = ? THEN to_id ELSE from_id END other, MAX(id) last FROM dm_messages
    WHERE from_id = ? OR to_id = ? GROUP BY other ORDER BY last DESC LIMIT 200`).all(me, me, me)
  res.json({
    conversations: rows.map((r) => {
      const m = db.prepare('SELECT * FROM dm_messages WHERE id = ?').get(r.last)
      return {
        user: who(userById(r.other)),
        last: { body: preview(m.body, db.prepare("SELECT mime FROM comment_files WHERE kind = 'dm' AND target_id = ?").all(String(m.id)), m.share_kind ? { kind: m.share_kind } : null), mine: m.from_id === me, time: m.created_at },
        unread: unreadFrom(me, r.other),
      }
    }).filter((c) => c.user),
  })
})

router.get('/unread', requireAuth, (req, res) => {
  const me = req.user.id
  const others = db.prepare('SELECT DISTINCT from_id other FROM dm_messages WHERE to_id = ?').all(me)
  res.json({ unread: others.reduce((n, r) => n + (unreadFrom(me, r.other) ? 1 : 0), 0) })
})

// People to start a conversation with: everyone who has signed in (search by name, account or team).
const fold = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
router.get('/people', requireAuth, (req, res) => {
  const q = fold(String(req.query.q || '').trim().slice(0, 64))
  const people = db.prepare('SELECT * FROM users WHERE id != ? ORDER BY name COLLATE NOCASE').all(req.user.id)
    .filter((u) => !q || fold([u.name, u.email, u.team].join(' ')).includes(q))
    .slice(0, 20).map(who)
  res.json({ people })
})

router.get('/with/:uid', requireAuth, (req, res) => {
  const other = userById(Number(req.params.uid))
  if (!other || other.id === req.user.id) return res.status(404).json({ error: 'not_found' })
  const messages = messagesBetween(req.user.id, other.id, req.query.after)
  if (messages.length || !Number(req.query.after)) markSeen(req.user.id, other.id)
  res.json({ user: who(other), messages })
})

const SHARE_KINDS = ['usecase', 'thread']
router.post('/with/:uid', requireAuth, (req, res) => {
  const other = userById(Number(req.params.uid))
  if (!other || other.id === req.user.id) return res.status(404).json({ error: 'not_found' })
  const body = String(req.body?.body || '').replace(/\r\n/g, '\n').trim().slice(0, MAX_BODY)
  const files = decodeCommentFiles(req.body?.files)
  if (files === null) return res.status(400).json({ error: 'bad_files' })
  const sk = SHARE_KINDS.includes(req.body?.share?.kind) ? req.body.share.kind : null
  const sid = sk ? String(req.body.share.id || '').slice(0, 64) : null
  const share = sk && sid ? shareCard(sk, sid) : null
  if (share && share.missing) return res.status(404).json({ error: 'share_not_found' })
  if (!body && !files.length && !share) return res.status(400).json({ error: 'empty' })
  const quiet = unreadFrom(other.id, req.user.id) > 0 // they haven't read what I sent before: already emailed
  const r = db.prepare('INSERT INTO dm_messages (from_id, to_id, body, share_kind, share_id) VALUES (?, ?, ?, ?, ?)').run(req.user.id, other.id, body, share ? sk : null, share ? sid : null)
  if (files.length) saveCommentFiles('dm', String(r.lastInsertRowid), files)
  markSeen(req.user.id, other.id)
  const name = domainName(req.user.email, req.user.name)
  notifyOnce(other.email, 'dm', { ref: 'dm:' + req.user.id, text: `${name} nhắn cho bạn: "${preview(body, files, share)}"`, href: '/messages?to=' + req.user.id, actor: req.user.name })
  if (!quiet) {
    const what = share ? `\n\n${share.kind === 'thread' ? 'Thread' : 'Use case'}: ${share.kind === 'thread' ? share.text : share.title}\n${appUrl(req)}${share.href}` : ''
    const said = body ? `\n\n"${body.length > 500 ? body.slice(0, 500).trimEnd() + '…' : body}"` : !share ? `\n\n${preview(body, files, share)}` : ''
    sendMail({ to: other.email, subject: `${name} vừa nhắn tin cho bạn trên Zalopay AI Space`, text: `${name} vừa nhắn tin cho bạn.${said}${what}\n\nXem và trả lời tại: ${appUrl(req)}/messages?to=${req.user.id}` }).catch(() => {})
  }
  res.status(201).json({ message: messagesBetween(req.user.id, other.id, Number(r.lastInsertRowid) - 1)[0] })
})

export default router
