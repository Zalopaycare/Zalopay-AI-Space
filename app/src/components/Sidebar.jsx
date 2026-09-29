import { useEffect, useRef, useState } from 'react'
import SoftLink from './SoftLink.jsx'
import { useLocation } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed.js'
import { useNotifications } from '../lib/notifications.js'
import { useAuth } from '../auth/AuthContext.jsx'
import Avatar from './Avatar.jsx'
import logo from '../assets/zalopay-ai-space-logo.png'

const itemBase = 'display:flex; align-items:center; gap:14px; height:46px; padding:0 12px; border-radius:12px; text-decoration:none; font-size:15.5px; cursor:pointer; border:none; text-align:left; font-family:inherit; width:100%;'
const subItemBase = 'display:flex; align-items:center; gap:14px; height:42px; padding:0 12px; border-radius:12px; text-decoration:none; font-size:14.5px;'

function NavLink({ to, active, icon, children, collapsed, title }) {
  return (
    <SoftLink
      to={to}
      title={collapsed ? title : undefined}
      className={hoverClass('background:rgba(255,255,255,.07); color:#fff;')}
      style={css(itemBase + `background:${active ? 'rgba(255,255,255,.09)' : 'transparent'}; color:${active ? '#ffffff' : '#c3d0f5'}; font-weight:${active ? 700 : 500}; ${collapsed ? 'justify-content:center; padding:0;' : ''}`)}
    >
      {icon}{!collapsed && children}
    </SoftLink>
  )
}

function SubLink({ to, active, icon, children }) {
  return (
    <SoftLink
      to={to}
      className={hoverClass('background:rgba(255,255,255,.07); color:#fff;')}
      style={css(subItemBase + `background:${active ? 'rgba(255,255,255,.09)' : 'transparent'}; color:${active ? '#ffffff' : '#c3d0f5'}; font-weight:${active ? 700 : 500};`)}
    >
      {icon}{children}
    </SoftLink>
  )
}

/**
 * Fixed left navigation, shared by every page. `active` picks which top-level item is
 * highlighted ('home' | 'usecase' | 'question' | 'profile' | none); on the Profile page
 * the sub-link matching location.hash is highlighted instead. Collapses to a narrow
 * icon-only rail (toggle at the top) — state is shared with Layout/TopNav via
 * useSidebarCollapsed so they can offset around whichever width is current.
 */
export default function Sidebar({ active }) {
  const { t } = useI18n()
  const location = useLocation()
  const [hash, setHash] = useState(location.hash)
  const [collapsed, setCollapsed] = useSidebarCollapsed()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => {
    if (!menuOpen) return
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])
  useEffect(() => { setHash(location.hash) }, [location.hash])

  const sub = active === 'profile' ? /#(activity|usecase|question|saved)\b/.exec(hash)?.[1] || 'activity' : null
  const { unread: unreadCount } = useNotifications(!!user)
  const homeActive = active === 'home'

  return (
    <div style={css(`view-transition-name:zp-sidebar; position:fixed; left:0; top:0; bottom:0; width:${collapsed ? 76 : 260}px; z-index:2000; display:flex; flex-direction:column; padding:${collapsed ? '22px 10px 18px' : '22px 14px 18px'}; background:#04060d; border-right:1px solid rgba(255,255,255,.08); color:#e8eefc; font-family:inherit; overflow-y:auto; overflow-x:hidden; transition:width .16s ease;`)}>
      <div style={css(`display:flex; align-items:center; gap:8px; margin-bottom:28px; ${collapsed ? 'justify-content:center;' : 'padding:4px 12px 0;'}`)}>
        {!collapsed && (
          <SoftLink to="/" style={css('display:flex; align-items:center; gap:10px; text-decoration:none; flex:1; min-width:0;')}>
            <img src={logo} alt="Zalopay AI Space" style={{ height: 14, width: 'auto', display: 'block' }} />
          </SoftLink>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? t('Mở rộng menu') : t('Thu gọn menu')}
          className={hoverClass('background:rgba(255,255,255,.09); color:#fff;')}
          style={css('flex:none; width:34px; height:34px; border:none; border-radius:10px; background:transparent; color:#8b98b8; cursor:pointer; display:flex; align-items:center; justify-content:center;')}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"></rect><path d="M9.5 4v16"></path></svg>
        </button>
      </div>

      <nav style={css('display:flex; flex-direction:column; gap:2px;')}>
        <NavLink to="/" active={homeActive} collapsed={collapsed} title='Home' icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"></path></svg>
        }>Home</NavLink>
      </nav>

      <div style={css('display:flex; flex-direction:column; gap:2px; margin-top:22px;')}>
        <NavLink to="/use-cases?share=1" collapsed={collapsed} title={t('Chia sẻ use case')} icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
        }>{t('Chia sẻ use case')}</NavLink>
        <NavLink to="/questions#ask" collapsed={collapsed} title={t('Đặt câu hỏi')} icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.1 9a3 3 0 1 1 4.5 2.6c-.9.5-1.6 1.2-1.6 2.4"></path><path d="M12 18h.01"></path><circle cx="12" cy="12" r="9.5"></circle></svg>
        }>{t('Đặt câu hỏi')}</NavLink>
      </div>


      {collapsed && (
        <div style={css('display:flex; flex-direction:column; gap:2px; margin-top:22px;')}>
          <NavLink to="/profile#activity" active={sub === 'activity'} collapsed title={t('Thông báo & hoạt động')} icon={
            <span style={css('position:relative; display:inline-flex;')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
              <span style={css(`position:absolute; top:-6px; right:-8px; min-width:16px; height:16px; padding:0 4px; border-radius:999px; background:${unreadCount ? '#FF3B30' : '#475569'}; color:#fff; font-size:9.5px; font-weight:800; display:flex; align-items:center; justify-content:center;`)}>{unreadCount}</span>
            </span>
          }>{t('Thông báo & hoạt động')}</NavLink>
        </div>
      )}

      {!collapsed && (
        <>
          <div style={css('display:flex; align-items:center; padding:0 12px; margin-top:26px; margin-bottom:6px; font-size:12.5px; font-weight:700; color:#7d8aa8;')}>{t('Của tôi')}</div>
          <div style={css('display:flex; flex-direction:column; gap:2px;')}>
            <SubLink to="/profile#activity" active={sub === 'activity'} icon={
              <svg style={{ flex: "none" }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
            }><span style={css('white-space:nowrap;')}>{t('Thông báo')}</span><span style={css(`margin-left:auto; min-width:20px; height:20px; padding:0 6px; border-radius:999px; background:${unreadCount ? '#FF3B30' : 'rgba(255,255,255,.14)'}; color:#fff; font-size:11px; font-weight:800; display:inline-flex; align-items:center; justify-content:center;`)}>{unreadCount}</span></SubLink>
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
        </>
      )}

      <div style={{ flex: 1 }}></div>
      {user && (
        <div ref={menuRef} style={css('position:relative; margin-top:16px;')}>
          {menuOpen && (
            <div style={css('position:absolute; left:0; right:0; bottom:calc(100% + 8px); background:#fff; border:1px solid #E6EBF3; border-radius:14px; box-shadow:0 20px 46px rgba(0,0,0,.4); padding:6px; z-index:5;')}>
              <button onClick={() => { setMenuOpen(false); logout() }} style={css('display:block; width:100%; text-align:left; padding:10px 12px; border:none; border-radius:10px; background:transparent; cursor:pointer; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#D8232A;')}>{t('Đăng xuất')}</button>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
            title={collapsed ? user.name : undefined}
            className={hoverClass('background:rgba(255,255,255,.1);')}
            style={css(`display:flex; align-items:center; gap:10px; width:100%; padding:6px ${collapsed ? '6px' : '12px 6px 6px'}; border-radius:14px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); cursor:pointer; font-family:inherit; ${collapsed ? 'justify-content:center;' : ''}`)}
          >
            <Avatar user={user} size={34} fontSize={12.5} />
            {!collapsed && <span style={css('flex:1; min-width:0; text-align:left; font-size:14px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{user.name}</span>}
            {!collapsed && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c3d0f5" strokeWidth="2.2" style={{ flex: 'none' }}><path d="m18 15-6-6-6 6"></path></svg>}
          </button>
        </div>
      )}
    </div>
  )
}
