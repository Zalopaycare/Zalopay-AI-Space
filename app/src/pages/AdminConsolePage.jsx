import { useEffect, useRef, useState } from 'react'
import { askRemovalReason } from '../components/RemovalReason.jsx'
import TrendCard from '../components/TrendCard.jsx'
import { useTitle } from '../hooks/useTitle.js'
import { Link } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { api, relativeTime } from '../lib/api.js'
import { usePublishedUseCases } from '../lib/publishedUseCases.js'
import { useNotifications, markNotificationsRead } from '../lib/notifications.js'
import { NOTIF_ICONS } from '../components/notifIcons.jsx'
import logo from '../assets/zalopay-ai-space-logo.png'
import { downloadCsv } from '../lib/csv.js'
import { avatarPhotoCss } from '../components/Avatar.jsx'

// Admin console: review use case submissions and look at the community's real numbers.
// Everything here comes from the API — no sample data.

const AV = ['#2c5fff', '#00A352', '#6F0CE2', '#FF8D00', '#0033C9', '#00B7FF']
const font = (weight, size, lh) => `font:${weight} ${size}px${lh ? '/' + lh : ''} "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif`
const card = 'background:#fff; border:1px solid #E6EBF3; border-radius:18px; box-shadow:0 14px 34px rgba(0,0,0,.30);'
const UC_STATUS = {
  pending: { label: 'Đang chờ duyệt', bg: '#FFF1E0', fg: '#B45300' },
  approved: { label: 'Đã đăng', bg: '#E7F9F0', fg: '#00893F' },
  changes_requested: { label: 'Cần chỉnh sửa', bg: '#FFF4E3', fg: '#9A5B00' },
  rejected: { label: 'Từ chối', bg: '#FFECEC', fg: '#D8232A' },
}
// Who made the last review decision, shown on reviewed submissions (older ones predate the record: "Không rõ").
const REVIEWED_BY = { approved: 'Duyệt bởi', changes_requested: 'Yêu cầu chỉnh sửa bởi', rejected: 'Từ chối bởi' }
const toDate = (t) => new Date(String(t || '').replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(t)) ? '' : 'Z'))
const fmtDate = (t) => { const d = toDate(t); return isNaN(d) ? '—' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
// Microsoft display names look like "Hải. Trần Thanh (5)": drop the "(5)" suffix and the dot after the given name.
// Admin tables show the real domain account (the email handle — people can't edit it). An anonymous post
// shows its public name first with the account in brackets: "Anonymous 5314 (thyndm)".
const realWho = (shown, account, anonymous) => (anonymous ? `${shown || 'Anonymous'} (${account || '?'})` : account || shown || '—')
const cleanName = (n) => String(n || '').replace(/\s*\(\d+\)\s*$/, '').replace(/^([^\s.]+)\.\s+/, '$1 ').trim()
const fmtDay = (d) => (d ? d.split('-').reverse().join('/') : '—') // "2026-09-30" -> "30/09/2026"
// "/use-cases/c7" -> "Đang xem use case: Chuẩn bị pentest…" for the online list.
const PAGE_NAMES = { '/': 'Trang chủ', '/use-cases': 'Use Case Library', '/questions': 'AI Questions', '/profile': 'Trang cá nhân', '/admin': 'Trang Admin' }
const agoLabel = (now, at) => { const m = Math.max(0, Math.round((now - at) / 60_000)); return m < 1 ? 'vừa xong' : m < 60 ? `${m} phút trước` : `${Math.floor(m / 60)} giờ trước` }
const clamp2 = 'display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word;'
const fold = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()

const btn = (kind) => {
  const k = { approve: ['#E7F9F0', '#BEE9D3', '#00893F'], reject: ['#FFECEC', '#F5C9CB', '#D8232A'], changes: ['#FFF4E3', '#F3DCB4', '#9A5B00'], plain: ['#fff', '#DDE3EC', '#3A4757'] }[kind]
  return `height:30px; padding:0 10px; border:1px solid ${k[1]}; border-radius:9px; background:${k[0]}; color:${k[2]}; ${font(700, 11.5)}; cursor:pointer; white-space:nowrap;`
}
const pill = (bg, fg) => `display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${bg}; color:${fg}; ${font(700, 11.5)}; white-space:nowrap;`

function Tabs({ tabs, value, onChange, light = false }) {
  return (
    <div style={css(`display:inline-flex; flex-wrap:wrap; border-radius:999px; padding:4px; gap:4px; ${light ? 'background:#EDF0FA;' : 'background:rgba(255,255,255,.07); border:1px solid rgba(130,170,255,.22); backdrop-filter:blur(12px);'}`)}>
      {tabs.map(([k, label, n]) => (
        <button key={k} onClick={() => onChange(k)} className={value === k ? undefined : hoverClass(light ? 'color:#2c5fff !important;' : 'color:#fff !important; background:rgba(60,110,255,.22) !important;')} style={css(`border:none; cursor:pointer; height:36px; padding:0 14px; border-radius:999px; ${font(700, 12.5)}; white-space:nowrap; background:${value === k ? '#fff' : 'transparent'}; color:${value === k ? '#2c5fff' : light ? '#2A3A57' : '#b4c3e8'};`)}>
          {label}{n != null ? ` · ${n}` : ''}
        </button>
      ))}
    </div>
  )
}

function Search({ value, onChange, placeholder }) {
  return (
    <div style={css('flex:1; min-width:240px; display:flex; align-items:center; gap:10px; height:46px; box-sizing:border-box; background:#fff; border:1px solid #E6EBF3; border-radius:999px; padding:0 18px; box-shadow:0 10px 26px rgba(0,0,0,.25);')}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={css('flex:1; border:none; outline:none; background:transparent; font-size:14px; color:#0f172a;')} />
    </div>
  )
}

function Heading({ title, sub }) {
  return (
    <>
      <h1 style={css('margin:0;' + font(800, 30, 1.15) + ';letter-spacing:-.01em; background:linear-gradient(180deg,#ffffff 0%,#dfeaff 50%,#a9caff 100%); -webkit-background-clip:text; background-clip:text; color:transparent;')}>{title}</h1>
      <p style={css('margin:6px 0 0;' + font(400, 14) + ';color:rgba(206,219,245,.72);')}>{sub}</p>
    </>
  )
}

const Field = ({ label, value }) => (value ? (
  <div style={css('margin-top:16px;')}>
    <div style={css(font(800, 11.5) + ';letter-spacing:.04em;color:#94a3b8; text-transform:uppercase;')}>{label}</div>
    <div style={css('margin-top:5px;' + font(400, 14, 1.65) + ';color:#0f172a; white-space:pre-wrap; word-break:break-word;')}>{value}</div>
  </div>
) : null)

export default function AdminConsolePage() {
  useTitle('Admin')
  usePublishedUseCases() // loads the showcase use cases so topic / AI tool counts include them
  const { user, openLogin, logout } = useAuth()
  const isAdmin = !!user?.isAdmin
  const [section, setSection] = useState(() => (/#reports\b/.test(window.location.hash) ? 'reports' : 'dashboard'))
  const [reports, setReports] = useState([])
  const [dirStatus, setDirStatus] = useState(null) // null = checking
  const [adminStats, setAdminStats] = useState(null)
  const [pubSort, setPubSort] = useState({ key: 'postedAt', dir: 'desc' })
  const [lbPeriod, setLbPeriod] = useState('last30') // shared by Top người đóng góp + Theo phòng ban
  const [repStatus, setRepStatus] = useState('open')
  const [submissions, setSubmissions] = useState([])
  const [questions, setQuestions] = useState([])
  const [users, setUsers] = useState([])
  const [ucStatus, setUcStatus] = useState('pending')
  const [ucQuery, setUcQuery] = useState('')
  const [qStatus, setQStatus] = useState('all')
  const [qQuery, setQQuery] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [userRole, setUserRole] = useState('all') // all | admin | member
  const [userTeam, setUserTeam] = useState('__all')
  const [ucSort, setUcSort] = useState('newest') // newest | waiting (lâu nhất trước)
  const [qDetailId, setQDetailId] = useState(null)
  const [live, setLive] = useState(null) // { online, today, now }
  const [published, setPublished] = useState([])
  const [detailId, setDetailId] = useState(null)
  const [review, setReview] = useState(null) // { id, action: 'approved' | 'rejected' | 'changes_requested' }
  const [reviewNote, setReviewNote] = useState('')
  const askReview = (id, action) => { setReview({ id, action }); setReviewNote('') }
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
  const reloadLive = () => api.adminLive().then(setLive).catch(() => {})
  const reloadPublished = () => api.adminPublished().then((d) => setPublished(d.useCases || [])).catch(() => {})
  const reloadAll = () => Promise.all([reloadSubmissions(), reloadQuestions(), reloadUsers(), reloadReports(), reloadStats(), reloadLive(), reloadPublished()]).then(() => setUpdatedAt(new Date()))
  useEffect(() => { if (isAdmin) { reloadAll(); checkDirectory() } }, [isAdmin])
  // Keep the numbers live while the console is open.
  useEffect(() => { if (!isAdmin) return; const t = setInterval(reloadAll, 60_000); return () => clearInterval(t) }, [isAdmin])
  // "Đang online" changes quickly: refresh it every 20 s.
  useEffect(() => { if (!isAdmin) return; const t = setInterval(reloadLive, 20_000); return () => clearInterval(t) }, [isAdmin])
  useEffect(() => {
    if (!notifOpen) return
    const close = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [notifOpen])

  if (!user || !isAdmin) {
    return (
      <div style={css('min-height:100vh; display:flex; align-items:center; justify-content:center; background:#04060d; padding:24px;')}>
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


  // Every tag mention with its date (question / use case publish time), for the trend cards.
  const mentionsOf = (field) => [
    ...questions.flatMap((q) => (q[field] || []).map((label) => ({ label, time: q.time }))),
    ...approved.flatMap((s) => (s[field] || []).map((label) => ({ label, time: s.publishedAt || s.time }))),
  ]
  const topicMentions = mentionsOf('topics')
  const toolMentions = mentionsOf('tools')

  const now = new Date()
  // Daily movement: what was added today vs. how big the total was before today.
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const today0 = startOfDay(now), yesterday0 = today0 - 86_400_000
  const daily = (list, field) => {
    const ts = list.map((x) => toDate(x[field]).getTime())
    const today = ts.filter((t) => t >= today0).length
    const yesterday = ts.filter((t) => t >= yesterday0 && t < today0).length
    const before = list.length - today
    return { total: list.length, today, yesterday, pct: before > 0 ? Math.round((today / before) * 1000) / 10 : null }
  }
  // KPI numbers come from the server (/api/admin/stats → kpis) so they are counted exactly like the
  // department table. "Comment & reply" = answers + replies under answers + comments on use cases.
  const fromServer = (k) => {
    if (!k) return null
    const before = k.total - k.today
    return { ...k, pct: before > 0 ? Math.round((k.today / before) * 1000) / 10 : null }
  }
  const K = adminStats?.kpis || {}
  const act = adminStats?.activity
  const dauPct = act && act.yesterday > 0 ? Math.round(((act.today - act.yesterday) / act.yesterday) * 1000) / 10 : null
  const stats = [
    { label: 'Câu hỏi', ...(fromServer(K.questions) || daily(questions, 'time')), go: () => setSection('questions') },
    { label: 'Use case gửi duyệt', ...(fromServer(K.submissions) || daily(submissions, 'time')), go: () => { setSection('usecases'); setUcStatus('pending') } },
    { label: 'Thành viên', ...(fromServer(K.users) || daily(users, 'joined')), go: () => setSection('users') },
    { label: 'Comment & reply', ...(fromServer(K.comments) || { total: '—', today: 0, yesterday: 0, pct: null }), go: () => setSection('questions') },
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
  // Waiting for the asker to pick an answer for more than 3 days, counted from the first answer.
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
    .sort((a, b) => (ucSort === 'waiting' ? toDate(a.time) - toDate(b.time) : toDate(b.time) - toDate(a.time)))
  // "Đã đăng": click a column header to sort by it (again to flip high→low / low→high).
  const pubRows = published.filter((c) => !ucq || fold(c.title + ' ' + c.author + ' ' + c.team).includes(ucq))
    .slice().sort((a, b) => {
      const va = pubSort.key === 'postedAt' ? String(a.postedAt || '') : a[pubSort.key] || 0
      const vb = pubSort.key === 'postedAt' ? String(b.postedAt || '') : b[pubSort.key] || 0
      return (va < vb ? -1 : va > vb ? 1 : 0) * (pubSort.dir === 'asc' ? 1 : -1)
    })
  const sortHead = (key, label, align) => {
    const on = pubSort.key === key
    return (
      <button onClick={() => setPubSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))} title={on ? (pubSort.dir === 'desc' ? 'Đang xếp cao → thấp' : 'Đang xếp thấp → cao') : 'Bấm để sắp xếp'}
        style={css(`display:inline-flex; align-items:center; gap:4px; padding:0; border:none; background:none; cursor:pointer; font:inherit; letter-spacing:inherit; color:${on ? '#2c5fff' : 'inherit'}; ${align === 'right' ? 'justify-content:flex-end;' : ''}`)}>
        {label}<span aria-hidden="true" style={{ opacity: on ? 1 : 0.35 }}>{on && pubSort.dir === 'asc' ? '↑' : '↓'}</span>
      </button>
    )
  }
  const detail = submissions.find((s) => s.id === detailId)
  const submitReview = () => {
    const note = reviewNote.trim()
    if (!review || (review.action !== 'approved' && !note)) return
    api.reviewSubmission(review.id, review.action, note).then(() => { reloadSubmissions(); reloadPublished(); setDetailId(null) }).catch(() => {})
    setReview(null); setReviewNote('')
  }
  const remove = (s) => {
    const after = () => { reloadSubmissions(); reloadPublished(); setDetailId(null) }
    // Someone else's post: the reason goes to the author along with the removed content.
    if (s.authorId !== user.id) askRemovalReason({ what: 'use case', title: s.title }).then((r) => r && api.deleteSubmission(s.id, r).then(after).catch(() => {}))
    else setConfirm({ text: `Xoá vĩnh viễn use case "${s.title}"?`, run: () => api.deleteSubmission(s.id).then(after).catch(() => {}) })
  }
  const removeQuestion = (q, after) => {
    if (q.authorId !== user.id) askRemovalReason({ what: 'câu hỏi', title: q.title }).then((r) => r && api.deleteQuestion(q.id, r).then(after).catch(() => {}))
    else setConfirm({ text: `Xoá câu hỏi "${q.title}" cùng toàn bộ câu trả lời?`, run: () => api.deleteQuestion(q.id).then(after).catch(() => {}) })
  }

  // ---- questions ----
  const qq = fold(qQuery.trim())
  const qRows = questions.filter((q) => (qStatus === 'all' || (qStatus === 'resolved' ? q.resolved : qStatus === 'unanswered' ? !q.answers.length : !!q.answers.length && !q.resolved)) && (!qq || fold(q.title + ' ' + q.body + ' ' + q.author + ' ' + (q.fullName || '')).includes(qq)))
  const helpful = (q) => (q.qHelpful || 0) + q.answers.reduce((n, a) => n + (a.helpful || 0), 0)

  // ---- users ----
  const uq = fold(userQuery.trim())
  const teams = Array.from(new Set(users.map((u) => u.team || ''))).sort((a, b) => (a ? a.localeCompare(b, 'vi') : 1) - (b ? 0 : 1))
  const userRows = users.filter((u) => (!uq || fold(u.name + ' ' + u.email + ' ' + u.domain + ' ' + (u.team || '')).includes(uq))
    && (userRole === 'all' || (userRole === 'admin') === !!u.isAdmin)
    && (userTeam === '__all' || (u.team || '') === userTeam))

  const periodName = lbPeriod === 'last30' ? '30-ngay' : 'tat-ca'
  const csvDate = new Date().toISOString().slice(0, 10)
  const exportLeaderboard = () => downloadCsv(`top-nguoi-dong-gop_${periodName}_${csvDate}.csv`, ['Hạng', 'Thành viên', 'Tên', 'Phòng ban', 'Trả lời', 'Comment', 'Like nhận', 'Câu hỏi', 'Use case được duyệt'],
    (adminStats?.leaderboard?.[lbPeriod] || []).map((u, i) => [i + 1, u.domain, cleanName(u.name), u.team, u.answers, u.comments, u.likes, u.questions, u.useCases]))
  const exportUsers = () => downloadCsv(`thanh-vien_${csvDate}.csv`, ['Tên', 'Tên hiển thị', 'Email', 'Phòng ban', 'Vai trò', 'Tham gia', 'Hoạt động gần nhất', 'Câu hỏi', 'Trả lời', 'Use case'],
    userRows.map((u) => [cleanName(u.name), u.domain, u.email, u.team, u.isAdmin ? 'Admin' : 'Thành viên', fmtDate(u.joined), fmtDay(u.lastActive), u.questions, u.answers, u.useCases]))
  const csvBtn = (onClick) => <button onClick={onClick} title="Tải bảng này dưới dạng CSV (mở bằng Excel)" style={css(btn('plain') + 'display:inline-flex; align-items:center; gap:6px; height:36px;')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>Xuất CSV</button>

  const pageLabel = (path) => {
    if (!path) return 'Đang mở trang'
    const m = /^\/use-cases\/([^/?#]+)/.exec(path)
    if (m) { const c = published.find((x) => x.id === decodeURIComponent(m[1])); return 'Đang xem use case' + (c ? ': ' + c.title : '') }
    return 'Đang xem: ' + (PAGE_NAMES[path] || path)
  }

  const menu = [
    ['dashboard', 'Tổng quan', '#2c5fff', 0],
    ['usecases', 'Duyệt use case', '#00A352', pending.length],
    ['questions', 'Câu hỏi', '#FF8D00', unanswered.length],
    ['reports', 'Báo cáo', '#D8232A', reports.filter((r) => r.status === 'open').length],
    ['users', 'Thành viên', '#00B7FF', 0],
  ]

  const grid = (cols) => `display:grid; grid-template-columns:${cols}; gap:14px; align-items:center;`
  const headRow = (cols) => css(grid(cols) + 'padding:11px 20px; background:#F8FAFE; border-bottom:1px solid #EEF1F7;' + font(700, 11.5) + ';letter-spacing:.4px;color:#64748b;')
  const bodyRow = (cols) => css(grid(cols) + 'padding:11px 20px; border-bottom:1px solid #F3F5FA;')
  const empty = (text) => <div style={css('padding:56px 0; text-align:center;' + font(600, 14) + ';color:#94a3b8;')}>{text}</div>
  const UC_COLS = 'minmax(0,2fr) 100px 92px 100px 112px minmax(272px,auto)'
  const P_COLS = 'minmax(0,1fr) 104px 66px 76px 52px 84px 118px'
  const Q_COLS = 'minmax(0,1fr) 110px 58px 62px 128px 118px'
  const U_COLS = 'minmax(0,1fr) 100px 96px 118px 64px 64px 72px'
  const R_COLS = 'minmax(0,1fr) 190px 120px 250px'
  const LB_COLS = '34px minmax(0,1fr) 80px 90px 90px 80px 80px'
  const REP_STATUS = { open: ['Chờ xử lý', '#FFF1E0', '#B45300'], removed: ['Đã xoá nội dung', '#FFECEC', '#D8232A'], dismissed: ['Đã bỏ qua', '#EDF0FA', '#64748b'] }
  const repRows = reports.filter((r) => repStatus === 'all' || (repStatus === 'open' ? r.status === 'open' : r.status !== 'open'))
  const resolveReport = (r, action) => api.resolveReport(r.id, action).then(() => { reloadReports(); if (action === 'delete') reloadQuestions() }).catch(() => {})

  return (
    <div style={css('min-height:100vh; background:radial-gradient(70% 40% at 60% 0%, rgba(44,95,255,.22), transparent 70%), #04060d; color:#e8eefc;')}>
      <header style={css('position:sticky; top:0; z-index:400; height:58px; box-sizing:border-box; background:linear-gradient(90deg, rgba(9,18,58,.86) 0%, rgba(5,9,28,.84) 50%, rgba(9,18,58,.86) 100%); backdrop-filter:blur(16px) saturate(140%); -webkit-backdrop-filter:blur(16px) saturate(140%); border-bottom:1px solid rgba(130,170,255,.12); box-shadow:0 8px 30px rgba(0,0,0,.35);')}>
        <div style={css('display:flex; align-items:center; justify-content:space-between; height:100%; padding:0 24px;')}>
          <div style={css('display:flex; align-items:center; gap:12px;')}>
            <Link to="/" title="Zalopay AI Space" style={{ display: 'flex' }}><img src={logo} alt="Zalopay AI Space" style={{ height: 17, width: 'auto', display: 'block' }} /></Link>
            <span style={css(font(800, 10.5) + ';letter-spacing:.6px;padding:3px 9px;border-radius:999px;background:rgba(60,110,255,.22);border:1px solid rgba(130,175,255,.45);color:#dbe8ff;')}>ADMIN</span>
          </div>
          <div style={css('display:flex; align-items:center; gap:12px;')}>
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button onClick={() => setNotifOpen((o) => !o)} title="Thông báo" aria-label="Thông báo" style={css(`position:relative; display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%; background:${notifOpen ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.06)'}; border:1px solid rgba(255,255,255,.14); cursor:pointer;`)}>
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
              <span style={css(`width:30px; height:30px; border-radius:50%; background:${user.avatarColor || '#2c5fff'}; color:#fff; display:flex; align-items:center; justify-content:center;` + font(800, 11.5) + ';' + avatarPhotoCss(user.avatarUrl))}>{user.initials}</span>
              <span style={css(font(600, 13) + ';color:#fff; white-space:nowrap; max-width:220px; overflow:hidden; text-overflow:ellipsis;')}>{user.domain || user.name}</span>
              <button onClick={() => logout()} className={hoverClass('background:rgba(255,59,48,.28);')} style={css('height:30px; padding:0 12px; border:none; border-radius:999px; background:rgba(255,59,48,.16); color:#ffb4ae;' + font(700, 12) + ';cursor:pointer;')}>Đăng xuất</button>
            </div>
          </div>
        </div>
      </header>

      <div style={css('display:grid; grid-template-columns:224px minmax(0,1fr); align-items:start;')}>
        <aside style={css('position:sticky; top:58px; height:calc(100vh - 58px); box-sizing:border-box; padding:20px 12px; background:radial-gradient(120% 45% at 0% 0%, rgba(70,120,255,.26), transparent 70%), linear-gradient(180deg, rgba(16,32,92,.62) 0%, rgba(9,16,46,.74) 50%, rgba(5,9,26,.86) 100%); backdrop-filter:blur(18px) saturate(140%); -webkit-backdrop-filter:blur(18px) saturate(140%); border-right:1px solid rgba(130,170,255,.16);')}>
          <div style={css('padding:0 12px 10px;' + font(700, 11.5) + ';letter-spacing:.04em;color:#8aa0d6;')}>QUẢN TRỊ</div>
          <div style={css('display:flex; flex-direction:column; gap:2px;')}>
            {menu.map(([k, label, dot, badge]) => (
              <button key={k} onClick={() => setSection(k)} className={section === k ? undefined : hoverClass('background:linear-gradient(90deg,rgba(60,110,255,.30),rgba(60,110,255,.12)) !important; border-color:rgba(130,175,255,.55) !important; color:#dbe8ff !important; box-shadow:0 0 18px rgba(44,95,255,.28) !important;')} style={css(`display:flex; align-items:center; gap:11px; width:100%; height:40px; padding:0 12px; border-radius:12px; cursor:pointer; text-align:left; transition:background .15s, border-color .15s, box-shadow .15s, color .15s; ${section === k ? 'background:linear-gradient(90deg,rgba(60,110,255,.30),rgba(60,110,255,.12)); border:1px solid rgba(130,175,255,.55); color:#dbe8ff; box-shadow:0 0 18px rgba(44,95,255,.28), inset 0 0 12px rgba(120,165,255,.10);' : 'background:transparent; border:1px solid transparent; color:#b4c3e8;'}` + font(section === k ? 700 : 500, 14) + ';')}>
                <span style={css(`flex:none; width:8px; height:8px; border-radius:50%; background:${dot}; box-shadow:0 0 8px ${dot};`)}></span>
                <span style={{ flex: 1 }}>{label}</span>
                {badge > 0 && <span style={css('display:flex; align-items:center; justify-content:center; min-width:20px; height:20px; padding:0 6px; border-radius:999px; background:#FF3B30; color:#fff;' + font(800, 11) + ';')}>{badge}</span>}
              </button>
            ))}
          </div>
        </aside>

        <main style={css('padding:24px 32px 60px; min-width:0; max-width:1240px;')}>
          {section === 'dashboard' && (
            <div>
              <div style={css('display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap;')}>
                <div><Heading title="Tổng quan" sub="Số liệu thật, tự cập nhật mỗi phút. % tăng = phần mới hôm nay so với tổng trước hôm nay." /></div>
                <div style={css('display:flex; align-items:center; gap:10px;')}>
                  <span style={css(font(500, 12.5) + ';color:#94a3b8;')}>{updatedAt ? 'Cập nhật lúc ' + updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Đang tải…'}</span>
                  <button onClick={reloadAll} style={css(btn('plain'))}>Làm mới</button>
                </div>
              </div>

              <div style={css('margin-top:18px; padding:16px 18px;' + card)}>
                <div style={css(font(800, 16) + ';color:#0f172a;')}>Việc cần xử lý <span style={css(font(600, 12.5) + ';color:#64748b;')}>· đang tồn đọng lúc này</span></div>
                {todos.length === 0 ? (
                  <div style={css('display:flex; align-items:center; gap:10px; margin-top:12px;' + font(600, 13.5) + ';color:#00893F;')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                    Không có việc nào đang chờ. Mọi thứ đều ổn!
                  </div>
                ) : (
                  <div style={css('display:flex; flex-direction:column; gap:8px; margin-top:12px;')}>
                    {todos.map((x) => (
                      <div key={x.title} style={css('display:flex; align-items:center; gap:14px; padding:9px 12px; border-radius:14px; background:#F8FAFE; border:1px solid #EEF1F7;')}>
                        <span style={css(font(900, 24) + ';color:#00A352; min-width:34px; text-align:center;')}>{x.n}</span>
                        <div style={css('flex:1; min-width:0;')}>
                          <div style={css(font(700, 14) + ';color:#0f172a;')}>{x.n} {x.title}</div>
                          {x.hint && <div style={css('margin-top:2px;' + font(400, 12.5) + ';color:#64748b;')}>{x.hint}</div>}
                        </div>
                        {/* still to do: green button that gives a little shake every few seconds so it isn't missed */}
                        <button onClick={x.go} className="zp-nudge" style={css(`height:34px; padding:0 14px; border:none; border-radius:999px; background:#00A352; color:#fff; ${font(700, 12.5)}; cursor:pointer; white-space:nowrap; box-shadow:0 6px 16px rgba(0,163,82,.35);`)}>{x.cta} →</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={css('margin-top:16px;' + font(700, 12) + ';letter-spacing:.03em;color:#8fa6d8;')}>CHỈ SỐ CHÍNH · <span style={css(font(500, 12) + ';letter-spacing:0;')}>"Hoạt động hôm nay" tính theo ngày; các thẻ còn lại là tổng từ trước đến nay, kèm số mới hôm nay (giờ Việt Nam)</span></div>
              <div style={css('display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; margin-top:8px;')}>
                {statCards.map((k) => (
                  <button key={k.label} onClick={k.go} className={hoverClass(`border-color:${k.color}; transform:translateY(-2px);`)} style={css(`display:flex; flex-direction:column; align-items:flex-start; gap:6px; padding:14px 16px; text-align:left; cursor:${k.go ? 'pointer' : 'default'}; transition:transform .15s, border-color .15s; ${card}`)}>
                    <span style={css(font(700, 12.5) + ';color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;')}>{k.label}</span>
                    <span style={css(font(900, 26, 1.1) + `;color:${k.color};`)}>{k.value}</span>
                    <span style={css(k.up == null ? pill('#EDF0FA', '#64748b') : k.up ? pill('#E7F9F0', '#00893F') : pill('#FFECEC', '#D8232A'))}>{k.badge}</span>
                    <span style={css(font(500, 11.5) + ';color:#94a3b8; white-space:nowrap;')}>{k.foot}</span>
                  </button>
                ))}
              </div>

              <div style={css('display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:14px; margin-top:14px;')}>
                {[
                  { title: 'Đang online', sub: 'Có mở trang trong 2 phút gần nhất · tự cập nhật 20 giây/lần', rows: live?.online || [], empty: 'Chưa có ai đang online.', online: true },
                  { title: 'Đăng nhập hôm nay', sub: 'Mọi người đã vào trang hôm nay (giờ Việt Nam)', rows: live?.today || [], empty: 'Hôm nay chưa có ai đăng nhập.', online: false },
                ].map((box) => (
                  <div key={box.title} style={css('padding:16px 18px; min-width:0;' + card)}>
                    <div style={css('display:flex; align-items:baseline; justify-content:space-between; gap:10px;')}>
                      <h2 style={css('margin:0;' + font(800, 16) + ';color:#0f172a;')}>{box.title} <span style={css(font(700, 14) + ';color:#2c5fff;')}>· {live ? box.rows.length : '…'}</span></h2>
                    </div>
                    <p style={css('margin:4px 0 12px;' + font(400, 12) + ';color:#94a3b8;')}>{box.sub}</p>
                    {live && box.rows.length === 0 && <div style={css('padding:14px 0;' + font(600, 13) + ';color:#94a3b8;')}>{box.empty}</div>}
                    <div style={css('display:flex; flex-direction:column; max-height:300px; overflow-y:auto;')}>
                      {box.rows.map((u, i) => {
                        const on = (live?.online || []).some((o) => o.id === u.id)
                        const at = box.online ? u.at : u.lastAt
                        return (
                          <div key={u.id} style={css('display:flex; align-items:center; gap:10px; padding:8px 0;' + (i ? 'border-top:1px solid #F3F5FA;' : ''))}>
                            <span style={css('position:relative; flex:none;')}>
                              <span style={css(`width:30px; height:30px; border-radius:50%; background:${u.avatarColor || AV[i % AV.length]}; color:#fff; display:flex; align-items:center; justify-content:center;` + font(800, 11) + ';' + avatarPhotoCss(u.avatarUrl))}>{u.initials}</span>
                              {on && <span title="Đang online" style={css('position:absolute; right:-1px; bottom:-1px; width:10px; height:10px; border-radius:50%; background:#00A352; border:2px solid #fff;')}></span>}
                            </span>
                            <div style={css('flex:1; min-width:0;')}>
                              <div title={u.email} style={css(font(700, 13) + ';color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{cleanName(u.name)} <span style={css(font(500, 12) + ';color:#94a3b8;')}>· {u.domain}</span></div>
                              <div style={css(font(400, 11.5) + ';color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{box.online ? pageLabel(u.path) : (u.team || 'Chưa rõ phòng ban')}</div>
                            </div>
                            <span style={css('flex:none;' + font(500, 11.5) + ';color:#94a3b8;')}>{at ? agoLabel(live.now, at) : ''}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={css('padding:18px 20px; margin-top:14px;' + card)}>
                <div style={css('display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;')}>
                  <div>
                    <h2 style={css('margin:0;' + font(800, 17) + ';color:#0f172a;')}>Top người đóng góp <span style={css(font(600, 13) + ';color:#64748b;')}>· {lbPeriod === 'last30' ? '30 ngày qua' : 'tất cả thời gian'}</span></h2>
                    <p style={css('margin:6px 0 0;' + font(400, 12.5) + ';color:#94a3b8;')}>Xếp theo tổng số đóng góp: trả lời, comment, câu hỏi và use case.</p>
                  </div>
                  <div style={css('display:flex; align-items:center; gap:10px;')}>{csvBtn(exportLeaderboard)}<Tabs light value={lbPeriod} onChange={setLbPeriod} tabs={[['last30', '30 ngày qua'], ['all', 'Tất cả']]} /></div>
                </div>
                <div style={css('margin-top:16px; border:1px solid #EEF1F7; border-radius:14px; overflow:hidden;')}>
                  <div style={headRow(LB_COLS)}><span>#</span><span>THÀNH VIÊN</span><span>TRẢ LỜI</span><span>COMMENT</span><span>LIKE NHẬN</span><span>CÂU HỎI</span><span>USE CASE</span></div>
                  {(adminStats?.leaderboard?.[lbPeriod] || []).map((u, i) => (
                    <div key={u.id} style={bodyRow(LB_COLS)}>
                      <span style={css(font(900, 15) + `;color:${i < 3 ? ['#E0A100', '#8A99AD', '#B8733A'][i] : '#94a3b8'};`)}>{i + 1}</span>
                      <div style={css('display:flex; align-items:center; gap:10px; min-width:0;')}>
                        <span style={css(`flex:none; width:32px; height:32px; border-radius:50%; background:${u.avatarColor || AV[i % AV.length]}; color:#fff; display:flex; align-items:center; justify-content:center;` + font(800, 11.5) + ';' + avatarPhotoCss(u.avatarUrl))}>{u.initials}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={css(font(700, 13.5) + ';color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{u.domain}</div>
                          <div style={css(font(400, 11.5) + ';color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{u.team || u.name}</div>
                        </div>
                      </div>
                      {[u.answers, u.comments, u.likes, u.questions, u.useCases].map((v, j) => <span key={j} style={css(font(700, 13.5) + ';color:#3A4757;')}>{v}</span>)}
                    </div>
                  ))}
                  {adminStats && !(adminStats.leaderboard?.[lbPeriod] || []).length && empty('Chưa có ai đóng góp trong khoảng thời gian này.')}
                </div>
              </div>

              <div style={css('display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:14px;')}>
                <div style={css('padding:18px 20px;' + card)}>
                  <TrendCard title="Topic được quan tâm" mentions={topicMentions} color="#6F0CE2" />
                </div>
                <div style={css('padding:18px 20px;' + card)}>
                  <TrendCard title="Công cụ AI được quan tâm" mentions={toolMentions} color="#2c5fff" />
                </div>
              </div>
            </div>
          )}

          {section === 'usecases' && (
            <div>
              <Heading title="Duyệt use case" sub="Use case người dùng gửi phải được duyệt trước khi đăng. Từ chối cần kèm lý do để tác giả sửa." />
              <div style={css('display:flex; align-items:center; gap:12px; margin-top:18px; flex-wrap:wrap;')}>
                <Search value={ucQuery} onChange={setUcQuery} placeholder="Tìm theo tên use case, tác giả, team..." />
                {ucStatus !== 'published' && <Tabs value={ucSort} onChange={setUcSort} tabs={[['newest', 'Mới gửi trước'], ['waiting', 'Chờ lâu nhất trước']]} />}
                <Tabs value={ucStatus} onChange={setUcStatus} tabs={[['pending', 'Đang đợi duyệt', pending.length], ['changes_requested', 'Đang đợi chỉnh sửa', submissions.filter((x) => x.reviewStatus === 'changes_requested').length], ['published', 'Đã đăng', published.length]]} />
              </div>
              {ucStatus === 'published' ? (
              <div style={css('margin-top:16px; overflow:hidden;' + card)}>
                <div style={headRow(P_COLS)}><span>USE CASE ĐANG ĐĂNG · {sortHead('postedAt', 'NGÀY ĐĂNG')}</span><span>DUYỆT BỞI</span><span>{sortHead('upvotes', 'UPVOTE')}</span><span>{sortHead('comments', 'BÌNH LUẬN')}</span><span>{sortHead('saves', 'LƯU')}</span><span>{sortHead('applied', 'ĐÃ ÁP DỤNG')}</span><span style={{ textAlign: 'right' }}>THAO TÁC</span></div>
                {pubRows.map((c) => {
                  const sub = c.source === 'community' ? submissions.find((x) => x.id === c.id) : null
                  return (
                    <div key={c.id} style={bodyRow(P_COLS)}>
                      <div style={{ minWidth: 0 }}>
                        <a href={`/use-cases/${encodeURIComponent(c.id)}`} target="_blank" rel="noreferrer" title={c.title} className={hoverClass('color:#2c5fff !important;')} style={css(font(700, 14, 1.4) + ';color:#0f172a; overflow-wrap:anywhere; text-decoration:none;' + clamp2)}>{c.title}</a>
                        <div style={css('margin-top:4px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; overflow-wrap:anywhere;' + font(400, 12) + ';color:#94a3b8;')}>
                          <span style={css(c.source === 'showcase' ? pill('#EEF3FF', '#2c5fff') : pill('#F1F4FA', '#3A4757'))}>{c.source === 'showcase' ? 'Showcase' : 'Cộng đồng gửi'}</span>
                          {[c.source === 'community' ? realWho(c.alias || c.author, c.account, c.anonymous) : c.author, c.team !== c.author ? c.team : '', c.postedAt ? 'Đăng ' + fmtDate(c.postedAt) : ''].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <span style={css(font(600, 12.5) + ';color:' + (c.approvedBy ? '#3A4757' : '#94a3b8') + '; overflow-wrap:anywhere;')}>{c.source === 'showcase' ? '—' : c.approvedBy || 'Không rõ'}</span>
                      {[c.upvotes, c.comments, c.saves, c.applied].map((v, j) => <span key={j} style={css(font(800, 14) + ';color:#3A4757;')}>{v}</span>)}
                      <div style={css('display:flex; justify-content:flex-end; gap:7px; flex-wrap:wrap;')}>
                        <a href={`/use-cases/${encodeURIComponent(c.id)}`} target="_blank" rel="noreferrer" style={css(btn('plain') + 'display:inline-flex; align-items:center; text-decoration:none;')}>Mở ↗</a>
                        {sub && <button onClick={() => remove(sub)} style={css(btn('reject'))}>Xoá</button>}
                        {c.source === 'showcase' && <button onClick={() => setConfirm({ text: `Gỡ use case mẫu "${c.title}" khỏi web? Bài sẽ không còn hiện trong Use Case Library.`, run: () => api.adminHideShowcase(c.id).then(reloadPublished).catch(() => {}) })} style={css(btn('reject'))}>Xoá</button>}
                      </div>
                    </div>
                  )
                })}
                {pubRows.length === 0 && empty('Không có use case nào khớp bộ lọc.')}
              </div>
              ) : (
              <div style={css('margin-top:16px; overflow:hidden;' + card)}>
                <div style={headRow(UC_COLS)}><span>USE CASE</span><span>NGƯỜI GỬI</span><span>NGÀY GỬI</span><span>REVIEW BỞI</span><span>TRẠNG THÁI</span><span style={{ textAlign: 'right' }}>THAO TÁC</span></div>
                {ucRows.map((s) => {
                  const st = UC_STATUS[s.reviewStatus] || UC_STATUS.pending
                  return (
                    <div key={s.id} style={bodyRow(UC_COLS)}>
                      <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => setDetailId(s.id)}>
                        <div className={hoverClass('color:#2c5fff;')} style={css(font(700, 14) + ';color:#0f172a; overflow-wrap:anywhere;')}>{s.title}</div>
                        <div style={css('margin-top:4px;' + font(400, 12) + ';color:#94a3b8;')}>{[s.team, [].concat(s.category)[0]].filter(Boolean).join(' · ')}</div>
                        {REVIEWED_BY[s.reviewStatus] && <div style={css('margin-top:4px;' + font(600, 12) + ';color:#475569;')}>{REVIEWED_BY[s.reviewStatus]} <b style={{ color: '#0f172a' }}>{s.reviewedBy || 'Không rõ'}</b>{s.reviewedAt ? ' · ' + relativeTime(s.reviewedAt) : ''}</div>}
                        {s.reviewStatus === 'rejected' && s.adminNote && <div style={css('margin-top:8px; padding:8px 12px; border-radius:10px; background:#FFECEC;' + font(600, 12, 1.5) + ';color:#B4232A;')}>Lý do từ chối: {s.adminNote}</div>}
                        {s.reviewStatus === 'changes_requested' && s.adminNote && <div style={css('margin-top:8px; padding:8px 12px; border-radius:10px; background:#FFF4E3;' + font(600, 12, 1.5) + ';color:#7A4700; white-space:pre-wrap;')}>Đã yêu cầu bổ sung (chờ người gửi sửa): {s.adminNote}</div>}
                      </div>
                      <div style={css(font(600, 12.5) + ';color:#3A4757; overflow:hidden; text-overflow:ellipsis; overflow-wrap:anywhere;')} title={s.anonymous ? 'Đăng ẩn danh' : s.author}>{realWho(s.anonymous ? s.alias || s.authorDomain : s.authorDomain, s.authorAccount, s.anonymous)}</div>
                      <div style={css(font(600, 12.5) + ';color:#3A4757;')}>{fmtDate(s.time)}<div style={css(font(500, 11.5) + ';color:#94a3b8;')}>{relativeTime(s.time)}</div></div>
                      <div style={css(font(600, 12.5) + ';color:' + (s.reviewedBy ? '#3A4757' : '#94a3b8') + '; overflow-wrap:anywhere;')}>{s.reviewedBy || (s.reviewedAt ? 'Không rõ' : '—')}</div>
                      <div><span style={css(pill(st.bg, st.fg))}>{st.label}</span></div>
                      <div style={css('display:flex; justify-content:flex-end; gap:6px; flex-wrap:nowrap;')}>
                        <button onClick={() => setDetailId(s.id)} style={css(btn('plain'))}>Xem</button>
                        {['pending', 'changes_requested'].includes(s.reviewStatus) && <button onClick={() => askReview(s.id, 'approved')} style={css(btn('approve'))}>Duyệt</button>}
                        {s.reviewStatus === 'pending' && <button onClick={() => askReview(s.id, 'changes_requested')} style={css(btn('changes'))}>Yêu cầu sửa</button>}
                        {['pending', 'changes_requested'].includes(s.reviewStatus) && <button onClick={() => askReview(s.id, 'rejected')} style={css(btn('reject'))}>Từ chối</button>}
                        {['approved', 'rejected'].includes(s.reviewStatus) && <button onClick={() => remove(s)} style={css(btn('reject'))}>Xoá</button>}
                      </div>
                    </div>
                  )
                })}
                {ucRows.length === 0 && empty(ucStatus === 'pending' && !ucq ? 'Không có use case nào đang chờ duyệt.' : ucStatus === 'changes_requested' && !ucq ? 'Không có use case nào đang đợi tác giả chỉnh sửa.' : 'Không có use case nào khớp bộ lọc.')}
              </div>
              )}
            </div>
          )}

          {section === 'questions' && (
            <div>
              <Heading title="Câu hỏi" sub="Câu hỏi được đăng trực tiếp. Admin có thể xem và xoá bài không phù hợp." />
              <div style={css('display:flex; align-items:center; gap:12px; margin-top:18px; flex-wrap:wrap;')}>
                <Search value={qQuery} onChange={setQQuery} placeholder="Tìm theo nội dung hoặc tác giả..." />
                <Tabs value={qStatus} onChange={setQStatus} tabs={[['all', 'Tất cả', questions.length], ['unanswered', 'Chưa có trả lời', unanswered.length], ['waiting', 'Chờ chọn đáp án', questions.filter((q) => q.answers.length && !q.resolved).length], ['resolved', 'Đã giải quyết', questions.filter((q) => q.resolved).length]]} />
              </div>
              <div style={css('margin-top:16px; overflow:hidden;' + card)}>
                <div style={headRow(Q_COLS)}><span>CÂU HỎI</span><span>TÁC GIẢ</span><span>TRẢ LỜI</span><span>UPVOTE</span><span>TRẠNG THÁI</span><span style={{ textAlign: 'right' }}>THAO TÁC</span></div>
                {qRows.map((q) => (
                  <div key={q.id} style={bodyRow(Q_COLS)}>
                    <div style={{ minWidth: 0 }}>
                      <div title={q.title} onClick={() => setQDetailId(q.id)} className={hoverClass('color:#2c5fff;')} style={css(font(700, 14, 1.4) + ';color:#0f172a; cursor:pointer;' + clamp2)}>{q.title}</div>
                      <div style={css('margin-top:4px;' + font(400, 12) + ';color:#94a3b8;')}>{[relativeTime(q.time), ...(q.topics || [])].join(' · ')}</div>
                    </div>
                    <div style={css(font(600, 12.5) + ';color:#3A4757; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;')} title={q.anonymous ? `Đăng ẩn danh với tên "${q.author}" · tài khoản thật: ${q.account || q.realAuthor}` : [cleanName(q.fullName), q.account].filter(Boolean).join(' · ')}>{realWho(q.author, q.account || q.realAuthor, q.anonymous)}</div>
                    <div style={css(font(800, 14) + ';color:#3A4757;')}>{q.answers.length}</div>
                    <div style={css(font(800, 14) + ';color:#3A4757;')}>{helpful(q)}</div>
                    <div><span style={css(q.resolved ? pill('#E7F9F0', '#00893F') : q.answers.length ? pill('#EAF0FF', '#2c5fff') : pill('#FFF1E0', '#B45300'))}>{q.resolved ? 'Đã giải quyết' : q.answers.length ? 'Chờ chọn đáp án' : 'Chưa có trả lời'}</span></div>
                    <div style={css('display:flex; justify-content:flex-end; gap:7px;')}>
                      <button onClick={() => setQDetailId(q.id)} style={css(btn('plain'))}>Xem</button>
                      <button onClick={() => removeQuestion(q, reloadQuestions)} style={css(btn('reject'))}>Xoá</button>
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
              <div style={css('display:flex; align-items:center; gap:12px; margin-top:18px;')}>
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
              <Heading title="Thành viên" sub="Những người đã đăng nhập vào Zalopay AI Space." />
              <div style={css('display:flex; align-items:center; gap:12px; margin-top:18px; flex-wrap:wrap;')}>
                <Search value={userQuery} onChange={setUserQuery} placeholder="Tìm theo tên, email hoặc phòng ban..." />
                <select value={userTeam} onChange={(e) => setUserTeam(e.target.value)} aria-label="Lọc theo phòng ban" style={css('height:46px; max-width:260px; padding:0 14px; border:1px solid #E6EBF3; border-radius:999px; background:#fff; color:#0f172a;' + font(600, 13) + ';cursor:pointer; box-shadow:0 10px 26px rgba(0,0,0,.25);')}>
                  <option value="__all">Tất cả phòng ban</option>
                  {teams.map((tm) => <option key={tm || '_'} value={tm}>{tm || 'Chưa rõ phòng ban'}</option>)}
                </select>
                {csvBtn(exportUsers)}
                <Tabs value={userRole} onChange={setUserRole} tabs={[['all', 'Tất cả', users.length], ['admin', 'Admin', users.filter((u) => u.isAdmin).length], ['member', 'Thành viên', users.filter((u) => !u.isAdmin).length]]} />
              </div>
              <div style={css('display:flex; align-items:flex-start; gap:14px; margin-top:18px; padding:16px 18px;' + card + (dirStatus?.state === 'ok' ? 'border-color:#BEE9D3;' : dirStatus ? 'border-color:#F5C9CB;' : ''))}>
                <span style={css(`flex:none; width:10px; height:10px; margin-top:5px; border-radius:50%; background:${!dirStatus ? '#94a3b8' : dirStatus.state === 'ok' ? '#00A352' : dirStatus.state === 'needs_login' ? '#FF8D00' : '#D8232A'};`)}></span>
                <div style={css('flex:1; min-width:0;')}>
                  <div style={css(font(800, 14) + ';color:#0f172a;')}>
                    Gợi ý @mention từ danh bạ công ty: {!dirStatus ? 'đang kiểm tra…' : dirStatus.state === 'ok' ? 'đang hoạt động' : dirStatus.state === 'needs_login' ? 'cần đăng nhập lại' : 'chưa hoạt động'}
                  </div>
                  {dirStatus?.state === 'needs_login' && <div style={css('margin-top:4px;' + font(400, 12.5, 1.6) + ';color:#64748b;')}>Bấm "Đăng xuất" rồi đăng nhập lại bằng Microsoft, sau đó bấm "Kiểm tra lại".</div>}
                  {dirStatus && !['ok', 'needs_login'].includes(dirStatus.state) && <div style={css('margin-top:4px;' + font(400, 12.5, 1.6) + ';color:#64748b;')}>Cần IT hỗ trợ — xem "Chi tiết kỹ thuật" bên dưới.</div>}
                  <details style={css('margin-top:8px;')}>
                    <summary style={css('cursor:pointer;' + font(700, 12.5) + ';color:#2c5fff;')}>Chi tiết kỹ thuật</summary>
                  <div style={css('margin-top:6px;' + font(400, 12.5, 1.6) + ';color:#64748b;')}>
                    {!dirStatus ? 'Đang thử tra danh bạ bằng quyền Delegated của tài khoản bạn…'
                      : dirStatus.state === 'ok' ? `Gõ @ + tên là tìm được mọi người trong công ty, kể cả người chưa từng đăng nhập. Mỗi người cần đăng nhập lại 1 lần sau khi bật tính năng này.${dirStatus.scopes ? ' Quyền: ' + dirStatus.scopes + '.' : ''}`
                      : dirStatus.state === 'needs_login' ? 'Tài khoản của bạn chưa cấp quyền danh bạ cho trang. Bấm "Đăng xuất" rồi đăng nhập lại bằng Microsoft, sau đó bấm "Kiểm tra lại".'
                      : dirStatus.state === 'forbidden' ? `Microsoft từ chối tra danh bạ (${dirStatus.detail}). IT cần cấp Delegated permission User.Read.All cho App Registration SSO và bấm Grant admin consent.${dirStatus.scopes ? ' Quyền token đang có: ' + dirStatus.scopes + '.' : ''}`
                      : dirStatus.state === 'no_sso' ? dirStatus.detail
                      : `Không kiểm tra được: ${dirStatus.detail}`}
                    <div style={{ marginTop: 6 }}>Quyền Admin được cấu hình qua biến môi trường ADMIN_EMAILS (hoặc cờ is_admin trong database).</div>
                  </div>
                  </details>
                </div>
                <button onClick={checkDirectory} style={css(btn('plain'))}>Kiểm tra lại</button>
              </div>
              <div style={css('margin-top:16px; overflow:hidden;' + card)}>
                <div style={headRow(U_COLS)}><span>THÀNH VIÊN</span><span>VAI TRÒ</span><span>THAM GIA</span><span>HOẠT ĐỘNG GẦN NHẤT</span><span>CÂU HỎI</span><span>TRẢ LỜI</span><span>USE CASE</span></div>
                {userRows.map((u, i) => (
                  <div key={u.id} style={bodyRow(U_COLS)}>
                    <div style={css('display:flex; align-items:center; gap:12px; min-width:0;')}>
                      <span style={css(`flex:none; width:36px; height:36px; border-radius:50%; background:${u.avatarColor || AV[i % AV.length]}; color:#fff; display:flex; align-items:center; justify-content:center;` + font(800, 12) + ';' + avatarPhotoCss(u.avatarUrl))}>{u.initials}</span>
                      <div style={{ minWidth: 0 }}>
                        <div title={`${cleanName(u.name)} · ${u.domain}`} style={css(font(700, 14, 1.4) + ';color:#0f172a; word-break:break-word;')}>{cleanName(u.name)} <span style={css(font(500, 12.5) + ';color:#94a3b8;')}>· {u.domain}</span></div>
                        <div title={u.email + (u.team ? ' · ' + u.team : '')} style={css('margin-top:3px;' + font(400, 12, 1.45) + ';color:#64748b; word-break:break-all;')}>{u.email}{u.team ? <span style={{ wordBreak: 'normal' }}> · {u.team}</span> : ''}</div>
                      </div>
                    </div>
                    <div><span style={css(u.isAdmin ? pill('#EDE7FF', '#6F0CE2') : pill('#EDF0FA', '#3A4757'))}>{u.isAdmin ? 'Admin' : 'Thành viên'}</span></div>
                    <div style={css(font(500, 12.5) + ';color:#64748b;')}>{fmtDate(u.joined)}</div>
                    <div style={css(font(500, 12.5) + ';color:#64748b;')}>{fmtDay(u.lastActive)}</div>
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

      {qDetailId && (() => {
        const q = questions.find((x) => x.id === qDetailId)
        if (!q) return null
        const st = q.resolved ? ['Đã giải quyết', '#E7F9F0', '#00893F'] : q.answers.length ? ['Chờ chọn đáp án', '#EAF0FF', '#2c5fff'] : ['Chưa có trả lời', '#FFF1E0', '#B45300']
        const who = (x) => [cleanName(x.fullName), x.author].filter((v, i, a) => v && a.indexOf(v) === i).join(' · ')
        return (
          <div onClick={() => setQDetailId(null)} style={css('position:fixed; inset:0; z-index:900; background:rgba(6,14,40,.55); display:flex; align-items:center; justify-content:center; padding:32px;')}>
            <div role="dialog" aria-modal="true" aria-label={q.title} onClick={(e) => e.stopPropagation()} style={css('width:760px; max-width:100%; max-height:100%; overflow-y:auto; background:#fff; border-radius:22px; padding:28px 32px; box-shadow:0 40px 90px rgba(6,14,40,.5); box-sizing:border-box;')}>
              <div style={css('display:flex; align-items:flex-start; gap:16px;')}>
                <div style={css('flex:1; min-width:0;')}>
                  <span style={css(pill(st[1], st[2]))}>{st[0]}</span>
                  <div style={css('margin-top:12px;' + font(800, 21, 1.35) + ';color:#0f172a; word-break:break-word;')}>{q.title}</div>
                  <div style={css('margin-top:6px;' + font(400, 13) + ';color:#64748b;')}>{who(q)}{q.team ? ' · ' + q.team : ''} · đăng {relativeTime(q.time)} · {helpful(q)} upvote</div>
                </div>
                <button onClick={() => setQDetailId(null)} aria-label="Đóng" style={css('flex:none; width:36px; height:36px; border:1px solid #E6EBF3; border-radius:11px; background:#fff; color:#64748b; cursor:pointer;' + font(700, 16) + ';')}>✕</button>
              </div>
              {[...(q.topics || []), ...(q.tools || [])].length > 0 && (
                <div style={css('display:flex; gap:6px; flex-wrap:wrap; margin-top:14px;')}>
                  {(q.topics || []).map((x) => <span key={'t' + x} style={css(pill('#EAF0FF', '#2c5fff'))}>{x}</span>)}
                  {(q.tools || []).map((x) => <span key={'a' + x} style={css(pill('#F1F4FA', '#3A4757'))}>{x}</span>)}
                </div>
              )}
              <Field label="Nội dung" value={q.body} />
              {(q.images || []).length > 0 && (
                <div style={css('display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;')}>
                  {q.images.map((src) => <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt="" style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid #E6EBF3' }} /></a>)}
                </div>
              )}
              <div style={css('margin-top:20px;' + font(800, 11.5) + ';letter-spacing:.04em;color:#94a3b8; text-transform:uppercase;')}>Câu trả lời ({q.answers.length})</div>
              {q.answers.length === 0 && <div style={css('margin-top:8px;' + font(500, 13.5) + ';color:#94a3b8;')}>Chưa có ai trả lời.</div>}
              <div style={css('display:flex; flex-direction:column; gap:10px; margin-top:10px;')}>
                {q.answers.map((a) => (
                  <div key={a.id} style={css(`padding:12px 14px; border-radius:14px; border:1px solid ${a.accepted ? '#BEE9D3' : '#EEF1F7'}; background:${a.accepted ? '#F2FBF6' : '#F8FAFE'};`)}>
                    <div style={css('display:flex; align-items:center; gap:8px; flex-wrap:wrap;' + font(700, 12.5) + ';color:#0f172a;')}>
                      {who(a)}<span style={css(font(500, 12) + ';color:#94a3b8;')}>· {relativeTime(a.time)} · {a.helpful || 0} upvote</span>
                      {a.accepted && <span style={css(pill('#00A352', '#fff'))}>Câu trả lời được chọn</span>}
                    </div>
                    <div style={css('margin-top:6px;' + font(400, 13.5, 1.6) + ';color:#334155; white-space:pre-wrap; word-break:break-word;')}>{a.body}</div>
                    {(a.comments || []).length > 0 && (
                      <div style={css('margin-top:8px; padding-left:12px; border-left:2px solid #E6EBF3; display:flex; flex-direction:column; gap:6px;')}>
                        {a.comments.map((c) => (
                          <div key={c.id} style={css(font(400, 12.5, 1.55) + ';color:#475569; word-break:break-word;')}><b style={{ color: '#0f172a' }}>{who(c)}</b> <span style={{ color: '#94a3b8' }}>· {relativeTime(c.time)}</span><br />{c.body}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={css('display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:26px; padding-top:18px; border-top:1px solid #EEF1F7;')}>
                <a href={`/questions#q=${encodeURIComponent(q.id)}`} target="_blank" rel="noreferrer" style={css(font(700, 13) + ';color:#2c5fff; text-decoration:none;')}>Mở trang câu hỏi ↗</a>
                <button onClick={() => removeQuestion(q, () => { reloadQuestions(); setQDetailId(null) })} style={css('height:42px; padding:0 20px; border:1px solid #F5C9CB; border-radius:999px; background:#FFECEC; color:#D8232A;' + font(700, 13.5) + ';cursor:pointer;')}>Xoá câu hỏi</button>
              </div>
            </div>
          </div>
        )
      })()}

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
            {detail.reviewStatus === 'changes_requested' && <Field label="Đã yêu cầu bổ sung" value={detail.adminNote} />}
            <div style={css('display:flex; justify-content:flex-end; gap:10px; margin-top:26px; padding-top:18px; border-top:1px solid #EEF1F7;')}>
              {['pending', 'changes_requested'].includes(detail.reviewStatus) ? (
                <>
                  <button onClick={() => askReview(detail.id, 'rejected')} style={css('height:42px; padding:0 20px; border:1px solid #F5C9CB; border-radius:999px; background:#FFECEC; color:#D8232A;' + font(700, 13.5) + ';cursor:pointer;')}>Từ chối</button>
                  {detail.reviewStatus === 'pending' && <button onClick={() => askReview(detail.id, 'changes_requested')} style={css('height:42px; padding:0 20px; border:1px solid #F3DCB4; border-radius:999px; background:#FFF4E3; color:#9A5B00;' + font(700, 13.5) + ';cursor:pointer;')}>Yêu cầu chỉnh sửa</button>}
                  <button onClick={() => askReview(detail.id, 'approved')} style={css('height:42px; padding:0 22px; border:none; border-radius:999px; background:#00A352; color:#fff;' + font(700, 13.5) + ';cursor:pointer;')}>Duyệt & đăng</button>
                </>
              ) : (
                <button onClick={() => remove(detail)} style={css('height:42px; padding:0 20px; border:1px solid #F5C9CB; border-radius:999px; background:#FFECEC; color:#D8232A;' + font(700, 13.5) + ';cursor:pointer;')}>Xoá use case</button>
              )}
            </div>
          </div>
        </div>
      )}

      {review && (() => {
        const target = submissions.find((x) => x.id === review.id) || {}
        const cfg = {
          approved: { title: 'Duyệt & đăng use case này?', desc: 'Use case sẽ hiện ngay trong Use Case Library và ở Home. Người gửi nhận email + thông báo.', label: 'Lời nhắn cho người gửi', required: false, placeholder: 'Không bắt buộc, ví dụ: Cảm ơn bạn, use case rất hữu ích!', cta: 'Duyệt & đăng', color: '#00A352' },
          changes_requested: { title: 'Yêu cầu chỉnh sửa / bổ sung', desc: 'Người gửi nhận email + thông báo kèm ghi chú này, sửa ngay trên bài cũ rồi gửi lại để bạn duyệt.', label: 'Use case còn thiếu gì, cần bổ sung gì?', required: true, placeholder: 'Ví dụ: Bổ sung prompt mẫu đầy đủ, ghi rõ kết quả đo được (tiết kiệm bao nhiêu thời gian), thêm người liên hệ...', cta: 'Gửi yêu cầu chỉnh sửa', color: '#D98200' },
          rejected: { title: 'Từ chối use case này?', desc: 'Use case sẽ không được đăng. Người gửi nhận email + thông báo kèm lý do.', label: 'Lý do từ chối', required: true, placeholder: 'Nêu rõ lý do, ví dụ: trùng với use case đã có, chứa thông tin nội bộ nhạy cảm...', cta: 'Từ chối & gửi lý do', color: '#D8232A' },
        }[review.action]
        const ok = !cfg.required || reviewNote.trim()
        return (
          <div onClick={() => setReview(null)} style={css('position:fixed; inset:0; z-index:950; background:rgba(6,14,40,.55); display:flex; align-items:center; justify-content:center; padding:40px;')}>
            <div onClick={(e) => e.stopPropagation()} style={css('width:540px; max-width:100%; background:#fff; border-radius:22px; padding:28px 30px; box-shadow:0 40px 90px rgba(6,14,40,.5); box-sizing:border-box;' + `border-top:5px solid ${cfg.color};`)}>
              <div style={css(font(800, 19) + ';color:#0f172a;')}>{cfg.title}</div>
              <div style={css('margin-top:6px;' + font(700, 14, 1.5) + ';color:#334155;')}>"{target.title}" <span style={css(font(500, 13) + ';color:#94a3b8;')}>· {target.author}</span></div>
              <div style={css('margin-top:6px;' + font(400, 13, 1.6) + ';color:#64748b;')}>{cfg.desc}</div>
              <div style={css('margin-top:18px;' + font(800, 13) + ';color:#0f172a;')}>{cfg.label} {cfg.required ? <span style={{ color: '#E0353F' }}>*</span> : <span style={css(font(500, 12) + ';color:#94a3b8;')}>(không bắt buộc)</span>}</div>
              <textarea autoFocus value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={review.action === 'approved' ? 2 : 5} placeholder={cfg.placeholder} style={css('width:100%; margin-top:10px; border:1px solid #E6EBF3; border-radius:12px; padding:12px 14px; font-size:14px; line-height:1.6; color:#0f172a; background:#ffffff; outline:none; resize:vertical; display:block; box-sizing:border-box; font-family:inherit;')}></textarea>
              <div style={css('display:flex; justify-content:flex-end; gap:12px; margin-top:20px;')}>
                <button onClick={() => setReview(null)} style={css('height:44px; padding:0 20px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757;' + font(700, 13.5) + ';cursor:pointer;')}>Huỷ</button>
                <button disabled={!ok} onClick={submitReview} style={css(`height:44px; padding:0 22px; border:none; border-radius:999px; background:${cfg.color}; color:#fff;` + font(700, 13.5) + `;cursor:${ok ? 'pointer' : 'not-allowed'}; opacity:${ok ? 1 : 0.5};`)}>{cfg.cta}</button>
              </div>
            </div>
          </div>
        )
      })()}

      {confirm && (
        <div style={css('position:fixed; inset:0; z-index:960; background:rgba(6,14,40,.55); display:flex; align-items:center; justify-content:center; padding:40px;')}>
          <div style={css('width:440px; max-width:100%; background:#fff; border-radius:22px; padding:26px 28px; box-shadow:0 40px 90px rgba(6,14,40,.5); box-sizing:border-box;')}>
            <div style={css(font(800, 17, 1.45) + ';color:#0f172a;')}>{confirm.text}</div>
            <div style={css('margin-top:8px;' + font(400, 13.5) + ';color:#64748b;')}>Không thể hoàn tác.</div>
            <div style={css('display:flex; justify-content:flex-end; gap:12px; margin-top:18px;')}>
              <button onClick={() => setConfirm(null)} style={css('height:42px; padding:0 20px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757;' + font(700, 13.5) + ';cursor:pointer;')}>Huỷ</button>
              <button onClick={() => { confirm.run(); setConfirm(null) }} style={css('height:42px; padding:0 22px; border:none; border-radius:999px; background:#D8232A; color:#fff;' + font(700, 13.5) + ';cursor:pointer;')}>Xoá</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
