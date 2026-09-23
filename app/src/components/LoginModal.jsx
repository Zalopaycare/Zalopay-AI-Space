import { useState } from 'react'
import { css } from '../lib/style.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { api } from '../lib/api.js'

export default function LoginModal() {
  const { loginOpen, closeLogin, onLoggedIn, ssoEnabled } = useAuth()
  const [stage, setStage] = useState('email') // 'email' | 'code'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [devCode, setDevCode] = useState('')

  if (!loginOpen) return null

  const reset = () => { setStage('email'); setEmail(''); setCode(''); setError(''); setDevCode('') }
  const close = () => { reset(); closeLogin() }

  const submitEmail = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const r = await api.requestCode(email.trim().toLowerCase())
      if (r.devCode) setDevCode(r.devCode)
      setStage('code')
    } catch (err) {
      setError(err.data?.message || 'Không gửi được mã. Kiểm tra lại email công ty.')
    } finally { setBusy(false) }
  }

  const submitCode = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const r = await api.verifyCode(email.trim().toLowerCase(), code.trim())
      onLoggedIn(r.user)
      reset()
    } catch (err) {
      setError(err.data?.message || 'Mã không đúng, thử lại.')
    } finally { setBusy(false) }
  }

  return (
    <div onClick={close} style={css('position:fixed; inset:0; z-index:5000; background:rgba(4,8,20,.66); backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; padding:24px; font-family:"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>
      <div onClick={(e) => e.stopPropagation()} style={css('width:100%; max-width:400px; background:#fff; border-radius:20px; padding:28px; box-shadow:0 30px 70px rgba(0,0,0,.4);')}>
        <div style={css('font:800 19px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>Đăng nhập</div>
        <div style={css('margin-top:6px; font:400 13.5px/1.6 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>
          Dùng email công ty để đăng nhập và tham gia thảo luận.
        </div>

        {stage === 'email' && ssoEnabled && (
          <>
            <a
              href="/api/auth/sso/login"
              style={css('margin-top:18px; display:flex; align-items:center; justify-content:center; gap:10px; height:46px; border:1px solid #DDE3EC; border-radius:12px; background:#fff; color:#1F2937; font:700 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; text-decoration:none;')}
            >
              <svg width="18" height="18" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
              Đăng nhập bằng tài khoản công ty (Microsoft)
            </a>
            <div style={css('display:flex; align-items:center; gap:10px; margin-top:16px;')}>
              <div style={css('flex:1; height:1px; background:#E6EBF3;')}></div>
              <span style={css('font:600 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>hoặc</span>
              <div style={css('flex:1; height:1px; background:#E6EBF3;')}></div>
            </div>
          </>
        )}

        {stage === 'email' && (
          <form onSubmit={submitEmail} style={css('margin-top:18px; display:flex; flex-direction:column; gap:12px;')}>
            <input
              type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="ten.ban@zalopay.vn"
              style={css('width:100%; border:1px solid #E6EBF3; border-radius:12px; padding:12px 14px; font-size:14.5px; color:#0F172A; outline:none; box-sizing:border-box;')}
            />
            {error && <div style={css('font:600 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#D8232A;')}>{error}</div>}
            <button type="submit" disabled={busy} style={css(`height:44px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; font:700 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer; opacity:${busy ? 0.6 : 1};`)}>
              {busy ? 'Đang gửi mã...' : 'Gửi mã đăng nhập'}
            </button>
          </form>
        )}

        {stage === 'code' && (
          <form onSubmit={submitCode} style={css('margin-top:18px; display:flex; flex-direction:column; gap:12px;')}>
            <div style={css('font:400 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757;')}>
              Đã gửi mã 6 số tới <strong>{email}</strong>. Kiểm tra hộp thư (và mục Spam).
            </div>
            {devCode && (
              <div style={css('font:600 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#B45300; background:#FFF1E0; border-radius:10px; padding:8px 12px;')}>
                Chế độ thử nghiệm — chưa cấu hình email gửi thật, dùng tạm mã: {devCode}
              </div>
            )}
            <input
              inputMode="numeric" maxLength={6} required autoFocus value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              style={css('width:100%; letter-spacing:6px; text-align:center; border:1px solid #E6EBF3; border-radius:12px; padding:12px 14px; font-size:18px; font-weight:700; color:#0F172A; outline:none; box-sizing:border-box;')}
            />
            {error && <div style={css('font:600 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#D8232A;')}>{error}</div>}
            <button type="submit" disabled={busy} style={css(`height:44px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; font:700 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer; opacity:${busy ? 0.6 : 1};`)}>
              {busy ? 'Đang xác nhận...' : 'Xác nhận'}
            </button>
            <button type="button" onClick={() => setStage('email')} style={css('background:none; border:none; cursor:pointer; font:600 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>
              Dùng email khác
            </button>
          </form>
        )}

        <button onClick={close} style={css('margin-top:14px; width:100%; background:none; border:none; cursor:pointer; font:600 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>Đóng</button>
      </div>
    </div>
  )
}
