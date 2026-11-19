import express from 'express'
import { db } from './db.js'
import { requireAuth, envAdminEmails } from './auth.js'
import { notify } from './notifications.js'
import { sendMail } from './mailer.js'
import { appUrl, domainName } from './mentions.js'
import { deleteQuestionTx, deleteAnswerTx, deleteCommentTx } from './routes/questions.js'
import { deleteUseCaseCommentTx } from './routes/useCases.js'

// "Báo cáo đến admin": anyone can flag a thread, an answer, an answer comment, a use case comment, or a
// comment under an event or a "Muốn nghe" topic; admins get a notification + email and resolve it from the
// admin console.

const TYPES = {
  thread: {
    // a thread's title and body together, so the report shows what was posted
    row: (id) => { const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id); return q && { ...q, body: [q.title, q.body].filter(Boolean).join('\n') } },
    path: (r) => `/questions/${r.id}`,
    remove: (id) => deleteQuestionTx(id),
  },
  answer: {
    row: (id) => db.prepare('SELECT * FROM question_answers WHERE id = ?').get(id),
    path: (r) => `/questions/${r.question_id}`,
    remove: (id) => deleteAnswerTx(id),
  },
  comment: {
    row: (id) => db.prepare('SELECT c.*, a.question_id FROM answer_comments c JOIN question_answers a ON a.id = c.answer_id WHERE c.id = ?').get(id),
    path: (r) => `/questions/${r.question_id}`,
    remove: (id) => deleteCommentTx(id),
  },
  uc_comment: {
    row: (id) => db.prepare('SELECT * FROM use_case_comments WHERE id = ?').get(id),
    path: (r) => `/use-cases/${encodeURIComponent(r.use_case_id)}#comments`,
    remove: (id) => deleteUseCaseCommentTx(id),
  },
  // comments under an event and under a "Muốn nghe" topic (removed with their replies and likes)
  ev_comment: {
    row: (id) => db.prepare('SELECT * FROM event_comments WHERE id = ?').get(id),
    path: (r) => `/?event=${encodeURIComponent(r.event_id)}`,
    remove: (id) => removeThreaded('event_comments', 'event_comment_likes', id),
  },
  // a "Muốn nghe" topic itself (removed with its votes, saves and comments)
  topic: {
    row: (id) => { const t = db.prepare('SELECT * FROM topic_requests WHERE id = ?').get(id); return t && { ...t, body: [t.title, t.detail].filter(Boolean).join('\n') } },
    path: (r) => `/?tab=wish&topic=${encodeURIComponent(r.id)}`,
    remove: (id) => db.transaction(() => {
      for (const { id: cid } of db.prepare('SELECT id FROM topic_comments WHERE topic_id = ?').all(id)) db.prepare('DELETE FROM topic_comment_likes WHERE comment_id = ?').run(cid)
      for (const tbl of ['topic_comments', 'topic_votes', 'topic_saves']) db.prepare(`DELETE FROM ${tbl} WHERE topic_id = ?`).run(id)
      db.prepare('DELETE FROM topic_requests WHERE id = ?').run(id)
    })(),
  },
  topic_comment: {
    row: (id) => db.prepare('SELECT * FROM topic_comments WHERE id = ?').get(id),
    path: (r) => `/?tab=wish&topic=${encodeURIComponent(r.topic_id)}`,
    remove: (id) => removeThreaded('topic_comments', 'topic_comment_likes', id),
  },
}
function removeThreaded(table, likes, id) {
  db.transaction(() => {
    const ids = [id, ...db.prepare(`SELECT id FROM ${table} WHERE parent_id = ?`).all(id).map((r) => r.id)]
    for (const x of ids) db.prepare(`DELETE FROM ${likes} WHERE comment_id = ?`).run(x)
    db.prepare(`DELETE FROM ${table} WHERE id = ? OR parent_id = ?`).run(id, id)
  })()
}

const adminEmails = () => {
  const env = envAdminEmails()
  const dbAdmins = db.prepare('SELECT email FROM users WHERE is_admin = 1').all().map((u) => u.email.toLowerCase())
  return [...new Set([...env, ...dbAdmins])]
}

export const reportRoutes = express.Router()

reportRoutes.post('/', requireAuth, (req, res) => {
  const type = String(req.body?.type || '')
  const id = String(req.body?.id || '')
  const reason = String(req.body?.reason || '').trim().slice(0, 500)
  const t = TYPES[type]
  const row = t && t.row(id)
  if (!row) return res.status(404).json({ error: 'not_found' })
  if (db.prepare("SELECT 1 FROM reports WHERE target_type = ? AND target_id = ? AND reporter_id = ? AND status = 'open'").get(type, id, req.user.id)) {
    return res.json({ ok: true, duplicate: true })
  }
  const excerpt = String(row.body || '').slice(0, 300)
  db.prepare('INSERT INTO reports (target_type, target_id, path, excerpt, target_author_id, reporter_id, reason) VALUES (?,?,?,?,?,?,?)')
    .run(type, id, t.path(row), excerpt, row.author_id, req.user.id, reason)
  const who = domainName(req.user.email, req.user.name)
  const what = type === 'thread' ? 'một post' : 'một comment'
  for (const to of adminEmails()) {
    notify(to, { kind: 'report', text: `${who} báo cáo ${what}: "${excerpt.slice(0, 80)}${excerpt.length > 80 ? '…' : ''}"`, href: '/admin#reports', actor: req.user.name })
    sendMail({
      to,
      subject: `Có ${type === 'thread' ? 'post' : 'comment'} bị báo cáo trên Zalopay AI Space`,
      text: `${req.user.name} (${req.user.email}) đã báo cáo ${what}:\n\n"${excerpt}"${reason ? `\n\nLý do: ${reason}` : ''}\n\nXử lý tại: ${appUrl(req)}/admin#reports`,
    }).catch((e) => console.error('[reports] admin notify failed:', e.message))
  }
  res.status(201).json({ ok: true })
})

export const adminReportRoutes = express.Router()

adminReportRoutes.get('/', (req, res) => {
  const user = (id) => { const u = id ? db.prepare('SELECT email, name FROM users WHERE id = ?').get(id) : null; return u ? domainName(u.email, u.name) : '—' }
  const rows = db.prepare('SELECT * FROM reports ORDER BY (status = \'open\') DESC, created_at DESC LIMIT 200').all()
  res.json({
    reports: rows.map((r) => ({
      id: r.id, type: r.target_type, targetId: r.target_id, path: r.path, excerpt: r.excerpt, reason: r.reason,
      status: r.status, time: r.created_at, author: user(r.target_author_id), reporter: user(r.reporter_id),
      exists: !!TYPES[r.target_type]?.row(r.target_id),
    })),
  })
})

// action: 'delete' removes the reported content (and closes every report on it); 'dismiss' just closes it.
adminReportRoutes.post('/:id/resolve', (req, res) => {
  const r = db.prepare('SELECT * FROM reports WHERE id = ?').get(Number(req.params.id))
  if (!r) return res.status(404).json({ error: 'not_found' })
  const action = req.body?.action === 'delete' ? 'delete' : 'dismiss'
  if (action === 'delete') {
    const t = TYPES[r.target_type]
    if (t && t.row(r.target_id)) t.remove(r.target_id)
    db.prepare("UPDATE reports SET status = 'removed' WHERE target_type = ? AND target_id = ?").run(r.target_type, r.target_id)
  } else {
    db.prepare("UPDATE reports SET status = 'dismissed' WHERE id = ?").run(r.id)
  }
  res.json({ ok: true })
})
