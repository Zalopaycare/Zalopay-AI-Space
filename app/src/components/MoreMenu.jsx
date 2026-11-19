import { useEffect, useState } from 'react'
import { css, hoverClass } from '../lib/style.js'

// The ⋯ button with its little menu, used on "Chủ đề quan tâm" topics and events (their author edits /
// deletes; everyone else reports / saves). `items`: [{ label, icon, danger, onClick }].
const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'

/** The ⋯ menu: `items` [{ label, icon, danger, onClick }]. */
export default function MoreMenu({ items }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return undefined
    const close = () => setOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])
  return (
    <div style={css('position:relative; flex:none;')}>
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }} aria-label="Tuỳ chọn" title="Tuỳ chọn" aria-haspopup="menu" className={hoverClass('background:#E4E9F2 !important;')}
        style={css('width:34px; height:32px; border:none; border-radius:9px; background:#EEF1F6; color:#334155; cursor:pointer; display:flex; align-items:center; justify-content:center;')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="5" cy="12" r="1.4"></circle><circle cx="12" cy="12" r="1.4"></circle><circle cx="19" cy="12" r="1.4"></circle></svg>
      </button>
      {open && (
        <div role="menu" style={css('position:absolute; right:0; top:38px; min-width:170px; background:#fff; border:1px solid #E6EBF3; border-radius:12px; box-shadow:0 18px 40px rgba(15,23,42,.18); padding:5px; z-index:10;')}>
          {items.map((it) => (
            <button key={it.label} role="menuitem" onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick() }} className={hoverClass(it.danger ? 'background:#FFF4F4 !important;' : 'background:#F4F7FE !important;')}
              style={css(`display:flex; align-items:center; gap:10px; width:100%; padding:9px 12px; border:none; background:transparent; border-radius:9px; cursor:pointer; text-align:left; font:600 13px ${FONT}; color:${it.danger ? '#D8232A' : '#0F172A'};`)}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
const ic = (d) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
export const MENU_ICON = {
  cancel: ic(<><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18M10 14l4 4M14 14l-4 4"></path></>),
  edit: ic(<><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></>),
  del: ic(<><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></>),
  report: ic(<><path d="M4 22V4"></path><path d="M4 4h13l-2 4 2 4H4"></path></>),
  save: ic(<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>),
}

