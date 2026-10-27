import express from 'express'
import { requireAuth, companyDomains } from '../auth.js'
import { db } from '../db.js'
import { notifyInterest } from '../notifications.js'
import { visibleShowcase, MEDIA_DIR, pendingCases, PENDING_BY_ID } from '../showcase.js'

const router = express.Router()

const interestCount = (id) => db.prepare('SELECT COUNT(*) n FROM use_case_interest WHERE use_case_id = ?').get(id).n
// Tells every member of a booth how many people are interested so far, at each company domain since
// the exhibition only knows account names (whichever mailbox they sign in with shows it).
const pingOwners = (p) => {
  const count = interestCount(p.id)
  for (const acc of p.members || []) for (const d of companyDomains()) notifyInterest(`${acc.toLowerCase()}@${d}`, { ref: 'interest:' + p.id, count, title: p.title })
}
// Members added to pending.js after people already clicked "Quan tâm" get their notification on start.
for (const p of pendingCases) if ((p.members || []).length) pingOwners(p)

const pendingFor = (userId) => pendingCases.map((p) => ({
  id: p.id, booth: p.booth, title: p.title, team: p.team, label: p.label, category: p.category, members: p.members || [],
  interest: interestCount(p.id),
  mine: !!db.prepare('SELECT 1 FROM use_case_interest WHERE use_case_id = ? AND user_id = ?').get(p.id, userId),
}))

router.get('/', requireAuth, (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  res.json({ cases: visibleShowcase(), pending: pendingFor(req.user.id) })
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

// Images only for signed-in users; `private` keeps shared caches from storing them.
router.use('/media', requireAuth, (req, res, next) => { res.set('Cache-Control', 'private, max-age=3600'); next() },
  express.static(MEDIA_DIR, { fallthrough: false, index: false, dotfiles: 'deny' }))

export default router
