import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import TopNav from './TopNav.jsx'
import logo from '../assets/zalopay-ai-space-logo.png'
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed.js'

/**
 * Shared chrome for every logged-area page: fixed (collapsible) Sidebar + fixed TopNav, content
 * offset to clear both. The column is a full-height flex stack so the footer always sits at the
 * bottom of the screen on short pages, and the content area clips its decorative backdrops so the
 * page can never scroll past the footer.
 */
export default function Layout({ active, children }) {
  const [collapsed] = useSidebarCollapsed()
  const { pathname } = useLocation()
  return (
    <>
      <Sidebar active={active} />
      <div style={{ marginLeft: collapsed ? 76 : 260, paddingTop: 72, minHeight: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: '#04060d', transition: 'margin-left .16s ease' }}>
        <TopNav />
        <main key={pathname} className={typeof document !== 'undefined' && document.documentElement.classList.contains('zp-vt') ? undefined : 'zp-page-in'} style={{ flex: 1, position: 'relative', overflow: 'clip' }}>
          {children}
        </main>
        <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,.08)', padding: '18px 40px 20px', background: '#04060d' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <img src={logo} alt="Zalopay AI Space" style={{ height: 18, width: 'auto', display: 'block', alignSelf: 'flex-start' }} />
            <span style={{ fontSize: 13, color: '#8b98b8' }}>© Employer Branding, Internal Communication and Employee Engagement Team</span>
          </div>
        </footer>
      </div>
    </>
  )
}
