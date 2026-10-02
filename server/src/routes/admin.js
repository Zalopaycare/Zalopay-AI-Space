import { colorOf, avatarUrlOf } from '../avatarColors.js'
import express from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'
import { domainName, initialsOf } from '../mentions.js'
import { adminReportRoutes } from '../reports.js'
import { directoryStatus } from '../directory.js'
import { vnDay } from '../auth.js'
import { onlineNow, lastSeen } from '../presence.js'
import { showcaseCases } from '../showcase.js'

const router = express.Router()

router.use(requireAuth, (req, res, next) => (req.user.is_admin ? next() : res.status(403).json({ error: 'admin_only' })))

// Everyone who has signed in, with what they've contributed.
router.get('/users', (req, res) => {
  const count = (sql) => Object.fromEntries(db.prepare(sql).all().map((r) => [r.id, r.n]))
  const questions = count('SELECT author_id id, COUNT(*) n FROM questions GROUP BY author_id')
  const answers = count('SELECT author_id id, COUNT(*) n FROM question_answers GROUP BY author_id')
  const useCases = count('SELECT author_id id, COUNT(*) n FROM use_case_submissions GROUP BY author_id')
  const comments = count('SELECT author_id id, COUNT(*) n FROM use_case_comments GROUP BY author_id')
  // Last day (Vietnam time) the person used the site — from user_days, already recorded on every visit.
  const lastDay = Object.fromEntries(db.prepare('SELECT user_id id, MAX(day) d FROM user_days GROUP BY user_id').all().map((r) => [r.id, r.d]))
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all().map((u) => ({
    id: u.id, name: u.name, domain: domainName(u.email, u.name), email: u.email, initials: initialsOf(u),
    avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u), isAdmin: !!u.is_admin, joined: u.created_at, team: u.team || '',
    questions: questions[u.id] || 0, answers: answers[u.id] || 0, useCases: useCases[u.id] || 0, comments: comments[u.id] || 0,
    lastActive: lastDay[u.id] || null,
  }))
  res.json({ users })
})

// ---- One definition of every count, shared by the KPI cards, the leaderboard and the department
// table (they used to count "comments" three different ways). "Comment" = every reply anyone
// writes: answers to questions + replies under answers + comments on use cases.
const DAY = 86_400_000
const tsOf = (t) => new Date(String(t).replace(' ', 'T') + 'Z').getTime() // SQLite datetime() is UTC
const COMMENT_SOURCES = ['question_answers', 'answer_comments', 'use_case_comments']
const rowsSince = (table, since, extra = '') => db.prepare(`SELECT author_id, created_at FROM ${table} WHERE created_at >= ? ${extra}`).all(since || '0000')
const byAuthor = (rows) => { const m = {}; for (const r of rows) m[r.author_id] = (m[r.author_id] || 0) + 1; return m }
const sqlSince = (ms) => new Date(ms).toISOString().replace('T', ' ').slice(0, 19)

/** Per-user counts for one period (since = SQLite UTC timestamp, or null for all time). */
function contributions(since) {
  return {
    questions: byAuthor(rowsSince('questions', since)),
    answers: byAuthor(rowsSince('question_answers', since)),
    replies: byAuthor([...rowsSince('answer_comments', since), ...rowsSince('use_case_comments', since)]),
    useCases: byAuthor(rowsSince('use_case_submissions', since)),
    approvedUseCases: byAuthor(rowsSince('use_case_submissions', since, "AND review_status = 'approved'")),
  }
}

/** total + added today / yesterday (Vietnam calendar days) for a list of created_at values. */
function kpi(times) {
  const today = vnDay(), yesterday = vnDay(Date.now() - DAY)
  let t = 0, y = 0
  for (const c of times) { const d = vnDay(tsOf(c)); if (d === today) t++; else if (d === yesterday) y++ }
  return { total: times.length, today: t, yesterday: y }
}

// Dashboard numbers: KPIs, active users, top contributors, per-department breakdown, weekly trend.
router.get('/stats', (req, res) => {
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

  const times = (table) => db.prepare(`SELECT created_at FROM ${table}`).all().map((r) => r.created_at)
  const kpis = {
    questions: kpi(times('questions')),
    submissions: kpi(times('use_case_submissions')),
    users: kpi(times('users')),
    comments: kpi(COMMENT_SOURCES.flatMap(times)),
  }

  const users = db.prepare('SELECT * FROM users').all()
  const periods = { last30: sqlSince(Date.now() - 30 * DAY), all: null }
  const leaderboard = {}, departments = {}
  const activeWeek = new Set(db.prepare('SELECT DISTINCT user_id id FROM user_days WHERE day >= ?').all(vnDay(Date.now() - 6 * DAY)).map((r) => r.id))
  for (const [key, since] of Object.entries(periods)) {
    const c = contributions(since)
    const likes = {}
    const addLikes = (sql) => { for (const r of db.prepare(sql).all(since || '0000')) likes[r.id] = (likes[r.id] || 0) + r.n }
    addLikes('SELECT q.author_id id, COUNT(*) n FROM question_reactions x JOIN questions q ON q.id = x.question_id WHERE q.created_at >= ? GROUP BY q.author_id')
    addLikes('SELECT a.author_id id, COUNT(*) n FROM answer_reactions x JOIN question_answers a ON a.id = x.answer_id WHERE a.created_at >= ? GROUP BY a.author_id')
    addLikes('SELECT s.author_id id, COUNT(*) n FROM use_case_reactions x JOIN use_case_submissions s ON s.id = x.use_case_id WHERE s.created_at >= ? GROUP BY s.author_id')
    leaderboard[key] = users.map((u) => {
      const row = { id: u.id, name: u.name, domain: domainName(u.email, u.name), initials: initialsOf(u), avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u), team: u.team || '',
        questions: c.questions[u.id] || 0, answers: c.answers[u.id] || 0, comments: c.replies[u.id] || 0, likes: likes[u.id] || 0, useCases: c.approvedUseCases[u.id] || 0 }
      // Ranked by the plain total of contributions (no weighted score shown any more).
      row.score = row.answers + row.comments + row.likes + row.questions + row.useCases
      return row
    }).filter((r) => r.score > 0).sort((x, y) => y.score - x.score).slice(0, 10)

    const depts = {}
    for (const u of users) {
      const k = u.team || ''
      const d = (depts[k] = depts[k] || { team: k, members: 0, active7: 0, questions: 0, comments: 0, useCases: 0 })
      d.members++; if (activeWeek.has(u.id)) d.active7++
      // comments = answers + replies/comments: the same total as the "Comment & reply" card
      d.questions += c.questions[u.id] || 0; d.comments += (c.answers[u.id] || 0) + (c.replies[u.id] || 0); d.useCases += c.useCases[u.id] || 0
    }
    departments[key] = Object.values(depts).sort((x, y) => (y.questions + y.comments + y.useCases) - (x.questions + x.comments + x.useCases) || y.members - x.members)
  }

  // Weekly trend, 8 weeks ending with the current one (weeks start Monday, Vietnam time).
  const vnMs = (ms) => ms + 7 * 3600_000
  const mondayOf = (ms) => { const d = new Date(vnMs(ms)); const wd = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - wd) }
  const thisMonday = mondayOf(Date.now())
  const starts = Array.from({ length: 8 }, (_, i) => thisMonday - (7 - i) * 7 * DAY)
  const bucket = (list) => {
    const n = starts.map(() => 0)
    for (const c of list) { const i = starts.indexOf(mondayOf(tsOf(c))); if (i >= 0) n[i]++ }
    return n
  }
  const weeks = {
    starts: starts.map((ms) => new Date(ms).toISOString().slice(0, 10)),
    members: bucket(times('users')),
    questions: bucket(times('questions')),
    useCases: bucket(times('use_case_submissions')),
    comments: bucket(COMMENT_SOURCES.flatMap(times)),
  }

  res.json({ activity, kpis, leaderboard, departments, weeks })
})

// People online right now + everyone who has used the site today (Vietnam time).
router.get('/live', (req, res) => {
  const brief = (u) => ({ id: u.id, name: u.name, domain: domainName(u.email, u.name), email: u.email, initials: initialsOf(u), avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u), team: u.team || '', isAdmin: !!u.is_admin })
  const byId = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  const online = onlineNow().map((p) => { const u = byId(p.id); return u ? { ...brief(u), at: p.at, path: p.path } : null }).filter(Boolean).sort((a, b) => b.at - a.at)
  const today = db.prepare('SELECT u.* FROM user_days d JOIN users u ON u.id = d.user_id WHERE d.day = ?').all(vnDay())
    .map((u) => ({ ...brief(u), lastAt: lastSeen(u.id)?.at || null }))
    .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0) || a.domain.localeCompare(b.domain))
  res.json({ online, today, now: Date.now() })
})

// Every use case that is live on the site (same list as the Use Case library): the showcase cases
// plus approved community posts, with their upvotes, comments, saves and "Tôi đã áp dụng".
router.get('/published', (req, res) => {
  const n = (sql, id) => db.prepare(sql).get(id).n
  const stats = (id) => ({
    upvotes: n('SELECT COUNT(*) n FROM use_case_reactions WHERE use_case_id = ?', id),
    comments: n('SELECT COUNT(*) n FROM use_case_comments WHERE use_case_id = ?', id),
    saves: n('SELECT COUNT(*) n FROM use_case_saves WHERE use_case_id = ?', id),
    applied: n('SELECT COUNT(*) n FROM use_case_applied WHERE use_case_id = ?', id),
  })
  const showcase = showcaseCases.map((c) => ({ id: c.id, source: 'showcase', title: c.title, author: c.ownerName && !/cần bổ sung/.test(c.ownerName) ? c.ownerName : c.author, team: /cần bổ sung/.test(c.ownerTeam || '') ? '' : c.ownerTeam || '', type: c.type || '', status: c.status || '', postedAt: c.postedAt || null, ...stats(c.id) }))
  const subs = db.prepare("SELECT * FROM use_case_submissions WHERE review_status = 'approved'").all().map((r) => {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(r.author_id)
    const rv = r.reviewed_by ? db.prepare('SELECT email, name FROM users WHERE id = ?').get(r.reviewed_by) : null
    return { id: r.id, source: 'community', title: r.title, author: u ? domainName(u.email, u.name) : 'Người dùng đã xoá', team: r.team || '', type: '', status: r.status_field || '', postedAt: r.published_at || r.created_at, approvedBy: rv ? domainName(rv.email, rv.name) : null, ...stats(r.id) }
  })
  res.json({ useCases: [...subs, ...showcase].sort((a, b) => String(b.postedAt || '').localeCompare(String(a.postedAt || '')) || b.id.localeCompare(a.id, undefined, { numeric: true })) })
})

router.get('/directory-status', async (req, res) => res.json(await directoryStatus(req.user.id)))

router.use('/reports', adminReportRoutes)

export default router
