import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { css } from '../lib/style.js'
import { api } from '../lib/api.js'
import logo from '../assets/zalopay-ai-space-logo.png'

// While the site is under maintenance (maintenance.js on the server), everyone but the admins and the
// people let in sees this page instead of the app. Signing in happens on its own: someone not signed in
// is sent to Microsoft once per browser session, and comes back either let in or to this page, where they
// can ask the admins to be let in (Admin › Yêu cầu truy cập). Once let in, or once an admin publishes the
// site, the page reloads by itself. /?login shows a sign-in button as a way in when SSO fails (or without SSO).
const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const TRIED = 'zp-maint-sso'
const POLL_MS = 20_000

export default function MaintenanceGate({ children }) {
  const { user, loading, maintenance, ssoEnabled, openLogin } = useAuth()
  // /no-access (turned away at sign-in as not Zalopay staff) has its own request to the admins
  const noAccessPage = typeof window !== 'undefined' && window.location.pathname === '/no-access'
  const closed = maintenance && !user?.isAdmin && !user?.maintenanceOk && !noAccessPage
  const askLogin = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('login')
  const [status, setStatus] = useState(null) // none | pending | rejected | approved
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!closed || loading || user || !ssoEnabled || askLogin) return
    let tried = false
    try { tried = sessionStorage.getItem(TRIED) === '1'; sessionStorage.setItem(TRIED, '1') } catch { /* storage off: try once anyway */ }
    if (!tried) window.location.href = '/api/auth/sso/login?next=' + encodeURIComponent(window.location.pathname + window.location.hash)
  }, [closed, loading, user, ssoEnabled, askLogin])
  // signed in: where their request stands, checked again now and then so an approval (or Publish) lets them in
  useEffect(() => {
    if (!closed || loading || !user) return
    let stop = false
    const check = () => api.maintenanceRequestInfo().then((d) => { if (stop) return; if (d.status === 'approved') window.location.reload(); else setStatus(d.status) }).catch(() => {})
    check()
    const t = setInterval(check, POLL_MS)
    return () => { stop = true; clearInterval(t) }
  }, [closed, loading, user])
  if (!closed) return children
  const send = () => {
    setBusy(true); setError('')
    api.sendMaintenanceRequest(note.trim())
      .then((r) => { if (r.status === 'approved') window.location.reload(); else setStatus(r.status) })
      .catch((e) => setError(e?.data?.message || 'Chưa gửi được, thử lại nhé.'))
      .finally(() => setBusy(false))
  }
  const p = `margin:10px 0 0; font:400 14px/1.65 var(--zp-font-text); color:#3A4757;`
  return (
    <div style={css('min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:22px; padding:40px 16px; box-sizing:border-box; background:radial-gradient(70% 45% at 50% 0%, rgba(44,95,255,.22), transparent 70%), #04060d;')}>
      <img src={logo} alt="Zalopay AI Space" style={{ height: 22, width: 'auto' }} />
      <div style={css('width:520px; max-width:100%; box-sizing:border-box; background:#fff; border-radius:22px; padding:30px; text-align:center; box-shadow:0 30px 70px rgba(0,0,0,.4);')}>
        <div style={css('width:52px; height:52px; margin:0 auto; border-radius:16px; background:#EEF3FF; color:#2c5fff; display:flex; align-items:center; justify-content:center;')}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"></path></svg>
        </div>
        <h1 style={css(`margin:16px 0 0; font:800 22px/1.3 ${FONT}; color:#0F172A;`)}>Web đang được sửa chữa</h1>
        <p style={css(p)}>Zalopay AI Space tạm đóng để nâng cấp. Bạn quay lại sau nhé, cảm ơn bạn đã chờ!</p>
        {user && (status === 'none' || status === 'rejected') && (
          <div style={css('margin-top:18px; text-align:left;')}>
            <p style={css(p + 'text-align:center;')}>Cần vào ngay? Gửi yêu cầu, Admin duyệt xong là bạn vào được.</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder="Bạn cần vào để làm gì? (không bắt buộc)"
              style={css(`width:100%; margin-top:12px; box-sizing:border-box; border:1px solid #E6EBF3; border-radius:12px; padding:11px 13px; font:400 14px/1.6 var(--zp-font-text); color:#0F172A; background:#fff; color-scheme:light; outline:none; resize:vertical;`)} />
            {error && <div style={css(`margin-top:8px; font:600 12.5px ${FONT}; color:#D8232A;`)}>{error}</div>}
            <button onClick={send} disabled={busy}
              style={css(`margin-top:14px; width:100%; height:46px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; font:700 14.5px ${FONT}; cursor:pointer; opacity:${busy ? 0.6 : 1};`)}>
              {busy ? 'Đang gửi…' : 'Gửi yêu cầu truy cập cho Admin'}
            </button>
            {status === 'rejected' && <div style={css(`margin-top:10px; text-align:center; font:400 12.5px/1.6 var(--zp-font-text); color:#64748b;`)}>Yêu cầu trước của bạn chưa được duyệt. Bạn có thể gửi lại kèm lời nhắn rõ hơn.</div>}
          </div>
        )}
        {user && status === 'pending' && (
          <div style={css(`margin-top:18px; padding:12px 14px; border-radius:12px; background:#E7F9F0; border:1px solid #BEE9D3; font:600 13.5px/1.6 ${FONT}; color:#00723C;`)}>
            Đã gửi yêu cầu cho Admin. Khi được duyệt, bạn sẽ nhận email và trang này tự mở ra.
          </div>
        )}
        {!user && !loading && (askLogin || !ssoEnabled) && (
          <button onClick={() => openLogin()} style={css(`margin-top:20px; height:42px; padding:0 22px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 13.5px ${FONT}; cursor:pointer;`)}>Đăng nhập</button>
        )}
        {!user && !loading && ssoEnabled && !askLogin && (
          <a href={'/api/auth/sso/login?next=' + encodeURIComponent(window.location.pathname + window.location.hash)} style={css(`display:inline-flex; align-items:center; margin-top:20px; height:42px; padding:0 22px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 13.5px ${FONT}; text-decoration:none;`)}>Đăng nhập để gửi yêu cầu truy cập</a>
        )}
      </div>
    </div>
  )
}
