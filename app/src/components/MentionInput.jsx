import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import MentionField, { expandMentions } from './MentionField.jsx'
import { api } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { css, hoverClass } from '../lib/style.js'

// A comment/composer field with @mention suggestions built in: type "@" + a few letters, pick a
// colleague (signed-in users + company directory), and the field shows "@handle" while the text
// sent to the server carries the full address. Call ref.expand(text) right before posting.
//
//   const box = useRef(null)
//   <MentionInput ref={box} value={draft} onChange={setDraft} onEnter={post} multiline />
//   post = () => api.x(box.current.expand(draft))

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const AV = ['#2c5fff', '#00A352', '#6F0CE2', '#FF8D00', '#0033C9', '#00B7FF']
const scan = (v) => { const m = /(?:^|\s)@([\p{L}\w.-]*)$/u.exec(v); return m ? m[1].toLowerCase() : null }
const insert = (v, handle) => v.replace(/@([\p{L}\w.-]*)$/u, '@' + handle + ' ')

const MentionInput = forwardRef(function MentionInput({ value, onChange, onEnter, onKeyDown, multiline = false, inputRef, style, popupWidth = 320, placement = 'above', ...rest }, ref) {
  const { user } = useAuth()
  const { t } = useI18n()
  const [mq, setMq] = useState(null) // text typed after "@", null = no suggestions
  const [people, setPeople] = useState({ q: null, users: [], domains: [], relogin: false })
  const map = useRef({}) // short handle → full email for people picked here
  const fieldRef = useRef(null)

  useImperativeHandle(ref, () => ({
    expand: (text) => { const out = expandMentions(text, map.current); map.current = {}; return out },
    focus: () => fieldRef.current?.focus(),
  }), [])

  useEffect(() => {
    if (!user || mq === null) return
    const h = setTimeout(() => {
      api.listUsers(mq).then((d) => setPeople({ q: mq, users: d.users || [], domains: d.domains || [], relogin: !!d.relogin })).catch(() => {})
    }, 180)
    return () => clearTimeout(h)
  }, [user, mq])

  const pick = (tok) => {
    const handle = tok.split('@')[0]
    if (tok.includes('@')) map.current[handle.toLowerCase()] = tok
    onChange(insert(value || '', handle))
    setMq(null)
    requestAnimationFrame(() => { const el = fieldRef.current; if (el) { el.focus(); const n = el.value.length; el.setSelectionRange(n, n) } })
  }

  const list = people.q === mq ? people.users.slice() : []
  if (mq && mq.length >= 2 && /^[a-z0-9._-]+$/.test(mq) && !list.some((p) => p.mention === mq)) {
    for (const d of people.domains) if (!list.some((p) => p.key === mq + '@' + d)) list.push({ key: mq + '@' + d, name: mq + '@' + d, mention: mq + '@' + d, sub: t('Gửi email tới địa chỉ này'), initials: '@', avatarColor: '#94a3b8' })
  }
  const items = list.slice(0, 8).map((p, i) => ({ ...p, bg: p.avatarColor || AV[i % AV.length], onPick: () => pick(p.mention) }))
  if (people.q === mq && people.relogin && mq && mq.length >= 2) {
    items.push({ key: '__relogin', name: t('Đăng nhập lại để tìm cả công ty'), sub: t('Cần đăng nhập lại 1 lần để gợi ý tên từ danh bạ công ty'), initials: '↻', bg: '#2c5fff', onPick: () => { window.location.href = '/api/auth/sso/login?next=' + encodeURIComponent(window.location.pathname + window.location.hash) } })
  }
  const open = mq !== null && items.length > 0

  const setRefs = (el) => {
    fieldRef.current = el
    if (typeof inputRef === 'function') inputRef(el)
    else if (inputRef) inputRef.current = el
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <MentionField
        ref={setRefs}
        multiline={multiline}
        value={value}
        onChange={(e) => { onChange(e.target.value); setMq(scan(e.target.value)) }}
        onBlur={() => setMq(null)}
        onKeyDown={(e) => {
          if (open && e.key === 'Escape') { e.preventDefault(); setMq(null); return }
          if (open && (e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) { e.preventDefault(); items[0].onPick(); return }
          if (onKeyDown) onKeyDown(e)
          if (!e.defaultPrevented && onEnter && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onEnter() }
        }}
        style={style}
        {...rest}
      />
      {open && (
        <div style={css(`position:absolute; left:0; ${placement === 'below' ? 'top:calc(100% + 6px);' : 'bottom:calc(100% + 6px);'} width:${popupWidth}px; max-height:320px; overflow-y:auto; max-width:100%; background:#ffffff; border:1px solid #E6EBF3; border-radius:14px; box-shadow:0 18px 40px rgba(15,23,42,.18); padding:6px; z-index:80;`)}>
          {items.map((m) => (
            <div key={m.key} onMouseDown={(e) => e.preventDefault()} onClick={m.onPick} className={hoverClass('background:#F4F7FE;')} style={css('display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px; cursor:pointer;')}>
              <span style={css(`flex:none; width:28px; height:28px; border-radius:50%; background:${m.bg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 10.5px ${FONT};${avatarPhotoCss(m.avatarUrl)}`)}>{m.initials}</span>
              <span style={css('flex:1; min-width:0; display:flex; flex-direction:column;')}>
                <span style={css(`font:700 13px ${FONT}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{m.name}</span>
                <span style={css(`font:400 11.5px ${FONT}; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{m.sub}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

export default MentionInput
