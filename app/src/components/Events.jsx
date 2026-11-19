import { useEffect, useRef, useState } from 'react'
import { HandIcon } from './notifIcons.jsx'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { css, hoverClass, CARD_HOVER } from '../lib/style.js'
import { fold } from '../lib/fold.js'
import { api, relativeTime } from '../lib/api.js'
import { cropCover } from '../lib/cover.js'
import { copyWithToast } from '../lib/clipboard.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useDialog } from '../hooks/useDialog.js'
import Avatar from './Avatar.jsx'
import MentionInput from './MentionInput.jsx'
import { renderMentions } from './MentionField.jsx'
import CommentMenu, { LikeButton, ReplyButton, RepliesToggle, useCommentModals } from './CommentMenu.jsx'
import MoreMenu, { MENU_ICON } from './MoreMenu.jsx'
import { playSound } from '../lib/sound.js'

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
/** Facebook-style: "Hôm nay lúc 18:00", "Thứ 7 này lúc 07:30", "Thứ 7, 28/11 lúc 18:00", or just the day
 *  when no time was given (viewer's time zone) */
export function whenLabel(e) {
  const s = new Date(e.startsAt), now = new Date()
  const days = Math.round((dayStart(s) - dayStart(now)) / 86400000)
  const day = days === 0 ? 'Hôm nay' : days === 1 ? 'Ngày mai' : days > 1 && days < 7 ? `${DAYS[s.getDay()]} này` : `${DAYS[s.getDay()]}, ${p2(s.getDate())}/${p2(s.getMonth() + 1)}${s.getFullYear() !== now.getFullYear() ? '/' + s.getFullYear() : ''}`
  if (e.allDay) return day
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

// `onDark`: drawn straight on the dark page (the rail), so see-through fills and light text in both looks
function InterestButton({ ev, onToggle, grow = false, height = 36, onDark = false }) {
  const on = ev.interested
  const look = onDark
    ? (on ? 'background:rgba(68,128,255,.2); color:#9DB8FF;' : 'background:rgba(255,255,255,.08); color:#E8EEFC;')
    : (on ? 'background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; border:1.5px solid transparent;' : 'background:#fff; color:#2c5fff; border:1.5px solid #9FB6F5;')
  const hover = onDark ? (on ? 'background:rgba(68,128,255,.28) !important;' : 'background:rgba(255,255,255,.14) !important;') : (on ? 'filter:brightness(1.06);' : 'background:#EEF3FF !important;')
  return (
    <button onClick={(e) => { e.stopPropagation(); onToggle(ev) }} aria-pressed={on}
      className={hoverClass(hover)}
      style={css(`${grow ? 'flex:1 1 auto;' : 'flex:none;'} min-width:0; display:inline-flex; align-items:center; justify-content:center; gap:7px; height:${height}px; padding:0 14px; border:none; border-radius:10px; box-sizing:border-box; cursor:pointer; white-space:nowrap; font:700 ${height < 34 ? 12.5 : 13.5}px ${FONT}; ${look}`)}>
      <HandIcon size={16} />
      {on ? 'Đã quan tâm' : 'Quan tâm'}
    </button>
  )
}
function ShareButton({ ev, height = 36, onDark = false }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); share(ev) }} title="Copy link sự kiện" aria-label="Copy link sự kiện" className={hoverClass(onDark ? 'background:rgba(255,255,255,.14) !important;' : 'background:#E4E9F2 !important;')}
      style={css(`flex:none; width:${height + 10}px; height:${height}px; border:none; border-radius:10px; ${onDark ? 'background:rgba(255,255,255,.08); color:#E8EEFC;' : 'background:#EEF1F6; color:#0F172A;'} cursor:pointer; display:inline-flex; align-items:center; justify-content:center;`)}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M14 4.5V9C7 9.5 4 14 3 20c2.5-3.5 6-5.1 11-5.1v4.6l7-7.5-7-7.5z"></path></svg>
    </button>
  )
}

// an attendee's answer on Outlook: mark, words, colour
const RSVP = { accepted: ['✓', 'Đồng ý trên Outlook', '#00893F'], tentativelyAccepted: ['?', 'Có thể tham gia', '#B45300'], declined: ['✕', 'Từ chối trên Outlook', '#D8232A'] }
const countLabel = (n) => (n ? `${n} người quan tâm` : 'Chưa ai quan tâm')
/** "3 người quan tâm · 2 bình luận" */
const statsLabel = (ev) => [countLabel(ev.interestCount), ev.commentCount ? `${ev.commentCount} bình luận` : ''].filter(Boolean).join(' · ')

/** One event as a card: cover, date line, title, place, count, buttons. */
/** Facebook-style: a few faces of who's interested, "Bạn và 2 người khác quan tâm", plus the comments. */
function InterestedRow({ ev, me }) {
  const n = ev.interestCount
  const others = (ev.people || []).filter((p) => !me || p.id !== me.id)
  const faces = [...(ev.interested && me ? [me] : []), ...others].slice(0, 3)
  const first = ev.interested ? 'Bạn' : others[0]?.name
  const text = !n ? 'Chưa ai quan tâm' : n === 1 || !first ? `${first || n + ' người'} quan tâm` : `${first} và ${n - 1} người khác quan tâm`
  return (
    <div style={css('margin-top:8px; display:flex; align-items:center; gap:8px; min-width:0;')}>
      {faces.length > 0 && (
        <span style={css('flex:none; display:inline-flex;')}>
          {faces.map((p, i) => <span key={p.id || i} style={css(`display:inline-flex; margin-left:${i ? -7 : 0}px; border-radius:50%; box-shadow:0 0 0 2px #fff;`)}><Avatar user={p} size={22} fontSize={8} /></span>)}
        </span>
      )}
      <span style={css('min-width:0; font:500 12.5px var(--zp-font-text); color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;')}>{text}{ev.commentCount ? ` · ${ev.commentCount} bình luận` : ''}</span>
    </div>
  )
}

// `rich` (the events page grid): a short intro from the details and the faces of who's interested
function EventCard({ ev, onOpen, onToggle, compact = false, onDark = false, rich = false }) {
  const { user } = useAuth()
  const ink = onDark ? { title: '#FFFFFF', place: '#C9D6F5', count: '#8EA0C8', when: '#FF7A7F' } : { title: '#0F172A', place: '#475569', count: '#64748b', when: '#D8232A' }
  // the rail (onDark) is the compact one: narrower column, smaller type and buttons
  const bh = onDark ? 30 : 36
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(ev.id)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(ev.id) }}
      style={css(`cursor:pointer; ${compact ? 'flex:none; width:250px; padding:10px; border-radius:16px; background:#fff; box-shadow:0 10px 24px rgba(3,12,40,.28); box-sizing:border-box;' : ''} ${rich ? 'flex:1; display:flex; flex-direction:column;' : ''}`)}>
      <Cover ev={ev} radius={compact || onDark ? 10 : 14} />
      <div style={css(`margin-top:${onDark ? 8 : 10}px;`)}>
        <div style={css(`font:700 ${onDark ? 11.5 : 12.5}px ${FONT}; color:${ink.when};`)}>{whenLabel(ev)}</div>
        <div style={css(`margin-top:2px; font:800 ${onDark ? 13.5 : 15}px/1.3 ${FONT}; color:${ink.title}; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word;`)}>{ev.title}</div>
        <div style={css(`margin-top:2px; font:500 ${onDark ? 12 : 13}px/1.4 var(--zp-font-text); color:${ink.place}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`)} title={ev.location}>{ev.location}</div>
        {rich && ev.description && <div style={css('margin-top:6px; font:400 13px/1.5 var(--zp-font-text); color:#475569; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word;')}>{ev.description}</div>}
        {rich ? <InterestedRow ev={ev} me={user} /> : <div style={css(`margin-top:2px; font:400 ${onDark ? 11.5 : 12.5}px var(--zp-font-text); color:${ink.count};`)}>{statsLabel(ev)}</div>}
      </div>
      {/* in the grid the buttons sit at the bottom of the card, so they line up across a row */}
      <div style={css(`margin-top:${rich ? 'auto' : (onDark ? 8 : 10) + 'px'}; ${rich ? 'padding-top:10px;' : ''} display:flex; gap:${onDark ? 6 : 8}px;`)}>
        <InterestButton ev={ev} onToggle={onToggle} grow onDark={onDark} height={bh} />
        <ShareButton ev={ev} onDark={onDark} height={bh} />
      </div>
    </div>
  )
}

// ---- the calendar (the "Lịch" tab): by week like Outlook (default) or by month ----
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const mondayOf = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const endOfEv = (ev) => (ev.endsAt ? new Date(ev.endsAt) : new Date(new Date(ev.startsAt).getTime() + 3600000))
const evLook = (ev) => (ev.past ? 'background:#EEF1F5; border-left:3px solid #94a3b8; color:#64748b;' : ev.interested ? 'background:#C9DAFB; border-left:3px solid #2c5fff; color:#10275E;' : 'background:#DCE7FB; border-left:3px solid #2c5fff; color:#10275E;')

/** The calendar on the page ("Lịch" tab): by week like Outlook (default) or by month, with Hôm nay / ‹ ›. */
function CalendarView({ onOpen, reloadKey }) {
  const [mode, setMode] = useState('week') // week | month
  const [anchor, setAnchor] = useState(() => new Date())
  const mon = mondayOf(anchor)
  const sun = addDays(mon, 6)
  const title = mode === 'month'
    ? `Tháng ${anchor.getMonth() + 1}, ${anchor.getFullYear()}`
    : mon.getMonth() === sun.getMonth()
      ? `${mon.getDate()} – ${sun.getDate()} tháng ${sun.getMonth() + 1}, ${sun.getFullYear()}`
      : `${mon.getDate()} tháng ${mon.getMonth() + 1} – ${sun.getDate()} tháng ${sun.getMonth() + 1}, ${sun.getFullYear()}`
  const go = (n) => setAnchor((d) => (mode === 'month' ? new Date(d.getFullYear(), d.getMonth() + n, 1) : addDays(d, 7 * n)))
  const btn = 'height:32px; min-width:32px; padding:0 11px; border:1px solid #DDE3EC; border-radius:8px; background:#fff; color:#0F172A; cursor:pointer; font:700 13px var(--zp-font-text);'
  return (
    <div style={css('height:calc(100vh - 150px); min-height:560px; display:flex; flex-direction:column; background:#fff; border-radius:18px; box-shadow:0 14px 34px rgba(3,12,40,.3); overflow:hidden;')}>
      <div style={css('flex:none; display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:12px 16px; border-bottom:1px solid #E6EBF3;')}>
        <button onClick={() => setAnchor(new Date())} className={hoverClass('background:#F4F7FE !important;')} style={css(btn)}>Hôm nay</button>
        <button onClick={() => go(-1)} aria-label="Trước" className={hoverClass('background:#F4F7FE !important;')} style={css(btn)}>‹</button>
        <button onClick={() => go(1)} aria-label="Sau" className={hoverClass('background:#F4F7FE !important;')} style={css(btn)}>›</button>
        <div style={css(`flex:1; min-width:180px; margin-left:6px; font:800 18px ${FONT}; color:#0F172A;`)}>{title}</div>
        <div role="tablist" style={css('display:flex; padding:3px; border-radius:10px; background:#F1F4F9;')}>
          {[['week', 'Tuần'], ['month', 'Tháng']].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
              style={css(`height:28px; padding:0 14px; border:none; border-radius:8px; cursor:pointer; font:700 12.5px var(--zp-font-text); ${mode === k ? 'background:#fff; color:#0F172A; box-shadow:0 1px 3px rgba(15,23,42,.12);' : 'background:transparent; color:#64748b;'}`)}>{label}</button>
          ))}
        </div>
      </div>
      <div style={css('flex:1; min-height:0; display:flex; flex-direction:column;')}>
        {mode === 'week' ? <WeekView monday={mon} onOpen={onOpen} reloadKey={reloadKey} /> : <MonthView month={new Date(anchor.getFullYear(), anchor.getMonth(), 1)} onOpen={onOpen} reloadKey={reloadKey} />}
      </div>
    </div>
  )
}

/** Side-by-side columns for events that overlap in one day (as Outlook does): [{ ev, col, cols }]. */
function layoutDay(list) {
  const items = list.map((ev) => ({ ev, s: new Date(ev.startsAt).getTime(), e: Math.max(endOfEv(ev).getTime(), new Date(ev.startsAt).getTime() + 30 * 60000) })).sort((a, b) => a.s - b.s || b.e - a.e)
  const out = []
  let cluster = [], colsEnd = [], clusterEnd = -Infinity
  const flush = () => { const n = colsEnd.length; cluster.forEach((x) => out.push({ ...x, cols: n })); cluster = []; colsEnd = [] }
  for (const it of items) {
    if (it.s >= clusterEnd) { flush(); clusterEnd = -Infinity }
    let col = colsEnd.findIndex((end) => end <= it.s)
    if (col < 0) { col = colsEnd.length; colsEnd.push(it.e) } else colsEnd[col] = it.e
    cluster.push({ ...it, col })
    clusterEnd = Math.max(clusterEnd, it.e)
  }
  flush()
  return out
}

const HOUR = 52
/** The week, Monday to Sunday, hours down the side; events as blocks at their time (all-day ones on top). */
function WeekView({ monday, onOpen, reloadKey }) {
  const [events, setEvents] = useState(null)
  const scroller = useRef(null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t) }, [])
  useEffect(() => {
    let stop = false
    setEvents(null)
    api.listEventsRange(monday.toISOString(), addDays(monday, 7).toISOString()).then((d) => { if (!stop) setEvents(d.events || []) }).catch(() => { if (!stop) setEvents([]) })
    return () => { stop = true }
  }, [monday.getTime(), reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const list = events || []
  const timed = list.filter((ev) => !ev.allDay)
  const allDay = list.filter((ev) => ev.allDay)
  // 7:00 to 21:00, stretched to fit any event outside it
  let startH = 7, endH = 21
  for (const ev of timed) { const s = new Date(ev.startsAt), e = endOfEv(ev); startH = Math.min(startH, s.getHours()); endH = Math.max(endH, sameDay(s, e) ? Math.ceil(e.getHours() + e.getMinutes() / 60) : 24) }
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i)
  // open at 8:00 (or the first event of the week if earlier)
  useEffect(() => {
    if (!scroller.current || !events) return
    const first = timed.length ? Math.min(...timed.map((ev) => new Date(ev.startsAt).getHours())) : 8
    scroller.current.scrollTop = Math.max(0, (Math.min(first, 8) - startH) * HOUR - 8)
  }, [events]) // eslint-disable-line react-hooks/exhaustive-deps
  const cols = 'grid-template-columns:56px repeat(7, minmax(0, 1fr));'
  const top = (d) => ((d.getHours() + d.getMinutes() / 60) - startH) * HOUR
  return (
    <>
      {/* day names, and the all-day events under them */}
      <div style={css(`flex:none; display:grid; ${cols} border-bottom:1px solid #E6EBF3;`)}>
        <div />
        {days.map((d, i) => {
          const today = sameDay(d, now)
          return (
            <div key={i} style={css('padding:8px 8px 6px; border-left:1px solid #EEF1F7; min-width:0;')}>
              <div style={css(`font:600 12px var(--zp-font-text); color:${today ? '#2c5fff' : '#64748b'};`)}>{['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'][i]}</div>
              <div style={css(`margin-top:2px; display:inline-flex; align-items:center; justify-content:center; min-width:30px; height:30px; padding:0 6px; border-radius:999px; font:700 18px ${FONT}; ${today ? 'background:#2c5fff; color:#fff;' : 'color:#0F172A;'}`)}>{d.getDate()}</div>
              <div style={css('margin-top:4px; display:flex; flex-direction:column; gap:3px;')}>
                {allDay.filter((ev) => sameDay(new Date(ev.startsAt), d)).map((ev) => (
                  <button key={ev.id} onClick={() => onOpen(ev.id)} title={`${ev.title} · ${ev.location}`} style={css(`display:block; width:100%; text-align:left; border:none; border-radius:5px; padding:3px 6px; cursor:pointer; font:700 11.5px/1.3 var(--zp-font-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; ${evLook(ev)}`)}>{ev.title}</button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {/* the hours */}
      <div ref={scroller} className="zp-thinscroll" style={css('flex:1; min-height:0; overflow-y:auto; position:relative;')}>
        <div style={css(`display:grid; ${cols} position:relative; height:${hours.length * HOUR}px;`)}>
          <div style={css('position:relative;')}>
            {hours.map((h, i) => <div key={h} style={css(`position:absolute; top:${i * HOUR - 7}px; right:8px; font:600 11px var(--zp-font-text); color:#94a3b8;`)}>{i ? `${p2(h)}:00` : ''}</div>)}
          </div>
          {days.map((d, di) => {
            const mine = layoutDay(timed.filter((ev) => sameDay(new Date(ev.startsAt), d)))
            const today = sameDay(d, now)
            return (
              <div key={di} style={css(`position:relative; border-left:1px solid #EEF1F7; background:${today ? '#FBFCFF' : 'transparent'}; background-image:repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR - 1}px, #EEF1F7 ${HOUR - 1}px, #EEF1F7 ${HOUR}px);`)}>
                {mine.map(({ ev, col, cols: n }) => {
                  const s = new Date(ev.startsAt)
                  const h = Math.max(24, ((endOfEv(ev) - s) / 3600000) * HOUR - 2)
                  return (
                    <button key={ev.id} onClick={() => onOpen(ev.id)} title={`${ev.title} · ${whenLabel(ev)} · ${ev.location}`} className={hoverClass('filter:brightness(.97); z-index:3;')}
                      style={css(`position:absolute; top:${top(s) + 1}px; height:${h}px; left:calc(${(100 / n) * col}% + 2px); width:calc(${100 / n}% - 4px); box-sizing:border-box; padding:3px 6px; border:none; border-radius:4px; text-align:left; cursor:pointer; overflow:hidden; z-index:1; ${evLook(ev)}`)}>
                      <div style={css('font:700 12px/1.3 var(--zp-font-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{ev.title}</div>
                      {h > 34 && <div style={css('font:400 11px/1.35 var(--zp-font-text); opacity:.85; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{hm(s)}{ev.endsAt ? '–' + hm(new Date(ev.endsAt)) : ''} · {ev.location}</div>}
                      {h > 52 && ev.host && <div style={css('font:400 11px/1.35 var(--zp-font-text); opacity:.75; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{ev.host.name}</div>}
                    </button>
                  )
                })}
                {today && now.getHours() >= startH && now.getHours() < endH && (
                  <div aria-hidden="true" style={css(`position:absolute; left:0; right:0; top:${top(now)}px; height:2px; background:#E0353F; z-index:2;`)}><span style={css('position:absolute; left:-5px; top:-4px; width:10px; height:10px; border-radius:50%; background:#E0353F;')} /></div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {events && !events.length && <div style={css('flex:none; padding:8px 16px; border-top:1px solid #EEF1F7; font:400 12.5px var(--zp-font-text); color:#94a3b8;')}>Tuần này chưa có sự kiện nào.</div>}
    </>
  )
}

/** The month: day cells Monday to Sunday, each with its events (time and name); a click opens one. */
function MonthView({ month, onOpen, reloadKey }) {
  const [events, setEvents] = useState(null)
  useEffect(() => {
    let stop = false
    setEvents(null)
    api.listEventsMonth(`${month.getFullYear()}-${p2(month.getMonth() + 1)}`).then((d) => { if (!stop) setEvents(d.events || []) }).catch(() => { if (!stop) setEvents([]) })
    return () => { stop = true }
  }, [month.getTime(), reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const today = new Date()
  const start = mondayOf(month)
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const weeks = days[35].getMonth() === month.getMonth() ? 6 : 5
  const byDay = (d) => (events || []).filter((ev) => sameDay(new Date(ev.startsAt), d))
  return (
    <div className="zp-thinscroll" style={css('flex:1; min-height:0; overflow-y:auto; display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); grid-auto-rows:min-content;')}>
      {WEEKDAYS.map((w) => <div key={w} style={css('padding:8px 8px 6px; font:700 11.5px var(--zp-font-text); color:#64748b; text-transform:uppercase; border-bottom:1px solid #EEF1F7;')}>{w}</div>)}
      {days.slice(0, weeks * 7).map((d, i) => {
        const inMonth = d.getMonth() === month.getMonth()
        const list = byDay(d)
        const isToday = sameDay(d, today)
        return (
          <div key={i} style={css(`min-height:110px; padding:6px 5px; box-sizing:border-box; border-right:${(i % 7) === 6 ? 'none' : '1px solid #F1F4F9'}; border-bottom:1px solid #F1F4F9; background:${inMonth ? '#fff' : '#FAFBFD'}; min-width:0;`)}>
            <div style={css(`display:inline-flex; align-items:center; justify-content:center; min-width:22px; height:22px; padding:0 4px; border-radius:999px; font:700 12px var(--zp-font-text); ${isToday ? 'background:#2c5fff; color:#fff;' : `color:${inMonth ? '#0F172A' : '#B3BDCC'};`}`)}>{d.getDate()}</div>
            <div style={css('margin-top:3px; display:flex; flex-direction:column; gap:3px;')}>
              {list.slice(0, 4).map((ev) => (
                <button key={ev.id} onClick={() => onOpen(ev.id)} title={`${ev.title} · ${whenLabel(ev)} · ${ev.location}`} className={hoverClass('filter:brightness(.96);')}
                  style={css(`display:block; width:100%; text-align:left; border:none; border-radius:4px; padding:3px 5px; cursor:pointer; font:600 11.5px/1.3 var(--zp-font-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; ${evLook(ev)}`)}>
                  {!ev.allDay && <b style={{ fontWeight: 800 }}>{hm(new Date(ev.startsAt))} </b>}{ev.title}
                </button>
              ))}
              {list.length > 4 && <span style={css('font:600 11px var(--zp-font-text); color:#64748b; padding-left:4px;')}>+{list.length - 4} sự kiện</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- the list: the grid of the events page (AI Space home), the rail or the strip ----
// today as YYYY-MM-DD in the viewer's own time zone (the date picker's earliest day)
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// `query` (grid): only the events whose title, place or host match. /?new=event opens the "Tạo sự kiện"
// form (the sidebar's link).
// `calendar` (grid layout): the week / month calendar in place of the cards (the AI Space page's "Lịch" tab)
export default function EventsPanel({ layout = 'rail', query = '', calendar = false }) {
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
  const toggle = (ev) => requireLogin(() => api.toggleEventInterest(ev.id).then((d) => { put(d.event); playSound() }).catch(() => {}))
  const close = () => {
    setOpenId(null)
    const u = new URL(window.location.href)
    if (u.searchParams.has('event')) { u.searchParams.delete('event'); window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash) }
  }
  const create = () => requireLogin(() => setForm({}))
  const list = events || []
  const location = useLocation()
  const navigate = useNavigate()
  // a link to an event while already on this page (a notification, say): open it too
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('event')
    if (id) setOpenId(id)
  }, [location.search, location.key]) // the key: the same link clicked again
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    if (sp.get('new') !== 'event') return
    const topicId = sp.get('fromTopic')
    navigate({ pathname: location.pathname, hash: location.hash }, { replace: true })
    // "Tạo sự kiện" on a topic: the form starts from it, and everyone interested in it gets the invitation
    if (topicId) requireLogin(() => api.getTopic(topicId).then((d) => setForm({ topicId, topicTitle: d.topic.title, topicVotes: d.topic.votes, title: d.topic.title })).catch(() => setForm({})))
    else requireLogin(() => setForm({}))
  }, [location.search]) // eslint-disable-line react-hooks/exhaustive-deps
  const q = fold(query.trim())
  const shown = q ? list.filter((ev) => [ev.title, ev.location, ev.host?.name, ev.host?.fullName, ...(ev.cohosts || []).flatMap((h) => [h.name, h.fullName]), ev.description].some((x) => fold(x).includes(q))) : list

  return (
    <>
      {layout === 'grid' ? (
        <div data-tour="events">
          {calendar ? <CalendarView onOpen={setOpenId} reloadKey={events} /> : !events ? null : !shown.length ? (
            <div style={css('background:#fff; border-radius:20px; box-shadow:0 14px 34px rgba(3,12,40,.3); padding:48px 24px; text-align:center;')}>
              <div style={css(`font:800 17px ${FONT}; color:#0F172A;`)}>{q ? 'Không tìm thấy sự kiện nào' : 'Chưa có sự kiện nào sắp tới'}</div>
              <div style={css('margin-top:8px; font:400 14px/1.6 var(--zp-font-text); color:#64748b;')}>{q ? 'Thử từ khoá khác nhé.' : 'Có topic AI nào muốn chia sẻ? Tạo sự kiện đầu tiên để mọi người cùng tham gia.'}</div>
              {!q && <button onClick={create} style={css(`margin-top:18px; height:44px; padding:0 22px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; font:700 14px ${FONT}; cursor:pointer;`)}>+ Tạo sự kiện</button>}
            </div>
          ) : (
            <div style={css('display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:16px;')}>
              {shown.map((ev) => (
                <div key={ev.id} className={hoverClass(CARD_HOVER)} style={css('display:flex; flex-direction:column; background:#fff; border-radius:18px; padding:12px; box-shadow:0 14px 34px rgba(3,12,40,.3); transition:transform .18s ease, box-shadow .18s ease;')}>
                  <EventCard ev={ev} onOpen={setOpenId} onToggle={toggle} rich />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : layout === 'rail' ? (
        // no box of its own, like the menu on the left: the events sit straight on the page
        <aside data-tour="events" aria-label="Sự kiện sắp tới" style={css('padding:4px 6px 6px 2px;')}>
          <div style={css(`font:800 15px ${FONT}; color:#FFFFFF;`)}>Sự kiện sắp tới</div>
          <button onClick={create} className={hoverClass('filter:brightness(1.06);')} style={css(`margin-top:10px; width:100%; height:34px; border:none; border-radius:10px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; font:700 13.5px ${FONT}; cursor:pointer; box-shadow:0 8px 18px rgba(44,95,255,.3);`)}>+ Tạo sự kiện</button>
          {events && !list.length && (
            <div style={css('margin:14px 0 12px; font:400 13px/1.6 var(--zp-font-text); color:#A9B8DC;')}>
              Chưa có sự kiện nào sắp tới. Workshop, gặp mặt, xem chung, ăn mừng… bạn muốn rủ mọi người điều gì thì tạo một sự kiện nhé.
            </div>
          )}
          {list.map((ev) => (
            <div key={ev.id} style={css('padding:12px 0 12px; border-bottom:1px solid rgba(255,255,255,.08);')}>
              <EventCard ev={ev} onOpen={setOpenId} onToggle={toggle} onDark />
            </div>
          ))}
        </aside>
      ) : (
        <div data-tour="events" style={css('margin-bottom:14px;')}>
          <div style={css('display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:9px;')}>
            <div style={css('min-width:0;')}>
              <div style={css(`font:800 15px ${FONT}; color:#fff;`)}>Sự kiện sắp tới</div>
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
  const { user, requireLogin } = useAuth()
  const [ev, setEv] = useState(known || null)
  const [missing, setMissing] = useState(false)
  const dialog = useDialog(true, onClose, 'Sự kiện')
  useEffect(() => { api.getEvent(id).then((d) => setEv(d.event)).catch(() => setMissing(true)) }, [id])
  const [opening, setOpening] = useState(false)
  const openInvites = () => {
    setOpening(true)
    api.openEventInvites(id).then((d) => { setEv((x) => ({ ...d.event, past: x?.past, comments: x?.comments })); onChanged(d.event); playSound() })
      .catch((e) => window.alert(e?.data?.message || 'Chưa gửi được, thử lại nhé.')).finally(() => setOpening(false))
  }
  const toggle = () => requireLogin(() => api.toggleEventInterest(id).then((d) => { setEv((x) => ({ ...d.event, past: x?.past, comments: x?.comments })); onChanged(d.event); playSound() }).catch(() => {}))
  const [askCancel, setAskCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  // everyone interested gets the cancellation with this reason (email, Outlook, in the app)
  const cancelEvent = () => { if (!cancelReason.trim()) return; setAskCancel(false); api.deleteEvent(ev.id, cancelReason.trim()).then(onDeleted).catch(() => window.alert('Chưa huỷ được, thử lại nhé.')) }
  // the ⋯ menu: the hosts edit (the creator also cancels, with a reason); everyone else reports or saves
  const cm = useCommentModals(api)
  const save = () => requireLogin(() => api.saveEvent(ev.id).then((d) => { setEv((x) => ({ ...x, saved: d.event.saved })); playSound() }).catch(() => {}))
  const menu = !ev ? [] : ev.isMine || ev.isHost
    ? [
      { label: 'Sửa sự kiện', icon: MENU_ICON.edit, onClick: () => onEdit(ev) },
      ...(ev.isMine ? [{ label: ev.past ? 'Xoá sự kiện' : 'Huỷ sự kiện', icon: MENU_ICON.cancel, danger: true, onClick: () => setAskCancel(true) }] : []),
    ]
    : [
      { label: 'Báo cáo', icon: MENU_ICON.report, onClick: () => requireLogin(() => cm.askReport('event', ev.id)) },
      { label: ev.saved ? 'Bỏ lưu' : 'Lưu', icon: MENU_ICON.save, onClick: save },
    ]
  const row = (icon, text) => (
    <div style={css('display:flex; align-items:flex-start; gap:10px; margin-top:9px; font:500 14px/1.5 var(--zp-font-text); color:#334155;')}>
      <span style={css('flex:none; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; color:#64748b; margin-top:1px;')}>{icon}</span><span style={{ minWidth: 0 }}>{text}</span>
    </div>
  )
  const grayBtn = `display:inline-flex; align-items:center; justify-content:center; gap:7px; height:32px; padding:0 14px; border:none; border-radius:9px; background:#EEF1F6; color:#0F172A; cursor:pointer; font:700 12.5px ${FONT};`
  return createPortal(
    <div className="zp-overlay-in" onClick={onClose} style={css('position:fixed; inset:0; z-index:4000; background:rgba(4,10,26,.66); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; padding:24px 16px;')}>
      {/* fits the screen: a long event (details, people, comments) scrolls inside, the ✕ stays in its corner */}
      <div ref={dialog.ref} {...dialog.dialogProps} data-event-dialog className="zp-dialog-in zp-thinscroll" onClick={(e) => e.stopPropagation()} style={css('position:relative; width:520px; max-width:100%; max-height:calc(100vh - 48px); overflow-y:auto; background:#fff; border-radius:22px; box-shadow:0 30px 80px rgba(0,0,0,.45);')}>
        <div style={css('position:sticky; top:0; z-index:3; height:0;')}>
          <button onClick={onClose} aria-label="Đóng" style={css('position:absolute; top:12px; right:12px; width:34px; height:34px; border:none; border-radius:50%; background:rgba(15,23,42,.6); color:#fff; cursor:pointer; font-size:16px;')}>✕</button>
        </div>
        {cm.modals}
        {!ev ? (
          <div style={css('padding:56px 20px; text-align:center; font:600 14px var(--zp-font-text); color:#64748b;')}>{missing ? 'Không tìm thấy sự kiện này. Có thể đã bị huỷ.' : 'Đang tải…'}</div>
        ) : (<>
          <Cover ev={ev} radius={0} />
          <div style={css('padding:18px 22px 0;')}>
            <div style={css(`font:700 14px ${FONT}; color:#D8232A;`)}>{ev.past ? 'Đã diễn ra · ' : ''}{whenLabel(ev)}</div>
            <h2 style={css(`margin:5px 0 0; font:800 22px/1.3 ${FONT}; color:#0F172A; word-break:break-word;`)}>{ev.title}</h2>
            {row(<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"></path><circle cx="12" cy="9.5" r="2.5"></circle></svg>, ev.location)}
            {ev.host && (() => {
              // the creator first, then the co-hosts: "Tổ chức bởi A, B và C"
              const hosts = [ev.host, ...(ev.cohosts || [])]
              const names = hosts.map((h, i) => <b key={i} title={h.fullName || h.name} style={css('color:#0F172A;')}>{h.name}</b>)
              const joined = names.flatMap((n, i) => (i === 0 ? [n] : [i === names.length - 1 ? ' và ' : ', ', n]))
              return row(<Avatar user={ev.host} size={20} fontSize={8} />, <>Tổ chức bởi {joined}</>)
            })()}
            {ev.topic && row(<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"></path></svg>, <>Cho chủ đề <a href={`/?tab=wish&topic=${encodeURIComponent(ev.topic.id)}`} style={css('font-weight:700; color:#2c5fff; text-decoration:none;')}>"{ev.topic.title}"</a></>)}
            {row(<HandIcon size={17} />, statsLabel(ev))}
          </div>
          <div style={css('display:flex; flex-wrap:wrap; gap:8px; padding:16px 22px 0;')}>
            {!ev.past && <InterestButton ev={ev} onToggle={toggle} grow height={32} />}
            <button onClick={() => share(ev)} className={hoverClass('background:#E4E9F2 !important;')} style={css((ev.past ? 'flex:1;' : 'flex:none;') + grayBtn)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 4.5V9C7 9.5 4 14 3 20c2.5-3.5 6-5.1 11-5.1v4.6l7-7.5-7-7.5z"></path></svg>
              Chia sẻ
            </button>
            {user && <MoreMenu items={menu} />}
          </div>
          {/* the creator: invitations wait for enough interest, then one click sends them */}
          {ev.isMine && !ev.past && !ev.invitesOpen && (() => {
            const ready = ev.othersInterested >= ev.openAt
            return (
              <div style={css(`margin:14px 22px 0; padding:12px 14px; border-radius:12px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; ${ready ? 'background:#EEF3FF; border:1px solid #CFDDFB;' : 'background:#F3F6FA; border:1px solid #E6EBF3;'}`)}>
                <div style={css('flex:1; min-width:200px; font:400 12.5px/1.55 var(--zp-font-text); color:#334155;')}>
                  {ready
                    ? <><b style={css('color:#1E44A8;')}>Đã đủ {ev.othersInterested} người quan tâm.</b> Gửi lời mời Outlook để sự kiện vào lịch của mọi người; ai quan tâm sau sẽ được mời tiếp.</>
                    : <>Lời mời Outlook gửi được khi đủ <b>{ev.openAt} người quan tâm</b> (hiện có {ev.othersInterested}/{ev.openAt}). Bạn sẽ nhận thông báo khi đủ.</>}
                </div>
                {ready && <button onClick={openInvites} disabled={opening} style={css(`flex:none; height:34px; padding:0 16px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; font:700 13px ${FONT}; cursor:pointer; opacity:${opening ? 0.6 : 1};`)}>{opening ? 'Đang gửi…' : 'Gửi lời mời Outlook'}</button>}
              </div>
            )
          })()}
          {ev.description && (
            <div style={css('margin:18px 22px 0;')}>
              <div style={css(`font:800 15px ${FONT}; color:#0F172A;`)}>Thông tin về sự kiện</div>
              <div style={css('margin-top:6px; font:400 14px/1.65 var(--zp-font-text); color:#334155; white-space:pre-wrap; word-break:break-word;')}>{ev.description}</div>
            </div>
          )}
          {ev.people.length > 0 && (
            <div style={css('margin:18px 22px 0;')}>
              <div style={css(`font:800 15px ${FONT}; color:#0F172A;`)}>Người quan tâm</div>
              {/* the hosts: how people answered the Outlook invitation */}
              {ev.rsvpCounts && (
                <div style={css('margin-top:4px; font:400 12.5px/1.5 var(--zp-font-text); color:#64748b;')}>
                  Đã mời qua Outlook {ev.outlookInvited} người: <b style={css('color:#00893F;')}>{ev.rsvpCounts.accepted} đồng ý</b> · {ev.rsvpCounts.tentative} có thể · {ev.rsvpCounts.declined} từ chối
                </div>
              )}
              <div style={css('margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;')}>
                {ev.people.map((p) => (
                  <span key={p.id} title={(p.fullName || p.name) + (RSVP[p.rsvp] ? ' · ' + RSVP[p.rsvp][1] : '')} style={css('display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 10px 0 4px; border-radius:999px; background:#F1F4FA; font:600 12px var(--zp-font-text); color:#334155;')}><Avatar user={p} size={20} fontSize={8} />{p.name}{RSVP[p.rsvp] && <span style={css(`font-weight:800; color:${RSVP[p.rsvp][2]};`)}>{RSVP[p.rsvp][0]}</span>}</span>
                ))}
                {ev.interestCount > ev.people.length && <span style={css('display:inline-flex; align-items:center; height:28px; padding:0 10px; font:600 12px var(--zp-font-text); color:#64748b;')}>+{ev.interestCount - ev.people.length} người khác</span>}
              </div>
            </div>
          )}
          <EventComments ev={ev} onChange={(d) => { setEv((x) => ({ ...x, comments: d.comments, commentCount: d.commentCount })); onChanged({ ...ev, commentCount: d.commentCount }) }} />
          <div style={css('display:flex; align-items:center; gap:12px; padding:18px 22px 20px; margin-top:18px; border-top:1px solid #EEF1F7;')}>
            <div style={css('flex:1; font:400 12px/1.5 var(--zp-font-text); color:#94a3b8;')}>{ev.past ? '' : ev.isMine && ev.outlook ? 'Sự kiện đã ở trong lịch Outlook của bạn; người bấm Quan tâm nhận lời mời từ bạn và vào chung cuộc họp.' : ev.invitesOpen ? 'Bấm Quan tâm để nhận lời mời vào lịch Outlook và email nhắc trước 1 ngày; khi sự kiện đổi giờ, đổi chỗ hay huỷ, lịch của bạn tự cập nhật.' : `Bấm Quan tâm để nhận email nhắc trước 1 ngày. Khi đủ ${ev.openAt} người quan tâm và người tổ chức mở sự kiện, bạn nhận lời mời vào lịch Outlook.`}</div>
          </div>
        </>)}
      </div>
      {askCancel && (
        <div onClick={(e) => { e.stopPropagation(); setAskCancel(false) }} style={css('position:fixed; inset:0; z-index:4100; background:rgba(4,10,26,.55); display:flex; align-items:center; justify-content:center; padding:24px;')}>
          <div role="alertdialog" aria-modal="true" aria-label="Huỷ sự kiện" onClick={(e) => e.stopPropagation()} style={css('width:380px; max-width:100%; background:#fff; border-radius:20px; padding:24px; box-shadow:0 30px 70px rgba(3,12,40,.5); text-align:center;')}>
            <div style={css('width:48px; height:48px; margin:0 auto; border-radius:50%; background:#FFECEC; color:#D8232A; display:flex; align-items:center; justify-content:center;')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18M10 14l4 4M14 14l-4 4"></path></svg>
            </div>
            <div style={css(`margin-top:14px; font:800 17px/1.35 ${FONT}; color:#0F172A;`)}>Bạn có chắc muốn huỷ sự kiện?</div>
            <div style={css('margin-top:8px; font:400 13.5px/1.55 var(--zp-font-text); color:#475569;')}>Những người quan tâm sẽ nhận được email sự kiện bị huỷ kèm lý do.</div>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} maxLength={500} placeholder="Lý do huỷ (bắt buộc), ví dụ: diễn giả bận đột xuất, sẽ dời sang tuần sau"
              style={css('margin-top:12px; width:100%; box-sizing:border-box; border:1px solid #E6EBF3; border-radius:12px; padding:10px 12px; font:400 13.5px/1.5 var(--zp-font-text); color:#0F172A; background:#fff; outline:none; resize:vertical; text-align:left;')} />
            <div style={css('display:flex; gap:10px; margin-top:14px;')}>
              <button onClick={() => setAskCancel(false)} style={css(`flex:1; height:42px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 14px ${FONT}; cursor:pointer;`)}>Quay lại</button>
              <button onClick={cancelEvent} disabled={!cancelReason.trim()} style={css(`flex:1; height:42px; border:none; border-radius:999px; background:#D8232A; color:#fff; font:700 14px ${FONT}; cursor:pointer; opacity:${cancelReason.trim() ? 1 : 0.5};`)}>Huỷ sự kiện</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

// ---- comments under an event, oldest first ----
// Comments under an event, as on posts: ♡ and 💬 under each one; replies hang under the comment they belong
// to (one level), shown with "Hiện N trả lời", and the reply box starts with "@who" you're answering.
function EventComments({ ev, onChange }) {
  return <CommentBox reportType="ev_comment" comments={ev.comments} onChange={onChange} post={(body, replyTo) => api.postEventComment(ev.id, body, replyTo)} like={(cid) => api.likeEventComment(ev.id, cid)} remove={(cid, reason) => api.deleteEventComment(ev.id, cid, reason)} />
}

/** The comment box itself, shared by events and "Muốn nghe": `post(body, replyToId)`, `like(cid)` and
 *  `remove(cid)` call the server and resolve to { comments, commentCount }; `reportType` is what a report
 *  on one of its comments is filed under. Each comment has a ⋯ menu: its author deletes it, everyone else
 *  reports it to the admins (who remove it from the Admin Console). */
export function CommentBox({ comments, onChange, post: postFn, like: likeFn, remove: removeFn, reportType }) {
  const { user, requireLogin } = useAuth()
  const cm = useCommentModals(api)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const boxRef = useRef(null)
  const replyRef = useRef(null)
  const [replyTo, setReplyTo] = useState(null) // { id, parentId, handle }
  const [replyDraft, setReplyDraft] = useState('')
  const [open, setOpen] = useState(() => new Set())
  const list = comments || []
  const top = list.filter((c) => !c.parentId)
  const repliesOf = (id) => list.filter((c) => c.parentId === id)
  const post = (text, ref, replyId, done) => {
    const body = text.trim()
    if (!body || busy) return
    requireLogin(() => {
      setBusy(true)
      // "@handle" picked from the suggestions goes out as the full address, so they get the email
      postFn(ref.current ? ref.current.expand(body) : body, replyId).then((d) => { done(); onChange(d); playSound() }).catch(() => window.alert('Chưa gửi được, thử lại nhé.')).finally(() => setBusy(false))
    })
  }
  const send = () => post(draft, boxRef, null, () => setDraft(''))
  const sendReply = () => post(replyDraft, replyRef, replyTo.id, () => { setOpen((o) => new Set(o).add(replyTo.parentId)); setReplyDraft(''); setReplyTo(null) })
  const startReply = (c) => requireLogin(() => {
    const parentId = c.parentId || c.id
    setReplyTo({ id: c.id, parentId })
    setOpen((o) => new Set(o).add(parentId))
    // answering someone else's reply: start with their @name
    setReplyDraft(c.parentId && c.author && c.author.id !== user?.id ? `@${(c.author.name || '').toLowerCase()} ` : '')
    setTimeout(() => replyRef.current?.focus?.(), 50)
  })
  const like = (c) => requireLogin(() => likeFn(c.id).then((d) => { onChange({ comments: d.comments, commentCount: d.commentCount ?? d.comments.length }); playSound() }).catch(() => {}))
  const remove = (c) => cm.askDelete(() => removeFn(c.id).then(onChange).catch(() => window.alert('Chưa xoá được, thử lại nhé.')))
  const report = (c) => requireLogin(() => cm.askReport(reportType, c.id))
  const field = 'width:100%; box-sizing:border-box; border:1px solid #E6EBF3; border-radius:12px; padding:9px 12px; font:400 14px/1.5 var(--zp-font-text); color:#0F172A; background:#F7F9FD; outline:none; resize:vertical; display:block;'
  const sendBtn = (enabled, onClick, label = 'Gửi') => (
    <button onClick={onClick} disabled={!enabled || busy} style={css(`height:32px; padding:0 16px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; font:700 13px ${FONT}; cursor:pointer; opacity:${enabled && !busy ? 1 : 0.5};`)}>{label}</button>
  )
  const row = (c, small) => {
    const replies = small ? [] : repliesOf(c.id)
    return (
      <div className="zp-cmt" style={css(`display:flex; gap:10px; ${small ? 'padding:6px 0 0;' : 'padding:8px 0 0; border-top:1px solid #EEF1F7; margin-top:6px;'}`)}>
        <Avatar user={c.author} size={small ? 26 : 32} fontSize={small ? 9 : 11} />
        <div style={css('flex:1; min-width:0;')}>
          <div style={css('display:flex; align-items:center; gap:6px;')}>
            <span style={css(`font:600 13px ${FONT}; color:#0F172A;`)}>{c.author?.name || 'Ẩn danh'}</span>
            <span style={css('font:400 12px var(--zp-font-text); color:#94a3b8;')}>· {relativeTime(c.time)}</span>
            <span style={{ flex: 1 }} />
            {/* the ⋯ doesn't make the name line taller */}
            {user && <span style={css('margin:-6px -4px -6px 0;')}><CommentMenu isOwner={c.isMine} onDelete={() => remove(c)} onReport={() => report(c)} /></span>}
          </div>
          <div style={css('margin-top:1px; font:400 14px/1.45 var(--zp-font-text); color:#1E293B; white-space:pre-wrap; word-break:break-word;')}>{renderMentions(c.body)}</div>
          <div style={css('display:flex; align-items:center; gap:2px; margin:-1px 0 -2px -7px;')}>
            <LikeButton r={c.likes} onLike={() => like(c)} />
            <ReplyButton count={replies.length} active={replyTo?.id === c.id} onClick={() => startReply(c)} />
          </div>
        </div>
      </div>
    )
  }
  return (
    <div style={css('margin:18px 22px 0;')}>
      {cm.modals}
      <div style={css(`font:800 15px ${FONT}; color:#0F172A;`)}>Bình luận{list.length ? ` (${list.length})` : ''}</div>
      <div style={css('display:flex; gap:10px; margin-top:10px;')}>
        <Avatar user={user} size={32} fontSize={11} />
        <div style={css('flex:1; min-width:0;')}>
          <MentionInput ref={boxRef} multiline rows={2} popupWidth={320} value={draft} onChange={setDraft} onEnter={send} maxLength={2000} placeholder="Viết bình luận… Gõ @ để nhắc tên đồng nghiệp." style={css(field)} />
          <div style={css('display:flex; justify-content:flex-end; margin-top:6px;')}>{sendBtn(!!draft.trim(), send)}</div>
        </div>
      </div>
      {top.map((c) => {
        const replies = repliesOf(c.id)
        const shown = open.has(c.id)
        return (
          <div key={c.id}>
            {row(c, false)}
            {(replies.length > 0 || replyTo?.parentId === c.id) && (
              <div style={css('margin-left:42px;')}>
                {replies.length > 0 && <RepliesToggle people={replies.map((r) => r.author).filter(Boolean)} count={replies.length} open={shown} onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n })} style={{ marginTop: 0, padding: 0 }} />}
                {shown && replies.map((r) => <div key={r.id}>{row(r, true)}</div>)}
                {replyTo?.parentId === c.id && (
                  <div style={css('display:flex; gap:8px; margin-top:8px;')}>
                    <Avatar user={user} size={26} fontSize={9} />
                    <div style={css('flex:1; min-width:0;')}>
                      <MentionInput ref={replyRef} multiline rows={2} popupWidth={300} value={replyDraft} onChange={setReplyDraft} onEnter={sendReply} maxLength={2000} placeholder="Viết trả lời…" style={css(field)} />
                      <div style={css('display:flex; justify-content:flex-end; gap:8px; margin-top:6px;')}>
                        <button onClick={() => { setReplyTo(null); setReplyDraft('') }} style={css(`height:32px; padding:0 14px; border:none; border-radius:999px; background:#EEF1F6; color:#334155; font:700 13px ${FONT}; cursor:pointer;`)}>Huỷ</button>
                        {sendBtn(!!replyDraft.trim(), sendReply, 'Trả lời')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---- create / edit ----
const localDate = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` }
/** "Người đồng tổ chức" (optional): search colleagues (people on the site and the company directory), each
 *  picked one a chip with ✕. Co-hosts may edit the event and see who's interested. */
function CohostPicker({ value, onChange, field }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const term = q.trim()
    if (!term) { setResults([]); return undefined }
    let stop = false
    const t = setTimeout(() => api.listUsers(term).then((d) => { if (!stop) setResults(d.users || []) }).catch(() => {}), 200)
    return () => { stop = true; clearTimeout(t) }
  }, [q])
  const picked = new Set(value.map((c) => c.email))
  const add = (u) => {
    const email = String(u.key || '').toLowerCase()
    if (!email.includes('@') || picked.has(email) || value.length >= 10) return
    onChange([...value, { email, name: u.name, fullName: u.name, initials: u.initials, avatarColor: u.avatarColor, avatarUrl: u.avatarUrl }])
    setQ(''); setResults([])
  }
  const shown = results.filter((u) => !picked.has(String(u.key || '').toLowerCase()))
  return (
    <div style={css('position:relative;')}>
      {value.length > 0 && (
        <div style={css('margin-top:6px; display:flex; flex-wrap:wrap; gap:6px;')}>
          {value.map((c) => (
            <span key={c.email} title={c.email} style={css('display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 4px 0 4px; border-radius:999px; background:#EEF3FF; border:1px solid #D6E1FF; font:600 12.5px var(--zp-font-text); color:#1E3A7A;')}>
              <Avatar user={c} size={22} fontSize={8} />
              {c.fullName || c.name}
              <button type="button" onClick={() => onChange(value.filter((x) => x.email !== c.email))} aria-label={'Bỏ ' + (c.fullName || c.name)} className={hoverClass('background:#DCE6FF !important;')} style={css('width:22px; height:22px; border:none; border-radius:50%; background:transparent; color:#5B6B82; font-size:14px; line-height:1; cursor:pointer;')}>✕</button>
            </span>
          ))}
        </div>
      )}
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (shown[0]) add(shown[0]) } }}
        placeholder="Không bắt buộc · gõ tên hoặc email đồng nghiệp" style={css(field)} />
      {open && shown.length > 0 && (
        <div style={css('position:absolute; left:0; right:0; top:100%; z-index:5; margin-top:4px; max-height:240px; overflow-y:auto; background:#fff; border:1px solid #E6EBF3; border-radius:12px; box-shadow:0 16px 36px rgba(8,16,40,.18); padding:4px;')}>
          {shown.map((u) => (
            <button key={u.key} type="button" onMouseDown={(e) => { e.preventDefault(); add(u) }} className={hoverClass('background:#F1F5FD !important;')}
              style={css('display:flex; align-items:center; gap:10px; width:100%; padding:8px 10px; border:none; border-radius:9px; background:transparent; cursor:pointer; text-align:left;')}>
              <Avatar user={u} size={28} fontSize={10} />
              <span style={css('min-width:0;')}>
                <span style={css(`display:block; font:700 13px ${FONT}; color:#0F172A;`)}>{u.name}</span>
                <span style={css('display:block; font:400 12px var(--zp-font-text); color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;')}>{u.sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function EventForm({ initial, onClose, onSaved }) {
  const editing = !!initial.id
  const [title, setTitle] = useState(initial.title || '')
  const [date, setDate] = useState(initial.startsAt ? localDate(initial.startsAt) : '')
  const [start, setStart] = useState(initial.startsAt && !initial.allDay ? hm(new Date(initial.startsAt)) : '')
  const [end, setEnd] = useState(initial.endsAt ? hm(new Date(initial.endsAt)) : '')
  const [location, setLocation] = useState(initial.location || '')
  const [description, setDescription] = useState(initial.description || '')
  // co-hosts ({ email, name, … }): only the creator (and the admins) choose them
  const [cohosts, setCohosts] = useState(initial.cohosts || [])
  const canCohost = !editing || !!initial.canEditCohosts
  // undefined = keep the cover already saved; null = remove it; a data URL = the new one
  const [cover, setCover] = useState(undefined)
  const [coverNote, setCoverNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const dialog = useDialog(true, onClose, editing ? 'Sửa sự kiện' : 'Tạo sự kiện')
  const preview = cover === undefined ? initial.coverUrl || null : cover
  // the times are optional: no start time makes it a whole-day event
  const ready = title.trim() && date && location.trim()
  const pick = (file) => cropCover(file).then((r) => { setCover(r.data); setCoverNote(r.note) }).catch((e) => e.message && setCoverNote(e.message))
  const save = () => {
    if (!ready) { setError('Điền tên, ngày và địa điểm nhé.'); return }
    if (end && !start) { setError('Chọn giờ bắt đầu trước khi chọn giờ kết thúc.'); return }
    const allDay = !start
    const startsAt = new Date(`${date}T${start || '00:00'}`)
    const endsAt = end ? new Date(`${date}T${end}`) : null
    if (endsAt && endsAt <= startsAt) { setError('Giờ kết thúc phải sau giờ bắt đầu.'); return }
    // a day that has passed can't be picked (an event being edited keeps its own date)
    if ((!editing || date !== (initial.startsAt ? localDate(initial.startsAt) : '')) && date < todayStr()) { setError('Ngày này đã qua, chọn từ hôm nay trở đi nhé.'); return }
    if (!editing && !allDay && startsAt < new Date()) { setError('Giờ bắt đầu đã qua, chọn giờ muộn hơn nhé.'); return }
    setBusy(true); setError('')
    const payload = { title, description, location, allDay, startsAt: startsAt.toISOString(), endsAt: endsAt ? endsAt.toISOString() : null, ...(cover !== undefined ? { cover } : {}), ...(canCohost ? { cohosts: cohosts.map((c) => ({ email: c.email, name: c.fullName || c.name })) } : {}), ...(!editing && initial.topicId ? { topicId: initial.topicId } : {}) }
    ;(editing ? api.updateEvent(initial.id, payload) : api.createEvent(payload))
      .then((d) => { playSound(); onSaved(d.event) })
      .catch((e) => setError(e?.data?.message || 'Chưa lưu được, thử lại nhé.'))
      .finally(() => setBusy(false))
  }
  const label = (text, req) => <div style={css(`font:700 13px ${FONT}; color:#0F172A;`)}>{text}{req && <span style={css('color:#D8232A;')}> *</span>}</div>
  const field = 'width:100%; box-sizing:border-box; margin-top:6px; height:42px; padding:0 13px; border:1px solid #E6EBF3; border-radius:12px; background:#fff; color:#0F172A; font:500 14px var(--zp-font-text); outline:none;'
  const pill = `height:30px; padding:0 12px; border:none; border-radius:999px; background:rgba(15,23,42,.7); color:#fff; font:700 12px ${FONT}; cursor:pointer;`
  return createPortal(
    <div className="zp-overlay-in" onClick={onClose} style={css('position:fixed; inset:0; z-index:4000; background:rgba(4,10,26,.66); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; padding:24px 16px;')}>
      <div ref={dialog.ref} {...dialog.dialogProps} className="zp-dialog-in zp-soft-ph zp-thinscroll" onClick={(e) => e.stopPropagation()} style={css('width:560px; max-width:100%; max-height:calc(100vh - 48px); overflow-y:auto; background:#fff; border-radius:22px; box-shadow:0 30px 80px rgba(0,0,0,.45);')}>
        {/* header and the Đăng button stay put while the form scrolls between them */}
        <div style={css('position:sticky; top:0; z-index:2; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:16px 20px; border-bottom:1px solid #EEF1F7; background:#fff;')}>
          <button onClick={onClose} style={css(`justify-self:start; border:none; background:none; padding:0; cursor:pointer; font:500 15px ${FONT}; color:#0F172A;`)}>Huỷ</button>
          <div style={css(`font:800 16px ${FONT}; color:#0F172A;`)}>{editing ? 'Sửa sự kiện' : 'Tạo sự kiện'}</div>
          <span />
        </div>
        <div style={css('padding:18px 22px 4px;')}>
          {/* how invitations work, before anything else */}
          {!editing && initial.topicId && <div style={css('margin-bottom:14px; padding:10px 12px; border-radius:10px; background:#E7F9F0; border:1px solid #BEE9D3; font:400 12.5px/1.55 var(--zp-font-text); color:#14532D;')}>Sự kiện cho chủ đề <b>"{initial.topicTitle}"</b>. {initial.topicVotes ? `${initial.topicVotes} người đã quan tâm chủ đề này` : 'Những người đã quan tâm chủ đề này'} sẽ nhận lời mời ngay khi bạn đăng.</div>}
          {!editing && !initial.topicId && <div style={css('margin-bottom:14px; padding:10px 12px; border-radius:10px; background:#F3F6FD; font:400 12.5px/1.55 var(--zp-font-text); color:#475569;')}>Khi có từ 3 người quan tâm (không tính bạn), bạn nhận thông báo để gửi lời mời Outlook: sự kiện thành cuộc họp trong lịch của bạn và mọi người quan tâm nhận lời mời từ bạn. Ai quan tâm sau được mời thêm, và bạn xem được số người đồng ý ngay trong sự kiện.</div>}
          <div>
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
                + Thêm ảnh bìa <span style={css('display:block; margin-top:4px; font:400 12px var(--zp-font-text); color:#64748b;')}>Kích thước đẹp nhất 1920 × 1080</span>
              </button>
            )}
            {coverNote && <div style={css('margin-top:6px; font:400 12px/1.5 var(--zp-font-text); color:#64748b;')}>{coverNote}</div>}
          </div>
          <div style={css('margin-top:14px;')}>{label('Tên sự kiện', true)}<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Ví dụ: Demo Claude Code cho dev, Chia sẻ prompt viết PRD" style={css(field)} /></div>
          <div style={css('margin-top:14px; display:grid; grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr); gap:10px;')}>
            <div>{label('Ngày', true)}<input type="date" min={editing && date < todayStr() ? undefined : todayStr()} value={date} onChange={(e) => setDate(e.target.value)} style={css(field + (date ? '' : 'color:#B3BDCC;'))} /></div>
            <div>{label('Bắt đầu')}<input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={css(field + (start ? '' : 'color:#B3BDCC;'))} /></div>
            <div>{label('Kết thúc')}<input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={css(field + (end ? '' : 'color:#B3BDCC;'))} /></div>
          </div>
          <div style={css('margin-top:14px;')}>{label('Địa điểm', true)}<input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="Ví dụ: Phòng họp tầng 8, Pantry tầng 6 hay link Teams" style={css(field)} /></div>
          {canCohost && <div style={css('margin-top:14px;')}>{label('Người đồng tổ chức')}<CohostPicker value={cohosts} onChange={setCohosts} field={field} /></div>}
          <div style={css('margin-top:14px;')}>{label('Thông tin về sự kiện')}<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={4000} placeholder="Ví dụ: Topic AI sẽ chia sẻ, dành cho ai, cần chuẩn bị gì trước khi đến…" style={css(field + 'height:auto; padding:11px 13px; line-height:1.6; resize:vertical;')} /></div>
          {error && <div style={css(`margin-top:10px; font:600 13px ${FONT}; color:#D8232A;`)}>{error}</div>}
        </div>
        <div style={css('position:sticky; bottom:0; z-index:2; display:flex; justify-content:flex-end; gap:10px; padding:14px 22px 18px; background:#fff; border-top:1px solid #EEF1F7;')}>
          <button onClick={save} disabled={busy} style={css(`height:44px; padding:0 24px; border:none; border-radius:999px; background:${ready ? 'linear-gradient(180deg,#4480ff,#2c5fff)' : '#E3E8F2'}; color:${ready ? '#fff' : '#94a3b8'}; font:700 14px ${FONT}; cursor:pointer; opacity:${busy ? 0.6 : 1};`)}>{busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Đăng sự kiện'}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
