import Sidebar from './Sidebar.jsx'
import TopNav from './TopNav.jsx'

/** Shared chrome for every logged-area page: fixed Sidebar (260px) + fixed TopNav (72px), content offset to clear both. */
export default function Layout({ active, notifications, children }) {
  return (
    <>
      <Sidebar active={active} notifications={notifications} />
      <div style={{ marginLeft: 260, paddingTop: 72, minHeight: '100vh', background: '#04060d' }}>
        <TopNav />
        {children}
      </div>
    </>
  )
}
