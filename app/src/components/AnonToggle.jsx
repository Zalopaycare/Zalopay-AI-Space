import { useEffect, useState } from 'react'
import { css } from '../lib/style.js'
import { api } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'

/**
 * "Đăng ẩn danh" switch. Each account has one anonymous name (set in the profile, or "Anonymous" + a
 * number of its own), used on all its anonymous posts; turned on, the switch shows that name and lets
 * you change it there and then. Others see the name and a grey avatar; the author and admins still see
 * who posted. `warn` = a line in red under the switch while it's off (e.g. in your own anonymous thread).
 */
export default function AnonToggle({ on, onChange, label = 'Đăng ẩn danh', compact = false, warn = '' }) {
  const { user, setUser } = useAuth()
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const taken = useAliasCheck(renaming ? draft : '')
  const save = () => {
    const v = draft.trim()
    if (v === (user?.anonAlias || '')) { setRenaming(false); return }
    api.updateMe({ anonAlias: v }).then((d) => { if (d?.user) setUser(d.user); setRenaming(false); setErr('') })
      .catch((e) => setErr(e?.data?.error === 'alias_taken' ? 'Tên này trùng với một thành viên khác, hãy chọn tên khác.' : 'Không lưu được, thử lại.'))
  }
  const name = user?.anonName || 'Anonymous'
  return (
    <div style={css(`display:flex; align-items:center; gap:8px; flex-wrap:wrap; ${compact ? '' : 'margin-top:8px;'}`)}>
      <label style={css('display:inline-flex; align-items:center; gap:7px; cursor:pointer; font-size:12.5px; font-weight:700; color:#3A4757; user-select:none;')}>
        <span role="switch" aria-checked={on} tabIndex={0} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(!on) } }} onClick={() => onChange(!on)} style={css(`position:relative; width:30px; height:18px; border-radius:999px; background:${on ? '#2c5fff' : '#CBD5E1'}; transition:background .15s; flex:none;`)}>
          <span style={css(`position:absolute; top:2px; left:${on ? 14 : 2}px; width:14px; height:14px; border-radius:50%; background:#fff; transition:left .15s; box-shadow:0 1px 2px rgba(0,0,0,.2);`)}></span>
        </span>
        <span onClick={() => onChange(!on)}>{label}</span>
      </label>
      {on && !renaming && (
        <span style={css('display:inline-flex; align-items:center; gap:6px; font-size:12.5px; color:#64748b;')}>
          hiện là <b style={css('color:#0F172A;')}>{name}</b>
          <button type="button" onClick={() => { setDraft(user?.anonAlias || ''); setErr(''); setRenaming(true) }} style={css('border:none; background:none; padding:0; cursor:pointer; font:inherit; font-weight:700; color:#2c5fff;')}>Đổi tên</button>
        </span>
      )}
      {on && renaming && (
        <span style={css('display:inline-flex; align-items:center; gap:6px; flex-wrap:wrap;')}>
          <input
            autoFocus value={draft} maxLength={40} onChange={(e) => { setDraft(e.target.value); setErr('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } if (e.key === 'Escape') setRenaming(false) }}
            placeholder="Để trống = Anonymous + số riêng" aria-label="Tên ẩn danh của bạn"
            style={css('height:30px; width:240px; max-width:100%; padding:0 10px; border:1px solid #DDE3EC; border-radius:9px; background:#fff; color-scheme:light; font-family:inherit; font-size:12.5px; color:#0F172A; outline:none; box-sizing:border-box;')}
          />
          <button type="button" onClick={save} disabled={taken} style={css(`height:30px; padding:0 12px; border:none; border-radius:999px; background:#2c5fff; color:#fff; font-size:12px; font-weight:700; cursor:pointer; opacity:${taken ? 0.5 : 1};`)}>Lưu</button>
          <button type="button" onClick={() => setRenaming(false)} style={css('border:none; background:none; padding:0 4px; cursor:pointer; font-size:12px; font-weight:700; color:#64748b;')}>Huỷ</button>
        </span>
      )}
      {on && renaming && <span style={css('flex-basis:100%; font-size:11.5px; color:#94a3b8;')}>Tên này dùng cho mọi bài ẩn danh của bạn, kể cả bài cũ.</span>}
      {on && (taken || err) && <span role="alert" style={css('flex-basis:100%; font-size:11.5px; font-weight:700; color:#D8232A;')}>{err || 'Tên này trùng với một thành viên khác, hãy chọn tên khác.'}</span>}
      {!on && warn && <span role="alert" style={css('flex-basis:100%; font-size:11.5px; font-weight:700; color:#D8232A;')}>{warn}</span>}
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
