import { css, hoverClass } from '../lib/style.js'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'

/**
 * Rounded dropdown pill that sits on the same row as the page search box (same 46px height,
 * full radius and shadow), so search + filters read as one toolbar.
 * options: [{ label, onClick, active }]
 */
export default function FilterPill({ label, name, openDrop, setOpenDrop, options, width = 200, align = 'left', active = false }) {
  const open = openDrop === name
  return (
    <div style={{ position: 'relative', flex: 'none' }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpenDrop(open ? null : name) }}
        className={hoverClass('border-color:#B9CCF8 !important;')}
        style={css(`display:inline-flex; align-items:center; gap:8px; height:46px; box-sizing:border-box; padding:0 14px 0 18px; border-radius:999px; border:1px solid ${active ? '#B9CCF8' : '#E6EBF3'}; background:${active ? '#EEF3FF' : '#ffffff'}; color:${active ? '#2c5fff' : '#1E293B'}; font:600 13.5px ${FONT}; cursor:pointer; white-space:nowrap; box-shadow:0 10px 26px rgba(0,0,0,.25); transition:border-color .15s;`)}
      >
        <span style={css('max-width:150px; overflow:hidden; text-overflow:ellipsis;')}>{label}</span>
        <svg style={{ flex: 'none', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="m6 9 6 6 6-6"></path></svg>
      </button>
      {open && (
        <div onClick={(e) => e.stopPropagation()} style={css(`position:absolute; top:52px; ${align === 'right' ? 'right:0;' : 'left:0;'} z-index:40; min-width:${width}px; max-height:250px; overflow:auto; background:#ffffff; border:1px solid #E6EBF3; border-radius:16px; box-shadow:0 18px 40px rgba(15,23,42,.28); padding:6px;`)}>
          {options.map((opt, i) => (
            <div
              key={i}
              onClick={opt.onClick}
              className={hoverClass('background:#F3F6FC;')}
              style={css(`padding:9px 12px; border-radius:10px; cursor:pointer; font:${opt.active ? 700 : 500} 13.5px ${FONT}; color:${opt.active ? '#2c5fff' : '#1E293B'}; background:${opt.active ? '#EEF3FF' : 'transparent'}; white-space:nowrap;`)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
