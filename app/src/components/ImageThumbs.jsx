import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { css } from '../lib/style.js'

const navBtn = 'position:absolute; top:50%; transform:translateY(-50%); width:46px; height:46px; border:none; border-radius:50%; background:rgba(255,255,255,.14); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);'

/**
 * Post images as a row of small thumbnails (like a Threads post); clicking one opens it
 * full-size in a lightbox, with arrows / keyboard to step through the rest.
 */
export default function ImageThumbs({ srcs, height = 200, style }) {
  const [open, setOpen] = useState(-1)
  const list = (srcs || []).filter(Boolean)

  useEffect(() => {
    if (open < 0) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(-1)
      if (e.key === 'ArrowRight') setOpen((i) => (i + 1) % list.length)
      if (e.key === 'ArrowLeft') setOpen((i) => (i - 1 + list.length) % list.length)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, list.length])

  if (!list.length) return null
  const stop = (e) => e.stopPropagation()

  return (
    <>
      <div onClick={stop} style={{ ...css('display:flex; gap:8px; margin-top:12px; overflow-x:auto; scrollbar-width:none;'), ...style }}>
        {list.map((src, i) => (
          <button key={i} onClick={() => setOpen(i)} style={css(`flex:none; padding:0; border:1px solid #E6EBF3; border-radius:14px; overflow:hidden; background:#EEF2F9; cursor:zoom-in; height:${height}px;`)}>
            <img src={src} alt="" style={{ display: 'block', height: '100%', width: 'auto', maxWidth: 320, objectFit: 'cover' }} />
          </button>
        ))}
      </div>

      {open >= 0 && createPortal((
        <div onClick={(e) => { stop(e); setOpen(-1) }} style={css('position:fixed; inset:0; z-index:4000; background:rgba(2,6,18,.94); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:40px 80px;')}>
          <img onClick={stop} src={list[open]} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12, boxShadow: '0 30px 80px rgba(0,0,0,.5)' }} />
          <button onClick={(e) => { stop(e); setOpen(-1) }} title="Đóng" style={css('position:absolute; top:18px; right:18px; width:42px; height:42px; border:none; border-radius:50%; background:rgba(255,255,255,.14); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center;')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
          </button>
          {list.length > 1 && (
            <>
              <button onClick={(e) => { stop(e); setOpen((i) => (i - 1 + list.length) % list.length) }} style={css(navBtn + ' left:18px;')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
              </button>
              <button onClick={(e) => { stop(e); setOpen((i) => (i + 1) % list.length) }} style={css(navBtn + ' right:18px;')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
              </button>
              <div style={css('position:absolute; bottom:20px; left:50%; transform:translateX(-50%); padding:6px 12px; border-radius:999px; background:rgba(255,255,255,.14); color:#fff; font:700 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{open + 1}/{list.length}</div>
            </>
          )}
        </div>
      ), document.body)}
    </>
  )
}
