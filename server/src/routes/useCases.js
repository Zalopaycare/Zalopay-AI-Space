import express from 'express'
import { db, nextId } from '../db.js'
import { requireAuth } from '../auth.js'
import { sendMail } from '../mailer.js'

const router = express.Router()
const asArr = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] } }

// Reactions + comments for ANY use case id (the 5 seed cases c1..c5, or a submitted+approved one).
router.get('/:id/meta', requireAuth, (req, res) => {
  const { id } = req.params
  const helpful = db.prepare('SELECT COUNT(*) n FROM use_case_reactions WHERE use_case_id = ?').get(id).n
  const iHelped = req.user ? !!db.prepare('SELECT 1 FROM use_case_reactions WHERE use_case_id = ? AND user_id = ?').get(id, req.user.id) : false
  const saved = req.user ? !!db.prepare('SELECT 1 FROM use_case_saves WHERE use_case_id = ? AND user_id = ?').get(id, req.user.id) : false
  const comments = db.prepare('SELECT * FROM use_case_comments WHERE use_case_id = ? ORDER BY created_at DESC').all(id).map((c) => {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(c.author_id)
    return { id: c.id, author: u ? u.name : 'Người dùng đã xoá', initials: u ? u.initials : '??', avatarColor: u ? (u.avatar_color || null) : null, time: c.created_at, body: c.body }
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

router.post('/:id/comments', requireAuth, (req, res) => {
  const { id } = req.params
  const body = String(req.body?.body || '').trim()
  if (!body) return res.status(400).json({ error: 'empty_body' })
  const cid = nextId('ucc')
  db.prepare('INSERT INTO use_case_comments (id, use_case_id, author_id, body) VALUES (?,?,?,?)').run(cid, id, req.user.id, body)
  res.status(201).json({ id: cid, author: req.user.name, initials: req.user.initials, time: new Date().toISOString(), body })
})

// Share-a-use-case submissions (pending admin review).
router.get('/submissions', requireAuth, (req, res) => {
  const onlyMine = req.query.mine === '1' && req.user
  const onlyApproved = req.query.status === 'approved'
  let rows
  if (onlyMine) rows = db.prepare('SELECT * FROM use_case_submissions WHERE author_id = ? ORDER BY created_at DESC').all(req.user.id)
  else if (onlyApproved) rows = db.prepare("SELECT * FROM use_case_submissions WHERE review_status = 'approved' ORDER BY created_at DESC").all()
  else rows = db.prepare('SELECT * FROM use_case_submissions ORDER BY created_at DESC').all()
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
    const subject = status === 'approved' ? 'Use case của bạn đã được duyệt' : 'Use case của bạn bị từ chối'
    const text = status === 'approved'
      ? `Use case "${row.title}" đã được duyệt và hiển thị công khai.`
      : `Use case "${row.title}" bị từ chối.${note ? ' Lý do: ' + note : ''}`
    sendMail({ to: author.email, subject, text }).catch(() => {})
  }
  res.json({ ok: true })
})

export default router
