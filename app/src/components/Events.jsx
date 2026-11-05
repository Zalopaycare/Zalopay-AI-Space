import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { css, hoverClass } from '../lib/style.js'
import { api } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useDialog } from '../hooks/useDialog.js'
import Avatar from './Avatar.jsx'
import { askRemovalReason } from './RemovalReason.jsx'

// "Buổi chia sẻ": offline sessions anyone can post (server: routes/events.js). Beside the AI Space feed
// on wide screens (the "Sắp diễn ra" rail), as a strip above it on narrow ones. A session always has a
// date, a time and a place: that is what tells it apart from a post. "Quan tâm" means a reminder by
// email the day before, and the host sees who's coming. ?event=<id> opens one (notification links).

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const OPEN_FORM = 'zp-event-create'
/** Open the "Tạo buổi chia sẻ" form from anywhere (e.g. the post composer's hint). */
export const openEventForm = () => window.dispatchEvent(new CustomEvent(OPEN_FORM))

const DAYS = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const p2 = (n) => String(n).padStart(2, '0')
const hm = (d) => `${p2(d.getHours())}:${p2(d.getMinutes())}`
/** "Thứ 5, 12/11 · 14:00–15:30" (the viewer's own time zone) */
export function whenLabel(e) {
  const s = new Date(e.startsAt)
  return `${DAYS[s.getDay()]}, ${p2(s.getDate())}/${p2(s.getMonth() + 1)} · ${hm(s)}${e.endsAt ? '–' + hm(new Date(e.endsAt)) : ''}`
}
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
function soonLabel(e) {
  const s = new Date(e.startsAt), now = new Date()
  if (s <= now) return 'Đang diễn ra'
  if (sameDay(s, now)) return 'Hôm nay'
  if (sameDay(s, new Date(now.getTime() + 86400000))) return 'Ngày mai'
  return ''
}

function DateTile({ iso, size = 46 }) {
  const d = new Date(iso)
  return (
    <div aria-hidden="true" style={css(`flex:none; width:${size}px; border-radius:12px; overflow:hidden; text-align:center; background:#fff; border:1px solid #D7E0F7; box-shadow:0 4px 12px rgba(44,95,255,.12);`)}>
      <div style={css(`background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; font:800 ${Math.round(size * 0.2)}px/1 ${FONT}; padding:4px 0 3px; letter-spacing:.3px;`)}>THG {d.getMonth() + 1}</div>
      <div style={css(`font:800 ${Math.round(size * 0.42)}px/1.15 ${FONT}; color:#0F172A; padding:3px 0 4px;`)}>{d.getDate()}</div>
    </div>
  )
}

function InterestButton({ ev, onToggle, small = false }) {
  const on = ev.interested
  return (
    <button onClick={(e) => { e.stopPropagation(); onToggle(ev) }} aria-pressed={on}
      className={hoverClass(on ? 'background:#E3EBFF !important;' : 'background:#F3F6FF !important; border-color:#9DB5F5 !important;')}
      style={css(`flex:none; display:inline-flex; align-items:center; gap:5px; height:${small ? 28 : 38}px; padding:0 ${small ? 11 : 16}px; border-radius:999px; cursor:pointer; white-space:nowrap; font:700 ${small ? 12 : 13.5}px ${FONT}; ${on ? 'background:#EEF3FF; border:1px solid #2c5fff; color:#2c5fff;' : 'background:#fff; border:1px solid #D7E0F7; color:#1E3A7A;'}`)}>
      <svg width={small ? 13 : 15} height={small ? 13 : 15} viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
      {on ? 'Đã quan tâm' : 'Quan tâm'}
    </button>
  )
}

const countLabel = (n) => (n ? `${n} người quan tâm` : 'Chưa ai quan tâm')

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
  const open = (id) => setOpenId(id)
  const close = () => {
    setOpenId(null)
    const u = new URL(window.location.href)
    if (u.searchParams.has('event')) { u.searchParams.delete('event'); window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash) }
  }
  const create = () => requireLogin(() => setForm({}))
  const list = events || []

  const rail = layout === 'rail'
  return (
    <>
      {rail ? (
        <aside data-tour="events" aria-label="Buổi chia sẻ sắp diễn ra" style={css('background:#fff; border-radius:20px; box-shadow:0 14px 34px rgba(3,12,40,.3); overflow:hidden;')}>
          <div style={css('padding:18px 18px 12px;')}>
            <div style={css(`font:800 16px ${FONT}; color:#0F172A;`)}>Sắp diễn ra</div>
            <div style={css('margin-top:3px; font:400 12.5px/1.5 var(--zp-font-text); color:#64748b;')}>Buổi chia sẻ offline do đồng nghiệp tổ chức</div>
            <button onClick={create} className={hoverClass('filter:brightness(1.06);')} style={css(`margin-top:12px; width:100%; height:38px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; font:700 13.5px ${FONT}; cursor:pointer; box-shadow:0 8px 18px rgba(44,95,255,.3);`)}>+ Tạo buổi chia sẻ</button>
          </div>
          {events && !list.length && (
            <div style={css('padding:14px 18px 20px; border-top:1px solid #EEF1F7; font:400 13px/1.6 var(--zp-font-text); color:#64748b;')}>
              Chưa có buổi nào sắp tới. Bạn muốn demo, chia sẻ kinh nghiệm hay rủ mọi người cùng thử một công cụ AI? Tạo một buổi, đồng nghiệp bấm <b style={css('color:#1E3A7A;')}>Quan tâm</b> để được nhắc lịch.
            </div>
          )}
          {list.map((ev) => (
            <div key={ev.id} role="button" tabIndex={0} onClick={() => open(ev.id)} onKeyDown={(e) => { if (e.key === 'Enter') open(ev.id) }} className={hoverClass('background:#F7F9FE;')}
              style={css('display:flex; gap:12px; padding:14px 18px; border-top:1px solid #EEF1F7; cursor:pointer; transition:background .15s;')}>
              <DateTile iso={ev.startsAt} />
              <div style={css('flex:1; min-width:0;')}>
                {soonLabel(ev) && <div style={css(`font:800 11px ${FONT}; color:#D8232A; letter-spacing:.2px;`)}>{soonLabel(ev)}</div>}
                <div style={css(`font:700 14px/1.35 ${FONT}; color:#0F172A; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;`)}>{ev.title}</div>
                <div style={css('margin-top:3px; font:400 12px/1.45 var(--zp-font-text); color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;')} title={`${whenLabel(ev)} · ${ev.location}`}>{whenLabel(ev).split(' · ')[1]} · {ev.location}</div>
                <div style={css('margin-top:8px; display:flex; align-items:center; justify-content:space-between; gap:8px;')}>
                  <span style={css('font:600 11.5px var(--zp-font-text); color:#94a3b8; white-space:nowrap;')}>{ev.interestCount ? `${ev.interestCount} quan tâm` : ''}</span>
                  {ev.isMine ? <span style={css(`flex:none; display:inline-flex; align-items:center; height:28px; padding:0 11px; border-radius:999px; background:#F1F4FA; color:#475569; font:700 12px ${FONT}; white-space:nowrap;`)}>Bạn tổ chức</span> : <InterestButton ev={ev} onToggle={toggle} small />}
                </div>
              </div>
            </div>
          ))}
        </aside>
      ) : (
        <div data-tour="events" style={css('margin-bottom:14px;')}>
          <div style={css('display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:9px;')}>
            <div style={css('min-width:0;')}>
              <div style={css(`font:800 15px ${FONT}; color:#fff;`)}>Sắp diễn ra</div>
              <div style={css('font:400 12px/1.4 var(--zp-font-text); color:#a9b8dc;')}>Buổi chia sẻ offline do đồng nghiệp tổ chức</div>
            </div>
            <button onClick={create} style={css(`flex:none; height:32px; padding:0 13px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; cursor:pointer; font:700 12.5px ${FONT}; white-space:nowrap;`)}>+ Tạo buổi</button>
          </div>
          {events && !list.length ? (
            <div style={css('padding:12px 14px; border-radius:14px; background:rgba(255,255,255,.06); border:1px dashed rgba(160,196,255,.3); font:400 13px/1.5 var(--zp-font-text); color:#a9b8dc;')}>Chưa có buổi nào sắp tới. Muốn hẹn mọi người gặp offline? Bấm <b>+ Tạo buổi chia sẻ</b>.</div>
          ) : (
            <div style={css('display:flex; gap:10px; overflow-x:auto; padding-bottom:4px; scrollbar-width:thin;')}>
              {list.map((ev) => (
                <div key={ev.id} role="button" tabIndex={0} onClick={() => open(ev.id)} onKeyDown={(e) => { if (e.key === 'Enter') open(ev.id) }}
                  style={css('flex:none; width:260px; display:flex; gap:10px; padding:12px; border-radius:16px; background:#fff; box-shadow:0 10px 24px rgba(3,12,40,.28); cursor:pointer; box-sizing:border-box;')}>
                  <DateTile iso={ev.startsAt} size={40} />
                  <div style={css('flex:1; min-width:0;')}>
                    <div style={css(`font:700 13.5px/1.35 ${FONT}; color:#0F172A; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`)}>{ev.title}</div>
                    <div style={css('margin-top:2px; font:400 12px var(--zp-font-text); color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;')}>{whenLabel(ev).split(' · ')[1]} · {ev.location}</div>
                    <div style={css('margin-top:7px;')}>{ev.isMine ? <span style={css(`flex:none; display:inline-flex; align-items:center; height:28px; padding:0 11px; border-radius:999px; background:#F1F4FA; color:#475569; font:700 12px ${FONT}; white-space:nowrap;`)}>Bạn tổ chức</span> : <InterestButton ev={ev} onToggle={toggle} small />}</div>
                  </div>
                </div>
              ))}
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

// ---- one session, in full ----
function EventDialog({ id, known, onClose, onChanged, onEdit, onDeleted }) {
  const { requireLogin } = useAuth()
  const [ev, setEv] = useState(known || null)
  const [missing, setMissing] = useState(false)
  const dialog = useDialog(true, onClose, 'Buổi chia sẻ')
  useEffect(() => { api.getEvent(id).then((d) => setEv(d.event)).catch(() => setMissing(true)) }, [id])
  const toggle = () => requireLogin(() => api.toggleEventInterest(id).then((d) => { setEv((x) => ({ ...d.event, past: x?.past })); onChanged(d.event) }).catch(() => {}))
  const remove = () => {
    if (ev.isMine) {
      if (!window.confirm(`Huỷ buổi chia sẻ "${ev.title}"? ${ev.interestCount ? `${ev.interestCount} người đã quan tâm sẽ nhận thông báo huỷ.` : ''}`)) return
      api.deleteEvent(ev.id).then(onDeleted).catch(() => window.alert('Chưa huỷ được, thử lại nhé.'))
    } else {
      askRemovalReason({ what: 'buổi chia sẻ', title: ev.title }).then((r) => r && api.deleteEvent(ev.id, r).then(onDeleted).catch(() => window.alert('Chưa xoá được, thử lại nhé.')))
    }
  }
  const row = (icon, text) => (
    <div style={css('display:flex; align-items:flex-start; gap:10px; margin-top:10px; font:500 14px/1.5 var(--zp-font-text); color:#334155;')}>
      <span style={css('flex:none; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; color:#2c5fff; margin-top:1px;')}>{icon}</span><span style={{ minWidth: 0 }}>{text}</span>
    </div>
  )
  return createPortal(
    <div className="zp-overlay-in" onClick={onClose} style={css('position:fixed; inset:0; z-index:4000; background:rgba(4,10,26,.66); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); display:flex; align-items:flex-start; justify-content:center; padding:40px 16px; overflow-y:auto;')}>
      <div ref={dialog.ref} {...dialog.dialogProps} className="zp-dialog-in" onClick={(e) => e.stopPropagation()} style={css('width:560px; max-width:100%; margin:auto 0; background:#fff; border-radius:22px; box-shadow:0 30px 80px rgba(0,0,0,.45); overflow:hidden; color-scheme:light;')}>
        {!ev ? (
          <div style={css('padding:48px 20px; text-align:center; font:600 14px var(--zp-font-text); color:#64748b;')}>{missing ? 'Không tìm thấy buổi chia sẻ này. Có thể đã bị huỷ.' : 'Đang tải…'}</div>
        ) : (<>
          <div style={css('display:flex; gap:14px; padding:22px 22px 0;')}>
            <DateTile iso={ev.startsAt} size={58} />
            <div style={css('flex:1; min-width:0;')}>
              <div style={css(`font:800 11.5px ${FONT}; color:#2c5fff; letter-spacing:.3px;`)}>BUỔI CHIA SẺ OFFLINE{ev.past ? ' · ĐÃ DIỄN RA' : soonLabel(ev) ? ' · ' + soonLabel(ev).toUpperCase() : ''}</div>
              <h2 style={css(`margin:4px 0 0; font:800 20px/1.3 ${FONT}; color:#0F172A; word-break:break-word;`)}>{ev.title}</h2>
            </div>
            <button onClick={onClose} aria-label="Đóng" style={css('flex:none; align-self:flex-start; width:32px; height:32px; border:none; border-radius:50%; background:#F1F4FA; color:#475569; cursor:pointer; font-size:16px;')}>✕</button>
          </div>
          <div style={css('padding:6px 22px 0;')}>
            {row(<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>, whenLabel(ev))}
            {row(<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"></path><circle cx="12" cy="9.5" r="2.5"></circle></svg>, ev.location)}
            {ev.host && row(<Avatar user={ev.host} size={20} fontSize={8} />, <>Tổ chức bởi <b style={css('color:#0F172A;')}>{ev.host.name}</b></>)}
          </div>
          {ev.description && <div style={css('margin:16px 22px 0; padding:14px 16px; border-radius:14px; background:#F7F9FD; font:400 14px/1.65 var(--zp-font-text); color:#334155; white-space:pre-wrap; word-break:break-word;')}>{ev.description}</div>}
          <div style={css('margin:16px 22px 0;')}>
            <div style={css(`font:700 13px ${FONT}; color:#0F172A;`)}>{countLabel(ev.interestCount)}</div>
            {ev.people.length > 0 && (
              <div style={css('margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;')}>
                {ev.people.map((p) => (
                  <span key={p.id} title={p.fullName || p.name} style={css('display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 10px 0 4px; border-radius:999px; background:#F1F4FA; font:600 12px var(--zp-font-text); color:#334155;')}><Avatar user={p} size={20} fontSize={8} />{p.name}</span>
                ))}
                {ev.interestCount > ev.people.length && <span style={css('display:inline-flex; align-items:center; height:28px; padding:0 10px; font:600 12px var(--zp-font-text); color:#64748b;')}>+{ev.interestCount - ev.people.length} người khác</span>}
              </div>
            )}
          </div>
          <div style={css('display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:18px 22px 22px; margin-top:16px; border-top:1px solid #EEF1F7;')}>
            {!ev.past && !ev.isMine && <InterestButton ev={ev} onToggle={toggle} />}
            <a href={`/api/events/${encodeURIComponent(ev.id)}/calendar.ics`} download className={hoverClass('background:#F3F6FF !important;')} style={css(`display:inline-flex; align-items:center; gap:6px; height:38px; padding:0 16px; border-radius:999px; border:1px solid #D7E0F7; background:#fff; color:#1E3A7A; font:700 13.5px ${FONT}; text-decoration:none; white-space:nowrap;`)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4"></path></svg>
              Thêm vào lịch Outlook
            </a>
            {ev.canEdit && (
              <span style={css('margin-left:auto; display:inline-flex; gap:8px;')}>
                {ev.isMine && <button onClick={() => onEdit(ev)} style={css(`height:34px; padding:0 14px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 12.5px ${FONT}; cursor:pointer;`)}>Sửa</button>}
                <button onClick={remove} style={css(`height:34px; padding:0 14px; border:1px solid #F5C9CB; border-radius:999px; background:#fff; color:#D8232A; font:700 12.5px ${FONT}; cursor:pointer;`)}>{ev.isMine ? 'Huỷ buổi này' : 'Xoá'}</button>
              </span>
            )}
          </div>
          {!ev.past && !ev.isMine && <div style={css('margin:-10px 22px 18px; font:400 12px/1.5 var(--zp-font-text); color:#94a3b8;')}>Bấm Quan tâm để nhận email nhắc trước 1 ngày, và khi buổi này đổi giờ, đổi chỗ hay huỷ.</div>}
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
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const dialog = useDialog(true, onClose, editing ? 'Sửa buổi chia sẻ' : 'Tạo buổi chia sẻ')
  const ready = title.trim() && date && start && location.trim()
  const save = () => {
    if (!ready) { setError('Điền tên, ngày, giờ bắt đầu và địa điểm nhé.'); return }
    const startsAt = new Date(`${date}T${start}`)
    const endsAt = end ? new Date(`${date}T${end}`) : null
    if (endsAt && endsAt <= startsAt) { setError('Giờ kết thúc phải sau giờ bắt đầu.'); return }
    setBusy(true); setError('')
    const payload = { title, description, location, startsAt: startsAt.toISOString(), endsAt: endsAt ? endsAt.toISOString() : null }
    ;(editing ? api.updateEvent(initial.id, payload) : api.createEvent(payload))
      .then((d) => onSaved(d.event))
      .catch((e) => setError(e?.data?.message || 'Chưa lưu được, thử lại nhé.'))
      .finally(() => setBusy(false))
  }
  const label = (text, req) => <div style={css(`font:700 13px ${FONT}; color:#0F172A;`)}>{text}{req && <span style={css('color:#D8232A;')}> *</span>}</div>
  const field = 'width:100%; box-sizing:border-box; margin-top:6px; height:42px; padding:0 13px; border:1px solid #E6EBF3; border-radius:12px; background:#fff; color:#0F172A; font:500 14px var(--zp-font-text); outline:none; color-scheme:light;'
  return createPortal(
    <div className="zp-overlay-in" onClick={onClose} style={css('position:fixed; inset:0; z-index:4000; background:rgba(4,10,26,.66); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); display:flex; align-items:flex-start; justify-content:center; padding:40px 16px; overflow-y:auto;')}>
      <div ref={dialog.ref} {...dialog.dialogProps} className="zp-dialog-in" onClick={(e) => e.stopPropagation()} style={css('width:580px; max-width:100%; margin:auto 0; background:#fff; border-radius:22px; box-shadow:0 30px 80px rgba(0,0,0,.45); overflow:hidden; color-scheme:light;')}>
        <div style={css('display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:16px 20px; border-bottom:1px solid #EEF1F7;')}>
          <button onClick={onClose} style={css(`justify-self:start; border:none; background:none; padding:0; cursor:pointer; font:500 15px ${FONT}; color:#0F172A;`)}>Huỷ</button>
          <div style={css(`font:800 16px ${FONT}; color:#0F172A;`)}>{editing ? 'Sửa buổi chia sẻ' : 'Tạo buổi chia sẻ'}</div>
          <span />
        </div>
        <div style={css('padding:18px 22px 4px;')}>
          {!editing && (
            <div style={css('padding:11px 14px; border-radius:12px; background:#F5F8FF; border:1px solid #DCE5FA; font:400 13px/1.6 var(--zp-font-text); color:#3A4757;')}>
              Buổi chia sẻ là <b>hẹn gặp offline</b>: có ngày giờ và địa điểm, đồng nghiệp bấm Quan tâm để được nhắc lịch. Muốn hỏi hay bàn luận online thì dùng <b>Đăng post</b>.
            </div>
          )}
          <div style={css('margin-top:16px;')}>{label('Tên buổi chia sẻ', true)}<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Ví dụ: Demo dùng Claude đọc hợp đồng" style={css(field)} /></div>
          <div style={css('margin-top:14px; display:grid; grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr); gap:10px;')}>
            <div>{label('Ngày', true)}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={css(field)} /></div>
            <div>{label('Bắt đầu', true)}<input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={css(field)} /></div>
            <div>{label('Kết thúc')}<input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={css(field)} /></div>
          </div>
          <div style={css('margin-top:14px;')}>{label('Địa điểm', true)}<input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="Ví dụ: Phòng Mercury, tầng 5 (hoặc link Teams)" style={css(field)} /></div>
          <div style={css('margin-top:14px;')}>{label('Nội dung')}<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={4000} placeholder="Buổi này chia sẻ gì, dành cho ai, cần mang gì theo…" style={css(field + 'height:auto; padding:11px 13px; line-height:1.6; resize:vertical;')} /></div>
          {error && <div style={css(`margin-top:10px; font:600 13px ${FONT}; color:#D8232A;`)}>{error}</div>}
        </div>
        <div style={css('display:flex; justify-content:flex-end; gap:10px; padding:16px 22px 20px;')}>
          <button onClick={save} disabled={busy} style={css(`height:44px; padding:0 24px; border:none; border-radius:999px; background:${ready ? 'linear-gradient(180deg,#4480ff,#2c5fff)' : '#E3E8F2'}; color:${ready ? '#fff' : '#94a3b8'}; font:700 14px ${FONT}; cursor:pointer; opacity:${busy ? 0.6 : 1};`)}>{busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Đăng buổi chia sẻ'}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
