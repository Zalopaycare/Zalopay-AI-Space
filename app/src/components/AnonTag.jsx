import { css } from '../lib/style.js'
import { useAuth } from '../auth/AuthContext.jsx'

/**
 * "Ẩn danh" chip next to an author name. The alias is already shown in the name's place; the chip
 * tells the author it's their own anonymous post, and tells admins who really posted (`realAuthor`).
 */
export default function AnonTag({ p, dark = false }) {
  const { user } = useAuth()
  if (!p || !p.anonymous) return null
  const mine = !!user && p.authorId != null && p.authorId === user.id
  const label = mine ? 'Ẩn danh · bài của bạn' : p.realAuthor ? `Ẩn danh · ${p.realAuthor}` : 'Ẩn danh'
  const title = mine ? 'Người khác chỉ thấy tên ẩn danh. Admin vẫn biết bạn là người đăng.' : p.realAuthor ? 'Chỉ admin thấy người đăng thật.' : 'Người đăng chọn ẩn danh'
  return (
    <span
      title={title}
      style={css(`flex:none; display:inline-flex; align-items:center; gap:4px; height:20px; padding:0 8px; border-radius:999px; font-size:11px; font-weight:700; white-space:nowrap; ${dark ? 'background:rgba(255,255,255,.12); color:#dbe6ff;' : 'background:#EEF1F6; color:#475569;'}`)}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7"></path><path d="m3 3 18 18"></path></svg>
      {label}
    </span>
  )
}
