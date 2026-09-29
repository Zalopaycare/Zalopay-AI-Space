import express from 'express'
import { db, nextId } from '../db.js'
import { requireAuth } from '../auth.js'
import { sendMail } from '../mailer.js'
import { notifyMentions, appUrl, domainName } from '../mentions.js'
import { notify } from '../notifications.js'

const router = express.Router()
const asArr = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] } }

// Reactions + comments for ANY use case id (the 5 seed cases c1..c5, or a submitted+approved one).
router.get('/:id/meta', requireAuth, (req, res) => {
  const { id } = req.params
  const helpful = db.prepare('SELECT COUNT(*) n FROM use_case_reactions WHERE use_case_id = ?').get(id).n
  const iHelped = req.user ? !!db.prepare('SELECT 1 FROM use_case_reactions WHERE use_case_id = ? AND user_id = ?').get(id, req.user.id) : false
  const saved = req.user ? !!db.prepare('SELECT 1 FROM use_case_saves WHERE use_case_id = ? AND user_id = ?').get(id, req.user.id) : false
  const comments = db.prepare('SELECT * FROM use_case_comments WHERE use_case_id = ? ORDER BY created_at ASC').all(id).map((c) => {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(c.author_id)
    return { id: c.id, author: u ? domainName(u.email, u.name) : 'Người dùng đã xoá', initials: u ? u.initials : '??', avatarColor: u ? (u.avatar_color || null) : null, time: c.created_at, body: c.body, parentId: c.parent_id || null, authorId: c.author_id, edited: !!c.edited_at }
  })
  res.json({ helpful, iHelped, saved, comments })
})

router.get('/saved/mine', requireAuth, (req, res) => {
  const ids = db.prepare('SELECT use_case_id FROM use_case_saves WHERE user_id = ?').all(req.user.id).map((r) => r.use_case_id)
  res.json({ ids })
})

router.post('/:id/save', requireAuth, (req, res) => {
  const { id } = req.params
  const exists = db.prepare('SELECT 1 FROM use_case_saves WHERE use_case_id = ? AND user_id = ?').get(id, req.user.id)
  if (exists) db.prepare('DELETE FROM use_case_saves WHERE use_case_id = ? AND user_id = ?').run(id, req.user.id)
  else db.prepare('INSERT INTO use_case_saves (use_case_id, user_id) VALUES (?, ?)').run(id, req.user.id)
  res.json({ saved: !exists })
})

router.post('/:id/react', requireAuth, (req, res) => {
  const { id } = req.params
  const exists = db.prepare('SELECT 1 FROM use_case_reactions WHERE use_case_id = ? AND user_id = ?').get(id, req.user.id)
  if (exists) db.prepare('DELETE FROM use_case_reactions WHERE use_case_id = ? AND user_id = ?').run(id, req.user.id)
  else db.prepare('INSERT INTO use_case_reactions (use_case_id, user_id) VALUES (?, ?)').run(id, req.user.id)
  const helpful = db.prepare('SELECT COUNT(*) n FROM use_case_reactions WHERE use_case_id = ?').get(id).n
  res.json({ helpful, iHelped: !exists })
})

router.delete('/:id', requireAuth, (req, res) => {
  const { id } = req.params
  const row = db.prepare('SELECT * FROM use_case_submissions WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'not_found' })
  if (!req.user.is_admin && row.author_id !== req.user.id) return res.status(403).json({ error: 'not_owner' })
  db.prepare('DELETE FROM use_case_comments WHERE use_case_id = ?').run(id)
  db.prepare('DELETE FROM use_case_reactions WHERE use_case_id = ?').run(id)
  db.prepare('DELETE FROM use_case_saves WHERE use_case_id = ?').run(id)
  db.prepare('DELETE FROM use_case_submissions WHERE id = ?').run(id)
  res.json({ ok: true })
})

router.post('/:id/comments', requireAuth, (req, res) => {
  const { id } = req.params
  const body = String(req.body?.body || '').trim()
  const parentId = req.body?.parentId ? String(req.body.parentId) : null
  if (!body) return res.status(400).json({ error: 'empty_body' })
  const cid = nextId('ucc')
  db.prepare('INSERT INTO use_case_comments (id, use_case_id, author_id, body, parent_id) VALUES (?,?,?,?,?)').run(cid, id, req.user.id, body, parentId)
  // Built-in use cases live in the frontend bundle, so the client passes the title along for the email.
  const sub = db.prepare('SELECT title FROM use_case_submissions WHERE id = ?').get(id)
  const ucTitle = sub?.title || String(req.body?.title || '').trim().slice(0, 200)
  notifyMentions(req, { text: body, where: ucTitle ? `use case "${ucTitle}"` : 'một use case', path: `/use-cases/${encodeURIComponent(id)}#comments` })
  res.status(201).json({ id: cid, author: req.user.name, initials: req.user.initials, avatarColor: req.user.avatar_color || null, time: new Date().toISOString(), body, parentId })
})

// Share-a-use-case submissions (pending admin review).
router.get('/submissions', requireAuth, (req, res) => {
  const onlyMine = req.query.mine === '1' && req.user
  const onlyApproved = req.query.status === 'approved'
  let rows
  if (onlyMine) rows = db.prepare('SELECT * FROM use_case_submissions WHERE author_id = ? ORDER BY created_at DESC').all(req.user.id)
  else if (onlyApproved) rows = db.prepare("SELECT * FROM use_case_submissions WHERE review_status = 'approved' ORDER BY created_at DESC").all()
  else if (req.user.is_admin) rows = db.prepare('SELECT * FROM use_case_submissions ORDER BY created_at DESC').all()
  else return res.status(403).json({ error: 'admin_only' })
  res.json({
    submissions: rows.map((r) => {
      const author = db.prepare('SELECT * FROM users WHERE id = ?').get(r.author_id)
      return {
        id: r.id, title: r.title, audience: r.audience, team: r.team, problem: r.problem, solution: r.solution,
        prep: r.prep, prompt: r.prompt_text, result: r.result, limits: r.limits, contact: r.contact, link: r.link,
        kind: r.kind, status: r.status_field, level: r.level,
        category: asArr(r.category), topics: asArr(r.topics), tools: asArr(r.tools),
        reviewStatus: r.review_status, adminNote: r.admin_note,
        author: author ? author.name : '—', authorId: r.author_id, time: r.created_at,
      }
    }),
  })
})

router.post('/submissions', requireAuth, (req, res) => {
  const f = req.body || {}
  const required = ['title', 'audience', 'team', 'problem', 'solution', 'prep', 'prompt', 'result']
  if (required.some((k) => !String(f[k] || '').trim())) return res.status(400).json({ error: 'missing_fields' })
  if (!Array.isArray(f.category) || !f.category.length || !f.kind || !f.status || !f.level) {
    return res.status(400).json({ error: 'missing_fields' })
  }
  const id = nextId('s')
  db.prepare(`INSERT INTO use_case_submissions
    (id, title, audience, team, problem, solution, prep, prompt_text, result, limits, contact, link, kind, status_field, level, category, topics, tools, author_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, f.title.trim(), f.audience.trim(), f.team.trim(), f.problem.trim(), f.solution.trim(), f.prep.trim(),
      f.prompt.trim(), f.result.trim(), String(f.limits || '').trim(), String(f.contact || '').trim(), String(f.link || '').trim(),
      f.kind, f.status, f.level, JSON.stringify(f.category), JSON.stringify(f.topics || []), JSON.stringify(f.tools || []), req.user.id)

  // Tell every admin (ADMIN_EMAILS plus anyone flagged admin in the DB) there's something to review.
  const envAdmins = String(process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  const dbAdmins = db.prepare('SELECT email FROM users WHERE is_admin = 1').all().map((u) => u.email.toLowerCase())
  const admins = [...new Set([...envAdmins, ...dbAdmins])].filter((e) => e !== req.user.email.toLowerCase())
  for (const to of admins) {
    notify(to, { kind: 'submission', text: `${domainName(req.user.email, req.user.name)} gửi use case mới chờ duyệt: "${f.title.trim()}"`, href: '/admin', actor: req.user.name })
    sendMail({
      to,
      subject: `Use case mới chờ duyệt: ${f.title.trim()}`,
      text: `${req.user.name} (${req.user.email}) vừa gửi một use case mới và đang chờ duyệt:\n\n"${f.title.trim()}"\n\nVấn đề: ${f.problem.trim().slice(0, 300)}\n\nDuyệt tại: ${appUrl(req)}/admin`,
    }).catch((e) => console.error('[use-cases] admin notify failed:', e.message))
  }
  res.status(201).json({ id })
})

router.delete('/submissions/:id', requireAuth, (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'admin_only' })
  db.prepare('DELETE FROM use_case_submissions WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

router.post('/submissions/:id/review', requireAuth, (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'admin_only' })
  const { id } = req.params
  const status = req.body?.status
  const note = String(req.body?.note || '')
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'invalid_status' })
  db.prepare('UPDATE use_case_submissions SET review_status = ?, admin_note = ? WHERE id = ?').run(status, note, id)
  const row = db.prepare('SELECT * FROM use_case_submissions WHERE id = ?').get(id)
  const author = row ? db.prepare('SELECT * FROM users WHERE id = ?').get(row.author_id) : null
  if (author) {
    notify(author.email, status === 'approved'
      ? { kind: 'approved', text: `Use case "${row.title}" của bạn đã được duyệt và hiển thị công khai`, href: '/profile#usecase' }
      : { kind: 'rejected', text: `Use case "${row.title}" của bạn bị từ chối${note ? ': ' + note : ''}`, href: '/profile#usecase' })
    const subject = status === 'approved' ? 'Use case của bạn đã được duyệt' : 'Use case của bạn bị từ chối'
    const text = status === 'approved'
      ? `Use case "${row.title}" đã được duyệt và hiển thị công khai.\n\nXem tại: ${appUrl(req)}/profile#usecase`
      : `Use case "${row.title}" bị từ chối.${note ? ' Lý do: ' + note : ''}\n\nXem tại: ${appUrl(req)}/profile#usecase`
    sendMail({ to: author.email, subject, text }).catch(() => {})
  }
  res.json({ ok: true })
})

export const deleteUseCaseCommentTx = db.transaction((commentId) => {
  db.prepare('DELETE FROM use_case_comments WHERE parent_id = ?').run(commentId)
  db.prepare('DELETE FROM use_case_comments WHERE id = ?').run(commentId)
})

router.patch('/:id/comments/:commentId', requireAuth, (req, res) => {
  const body = String(req.body?.body || '').trim()
  if (!body) return res.status(400).json({ error: 'empty_body' })
  const c = db.prepare('SELECT * FROM use_case_comments WHERE id = ? AND use_case_id = ?').get(req.params.commentId, req.params.id)
  if (!c) return res.status(404).json({ error: 'not_found' })
  if (c.author_id !== req.user.id) return res.status(403).json({ error: 'not_owner' })
  db.prepare("UPDATE use_case_comments SET body = ?, edited_at = datetime('now') WHERE id = ?").run(body, c.id)
  res.json({ ok: true })
})

router.delete('/:id/comments/:commentId', requireAuth, (req, res) => {
  const c = db.prepare('SELECT * FROM use_case_comments WHERE id = ? AND use_case_id = ?').get(req.params.commentId, req.params.id)
  if (!c) return res.status(404).json({ error: 'not_found' })
  if (c.author_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'not_owner' })
  deleteUseCaseCommentTx(c.id)
  res.json({ ok: true })
})

export default router
