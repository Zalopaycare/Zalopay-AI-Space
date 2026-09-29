import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'
import { domainName } from '../mentions.js'
import { adminReportRoutes } from '../reports.js'
import { directoryStatus } from '../directory.js'

const router = express.Router()

router.use(requireAuth, (req, res, next) => (req.user.is_admin ? next() : res.status(403).json({ error: 'admin_only' })))

// Everyone who has signed in, with what they've contributed.
router.get('/users', (req, res) => {
  const count = (sql) => Object.fromEntries(db.prepare(sql).all().map((r) => [r.id, r.n]))
  const questions = count('SELECT author_id id, COUNT(*) n FROM questions GROUP BY author_id')
  const answers = count('SELECT author_id id, COUNT(*) n FROM question_answers GROUP BY author_id')
  const useCases = count('SELECT author_id id, COUNT(*) n FROM use_case_submissions GROUP BY author_id')
  const comments = count('SELECT author_id id, COUNT(*) n FROM use_case_comments GROUP BY author_id')
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all().map((u) => ({
    id: u.id, name: u.name, domain: domainName(u.email, u.name), email: u.email, initials: u.initials,
    avatarColor: u.avatar_color || null, isAdmin: !!u.is_admin, joined: u.created_at,
    questions: questions[u.id] || 0, answers: answers[u.id] || 0, useCases: useCases[u.id] || 0, comments: comments[u.id] || 0,
  }))
  res.json({ users })
})

router.get('/directory-status', async (req, res) => res.json(await directoryStatus()))

router.use('/reports', adminReportRoutes)

export default router
