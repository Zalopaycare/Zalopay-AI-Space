import { useLocation } from 'react-router-dom'
import SoftLink from './SoftLink.jsx'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed.js'

const NAV_ITEMS = [
  { label: 'Home', to: '/', match: (p) => p === '/' },
  { label: 'Use Case', to: '/use-cases', match: (p) => p.startsWith('/use-cases') },
  { label: 'Câu hỏi', to: '/questions', match: (p) => p.startsWith('/questions') },
]

const navItemBase = 'font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;padding:6px 14px;border-radius:999px;transition:color .15s, background .15s, box-shadow .15s;border:1px solid transparent;text-decoration:none;white-space:nowrap;'

/** The thin top bar, offset by the (collapsible) sidebar: page nav (+ login button when signed out); the profile chip lives at the bottom of the Sidebar. */
export default function TopNav() {
  const location = useLocation()
  const { t } = useI18n()
  const { user, openLogin } = useAuth()
  const [collapsed] = useSidebarCollapsed()

  return (
    <div style={css(`view-transition-name:zp-topnav; position:fixed; top:0; left:${collapsed ? 68 : 224}px; right:0; height:58px; z-index:1900; display:flex; align-items:center; padding:0 28px; background:linear-gradient(90deg, rgba(9,18,58,.86) 0%, rgba(5,9,28,.84) 50%, rgba(9,18,58,.86) 100%); backdrop-filter:blur(16px) saturate(140%); -webkit-backdrop-filter:blur(16px) saturate(140%); border-bottom:1px solid rgba(130,170,255,.12); box-shadow:0 8px 30px rgba(0,0,0,.35); font-family:inherit; transition:left .16s ease;`)}>
      <div style={{ flex: 1 }}></div>
      <nav style={css('display:flex; align-items:center; gap:6px;')}>
        {NAV_ITEMS.map((item) => {
          const active = item.match(location.pathname)
          return (
            <SoftLink
              key={item.to}
              to={item.to}
              className={active ? undefined : hoverClass('color:#fff !important; background:rgba(60,110,255,.22) !important; border-color:rgba(130,175,255,.45) !important; box-shadow:0 0 16px rgba(44,95,255,.28) !important;')}
              style={css(navItemBase + (active ? 'color:#fff; background:rgba(60,110,255,.22); border-color:rgba(130,175,255,.45); box-shadow:0 0 16px rgba(44,95,255,.28);' : 'color:#b4c3e8;'))}
            >
              {t(item.label)}
            </SoftLink>
          )
        })}
      </nav>
      <div style={css('flex:1; display:flex; align-items:center; justify-content:flex-end; gap:12px;')}>
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
