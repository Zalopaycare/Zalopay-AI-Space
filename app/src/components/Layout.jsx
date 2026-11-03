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
        {/* a way back to the top of a long page, just under the last post (above the footer line) */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', padding: '4px var(--zp-gutter) 22px', background: '#04060d' }}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="zp-to-top" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 18px', border: 'none', borderRadius: 999, background: 'linear-gradient(180deg,#4480ff 0%,#2c5fff 100%)', color: '#fff', font: '700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif', cursor: 'pointer', boxShadow: '0 0 0 1px rgba(130,175,255,.35), 0 8px 24px rgba(44,95,255,.45)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
            Về đầu trang
          </button>
        </div>
        <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,.08)', padding: '18px var(--zp-gutter) 20px', background: '#04060d' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
            <img src={logo} alt="Zalopay AI Space" style={{ height: 24, width: 'auto', display: 'block' }} />
          </div>
        </footer>
      </div>
    </>
  )
}
