import express from 'express'
import { db, nextId } from '../db.js'
import { requireAuth } from '../auth.js'
import { sendMail } from '../mailer.js'

const router = express.Router()

const asArr = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] } }
const userBrief = (u) => (u ? { author: u.name, initials: u.initials, team: u.team, authorId: u.id } : { author: 'Người dùng đã xoá', initials: '??', team: '', authorId: null })

function notifyMentions(body, actingUserName, context) {
  const names = Array.from(new Set((body.match(/@([\p{L}\w]+)/gu) || []).map((m) => m.slice(1).toLowerCase())))
  if (!names.length) return
  const users = db.prepare('SELECT * FROM users').all()
  for (const n of names) {
    const u = users.find((x) => x.name.toLowerCase().replace(/\s+/g, '') === n || x.email.split('@')[0].toLowerCase() === n)
    if (u) sendMail({ to: u.email, subject: 'Bạn được nhắc đến trên Zalopay AI Community', text: `${actingUserName} đã nhắc đến bạn: "${context}"` }).catch(() => {})
  }
}

function loadQuestion(id, userId) {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id)
  if (!q) return null
  const author = db.prepare('SELECT * FROM users WHERE id = ?').get(q.author_id)
  const answers = db.prepare('SELECT * FROM question_answers WHERE question_id = ? ORDER BY created_at ASC').all(id).map((a) => {
    const aAuthor = db.prepare('SELECT * FROM users WHERE id = ?').get(a.author_id)
    const comments = db.prepare('SELECT * FROM answer_comments WHERE answer_id = ? ORDER BY created_at ASC').all(a.id).map((c) => ({
      id: c.id, ...userBrief(db.prepare('SELECT * FROM users WHERE id = ?').get(c.author_id)), time: c.created_at, body: c.body,
    }))
    const helpful = db.prepare('SELECT COUNT(*) n FROM answer_reactions WHERE answer_id = ?').get(a.id).n
    const iHelped = userId ? !!db.prepare('SELECT 1 FROM answer_reactions WHERE answer_id = ? AND user_id = ?').get(a.id, userId) : false
    return { id: a.id, ...userBrief(aAuthor), time: a.created_at, helpful, iHelped, accepted: !!a.accepted, body: a.body, comments }
  })
  const qHelpful = db.prepare('SELECT COUNT(*) n FROM question_reactions WHERE question_id = ?').get(id).n
  const iHelpedQ = userId ? !!db.prepare('SELECT 1 FROM question_reactions WHERE question_id = ? AND user_id = ?').get(id, userId) : false
  const saved = userId ? !!db.prepare('SELECT 1 FROM saved_questions WHERE question_id = ? AND user_id = ?').get(id, userId) : false
  return {
    id: q.id, title: q.title, body: q.body, ...userBrief(author), time: q.created_at, ts: q.created_at,
    category: asArr(q.category), topics: asArr(q.topics), tools: asArr(q.tools),
    resolved: !!q.resolved, saved, files: [], images: [], qHelpful, iHelpedQ, answers,
  }
}

router.get('/', (req, res) => {
  const ids = db.prepare('SELECT id FROM questions ORDER BY created_at DESC').all().map((r) => r.id)
  res.json({ questions: ids.map((id) => loadQuestion(id, req.user?.id)) })
})

router.post('/', requireAuth, (req, res) => {
  const { title, body, category = [], topics = [], tools = [] } = req.body || {}
  if (!String(title || '').trim() || !String(body || '').trim() || !category.length) {
    return res.status(400).json({ error: 'missing_fields' })
  }
  const id = nextId('q')
  db.prepare('INSERT INTO questions (id, title, body, category, topics, tools, author_id) VALUES (?,?,?,?,?,?,?)')
    .run(id, title.trim(), body.trim(), JSON.stringify(category), JSON.stringify(topics), JSON.stringify(tools), req.user.id)
  res.status(201).json({ question: loadQuestion(id, req.user.id) })
})

router.post('/:id/react', requireAuth, (req, res) => {
  const { id } = req.params
  const exists = db.prepare('SELECT 1 FROM question_reactions WHERE question_id = ? AND user_id = ?').get(id, req.user.id)
  if (exists) db.prepare('DELETE FROM question_reactions WHERE question_id = ? AND user_id = ?').run(id, req.user.id)
  else db.prepare('INSERT INTO question_reactions (question_id, user_id) VALUES (?, ?)').run(id, req.user.id)
  res.json({ question: loadQuestion(id, req.user.id) })
})

router.post('/:id/save', requireAuth, (req, res) => {
  const { id } = req.params
  const exists = db.prepare('SELECT 1 FROM saved_questions WHERE question_id = ? AND user_id = ?').get(id, req.user.id)
  if (exists) db.prepare('DELETE FROM saved_questions WHERE question_id = ? AND user_id = ?').run(id, req.user.id)
  else db.prepare('INSERT INTO saved_questions (question_id, user_id) VALUES (?, ?)').run(id, req.user.id)
  res.json({ question: loadQuestion(id, req.user.id) })
})

router.post('/:id/answers', requireAuth, (req, res) => {
  const { id } = req.params
  const body = String(req.body?.body || '').trim()
  if (!body) return res.status(400).json({ error: 'empty_body' })
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id)
  if (!q) return res.status(404).json({ error: 'not_found' })
  const aid = nextId('a')
  db.prepare('INSERT INTO question_answers (id, question_id, author_id, body) VALUES (?,?,?,?)').run(aid, id, req.user.id, body)

  const qAuthor = db.prepare('SELECT * FROM users WHERE id = ?').get(q.author_id)
  if (qAuthor && qAuthor.id !== req.user.id) {
    sendMail({ to: qAuthor.email, subject: 'Có câu trả lời mới cho câu hỏi của bạn', text: `${req.user.name} đã trả lời: "${q.title}"\n\n${body}` }).catch(() => {})
  }
  notifyMentions(body, req.user.name, q.title)

  res.status(201).json({ question: loadQuestion(id, req.user.id) })
})

router.post('/:id/answers/:answerId/react', requireAuth, (req, res) => {
  const { id, answerId } = req.params
  const exists = db.prepare('SELECT 1 FROM answer_reactions WHERE answer_id = ? AND user_id = ?').get(answerId, req.user.id)
  if (exists) db.prepare('DELETE FROM answer_reactions WHERE answer_id = ? AND user_id = ?').run(answerId, req.user.id)
  else db.prepare('INSERT INTO answer_reactions (answer_id, user_id) VALUES (?, ?)').run(answerId, req.user.id)
  res.json({ question: loadQuestion(id, req.user.id) })
})

router.post('/:id/answers/:answerId/accept', requireAuth, (req, res) => {
  const { id, answerId } = req.params
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id)
  if (!q) return res.status(404).json({ error: 'not_found' })
  if (q.author_id !== req.user.id) return res.status(403).json({ error: 'not_owner' })
  db.prepare('UPDATE question_answers SET accepted = 0 WHERE question_id = ?').run(id)
  db.prepare('UPDATE question_answers SET accepted = 1 WHERE id = ?').run(answerId)
  db.prepare('UPDATE questions SET resolved = 1, accepted_answer_id = ? WHERE id = ?').run(answerId, id)
  res.json({ question: loadQuestion(id, req.user.id) })
})

router.post('/:id/answers/:answerId/comments', requireAuth, (req, res) => {
  const { id, answerId } = req.params
  const body = String(req.body?.body || '').trim()
  if (!body) return res.status(400).json({ error: 'empty_body' })
  const cid = nextId('c')
  db.prepare('INSERT INTO answer_comments (id, answer_id, author_id, body) VALUES (?,?,?,?)').run(cid, answerId, req.user.id, body)

  const answer = db.prepare('SELECT * FROM question_answers WHERE id = ?').get(answerId)
  const aAuthor = answer ? db.prepare('SELECT * FROM users WHERE id = ?').get(answer.author_id) : null
  if (aAuthor && aAuthor.id !== req.user.id) {
    sendMail({ to: aAuthor.email, subject: 'Có bình luận mới cho câu trả lời của bạn', text: `${req.user.name} đã bình luận: "${body}"` }).catch(() => {})
  }
  notifyMentions(body, req.user.name, body)

  res.status(201).json({ question: loadQuestion(id, req.user.id) })
})

export default router
