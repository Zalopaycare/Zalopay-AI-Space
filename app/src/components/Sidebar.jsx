import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import NotificationsPanel from './NotificationsPanel.jsx'

const itemBase = 'display:flex; align-items:center; gap:14px; height:46px; padding:0 12px; border-radius:12px; text-decoration:none; font-size:15.5px; cursor:pointer; border:none; text-align:left; font-family:inherit; width:100%;'
const subItemBase = 'display:flex; align-items:center; gap:14px; height:42px; padding:0 12px; border-radius:12px; text-decoration:none; font-size:14.5px;'

function NavLink({ to, active, icon, children }) {
  return (
    <Link
      to={to}
      className={hoverClass('background:rgba(255,255,255,.07); color:#fff;')}
      style={css(itemBase + `background:${active ? 'rgba(255,255,255,.09)' : 'transparent'}; color:${active ? '#ffffff' : '#c3d0f5'}; font-weight:${active ? 700 : 500};`)}
    >
      {icon}{children}
    </Link>
  )
}

function SubLink({ to, active, icon, children }) {
  return (
    <Link
      to={to}
      className={hoverClass('background:rgba(255,255,255,.07); color:#fff;')}
      style={css(subItemBase + `background:${active ? 'rgba(255,255,255,.09)' : 'transparent'}; color:${active ? '#ffffff' : '#c3d0f5'}; font-weight:${active ? 700 : 500};`)}
    >
      {icon}{children}
    </Link>
  )
}

/**
 * Fixed 260px left navigation, shared by every page. `active` picks which top-level
 * item is highlighted ('home' | 'usecase' | 'question' | 'profile' | none); on the
 * Profile page the sub-link matching location.hash is highlighted instead.
 */
export default function Sidebar({ active, notifications }) {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const location = useLocation()
  const [hash, setHash] = useState(location.hash)
  useEffect(() => { setHash(location.hash) }, [location.hash])

  const sub = active === 'profile' ? /#(usecase|question|saved)\b/.exec(hash)?.[1] || null : null
  const homeActive = active === 'home'
  const profileActive = active === 'profile' && !sub

  return (
    <div style={css('position:fixed; left:0; top:0; bottom:0; width:260px; z-index:2000; display:flex; flex-direction:column; padding:22px 14px 18px; background:#04060d; border-right:1px solid rgba(255,255,255,.08); color:#e8eefc; font-family:inherit; overflow-y:auto;')}>
      <Link to="/" style={css('display:flex; align-items:center; gap:10px; padding:4px 12px 0; margin-bottom:28px; text-decoration:none;')}>
        <span style={css('font-size:17px; font-weight:800; letter-spacing:-.3px; color:#fff; white-space:nowrap;')}>Zalopay AI Space</span>
        <span style={css('font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:20px; background:rgba(255,255,255,.16); color:#dbe6ff;')}>Beta</span>
      </Link>

      <nav style={css('display:flex; flex-direction:column; gap:2px;')}>
        <NavLink to="/" active={homeActive} icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"></path></svg>
        }>{t('Trang chủ')}</NavLink>
      </nav>

      <div style={css('display:flex; flex-direction:column; gap:2px; margin-top:22px;')}>
        <NavLink to="/use-cases?share=1" icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
        }>{t('Chia sẻ use case')}</NavLink>
        <NavLink to="/questions#ask" icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.1 9a3 3 0 1 1 4.5 2.6c-.9.5-1.6 1.2-1.6 2.4"></path><path d="M12 18h.01"></path><circle cx="12" cy="12" r="9.5"></circle></svg>
        }>{t('Đặt câu hỏi')}</NavLink>
        <NavLink to="/use-cases#search" icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
        }>{t('Tìm kiếm')}</NavLink>
      </div>

      <div style={css('display:flex; flex-direction:column; gap:2px; margin-top:22px;')}>
        <NotificationsPanel
          notifications={notifications}
          buttonStyle={css(itemBase + 'background:transparent; color:#c3d0f5;')}
          panelStyle="left:100%; top:0; margin-left:12px;"
        />
        <NavLink to="/profile" active={profileActive} icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4.5"></circle><path d="M20 21a8 8 0 0 0-16 0"></path></svg>
        }>{t('Hồ sơ')}</NavLink>
      </div>

      <div style={css('display:flex; align-items:center; padding:0 12px; margin-top:26px; margin-bottom:6px; font-size:12.5px; font-weight:700; color:#7d8aa8;')}>{t('Của tôi')}</div>
      <div style={css('display:flex; flex-direction:column; gap:2px;')}>
        <SubLink to="/profile#usecase" active={sub === 'usecase'} icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
        }>{t('Use case của tôi')}</SubLink>
        <SubLink to="/profile#question" active={sub === 'question'} icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"></path><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"></path></svg>
        }>{t('Câu hỏi của tôi')}</SubLink>
        <SubLink to="/profile#saved" active={sub === 'saved'} icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
        }>{t('Đã lưu')}</SubLink>
      </div>

      <div style={{ flex: 1 }}></div>

      {user ? (
        <div style={css('position:relative;')}>
          <Link
            to="/profile"
            className={hoverClass('background:rgba(255,255,255,.09);')}
            style={css('display:flex; align-items:center; gap:11px; padding:8px 10px; border-radius:14px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); text-decoration:none;')}
          >
            <span style={css('flex:none; width:36px; height:36px; border-radius:50%; background:#fff; color:#0e2f8a; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px;')}>{user.initials}</span>
            <span style={css('display:flex; flex-direction:column; min-width:0;')}>
              <span style={css('font-size:14px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{user.name}</span>
            </span>
          </Link>
          <button
            onClick={logout}
            style={css('margin-top:6px; width:100%; border:none; background:transparent; cursor:pointer; padding:6px 10px; font:600 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#93a2c7; text-align:left;')}
          >
            {t('Đăng xuất')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
