import crypto from 'node:crypto'
import { db } from './db.js'
import { handleOf, domainName } from './mentions.js'
// Anonymous posting (questions, answers, use cases). The real author is always stored; this only
// changes what other people see. The author and admins still see who posted (plus the alias).

export const ANON_COLOR = '#64748B'
const MAX_ALIAS = 40

/** Read { anonymous, alias } from a request body: anonymous is a boolean, alias is optional. */
export function anonFields(body) {
  const anonymous = body && (body.anonymous === true || body.anonymous === 1 || body.anonymous === '1') ? 1 : 0
  const alias = anonymous ? String(body.alias || '').replace(/\s+/g, ' ').trim().slice(0, MAX_ALIAS) : ''
  return { anonymous, alias: alias || null }
}

export const ANON_DEFAULT = 'Anonymous'
// No alias → "Anonymous 4821": a number fixed per person (same on all their anonymous posts) but derived
// with a server secret, so it can't be turned back into their account id.
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
export const anonNumber = (userId) => 1000 + (parseInt(crypto.createHmac('sha256', SECRET).update('anon:' + userId).digest('hex').slice(0, 8), 16) % 9000)
// An alias that passes for another member (posts made before that was blocked) shows as the default instead.
export const anonName = (row) => {
  const alias = row && row.alias && String(row.alias).trim()
  if (alias && !aliasTaken(alias, row.author_id)) return alias
  return row && row.author_id ? `${ANON_DEFAULT} ${anonNumber(row.author_id)}` : ANON_DEFAULT
}

const lettersOf = (name) => {
  if (/^Anonymous( \d+)?$/.test(name)) return 'AN'
  const w = String(name).split(/\s+/).filter((x) => /^[\p{L}\p{N}]/u.test(x))
  if (!w.length) return 'AN'
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[w.length - 1][0]).toUpperCase()
}

/**
 * Person fields (author, fullName, initials, team, authorId, avatarColor, avatarUrl) as `viewer`
 * should see them for a post `row` ({ anonymous, alias, author_id }).
 */
export function maskAuthor(brief, row, viewer) {
  if (!row || !row.anonymous) return brief
  const name = anonName(row)
  // Everyone sees the alias in the author's place. The author and admins also get the real name
  // (realAuthor) and keep the id, so they can edit/moderate and admins know who posted.
  const masked = { ...brief, author: name, fullName: name, initials: lettersOf(name), team: '', avatarColor: ANON_COLOR, avatarUrl: null, anonymous: true, alias: name }
  if (viewer && (viewer.is_admin || viewer.id === row.author_id)) return { ...masked, realAuthor: brief.author }
  return { ...masked, authorId: null, account: undefined }
}

/** The name to show in notifications/emails about a post: the alias when it was posted anonymously. */
export const actorNameFor = (row, user, domainName) => (row && row.anonymous ? anonName(row) : domainName(user.email, user.name))

// An alias may not pass for someone else (pentest 4.2.5): no other member's full name, email handle or
// short domain name ("Datvt14"), no admin-sounding names, and no "Anonymous 1234" (another person's default).
const squash = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '')
const RESERVED = ['admin', 'administrator', 'quantrivien', 'banquantri', 'moderator', 'zalopay', 'zalopayaispace', 'aispace', 'system', 'hethong']
export const ALIAS_TAKEN_MESSAGE = 'Tên ẩn danh này trùng với tên của một thành viên khác hoặc tên dành riêng. Vui lòng chọn tên khác.'

// squashed name → ids of the members it belongs to; rebuilt at most once a minute.
let names = null
let namesAt = 0
function memberNames() {
  if (names && Date.now() - namesAt < 60_000) return names
  names = new Map()
  for (const u of db.prepare('SELECT id, email, name FROM users').iterate()) {
    for (const k of [squash(u.name), squash(handleOf(u.email)), squash(domainName(u.email, u.name))]) {
      if (!k) continue
      if (!names.has(k)) names.set(k, new Set())
      names.get(k).add(u.id)
    }
  }
  namesAt = Date.now()
  return names
}

export function aliasTaken(alias, userId) {
  const a = squash(alias)
  if (!a) return false
  if (RESERVED.includes(a) || /^anonymous\d+$/.test(a)) return true
  const owners = memberNames().get(a)
  return !!owners && [...owners].some((id) => id !== userId)
}

/** Middleware: reject any write that sets an anonymous alias (posts, comments, profile) when the alias is taken. */
export function aliasGuard(req, res, next) {
  if (!req.user || !['POST', 'PUT', 'PATCH'].includes(req.method) || !req.body || typeof req.body !== 'object') return next()
  const alias = req.body.anonAlias !== undefined ? req.body.anonAlias : anonFields(req.body).alias
  if (alias && aliasTaken(alias, req.user.id)) return res.status(400).json({ error: 'alias_taken', message: ALIAS_TAKEN_MESSAGE })
  next()
}
