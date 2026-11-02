import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import TopNav from './TopNav.jsx'
import WelcomeTour from './WelcomeTour.jsx'
import logo from '../assets/zalopay-ai-space-logo.png'
import { useSidebarLayout } from '../hooks/useSidebarCollapsed.js'

/**
 * Shared chrome for every logged-area page: fixed (collapsible) Sidebar + fixed TopNav, content
 * offset to clear both. The column is a full-height flex stack so the footer always sits at the
 * bottom of the screen on short pages, and the content area clips its decorative backdrops so the
 * page can never scroll past the footer.
 */
export default function Layout({ active, children }) {
  const { offset } = useSidebarLayout()
  const { pathname } = useLocation()
  return (
    <>
      <Sidebar active={active} />
      <div style={{ marginLeft: offset, paddingTop: 58, minHeight: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: '#04060d', transition: 'margin-left .16s ease' }}>
        <TopNav />
        {/* the welcome tour, once for someone new (and on request from the account menu) */}
        <WelcomeTour />
        <main key={pathname} className={'zp-main ' + (typeof document !== 'undefined' && document.documentElement.classList.contains('zp-vt') ? '' : 'zp-page-in')} style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'clip' }}>
          {children}
        </main>
        <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,.08)', padding: '18px var(--zp-gutter) 20px', background: '#04060d' }}>
          {/* centred, with a way back to the top of a long page */}
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="zp-to-top" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', marginBottom: 8, border: '1px solid rgba(150,180,255,.22)', borderRadius: 999, background: 'rgba(255,255,255,.04)', color: '#b4c3e8', font: '700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
              Về đầu trang
            </button>
            <img src={logo} alt="Zalopay AI Space" style={{ height: 18, width: 'auto', display: 'block' }} />
            <span style={{ fontSize: 13, color: '#8b98b8' }}>© Employer Branding, Internal Communication and Employee Engagement Team</span>
          </div>
        </footer>
      </div>
    </>
  )
}
