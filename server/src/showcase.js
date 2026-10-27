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
// Admin edits of a showcase case, made through the share form on the site: <DATA_DIR>/showcase-edits/<id>.json.
// The case file stays as written; the edit is laid over it when the case is served.
const EDIT_DIR = path.join(process.env.DATA_DIR || '/data', 'showcase-edits')
const edits = new Map()
try { for (const f of fs.readdirSync(EDIT_DIR)) if (f.endsWith('.json')) edits.set(f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(EDIT_DIR, f), 'utf8'))) } catch { /* no edits yet */ }
export function saveShowcaseEdit(id, edit) {
  fs.mkdirSync(EDIT_DIR, { recursive: true })
  fs.writeFileSync(path.join(EDIT_DIR, `${id}.json`), JSON.stringify(edit))
  edits.set(id, edit)
}
const lines = (t) => String(t || '').split(/\r?\n/).map((x) => x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean)
// A step's own words (untitled text, its first prompt or command, its first warning) are what the form edits;
// pictures, tables, titled blocks and further prompts stay as they were, after the edited ones.
const isOwnText = (b) => b.type === 'text' && !b.title
function mergeStep(orig, e) {
  const blocks = (orig && orig.blocks) || []
  const firstPrompt = blocks.find((b) => b.type === 'prompt' || b.type === 'code')
  const firstNote = blocks.find((b) => b.type === 'note' && (b.tone === 'warn' || b.tone === 'danger'))
  const kept = blocks.filter((b) => !isOwnText(b) && b !== firstPrompt && b !== firstNote)
  const prompt = e.prompt && (firstPrompt && firstPrompt.type === 'code'
    ? { ...firstPrompt, code: e.prompt }
    : { ...(firstPrompt || { type: 'prompt', label: 'Prompt / lệnh mẫu' }), type: 'prompt', text: e.prompt })
  return {
    ...(orig || {}),
    title: e.title,
    blocks: [e.text && { type: 'text', text: e.text }, prompt, ...kept, e.note && { ...(firstNote || {}), type: 'note', tone: (firstNote && firstNote.tone) || 'warn', text: e.note }].filter(Boolean),
  }
}
function withEdit(c) {
  const e = edits.get(c.id)
  if (!e) return c
  const a = c.apply || {}
  const out = {
    ...c,
    title: e.title || c.title, desc: e.oneLine ?? c.desc, audience: e.audience ?? c.audience, difficulty: e.level || c.difficulty,
    tools: e.tools || c.tools, members: e.members || c.members,
    apply: {
      ...a,
      prep: e.prep != null ? lines(e.prep) : a.prep,
      fit: { yes: e.fitYes != null ? lines(e.fitYes) : (a.fit || {}).yes || [], no: e.fitNo != null ? lines(e.fitNo) : (a.fit || {}).no || [] },
      success: e.success != null ? lines(e.success) : a.success,
      pitfalls: e.pitfalls != null ? lines(e.pitfalls).map((l) => { const m = /^(.*?)\s*(?:→|->)\s*(.+)$/.exec(l); return m ? { meet: m[1], why: '', fix: m[2] } : { meet: l, why: '' } }) : a.pitfalls,
      ...(Array.isArray(e.steps) ? { stepSections: e.steps.map((s, i) => mergeStep((a.stepSections || [])[i], s)), steps: undefined, blocks: undefined } : {}),
    },
    safety: { ...(c.safety || {}), rules: e.safety != null ? lines(e.safety) : (c.safety || {}).rules, limits: e.limits != null ? lines(e.limits) : (c.safety || {}).limits },
    result: e.result != null ? { ...(c.result || {}), bullets: lines(e.result) } : c.result,
  }
  // Bài toán / Giải pháp: the exhibition text when the case shows that, otherwise its own text
  if (e.problem != null || e.solution != null) {
    if (c.exhibition) out.exhibition = { problem: e.problem ?? c.exhibition.problem, solution: e.solution ?? c.exhibition.solution }
    else {
      if (e.problem != null) out.problem = { ...(c.problem || {}), text: e.problem, bullets: [] }
      if (e.solution != null) out.solution = { ...(c.solution || {}), text: e.solution, steps: [], analogy: '' }
    }
  }
  return out
}
export const visibleShowcase = () => showcaseCases.filter((c) => !hidden.has(c.id)).map((c) => { const own = coverOf(c.id); const x = withEdit(c); return own ? { ...x, cover: own } : x })
export function hideShowcase(id) {
  if (!SHOWCASE_IDS.has(id)) return false
  hidden.add(id)
  fs.writeFileSync(HIDDEN_FILE, JSON.stringify([...hidden]))
  return true
}
