import { useEffect, useRef, useState } from 'react'
import { askRemovalReason } from '../components/RemovalReason.jsx'
import TrendCard from '../components/TrendCard.jsx'
import { useTitle } from '../hooks/useTitle.js'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { api, relativeTime } from '../lib/api.js'
import { usePublishedUseCases } from '../lib/publishedUseCases.js'
import { builtinCases, prdMeta } from '../data/useCases.js'
import { useNotifications, markNotificationsRead } from '../lib/notifications.js'
import { NOTIF_ICONS } from '../components/notifIcons.jsx'
import logo from '../assets/zalopay-ai-space-logo.png'
import { downloadCsv } from '../lib/csv.js'
import Avatar, { avatarPhotoCss } from '../components/Avatar.jsx'
import { AdminInbox } from '../components/AdminChat.jsx'
import { useChatUnread } from '../lib/chat.js'
import { toneObj } from '../lib/theme.js'

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
// Who made the last review decision, shown on reviewed submissions (older ones predate the record: the
// REVIEW BỞI column then names the admins who left góp ý, else "Không rõ").
const REVIEWED_BY = { approved: 'Duyệt bởi', changes_requested: 'Yêu cầu chỉnh sửa bởi', rejected: 'Từ chối bởi' }
const toDate = (t) => new Date(String(t || '').replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(t)) ? '' : 'Z'))
const fmtDate = (t) => { const d = toDate(t); return isNaN(d) ? '—' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
// Microsoft display names look like "Hải. Trần Thanh (5)": drop the "(5)" suffix and the dot after the given name.
// Admin tables show the real domain account (the email handle — people can't edit it). An anonymous post
// shows its public name first with the account in brackets: "Anonymous 5314 (thyndm)".
const realWho = (shown, account, anonymous) => (anonymous ? `${shown || 'Anonymous'} (${account || '?'})` : account || shown || '—')
// Use cases can't be posted anonymously any more: admin tables show the real account even on older anonymous posts.
const ucWho = (s) => s.authorAccount || s.account || s.authorDomain || s.author || '—'
// Who reviewed it; decisions from before that was recorded fall back to the admins who left góp ý on it.
const reviewerOf = (by, commenters) => by || ((commenters || []).length ? 'Góp ý: ' + commenters.join(', ') : '')
const foldTitle = (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim()
// % change only means something on a decent base: below 20 the cards show the plain "+N" instead.
const MIN_PCT_BASE = 20
const pctOf = (part, base) => (base >= MIN_PCT_BASE ? Math.round((part / base) * 1000) / 10 : null)
const cleanName = (n) => String(n || '').replace(/\s*\(\d+\)\s*$/, '').replace(/^([^\s.]+)\.\s+/, '$1 ').trim()
const fmtDay = (d) => (d ? d.split('-').reverse().join('/') : '—') // "2026-09-30" -> "30/09/2026"
// "/use-cases/c7" -> "Đang xem use case: Chuẩn bị pentest…" for the online list.
const PAGE_NAMES = { '/': 'AI Space', '/use-cases': 'Use Case Library', '/questions': 'AI Space', '/profile': 'Trang cá nhân', '/admin': 'Trang Admin', '/chat': 'Chat với Admin' }
const agoLabel = (now, at) => { const m = Math.max(0, Math.round((now - at) / 60_000)); return m < 1 ? 'vừa xong' : m < 60 ? `${m} phút trước` : `${Math.floor(m / 60)} giờ trước` }
const clamp2 = 'display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word;'
const fold = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
// Each section has its own URL, so it can be linked to and Back / Forward work. /admin is Tổng quan;
// /admin/inbox/<user id> opens that conversation.
const SLUGS = { dashboard: '', usecases: 'usecases', questions: 'threads', reports: 'reports', users: 'members', inbox: 'inbox', booths: 'booths', access: 'access', admins: 'admins' }
const SECTION_TITLES = { usecases: 'Duyệt use case', questions: 'Post', reports: 'Báo cáo', users: 'Thành viên', inbox: 'Hộp thư', booths: 'Booth Exhibition', access: 'Yêu cầu truy cập', admins: 'Quản trị viên' }
const SECTION_OF = Object.fromEntries(Object.entries(SLUGS).map(([k, v]) => [v, k]))
const sectionPath = (k, sub) => '/admin' + (SLUGS[k] ? '/' + SLUGS[k] : '') + (SLUGS[k] && sub ? '/' + sub : '')
// Thành viên › "Cần dọn": the same mailbox twice (quotes, +tag, case) shares this key
const mailboxKey = (email) => String(email || '').toLowerCase().replace(/["'“”‘’<>\s]/g, '').split('@')[0].replace(/\+.*$/, '')
const QUOTES = /["'“”‘’<>]/

const btn = (kind) => {
  const k = { approve: ['#E7F9F0', '#BEE9D3', '#00893F'], reject: ['#FFECEC', '#F5C9CB', '#D8232A'], changes: ['#FFF4E3', '#F3DCB4', '#9A5B00'], plain: ['#fff', '#DDE3EC', '#3A4757'] }[kind]
  return `height:28px; padding:0 9px; border:1px solid ${k[1]}; border-radius:8px; background:${k[0]}; color:${k[2]}; ${font(700, 11)}; cursor:pointer; white-space:nowrap;`
}
const pill = (bg, fg) => `display:inline-flex; align-items:center; height:22px; padding:0 9px; border-radius:999px; background:${bg}; color:${fg}; ${font(700, 11)}; white-space:nowrap;`

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
  usePublishedUseCases() // loads the showcase use cases so topic / AI tool counts include them
  const { user, openLogin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = !!user?.isAdmin
  // the section comes from the URL: /admin/<slug>[/<sub>]
  const [, slug = '', sub = ''] = /^\/admin\/?([^/]*)\/?([^/]*)/.exec(location.pathname) || []
  const section = SECTION_OF[slug] || 'dashboard'
  useTitle(section === 'dashboard' ? 'Admin' : `${SECTION_TITLES[section]} · Admin`)
  const setSection = (k) => { if (k !== section || sub) navigate(sectionPath(k)) }
  // "Hộp thư": the open "Chat với Admin" conversation, /admin/inbox/<user id>
  const chatUid = section === 'inbox' ? Number(sub) || null : null
  const setChatUid = (id) => navigate(sectionPath('inbox', id || ''))
  // older links (notifications, emails) point at /admin#reports, #access, #inbox/<id>; an unknown slug goes to Tổng quan
  useEffect(() => {
    const m = /^#(reports|inbox|access)(?:\/(\d+))?/.exec(location.hash)
    if (m) navigate(sectionPath(m[1], m[2]), { replace: true })
    else if (slug && !SECTION_OF[slug]) navigate('/admin', { replace: true })
  }, [location.hash, slug]) // eslint-disable-line react-hooks/exhaustive-deps
  const chatInbox = useChatUnread(isAdmin).inbox
  // "Booth Exhibition": AI Exhibition booths and how far their owners are with the write-up
  const [booths, setBooths] = useState(null)
  const [boothTab, setBoothTab] = useState('all')
  const [boothMsg, setBoothMsg] = useState('')
  const reloadBooths = () => api.adminBooths().then((d) => setBooths(d.booths || [])).catch(() => setBooths((b) => b || []))
  useEffect(() => { if (isAdmin && section === 'booths') reloadBooths() }, [isAdmin, section]) // eslint-disable-line react-hooks/exhaustive-deps
  // "Yêu cầu truy cập": people sign-in turned away (Microsoft doesn't list them under Zalopay) asking to be let in
  const [access, setAccess] = useState({ requests: [], grants: [] })
  const [admins, setAdmins] = useState([])
  const [newAdmin, setNewAdmin] = useState('')
  const [adminMsg, setAdminMsg] = useState('')
  const reloadAdmins = () => api.adminAdmins().then((d) => setAdmins(d.admins || [])).catch(() => {})
  const addAdmin = () => {
    const email = newAdmin.trim().toLowerCase()
    if (!email) return
    setAdminMsg('')
    api.addAdmin(email).then((d) => { setAdmins(d.admins || []); setNewAdmin(''); setAdminMsg('Đã thêm ' + email + ' làm admin.') }).catch((e) => setAdminMsg(e.message || 'Chưa thêm được, thử lại nhé.'))
  }
  const removeAdmin = (email) => {
    if (!window.confirm('Bỏ quyền admin của ' + email + '?')) return
    setAdminMsg('')
    api.removeAdmin(email).then((d) => { setAdmins(d.admins || []); reloadUsers() }).catch((e) => { setAdminMsg(e.message || 'Chưa bỏ được, thử lại nhé.'); window.alert(e.message || 'Chưa bỏ được, thử lại nhé.') })
  }
  // Thành viên › ⋯ › "Đặt làm Admin": the same add as Quản trị viên
  const makeAdmin = (u) => {
    if (!window.confirm(`Đặt ${u.email} làm admin? Người này sẽ vào được trang Admin, duyệt use case và xử lý báo cáo.`)) return
    api.addAdmin(u.email).then((d) => { setAdmins(d.admins || []); reloadUsers() }).catch((e) => window.alert(e.message || 'Chưa thêm được, thử lại nhé.'))
  }
  const [rowMenu, setRowMenu] = useState(null) // Thành viên › ⋯: { id, x, y } (fixed, so the table's scroll box doesn't clip it)
  useEffect(() => {
    if (!rowMenu) return
    const close = (e) => { if (!e.target.closest || !e.target.closest('[data-row-menu]')) setRowMenu(null) }
    const off = () => setRowMenu(null)
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', off, true)
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', off, true) }
  }, [rowMenu])
  const [accessTab, setAccessTab] = useState('pending')
  const reloadAccess = () => api.adminAccess().then(setAccess).catch(() => {})
  const [reports, setReports] = useState([])
  const [dirStatus, setDirStatus] = useState(null) // null = checking
  const [adminStats, setAdminStats] = useState(null)
  const [pubSort, setPubSort] = useState({ key: 'postedAt', dir: 'desc' })
  const [lbPeriod, setLbPeriod] = useState('last30') // shared by Top người đóng góp + Theo phòng ban
  const [acctOpen, setAcctOpen] = useState(false)
  const acctRef = useRef(null)
  useEffect(() => {
    if (!acctOpen) return
    const close = (e) => { if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [acctOpen])
  const [memberQ, setMemberQ] = useState('') // search in the "Đã đăng nhập" list
  const [repStatus, setRepStatus] = useState('open')
  const [submissions, setSubmissions] = useState([])
  const [questions, setQuestions] = useState([])
  const [users, setUsers] = useState([])
  const [ucStatus, setUcStatus] = useState('pending')
  const [ucQuery, setUcQuery] = useState('')
  // ticked rows in "Duyệt use case", for deleting many at once (e.g. a tester's posts)
  const [ucPicked, setUcPicked] = useState(() => new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [qStatus, setQStatus] = useState('all')
  const [qQuery, setQQuery] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [userRole, setUserRole] = useState('all') // all | admin | member | cleanup ("Cần dọn")
  const [userTeam, setUserTeam] = useState('__all')
  const [ucSort, setUcSort] = useState('newest') // newest | waiting (lâu nhất trước)
  const [qDetailId, setQDetailId] = useState(null)
  const [live, setLive] = useState(null) // { online, today, now }
  const [published, setPublished] = useState([])
  const [detailId, setDetailId] = useState(null)
  const [review, setReview] = useState(null) // { id, action: 'approved' | 'rejected' | 'changes_requested' } or { ids: [...], action } for ticked rows
  const [reviewNote, setReviewNote] = useState('')
  const askReview = (id, action) => { setReview({ id, action }); setReviewNote('') }
  const [confirm, setConfirm] = useState(null) // { text, run, cta?, note?, color? } (defaults: a red "Xoá", "Không thể hoàn tác.")
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
  const reloadAll = () => Promise.all([reloadSubmissions(), reloadQuestions(), reloadUsers(), reloadReports(), reloadStats(), reloadLive(), reloadPublished(), reloadAccess(), reloadAdmins()]).then(() => setUpdatedAt(new Date()))
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


  // Every tag mention with its date (thread / use case publish time), for the trend cards. Use cases count
  // their category as a topic, and the showcase cases on the site count too (threads rarely carry tags now).
  const mentionsOf = (field) => [
    ...questions.flatMap((q) => (q[field] || []).map((label) => ({ label, time: q.time }))),
    ...approved.flatMap((s) => [...(s[field] || []), ...(field === 'topics' ? [].concat(s.category || []) : [])].map((label) => ({ label, time: s.publishedAt || s.time }))),
    ...builtinCases.filter((c) => c.postedAt).flatMap((c) => (field === 'tools' ? c.tools || [] : [c.category, ...(prdMeta[c.id]?.topics || [])]).filter(Boolean).map((label) => ({ label, time: c.postedAt }))),
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
    return { total: list.length, today, yesterday, pct: pctOf(today, before) }
  }
  // KPI numbers come from the server (/api/admin/stats → kpis) so they are counted exactly like the
  // department table. "Comment & reply" = answers + replies under answers + comments on use cases.
  const fromServer = (k) => {
    if (!k) return null
    const before = k.total - k.today
    return { ...k, pct: pctOf(k.today, before) }
  }
  const K = adminStats?.kpis || {}
  const act = adminStats?.activity
  const dauPct = act ? pctOf(act.today - act.yesterday, act.yesterday) : null
  const dauDiff = act ? act.today - act.yesterday : 0
  // "Use case gửi duyệt" = every community submission = the four tabs of Duyệt use case (Đang đợi duyệt +
  // Đang đợi chỉnh sửa + Đã đăng + Từ chối), counted from the same list as the tabs so the sum always matches.
  // The showcase cases AI Space wrote were never submitted: they have their own tab "Use case mẫu".
  const ucCount = (st) => submissions.filter((s) => s.reviewStatus === st).length
  const showcaseLive = published.filter((c) => c.source === 'showcase').length
  const ucSplit = `Chờ duyệt ${ucCount('pending')} · Chờ sửa ${ucCount('changes_requested')} · Đã đăng ${ucCount('approved')} · Từ chối ${ucCount('rejected')}`
  const subKpi = fromServer(K.submissions) || daily(submissions, 'time')
  const stats = [
    { label: 'Post', ...(fromServer(K.questions) || daily(questions, 'time')), go: () => setSection('questions') },
    { label: 'Use case gửi duyệt', ...subKpi, total: submissions.length, pct: pctOf(subKpi.today, submissions.length - subKpi.today), go: () => { setSection('usecases'); setUcStatus('pending') },
      split: ucSplit + (showcaseLive ? ` · chưa tính ${showcaseLive} use case mẫu` : ''), splitTitle: `Tổng = 4 tab đầu ở Duyệt use case. ${showcaseLive} use case mẫu (showcase, AI Space viết sẵn) không qua duyệt nên nằm riêng ở tab Use case mẫu.` },
    { label: 'Thành viên', ...(fromServer(K.users) || daily(users, 'joined')), go: () => setSection('users') },
    { label: 'Comment & reply', ...(fromServer(K.comments) || { total: '—', today: 0, yesterday: 0, pct: null }), go: () => setSection('questions') },
  ]

  const statCards = [
    { label: 'Hoạt động hôm nay', color: '#2c5fff', value: act ? act.today : '—',
      up: !act || (!act.yesterday && !act.today) ? null : dauDiff >= 0,
      badge: !act || (!act.yesterday && !act.today) ? 'Chưa có số hôm qua' : dauPct != null ? `${dauPct >= 0 ? '▲ +' : '▼ '}${dauPct}% so với hôm qua` : `${dauDiff >= 0 ? '▲ +' : '▼ '}${dauDiff} so với hôm qua`,
      foot: act ? `Hôm qua: ${act.yesterday} · 7 ngày: ${act.wau}` : '', go: () => setSection('users') },
    ...stats.map((k, i) => ({
      label: k.label, color: ['#6F0CE2', '#00A352', '#FF8D00', '#00A3C4'][i], value: k.total, go: k.go,
      up: k.today ? true : null, badge: k.today ? `▲ +${k.today} hôm nay${k.pct != null ? ` · +${k.pct}%` : ''}` : 'Chưa có mới hôm nay',
      foot: `Hôm qua: +${k.yesterday}`, split: k.split, splitTitle: k.splitTitle,
    })),
  ]

  // Things an admin should act on, most urgent first.
  const ageDays = (t) => Math.floor((now.getTime() - toDate(t).getTime()) / 86_400_000)
  const openReports = reports.filter((r) => r.status === 'open')
  const staleUnanswered = unanswered.filter((q) => ageDays(q.time) >= 2)
  // Waiting for the asker to pick an answer for more than 3 days, counted from the first answer.
  const oldestPending = pending.reduce((m, s) => Math.max(m, ageDays(s.time)), 0)
  const todos = [
    { n: openReports.length, color: '#D8232A', title: 'comment / post bị báo cáo', hint: 'Xem và xoá nội dung vi phạm hoặc bỏ qua.', cta: 'Xử lý báo cáo', go: () => { setSection('reports'); setRepStatus('open') } },
    { n: pending.length, color: '#B45300', title: 'use case chờ duyệt', hint: pending.length ? (oldestPending ? `Bài chờ lâu nhất: ${oldestPending} ngày.` : 'Có bài mới gửi hôm nay.') : '', cta: 'Duyệt ngay', go: () => { setSection('usecases'); setUcStatus('pending') } },
    { n: staleUnanswered.length, color: '#2c5fff', title: 'post quá 2 ngày chưa ai trả lời', hint: 'Nhắc chuyên gia hoặc tag người phù hợp vào trả lời.', cta: 'Xem post', go: () => { setSection('questions'); setQStatus('unanswered') } },
    { n: notif.unread, color: '#6F0CE2', title: 'thông báo chưa đọc', hint: 'Mention, báo cáo và use case mới gửi đến bạn.', cta: 'Mở thông báo', go: () => setNotifOpen(true) },
  ].filter((x) => x.n > 0)

  // ---- use case review ----
  const ucq = fold(ucQuery.trim())
  const ucRows = submissions.filter((s) => (ucStatus === 'all' || s.reviewStatus === ucStatus) && (!ucq || fold(s.title + ' ' + s.author + ' ' + ucWho(s) + ' ' + s.team).includes(ucq)))
    .sort((a, b) => (ucSort === 'waiting' ? toDate(a.time) - toDate(b.time) : toDate(b.time) - toDate(a.time)))
  // "Đã đăng" (community posts) and "Use case mẫu" (showcase): click a column header to sort by it (again to flip).
  const pubRows = published.filter((c) => (ucStatus === 'showcase' ? c.source === 'showcase' : c.source !== 'showcase') && (!ucq || fold(c.title + ' ' + c.author + ' ' + (c.account || '') + ' ' + c.team).includes(ucq)))
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
  // Same author, same title, another post still pending or live: flagged in the list (the share form warns too).
  const twinOf = (s) => submissions.find((x) => x.id !== s.id && x.authorId === s.authorId && foldTitle(x.title) === foldTitle(s.title) && ['pending', 'changes_requested', 'approved'].includes(x.reviewStatus))
  const detail = submissions.find((s) => s.id === detailId)
  const submitReview = async () => {
    const note = reviewNote.trim()
    if (!review || (review.action !== 'approved' && !note)) return
    const ids = review.ids || [review.id]
    setReview(null); setReviewNote('')
    // ticked rows: one call per use case, the same as reviewing each by hand (each author gets their own email)
    if (review.ids) setBulkBusy(true)
    let failed = 0
    for (const id of ids) { try { await api.reviewSubmission(id, review.action, note) } catch { failed++ } }
    if (review.ids) { setBulkBusy(false); setUcPicked(new Set()) }
    if (failed) window.alert(`${failed}/${ids.length} use case chưa xử lý được, thử lại nhé.`)
    reloadSubmissions(); reloadPublished(); setDetailId(null)
  }
  // which review actions fit the ticked rows (Duyệt: chờ duyệt or chờ sửa; Yêu cầu sửa: chờ duyệt only)
  const BULK_OK = { approved: ['pending', 'changes_requested'], changes_requested: ['pending'], rejected: ['pending', 'changes_requested'] }
  const pickedFor = (rows, action) => rows.filter((s) => ucPicked.has(s.id) && (!action || BULK_OK[action].includes(s.reviewStatus)))
  const askBulkReview = (rows, action) => { const ids = pickedFor(rows, action).map((s) => s.id); if (ids.length) { setReview({ ids, action }); setReviewNote('') } }
  const remove = (s) => {
    const after = () => { reloadSubmissions(); reloadPublished(); setDetailId(null) }
    // Someone else's post: the reason goes to the author along with the removed content.
    if (s.authorId !== user.id) askRemovalReason({ what: 'use case', title: s.title }).then((r) => r && api.deleteSubmission(s.id, r).then(after).catch(() => {}))
    else setConfirm({ text: `Xoá vĩnh viễn use case "${s.title}"?`, run: () => api.deleteSubmission(s.id).then(after).catch(() => {}) })
  }
  // Delete every ticked use case that's still in the list, whatever its status. One reason for all; the
  // dialog's "bài test" choice sends TEST_REMOVAL so nobody is notified.
  const removePicked = (rows) => {
    const list = rows.filter((s) => ucPicked.has(s.id))
    if (!list.length) return
    askRemovalReason({ what: `${list.length} use case`, title: list.length === 1 ? list[0].title : '' }).then(async (reason) => {
      if (!reason) return
      setBulkBusy(true)
      for (const s of list) { try { await api.deleteSubmission(s.id, reason) } catch { /* keep going */ } }
      setBulkBusy(false); setUcPicked(new Set()); reloadSubmissions(); reloadPublished()
    })
  }
  const removeQuestion = (q, after) => {
    if (q.authorId !== user.id) askRemovalReason({ what: 'post', title: q.title }).then((r) => r && api.deleteQuestion(q.id, r).then(after).catch(() => {}))
    else setConfirm({ text: `Xoá post "${q.title}" cùng toàn bộ trả lời?`, run: () => api.deleteQuestion(q.id).then(after).catch(() => {}) })
  }

  // ---- questions ----
  const qq = fold(qQuery.trim())
  const qRows = questions.filter((q) => (qStatus === 'all' || (qStatus === 'unanswered' ? !q.answers.length : !!q.answers.length)) && (!qq || fold(q.title + ' ' + q.body + ' ' + q.author + ' ' + (q.fullName || '')).includes(qq)))
  const helpful = (q) => (q.qHelpful || 0) + q.answers.reduce((n, a) => n + (a.helpful || 0), 0)

  // ---- users ----
  const uq = fold(userQuery.trim())
  const teams = Array.from(new Set(users.map((u) => u.team || ''))).sort((a, b) => (a ? a.localeCompare(b, 'vi') : 1) - (b ? 0 : 1))
  // "Cần dọn": accounts that look dirty — no department, quotes in the name / email, or the same mailbox
  // as another account (case, quotes or a +tag apart) — so duplicates are easy to spot and delete.
  const byMailbox = {}
  for (const u of users) (byMailbox[mailboxKey(u.email)] = byMailbox[mailboxKey(u.email)] || []).push(u)
  const cleanupOf = (u) => [
    !u.team && 'Chưa rõ phòng ban',
    QUOTES.test(u.name + u.email) && 'Tên / email có dấu ngoặc',
    byMailbox[mailboxKey(u.email)].length > 1 && 'Trùng với ' + byMailbox[mailboxKey(u.email)].filter((x) => x.id !== u.id).map((x) => x.email).join(', '),
  ].filter(Boolean)
  const needsCleanup = users.filter((u) => cleanupOf(u).length)
  const userRows = users.filter((u) => (!uq || fold(u.name + ' ' + u.email + ' ' + u.domain + ' ' + (u.team || '') + ' ' + Object.values(u.org || {}).join(' ')).includes(uq))
    && (userRole === 'all' || (userRole === 'cleanup' ? cleanupOf(u).length > 0 : (userRole === 'admin') === !!u.isAdmin))
    && (userTeam === '__all' || (u.team || '') === userTeam))
  // duplicates side by side while tidying up
  if (userRole === 'cleanup') userRows.sort((a, b) => mailboxKey(a.email).localeCompare(mailboxKey(b.email)) || a.id - b.id)
  const deleteUser = (u) => setConfirm({
    text: `Xoá tài khoản ${u.email}?`,
    note: 'Tài khoản này chưa có nội dung hay hoạt động nào trên AI Space. Nếu người này đăng nhập lại, một tài khoản mới sẽ được tạo. Không thể hoàn tác.',
    cta: 'Xoá tài khoản',
    run: () => api.adminDeleteUser(u.id).then(() => { reloadUsers(); reloadLive(); reloadAdmins() }).catch((e) => window.alert(e.message || 'Chưa xoá được, thử lại nhé.')),
  })

  // "Top người đóng góp": Tổng = the counted columns added up (what the server ranks by), highest first
  const lbRows = (adminStats?.leaderboard?.[lbPeriod] || []).map((u) => ({ ...u, total: u.answers + u.comments + u.likes + u.questions + u.useCases })).sort((a, b) => b.total - a.total)
  const periodName = lbPeriod === 'last30' ? '30-ngay' : 'tat-ca'
  const csvDate = new Date().toISOString().slice(0, 10)
  const exportLeaderboard = () => downloadCsv(`top-nguoi-dong-gop_${periodName}_${csvDate}.csv`, ['Hạng', 'Thành viên', 'Tên', 'Phòng ban', 'Trả lời', 'Comment', 'Like nhận', 'Post', 'Use case được duyệt', 'Tổng'],
    lbRows.map((u, i) => [i + 1, u.domain, cleanName(u.name), u.team, u.answers, u.comments, u.likes, u.questions, u.useCases, u.total]))
  // (Microsoft's organisation fields, AD distinguished name included, stay out of the export)
  const exportUsers = () => downloadCsv(`thanh-vien_${csvDate}.csv`, ['Tên', 'Tên hiển thị', 'Email', 'Phòng ban', 'Vai trò', 'Tham gia', 'Hoạt động gần nhất', 'Post', 'Trả lời', 'Use case'],
    userRows.map((u) => [cleanName(u.name), u.domain, u.email, u.team, u.isAdmin ? 'Admin' : 'Thành viên', fmtDate(u.joined), fmtDay(u.lastActive), u.questions, u.answers, u.useCases]))
  const csvBtn = (onClick) => <button onClick={onClick} title="Tải bảng này dưới dạng CSV (mở bằng Excel)" style={css(btn('plain') + 'display:inline-flex; align-items:center; gap:6px; height:36px;')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>Xuất CSV</button>

  const pageLabel = (path) => {
    if (!path) return 'Đang mở trang'
    const m = /^\/use-cases\/([^/?#]+)/.exec(path)
    if (m) { const c = published.find((x) => x.id === decodeURIComponent(m[1])); return 'Đang xem use case' + (c ? ': ' + c.title : '') }
    return 'Đang xem: ' + (PAGE_NAMES[path] || (path.startsWith('/admin/') ? PAGE_NAMES['/admin'] : path))
  }

  // [key, label, dot colour, badge count, what the badge counts (its tooltip)]
  const menu = [
    ['dashboard', 'Tổng quan', '#2c5fff', 0],
    ['usecases', 'Duyệt use case', '#00A352', pending.length, 'use case đang chờ duyệt'],
    ['questions', 'Post', '#FF8D00', unanswered.length, 'post chưa có ai trả lời'],
    ['reports', 'Báo cáo', '#D8232A', reports.filter((r) => r.status === 'open').length, 'báo cáo đang chờ xử lý'],
    ['users', 'Thành viên', '#00B7FF', 0],
    ['inbox', 'Hộp thư', '#6F0CE2', chatInbox, 'cuộc trò chuyện đang chờ Admin trả lời'],
    ['booths', 'Booth Exhibition', '#FF8D00', 0],
    ['access', 'Yêu cầu truy cập', '#D8232A', access.requests.filter((r) => r.status === 'pending').length, 'yêu cầu truy cập đang chờ duyệt'],
    ['admins', 'Quản trị viên', '#6F0CE2', 0],
  ]

  // Compact admin tables: they fit the content area of a 1280px window (≈990px beside the menu) without
  // scrolling sideways. Long text is cut with "…" and shown whole on hover (title).
  const grid = (cols) => `display:grid; grid-template-columns:${cols}; gap:10px; align-items:center;`
  const headRow = (cols) => css(grid(cols) + 'padding:8px 14px; background:#F8FAFE; border-bottom:1px solid #EEF1F7;' + font(700, 10.5) + ';letter-spacing:.3px;color:#64748b;')
  const bodyRow = (cols) => css(grid(cols) + 'padding:8px 14px; border-bottom:1px solid #F3F5FA;')
  const ellip = 'white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;'
  const num = css(font(800, 13) + ';color:#3A4757;')
  const empty = (text) => <div style={css('padding:48px 0; text-align:center;' + font(600, 13.5) + ';color:#94a3b8;')}>{text}</div>
  // The min widths (tableBox) are below that, so sideways scrolling is only a fallback for narrow windows.
  const UC_COLS = '16px minmax(0,1fr) 92px 78px 100px 100px 252px'
  const P_COLS = 'minmax(0,1fr) 104px 50px 70px 44px 84px 100px'
  const Q_COLS = 'minmax(0,1fr) 104px 54px 50px 112px 104px'
  const U_COLS = 'minmax(0,1fr) 84px 80px 100px 52px 56px 60px 30px'
  const R_COLS = 'minmax(0,1fr) 130px 116px 190px'
  const LB_COLS = '28px minmax(0,1fr) 64px 70px 70px 58px 66px 60px'
  const tableBox = (minWidth, children, extra = '') => <div style={css('overflow-x:auto;' + card + extra)}><div style={{ minWidth }}>{children}</div></div>
  const REP_STATUS = { open: ['Chờ xử lý', '#FFF1E0', '#B45300'], removed: ['Đã xoá nội dung', '#FFECEC', '#D8232A'], dismissed: ['Đã bỏ qua', '#EDF0FA', '#64748b'] }
  const REP_KIND = { thread: 'post', uc_comment: 'comment ở use case', answer: 'comment ở post', comment: 'reply ở post' }
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
                    <div key={n.id} onClick={() => { if (n.unread) markNotificationsRead([n.id]); if (n.kind === 'submission' && /^\/review\//.test(n.href || '')) navigate(n.href); else if (n.kind === 'submission') { setSection('usecases'); setUcStatus('pending') } else if (n.kind === 'report') { setSection('reports'); setRepStatus('open'); reloadReports() } else if (n.kind === 'chat') setChatUid(Number((/#inbox\/(\d+)/.exec(n.href) || [])[1]) || null); else if (/^\/admin\b/.test(n.href || '')) navigate(n.href); else if (n.href) window.open(n.href, '_blank'); setNotifOpen(false) }} className={hoverClass('background:#F7F9FD;')} style={css(`display:flex; gap:12px; padding:13px 18px; border-bottom:1px solid #F3F5FA; cursor:pointer; background:${n.unread ? '#F3F7FF' : '#fff'};`)}>
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
          </div>
        </div>
      </header>

      <div style={css('display:grid; grid-template-columns:224px minmax(0,1fr); align-items:start;')}>
        <aside style={css('position:sticky; top:58px; height:calc(100vh - 58px); box-sizing:border-box; display:flex; flex-direction:column; padding:20px 12px 16px; background:radial-gradient(120% 45% at 0% 0%, rgba(70,120,255,.26), transparent 70%), linear-gradient(180deg, rgba(16,32,92,.62) 0%, rgba(9,16,46,.74) 50%, rgba(5,9,26,.86) 100%); backdrop-filter:blur(18px) saturate(140%); -webkit-backdrop-filter:blur(18px) saturate(140%); border-right:1px solid rgba(130,170,255,.16);')}>
          <div style={css('padding:0 12px 10px;' + font(700, 11.5) + ';letter-spacing:.04em;color:#8aa0d6;')}>QUẢN TRỊ</div>
          <div style={css('display:flex; flex-direction:column; gap:2px;')}>
            {menu.map(([k, label, dot, badge, badgeWhat]) => (
              <Link key={k} to={sectionPath(k)} className={section === k ? undefined : hoverClass('background:linear-gradient(90deg,rgba(60,110,255,.30),rgba(60,110,255,.12)) !important; border-color:rgba(130,175,255,.55) !important; color:#dbe8ff !important; box-shadow:0 0 18px rgba(44,95,255,.28) !important;')} aria-current={section === k ? 'page' : undefined} style={css(`display:flex; align-items:center; gap:11px; box-sizing:border-box; width:100%; height:40px; padding:0 12px; border-radius:12px; cursor:pointer; text-align:left; text-decoration:none; transition:background .15s, border-color .15s, box-shadow .15s, color .15s; ${section === k ? 'background:linear-gradient(90deg,rgba(60,110,255,.30),rgba(60,110,255,.12)); border:1px solid rgba(130,175,255,.55); color:#dbe8ff; box-shadow:0 0 18px rgba(44,95,255,.28), inset 0 0 12px rgba(120,165,255,.10);' : 'background:transparent; border:1px solid transparent; color:#b4c3e8;'}` + font(section === k ? 700 : 500, 14) + ';')}>
                <span style={css(`flex:none; width:8px; height:8px; border-radius:50%; background:${dot}; box-shadow:0 0 8px ${dot};`)}></span>
                <span style={{ flex: 1 }}>{label}</span>
                {badge > 0 && <span title={`${badge} ${badgeWhat}`} aria-label={`${badge} ${badgeWhat}`} style={css('display:flex; align-items:center; justify-content:center; min-width:20px; height:20px; padding:0 6px; border-radius:999px; background:#FF3B30; color:#fff;' + font(800, 11) + ';')}>{badge}</span>}
              </Link>
            ))}
          </div>
          {/* back to the site everyone else sees */}
          <Link to="/" className={hoverClass('background:rgba(60,110,255,.16) !important; color:#dbe8ff !important;')} style={css('display:flex; align-items:center; gap:10px; height:38px; margin-top:12px; padding:0 12px; border-radius:12px; border:1px dashed rgba(130,170,255,.30); color:#b4c3e8; text-decoration:none;' + font(600, 13.5))}>
            <svg style={{ flex: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg>
            Về trang người dùng
          </Link>
          <div style={{ flex: 1 }}></div>
          {/* Account: bottom-left, same place and look as on the rest of the site. */}
          <div ref={acctRef} style={css('position:relative;')}>
            {acctOpen && (
              <div style={css('position:absolute; left:0; right:0; bottom:calc(100% + 8px); background:#fff; border:1px solid #E6EBF3; border-radius:14px; box-shadow:0 20px 46px rgba(0,0,0,.4); padding:6px; z-index:700;')}>
                <Link to="/" className={hoverClass('background:#EEF3FF !important;')} style={css('display:flex; align-items:center; gap:9px; padding:10px 12px; border-radius:10px; text-decoration:none;' + font(700, 13.5) + ';color:#2c5fff; white-space:nowrap;')}>
                  <svg style={{ flex: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"></path></svg>
                  Về trang chính
                </Link>
                <button onClick={() => { setAcctOpen(false); logout() }} className={hoverClass('background:#FFF1F0 !important;')} style={css('display:block; width:100%; text-align:left; padding:10px 12px; border:none; border-radius:10px; background:transparent; cursor:pointer;' + font(700, 13.5) + ';color:#D8232A;')}>Đăng xuất</button>
              </div>
            )}
            <button onClick={() => setAcctOpen((o) => !o)} aria-expanded={acctOpen} className={hoverClass('background:rgba(255,255,255,.1);')} style={css('display:flex; align-items:center; gap:10px; width:100%; padding:5px 10px 5px 5px; border-radius:14px; background:rgba(80,130,255,.10); border:1px solid rgba(130,170,255,.22); cursor:pointer; font-family:inherit;')}>
              <Avatar user={user} size={30} fontSize={11.5} />
              <span style={css('flex:1; min-width:0; text-align:left; font-size:13px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{user.domain || user.name}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c3d0f5" strokeWidth="2.2" style={{ flex: 'none' }}><path d="m18 15-6-6-6 6"></path></svg>
            </button>
          </div>
        </aside>

        <main style={css('padding:24px 32px 60px; min-width:0; max-width:1240px;')}>
          {section === 'dashboard' && (
            <div>
              <div style={css('display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap;')}>
                <div><Heading title="Tổng quan" sub={`Số liệu thật, tự cập nhật mỗi phút. % tăng = phần mới hôm nay so với tổng trước hôm nay, chỉ hiện khi tổng đó từ ${MIN_PCT_BASE} trở lên.`} /></div>
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
                    {k.split && <span title={k.splitTitle} style={css(font(500, 11, 1.45) + ';color:#64748b;')}>{k.split}</span>}
                  </button>
                ))}
              </div>

              <div style={css('display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:14px; margin-top:14px;')}>
                {[
                  { title: 'Đang online', sub: 'Có mở trang trong 2 phút gần nhất · tự cập nhật 20 giây/lần', rows: live?.online || [], empty: 'Chưa có ai đang online.', online: true },
                  { title: 'Đã đăng nhập', sub: `Tất cả thành viên đã từng đăng nhập · ${live ? (live.today || []).length : '…'} người vào hôm nay`, rows: (live?.members || []).filter((u) => !memberQ.trim() || (u.name + ' ' + u.domain + ' ' + u.email + ' ' + (u.team || '')).toLowerCase().includes(memberQ.trim().toLowerCase())), total: (live?.members || []).length, empty: memberQ.trim() ? 'Không có ai khớp tìm kiếm.' : 'Chưa có ai đăng nhập.', online: false },
                ].map((box) => (
                  <div key={box.title} style={css('padding:16px 18px; min-width:0;' + card)}>
                    <div style={css('display:flex; align-items:baseline; justify-content:space-between; gap:10px;')}>
                      <h2 style={css('margin:0;' + font(800, 16) + ';color:#0f172a;')}>{box.title} <span style={css(font(700, 14) + ';color:#2c5fff;')}>· {live ? (box.total ?? box.rows.length) : '…'}</span></h2>
                      {!box.online && <input value={memberQ} onChange={(e) => setMemberQ(e.target.value)} placeholder="Tìm tên, email, phòng ban…" aria-label="Tìm thành viên" style={css('width:200px; max-width:50%; height:30px; padding:0 10px; border:1px solid #DDE3EC; border-radius:9px; background:#fff; color-scheme:light;' + font(500, 12.5) + ';color:#0f172a; outline:none; box-sizing:border-box;')} />}
                    </div>
                    <p style={css('margin:4px 0 12px;' + font(400, 12) + ';color:#94a3b8;')}>{box.sub}</p>
                    {live && box.rows.length === 0 && <div style={css('padding:14px 0;' + font(600, 13) + ';color:#94a3b8;')}>{box.empty}</div>}
                    <div style={css('display:flex; flex-direction:column; max-height:300px; overflow-y:auto;')}>
                      {box.rows.map((u, i) => {
                        const on = (live?.online || []).some((o) => o.id === u.id)
                        const at = box.online ? u.at : u.lastDay === live.todayDay ? u.lastAt : null
                        const dayLabel = !box.online && !at && u.lastDay ? (u.lastDay === live.todayDay ? 'hôm nay' : u.lastDay.slice(8, 10) + '/' + u.lastDay.slice(5, 7) + '/' + u.lastDay.slice(0, 4)) : ''
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
                            <span style={css('flex:none;' + font(500, 11.5) + ';color:#94a3b8;')}>{at ? agoLabel(live.now, at) : dayLabel}</span>
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
                    <p style={css('margin:6px 0 0;' + font(400, 12.5) + ';color:#94a3b8;')}>Xếp theo cột Tổng = trả lời + comment + like nhận + post + use case được duyệt.</p>
                  </div>
                  <div style={css('display:flex; align-items:center; gap:10px;')}>{csvBtn(exportLeaderboard)}<Tabs light value={lbPeriod} onChange={setLbPeriod} tabs={[['last30', '30 ngày qua'], ['all', 'Tất cả']]} /></div>
                </div>
                <div style={css('margin-top:16px; border:1px solid #EEF1F7; border-radius:14px; overflow-x:auto;')}>
                  <div style={{ minWidth: 640 }}>
                  <div style={headRow(LB_COLS)}><span>#</span><span>THÀNH VIÊN</span><span>TRẢ LỜI</span><span>COMMENT</span><span>LIKE NHẬN</span><span>POST</span><span title="Use case được duyệt">USE CASE</span><span style={{ color: '#2c5fff' }}>TỔNG</span></div>
                  {lbRows.map((u, i) => (
                    <div key={u.id} style={bodyRow(LB_COLS)}>
                      <span style={css(font(900, 14) + `;color:${i < 3 ? ['#E0A100', '#8A99AD', '#B8733A'][i] : '#94a3b8'};`)}>{i + 1}</span>
                      <div style={css('display:flex; align-items:center; gap:9px; min-width:0;')}>
                        <span style={css(`flex:none; width:28px; height:28px; border-radius:50%; background:${u.avatarColor || AV[i % AV.length]}; color:#fff; display:flex; align-items:center; justify-content:center;` + font(800, 10.5) + ';' + avatarPhotoCss(u.avatarUrl))}>{u.initials}</span>
                        <div style={{ minWidth: 0 }} title={[cleanName(u.name), u.domain, u.team].filter(Boolean).join(' · ')}>
                          <div style={css(font(700, 13) + ';color:#0f172a;' + ellip)}>{cleanName(u.name) || u.domain} <span style={css(font(500, 11.5) + ';color:#94a3b8;')}>· {u.domain}</span></div>
                          <div style={css(font(400, 11) + ';color:#64748b;' + ellip)}>{u.team || 'Chưa rõ phòng ban'}</div>
                        </div>
                      </div>
                      {[u.answers, u.comments, u.likes, u.questions, u.useCases].map((v, j) => <span key={j} style={css(font(700, 13) + ';color:#3A4757;')}>{v}</span>)}
                      <span style={css(font(900, 13.5) + ';color:#2c5fff;')}>{u.total}</span>
                    </div>
                  ))}
                  {adminStats && !lbRows.length && empty('Chưa có ai đóng góp trong khoảng thời gian này.')}
                  </div>
                </div>
              </div>

              {(() => {
                // a card with nothing mentioned in the last 12 months is left out instead of sitting empty
                const year = now.getTime() - 365 * 86_400_000
                const cards = [['Topic được quan tâm', topicMentions, '#6F0CE2'], ['Công cụ AI được quan tâm', toolMentions, '#2c5fff']]
                  .filter(([, list]) => list.some((m) => { const d = toDate(m.time); return (isNaN(d) ? new Date(m.time) : d).getTime() >= year })) // showcase dates are plain "2026-09-15"
                return cards.length > 0 && (
                  <div style={css(`display:grid; grid-template-columns:repeat(${cards.length},minmax(0,1fr)); gap:14px; margin-top:14px;`)}>
                    {cards.map(([title, list, color]) => (
                      <div key={title} style={css('padding:18px 20px; min-width:0;' + card)}><TrendCard title={title} mentions={list} color={color} /></div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {section === 'usecases' && (
            <div>
              <Heading title="Duyệt use case" sub="Use case người dùng gửi phải được duyệt trước khi đăng. Từ chối cần kèm lý do để tác giả sửa." />
              <div style={css('display:flex; align-items:center; gap:12px; margin-top:18px; flex-wrap:wrap;')}>
                <Search value={ucQuery} onChange={setUcQuery} placeholder="Tìm theo tên use case, tác giả, team..." />
                {!['published', 'showcase'].includes(ucStatus) && <Tabs value={ucSort} onChange={setUcSort} tabs={[['newest', 'Mới gửi trước'], ['waiting', 'Chờ lâu nhất trước']]} />}
              </div>
              {/* the four tabs that make up "Use case gửi duyệt" on Tổng quan, then the showcase cases on their own */}
              <div style={css('display:flex; align-items:center; gap:10px; margin-top:12px; flex-wrap:wrap;')}>
                <Tabs value={ucStatus} onChange={setUcStatus} tabs={[['pending', 'Đang đợi duyệt', ucCount('pending')], ['changes_requested', 'Đang đợi chỉnh sửa', ucCount('changes_requested')], ['published', 'Đã đăng', ucCount('approved')], ['rejected', 'Từ chối', ucCount('rejected')]]} />
                <span style={css(font(600, 12) + ';color:rgba(206,219,245,.6);')}>= {submissions.length} bài gửi duyệt</span>
                <span style={css('width:1px; height:24px; background:rgba(130,170,255,.25);')}></span>
                <Tabs value={ucStatus} onChange={setUcStatus} tabs={[['showcase', 'Use case mẫu', showcaseLive]]} />
              </div>
              {ucStatus === 'showcase' && <div style={css('margin-top:10px;' + font(400, 12.5) + ';color:rgba(206,219,245,.72);')}>Use case AI Space viết sẵn (showcase): không qua duyệt nên không tính vào "Use case gửi duyệt". Cùng hiện trong Use Case Library với các bài Đã đăng.</div>}
              {['published', 'showcase'].includes(ucStatus) ? tableBox(760, (
              <>
                <div style={headRow(P_COLS)}><span>{ucStatus === 'showcase' ? 'USE CASE MẪU' : 'USE CASE ĐANG ĐĂNG'} · {sortHead('postedAt', 'NGÀY ĐĂNG')}</span><span>DUYỆT BỞI</span><span>{sortHead('upvotes', 'THÍCH')}</span><span>{sortHead('comments', 'BÌNH LUẬN')}</span><span>{sortHead('saves', 'LƯU')}</span><span>{sortHead('applied', 'ĐÃ ÁP DỤNG')}</span><span style={{ textAlign: 'right' }}>THAO TÁC</span></div>
                {pubRows.map((c) => {
                  const sub = c.source === 'community' ? submissions.find((x) => x.id === c.id) : null
                  const by = reviewerOf(c.approvedBy, c.reviewCommenters)
                  return (
                    <div key={c.id} style={bodyRow(P_COLS)}>
                      <div style={{ minWidth: 0 }}>
                        <a href={`/use-cases/${encodeURIComponent(c.id)}`} target="_blank" rel="noreferrer" title={c.title} className={hoverClass('color:#2c5fff !important;')} style={css(font(700, 13, 1.4) + ';color:#0f172a; text-decoration:none;' + clamp2)}>{c.title}</a>
                        {(() => { const meta = [c.source === 'community' ? ucWho(c) : c.author, c.team !== c.author ? c.team : '', c.postedAt ? 'Đăng ' + fmtDate(c.postedAt) : ''].filter(Boolean).join(' · '); return <div title={meta} style={css('margin-top:2px;' + font(400, 11.5) + ';color:#94a3b8;' + ellip)}>{meta}</div> })()}
                      </div>
                      <span title={c.approvedBy ? c.approvedBy : by ? by + ' (bài duyệt trước khi hệ thống ghi người duyệt; đây là admin đã góp ý trên bài)' : ''} style={css(font(600, 12) + ';color:' + (c.approvedBy ? '#3A4757' : '#94a3b8') + ';' + ellip)}>{c.source === 'showcase' ? '—' : by || 'Không rõ'}</span>
                      {[c.upvotes, c.comments, c.saves, c.applied].map((v, j) => <span key={j} style={num}>{v}</span>)}
                      <div style={css('display:flex; justify-content:flex-end; gap:5px;')}>
                        <a href={`/use-cases/${encodeURIComponent(c.id)}`} target="_blank" rel="noreferrer" style={css(btn('plain') + 'display:inline-flex; align-items:center; text-decoration:none;')}>Mở ↗</a>
                        {sub && <button onClick={() => remove(sub)} style={css(btn('reject'))}>Xoá</button>}
                        {c.source === 'showcase' && <button onClick={() => setConfirm({ text: `Gỡ use case mẫu "${c.title}" khỏi web? Bài sẽ không còn hiện trong Use Case Library.`, run: () => api.adminHideShowcase(c.id).then(reloadPublished).catch(() => {}) })} style={css(btn('reject'))}>Xoá</button>}
                      </div>
                    </div>
                  )
                })}
                {pubRows.length === 0 && empty(ucq ? 'Không có use case nào khớp bộ lọc.' : ucStatus === 'showcase' ? 'Không có use case mẫu nào đang hiện.' : 'Chưa có use case cộng đồng gửi nào được đăng.')}
              </>
              ), 'margin-top:16px;') : (
              <>
              {/* fits a 1280px window; scrolls sideways only on narrower ones instead of squeezing the columns */}
              <div style={css('margin-top:16px; overflow-x:auto;' + card)}>
                <div style={{ minWidth: 860 }}>
                <div style={headRow(UC_COLS)}><input type="checkbox" aria-label="Chọn tất cả use case đang hiện" checked={ucRows.length > 0 && ucRows.every((s) => ucPicked.has(s.id))} onChange={(e) => setUcPicked(e.target.checked ? new Set(ucRows.map((s) => s.id)) : new Set())} style={{ margin: 0, cursor: 'pointer' }} /><span>USE CASE</span><span>NGƯỜI GỬI</span><span>NGÀY GỬI</span><span>REVIEW BỞI</span><span>TRẠNG THÁI</span><span style={{ textAlign: 'right' }}>THAO TÁC</span></div>
                {ucRows.map((s) => {
                  const st = UC_STATUS[s.reviewStatus] || UC_STATUS.pending
                  const by = reviewerOf(s.reviewedBy, s.reviewCommenters)
                  const twin = twinOf(s)
                  return (
                    <div key={s.id} style={bodyRow(UC_COLS)}>
                      <input type="checkbox" aria-label={'Chọn ' + s.title} checked={ucPicked.has(s.id)} onChange={(e) => setUcPicked((prev) => { const n = new Set(prev); if (e.target.checked) n.add(s.id); else n.delete(s.id); return n })} style={{ margin: 0, cursor: 'pointer' }} />
                      <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => navigate('/review/' + encodeURIComponent(s.id))}>
                        <div title={s.title} className={hoverClass('color:#2c5fff;')} style={css(font(700, 13, 1.4) + ';color:#0f172a;' + clamp2)}>{s.title}</div>
                        {(() => { const meta = [s.team, [].concat(s.category)[0]].filter(Boolean).join(' · '); return meta && <div title={meta} style={css('margin-top:2px;' + font(400, 11.5) + ';color:#94a3b8;' + ellip)}>{meta}</div> })()}
                        {twin && <div title={`Người gửi đã có bài cùng tên (${(UC_STATUS[twin.reviewStatus] || UC_STATUS.pending).label.toLowerCase()}), có thể là gửi trùng.`} style={css('margin-top:4px;' + pill('#FFF4E3', '#9A5B00'))}>⚠ Trùng tên với bài khác của người này</div>}
                        {REVIEWED_BY[s.reviewStatus] && s.reviewedBy && <div style={css('margin-top:3px;' + font(600, 11.5) + ';color:#475569;' + ellip)}>{REVIEWED_BY[s.reviewStatus]} <b style={toneObj({ color: '#0f172a' })}>{s.reviewedBy}</b>{s.reviewedAt ? ' · ' + relativeTime(s.reviewedAt) : ''}</div>}
                        {s.reviewStatus === 'rejected' && s.adminNote && <div title={s.adminNote} style={css('margin-top:5px; padding:5px 9px; border-radius:8px; background:#FFECEC;' + font(600, 11.5, 1.45) + ';color:#B4232A;')}><div style={css(clamp2)}>Lý do từ chối: {s.adminNote}</div></div>}
                        {s.reviewStatus === 'changes_requested' && s.adminNote && <div title={s.adminNote} style={css('margin-top:5px; padding:5px 9px; border-radius:8px; background:#FFF4E3;' + font(600, 11.5, 1.45) + ';color:#7A4700;')}><div style={css(clamp2)}>Đã yêu cầu bổ sung (chờ người gửi sửa): {s.adminNote}</div></div>}
                      </div>
                      <div style={css(font(600, 12) + ';color:#3A4757;' + ellip)} title={[ucWho(s), s.realAuthor || s.authorDomain, s.anonymous ? 'bài cũ đăng ẩn danh với tên ' + (s.alias || 'Anonymous') : ''].filter(Boolean).join(' · ')}>{ucWho(s)}</div>
                      <div style={css(font(600, 12) + ';color:#3A4757; white-space:nowrap;')}>{fmtDate(s.time)}<div style={css(font(500, 11) + ';color:#94a3b8;' + ellip)}>{relativeTime(s.time)}</div></div>
                      {/* who reviewed it; a post still waiting for its first decision shows "—" */}
                      <div title={by ? (s.reviewedBy ? by : by + ' (chưa có quyết định được ghi người duyệt; đây là admin đã góp ý trên bài)') : ''} style={css(font(600, 12) + ';color:' + (s.reviewedBy ? '#3A4757' : '#94a3b8') + ';' + ellip)}>{by || (s.reviewedAt || s.reviewStatus !== 'pending' ? 'Không rõ' : '—')}</div>
                      <div><span style={css(pill(st.bg, st.fg))}>{st.label}</span></div>
                      <div style={css('display:flex; justify-content:flex-end; gap:5px; flex-wrap:nowrap;')}>
                        <button onClick={() => navigate('/review/' + encodeURIComponent(s.id))} title={['pending', 'changes_requested'].includes(s.reviewStatus) ? 'Xem bài & góp ý' : 'Xem bài'} style={css(btn('plain'))}>Xem</button>
                        {['pending', 'changes_requested'].includes(s.reviewStatus) && <button onClick={() => askReview(s.id, 'approved')} style={css(btn('approve'))}>Duyệt</button>}
                        {s.reviewStatus === 'pending' && <button onClick={() => askReview(s.id, 'changes_requested')} style={css(btn('changes'))}>Yêu cầu sửa</button>}
                        {['pending', 'changes_requested'].includes(s.reviewStatus) && <button onClick={() => askReview(s.id, 'rejected')} style={css(btn('reject'))}>Từ chối</button>}
                        {['approved', 'rejected'].includes(s.reviewStatus) && <button onClick={() => remove(s)} style={css(btn('reject'))}>Xoá</button>}
                      </div>
                    </div>
                  )
                })}
                {ucRows.length === 0 && empty(ucStatus === 'pending' && !ucq ? 'Không có use case nào đang chờ duyệt.' : ucStatus === 'changes_requested' && !ucq ? 'Không có use case nào đang đợi tác giả chỉnh sửa.' : ucStatus === 'rejected' && !ucq ? 'Chưa có use case nào bị từ chối.' : 'Không có use case nào khớp bộ lọc.')}
                </div>
              </div>
              {/* Ticked rows: the action bar sticks to the bottom of the window under the table, so ticking
                  a row never pushes the list down. */}
              {pickedFor(ucRows).length > 0 && (() => {
                const n = (a) => pickedFor(ucRows, a).length
                const act = (a, label, kind) => n(a) > 0 && <button disabled={bulkBusy} onClick={() => askBulkReview(ucRows, a)} style={css(btn(kind) + 'height:36px; padding:0 14px;' + (bulkBusy ? 'opacity:.6;' : ''))}>{label} {n(a)}</button>
                return (
                  <div style={css('position:sticky; bottom:16px; z-index:50; margin-top:12px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:12px 16px; border-radius:16px; background:#fff; border:1px solid #DDE3EC; box-shadow:0 18px 40px rgba(0,0,0,.45);')}>
                    <span style={css(font(700, 13.5) + ';color:#0f172a;')}>Đã chọn {n()} use case</span>
                    <button onClick={() => setUcPicked(new Set())} style={css(btn('plain'))}>Bỏ chọn</button>
                    <span style={{ flex: 1 }}></span>
                    {bulkBusy && <span style={css(font(600, 12.5) + ';color:#64748b;')}>Đang xử lý…</span>}
                    {act('approved', 'Duyệt', 'approve')}
                    {act('changes_requested', 'Yêu cầu chỉnh sửa', 'changes')}
                    {act('rejected', 'Từ chối', 'reject')}
                    <button disabled={bulkBusy} onClick={() => removePicked(ucRows)} style={css('height:36px; padding:0 16px; border:none; border-radius:999px; background:#D8232A; color:#fff; cursor:pointer;' + font(700, 12.5) + (bulkBusy ? 'opacity:.6;' : ''))}>Xoá {n()}</button>
                  </div>
                )
              })()}
              </>
              )}
            </div>
          )}

          {section === 'questions' && (
            <div>
              <Heading title="Post" sub="Post được đăng trực tiếp. Admin có thể xem và xoá bài không phù hợp." />
              <div style={css('display:flex; align-items:center; gap:12px; margin-top:18px; flex-wrap:wrap;')}>
                <Search value={qQuery} onChange={setQQuery} placeholder="Tìm theo nội dung hoặc tác giả..." />
                <Tabs value={qStatus} onChange={setQStatus} tabs={[['all', 'Tất cả', questions.length], ['unanswered', 'Chưa có trả lời', unanswered.length], ['answered', 'Đã có trả lời', questions.filter((q) => q.answers.length).length]]} />
              </div>
              <div style={css('margin-top:16px; overflow:hidden;' + card)}>
                <div style={headRow(Q_COLS)}><span>POST</span><span>TÁC GIẢ</span><span>TRẢ LỜI</span><span>THÍCH</span><span>TRẠNG THÁI</span><span style={{ textAlign: 'right' }}>THAO TÁC</span></div>
                {qRows.map((q) => (
                  <div key={q.id} style={bodyRow(Q_COLS)}>
                    <div style={{ minWidth: 0 }}>
                      <div title={q.title} onClick={() => setQDetailId(q.id)} className={hoverClass('color:#2c5fff;')} style={css(font(700, 13, 1.4) + ';color:#0f172a; cursor:pointer;' + clamp2)}>{q.title}</div>
                      <div title={[relativeTime(q.time), ...(q.topics || [])].join(' · ')} style={css('margin-top:2px;' + font(400, 11.5) + ';color:#94a3b8;' + ellip)}>{[relativeTime(q.time), ...(q.topics || [])].join(' · ')}</div>
                    </div>
                    <div style={css(font(600, 12) + ';color:#3A4757;' + ellip)} title={q.anonymous ? `Đăng ẩn danh với tên "${q.author}" · tài khoản thật: ${q.account || q.realAuthor}` : [cleanName(q.fullName), q.account].filter(Boolean).join(' · ')}>{realWho(q.author, q.account || q.realAuthor, q.anonymous)}</div>
                    <div style={num}>{q.answers.length}</div>
                    <div style={num}>{helpful(q)}</div>
                    <div><span style={css(q.answers.length ? pill('#E7F9F0', '#00893F') : pill('#FFF1E0', '#B45300'))}>{q.answers.length ? 'Đã có trả lời' : 'Chưa có trả lời'}</span></div>
                    <div style={css('display:flex; justify-content:flex-end; gap:5px;')}>
                      <button onClick={() => setQDetailId(q.id)} style={css(btn('plain'))}>Xem</button>
                      <button onClick={() => removeQuestion(q, reloadQuestions)} style={css(btn('reject'))}>Xoá</button>
                    </div>
                  </div>
                ))}
                {qRows.length === 0 && empty('Không có post nào khớp bộ lọc.')}
              </div>
            </div>
          )}

          {section === 'reports' && (
            <div>
              <Heading title="Báo cáo" sub="Comment và post bị người dùng báo cáo. Xoá nội dung nếu vi phạm, hoặc bỏ qua nếu không có vấn đề." />
              <div style={css('display:flex; align-items:center; gap:12px; margin-top:18px;')}>
                <Tabs value={repStatus} onChange={setRepStatus} tabs={[['open', 'Chờ xử lý', reports.filter((r) => r.status === 'open').length], ['done', 'Đã xử lý', reports.filter((r) => r.status !== 'open').length], ['all', 'Tất cả', reports.length]]} />
              </div>
              {tableBox(720, (<>
                <div style={headRow(R_COLS)}><span>NỘI DUNG BỊ BÁO CÁO</span><span>NGƯỜI BÁO CÁO</span><span>TRẠNG THÁI</span><span style={{ textAlign: 'right' }}>THAO TÁC</span></div>
                {repRows.map((r) => {
                  const st = REP_STATUS[r.status] || REP_STATUS.open
                  return (
                    <div key={r.id} style={bodyRow(R_COLS)}>
                      <div style={{ minWidth: 0 }}>
                        <div title={r.excerpt} style={css(font(600, 13, 1.5) + ';color:#0f172a;' + clamp2)}>"{r.excerpt}"</div>
                        <div style={css('margin-top:2px;' + font(400, 11.5) + ';color:#94a3b8;' + ellip)}>Viết bởi {r.author} · {REP_KIND[r.type] || 'comment'}{r.exists ? '' : ' · nội dung đã bị xoá'}</div>
                        {r.reason && <div title={r.reason} style={css('margin-top:5px; padding:5px 9px; border-radius:8px; background:#F8FAFE; border:1px solid #EEF1F7;' + font(500, 12, 1.45) + ';color:#3A4757;')}><div style={css(clamp2)}>Lý do: {r.reason}</div></div>}
                      </div>
                      <div title={r.reporter} style={css(font(600, 12) + ';color:#3A4757;' + ellip)}>{r.reporter}<div style={css('margin-top:2px;' + font(400, 11) + ';color:#94a3b8;')}>{relativeTime(r.time)}</div></div>
                      <div><span style={css(pill(st[1], st[2]))}>{st[0]}</span></div>
                      <div style={css('display:flex; justify-content:flex-end; gap:5px; flex-wrap:wrap;')}>
                        {r.exists && <a href={r.path} target="_blank" rel="noreferrer" style={css(btn('plain') + 'display:inline-flex; align-items:center; text-decoration:none;')}>Xem</a>}
                        {r.status === 'open' && r.exists && <button onClick={() => setConfirm({ text: r.type === 'thread' ? 'Xoá post bị báo cáo (cùng toàn bộ trả lời)?' : 'Xoá comment bị báo cáo (và các reply bên dưới)?', run: () => resolveReport(r, 'delete') })} style={css(btn('reject'))}>Xoá nội dung</button>}
                        {r.status === 'open' && <button onClick={() => resolveReport(r, 'dismiss')} style={css(btn('plain'))}>Bỏ qua</button>}
                      </div>
                    </div>
                  )
                })}
                {repRows.length === 0 && empty(repStatus === 'open' ? 'Không có báo cáo nào đang chờ xử lý.' : 'Chưa có báo cáo nào.')}
              </>), 'margin-top:16px;')}
            </div>
          )}

          {section === 'booths' && (() => {
            const ST = {
              not_started: ['Chưa bắt đầu', '#F1F4FA', '#5B6675'],
              pending: ['Chờ duyệt', '#FFF1E0', '#B45300'],
              changes_requested: ['Cần chỉnh sửa', '#FFF4E3', '#9A5B00'],
              approved: ['Đã đăng', '#E7F9F0', '#00893F'],
              rejected: ['Từ chối', '#FFECEC', '#D8232A'],
            }
            const list = booths || []
            const count = (k) => list.filter((b) => k === 'all' || b.status === k).length
            // most-wanted first: owners of booths people are waiting for get nudged first
            const rows = list.filter((b) => boothTab === 'all' || b.status === boothTab).sort((a, b) => b.interest - a.interest || a.booth - b.booth)
            const B_COLS = 'minmax(0,1fr) 140px 62px 108px 88px 164px'
            const inviteOne = (b) => api.inviteBooth(b.id).then(() => { setBoothMsg(`Đã gửi lời mời tới Owner của booth ${b.booth} · ${b.title}.`); reloadBooths() }).catch(() => {})
            // same set as the server's: no write-up yet, or the last one was rejected
            const todo = list.filter((b) => b.status === 'not_started' || b.status === 'rejected')
            const people = todo.reduce((n, b) => n + (b.owners || 0), 0)
            const inviteAll = () => setConfirm({
              text: `Gửi lời mời cập nhật use case tới ${people} Owner của ${todo.length} booth chưa gửi bài?`,
              note: `Mỗi Owner nhận một thông báo trong AI Space (booth đã mời trước đó được nhắc lại). ${todo.filter((b) => b.invites).length} booth trong số này đã được mời ít nhất một lần.`,
              cta: `Gửi tới ${people} người`, color: '#00A352',
              run: () => api.inviteAllBooths().then((d) => { setBoothMsg(`Đã mời ${d.recipients ?? people} Owner của ${d.invited} booth.`); reloadBooths() }).catch(() => {}),
            })
            return (
              <div>
                <Heading title="Booth Exhibition" sub="Use case từ AI Exhibition 2026: Owner (PIC + thành viên booth) tự cập nhật nội dung, Admin duyệt rồi bài thay cho khung &quot;Thông tin đang được cập nhật&quot;." />
                <div style={css('display:flex; align-items:center; gap:12px; margin-top:18px; flex-wrap:wrap;')}>
                  <Tabs value={boothTab} onChange={setBoothTab} tabs={[['all', 'Tất cả', count('all')], ['not_started', 'Chưa bắt đầu', count('not_started')], ['pending', 'Chờ duyệt', count('pending')], ['changes_requested', 'Cần chỉnh sửa', count('changes_requested')], ['approved', 'Đã đăng', count('approved')]]} />
                  <button onClick={inviteAll} disabled={!todo.length} style={css(btn('approve') + 'height:36px; padding:0 14px; margin-left:auto;' + (todo.length ? '' : 'opacity:.5; cursor:default;'))}>Mời tất cả booth chưa gửi bài ({todo.length})</button>
                </div>
                {boothMsg && <div style={css('margin-top:12px;' + font(600, 13) + ';color:#9fe0b9;')}>{boothMsg}</div>}
                {/* scrolls sideways only on narrow windows instead of squeezing the booth names */}
                <div style={css('margin-top:16px; overflow-x:auto;' + card)}>
                  <div style={{ minWidth: 780 }}>
                  <div style={headRow(B_COLS)}><span>BOOTH</span><span>OWNER</span><span>QUAN TÂM</span><span>TRẠNG THÁI</span><span>ĐÃ MỜI</span><span style={{ textAlign: 'right' }}>THAO TÁC</span></div>
                  {booths === null && empty('Đang tải…')}
                  {rows.map((b) => {
                    const st = ST[b.status] || ST.not_started
                    return (
                      <div key={b.id} style={bodyRow(B_COLS)}>
                        <div style={{ minWidth: 0 }}>
                          <div title={`${b.booth}. ${b.title}`} style={css(font(700, 13, 1.4) + ';color:#0f172a;' + clamp2)}>{b.booth}. {b.title}</div>
                          <div style={css('margin-top:2px;' + font(400, 11.5) + ';color:#94a3b8;' + ellip)}>{[b.label, b.category].filter(Boolean).join(' · ')}</div>
                        </div>
                        <div style={css(font(600, 12) + ';color:#3A4757; min-width:0;')} title={[...b.pic, ...b.members].join(', ')}>
                          <div style={css(ellip)}>{(b.members.length ? b.members : b.pic).join(', ') || '—'}</div>
                          <div style={css('margin-top:2px;' + font(400, 11) + ';color:#94a3b8;' + ellip)}>{b.ownersOnSite}/{b.owners} đã vào AI Space</div>
                        </div>
                        <div style={css(font(700, 13) + ';color:#B45300;')}>{b.interest}</div>
                        <div style={{ minWidth: 0 }}>
                          <span style={css(pill(st[1], st[2]))}>{st[0]}</span>
                          {b.submittedBy && <div title={b.submittedBy} style={css('margin-top:3px;' + font(400, 11) + ';color:#94a3b8;' + ellip)}>{b.submittedBy}</div>}
                        </div>
                        <div title={b.invitedAt ? 'Lần mời gần nhất: ' + relativeTime(b.invitedAt) : ''} style={css(font(400, 11.5) + ';color:#64748b; white-space:nowrap;')}>{b.invitedAt ? <>{fmtDate(b.invitedAt)}<div style={css(font(400, 11) + ';color:#94a3b8;')}>{b.invites} lần mời</div></> : 'Chưa mời'}</div>
                        <div style={css('display:flex; justify-content:flex-end; gap:5px; flex-wrap:wrap;')}>
                          {b.status !== 'approved' && <button onClick={() => inviteOne(b)} style={css(btn('plain'))}>{b.invites ? 'Nhắc lại' : 'Mời'}</button>}
                          {(b.status === 'pending' || b.status === 'changes_requested') && b.submissionId && <button onClick={() => navigate('/review/' + encodeURIComponent(b.submissionId))} style={css(btn('changes'))}>Duyệt</button>}
                          <a href={b.status === 'approved' && b.submissionId ? `/use-cases/${encodeURIComponent(b.submissionId)}` : `/use-cases/${b.id}`} target="_blank" rel="noreferrer" title="Mở trang booth trong tab mới" style={css(btn('plain') + 'display:inline-flex; align-items:center; text-decoration:none;')}>Xem ↗</a>
                        </div>
                      </div>
                    )
                  })}
                  {booths && rows.length === 0 && empty('Không có booth nào ở trạng thái này.')}
                  </div>
                </div>
              </div>
            )
          })()}

          {section === 'admins' && (
            <div>
              <Heading title="Quản trị viên" sub="Admin duyệt use case, xử lý báo cáo, trả lời Hộp thư và vào được web cả khi đang bảo trì. Thêm bằng email công ty; người chưa đăng nhập lần nào cũng thêm được." />
              <div style={css('display:flex; gap:10px; flex-wrap:wrap; margin-top:18px;')}>
                <input value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addAdmin() }} placeholder="ten@vng.com.vn" aria-label="Email người cần thêm làm admin" style={css('flex:1 1 280px; height:44px; padding:0 16px; border:1px solid #E6EBF3; border-radius:12px; background:#fff;' + font(500, 14) + ';color:#0F172A; outline:none;')} />
                <button onClick={addAdmin} disabled={!newAdmin.trim()} style={css(`height:44px; padding:0 22px; border:none; border-radius:12px; background:${newAdmin.trim() ? 'linear-gradient(180deg,#4480ff 0%,#2c5fff 100%)' : '#E3E8F2'}; color:${newAdmin.trim() ? '#fff' : '#94a3b8'};` + font(800, 14) + `;cursor:${newAdmin.trim() ? 'pointer' : 'default'};`)}>Thêm admin</button>
              </div>
              {adminMsg && <div style={css('margin-top:10px;' + font(600, 13) + ';color:#475569;')}>{adminMsg}</div>}
              <div style={css('margin-top:16px; overflow:hidden;' + card)}>
                {!admins.length ? empty('Chưa có admin nào.') : admins.map((a) => (
                  <div key={a.email} style={css('display:flex; align-items:center; gap:12px; padding:12px 20px; border-bottom:1px solid #F3F5FA;')}>
                    <Avatar user={a} size={34} />
                    <div style={css('flex:1; min-width:0;')}>
                      <div style={css(font(700, 14) + ';color:#0F172A;')}>{a.name}{a.email === user?.email ? ' (bạn)' : ''}</div>
                      <div style={css(font(400, 12.5) + ';color:#64748b;')}>{a.email}</div>
                    </div>
                    {a.fromEnv
                      ? <span title="Có trong ADMIN_EMAILS trên Coolify" style={css('height:24px; padding:0 10px; border-radius:999px; background:#EEF3FF; color:#2c5fff; display:inline-flex; align-items:center;' + font(700, 11.5))}>Cấu hình Coolify</span>
                      : a.email !== user?.email && <button onClick={() => removeAdmin(a.email)} className={hoverClass('background:#FFF1F1 !important;')} style={css('height:32px; padding:0 14px; border:1px solid #F6C1C4; border-radius:999px; background:#fff; color:#D8232A; cursor:pointer;' + font(700, 12.5))}>Bỏ quyền</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'access' && (() => {
            const mt = access.maintenance
            const kindPill = (k) => k === 'maintenance'
              ? <span style={css(pill('#FFF4E5', '#B45300'))}>Xin vào lúc bảo trì</span>
              : <span style={css(pill('#FFECEC', '#D8232A'))}>Không phải nhân viên Zalopay</span>
            const publish = () => window.confirm('Publish AI Space? Mọi nhân viên Zalopay (tài khoản Microsoft thuộc Zion / Zalopay) sẽ vào được như bình thường.') && api.setMaintenance(false).then(setAccess)
            const close = () => window.confirm('Bật bảo trì lại? Chỉ admin và những người được duyệt vào được; người khác thấy trang "Web đang được sửa chữa".') && api.setMaintenance(true).then(setAccess)
            const approveMsg = (r) => r.kind === 'maintenance' ? `Cho ${r.email} vào AI Space trong lúc bảo trì?` : `Cấp quyền vào AI Space cho ${r.email}? Chỉ duyệt khi đã kiểm tra đúng là nhân viên Zalopay.`
            const rejectMsg = (r) => r.kind === 'maintenance' ? `Từ chối yêu cầu của ${r.email}? Người này nhận email báo chưa được vào lúc này.` : `Từ chối yêu cầu của ${r.email}? Người này nhận email báo chưa được cấp quyền.`
            const mGrants = [...(mt?.allowEnv || []).map((email) => ({ email, env: true })), ...(mt?.grants || []).filter((g) => !(mt?.allowEnv || []).includes(g.email))]
            return (
            <div>
              <Heading title="Yêu cầu truy cập" sub="Hai loại yêu cầu: người bị chặn khi đăng nhập vì tài khoản Microsoft không ghi công ty Zion / Zalopay (kiểm tra đúng là nhân viên Zalopay rồi mới duyệt), và người mở web trong lúc bảo trì xin được vào." />
              {mt && (
                <div style={css('margin-top:18px; display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:18px 20px;' + card)}>
                  <span style={css(`flex:none; width:10px; height:10px; border-radius:50%; background:${mt.on ? '#FF8D00' : '#00A352'}; box-shadow:0 0 0 4px ${mt.on ? 'rgba(255,141,0,.16)' : 'rgba(0,163,82,.16)'};`)} />
                  <div style={css('flex:1 1 300px; min-width:0;')}>
                    <div style={css(font(800, 15, 1.4) + ';color:#0f172a;')}>{mt.on ? 'Web đang bảo trì' : 'Web đang mở cho mọi nhân viên Zalopay'}</div>
                    <div style={css('margin-top:3px;' + font(400, 12.5, 1.55) + ';color:#64748b;')}>
                      {mt.on ? 'Chỉ admin và những người được duyệt vào được. Người khác thấy trang "Web đang được sửa chữa" và có thể gửi yêu cầu truy cập.' : 'Ai có tài khoản Microsoft thuộc Zion / Zalopay đều vào được; người khác cần gửi yêu cầu.'}
                      {mt.change && <> · {mt.on ? 'Bật bảo trì' : 'Publish'}{mt.change.by ? ` bởi ${mt.change.by}` : ''} {relativeTime(mt.change.time)}</>}
                    </div>
                  </div>
                  {mt.on
                    ? <button onClick={publish} className={hoverClass('filter:brightness(1.08);')} style={css('height:40px; padding:0 22px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; cursor:pointer; white-space:nowrap; box-shadow:0 8px 20px rgba(44,95,255,.35);' + font(700, 13.5))}>Publish web</button>
                    : <button onClick={close} style={css(btn('plain') + 'height:38px; padding:0 18px;')}>Bật bảo trì lại</button>}
                </div>
              )}
              <div style={css('margin-top:18px;')}>
                <Tabs value={accessTab} onChange={setAccessTab} tabs={[['pending', 'Chờ duyệt'], ['approved', 'Đã duyệt'], ['rejected', 'Đã từ chối'], ['all', 'Tất cả']].map(([k, l]) => [k, l, access.requests.filter((r) => k === 'all' || r.status === k).length])} />
              </div>
              <div style={css('margin-top:14px; overflow:hidden;' + card)}>
                {!access.requests.some((r) => accessTab === 'all' || r.status === accessTab) ? empty(accessTab === 'pending' ? 'Không có yêu cầu nào đang chờ duyệt.' : 'Chưa có yêu cầu nào.') : access.requests.filter((r) => accessTab === 'all' || r.status === accessTab).map((r) => (
                  <div key={r.id} style={css('display:flex; align-items:flex-start; gap:14px; flex-wrap:wrap; padding:14px 20px; border-bottom:1px solid #F3F5FA;')}>
                    <div style={css('flex:1 1 320px; min-width:0;')}>
                      <div style={css('display:flex; align-items:center; gap:8px; flex-wrap:wrap;')}>
                        <span style={css(font(700, 14, 1.4) + ';color:#0f172a;')}>{r.name || r.email} <span style={css(font(500, 12.5) + ';color:#94a3b8;')}>· {r.email}</span></span>
                        {kindPill(r.kind)}
                      </div>
                      <div style={css('margin-top:3px;' + font(400, 12.5, 1.5) + ';color:#64748b;')}>
                        Công ty trên Microsoft: <b style={toneObj({ color: '#3A4757' })}>{r.org?.companyName || '(không ghi)'}</b>{r.org?.department ? ` · ${r.org.department}` : ''}{r.org?.jobTitle ? ` · ${r.org.jobTitle}` : ''} · gửi {relativeTime(r.time)}
                      </div>
                      {r.note && <div style={css('margin-top:6px; padding:8px 11px; border-radius:10px; background:#F7F9FD;' + font(400, 13, 1.55) + ';color:#334155; white-space:pre-wrap;')}>“{r.note}”</div>}
                    </div>
                    {r.status === 'pending' ? (
                      <div style={css('display:flex; gap:8px; flex:none;')}>
                        <button onClick={() => window.confirm(approveMsg(r)) && api.decideAccess(r.id, 'approve').then(setAccess)} style={css(btn('approve') + 'height:34px; padding:0 14px;')}>Duyệt</button>
                        <button onClick={() => window.confirm(rejectMsg(r)) && api.decideAccess(r.id, 'reject').then(setAccess)} style={css(btn('reject') + 'height:34px; padding:0 14px;')}>Từ chối</button>
                      </div>
                    ) : (
                      <span style={css(r.status === 'approved' ? pill('#E7F9F0', '#00893F') : pill('#FFECEC', '#D8232A'))}>{r.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}{r.decider ? ` · ${r.decider}` : ''}</span>
                    )}
                  </div>
                ))}
              </div>
              <div style={css('margin-top:22px;' + font(800, 15) + ';color:#fff;')}>Được vào khi bảo trì ({mGrants.length})</div>
              <div style={css('margin-top:10px; overflow:hidden;' + card)}>
                {!mGrants.length ? empty('Chưa cho ai vào khi bảo trì.') : mGrants.map((g) => (
                  <div key={g.email} style={css('display:flex; align-items:center; gap:14px; padding:12px 20px; border-bottom:1px solid #F3F5FA;')}>
                    <div style={css('flex:1; min-width:0;' + font(600, 13.5) + ';color:#0f172a;')}>{g.email} {!g.env && <span style={css(font(400, 12) + ';color:#94a3b8;')}>· {g.granter ? `${g.granter} duyệt` : 'đã duyệt'} {relativeTime(g.time)}</span>}</div>
                    {g.env
                      ? <span title="Có trong MAINTENANCE_ALLOW trên Coolify" style={css('height:24px; padding:0 10px; border-radius:999px; background:#EEF3FF; color:#2c5fff; display:inline-flex; align-items:center;' + font(700, 11.5))}>Cấu hình Coolify</span>
                      : <button onClick={() => window.confirm(`Thu hồi quyền vào khi bảo trì của ${g.email}? Người này sẽ thấy lại trang "Web đang được sửa chữa".`) && api.revokeMaintenanceGrant(g.email).then(setAccess)} style={css(btn('plain'))}>Thu hồi</button>}
                  </div>
                ))}
              </div>
              <div style={css('margin-top:22px;' + font(800, 15) + ';color:#fff;')}>Đã cấp quyền riêng ({access.grants.length})</div>
              <div style={css('margin-top:4px;' + font(400, 12.5, 1.55) + ';color:#94a3b8;')}>Người không thuộc Zion / Zalopay trên Microsoft nhưng được cho đăng nhập.</div>
              <div style={css('margin-top:10px; overflow:hidden;' + card)}>
                {!access.grants.length ? empty('Chưa cấp quyền riêng cho ai.') : access.grants.map((g) => (
                  <div key={g.email} style={css('display:flex; align-items:center; gap:14px; padding:12px 20px; border-bottom:1px solid #F3F5FA;')}>
                    <div style={css('flex:1; min-width:0;' + font(600, 13.5) + ';color:#0f172a;')}>{g.email} <span style={css(font(400, 12) + ';color:#94a3b8;')}>· {g.granter ? `${g.granter} cấp` : 'đã cấp'} {relativeTime(g.time)}</span></div>
                    <button onClick={() => window.confirm(`Thu hồi quyền của ${g.email}? Người này sẽ bị đăng xuất nếu Microsoft không ghi công ty Zalopay.`) && api.revokeAccess(g.email).then(setAccess)} style={css(btn('plain'))}>Thu hồi</button>
                  </div>
                ))}
              </div>
            </div>
            )
          })()}

          {section === 'inbox' && (
            <div>
              <Heading title="Hộp thư" sub="Tin nhắn mọi người gửi qua &quot;Chat với Admin&quot;. Admin nào trả lời cũng được, người nhắn chỉ thấy &quot;Admin&quot;." />
              <div className="zp-admin-inbox" style={css('margin-top:18px;')}><AdminInbox t={(x) => x} uid={chatUid} onOpen={setChatUid} /></div>
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
                <Tabs value={userRole} onChange={setUserRole} tabs={[['all', 'Tất cả', users.length], ['admin', 'Admin', users.filter((u) => u.isAdmin).length], ['member', 'Thành viên', users.filter((u) => !u.isAdmin).length], ['cleanup', 'Cần dọn', needsCleanup.length]]} />
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
                    <div style={{ marginTop: 6 }}>Quyền Admin: biến môi trường ADMIN_EMAILS, hoặc thêm ở Quản trị viên / nút ⋯ trên từng dòng bên dưới.</div>
                  </div>
                  </details>
                </div>
                <button onClick={checkDirectory} style={css(btn('plain'))}>Kiểm tra lại</button>
              </div>
              {tableBox(780, (<>
                <div style={headRow(U_COLS)}><span>THÀNH VIÊN</span><span>VAI TRÒ</span><span>THAM GIA</span><span>HOẠT ĐỘNG GẦN NHẤT</span><span>POST</span><span>TRẢ LỜI</span><span>USE CASE</span><span></span></div>
                {userRows.map((u, i) => (
                  <div key={u.id} style={bodyRow(U_COLS)}>
                    <div style={css('display:flex; align-items:center; gap:10px; min-width:0;')}>
                      <span style={css(`flex:none; width:30px; height:30px; border-radius:50%; background:${u.avatarColor || AV[i % AV.length]}; color:#fff; display:flex; align-items:center; justify-content:center;` + font(800, 11) + ';' + avatarPhotoCss(u.avatarUrl))}>{u.initials}</span>
                      <div style={{ minWidth: 0 }}>
                        <div title={`${cleanName(u.name)} · ${u.domain}`} style={css(font(700, 13, 1.4) + ';color:#0f172a;' + ellip)}>{cleanName(u.name)} <span style={css(font(500, 12) + ';color:#94a3b8;')}>· {u.domain}</span></div>
                        <div title={u.email + (u.team ? ' · ' + u.team : '')} style={css('margin-top:1px;' + font(400, 11.5, 1.45) + ';color:#64748b;' + ellip)}>{u.email}{u.team ? ' · ' + u.team : ''}</div>
                        {cleanupOf(u).length > 0 && (
                          <div style={css('display:flex; gap:4px; flex-wrap:wrap; margin-top:3px;')}>
                            {cleanupOf(u).map((why) => <span key={why} title={why} style={css((why === 'Chưa rõ phòng ban' ? pill('#F1F4FA', '#5B6675') : pill('#FFF4E3', '#9A5B00')) + 'height:18px; padding:0 7px; max-width:100%; overflow:hidden; text-overflow:ellipsis;' + font(700, 10.5))}>{why}</span>)}
                          </div>
                        )}
                        {/* Microsoft's organisation fields from the last SSO sign-in (what marks Zalopay staff): folded away,
                            the AD distinguished name is only for debugging sign-in */}
                        {u.org && (u.org.companyName || u.org.officeLocation || u.org.onPremisesDistinguishedName) && (
                          <details style={css('margin-top:2px;')}>
                            <summary style={css('cursor:pointer; width:max-content;' + font(600, 11.5) + ';color:#94a3b8;')}>Chi tiết kỹ thuật</summary>
                            <div style={css('margin-top:3px;' + font(400, 11.5, 1.45) + ';color:#94a3b8; overflow-wrap:anywhere;')}>
                              {[u.org.companyName && 'Công ty: ' + u.org.companyName, u.org.officeLocation && 'Văn phòng: ' + u.org.officeLocation, u.org.onPremisesDistinguishedName && 'AD: ' + u.org.onPremisesDistinguishedName].filter(Boolean).join(' · ')}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                    <div><span style={css(u.isAdmin ? pill('#EDE7FF', '#6F0CE2') : pill('#EDF0FA', '#3A4757'))}>{u.isAdmin ? 'Admin' : 'Thành viên'}</span></div>
                    <div style={css(font(500, 12) + ';color:#64748b; white-space:nowrap;')}>{fmtDate(u.joined)}</div>
                    <div style={css(font(500, 12) + ';color:#64748b; white-space:nowrap;')}>{fmtDay(u.lastActive)}</div>
                    <div style={num}>{u.questions}</div>
                    <div style={num}>{u.answers}</div>
                    <div style={num}>{u.useCases}</div>
                    <div style={css('display:flex; justify-content:flex-end;')}>
                      <button data-row-menu onClick={(e) => { const b = e.currentTarget.getBoundingClientRect(); setRowMenu((m) => (m?.id === u.id ? null : { id: u.id, x: b.right, y: b.bottom })) }} title="Thao tác" aria-label={'Thao tác với ' + u.email} aria-expanded={rowMenu?.id === u.id}
                        className={hoverClass('background:#EEF3FF !important; color:#2c5fff !important;')} style={css(`width:28px; height:28px; border:1px solid #DDE3EC; border-radius:8px; background:${rowMenu?.id === u.id ? '#EEF3FF' : '#fff'}; color:#3A4757; cursor:pointer;` + font(800, 15, 1))}>⋯</button>
                    </div>
                  </div>
                ))}
                {userRows.length === 0 && empty('Không tìm thấy thành viên nào.')}
              </>), 'margin-top:16px;')}
              {rowMenu && (() => {
                const u = users.find((x) => x.id === rowMenu.id)
                if (!u) return null
                const fromEnv = admins.some((a) => a.fromEnv && a.email.toLowerCase() === u.email.toLowerCase())
                const self = u.email.toLowerCase() === String(user.email || '').toLowerCase()
                const blocked = u.isAdmin && (fromEnv ? 'Admin này nằm trong cấu hình ADMIN_EMAILS trên Coolify, bỏ ở đó.' : self ? 'Không tự bỏ quyền admin của mình được.' : '')
                const item = 'display:block; width:100%; text-align:left; padding:9px 12px; border:none; border-radius:9px; background:transparent;'
                // why "Xoá tài khoản" isn't possible here, or '' when it is
                const linked = Object.entries(u.links || {})
                const noDelete = self ? 'Không tự xoá tài khoản của mình được.' : fromEnv ? 'Tài khoản nằm trong ADMIN_EMAILS trên Coolify nên không xoá được.'
                  : linked.length ? `Không xoá được: tài khoản còn ${linked.map(([what, n]) => `${n} ${what}`).join(', ')}. Chỉ xoá được tài khoản chưa có nội dung hay hoạt động nào.` : ''
                return (
                  <div data-row-menu role="menu" style={css(`position:fixed; top:${rowMenu.y + 6}px; left:${Math.max(8, rowMenu.x - 240)}px; width:240px; z-index:800; padding:6px; background:#fff; border:1px solid #E6EBF3; border-radius:12px; box-shadow:0 18px 40px rgba(6,14,40,.35);`)}>
                    {!u.isAdmin && <button role="menuitem" onClick={() => { setRowMenu(null); makeAdmin(u) }} className={hoverClass('background:#F3EEFF !important;')} style={css(item + 'cursor:pointer;' + font(700, 13) + ';color:#6F0CE2;')}>Đặt làm Admin</button>}
                    {u.isAdmin && <button role="menuitem" disabled={!!blocked} title={blocked || ''} onClick={() => { setRowMenu(null); removeAdmin(u.email) }} className={blocked ? undefined : hoverClass('background:#FFF1F1 !important;')} style={css(item + (blocked ? 'cursor:not-allowed; opacity:.55;' : 'cursor:pointer;') + font(700, 13) + ';color:#D8232A;')}>Gỡ Admin</button>}
                    {blocked && <div style={css('padding:2px 12px 8px;' + font(400, 11.5, 1.45) + ';color:#94a3b8;')}>{blocked}</div>}
                    {/* only for an account nothing on the site belongs to (e.g. a duplicate); the server checks again */}
                    <div style={css('height:1px; margin:4px 6px; background:#EEF1F7;')}></div>
                    <button role="menuitem" disabled={!!noDelete} title={noDelete || ''} onClick={() => { setRowMenu(null); deleteUser(u) }} className={noDelete ? undefined : hoverClass('background:#FFF1F1 !important;')} style={css(item + (noDelete ? 'cursor:not-allowed; opacity:.55;' : 'cursor:pointer;') + font(700, 13) + ';color:#D8232A;')}>Xoá tài khoản</button>
                    {noDelete && <div style={css('padding:2px 12px 8px;' + font(400, 11.5, 1.45) + ';color:#94a3b8;')}>{noDelete}</div>}
                  </div>
                )
              })()}
            </div>
          )}
        </main>
      </div>

      {qDetailId && (() => {
        const q = questions.find((x) => x.id === qDetailId)
        if (!q) return null
        // no more picking a best answer: a thread either has replies or not
        const st = q.answers.length ? ['Đã có trả lời', '#E7F9F0', '#00893F'] : ['Chưa có trả lời', '#FFF1E0', '#B45300']
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
                  {q.images.map((src) => <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt="" style={toneObj({ width: 96, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid #E6EBF3' })} /></a>)}
                </div>
              )}
              <div style={css('margin-top:20px;' + font(800, 11.5) + ';letter-spacing:.04em;color:#94a3b8; text-transform:uppercase;')}>Câu trả lời ({q.answers.length})</div>
              {q.answers.length === 0 && <div style={css('margin-top:8px;' + font(500, 13.5) + ';color:#94a3b8;')}>Chưa có ai trả lời.</div>}
              <div style={css('display:flex; flex-direction:column; gap:10px; margin-top:10px;')}>
                {q.answers.map((a) => (
                  <div key={a.id} style={css(`padding:12px 14px; border-radius:14px; border:1px solid ${a.accepted ? '#BEE9D3' : '#EEF1F7'}; background:${a.accepted ? '#F2FBF6' : '#F8FAFE'};`)}>
                    <div style={css('display:flex; align-items:center; gap:8px; flex-wrap:wrap;' + font(700, 12.5) + ';color:#0f172a;')}>
                      {who(a)}<span style={css(font(500, 12) + ';color:#94a3b8;')}>· {relativeTime(a.time)} · {a.helpful || 0} lượt thích</span>
                      {a.accepted && <span style={css(pill('#00A352', '#fff'))}>Câu trả lời được chọn</span>}
                    </div>
                    <div style={css('margin-top:6px;' + font(400, 13.5, 1.6) + ';color:#334155; white-space:pre-wrap; word-break:break-word;')}>{a.body}</div>
                    {(a.comments || []).length > 0 && (
                      <div style={css('margin-top:8px; padding-left:12px; border-left:2px solid #E6EBF3; display:flex; flex-direction:column; gap:6px;')}>
                        {a.comments.map((c) => (
                          <div key={c.id} style={css(font(400, 12.5, 1.55) + ';color:#475569; word-break:break-word;')}><b style={toneObj({ color: '#0f172a' })}>{who(c)}</b> <span style={toneObj({ color: '#94a3b8' })}>· {relativeTime(c.time)}</span><br />{c.body}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={css('display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:26px; padding-top:18px; border-top:1px solid #EEF1F7;')}>
                <a href={`/questions/${encodeURIComponent(q.id)}`} target="_blank" rel="noreferrer" style={css(font(700, 13) + ';color:#2c5fff; text-decoration:none;')}>Mở post ↗</a>
                <button onClick={() => removeQuestion(q, () => { reloadQuestions(); setQDetailId(null) })} style={css('height:42px; padding:0 20px; border:1px solid #F5C9CB; border-radius:999px; background:#FFECEC; color:#D8232A;' + font(700, 13.5) + ';cursor:pointer;')}>Xoá post</button>
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
                <div style={css('margin-top:6px;' + font(400, 13) + ';color:#64748b;')}>{[ucWho(detail), detail.team, 'gửi ' + relativeTime(detail.time)].filter(Boolean).join(' · ')}</div>
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
        const target = review.ids ? null : submissions.find((x) => x.id === review.id) || {}
        const cfg = {
          approved: { title: 'Duyệt & đăng use case này?', desc: 'Use case sẽ hiện ngay trong Use Case Library và ở Home. Người gửi nhận email + thông báo.', label: 'Lời nhắn cho người gửi', required: false, placeholder: 'Không bắt buộc, ví dụ: Cảm ơn bạn, use case rất hữu ích!', cta: 'Duyệt & đăng', color: '#00A352' },
          changes_requested: { title: 'Yêu cầu chỉnh sửa / bổ sung', desc: 'Người gửi nhận email + thông báo kèm ghi chú này, sửa ngay trên bài cũ rồi gửi lại để bạn duyệt.', label: 'Use case còn thiếu gì, cần bổ sung gì?', required: true, placeholder: 'Ví dụ: Bổ sung prompt mẫu đầy đủ, ghi rõ kết quả đo được (tiết kiệm bao nhiêu thời gian), thêm người liên hệ...', cta: 'Gửi yêu cầu chỉnh sửa', color: '#D98200' },
          rejected: { title: 'Từ chối use case này?', desc: 'Use case sẽ không được đăng. Người gửi nhận email + thông báo kèm lý do.', label: 'Lý do từ chối', required: true, placeholder: 'Nêu rõ lý do, ví dụ: trùng với use case đã có, chứa thông tin nội bộ nhạy cảm...', cta: 'Từ chối & gửi lý do', color: '#D8232A' },
        }[review.action]
        const ok = !cfg.required || reviewNote.trim()
        return (
          <div onClick={() => setReview(null)} style={css('position:fixed; inset:0; z-index:950; background:rgba(6,14,40,.55); display:flex; align-items:center; justify-content:center; padding:40px;')}>
            <div onClick={(e) => e.stopPropagation()} style={css('width:540px; max-width:100%; background:#fff; border-radius:22px; padding:28px 30px; box-shadow:0 40px 90px rgba(6,14,40,.5); box-sizing:border-box;' + `border-top:5px solid ${cfg.color};`)}>
              <div style={css(font(800, 19) + ';color:#0f172a;')}>{review.ids ? cfg.title.replace('use case này', `${review.ids.length} use case này`) : cfg.title}</div>
              {target
                ? <div style={css('margin-top:6px;' + font(700, 14, 1.5) + ';color:#334155;')}>"{target.title}" <span style={css(font(500, 13) + ';color:#94a3b8;')}>· {ucWho(target)}</span></div>
                : <div style={css('margin-top:6px;' + font(700, 14, 1.5) + ';color:#334155;')}>{review.ids.length} use case đã chọn <span style={css(font(500, 13) + ';color:#94a3b8;')}>· cùng một {review.action === 'approved' ? 'lời nhắn' : review.action === 'rejected' ? 'lý do' : 'ghi chú'}, mỗi người gửi nhận riêng</span>
                    <div style={css('margin-top:6px; max-height:96px; overflow-y:auto;' + font(500, 12.5, 1.5) + ';color:#64748b;')}>{review.ids.map((id) => submissions.find((x) => x.id === id)).filter(Boolean).map((s) => <div key={s.id}>• {s.title} <span style={{ color: '#94a3b8' }}>· {ucWho(s)}</span></div>)}</div>
                  </div>}
              <div style={css('margin-top:6px;' + font(400, 13, 1.6) + ';color:#64748b;')}>{cfg.desc}</div>
              <div style={css('margin-top:18px;' + font(800, 13) + ';color:#0f172a;')}>{cfg.label} {cfg.required ? <span style={{ color: '#E0353F' }}>*</span> : <span style={css(font(500, 12) + ';color:#94a3b8;')}>(không bắt buộc)</span>}</div>
              <textarea autoFocus value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={review.action === 'approved' ? 2 : 5} placeholder={cfg.placeholder} style={css('width:100%; margin-top:10px; border:1px solid #E6EBF3; border-radius:12px; padding:12px 14px; font-size:14px; line-height:1.6; color:#0f172a; background:#ffffff; outline:none; resize:vertical; display:block; box-sizing:border-box; font-family:inherit;')}></textarea>
              <div style={css('display:flex; justify-content:flex-end; gap:12px; margin-top:20px;')}>
                <button onClick={() => setReview(null)} style={css('height:44px; padding:0 20px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757;' + font(700, 13.5) + ';cursor:pointer;')}>Huỷ</button>
                <button disabled={!ok} onClick={submitReview} style={css(`height:44px; padding:0 22px; border:none; border-radius:999px; background:${cfg.color}; color:#fff;` + font(700, 13.5) + `;cursor:${ok ? 'pointer' : 'not-allowed'}; opacity:${ok ? 1 : 0.5};`)}>{cfg.cta}{review.ids ? ` (${review.ids.length})` : ''}</button>
              </div>
            </div>
          </div>
        )
      })()}

      {confirm && (
        <div style={css('position:fixed; inset:0; z-index:960; background:rgba(6,14,40,.55); display:flex; align-items:center; justify-content:center; padding:40px;')}>
          <div style={css('width:440px; max-width:100%; background:#fff; border-radius:22px; padding:26px 28px; box-shadow:0 40px 90px rgba(6,14,40,.5); box-sizing:border-box;')}>
            <div style={css(font(800, 17, 1.45) + ';color:#0f172a;')}>{confirm.text}</div>
            <div style={css('margin-top:8px;' + font(400, 13.5, 1.55) + ';color:#64748b;')}>{confirm.note || 'Không thể hoàn tác.'}</div>
            <div style={css('display:flex; justify-content:flex-end; gap:12px; margin-top:18px;')}>
              <button onClick={() => setConfirm(null)} style={css('height:42px; padding:0 20px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757;' + font(700, 13.5) + ';cursor:pointer;')}>Huỷ</button>
              <button onClick={() => { confirm.run(); setConfirm(null) }} style={css(`height:42px; padding:0 22px; border:none; border-radius:999px; background:${confirm.color || '#D8232A'}; color:#fff;` + font(700, 13.5) + ';cursor:pointer;')}>{confirm.cta || 'Xoá'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
