import express from 'express'
import { db, nextId } from '../db.js'
import { requireAuth } from '../auth.js'
import { colorOf, avatarUrlOf } from '../avatarColors.js'
import { domainName, initialsOf, appUrl, notifyMentions } from '../mentions.js'
import { notify, notifyOnce, notifyParticipants } from '../notifications.js'
import { sendMail, senderAddress } from '../mailer.js'
import { removalCheck, afterRemoval } from '../moderation.js'

// "Sự kiện": anything happening offline that anyone can post (no review), Facebook-event style, shown in
// the "Sự kiện sắp tới" rail beside the AI Space feed. People press "Quan tâm"; the host sees who, and
// everyone interested gets an email the day before (and when the time or place changes, or it's cancelled).
// Pressing "Quan tâm" also sends an Outlook invitation (an iCalendar REQUEST): Accept puts the event in their
// calendar, which then follows it (new time or place, cancelled); taking the interest back sends a CANCEL.
// People comment under it too (event_comments); the host hears of each comment, by email as on a post.
// Times are ISO strings in UTC ("2026-11-12T07:00:00.000Z"), so they compare as text.

db.exec(`
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  location TEXT NOT NULL,
  cover_mime TEXT,
  cover_data BLOB,
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
db.exec(`
CREATE TABLE IF NOT EXISTS event_comments (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS event_comments_event ON event_comments (event_id, created_at);
`)
// all_day: no start time given (starts_at is that day's local midnight, no end time)
if (!db.prepare('PRAGMA table_info(events)').all().some((c) => c.name === 'all_day')) db.exec('ALTER TABLE events ADD COLUMN all_day INTEGER NOT NULL DEFAULT 0')
// Outlook invitations: who currently has the event in their calendar from us (event_invites), and the
// event's iCalendar SEQUENCE, raised with every invitation or cancellation sent so the newest always wins
if (!db.prepare('PRAGMA table_info(events)').all().some((c) => c.name === 'ics_seq')) db.exec('ALTER TABLE events ADD COLUMN ics_seq INTEGER NOT NULL DEFAULT 0')
db.exec(`
CREATE TABLE IF NOT EXISTS event_invites (
  event_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, user_id)
);
`)

const router = express.Router()
// every column but the cover picture itself (served on its own)
const COLS = 'id, title, description, starts_at, ends_at, all_day, location, cover_mime, author_id, reminded_at, created_at, edited_at'
const byId = (id) => db.prepare(`SELECT ${COLS} FROM events WHERE id = ?`).get(id)
const DEFAULT_LENGTH_MS = 60 * 60_000
// an event stays on the rail until it is over: its end time, the end of its day (no time given),
// or an hour after it starts (no end time)
const endOf = (e) => e.ends_at || new Date(new Date(e.starts_at).getTime() + (e.all_day ? 24 * 3600_000 : DEFAULT_LENGTH_MS)).toISOString()

const userById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id)
const person = (u) => (u ? { id: u.id, name: domainName(u.email, u.name), fullName: u.name, initials: initialsOf(u), avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u) } : null)
const interestedIds = (id) => db.prepare('SELECT user_id FROM event_interests WHERE event_id = ? ORDER BY created_at').all(id).map((r) => r.user_id)

function shape(e, me) {
  const ids = interestedIds(e.id)
  const mine = !!me && e.author_id === me.id
  return {
    id: e.id, title: e.title, description: e.description, startsAt: e.starts_at, endsAt: e.ends_at, allDay: !!e.all_day, location: e.location,
    coverUrl: e.cover_mime ? `/api/events/${encodeURIComponent(e.id)}/cover?v=${encodeURIComponent(e.edited_at || e.created_at)}` : null,
    host: person(userById(e.author_id)), isMine: mine, canEdit: mine || !!me?.is_admin,
    interestCount: ids.length, interested: !!me && ids.includes(me.id),
    // who's coming: the host and the admins see everyone; others see a few faces
    people: ids.slice(0, mine || me?.is_admin ? 500 : 8).map((uid) => person(userById(uid))).filter(Boolean),
    commentCount: db.prepare('SELECT COUNT(*) n FROM event_comments WHERE event_id = ?').get(e.id).n,
    createdAt: e.created_at,
  }
}
// oldest first, as a conversation reads
const commentsOf = (id, me) => db.prepare('SELECT * FROM event_comments WHERE event_id = ? ORDER BY created_at, id').all(id).map((c) => ({
  id: c.id, body: c.body, time: c.created_at, author: person(userById(c.author_id)),
  canDelete: !!me && (c.author_id === me.id || !!me.is_admin), isMine: !!me && c.author_id === me.id,
}))

const clean = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max)
const isoOrNull = (v) => { const d = new Date(String(v || '')); return isNaN(d) ? null : d.toISOString() }
function readFields(body) {
  const allDay = body?.allDay === true
  const f = { title: clean(body?.title, 160), description: clean(body?.description, 4000), location: clean(body?.location, 200), starts_at: isoOrNull(body?.startsAt), ends_at: !allDay && body?.endsAt ? isoOrNull(body.endsAt) : null, all_day: allDay ? 1 : 0 }
  if (!f.title) return { error: 'Cần đặt tên cho sự kiện.' }
  if (!f.starts_at) return { error: 'Cần chọn ngày diễn ra.' }
  if (!f.location) return { error: 'Cần ghi địa điểm.' }
  if (f.ends_at && f.ends_at <= f.starts_at) return { error: 'Giờ kết thúc phải sau giờ bắt đầu.' }
  return { f }
}

// Cover picture: "data:image/<png|jpeg|webp|gif>;base64,..." up to 2 MB; null/'' removes it; undefined keeps it.
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
  db.prepare('UPDATE events SET cover_mime = ?, cover_data = ? WHERE id = ?').run(cover ? cover.mime : null, cover ? cover.data : null, id)
}

// Vietnam time for emails: "Thứ 5, 12/11 · 14:00–15:30"
const DAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const vn = (iso) => new Date(new Date(iso).getTime() + 7 * 3600_000)
const p2 = (n) => String(n).padStart(2, '0')
function whenText(e) {
  const s = vn(e.starts_at)
  const day = `${DAYS[s.getUTCDay()]}, ${p2(s.getUTCDate())}/${p2(s.getUTCMonth() + 1)}`
  const t = (d) => `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`
  if (e.all_day) return day
  return `${day} · ${t(s)}${e.ends_at ? '–' + t(vn(e.ends_at)) : ''}`
}

// ---- Outlook invitations (iCalendar, RFC 5545) ----
const icsText = (v) => String(v || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const icsName = (v) => '"' + String(v || '').replace(/["\r\n]/g, '') + '"'
const icsTime = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const icsDate = (d) => `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}`
// lines are folded at 75 bytes (continuations start with a space), never inside a character
function fold(line) {
  const parts = []
  let cur = '', bytes = 0
  for (const ch of line) {
    const b = Buffer.byteLength(ch)
    if (bytes + b > (parts.length ? 74 : 75)) { parts.push(cur); cur = ''; bytes = 0 }
    cur += ch; bytes += b
  }
  parts.push(cur)
  return parts.join('\r\n ')
}
const ORGANIZER = senderAddress || 'no-reply@ai-space.zalopay.vn'
function inviteIcs(e, user, method, seq, baseUrl) {
  const link = `${baseUrl}/?event=${encodeURIComponent(e.id)}`
  const host = userById(e.author_id)
  const day = vn(e.starts_at)
  const when = e.all_day
    ? [`DTSTART;VALUE=DATE:${icsDate(day)}`, `DTEND;VALUE=DATE:${icsDate(new Date(day.getTime() + 24 * 3600_000))}`]
    : [`DTSTART:${icsTime(e.starts_at)}`, `DTEND:${icsTime(endOf(e))}`]
  const desc = [e.description, host ? `Người tổ chức: ${host.name}` : '', `Xem và bình luận: ${link}`].filter(Boolean).join('\n\n')
  const lines = [
    'BEGIN:VCALENDAR', 'PRODID:-//Zalopay AI Space//Su kien//VI', 'VERSION:2.0', 'CALSCALE:GREGORIAN', `METHOD:${method}`,
    'BEGIN:VEVENT', `UID:${e.id}@ai-space.zalopay.vn`, `SEQUENCE:${seq}`, `DTSTAMP:${icsTime(new Date().toISOString())}`, ...when,
    `SUMMARY:${icsText(e.title)}`, `LOCATION:${icsText(e.location)}`, `DESCRIPTION:${icsText(desc)}`, `URL:${link}`,
    `ORGANIZER;CN=${icsName('Zalopay AI Space')}:mailto:${ORGANIZER}`,
    // RSVP=FALSE: accepting sends nothing back (no flood of replies to the site's mailbox)
    `ATTENDEE;CN=${icsName(user.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=FALSE:mailto:${user.email}`,
    `STATUS:${method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`, `TRANSP:${e.all_day ? 'TRANSPARENT' : 'OPAQUE'}`, 'CLASS:PUBLIC',
  ]
  // Outlook's own reminder: 15 minutes before, or 9:00 the day before an all-day event
  if (method === 'REQUEST') lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(e.title)}`, `TRIGGER:${e.all_day ? '-PT15H' : '-PT15M'}`, 'END:VALARM')
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
function sendInvite(e, user, method, baseUrl, { subject, text }) {
  const seq = db.prepare('UPDATE events SET ics_seq = ics_seq + 1 WHERE id = ? RETURNING ics_seq').get(e.id).ics_seq
  return sendMail({ to: user.email, subject, text, icalEvent: { method, content: inviteIcs(e, user, method, seq, baseUrl) } })
}
const invitedIds = (id) => db.prepare('SELECT user_id FROM event_invites WHERE event_id = ?').all(id).map((r) => r.user_id)
const isInterested = (eid, uid) => !!db.prepare('SELECT 1 FROM event_interests WHERE event_id = ? AND user_id = ?').get(eid, uid)
const isInvited = (eid, uid) => !!db.prepare('SELECT 1 FROM event_invites WHERE event_id = ? AND user_id = ?').get(eid, uid)

// "Quan tâm" pressed or taken back: the invitation (or its cancellation) goes out half a minute later, so
// someone toggling a few times gets one email for where they ended up, and at most a few a day per event.
const INVITE_DELAY_MS = 30_000
const MAX_INVITES_PER_DAY = 4
const pendingInvites = new Map()
const recentInvites = new Map()
function queueInvite(eventId, userId, baseUrl) {
  const key = `${eventId}:${userId}`
  clearTimeout(pendingInvites.get(key))
  pendingInvites.set(key, setTimeout(() => {
    pendingInvites.delete(key)
    try { syncInvite(eventId, userId, baseUrl) } catch (err) { console.error('[events] invitation failed:', err.message) }
  }, INVITE_DELAY_MS))
}
/** Bring one person's calendar in line with their "Quan tâm": invite them, or take the event out again. */
function syncInvite(eventId, userId, baseUrl) {
  const e = byId(eventId)
  const user = userById(userId)
  const invited = isInvited(eventId, userId)
  if (!e || !user?.email) { if (invited) db.prepare('DELETE FROM event_invites WHERE event_id = ? AND user_id = ?').run(eventId, userId); return }
  const interested = isInterested(eventId, userId)
  if (interested === invited || endOf(e) <= new Date().toISOString()) return
  const key = `${eventId}:${userId}`
  const times = (recentInvites.get(key) || []).filter((t) => t > Date.now() - 24 * 3600_000)
  if (times.length >= MAX_INVITES_PER_DAY) return // the 10-minute sweep tries again later
  recentInvites.set(key, [...times, Date.now()])
  const link = `${baseUrl}/?event=${encodeURIComponent(e.id)}`
  const host = userById(e.author_id)
  if (interested) {
    db.prepare('INSERT OR IGNORE INTO event_invites (event_id, user_id) VALUES (?, ?)').run(e.id, user.id)
    sendInvite(e, user, 'REQUEST', baseUrl, {
      subject: `Lời mời: ${e.title} (${whenText(e)})`,
      text: `Bạn đã bấm Quan tâm sự kiện "${e.title}".\n\nThời gian: ${whenText(e)}\nĐịa điểm: ${e.location}${host ? `\nNgười tổ chức: ${host.name}` : ''}\n\nBấm "Chấp nhận" (Accept) trong email này để thêm sự kiện vào lịch Outlook của bạn. Khi sự kiện đổi giờ, đổi địa điểm hay bị huỷ, lịch của bạn sẽ tự cập nhật theo.\n\nXem tại: ${link}`,
    }).catch(() => {})
  } else {
    db.prepare('DELETE FROM event_invites WHERE event_id = ? AND user_id = ?').run(e.id, user.id)
    sendInvite(e, user, 'CANCEL', baseUrl, {
      subject: `Đã bỏ quan tâm: ${e.title}`,
      text: `Bạn đã bỏ quan tâm sự kiện "${e.title}" (${whenText(e)}), nên sự kiện được gỡ khỏi lịch Outlook của bạn.\n\nXem tại: ${link}`,
    }).catch(() => {})
  }
}
/** Every 10 minutes: anyone whose calendar doesn't match their "Quan tâm" (a restart dropped the timer,
 * the daily cap held it back, or they were interested before invitations existed) is brought in line. */
export function syncEventInvites(baseUrl) {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()
  const missing = db.prepare(`SELECT i.event_id, i.user_id FROM event_interests i JOIN events e ON e.id = i.event_id
    LEFT JOIN event_invites v ON v.event_id = i.event_id AND v.user_id = i.user_id
    WHERE v.event_id IS NULL AND e.starts_at >= ? AND i.created_at <= datetime('now', '-2 minutes')`).all(since)
  const stale = db.prepare(`SELECT v.event_id, v.user_id FROM event_invites v
    LEFT JOIN event_interests i ON i.event_id = v.event_id AND i.user_id = v.user_id
    WHERE i.event_id IS NULL AND v.sent_at <= datetime('now', '-2 minutes')`).all()
  for (const r of [...missing, ...stale]) if (!pendingInvites.has(`${r.event_id}:${r.user_id}`)) syncInvite(r.event_id, r.user_id, baseUrl)
}

const emailsOfInterested = (id, exceptId) => interestedIds(id).filter((uid) => uid !== exceptId).map((uid) => userById(uid)?.email).filter(Boolean)
// The people interested (but `exceptId`, who made the change) hear of it in the app and by email; whoever has
// the event in their Outlook from us gets that email as a calendar update (`method`) so their calendar follows,
// the one who made the change included. `calendarOnly`: a change only calendars need (a new name).
function tellInterested(req, e, { text, subject, body, exceptId, method, calendarOnly = false }) {
  const base = appUrl(req)
  const link = `${base}/?event=${encodeURIComponent(e.id)}`
  const invited = new Set(method ? invitedIds(e.id) : [])
  const interested = interestedIds(e.id)
  for (const uid of new Set([...interested, ...invited])) {
    const u = userById(uid)
    if (!u?.email) continue
    const calendar = invited.has(uid)
    if (!calendar && (uid === exceptId || calendarOnly)) continue
    if (uid !== exceptId && !calendarOnly && interested.includes(uid)) notify(u.email, { kind: 'event', text, href: `/?event=${encodeURIComponent(e.id)}`, actor: req.user.name })
    const note = calendar ? (method === 'CANCEL' ? 'Sự kiện đã được gỡ khỏi lịch Outlook của bạn.\n\n' : 'Lịch Outlook của bạn đã được cập nhật theo.\n\n') : ''
    const msg = { subject, text: `${body}\n\n${note}Xem tại: ${link}` }
    if (calendar) {
      if (method === 'CANCEL') db.prepare('DELETE FROM event_invites WHERE event_id = ? AND user_id = ?').run(e.id, uid)
      sendInvite(e, u, method, base, msg).catch(() => {})
    } else sendMail({ to: u.email, ...msg }).catch(() => {})
  }
}

// upcoming and ongoing, soonest first
router.get('/', (req, res) => {
  const now = new Date().toISOString()
  const rows = db.prepare(`SELECT ${COLS} FROM events WHERE starts_at >= ? ORDER BY starts_at LIMIT 200`).all(new Date(Date.now() - 24 * 3600_000).toISOString())
  res.json({ events: rows.filter((e) => endOf(e) > now).map((e) => shape(e, req.user)) })
})

router.get('/:id', (req, res) => {
  const e = byId(req.params.id)
  if (!e) return res.status(404).json({ error: 'not_found' })
  res.json({ event: { ...shape(e, req.user), past: endOf(e) <= new Date().toISOString(), comments: commentsOf(e.id, req.user) } })
})

router.post('/', requireAuth, (req, res) => {
  const { f, error } = readFields(req.body)
  if (error) return res.status(400).json({ error: 'invalid', message: error })
  if ((f.all_day ? endOf(f) : f.starts_at) < new Date(Date.now() - 5 * 60_000).toISOString()) return res.status(400).json({ error: 'invalid', message: 'Thời gian bắt đầu đã qua rồi.' })
  const cover = decodeCover(req.body?.cover)
  if (cover === false) return res.status(400).json({ error: 'bad_cover', message: 'Ảnh bìa không hợp lệ hoặc lớn hơn 2 MB.' })
  const id = nextId('e')
  db.prepare('INSERT INTO events (id, title, description, starts_at, ends_at, all_day, location, author_id) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, f.title, f.description, f.starts_at, f.ends_at, f.all_day, f.location, req.user.id)
  saveCover(id, cover)
  res.status(201).json({ event: shape(byId(id), req.user) })
})

router.patch('/:id', requireAuth, (req, res) => {
  const e = byId(req.params.id)
  if (!e) return res.status(404).json({ error: 'not_found' })
  if (e.author_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'not_owner' })
  const { f, error } = readFields(req.body)
  if (error) return res.status(400).json({ error: 'invalid', message: error })
  const cover = decodeCover(req.body?.cover)
  if (cover === false) return res.status(400).json({ error: 'bad_cover', message: 'Ảnh bìa không hợp lệ hoặc lớn hơn 2 MB.' })
  const moved = f.starts_at !== e.starts_at || f.ends_at !== e.ends_at || f.all_day !== e.all_day || f.location !== e.location
  // a new time means a new reminder
  db.prepare(`UPDATE events SET title = ?, description = ?, starts_at = ?, ends_at = ?, all_day = ?, location = ?, edited_at = datetime('now')${f.starts_at !== e.starts_at ? ', reminded_at = NULL' : ''} WHERE id = ?`)
    .run(f.title, f.description, f.starts_at, f.ends_at, f.all_day, f.location, e.id)
  saveCover(e.id, cover)
  const after = byId(e.id)
  if (moved) {
    tellInterested(req, after, {
      exceptId: req.user.id, method: 'REQUEST',
      text: `Sự kiện "${after.title}" đổi sang ${whenText(after)} tại ${after.location}`,
      subject: `Sự kiện đổi giờ / địa điểm: ${after.title}`,
      body: `Sự kiện "${after.title}" mà bạn quan tâm vừa được cập nhật:\n\nThời gian: ${whenText(after)}\nĐịa điểm: ${after.location}`,
    })
  } else if (f.title !== e.title) {
    // a new name: only the calendars need to hear of it
    tellInterested(req, after, {
      exceptId: req.user.id, method: 'REQUEST', calendarOnly: true, text: '',
      subject: `Sự kiện đổi tên: ${after.title}`,
      body: `Sự kiện "${e.title}" mà bạn quan tâm đổi tên thành "${after.title}".\n\nThời gian: ${whenText(after)}\nĐịa điểm: ${after.location}`,
    })
  }
  res.json({ event: shape(after, req.user) })
})

router.delete('/:id', requireAuth, (req, res) => {
  const e = byId(req.params.id)
  if (!e) return res.status(404).json({ error: 'not_found' })
  const block = removalCheck(req, e.author_id)
  if (block) return res.status(block.status).json({ error: block.error })
  // only an upcoming session is "cancelled"; a past one just goes
  if (endOf(e) > new Date().toISOString()) {
    tellInterested(req, e, {
      exceptId: req.user.id, method: 'CANCEL',
      text: `Sự kiện "${e.title}" (${whenText(e)}) đã huỷ`,
      subject: `Sự kiện đã huỷ: ${e.title}`,
      body: `Sự kiện "${e.title}" (${whenText(e)} tại ${e.location}) mà bạn quan tâm đã huỷ.`,
    })
  }
  db.transaction(() => {
    db.prepare('DELETE FROM event_interests WHERE event_id = ?').run(e.id)
    db.prepare('DELETE FROM event_comments WHERE event_id = ?').run(e.id)
    db.prepare('DELETE FROM event_invites WHERE event_id = ?').run(e.id)
    db.prepare('DELETE FROM events WHERE id = ?').run(e.id)
  })()
  afterRemoval(req, { authorId: e.author_id, what: 'sự kiện', title: e.title, content: e.description || e.title })
  res.json({ ok: true })
})

const MAX_COMMENT = 2000
router.post('/:id/comments', requireAuth, (req, res) => {
  const e = byId(req.params.id)
  if (!e) return res.status(404).json({ error: 'not_found' })
  const body = clean(req.body?.body, MAX_COMMENT)
  if (!body) return res.status(400).json({ error: 'empty_body' })
  const cid = nextId('ec')
  db.prepare('INSERT INTO event_comments (id, event_id, author_id, body) VALUES (?, ?, ?, ?)').run(cid, e.id, req.user.id, body)
  const who = domainName(req.user.email, req.user.name)
  const href = `/?event=${encodeURIComponent(e.id)}`
  const host = userById(e.author_id)
  if (host && host.id !== req.user.id) {
    notify(host.email, { kind: 'comment', text: `${who} đã bình luận trong sự kiện "${e.title}" của bạn`, href, actor: req.user.name })
    sendMail({ to: host.email, subject: `${who} đã bình luận trong sự kiện "${e.title}" của bạn`, text: `${req.user.name}: "${body}"\n\nXem tại: ${appUrl(req)}${href}` }).catch(() => {})
  }
  // the others who commented before: one in-app note per event, kept up to date
  const before = db.prepare('SELECT DISTINCT author_id FROM event_comments WHERE event_id = ? AND id != ?').all(e.id, cid).map((r) => r.author_id)
  // @mentions: a notification and an email each (the host already heard of this comment)
  notifyMentions(req, { text: body, where: `sự kiện "${e.title}"`, path: href, skip: [host?.email] })
  notifyParticipants(before, [req.user.email, host?.email], { ref: 'joined:ev:' + e.id, text: `${who} cũng đã bình luận trong sự kiện "${e.title}"`, href, actor: req.user.name })
  res.status(201).json({ comments: commentsOf(e.id, req.user), commentCount: db.prepare('SELECT COUNT(*) n FROM event_comments WHERE event_id = ?').get(e.id).n })
})
router.delete('/:id/comments/:cid', requireAuth, (req, res) => {
  const c = db.prepare('SELECT * FROM event_comments WHERE id = ? AND event_id = ?').get(req.params.cid, req.params.id)
  if (!c) return res.status(404).json({ error: 'not_found' })
  const block = removalCheck(req, c.author_id)
  if (block) return res.status(block.status).json({ error: block.error })
  db.prepare('DELETE FROM event_comments WHERE id = ?').run(c.id)
  afterRemoval(req, { authorId: c.author_id, what: 'bình luận', title: '', content: c.body })
  res.json({ comments: commentsOf(req.params.id, req.user), commentCount: db.prepare('SELECT COUNT(*) n FROM event_comments WHERE event_id = ?').get(req.params.id).n })
})

router.post('/:id/interest', requireAuth, (req, res) => {
  const e = byId(req.params.id)
  if (!e) return res.status(404).json({ error: 'not_found' })
  const had = db.prepare('SELECT 1 FROM event_interests WHERE event_id = ? AND user_id = ?').get(e.id, req.user.id)
  if (had) db.prepare('DELETE FROM event_interests WHERE event_id = ? AND user_id = ?').run(e.id, req.user.id)
  else db.prepare('INSERT INTO event_interests (event_id, user_id) VALUES (?, ?)').run(e.id, req.user.id)
  // the Outlook invitation (or, taken back, its cancellation)
  queueInvite(e.id, req.user.id, appUrl(req))
  // the host: one notification per session, kept up to date
  const host = userById(e.author_id)
  const n = interestedIds(e.id).length
  if (!had && host && host.id !== req.user.id) {
    notifyOnce(host.email, 'event', { ref: 'event-interest:' + e.id, text: n === 1 ? `${domainName(req.user.email, req.user.name)} quan tâm sự kiện "${e.title}" của bạn` : `${n} người quan tâm sự kiện "${e.title}" của bạn`, href: `/?event=${encodeURIComponent(e.id)}`, actor: req.user.name })
  }
  res.json({ event: shape(byId(e.id), req.user) })
})

router.get('/:id/cover', (req, res) => {
  const r = db.prepare('SELECT cover_mime, cover_data FROM events WHERE id = ?').get(req.params.id)
  if (!r || !r.cover_data) return res.status(404).end()
  res.set('Content-Type', r.cover_mime).set('Cache-Control', 'private, max-age=86400').send(r.cover_data)
})

// The day before: everyone interested (and the host) gets an email. Checked every 10 minutes;
// a session posted less than an hour before it starts gets none.
const REMIND_AHEAD_MS = 24 * 3600_000
export function sendEventReminders(baseUrl) {
  const now = Date.now()
  const due = db.prepare(`SELECT ${COLS} FROM events WHERE reminded_at IS NULL AND starts_at > ? AND starts_at <= ?`)
    .all(new Date(now + 60 * 60_000).toISOString(), new Date(now + REMIND_AHEAD_MS).toISOString())
  for (const e of due) {
    db.prepare("UPDATE events SET reminded_at = datetime('now') WHERE id = ?").run(e.id)
    const link = `${baseUrl}/?event=${encodeURIComponent(e.id)}`
    const host = userById(e.author_id)
    const n = interestedIds(e.id).length
    for (const to of emailsOfInterested(e.id, e.author_id)) {
      notify(to, { kind: 'event', text: `Nhắc bạn: sự kiện "${e.title}" diễn ra ${whenText(e)} tại ${e.location}`, href: `/?event=${encodeURIComponent(e.id)}`, actor: host?.name || '' })
      sendMail({ to, subject: `Nhắc lịch: ${e.title} (${whenText(e)})`, text: `Sự kiện bạn quan tâm sắp diễn ra:\n\n${e.title}\nThời gian: ${whenText(e)}\nĐịa điểm: ${e.location}${host ? `\nNgười tổ chức: ${host.name}` : ''}\n\nXem tại: ${link}` }).catch(() => {})
    }
    if (host && n) sendMail({ to: host.email, subject: `Sự kiện của bạn sắp diễn ra: ${e.title}`, text: `Sự kiện "${e.title}" diễn ra ${whenText(e)} tại ${e.location}, đang có ${n} người quan tâm.\n\nXem danh sách tại: ${link}` }).catch(() => {})
  }
}

export default router
