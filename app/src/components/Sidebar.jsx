import { useEffect, useState } from 'react'
import SoftLink from './SoftLink.jsx'
import { useLocation } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useSidebarLayout } from '../hooks/useSidebarCollapsed.js'
import { useChatUnread } from '../lib/chat.js'
import { useAuth } from '../auth/AuthContext.jsx'

const itemBase = 'display:flex; align-items:center; gap:12px; height:40px; padding:0 12px; border-radius:12px; text-decoration:none; font-size:14px; cursor:pointer; text-align:left; font-family:inherit; width:100%; box-sizing:border-box; transition:background .15s, border-color .15s, box-shadow .15s, color .15s;'
const subItemBase = 'display:flex; align-items:center; gap:12px; height:38px; padding:0 12px; border-radius:12px; text-decoration:none; font-size:13.5px; box-sizing:border-box; transition:background .15s, border-color .15s, box-shadow .15s, color .15s;'
// Light as Threads: no box around the menu, a soft tint on hover, a little more for the current page.
// !important: the item's own inline style would otherwise win over :hover.
const HOVER = 'background:rgba(150,180,255,.08) !important; color:#e8eefc !important;'
const itemState = (active) => (active
  ? 'background:rgba(150,180,255,.13); border:1px solid transparent; color:#fff; font-weight:700;'
  : 'background:transparent; border:1px solid transparent; color:#b4c3e8; font-weight:500;')

// `tour`: the welcome tour's mark for this link (WelcomeTour.jsx points at it)
function NavLink({ to, active, icon, children, collapsed, title, tour }) {
  return (
    <SoftLink
      to={to}
      data-tour={tour}
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
  // Drawer mode (< 1024px): always the full-width menu, slid in from the left over a dimmed page.
  const { collapsed: railCollapsed, narrow, mobile, drawerOpen, setDrawerOpen } = useSidebarLayout()
  const collapsed = narrow ? false : railCollapsed
  useEffect(() => { if (narrow) setDrawerOpen(false) }, [location.pathname, location.hash]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen]) // eslint-disable-line react-hooks/exhaustive-deps
  const { user } = useAuth()
  useEffect(() => { setHash(location.hash) }, [location.hash])

  // #usecase is part of the profile page, so it lights up "Hồ sơ"; #event (and the old #question) "Sự kiện của tôi".
  const sub = active === 'profile' ? ({ usecase: 'overview', question: 'event' }[/#(overview|activity|usecase|question|event|saved)\b/.exec(hash)?.[1]] || /#(activity|event|saved)\b/.exec(hash)?.[1] || 'overview') : null
  // unread admin replies in my "Chat với Admin" (admins answer others from the Admin Console)
  const chatCount = useChatUnread(!!user).mine

  return (
    <>
    {drawerOpen && <div onClick={() => setDrawerOpen(false)} aria-hidden="true" style={css('position:fixed; inset:58px 0 0 0; z-index:1990; background:rgba(2,6,20,.6); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px);')}></div>}
    <aside
      id="zp-sidebar"
      aria-label={t('Menu chính')}
      aria-hidden={narrow && !drawerOpen ? true : undefined}
      inert={narrow && !drawerOpen ? true : undefined}
      style={css(`view-transition-name:zp-sidebar; position:fixed; left:0; top:58px; bottom:0; width:${narrow ? 260 : collapsed ? 68 : 224}px; z-index:2000; ${narrow ? `transform:translateX(${drawerOpen ? 0 : -105}%); transition:transform .22s ease; box-shadow:${drawerOpen ? '12px 0 40px rgba(0,0,0,.5)' : 'none'};` : ''} display:flex; flex-direction:column; padding:${collapsed ? '16px 9px 16px' : '16px 12px 16px'}; ${narrow ? "background:radial-gradient(120% 45% at 0% 0%, rgba(70,120,255,.30), transparent 70%), radial-gradient(90% 35% at 100% 100%, rgba(60,110,255,.16), transparent 70%), linear-gradient(180deg, rgba(16,32,92,.72) 0%, rgba(9,16,46,.80) 50%, rgba(5,9,26,.88) 100%); backdrop-filter:blur(18px) saturate(140%); -webkit-backdrop-filter:blur(18px) saturate(140%); border-right:1px solid rgba(130,170,255,.16); box-shadow:1px 0 24px rgba(20,50,160,.18);" : 'background:transparent;'} color:#e8eefc; font-family:inherit; overflow-y:auto; overflow-x:hidden; transition:width .16s ease;`)}>
      {/* AI Space and Use Case Library are in the top bar; on a phone, where that bar has no tabs, they're here */}
      {mobile && (
        <nav style={css('display:flex; flex-direction:column; gap:2px; margin-bottom:22px;')}>
          <NavLink to="/" active={active === 'question'} collapsed={false} title={t('AI Space')} icon={
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M7 8h10"></path><path d="M7 12h6"></path></svg>
          }>{t('AI Space')}</NavLink>
          <NavLink to="/use-cases" active={active === 'usecase'} collapsed={false} title={t('Use Case Library')} icon={
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></svg>
          }>{t('Use Case Library')}</NavLink>
        </nav>
      )}

      <div style={css('display:flex; flex-direction:column; gap:2px;')}>
        <NavLink to="/?new=event" tour="post" collapsed={collapsed} title={t('Tạo sự kiện')} icon={
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4"></path></svg>
        }>{t('Tạo sự kiện')}</NavLink>
        <NavLink to="/use-cases?share=1" tour="share" collapsed={collapsed} title={t('Chia sẻ use case')} icon={
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
        }>{t('Chia sẻ use case')}</NavLink>
        <NavLink to="/chat" tour="chat" active={active === 'chat'} collapsed={collapsed} title={t('Chat với Admin')} icon={
          <span style={css('position:relative; display:inline-flex; flex:none;')}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path><path d="M8 12h.01M12 12h.01M16 12h.01"></path></svg>
            {collapsed && chatCount > 0 && <span style={css('position:absolute; top:-6px; right:-8px; min-width:16px; height:16px; padding:0 4px; border-radius:999px; background:#FF3B30; color:#fff; font-size:9.5px; font-weight:800; display:flex; align-items:center; justify-content:center;')}>{chatCount}</span>}
          </span>
        }>
          <span style={css('flex:1; min-width:0;')}>{t('Chat với Admin')}</span>
          {chatCount > 0 && <span style={css('flex:none; min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:#FF3B30; color:#fff; font-size:10.5px; font-weight:800; display:flex; align-items:center; justify-content:center;')}>{chatCount}</span>}
        </NavLink>
      </div>


      {collapsed && (
        <div style={css('display:flex; flex-direction:column; gap:2px; margin-top:22px;')}>
          <NavLink to="/profile" active={sub === 'overview'} collapsed title={t('Hồ sơ')} icon={<svg style={{ flex: "none" }} width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>}>{t('Hồ sơ')}</NavLink>
        </div>
      )}

      {!collapsed && (
        <>
          <div style={css('display:flex; align-items:center; padding:0 12px; margin-top:26px; margin-bottom:6px; font-size:11.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:#8aa0d6;')}>{t('Của tôi')}</div>
          <div data-tour="mine" style={css('display:flex; flex-direction:column; gap:2px;')}>
            <SubLink to="/profile" active={sub === 'overview'} icon={
              <svg style={{ flex: "none" }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>
            }>{t('Hồ sơ')}</SubLink>
            <SubLink to="/profile#event" active={sub === 'event'} icon={
              <svg style={{ flex: "none" }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>
            }>{t('Sự kiện của tôi')}</SubLink>
            <SubLink to="/profile#saved" active={sub === 'saved'} icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            }>{t('Đã lưu')}</SubLink>
          </div>
        </>
      )}

      <div style={{ flex: 1 }}></div>
    </aside>
    </>
  )
}
