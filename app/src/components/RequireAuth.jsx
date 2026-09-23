import { css } from '../lib/style.js'
import { useAuth } from '../auth/AuthContext.jsx'

/** Blocks the wrapped page until a company account is signed in. */
export default function RequireAuth({ children }) {
  const { user, loading, openLogin } = useAuth()

  if (loading) return null

  if (!user) {
    return (
      <div style={css('min-height:100vh; display:flex; align-items:center; justify-content:center; background:#04060d; padding:24px;')}>
        <div style={css('max-width:420px; text-align:center; background:#fff; border-radius:20px; padding:40px 32px; box-shadow:0 20px 60px rgba(0,0,0,.4);')}>
          <div style={css('font:800 20px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>Zalopay AI Community</div>
          <div style={css('margin-top:12px; font:400 14px/1.6 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>
            Nội dung chỉ dành cho nhân viên Zalopay. Vui lòng đăng nhập bằng tài khoản công ty để tiếp tục.
          </div>
          <button
            onClick={() => openLogin()}
            style={css('margin-top:22px; height:46px; padding:0 26px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer; box-shadow:0 12px 26px rgba(44,95,255,.4);')}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    )
  }

  return children
}
