// Admin removals of other people's posts: a reason is required, and the author is told what was
// removed and why (in-app notification + email). Removing your own post needs neither.
import { db } from './db.js'
import { notify } from './notifications.js'
import { sendMail } from './mailer.js'
import { appUrl } from './mentions.js'

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
