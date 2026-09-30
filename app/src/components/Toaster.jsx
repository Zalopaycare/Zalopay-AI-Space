import { useEffect, useState } from 'react'
import { css } from '../lib/style.js'

// Tiny app-wide toast: call showToast('Đã copy ✓') from anywhere; one message at a time, 2 s.
const EVENT = 'zp-toast'
export function showToast(text) { window.dispatchEvent(new CustomEvent(EVENT, { detail: text })) }

export default function Toaster() {
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    let timer
    const on = (e) => { setMsg({ text: e.detail, key: Date.now() }); clearTimeout(timer); timer = setTimeout(() => setMsg(null), 2000) }
    window.addEventListener(EVENT, on)
    return () => { window.removeEventListener(EVENT, on); clearTimeout(timer) }
  }, [])
  return (
    <div role="status" aria-live="polite" style={css('position:fixed; left:50%; bottom:28px; transform:translateX(-50%); z-index:6000; pointer-events:none;')}>
      {msg && (
        <div key={msg.key} className="zp-toast" style={css('display:inline-flex; align-items:center; gap:8px; padding:11px 18px; border-radius:999px; background:#0F172A; color:#fff; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; box-shadow:0 16px 40px rgba(0,0,0,.4); white-space:nowrap;')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
          {msg.text}
        </div>
      )}
    </div>
  )
}
