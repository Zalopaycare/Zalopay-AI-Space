import { db } from './db.js'
import { isCompanyEmail } from './auth.js'
import { sendMail } from './mailer.js'
import { notify } from './notifications.js'

// "@thyndm" (email handle of a signed-up user) or "@thyndm@vng.com.vn" (any company address).
const MENTION_RE = /@([A-Za-z0-9._-]+(?:@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)?)/g
const MAX_MENTIONS = 10

export const handleOf = (email) => String(email || '').split('@')[0].toLowerCase()

const fold = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()
/**
 * Short "domain account" style name, like the use case cards: "Thy. Nguyễn Đoàn Mai" +
 * thyndm@… → "ThyNDM"; falls back to the bare email handle when the name doesn't line up.
 */
export function domainName(email, name) {
  const handle = handleOf(email)
  if (!handle) return name || ''
  const nick = fold((/^\s*([^.\s]+)\.\s/.exec(String(name || '')) || [])[1] || String(name || '').trim().split(/\s+/)[0])
  if (nick && handle.startsWith(nick)) return nick[0].toUpperCase() + nick.slice(1) + handle.slice(nick.length).toUpperCase()
  return handle
}

/** Company emails mentioned in `text`, resolved against known users; unknown handles are ignored. */
export function mentionedEmails(text) {
  const tokens = new Set()
  for (const m of String(text || '').matchAll(MENTION_RE)) tokens.add(m[1].replace(/[._-]+$/, '').toLowerCase())
  if (!tokens.size) return []
  const users = db.prepare('SELECT email, name FROM users').all()
  const emails = new Set()
  for (const tok of tokens) {
    if (tok.includes('@')) {
      if (isCompanyEmail(tok)) emails.add(tok)
      continue
    }
    const u = users.find((x) => handleOf(x.email) === tok || x.name.toLowerCase().replace(/\s+/g, '') === tok)
    if (u) emails.add(u.email.toLowerCase())
  }
  return [...emails].slice(0, MAX_MENTIONS)
}

/** Public base URL for links in emails: APP_URL if set, else the request's own origin. */
export function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '')
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol).split(',')[0]
  return `${proto}://${req.get('host')}`
}

/**
 * Email everyone @-mentioned in `text` (except the author and anyone in `skip`, who already
 * gets a separate notification). `where` describes the post, `path` is the in-app link.
 */
export function notifyMentions(req, { text, where, path, skip = [] }) {
  const actor = req.user
  const skipSet = new Set([actor.email.toLowerCase(), ...skip.filter(Boolean).map((e) => e.toLowerCase())])
  const link = appUrl(req) + path
  const excerpt = String(text).length > 400 ? String(text).slice(0, 400) + '…' : String(text)
  for (const to of mentionedEmails(text)) {
    if (skipSet.has(to)) continue
    notify(to, { kind: 'mention', text: `${domainName(actor.email, actor.name)} đã nhắc đến bạn trong ${where}`, href: path, actor: actor.name })
    sendMail({
      to,
      subject: `${actor.name} đã nhắc đến bạn trên Zalopay AI Space`,
      text: `${actor.name} đã nhắc đến bạn trong ${where}:\n\n"${excerpt}"\n\nXem tại: ${link}`,
    }).catch((e) => console.error('[mentions] send failed:', e.message))
  }
}

/** Avatar letters, always from the name people see next to the avatar (the domain account):
 *  "ThyNDM" → "TN", "NamNTH" → "NN", "Menutest" → "ME". Computed on read, so a name change or
 *  a Microsoft sign-in never leaves stale letters behind. */
export function initialsOf(u) {
  if (!u) return '??'
  const d = domainName(u.email, u.name) || String(u.name || '')
  const letters = d.replace(/[^\p{L}\p{N}]/gu, '')
  if (!letters) return '??'
  const cap = letters.slice(1).search(/\p{Lu}/u)
  return (letters[0] + (cap >= 0 ? letters[cap + 1] : letters[1] || '')).toUpperCase()
}
