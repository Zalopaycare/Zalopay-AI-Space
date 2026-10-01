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

export const anonName = (row) => (row && row.alias && String(row.alias).trim()) || 'Ẩn danh'

const lettersOf = (name) => {
  const w = String(name).split(/\s+/).filter((x) => /^[\p{L}\p{N}]/u.test(x))
  if (!w.length) return 'AD'
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[w.length - 1][0]).toUpperCase()
}

/**
 * Person fields (author, fullName, initials, team, authorId, avatarColor, avatarUrl) as `viewer`
 * should see them for a post `row` ({ anonymous, alias, author_id }).
 */
export function maskAuthor(brief, row, viewer) {
  if (!row || !row.anonymous) return brief
  const name = anonName(row)
  if (viewer && (viewer.is_admin || viewer.id === row.author_id)) return { ...brief, anonymous: true, alias: name, realAuthor: brief.author }
  return { ...brief, author: name, fullName: name, initials: lettersOf(name), team: '', authorId: null, avatarColor: ANON_COLOR, avatarUrl: null, anonymous: true, alias: name }
}

/** The name to show in notifications/emails about a post: the alias when it was posted anonymously. */
export const actorNameFor = (row, user, domainName) => (row && row.anonymous ? anonName(row) : domainName(user.email, user.name))
