import { css } from '../lib/style.js'

/**
 * "Ẩn danh" chip next to an author name. `p` is a post/answer from the API: everyone sees the chip
 * on anonymous posts; the author and admins (who get `realAuthor`) also see the alias others see.
 */
export default function AnonTag({ p, dark = false }) {
  if (!p || !p.anonymous) return null
  const mineOrAdmin = !!p.realAuthor
  const label = mineOrAdmin ? `Ẩn danh · người khác thấy “${p.alias || 'Ẩn danh'}”` : 'Ẩn danh'
  return (
    <span
      title={mineOrAdmin ? 'Bài đăng ẩn danh. Chỉ bạn và admin thấy tên thật.' : 'Người đăng chọn ẩn danh'}
      style={css(`flex:none; display:inline-flex; align-items:center; gap:4px; height:20px; padding:0 8px; border-radius:999px; font-size:11px; font-weight:700; white-space:nowrap; ${dark ? 'background:rgba(255,255,255,.12); color:#dbe6ff;' : 'background:#EEF1F6; color:#475569;'}`)}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7"></path><path d="m3 3 18 18"></path></svg>
      {label}
    </span>
  )
}
