import { colorOf, avatarUrlOf } from '../avatarColors.js'
import express from 'express'
import { db } from '../db.js'
import { requireAuth, getOrCreateUser, isCompanyEmail, normalizeEmail, envAdminEmails } from '../auth.js'
import { domainName, initialsOf, handleOf } from '../mentions.js'
import { anonName } from '../anon.js'
import { adminReportRoutes } from '../reports.js'
import { directoryStatus } from '../directory.js'
import { sendMail } from '../mailer.js'
import { appUrl } from '../mentions.js'
import { vnDay } from '../auth.js'
import { onlineNow, lastSeen } from '../presence.js'
import { maintenanceOn, setMaintenance, maintenanceChange } from '../maintenance.js'
import { visibleShowcase, hideShowcase } from '../showcase.js'
import { reviewCommenters } from './useCases.js'

const router = express.Router()
const orgInfo = (raw) => { try { return raw ? JSON.parse(raw) : null } catch { return null } }

router.use(requireAuth, (req, res, next) => (req.user.is_admin ? next() : res.status(403).json({ error: 'admin_only' })))

// ---- Quản trị viên: who the admins are, and adding / removing them from the console ----
// ADMIN_EMAILS (a Coolify setting) are admins at every sign-in, so they're listed but can't be removed here.
const envAdmins = envAdminEmails
function adminList() {
  const env = new Set(envAdmins())
  const rows = db.prepare('SELECT * FROM users WHERE is_admin = 1 ORDER BY name COLLATE NOCASE').all()
  const listed = new Set(rows.map((u) => u.email.toLowerCase()))
  return [
    ...rows.map((u) => ({ email: u.email, name: domainName(u.email, u.name), initials: initialsOf(u), avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u), fromEnv: env.has(u.email.toLowerCase()) })),
    // in ADMIN_EMAILS but never signed in yet
    ...[...env].filter((e) => !listed.has(e)).map((e) => ({ email: e, name: handleOf(e), initials: handleOf(e).slice(0, 2).toUpperCase(), fromEnv: true })),
  ]
}
router.get('/admins', (req, res) => res.json({ admins: adminList() }))
// Body { email }: the account becomes an admin; someone who hasn't signed in yet gets their account made now.
router.post('/admins', (req, res) => {
  // cleaned like a sign-in (quotes, <…>, spaces): a pasted "Tên" <ten@vng.com.vn> used to make a second account
  const email = normalizeEmail(req.body?.email)
  if (!isCompanyEmail(email)) return res.status(400).json({ error: 'bad_email', message: 'Nhập email công ty, ví dụ ten@vng.com.vn.' })
  const u = getOrCreateUser(email)
  db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(u.id)
  res.json({ admins: adminList() })
})
router.delete('/admins/:email', (req, res) => {
  const email = String(req.params.email || '').trim().toLowerCase()
  if (envAdmins().includes(email)) return res.status(400).json({ error: 'from_env', message: 'Admin này nằm trong cấu hình ADMIN_EMAILS trên Coolify, bỏ ở đó.' })
  if (email === req.user.email.toLowerCase()) return res.status(400).json({ error: 'self', message: 'Không tự bỏ quyền admin của mình được.' })
  db.prepare('UPDATE users SET is_admin = 0 WHERE lower(email) = ?').run(email)
  res.json({ admins: adminList() })
})

// Everything that ties an account to the site's content or history. "Xoá tài khoản" only goes ahead when
// all of these are 0, so a delete never leaves a post, reply, reaction or admin decision without its person.
const USER_REFS = [
  ['questions', 'author_id', 'post'], ['question_answers', 'author_id', 'trả lời'], ['answer_comments', 'author_id', 'reply'],
  ['use_case_submissions', 'author_id', 'use case đã gửi'], ['use_case_comments', 'author_id', 'bình luận use case'],
  ['review_comments', 'author_id', 'góp ý duyệt bài'], ['admin_chat_messages', 'user_id', 'tin nhắn Chat với Admin'], ['admin_chat_messages', 'sender_id', 'tin nhắn Chat với Admin'],
  ['question_reactions', 'user_id', 'lượt thích'], ['answer_reactions', 'user_id', 'lượt thích'], ['use_case_reactions', 'user_id', 'lượt thích'], ['comment_reactions', 'user_id', 'lượt thích'],
  ['saved_questions', 'user_id', 'lượt lưu'], ['use_case_saves', 'user_id', 'lượt lưu'], ['use_case_applied', 'user_id', '"Tôi đã áp dụng"'],
  ['use_case_ratings', 'user_id', 'đánh giá'], ['use_case_interest', 'user_id', 'lượt quan tâm booth'], ['reports', 'reporter_id', 'báo cáo đã gửi'],
  ['use_case_submissions', 'reviewed_by', 'quyết định duyệt bài'], ['review_comments', 'resolved_by', 'quyết định duyệt bài'], ['access_requests', 'decided_by', 'quyết định duyệt bài'],
  ['staff_grants', 'granted_by', 'quyết định duyệt bài'], ['booth_invites', 'invited_by', 'quyết định duyệt bài'], ['rename_flags', 'by_user', 'quyết định duyệt bài'],
]
// a table this install hasn't created yet (it's made by the feature that uses it) just counts 0
const safeAll = (sql, ...args) => { try { return db.prepare(sql).all(...args) } catch { return [] } }
/** [{ what, n }] still linked to one account (non-zero only, same labels merged). */
function userRefs(id) {
  const m = {}
  for (const [table, col, what] of USER_REFS) { const n = safeAll(`SELECT COUNT(*) n FROM ${table} WHERE ${col} = ?`, id)[0]?.n || 0; if (n) m[what] = (m[what] || 0) + n }
  return Object.entries(m).map(([what, n]) => ({ what, n }))
}

// Everyone who has signed in, with what they've contributed.
router.get('/users', (req, res) => {
  const count = (sql) => Object.fromEntries(db.prepare(sql).all().map((r) => [r.id, r.n]))
  // what still links each account to the site (USER_REFS), { 'thread': 2, 'lượt thích': 5 }: empty = may be deleted
  const links = {}
  for (const [table, col, what] of USER_REFS) {
    for (const r of safeAll(`SELECT ${col} id, COUNT(*) n FROM ${table} WHERE ${col} IS NOT NULL GROUP BY ${col}`)) { const m = (links[r.id] = links[r.id] || {}); m[what] = (m[what] || 0) + r.n }
  }
  const questions = count('SELECT author_id id, COUNT(*) n FROM questions GROUP BY author_id')
  const answers = count('SELECT author_id id, COUNT(*) n FROM question_answers GROUP BY author_id')
  const useCases = count('SELECT author_id id, COUNT(*) n FROM use_case_submissions GROUP BY author_id')
  const comments = count('SELECT author_id id, COUNT(*) n FROM use_case_comments GROUP BY author_id')
  // Last day (Vietnam time) the person used the site — from user_days, already recorded on every visit.
  const lastDay = Object.fromEntries(db.prepare('SELECT user_id id, MAX(day) d FROM user_days GROUP BY user_id').all().map((r) => [r.id, r.d]))
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all().map((u) => ({
    id: u.id, name: u.name, domain: domainName(u.email, u.name), email: u.email, initials: initialsOf(u),
    avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u), isAdmin: !!u.is_admin, joined: u.created_at, team: u.team || '',
    // what Microsoft said about their organisation at the last SSO sign-in (staffCheck.js), and whether that counts as Zalopay
    org: orgInfo(u.org_info), staff: !!u.staff_ok,
    questions: questions[u.id] || 0, answers: answers[u.id] || 0, useCases: useCases[u.id] || 0, comments: comments[u.id] || 0,
    lastActive: lastDay[u.id] || null, links: links[u.id] || {},
  }))
  res.json({ users })
})

// "Xoá tài khoản" (Thành viên › ⋯): for accounts with nothing on the site, e.g. a duplicate made by a
// mistyped email. Refused, with what is still linked, when anything is; never yourself or an ADMIN_EMAILS admin.
router.delete('/users/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id))
  if (!u) return res.status(404).json({ error: 'not_found', message: 'Không tìm thấy tài khoản này, có thể đã bị xoá.' })
  if (u.id === req.user.id) return res.status(400).json({ error: 'self', message: 'Không tự xoá tài khoản của mình được.' })
  // exact address: a dirty copy ("an"@…) of an ADMIN_EMAILS admin can still be deleted
  if (envAdmins().includes(u.email.toLowerCase())) return res.status(400).json({ error: 'from_env', message: 'Tài khoản này nằm trong ADMIN_EMAILS trên Coolify nên không xoá được.' })
  const refs = userRefs(u.id)
  if (refs.length) {
    return res.status(409).json({ error: 'has_content', refs,
      message: `Không xoá được: tài khoản này vẫn còn ${refs.map((r) => `${r.n} ${r.what}`).join(', ')}. Chỉ xoá được tài khoản chưa có nội dung hay hoạt động nào trên AI Space.` })
  }
  db.transaction(() => {
    // what's left is the account's own bookkeeping: days active, chat read marks, directory token, inbox, sign-in codes
    for (const t of ['user_days', 'admin_chat_seen', 'graph_tokens']) { try { db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(u.id) } catch { /* table not created on this install */ } }
    db.prepare('DELETE FROM notifications WHERE email = ?').run(u.email)
    db.prepare('DELETE FROM login_codes WHERE email = ?').run(u.email)
    db.prepare('DELETE FROM users WHERE id = ?').run(u.id)
  })()
  console.log('[admin] account deleted:', u.id, 'by', req.user.id)
  res.json({ ok: true })
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
  // Everyone who has ever signed in (old "+tag" alias accounts left out), most recently active first.
  const members = db.prepare(`SELECT u.*, (SELECT MAX(day) FROM user_days d WHERE d.user_id = u.id) AS last_day FROM users u WHERE u.email NOT LIKE '%+%@%'`).all()
    .map((u) => ({ ...brief(u), lastAt: lastSeen(u.id)?.at || null, lastDay: u.last_day || String(u.created_at || '').slice(0, 10) || null }))
    .sort((a, b) => String(b.lastDay || '').localeCompare(String(a.lastDay || '')) || (b.lastAt || 0) - (a.lastAt || 0) || a.domain.localeCompare(b.domain))
  res.json({ online, today, members, todayDay: vnDay(), now: Date.now() })
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
  const showcase = visibleShowcase().map((c) => ({ id: c.id, source: 'showcase', title: c.title, author: c.ownerName && !/cần bổ sung/.test(c.ownerName) ? c.ownerName : c.author, team: /cần bổ sung/.test(c.ownerTeam || '') ? '' : c.ownerTeam || '', type: c.type || '', status: c.status || '', postedAt: c.postedAt || null, ...stats(c.id) }))
  const subs = db.prepare("SELECT * FROM use_case_submissions WHERE review_status = 'approved'").all().map((r) => {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(r.author_id)
    const rv = r.reviewed_by ? db.prepare('SELECT email, name FROM users WHERE id = ?').get(r.reviewed_by) : null
    return { id: r.id, source: 'community', title: r.title, author: u ? domainName(u.email, u.name) : 'Người dùng đã xoá', account: u ? handleOf(u.email) : '', anonymous: !!r.anonymous, alias: r.anonymous ? anonName(r) : null, team: r.team || '', type: '', status: r.status_field || '', postedAt: r.published_at || r.created_at, approvedBy: rv ? domainName(rv.email, rv.name) : null, reviewCommenters: rv ? [] : reviewCommenters(r.id), ...stats(r.id) }
  })
  res.json({ useCases: [...subs, ...showcase].sort((a, b) => String(b.postedAt || '').localeCompare(String(a.postedAt || '')) || b.id.localeCompare(a.id, undefined, { numeric: true })) })
})

router.delete('/showcase/:id', (req, res) => {
  if (!hideShowcase(req.params.id)) return res.status(404).json({ error: 'not_found' })
  res.json({ ok: true })
})

router.get('/directory-status', async (req, res) => res.json(await directoryStatus(req.user.id)))

// ---- Access requests, and the access granted. Two kinds: someone turned away at sign-in because Microsoft
// doesn't list them under Zalopay (staffCheck.js, 'staff'), and someone signed in while the site is under
// maintenance (maintenance.js, 'maintenance'). Plus the admins' Publish / Bật bảo trì switch. ----
const maintenanceAllowEnv = () => String(process.env.MAINTENANCE_ALLOW || '').replace(/['"]/g, '').split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)
const accessList = () => ({
  requests: db.prepare(`SELECT r.*, u.name decider FROM access_requests r LEFT JOIN users u ON u.id = r.decided_by
    ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.id DESC LIMIT 200`).all()
    .map((r) => ({ id: r.id, kind: r.kind || 'staff', email: r.email, name: r.name, org: orgInfo(r.org_info), note: r.note, status: r.status, time: r.created_at, decidedAt: r.decided_at, decider: r.decider || '' })),
  grants: db.prepare('SELECT g.email, g.created_at time, u.name granter FROM staff_grants g LEFT JOIN users u ON u.id = g.granted_by ORDER BY g.created_at DESC').all(),
  maintenance: {
    on: maintenanceOn(),
    change: maintenanceChange(),
    grants: db.prepare('SELECT g.email, g.created_at time, u.name granter FROM maintenance_grants g LEFT JOIN users u ON u.id = g.granted_by ORDER BY g.created_at DESC').all(),
    allowEnv: maintenanceAllowEnv(),
  },
})
router.get('/access', (req, res) => res.json(accessList()))
router.post('/access/:id/:decision', (req, res) => {
  const r = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(Number(req.params.id))
  if (!r) return res.status(404).json({ error: 'not_found' })
  const approve = req.params.decision === 'approve'
  if (!approve && req.params.decision !== 'reject') return res.status(400).json({ error: 'bad_decision' })
  const kind = r.kind || 'staff'
  // someone let in while the site is closed can use it right away, whichever way they asked
  const letInNow = approve && maintenanceOn()
  db.transaction(() => {
    // every open request of that kind from that person is settled at once
    db.prepare("UPDATE access_requests SET status = ?, decided_at = datetime('now'), decided_by = ? WHERE email = ? AND kind = ? AND status = 'pending'").run(approve ? 'approved' : 'rejected', req.user.id, r.email, kind)
    if (approve && kind === 'staff') db.prepare('INSERT OR IGNORE INTO staff_grants (email, granted_by) VALUES (?, ?)').run(r.email, req.user.id)
    if (letInNow) db.prepare('INSERT OR IGNORE INTO maintenance_grants (email, granted_by) VALUES (?, ?)').run(r.email, req.user.id)
  })()
  db.prepare("UPDATE notifications SET read = 1 WHERE kind = 'access' AND text LIKE ?").run(`%${r.name || r.email}%`)
  const mail = kind === 'maintenance'
    ? (approve
      ? { subject: 'Bạn đã được vào Zalopay AI Space', text: `Admin đã cho bạn vào AI Space trong lúc web đang bảo trì. Mở lại trang tại: ${appUrl(req)}` }
      : { subject: 'Yêu cầu vào Zalopay AI Space chưa được duyệt', text: 'AI Space đang bảo trì và Admin chưa mở cho bạn vào lúc này. Bạn sẽ vào được khi web mở lại cho mọi người.' })
    : (approve
      ? { subject: 'Bạn đã được cấp quyền vào Zalopay AI Space', text: `Admin đã cấp quyền cho bạn${letInNow ? ', kể cả trong lúc web đang bảo trì' : ''}. Đăng nhập lại bằng tài khoản Microsoft tại: ${appUrl(req)}` }
      : { subject: 'Yêu cầu truy cập Zalopay AI Space chưa được duyệt', text: 'Admin chưa xác nhận được bạn là nhân viên Zalopay nên chưa cấp quyền. Nếu có nhầm lẫn, vui lòng liên hệ Admin AI Space.' })
  sendMail({ to: r.email, ...mail }).catch(() => {})
  res.json(accessList())
})
// Take back access an admin gave: the person's session ends unless Microsoft lists them under Zalopay.
router.delete('/access/grants/:email', (req, res) => {
  const email = String(req.params.email || '').toLowerCase()
  db.prepare('DELETE FROM staff_grants WHERE email = ?').run(email)
  db.prepare('UPDATE users SET staff_ok = 0 WHERE email = ?').run(email)
  res.json(accessList())
})
// Take back "vào khi bảo trì": the person sees the maintenance page again (until the site is published).
router.delete('/access/maintenance-grants/:email', (req, res) => {
  db.prepare('DELETE FROM maintenance_grants WHERE email = ?').run(String(req.params.email || '').toLowerCase())
  res.json(accessList())
})
// Publish (on: false) opens the site to every Zalopay employee again (the Zion / Zalopay check still
// applies); on: true closes it again. Requests to come in during maintenance are moot once it's open.
router.post('/maintenance', (req, res) => {
  const on = req.body?.on === true
  setMaintenance(on, req.user.id)
  if (!on) {
    db.prepare("UPDATE access_requests SET status = 'approved', decided_at = datetime('now'), decided_by = ? WHERE kind = 'maintenance' AND status = 'pending'").run(req.user.id)
    db.prepare("UPDATE notifications SET read = 1 WHERE kind = 'access' AND text LIKE '%trong lúc bảo trì%'").run()
  }
  res.json(accessList())
})

router.use('/reports', adminReportRoutes)

export default router
