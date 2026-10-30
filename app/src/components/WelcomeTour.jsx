import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { api } from '../lib/api.js'
import { css } from '../lib/style.js'

// The welcome tour, as a guided walk over the real page: everything dims, the feature in question is
// cut out of the dark with a glowing frame, and a glass card next to it says what it does. Shown once
// to everyone who hasn't seen it (the server remembers, so not again on another device), and again
// from the account menu ("Hướng dẫn sử dụng"). It runs on the home page, where most of what it points
// at lives; a mark that isn't on screen (the sidebar on a phone) gets the card in the middle instead.

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const OPEN_EVENT = 'zp-open-tour'
/** Opens the tour from anywhere (the account menu). */
export const openTour = () => window.dispatchEvent(new Event(OPEN_EVENT))

// `at`: the element to light up (a data-tour mark or a selector); none = the card alone, centred.
const STEPS = [
  { title: 'Chào mừng đến Zalopay AI Space', text: 'Nơi các Zalopay Starter chia sẻ, hỏi đáp và học nhau cách dùng AI trong công việc. Đi một vòng chưa tới một phút nhé.' },
  { at: '[data-tour="nav-home"]', title: 'AI Space', text: 'Trang chủ: mọi người đăng thread hỏi đáp, chia sẻ mẹo hay và kết quả làm với AI.' },
  { at: '[data-tour="compose"]', title: 'Đăng thread', text: 'Bấm vào đây để hỏi hay chia sẻ. Gõ @ để gọi tên đồng nghiệp (họ nhận email); ngại thì bật đăng ẩn danh.' },
  { at: '[data-qid]', title: 'Một thread', text: 'Bấm vào để đọc và bình luận. ♡ để thích, 💬 để trả lời, 🔖 để lưu đọc lại sau.' },
  { at: '[data-tour="nav-usecases"]', title: 'Use Case Library', text: 'Các cách dùng AI đã chạy thật: bài toán, giải pháp và từng bước để bạn tự làm lại. Lọc theo Category và Công cụ AI.' },
  { at: '[data-tour="share"]', title: 'Chia sẻ use case', text: 'Điền form từng bước (kèm hình minh họa hoặc file), hoặc tải template Word về điền. Admin xem và góp ý trước khi đăng.' },
  { at: '[data-tour="mine"]', title: 'Của tôi', text: 'Thông báo khi có người trả lời, bình luận hay tag bạn; Đã lưu là bài bạn đánh dấu; Hồ sơ gom bài của bạn.' },
  { at: '[data-tour="chat"]', title: 'Chat với Admin', text: 'Có câu hỏi, góp ý hay thấy lỗi thì nhắn ở đây.' },
  { at: '[data-tour="account"]', title: 'Xem lại hướng dẫn', text: 'Menu tài khoản > Hướng dẫn sử dụng để đi lại vòng này bất cứ lúc nào. Chúc bạn khám phá vui!' },
]
const PAD = 8 // room around the lit-up element
const CARD_W = 340

/** Where the element is on screen, or null when it isn't showing (hidden, zero-size or off screen). */
function rectOf(sel) {
  const el = sel && document.querySelector(sel)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (!r.width || !r.height || r.right <= 0 || r.left >= window.innerWidth || r.bottom <= 0 || r.top >= window.innerHeight) return null
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }
}

/** The card beside the lit-up box: below it, else above, else to its right; kept on screen. */
function cardPos(box, h) {
  const vw = window.innerWidth, vh = window.innerHeight, w = Math.min(CARD_W, vw - 24)
  if (!box) return { top: Math.max(16, (vh - h) / 2), left: (vw - w) / 2, w }
  const clampX = (x) => Math.max(12, Math.min(vw - w - 12, x))
  if (box.top + box.height + 14 + h < vh - 12) return { top: box.top + box.height + 14, left: clampX(box.left), w }
  if (box.top - 14 - h > 12) return { top: box.top - 14 - h, left: clampX(box.left), w }
  return { top: Math.max(12, Math.min(vh - h - 12, box.top)), left: clampX(box.left + box.width + 14), w }
}

export default function WelcomeTour() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [box, setBox] = useState(null)
  const [cardH, setCardH] = useState(200)
  const cardRef = useRef(null)

  const start = () => { if (window.location.pathname !== '/') navigate('/'); setStep(0); setOpen(true) }
  // first visit: start by itself once the account is known
  useEffect(() => { if (user && !user.tourSeen) start() }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    window.addEventListener(OPEN_EVENT, start)
    return () => window.removeEventListener(OPEN_EVENT, start)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => {
    setOpen(false)
    if (user && !user.tourSeen) api.updateMe({ tourSeen: true }).then((d) => d?.user && setUser(d.user)).catch(() => {})
  }

  // light up this step's element: bring it into view, then follow it on scroll / resize
  useLayoutEffect(() => {
    if (!open) return undefined
    const sel = STEPS[step].at
    const el = sel && document.querySelector(sel)
    if (el && el.getBoundingClientRect().height) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    let raf = 0
    const measure = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setBox(rectOf(sel))) }
    measure()
    const settle = setTimeout(measure, 420) // after the smooth scroll (and the page, if it was just opened)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { clearTimeout(settle); cancelAnimationFrame(raf); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [open, step, pathname])
  useLayoutEffect(() => { if (cardRef.current) setCardH(cardRef.current.offsetHeight) }, [open, step])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight' || e.key === 'Enter') setStep((s) => (s < STEPS.length - 1 ? s + 1 : s))
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !user) return null
  const s = STEPS[step]
  const last = step === STEPS.length - 1
  const pos = cardPos(box, cardH)
  const two = (n) => String(n).padStart(2, '0')
  return createPortal(
    <div className="zp-tour" style={css('position:fixed; inset:0; z-index:5500;')}>
      {/* the dark, with a hole where the feature is (a huge shadow around the frame); clicks stay off the page */}
      <div style={css('position:absolute; inset:0;')} onClick={(e) => e.stopPropagation()}></div>
      {box ? (
        <div className="zp-tour-frame" style={css(`position:absolute; top:${box.top}px; left:${box.left}px; width:${box.width}px; height:${box.height}px; border-radius:14px; box-shadow:0 0 0 9999px rgba(2,6,22,.74), 0 0 0 1.5px rgba(120,200,255,.95), 0 0 26px 4px rgba(64,150,255,.55); transition:top .35s cubic-bezier(.4,0,.2,1), left .35s cubic-bezier(.4,0,.2,1), width .35s cubic-bezier(.4,0,.2,1), height .35s cubic-bezier(.4,0,.2,1); pointer-events:none;`)}>
          {/* corner brackets, like a target lock */}
          {['top:-6px; left:-6px; border-width:2px 0 0 2px;', 'top:-6px; right:-6px; border-width:2px 2px 0 0;', 'bottom:-6px; left:-6px; border-width:0 0 2px 2px;', 'bottom:-6px; right:-6px; border-width:0 2px 2px 0;'].map((c, i) => (
            <span key={i} className="zp-tour-corner" style={css(`position:absolute; width:14px; height:14px; border-style:solid; border-color:#7FE3FF; ${c}`)}></span>
          ))}
          <span style={css('position:absolute; inset:0; border-radius:14px; overflow:hidden;')}><span className="zp-tour-scan"></span></span>
        </div>
      ) : (
        <div style={css('position:absolute; inset:0; background:rgba(2,6,22,.78); backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px);')}></div>
      )}

      <div key={step} ref={cardRef} role="dialog" aria-modal="true" aria-label={s.title} className="zp-tour-card" style={css(`position:absolute; top:${pos.top}px; left:${pos.left}px; width:${pos.w}px; box-sizing:border-box; padding:16px 18px 14px; border-radius:16px; background:linear-gradient(160deg, rgba(22,40,110,.92) 0%, rgba(8,14,44,.94) 100%); border:1px solid rgba(130,190,255,.42); box-shadow:0 18px 50px rgba(0,0,0,.55), 0 0 30px rgba(44,120,255,.25), inset 0 1px 0 rgba(255,255,255,.08); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); color:#E8F0FF; transition:top .35s cubic-bezier(.4,0,.2,1), left .35s cubic-bezier(.4,0,.2,1);`)}>
        <div style={css('position:absolute; left:18px; right:18px; top:0; height:2px; border-radius:2px; background:linear-gradient(90deg, transparent, #5FD4FF, #8A7CFF, transparent);')}></div>
        <div style={css('display:flex; align-items:center; gap:8px;')}>
          <span style={css(`font:700 11px ${FONT}; letter-spacing:.14em; color:#7FE3FF;`)}>{two(step + 1)} / {two(STEPS.length)}</span>
          <span style={css('flex:1; height:1px; background:linear-gradient(90deg, rgba(127,227,255,.5), transparent);')}></span>
          <button onClick={close} style={css(`border:none; background:transparent; padding:0; color:rgba(200,215,255,.7); font:600 12px ${FONT}; cursor:pointer;`)}>Bỏ qua</button>
        </div>
        <div style={css(`margin-top:8px; font:800 17px/1.3 ${FONT}; color:#fff;`)}>{s.title}</div>
        <div style={css('margin-top:6px; font:400 13.5px/1.55 var(--zp-font-text); color:rgba(214,226,255,.86);')}>{s.text}</div>
        <div style={css('display:flex; align-items:center; gap:8px; margin-top:14px;')}>
          <div style={css('flex:1; display:flex; gap:4px;')}>
            {STEPS.map((_, i) => <span key={i} style={css(`height:3px; flex:${i === step ? 3 : 1}; border-radius:2px; background:${i <= step ? '#5FD4FF' : 'rgba(150,175,230,.25)'}; transition:flex .3s, background .3s;`)}></span>)}
          </div>
          {step > 0 && <button onClick={() => setStep(step - 1)} style={css(`height:32px; padding:0 13px; border:1px solid rgba(130,190,255,.4); border-radius:999px; background:transparent; color:#CFE0FF; font:700 12.5px ${FONT}; cursor:pointer;`)}>Quay lại</button>}
          <button onClick={() => (last ? close() : setStep(step + 1))} style={css(`height:32px; padding:0 16px; border:none; border-radius:999px; background:linear-gradient(90deg,#3E8BFF,#5FD4FF); color:#04122E; font:800 12.5px ${FONT}; cursor:pointer; box-shadow:0 0 18px rgba(95,212,255,.45);`)}>{last ? 'Bắt đầu' : 'Tiếp'}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
