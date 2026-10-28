import express from 'express'
import { requireAuth } from '../auth.js'
import { db } from '../db.js'
import { notifyInterest, notifyOnce } from '../notifications.js'
import { domainName } from '../mentions.js'
import { visibleShowcase, MEDIA_DIR, pendingCases, PENDING_BY_ID, SHOWCASE_IDS, boothAccounts, boothEmails, isBoothOwner, BOOTH_DOMAIN, COVER_DIR, coverOf, saveCoverFile, saveShowcaseEdit } from '../showcase.js'
import path from 'node:path'

const router = express.Router()

const interestCount = (id) => db.prepare('SELECT COUNT(*) n FROM use_case_interest WHERE use_case_id = ?').get(id).n
// The owners' mailboxes: <account>@vng.com.vn.
const ownerEmails = boothEmails
// Tells a booth's PIC and members how many people are interested so far.
const pingOwners = (p) => {
  const count = interestCount(p.id)
  for (const email of ownerEmails(p)) notifyInterest(email, { ref: 'interest:' + p.id, count, title: p.title, href: '/use-cases/' + p.id })
}
// People added to pending.js after others already clicked "Quan tâm" get their notification on start.
for (const p of pendingCases) if (boothAccounts(p).length) pingOwners(p)

// The owners write a booth up through the share form; the submission carries extra.booth = <booth id>.
const latestSubmission = (boothId) => db.prepare(`SELECT id, review_status, author_id, created_at FROM use_case_submissions
  WHERE json_extract(extra, '$.booth') = ? ORDER BY created_at DESC LIMIT 1`).get(boothId)
// Booths whose write-up is published: the use case replaces the booth (its link redirects there).
const doneBooths = () => Object.fromEntries(db.prepare(`SELECT json_extract(extra, '$.booth') booth, id FROM use_case_submissions
  WHERE review_status = 'approved' AND json_extract(extra, '$.booth') IS NOT NULL ORDER BY COALESCE(published_at, created_at)`).all().map((r) => [r.booth, r.id]))

const pendingFor = (user) => {
  const done = doneBooths()
  return pendingCases.filter((p) => !done[p.id]).map((p) => {
    const owner = isBoothOwner(p, user.email)
    const sub = owner || user.is_admin ? latestSubmission(p.id) : null
    return {
      id: p.id, booth: p.booth, title: p.title, team: p.team, label: p.label, category: p.category, members: p.members || [], problem: p.problem || '', solution: p.solution || '',
      cover: coverOf(p.id),
      interest: interestCount(p.id),
      mine: !!db.prepare('SELECT 1 FROM use_case_interest WHERE use_case_id = ? AND user_id = ?').get(p.id, user.id),
      // the signed-in person is one of the booth's owners: they get "Cập nhật use case này".
      // Admins see the page the way the owners do (adminView says that's why).
      owner: owner || !!user.is_admin, adminView: !owner && !!user.is_admin,
      submission: sub ? { id: sub.id, status: sub.review_status, mine: sub.author_id === user.id } : null,
    }
  })
}

router.get('/', requireAuth, (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  res.json({ cases: visibleShowcase(), pending: pendingFor(req.user), boothDone: doneBooths() })
})

// "Quan tâm" toggle on a booth with no write-up yet; the owners' notification follows the count.
router.post('/pending/:id/interest', requireAuth, (req, res) => {
  const p = PENDING_BY_ID.get(req.params.id)
  if (!p) return res.status(404).json({ error: 'not_found' })
  const mine = !!db.prepare('SELECT 1 FROM use_case_interest WHERE use_case_id = ? AND user_id = ?').get(p.id, req.user.id)
  if (mine) db.prepare('DELETE FROM use_case_interest WHERE use_case_id = ? AND user_id = ?').run(p.id, req.user.id)
  else db.prepare('INSERT INTO use_case_interest (use_case_id, user_id) VALUES (?, ?)').run(p.id, req.user.id)
  pingOwners(p)
  res.json({ interest: interestCount(p.id), mine: !mine })
})

// ---- Admin: the "Booth Exhibition" tracker ----
const requireAdmin = (req, res, next) => (req.user?.is_admin ? next() : res.status(403).json({ error: 'admin_only' }))
const userName = (id) => { const u = id ? db.prepare('SELECT email, name FROM users WHERE id = ?').get(id) : null; return u ? domainName(u.email, u.name) : '' }

router.get('/admin/booths', requireAuth, requireAdmin, (req, res) => {
  const lastInvite = db.prepare('SELECT MAX(created_at) at, COUNT(*) n FROM booth_invites WHERE booth_id = ?')
  // owners who have signed in to AI Space at least once (so they can see the invitation)
  const signedIn = new Set(db.prepare('SELECT email FROM users').all().map((u) => u.email.toLowerCase()))
  res.json({
    booths: pendingCases.map((p) => {
      const sub = latestSubmission(p.id)
      const inv = lastInvite.get(p.id)
      const accounts = boothAccounts(p)
      return {
        id: p.id, booth: p.booth, title: p.title, label: p.label, category: p.category, members: p.members || [], pic: p.pic || [],
        interest: interestCount(p.id),
        status: sub ? sub.review_status : 'not_started',
        submissionId: sub ? sub.id : null, submittedBy: sub ? userName(sub.author_id) : '', submittedAt: sub ? sub.created_at : null,
        invitedAt: inv.at, invites: inv.n,
        ownersOnSite: accounts.filter((a) => signedIn.has(`${a}@${BOOTH_DOMAIN}`)).length, owners: accounts.length,
      }
    }),
  })
})

function invite(p, req) {
  const n = interestCount(p.id)
  const text = `Admin mời bạn cập nhật use case "${p.title}" lên AI Space${n ? ` (${n} người đang quan tâm)` : ''}. Bấm để mở trang và nhập nội dung.`
  for (const email of ownerEmails(p)) notifyOnce(email, 'invite', { ref: 'invite:' + p.id, text, href: '/use-cases/' + p.id, actor: req.user.name })
  db.prepare('INSERT INTO booth_invites (booth_id, invited_by) VALUES (?, ?)').run(p.id, req.user.id)
}

// Invite one booth's owners, or every booth nobody has submitted yet (or whose write-up was rejected).
router.post('/admin/booths/invite', requireAuth, requireAdmin, (req, res) => {
  const todo = pendingCases.filter((p) => { const sub = latestSubmission(p.id); return !sub || sub.review_status === 'rejected' })
  todo.forEach((p) => invite(p, req))
  res.json({ ok: true, invited: todo.length })
})
router.post('/admin/booths/:id/invite', requireAuth, requireAdmin, (req, res) => {
  const p = PENDING_BY_ID.get(req.params.id)
  if (!p) return res.status(404).json({ error: 'not_found' })
  invite(p, req)
  res.json({ ok: true })
})

// A cover an admin added for a case or booth that had none (1920×1080 JPEG, cropped in the browser).
router.get('/cover/:id', requireAuth, (req, res) => {
  if (!SHOWCASE_IDS.has(req.params.id) && !PENDING_BY_ID.has(req.params.id)) return res.status(404).end()
  res.set('Cache-Control', 'private, max-age=86400')
  res.sendFile(path.join(COVER_DIR, `${req.params.id}.jpg`), (e) => { if (e && !res.headersSent) res.status(404).end() })
})
router.post('/admin/cover/:id', requireAuth, requireAdmin, (req, res) => {
  if (!SHOWCASE_IDS.has(req.params.id) && !PENDING_BY_ID.has(req.params.id)) return res.status(404).json({ error: 'not_found' })
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.cover || ''))
  const buf = m ? Buffer.from(m[1], 'base64') : null
  if (!buf || !buf.length || buf.length > 2 * 1024 * 1024) return res.status(400).json({ error: 'bad_cover' })
  saveCoverFile(req.params.id, buf)
  res.json({ cover: coverOf(req.params.id) })
})

// An admin's edit of a showcase case through the share form (laid over the case file; see showcase.js).
const ctxt = (v, max = 8000) => (v == null ? undefined : String(v).replace(/\r\n/g, '\n').trim().slice(0, max))
router.post('/admin/edit/:id', requireAuth, requireAdmin, (req, res) => {
  if (!SHOWCASE_IDS.has(req.params.id)) return res.status(404).json({ error: 'not_found' })
  const b = req.body || {}
  if (!ctxt(b.title)) return res.status(400).json({ error: 'missing_title' })
  const list = (v) => (Array.isArray(v) ? v.map((x) => ctxt(x, 120)).filter(Boolean).slice(0, 30) : undefined)
  const edit = {
    title: ctxt(b.title, 300), oneLine: ctxt(b.oneLine, 400), audience: ctxt(b.audience, 300), level: ['Dễ', 'Trung bình', 'Khó'].includes(b.level) ? b.level : undefined,
    tools: list(b.tools), members: list(b.members),
    problem: ctxt(b.problem), solution: ctxt(b.solution), result: ctxt(b.result),
    prep: ctxt(b.prep), fitYes: ctxt(b.fitYes), fitNo: ctxt(b.fitNo), success: ctxt(b.success), pitfalls: ctxt(b.pitfalls),
    safety: ctxt(b.safety), limits: ctxt(b.limits),
    steps: Array.isArray(b.steps) ? b.steps.slice(0, 15).map((s) => ({ title: ctxt(s && s.title, 160) || '', text: ctxt(s && s.text) || '', prompt: ctxt(s && s.prompt) || '', note: ctxt(s && s.note, 800) || '' })).filter((s) => s.title || s.text || s.prompt) : undefined,
    by: req.user.id, at: new Date().toISOString(),
  }
  saveShowcaseEdit(req.params.id, edit)
  res.json({ ok: true })
})

// Images only for signed-in users; `private` keeps shared caches from storing them.
router.use('/media', requireAuth, (req, res, next) => { res.set('Cache-Control', 'private, max-age=3600'); next() },
  express.static(MEDIA_DIR, { fallthrough: false, index: false, dotfiles: 'deny' }))

export default router
