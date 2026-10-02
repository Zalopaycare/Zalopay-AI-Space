// Admin removals of other people's posts: a reason is required, and the author is told what was
// removed and why (in-app notification + email). Removing your own post needs neither.
import { db } from './db.js'
import { notify } from './notifications.js'
import { sendMail } from './mailer.js'
import { appUrl, domainName } from './mentions.js'

const excerptOf = (text) => { const t = String(text || '').replace(/\s+/g, ' ').trim(); return t.length > 300 ? t.slice(0, 300) + '…' : t }

/**
 * Call before deleting. Returns null when the request may go ahead, or an error to send back:
 * { status, error }. `authorId` is the post's author.
 */
export function removalCheck(req, authorId) {
  if (authorId === req.user.id) return null
  if (!req.user.is_admin) return { status: 403, error: 'not_owner' }
  const reason = String(req.body?.reason || '').trim()
  if (!reason) return { status: 400, error: 'reason_required' }
  return null
}

/** After deleting someone else's post: tell its author. `what` e.g. 'câu hỏi', `title` the post's title/opening. */
export function notifyRemoval(req, { authorId, what, title, content }) {
  if (!authorId || authorId === req.user.id) return
  const author = db.prepare('SELECT email, name FROM users WHERE id = ?').get(authorId)
  if (!author) return
  const reason = String(req.body?.reason || '').trim().slice(0, 1000)
  const label = title ? `${what} "${String(title).slice(0, 120)}"` : what
  notify(author.email, { kind: 'removed', text: `Admin đã xoá ${label} của bạn. Lý do: ${reason}`, href: '/profile', actor: 'Admin' })
  sendMail({
    to: author.email,
    subject: `Nội dung của bạn trên Zalopay AI Space đã bị xoá`,
    text: `Chào ${author.name || 'bạn'},\n\nAdmin đã xoá ${label} của bạn trên Zalopay AI Space.\n\nLý do: ${reason}\n\nNội dung đã xoá:\n"${excerptOf(content)}"\n\nNếu bạn có thắc mắc, hãy phản hồi lại cho admin.\n${appUrl(req)}`,
  }).catch((e) => console.error('[moderation] mail failed:', e.message))
}

const adminEmails = (exceptEmail) => {
  const env = String(process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  const dbAdmins = db.prepare('SELECT email FROM users WHERE is_admin = 1').all().map((u) => u.email.toLowerCase())
  return [...new Set([...env, ...dbAdmins])].filter((e) => e !== String(exceptEmail || '').toLowerCase())
}

/** Someone deleted their own post: let the admins know (in-app), with what it was. Admins deleting their own: nothing. */
export function notifySelfRemoval(req, { authorId, what, title, content }) {
  if (authorId !== req.user.id || req.user.is_admin) return
  const who = domainName(req.user.email, req.user.name)
  const label = title ? `${what} "${String(title).slice(0, 120)}"` : `${what}: "${excerptOf(content).slice(0, 120)}"`
  for (const to of adminEmails(req.user.email)) notify(to, { kind: 'removed', text: `${who} đã tự xoá ${label}`, href: '/admin', actor: req.user.name })
}

/** Either case after a delete: the author is told when an admin removed it; admins are told when the author did. */
export function afterRemoval(req, post) {
  if (post.authorId === req.user.id) notifySelfRemoval(req, post)
  else notifyRemoval(req, post)
}
