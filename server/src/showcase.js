import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Showcase use cases written from the teams' internal docs (server/showcase/cases/*.js) and their
// original screenshots (server/showcase/media/<id>/). Kept on the server so neither the text nor
// the images reach anyone who hasn't signed in with a company account.
// Cases taken off the site sit in server/showcase/archive/ (cases + media); nothing loads or serves
// that folder, so moving a file back into cases/ (and its media/) is all it takes to restore one.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../showcase')
export const MEDIA_DIR = path.join(ROOT, 'media')

async function load() {
  const dir = path.join(ROOT, 'cases')
  if (!fs.existsSync(dir)) return []
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'))
  const mods = await Promise.all(files.map((f) => import(pathToFileURL(path.join(dir, f)).href)))
  return mods.map((m) => m.default).filter((c) => c && c.id)
    .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))
    // image paths in the files are written as /use-cases/<id>/<file>; serve them from the login-only route
    .map((c) => JSON.parse(JSON.stringify(c).replaceAll('"/use-cases/', '"/api/showcase/media/')))
}

export const showcaseCases = await load()
export const SHOWCASE_IDS = new Set(showcaseCases.map((c) => c.id))

// AI Exhibition booths with no write-up yet: shown as "Chưa có thông tin" tiles with a "Quan tâm"
// button, listing the booth's members (public on the exhibition site too).
export const pendingCases = (await import(pathToFileURL(path.join(ROOT, 'pending.js')).href)).default
export const PENDING_BY_ID = new Map(pendingCases.map((p) => [p.id, p]))
// A booth's owners: its PIC and members, as company account names (lower-case, the part before @).
// Their mailbox is <account>@vng.com.vn; only those exact addresses count as the booth's owners.
export const BOOTH_DOMAIN = 'vng.com.vn'
export const boothAccounts = (p) => [...new Set([...(p.pic || []), ...(p.members || [])].map((a) => a.toLowerCase()))]
export const boothEmails = (p) => boothAccounts(p).map((a) => `${a}@${BOOTH_DOMAIN}`)
export const isBoothOwner = (p, email) => !!p && boothEmails(p).includes(String(email || '').toLowerCase())

// Admins can remove a showcase case from the site. The case files stay in the code; the removed ids
// are kept in a small JSON file next to the database (same volume), so no schema change is needed.
const HIDDEN_FILE = path.join(process.env.DATA_DIR || '/data', 'hidden-showcase.json')
let hidden = new Set()
try { hidden = new Set(JSON.parse(fs.readFileSync(HIDDEN_FILE, 'utf8'))) } catch { /* none hidden yet */ }
// Covers an admin added on the site (for cases and booths that had none): <DATA_DIR>/showcase-covers/<id>.jpg,
// served at /api/showcase/cover/<id>; they win over the cover in the case file.
export const COVER_DIR = path.join(process.env.DATA_DIR || '/data', 'showcase-covers')
export function coverOf(id) {
  try { const st = fs.statSync(path.join(COVER_DIR, `${id}.jpg`)); return `/api/showcase/cover/${id}?v=${Math.round(st.mtimeMs)}` } catch { return '' }
}
export function saveCoverFile(id, buf) {
  fs.mkdirSync(COVER_DIR, { recursive: true })
  fs.writeFileSync(path.join(COVER_DIR, `${id}.jpg`), buf)
}
export const visibleShowcase = () => showcaseCases.filter((c) => !hidden.has(c.id)).map((c) => { const own = coverOf(c.id); return own ? { ...c, cover: own } : c })
export function hideShowcase(id) {
  if (!SHOWCASE_IDS.has(id)) return false
  hidden.add(id)
  fs.writeFileSync(HIDDEN_FILE, JSON.stringify([...hidden]))
  return true
}
