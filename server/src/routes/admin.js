import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'
import { domainName } from '../mentions.js'
import { adminReportRoutes } from '../reports.js'
import { directoryStatus } from '../directory.js'
import { vnDay } from '../auth.js'

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
    avatarColor: u.avatar_color || null, isAdmin: !!u.is_admin, joined: u.created_at, team: u.team || '',
    questions: questions[u.id] || 0, answers: answers[u.id] || 0, useCases: useCases[u.id] || 0, comments: comments[u.id] || 0,
  }))
  res.json({ users })
})

// Dashboard numbers: active users, top contributors, per-department breakdown.
router.get('/stats', (req, res) => {
  const DAY = 86_400_000
  const days = Array.from({ length: 14 }, (_, i) => vnDay(Date.now() - (13 - i) * DAY))
  const perDay = Object.fromEntries(db.prepare('SELECT day, COUNT(*) n FROM user_days WHERE day >= ? GROUP BY day').all(days[0]).map((r) => [r.day, r.n]))
  const distinct = (from, to) => db.prepare('SELECT COUNT(DISTINCT user_id) n FROM user_days WHERE day >= ? AND day <= ?').get(from, to).n
  const today = vnDay(), yesterday = vnDay(Date.now() - DAY)
  const activity = {
    series: days.map((d) => ({ day: d, n: perDay[d] || 0 })),
    today: perDay[today] || 0,
    yesterday: perDay[yesterday] || 0,
    wau: distinct(vnDay(Date.now() - 6 * DAY), today),
    prevWau: distinct(vnDay(Date.now() - 13 * DAY), vnDay(Date.now() - 7 * DAY)),
  }

  // Contributions per user, all time and last 30 days (SQLite datetime is UTC, fine for a 30-day window).
  const since30 = new Date(Date.now() - 30 * DAY).toISOString().replace('T', ' ').slice(0, 19)
  const tally = (sql, since) => Object.fromEntries(db.prepare(sql).all(since || '0000').map((r) => [r.id, r.n]))
  const build = (since) => {
    const q = tally('SELECT author_id id, COUNT(*) n FROM questions WHERE created_at >= ? GROUP BY author_id', since)
    const a = tally('SELECT author_id id, COUNT(*) n FROM question_answers WHERE created_at >= ? GROUP BY author_id', since)
    const c1 = tally('SELECT author_id id, COUNT(*) n FROM answer_comments WHERE created_at >= ? GROUP BY author_id', since)
    const c2 = tally('SELECT author_id id, COUNT(*) n FROM use_case_comments WHERE created_at >= ? GROUP BY author_id', since)
    const uc = tally("SELECT author_id id, COUNT(*) n FROM use_case_submissions WHERE review_status = 'approved' AND created_at >= ? GROUP BY author_id", since)
    const likes = {}
    for (const r of db.prepare('SELECT q.author_id id, COUNT(*) n FROM question_reactions x JOIN questions q ON q.id = x.question_id WHERE q.created_at >= ? GROUP BY q.author_id').all(since || '0000')) likes[r.id] = (likes[r.id] || 0) + r.n
    for (const r of db.prepare('SELECT a.author_id id, COUNT(*) n FROM answer_reactions x JOIN question_answers a ON a.id = x.answer_id WHERE a.created_at >= ? GROUP BY a.author_id').all(since || '0000')) likes[r.id] = (likes[r.id] || 0) + r.n
    for (const r of db.prepare('SELECT s.author_id id, COUNT(*) n FROM use_case_reactions x JOIN use_case_submissions s ON s.id = x.use_case_id WHERE s.created_at >= ? GROUP BY s.author_id').all(since || '0000')) likes[r.id] = (likes[r.id] || 0) + r.n
    return db.prepare('SELECT * FROM users').all().map((u) => {
      const row = { id: u.id, name: u.name, domain: domainName(u.email, u.name), initials: u.initials, avatarColor: u.avatar_color || null, team: u.team || '',
        questions: q[u.id] || 0, answers: (a[u.id] || 0), comments: (c1[u.id] || 0) + (c2[u.id] || 0), likes: likes[u.id] || 0, useCases: uc[u.id] || 0 }
      // Weighting: helping others counts most; approved use cases are the biggest single contribution.
      row.score = row.answers * 3 + row.comments + row.likes * 2 + row.questions + row.useCases * 5
      return row
    }).filter((r) => r.score > 0).sort((x, y) => y.score - x.score).slice(0, 10)
  }

  const week0 = vnDay(Date.now() - 6 * DAY)
  const activeWeek = new Set(db.prepare('SELECT DISTINCT user_id id FROM user_days WHERE day >= ?').all(week0).map((r) => r.id))
  const count = (sql) => Object.fromEntries(db.prepare(sql).all().map((r) => [r.id, r.n]))
  const qs = count('SELECT author_id id, COUNT(*) n FROM questions GROUP BY author_id')
  const cs = count('SELECT author_id id, SUM(n) n FROM (SELECT author_id, COUNT(*) n FROM question_answers GROUP BY author_id UNION ALL SELECT author_id, COUNT(*) n FROM answer_comments GROUP BY author_id UNION ALL SELECT author_id, COUNT(*) n FROM use_case_comments GROUP BY author_id) GROUP BY author_id')
  const us = count('SELECT author_id id, COUNT(*) n FROM use_case_submissions GROUP BY author_id')
  const depts = {}
  for (const u of db.prepare('SELECT id, team FROM users').all()) {
    const k = u.team || ''
    const d = (depts[k] = depts[k] || { team: k, members: 0, active7: 0, questions: 0, comments: 0, useCases: 0 })
    d.members++; if (activeWeek.has(u.id)) d.active7++
    d.questions += qs[u.id] || 0; d.comments += cs[u.id] || 0; d.useCases += us[u.id] || 0
  }
  const departments = Object.values(depts).sort((x, y) => (y.questions + y.comments + y.useCases) - (x.questions + x.comments + x.useCases) || y.members - x.members)

  res.json({ activity, leaderboard: { all: build(null), last30: build(since30) }, departments })
})

router.get('/directory-status', async (req, res) => res.json(await directoryStatus(req.user.id)))

router.use('/reports', adminReportRoutes)

export default router
