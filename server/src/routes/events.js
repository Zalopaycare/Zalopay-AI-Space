import express from 'express'
import { db, nextId } from '../db.js'
import { requireAuth, isCompanyEmail } from '../auth.js'
import { colorOf, avatarUrlOf } from '../avatarColors.js'
import { domainName, initialsOf, appUrl, notifyMentions, handleOf } from '../mentions.js'
import { notify, notifyOnce, notifyParticipants } from '../notifications.js'
import { sendMail, senderAddress } from '../mailer.js'
import { outlookEnabled, createMeeting, updateMeeting, cancelMeeting, meetingResponses } from '../outlook.js'
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
// Replies and likes on comments, as on posts: a reply hangs under a top-level comment (parent_id; one level,
// a reply to a reply goes under the same comment) and names who it answers (reply_to_id).
for (const col of ['parent_id', 'reply_to_id']) {
  if (!db.prepare('PRAGMA table_info(event_comments)').all().some((c) => c.name === col)) db.exec(`ALTER TABLE event_comments ADD COLUMN ${col} TEXT`)
}
db.exec(`
CREATE TABLE IF NOT EXISTS event_comment_likes (
  comment_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (comment_id, user_id)
);
`)
// all_day: no start time given (starts_at is that day's local midnight, no end time)
if (!db.prepare('PRAGMA table_info(events)').all().some((c) => c.name === 'all_day')) db.exec('ALTER TABLE events ADD COLUMN all_day INTEGER NOT NULL DEFAULT 0')
// Outlook invitations: who currently has the event in their calendar from us (event_invites), and the
// event's iCalendar SEQUENCE, raised with every invitation or cancellation sent so the newest always wins
if (!db.prepare('PRAGMA table_info(events)').all().some((c) => c.name === 'ics_seq')) db.exec('ALTER TABLE events ADD COLUMN ics_seq INTEGER NOT NULL DEFAULT 0')
// Co-hosts: people the creator adds to run the event with them (by company email, so someone who has
// never signed in can be one). They edit it, see who's interested and hear of comments as the creator
// does; cancelling it and changing the co-hosts stay with the creator (and the admins).
db.exec(`
CREATE TABLE IF NOT EXISTS event_cohosts (
  event_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, email)
);
`)
db.exec(`
CREATE TABLE IF NOT EXISTS event_invites (
  event_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, user_id)
);
`)

// Outlook meeting (outlook.js): ol_id = the meeting in the creator's calendar, ol_attendees = the addresses
// last sent to it (JSON), ol_checked_at = when the answers were last read; event_rsvp = those answers
for (const [col, type] of [['ol_id', 'TEXT'], ['ol_attendees', 'TEXT'], ['ol_checked_at', 'TEXT']]) {
  if (!db.prepare('PRAGMA table_info(events)').all().some((c) => c.name === col)) db.exec(`ALTER TABLE events ADD COLUMN ${col} ${type}`)
}
db.exec(`
CREATE TABLE IF NOT EXISTS event_rsvp (
  event_id TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, email)
);
`)

// Invitations wait for interest: a new event sends none until OPEN_AT people (besides its creator) are
// interested; then the creator is told and sends them with "Gửi lời mời Outlook" (invites_open = 1), after
// which everyone interested later is added as they come. ready_notified_at: when the creator was told.
// Events from before this had their invitations going out already (the column starts at 1 for them).
if (!db.prepare('PRAGMA table_info(events)').all().some((c) => c.name === 'invites_open')) db.exec('ALTER TABLE events ADD COLUMN invites_open INTEGER NOT NULL DEFAULT 1')
if (!db.prepare('PRAGMA table_info(events)').all().some((c) => c.name === 'ready_notified_at')) db.exec('ALTER TABLE events ADD COLUMN ready_notified_at TEXT')
const OPEN_AT = 3
// An event made for a "Chủ đề quan tâm" topic (routes/topics.js): topic_id. Everyone interested in the topic
// is interested in the event from the start and gets the invitation right away (no waiting for OPEN_AT).
if (!db.prepare('PRAGMA table_info(events)').all().some((c) => c.name === 'topic_id')) db.exec('ALTER TABLE events ADD COLUMN topic_id TEXT')
const topicOf = (id) => { try { return id ? db.prepare('SELECT id, title FROM topic_requests WHERE id = ?').get(id) : null } catch { return null } }

const router = express.Router()
// every column but the cover picture itself (served on its own)
const COLS = 'id, title, description, starts_at, ends_at, all_day, location, cover_mime, author_id, reminded_at, created_at, edited_at, ol_id, ol_attendees, invites_open, topic_id'
const byId = (id) => db.prepare(`SELECT ${COLS} FROM events WHERE id = ?`).get(id)
const DEFAULT_LENGTH_MS = 60 * 60_000
// an event stays on the rail until it is over: its end time, the end of its day (no time given),
// or an hour after it starts (no end time)
const endOf = (e) => e.ends_at || new Date(new Date(e.starts_at).getTime() + (e.all_day ? 24 * 3600_000 : DEFAULT_LENGTH_MS)).toISOString()

const userById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id)
const person = (u) => (u ? { id: u.id, name: domainName(u.email, u.name), fullName: u.name, initials: initialsOf(u), avatarColor: colorOf(u), avatarUrl: avatarUrlOf(u) } : null)
const interestedIds = (id) => db.prepare('SELECT user_id FROM event_interests WHERE event_id = ? ORDER BY created_at').all(id).map((r) => r.user_id)
// (a row that is the creator under another address, saved before that was blocked, is left out)
const cohostRows = (id) => {
  const creator = handleOf(db.prepare('SELECT u.email FROM events e JOIN users u ON u.id = e.author_id WHERE e.id = ?').get(id)?.email)
  return db.prepare('SELECT email, name FROM event_cohosts WHERE event_id = ? ORDER BY added_at, rowid').all(id).filter((r) => handleOf(r.email) !== creator)
}
const userByEmail = (email) => db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(String(email || '').toLowerCase())
// a co-host as the page shows them: their account if they have one, else the name picked in the form
const cohostPerson = (r) => { const u = userByEmail(r.email); return u ? { ...person(u), email: r.email } : { id: null, email: r.email, name: handleOf(r.email), fullName: r.name || handleOf(r.email), initials: initialsOf({ email: r.email, name: r.name }), avatarColor: null, avatarUrl: null } }
/** The creator and the co-hosts, as email addresses (lower-case). */
const hostEmails = (e) => [userById(e.author_id)?.email, ...cohostRows(e.id).map((r) => r.email)].filter(Boolean).map((x) => x.toLowerCase())
const isHost = (e, user) => !!user && hostEmails(e).includes(String(user.email || '').toLowerCase())

const rsvpOf = (id) => Object.fromEntries(db.prepare('SELECT email, status FROM event_rsvp WHERE event_id = ?').all(id).map((r) => [r.email, r.status]))
function rsvpCounts(id) {
  const n = { accepted: 0, tentative: 0, declined: 0 }
  for (const { status } of db.prepare('SELECT status FROM event_rsvp WHERE event_id = ?').all(id)) {
    if (status === 'accepted') n.accepted++
    else if (status === 'tentativelyAccepted') n.tentative++
    else if (status === 'declined') n.declined++
  }
  return n
}

function shape(e, me) {
  const ids = interestedIds(e.id)
  const mine = !!me && e.author_id === me.id
  const host = isHost(e, me)
  return {
    id: e.id, title: e.title, description: e.description, startsAt: e.starts_at, endsAt: e.ends_at, allDay: !!e.all_day, location: e.location,
    coverUrl: e.cover_mime ? `/api/events/${encodeURIComponent(e.id)}/cover?v=${encodeURIComponent(e.edited_at || e.created_at)}` : null,
    host: person(userById(e.author_id)), cohosts: cohostRows(e.id).map(cohostPerson),
    // isMine: the creator; isHost: the creator or a co-host (may edit); canEdit: may cancel (creator, admins);
    // canEditCohosts: may change who the co-hosts are
    isMine: mine, isHost: host, canEdit: mine || !!me?.is_admin, canEditCohosts: mine || !!me?.is_admin,
    interestCount: ids.length, interested: !!me && ids.includes(me.id),
    // who's coming: the hosts and the admins see everyone (with their answer on Outlook); others see a few faces
    people: ids.slice(0, host || me?.is_admin ? 500 : 8).map((uid) => { const u = userById(uid); return u ? { ...person(u), ...(host || me?.is_admin ? { rsvp: rsvpOf(e.id)[u.email.toLowerCase()] || null } : {}) } : null }).filter(Boolean),
    // a meeting in the creator's Outlook (invitations from them); for the hosts, how the attendees answered
    outlook: !!e.ol_id,
    // the topic it answers ("Chủ đề quan tâm"), if made from one
    topic: topicOf(e.topic_id),
    // invitations: sent yet (invitesOpen); how many are interested besides the creator, against the OPEN_AT needed
    invitesOpen: !!e.invites_open, openAt: OPEN_AT, othersInterested: ids.filter((uid) => uid !== e.author_id).length,
    ...(e.ol_id && (host || me?.is_admin) ? { rsvpCounts: rsvpCounts(e.id), outlookInvited: sentAttendees(e).length } : {}),
    commentCount: db.prepare('SELECT COUNT(*) n FROM event_comments WHERE event_id = ?').get(e.id).n,
    createdAt: e.created_at,
  }
}
// oldest first, as a conversation reads
// parentId: the top-level comment a reply hangs under (null for a comment); replyTo: who it answers;
// likes: { total, mine }
const commentsOf = (id, me) => {
  const rows = db.prepare('SELECT * FROM event_comments WHERE event_id = ? ORDER BY created_at, id').all(id)
  const authorOf = Object.fromEntries(rows.map((c) => [c.id, c.author_id]))
  return rows.map((c) => {
    const to = c.reply_to_id && authorOf[c.reply_to_id] ? userById(authorOf[c.reply_to_id]) : null
    return {
      id: c.id, body: c.body, time: c.created_at, author: person(userById(c.author_id)),
      parentId: c.parent_id || null, replyTo: to ? { name: domainName(to.email, to.name), handle: handleOf(to.email) } : null,
      likes: { total: db.prepare('SELECT COUNT(*) n FROM event_comment_likes WHERE comment_id = ?').get(c.id).n, mine: !!me && !!db.prepare('SELECT 1 FROM event_comment_likes WHERE comment_id = ? AND user_id = ?').get(c.id, me.id) },
      canDelete: !!me && (c.author_id === me.id || !!me.is_admin), isMine: !!me && c.author_id === me.id,
    }
  })
}

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
// Co-hosts from the form: [{ email, name }], company addresses only, at most 10; undefined = leave as they are
const MAX_COHOSTS = 10
// One person can have an address on each company domain (thyndm@vng.com.vn, thyndm@zalopay.vn…): the
// account name before @ is what says who it is.
function readCohosts(body, creatorEmail) {
  if (!Array.isArray(body?.cohosts)) return undefined
  const seen = new Set([handleOf(creatorEmail)])
  const out = []
  for (const c of body.cohosts) {
    const email = String(c?.email || '').trim().toLowerCase()
    if (!email || seen.has(handleOf(email)) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !isCompanyEmail(email)) continue
    seen.add(handleOf(email))
    out.push({ email, name: clean(c?.name, 120) })
    if (out.length >= MAX_COHOSTS) break
  }
  return out
}
/** Save the co-hosts; the ones just added hear of it (in the app and by email). */
function saveCohosts(req, e, list) {
  if (list === undefined) return
  const before = new Set(cohostRows(e.id).map((r) => r.email))
  db.transaction(() => {
    db.prepare('DELETE FROM event_cohosts WHERE event_id = ?').run(e.id)
    const ins = db.prepare('INSERT INTO event_cohosts (event_id, email, name) VALUES (?, ?, ?)')
    for (const c of list) ins.run(e.id, c.email, c.name)
  })()
  const who = domainName(req.user.email, req.user.name)
  const href = `/?event=${encodeURIComponent(e.id)}`
  for (const c of list) {
    if (before.has(c.email) || c.email === req.user.email.toLowerCase()) continue
    notify(c.email, { kind: 'event', text: `${who} đã thêm bạn làm người đồng tổ chức sự kiện "${e.title}"`, href, actor: req.user.name })
    sendMail({ to: c.email, subject: `Bạn là người đồng tổ chức: ${e.title}`, text: `${req.user.name} đã thêm bạn làm người đồng tổ chức sự kiện "${e.title}" trên Zalopay AI Space.\n\nThời gian: ${whenText(e)}\nĐịa điểm: ${e.location}\n\nBạn có thể sửa thông tin sự kiện, xem ai quan tâm và nhận thông báo bình luận.\n\nXem tại: ${appUrl(req)}${href}` }).catch(() => {})
  }
}
const hostNames = (e) => [userById(e.author_id)?.name, ...cohostRows(e.id).map((r) => { const u = userByEmail(r.email); return u ? u.name : r.name || handleOf(r.email) })].filter(Boolean)

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
  const hosts = hostNames(e)
  const day = vn(e.starts_at)
  const when = e.all_day
    ? [`DTSTART;VALUE=DATE:${icsDate(day)}`, `DTEND;VALUE=DATE:${icsDate(new Date(day.getTime() + 24 * 3600_000))}`]
    : [`DTSTART:${icsTime(e.starts_at)}`, `DTEND:${icsTime(endOf(e))}`]
  const desc = [e.description, hosts.length ? `Người tổ chức: ${hosts.join(', ')}` : '', `Xem và bình luận: ${link}`].filter(Boolean).join('\n\n')
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
  // an Outlook meeting: Outlook sends the invitations (outlookAttendees)
  // waiting for enough interest (no invitations yet), or an Outlook meeting (Outlook sends them: outlookAttendees)
  if (!e.invites_open || e.ol_id || interested === invited || endOf(e) <= new Date().toISOString()) return
  const key = `${eventId}:${userId}`
  const times = (recentInvites.get(key) || []).filter((t) => t > Date.now() - 24 * 3600_000)
  if (times.length >= MAX_INVITES_PER_DAY) return // the 10-minute sweep tries again later
  recentInvites.set(key, [...times, Date.now()])
  const link = `${baseUrl}/?event=${encodeURIComponent(e.id)}`
  const hosts = hostNames(e)
  if (interested) {
    db.prepare('INSERT OR IGNORE INTO event_invites (event_id, user_id) VALUES (?, ?)').run(e.id, user.id)
    sendInvite(e, user, 'REQUEST', baseUrl, {
      subject: `Lời mời: ${e.title} (${whenText(e)})`,
      text: `Bạn đã bấm Quan tâm sự kiện "${e.title}".\n\nThời gian: ${whenText(e)}\nĐịa điểm: ${e.location}${hosts.length ? `\nNgười tổ chức: ${hosts.join(', ')}` : ''}\n\nBấm "Chấp nhận" (Accept) trong email này để thêm sự kiện vào lịch Outlook của bạn. Khi sự kiện đổi giờ, đổi địa điểm hay bị huỷ, lịch của bạn sẽ tự cập nhật theo.\n\nXem tại: ${link}`,
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
    WHERE v.event_id IS NULL AND e.ol_id IS NULL AND e.invites_open = 1 AND e.starts_at >= ? AND i.created_at <= datetime('now', '-2 minutes')`).all(since)
  const stale = db.prepare(`SELECT v.event_id, v.user_id FROM event_invites v
    LEFT JOIN event_interests i ON i.event_id = v.event_id AND i.user_id = v.user_id
    WHERE i.event_id IS NULL AND v.sent_at <= datetime('now', '-2 minutes')`).all()
  for (const r of [...missing, ...stale]) if (!pendingInvites.has(`${r.event_id}:${r.user_id}`)) syncInvite(r.event_id, r.user_id, baseUrl)
}

// ---- Outlook meetings (outlook.js) ----
// A new event becomes a meeting in its creator's Outlook calendar, made through their own Microsoft
// account; the co-hosts and everyone interested are its attendees, so Outlook sends the invitations (from
// the creator), the updates and the cancellations, and records who accepted. Kept in step half a minute
// after the last "Quan tâm" (one change for several clicks). Events made before this, or whose creator's
// calendar can't be reached, keep the site's own .ics invitations above.
const escHtml = (v) => String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const utcTime = (iso) => ({ dateTime: new Date(iso).toISOString().replace(/\.\d{3}Z$/, ''), timeZone: 'UTC' })
function meetingOf(e, baseUrl) {
  const link = `${baseUrl}/?event=${encodeURIComponent(e.id)}`
  const day = vn(e.starts_at)
  const d = (x) => `${x.getUTCFullYear()}-${p2(x.getUTCMonth() + 1)}-${p2(x.getUTCDate())}T00:00:00`
  const when = e.all_day
    ? { isAllDay: true, start: { dateTime: d(day), timeZone: 'SE Asia Standard Time' }, end: { dateTime: d(new Date(day.getTime() + 24 * 3600_000)), timeZone: 'SE Asia Standard Time' } }
    : { isAllDay: false, start: utcTime(e.starts_at), end: utcTime(endOf(e)) }
  const desc = escHtml(e.description).replace(/\n/g, '<br>')
  return {
    subject: e.title,
    body: { contentType: 'HTML', content: `${desc ? desc + '<br><br>' : ''}Sự kiện trên Zalopay AI Space: <a href="${escHtml(link)}">${escHtml(link)}</a>` },
    ...when,
    location: { displayName: e.location },
    isReminderOn: true, reminderMinutesBeforeStart: e.all_day ? 900 : 15,
    responseRequested: true, allowNewTimeProposals: false, showAs: e.all_day ? 'free' : 'busy',
  }
}
/** Who should be on the meeting: the co-hosts and everyone interested, not the creator (it's their meeting). */
// Once each, by account name: the creator under another of their addresses would get an invitation to their
// own meeting (a second, "tentative" copy in their calendar), and two addresses of one person two invitations.
function wantedAttendees(e) {
  const seen = new Set([handleOf(userById(e.author_id)?.email)])
  const out = []
  for (const x of [...cohostRows(e.id).map((r) => r.email), ...interestedIds(e.id).map((uid) => userById(uid)?.email)]) {
    const email = String(x || '').toLowerCase()
    if (!email || seen.has(handleOf(email))) continue
    seen.add(handleOf(email))
    out.push(email)
  }
  return out
}
const attendeesOf = (emails) => emails.map((address) => ({ emailAddress: { address }, type: 'required' }))
const sentAttendees = (e) => { try { return JSON.parse(e.ol_attendees || '[]') } catch { return [] } }

/** Put a new event in its creator's Outlook (with whoever is already on it). */
async function outlookCreate(eventId, baseUrl) {
  const e = byId(eventId)
  if (!e || e.ol_id || !outlookEnabled() || endOf(e) <= new Date().toISOString()) return
  const wanted = wantedAttendees(e)
  const id = await createMeeting(e.author_id, { ...meetingOf(e, baseUrl), attendees: attendeesOf(wanted) }, e.id)
  if (id) db.prepare('UPDATE events SET ol_id = ?, ol_attendees = ? WHERE id = ?').run(id, JSON.stringify(wanted), e.id)
  console.log(`[outlook] event ${e.id}: ${id ? `meeting created in the host's calendar, ${wanted.length} invited` : 'no meeting (no calendar access): .ics invitations instead'}`)
}
// the meeting is gone from the creator's calendar (they deleted it in Outlook): back to the .ics invitations
const dropMeeting = (id) => { db.prepare('UPDATE events SET ol_id = NULL, ol_attendees = NULL WHERE id = ?').run(id); db.prepare('DELETE FROM event_rsvp WHERE event_id = ?').run(id) }
/** Send the meeting its new details (time, place, name…); Outlook tells the attendees. */
async function outlookUpdate(eventId, baseUrl) {
  const e = byId(eventId)
  if (!e?.ol_id) return
  const r = await updateMeeting(e.author_id, e.ol_id, meetingOf(e, baseUrl))
  if (r === 'gone') dropMeeting(e.id)
}
/** Bring the attendee list in line with the co-hosts and "Quan tâm"; Outlook invites the new ones and cancels for the ones gone. */
async function outlookAttendees(eventId) {
  const e = byId(eventId)
  if (!e?.ol_id || endOf(e) <= new Date().toISOString()) return
  const wanted = wantedAttendees(e)
  const sent = sentAttendees(e)
  if (wanted.length === sent.length && wanted.every((x) => sent.includes(x))) return
  const r = await updateMeeting(e.author_id, e.ol_id, { attendees: attendeesOf(wanted) })
  console.log(`[outlook] event ${e.id}: attendees ${sent.length} → ${wanted.length} ${r === true ? 'sent' : r === 'gone' ? '(meeting gone)' : '(failed)'}`)
  if (r === true) {
    db.prepare('UPDATE events SET ol_attendees = ? WHERE id = ?').run(JSON.stringify(wanted), e.id)
    for (const x of sent.filter((y) => !wanted.includes(y))) db.prepare('DELETE FROM event_rsvp WHERE event_id = ? AND email = ?').run(e.id, x)
  } else if (r === 'gone') dropMeeting(e.id)
}
const olTimers = new Map()
function queueOutlook(eventId) {
  clearTimeout(olTimers.get(eventId))
  olTimers.set(eventId, setTimeout(() => { olTimers.delete(eventId); outlookAttendees(eventId).catch((err) => console.error('[outlook] attendees failed:', err.message)) }, INVITE_DELAY_MS))
}
/** Read who accepted / declined from the meeting. */
async function outlookResponses(eventId) {
  const e = byId(eventId)
  if (!e?.ol_id) return
  db.prepare("UPDATE events SET ol_checked_at = datetime('now') WHERE id = ?").run(e.id)
  const list = await meetingResponses(e.author_id, e.ol_id)
  if (list === 'gone') return dropMeeting(e.id)
  if (!list) return
  db.transaction(() => {
    db.prepare('DELETE FROM event_rsvp WHERE event_id = ?').run(e.id)
    const ins = db.prepare('INSERT INTO event_rsvp (event_id, email, status) VALUES (?, ?, ?)')
    for (const a of list) ins.run(e.id, a.email, a.status)
  })()
}
/** Every 10 minutes: the upcoming meetings' attendees kept in step, and their answers read. */
export async function syncOutlookMeetings() {
  if (!outlookEnabled()) return
  const now = new Date().toISOString()
  const rows = db.prepare(`SELECT ${COLS} FROM events WHERE ol_id IS NOT NULL AND starts_at >= ?`).all(new Date(Date.now() - 24 * 3600_000).toISOString())
  for (const e of rows) {
    if (endOf(e) <= now || olTimers.has(e.id)) continue
    await outlookAttendees(e.id).catch(() => {})
    await outlookResponses(e.id).catch(() => {})
  }
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
  // on the Outlook meeting: Outlook itself sends them the update / cancellation
  const onMeeting = new Set(e.ol_id ? sentAttendees(e) : [])
  for (const uid of new Set([...interested, ...invited])) {
    const u = userById(uid)
    if (!u?.email) continue
    if (onMeeting.has(u.email.toLowerCase())) {
      if (uid !== exceptId && !calendarOnly) notify(u.email, { kind: 'event', text, href: `/?event=${encodeURIComponent(e.id)}`, actor: req.user.name })
      continue
    }
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
  // ?month=2026-11: every event of that month (Vietnam time), past ones included, for the calendar
  const m = /^(\d{4})-(\d{2})$/.exec(String(req.query.month || ''))
  if (m) {
    const from = new Date(Date.UTC(+m[1], +m[2] - 1, 1) - 7 * 3600_000).toISOString()
    const to = new Date(Date.UTC(+m[1], +m[2], 1) - 7 * 3600_000).toISOString()
    const rows = db.prepare(`SELECT ${COLS} FROM events WHERE starts_at >= ? AND starts_at < ? ORDER BY starts_at`).all(from, to)
    return res.json({ events: rows.map((e) => ({ ...shape(e, req.user), past: endOf(e) <= now })) })
  }
  const rows = db.prepare(`SELECT ${COLS} FROM events WHERE starts_at >= ? ORDER BY starts_at LIMIT 200`).all(new Date(Date.now() - 24 * 3600_000).toISOString())
  res.json({ events: rows.filter((e) => endOf(e) > now).map((e) => shape(e, req.user)) })
})

// "Sự kiện của tôi" (profile): the events I run (created or co-host) and the ones I'm interested in, past ones
// included (the last 180 days), soonest upcoming first, then the past ones newest first.
router.get('/mine', requireAuth, (req, res) => {
  const since = new Date(Date.now() - 180 * 24 * 3600_000).toISOString()
  const me = req.user.email.toLowerCase()
  const rows = db.prepare(`SELECT ${COLS} FROM events WHERE starts_at >= ? AND (author_id = ? OR id IN (SELECT event_id FROM event_interests WHERE user_id = ?)
    OR id IN (SELECT event_id FROM event_cohosts WHERE lower(email) = ?))`).all(since, req.user.id, req.user.id, me)
  const now = new Date().toISOString()
  const list = rows.map((e) => ({ ...shape(e, req.user), past: endOf(e) <= now }))
  const order = (a, b) => (a.past !== b.past ? (a.past ? 1 : -1) : a.past ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt))
  res.json({ hosting: list.filter((e) => e.isHost).sort(order), interested: list.filter((e) => e.interested && !e.isHost).sort(order) })
})

router.get('/:id', (req, res) => {
  const e = byId(req.params.id)
  if (!e) return res.status(404).json({ error: 'not_found' })
  // a host looking: read the latest answers from Outlook (at most every 2 minutes; shown on the next look)
  if (e.ol_id && (isHost(e, req.user) || req.user?.is_admin)) {
    const fresh = db.prepare("SELECT 1 FROM events WHERE id = ? AND ol_checked_at > datetime('now', '-2 minutes')").get(e.id)
    if (!fresh) outlookResponses(e.id).catch(() => {})
  }
  res.json({ event: { ...shape(e, req.user), past: endOf(e) <= new Date().toISOString(), comments: commentsOf(e.id, req.user) } })
})

router.post('/', requireAuth, (req, res) => {
  const { f, error } = readFields(req.body)
  if (error) return res.status(400).json({ error: 'invalid', message: error })
  if ((f.all_day ? endOf(f) : f.starts_at) < new Date(Date.now() - 5 * 60_000).toISOString()) return res.status(400).json({ error: 'invalid', message: 'Thời gian bắt đầu đã qua rồi.' })
  const cover = decodeCover(req.body?.cover)
  if (cover === false) return res.status(400).json({ error: 'bad_cover', message: 'Ảnh bìa không hợp lệ hoặc lớn hơn 2 MB.' })
  const id = nextId('e')
  // no invitations yet: they go out once OPEN_AT people are interested and the creator sends them
  const topic = topicOf(String(req.body?.topicId || ''))
  db.prepare('INSERT INTO events (id, title, description, starts_at, ends_at, all_day, location, author_id, invites_open, topic_id) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(id, f.title, f.description, f.starts_at, f.ends_at, f.all_day, f.location, req.user.id, topic ? 1 : 0, topic ? topic.id : null)
  saveCover(id, cover)
  saveCohosts(req, byId(id), readCohosts(req.body, req.user.email))
  if (topic) fromTopic(req, byId(id), topic)
  res.status(201).json({ event: shape(byId(id), req.user) })
})

router.patch('/:id', requireAuth, (req, res) => {
  const e = byId(req.params.id)
  if (!e) return res.status(404).json({ error: 'not_found' })
  if (e.author_id !== req.user.id && !req.user.is_admin && !isHost(e, req.user)) return res.status(403).json({ error: 'not_owner' })
  const { f, error } = readFields(req.body)
  if (error) return res.status(400).json({ error: 'invalid', message: error })
  const cover = decodeCover(req.body?.cover)
  if (cover === false) return res.status(400).json({ error: 'bad_cover', message: 'Ảnh bìa không hợp lệ hoặc lớn hơn 2 MB.' })
  const moved = f.starts_at !== e.starts_at || f.ends_at !== e.ends_at || f.all_day !== e.all_day || f.location !== e.location
  // a new time means a new reminder
  db.prepare(`UPDATE events SET title = ?, description = ?, starts_at = ?, ends_at = ?, all_day = ?, location = ?, edited_at = datetime('now')${f.starts_at !== e.starts_at ? ', reminded_at = NULL' : ''} WHERE id = ?`)
    .run(f.title, f.description, f.starts_at, f.ends_at, f.all_day, f.location, e.id)
  saveCover(e.id, cover)
  // only the creator (and the admins) choose the co-hosts
  if (e.author_id === req.user.id || req.user.is_admin) saveCohosts(req, byId(e.id), readCohosts(req.body, userById(e.author_id)?.email))
  const after = byId(e.id)
  if (after.ol_id) {
    const base = appUrl(req)
    ;(async () => { if (moved || f.title !== e.title || f.description !== e.description) await outlookUpdate(e.id, base); await outlookAttendees(e.id) })().catch((err) => console.error('[outlook] update failed:', err.message))
  }
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
  // only an upcoming session is "cancelled"; a past one just goes. Everyone interested (and on the Outlook
  // meeting) is told, with the reason given.
  const reason = clean(req.body?.reason, 500)
  if (endOf(e) > new Date().toISOString()) {
    if (e.ol_id) cancelMeeting(e.author_id, e.ol_id, `Sự kiện "${e.title}" đã được huỷ trên Zalopay AI Space.${reason ? ` Lý do: ${reason}` : ''}`).catch(() => {})
    tellInterested(req, e, {
      exceptId: req.user.id, method: 'CANCEL',
      text: `Sự kiện "${e.title}" (${whenText(e)}) đã huỷ${reason ? `. Lý do: ${reason}` : ''}`,
      subject: `Sự kiện đã huỷ: ${e.title}`,
      body: `Sự kiện "${e.title}" (${whenText(e)} tại ${e.location}) mà bạn quan tâm đã huỷ.${reason ? `\n\nLý do: ${reason}` : ''}`,
    })
  }
  db.transaction(() => {
    db.prepare('DELETE FROM event_interests WHERE event_id = ?').run(e.id)
    for (const { id: cid } of db.prepare('SELECT id FROM event_comments WHERE event_id = ?').all(e.id)) db.prepare('DELETE FROM event_comment_likes WHERE comment_id = ?').run(cid)
    db.prepare('DELETE FROM event_comments WHERE event_id = ?').run(e.id)
    db.prepare('DELETE FROM event_invites WHERE event_id = ?').run(e.id)
    db.prepare('DELETE FROM event_cohosts WHERE event_id = ?').run(e.id)
    db.prepare('DELETE FROM event_rsvp WHERE event_id = ?').run(e.id)
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
  // a reply: under the top-level comment (a reply to a reply goes under the same one), answering `replyToId`
  const target = req.body?.replyToId || req.body?.parentId ? db.prepare('SELECT * FROM event_comments WHERE id = ? AND event_id = ?').get(String(req.body.replyToId || req.body.parentId), e.id) : null
  const parentId = target ? target.parent_id || target.id : null
  const cid = nextId('ec')
  db.prepare('INSERT INTO event_comments (id, event_id, author_id, body, parent_id, reply_to_id) VALUES (?, ?, ?, ?, ?, ?)').run(cid, e.id, req.user.id, body, parentId, target ? target.id : null)
  const who = domainName(req.user.email, req.user.name)
  const href = `/?event=${encodeURIComponent(e.id)}`
  // the one answered hears of it (in the app and by email)
  const answered = target && target.author_id !== req.user.id ? userById(target.author_id) : null
  if (answered) {
    notify(answered.email, { kind: 'comment', text: `${who} đã trả lời bình luận của bạn trong sự kiện "${e.title}"`, href, actor: req.user.name })
    sendMail({ to: answered.email, subject: `${who} đã trả lời bình luận của bạn: ${e.title}`, text: `${req.user.name}: "${body}"\n\nXem tại: ${appUrl(req)}${href}` }).catch(() => {})
  }
  // the hosts (creator and co-hosts) hear of every comment
  const hosts = hostEmails(e)
  for (const to of hosts) {
    if (to === req.user.email.toLowerCase() || to === answered?.email.toLowerCase()) continue
    notify(to, { kind: 'comment', text: `${who} đã bình luận trong sự kiện "${e.title}" của bạn`, href, actor: req.user.name })
    sendMail({ to, subject: `${who} đã bình luận trong sự kiện "${e.title}" của bạn`, text: `${req.user.name}: "${body}"\n\nXem tại: ${appUrl(req)}${href}` }).catch(() => {})
  }
  // the others who commented before: one in-app note per event, kept up to date
  const before = db.prepare('SELECT DISTINCT author_id FROM event_comments WHERE event_id = ? AND id != ?').all(e.id, cid).map((r) => r.author_id)
  // @mentions: a notification and an email each (the host already heard of this comment)
  notifyMentions(req, { text: body, where: `sự kiện "${e.title}"`, path: href, skip: [...hosts, answered?.email] })
  notifyParticipants(before, [req.user.email, ...hosts, answered?.email], { ref: 'joined:ev:' + e.id, text: `${who} cũng đã bình luận trong sự kiện "${e.title}"`, href, actor: req.user.name })
  res.status(201).json({ comments: commentsOf(e.id, req.user), commentCount: db.prepare('SELECT COUNT(*) n FROM event_comments WHERE event_id = ?').get(e.id).n })
})
router.delete('/:id/comments/:cid', requireAuth, (req, res) => {
  const c = db.prepare('SELECT * FROM event_comments WHERE id = ? AND event_id = ?').get(req.params.cid, req.params.id)
  if (!c) return res.status(404).json({ error: 'not_found' })
  const block = removalCheck(req, c.author_id)
  if (block) return res.status(block.status).json({ error: block.error })
  // a comment goes with its replies, and the likes on all of them
  db.transaction(() => {
    const ids = [c.id, ...db.prepare('SELECT id FROM event_comments WHERE parent_id = ?').all(c.id).map((r) => r.id)]
    for (const x of ids) db.prepare('DELETE FROM event_comment_likes WHERE comment_id = ?').run(x)
    db.prepare('DELETE FROM event_comments WHERE id = ? OR parent_id = ?').run(c.id, c.id)
  })()
  afterRemoval(req, { authorId: c.author_id, what: 'bình luận', title: '', content: c.body })
  res.json({ comments: commentsOf(req.params.id, req.user), commentCount: db.prepare('SELECT COUNT(*) n FROM event_comments WHERE event_id = ?').get(req.params.id).n })
})

// ♡ on a comment or reply: a click likes, again takes it back; the author hears of it (one note, kept up to date)
router.post('/:id/comments/:cid/like', requireAuth, (req, res) => {
  const e = byId(req.params.id)
  const c = e && db.prepare('SELECT * FROM event_comments WHERE id = ? AND event_id = ?').get(req.params.cid, e.id)
  if (!c) return res.status(404).json({ error: 'not_found' })
  const had = db.prepare('SELECT 1 FROM event_comment_likes WHERE comment_id = ? AND user_id = ?').get(c.id, req.user.id)
  if (had) db.prepare('DELETE FROM event_comment_likes WHERE comment_id = ? AND user_id = ?').run(c.id, req.user.id)
  else db.prepare('INSERT INTO event_comment_likes (comment_id, user_id) VALUES (?, ?)').run(c.id, req.user.id)
  const author = userById(c.author_id)
  const n = db.prepare('SELECT COUNT(*) n FROM event_comment_likes WHERE comment_id = ?').get(c.id).n
  if (!had && author && author.id !== req.user.id) {
    notifyOnce(author.email, 'upvote', { ref: 'evlike:' + c.id, text: n === 1 ? `${domainName(req.user.email, req.user.name)} đã thích bình luận của bạn trong sự kiện "${e.title}"` : `Bình luận của bạn trong sự kiện "${e.title}" có ${n} lượt thích`, href: `/?event=${encodeURIComponent(e.id)}`, actor: req.user.name })
  }
  res.json({ comments: commentsOf(e.id, req.user) })
})

// An event made for a topic: everyone interested in the topic becomes interested in the event and gets the
// invitation straight away (an Outlook meeting from the creator, or the site's own), plus a note in the app.
function fromTopic(req, e, topic) {
  let voters = []
  try { voters = db.prepare('SELECT user_id FROM topic_votes WHERE topic_id = ?').all(topic.id).map((r) => r.user_id).filter((uid) => uid !== e.author_id) } catch { /* no topics table */ }
  const ins = db.prepare('INSERT OR IGNORE INTO event_interests (event_id, user_id) VALUES (?, ?)')
  for (const uid of voters) ins.run(e.id, uid)
  const who = domainName(req.user.email, req.user.name)
  for (const uid of voters) {
    const u = userById(uid)
    if (u) notify(u.email, { kind: 'event', text: `${who} đã tạo sự kiện "${e.title}" (${whenText(e)}) cho chủ đề bạn quan tâm "${topic.title}"`, href: `/?event=${encodeURIComponent(e.id)}`, actor: req.user.name })
  }
  const base = appUrl(req)
  ;(async () => {
    try { await outlookCreate(e.id, base) } catch (err) { console.error('[outlook] create failed:', err.message) }
    if (!byId(e.id)?.ol_id) for (const uid of voters) queueInvite(e.id, uid, base)
  })()
}

// "Gửi lời mời Outlook": the creator (or an admin) sends the invitations once OPEN_AT people are interested —
// a meeting in the creator's Outlook with everyone on it, or (no calendar access) the site's own invitations.
router.post('/:id/open-invites', requireAuth, async (req, res) => {
  const e = byId(req.params.id)
  if (!e) return res.status(404).json({ error: 'not_found' })
  if (e.author_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'not_owner' })
  if (endOf(e) <= new Date().toISOString()) return res.status(400).json({ error: 'past', message: 'Sự kiện đã diễn ra.' })
  const others = interestedIds(e.id).filter((uid) => uid !== e.author_id).length
  if (!e.invites_open && others < OPEN_AT) return res.status(400).json({ error: 'not_enough', message: `Cần ít nhất ${OPEN_AT} người quan tâm.` })
  db.prepare('UPDATE events SET invites_open = 1 WHERE id = ?').run(e.id)
  const base = appUrl(req)
  try { await outlookCreate(e.id, base) } catch (err) { console.error('[outlook] create failed:', err.message) }
  // no Outlook meeting (no calendar access): each person gets the site's invitation instead
  if (!byId(e.id).ol_id) for (const uid of interestedIds(e.id)) if (uid !== e.author_id) queueInvite(e.id, uid, base)
  res.json({ event: shape(byId(e.id), req.user) })
})

router.post('/:id/interest', requireAuth, (req, res) => {
  const e = byId(req.params.id)
  if (!e) return res.status(404).json({ error: 'not_found' })
  const had = db.prepare('SELECT 1 FROM event_interests WHERE event_id = ? AND user_id = ?').get(e.id, req.user.id)
  if (had) db.prepare('DELETE FROM event_interests WHERE event_id = ? AND user_id = ?').run(e.id, req.user.id)
  else db.prepare('INSERT INTO event_interests (event_id, user_id) VALUES (?, ?)').run(e.id, req.user.id)
  // the Outlook invitation (or, taken back, its cancellation), once invitations are open
  queueInvite(e.id, req.user.id, appUrl(req))
  if (e.ol_id) queueOutlook(e.id)
  // the host: one notification per session, kept up to date
  const n = interestedIds(e.id).length
  // enough people now: the creator is told (once) they can send the Outlook invitations
  const others = interestedIds(e.id).filter((uid) => uid !== e.author_id).length
  if (!e.invites_open && others >= OPEN_AT && endOf(e) > new Date().toISOString()) {
    const fresh = db.prepare("UPDATE events SET ready_notified_at = datetime('now') WHERE id = ? AND ready_notified_at IS NULL").run(e.id)
    const creator = userById(e.author_id)
    if (fresh.changes && creator) {
      const href = `/?event=${encodeURIComponent(e.id)}`
      notify(creator.email, { kind: 'event', text: `Sự kiện "${e.title}" đã đủ ${OPEN_AT} người quan tâm. Mở sự kiện để gửi lời mời Outlook cho mọi người.`, href, actor: '' })
      sendMail({ to: creator.email, subject: `Đủ ${OPEN_AT} người quan tâm: ${e.title}`, text: `Sự kiện "${e.title}" (${whenText(e)}) đã có ${others} người quan tâm, đủ điều kiện để mở.\n\nMở sự kiện và bấm "Gửi lời mời Outlook": sự kiện sẽ được tạo trong lịch Outlook của bạn và mọi người quan tâm nhận lời mời. Ai quan tâm sau đó cũng được mời tiếp.\n\nMở sự kiện: ${appUrl(req)}${href}` }).catch(() => {})
    }
  }
  for (const to of had ? [] : hostEmails(e)) {
    if (to === req.user.email.toLowerCase()) continue
    notifyOnce(to, 'event', { ref: 'event-interest:' + e.id, text: n === 1 ? `${domainName(req.user.email, req.user.name)} quan tâm sự kiện "${e.title}" của bạn` : `${n} người quan tâm sự kiện "${e.title}" của bạn`, href: `/?event=${encodeURIComponent(e.id)}`, actor: req.user.name })
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
      sendMail({ to, subject: `Nhắc lịch: ${e.title} (${whenText(e)})`, text: `Sự kiện bạn quan tâm sắp diễn ra:\n\n${e.title}\nThời gian: ${whenText(e)}\nĐịa điểm: ${e.location}${hostNames(e).length ? `\nNgười tổ chức: ${hostNames(e).join(', ')}` : ''}\n\nXem tại: ${link}` }).catch(() => {})
    }
    if (n) for (const to of hostEmails(e)) sendMail({ to, subject: `Sự kiện của bạn sắp diễn ra: ${e.title}`, text: `Sự kiện "${e.title}" diễn ra ${whenText(e)} tại ${e.location}, đang có ${n} người quan tâm.\n\nXem danh sách tại: ${link}` }).catch(() => {})
  }
}

export default router
