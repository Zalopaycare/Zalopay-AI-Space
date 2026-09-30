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
