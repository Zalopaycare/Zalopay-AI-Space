import { css, hoverClass } from '../lib/style.js'

const fmtSize = (n) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1).replace('.0', '') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB')

/** Downloadable documents attached to a question ({ name, size, url }). */
export default function FileLinks({ files, style }) {
  if (!files || !files.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, ...style }}>
      {files.map((f) => (
        <a
          key={f.url}
          href={f.url}
          download={f.name}
          onClick={(e) => e.stopPropagation()}
          className={hoverClass('border-color:#B9CCF8 !important; background:#F2F6FF !important;')}
          style={css('display:inline-flex; align-items:center; gap:8px; max-width:100%; height:36px; padding:0 12px; border:1px solid #E6EBF3; border-radius:10px; background:#F8FAFE; color:#2c5fff; font-size:12.5px; font-weight:700; text-decoration:none; box-sizing:border-box;')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></svg>
          <span style={css('overflow:hidden; text-overflow:ellipsis; white-space:nowrap;')}>{f.name}</span>
          {f.size > 0 && <span style={css('flex:none; font-weight:600; color:#94a3b8;')}>{fmtSize(f.size)}</span>}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>
        </a>
      ))}
    </div>
  )
}
