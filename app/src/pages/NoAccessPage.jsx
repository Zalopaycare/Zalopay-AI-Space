import { useEffect, useState } from 'react'
import { css } from '../lib/style.js'
import { api } from '../lib/api.js'
import { useTitle } from '../hooks/useTitle.js'
import logo from '../assets/zalopay-ai-space-logo.png'

// Where Microsoft sign-in sends someone it doesn't list under Zalopay (the company on their account isn't
// Zion / Zalopay). If they are Zalopay staff after all, one click tells the admins, who check and grant access.
const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'

export default function NoAccessPage() {
  useTitle('Không có quyền truy cập')
  const [info, setInfo] = useState(null) // { ticket, email, name, company, department, status }
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { api.accessRequestInfo().then(setInfo).catch(() => setInfo({ ticket: false })) }, [])
  const send = () => {
    setBusy(true); setError('')
    api.sendAccessRequest(note.trim())
      .then((r) => setInfo((x) => ({ ...x, status: r.status })))
      .catch((e) => setError(e?.data?.message || 'Chưa gửi được, thử lại nhé.'))
      .finally(() => setBusy(false))
  }
  const box = 'width:520px; max-width:100%; box-sizing:border-box; background:#fff; border-radius:22px; padding:30px 30px 26px; box-shadow:0 30px 70px rgba(0,0,0,.4);'
  const p = `margin:10px 0 0; font:400 14px/1.65 ${FONT}; color:#3A4757;`
  const sent = info?.status === 'pending'
  return (
    <div style={css(`min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:22px; padding:40px 16px; box-sizing:border-box; background:radial-gradient(70% 45% at 50% 0%, rgba(44,95,255,.22), transparent 70%), #04060d;`)}>
      <img src={logo} alt="Zalopay AI Space" style={{ height: 22, width: 'auto' }} />
      <div style={css(box)}>
        <div style={css(`width:44px; height:44px; border-radius:14px; background:#FFECEC; color:#D8232A; display:flex; align-items:center; justify-content:center;`)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>
        </div>
        <h1 style={css(`margin:16px 0 0; font:800 22px/1.3 ${FONT}; color:#0F172A;`)}>Bạn chưa có quyền vào Zalopay AI Space</h1>
        <p style={css(p)}>AI Space chỉ dành cho nhân viên Zalopay. Tài khoản Microsoft của bạn chưa cho thấy bạn thuộc Zalopay.</p>
        {info?.ticket && (
          <div style={css(`margin-top:14px; padding:12px 14px; border-radius:12px; background:#F5F8FF; border:1px solid #DCE5FA; font:400 13px/1.7 ${FONT}; color:#3A4757;`)}>
            <div><b>Tài khoản:</b> {info.name ? `${info.name} · ` : ''}{info.email}</div>
            <div><b>Công ty trên Microsoft:</b> {info.company || '(không ghi)'}{info.department ? ` · ${info.department}` : ''}</div>
          </div>
        )}
        {info && !info.ticket && (
          <p style={css(p)}>Nếu bạn là nhân viên Zalopay, hãy bấm <b>Đăng nhập lại</b> rồi gửi yêu cầu cho Admin ở trang này.</p>
        )}
        {info?.ticket && !sent && (
          <>
            <p style={css(p)}>Nếu bạn là nhân viên Zalopay, gửi yêu cầu để Admin kiểm tra và cấp quyền cho bạn.</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder="Bạn làm ở team nào của Zalopay? (không bắt buộc)"
              style={css(`width:100%; margin-top:12px; box-sizing:border-box; border:1px solid #E6EBF3; border-radius:12px; padding:11px 13px; font:400 14px/1.6 ${FONT}; color:#0F172A; background:#fff; color-scheme:light; outline:none; resize:vertical;`)} />
            {error && <div style={css(`margin-top:8px; font:600 12.5px ${FONT}; color:#D8232A;`)}>{error}</div>}
            <button onClick={send} disabled={busy}
              style={css(`margin-top:14px; width:100%; height:46px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; font:700 14.5px ${FONT}; cursor:pointer; opacity:${busy ? 0.6 : 1};`)}>
              {busy ? 'Đang gửi…' : 'Gửi yêu cầu cho Admin'}
            </button>
            {info.status === 'rejected' && <div style={css(`margin-top:10px; font:400 12.5px/1.6 ${FONT}; color:#64748b;`)}>Yêu cầu trước của bạn chưa được duyệt. Bạn có thể gửi lại kèm lời nhắn rõ hơn.</div>}
          </>
        )}
        {sent && (
          <div style={css(`margin-top:16px; padding:12px 14px; border-radius:12px; background:#E7F9F0; border:1px solid #BEE9D3; font:600 13.5px/1.6 ${FONT}; color:#00723C;`)}>
            Đã gửi yêu cầu cho Admin. Khi được cấp quyền, bạn sẽ nhận email và chỉ cần đăng nhập lại.
          </div>
        )}
        <a href="/api/auth/sso/login" style={css(`display:inline-block; margin-top:16px; font:700 13px ${FONT}; color:#2c5fff; text-decoration:none;`)}>Đăng nhập lại →</a>
      </div>
    </div>
  )
}
