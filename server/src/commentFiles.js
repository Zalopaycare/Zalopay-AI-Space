import express from 'express'
import { db } from './db.js'
import { requireAuth } from './auth.js'

// Files attached to an answer or a comment: up to 5, 10 MB each, any type. Images are shown inline,
// everything else is a download link.
export const MAX_COMMENT_FILES = 5
const MAX_BYTES = 10 * 1024 * 1024
const KINDS = ['answer', 'acomment', 'uccomment']

// [{ name, data: "data:<mime>;base64,..." }] → [{ name, mime, data }], or null if any is unusable.
export function decodeCommentFiles(list) {
  const out = []
  for (const f of (Array.isArray(list) ? list : []).slice(0, MAX_COMMENT_FILES)) {
    const m = /^data:([\w.+-]+\/[\w.+-]+)?(?:;[^,;]*)*;base64,([A-Za-z0-9+/=]*)$/.exec(String((f && f.data) || ''))
    const name = String((f && f.name) || '').replace(/[\\/\r\n"]/g, '_').trim().slice(0, 160)
    if (!m || !name) return null
    const data = Buffer.from(m[2], 'base64')
    if (!data.length || data.length > MAX_BYTES) return null
    out.push({ name, mime: m[1] || 'application/octet-stream', data })
  }
  return out
}

export function saveCommentFiles(kind, id, files) {
  files.forEach((f, i) => db.prepare('INSERT INTO comment_files (kind, target_id, idx, name, mime, size, data) VALUES (?,?,?,?,?,?,?)').run(kind, id, i, f.name, f.mime, f.data.length, f.data))
}

export const commentFilesOf = (kind, id) => db.prepare('SELECT idx, name, mime, size FROM comment_files WHERE kind = ? AND target_id = ? ORDER BY idx').all(kind, id)
  .map((f) => ({ name: f.name, size: f.size, image: /^image\/(png|jpeg|gif|webp)$/.test(f.mime), url: `/api/files/${kind}/${encodeURIComponent(id)}/${f.idx}` }))

export const dropCommentFiles = (kind, ids) => { for (const id of [].concat(ids)) db.prepare('DELETE FROM comment_files WHERE kind = ? AND target_id = ?').run(kind, id) }

const router = express.Router()
router.get('/:kind/:id/:idx', requireAuth, (req, res) => {
  if (!KINDS.includes(req.params.kind)) return res.status(404).end()
  const f = db.prepare('SELECT name, mime, data FROM comment_files WHERE kind = ? AND target_id = ? AND idx = ?').get(req.params.kind, req.params.id, Number(req.params.idx))
  if (!f) return res.status(404).end()
  const inline = /^image\/(png|jpeg|gif|webp)$/.test(f.mime)
  // Non-images always download (never rendered by the browser), so an uploaded HTML/SVG file can't run on our origin.
  res.set('Content-Type', inline ? f.mime : 'application/octet-stream')
    .set('X-Content-Type-Options', 'nosniff')
    .set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${f.name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(f.name)}`)
    .set('Cache-Control', 'private, max-age=86400')
    .send(f.data)
})
export default router
