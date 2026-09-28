import { css } from '../lib/style.js'
import { useAuth } from '../auth/AuthContext.jsx'
import logo from '../assets/zalopay-ai-space-logo-dark.png'

/** Blocks the wrapped page until a company account is signed in. */
export default function RequireAuth({ children }) {
  const { user, loading, openLogin } = useAuth()

  if (loading) return null

  if (!user) {
    return (
      <div style={css('min-height:100vh; display:flex; align-items:center; justify-content:center; background:#F7F8FA; padding:24px;')}>
        <div style={css('max-width:420px; text-align:center;')}>
          <img src={logo} alt="Zalopay AI Space" style={{ height: 30, width: 'auto', margin: '0 auto', display: 'block' }} />
          <div style={css('margin-top:18px; font:400 14.5px/1.6 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>
            Nơi mọi người khám phá, tìm hiểu và chia sẻ mọi thứ về AI.
          </div>
          <button
            onClick={() => openLogin()}
            style={css('margin-top:26px; height:48px; padding:0 30px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 14.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer; box-shadow:0 12px 26px rgba(44,95,255,.28);')}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    )
  }

  return children
}
