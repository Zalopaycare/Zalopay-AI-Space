import { useEffect, useState } from 'react'
import { css } from '../lib/style.js'
import { api } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'

/**
 * "Đăng ẩn danh" switch with an optional display name. Others see the name (or "Ẩn danh") and a
 * grey avatar; the author and admins still see who posted.
 */
export default function AnonToggle({ on, onChange: setOn, alias, onAlias, label = 'Đăng ẩn danh', compact = false }) {
  const { user } = useAuth()
  // Turning it on fills in the default name set once in the profile (still editable per post).
  const onChange = (v) => { setOn(v); if (v && !alias && user?.anonAlias) onAlias(user.anonAlias) }
  const taken = useAliasCheck(on ? alias : '')
  return (
    <div style={css(`display:flex; align-items:center; gap:8px; flex-wrap:wrap; ${compact ? '' : 'margin-top:8px;'}`)}>
      <label style={css('display:inline-flex; align-items:center; gap:7px; cursor:pointer; font-size:12.5px; font-weight:700; color:#3A4757; user-select:none;')}>
        <span role="switch" aria-checked={on} tabIndex={0} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(!on) } }} onClick={() => onChange(!on)} style={css(`position:relative; width:30px; height:18px; border-radius:999px; background:${on ? '#2c5fff' : '#CBD5E1'}; transition:background .15s; flex:none;`)}>
          <span style={css(`position:absolute; top:2px; left:${on ? 14 : 2}px; width:14px; height:14px; border-radius:50%; background:#fff; transition:left .15s; box-shadow:0 1px 2px rgba(0,0,0,.2);`)}></span>
        </span>
        <span onClick={() => onChange(!on)}>{label}</span>
      </label>
      {/* always there, just hidden while off: switching it on doesn't push anything around */}
      <input
        value={alias}
        tabIndex={on ? 0 : -1}
        aria-hidden={on ? undefined : true}
        onChange={(e) => onAlias(e.target.value)}
        maxLength={40}
        placeholder="Tên hiển thị (để trống = Anonymous + số riêng)"
        aria-label="Tên hiển thị khi ẩn danh"
        style={css('height:30px; min-width:0; width:220px; max-width:100%; padding:0 10px; border:1px solid #DDE3EC; border-radius:9px; background:#fff; color-scheme:light; font-family:inherit; font-size:12.5px; color:#0F172A; outline:none; box-sizing:border-box; visibility:' + (on ? 'visible' : 'hidden') + ';')}
      />
      {on && taken && <span role="alert" style={css('font-size:11.5px; font-weight:700; color:#D8232A;')}>Tên này trùng với một thành viên khác, hãy chọn tên khác.</span>}
    </div>
  )
}

/** Whether `alias` would pass for another member (checked on the server, debounced). */
export function useAliasCheck(alias) {
  const [taken, setTaken] = useState(false)
  const value = String(alias || '').trim()
  useEffect(() => {
    if (!value) { setTaken(false); return }
    let live = true
    const timer = setTimeout(() => api.aliasCheck(value).then((d) => { if (live) setTaken(!!d.taken) }).catch(() => {}), 300)
    return () => { live = false; clearTimeout(timer) }
  }, [value])
  return taken
}

/** For posts that fail because the anonymous name passes for someone else: say so (true when handled). */
export function alertIfAliasTaken(e) {
  if (e?.data?.error !== 'alias_taken') return false
  window.alert(e.data.message)
  return true
}
