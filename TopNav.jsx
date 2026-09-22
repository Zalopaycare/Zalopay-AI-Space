import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { defaultNotifications } from '../data/notifications.js'

const NAV_ITEMS = [
  { label: 'Trang chủ', to: '/', match: (p) => p === '/' },
  { label: 'Use Case', to: '/use-cases', match: (p) => p.startsWith('/use-cases') },
  { label: 'Câu hỏi', to: '/questions', match: (p) => p.startsWith('/questions') },
]

const navItemBase = 'font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;padding:6px 2px;transition:color .15s;background:none;border:none;text-decoration:none;'

function NotifBell({ notifications = defaultNotifications }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [readAll, setReadAll] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  const unread = readAll ? 0 : notifications.filter((n) => n.unread).length

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        style={css(
          `display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; background:${open ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.05)'}; border:1px solid rgba(255,255,255,.18); cursor:pointer; padding:0;`,
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dbe6ff" strokeWidth="2.2">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
        </svg>
        <span
          style={css(
            `position:absolute; top:-2px; right:-2px; min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:#FF3B30; color:#fff; font-size:10.5px; font-weight:800; display:${unread ? 'flex' : 'none'}; align-items:center; justify-content:center; border:2px solid #0a1129;`,
          )}
        >
          {unread}
        </span>
      </button>
      {open && (
        <div
          style={css(
            'position:absolute; right:0; top:52px; width:380px; background:#fff; border:1px solid #E6EBF3; border-radius:18px; box-shadow:0 26px 60px rgba(6,14,40,.34); overflow:hidden; z-index:900;',
          )}
        >
          <div style={css('display:flex; align-items:center; justify-content:space-between; padding:16px 18px; border-bottom:1px solid #EEF1F7;')}>
            <span style={css('font-size:15px; font-weight:800; color:#0F172A;')}>{t('Thông báo')}</span>
            <button
              onClick={() => setReadAll(true)}
              style={css('border:none; background:transparent; cursor:pointer; font-size:12.5px; font-weight:700; color:#3366F0; padding:0;')}
            >
              {t('Đánh dấu đã đọc tất cả')}
            </button>
          </div>
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
      )}
    </div>
  )
}

function LangPill() {
  const { lang, setLang } = useI18n()
  return (
    <div
      style={css(
        'order:-1;display:flex;align-items:center;gap:2px;padding:3px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);',
      )}
    >
      <button
        onClick={() => setLang('vi')}
        style={css(
          `height:28px;padding:0 11px;border:none;border-radius:999px;background:${lang === 'vi' ? '#ffffff' : 'transparent'};color:${lang === 'vi' ? '#0e2f8a' : '#c3d0f5'};font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;`,
        )}
      >
        VI
      </button>
      <button
        onClick={() => setLang('en')}
        style={css(
          `height:28px;padding:0 11px;border:none;border-radius:999px;background:${lang === 'en' ? '#ffffff' : 'transparent'};color:${lang === 'en' ? '#0e2f8a' : '#c3d0f5'};font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;`,
        )}
      >
        EN
      </button>
    </div>
  )
}

/** The shared top bar: wordmark, nav, notifications, language switch, profile chip. */
export default function TopNav({ notifications }) {
  const location = useLocation()
  const { t } = useI18n()

  return (
    <div style={css('position:relative; z-index:5; max-width:1440px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; padding:22px 40px;')}>
      <Link to="/" style={css('display:flex; align-items:center; gap:11px; font-family:"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; text-decoration:none;')}>
        <span style={css('font-size:24px; font-weight:800; letter-spacing:-.5px; color:#fff;')}>Zalopay</span>
        <span style={css('width:1px; height:22px; background:rgba(255,255,255,.35);')}></span>
        <span style={css('font-size:15px; font-weight:600; color:#dbe6ff;')}>AI Community</span>
        <span style={css('font-size:11px; font-weight:700; padding:2px 9px; border-radius:20px; background:rgba(255,255,255,.16); color:#dbe6ff;')}>Beta</span>
      </Link>
      <nav style={css('display:flex; align-items:center; gap:34px;')}>
        {NAV_ITEMS.map((item) => {
          const active = item.match(location.pathname)
          return (
            <Link
              key={item.to}
              to={item.to}
              style={css(navItemBase + (active ? 'color:#fff;border-bottom:2px solid #fff;' : 'color:#c3d0f5;border-bottom:2px solid transparent;'))}
            >
              {t(item.label)}
            </Link>
          )
        })}
      </nav>
      <div style={css('display:flex; align-items:center; gap:12px;')}>
        <NotifBell notifications={notifications} />
        <LangPill />
        <Link to="/profile" style={css('text-decoration:none;')}>
          <div className={hoverClass('background:rgba(255,255,255,.1);')} style={css('display:flex; align-items:center; gap:11px; padding:5px 15px 5px 5px; border-radius:999px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.18); cursor:pointer;')}>
            <div style={css('width:36px; height:36px; border-radius:50%; background:#fff; color:#0e2f8a; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px;')}>NT</div>
            <span style={css('font-family:inherit; font-size:15px; font-weight:600; color:#fff; white-space:nowrap;')}>Nguyễn Thảo</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c3d0f5" strokeWidth="2.2"><path d="m6 9 6 6 6-6"></path></svg>
          </div>
        </Link>
      </div>
    </div>
  )
}
