import express from 'express'
import { db, nextId } from '../db.js'
import { requireAuth } from '../auth.js'
import { colorOf, avatarUrlOf } from '../avatarColors.js'
import { domainName, initialsOf } from '../mentions.js'
import { notify } from '../notifications.js'
import { serializeSubmission } from './useCases.js'
import { PENDING_BY_ID, isBoothOwner } from '../showcase.js'

// Review page for a use case submission: the admin pins comments to a field (optionally to a quoted
// passage), Google-Docs style; the author replies and marks each one "Đã sửa". Only admins and the
// author can see any of it.
const router = express.Router()
router.use(requireAuth)

const FIELDS = ['title', 'oneLine', 'audience', 'members', 'team', 'steps', 'success', 'safety', 'problem', 'solution', 'result', 'highlights', 'fitYes', 'fitNo', 'prep', 'prompt', 'pitfalls', 'limits', 'tech', 'link', 'contact', 'general']

// The author, or for an AI Exhibition booth's write-up any of the booth's owners (the team writes it together).
function isTeamAuthor(row, user) {
  if (row.author_id === user.id) return true
  let booth = null
  try { booth = PENDING_BY_ID.get(JSON.parse(row.extra || '{}').booth) } catch { /* no extra */ }
  // admins act for a booth's team, the same as its owners
  return !!booth && (isBoothOwner(booth, user.email) || !!user.is_admin)
}

function loadSub(req, res) {
  const row = db.prepare('SELECT * FROM use_case_submissions WHERE id = ?').get(req.params.id)
  // Same answer for "doesn't exist" and "not yours", so ids can't be probed.
  if (!row || (!req.user.is_admin && !isTeamAuthor(row, req.user))) { res.status(404).json({ error: 'not_found' }); return null }
  return row
}

function commentsOf(subId) {
  const users = new Map()
  const who = (id) => {
    if (!users.has(id)) users.set(id, db.prepare('SELECT * FROM users WHERE id = ?').get(id))
    const u = users.get(id)
    return u ? { id: u.id, name: domainName(u.email, u.name), initials: initialsOf(u), avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u), isAdmin: !!u.is_admin } : { id, name: 'Người dùng đã xoá', initials: '?' }
  }
  const rows = db.prepare('SELECT * FROM review_comments WHERE submission_id = ? ORDER BY created_at, rowid').all(subId)
  const out = (r) => ({ id: r.id, field: r.field, quote: r.quote, body: r.body, author: who(r.author_id), time: r.created_at, resolved: !!r.resolved_at, resolvedAt: r.resolved_at, resolvedBy: r.resolved_by ? who(r.resolved_by).name : null })
  return rows.filter((r) => !r.parent_id).map((r) => ({ ...out(r), replies: rows.filter((x) => x.parent_id === r.id).map(out) }))
}

router.get('/:id', (req, res) => {
  const row = loadSub(req, res)
  if (!row) return
  res.json({ submission: serializeSubmission(row, req.user), comments: commentsOf(row.id), isOwner: isTeamAuthor(row, req.user), isAuthor: row.author_id === req.user.id })
})

router.post('/:id/comments', (req, res) => {
  const row = loadSub(req, res)
  if (!row) return
  const body = String(req.body?.body || '').trim().slice(0, 4000)
  if (!body) return res.status(400).json({ error: 'empty_body' })
  const parentId = req.body?.parentId ? String(req.body.parentId) : null
  const parent = parentId ? db.prepare('SELECT * FROM review_comments WHERE id = ? AND submission_id = ? AND parent_id IS NULL').get(parentId, row.id) : null
  if (parentId && !parent) return res.status(404).json({ error: 'not_found' })
  // New threads come from admins; the author answers inside them.
  if (!parent && !req.user.is_admin) return res.status(403).json({ error: 'admin_only' })
  const field = parent ? parent.field : FIELDS.includes(req.body?.field) ? req.body.field : 'general'
  const quote = parent ? '' : String(req.body?.quote || '').replace(/\s+/g, ' ').trim().slice(0, 500)
  db.prepare('INSERT INTO review_comments (id, submission_id, field, quote, body, author_id, parent_id) VALUES (?,?,?,?,?,?,?)')
    .run(nextId('rc'), row.id, field, quote, body, req.user.id, parent ? parent.id : null)

  // Replies ping the other side. New admin threads are announced together when the admin sends "Yêu cầu chỉnh sửa".
  if (parent) {
    const me = domainName(req.user.email, req.user.name)
    const href = `/review/${encodeURIComponent(row.id)}`
    const text = `${me} đã trả lời góp ý trên use case "${row.title}": ${body.slice(0, 140)}`
    const to = new Set()
    if (row.author_id !== req.user.id) to.add(row.author_id)
    for (const r of db.prepare('SELECT DISTINCT author_id FROM review_comments WHERE id = ? OR parent_id = ?').all(parent.id, parent.id)) if (r.author_id !== req.user.id) to.add(r.author_id)
    for (const id of to) { const u = db.prepare('SELECT email FROM users WHERE id = ?').get(id); if (u) notify(u.email, { kind: id === row.author_id ? 'changes' : 'submission', text, href, actor: req.user.name }) }
  }
  res.status(201).json({ comments: commentsOf(row.id) })
})

// "Đã sửa" / "Mở lại" on a thread: the author or an admin.
router.patch('/:id/comments/:cid', (req, res) => {
  const row = loadSub(req, res)
  if (!row) return
  const c = db.prepare('SELECT * FROM review_comments WHERE id = ? AND submission_id = ? AND parent_id IS NULL').get(req.params.cid, row.id)
  if (!c) return res.status(404).json({ error: 'not_found' })
  if (req.body?.resolved) db.prepare("UPDATE review_comments SET resolved_at = datetime('now'), resolved_by = ? WHERE id = ?").run(req.user.id, c.id)
  else db.prepare('UPDATE review_comments SET resolved_at = NULL, resolved_by = NULL WHERE id = ?').run(c.id)
  res.json({ comments: commentsOf(row.id) })
})

// Delete your own comment (a thread goes with its replies).
router.delete('/:id/comments/:cid', (req, res) => {
  const row = loadSub(req, res)
  if (!row) return
  const c = db.prepare('SELECT * FROM review_comments WHERE id = ? AND submission_id = ?').get(req.params.cid, row.id)
  if (!c) return res.status(404).json({ error: 'not_found' })
  if (c.author_id !== req.user.id) return res.status(403).json({ error: 'not_owner' })
  db.transaction(() => {
    db.prepare('DELETE FROM review_comments WHERE parent_id = ?').run(c.id)
    db.prepare('DELETE FROM review_comments WHERE id = ?').run(c.id)
  })()
  res.json({ comments: commentsOf(row.id) })
})

export default router
