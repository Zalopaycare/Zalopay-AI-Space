import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { css, hoverClass } from '../lib/style.js'
import { api } from '../lib/api.js'
import { cropCover } from '../lib/cover.js'
import { copyWithToast } from '../lib/clipboard.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useDialog } from '../hooks/useDialog.js'
import Avatar from './Avatar.jsx'
import { askRemovalReason } from './RemovalReason.jsx'

// "Sự kiện": anything happening offline that anyone can post (server: routes/events.js), shown like a
// Facebook event: cover picture, when, what, where, how many are interested, "Quan tâm" and share. Beside
// the AI Space feed on wide screens (the "Sự kiện sắp tới" rail), as a strip above it on narrow ones.
// "Quan tâm" means an email the day before; the host sees who. ?event=<id> opens one (notification links).

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const OPEN_FORM = 'zp-event-create'
/** Open the "Tạo sự kiện" form from anywhere (e.g. the post composer's hint). */
export const openEventForm = () => window.dispatchEvent(new CustomEvent(OPEN_FORM))

const DAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const p2 = (n) => String(n).padStart(2, '0')
const hm = (d) => `${p2(d.getHours())}:${p2(d.getMinutes())}`
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
/** Facebook-style: "Hôm nay lúc 18:00", "Thứ 7 này lúc 07:30", "Thứ 7, 28/11 lúc 18:00" (viewer's time zone) */
export function whenLabel(e) {
  const s = new Date(e.startsAt), now = new Date()
  const days = Math.round((dayStart(s) - dayStart(now)) / 86400000)
  const day = days === 0 ? 'Hôm nay' : days === 1 ? 'Ngày mai' : days > 1 && days < 7 ? `${DAYS[s.getDay()]} này` : `${DAYS[s.getDay()]}, ${p2(s.getDate())}/${p2(s.getMonth() + 1)}${s.getFullYear() !== now.getFullYear() ? '/' + s.getFullYear() : ''}`
  const end = e.endsAt ? new Date(e.endsAt) : null
  if (end && dayStart(end) !== dayStart(s)) return `${day} lúc ${hm(s)} – ${p2(end.getDate())}/${p2(end.getMonth() + 1)}`
  return `${day} lúc ${hm(s)}${end ? '–' + hm(end) : ''}`
}
const happeningNow = (e) => new Date(e.startsAt) <= new Date()
const eventLink = (id) => `${window.location.origin}/?event=${encodeURIComponent(id)}`
const share = (ev) => copyWithToast(eventLink(ev.id), 'Đã copy link sự kiện ✓')

/** The cover, or (without one) a gradient carrying the date. Always 16:9. */
function Cover({ ev, radius = 14 }) {
  const d = new Date(ev.startsAt)
  return (
    <div style={css(`position:relative; width:100%; aspect-ratio:16/9; border-radius:${radius}px; overflow:hidden; background:linear-gradient(135deg,#1E3A8A 0%,#2c5fff 55%,#7C3AED 100%);`)}>
      {ev.coverUrl
        ? <img src={ev.coverUrl} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : (
          <div aria-hidden="true" style={css('position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff;')}>
            <div style={css(`font:800 13px ${FONT}; letter-spacing:2px; opacity:.85;`)}>THÁNG {d.getMonth() + 1}</div>
            <div style={css(`font:800 52px/1 ${FONT};`)}>{d.getDate()}</div>
          </div>
        )}
      {happeningNow(ev) && !ev.past && <span style={css(`position:absolute; top:10px; left:10px; height:22px; padding:0 9px; border-radius:999px; background:#D8232A; color:#fff; display:inline-flex; align-items:center; font:800 11px ${FONT};`)}>Đang diễn ra</span>}
    </div>
  )
}

function InterestButton({ ev, onToggle, grow = false, height = 36 }) {
  const on = ev.interested
  return (
    <button onClick={(e) => { e.stopPropagation(); onToggle(ev) }} aria-pressed={on}
      className={hoverClass(on ? 'background:#DCE6FF !important;' : 'background:#E4E9F2 !important;')}
      style={css(`${grow ? 'flex:1 1 auto;' : 'flex:none;'} min-width:0; display:inline-flex; align-items:center; justify-content:center; gap:7px; height:${height}px; padding:0 14px; border:none; border-radius:10px; cursor:pointer; white-space:nowrap; font:700 13.5px ${FONT}; ${on ? 'background:#E7EEFF; color:#2c5fff;' : 'background:#EEF1F6; color:#0F172A;'}`)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
      {on ? 'Đã quan tâm' : 'Quan tâm'}
    </button>
  )
}
function ShareButton({ ev, height = 36 }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); share(ev) }} title="Copy link sự kiện" aria-label="Copy link sự kiện" className={hoverClass('background:#E4E9F2 !important;')}
      style={css(`flex:none; width:${height + 10}px; height:${height}px; border:none; border-radius:10px; background:#EEF1F6; color:#0F172A; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;`)}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M14 4.5V9C7 9.5 4 14 3 20c2.5-3.5 6-5.1 11-5.1v4.6l7-7.5-7-7.5z"></path></svg>
    </button>
  )
}

const countLabel = (n) => (n ? `${n} người quan tâm` : 'Chưa ai quan tâm')

/** One event as a card: cover, date line, title, place, count, buttons. */
function EventCard({ ev, onOpen, onToggle, compact = false }) {
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(ev.id)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(ev.id) }}
      style={css(`cursor:pointer; ${compact ? 'flex:none; width:250px; padding:10px; border-radius:16px; background:#fff; box-shadow:0 10px 24px rgba(3,12,40,.28); box-sizing:border-box;' : ''}`)}>
      <Cover ev={ev} radius={compact ? 10 : 14} />
      <div style={css('margin-top:10px;')}>
        <div style={css(`font:700 12.5px ${FONT}; color:#D8232A;`)}>{whenLabel(ev)}</div>
        <div style={css(`margin-top:3px; font:800 15px/1.3 ${FONT}; color:#0F172A; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word;`)}>{ev.title}</div>
        <div style={css('margin-top:3px; font:500 13px/1.4 var(--zp-font-text); color:#475569; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;')} title={ev.location}>{ev.location}</div>
        <div style={css('margin-top:3px; font:400 12.5px var(--zp-font-text); color:#64748b;')}>{countLabel(ev.interestCount)}</div>
      </div>
      <div style={css('margin-top:10px; display:flex; gap:8px;')}>
        {ev.isMine
          ? <span style={css(`flex:1; display:inline-flex; align-items:center; justify-content:center; height:36px; border-radius:10px; background:#F6F8FC; color:#64748b; font:700 12.5px ${FONT};`)}>Bạn tổ chức</span>
          : <InterestButton ev={ev} onToggle={onToggle} grow />}
        <ShareButton ev={ev} />
      </div>
    </div>
  )
}

// ---- the list: the rail (wide screens) or the strip above the feed (narrow ones) ----
export default function EventsPanel({ layout = 'rail' }) {
  const { user, requireLogin } = useAuth()
  const [events, setEvents] = useState(null)
  const [openId, setOpenId] = useState(() => new URLSearchParams(window.location.search).get('event'))
  const [form, setForm] = useState(null) // null | {} (new) | event (edit)
  const reload = () => api.listEvents().then((d) => setEvents(d.events || [])).catch(() => setEvents((x) => x || []))
  useEffect(() => { reload() }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const on = () => requireLogin(() => setForm({}))
    window.addEventListener(OPEN_FORM, on)
    return () => window.removeEventListener(OPEN_FORM, on)
  }, [requireLogin])
  const put = (ev) => setEvents((list) => (list || []).map((x) => (x.id === ev.id ? ev : x)))
  const toggle = (ev) => requireLogin(() => api.toggleEventInterest(ev.id).then((d) => put(d.event)).catch(() => {}))
  const close = () => {
    setOpenId(null)
    const u = new URL(window.location.href)
    if (u.searchParams.has('event')) { u.searchParams.delete('event'); window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash) }
  }
  const create = () => requireLogin(() => setForm({}))
  const list = events || []

  return (
    <>
      {layout === 'rail' ? (
        <aside data-tour="events" aria-label="Sự kiện sắp tới" style={css('background:#fff; border-radius:20px; box-shadow:0 14px 34px rgba(3,12,40,.3); padding:18px 16px 6px;')}>
          <div style={css(`font:800 17px ${FONT}; color:#0F172A;`)}>Sự kiện sắp tới</div>
          <div style={css('margin-top:3px; font:400 12.5px/1.5 var(--zp-font-text); color:#64748b;')}>Đồng nghiệp tổ chức offline, bấm Quan tâm nếu bạn muốn đến</div>
          <button onClick={create} className={hoverClass('filter:brightness(1.06);')} style={css(`margin-top:12px; width:100%; height:38px; border:none; border-radius:10px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; font:700 13.5px ${FONT}; cursor:pointer; box-shadow:0 8px 18px rgba(44,95,255,.3);`)}>+ Tạo sự kiện</button>
          {events && !list.length && (
            <div style={css('margin:14px 0 12px; font:400 13px/1.6 var(--zp-font-text); color:#64748b;')}>
              Chưa có sự kiện nào sắp tới. Workshop, gặp mặt, xem chung, ăn mừng… bạn muốn rủ mọi người điều gì thì tạo một sự kiện nhé.
            </div>
          )}
          {list.map((ev) => (
            <div key={ev.id} style={css('padding:16px 0 14px; border-bottom:1px solid #EEF1F7;')}>
              <EventCard ev={ev} onOpen={setOpenId} onToggle={toggle} />
            </div>
          ))}
        </aside>
      ) : (
        <div data-tour="events" style={css('margin-bottom:14px;')}>
          <div style={css('display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:9px;')}>
            <div style={css('min-width:0;')}>
              <div style={css(`font:800 15px ${FONT}; color:#fff;`)}>Sự kiện sắp tới</div>
              <div style={css('font:400 12px/1.4 var(--zp-font-text); color:#a9b8dc;')}>Đồng nghiệp tổ chức offline</div>
            </div>
            <button onClick={create} style={css(`flex:none; height:32px; padding:0 13px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; cursor:pointer; font:700 12.5px ${FONT}; white-space:nowrap;`)}>+ Tạo sự kiện</button>
          </div>
          {events && !list.length ? (
            <div style={css('padding:12px 14px; border-radius:14px; background:rgba(255,255,255,.06); border:1px dashed rgba(160,196,255,.3); font:400 13px/1.5 var(--zp-font-text); color:#a9b8dc;')}>Chưa có sự kiện nào sắp tới. Muốn rủ mọi người điều gì? Bấm <b>+ Tạo sự kiện</b>.</div>
          ) : (
            <div className="zp-noscrollbar" style={css('display:flex; gap:10px; overflow-x:auto; padding-bottom:4px;')}>
              {list.map((ev) => <EventCard key={ev.id} ev={ev} onOpen={setOpenId} onToggle={toggle} compact />)}
            </div>
          )}
        </div>
      )}
      {openId && <EventDialog id={openId} known={list.find((x) => x.id === openId)} onClose={close} onChanged={put}
        onEdit={(ev) => { close(); setForm(ev) }} onDeleted={() => { close(); reload() }} />}
      {form && <EventForm initial={form} onClose={() => setForm(null)} onSaved={(ev) => { setForm(null); reload(); setOpenId(ev.id) }} />}
    </>
  )
}

// ---- one event, in full ----
function EventDialog({ id, known, onClose, onChanged, onEdit, onDeleted }) {
  const { requireLogin } = useAuth()
  const [ev, setEv] = useState(known || null)
  const [missing, setMissing] = useState(false)
  const dialog = useDialog(true, onClose, 'Sự kiện')
  useEffect(() => { api.getEvent(id).then((d) => setEv(d.event)).catch(() => setMissing(true)) }, [id])
  const toggle = () => requireLogin(() => api.toggleEventInterest(id).then((d) => { setEv((x) => ({ ...d.event, past: x?.past })); onChanged(d.event) }).catch(() => {}))
  const remove = () => {
    if (ev.isMine) {
      if (!window.confirm(`Huỷ sự kiện "${ev.title}"? ${ev.interestCount ? `${ev.interestCount} người đã quan tâm sẽ nhận thông báo huỷ.` : ''}`)) return
      api.deleteEvent(ev.id).then(onDeleted).catch(() => window.alert('Chưa huỷ được, thử lại nhé.'))
    } else {
      askRemovalReason({ what: 'sự kiện', title: ev.title }).then((r) => r && api.deleteEvent(ev.id, r).then(onDeleted).catch(() => window.alert('Chưa xoá được, thử lại nhé.')))
    }
  }
  const row = (icon, text) => (
    <div style={css('display:flex; align-items:flex-start; gap:10px; margin-top:9px; font:500 14px/1.5 var(--zp-font-text); color:#334155;')}>
      <span style={css('flex:none; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; color:#64748b; margin-top:1px;')}>{icon}</span><span style={{ minWidth: 0 }}>{text}</span>
    </div>
  )
  const grayBtn = `display:inline-flex; align-items:center; justify-content:center; gap:7px; height:40px; padding:0 16px; border:none; border-radius:10px; background:#EEF1F6; color:#0F172A; cursor:pointer; font:700 13.5px ${FONT};`
  return createPortal(
    <div className="zp-overlay-in" onClick={onClose} style={css('position:fixed; inset:0; z-index:4000; background:rgba(4,10,26,.66); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); display:flex; align-items:flex-start; justify-content:center; padding:40px 16px; overflow-y:auto;')}>
      <div ref={dialog.ref} {...dialog.dialogProps} className="zp-dialog-in" onClick={(e) => e.stopPropagation()} style={css('position:relative; width:600px; max-width:100%; margin:auto 0; background:#fff; border-radius:22px; box-shadow:0 30px 80px rgba(0,0,0,.45); overflow:hidden; color-scheme:light;')}>
        <button onClick={onClose} aria-label="Đóng" style={css('position:absolute; top:12px; right:12px; z-index:2; width:34px; height:34px; border:none; border-radius:50%; background:rgba(15,23,42,.6); color:#fff; cursor:pointer; font-size:16px;')}>✕</button>
        {!ev ? (
          <div style={css('padding:56px 20px; text-align:center; font:600 14px var(--zp-font-text); color:#64748b;')}>{missing ? 'Không tìm thấy sự kiện này. Có thể đã bị huỷ.' : 'Đang tải…'}</div>
        ) : (<>
          <Cover ev={ev} radius={0} />
          <div style={css('padding:18px 22px 0;')}>
            <div style={css(`font:700 14px ${FONT}; color:#D8232A;`)}>{ev.past ? 'Đã diễn ra · ' : ''}{whenLabel(ev)}</div>
            <h2 style={css(`margin:5px 0 0; font:800 22px/1.3 ${FONT}; color:#0F172A; word-break:break-word;`)}>{ev.title}</h2>
            {row(<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"></path><circle cx="12" cy="9.5" r="2.5"></circle></svg>, ev.location)}
            {ev.host && row(<Avatar user={ev.host} size={20} fontSize={8} />, <>Tổ chức bởi <b style={css('color:#0F172A;')}>{ev.host.name}</b></>)}
            {row(<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>, countLabel(ev.interestCount))}
          </div>
          <div style={css('display:flex; gap:8px; padding:16px 22px 0;')}>
            {!ev.past && !ev.isMine && <InterestButton ev={ev} onToggle={toggle} grow height={40} />}
            <button onClick={() => share(ev)} className={hoverClass('background:#E4E9F2 !important;')} style={css((ev.past || ev.isMine ? 'flex:1;' : 'flex:none;') + grayBtn)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 4.5V9C7 9.5 4 14 3 20c2.5-3.5 6-5.1 11-5.1v4.6l7-7.5-7-7.5z"></path></svg>
              Chia sẻ
            </button>
            {ev.isMine && <button onClick={() => onEdit(ev)} className={hoverClass('background:#E4E9F2 !important;')} style={css('flex:none;' + grayBtn)}>Sửa</button>}
          </div>
          {ev.description && (
            <div style={css('margin:18px 22px 0;')}>
              <div style={css(`font:800 15px ${FONT}; color:#0F172A;`)}>Chi tiết</div>
              <div style={css('margin-top:6px; font:400 14px/1.65 var(--zp-font-text); color:#334155; white-space:pre-wrap; word-break:break-word;')}>{ev.description}</div>
            </div>
          )}
          {ev.people.length > 0 && (
            <div style={css('margin:18px 22px 0;')}>
              <div style={css(`font:800 15px ${FONT}; color:#0F172A;`)}>Người quan tâm</div>
              <div style={css('margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;')}>
                {ev.people.map((p) => (
                  <span key={p.id} title={p.fullName || p.name} style={css('display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 10px 0 4px; border-radius:999px; background:#F1F4FA; font:600 12px var(--zp-font-text); color:#334155;')}><Avatar user={p} size={20} fontSize={8} />{p.name}</span>
                ))}
                {ev.interestCount > ev.people.length && <span style={css('display:inline-flex; align-items:center; height:28px; padding:0 10px; font:600 12px var(--zp-font-text); color:#64748b;')}>+{ev.interestCount - ev.people.length} người khác</span>}
              </div>
            </div>
          )}
          <div style={css('display:flex; align-items:center; gap:12px; padding:18px 22px 20px; margin-top:18px; border-top:1px solid #EEF1F7;')}>
            <div style={css('flex:1; font:400 12px/1.5 var(--zp-font-text); color:#94a3b8;')}>{!ev.past && !ev.isMine ? 'Bấm Quan tâm để nhận email nhắc trước 1 ngày, và khi sự kiện đổi giờ, đổi chỗ hay huỷ.' : ''}</div>
            {ev.canEdit && <button onClick={remove} style={css(`flex:none; height:32px; padding:0 14px; border:1px solid #F5C9CB; border-radius:999px; background:#fff; color:#D8232A; font:700 12.5px ${FONT}; cursor:pointer;`)}>{ev.isMine ? 'Huỷ sự kiện' : 'Xoá'}</button>}
          </div>
        </>)}
      </div>
    </div>,
    document.body,
  )
}

// ---- create / edit ----
const localDate = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` }
function EventForm({ initial, onClose, onSaved }) {
  const editing = !!initial.id
  const [title, setTitle] = useState(initial.title || '')
  const [date, setDate] = useState(initial.startsAt ? localDate(initial.startsAt) : '')
  const [start, setStart] = useState(initial.startsAt ? hm(new Date(initial.startsAt)) : '')
  const [end, setEnd] = useState(initial.endsAt ? hm(new Date(initial.endsAt)) : '')
  const [location, setLocation] = useState(initial.location || '')
  const [description, setDescription] = useState(initial.description || '')
  // undefined = keep the cover already saved; null = remove it; a data URL = the new one
  const [cover, setCover] = useState(undefined)
  const [coverNote, setCoverNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const dialog = useDialog(true, onClose, editing ? 'Sửa sự kiện' : 'Tạo sự kiện')
  const preview = cover === undefined ? initial.coverUrl || null : cover
  const ready = title.trim() && date && start && location.trim()
  const pick = (file) => cropCover(file).then((r) => { setCover(r.data); setCoverNote(r.note) }).catch((e) => e.message && setCoverNote(e.message))
  const save = () => {
    if (!ready) { setError('Điền tên, ngày, giờ bắt đầu và địa điểm nhé.'); return }
    const startsAt = new Date(`${date}T${start}`)
    const endsAt = end ? new Date(`${date}T${end}`) : null
    if (endsAt && endsAt <= startsAt) { setError('Giờ kết thúc phải sau giờ bắt đầu.'); return }
    setBusy(true); setError('')
    const payload = { title, description, location, startsAt: startsAt.toISOString(), endsAt: endsAt ? endsAt.toISOString() : null, ...(cover !== undefined ? { cover } : {}) }
    ;(editing ? api.updateEvent(initial.id, payload) : api.createEvent(payload))
      .then((d) => onSaved(d.event))
      .catch((e) => setError(e?.data?.message || 'Chưa lưu được, thử lại nhé.'))
      .finally(() => setBusy(false))
  }
  const label = (text, req) => <div style={css(`font:700 13px ${FONT}; color:#0F172A;`)}>{text}{req && <span style={css('color:#D8232A;')}> *</span>}</div>
  const field = 'width:100%; box-sizing:border-box; margin-top:6px; height:42px; padding:0 13px; border:1px solid #E6EBF3; border-radius:12px; background:#fff; color:#0F172A; font:500 14px var(--zp-font-text); outline:none; color-scheme:light;'
  const pill = `height:30px; padding:0 12px; border:none; border-radius:999px; background:rgba(15,23,42,.7); color:#fff; font:700 12px ${FONT}; cursor:pointer;`
  return createPortal(
    <div className="zp-overlay-in" onClick={onClose} style={css('position:fixed; inset:0; z-index:4000; background:rgba(4,10,26,.66); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); display:flex; align-items:flex-start; justify-content:center; padding:40px 16px; overflow-y:auto;')}>
      <div ref={dialog.ref} {...dialog.dialogProps} className="zp-dialog-in" onClick={(e) => e.stopPropagation()} style={css('width:580px; max-width:100%; margin:auto 0; background:#fff; border-radius:22px; box-shadow:0 30px 80px rgba(0,0,0,.45); overflow:hidden; color-scheme:light;')}>
        <div style={css('display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:16px 20px; border-bottom:1px solid #EEF1F7;')}>
          <button onClick={onClose} style={css(`justify-self:start; border:none; background:none; padding:0; cursor:pointer; font:500 15px ${FONT}; color:#0F172A;`)}>Huỷ</button>
          <div style={css(`font:800 16px ${FONT}; color:#0F172A;`)}>{editing ? 'Sửa sự kiện' : 'Tạo sự kiện'}</div>
          <span />
        </div>
        <div style={css('padding:18px 22px 4px;')}>
          {!editing && (
            <div style={css('padding:11px 14px; border-radius:12px; background:#F5F8FF; border:1px solid #DCE5FA; font:400 13px/1.6 var(--zp-font-text); color:#3A4757;')}>
              Sự kiện là thứ diễn ra <b>offline</b>: workshop, gặp mặt, xem chung, ăn mừng… có ngày giờ và địa điểm, mọi người bấm Quan tâm nếu muốn đến. Muốn hỏi hay bàn luận online thì dùng <b>Đăng post</b>.
            </div>
          )}
          <div style={css('margin-top:16px;')}>
            {label('Ảnh bìa')}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f) }} />
            {preview ? (
              <div style={css('position:relative; margin-top:6px;')}>
                <img src={preview} alt="" style={css('display:block; width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:12px;')} />
                <div style={css('position:absolute; right:8px; bottom:8px; display:flex; gap:6px;')}>
                  <button onClick={() => fileRef.current?.click()} style={css(pill)}>Đổi ảnh</button>
                  <button onClick={() => { setCover(null); setCoverNote('') }} style={css(pill)}>Bỏ ảnh</button>
                </div>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className={hoverClass('background:#EEF3FF !important; border-color:#9DB5F5 !important;')} style={css(`margin-top:6px; width:100%; aspect-ratio:16/6; border:1.5px dashed #C9D6F2; border-radius:12px; background:#F7F9FE; color:#2c5fff; cursor:pointer; font:700 13.5px ${FONT};`)}>
                + Thêm ảnh bìa <span style={css('display:block; margin-top:4px; font:400 12px var(--zp-font-text); color:#64748b;')}>Không bắt buộc · ảnh ngang 16:9</span>
              </button>
            )}
            {coverNote && <div style={css('margin-top:6px; font:400 12px/1.5 var(--zp-font-text); color:#64748b;')}>{coverNote}</div>}
          </div>
          <div style={css('margin-top:14px;')}>{label('Tên sự kiện', true)}<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Ví dụ: Xem chung chung kết, Workshop prompt cho PM" style={css(field)} /></div>
          <div style={css('margin-top:14px; display:grid; grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr); gap:10px;')}>
            <div>{label('Ngày', true)}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={css(field)} /></div>
            <div>{label('Bắt đầu', true)}<input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={css(field)} /></div>
            <div>{label('Kết thúc')}<input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={css(field)} /></div>
          </div>
          <div style={css('margin-top:14px;')}>{label('Địa điểm', true)}<input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="Ví dụ: Pantry tầng 6, hay một quán gần công ty" style={css(field)} /></div>
          <div style={css('margin-top:14px;')}>{label('Chi tiết')}<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={4000} placeholder="Sự kiện có gì, dành cho ai, cần mang gì theo…" style={css(field + 'height:auto; padding:11px 13px; line-height:1.6; resize:vertical;')} /></div>
          {error && <div style={css(`margin-top:10px; font:600 13px ${FONT}; color:#D8232A;`)}>{error}</div>}
        </div>
        <div style={css('display:flex; justify-content:flex-end; gap:10px; padding:16px 22px 20px;')}>
          <button onClick={save} disabled={busy} style={css(`height:44px; padding:0 24px; border:none; border-radius:999px; background:${ready ? 'linear-gradient(180deg,#4480ff,#2c5fff)' : '#E3E8F2'}; color:${ready ? '#fff' : '#94a3b8'}; font:700 14px ${FONT}; cursor:pointer; opacity:${busy ? 0.6 : 1};`)}>{busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Đăng sự kiện'}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
