import { useCallback, useRef, useState } from 'react'
import { css, hoverClass } from '../lib/style.js'
import FileLinks from './FileLinks.jsx'

// Attachments on answers and comments: up to 5 files, 10 MB each (same limits as the server).
export const MAX_COMMENT_FILES = 5
const MAX_BYTES = 10 * 1024 * 1024
const fmtSize = (n) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1).replace('.0', '') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB')

const readFile = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve({ name: file.name, size: file.size, image: /^image\/(png|jpeg|gif|webp)$/.test(file.type), dataUrl: r.result })
  r.onerror = reject
  r.readAsDataURL(file)
})

/**
 * Pending attachments for several composers at once, keyed by composer (e.g. 'ans:q1', 'cmt:a3').
 *   const att = useCommentAttachments()
 *   att.files(key) · att.add(key, fileList) · att.remove(key, i) · att.clear(key) · att.payload(key)
 */
export function useCommentAttachments() {
  const [map, setMapState] = useState({})
  const mapRef = useRef(map)
  const setMap = useCallback((fn) => { mapRef.current = fn(mapRef.current); setMapState(mapRef.current) }, [])
  const [error, setError] = useState(null) // { key, text }
  const files = useCallback((key) => map[key] || [], [map])
  const add = useCallback(async (key, list) => {
    const picked = Array.from(list || [])
    const tooBig = picked.filter((f) => f.size > MAX_BYTES)
    const read = await Promise.all(picked.filter((f) => f.size <= MAX_BYTES).map(readFile)).catch(() => [])
    const room = MAX_COMMENT_FILES - (mapRef.current[key] || []).length
    setMap((m) => ({ ...m, [key]: [...(m[key] || []), ...read.slice(0, Math.max(0, room))] }))
    setError(tooBig.length ? { key, text: `${tooBig.map((f) => f.name).join(', ')} lớn hơn 10MB nên không đính kèm được.` }
      : read.length > room ? { key, text: `Mỗi bình luận đính kèm tối đa ${MAX_COMMENT_FILES} file.` } : null)
  }, [setMap])
  const remove = useCallback((key, i) => setMap((m) => ({ ...m, [key]: (m[key] || []).filter((_, j) => j !== i) })), [setMap])
  const clear = useCallback((key) => { setMap((m) => { const n = { ...m }; delete n[key]; return n }); setError(null) }, [setMap])
  const payload = useCallback((key) => (map[key] || []).map((f) => ({ name: f.name, data: f.dataUrl })), [map])
  const errorFor = (key) => (error && error.key === key ? error.text : '')
  return { files, add, remove, clear, payload, errorFor }
}

/** Paperclip button that opens the file picker. */
export function AttachButton({ onFiles, disabled, size = 32, title = 'Đính kèm file' }) {
  const input = useRef(null)
  return (
    <>
      <button type="button" onClick={() => input.current?.click()} disabled={disabled} title={title} aria-label={title}
        className={hoverClass('background:#EEF3FF !important; color:#2c5fff !important;')}
        style={css(`flex:none; width:${size}px; height:${size}px; display:inline-flex; align-items:center; justify-content:center; border:1px solid #E1E7F2; border-radius:50%; background:#fff; color:#64748b; cursor:${disabled ? 'default' : 'pointer'}; opacity:${disabled ? 0.5 : 1};`)}>
        <svg width={size * 0.47} height={size * 0.47} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
      </button>
      <input ref={input} type="file" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
    </>
  )
}

/** The files picked but not sent yet, each with a remove ✕; plus the last error for this composer. */
export function PendingAttachments({ files, onRemove, error }) {
  if (!files.length && !error) return null
  return (
    <div style={css('display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;')}>
      {files.map((f, i) => (
        <span key={i} style={css('display:inline-flex; align-items:center; gap:7px; max-width:100%; height:30px; padding:0 6px 0 8px; border:1px solid #E6EBF3; border-radius:9px; background:#F8FAFE; font-size:12px; font-weight:700; color:#2c5fff; box-sizing:border-box;')}>
          {f.image
            ? <img src={f.dataUrl} alt="" style={css('width:20px; height:20px; border-radius:4px; object-fit:cover; flex:none;')} />
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></svg>}
          <span style={css('overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px;')}>{f.name}</span>
          <span style={css('flex:none; font-weight:600; color:#94a3b8;')}>{fmtSize(f.size)}</span>
          <button type="button" onClick={() => onRemove(i)} aria-label={'Bỏ ' + f.name} title="Bỏ file" style={css('flex:none; width:20px; height:20px; border:none; border-radius:50%; background:transparent; color:#94a3b8; cursor:pointer; font-size:12px; line-height:1;')}>✕</button>
        </span>
      ))}
      {error && <span style={css('flex-basis:100%; font-size:12px; font-weight:700; color:#D8232A;')}>{error}</span>}
    </div>
  )
}

/** Files on a posted answer/comment: images as thumbnails (open full size), the rest as download links. */
export function CommentFiles({ files, style }) {
  if (!files || !files.length) return null
  const images = files.filter((f) => f.image)
  const docs = files.filter((f) => !f.image)
  return (
    <div style={{ marginTop: 6, ...style }}>
      {images.length > 0 && (
        <div style={css('display:flex; flex-wrap:wrap; gap:6px;')}>
          {images.map((f) => (
            <a key={f.url} href={f.url} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} title={f.name}>
              <img src={f.url} alt={f.name} loading="lazy" style={css('display:block; width:120px; height:90px; object-fit:cover; border-radius:10px; border:1px solid #E6EBF3; background:#F1F4FA;')} />
            </a>
          ))}
        </div>
      )}
      {docs.length > 0 && <FileLinks files={docs} style={{ marginTop: images.length ? 6 : 0 }} />}
    </div>
  )
}
