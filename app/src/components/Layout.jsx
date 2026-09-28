import Sidebar from './Sidebar.jsx'
import TopNav from './TopNav.jsx'
import logo from '../assets/zalopay-ai-space-logo.png'
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed.js'

/** Shared chrome for every logged-area page: fixed (collapsible) Sidebar + fixed TopNav, content offset to clear both. */
export default function Layout({ active, notifications, children }) {
  const [collapsed] = useSidebarCollapsed()
  return (
    <>
      <Sidebar active={active} />
      <div style={{ marginLeft: collapsed ? 76 : 260, paddingTop: 72, minHeight: '100vh', background: '#04060d', overflowX: 'clip', transition: 'margin-left .16s ease' }}>
        <TopNav notifications={notifications} />
        {children}
        <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,.08)', padding: '22px 40px 26px', background: '#04060d' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <img src={logo} alt="Zalopay AI Space" style={{ height: 18, width: 'auto', display: 'block', alignSelf: 'flex-start' }} />
            <span style={{ fontSize: 13, color: '#8b98b8' }}>© Employer Branding, Internal Communication and Employee Engagement Team</span>
          </div>
        </footer>
      </div>
    </>
  )
}
