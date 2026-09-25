import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'

const NAV_ITEMS = [
  { label: 'Trang chủ', to: '/', match: (p) => p === '/' },
  { label: 'Use Case', to: '/use-cases', match: (p) => p.startsWith('/use-cases') },
  { label: 'Câu hỏi', to: '/questions', match: (p) => p.startsWith('/questions') },
]

const navItemBase = 'font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;padding:6px 2px;transition:color .15s;background:none;border:none;text-decoration:none;white-space:nowrap;'

function LangPill() {
  const { lang, setLang } = useI18n()
  return (
    <div
      style={css(
        'display:flex;align-items:center;gap:2px;padding:3px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);',
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

/** The thin top bar (offset by the 260px sidebar): page nav, language switch, profile chip. */
export default function TopNav() {
  const location = useLocation()
  const { t } = useI18n()
  const { user, openLogin, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => {
    if (!menuOpen) return
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  return (
    <div style={css('position:fixed; top:0; left:260px; right:0; height:72px; z-index:1900; display:flex; align-items:center; padding:0 32px; background:rgba(4,6,13,.86); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border-bottom:1px solid rgba(255,255,255,.08); font-family:inherit;')}>
      <div style={{ flex: 1 }}></div>
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
      <div style={css('flex:1; display:flex; align-items:center; justify-content:flex-end; gap:12px;')}>
        <LangPill />
        {user ? (
          <div style={{ position: 'relative' }} ref={menuRef}>
            <div
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
              className={hoverClass('background:rgba(255,255,255,.1);')}
              style={css('display:flex; align-items:center; gap:10px; padding:4px 14px 4px 4px; border-radius:999px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.18); cursor:pointer;')}
            >
              <div style={css('width:34px; height:34px; border-radius:50%; background:#fff; color:#0e2f8a; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12.5px;')}>{user.initials}</div>
              <span style={css('font-family:inherit; font-size:14.5px; font-weight:600; color:#fff; white-space:nowrap;')}>{user.name}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c3d0f5" strokeWidth="2.2"><path d="m6 9 6 6 6-6"></path></svg>
            </div>
            {menuOpen && (
              <div style={css('position:absolute; right:0; top:50px; width:200px; background:#fff; border:1px solid #E6EBF3; border-radius:16px; box-shadow:0 26px 60px rgba(6,14,40,.34); overflow:hidden; z-index:900; padding:6px;')}>
                <Link to="/profile" onClick={() => setMenuOpen(false)} style={css('display:block; padding:10px 12px; border-radius:10px; text-decoration:none; font:600 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{t('Hồ sơ của tôi')}</Link>
                <button onClick={() => { setMenuOpen(false); logout() }} style={css('display:block; width:100%; text-align:left; padding:10px 12px; border:none; background:none; cursor:pointer; border-radius:10px; font:600 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#D8232A;')}>{t('Đăng xuất')}</button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => openLogin()}
            style={css('display:inline-flex; align-items:center; gap:8px; height:40px; padding:0 18px; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; border:none; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;')}
          >
            {t('Đăng nhập')}
          </button>
        )}
      </div>
    </div>
  )
}
