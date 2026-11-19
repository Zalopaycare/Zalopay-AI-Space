import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SoftLink from './SoftLink.jsx'
import Avatar from './Avatar.jsx'
import { css, hoverClass } from '../lib/style.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useNotifications, markNotificationsRead } from '../lib/notifications.js'
import { NOTIF_ICONS } from './notifIcons.jsx'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const ROUND = 'position:relative; flex:none; width:36px; height:36px; padding:0; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .15s, border-color .15s;'
const PANEL = 'position:absolute; top:calc(100% + 10px); right:0; background:#fff; border:1px solid #E6EBF3; border-radius:16px; box-shadow:0 22px 50px rgba(0,0,0,.45); z-index:2200; overflow:hidden;'
const SHOWN = 8 // notifications in the bell's panel; the rest on the Thông báo page

/**
 * Right end of the top bar, as on Facebook: a round bell (unread count in red, the latest notifications
 * in a panel under it) and the person's avatar (Hồ sơ, Trang quản trị for admins, Đăng xuất).
 */
export default function TopBarAccount({ t }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const notif = useNotifications(!!user)
  const [open, setOpen] = useState(null) // 'bell' | 'me' | null
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(null) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  if (!user) return null
  const toggle = (which) => setOpen((o) => (o === which ? null : which))
  const go = (href) => { setOpen(null); navigate(href) }
  const roundStyle = (on) => css(ROUND + (on ? 'background:rgba(60,110,255,.35); border:1px solid rgba(160,196,255,.6); color:#fff;' : 'background:rgba(255,255,255,.08); border:1px solid rgba(130,170,255,.22); color:#dbe6ff;'))
  const panelW = 'width:min(360px, calc(100vw - 24px));'

  return (
    <div ref={ref} data-tour="account" style={css('position:relative; flex:none; display:flex; align-items:center; gap:8px;')}>
      <button
        type="button"
        onClick={() => toggle('bell')}
        title={t('Thông báo')}
        aria-label={notif.unread ? `${t('Thông báo')} (${notif.unread})` : t('Thông báo')}
        aria-expanded={open === 'bell'}
        className={open === 'bell' ? undefined : hoverClass('background:rgba(255,255,255,.16) !important;')}
        style={roundStyle(open === 'bell')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 3.7-1.2 5.9-2.2 7.1-.5.6-.1 1.4.7 1.4h16c.8 0 1.2-.8.7-1.4-1-1.2-2.2-3.4-2.2-7.1A6.5 6.5 0 0 0 12 2.5Z"></path><path d="M9.5 19.5a2.6 2.6 0 0 0 5 0Z"></path></svg>
        {notif.unread > 0 && <span style={css('position:absolute; top:-5px; right:-6px; min-width:18px; height:18px; padding:0 5px; box-sizing:border-box; border-radius:999px; background:#FF3B30; border:2px solid #0b1436; color:#fff; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center;')}>{notif.unread > 99 ? '99+' : notif.unread}</span>}
      </button>

      <button
        type="button"
        onClick={() => toggle('me')}
        title={user.name}
        aria-label={t('Tài khoản')}
        aria-expanded={open === 'me'}
        style={css('position:relative; flex:none; width:36px; height:36px; padding:0; border:none; border-radius:50%; background:transparent; cursor:pointer;')}
      >
        <Avatar user={user} size={36} fontSize={13} />
        <span aria-hidden="true" style={css('position:absolute; right:-3px; bottom:-3px; width:16px; height:16px; border-radius:50%; background:#dbe3f5; border:2px solid #0b1436; color:#0F172A; display:flex; align-items:center; justify-content:center;')}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
        </span>
      </button>

      {open === 'bell' && (
        <div role="dialog" aria-label={t('Thông báo')} style={css(PANEL + panelW)}>
          <div style={css('display:flex; align-items:center; gap:10px; padding:14px 16px 10px;')}>
            <span style={css(`flex:1; font:800 18px ${FONT}; color:#0F172A;`)}>{t('Thông báo')}</span>
            {notif.unread > 0 && <button onClick={() => markNotificationsRead()} style={css(`border:none; background:transparent; padding:0; cursor:pointer; font:700 12.5px ${FONT}; color:#2c5fff;`)}>{t('Đánh dấu đã đọc tất cả')}</button>}
          </div>
          <div style={css('max-height:min(460px, calc(100vh - 170px)); overflow-y:auto; padding:0 6px 6px;')}>
            {notif.loaded && notif.items.length === 0 && (
              <div style={css(`padding:26px 14px; text-align:center; font:600 13px ${FONT}; color:#94a3b8;`)}>{t('Chưa có thông báo nào.')}</div>
            )}
            {notif.items.slice(0, SHOWN).map((n) => (
              <button
                key={n.id}
                onClick={() => { if (n.unread) markNotificationsRead([n.id]); if (n.href) go(n.href); else setOpen(null) }}
                className={hoverClass('background:#F3F6FC !important;')}
                style={css(`display:flex; gap:11px; align-items:center; width:100%; padding:9px 10px; border:none; border-radius:10px; background:${n.unread ? '#F5F8FF' : 'transparent'}; cursor:pointer; text-align:left; font-family:inherit;`)}
              >
                <span style={css(`flex:none; width:34px; height:34px; border-radius:50%; background:${n.iconBg}; color:${n.iconFg}; display:flex; align-items:center; justify-content:center;`)}>{(NOTIF_ICONS[n.icon] || NOTIF_ICONS[n.kind]) || NOTIF_ICONS.answer}</span>
                <span style={css('flex:1; min-width:0;')}>
                  <span style={css(`display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; font:${n.unread ? '700' : '400'} 13px/1.45 var(--zp-font-text); color:${n.unread ? '#0F172A' : '#475569'};`)}>{n.text}</span>
                  <span style={css(`display:block; margin-top:2px; font:${n.unread ? '700' : '400'} 11.5px var(--zp-font-text); color:${n.unread ? '#2c5fff' : '#94a3b8'};`)}>{n.timeLabel}</span>
                </span>
                {n.unread && <span style={css('flex:none; width:9px; height:9px; border-radius:50%; background:#2c5fff;')}></span>}
              </button>
            ))}
          </div>
          <button onClick={() => go('/profile#activity')} className={hoverClass('background:#F3F6FC !important;')} style={css(`display:block; width:100%; padding:11px 16px; border:none; border-top:1px solid #EEF1F7; background:#fff; cursor:pointer; font:700 13px ${FONT}; color:#2c5fff;`)}>
            {t('Xem tất cả')}
          </button>
        </div>
      )}

      {open === 'me' && (
        <div role="menu" style={css(PANEL + 'width:250px; padding:6px;')}>
          <SoftLink to="/profile" onClick={() => setOpen(null)} className={hoverClass('background:#F3F6FC !important;')} style={css('display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:12px; text-decoration:none;')}>
            <Avatar user={user} size={36} fontSize={13} />
            <span style={css('flex:1; min-width:0;')}>
              <span style={css(`display:block; font:800 14px ${FONT}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{user.domain || user.name}</span>
              <span style={css(`display:block; font:600 12px ${FONT}; color:#64748b;`)}>{t('Xem hồ sơ')}</span>
            </span>
          </SoftLink>
          <div style={css('height:1px; margin:6px 4px; background:#EEF1F7;')}></div>
          {user.isAdmin && (
            <SoftLink to="/admin" onClick={() => setOpen(null)} className={hoverClass('background:#EEF3FF !important;')} style={css(`display:flex; align-items:center; gap:9px; padding:10px 12px; border-radius:10px; text-decoration:none; font:700 13.5px ${FONT}; color:#2c5fff; white-space:nowrap;`)}>
              <svg style={{ flex: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"></rect><rect x="14" y="3" width="7" height="5" rx="1.5"></rect><rect x="14" y="12" width="7" height="9" rx="1.5"></rect><rect x="3" y="16" width="7" height="5" rx="1.5"></rect></svg>
              {t('Trang quản trị')}
            </SoftLink>
          )}
          <button onClick={() => { setOpen(null); logout() }} className={hoverClass('background:#FFF1F1 !important;')} style={css(`display:flex; align-items:center; gap:9px; width:100%; text-align:left; padding:10px 12px; border:none; border-radius:10px; background:transparent; cursor:pointer; font:700 13.5px ${FONT}; color:#D8232A;`)}>
            <svg style={{ flex: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path></svg>
            {t('Đăng xuất')}
          </button>
        </div>
      )}
    </div>
  )
}
