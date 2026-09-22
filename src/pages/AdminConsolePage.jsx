import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'

const AV = ['#2c5fff', '#00A352', '#6F0CE2', '#FF8D00', '#0033C9', '#00B7FF']
const CATEGORIES = ['Productivity & Personal Work', 'Content & Communication', 'Research & Knowledge', 'Data & Analysis', 'Coding & Technical', 'Automation & Workflow', 'Meeting & Collaboration', 'Design & Creative', 'Other']
const UC_STATUS = {
  published: { label: 'Published', bg: '#E7F9F0', fg: '#00893F' },
  pending: { label: 'Pending Review', bg: '#FFF1E0', fg: '#B45300' },
  draft: { label: 'Draft', bg: '#EDF0FA', fg: '#3A4757' },
  rejected: { label: 'Rejected', bg: '#FFECEC', fg: '#D8232A' },
}

const INITIAL_USE_CASES = [
  { id: 'u1', title: 'Tự động phân loại & trả lời ticket CSKH', author: 'TrucVN', dept: 'Customer Support', category: 'Automation & Workflow', status: 'pending', date: '06/09/2026', reason: '' },
  { id: 'u2', title: 'Tóm tắt báo cáo & tạo insight từ dữ liệu', author: 'MinhPQ', dept: 'Business Intelligence', category: 'Data & Analysis', status: 'published', date: '02/09/2026', reason: '' },
  { id: 'u3', title: 'Sinh mô tả sản phẩm & nội dung SEO', author: 'QuyenNT', dept: 'Marketing', category: 'Content & Communication', status: 'pending', date: '05/09/2026', reason: '' },
  { id: 'u4', title: 'Auto QA script cho pipeline dữ liệu', author: 'HaiPD', dept: 'Data', category: 'Coding & Technical', status: 'rejected', date: '28/08/2026', reason: 'Thiếu phần Prompt/Workflow và không nêu rõ dữ liệu đầu vào có chứa thông tin khách hàng hay không.' },
  { id: 'u5', title: 'Trợ lý tra cứu chính sách nội bộ', author: 'LanDT', dept: 'People Enablement', category: 'Research & Knowledge', status: 'draft', date: '07/09/2026', reason: '' },
  { id: 'u6', title: 'Trợ lý tuyển dụng: sàng lọc CV tự động', author: 'DiepTM', dept: 'HR', category: 'Productivity & Personal Work', status: 'published', date: '20/08/2026', reason: '' },
]
const INITIAL_QUESTIONS = [
  { id: 'q1', title: 'Làm sao để dùng Claude tóm tắt file PDF dài hơn 50 trang?', author: 'NgocTA', dept: 'Product Ops', category: 'Research & Knowledge', answers: 2, resolved: false, created: '08/09/2026', resolvedAt: '' },
  { id: 'q2', title: 'Prompt nào hiệu quả để sinh mô tả sản phẩm bằng tiếng Việt?', author: 'QuyenNT', dept: 'Marketing', category: 'Content & Communication', answers: 2, resolved: true, created: '07/09/2026', resolvedAt: '07/09/2026' },
  { id: 'q3', title: 'Có cách nào tự động phân loại ticket CSKH theo chủ đề?', author: 'TrucVN', dept: 'Customer Support', category: 'Automation & Workflow', answers: 0, resolved: false, created: '06/09/2026', resolvedAt: '' },
  { id: 'q4', title: 'Dùng AI review code có an toàn với repo nội bộ không?', author: 'DucMH', dept: 'Engineering', category: 'Coding & Technical', answers: 0, resolved: false, created: '04/09/2026', resolvedAt: '' },
]
const INITIAL_TOPICS = [
  { id: 't1', name: 'Prompting', uc: 18, q: 12, active: true },
  { id: 't2', name: 'Tóm tắt', uc: 14, q: 9, active: true },
  { id: 't3', name: 'Tài liệu dài', uc: 9, q: 11, active: true },
  { id: 't4', name: 'Bảo mật dữ liệu', uc: 7, q: 10, active: true },
  { id: 't5', name: 'Tiếng Việt', uc: 11, q: 6, active: true },
  { id: 't6', name: 'Ticket & CSKH', uc: 8, q: 7, active: true },
  { id: 't7', name: 'Code review', uc: 6, q: 8, active: true },
  { id: 't8', name: 'Báo cáo', uc: 10, q: 4, active: true },
  { id: 't9', name: 'Slide & thuyết trình', uc: 5, q: 3, active: true },
  { id: 't10', name: 'OCR', uc: 4, q: 2, active: false },
]
const INITIAL_USERS = [
  { id: 'e1', name: 'Nguyễn Thảo', initials: 'NT', email: 'nguyen.thao@zalopay.vn', dept: 'Product Ops', role: 'Admin', status: 'Active', joined: '12/01/2025' },
  { id: 'e2', name: 'Phạm Duy Hải', initials: 'PH', email: 'pham.hai@zalopay.vn', dept: 'Data', role: 'Employee', status: 'Active', joined: '03/03/2025' },
  { id: 'e3', name: 'Nguyễn Thu Quyên', initials: 'NQ', email: 'nguyen.quyen@zalopay.vn', dept: 'Marketing', role: 'Employee', status: 'Active', joined: '18/04/2025' },
  { id: 'e4', name: 'Vũ Ngọc Trúc', initials: 'VT', email: 'vu.truc@zalopay.vn', dept: 'Customer Support', role: 'Employee', status: 'Active', joined: '22/05/2025' },
  { id: 'e5', name: 'Mai Hữu Đức', initials: 'MD', email: 'mai.duc@zalopay.vn', dept: 'Engineering', role: 'Admin', status: 'Active', joined: '09/07/2025' },
  { id: 'e6', name: 'Đỗ Thanh Lan', initials: 'DL', email: 'do.lan@zalopay.vn', dept: 'People Enablement', role: 'Employee', status: 'Invited', joined: '01/09/2026' },
]
const INITIAL_NOTIFICATIONS = [
  { id: 'n1', text: 'TrucVN gửi use case mới chờ duyệt: "Tự động phân loại & trả lời ticket CSKH"', time: '2 giờ trước', iconText: '⏳', iconBg: '#FFF1E0', iconFg: '#B45300' },
  { id: 'n2', text: 'QuyenNT gửi use case mới chờ duyệt: "Sinh mô tả sản phẩm & nội dung SEO"', time: 'Hôm qua', iconText: '⏳', iconBg: '#FFF1E0', iconFg: '#B45300' },
  { id: 'n3', text: '2 câu hỏi quá 48 giờ chưa có câu trả lời', time: '2 ngày trước', iconText: '?', iconBg: '#E7ECFB', iconFg: '#2c5fff' },
]
const UC_CAT = [
  ['Automation & Workflow', 34], ['Data & Analysis', 29], ['Content & Communication', 26], ['Coding & Technical', 22],
  ['Productivity & Personal Work', 19], ['Research & Knowledge', 15], ['Meeting & Collaboration', 11], ['Design & Creative', 7], ['Other', 4],
]
const Q_CAT = [
  ['Coding & Technical', 27], ['Content & Communication', 24], ['Research & Knowledge', 21], ['Automation & Workflow', 18],
  ['Data & Analysis', 16], ['Productivity & Personal Work', 12], ['Meeting & Collaboration', 8], ['Design & Creative', 5], ['Other', 3],
]
const MONTHS = ['T10', 'T11', 'T12', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9']
const UC_SERIES = [4, 6, 5, 9, 8, 12, 11, 15, 14, 18, 17, 21]
const Q_SERIES = [8, 11, 9, 14, 16, 15, 19, 22, 20, 26, 24, 29]

const act = (label, kind, onClick) => ({
  label, onClick,
  bg: kind === 'approve' ? '#E7F9F0' : kind === 'reject' ? '#FFECEC' : '#fff',
  border: kind === 'approve' ? '#BEE9D3' : kind === 'reject' ? '#F5C9CB' : '#DDE3EC',
  color: kind === 'approve' ? '#00893F' : kind === 'reject' ? '#D8232A' : '#3A4757',
})
const tabStyle = (active) => ({ bg: active ? '#fff' : 'transparent', color: active ? '#2c5fff' : '#2A3A57' })
const font = (weight, size, lh) => `font:${weight} ${size}px${lh ? '/' + lh : ''} "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif`

export default function AdminConsolePage() {
  const navigate = useNavigate()
  const [section, setSection] = useState('dashboard')
  const [notifOpen, setNotifOpen] = useState(false)
  const [topicScope, setTopicScope] = useState('all')
  const [ucQuery, setUcQuery] = useState('')
  const [ucStatus, setUcStatus] = useState('all')
  const [qQuery, setQQuery] = useState('')
  const [qStatus, setQStatus] = useState('all')
  const [userQuery, setUserQuery] = useState('')
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [editingTopic, setEditingTopic] = useState(null)
  const [topicDraft, setTopicDraft] = useState('')
  const [settingsState, setSettingsState] = useState({ teams: true, attachments: true, digest: false })
  const [useCases, setUseCases] = useState(INITIAL_USE_CASES)
  const [questions, setQuestions] = useState(INITIAL_QUESTIONS)
  const [topics, setTopics] = useState(INITIAL_TOPICS)
  const [users, setUsers] = useState(INITIAL_USERS)
  const notifRef = useRef(null)

  const patchUc = (id, fn) => setUseCases((list) => list.map((u) => (u.id === id ? fn(u) : u)))

  const pending = useCases.filter((u) => u.status === 'pending').length
  const unanswered = questions.filter((q) => q.answers === 0).length

  const menuDefs = [
    ['dashboard', 'Dashboard', '#2c5fff', 0],
    ['usecases', 'Use Case Management', '#00A352', pending],
    ['questions', 'Question Management', '#FF8D00', unanswered],
    ['taxonomy', 'Categories & Topics', '#6F0CE2', 0],
    ['users', 'Users', '#00B7FF', 0],
    ['settings', 'Settings', '#94a3b8', 0],
  ]
  const menu = menuDefs.map(([k, label, dot, badge]) => ({
    key: k, label, dot, bg: section === k ? '#EDF3FF' : 'transparent', color: section === k ? '#1E44A8' : '#3A4757',
    badge, badgeDisplay: badge ? 'flex' : 'none', onPick: () => { setSection(k); setNotifOpen(false) },
  }))

  // dashboard chart geometry
  const maxV = 32, W = 1000, H = 240
  const px = (i) => (i * (W - 40)) / (MONTHS.length - 1) + 20
  const py = (v) => H - 16 - (v / maxV) * (H - 34)
  const pts = (arr) => arr.map((v, i) => px(i).toFixed(1) + ',' + py(v).toFixed(1)).join(' ')
  const dots = (arr) => arr.map((v, i) => ({ x: px(i).toFixed(1), y: py(v).toFixed(1) }))
  const gridLines = [0, 1, 2, 3, 4].map((i) => ({ y: (16 + i * ((H - 34) / 4)).toFixed(0) }))
  const bars = (rows) => { const max = rows.reduce((m, r) => Math.max(m, r[1]), 1); return rows.map((r) => ({ label: r[0], value: r[1], width: Math.round((r[1] / max) * 100) + '%' })) }
  const ucByCat = bars(UC_CAT), qByCat = bars(Q_CAT)

  const topicVal = (t) => (topicScope === 'uc' ? t.uc : topicScope === 'q' ? t.q : t.uc + t.q)
  const topSorted = topics.slice().sort((a, b) => topicVal(b) - topicVal(a)).slice(0, 10)
  const topMax = topicVal(topSorted[0] || { uc: 1, q: 0 }) || 1
  const topTopics = topSorted.map((t, i) => ({ rank: '#' + (i + 1), label: t.name, value: topicVal(t), width: Math.round((topicVal(t) / topMax) * 100) + '%' }))
  const topicScopes = [['all', 'All'], ['uc', 'Use Cases'], ['q', 'Questions']].map(([k, label]) => ({ label, ...tabStyle(topicScope === k), onPick: () => setTopicScope(k) }))

  // use case management
  const ucq = ucQuery.trim().toLowerCase()
  const ucFiltered = useCases.filter((u) => (ucStatus === 'all' || u.status === ucStatus) && (!ucq || (u.title + ' ' + u.author).toLowerCase().indexOf(ucq) >= 0))
  const ucRows = ucFiltered.map((u) => {
    const st = UC_STATUS[u.status]
    const actions = [act('View', 'plain', () => {}), act('Edit', 'plain', () => {})]
    if (u.status === 'pending') {
      actions.push(act('Approve', 'approve', () => patchUc(u.id, (x) => ({ ...x, status: 'published', reason: '' }))))
      actions.push(act('Reject', 'reject', () => { setRejectId(u.id); setRejectReason('') }))
    } else {
      actions.push(act('Delete', 'reject', () => setUseCases((list) => list.filter((x) => x.id !== u.id))))
    }
    return { ...u, statusLabel: st.label, statusBg: st.bg, statusFg: st.fg, meta: u.dept + ' · ' + u.date, hasReason: u.status === 'rejected' && !!u.reason, actions }
  })
  const ucStatusTabs = [['all', 'All'], ['pending', 'Pending'], ['published', 'Published'], ['draft', 'Draft'], ['rejected', 'Rejected']]
    .map(([k, label]) => ({ key: k, label, ...tabStyle(ucStatus === k), onPick: () => setUcStatus(k) }))

  // question management
  const qq = qQuery.trim().toLowerCase()
  const qFiltered = questions.filter((q) => (qStatus === 'all' || (qStatus === 'resolved') === q.resolved) && (!qq || (q.title + ' ' + q.author).toLowerCase().indexOf(qq) >= 0))
  const qRows = qFiltered.map((q) => ({
    ...q,
    statusLabel: q.resolved ? 'Resolved' : 'Waiting for answers',
    statusBg: q.resolved ? '#E7F9F0' : '#FFF1E0',
    statusFg: q.resolved ? '#00893F' : '#B45300',
    meta: q.dept + ' · created ' + q.created + (q.resolvedAt ? ' · resolved ' + q.resolvedAt : ''),
    actions: [act('View', 'plain', () => {}), act('Edit', 'plain', () => {}), act('Delete', 'reject', () => setQuestions((list) => list.filter((x) => x.id !== q.id)))],
  }))
  const qStatusTabs = [['all', 'All'], ['waiting', 'Waiting'], ['resolved', 'Resolved']]
    .map(([k, label]) => ({ key: k, label, ...tabStyle(qStatus === k), onPick: () => setQStatus(k) }))

  // taxonomy
  const catCount = {}
  CATEGORIES.forEach((c) => { catCount[c] = 0 })
  UC_CAT.forEach((r) => { catCount[r[0]] += r[1] })
  Q_CAT.forEach((r) => { catCount[r[0]] += r[1] })
  const categoryRows = CATEGORIES.map((c, i) => ({ num: i + 1, label: c, count: catCount[c] + ' bài' }))
  const topicRows = topics.map((t) => {
    const editing = editingTopic === t.id
    const actions = []
    if (editing) {
      actions.push(act('Save', 'approve', () => { setTopics((list) => list.map((x) => (x.id === t.id ? { ...x, name: topicDraft.trim() || x.name } : x))); setEditingTopic(null); setTopicDraft('') }))
      actions.push(act('Cancel', 'plain', () => { setEditingTopic(null); setTopicDraft('') }))
    } else {
      actions.push(act('Rename', 'plain', () => { setEditingTopic(t.id); setTopicDraft(t.name) }))
      actions.push(act(t.active ? 'Deactivate' : 'Activate', t.active ? 'reject' : 'approve', () => setTopics((list) => list.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x)))))
    }
    return {
      ...t, editing, notEditing: !editing, draft: topicDraft,
      onDraft: (e) => setTopicDraft(e.target.value),
      rowBg: t.active ? '#fff' : '#FAFBFD', nameColor: t.active ? '#3A4757' : '#94a3b8',
      usage: t.uc + t.q + ' lượt gắn',
      stateLabel: t.active ? 'Active' : 'Deactivated', stateBg: t.active ? '#E7F9F0' : '#EDF0FA', stateFg: t.active ? '#00893F' : '#64748b',
      actions,
    }
  })

  // users
  const uq = userQuery.trim().toLowerCase()
  const userRows = users.filter((u) => !uq || (u.name + ' ' + u.email + ' ' + u.dept).toLowerCase().indexOf(uq) >= 0).map((u, i) => ({
    ...u,
    avatarBg: AV[i % AV.length],
    roleBg: u.role === 'Admin' ? '#EDE7FF' : '#EDF0FA',
    roleBorder: u.role === 'Admin' ? '#D3C4FF' : '#DDE3EC',
    roleFg: u.role === 'Admin' ? '#6F0CE2' : '#3A4757',
    statusFg: u.status === 'Active' ? '#00A352' : '#B45300',
    onToggleRole: () => setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: x.role === 'Admin' ? 'Employee' : 'Admin' } : x))),
  }))

  const settingDefs = [
    ['teams', 'Teams Chat notification', 'Gửi thông báo mention qua Microsoft Teams theo pattern đã được IT phê duyệt. Tắt thì thông báo trong sản phẩm vẫn hoạt động.'],
    ['attachments', 'File attachment cho Questions', 'Cho phép đính kèm file trong Ask a Question và Answers.'],
    ['digest', 'Email digest hằng tuần cho Admin', 'Tổng hợp use case chờ duyệt và câu hỏi chưa được trả lời.'],
  ]
  const settingsList = settingDefs.map(([k, label, desc]) => ({
    key: k, label, desc, trackBg: settingsState[k] ? '#00CF6A' : '#CBD5E1', knobPos: settingsState[k] ? 'flex-end' : 'flex-start',
    onToggle: () => setSettingsState((s) => ({ ...s, [k]: !s[k] })),
  }))

  const rejectTarget = useCases.find((u) => u.id === rejectId)
  const kpis = [
    { label: 'Total Use Cases', value: 167, hint: 'Đã publish', icon: 'UC', iconBg: '#E7ECFB', iconFg: '#2c5fff', valueColor: '#0F172A' },
    { label: 'Total Questions', value: 134, hint: 'Toàn bộ thread', icon: '?', iconBg: '#E7F9F0', iconFg: '#00893F', valueColor: '#0F172A' },
    { label: 'Pending Use Cases', value: pending, hint: 'Chờ Admin duyệt', icon: '⏳', iconBg: '#FFF1E0', iconFg: '#B45300', valueColor: '#B45300' },
    { label: 'Unanswered Questions', value: unanswered, hint: 'Chưa có câu trả lời', icon: '!', iconBg: '#FFECEC', iconFg: '#D8232A', valueColor: '#D8232A' },
  ]

  const gridCols5 = '1fr 148px 150px 128px 200px'
  const gridCols6 = '1fr 130px 150px 84px 148px 152px'
  const gridColsUsers = '210px 1fr 160px 130px 110px 120px'

  return (
    <div style={css('width:100%; margin:0 auto; background:#eef1f9; color:#0f172a;')}>
      <div style={css('position:relative; z-index:400; background:linear-gradient(180deg,#0c1533 0%,#070b1c 100%);')}>
        <div style={css('max-width:1440px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; padding:22px 40px;')}>
          <div style={css('display:flex; align-items:center; gap:11px;')}>
            <span style={css(font(800, 24) + ';letter-spacing:-.5px;color:#fff;')}>Zalopay</span>
            <span style={css('width:1px; height:22px; background:rgba(255,255,255,.35);')}></span>
            <span style={css(font(600, 15) + ';color:#dbe6ff;')}>AI Community</span>
            <span style={css(font(700, 11) + ';padding:2px 9px;border-radius:20px;background:rgba(255,255,255,.16);color:#dbe6ff;')}>Beta</span>
          </div>
          <nav style={css('display:flex; align-items:center; gap:34px;')}>
            <Link to="/" style={css(font(600, 15) + ';padding:6px 2px;color:#c3d0f5;border-bottom:2px solid transparent;text-decoration:none;')}>Home</Link>
            <Link to="/use-cases" style={css(font(600, 15) + ';padding:6px 2px;color:#c3d0f5;border-bottom:2px solid transparent;text-decoration:none;')}>Use Case Library</Link>
            <Link to="/questions" style={css(font(600, 15) + ';padding:6px 2px;color:#c3d0f5;border-bottom:2px solid transparent;text-decoration:none;')}>Questions</Link>
            <span style={css('display:inline-flex; align-items:center; gap:7px;' + font(600, 15) + ';padding:6px 2px;color:#fff;border-bottom:2px solid #fff;')}>Admin
              <span style={css(font(700, 9.5) + ';letter-spacing:.5px;padding:2px 6px;border-radius:5px;background:rgba(0,207,106,.18);color:#5ff2a6;')}>ADMIN</span>
            </span>
          </nav>
          <div style={css('display:flex; align-items:center; gap:12px;')}>
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setNotifOpen((o) => !o) }}
                style={css(`display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; background:${notifOpen ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.05)'}; border:1px solid rgba(255,255,255,.18); cursor:pointer; padding:0;`)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dbe6ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
                <span style={css('position:absolute; top:-2px; right:-2px; min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:#FF3B30; color:#fff;' + font(800, 10.5) + ';display:flex;align-items:center;justify-content:center;border:2px solid #0a1129;')}>{INITIAL_NOTIFICATIONS.length}</span>
              </button>
              {notifOpen && (
                <div style={css('position:absolute; right:0; top:52px; width:380px; background:#fff; border:1px solid #E6EBF3; border-radius:18px; box-shadow:0 26px 60px rgba(6,14,40,.34); overflow:hidden; z-index:600;')}>
                  <div style={css('padding:16px 18px; border-bottom:1px solid #EEF1F7;' + font(800, 15) + ';color:#0f172a;')}>Notifications</div>
                  {INITIAL_NOTIFICATIONS.map((n) => (
                    <div key={n.id} style={css('display:flex; gap:12px; padding:14px 18px; border-bottom:1px solid #F3F5FA;')}>
                      <span style={css(`flex:none; width:34px; height:34px; border-radius:11px; background:${n.iconBg}; color:${n.iconFg}; display:flex; align-items:center; justify-content:center;` + font(800, 12) + ';')}>{n.iconText}</span>
                      <div style={css('flex:1; min-width:0;')}>
                        <div style={css(font(600, 13.5, 1.5) + ';color:#0f172a;')}>{n.text}</div>
                        <div style={css('margin-top:5px;' + font(400, 12) + ';color:#94a3b8;')}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => navigate('/profile')} className={hoverClass('')} style={css('display:flex; align-items:center; gap:11px; padding:5px 15px 5px 5px; border-radius:999px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.18); cursor:pointer; text-decoration:none; border-width:1px;')}>
              <div style={css('width:36px; height:36px; border-radius:50%; background:#fff; color:#0e2f8a; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px;')}>NT</div>
              <span style={css(font(600, 15) + ';color:#fff;white-space:nowrap;')}>Nguyễn Thảo</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c3d0f5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
            </button>
          </div>
        </div>
      </div>

      <div style={css('display:grid; grid-template-columns:252px 1fr; align-items:start;')}>
        <aside style={css('min-height:900px; background:#fff; border-right:1px solid #E6EBF3; padding:26px 18px 60px;')}>
          <div style={css('padding:0 12px 14px;' + font(700, 11.5) + ';letter-spacing:.6px;color:#94a3b8;')}>ADMIN CONSOLE</div>
          <div style={css('display:flex; flex-direction:column; gap:4px;')}>
            {menu.map((m) => (
              <button key={m.key} onClick={m.onPick} style={css(`display:flex; align-items:center; gap:11px; width:100%; height:46px; padding:0 14px; border:none; border-radius:12px; background:${m.bg}; color:${m.color};` + font(700, 14) + ';cursor:pointer;text-align:left;')}>
                <span style={css(`flex:none; width:8px; height:8px; border-radius:50%; background:${m.dot};`)}></span>
                <span style={{ flex: 1 }}>{m.label}</span>
                <span style={css(`display:${m.badgeDisplay}; align-items:center; justify-content:center; min-width:22px; height:22px; padding:0 7px; border-radius:999px; background:#FFF1E0; color:#B45300;` + font(800, 11) + ';')}>{m.badge}</span>
              </button>
            ))}
          </div>
          <div style={css('margin-top:28px; padding:16px; border:1px solid #E6EBF3; border-radius:14px; background:#F8FAFE;')}>
            <div style={css(font(800, 12.5) + ';color:#3A4757;')}>Signed in via Microsoft 365</div>
            <div style={css('margin-top:6px;' + font(400, 12, 1.55) + ';color:#64748b;')}>nguyen.thao@zalopay.vn · Admin</div>
          </div>
        </aside>

        <main style={css('padding:30px 40px 80px; min-width:0;')}>
          {section === 'dashboard' && (
            <div>
              <h1 style={css('margin:0;' + font(800, 28) + ';letter-spacing:-.01em;color:#0f172a;')}>Dashboard</h1>
              <p style={css('margin:8px 0 0;' + font(400, 14.5) + ';color:#64748b;')}>Content &amp; Community Overview. Không bao gồm phân tích engagement hay reputation.</p>

              <div style={css('display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:24px;')}>
                {kpis.map((k) => (
                  <div key={k.label} style={css('background:#fff; border:1px solid #E6EBF3; border-radius:18px; padding:20px 22px; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                    <div style={css('display:flex; align-items:center; justify-content:space-between;')}>
                      <span style={css(font(700, 12.5) + ';color:#64748b;')}>{k.label}</span>
                      <span style={css(`width:30px; height:30px; border-radius:10px; background:${k.iconBg}; color:${k.iconFg}; display:flex; align-items:center; justify-content:center;` + font(800, 12) + ';')}>{k.icon}</span>
                    </div>
                    <div style={css(`margin-top:14px;` + font(900, 32) + `;color:${k.valueColor};`)}>{k.value}</div>
                    <div style={css('margin-top:6px;' + font(600, 12) + ';color:#94a3b8;')}>{k.hint}</div>
                  </div>
                ))}
              </div>

              <div style={css('background:#fff; border:1px solid #E6EBF3; border-radius:20px; padding:24px 26px; margin-top:20px; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                <div style={css('display:flex; align-items:center; justify-content:space-between;')}>
                  <div>
                    <h2 style={css('margin:0;' + font(800, 17) + ';color:#0f172a;')}>Community Activity Over Time</h2>
                    <p style={css('margin:6px 0 0;' + font(400, 12.5) + ';color:#94a3b8;')}>Bài đã publish theo tháng. Use Case ở trạng thái Draft/Rejected không được tính.</p>
                  </div>
                  <div style={css('display:flex; gap:16px;')}>
                    <span style={css('display:inline-flex; align-items:center; gap:7px;' + font(700, 12.5) + ';color:#3A4757;')}><span style={css('width:12px; height:3px; border-radius:2px; background:#2c5fff;')}></span>Use Cases</span>
                    <span style={css('display:inline-flex; align-items:center; gap:7px;' + font(700, 12.5) + ';color:#3A4757;')}><span style={css('width:12px; height:3px; border-radius:2px; background:#00CF6A;')}></span>Questions</span>
                  </div>
                </div>
                <div style={css('margin-top:20px; position:relative;')}>
                  <svg width="100%" height="240" viewBox="0 0 1000 240" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
                    {gridLines.map((g, i) => (<line key={i} x1="0" y1={g.y} x2="1000" y2={g.y} stroke="#EEF1F7" strokeWidth="1"></line>))}
                    <polyline points={pts(UC_SERIES)} fill="none" stroke="#2c5fff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"></polyline>
                    <polyline points={pts(Q_SERIES)} fill="none" stroke="#00CF6A" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"></polyline>
                    {dots(UC_SERIES).map((d, i) => (<circle key={i} cx={d.x} cy={d.y} r="4" fill="#fff" stroke="#2c5fff" strokeWidth="2.5"></circle>))}
                    {dots(Q_SERIES).map((d, i) => (<circle key={i} cx={d.x} cy={d.y} r="4" fill="#fff" stroke="#00CF6A" strokeWidth="2.5"></circle>))}
                  </svg>
                  <div style={css('display:flex; justify-content:space-between; margin-top:10px;')}>
                    {MONTHS.map((m, i) => (<span key={i} style={css(font(600, 11.5) + ';color:#94a3b8;')}>{m}</span>))}
                  </div>
                </div>
              </div>

              <div style={css('display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px;')}>
                <div style={css('background:#fff; border:1px solid #E6EBF3; border-radius:20px; padding:24px 26px; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                  <h2 style={css('margin:0 0 18px;' + font(800, 17) + ';color:#0f172a;')}>Use Cases by Category</h2>
                  <div style={css('display:flex; flex-direction:column; gap:12px;')}>
                    {ucByCat.map((r) => (
                      <div key={r.label}>
                        <div style={css('display:flex; justify-content:space-between;' + font(600, 12.5) + ';color:#3A4757;')}><span>{r.label}</span><span style={{ color: '#94a3b8' }}>{r.value}</span></div>
                        <div style={css('margin-top:6px; height:9px; border-radius:999px; background:#EDF0FA; overflow:hidden;')}><div style={css(`height:9px; border-radius:999px; background:linear-gradient(90deg,#4480ff,#2c5fff); width:${r.width};`)}></div></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={css('background:#fff; border:1px solid #E6EBF3; border-radius:20px; padding:24px 26px; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                  <h2 style={css('margin:0 0 18px;' + font(800, 17) + ';color:#0f172a;')}>Questions by Category</h2>
                  <div style={css('display:flex; flex-direction:column; gap:12px;')}>
                    {qByCat.map((r) => (
                      <div key={r.label}>
                        <div style={css('display:flex; justify-content:space-between;' + font(600, 12.5) + ';color:#3A4757;')}><span>{r.label}</span><span style={{ color: '#94a3b8' }}>{r.value}</span></div>
                        <div style={css('margin-top:6px; height:9px; border-radius:999px; background:#EDF0FA; overflow:hidden;')}><div style={css(`height:9px; border-radius:999px; background:linear-gradient(90deg,#00E27A,#00A352); width:${r.width};`)}></div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={css('background:#fff; border:1px solid #E6EBF3; border-radius:20px; padding:24px 26px; margin-top:20px; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                <div style={css('display:flex; align-items:center; justify-content:space-between;')}>
                  <div>
                    <h2 style={css('margin:0;' + font(800, 17) + ';color:#0f172a;')}>Top Topics</h2>
                    <p style={css('margin:6px 0 0;' + font(400, 12.5) + ';color:#94a3b8;')}>Mỗi bài gắn tối đa 3 Topic, nên tổng lượt gắn topic có thể lớn hơn tổng số bài.</p>
                  </div>
                  <div style={css('display:inline-flex; background:#EDF0FA; border-radius:12px; padding:5px; gap:5px;')}>
                    {topicScopes.map((tsc) => (
                      <button key={tsc.label} onClick={tsc.onPick} style={css(`border:none; cursor:pointer; height:34px; padding:0 14px; border-radius:9px;` + font(700, 12.5) + `;background:${tsc.bg}; color:${tsc.color};`)}>{tsc.label}</button>
                    ))}
                  </div>
                </div>
                <div style={css('display:grid; grid-template-columns:1fr 1fr; gap:12px 28px; margin-top:20px;')}>
                  {topTopics.map((r) => (
                    <div key={r.label} style={css('display:flex; align-items:center; gap:12px;')}>
                      <span style={css('flex:none; width:22px;' + font(800, 12) + ';color:#94a3b8;')}>{r.rank}</span>
                      <span style={css('flex:none; width:132px;' + font(700, 12.5) + ';color:#3A4757;')}>{r.label}</span>
                      <div style={css('flex:1; height:9px; border-radius:999px; background:#EDF0FA; overflow:hidden;')}><div style={css(`height:9px; border-radius:999px; background:linear-gradient(90deg,#8B5CF6,#6F0CE2); width:${r.width};`)}></div></div>
                      <span style={css('flex:none; width:34px; text-align:right;' + font(700, 12.5) + ';color:#64748b;')}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'usecases' && (
            <div>
              <h1 style={css('margin:0;' + font(800, 28) + ';letter-spacing:-.01em;color:#0f172a;')}>Use Case Management</h1>
              <p style={css('margin:8px 0 0;' + font(400, 14.5) + ';color:#64748b;')}>Use Case phải được duyệt trước khi publish. Từ chối bắt buộc kèm lý do.</p>

              <div style={css('display:flex; align-items:center; gap:12px; margin-top:22px;')}>
                <div style={css('flex:1; display:flex; align-items:center; gap:10px; background:#fff; border:1px solid #E6EBF3; border-radius:12px; padding:11px 16px;')}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
                  <input value={ucQuery} onChange={(e) => setUcQuery(e.target.value)} placeholder="Tìm theo tiêu đề hoặc tác giả..." style={css('flex:1; border:none; outline:none; background:transparent; font-size:14px; color:#0f172a;')} />
                </div>
                <div style={css('display:inline-flex; background:#EDF0FA; border-radius:12px; padding:5px; gap:5px;')}>
                  {ucStatusTabs.map((tb) => (
                    <button key={tb.key} onClick={tb.onPick} style={css(`border:none; cursor:pointer; height:36px; padding:0 14px; border-radius:9px;` + font(700, 12.5) + `;background:${tb.bg}; color:${tb.color};`)}>{tb.label}</button>
                  ))}
                </div>
              </div>

              <div style={css('margin-top:16px; background:#fff; border:1px solid #E6EBF3; border-radius:20px; overflow:hidden; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                <div style={css(`display:grid; grid-template-columns:${gridCols5}; gap:14px; padding:14px 22px; background:#F8FAFE; border-bottom:1px solid #EEF1F7;` + font(700, 11.5) + ';letter-spacing:.4px;color:#64748b;')}>
                  <span>USE CASE</span><span>AUTHOR</span><span>CATEGORY</span><span>STATUS</span><span style={{ textAlign: 'right' }}>ACTIONS</span>
                </div>
                {ucRows.map((r) => (
                  <div key={r.id} style={css(`display:grid; grid-template-columns:${gridCols5}; gap:14px; padding:16px 22px; border-bottom:1px solid #F3F5FA; align-items:center;`)}>
                    <div style={{ minWidth: 0 }}>
                      <div style={css(font(700, 14) + ';color:#0f172a;')}>{r.title}</div>
                      <div style={css('margin-top:4px;' + font(400, 12) + ';color:#94a3b8;')}>{r.meta}</div>
                      {r.hasReason && (
                        <div style={css('margin-top:8px; padding:9px 12px; border-radius:10px; background:#FFECEC;' + font(600, 12, 1.5) + ';color:#B4232A;')}>Lý do từ chối: {r.reason}</div>
                      )}
                    </div>
                    <div style={css(font(600, 12.5) + ';color:#3A4757;')}>{r.author}</div>
                    <div style={css(font(400, 12.5) + ';color:#64748b;')}>{r.category}</div>
                    <div><span style={css(`display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${r.statusBg}; color:${r.statusFg};` + font(700, 11.5) + ';')}>{r.statusLabel}</span></div>
                    <div style={css('display:flex; justify-content:flex-end; gap:7px; flex-wrap:wrap;')}>
                      {r.actions.map((a, i) => (
                        <button key={i} onClick={a.onClick} style={css(`height:32px; padding:0 12px; border:1px solid ${a.border}; border-radius:9px; background:${a.bg}; color:${a.color};` + font(700, 12) + ';cursor:pointer;')}>{a.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {ucRows.length === 0 && (
                  <div style={css('padding:56px 0; text-align:center;' + font(600, 14) + ';color:#94a3b8;')}>Không có use case nào khớp bộ lọc.</div>
                )}
              </div>
            </div>
          )}

          {section === 'questions' && (
            <div>
              <h1 style={css('margin:0;' + font(800, 28) + ';letter-spacing:-.01em;color:#0f172a;')}>Question Management</h1>
              <p style={css('margin:8px 0 0;' + font(400, 14.5) + ';color:#64748b;')}>Câu hỏi publish trực tiếp, không có bước tiền kiểm duyệt. Admin chỉ quản trị sau khi đã đăng.</p>

              <div style={css('display:flex; align-items:center; gap:12px; margin-top:22px;')}>
                <div style={css('flex:1; display:flex; align-items:center; gap:10px; background:#fff; border:1px solid #E6EBF3; border-radius:12px; padding:11px 16px;')}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
                  <input value={qQuery} onChange={(e) => setQQuery(e.target.value)} placeholder="Tìm theo tiêu đề hoặc tác giả..." style={css('flex:1; border:none; outline:none; background:transparent; font-size:14px; color:#0f172a;')} />
                </div>
                <div style={css('display:inline-flex; background:#EDF0FA; border-radius:12px; padding:5px; gap:5px;')}>
                  {qStatusTabs.map((tb) => (
                    <button key={tb.key} onClick={tb.onPick} style={css(`border:none; cursor:pointer; height:36px; padding:0 14px; border-radius:9px;` + font(700, 12.5) + `;background:${tb.bg}; color:${tb.color};`)}>{tb.label}</button>
                  ))}
                </div>
              </div>

              <div style={css('margin-top:16px; background:#fff; border:1px solid #E6EBF3; border-radius:20px; overflow:hidden; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                <div style={css(`display:grid; grid-template-columns:${gridCols6}; gap:14px; padding:14px 22px; background:#F8FAFE; border-bottom:1px solid #EEF1F7;` + font(700, 11.5) + ';letter-spacing:.4px;color:#64748b;')}>
                  <span>QUESTION</span><span>AUTHOR</span><span>CATEGORY</span><span>ANSWERS</span><span>STATUS</span><span style={{ textAlign: 'right' }}>ACTIONS</span>
                </div>
                {qRows.map((r) => (
                  <div key={r.id} style={css(`display:grid; grid-template-columns:${gridCols6}; gap:14px; padding:16px 22px; border-bottom:1px solid #F3F5FA; align-items:center;`)}>
                    <div style={{ minWidth: 0 }}>
                      <div style={css(font(700, 14) + ';color:#0f172a;')}>{r.title}</div>
                      <div style={css('margin-top:4px;' + font(400, 12) + ';color:#94a3b8;')}>{r.meta}</div>
                    </div>
                    <div style={css(font(600, 12.5) + ';color:#3A4757;')}>{r.author}</div>
                    <div style={css(font(400, 12.5) + ';color:#64748b;')}>{r.category}</div>
                    <div style={css(font(800, 14) + ';color:#3A4757;')}>{r.answers}</div>
                    <div><span style={css(`display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${r.statusBg}; color:${r.statusFg};` + font(700, 11.5) + ';')}>{r.statusLabel}</span></div>
                    <div style={css('display:flex; justify-content:flex-end; gap:7px;')}>
                      {r.actions.map((a, i) => (
                        <button key={i} onClick={a.onClick} style={css(`height:32px; padding:0 12px; border:1px solid ${a.border}; border-radius:9px; background:${a.bg}; color:${a.color};` + font(700, 12) + ';cursor:pointer;')}>{a.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {qRows.length === 0 && (
                  <div style={css('padding:56px 0; text-align:center;' + font(600, 14) + ';color:#94a3b8;')}>Không có câu hỏi nào khớp bộ lọc.</div>
                )}
              </div>
            </div>
          )}

          {section === 'taxonomy' && (
            <div>
              <h1 style={css('margin:0;' + font(800, 28) + ';letter-spacing:-.01em;color:#0f172a;')}>Categories &amp; Topics</h1>
              <p style={css('margin:8px 0 0;' + font(400, 14.5) + ';color:#64748b;')}>Category là metadata, không phải điều hướng. Người dùng không tạo được Topic tự do.</p>

              <div style={css('display:grid; grid-template-columns:380px 1fr; gap:20px; margin-top:22px; align-items:start;')}>
                <div style={css('background:#fff; border:1px solid #E6EBF3; border-radius:20px; padding:22px 24px; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                  <h2 style={css('margin:0 0 4px;' + font(800, 16) + ';color:#0f172a;')}>Categories</h2>
                  <p style={css('margin:0 0 16px;' + font(400, 12.5) + ';color:#94a3b8;')}>9 category cố định. Mỗi bài chọn đúng 1.</p>
                  <div style={css('display:flex; flex-direction:column; gap:8px;')}>
                    {categoryRows.map((c) => (
                      <div key={c.label} style={css('display:flex; align-items:center; gap:12px; padding:11px 14px; border:1px solid #EEF1F7; border-radius:12px;')}>
                        <span style={css('flex:none; width:22px;' + font(800, 12) + ';color:#94a3b8;')}>{c.num}</span>
                        <span style={css('flex:1;' + font(700, 13) + ';color:#3A4757;')}>{c.label}</span>
                        <span style={css(font(600, 12) + ';color:#94a3b8;')}>{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={css('background:#fff; border:1px solid #E6EBF3; border-radius:20px; padding:22px 24px; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                  <div>
                    <h2 style={css('margin:0 0 4px;' + font(800, 16) + ';color:#0f172a;')}>Topics</h2>
                    <p style={css('margin:0;' + font(400, 12.5) + ';color:#94a3b8;')}>Deactivate không xóa topic khỏi các bài đã đăng.</p>
                  </div>
                  <div style={css('display:flex; gap:10px; margin-top:16px;')}>
                    <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Tên topic mới..." style={css('flex:1; border:1px solid #E6EBF3; border-radius:11px; padding:11px 14px; font-size:13.5px; color:#0f172a; outline:none; box-sizing:border-box;')} />
                    <button
                      onClick={() => { const n = newTopic.trim(); if (!n) return; setTopics((list) => [...list, { id: 't' + Date.now(), name: n, uc: 0, q: 0, active: true }]); setNewTopic('') }}
                      style={css('height:44px; padding:0 20px; border:none; border-radius:11px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff;' + font(700, 13.5) + ';cursor:pointer;')}
                    >
                      Create
                    </button>
                  </div>
                  <div style={css('margin-top:18px; display:flex; flex-direction:column; gap:8px;')}>
                    {topicRows.map((t) => (
                      <div key={t.id} style={css(`display:flex; align-items:center; gap:12px; padding:12px 14px; border:1px solid #EEF1F7; border-radius:12px; background:${t.rowBg};`)}>
                        {t.editing ? (
                          <input value={t.draft} onChange={t.onDraft} style={css('flex:1; border:1px solid #B9CCF8; border-radius:9px; padding:8px 11px; font-size:13px; color:#0f172a; outline:none;')} />
                        ) : (
                          <span style={css(`flex:1;` + font(700, 13) + `;color:${t.nameColor};`)}>{t.name}</span>
                        )}
                        <span style={css(font(600, 12) + ';color:#94a3b8;')}>{t.usage}</span>
                        <span style={css(`display:inline-flex; align-items:center; height:22px; padding:0 10px; border-radius:999px; background:${t.stateBg}; color:${t.stateFg};` + font(700, 11) + ';')}>{t.stateLabel}</span>
                        {t.actions.map((a, i) => (
                          <button key={i} onClick={a.onClick} style={css(`height:30px; padding:0 12px; border:1px solid ${a.border}; border-radius:9px; background:${a.bg}; color:${a.color};` + font(700, 12) + ';cursor:pointer;')}>{a.label}</button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'users' && (
            <div>
              <h1 style={css('margin:0;' + font(800, 28) + ';letter-spacing:-.01em;color:#0f172a;')}>Users</h1>
              <p style={css('margin:8px 0 0;' + font(400, 14.5) + ';color:#64748b;')}>Danh tính lấy từ Microsoft Entra ID. Chỉ có 2 role: Employee và Admin.</p>

              <div style={css('display:flex; align-items:center; gap:12px; margin-top:22px;')}>
                <div style={css('flex:1; display:flex; align-items:center; gap:10px; background:#fff; border:1px solid #E6EBF3; border-radius:12px; padding:11px 16px;')}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
                  <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Tìm theo tên, email hoặc department..." style={css('flex:1; border:none; outline:none; background:transparent; font-size:14px; color:#0f172a;')} />
                </div>
                <span style={css(font(600, 13) + ';color:#64748b;')}>{userRows.length} users</span>
              </div>

              <div style={css('margin-top:16px; background:#fff; border:1px solid #E6EBF3; border-radius:20px; overflow:hidden; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                <div style={css(`display:grid; grid-template-columns:${gridColsUsers}; gap:14px; padding:14px 22px; background:#F8FAFE; border-bottom:1px solid #EEF1F7;` + font(700, 11.5) + ';letter-spacing:.4px;color:#64748b;')}>
                  <span>NAME</span><span>EMAIL</span><span>DEPARTMENT</span><span>ROLE</span><span>STATUS</span><span>JOINED</span>
                </div>
                {userRows.map((u) => (
                  <div key={u.id} style={css(`display:grid; grid-template-columns:${gridColsUsers}; gap:14px; padding:14px 22px; border-bottom:1px solid #F3F5FA; align-items:center;`)}>
                    <div style={css('display:flex; align-items:center; gap:11px; min-width:0;')}>
                      <span style={css(`flex:none; width:32px; height:32px; border-radius:50%; background:${u.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center;` + font(800, 11.5) + ';')}>{u.initials}</span>
                      <span style={css(font(700, 13.5) + ';color:#0f172a;')}>{u.name}</span>
                    </div>
                    <div style={css(font(400, 12.5) + ';color:#64748b;overflow:hidden;text-overflow:ellipsis;')}>{u.email}</div>
                    <div style={css(font(400, 12.5) + ';color:#64748b;')}>{u.dept}</div>
                    <div>
                      <button onClick={u.onToggleRole} style={css(`height:30px; padding:0 12px; border:1px solid ${u.roleBorder}; border-radius:999px; background:${u.roleBg}; color:${u.roleFg};` + font(700, 12) + ';cursor:pointer;')}>{u.role}</button>
                    </div>
                    <div><span style={css(`display:inline-flex; align-items:center; gap:6px;` + font(700, 12) + `;color:${u.statusFg};`)}><span style={css(`width:7px; height:7px; border-radius:50%; background:${u.statusFg};`)}></span>{u.status}</span></div>
                    <div style={css(font(400, 12.5) + ';color:#94a3b8;')}>{u.joined}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'settings' && (
            <div>
              <h1 style={css('margin:0;' + font(800, 28) + ';letter-spacing:-.01em;color:#0f172a;')}>Settings</h1>
              <p style={css('margin:8px 0 0;' + font(400, 14.5) + ';color:#64748b;')}>Chỉ giữ những cấu hình thật sự cần Admin kiểm soát.</p>
              <div style={css('margin-top:22px; max-width:760px; display:flex; flex-direction:column; gap:12px;')}>
                {settingsList.map((s) => (
                  <div key={s.key} style={css('display:flex; align-items:center; gap:18px; background:#fff; border:1px solid #E6EBF3; border-radius:16px; padding:20px 22px; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                    <div style={{ flex: 1 }}>
                      <div style={css(font(800, 14.5) + ';color:#0f172a;')}>{s.label}</div>
                      <div style={css('margin-top:5px;' + font(400, 13, 1.55) + ';color:#64748b;')}>{s.desc}</div>
                    </div>
                    <button onClick={s.onToggle} style={css(`flex:none; width:54px; height:30px; border-radius:999px; border:none; background:${s.trackBg}; cursor:pointer; padding:3px; display:flex; justify-content:${s.knobPos};`)}>
                      <span style={css('width:24px; height:24px; border-radius:50%; background:#fff; box-shadow:0 2px 6px rgba(15,23,42,.25);')}></span>
                    </button>
                  </div>
                ))}
                <div style={css('display:flex; align-items:center; gap:12px; background:#F8FAFE; border:1px solid #E6EBF3; border-radius:16px; padding:18px 22px;')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v5"></path><path d="M12 16h.01"></path></svg>
                  <span style={css(font(600, 13, 1.55) + ';color:#64748b;')}>Teams notification phụ thuộc cấu hình Microsoft Graph của tenant. Thông báo trong sản phẩm luôn hoạt động độc lập với Teams.</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {rejectTarget && (
        <div style={css('position:fixed; inset:0; z-index:900; background:rgba(6,14,40,.55); display:flex; align-items:center; justify-content:center; padding:40px;')}>
          <div style={css('width:520px; background:#fff; border-radius:22px; padding:28px 30px; box-shadow:0 40px 90px rgba(6,14,40,.5);')}>
            <div style={css(font(800, 19) + ';color:#0f172a;')}>Reject use case</div>
            <div style={css('margin-top:8px;' + font(400, 13.5, 1.6) + ';color:#64748b;')}>{rejectTarget.title} · {rejectTarget.author}</div>
            <div style={css('margin-top:20px;' + font(800, 13) + ';color:#0f172a;')}>Lý do từ chối <span style={{ color: '#E0353F' }}>*</span></div>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} placeholder="Nêu rõ điểm cần bổ sung để tác giả có thể sửa và gửi lại..." style={css('width:100%; margin-top:10px; border:1px solid #E6EBF3; border-radius:12px; padding:12px 14px; font-size:14px; line-height:1.6; color:#0f172a; outline:none; resize:vertical; display:block; box-sizing:border-box;')}></textarea>
            <div style={css('display:flex; justify-content:flex-end; gap:12px; margin-top:20px;')}>
              <button onClick={() => { setRejectId(null); setRejectReason('') }} style={css('height:44px; padding:0 20px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757;' + font(700, 13.5) + ';cursor:pointer;')}>Cancel</button>
              <button
                onClick={() => { const reason = rejectReason.trim(); if (!reason || !rejectId) return; patchUc(rejectId, (x) => ({ ...x, status: 'rejected', reason })); setRejectId(null); setRejectReason('') }}
                style={css(`height:44px; padding:0 22px; border:none; border-radius:999px; background:#D8232A; color:#fff;` + font(700, 13.5) + `;cursor:pointer;opacity:${rejectReason.trim() ? 1 : 0.5};`)}
              >
                Reject with reason
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
