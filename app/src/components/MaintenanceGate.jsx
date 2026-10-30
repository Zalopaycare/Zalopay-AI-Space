import { useAuth } from '../auth/AuthContext.jsx'
import { css } from '../lib/style.js'
import logo from '../assets/zalopay-ai-space-logo.png'

// While the site is under maintenance (MAINTENANCE=on on the server), everyone but the admins and the
// people in MAINTENANCE_ALLOW sees this page instead of the app. They sign in from here and use the site as usual.
const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'

export default function MaintenanceGate({ children }) {
  const { user, loading, maintenance, openLogin, logout } = useAuth()
  if (!maintenance || user?.isAdmin || user?.maintenanceOk) return children
  return (
    <div style={css('min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:22px; padding:40px 16px; box-sizing:border-box; background:radial-gradient(70% 45% at 50% 0%, rgba(44,95,255,.22), transparent 70%), #04060d;')}>
      <img src={logo} alt="Zalopay AI Space" style={{ height: 22, width: 'auto' }} />
      <div style={css('width:520px; max-width:100%; box-sizing:border-box; background:#fff; border-radius:22px; padding:30px; text-align:center; box-shadow:0 30px 70px rgba(0,0,0,.4);')}>
        <div style={css('width:52px; height:52px; margin:0 auto; border-radius:16px; background:#EEF3FF; color:#2c5fff; display:flex; align-items:center; justify-content:center;')}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"></path></svg>
        </div>
        <h1 style={css(`margin:16px 0 0; font:800 22px/1.3 ${FONT}; color:#0F172A;`)}>Web đang được sửa chữa</h1>
        <p style={css(`margin:10px 0 0; font:400 14px/1.65 var(--zp-font-text); color:#3A4757;`)}>Zalopay AI Space tạm đóng để nâng cấp. Bạn quay lại sau nhé, cảm ơn bạn đã chờ!</p>
        {!loading && !user && (
          <button onClick={() => openLogin()} style={css(`margin-top:20px; height:42px; padding:0 22px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 13.5px ${FONT}; cursor:pointer;`)}>Đăng nhập</button>
        )}
        {!loading && user && (
          <div style={css(`margin-top:18px; font:400 12.5px/1.6 var(--zp-font-text); color:#64748b;`)}>
            Bạn đang đăng nhập bằng {user.email}. <button onClick={logout} style={css(`border:none; background:none; padding:0; cursor:pointer; font:700 12.5px ${FONT}; color:#2c5fff;`)}>Đăng xuất</button>
          </div>
        )}
      </div>
    </div>
  )
}
