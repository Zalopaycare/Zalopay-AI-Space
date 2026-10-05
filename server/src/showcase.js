import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Showcase use cases written from the teams' internal docs (server/showcase/cases/*.js) and their
// original screenshots (server/showcase/media/<id>/). Kept on the server so neither the text nor
// the images reach anyone who hasn't signed in with a company account.

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

// Admins can remove a showcase case from the site. The case files stay in the code; the removed ids
// are kept in a small JSON file next to the database (same volume), so no schema change is needed.
const HIDDEN_FILE = path.join(process.env.DATA_DIR || '/data', 'hidden-showcase.json')
let hidden = new Set()
try { hidden = new Set(JSON.parse(fs.readFileSync(HIDDEN_FILE, 'utf8'))) } catch { /* none hidden yet */ }
export const visibleShowcase = () => showcaseCases.filter((c) => !hidden.has(c.id))
export function hideShowcase(id) {
  if (!SHOWCASE_IDS.has(id)) return false
  hidden.add(id)
  fs.writeFileSync(HIDDEN_FILE, JSON.stringify([...hidden]))
  return true
}
