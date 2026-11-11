import { useLocation } from 'react-router-dom'
import SoftLink from './SoftLink.jsx'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useSidebarLayout } from '../hooks/useSidebarCollapsed.js'
import logo from '../assets/zalopay-ai-space-logo.png'
import { GRAY, setGrayTheme } from '../lib/theme.js'

const NAV_ITEMS = [
  { label: 'AI Space', to: '/', match: (p) => p === '/' || p.startsWith('/questions') },
  { label: 'Use Case Library', to: '/use-cases', match: (p) => p.startsWith('/use-cases') },
]

const navItemBase = 'font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;padding:6px 14px;border-radius:999px;transition:color .15s, background .15s, box-shadow .15s;border:1px solid transparent;text-decoration:none;white-space:nowrap;'

/** Full-width top bar above the (collapsible) sidebar: menu toggle + logo pinned left, page nav centred,
 *  login button right when signed out. The profile chip lives at the bottom of the Sidebar. */
export default function TopNav() {
  const location = useLocation()
  const { t } = useI18n()
  const { user, openLogin } = useAuth()
  const { narrow, mobile, drawerOpen, setDrawerOpen } = useSidebarLayout()
  const menuLabel = drawerOpen ? t('Đóng menu') : t('Mở menu')

  return (
    <div style={css(`view-transition-name:zp-topnav; position:fixed; top:0; left:0; right:0; height:58px; z-index:2100; display:flex; align-items:center; padding:0 24px 0 16px; background:linear-gradient(90deg, rgba(9,18,58,.86) 0%, rgba(5,9,28,.84) 50%, rgba(9,18,58,.86) 100%); backdrop-filter:blur(16px) saturate(140%); -webkit-backdrop-filter:blur(16px) saturate(140%); border-bottom:1px solid rgba(130,170,255,.12); box-shadow:0 8px 30px rgba(0,0,0,.35); font-family:inherit;`)}>
      <div style={css('flex:1; display:flex; align-items:center; gap:10px; min-width:0;')}>
        {/* the ☰ only opens the drawer on narrow screens; on wide ones the sidebar is always open */}
        {narrow && <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          title={menuLabel}
          aria-label={menuLabel}
          aria-controls="zp-sidebar"
          aria-expanded={drawerOpen}
          className={hoverClass('background:rgba(255,255,255,.09) !important; color:#fff !important;')}
          style={css('flex:none; width:36px; height:36px; border:none; border-radius:10px; background:transparent; color:#b4c3e8; cursor:pointer; display:flex; align-items:center; justify-content:center;')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path></svg>
        </button>}
        <SoftLink to="/" title="Zalopay AI Space" style={css('display:flex; align-items:center; text-decoration:none;')}>
          <img src={logo} alt="Zalopay AI Space" style={{ height: 17, width: 'auto', display: 'block' }} />
        </SoftLink>
      </div>
      {/* Centred on the screen, like the "Về đầu trang" button at the bottom (Layout.jsx). */}
      <nav aria-label={t('Trang chính')} style={css(`position:absolute; left:50%; transform:translateX(-50%); display:${mobile ? 'none' : 'flex'}; align-items:center; gap:6px;`)}>
        {NAV_ITEMS.map((item) => {
          const active = item.match(location.pathname)
          return (
            <SoftLink
              key={item.to}
              to={item.to}
              data-tour={item.to === '/' ? 'nav-home' : 'nav-usecases'}
              className={active ? undefined : hoverClass('color:#fff !important; background:rgba(60,110,255,.22) !important; border-color:rgba(130,175,255,.45) !important; box-shadow:0 0 16px rgba(44,95,255,.28) !important;')}
              style={css(navItemBase + (active ? 'color:#fff; background:rgba(60,110,255,.22); border-color:rgba(130,175,255,.45); box-shadow:0 0 16px rgba(44,95,255,.28);' : 'color:#b4c3e8;'))}
            >
              {t(item.label)}
            </SoftLink>
          )
        })}
      </nav>
      <div style={css('flex:1; display:flex; align-items:center; justify-content:flex-end; gap:12px;')}>
        <CardSwitch t={t} />
        {!user && (
          <button
            onClick={() => openLogin()}
            style={css('display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 16px; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; border:none; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;')}
          >
            {t('Đăng nhập')}
          </button>
        )}
      </div>
    </div>
  )
}

// White or grey cards (lib/theme.js): two sides of one pill, the current one lit.
const SUN = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
const MOON = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>

function CardSwitch({ t }) {
  const side = (on, gray, icon, label) => (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      title={label}
      aria-label={label}
      onClick={() => { if (!on) setGrayTheme(gray) }}
      className={on ? undefined : hoverClass('color:#fff !important;')}
      style={css(`width:30px; height:26px; border:none; border-radius:999px; display:flex; align-items:center; justify-content:center; cursor:${on ? 'default' : 'pointer'}; transition:background .15s, color .15s; ${on ? 'background:rgba(60,110,255,.35); color:#fff; box-shadow:0 0 12px rgba(44,95,255,.3);' : 'background:transparent; color:#8a9bc8;'}`)}
    >{icon}</button>
  )
  return (
    <div role="radiogroup" aria-label={t('Màu khung')} style={css('flex:none; display:flex; align-items:center; gap:2px; padding:2px; border-radius:999px; background:rgba(255,255,255,.05); border:1px solid rgba(130,170,255,.22);')}>
      {side(!GRAY, false, SUN, t('Khung trắng'))}
      {side(GRAY, true, MOON, t('Khung xám (dark mode)'))}
    </div>
  )
}
