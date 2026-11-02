import { db } from './db.js'
import { showcaseCases } from './showcase.js'

// "Cần đổi tên": a use case whose name doesn't say what it does (readers only see the name on the card).
// An admin turns it on or off for any use case; the showcase cases AI Space wrote start with it on when
// their file says renameNeeded. It goes away by itself once the name is changed.
db.exec(`CREATE TABLE IF NOT EXISTS rename_flags (
  use_case_id TEXT PRIMARY KEY,
  flagged INTEGER NOT NULL,
  by_user INTEGER,
  at TEXT NOT NULL DEFAULT (datetime('now'))
)`)

const rowOf = db.prepare('SELECT flagged FROM rename_flags WHERE use_case_id = ?')
const fromFile = (id) => !!(showcaseCases.find((c) => c.id === id) || {}).renameNeeded

export function renameFlagged(id) {
  const r = rowOf.get(id)
  return r ? !!r.flagged : fromFile(id)
}

export function setRenameFlag(id, on, userId) {
  db.prepare(`INSERT INTO rename_flags (use_case_id, flagged, by_user) VALUES (?, ?, ?)
    ON CONFLICT(use_case_id) DO UPDATE SET flagged = excluded.flagged, by_user = excluded.by_user, at = datetime('now')`).run(id, on ? 1 : 0, userId || null)
}

/** Every use case that currently needs a new name. */
export function renameFlagIds() {
  const rows = db.prepare('SELECT use_case_id, flagged FROM rename_flags').all()
  const set = new Map(rows.map((r) => [r.use_case_id, !!r.flagged]))
  const ids = rows.filter((r) => r.flagged).map((r) => r.use_case_id)
  for (const c of showcaseCases) if (c.renameNeeded && !set.has(c.id)) ids.push(c.id)
  return ids
}
