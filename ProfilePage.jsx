import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { css } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import TopNav from '../components/TopNav.jsx'

const MY_QUESTIONS = [
  { title: 'Làm sao để dùng Claude tóm tắt file PDF dài hơn 50 trang?', desc: 'Cần tóm tắt hợp đồng dài mà không bị cắt nội dung ở giữa.', category: 'Research & Knowledge', resolved: false, answers: 2, time: '3 giờ trước' },
  { title: 'Nên lưu prompt dùng nhiều lần ở đâu để cả team dùng chung?', desc: 'Team đang copy prompt qua chat, khó theo dõi phiên bản nào đang dùng.', category: 'Productivity & Personal Work', resolved: true, answers: 4, time: '2 tuần trước' },
]
const MY_USE_CASES = [
  { title: 'Tóm tắt phản hồi khách hàng theo tuần', desc: 'Tổng hợp phản hồi từ khảo sát và ticket CSKH thành báo cáo insight ngắn gọn mỗi tuần.', category: 'Data & Analysis', status: 'published', helpful: 24, time: '2 tuần trước', reason: '' },
  { title: 'Tự động hoá check-in đơn hàng lỗi', desc: 'Phát hiện đơn hàng lỗi từ log hệ thống và tạo báo cáo gửi team vận hành mỗi sáng.', category: 'Automation & Workflow', status: 'pending', helpful: 0, time: '4 ngày trước', reason: '' },
  { title: 'Auto QA script cho pipeline dữ liệu', desc: 'Sinh script kiểm thử cho pipeline dữ liệu nội bộ.', category: 'Coding & Technical', status: 'rejected', helpful: 0, time: '1 tuần trước', reason: 'Thiếu phần Prompt/Workflow và chưa nêu rõ dữ liệu đầu vào có chứa thông tin khách hàng hay không.' },
]
const ANSWERS_GIVEN = 7

const UCS = {
  published: { label: 'Published', bg: '#E7F9F0', color: '#00893F' },
  pending: { label: 'Pending Review', bg: '#FFF1E0', color: '#B45300' },
  draft: { label: 'Draft', bg: '#EDF0FA', color: '#3A4757' },
  rejected: { label: 'Rejected', bg: '#FFECEC', color: '#D8232A' },
}

const SAVED_USE_CASES = [
  {
    title: 'Bộ agent dùng chung cho Claude Code, Cursor và Codex, giúp cả team làm việc với AI theo một chuẩn',
    desc: 'Cài một lần là cả team có cùng bộ trợ lý AI, cùng bộ lệnh và cùng tiêu chuẩn kỹ thuật, thay vì mỗi người tự dựng một kiểu.',
    author: 'NamNTH', team: 'Utility Solutions', category: 'Coding & Technical',
    tools: ['Claude', 'Cursor', 'Codex'], kindLabel: 'BY TECH', statusLabel: 'In use', statusColor: '#00CF6A', id: 'c2',
  },
  {
    title: 'Để AI agent tự viết và đăng bài trên website, giảm chi phí thuê Agency',
    desc: 'Bộ kết nối cho trợ lý AI tự viết và đăng bài tin tức lên website, giữ văn phong giống người viết.',
    author: 'LuanNA', team: 'CMS · Website', category: 'Content & Communication',
    tools: ['Claude', 'GPT'], kindLabel: 'BY TECH', statusLabel: 'In use', statusColor: '#00CF6A', id: 'c5',
  },
].map((c) => ({ ...c, initial: c.author.charAt(0), toolsR: c.tools.map((t) => ({ name: t })) }))

const SAVED_QUESTIONS = [
  { title: 'Prompt nào hiệu quả để sinh mô tả sản phẩm bằng tiếng Việt?', author: 'QuyenNT', team: 'Marketing', resolved: true, answers: 2 },
  { title: 'Có cách nào tự động phân loại ticket CSKH theo chủ đề?', author: 'TrucVN', team: 'Customer Support', resolved: false, answers: 0 },
].map((q) => ({ ...q, statusLabel: q.resolved ? 'Resolved' : 'Waiting for answers', statusBg: q.resolved ? '#E7F9F0' : '#FFF1E0', statusColor: q.resolved ? '#00893F' : '#B45300' }))

const NOTIF_DEFS = [
  { text: 'HaiPD đã trả lời câu hỏi của bạn về tóm tắt PDF dài', href: '/questions', time: '2 giờ trước', unread: true, iconText: 'A', iconBg: '#E7ECFB', iconFg: '#2c5fff' },
  { text: 'QuyenNT đã mention bạn trong một bình luận', href: '/questions', time: '1 giờ trước', unread: true, iconText: '@', iconBg: '#F1E7FF', iconFg: '#6F0CE2', hasTeams: true, teamsLabel: 'Đã gửi qua Teams', teamsBg: '#E7F9F0', teamsFg: '#00893F' },
  { text: 'Use case "Tóm tắt phản hồi khách hàng theo tuần" đã được duyệt', href: '/use-cases', time: 'Hôm qua', unread: true, iconText: '✓', iconBg: '#E7F9F0', iconFg: '#00893F' },
  { text: 'Use case "Auto QA script" bị từ chối — xem lý do trong My Posts', href: '/profile#posts', time: '2 ngày trước', unread: false, iconText: '!', iconBg: '#FFECEC', iconFg: '#D8232A' },
]

const posts = []
  .concat(MY_QUESTIONS.map((q) => ({
    kind: 'Question', kindBg: '#E7ECFB', kindColor: '#2c5fff', type: 'question',
    title: q.title, desc: q.desc, category: q.category, time: q.time,
    statusLabel: q.resolved ? 'Resolved' : 'Waiting for answers',
    statusBg: q.resolved ? '#E7F9F0' : '#FFF1E0', statusColor: q.resolved ? '#00893F' : '#B45300',
    metric: q.answers + ' answers', href: '/questions', cta: 'Xem thread', hasReason: false, reason: '',
  })))
  .concat(MY_USE_CASES.map((c) => {
    const st = UCS[c.status]
    return {
      kind: 'Use Case', kindBg: '#E7F9F0', kindColor: '#00893F', type: 'usecase',
      title: c.title, desc: c.desc, category: c.category, time: c.time,
      statusLabel: st.label, statusBg: st.bg, statusColor: st.color,
      metric: c.status === 'published' ? c.helpful + ' Helpful' : 'Chưa publish',
      href: c.status === 'rejected' || c.status === 'draft' ? '/use-cases?share=1' : '/use-cases',
      cta: c.status === 'rejected' ? 'Sửa & gửi lại' : c.status === 'draft' ? 'Tiếp tục điền' : 'Xem use case',
      hasReason: c.status === 'rejected', reason: c.reason,
    }
  }))

const recent = posts.slice(0, 4).map((p) => ({ kind: p.kind, tagBg: p.kindBg, tagColor: p.kindColor, title: p.title, meta: p.category + ' · ' + p.time, statusLabel: p.statusLabel, statusBg: p.statusBg, statusColor: p.statusColor }))

export default function ProfilePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [postFilter, setPostFilter] = useState('all')
  const [readAll, setReadAll] = useState(false)

  const mkTab = (k) => ({ bg: tab === k ? '#3366F0' : 'transparent', color: tab === k ? '#FFFFFF' : '#dbe6ff' })
  const tabs = [['overview', 'Overview'], ['posts', t('My Posts') === 'My Posts' ? 'My Posts' : 'My Posts'], ['saved', t('Đã lưu')]].map(([k, label]) => ({ key: k, label, ...mkTab(k), onPick: () => setTab(k) }))
  const postFilters = [['all', t('Tất cả')], ['question', t('Câu hỏi')], ['usecase', t('Use Case')]].map(([k, label]) => {
    const on = postFilter === k
    return { key: k, label, bg: on ? '#E7ECFB' : '#fff', border: on ? '#B9CCF8' : '#DDE3EC', color: on ? '#2c5fff' : '#3A4757', onPick: () => setPostFilter(k) }
  })
  const filtered = postFilter === 'all' ? posts : posts.filter((p) => p.type === postFilter)

  const notifications = NOTIF_DEFS.map((n) => ({ ...n, unread: n.unread && !readAll }))

  const stats = [
    { value: posts.length, label: 'Posts', color: '#2c5fff' },
    { value: MY_QUESTIONS.length, label: 'Questions', color: '#0F172A' },
    { value: MY_USE_CASES.length, label: 'Use Cases', color: '#0F172A' },
    { value: ANSWERS_GIVEN, label: 'Answers', color: '#00A352' },
  ]

  return (
    <div style={css('position:relative; width:100%; margin:0 auto; background:#04060d; color:#e8eefc;')}>
      <div style={css('position:absolute; top:-260px; left:-8%; width:900px; height:900px; border-radius:50%; background:radial-gradient(circle,rgba(58,120,255,.34),rgba(58,120,255,0) 66%); filter:blur(60px); pointer-events:none; z-index:0;')}></div>
      <div style={css('position:absolute; top:-160px; right:-10%; width:820px; height:820px; border-radius:50%; background:radial-gradient(circle,rgba(0,140,255,.22),rgba(0,140,255,0) 66%); filter:blur(60px); pointer-events:none; z-index:0;')}></div>
      <div style={css('position:absolute; top:900px; left:22%; width:1000px; height:1100px; border-radius:50%; background:radial-gradient(circle,rgba(44,95,255,.16),rgba(44,95,255,0) 68%); filter:blur(80px); pointer-events:none; z-index:0;')}></div>

      <div style={css('position:relative; z-index:400; background:linear-gradient(180deg,#0c1533 0%,#070b1c 100%);')}>
        <TopNav notifications={notifications} />
      </div>

      <section style={css('position:relative; z-index:1; padding:48px 40px 0;')}>
        <div style={css('max-width:1000px; margin:0 auto; display:flex; align-items:center; gap:26px; flex-wrap:wrap;')}>
          <div style={css('width:84px; height:84px; flex:none; border-radius:50%; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font:800 28px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>NT</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={css('margin:0; font:900 26px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#ffffff;')}>Nguyễn Thảo</h1>
            <p style={css('margin:6px 0 0; font:400 15px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#c3d0f5;')}>Product Ops · nguyen.thao@zalopay.vn</p>
            <div style={css('display:inline-flex; align-items:center; gap:8px; margin-top:10px; height:26px; padding:0 12px; border-radius:999px; background:#E7ECFB; color:#2c5fff; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{t('Đăng nhập bằng Microsoft 365')}</div>
          </div>
        </div>

        <div style={css('max-width:1000px; margin:26px auto 0; display:grid; grid-template-columns:repeat(4,1fr); gap:14px;')}>
          {stats.map((s) => (
            <div key={s.label} style={css('background:#fff; border:1px solid #E6EBF3; border-radius:16px; padding:18px 20px; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
              <div style={css(`font:900 26px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:${s.color};`)}>{s.value}</div>
              <div style={css('margin-top:5px; font:600 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={css('max-width:1000px; margin:28px auto 0; display:flex; align-items:center; gap:14px;')}>
          <div style={css('display:inline-flex; background:rgba(255,255,255,.08); border-radius:16px; padding:7px; gap:6px;')}>
            {tabs.map((tb) => (
              <button key={tb.key} onClick={tb.onPick} style={css(`border:none; cursor:pointer; height:44px; padding:0 20px; border-radius:12px; font:700 15px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; background:${tb.bg}; color:${tb.color};`)}>{tb.label}</button>
            ))}
          </div>
          <div style={css('margin-left:auto; display:flex; gap:10px;')}>
            <button onClick={() => navigate('/questions')} style={css('display:inline-flex; align-items:center; gap:8px; height:44px; padding:0 18px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;')}>{t('Đặt câu hỏi')}</button>
            <button onClick={() => navigate('/use-cases?share=1')} style={css('display:inline-flex; align-items:center; gap:8px; height:44px; padding:0 20px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; box-shadow:0 12px 26px rgba(44,95,255,.34); cursor:pointer;')}>{t('Chia sẻ Use Case')}</button>
          </div>
        </div>
      </section>

      {tab === 'overview' && (
        <section style={css('position:relative; z-index:1; padding:26px 40px 90px;')}>
          <div style={css('max-width:1000px; margin:0 auto;')}>
            <h3 style={css('margin:0 0 14px; font:800 17px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#ffffff;')}>{t('Hoạt động gần đây')}</h3>
            <div style={css('display:flex; flex-direction:column; gap:12px;')}>
              {recent.map((r, i) => (
                <div key={i} style={css('background:#fff; border:1px solid #E6EBF3; border-radius:16px; padding:18px 22px; display:flex; align-items:center; gap:16px; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
                  <span style={css(`flex:none; display:inline-flex; align-items:center; height:26px; padding:0 12px; border-radius:999px; background:${r.tagBg}; color:${r.tagColor}; font:700 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{r.kind}</span>
                  <div style={css('flex:1; min-width:0;')}>
                    <div style={css('font:700 15px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{r.title}</div>
                    <div style={css('margin-top:3px; font:400 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{r.meta}</div>
                  </div>
                  <span style={css(`flex:none; display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${r.statusBg}; color:${r.statusColor}; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{r.statusLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === 'posts' && (
        <section style={css('position:relative; z-index:1; padding:26px 40px 90px;')}>
          <div style={css('max-width:1000px; margin:0 auto;')}>
            <div style={css('display:flex; align-items:center; gap:8px; margin-bottom:16px;')}>
              {postFilters.map((f) => (
                <button key={f.key} onClick={f.onPick} style={css(`height:34px; padding:0 15px; border:1px solid ${f.border}; border-radius:999px; background:${f.bg}; color:${f.color}; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;`)}>{f.label}</button>
              ))}
              <span style={css('margin-left:auto; font:600 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#c3d0f5;')}>{filtered.length} posts</span>
            </div>
            <div style={css('display:flex; flex-direction:column; gap:14px;')}>
              {filtered.map((p, i) => (
                <div key={i} style={css('background:#fff; border:1px solid #E6EBF3; border-radius:16px; padding:20px 22px; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
                  <div style={css('display:flex; align-items:center; gap:9px; flex-wrap:wrap;')}>
                    <span style={css(`display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${p.kindBg}; color:${p.kindColor}; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{p.kind}</span>
                    <span style={css(`display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${p.statusBg}; color:${p.statusColor}; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{p.statusLabel}</span>
                    <span style={css('display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:#EDF0FA; color:#3A4757; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{p.category}</span>
                    <span style={css('margin-left:auto; font:400 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{p.time}</span>
                  </div>
                  <h4 style={css('margin:12px 0 0; font:800 16.5px/1.35 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{p.title}</h4>
                  <p style={css('margin:8px 0 0; font:400 13.5px/1.55 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#5B6675;')}>{p.desc}</p>
                  {p.hasReason && (
                    <div style={css('margin-top:12px; padding:12px 14px; border-radius:12px; background:#FFECEC; font:600 12.5px/1.55 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#B4232A;')}>Admin từ chối: {p.reason}</div>
                  )}
                  <div style={css('display:flex; align-items:center; gap:14px; margin-top:14px; font:600 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>
                    <span>{p.metric}</span>
                    <button onClick={() => navigate(p.href)} style={css('margin-left:auto; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3366F0; background:none; border:none; cursor:pointer; padding:0;')}>{p.cta}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === 'saved' && (
        <section style={css('position:relative; z-index:1; padding:26px 40px 90px;')}>
          <div style={css('max-width:1000px; margin:0 auto;')}>
            <h3 style={css('margin:0 0 14px; font:800 17px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#ffffff;')}>{t('Use Cases đã lưu')}</h3>
            <div style={css('display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-bottom:32px;')}>
              {SAVED_USE_CASES.map((c) => (
                <div key={c.id} style={css('display:flex; flex-direction:column; background:#fff; border:1px solid #E6EBF3; border-radius:18px; overflow:hidden; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
                  <div style={css('position:relative; height:132px; background:linear-gradient(160deg,#e9eef7,#dde6f2); display:flex; align-items:center; justify-content:center;')}>
                    <span style={css('font:600 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#9fb0c8;')}>ảnh use case</span>
                    <span style={css('position:absolute; top:12px; left:12px; display:inline-flex; align-items:center; gap:7px; height:26px; padding:0 11px; border-radius:999px; background:rgba(255,255,255,.94); font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>
                      <span style={css(`width:7px; height:7px; border-radius:50%; background:${c.statusColor};`)}></span>{c.statusLabel}
                    </span>
                    <span style={css('position:absolute; bottom:12px; left:12px; display:inline-flex; align-items:center; height:26px; padding:0 11px; border-radius:999px; background:rgba(15,23,42,.72); color:#fff; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{c.kindLabel}</span>
                  </div>
                  <div style={css('display:flex; flex-direction:column; flex:1; padding:16px 20px 18px;')}>
                    <span style={css('align-self:flex-start; display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:#EDF0FA; color:#3A4757; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{c.category}</span>
                    <h4 style={css('margin:10px 0 0; font:800 16px/1.32 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A; text-wrap:pretty;')}>{c.title}</h4>
                    <p style={css('margin:8px 0 0; font:400 13.5px/1.55 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#5B6675; text-wrap:pretty;')}>{c.desc}</p>
                    <div style={{ flex: 1, minHeight: 12 }}></div>
                    <div style={css('display:flex; align-items:center; gap:9px; margin-top:14px;')}>
                      <span style={css('width:26px; height:26px; border-radius:50%; background:#2c5fff; color:#fff; display:flex; align-items:center; justify-content:center; font:700 11px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{c.initial}</span>
                      <span style={css('font:700 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{c.author}</span>
                      <span style={css('font:400 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>· {c.team}</span>
                    </div>
                    <div style={css('display:flex; flex-wrap:wrap; gap:7px; margin-top:12px;')}>
                      {c.toolsR.map((tl) => (
                        <span key={tl.name} style={css('display:inline-flex; align-items:center; height:28px; padding:0 12px; border:1px solid #E6EBF3; border-radius:9px; font:700 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757;')}>{tl.name}</span>
                      ))}
                    </div>
                    <button onClick={() => navigate(`/use-cases/${c.id}`)} style={css('display:inline-flex; align-items:center; justify-content:center; gap:8px; height:42px; margin-top:16px; border-radius:12px; background:linear-gradient(120deg,#0033C9,#2c5fff); color:#fff; font:700 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; text-decoration:none; border:none; cursor:pointer;')}>
                      {t('Xem Use Case')}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <h3 style={css('margin:0 0 14px; font:800 17px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#ffffff;')}>{t('Questions đã lưu')}</h3>
            <div style={css('display:flex; flex-direction:column; gap:12px;')}>
              {SAVED_QUESTIONS.map((q, i) => (
                <div key={i} style={css('background:#fff; border:1px solid #E6EBF3; border-radius:16px; padding:18px 22px; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
                  <div style={css('display:flex; align-items:center; gap:9px;')}>
                    <span style={css(`display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${q.statusBg}; color:${q.statusColor}; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{q.statusLabel}</span>
                    <span style={css('margin-left:auto; font:400 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{q.answers} answers</span>
                  </div>
                  <h4 style={css('margin:10px 0 0; font:800 16px/1.35 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{q.title}</h4>
                  <div style={css('margin-top:10px; font:400 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{q.author} · {q.team}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
