import { colorOf, avatarUrlOf } from '../avatarColors.js'
import express from 'express'
import { db, nextId } from '../db.js'
import { requireAuth } from '../auth.js'
import { sendMail } from '../mailer.js'
import { notifyMentions, appUrl, domainName, initialsOf } from '../mentions.js'
import { notify, notifyUpvotes } from '../notifications.js'
import { anonFields, maskAuthor, anonName } from '../anon.js'
import { removalCheck, afterRemoval } from '../moderation.js'

const router = express.Router()

const asArr = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] } }
// Questions may have no title (the composer is body-only now); this stands in wherever a label is needed.
const qTitle = (q) => {
  if (q.title) return q.title
  const first = String(q.body || '').split('\n').find((l) => l.trim()) || ''
  return first.length > 90 ? first.slice(0, 90).trimEnd() + '…' : first
}
const userBrief = (u) => (u ? { author: domainName(u.email, u.name), fullName: u.name, initials: initialsOf(u), team: u.team, authorId: u.id, avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u) } : { author: 'Người dùng đã xoá', fullName: 'Người dùng đã xoá', initials: '??', team: '', authorId: null, avatarColor: null })


// `viewer` = req.user (anonymous posts are masked for everyone but their author and admins).
function loadQuestion(id, viewer) {
  const userId = viewer?.id
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id)
  if (!q) return null
  const author = db.prepare('SELECT * FROM users WHERE id = ?').get(q.author_id)
  const answers = db.prepare('SELECT * FROM question_answers WHERE question_id = ? ORDER BY created_at ASC').all(id).map((a) => {
    const aAuthor = db.prepare('SELECT * FROM users WHERE id = ?').get(a.author_id)
    const comments = db.prepare('SELECT * FROM answer_comments WHERE answer_id = ? ORDER BY created_at ASC').all(a.id).map((c) => ({
      id: c.id, ...userBrief(db.prepare('SELECT * FROM users WHERE id = ?').get(c.author_id)), time: c.created_at, body: c.body, parentId: c.parent_id || null, edited: !!c.edited_at,
    }))
    const helpful = db.prepare('SELECT COUNT(*) n FROM answer_reactions WHERE answer_id = ?').get(a.id).n
    const iHelped = userId ? !!db.prepare('SELECT 1 FROM answer_reactions WHERE answer_id = ? AND user_id = ?').get(a.id, userId) : false
    return { id: a.id, ...maskAuthor(userBrief(aAuthor), a, viewer), time: a.created_at, helpful, iHelped, accepted: !!a.accepted, body: a.body, edited: !!a.edited_at, comments }
  })
  const qHelpful = db.prepare('SELECT COUNT(*) n FROM question_reactions WHERE question_id = ?').get(id).n
  const iHelpedQ = userId ? !!db.prepare('SELECT 1 FROM question_reactions WHERE question_id = ? AND user_id = ?').get(id, userId) : false
  const saved = userId ? !!db.prepare('SELECT 1 FROM saved_questions WHERE question_id = ? AND user_id = ?').get(id, userId) : false
  return {
    id: q.id, title: qTitle(q), hasTitle: !!q.title, body: q.body, ...maskAuthor(userBrief(author), q, viewer), time: q.created_at, ts: q.created_at,
    category: asArr(q.category), topics: asArr(q.topics), tools: asArr(q.tools),
    resolved: !!q.resolved, saved, edited: !!q.edited_at,
    files: db.prepare('SELECT idx, name, size FROM question_files WHERE question_id = ? ORDER BY idx').all(id).map((f) => ({ name: f.name, size: f.size, url: `/api/questions/${id}/files/${f.idx}` })),
    images: db.prepare('SELECT idx FROM question_images WHERE question_id = ? ORDER BY idx').all(id).map((r) => `/api/questions/${id}/images/${r.idx}`), qHelpful, iHelpedQ, answers,
  }
}

router.get('/', requireAuth, (req, res) => {
  const ids = db.prepare('SELECT id FROM questions ORDER BY created_at DESC').all().map((r) => r.id)
  res.json({ questions: ids.map((id) => loadQuestion(id, req.user)) })
})

const deleteQuestionTx = db.transaction((id) => {
  const answerIds = db.prepare('SELECT id FROM question_answers WHERE question_id = ?').all(id).map((r) => r.id)
  for (const aid of answerIds) {
    db.prepare('DELETE FROM answer_comments WHERE answer_id = ?').run(aid)
    db.prepare('DELETE FROM answer_reactions WHERE answer_id = ?').run(aid)
  }
  db.prepare('DELETE FROM question_answers WHERE question_id = ?').run(id)
  db.prepare('DELETE FROM question_reactions WHERE question_id = ?').run(id)
  db.prepare('DELETE FROM saved_questions WHERE question_id = ?').run(id)
  db.prepare('DELETE FROM question_images WHERE question_id = ?').run(id)
  db.prepare('DELETE FROM question_files WHERE question_id = ?').run(id)
  db.prepare('DELETE FROM questions WHERE id = ?').run(id)
})

router.delete('/:id', requireAuth, (req, res) => {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id)
  if (!q) return res.status(404).json({ error: 'not_found' })
  const block = removalCheck(req, q.author_id)
  if (block) return res.status(block.status).json({ error: block.error })
  deleteQuestionTx(req.params.id)
  afterRemoval(req, { authorId: q.author_id, what: 'câu hỏi', title: qTitle(q), content: q.body })
  res.json({ ok: true })
})

const MAX_IMAGES = 4
const MAX_IMAGE_BYTES = 3 * 1024 * 1024
const MAX_FILES = 3
const MAX_FILE_BYTES = 10 * 1024 * 1024
// { name, data: "data:<mime>;base64,..." } → { name, mime, data } | null. Any file type; it is only ever downloaded.
function decodeFile(f) {
  const m = /^data:([\w.+-]+\/[\w.+-]+)?(?:;[^,;]*)*;base64,([A-Za-z0-9+/=]*)$/.exec(String(f && f.data || ''))
  const name = String(f && f.name || '').replace(/[\\/\r\n"]/g, '_').trim().slice(0, 160)
  if (!m || !name) return null
  const data = Buffer.from(m[2], 'base64')
  return data.length && data.length <= MAX_FILE_BYTES ? { name, mime: m[1] || 'application/octet-stream', data } : null
}
// Accepts "data:image/<type>;base64,..." strings from the composer; anything else is rejected.
function decodeImage(dataUrl) {
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''))
  if (!m) return null
  const data = Buffer.from(m[2], 'base64')
  return data.length && data.length <= MAX_IMAGE_BYTES ? { mime: m[1], data } : null
}

router.post('/', requireAuth, (req, res) => {
  const { title, body, category = [], topics = [], tools = [], images = [], files = [] } = req.body || {}
  if (!String(body || '').trim() || !category.length) {
    return res.status(400).json({ error: 'missing_fields' })
  }
  const decoded = (Array.isArray(images) ? images : []).slice(0, MAX_IMAGES).map(decodeImage)
  if (decoded.some((d) => !d)) return res.status(400).json({ error: 'bad_image' })
  const decodedFiles = (Array.isArray(files) ? files : []).slice(0, MAX_FILES).map(decodeFile)
  if (decodedFiles.some((d) => !d)) return res.status(400).json({ error: 'bad_file' })
  const id = nextId('q')
  const anon = anonFields(req.body)
  db.transaction(() => {
    db.prepare('INSERT INTO questions (id, title, body, category, topics, tools, author_id, anonymous, alias) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, String(title || '').trim(), body.trim(), JSON.stringify(category), JSON.stringify(topics), JSON.stringify(tools), req.user.id, anon.anonymous, anon.alias)
    decoded.forEach((img, i) => db.prepare('INSERT INTO question_images (question_id, idx, mime, data) VALUES (?,?,?,?)').run(id, i, img.mime, img.data))
    decodedFiles.forEach((f, i) => db.prepare('INSERT INTO question_files (question_id, idx, name, mime, size, data) VALUES (?,?,?,?,?,?)').run(id, i, f.name, f.mime, f.data.length, f.data))
  })()
  const label = qTitle({ title: String(title || '').trim(), body: body.trim() })
  notifyMentions(req, { text: [String(title || '').trim(), body.trim()].filter(Boolean).join('\n'), where: `câu hỏi "${label}"`, path: `/questions#q=${id}`, as: anon.anonymous ? anonName({ ...anon, author_id: req.user.id }) : null })
  res.status(201).json({ question: loadQuestion(id, req.user) })
})

// The author edits their own question (text, topic and tool tags; images stay as posted).
router.patch('/:id', requireAuth, (req, res) => {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id)
  if (!q) return res.status(404).json({ error: 'not_found' })
  if (q.author_id !== req.user.id) return res.status(403).json({ error: 'not_owner' })
  const { title = '', body, topics = [], tools = [] } = req.body || {}
  if (!String(body || '').trim()) return res.status(400).json({ error: 'missing_fields' })
  const clean = (a) => (Array.isArray(a) ? a.map((x) => String(x).trim()).filter(Boolean).slice(0, 12) : [])
  db.prepare("UPDATE questions SET title = ?, body = ?, topics = ?, tools = ?, edited_at = datetime('now') WHERE id = ?")
    .run(String(title).trim(), String(body).trim(), JSON.stringify(clean(topics)), JSON.stringify(clean(tools)), q.id)
  if (req.body && req.body.anonymous !== undefined) { const an = anonFields(req.body); db.prepare('UPDATE questions SET anonymous = ?, alias = ? WHERE id = ?').run(an.anonymous, an.alias, q.id) }
  res.json({ question: loadQuestion(q.id, req.user) })
})

router.get('/:id/files/:idx', requireAuth, (req, res) => {
  const f = db.prepare('SELECT name, mime, data FROM question_files WHERE question_id = ? AND idx = ?').get(req.params.id, Number(req.params.idx))
  if (!f) return res.status(404).end()
  // Always a download (never rendered inline), with the original name.
  res.set('Content-Type', 'application/octet-stream')
  res.set('Content-Disposition', `attachment; filename="${f.name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(f.name)}`)
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('Cache-Control', 'private, max-age=86400')
  res.send(f.data)
})

router.get('/:id/images/:idx', requireAuth, (req, res) => {
  const img = db.prepare('SELECT mime, data FROM question_images WHERE question_id = ? AND idx = ?').get(req.params.id, Number(req.params.idx))
  if (!img) return res.status(404).end()
  res.set('Content-Type', img.mime)
  res.set('Cache-Control', 'private, max-age=31536000, immutable')
  res.set('X-Content-Type-Options', 'nosniff')
  res.send(img.data)
})

router.post('/:id/react', requireAuth, (req, res) => {
  const { id } = req.params
  const exists = db.prepare('SELECT 1 FROM question_reactions WHERE question_id = ? AND user_id = ?').get(id, req.user.id)
  if (exists) db.prepare('DELETE FROM question_reactions WHERE question_id = ? AND user_id = ?').run(id, req.user.id)
  else db.prepare('INSERT INTO question_reactions (question_id, user_id) VALUES (?, ?)').run(id, req.user.id)
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id)
  const owner = q && db.prepare('SELECT * FROM users WHERE id = ?').get(q.author_id)
  if (owner && owner.id !== req.user.id) {
    const voters = db.prepare('SELECT u.email, u.name FROM question_reactions x JOIN users u ON u.id = x.user_id WHERE x.question_id = ? AND x.user_id != ?').all(id, owner.id)
    const one = voters.length === 1 ? voters[0] : req.user
    notifyUpvotes(owner.email, { ref: 'q:' + id, count: voters.length, lastVoter: domainName(one.email, one.name), title: qTitle(q), href: `/questions#q=${id}` })
  }
  res.json({ question: loadQuestion(id, req.user) })
})

router.post('/:id/save', requireAuth, (req, res) => {
  const { id } = req.params
  const exists = db.prepare('SELECT 1 FROM saved_questions WHERE question_id = ? AND user_id = ?').get(id, req.user.id)
  if (exists) db.prepare('DELETE FROM saved_questions WHERE question_id = ? AND user_id = ?').run(id, req.user.id)
  else db.prepare('INSERT INTO saved_questions (question_id, user_id) VALUES (?, ?)').run(id, req.user.id)
  res.json({ question: loadQuestion(id, req.user) })
})

router.post('/:id/answers', requireAuth, (req, res) => {
  const { id } = req.params
  const body = String(req.body?.body || '').trim()
  if (!body) return res.status(400).json({ error: 'empty_body' })
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id)
  if (!q) return res.status(404).json({ error: 'not_found' })
  const aid = nextId('a')
  const anon = anonFields(req.body)
  db.prepare('INSERT INTO question_answers (id, question_id, author_id, body, anonymous, alias) VALUES (?,?,?,?,?,?)').run(aid, id, req.user.id, body, anon.anonymous, anon.alias)
  const who = anon.anonymous ? anonName({ ...anon, author_id: req.user.id }) : domainName(req.user.email, req.user.name)

  const qAuthor = db.prepare('SELECT * FROM users WHERE id = ?').get(q.author_id)
  if (qAuthor && qAuthor.id !== req.user.id) {
    notify(qAuthor.email, { kind: 'answer', text: `${who} đã comment vào câu hỏi của bạn: "${qTitle(q)}"`, href: `/questions#q=${id}`, actor: anon.anonymous ? who : req.user.name })
    sendMail({ to: qAuthor.email, subject: 'Có câu trả lời mới cho câu hỏi của bạn', text: `${anon.anonymous ? who : req.user.name} đã trả lời: "${qTitle(q)}"\n\n${body}\n\nXem tại: ${appUrl(req)}/questions#q=${id}` }).catch(() => {})
  }
  notifyMentions(req, { text: body, where: `câu hỏi "${qTitle(q)}"`, path: `/questions#q=${id}`, skip: [qAuthor?.email], as: anon.anonymous ? who : null })

  res.status(201).json({ question: loadQuestion(id, req.user) })
})

router.post('/:id/answers/:answerId/react', requireAuth, (req, res) => {
  const { id, answerId } = req.params
  const exists = db.prepare('SELECT 1 FROM answer_reactions WHERE answer_id = ? AND user_id = ?').get(answerId, req.user.id)
  if (exists) db.prepare('DELETE FROM answer_reactions WHERE answer_id = ? AND user_id = ?').run(answerId, req.user.id)
  else db.prepare('INSERT INTO answer_reactions (answer_id, user_id) VALUES (?, ?)').run(answerId, req.user.id)
  res.json({ question: loadQuestion(id, req.user) })
})

router.post('/:id/answers/:answerId/accept', requireAuth, (req, res) => {
  const { id, answerId } = req.params
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id)
  if (!q) return res.status(404).json({ error: 'not_found' })
  if (q.author_id !== req.user.id) return res.status(403).json({ error: 'not_owner' })
  db.prepare('UPDATE question_answers SET accepted = 0 WHERE question_id = ?').run(id)
  db.prepare('UPDATE question_answers SET accepted = 1 WHERE id = ?').run(answerId)
  db.prepare('UPDATE questions SET resolved = 1, accepted_answer_id = ? WHERE id = ?').run(answerId, id)
  res.json({ question: loadQuestion(id, req.user) })
})

router.post('/:id/answers/:answerId/comments', requireAuth, (req, res) => {
  const { id, answerId } = req.params
  const body = String(req.body?.body || '').trim()
  const parentId = req.body?.parentId ? String(req.body.parentId) : null
  const replyToId = req.body?.replyToId ? String(req.body.replyToId) : parentId
  if (!body) return res.status(400).json({ error: 'empty_body' })
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id)
  const answer = db.prepare('SELECT * FROM question_answers WHERE id = ? AND question_id = ?').get(answerId, id)
  if (!q || !answer) return res.status(404).json({ error: 'not_found' })
  const cid = nextId('c')
  db.prepare('INSERT INTO answer_comments (id, answer_id, author_id, body, parent_id) VALUES (?,?,?,?,?)').run(cid, answerId, req.user.id, body, parentId)

  // Who hears about it, most specific first; each person once, never the author themself.
  const who = domainName(req.user.email, req.user.name)
  const label = qTitle(q)
  const href = `/questions#q=${id}`
  const userById = (uid) => (uid ? db.prepare('SELECT * FROM users WHERE id = ?').get(uid) : null)
  const commentAuthor = (cId) => { const c = cId ? db.prepare('SELECT author_id FROM answer_comments WHERE id = ?').get(cId) : null; return c ? userById(c.author_id) : null }
  const targets = [
    [commentAuthor(replyToId), `${who} đã reply comment của bạn trong "${label}"`],
    [commentAuthor(parentId), `${who} đã reply trong một thread bạn tham gia ở "${label}"`],
    [userById(answer.author_id), parentId ? `${who} đã reply trong thread comment của bạn ở "${label}"` : `${who} đã reply comment của bạn trong "${label}"`],
    [userById(q.author_id), `${who} đã comment trong câu hỏi của bạn: "${label}"`],
  ]
  const told = new Set([req.user.email.toLowerCase()])
  for (const [u, text] of targets) {
    if (!u || told.has(u.email.toLowerCase())) continue
    told.add(u.email.toLowerCase())
    notify(u.email, { kind: 'comment', text, href, actor: req.user.name })
    sendMail({ to: u.email, subject: text, text: `${req.user.name}: "${body}"\n\nXem tại: ${appUrl(req)}${href}` }).catch(() => {})
  }
  notifyMentions(req, { text: body, where: `câu hỏi "${label}"`, path: href, skip: [...told] })

  res.status(201).json({ question: loadQuestion(id, req.user) })
})

// ---- edit / delete answers and comments (author edits; author or admin deletes) ----
const canEdit = (req, row) => row && row.author_id === req.user.id

export const deleteAnswerTx = db.transaction((answerId) => {
  const a = db.prepare('SELECT * FROM question_answers WHERE id = ?').get(answerId)
  if (!a) return
  db.prepare('DELETE FROM answer_comments WHERE answer_id = ?').run(answerId)
  db.prepare('DELETE FROM answer_reactions WHERE answer_id = ?').run(answerId)
  db.prepare('DELETE FROM question_answers WHERE id = ?').run(answerId)
  if (a.accepted) db.prepare('UPDATE questions SET resolved = 0, accepted_answer_id = NULL WHERE id = ?').run(a.question_id)
})
export const deleteCommentTx = db.transaction((commentId) => {
  db.prepare('DELETE FROM answer_comments WHERE parent_id = ?').run(commentId)
  db.prepare('DELETE FROM answer_comments WHERE id = ?').run(commentId)
})

router.patch('/:id/answers/:answerId', requireAuth, (req, res) => {
  const body = String(req.body?.body || '').trim()
  if (!body) return res.status(400).json({ error: 'empty_body' })
  const a = db.prepare('SELECT * FROM question_answers WHERE id = ? AND question_id = ?').get(req.params.answerId, req.params.id)
  if (!a) return res.status(404).json({ error: 'not_found' })
  if (!canEdit(req, a)) return res.status(403).json({ error: 'not_owner' })
  db.prepare("UPDATE question_answers SET body = ?, edited_at = datetime('now') WHERE id = ?").run(body, a.id)
  res.json({ question: loadQuestion(req.params.id, req.user) })
})

router.delete('/:id/answers/:answerId', requireAuth, (req, res) => {
  const a = db.prepare('SELECT * FROM question_answers WHERE id = ? AND question_id = ?').get(req.params.answerId, req.params.id)
  if (!a) return res.status(404).json({ error: 'not_found' })
  const block = removalCheck(req, a.author_id)
  if (block) return res.status(block.status).json({ error: block.error })
  deleteAnswerTx(a.id)
  afterRemoval(req, { authorId: a.author_id, what: 'câu trả lời', title: '', content: a.body })
  res.json({ question: loadQuestion(req.params.id, req.user) })
})

const findComment = (req) => {
  const c = db.prepare('SELECT * FROM answer_comments WHERE id = ? AND answer_id = ?').get(req.params.commentId, req.params.answerId)
  const a = c && db.prepare('SELECT 1 FROM question_answers WHERE id = ? AND question_id = ?').get(req.params.answerId, req.params.id)
  return a ? c : null
}

router.patch('/:id/answers/:answerId/comments/:commentId', requireAuth, (req, res) => {
  const body = String(req.body?.body || '').trim()
  if (!body) return res.status(400).json({ error: 'empty_body' })
  const c = findComment(req)
  if (!c) return res.status(404).json({ error: 'not_found' })
  if (!canEdit(req, c)) return res.status(403).json({ error: 'not_owner' })
  db.prepare("UPDATE answer_comments SET body = ?, edited_at = datetime('now') WHERE id = ?").run(body, c.id)
  res.json({ question: loadQuestion(req.params.id, req.user) })
})

router.delete('/:id/answers/:answerId/comments/:commentId', requireAuth, (req, res) => {
  const c = findComment(req)
  if (!c) return res.status(404).json({ error: 'not_found' })
  const block = removalCheck(req, c.author_id)
  if (block) return res.status(block.status).json({ error: block.error })
  deleteCommentTx(c.id)
  afterRemoval(req, { authorId: c.author_id, what: 'bình luận', title: '', content: c.body })
  res.json({ question: loadQuestion(req.params.id, req.user) })
})

export default router
