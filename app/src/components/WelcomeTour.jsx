import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { api } from '../lib/api.js'
import { css, hoverClass } from '../lib/style.js'

// A short tour of what the site does, shown once to everyone who hasn't seen it (the server remembers,
// so it doesn't come back on another device) and again from the account menu ("Hướng dẫn sử dụng").

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const OPEN_EVENT = 'zp-open-tour'
/** Opens the tour from anywhere (the account menu). */
export const openTour = () => window.dispatchEvent(new Event(OPEN_EVENT))

const icon = (d) => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
const STEPS = [
  {
    title: 'Chào mừng đến Zalopay AI Space',
    text: 'Nơi các Zalopay Starter chia sẻ, hỏi đáp và học nhau cách dùng AI trong công việc. Xem nhanh các phần chính nhé, chưa tới một phút.',
    icon: icon(<><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4z"></path><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"></path></>),
  },
  {
    title: 'AI Space: hỏi đáp và thảo luận',
    text: 'Trang chủ là nơi mọi người đăng thread: hỏi một câu, chia sẻ mẹo hay, khoe kết quả. Bấm vào một thread để đọc và bình luận. Thả ♡, lưu bài để đọc lại, gõ @ để gọi tên đồng nghiệp (họ nhận email). Ngại thì bật đăng ẩn danh.',
    icon: icon(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M7 8h10"></path><path d="M7 12h6"></path></>),
  },
  {
    title: 'Use Case Library: cách dùng AI đã chạy thật',
    text: 'Mỗi use case kể bài toán, giải pháp và các bước để bạn tự làm lại, kèm lưu ý an toàn. Lọc theo Category hoặc Công cụ AI, sắp theo Mới nhất hay Được yêu thích nhất.',
    icon: icon(<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M9 13h6"></path><path d="M9 17h4"></path></>),
  },
  {
    title: 'Chia sẻ use case của bạn',
    text: 'Bấm "Chia sẻ use case" ở thanh bên: điền form từng bước (có thể kèm hình minh họa hoặc file), hoặc tải template Word về điền rồi tải lên. Admin xem và góp ý trước khi đăng; nháp được lưu tự động.',
    icon: icon(<><path d="M12 5v14"></path><path d="M5 12h14"></path><circle cx="12" cy="12" r="10"></circle></>),
  },
  {
    title: 'Thông báo, Đã lưu và Hồ sơ',
    text: 'Ở mục "Của tôi" bên trái: Thông báo khi có người trả lời, bình luận hay tag bạn; Đã lưu là các bài bạn đánh dấu; Hồ sơ gom thread và use case của bạn.',
    icon: icon(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></>),
  },
  {
    title: 'Cần giúp? Chat với Admin',
    text: 'Có câu hỏi, góp ý hay thấy lỗi, nhắn ở "Chat với Admin" trên thanh bên. Muốn xem lại hướng dẫn này: menu tài khoản ở góc dưới bên trái > Hướng dẫn sử dụng.',
    icon: icon(<><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path><path d="M8 12h.01M12 12h.01M16 12h.01"></path></>),
  },
]

export default function WelcomeTour() {
  const { user, setUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  // first visit: open by itself once the account is known
  useEffect(() => { if (user && !user.tourSeen) { setStep(0); setOpen(true) } }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onOpen = () => { setStep(0); setOpen(true) }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])
  const close = () => {
    setOpen(false)
    if (user && !user.tourSeen) api.updateMe({ tourSeen: true }).then((d) => d?.user && setUser(d.user)).catch(() => {})
  }
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setStep((s) => Math.min(STEPS.length - 1, s + 1))
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!open || !user) return null
  const s = STEPS[step]
  const last = step === STEPS.length - 1
  return createPortal(
    <div style={css('position:fixed; inset:0; z-index:5500; background:rgba(2,6,20,.66); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:16px;')}>
      <div role="dialog" aria-modal="true" aria-label={s.title} style={css('width:min(460px, 100%); background:#fff; border-radius:24px; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,.5);')}>
        <div style={css('position:relative; padding:28px 28px 22px; background:radial-gradient(120% 90% at 50% 0%, #3b6cff 0%, #1b3cb3 55%, #0b1a5c 100%); color:#fff; text-align:center;')}>
          <button onClick={close} style={css(`position:absolute; top:14px; right:16px; border:none; background:transparent; color:rgba(255,255,255,.75); font:600 12.5px ${FONT}; cursor:pointer;`)}>Bỏ qua</button>
          <div style={css('width:64px; height:64px; margin:6px auto 0; border-radius:20px; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.25); display:flex; align-items:center; justify-content:center;')}>{s.icon}</div>
          <div style={css(`margin-top:12px; font:600 11.5px ${FONT}; letter-spacing:.06em; text-transform:uppercase; color:rgba(255,255,255,.7);`)}>{step + 1} / {STEPS.length}</div>
        </div>
        <div style={css('padding:22px 26px 22px;')}>
          <h2 style={css(`margin:0; font:800 20px/1.3 ${FONT}; color:#0F172A; text-align:center;`)}>{s.title}</h2>
          <p style={css('margin:10px 0 0; font:400 14.5px/1.6 var(--zp-font-text); color:#475569; text-align:center; min-height:92px;')}>{s.text}</p>
          <div style={css('display:flex; justify-content:center; gap:6px; margin-top:14px;')}>
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} aria-label={'Trang ' + (i + 1)} style={css(`width:${i === step ? 20 : 7}px; height:7px; padding:0; border:none; border-radius:999px; background:${i === step ? '#2c5fff' : '#D5DCE8'}; cursor:pointer; transition:width .2s;`)}></button>
            ))}
          </div>
          <div style={css('display:flex; gap:10px; margin-top:20px;')}>
            {step > 0 && <button onClick={() => setStep(step - 1)} className={hoverClass('background:#F1F4FA !important;')} style={css(`flex:none; height:42px; padding:0 18px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 13.5px ${FONT}; cursor:pointer;`)}>Quay lại</button>}
            <button onClick={() => (last ? close() : setStep(step + 1))} style={css(`flex:1; height:42px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:800 13.5px ${FONT}; cursor:pointer; box-shadow:0 12px 26px rgba(44,95,255,.35);`)}>{last ? 'Bắt đầu khám phá' : 'Tiếp'}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
