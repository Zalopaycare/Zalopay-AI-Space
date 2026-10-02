import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { css } from '../lib/style.js'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const PRESETS = ['Nội dung test / spam', 'Không liên quan tới AI hoặc công việc', 'Có thông tin nội bộ / dữ liệu khách hàng chưa che', 'Trùng lặp với bài đã có']

function Dialog({ what, title, onDone }) {
  const [reason, setReason] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onDone(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onDone])
  const ok = reason.trim().length > 0
  return (
    <div onClick={() => onDone(null)} style={css('position:fixed; inset:0; z-index:6000; background:rgba(4,10,26,.66); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:24px;')}>
      <div role="dialog" aria-modal="true" aria-label={`Xoá ${what} của người khác`} onClick={(e) => e.stopPropagation()} style={css(`width:440px; max-width:100%; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px rgba(3,12,40,.5); font-family:${FONT}; color-scheme:light;`)}>
        <div style={css('font-size:17px; font-weight:800; color:#0F172A;')}>Xoá {what} của người khác</div>
        {title && <div style={css('margin-top:6px; font-size:13px; color:#475569; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;')}>“{title}”</div>}
        <div style={css('margin-top:10px; font-size:13px; line-height:1.55; color:#64748b;')}>Người đăng sẽ nhận thông báo và email kèm nội dung bài cùng lý do bên dưới. Hành động này không hoàn tác được.</div>
        <div style={css('display:flex; flex-wrap:wrap; gap:6px; margin-top:14px;')}>
          {PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => setReason(p)} style={css(`height:28px; padding:0 11px; border-radius:999px; border:1px solid ${reason === p ? '#B9CCF8' : '#DDE3EC'}; background:${reason === p ? '#E7ECFB' : '#fff'}; color:${reason === p ? '#2c5fff' : '#3A4757'}; font:700 12px ${FONT}; cursor:pointer;`)}>{p}</button>
          ))}
        </div>
        <textarea ref={ref} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} placeholder="Lý do xoá (bắt buộc)" style={css(`width:100%; margin-top:10px; box-sizing:border-box; padding:10px 12px; border:1px solid #DDE3EC; border-radius:12px; background:#fff; font:500 13.5px/1.55 ${FONT}; color:#0F172A; outline:none; resize:vertical;`)} />
        <div style={css('display:flex; gap:10px; margin-top:16px;')}>
          <button type="button" onClick={() => onDone(null)} style={css(`flex:1; height:42px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 13.5px ${FONT}; cursor:pointer;`)}>Huỷ</button>
          <button type="button" disabled={!ok} onClick={() => onDone(reason.trim())} style={css(`flex:1; height:42px; border:none; border-radius:999px; background:#D8232A; color:#fff; font:700 13.5px ${FONT}; cursor:${ok ? 'pointer' : 'default'}; opacity:${ok ? 1 : 0.45};`)}>Xoá và báo người đăng</button>
        </div>
      </div>
    </div>
  )
}

/** Ask an admin why they're removing someone else's post. Resolves to the reason, or null if cancelled. */
export function askRemovalReason({ what = 'bài viết', title = '' } = {}) {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const done = (v) => { root.unmount(); host.remove(); resolve(v) }
    root.render(<Dialog what={what} title={title} onDone={done} />)
  })
}
