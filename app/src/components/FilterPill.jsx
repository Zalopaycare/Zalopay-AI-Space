import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { css, hoverClass } from '../lib/style.js'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'

/**
 * Rounded dropdown pill that sits on the same row as the page search box (same 46px height,
 * full radius and shadow), so search + filters read as one toolbar.
 * options: [{ label, onClick, active }]
 *
 * The menu is portalled to <body> with fixed positioning: inside the page hero (overflow:hidden)
 * its lower part used to be clipped, and a click there fell through to the card underneath.
 * Options are real buttons (role="option"): Arrow keys move, Enter/Space picks, Esc closes.
 */
export default function FilterPill({ label, name, openDrop, setOpenDrop, options, width = 200, align = 'left', active = false, onClear }) {
  const open = openDrop === name
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const [pos, setPos] = useState(null)
  const [focusIdx, setFocusIdx] = useState(-1)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect()
      if (!r) return
      const w = Math.max(width, r.width)
      const left = align === 'right' ? Math.max(8, r.right - w) : Math.min(r.left, window.innerWidth - w - 8)
      const below = window.innerHeight - r.bottom - 12
      setPos({ left, top: r.bottom + 6, width: w, maxHeight: Math.max(160, Math.min(320, below)) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open, width, align])

  // Keyboard: focus the selected option on open; Esc returns focus to the pill.
  useEffect(() => {
    if (!open) { setFocusIdx(-1); return }
    const i = Math.max(0, options.findIndex((o) => o.active))
    setFocusIdx(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => {
    if (open && focusIdx >= 0) menuRef.current?.querySelectorAll('[role="option"]')[focusIdx]?.focus({ preventScroll: false })
  }, [open, focusIdx, pos])

  const close = (refocus) => { setOpenDrop(null); if (refocus) btnRef.current?.focus() }
  const onMenuKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx((i) => Math.min(options.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setFocusIdx(0) }
    else if (e.key === 'End') { e.preventDefault(); setFocusIdx(options.length - 1) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true) }
    else if (e.key === 'Tab') close(false)
  }

  return (
    <div style={{ position: 'relative', flex: 'none' }}>
      <div
        className={hoverClass('border-color:#B9CCF8 !important;')}
        style={css(`display:inline-flex; align-items:center; height:46px; box-sizing:border-box; border-radius:999px; border:1px solid ${active ? '#B9CCF8' : '#E6EBF3'}; background:${active ? '#EEF3FF' : '#ffffff'}; box-shadow:0 10px 26px rgba(0,0,0,.25); transition:border-color .15s;`)}
      >
        <button
          ref={btnRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={(e) => { e.stopPropagation(); setOpenDrop(open ? null : name) }}
          onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpenDrop(name) } }}
          style={css(`display:inline-flex; align-items:center; gap:8px; height:100%; padding:0 ${active && onClear ? 6 : 14}px 0 18px; border:none; border-radius:999px; background:transparent; color:${active ? '#2c5fff' : '#1E293B'}; font:600 13.5px ${FONT}; cursor:pointer; white-space:nowrap;`)}
        >
          <span style={css('max-width:150px; overflow:hidden; text-overflow:ellipsis;')}>{label}</span>
          <svg style={{ flex: 'none', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="m6 9 6 6 6-6"></path></svg>
        </button>
        {active && onClear && (
          <button
            type="button"
            aria-label={'Bỏ lọc ' + label}
            title="Bỏ lọc"
            onClick={(e) => { e.stopPropagation(); onClear() }}
            className={hoverClass('background:#D6E2FF !important;')}
            style={css('flex:none; display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; margin-right:9px; border:none; border-radius:50%; background:#E0E9FF; color:#2c5fff; cursor:pointer;')}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
          </button>
        )}
      </div>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={onMenuKey}
          style={css(`position:fixed; top:${pos.top}px; left:${pos.left}px; z-index:4500; width:${pos.width}px; max-height:${pos.maxHeight}px; overflow:auto; box-sizing:border-box; background:#ffffff; border:1px solid #E6EBF3; border-radius:16px; box-shadow:0 18px 40px rgba(15,23,42,.28); padding:6px;`)}
        >
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              role="option"
              aria-selected={!!opt.active}
              tabIndex={i === focusIdx ? 0 : -1}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); opt.onClick(); btnRef.current?.focus() }}
              onMouseEnter={() => setFocusIdx(i)}
              className={hoverClass('background:#F3F6FC;')}
              style={css(`display:block; width:100%; text-align:left; border:none; outline:none; padding:9px 12px; border-radius:10px; cursor:pointer; font:${opt.active ? 700 : 500} 13.5px ${FONT}; color:${opt.active ? '#2c5fff' : '#1E293B'}; background:${opt.active ? '#EEF3FF' : i === focusIdx ? '#F3F6FC' : 'transparent'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
