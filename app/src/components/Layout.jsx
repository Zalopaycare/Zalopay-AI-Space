import Sidebar from './Sidebar.jsx'
import TopNav from './TopNav.jsx'
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed.js'

/** Shared chrome for every logged-area page: fixed (collapsible) Sidebar + fixed TopNav, content offset to clear both. */
export default function Layout({ active, notifications, children }) {
  const [collapsed] = useSidebarCollapsed()
  return (
    <>
      <Sidebar active={active} />
      <div style={{ marginLeft: collapsed ? 76 : 260, paddingTop: 72, minHeight: '100vh', background: '#04060d', transition: 'margin-left .16s ease' }}>
        <TopNav notifications={notifications} />
        {children}
      </div>
    </>
  )
}
