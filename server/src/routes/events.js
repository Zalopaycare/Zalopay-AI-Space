import express from 'express'
import { db, nextId } from '../db.js'
import { requireAuth } from '../auth.js'
import { colorOf, avatarUrlOf } from '../avatarColors.js'
import { domainName, initialsOf, appUrl } from '../mentions.js'
import { notify, notifyOnce } from '../notifications.js'
import { sendMail } from '../mailer.js'
import { removalCheck, afterRemoval } from '../moderation.js'

// "Buổi chia sẻ": offline sessions anyone can post (no review), shown in the "Sắp diễn ra" rail beside the
// AI Space feed. People press "Quan tâm"; the host sees who, everyone interested gets an email the day
// before (and when the time or place changes, or it's cancelled), and the .ics adds it to Outlook.
// Times are ISO strings in UTC ("2026-11-12T07:00:00.000Z"), so they compare as text.

db.exec(`
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  location TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES users(id),
  reminded_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT
);
CREATE INDEX IF NOT EXISTS events_starts ON events (starts_at);
CREATE TABLE IF NOT EXISTS event_interests (
  event_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, user_id)
);
`)

const router = express.Router()
const DEFAULT_LENGTH_MS = 60 * 60_000
// a session stays on the rail until it is over (or an hour after it starts, without an end time)
const endOf = (e) => e.ends_at || new Date(new Date(e.starts_at).getTime() + DEFAULT_LENGTH_MS).toISOString()

const userById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id)
const person = (u) => (u ? { id: u.id, name: domainName(u.email, u.name), fullName: u.name, initials: initialsOf(u), avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u) } : null)
const interestedIds = (id) => db.prepare('SELECT user_id FROM event_interests WHERE event_id = ? ORDER BY created_at').all(id).map((r) => r.user_id)

function shape(e, me) {
  const ids = interestedIds(e.id)
  const mine = !!me && e.author_id === me.id
  return {
    id: e.id, title: e.title, description: e.description, startsAt: e.starts_at, endsAt: e.ends_at, location: e.location,
    host: person(userById(e.author_id)), isMine: mine, canEdit: mine || !!me?.is_admin,
    interestCount: ids.length, interested: !!me && ids.includes(me.id),
    // who's coming: the host and the admins see everyone; others see a few faces
    people: ids.slice(0, mine || me?.is_admin ? 500 : 8).map((uid) => person(userById(uid))).filter(Boolean),
    createdAt: e.created_at,
  }
}

const clean = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max)
const isoOrNull = (v) => { const d = new Date(String(v || '')); return isNaN(d) ? null : d.toISOString() }
function readFields(body) {
  const f = { title: clean(body?.title, 160), description: clean(body?.description, 4000), location: clean(body?.location, 200), starts_at: isoOrNull(body?.startsAt), ends_at: body?.endsAt ? isoOrNull(body.endsAt) : null }
  if (!f.title) return { error: 'Cần đặt tên cho buổi chia sẻ.' }
  if (!f.starts_at) return { error: 'Cần chọn ngày giờ bắt đầu.' }
  if (!f.location) return { error: 'Cần ghi địa điểm.' }
  if (f.ends_at && f.ends_at <= f.starts_at) return { error: 'Giờ kết thúc phải sau giờ bắt đầu.' }
  return { f }
}

// Vietnam time for emails: "Thứ 5, 12/11 · 14:00–15:30"
const DAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const vn = (iso) => new Date(new Date(iso).getTime() + 7 * 3600_000)
const p2 = (n) => String(n).padStart(2, '0')
function whenText(e) {
  const s = vn(e.starts_at)
  const day = `${DAYS[s.getUTCDay()]}, ${p2(s.getUTCDate())}/${p2(s.getUTCMonth() + 1)}`
  const t = (d) => `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`
  return `${day} · ${t(s)}${e.ends_at ? '–' + t(vn(e.ends_at)) : ''}`
}

const emailsOfInterested = (id, exceptId) => interestedIds(id).filter((uid) => uid !== exceptId).map((uid) => userById(uid)?.email).filter(Boolean)
function tellInterested(req, e, { text, subject, body, exceptId }) {
  const link = `${appUrl(req)}/?event=${encodeURIComponent(e.id)}`
  for (const to of emailsOfInterested(e.id, exceptId)) {
    notify(to, { kind: 'event', text, href: `/?event=${encodeURIComponent(e.id)}`, actor: req.user.name })
    sendMail({ to, subject, text: `${body}\n\nXem tại: ${link}` }).catch(() => {})
  }
}

// upcoming and ongoing, soonest first
router.get('/', (req, res) => {
  const now = new Date().toISOString()
  const rows = db.prepare('SELECT * FROM events WHERE starts_at >= ? ORDER BY starts_at LIMIT 200').all(new Date(Date.now() - 24 * 3600_000).toISOString())
  res.json({ events: rows.filter((e) => endOf(e) > now).map((e) => shape(e, req.user)) })
})

router.get('/:id', (req, res) => {
  const e = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id)
  if (!e) return res.status(404).json({ error: 'not_found' })
  res.json({ event: { ...shape(e, req.user), past: endOf(e) <= new Date().toISOString() } })
})

router.post('/', requireAuth, (req, res) => {
  const { f, error } = readFields(req.body)
  if (error) return res.status(400).json({ error: 'invalid', message: error })
  if (f.starts_at < new Date(Date.now() - 5 * 60_000).toISOString()) return res.status(400).json({ error: 'invalid', message: 'Thời gian bắt đầu đã qua rồi.' })
  const id = nextId('e')
  db.prepare('INSERT INTO events (id, title, description, starts_at, ends_at, location, author_id) VALUES (?,?,?,?,?,?,?)')
    .run(id, f.title, f.description, f.starts_at, f.ends_at, f.location, req.user.id)
  res.status(201).json({ event: shape(db.prepare('SELECT * FROM events WHERE id = ?').get(id), req.user) })
})

router.patch('/:id', requireAuth, (req, res) => {
  const e = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id)
  if (!e) return res.status(404).json({ error: 'not_found' })
  if (e.author_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'not_owner' })
  const { f, error } = readFields(req.body)
  if (error) return res.status(400).json({ error: 'invalid', message: error })
  const moved = f.starts_at !== e.starts_at || f.ends_at !== e.ends_at || f.location !== e.location
  // a new time means a new reminder
  db.prepare(`UPDATE events SET title = ?, description = ?, starts_at = ?, ends_at = ?, location = ?, edited_at = datetime('now')${f.starts_at !== e.starts_at ? ', reminded_at = NULL' : ''} WHERE id = ?`)
    .run(f.title, f.description, f.starts_at, f.ends_at, f.location, e.id)
  const after = db.prepare('SELECT * FROM events WHERE id = ?').get(e.id)
  if (moved) {
    tellInterested(req, after, {
      exceptId: req.user.id,
      text: `Buổi chia sẻ "${after.title}" đổi sang ${whenText(after)} tại ${after.location}`,
      subject: `Buổi chia sẻ đổi giờ / địa điểm: ${after.title}`,
      body: `Buổi chia sẻ "${after.title}" mà bạn quan tâm vừa được cập nhật:\n\nThời gian: ${whenText(after)}\nĐịa điểm: ${after.location}`,
    })
  }
  res.json({ event: shape(after, req.user) })
})

router.delete('/:id', requireAuth, (req, res) => {
  const e = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id)
  if (!e) return res.status(404).json({ error: 'not_found' })
  const block = removalCheck(req, e.author_id)
  if (block) return res.status(block.status).json({ error: block.error })
  // only an upcoming session is "cancelled"; a past one just goes
  if (endOf(e) > new Date().toISOString()) {
    tellInterested(req, e, {
      exceptId: req.user.id,
      text: `Buổi chia sẻ "${e.title}" (${whenText(e)}) đã huỷ`,
      subject: `Buổi chia sẻ đã huỷ: ${e.title}`,
      body: `Buổi chia sẻ "${e.title}" (${whenText(e)} tại ${e.location}) mà bạn quan tâm đã huỷ.`,
    })
  }
  db.transaction(() => {
    db.prepare('DELETE FROM event_interests WHERE event_id = ?').run(e.id)
    db.prepare('DELETE FROM events WHERE id = ?').run(e.id)
  })()
  afterRemoval(req, { authorId: e.author_id, what: 'buổi chia sẻ', title: e.title, content: e.description || e.title })
  res.json({ ok: true })
})

router.post('/:id/interest', requireAuth, (req, res) => {
  const e = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id)
  if (!e) return res.status(404).json({ error: 'not_found' })
  const had = db.prepare('SELECT 1 FROM event_interests WHERE event_id = ? AND user_id = ?').get(e.id, req.user.id)
  if (had) db.prepare('DELETE FROM event_interests WHERE event_id = ? AND user_id = ?').run(e.id, req.user.id)
  else db.prepare('INSERT INTO event_interests (event_id, user_id) VALUES (?, ?)').run(e.id, req.user.id)
  // the host: one notification per session, kept up to date
  const host = userById(e.author_id)
  const n = interestedIds(e.id).length
  if (!had && host && host.id !== req.user.id) {
    notifyOnce(host.email, 'event', { ref: 'event-interest:' + e.id, text: n === 1 ? `${domainName(req.user.email, req.user.name)} quan tâm buổi chia sẻ "${e.title}" của bạn` : `${n} người quan tâm buổi chia sẻ "${e.title}" của bạn`, href: `/?event=${encodeURIComponent(e.id)}`, actor: req.user.name })
  }
  res.json({ event: shape(db.prepare('SELECT * FROM events WHERE id = ?').get(e.id), req.user) })
})

// "Thêm vào lịch Outlook": a one-event calendar file
const icsText = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const icsTime = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
router.get('/:id/calendar.ics', (req, res) => {
  const e = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id)
  if (!e) return res.status(404).send('Không tìm thấy buổi chia sẻ.')
  const host = userById(e.author_id)
  const link = `${appUrl(req)}/?event=${encodeURIComponent(e.id)}`
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Zalopay AI Space//Buoi chia se//VI', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id}@zalopay-ai-space`,
    `DTSTAMP:${icsTime(new Date().toISOString())}`,
    `DTSTART:${icsTime(e.starts_at)}`,
    `DTEND:${icsTime(endOf(e))}`,
    `SUMMARY:${icsText(e.title)}`,
    `LOCATION:${icsText(e.location)}`,
    `DESCRIPTION:${icsText([e.description, host ? `Người tổ chức: ${host.name}` : '', `Zalopay AI Space: ${link}`].filter(Boolean).join('\n\n'))}`,
    `URL:${link}`,
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(e.title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ]
  res.set('content-type', 'text/calendar; charset=utf-8')
  res.set('content-disposition', `attachment; filename="buoi-chia-se-${e.id}.ics"`)
  res.send(lines.join('\r\n') + '\r\n')
})

// The day before: everyone interested (and the host) gets an email. Checked every 10 minutes;
// a session posted less than an hour before it starts gets none.
const REMIND_AHEAD_MS = 24 * 3600_000
export function sendEventReminders(baseUrl) {
  const now = Date.now()
  const due = db.prepare('SELECT * FROM events WHERE reminded_at IS NULL AND starts_at > ? AND starts_at <= ?')
    .all(new Date(now + 60 * 60_000).toISOString(), new Date(now + REMIND_AHEAD_MS).toISOString())
  for (const e of due) {
    db.prepare("UPDATE events SET reminded_at = datetime('now') WHERE id = ?").run(e.id)
    const link = `${baseUrl}/?event=${encodeURIComponent(e.id)}`
    const host = userById(e.author_id)
    const n = interestedIds(e.id).length
    for (const to of emailsOfInterested(e.id, e.author_id)) {
      notify(to, { kind: 'event', text: `Nhắc bạn: buổi chia sẻ "${e.title}" diễn ra ${whenText(e)} tại ${e.location}`, href: `/?event=${encodeURIComponent(e.id)}`, actor: host?.name || '' })
      sendMail({ to, subject: `Nhắc lịch: ${e.title} (${whenText(e)})`, text: `Buổi chia sẻ bạn quan tâm sắp diễn ra:\n\n${e.title}\nThời gian: ${whenText(e)}\nĐịa điểm: ${e.location}${host ? `\nNgười tổ chức: ${host.name}` : ''}\n\nXem tại: ${link}` }).catch(() => {})
    }
    if (host && n) sendMail({ to: host.email, subject: `Buổi chia sẻ của bạn sắp diễn ra: ${e.title}`, text: `Buổi chia sẻ "${e.title}" diễn ra ${whenText(e)} tại ${e.location}, đang có ${n} người quan tâm.\n\nXem danh sách tại: ${link}` }).catch(() => {})
  }
}

export default router
