import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { css, hoverClass } from '../lib/style.js'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const item = (color) => `display:flex; align-items:center; gap:10px; width:100%; padding:9px 12px; border:none; background:transparent; border-radius:9px; cursor:pointer; text-align:left; font:600 13px ${FONT}; color:${color}; white-space:nowrap;`

/**
 * The ⋯ button that appears when hovering a comment (the bubble carries class "zp-cmt").
 * Author: Sửa / Xoá. Everyone else: Báo cáo đến admin (admins also get Xoá).
 */
export default function CommentMenu({ isOwner, isAdmin, onEdit, onDelete, onReport }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const pick = (fn) => (e) => { e.stopPropagation(); setOpen(false); fn && fn() }
  return (
    <div ref={ref} className="zp-cmt-more" data-open={open || undefined} style={css('position:relative; flex:none;')}>
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }} title="Tuỳ chọn" className={hoverClass('background:#EEF2F9;')} style={css('width:28px; height:28px; border:none; border-radius:8px; background:transparent; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="5" cy="12" r="1.3"></circle><circle cx="12" cy="12" r="1.3"></circle><circle cx="19" cy="12" r="1.3"></circle></svg>
      </button>
      {open && (
        <div style={css('position:absolute; right:0; top:32px; min-width:210px; background:#fff; border:1px solid #E6EBF3; border-radius:12px; box-shadow:0 18px 40px rgba(15,23,42,.18); padding:5px; z-index:90;')}>
          {isOwner && (
            <button onClick={pick(onEdit)} className={hoverClass('background:#F4F7FE;')} style={css(item('#0F172A'))}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
              Sửa comment
            </button>
          )}
          {(isOwner || isAdmin) && (
            <button onClick={pick(onDelete)} className={hoverClass('background:#FFF4F4;')} style={css(item('#D8232A'))}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
              Xoá comment
            </button>
          )}
          {!isOwner && (
            <button onClick={pick(onReport)} className={hoverClass('background:#F4F7FE;')} style={css(item('#0F172A'))}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4"></path><path d="M4 4h13l-2 4 2 4H4"></path></svg>
              Báo cáo comment này đến admin
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** In-place editor: Enter saves, Shift+Enter new line, Esc cancels. */
export function InlineEdit({ initial, onSave, onCancel }) {
  const [v, setV] = useState(initial)
  const ref = useRef(null)
  useEffect(() => { const el = ref.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) } }, [])
  const save = () => { const t = v.trim(); if (t) onSave(t) }
  return (
    <div style={css('margin-top:6px;')}>
      <textarea
        ref={ref}
        value={v}
        rows={Math.min(6, Math.max(2, v.split('\n').length))}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() }
          if (e.key === 'Escape') { e.preventDefault(); onCancel() }
        }}
        style={css(`width:100%; box-sizing:border-box; border:1px solid #B9CCF8; border-radius:12px; padding:9px 12px; font:400 13.5px/1.6 ${FONT}; color:#0F172A; background:#fff; outline:none; resize:vertical;`)}
      />
      <div style={css('display:flex; align-items:center; gap:8px; margin-top:6px;')}>
        <span style={css(`font:500 11.5px ${FONT}; color:#94a3b8;`)}>Enter để lưu · Esc để huỷ</span>
        <button onClick={onCancel} style={css(`margin-left:auto; height:30px; padding:0 12px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 12px ${FONT}; cursor:pointer;`)}>Huỷ</button>
        <button onClick={save} style={css(`height:30px; padding:0 14px; border:none; border-radius:999px; background:#2c5fff; color:#fff; font:700 12px ${FONT}; cursor:pointer; opacity:${v.trim() ? 1 : 0.5};`)}>Lưu</button>
      </div>
    </div>
  )
}

/**
 * Delete-confirm and report dialogs + a small toast, shared by every comment thread.
 * askDelete(run) / askReport(type, id) open them; render `modals` once in the page.
 */
export function useCommentModals(api) {
  const [del, setDel] = useState(null) // { run }
  const [rep, setRep] = useState(null) // { type, id }
  const [reason, setReason] = useState('')
  const [toast, setToast] = useState('')
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t) }, [toast])
  const overlay = 'position:fixed; inset:0; z-index:3200; background:rgba(4,10,26,.55); display:flex; align-items:center; justify-content:center; padding:24px;'
  const box = 'width:440px; max-width:100%; background:#fff; border-radius:20px; padding:24px 26px; box-shadow:0 40px 90px rgba(3,12,40,.5); box-sizing:border-box;'
  const b = (primary, danger) => `height:40px; padding:0 18px; border-radius:999px; font:700 13px ${FONT}; cursor:pointer; ${primary ? `border:none; background:${danger ? '#D8232A' : '#2c5fff'}; color:#fff;` : 'border:1px solid #DDE3EC; background:#fff; color:#3A4757;'}`
  const modals = createPortal((
    <>
      {del && (
        <div onClick={() => setDel(null)} style={css(overlay)}>
          <div onClick={(e) => e.stopPropagation()} style={css(box)}>
            <div style={css(`font:800 17px ${FONT}; color:#0F172A;`)}>Xoá comment này?</div>
            <div style={css(`margin-top:8px; font:400 13.5px/1.6 ${FONT}; color:#64748b;`)}>Các reply bên dưới cũng sẽ bị xoá. Không thể hoàn tác.</div>
            <div style={css('display:flex; justify-content:flex-end; gap:10px; margin-top:20px;')}>
              <button onClick={() => setDel(null)} style={css(b(false))}>Huỷ</button>
              <button onClick={() => { del.run(); setDel(null) }} style={css(b(true, true))}>Xoá</button>
            </div>
          </div>
        </div>
      )}
      {rep && (
        <div onClick={() => setRep(null)} style={css(overlay)}>
          <div onClick={(e) => e.stopPropagation()} style={css(box)}>
            <div style={css(`font:800 17px ${FONT}; color:#0F172A;`)}>Báo cáo comment đến admin</div>
            <div style={css(`margin-top:8px; font:400 13.5px/1.6 ${FONT}; color:#64748b;`)}>Admin sẽ xem và xử lý. Người viết comment không biết ai đã báo cáo.</div>
            <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Lý do (không bắt buộc): nội dung không phù hợp, spam, thông tin nhạy cảm..." style={css(`width:100%; margin-top:14px; box-sizing:border-box; border:1px solid #E6EBF3; border-radius:12px; padding:10px 13px; font:400 13.5px/1.6 ${FONT}; color:#0F172A; outline:none; resize:vertical;`)}></textarea>
            <div style={css('display:flex; justify-content:flex-end; gap:10px; margin-top:16px;')}>
              <button onClick={() => setRep(null)} style={css(b(false))}>Huỷ</button>
              <button onClick={() => { const r = rep; setRep(null); api.report(r.type, r.id, reason.trim()).then(() => setToast('Đã gửi báo cáo đến admin. Cảm ơn bạn!')).catch(() => setToast('Không gửi được báo cáo, thử lại sau.')) }} style={css(b(true))}>Gửi báo cáo</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div style={css(`position:fixed; left:50%; bottom:32px; transform:translateX(-50%); z-index:3300; padding:12px 20px; border-radius:999px; background:#0F172A; color:#fff; font:700 13px ${FONT}; box-shadow:0 14px 34px rgba(0,0,0,.35);`)}>{toast}</div>}
    </>
  ), document.body)
  return { askDelete: (run) => setDel({ run }), askReport: (type, id) => { setReason(''); setRep({ type, id }) }, modals }
}

/** Small ⌄ / ⌃ arrow for "Xem thêm N replies" toggles. */
export const Chevron = ({ up }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><path d="m6 9 6 6 6-6"></path></svg>
)
