import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { api, relativeTime } from '../lib/api.js'
import { allCases, prdMeta } from '../data/useCases.js'
import { useNotifications, markNotificationsRead } from '../lib/notifications.js'
import { NOTIF_ICONS } from '../components/notifIcons.jsx'
import logo from '../assets/zalopay-ai-space-logo.png'

// Admin console: review use case submissions and look at the community's real numbers.
// Everything here comes from the API — no sample data.

const AV = ['#2c5fff', '#00A352', '#6F0CE2', '#FF8D00', '#0033C9', '#00B7FF']
const font = (weight, size, lh) => `font:${weight} ${size}px${lh ? '/' + lh : ''} "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif`
const card = 'background:#fff; border:1px solid #E6EBF3; border-radius:20px; box-shadow:0 10px 24px rgba(30,50,90,.06);'
const UC_STATUS = {
  pending: { label: 'Chờ duyệt', bg: '#FFF1E0', fg: '#B45300' },
  approved: { label: 'Đã đăng', bg: '#E7F9F0', fg: '#00893F' },
  rejected: { label: 'Từ chối', bg: '#FFECEC', fg: '#D8232A' },
}
const toDate = (t) => new Date(String(t || '').replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(t)) ? '' : 'Z'))
const fmtDate = (t) => { const d = toDate(t); return isNaN(d) ? '—' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
const fold = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()

const btn = (kind) => {
  const k = { approve: ['#E7F9F0', '#BEE9D3', '#00893F'], reject: ['#FFECEC', '#F5C9CB', '#D8232A'], plain: ['#fff', '#DDE3EC', '#3A4757'] }[kind]
  return `height:32px; padding:0 12px; border:1px solid ${k[1]}; border-radius:9px; background:${k[0]}; color:${k[2]}; ${font(700, 12)}; cursor:pointer; white-space:nowrap;`
}
const pill = (bg, fg) => `display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${bg}; color:${fg}; ${font(700, 11.5)}; white-space:nowrap;`

function Tabs({ tabs, value, onChange }) {
  return (
    <div style={css('display:inline-flex; background:#EDF0FA; border-radius:12px; padding:5px; gap:5px;')}>
      {tabs.map(([k, label, n]) => (
        <button key={k} onClick={() => onChange(k)} style={css(`border:none; cursor:pointer; height:36px; padding:0 14px; border-radius:9px; ${font(700, 12.5)}; background:${value === k ? '#fff' : 'transparent'}; color:${value === k ? '#2c5fff' : '#2A3A57'};`)}>
          {label}{n != null ? ` · ${n}` : ''}
        </button>
      ))}
    </div>
  )
}

function Search({ value, onChange, placeholder }) {
  return (
    <div style={css('flex:1; display:flex; align-items:center; gap:10px; background:#fff; border:1px solid #E6EBF3; border-radius:12px; padding:11px 16px;')}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={css('flex:1; border:none; outline:none; background:transparent; font-size:14px; color:#0f172a;')} />
    </div>
  )
}

function Heading({ title, sub }) {
  return (
    <>
      <h1 style={css('margin:0;' + font(800, 28) + ';letter-spacing:-.01em;color:#0f172a;')}>{title}</h1>
      <p style={css('margin:8px 0 0;' + font(400, 14.5) + ';color:#64748b;')}>{sub}</p>
    </>
  )
}

function Bars({ rows, color }) {
  const max = rows.reduce((m, r) => Math.max(m, r[1]), 1)
  if (!rows.length) return <div style={css(font(600, 13) + ';color:#94a3b8; padding:10px 0;')}>Chưa có dữ liệu.</div>
  return (
    <div style={css('display:flex; flex-direction:column; gap:12px;')}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <div style={css('display:flex; justify-content:space-between; gap:12px;' + font(600, 12.5) + ';color:#3A4757;')}><span>{label}</span><span style={{ color: '#94a3b8' }}>{value}</span></div>
          <div style={css('margin-top:6px; height:9px; border-radius:999px; background:#EDF0FA; overflow:hidden;')}><div style={css(`height:9px; border-radius:999px; background:${color}; width:${Math.round((value / max) * 100)}%;`)}></div></div>
        </div>
      ))}
    </div>
  )
}

const Field = ({ label, value }) => (value ? (
  <div style={css('margin-top:16px;')}>
    <div style={css(font(800, 11.5) + ';letter-spacing:.04em;color:#94a3b8; text-transform:uppercase;')}>{label}</div>
    <div style={css('margin-top:5px;' + font(400, 14, 1.65) + ';color:#0f172a; white-space:pre-wrap; word-break:break-word;')}>{value}</div>
  </div>
) : null)

export default function AdminConsolePage() {
  const { user, openLogin, logout } = useAuth()
  const isAdmin = !!user?.isAdmin
  const [section, setSection] = useState(() => (/#reports\b/.test(window.location.hash) ? 'reports' : 'dashboard'))
  const [reports, setReports] = useState([])
  const [dirStatus, setDirStatus] = useState(null) // null = checking
  const [adminStats, setAdminStats] = useState(null)
  const [lbPeriod, setLbPeriod] = useState('last30')
  const [repStatus, setRepStatus] = useState('open')
  const [submissions, setSubmissions] = useState([])
  const [questions, setQuestions] = useState([])
  const [users, setUsers] = useState([])
  const [ucStatus, setUcStatus] = useState('pending')
  const [ucQuery, setUcQuery] = useState('')
  const [qStatus, setQStatus] = useState('all')
  const [qQuery, setQQuery] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [detailId, setDetailId] = useState(null)
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [confirm, setConfirm] = useState(null) // { text, run }
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const notif = useNotifications(isAdmin)

  const reloadSubmissions = () => api.listSubmissions().then((d) => setSubmissions(d.submissions || [])).catch(() => {})
  const reloadQuestions = () => api.listQuestions().then((d) => setQuestions(d.questions || [])).catch(() => {})
  const reloadUsers = () => api.adminUsers().then((d) => setUsers(d.users || [])).catch(() => {})
  const checkDirectory = () => { setDirStatus(null); api.directoryStatus().then(setDirStatus).catch(() => setDirStatus({ state: 'error', detail: 'Không gọi được server.' })) }
  const reloadReports = () => api.adminReports().then((d) => setReports(d.reports || [])).catch(() => {})
  const [updatedAt, setUpdatedAt] = useState(null)
  const reloadStats = () => api.adminStats().then(setAdminStats).catch(() => {})
  const reloadAll = () => Promise.all([reloadSubmissions(), reloadQuestions(), reloadUsers(), reloadReports(), reloadStats()]).then(() => setUpdatedAt(new Date()))
  useEffect(() => { if (isAdmin) { reloadAll(); checkDirectory() } }, [isAdmin])
  // Keep the numbers live while the console is open.
  useEffect(() => { if (!isAdmin) return; const t = setInterval(reloadAll, 60_000); return () => clearInterval(t) }, [isAdmin])
  useEffect(() => {
    if (!notifOpen) return
    const close = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [notifOpen])

  if (!user || !isAdmin) {
    return (
      <div style={css('min-height:100vh; display:flex; align-items:center; justify-content:center; background:#eef1f9; padding:24px;')}>
        <div style={css('max-width:420px; text-align:center; padding:40px 32px;' + card)}>
          <div style={css(font(800, 18) + ';color:#0f172a;')}>{!user ? 'Cần đăng nhập' : 'Không có quyền truy cập'}</div>
          <div style={css('margin-top:10px;' + font(400, 14, 1.6) + ';color:#64748b;')}>
            {!user ? 'Bạn cần đăng nhập bằng email công ty để vào trang Admin.' : 'Tài khoản của bạn chưa có quyền Admin. Nếu vừa được thêm quyền, hãy đăng xuất rồi đăng nhập lại.'}
          </div>
          <div style={css('display:flex; align-items:center; justify-content:center; gap:12px; margin-top:20px;')}>
            {!user && <button onClick={() => openLogin()} style={css('height:42px; padding:0 20px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff;' + font(700, 13.5) + ';cursor:pointer;')}>Đăng nhập</button>}
            <Link to="/" style={css('display:inline-flex; height:42px; padding:0 20px; align-items:center; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757;' + font(700, 13.5) + ';text-decoration:none;')}>Về trang chủ</Link>
          </div>
        </div>
      </div>
    )
  }

  // ---- derived data ----
  const pending = submissions.filter((s) => s.reviewStatus === 'pending')
  const approved = submissions.filter((s) => s.reviewStatus === 'approved')
  const unanswered = questions.filter((q) => !q.answers.length)
  const commentsTotal = questions.reduce((n, q) => n + q.answers.length + q.answers.reduce((m, a) => m + (a.comments || []).length, 0), 0)


  const count = (lists) => { const t = {}; lists.forEach((l) => l.forEach((x) => { if (x) t[x] = (t[x] || 0) + 1 })); return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 8) }
  const topTopics = count([...questions.map((q) => q.topics || []), ...approved.map((s) => s.topics || []), ...allCases.map((c) => prdMeta[c.id]?.topics || [])])
  const topTools = count([...questions.map((q) => q.tools || []), ...approved.map((s) => s.tools || []), ...allCases.map((c) => c.tools || [])])

  const now = new Date()
  // Daily movement: what was added today vs. how big the total was before today.
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const today0 = startOfDay(now), yesterday0 = today0 - 86_400_000
  const allComments = questions.flatMap((q) => [...q.answers, ...q.answers.flatMap((a) => a.comments || [])])
  const daily = (list, field) => {
    const ts = list.map((x) => toDate(x[field]).getTime())
    const today = ts.filter((t) => t >= today0).length
    const yesterday = ts.filter((t) => t >= yesterday0 && t < today0).length
    const before = list.length - today
    return { total: list.length, today, yesterday, pct: before > 0 ? Math.round((today / before) * 1000) / 10 : null }
  }
  const act = adminStats?.activity
  const dauPct = act && act.yesterday > 0 ? Math.round(((act.today - act.yesterday) / act.yesterday) * 1000) / 10 : null
  const stats = [
    { label: 'Câu hỏi', ...daily(questions, 'time'), go: () => setSection('questions') },
    { label: 'Use case gửi duyệt', ...daily(submissions, 'time'), go: () => { setSection('usecases'); setUcStatus('all') } },
    { label: 'Thành viên', ...daily(users, 'joined'), go: () => setSection('users') },
    { label: 'Comment & reply', ...daily(allComments, 'time'), go: () => setSection('questions') },
  ]

  const statCards = [
    { label: 'Hoạt động hôm nay', color: '#2c5fff', value: act ? act.today : '—',
      up: dauPct == null ? null : dauPct >= 0, badge: dauPct == null ? 'Chưa có số hôm qua' : `${dauPct >= 0 ? '▲ +' : '▼ '}${dauPct}% so với hôm qua`,
      foot: act ? `Hôm qua: ${act.yesterday} · 7 ngày: ${act.wau}` : '', go: () => setSection('users') },
    ...stats.map((k, i) => ({
      label: k.label, color: ['#6F0CE2', '#00A352', '#FF8D00', '#00A3C4'][i], value: k.total, go: k.go,
      up: k.today ? true : null, badge: k.today ? `▲ +${k.today} hôm nay${k.pct != null ? ` · +${k.pct}%` : ''}` : 'Chưa có mới hôm nay',
      foot: `Hôm qua: +${k.yesterday}`,
    })),
  ]

  // Things an admin should act on, most urgent first.
  const ageDays = (t) => Math.floor((now.getTime() - toDate(t).getTime()) / 86_400_000)
  const openReports = reports.filter((r) => r.status === 'open')
  const staleUnanswered = unanswered.filter((q) => ageDays(q.time) >= 2)
  const oldestPending = pending.reduce((m, s) => Math.max(m, ageDays(s.time)), 0)
  const todos = [
    { n: openReports.length, color: '#D8232A', title: 'comment bị báo cáo', hint: 'Xem và xoá nội dung vi phạm hoặc bỏ qua.', cta: 'Xử lý báo cáo', go: () => { setSection('reports'); setRepStatus('open') } },
    { n: pending.length, color: '#B45300', title: 'use case chờ duyệt', hint: pending.length ? (oldestPending ? `Bài chờ lâu nhất: ${oldestPending} ngày.` : 'Có bài mới gửi hôm nay.') : '', cta: 'Duyệt ngay', go: () => { setSection('usecases'); setUcStatus('pending') } },
    { n: staleUnanswered.length, color: '#2c5fff', title: 'câu hỏi quá 2 ngày chưa ai trả lời', hint: 'Nhắc chuyên gia hoặc tag người phù hợp vào trả lời.', cta: 'Xem câu hỏi', go: () => { setSection('questions'); setQStatus('unanswered') } },
    { n: notif.unread, color: '#6F0CE2', title: 'thông báo chưa đọc', hint: 'Mention, báo cáo và use case mới gửi đến bạn.', cta: 'Mở thông báo', go: () => setNotifOpen(true) },
  ].filter((x) => x.n > 0)

  // ---- use case review ----
  const ucq = fold(ucQuery.trim())
  const ucRows = submissions.filter((s) => (ucStatus === 'all' || s.reviewStatus === ucStatus) && (!ucq || fold(s.title + ' ' + s.author + ' ' + s.team).includes(ucq)))
  const detail = submissions.find((s) => s.id === detailId)
  const approve = (id) => api.reviewSubmission(id, 'approved').then(() => { reloadSubmissions(); setDetailId(null) }).catch(() => {})
  const remove = (s) => setConfirm({ text: `Xoá vĩnh viễn use case "${s.title}"?`, run: () => api.deleteSubmission(s.id).then(() => { reloadSubmissions(); setDetailId(null) }).catch(() => {}) })

  // ---- questions ----
  const qq = fold(qQuery.trim())
  const qRows = questions.filter((q) => (qStatus === 'all' || (qStatus === 'resolved' ? q.resolved : qStatus === 'unanswered' ? !q.answers.length : !!q.answers.length && !q.resolved)) && (!qq || fold(q.title + ' ' + q.body + ' ' + q.author + ' ' + (q.fullName || '')).includes(qq)))
  const helpful = (q) => (q.qHelpful || 0) + q.answers.reduce((n, a) => n + (a.helpful || 0), 0)

  // ---- users ----
  const uq = fold(userQuery.trim())
  const userRows = users.filter((u) => !uq || fold(u.name + ' ' + u.email + ' ' + u.domain).includes(uq))

  const menu = [
    ['dashboard', 'Tổng quan', '#2c5fff', 0],
    ['usecases', 'Duyệt use case', '#00A352', pending.length],
    ['questions', 'Câu hỏi', '#FF8D00', unanswered.length],
    ['reports', 'Báo cáo', '#D8232A', reports.filter((r) => r.status === 'open').length],
    ['users', 'Thành viên', '#00B7FF', 0],
  ]

  const grid = (cols) => `display:grid; grid-template-columns:${cols}; gap:14px; align-items:center;`
  const headRow = (cols) => css(grid(cols) + 'padding:14px 22px; background:#F8FAFE; border-bottom:1px solid #EEF1F7;' + font(700, 11.5) + ';letter-spacing:.4px;color:#64748b;')
  const bodyRow = (cols) => css(grid(cols) + 'padding:16px 22px; border-bottom:1px solid #F3F5FA;')
  const empty = (text) => <div style={css('padding:56px 0; text-align:center;' + font(600, 14) + ';color:#94a3b8;')}>{text}</div>
  const UC_COLS = 'minmax(0,1fr) 170px 110px 230px'
  const Q_COLS = 'minmax(0,1fr) 150px 80px 80px 130px 150px'
  const U_COLS = 'minmax(0,1fr) 110px 120px 80px 80px 80px'
  const R_COLS = 'minmax(0,1fr) 190px 120px 250px'
  const LB_COLS = '34px minmax(0,1fr) 70px 80px 80px 70px 70px 60px'
  const D_COLS = 'minmax(0,1fr) 100px 150px 90px 90px 90px'
  const REP_STATUS = { open: ['Chờ xử lý', '#FFF1E0', '#B45300'], removed: ['Đã xoá nội dung', '#FFECEC', '#D8232A'], dismissed: ['Đã bỏ qua', '#EDF0FA', '#64748b'] }
  const repRows = reports.filter((r) => repStatus === 'all' || (repStatus === 'open' ? r.status === 'open' : r.status !== 'open'))
  const resolveReport = (r, action) => api.resolveReport(r.id, action).then(() => { reloadReports(); if (action === 'delete') reloadQuestions() }).catch(() => {})

  return (
    <div style={css('min-height:100vh; background:#eef1f9; color:#0f172a;')}>
      <header style={css('position:sticky; top:0; z-index:400; background:linear-gradient(180deg,#0c1533 0%,#070b1c 100%);')}>
        <div style={css('display:flex; align-items:center; justify-content:space-between; padding:16px 32px;')}>
          <div style={css('display:flex; align-items:center; gap:12px;')}>
            <img src={logo} alt="Zalopay AI Space" style={{ height: 16, width: 'auto', display: 'block' }} />
            <span style={css(font(800, 10.5) + ';letter-spacing:.6px;padding:3px 8px;border-radius:6px;background:rgba(0,207,106,.18);color:#5ff2a6;')}>ADMIN</span>
          </div>
          <div style={css('display:flex; align-items:center; gap:12px;')}>
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button onClick={() => setNotifOpen((o) => !o)} title="Thông báo" style={css(`position:relative; display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; background:${notifOpen ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.06)'}; border:1px solid rgba(255,255,255,.14); cursor:pointer;`)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dbe6ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
                {notif.unread > 0 && <span style={css('position:absolute; top:-3px; right:-3px; min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:#FF3B30; color:#fff;' + font(800, 10.5) + ';display:flex; align-items:center; justify-content:center; box-sizing:border-box;')}>{notif.unread}</span>}
              </button>
              {notifOpen && (
                <div style={css('position:absolute; right:0; top:50px; width:380px; max-height:460px; overflow-y:auto; background:#fff; border:1px solid #E6EBF3; border-radius:18px; box-shadow:0 26px 60px rgba(6,14,40,.34); z-index:600;')}>
                  <div style={css('display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid #EEF1F7;')}>
                    <span style={css(font(800, 15) + ';color:#0f172a;')}>Thông báo</span>
                    {notif.unread > 0 && <button onClick={() => markNotificationsRead()} style={css('border:none; background:none; padding:0; cursor:pointer;' + font(700, 12) + ';color:#2c5fff;')}>Đánh dấu đã đọc</button>}
                  </div>
                  {notif.items.length === 0 && <div style={css('padding:28px 18px; text-align:center;' + font(600, 13) + ';color:#94a3b8;')}>Chưa có thông báo nào.</div>}
                  {notif.items.map((n) => (
                    <div key={n.id} onClick={() => { if (n.unread) markNotificationsRead([n.id]); if (n.kind === 'submission') { setSection('usecases'); setUcStatus('pending') } else if (n.kind === 'report') { setSection('reports'); setRepStatus('open'); reloadReports() } else if (n.href) window.open(n.href, '_blank'); setNotifOpen(false) }} className={hoverClass('background:#F7F9FD;')} style={css(`display:flex; gap:12px; padding:13px 18px; border-bottom:1px solid #F3F5FA; cursor:pointer; background:${n.unread ? '#F3F7FF' : '#fff'};`)}>
                      <span style={css(`flex:none; width:32px; height:32px; border-radius:10px; background:${n.iconBg}; color:${n.iconFg}; display:flex; align-items:center; justify-content:center;`)}>{NOTIF_ICONS[n.kind] || NOTIF_ICONS.answer}</span>
                      <div style={css('flex:1; min-width:0;')}>
                        <div style={css(font(n.unread ? 800 : 500, 13, 1.5) + `;color:${n.unread ? '#1a5fff' : '#334155'};`)}>{n.text}</div>
                        <div style={css('margin-top:4px;' + font(400, 11.5) + ';color:#94a3b8;')}>{n.timeLabel}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={css('display:flex; align-items:center; gap:10px; padding:4px 6px 4px 4px; border-radius:999px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14);')}>
              <span style={css(`width:32px; height:32px; border-radius:50%; background:${user.avatarColor || '#2c5fff'}; color:#fff; display:flex; align-items:center; justify-content:center;` + font(800, 12) + ';')}>{user.initials}</span>
              <span style={css(font(600, 14) + ';color:#fff; white-space:nowrap; max-width:220px; overflow:hidden; text-overflow:ellipsis;')}>{user.name}</span>
              <button onClick={() => logout()} className={hoverClass('background:rgba(255,59,48,.28);')} style={css('height:30px; padding:0 12px; border:none; border-radius:999px; background:rgba(255,59,48,.16); color:#ffb4ae;' + font(700, 12) + ';cursor:pointer;')}>Đăng xuất</button>
            </div>
          </div>
        </div>
      </header>

      <div style={css('display:grid; grid-template-columns:240px minmax(0,1fr); align-items:start;')}>
        <aside style={css('position:sticky; top:72px; min-height:calc(100vh - 72px); box-sizing:border-box; background:#fff; border-right:1px solid #E6EBF3; padding:26px 16px;')}>
          <div style={css('padding:0 12px 14px;' + font(700, 11.5) + ';letter-spacing:.6px;color:#94a3b8;')}>QUẢN TRỊ</div>
          <div style={css('display:flex; flex-direction:column; gap:4px;')}>
            {menu.map(([k, label, dot, badge]) => (
              <button key={k} onClick={() => setSection(k)} style={css(`display:flex; align-items:center; gap:11px; width:100%; height:46px; padding:0 14px; border:none; border-radius:12px; background:${section === k ? '#EDF3FF' : 'transparent'}; color:${section === k ? '#1E44A8' : '#3A4757'};` + font(700, 14) + ';cursor:pointer; text-align:left;')}>
                <span style={css(`flex:none; width:8px; height:8px; border-radius:50%; background:${dot};`)}></span>
                <span style={{ flex: 1 }}>{label}</span>
                {badge > 0 && <span style={css('display:flex; align-items:center; justify-content:center; min-width:22px; height:22px; padding:0 7px; border-radius:999px; background:#FFF1E0; color:#B45300;' + font(800, 11) + ';')}>{badge}</span>}
              </button>
            ))}
          </div>
        </aside>

        <main style={css('padding:30px 40px 80px; min-width:0;')}>
          {section === 'dashboard' && (
            <div>
              <div style={css('display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap;')}>
                <div><Heading title="Tổng quan" sub="Số liệu thật, tự cập nhật mỗi phút. % tăng = phần mới hôm nay so với tổng trước hôm nay." /></div>
                <div style={css('display:flex; align-items:center; gap:10px;')}>
                  <span style={css(font(500, 12.5) + ';color:#94a3b8;')}>{updatedAt ? 'Cập nhật lúc ' + updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Đang tải…'}</span>
                  <button onClick={reloadAll} style={css(btn('plain'))}>Làm mới</button>
                </div>
              </div>

              <div style={css('margin-top:22px; padding:20px 22px;' + card)}>
                <div style={css(font(800, 16) + ';color:#0f172a;')}>Việc cần xử lý</div>
                {todos.length === 0 ? (
                  <div style={css('display:flex; align-items:center; gap:10px; margin-top:12px;' + font(600, 13.5) + ';color:#00893F;')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                    Không có việc nào đang chờ. Mọi thứ đều ổn!
                  </div>
                ) : (
                  <div style={css('display:flex; flex-direction:column; gap:10px; margin-top:14px;')}>
                    {todos.map((x) => (
                      <div key={x.title} style={css(`display:flex; align-items:center; gap:14px; padding:12px 14px; border-radius:14px; background:#F8FAFE; border:1px solid #EEF1F7; border-left:4px solid ${x.color};`)}>
                        <span style={css(font(900, 24) + `;color:${x.color}; min-width:34px; text-align:center;`)}>{x.n}</span>
                        <div style={css('flex:1; min-width:0;')}>
                          <div style={css(font(700, 14) + ';color:#0f172a;')}>{x.n} {x.title}</div>
                          {x.hint && <div style={css('margin-top:2px;' + font(400, 12.5) + ';color:#64748b;')}>{x.hint}</div>}
                        </div>
                        <button onClick={x.go} style={css(`height:34px; padding:0 14px; border:none; border-radius:999px; background:${x.color}; color:#fff; ${font(700, 12.5)}; cursor:pointer; white-space:nowrap;`)}>{x.cta} →</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={css('display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:14px; margin-top:20px;')}>
                {statCards.map((k) => (
                  <button key={k.label} onClick={k.go} className={hoverClass(`border-color:${k.color}; transform:translateY(-2px);`)} style={css(`display:flex; flex-direction:column; align-items:flex-start; gap:8px; padding:16px 18px; text-align:left; cursor:${k.go ? 'pointer' : 'default'}; transition:transform .15s, border-color .15s; ${card} border-top:4px solid ${k.color};`)}>
                    <span style={css(font(700, 12.5) + ';color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;')}>{k.label}</span>
                    <span style={css(font(900, 30, 1.1) + `;color:${k.color};`)}>{k.value}</span>
                    <span style={css(k.up == null ? pill('#EDF0FA', '#64748b') : k.up ? pill('#E7F9F0', '#00893F') : pill('#FFECEC', '#D8232A'))}>{k.badge}</span>
                    <span style={css(font(500, 11.5) + ';color:#94a3b8; white-space:nowrap;')}>{k.foot}</span>
                  </button>
                ))}
              </div>

              <div style={css('padding:24px 26px; margin-top:20px;' + card)}>
                <div style={css('display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;')}>
                  <div>
                    <h2 style={css('margin:0;' + font(800, 17) + ';color:#0f172a;')}>Top người đóng góp</h2>
                    <p style={css('margin:6px 0 0;' + font(400, 12.5) + ';color:#94a3b8;')}>Điểm = trả lời ×3 + like nhận được ×2 + use case được duyệt ×5 + comment/reply ×1 + câu hỏi ×1.</p>
                  </div>
                  <Tabs value={lbPeriod} onChange={setLbPeriod} tabs={[['last30', '30 ngày qua'], ['all', 'Tất cả']]} />
                </div>
                <div style={css('margin-top:16px; border:1px solid #EEF1F7; border-radius:14px; overflow:hidden;')}>
                  <div style={headRow(LB_COLS)}><span>#</span><span>THÀNH VIÊN</span><span>TRẢ LỜI</span><span>COMMENT</span><span>LIKE NHẬN</span><span>CÂU HỎI</span><span>USE CASE</span><span>ĐIỂM</span></div>
                  {(adminStats?.leaderboard?.[lbPeriod] || []).map((u, i) => (
                    <div key={u.id} style={bodyRow(LB_COLS)}>
                      <span style={css(font(900, 15) + `;color:${i < 3 ? ['#E0A100', '#8A99AD', '#B8733A'][i] : '#94a3b8'};`)}>{i + 1}</span>
                      <div style={css('display:flex; align-items:center; gap:10px; min-width:0;')}>
                        <span style={css(`flex:none; width:32px; height:32px; border-radius:50%; background:${u.avatarColor || AV[i % AV.length]}; color:#fff; display:flex; align-items:center; justify-content:center;` + font(800, 11.5) + ';')}>{u.initials}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={css(font(700, 13.5) + ';color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{u.domain}</div>
                          <div style={css(font(400, 11.5) + ';color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{u.team || u.name}</div>
                        </div>
                      </div>
                      {[u.answers, u.comments, u.likes, u.questions, u.useCases].map((v, j) => <span key={j} style={css(font(700, 13.5) + ';color:#3A4757;')}>{v}</span>)}
                      <span style={css(font(900, 14.5) + ';color:#2c5fff;')}>{u.score}</span>
                    </div>
                  ))}
                  {adminStats && !(adminStats.leaderboard?.[lbPeriod] || []).length && empty('Chưa có ai đóng góp trong khoảng thời gian này.')}
                </div>
              </div>

              <div style={css('padding:24px 26px; margin-top:20px;' + card)}>
                <h2 style={css('margin:0;' + font(800, 17) + ';color:#0f172a;')}>Theo phòng ban</h2>
                <p style={css('margin:6px 0 0;' + font(400, 12.5) + ';color:#94a3b8;')}>Phòng ban lấy từ Microsoft khi mỗi người đăng nhập bằng SSO. Người chưa đăng nhập lại từ khi có tính năng này nằm ở "Chưa rõ phòng ban".</p>
                <div style={css('margin-top:16px; border:1px solid #EEF1F7; border-radius:14px; overflow:hidden;')}>
                  <div style={headRow(D_COLS)}><span>PHÒNG BAN</span><span>THÀNH VIÊN</span><span>HOẠT ĐỘNG 7 NGÀY</span><span>CÂU HỎI</span><span>COMMENT</span><span>USE CASE</span></div>
                  {(adminStats?.departments || []).map((d) => (
                    <div key={d.team || '_'} style={bodyRow(D_COLS)}>
                      <span style={css(font(700, 13.5) + `;color:${d.team ? '#0f172a' : '#94a3b8'};`)}>{d.team || 'Chưa rõ phòng ban'}</span>
                      <span style={css(font(700, 13.5) + ';color:#3A4757;')}>{d.members}</span>
                      <span style={css(font(700, 13.5) + ';color:#3A4757;')}>{d.active7}<span style={css(font(500, 11.5) + ';color:#94a3b8;')}> ({d.members ? Math.round((d.active7 / d.members) * 100) : 0}%)</span></span>
                      <span style={css(font(700, 13.5) + ';color:#3A4757;')}>{d.questions}</span>
                      <span style={css(font(700, 13.5) + ';color:#3A4757;')}>{d.comments}</span>
                      <span style={css(font(700, 13.5) + ';color:#3A4757;')}>{d.useCases}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={css('display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px;')}>
                <div style={css('padding:24px 26px;' + card)}>
                  <h2 style={css('margin:0 0 18px;' + font(800, 17) + ';color:#0f172a;')}>Topic được gắn nhiều nhất</h2>
                  <Bars rows={topTopics} color="linear-gradient(90deg,#8B5CF6,#6F0CE2)" />
                </div>
                <div style={css('padding:24px 26px;' + card)}>
                  <h2 style={css('margin:0 0 18px;' + font(800, 17) + ';color:#0f172a;')}>Công cụ AI được nhắc nhiều nhất</h2>
                  <Bars rows={topTools} color="linear-gradient(90deg,#4480ff,#2c5fff)" />
                </div>
              </div>
            </div>
          )}

          {section === 'usecases' && (
            <div>
              <Heading title="Duyệt use case" sub="Use case người dùng gửi phải được duyệt trước khi đăng. Từ chối cần kèm lý do để tác giả sửa." />
              <div style={css('display:flex; align-items:center; gap:12px; margin-top:22px; flex-wrap:wrap;')}>
                <Search value={ucQuery} onChange={setUcQuery} placeholder="Tìm theo tên use case, tác giả, team..." />
                <Tabs value={ucStatus} onChange={setUcStatus} tabs={[['pending', 'Chờ duyệt', pending.length], ['approved', 'Đã đăng', approved.length], ['rejected', 'Từ chối', submissions.length - pending.length - approved.length], ['all', 'Tất cả', submissions.length]]} />
              </div>
              <div style={css('margin-top:16px; overflow:hidden;' + card)}>
                <div style={headRow(UC_COLS)}><span>USE CASE</span><span>NGƯỜI GỬI</span><span>TRẠNG THÁI</span><span style={{ textAlign: 'right' }}>THAO TÁC</span></div>
                {ucRows.map((s) => {
                  const st = UC_STATUS[s.reviewStatus] || UC_STATUS.pending
                  return (
                    <div key={s.id} style={bodyRow(UC_COLS)}>
                      <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => setDetailId(s.id)}>
                        <div className={hoverClass('color:#2c5fff;')} style={css(font(700, 14) + ';color:#0f172a;')}>{s.title}</div>
                        <div style={css('margin-top:4px;' + font(400, 12) + ';color:#94a3b8;')}>{[s.team, [].concat(s.category)[0], relativeTime(s.time)].filter(Boolean).join(' · ')}</div>
                        {s.reviewStatus === 'rejected' && s.adminNote && <div style={css('margin-top:8px; padding:8px 12px; border-radius:10px; background:#FFECEC;' + font(600, 12, 1.5) + ';color:#B4232A;')}>Lý do từ chối: {s.adminNote}</div>}
                      </div>
                      <div style={css(font(600, 12.5) + ';color:#3A4757; overflow:hidden; text-overflow:ellipsis;')}>{s.author}</div>
                      <div><span style={css(pill(st.bg, st.fg))}>{st.label}</span></div>
                      <div style={css('display:flex; justify-content:flex-end; gap:7px; flex-wrap:wrap;')}>
                        <button onClick={() => setDetailId(s.id)} style={css(btn('plain'))}>Xem</button>
                        {s.reviewStatus === 'pending' && <button onClick={() => approve(s.id)} style={css(btn('approve'))}>Duyệt</button>}
                        {s.reviewStatus === 'pending' && <button onClick={() => { setRejectId(s.id); setRejectReason('') }} style={css(btn('reject'))}>Từ chối</button>}
                        {s.reviewStatus !== 'pending' && <button onClick={() => remove(s)} style={css(btn('reject'))}>Xoá</button>}
                      </div>
                    </div>
                  )
                })}
                {ucRows.length === 0 && empty(ucStatus === 'pending' && !ucq ? 'Không có use case nào đang chờ duyệt.' : 'Không có use case nào khớp bộ lọc.')}
              </div>
            </div>
          )}

          {section === 'questions' && (
            <div>
              <Heading title="Câu hỏi" sub="Câu hỏi được đăng trực tiếp. Admin có thể xem và xoá bài không phù hợp." />
              <div style={css('display:flex; align-items:center; gap:12px; margin-top:22px; flex-wrap:wrap;')}>
                <Search value={qQuery} onChange={setQQuery} placeholder="Tìm theo nội dung hoặc tác giả..." />
                <Tabs value={qStatus} onChange={setQStatus} tabs={[['all', 'Tất cả', questions.length], ['unanswered', 'Chưa có trả lời', unanswered.length], ['waiting', 'Chờ chọn đáp án', questions.filter((q) => q.answers.length && !q.resolved).length], ['resolved', 'Đã giải quyết', questions.filter((q) => q.resolved).length]]} />
              </div>
              <div style={css('margin-top:16px; overflow:hidden;' + card)}>
                <div style={headRow(Q_COLS)}><span>CÂU HỎI</span><span>TÁC GIẢ</span><span>TRẢ LỜI</span><span>UPVOTE</span><span>TRẠNG THÁI</span><span style={{ textAlign: 'right' }}>THAO TÁC</span></div>
                {qRows.map((q) => (
                  <div key={q.id} style={bodyRow(Q_COLS)}>
                    <div style={{ minWidth: 0 }}>
                      <div style={css(font(700, 14) + ';color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;')}>{q.title}</div>
                      <div style={css('margin-top:4px;' + font(400, 12) + ';color:#94a3b8;')}>{[relativeTime(q.time), ...(q.topics || [])].join(' · ')}</div>
                    </div>
                    <div style={css(font(600, 12.5) + ';color:#3A4757;')} title={q.fullName}>{q.author}</div>
                    <div style={css(font(800, 14) + ';color:#3A4757;')}>{q.answers.length}</div>
                    <div style={css(font(800, 14) + ';color:#3A4757;')}>{helpful(q)}</div>
                    <div><span style={css(q.resolved ? pill('#E7F9F0', '#00893F') : q.answers.length ? pill('#EAF0FF', '#2c5fff') : pill('#FFF1E0', '#B45300'))}>{q.resolved ? 'Đã giải quyết' : q.answers.length ? 'Chờ chọn đáp án' : 'Chưa có trả lời'}</span></div>
                    <div style={css('display:flex; justify-content:flex-end; gap:7px;')}>
                      <a href={`/questions#q=${encodeURIComponent(q.id)}`} target="_blank" rel="noreferrer" style={css(btn('plain') + 'display:inline-flex; align-items:center; text-decoration:none;')}>Xem</a>
                      <button onClick={() => setConfirm({ text: `Xoá câu hỏi "${q.title}" cùng toàn bộ câu trả lời?`, run: () => api.deleteQuestion(q.id).then(reloadQuestions).catch(() => {}) })} style={css(btn('reject'))}>Xoá</button>
                    </div>
                  </div>
                ))}
                {qRows.length === 0 && empty('Không có câu hỏi nào khớp bộ lọc.')}
              </div>
            </div>
          )}

          {section === 'reports' && (
            <div>
              <Heading title="Báo cáo" sub="Comment bị người dùng báo cáo. Xoá nội dung nếu vi phạm, hoặc bỏ qua nếu không có vấn đề." />
              <div style={css('display:flex; align-items:center; gap:12px; margin-top:22px;')}>
                <Tabs value={repStatus} onChange={setRepStatus} tabs={[['open', 'Chờ xử lý', reports.filter((r) => r.status === 'open').length], ['done', 'Đã xử lý', reports.filter((r) => r.status !== 'open').length], ['all', 'Tất cả', reports.length]]} />
              </div>
              <div style={css('margin-top:16px; overflow:hidden;' + card)}>
                <div style={headRow(R_COLS)}><span>NỘI DUNG BỊ BÁO CÁO</span><span>NGƯỜI BÁO CÁO</span><span>TRẠNG THÁI</span><span style={{ textAlign: 'right' }}>THAO TÁC</span></div>
                {repRows.map((r) => {
                  const st = REP_STATUS[r.status] || REP_STATUS.open
                  return (
                    <div key={r.id} style={bodyRow(R_COLS)}>
                      <div style={{ minWidth: 0 }}>
                        <div style={css(font(600, 13.5, 1.55) + ';color:#0f172a; white-space:pre-wrap; word-break:break-word;')}>"{r.excerpt}"</div>
                        <div style={css('margin-top:5px;' + font(400, 12) + ';color:#94a3b8;')}>Viết bởi {r.author} · {r.type === 'uc_comment' ? 'comment ở use case' : r.type === 'answer' ? 'comment ở câu hỏi' : 'reply ở câu hỏi'}{r.exists ? '' : ' · nội dung đã bị xoá'}</div>
                        {r.reason && <div style={css('margin-top:8px; padding:8px 12px; border-radius:10px; background:#F8FAFE; border:1px solid #EEF1F7;' + font(500, 12.5, 1.5) + ';color:#3A4757;')}>Lý do: {r.reason}</div>}
                      </div>
                      <div style={css(font(600, 12.5) + ';color:#3A4757;')}>{r.reporter}<div style={css('margin-top:3px;' + font(400, 11.5) + ';color:#94a3b8;')}>{relativeTime(r.time)}</div></div>
                      <div><span style={css(pill(st[1], st[2]))}>{st[0]}</span></div>
                      <div style={css('display:flex; justify-content:flex-end; gap:7px; flex-wrap:wrap;')}>
                        {r.exists && <a href={r.path} target="_blank" rel="noreferrer" style={css(btn('plain') + 'display:inline-flex; align-items:center; text-decoration:none;')}>Xem</a>}
                        {r.status === 'open' && r.exists && <button onClick={() => setConfirm({ text: 'Xoá comment bị báo cáo (và các reply bên dưới)?', run: () => resolveReport(r, 'delete') })} style={css(btn('reject'))}>Xoá nội dung</button>}
                        {r.status === 'open' && <button onClick={() => resolveReport(r, 'dismiss')} style={css(btn('plain'))}>Bỏ qua</button>}
                      </div>
                    </div>
                  )
                })}
                {repRows.length === 0 && empty(repStatus === 'open' ? 'Không có báo cáo nào đang chờ xử lý.' : 'Chưa có báo cáo nào.')}
              </div>
            </div>
          )}

          {section === 'users' && (
            <div>
              <Heading title="Thành viên" sub="Những người đã đăng nhập vào Zalopay AI Space. Quyền Admin được cấu hình qua biến ADMIN_EMAILS." />
              <div style={css('display:flex; align-items:center; gap:12px; margin-top:22px;')}>
                <Search value={userQuery} onChange={setUserQuery} placeholder="Tìm theo tên hoặc email..." />
              </div>
              <div style={css('display:flex; align-items:flex-start; gap:14px; margin-top:18px; padding:16px 18px;' + card + (dirStatus?.state === 'ok' ? 'border-color:#BEE9D3;' : dirStatus ? 'border-color:#F5C9CB;' : ''))}>
                <span style={css(`flex:none; width:10px; height:10px; margin-top:5px; border-radius:50%; background:${!dirStatus ? '#94a3b8' : dirStatus.state === 'ok' ? '#00A352' : dirStatus.state === 'needs_login' ? '#FF8D00' : '#D8232A'};`)}></span>
                <div style={css('flex:1; min-width:0;')}>
                  <div style={css(font(800, 14) + ';color:#0f172a;')}>
                    Gợi ý @mention từ danh bạ công ty (Microsoft Graph): {!dirStatus ? 'đang kiểm tra…' : dirStatus.state === 'ok' ? 'đang hoạt động' : dirStatus.state === 'needs_login' ? 'cần đăng nhập lại' : 'chưa hoạt động'}
                  </div>
                  <div style={css('margin-top:4px;' + font(400, 12.5, 1.6) + ';color:#64748b;')}>
                    {!dirStatus ? 'Đang thử tra danh bạ bằng quyền Delegated của tài khoản bạn…'
                      : dirStatus.state === 'ok' ? `Gõ @ + tên là tìm được mọi người trong công ty, kể cả người chưa từng đăng nhập. Mỗi người cần đăng nhập lại 1 lần sau khi bật tính năng này.${dirStatus.scopes ? ' Quyền: ' + dirStatus.scopes + '.' : ''}`
                      : dirStatus.state === 'needs_login' ? 'Tài khoản của bạn chưa cấp quyền danh bạ cho trang. Bấm "Đăng xuất" rồi đăng nhập lại bằng Microsoft, sau đó bấm "Kiểm tra lại".'
                      : dirStatus.state === 'forbidden' ? `Microsoft từ chối tra danh bạ (${dirStatus.detail}). IT cần cấp Delegated permission User.Read.All cho App Registration SSO và bấm Grant admin consent.${dirStatus.scopes ? ' Quyền token đang có: ' + dirStatus.scopes + '.' : ''}`
                      : dirStatus.state === 'no_sso' ? dirStatus.detail
                      : `Không kiểm tra được: ${dirStatus.detail}`}
                  </div>
                </div>
                <button onClick={checkDirectory} style={css(btn('plain'))}>Kiểm tra lại</button>
              </div>
              <div style={css('margin-top:16px; overflow:hidden;' + card)}>
                <div style={headRow(U_COLS)}><span>THÀNH VIÊN</span><span>VAI TRÒ</span><span>THAM GIA</span><span>CÂU HỎI</span><span>TRẢ LỜI</span><span>USE CASE</span></div>
                {userRows.map((u, i) => (
                  <div key={u.id} style={bodyRow(U_COLS)}>
                    <div style={css('display:flex; align-items:center; gap:12px; min-width:0;')}>
                      <span style={css(`flex:none; width:36px; height:36px; border-radius:50%; background:${u.avatarColor || AV[i % AV.length]}; color:#fff; display:flex; align-items:center; justify-content:center;` + font(800, 12) + ';')}>{u.initials}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={css(font(700, 14) + ';color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;')}>{u.name} <span style={css(font(500, 12.5) + ';color:#94a3b8;')}>· {u.domain}</span></div>
                        <div style={css('margin-top:3px;' + font(400, 12) + ';color:#64748b; overflow:hidden; text-overflow:ellipsis;')}>{u.email}{u.team ? ' · ' + u.team : ''}</div>
                      </div>
                    </div>
                    <div><span style={css(u.isAdmin ? pill('#EDE7FF', '#6F0CE2') : pill('#EDF0FA', '#3A4757'))}>{u.isAdmin ? 'Admin' : 'Thành viên'}</span></div>
                    <div style={css(font(500, 12.5) + ';color:#64748b;')}>{fmtDate(u.joined)}</div>
                    <div style={css(font(800, 14) + ';color:#3A4757;')}>{u.questions}</div>
                    <div style={css(font(800, 14) + ';color:#3A4757;')}>{u.answers}</div>
                    <div style={css(font(800, 14) + ';color:#3A4757;')}>{u.useCases}</div>
                  </div>
                ))}
                {userRows.length === 0 && empty('Không tìm thấy thành viên nào.')}
              </div>
            </div>
          )}
        </main>
      </div>

      {detail && (
        <div onClick={() => setDetailId(null)} style={css('position:fixed; inset:0; z-index:900; background:rgba(6,14,40,.55); display:flex; align-items:center; justify-content:center; padding:32px;')}>
          <div onClick={(e) => e.stopPropagation()} style={css('width:760px; max-width:100%; max-height:100%; overflow-y:auto; background:#fff; border-radius:22px; padding:28px 32px; box-shadow:0 40px 90px rgba(6,14,40,.5); box-sizing:border-box;')}>
            <div style={css('display:flex; align-items:flex-start; gap:16px;')}>
              <div style={css('flex:1; min-width:0;')}>
                <span style={css(pill((UC_STATUS[detail.reviewStatus] || UC_STATUS.pending).bg, (UC_STATUS[detail.reviewStatus] || UC_STATUS.pending).fg))}>{(UC_STATUS[detail.reviewStatus] || UC_STATUS.pending).label}</span>
                <div style={css('margin-top:12px;' + font(800, 21, 1.35) + ';color:#0f172a;')}>{detail.title}</div>
                <div style={css('margin-top:6px;' + font(400, 13) + ';color:#64748b;')}>{detail.author} · {detail.team} · gửi {relativeTime(detail.time)}</div>
              </div>
              <button onClick={() => setDetailId(null)} style={css('flex:none; width:36px; height:36px; border:1px solid #E6EBF3; border-radius:11px; background:#fff; color:#64748b; cursor:pointer;' + font(700, 16) + ';')}>✕</button>
            </div>
            <div style={css('display:flex; gap:6px; flex-wrap:wrap; margin-top:14px;')}>
              {[...[].concat(detail.category), ...(detail.topics || [])].filter(Boolean).map((x) => <span key={'c' + x} style={css(pill('#EAF0FF', '#2c5fff'))}>{x}</span>)}
              {(detail.tools || []).map((x) => <span key={'t' + x} style={css(pill('#F1F4FA', '#3A4757'))}>{x}</span>)}
            </div>
            <Field label="Dành cho" value={detail.audience} />
            <Field label="Vấn đề / bối cảnh" value={detail.problem} />
            <Field label="Giải pháp" value={detail.solution} />
            <Field label="Cần chuẩn bị" value={detail.prep} />
            <Field label="Prompt" value={detail.prompt} />
            <Field label="Kết quả" value={detail.result} />
            <Field label="Giới hạn" value={detail.limits} />
            <Field label="Người liên hệ" value={detail.contact} />
            <Field label="Link" value={detail.link} />
            {detail.reviewStatus === 'rejected' && <Field label="Lý do từ chối" value={detail.adminNote} />}
            <div style={css('display:flex; justify-content:flex-end; gap:10px; margin-top:26px; padding-top:18px; border-top:1px solid #EEF1F7;')}>
              {detail.reviewStatus === 'pending' ? (
                <>
                  <button onClick={() => { setRejectId(detail.id); setRejectReason('') }} style={css('height:42px; padding:0 20px; border:1px solid #F5C9CB; border-radius:999px; background:#FFECEC; color:#D8232A;' + font(700, 13.5) + ';cursor:pointer;')}>Từ chối</button>
                  <button onClick={() => approve(detail.id)} style={css('height:42px; padding:0 22px; border:none; border-radius:999px; background:#00A352; color:#fff;' + font(700, 13.5) + ';cursor:pointer;')}>Duyệt & đăng</button>
                </>
              ) : (
                <button onClick={() => remove(detail)} style={css('height:42px; padding:0 20px; border:1px solid #F5C9CB; border-radius:999px; background:#FFECEC; color:#D8232A;' + font(700, 13.5) + ';cursor:pointer;')}>Xoá use case</button>
              )}
            </div>
          </div>
        </div>
      )}

      {rejectId && (
        <div style={css('position:fixed; inset:0; z-index:950; background:rgba(6,14,40,.55); display:flex; align-items:center; justify-content:center; padding:40px;')}>
          <div style={css('width:520px; max-width:100%; background:#fff; border-radius:22px; padding:28px 30px; box-shadow:0 40px 90px rgba(6,14,40,.5); box-sizing:border-box;')}>
            <div style={css(font(800, 19) + ';color:#0f172a;')}>Từ chối use case</div>
            <div style={css('margin-top:8px;' + font(400, 13.5, 1.6) + ';color:#64748b;')}>{(submissions.find((s) => s.id === rejectId) || {}).title}</div>
            <div style={css('margin-top:20px;' + font(800, 13) + ';color:#0f172a;')}>Lý do từ chối <span style={{ color: '#E0353F' }}>*</span></div>
            <textarea autoFocus value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} placeholder="Nêu rõ điểm cần bổ sung để tác giả sửa và gửi lại. Lý do này sẽ được gửi qua email cho tác giả." style={css('width:100%; margin-top:10px; border:1px solid #E6EBF3; border-radius:12px; padding:12px 14px; font-size:14px; line-height:1.6; color:#0f172a; outline:none; resize:vertical; display:block; box-sizing:border-box; font-family:inherit;')}></textarea>
            <div style={css('display:flex; justify-content:flex-end; gap:12px; margin-top:20px;')}>
              <button onClick={() => { setRejectId(null); setRejectReason('') }} style={css('height:44px; padding:0 20px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757;' + font(700, 13.5) + ';cursor:pointer;')}>Huỷ</button>
              <button
                disabled={!rejectReason.trim()}
                onClick={() => {
                  const reason = rejectReason.trim()
                  if (!reason) return
                  api.reviewSubmission(rejectId, 'rejected', reason).then(() => { reloadSubmissions(); setDetailId(null) }).catch(() => {})
                  setRejectId(null); setRejectReason('')
                }}
                style={css(`height:44px; padding:0 22px; border:none; border-radius:999px; background:#D8232A; color:#fff;` + font(700, 13.5) + `;cursor:pointer; opacity:${rejectReason.trim() ? 1 : 0.5};`)}
              >
                Từ chối & gửi lý do
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div style={css('position:fixed; inset:0; z-index:960; background:rgba(6,14,40,.55); display:flex; align-items:center; justify-content:center; padding:40px;')}>
          <div style={css('width:440px; max-width:100%; background:#fff; border-radius:22px; padding:26px 28px; box-shadow:0 40px 90px rgba(6,14,40,.5); box-sizing:border-box;')}>
            <div style={css(font(800, 17, 1.45) + ';color:#0f172a;')}>{confirm.text}</div>
            <div style={css('margin-top:8px;' + font(400, 13.5) + ';color:#64748b;')}>Không thể hoàn tác.</div>
            <div style={css('display:flex; justify-content:flex-end; gap:12px; margin-top:22px;')}>
              <button onClick={() => setConfirm(null)} style={css('height:42px; padding:0 20px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757;' + font(700, 13.5) + ';cursor:pointer;')}>Huỷ</button>
              <button onClick={() => { confirm.run(); setConfirm(null) }} style={css('height:42px; padding:0 22px; border:none; border-radius:999px; background:#D8232A; color:#fff;' + font(700, 13.5) + ';cursor:pointer;')}>Xoá</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
