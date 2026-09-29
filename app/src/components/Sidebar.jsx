import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import SoftLink from './SoftLink.jsx'
import { useLocation } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed.js'
import { useNotifications } from '../lib/notifications.js'
import { useAuth } from '../auth/AuthContext.jsx'
import Avatar from './Avatar.jsx'
import logo from '../assets/zalopay-ai-space-logo.png'

const itemBase = 'display:flex; align-items:center; gap:12px; height:40px; padding:0 12px; border-radius:12px; text-decoration:none; font-size:14px; cursor:pointer; text-align:left; font-family:inherit; width:100%; box-sizing:border-box; transition:background .15s, border-color .15s, box-shadow .15s, color .15s;'
const subItemBase = 'display:flex; align-items:center; gap:12px; height:38px; padding:0 12px; border-radius:12px; text-decoration:none; font-size:13.5px; box-sizing:border-box; transition:background .15s, border-color .15s, box-shadow .15s, color .15s;'
// Blue glass pill: soft glow on hover, stronger when it's the current page.
// !important: the item's own inline style would otherwise win over :hover.
const HOVER = 'background:linear-gradient(90deg,rgba(60,110,255,.30),rgba(60,110,255,.12)) !important; border-color:rgba(130,175,255,.55) !important; color:#dbe8ff !important; box-shadow:0 0 18px rgba(44,95,255,.28), inset 0 0 12px rgba(120,165,255,.10) !important;'
const itemState = (active) => (active
  ? 'background:linear-gradient(90deg,rgba(60,110,255,.30),rgba(60,110,255,.12)); border:1px solid rgba(130,175,255,.55); color:#dbe8ff; font-weight:700; box-shadow:0 0 18px rgba(44,95,255,.28), inset 0 0 12px rgba(120,165,255,.10);'
  : 'background:transparent; border:1px solid transparent; color:#b4c3e8; font-weight:500;')

function NavLink({ to, active, icon, children, collapsed, title }) {
  return (
    <SoftLink
      to={to}
      title={collapsed ? title : undefined}
      className={active ? undefined : hoverClass(HOVER)}
      style={css(itemBase + itemState(active) + (collapsed ? 'justify-content:center; padding:0;' : ''))}
    >
      {icon}{!collapsed && children}
    </SoftLink>
  )
}

function SubLink({ to, active, icon, children }) {
  return (
    <SoftLink
      to={to}
      className={active ? undefined : hoverClass(HOVER)}
      style={css(subItemBase + itemState(active))}
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
  const popRef = useRef(null)
  const [menuPos, setMenuPos] = useState(null) // { left, bottom } of the popup, from the chip's position
  useEffect(() => {
    if (!menuOpen) return
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target) && !(popRef.current && popRef.current.contains(e.target))) setMenuOpen(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])
  useEffect(() => { setHash(location.hash) }, [location.hash])

  const sub = active === 'profile' ? /#(activity|usecase|question|saved)\b/.exec(hash)?.[1] || 'activity' : null
  const { unread: unreadCount } = useNotifications(!!user)
  const homeActive = active === 'home'

  return (
    <div style={css(`view-transition-name:zp-sidebar; position:fixed; left:0; top:0; bottom:0; width:${collapsed ? 68 : 224}px; z-index:2000; display:flex; flex-direction:column; padding:${collapsed ? '18px 9px 16px' : '18px 12px 16px'}; background:radial-gradient(120% 45% at 0% 0%, rgba(70,120,255,.30), transparent 70%), radial-gradient(90% 35% at 100% 100%, rgba(60,110,255,.16), transparent 70%), linear-gradient(180deg, rgba(16,32,92,.72) 0%, rgba(9,16,46,.80) 50%, rgba(5,9,26,.88) 100%); backdrop-filter:blur(18px) saturate(140%); -webkit-backdrop-filter:blur(18px) saturate(140%); border-right:1px solid rgba(130,170,255,.16); box-shadow:1px 0 24px rgba(20,50,160,.18); color:#e8eefc; font-family:inherit; overflow-y:auto; overflow-x:hidden; transition:width .16s ease;`)}>
      <div style={css(`display:flex; align-items:center; gap:8px; margin-bottom:22px; ${collapsed ? 'justify-content:center;' : 'padding:4px 10px 0;'}`)}>
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
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"></path></svg>
        }>Home</NavLink>
      </nav>

      <div style={css('display:flex; flex-direction:column; gap:2px; margin-top:22px;')}>
        <NavLink to="/use-cases?share=1" collapsed={collapsed} title={t('Chia sẻ use case')} icon={
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
        }>{t('Chia sẻ use case')}</NavLink>
        <NavLink to="/questions#ask" collapsed={collapsed} title={t('Đặt câu hỏi')} icon={
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.1 9a3 3 0 1 1 4.5 2.6c-.9.5-1.6 1.2-1.6 2.4"></path><path d="M12 18h.01"></path><circle cx="12" cy="12" r="9.5"></circle></svg>
        }>{t('Đặt câu hỏi')}</NavLink>
      </div>


      {collapsed && (
        <div style={css('display:flex; flex-direction:column; gap:2px; margin-top:22px;')}>
          <NavLink to="/profile#activity" active={sub === 'activity'} collapsed title={t('Thông báo & hoạt động')} icon={
            <span style={css('position:relative; display:inline-flex;')}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
              <span style={css(`position:absolute; top:-6px; right:-8px; min-width:16px; height:16px; padding:0 4px; border-radius:999px; background:${unreadCount ? '#FF3B30' : '#475569'}; color:#fff; font-size:9.5px; font-weight:800; display:flex; align-items:center; justify-content:center;`)}>{unreadCount}</span>
            </span>
          }>{t('Thông báo & hoạt động')}</NavLink>
        </div>
      )}

      {!collapsed && (
        <>
          <div style={css('display:flex; align-items:center; padding:0 12px; margin-top:26px; margin-bottom:6px; font-size:11.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:#8aa0d6;')}>{t('Của tôi')}</div>
          <div style={css('display:flex; flex-direction:column; gap:2px;')}>
            <SubLink to="/profile#activity" active={sub === 'activity'} icon={
              <svg style={{ flex: "none" }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
            }><span style={css('white-space:nowrap;')}>{t('Thông báo')}</span><span style={css(`margin-left:auto; min-width:20px; height:20px; padding:0 6px; border-radius:999px; background:${unreadCount ? '#FF3B30' : 'rgba(255,255,255,.14)'}; color:#fff; font-size:11px; font-weight:800; display:inline-flex; align-items:center; justify-content:center;`)}>{unreadCount}</span></SubLink>
            <SubLink to="/profile#usecase" active={sub === 'usecase'} icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
            }>{t('Use case của tôi')}</SubLink>
            <SubLink to="/profile#question" active={sub === 'question'} icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"></path><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"></path></svg>
            }>{t('Câu hỏi của tôi')}</SubLink>
            <SubLink to="/profile#saved" active={sub === 'saved'} icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            }>{t('Đã lưu')}</SubLink>
          </div>
        </>
      )}

      <div style={{ flex: 1 }}></div>
      {user && (
        <div ref={menuRef} style={css('position:relative; margin-top:16px;')}>
          {menuOpen && menuPos && createPortal(
            // Portalled to <body>: the sidebar clips its overflow, so a popup inside it would be cut off when collapsed.
            <div ref={popRef} style={css(`position:fixed; left:${menuPos.left}px; bottom:${menuPos.bottom}px; width:${menuPos.width}px; background:#fff; border:1px solid #E6EBF3; border-radius:14px; box-shadow:0 20px 46px rgba(0,0,0,.4); padding:6px; z-index:2100;`)}>
              {user.isAdmin && (
                <SoftLink
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className={hoverClass('background:#EEF3FF !important;')}
                  style={css('display:flex; align-items:center; gap:9px; padding:10px 12px; border-radius:10px; text-decoration:none; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#2c5fff; white-space:nowrap;')}
                >
                  <svg style={{ flex: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"></rect><rect x="14" y="3" width="7" height="5" rx="1.5"></rect><rect x="14" y="12" width="7" height="9" rx="1.5"></rect><rect x="3" y="16" width="7" height="5" rx="1.5"></rect></svg>
                  {t('Visit Admin Dashboard')}
                </SoftLink>
              )}
              <button onClick={() => { setMenuOpen(false); logout() }} style={css('display:block; width:100%; text-align:left; padding:10px 12px; border:none; border-radius:10px; background:transparent; cursor:pointer; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#D8232A;')}>{t('Đăng xuất')}</button>
            </div>
            ,document.body,
          )}
          <button
            onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMenuPos({ left: r.left, bottom: window.innerHeight - r.top + 8, width: collapsed ? 220 : r.width }); setMenuOpen((o) => !o) }}
            title={collapsed ? user.name : undefined}
            className={hoverClass('background:rgba(255,255,255,.1);')}
            style={css(`display:flex; align-items:center; gap:10px; width:100%; padding:5px ${collapsed ? '5px' : '10px 5px 5px'}; border-radius:14px; background:rgba(80,130,255,.10); border:1px solid rgba(130,170,255,.22); cursor:pointer; font-family:inherit; ${collapsed ? 'justify-content:center;' : ''}`)}
          >
            <Avatar user={user} size={30} fontSize={11.5} />
            {!collapsed && <span style={css('flex:1; min-width:0; text-align:left; font-size:13px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{user.domain || user.name}</span>}
            {!collapsed && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c3d0f5" strokeWidth="2.2" style={{ flex: 'none' }}><path d="m18 15-6-6-6 6"></path></svg>}
          </button>
        </div>
      )}
    </div>
  )
}
