import { css } from '../lib/style.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useTitle } from '../hooks/useTitle.js'
import SpaceBackdrop from './SpaceBackdrop.jsx'
import HeroWordmark from './HeroWordmark.jsx'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'

/** Trailer screen shown to signed-in non-admins while the site isn't open yet: the wordmark intro + "Coming soon". */
export default function ComingSoon({ preview = false }) {
  const { user, logout } = useAuth()
  useTitle('Coming soon')
  return (
    <div style={css('position:relative; min-height:100vh; overflow:hidden; background:#04060d; color:#e8eefc; display:flex; flex-direction:column;')}>
      <SpaceBackdrop arcTop={Math.round(typeof window === 'undefined' ? 520 : Math.max(420, window.innerHeight * 0.62))} bg="#04060d" className="zp-backdrop-intro" />
      {user && (
        <div style={css('position:relative; z-index:2; display:flex; justify-content:flex-end; align-items:center; gap:10px; padding:16px 20px;')}>
          {preview && <a href="/admin" style={css(`margin-right:auto; padding:6px 12px; border-radius:999px; background:rgba(255,200,60,.16); border:1px solid rgba(255,200,60,.4); color:#ffd977; text-decoration:none; font:700 12.5px ${FONT};`)}>Xem trước (chỉ admin) · ← Về trang quản trị</a>}
          <span style={css(`font:600 13px ${FONT}; color:#a9b8dc;`)}>{user.domain || user.name}</span>
          {!preview && <button onClick={() => logout()} style={css(`height:32px; padding:0 14px; border:1px solid rgba(255,255,255,.18); border-radius:999px; background:rgba(255,255,255,.06); color:#dbe6ff; cursor:pointer; font:700 12.5px ${FONT};`)}>Đăng xuất</button>}
        </div>
      )}
      <main className="zp-intro" style={css('position:relative; z-index:1; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0 var(--zp-gutter, 16px) 18vh; text-align:center;')}>
        <div style={css(`width:100%; transform:scale(${typeof window !== 'undefined' && window.innerWidth < 700 ? 0.8 : 1.25}); transform-origin:center bottom;`)}>
          <HeroWordmark />
        </div>
        <p className="zp-tagline" style={css(`margin:40px auto 0; max-width:560px; font:500 15px/1.6 ${FONT}; color:rgba(214,226,250,.8); text-wrap:balance;`)}>Không gian cho các Zalopay Starter trao đổi kiến thức và khám phá cách ứng dụng AI trong công việc. Hẹn gặp bạn sớm!</p>
        <h1 className="zp-tagline zp-coming" style={css(`margin:34px 0 0; font:700 clamp(34px, 6vw, 64px)/1.05 'ZP Aeonik','Aeonik Pro',${FONT}; letter-spacing:-.01em; word-spacing:-.08em; text-transform:uppercase; background:linear-gradient(180deg,#ffffff 0%,#9fc0ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; text-shadow:0 0 40px rgba(80,140,255,.35);`)}>COMING SOON</h1>
      </main>
    </div>
  )
}
