import { Link, useLocation } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed.js'

const NAV_ITEMS = [
  { label: 'Trang chủ', to: '/', match: (p) => p === '/' },
  { label: 'Use Case', to: '/use-cases', match: (p) => p.startsWith('/use-cases') },
  { label: 'Câu hỏi', to: '/questions', match: (p) => p.startsWith('/questions') },
]

const navItemBase = 'font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;padding:6px 2px;transition:color .15s;background:none;border:none;text-decoration:none;white-space:nowrap;'

/** The thin top bar, offset by the (collapsible) sidebar: page nav (+ login button when signed out); the profile chip lives at the bottom of the Sidebar. */
export default function TopNav({ notifications }) {
  const location = useLocation()
  const { t } = useI18n()
  const { user, openLogin } = useAuth()
  const [collapsed] = useSidebarCollapsed()

  return (
    <div style={css(`position:fixed; top:0; left:${collapsed ? 76 : 260}px; right:0; height:72px; z-index:1900; display:flex; align-items:center; padding:0 32px; background:rgba(4,6,13,.86); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border-bottom:1px solid rgba(255,255,255,.08); font-family:inherit; transition:left .16s ease;`)}>
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
        {!user && (
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
