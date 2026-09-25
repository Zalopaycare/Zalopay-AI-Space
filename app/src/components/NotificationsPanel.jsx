import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { css } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { defaultNotifications } from '../data/notifications.js'

const NARROW_QUERY = '(max-width: 640px)'

/**
 * The bell button + popup, shared between the Sidebar (where it now lives per the v2
 * design) and anywhere else that wants it. On a normal-width screen the popup opens
 * anchored right beside the bell (like a regular dropdown). On a narrow/mobile viewport
 * there's no room for that beside a 260px sidebar, so it falls back to a centered
 * overlay instead of getting pushed off-screen.
 */
export default function NotificationsPanel({ notifications = defaultNotifications, buttonStyle }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [readAll, setReadAll] = useState(false)
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(NARROW_QUERY).matches : false))
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY)
    const onChange = () => setNarrow(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  const unread = readAll ? 0 : notifications.filter((n) => n.unread).length

  const panel = (
    <div
      onClick={(e) => e.stopPropagation()}
      style={css(`width:380px; max-width:100%; background:#fff; border:1px solid #E6EBF3; border-radius:18px; box-shadow:0 26px 60px rgba(6,14,40,.34); overflow:hidden; display:flex; flex-direction:column; ${narrow ? 'max-height:calc(100vh - 120px);' : 'max-height:70vh;'}`)}
    >
      <div style={css('flex:none; display:flex; align-items:center; justify-content:space-between; padding:16px 18px; border-bottom:1px solid #EEF1F7;')}>
        <span style={css('font-size:15px; font-weight:800; color:#0F172A;')}>{t('Thông báo')}</span>
        <button
          onClick={() => setReadAll(true)}
          style={css('border:none; background:transparent; cursor:pointer; font-size:12.5px; font-weight:700; color:#3366F0; padding:0;')}
        >
          {t('Đánh dấu đã đọc tất cả')}
        </button>
      </div>
      <div style={css('flex:1; overflow-y:auto;')}>
        {notifications.map((n, i) => (
          <a
            key={i}
            href={n.href}
            onClick={(e) => {
              e.preventDefault()
              setOpen(false)
              if (n.onOpen) n.onOpen()
              else navigate(n.href)
            }}
            style={css(
              `display:flex; gap:12px; padding:14px 18px; border-bottom:1px solid #F3F5FA; background:${n.unread && !readAll ? '#F6F9FF' : '#fff'}; text-decoration:none; cursor:pointer;`,
            )}
          >
            <span
              style={css(
                `flex:none; width:34px; height:34px; border-radius:11px; background:${n.iconBg}; color:${n.iconFg}; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800;`,
              )}
            >
              {n.iconText}
            </span>
            <div style={css('flex:1; min-width:0;')}>
              <div style={css('font-size:13.5px; font-weight:600; line-height:1.5; color:#0F172A;')}>{n.text}</div>
              <div style={css('display:flex; align-items:center; gap:8px; margin-top:5px;')}>
                <span style={css('font-size:12px; color:#94a3b8;')}>{n.time}</span>
                {n.hasTeams && (
                  <span style={css(`display:inline-flex; align-items:center; gap:5px; height:20px; padding:0 8px; border-radius:999px; background:${n.teamsBg}; color:${n.teamsFg}; font-size:10.5px; font-weight:700;`)}>{n.teamsLabel}</span>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )

  return (
    <div style={css('position:relative;')} ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (!open && ref.current) {
            const r = ref.current.getBoundingClientRect()
            const PANEL_W = 380
            // Open to the right when there's room (Sidebar's bell, near the left edge);
            // otherwise flip to the left of the trigger (TopNav's bell, near the right edge).
            const left = r.right + 12 + PANEL_W <= window.innerWidth
              ? r.right + 12
              : Math.max(12, r.left - 12 - PANEL_W)
            setCoords({ top: r.top, left })
          }
          setOpen((o) => !o)
        }}
        style={buttonStyle}
        title={t('Thông báo')}
      >
        <span style={css('position:relative; display:flex;')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
          <span
            style={css(
              `position:absolute; top:-6px; right:-8px; min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:#FF3B30; color:#fff; font-size:10.5px; font-weight:800; display:${unread ? 'flex' : 'none'}; align-items:center; justify-content:center; border:2px solid #04060d;`,
            )}
          >
            {unread}
          </span>
        </span>
      </button>
      {open && narrow && createPortal(
        <div
          onClick={() => setOpen(false)}
          style={css('position:fixed; inset:0; z-index:2100; background:rgba(4,6,13,.5); backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px); display:flex; align-items:flex-start; justify-content:center; padding:80px 16px;')}
        >
          {panel}
        </div>,
        document.body,
      )}
      {open && !narrow && createPortal(
        <div style={css(`position:fixed; top:${coords.top}px; left:${coords.left}px; z-index:2100;`)} onClick={(e) => e.stopPropagation()}>
          {panel}
        </div>,
        document.body,
      )}
    </div>
  )
}
