import { colorOf, avatarUrlOf } from '../avatarColors.js'
import { anonFields, maskAuthor, anonName } from '../anon.js'
import { removalCheck, afterRemoval } from '../moderation.js'
import express from 'express'
import { tagList } from '../tags.js'
import { decodeCommentFiles, saveCommentFiles, commentFilesOf, dropCommentFiles } from '../commentFiles.js'
import { db, nextId } from '../db.js'
import { requireAuth } from '../auth.js'
import { sendMail } from '../mailer.js'
import { notifyMentions, appUrl, domainName, handleOf, initialsOf } from '../mentions.js'
import { notify, notifyUpvotes, notifyParticipants } from '../notifications.js'
import { PENDING_BY_ID, pendingCases, isBoothOwner, boothAccounts, showcaseCases } from '../showcase.js'

const router = express.Router()
// Only http(s) links are stored (a "javascript:…" link would run code when clicked).
const safeLink = (v) => { const u = String(v || '').trim().slice(0, 1000); return /^https?:\/\/\S+$/i.test(u) ? u : '' }
const asArr = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] } }

// Reactions + comments for ANY use case id (the 5 seed cases c1..c5, or a submitted+approved one).
router.get('/:id/meta', requireAuth, (req, res) => {
  const { id } = req.params
  const helpful = db.prepare('SELECT COUNT(*) n FROM use_case_reactions WHERE use_case_id = ?').get(id).n
  const iHelped = req.user ? !!db.prepare('SELECT 1 FROM use_case_reactions WHERE use_case_id = ? AND user_id = ?').get(id, req.user.id) : false
  const saved = req.user ? !!db.prepare('SELECT 1 FROM use_case_saves WHERE use_case_id = ? AND user_id = ?').get(id, req.user.id) : false
  const comments = db.prepare('SELECT * FROM use_case_comments WHERE use_case_id = ? ORDER BY created_at ASC').all(id).map((c) => {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(c.author_id)
    const brief = { author: u ? domainName(u.email, u.name) : 'Người dùng đã xoá', initials: u ? initialsOf(u) : '??', avatarColor: u ? colorOf(u) : null, avatarUrl: u ? avatarUrlOf(u) : null, authorId: c.author_id }
    return {
      id: c.id, ...maskAuthor(brief, c, req.user), time: c.created_at, body: c.body, parentId: c.parent_id || null, edited: !!c.edited_at, files: commentFilesOf('uccomment', c.id),
      likes: db.prepare("SELECT COUNT(*) n FROM comment_reactions WHERE kind = 'uccomment' AND comment_id = ?").get(c.id).n,
      liked: req.user ? !!db.prepare("SELECT 1 FROM comment_reactions WHERE kind = 'uccomment' AND comment_id = ? AND user_id = ?").get(c.id, req.user.id) : false,
    }
  })
  res.json({ helpful, iHelped, saved, comments, rating: ratingOf(id, req.user?.id), ...appliedOf(id, req.user?.id) })
})

const appliedOf = (id, userId) => ({
  applied: db.prepare('SELECT COUNT(*) n FROM use_case_applied WHERE use_case_id = ?').get(id).n,
  iApplied: userId ? !!db.prepare('SELECT 1 FROM use_case_applied WHERE use_case_id = ? AND user_id = ?').get(id, userId) : false,
})

// "Tôi đã áp dụng" toggle — counts real adoption, separate from upvotes.
router.post('/:id/applied', requireAuth, (req, res) => {
  const { id } = req.params
  const exists = db.prepare('SELECT 1 FROM use_case_applied WHERE use_case_id = ? AND user_id = ?').get(id, req.user.id)
  if (exists) db.prepare('DELETE FROM use_case_applied WHERE use_case_id = ? AND user_id = ?').run(id, req.user.id)
  else db.prepare('INSERT INTO use_case_applied (use_case_id, user_id) VALUES (?, ?)').run(id, req.user.id)
  res.json(appliedOf(id, req.user.id))
})

const ratingOf = (id, userId) => {
  const r = db.prepare('SELECT AVG(stars) avg, COUNT(*) n FROM use_case_ratings WHERE use_case_id = ?').get(id)
  const mine = userId ? db.prepare('SELECT stars FROM use_case_ratings WHERE use_case_id = ? AND user_id = ?').get(id, userId) : null
  return { avg: r.n ? Math.round(r.avg * 10) / 10 : 0, count: r.n, mine: mine ? mine.stars : 0 }
}

// Rate a use case 1–5; sending the same number again clears your rating.
router.post('/:id/rate', requireAuth, (req, res) => {
  const { id } = req.params
  const stars = Math.round(Number(req.body?.stars))
  if (!(stars >= 1 && stars <= 5)) return res.status(400).json({ error: 'invalid_stars' })
  const prev = db.prepare('SELECT stars FROM use_case_ratings WHERE use_case_id = ? AND user_id = ?').get(id, req.user.id)
  if (prev && prev.stars === stars) db.prepare('DELETE FROM use_case_ratings WHERE use_case_id = ? AND user_id = ?').run(id, req.user.id)
  else db.prepare(`INSERT INTO use_case_ratings (use_case_id, user_id, stars) VALUES (?, ?, ?)
    ON CONFLICT(use_case_id, user_id) DO UPDATE SET stars = excluded.stars, updated_at = datetime('now')`).run(id, req.user.id, stars)
  res.json({ rating: ratingOf(id, req.user.id) })
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
  const sub = db.prepare('SELECT * FROM use_case_submissions WHERE id = ?').get(id)
  const owner = sub && db.prepare('SELECT * FROM users WHERE id = ?').get(sub.author_id)
  if (owner && owner.id !== req.user.id) {
    const voters = db.prepare('SELECT u.email, u.name FROM use_case_reactions x JOIN users u ON u.id = x.user_id WHERE x.use_case_id = ? AND x.user_id != ?').all(id, owner.id)
    const one = voters.length === 1 ? voters[0] : req.user
    notifyUpvotes(owner.email, { ref: 'uc:' + id, count: voters.length, lastVoter: domainName(one.email, one.name), title: sub.title, href: `/use-cases/${id}` })
  }
  res.json({ helpful, iHelped: !exists })
})

router.delete('/:id', requireAuth, (req, res) => {
  const { id } = req.params
  const row = db.prepare('SELECT * FROM use_case_submissions WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'not_found' })
  const block = removalCheck(req, row.author_id)
  if (block) return res.status(block.status).json({ error: block.error })
  dropCommentFiles('uccomment', db.prepare('SELECT id FROM use_case_comments WHERE use_case_id = ?').all(id).map((r) => r.id))
  db.prepare('DELETE FROM use_case_comments WHERE use_case_id = ?').run(id)
  db.prepare('DELETE FROM use_case_reactions WHERE use_case_id = ?').run(id)
  db.prepare('DELETE FROM use_case_saves WHERE use_case_id = ?').run(id)
  db.prepare('DELETE FROM use_case_ratings WHERE use_case_id = ?').run(id)
  dropCommentFiles('ucstep', id)
  db.prepare('DELETE FROM use_case_submissions WHERE id = ?').run(id)
  afterRemoval(req, { authorId: row.author_id, what: 'use case', title: row.title, content: row.problem })
  res.json({ ok: true })
})

router.post('/:id/comments', requireAuth, (req, res) => {
  const { id } = req.params
  const body = String(req.body?.body || '').trim()
  const parentId = req.body?.parentId ? String(req.body.parentId) : null
  const files = decodeCommentFiles(req.body?.files)
  if (!files) return res.status(400).json({ error: 'bad_file', message: 'File không hợp lệ hoặc lớn hơn 10MB.' })
  if (!body && !files.length) return res.status(400).json({ error: 'empty_body' })
  const cid = nextId('ucc')
  const anon = anonFields(req.body)
  db.prepare('INSERT INTO use_case_comments (id, use_case_id, author_id, body, parent_id, anonymous, alias) VALUES (?,?,?,?,?,?,?)').run(cid, id, req.user.id, body, parentId, anon.anonymous, anon.alias)
  saveCommentFiles('uccomment', cid, files)
  // Built-in use cases live in the frontend bundle, so the client passes the title along for the email.
  const sub = db.prepare('SELECT title, author_id FROM use_case_submissions WHERE id = ?').get(id)
  const ucTitle = sub?.title || String(req.body?.title || '').trim().slice(0, 200)
  const where = ucTitle ? `use case "${ucTitle}"` : 'một use case'
  const href = `/use-cases/${encodeURIComponent(id)}#comments`

  // Notify, most specific first and each person once: whoever was replied to, the thread
  // starter, then the use case's owners, then everyone else who commented on it. Built-in use cases
  // and booths name their owners by domain account (e.g. "namnth3"), matched only against people
  // who have actually signed in.
  const who = anon.anonymous ? anonName({ ...anon, author_id: req.user.id }) : domainName(req.user.email, req.user.name)
  const userById = (uid) => (uid ? db.prepare('SELECT * FROM users WHERE id = ?').get(uid) : null)
  const commentAuthor = (cId) => { const c = cId ? db.prepare('SELECT author_id FROM use_case_comments WHERE id = ? AND use_case_id = ?').get(cId, id) : null; return c ? userById(c.author_id) : null }
  const ownerHandle = String(req.body?.ownerHandle || '').trim().toLowerCase()
  const builtin = showcaseCases.find((c) => c.id === id)
  const handles = new Set([ownerHandle, ...(builtin?.members || []), ...(PENDING_BY_ID.has(id) ? boothAccounts(PENDING_BY_ID.get(id)) : [])].map((h) => String(h || '').toLowerCase()).filter(Boolean))
  const owners = sub ? [userById(sub.author_id)] : (handles.size ? db.prepare('SELECT * FROM users').all().filter((u) => handles.has(handleOf(u.email))) : [])
  const replyToId = req.body?.replyToId ? String(req.body.replyToId) : parentId
  const targets = [
    [commentAuthor(replyToId), `${who} đã reply comment của bạn trong ${where}`],
    [commentAuthor(parentId), `${who} đã reply trong một thread bạn tham gia ở ${where}`],
    ...owners.map((o) => [o, `${who} đã comment vào ${where} của bạn`]),
  ]
  const told = new Set([req.user.email.toLowerCase()])
  for (const [u, text] of targets) {
    if (!u || told.has(u.email.toLowerCase())) continue
    told.add(u.email.toLowerCase())
    notify(u.email, { kind: 'comment', text, href, actor: anon.anonymous ? who : req.user.name })
    sendMail({ to: u.email, subject: text, text: `${anon.anonymous ? who : req.user.name}: "${body}"\n\nXem tại: ${appUrl(req)}${href}` }).catch(() => {})
  }
  notifyMentions(req, { text: body, where, path: href, skip: [...told], as: anon.anonymous ? who : null })
  const commenters = db.prepare('SELECT DISTINCT author_id FROM use_case_comments WHERE use_case_id = ?').all(id).map((r) => r.author_id)
  notifyParticipants(commenters, told, { ref: 'joined:uc:' + id, text: `${who} cũng đã bình luận trong ${where}, nơi bạn đã bình luận`, href, actor: anon.anonymous ? who : req.user.name })
  res.status(201).json({ id: cid, authorId: req.user.id, anonymous: !!anon.anonymous, author: anon.anonymous ? who : domainName(req.user.email, req.user.name), initials: initialsOf(req.user), avatarColor: colorOf(req.user), avatarUrl: avatarUrlOf(req.user), time: new Date().toISOString(), body, parentId, files: commentFilesOf('uccomment', cid) })
})

/** Who may edit a post (the PATCH below): its author, or for a booth's write-up the booth's owners and admins. */
function canEditSubmission(r, viewer) {
  if (!viewer) return false
  if (r.author_id === viewer.id) return true
  const booth = PENDING_BY_ID.get((parseExtra(r.extra) || {}).booth)
  return !!booth && (isBoothOwner(booth, viewer.email) || !!viewer.is_admin)
}

/** A submission as `viewer` may see it (anonymous authors masked; reviewer/account only for admins). */
export function serializeSubmission(r, viewer) {
  const author = db.prepare('SELECT * FROM users WHERE id = ?').get(r.author_id)
  // Anonymous posts: everyone but the author and admins sees the alias, a grey avatar and no id.
  const who = maskAuthor({ author: author ? author.name : '—', fullName: author ? domainName(author.email, author.name) : '—', authorId: r.author_id, avatarColor: colorOf(author), avatarUrl: avatarUrlOf(author), team: r.team }, r, viewer)
  return {
    id: r.id, title: r.title, audience: r.audience, team: who.anonymous && who.authorId === null ? '' : r.team, problem: r.problem, solution: r.solution,
    prep: r.prep, prompt: r.prompt_text, result: r.result, limits: r.limits, contact: r.contact, link: r.link,
    kind: r.kind, status: r.status_field, level: r.level,
    category: asArr(r.category), topics: asArr(r.topics), tools: asArr(r.tools),
    reviewStatus: r.review_status, adminNote: r.admin_note,
    author: who.author, authorAvatarColor: who.avatarColor, authorAvatarUrl: who.avatarUrl, authorDomain: who.anonymous && who.authorId === null ? who.author : who.fullName, authorId: who.authorId, time: r.created_at,
    anonymous: !!who.anonymous, alias: who.anonymous ? who.alias : null, realAuthor: who.realAuthor || null,
    authorAccount: viewer && viewer.is_admin && author ? handleOf(author.email) : undefined,
    publishedAt: r.published_at || null, reviewedAt: r.reviewed_at || null,
    // Only admins learn which admin reviewed it.
    reviewedBy: viewer && viewer.is_admin ? reviewerName(r.reviewed_by) : undefined, edited: !!r.edited_at,
    extra: withStepFiles(r.id, parseExtra(r.extra)),
    canEdit: canEditSubmission(r, viewer),
    coverUrl: r.cover_data ? `/api/use-cases/submissions/${r.id}/cover?v=${encodeURIComponent(r.edited_at || r.created_at)}` : null,
  }
}

// Share-a-use-case submissions (pending admin review).
router.get('/submissions', requireAuth, (req, res) => {
  const onlyMine = req.query.mine === '1' && req.user
  const onlyApproved = req.query.status === 'approved'
  let rows
  if (onlyMine) {
    // mine, plus my team's write-ups of the AI Exhibition booths I own
    const booths = pendingCases.filter((p) => isBoothOwner(p, req.user.email)).map((p) => p.id)
    rows = db.prepare(`SELECT * FROM use_case_submissions WHERE author_id = ? OR json_extract(extra, '$.booth') IN (${booths.map(() => '?').join(',') || "''"}) ORDER BY created_at DESC`).all(req.user.id, ...booths)
  }
  else if (onlyApproved) rows = db.prepare("SELECT * FROM use_case_submissions WHERE review_status = 'approved' ORDER BY COALESCE(published_at, created_at) DESC").all()
  else if (req.user.is_admin) rows = db.prepare('SELECT * FROM use_case_submissions ORDER BY created_at DESC').all()
  else return res.status(403).json({ error: 'admin_only' })
  res.json({ submissions: rows.map((r) => serializeSubmission(r, req.user)) })
})

const reviewerName = (uid) => { const u = uid ? db.prepare('SELECT email, name FROM users WHERE id = ?').get(uid) : null; return u ? domainName(u.email, u.name) : null }

const adminEmailsFor = (req) => {
  const envAdmins = String(process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  const dbAdmins = db.prepare('SELECT email FROM users WHERE is_admin = 1').all().map((u) => u.email.toLowerCase())
  return [...new Set([...envAdmins, ...dbAdmins])].filter((e) => e !== req.user.email.toLowerCase())
}
// Cover image: "data:image/<png|jpeg|webp|gif>;base64,..." up to 2 MB; null/'' removes it; undefined leaves it.
const MAX_COVER = 2 * 1024 * 1024
function decodeCover(v) {
  if (v === undefined) return undefined
  if (!v) return null
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(v))
  if (!m) return false
  const data = Buffer.from(m[2], 'base64')
  return data.length && data.length <= MAX_COVER ? { mime: m[1], data } : false
}
const saveCover = (id, cover) => {
  if (cover === undefined) return
  db.prepare('UPDATE use_case_submissions SET cover_mime = ?, cover_data = ? WHERE id = ?').run(cover ? cover.mime : null, cover ? cover.data : null, id)
}

router.get('/submissions/:id/cover', requireAuth, (req, res) => {
  const r = db.prepare('SELECT cover_mime, cover_data FROM use_case_submissions WHERE id = ?').get(req.params.id)
  if (!r || !r.cover_data) return res.status(404).end()
  res.set('Content-Type', r.cover_mime).set('Cache-Control', 'private, max-age=86400').send(r.cover_data)
})

// Share-form fields beyond the original columns, kept as one JSON column. Only known keys, trimmed and capped.
const EXTRA_TYPES = ['tool', 'guide', 'case', 'proposal']
const txt = (v, max = 4000) => String(v || '').trim().slice(0, max)
// `user` decides whether the post may claim an AI Exhibition booth: only its owners (or an admin).
function cleanExtra(e, user) {
  if (!e || typeof e !== 'object') return null
  const booth = PENDING_BY_ID.get(e.booth)
  const out = {
    type: EXTRA_TYPES.includes(e.type) ? e.type : '',
    oneLine: txt(e.oneLine, 300),
    highlights: (Array.isArray(e.highlights) ? e.highlights : []).slice(0, 3)
      .map((h) => ({ value: txt(h && h.value, 40), label: txt(h && h.label, 120) })).filter((h) => h.value || h.label),
    fitYes: txt(e.fitYes), fitNo: txt(e.fitNo), pitfalls: txt(e.pitfalls), tech: txt(e.tech, 8000),
    // Posted for a team: the byline lists everyone who built it.
    postAs: e.postAs === 'team' ? 'team' : '',
    showAs: e.postAs === 'team' ? 'members' : '',
    members: e.postAs === 'team' ? [...new Set((Array.isArray(e.members) ? e.members : []).map((m) => txt(m, 60)).filter(Boolean))].slice(0, 30) : [],
    // Tự áp dụng as steps, each once: what to do, an optional prompt / command, an optional red warning
    steps: (Array.isArray(e.steps) ? e.steps : []).slice(0, 15)
      .map((x) => ({ title: txt(x && x.title, 120), text: txt(x && x.text), prompt: txt(x && x.prompt, 8000), note: txt(x && x.note, 600) }))
      .filter((x) => x.title || x.text || x.prompt),
    success: txt(e.success), safety: txt(e.safety),
    // "Phần khác": parts of the author's own after the template's ones (title + text)
    customSections: (Array.isArray(e.customSections) ? e.customSections : []).slice(0, 8)
      .map((x) => ({ title: txt(x && x.title, 120), text: txt(x && x.text, 6000) })).filter((x) => x.title && x.text),
    // the write-up of an AI Exhibition booth: once approved it replaces the booth
    booth: booth && user && (user.is_admin || isBoothOwner(booth, user.email)) ? booth.id : '',
  }
  return Object.values(out).some((v) => (Array.isArray(v) ? v.length : v)) ? JSON.stringify(out) : null
}
const parseExtra = (v) => { try { return v ? JSON.parse(v) : null } catch { return null } }

// Pictures and files under a step of "Tự áp dụng" (optional, up to 3 a step): kept in comment_files as
// kind 'ucstep', target = the submission, each under its own idx; extra.steps[i].files lists that step's idx.
// The form sends each step's files as { ref: idx } (kept) or { name, data } (new), in the steps' order;
// steps are skipped the way cleanExtra skips them, so the lists line up.
const MAX_STEP_FILES = 3
const stepFileInput = (steps) => (Array.isArray(steps) ? steps : []).slice(0, 15)
  .filter((x) => txt(x && x.title, 120) || txt(x && x.text) || txt(x && x.prompt, 8000))
  .map((x) => (Array.isArray(x.files) ? x.files.slice(0, MAX_STEP_FILES) : []))
function saveStepFiles(id, steps) {
  const inputs = stepFileInput(steps)
  const have = new Set(db.prepare("SELECT idx FROM comment_files WHERE kind = 'ucstep' AND target_id = ?").all(id).map((r) => r.idx))
  let next = Math.max(-1, ...have) + 1
  const refs = inputs.map((list) => list.map((f) => {
    if (f && Number.isInteger(f.ref)) return have.has(f.ref) ? f.ref : null
    const file = (decodeCommentFiles([f]) || [])[0]
    if (!file) return null
    db.prepare("INSERT INTO comment_files (kind, target_id, idx, name, mime, size, data) VALUES ('ucstep', ?, ?, ?, ?, ?, ?)").run(id, next, file.name, file.mime, file.data.length, file.data)
    return next++
  }).filter((x) => x !== null))
  const used = new Set(refs.flat())
  for (const i of have) if (!used.has(i)) db.prepare("DELETE FROM comment_files WHERE kind = 'ucstep' AND target_id = ? AND idx = ?").run(id, i)
  const ex = parseExtra(db.prepare('SELECT extra FROM use_case_submissions WHERE id = ?').get(id)?.extra)
  if (!ex || !Array.isArray(ex.steps)) return
  ex.steps = ex.steps.map((s, i) => (refs[i] && refs[i].length ? { ...s, files: refs[i] } : s))
  db.prepare('UPDATE use_case_submissions SET extra = ? WHERE id = ?').run(JSON.stringify(ex), id)
}
// extra as the page sees it: each step's file idx turned into { ref, name, size, image, url }
function withStepFiles(id, ex) {
  if (!ex || !Array.isArray(ex.steps) || !ex.steps.some((s) => (s.files || []).length)) return ex
  const all = new Map(db.prepare("SELECT idx, name, mime, size FROM comment_files WHERE kind = 'ucstep' AND target_id = ?").all(id).map((f) => [f.idx, f]))
  return {
    ...ex,
    steps: ex.steps.map((s) => ({
      ...s,
      files: (s.files || []).map((i) => all.get(i)).filter(Boolean)
        .map((f) => ({ ref: f.idx, name: f.name, size: f.size, image: /^image\/(png|jpeg|gif|webp)$/.test(f.mime), url: `/api/files/ucstep/${encodeURIComponent(id)}/${f.idx}` })),
    })),
  }
}

const SUBMISSION_FIELDS = ['title', 'audience', 'problem', 'solution', 'prep']
// Loại / Người thực hiện / Trạng thái / Team / Kết quả are optional; the steps (extra.steps) replaced the single
// Prompt box, whose column now just carries those steps as text.
const validSubmission = (f) => !SUBMISSION_FIELDS.some((k) => !String(f[k] || '').trim()) && Array.isArray(f.category) && f.category.length && f.level

router.post('/submissions', requireAuth, (req, res) => {
  const f = req.body || {}
  if (SUBMISSION_FIELDS.some((k) => !String(f[k] || '').trim())) return res.status(400).json({ error: 'missing_fields' })
  if (!Array.isArray(f.category) || !f.category.length || !f.level) {
    return res.status(400).json({ error: 'missing_fields' })
  }
  const cover = decodeCover(f.cover)
  if (cover === false) return res.status(400).json({ error: 'bad_cover' })
  // A new post needs its cover (the form makes it 1920×1080); edits may keep the one already saved.
  if (!cover) return res.status(400).json({ error: 'missing_cover', message: 'Cần tải ảnh bìa (1920 × 1080) trước khi gửi.' })
  const id = nextId('s')
  db.prepare(`INSERT INTO use_case_submissions
    (id, title, audience, team, problem, solution, prep, prompt_text, result, limits, contact, link, kind, status_field, level, category, topics, tools, author_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, f.title.trim(), f.audience.trim(), String(f.team || '').trim(), f.problem.trim(), f.solution.trim(), f.prep.trim(),
      String(f.prompt || '').trim(), String(f.result || '').trim(), String(f.limits || '').trim(), String(f.contact || '').trim(), safeLink(f.link),
      f.kind || '', f.status || '', f.level || '', JSON.stringify(tagList(f.category)), JSON.stringify(tagList(f.topics)), JSON.stringify(tagList(f.tools)), req.user.id)
  saveCover(id, cover)
  const anon = anonFields(f)
  db.prepare('UPDATE use_case_submissions SET extra = ?, anonymous = ?, alias = ? WHERE id = ?').run(cleanExtra(f.extra, req.user), anon.anonymous, anon.alias, id)
  saveStepFiles(id, f.extra && f.extra.steps)

  // Tell every admin (ADMIN_EMAILS plus anyone flagged admin in the DB) there's something to review.
  for (const to of adminEmailsFor(req)) {
    notify(to, { kind: 'submission', text: `${domainName(req.user.email, req.user.name)} gửi use case mới chờ duyệt: "${f.title.trim()}"`, href: '/admin', actor: req.user.name })
    sendMail({
      to,
      subject: `Use case mới chờ duyệt: ${f.title.trim()}`,
      text: `${req.user.name} (${req.user.email}) vừa gửi một use case mới và đang chờ duyệt:\n\n"${f.title.trim()}"\n\nVấn đề: ${f.problem.trim().slice(0, 300)}\n\nDuyệt tại: ${appUrl(req)}/admin`,
    }).catch((e) => console.error('[use-cases] admin notify failed:', e.message))
  }
  res.status(201).json({ id })
})

// Author edits a submission the admin sent back ("Yêu cầu chỉnh sửa") and resubmits it for review.
router.patch('/submissions/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM use_case_submissions WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not_found' })
  // a booth's write-up belongs to its whole team: any of the booth's owners may edit it
  if (!canEditSubmission(row, req.user)) return res.status(403).json({ error: 'not_owner' })
  if (!['changes_requested', 'pending', 'approved'].includes(row.review_status)) return res.status(409).json({ error: 'not_editable' })
  // Every edit goes back through review, published ones included: the post leaves the library until an admin approves it again.
  const nextStatus = 'pending'
  const f = req.body || {}
  if (!validSubmission(f)) return res.status(400).json({ error: 'missing_fields' })
  const cover = decodeCover(f.cover)
  if (cover === false) return res.status(400).json({ error: 'bad_cover' })
  db.prepare(`UPDATE use_case_submissions SET title = ?, audience = ?, team = ?, problem = ?, solution = ?, prep = ?, prompt_text = ?, result = ?,
    limits = ?, contact = ?, link = ?, kind = ?, status_field = ?, level = ?, category = ?, topics = ?, tools = ?, review_status = ?, edited_at = datetime('now') WHERE id = ?`)
    .run(f.title.trim(), f.audience.trim(), String(f.team || '').trim(), f.problem.trim(), f.solution.trim(), f.prep.trim(), String(f.prompt || '').trim(), String(f.result || '').trim(),
      String(f.limits || '').trim(), String(f.contact || '').trim(), safeLink(f.link), f.kind || '', f.status || '', f.level || '',
      JSON.stringify(tagList(f.category)), JSON.stringify(tagList(f.topics)), JSON.stringify(tagList(f.tools)), nextStatus, row.id)
  saveCover(row.id, cover)
  // Older clients don't send `extra`; leave what's stored untouched then.
  if (f.extra !== undefined) { db.prepare('UPDATE use_case_submissions SET extra = ? WHERE id = ?').run(cleanExtra(f.extra, req.user), row.id); saveStepFiles(row.id, f.extra && f.extra.steps) }
  if (f.anonymous !== undefined) { const an = anonFields(f); db.prepare('UPDATE use_case_submissions SET anonymous = ?, alias = ? WHERE id = ?').run(an.anonymous, an.alias, row.id) }
  if (row.review_status === 'approved') {
    const who = domainName(req.user.email, req.user.name)
    for (const to of adminEmailsFor(req)) {
      notify(to, { kind: 'submission', text: `${who} đã chỉnh sửa use case đã đăng, chờ duyệt lại: "${f.title.trim()}"`, href: '/admin', actor: req.user.name })
      sendMail({ to, subject: `Use case đã đăng vừa được chỉnh sửa, chờ duyệt lại: ${f.title.trim()}`, text: `${req.user.name} đã chỉnh sửa use case "${f.title.trim()}". Bài đã tạm ẩn khỏi Use Case Library cho đến khi được duyệt lại.\n\nDuyệt tại: ${appUrl(req)}/admin` }).catch(() => {})
    }
  }
  if (row.review_status === 'changes_requested') {
    const who = domainName(req.user.email, req.user.name)
    for (const to of adminEmailsFor(req)) {
      notify(to, { kind: 'submission', text: `${who} đã chỉnh sửa và gửi lại use case: "${f.title.trim()}"`, href: '/admin', actor: req.user.name })
      sendMail({ to, subject: `Use case đã được chỉnh sửa, chờ duyệt lại: ${f.title.trim()}`, text: `${req.user.name} đã bổ sung theo yêu cầu và gửi lại use case "${f.title.trim()}".${row.admin_note ? `\n\nYêu cầu trước đó: ${row.admin_note}` : ''}\n\nDuyệt tại: ${appUrl(req)}/admin` }).catch(() => {})
    }
  }
  res.json({ ok: true })
})

router.delete('/submissions/:id', requireAuth, (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'admin_only' })
  const row = db.prepare('SELECT * FROM use_case_submissions WHERE id = ?').get(req.params.id)
  if (!row) return res.json({ ok: true })
  const block = removalCheck(req, row.author_id)
  if (block) return res.status(block.status).json({ error: block.error })
  dropCommentFiles('ucstep', req.params.id)
  db.prepare('DELETE FROM use_case_submissions WHERE id = ?').run(req.params.id)
  db.prepare('DELETE FROM review_comments WHERE submission_id = ?').run(req.params.id)
  afterRemoval(req, { authorId: row.author_id, what: 'use case', title: row.title, content: row.problem })
  res.json({ ok: true })
})

// An approved write-up of an AI Exhibition booth replaces it: what people did on the booth's page
// (comments, upvotes, saves, "đã áp dụng") moves to the use case, and links to the booth point at it.
function takeOverBooth(row) {
  const booth = (parseExtra(row.extra) || {}).booth
  if (!booth || !PENDING_BY_ID.has(booth)) return
  db.transaction(() => {
    for (const table of ['use_case_reactions', 'use_case_saves', 'use_case_applied']) {
      db.prepare(`UPDATE OR IGNORE ${table} SET use_case_id = ? WHERE use_case_id = ?`).run(row.id, booth)
      db.prepare(`DELETE FROM ${table} WHERE use_case_id = ?`).run(booth)
    }
    db.prepare('UPDATE use_case_comments SET use_case_id = ? WHERE use_case_id = ?').run(row.id, booth)
    const from = '/use-cases/' + booth, to = '/use-cases/' + row.id
    db.prepare("UPDATE notifications SET href = ? || substr(href, ?) WHERE href = ? OR href LIKE ? OR href LIKE ?")
      .run(to, from.length + 1, from, from + '#%', from + '?%')
    // the owners' "N lượt quan tâm" and "Admin mời" reminders are done with
    db.prepare("DELETE FROM notifications WHERE ref IN (?, ?)").run('interest:' + booth, 'invite:' + booth)
  })()
}

router.post('/submissions/:id/review', requireAuth, (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'admin_only' })
  const { id } = req.params
  const status = req.body?.status
  const note = String(req.body?.note || '').trim().slice(0, 2000)
  if (!['approved', 'rejected', 'changes_requested'].includes(status)) return res.status(400).json({ error: 'invalid_status' })
  // "Yêu cầu chỉnh sửa" may rely on the comments pinned on the review page instead of a note.
  const openComments = db.prepare('SELECT COUNT(*) n FROM review_comments WHERE submission_id = ? AND parent_id IS NULL AND resolved_at IS NULL').get(id).n
  if (status !== 'approved' && !note && !(status === 'changes_requested' && openComments)) return res.status(400).json({ error: 'note_required' })
  const before = db.prepare('SELECT * FROM use_case_submissions WHERE id = ?').get(id)
  if (!before) return res.status(404).json({ error: 'not_found' })
  db.prepare(`UPDATE use_case_submissions SET review_status = ?, admin_note = ?, reviewed_at = datetime('now'), reviewed_by = ?,
    published_at = CASE WHEN ? = 'approved' THEN COALESCE(published_at, datetime('now')) ELSE published_at END WHERE id = ?`).run(status, note, req.user.id, status, id)
  const row = db.prepare('SELECT * FROM use_case_submissions WHERE id = ?').get(id)
  const author = db.prepare('SELECT * FROM users WHERE id = ?').get(row.author_id)
  if (status === 'approved') takeOverBooth(row)
  if (author) {
    const link = `${appUrl(req)}${status === 'approved' ? `/use-cases/${encodeURIComponent(row.id)}` : '/profile#usecase'}`
    const msg = {
      approved: {
        n: { kind: 'approved', text: `Use case "${row.title}" của bạn đã được duyệt và đăng lên Use Case Library${note ? ` — Admin: ${note}` : ''}`, href: `/use-cases/${encodeURIComponent(row.id)}` },
        subject: 'Use case của bạn đã được duyệt',
        text: `Chúc mừng! Use case "${row.title}" đã được duyệt và hiển thị trong Use Case Library.${note ? `\n\nLời nhắn của Admin: ${note}` : ''}\n\nXem tại: ${link}`,
      },
      rejected: {
        n: { kind: 'rejected', text: `Use case "${row.title}" của bạn bị từ chối: ${note}`, href: '/profile#usecase' },
        subject: 'Use case của bạn bị từ chối',
        text: `Use case "${row.title}" chưa được duyệt.\n\nLý do: ${note}\n\nXem tại: ${link}`,
      },
      changes_requested: {
        n: { kind: 'changes', text: `Use case "${row.title}" cần bổ sung trước khi duyệt${openComments ? ` (${openComments} góp ý)` : ''}${note ? `: ${note}` : ''}`, href: `/review/${encodeURIComponent(row.id)}` },
        subject: 'Use case của bạn cần chỉnh sửa / bổ sung',
        text: `Admin đã xem use case "${row.title}" và cần bạn chỉnh sửa / bổ sung trước khi duyệt.${note ? `\n\n${note}` : ''}${openComments ? `\n\nCó ${openComments} góp ý được ghi ngay trên từng đoạn của bài.` : ''}\n\nXem góp ý và chỉnh sửa tại: ${appUrl(req)}/review/${encodeURIComponent(row.id)}`,
      },
    }[status]
    notify(author.email, msg.n)
    sendMail({ to: author.email, subject: msg.subject, text: msg.text }).catch(() => {})
  }
  res.json({ ok: true })
})

export const deleteUseCaseCommentTx = db.transaction((commentId) => {
  for (const id of [commentId, ...db.prepare('SELECT id FROM use_case_comments WHERE parent_id = ?').all(commentId).map((r) => r.id)]) db.prepare("DELETE FROM comment_reactions WHERE kind = 'uccomment' AND comment_id = ?").run(id)
  dropCommentFiles('uccomment', [commentId, ...db.prepare('SELECT id FROM use_case_comments WHERE parent_id = ?').all(commentId).map((r) => r.id)])
  db.prepare('DELETE FROM use_case_comments WHERE parent_id = ?').run(commentId)
  db.prepare('DELETE FROM use_case_comments WHERE id = ?').run(commentId)
})

// Like / unlike a comment on a use case.
router.post('/:id/comments/:commentId/react', requireAuth, (req, res) => {
  const { id, commentId } = req.params
  if (!db.prepare('SELECT 1 FROM use_case_comments WHERE id = ? AND use_case_id = ?').get(commentId, id)) return res.status(404).json({ error: 'not_found' })
  const has = db.prepare("SELECT 1 FROM comment_reactions WHERE kind = 'uccomment' AND comment_id = ? AND user_id = ?").get(commentId, req.user.id)
  if (has) db.prepare("DELETE FROM comment_reactions WHERE kind = 'uccomment' AND comment_id = ? AND user_id = ?").run(commentId, req.user.id)
  else db.prepare("INSERT INTO comment_reactions (kind, comment_id, user_id) VALUES ('uccomment', ?, ?)").run(commentId, req.user.id)
  res.json({ ok: true })
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
  const block = removalCheck(req, c.author_id)
  if (block) return res.status(block.status).json({ error: block.error })
  deleteUseCaseCommentTx(c.id)
  afterRemoval(req, { authorId: c.author_id, what: 'bình luận', title: '', content: c.body })
  res.json({ ok: true })
})

export default router
