import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { api, relativeTime } from '../lib/api.js'
import Layout from '../components/Layout.jsx'
import ImageSlot from '../components/ImageSlot.jsx'
import { allCases, prdMeta, avatarColor } from '../data/useCases.js'
import { usePublishedUseCases } from '../lib/publishedUseCases.js'
import SpaceBackdrop from '../components/SpaceBackdrop.jsx'
import CardActions from '../components/CardActions.jsx'
import TagRow from '../components/TagRow.jsx'
import { useNotifications, markNotificationsRead } from '../lib/notifications.js'
import { NOTIF_ICONS } from '../components/notifIcons.jsx'
import { QUESTION_DRAFT_KEY } from './QuestionsPage.jsx'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'

// Review-status meta for the "Use case của tôi" board columns, always rendered in this order.
// 'draft' has no backend equivalent yet (api.listSubmissions only returns approved/pending/rejected),
// so that column is always empty — it still renders per the design spec.
const UC_STATUS = {
  draft: { label: 'Đang nháp', bg: '#EDF0FA', color: '#3A4757', accent: '#94a3b8' },
  pending: { label: 'Chờ duyệt', bg: '#FFF1E0', color: '#B45300', accent: '#FF8D00' },
  changes_requested: { label: 'Cần chỉnh sửa', bg: '#FFF4E3', color: '#9A5B00', accent: '#F5A524' },
  rejected: { label: 'Bị từ chối', bg: '#FFECEC', color: '#D8232A', accent: '#E0353F' },
  approved: { label: 'Đã đăng', bg: '#E7F9F0', color: '#00893F', accent: '#00CF6A' },
}
const UC_ORDER = ['draft', 'pending', 'changes_requested', 'rejected', 'approved']

// Same bright gradient/glow text treatment as the Use Case Library hero title.
const GRAD_TEXT = 'background:linear-gradient(180deg,#ffffff 0%,#cfe3ff 46%,#4f93ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 6px 40px rgba(26,95,255,.85)) drop-shadow(0 0 16px rgba(90,150,255,.6));'
const GRAD_TEXT_SM = 'background:linear-gradient(180deg,#ffffff 0%,#cfe3ff 46%,#4f93ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 3px 14px rgba(26,95,255,.6)) drop-shadow(0 0 6px rgba(90,150,255,.4));'
const heroHeading = css(`margin:0; font:800 34px/1.15 ${FONT}; letter-spacing:-.01em; ${GRAD_TEXT}`)
// Smaller inline sub-headings (the two lists within "Đã lưu") — same gradient treatment,
// scaled-down glow so it doesn't wash out the white empty-state box right below it.
const subHeading = css(`margin:0 0 20px; font:800 26px/1.2 ${FONT}; ${GRAD_TEXT_SM}`)

/** Compact "post" card shared by every column of the Use case board. */
function BoardCard({ p }) {
  return (
    <div style={css('background:#fff; border:1px solid #E6EBF3; border-radius:16px; padding:18px 22px; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
      <div style={css('display:flex; align-items:center; gap:8px; flex-wrap:wrap;')}>
        <span style={css(`flex:none; white-space:nowrap; display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${p.statusBg}; color:${p.statusColor}; font:700 11.5px ${FONT};`)}>{p.statusLabel}</span>
        <span style={css(`margin-left:auto; margin-right:4px; font:400 12.5px ${FONT}; color:#94a3b8;`)}>{p.time}</span>
        <span style={css(`flex:none; white-space:nowrap; display:inline-flex; align-items:center; gap:6px; height:24px; padding:0 11px 0 9px; border-radius:999px; background:#E7F9F0; color:#00893F; font:800 11.5px ${FONT};`)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
          {p.kindLabel}
        </span>
      </div>
      <h4 style={css(`margin:12px 0 0; font:800 16.5px/1.35 ${FONT}; color:#0F172A; text-wrap:pretty;`)}>{p.title}</h4>
      <p style={css(`margin:8px 0 0; font:400 13.5px/1.55 ${FONT}; color:#5B6675;`)}>{p.desc}</p>
      {p.hasReason && (
        <div style={css(`margin-top:12px; padding:12px 14px; border-radius:12px; background:${p.reasonBg || '#FFECEC'}; font:600 12.5px/1.55 ${FONT}; color:${p.reasonColor || '#B4232A'}; white-space:pre-wrap;`)}>{p.reasonPrefix}: {p.reason}</div>
      )}
      <div style={css(`display:flex; align-items:center; gap:14px; margin-top:14px; padding-top:12px; border-top:1px solid #EEF1F7; font:600 12.5px ${FONT}; color:#64748b;`)}>
        <span>{p.metric}</span>
        <button onClick={p.onOpen} style={css(`margin-left:auto; border:none; background:none; padding:0; cursor:pointer; font:700 12.5px ${FONT}; color:#3366F0;`)}>{p.cta}</button>
      </div>
    </div>
  )
}

/** Rich question card (Questions-page pattern) — reused for "Câu hỏi của tôi" and saved questions. */
function QuestionCard({ q }) {
  const { t } = useI18n()
  return (
    <div
      onClick={q.onOpen}
      className={'zp-card ' + hoverClass('transform:translateY(-3px); box-shadow:0 22px 48px rgba(0,0,0,.36); border-color:#CFE0FF;')}
      style={css('position:relative; background:#ffffff; border:1px solid #E6EBF3; border-radius:20px; cursor:pointer; box-shadow:0 14px 36px rgba(0,0,0,.28); transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;')}
    >
      <div style={css('display:flex; align-items:center; gap:7px; padding:12px 16px 0; flex-wrap:wrap;')}>
        <span style={css(`display:inline-flex; align-items:center; gap:6px; height:23px; padding:0 10px 0 9px; border-radius:999px; background:#F1E7FF; color:#6F0CE2; font:800 11.5px ${FONT};`)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9.1 9a3 3 0 1 1 4.5 2.6c-.9.5-1.6 1.2-1.6 2.4"></path><path d="M12 18h.01"></path><circle cx="12" cy="12" r="9.5"></circle></svg>
          {t('Câu hỏi')}
        </span>
        <span style={css(`margin-left:auto; display:inline-flex; align-items:center; height:23px; padding:0 10px; border-radius:999px; background:${q.statusBg}; color:${q.statusColor}; font:700 11.5px ${FONT};`)}>{q.statusLabel}</span>
      </div>
      <div style={css('display:flex; align-items:center; gap:10px; padding:8px 16px 0;')}>
        <span style={css(`flex:none; width:28px; height:28px; border-radius:50%; background:${q.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px ${FONT};`)}>{q.initials}</span>
        <div style={css('flex:1; min-width:0; display:flex; align-items:center; gap:8px;')}>
          <span style={css(`font:600 12.5px ${FONT}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{q.author}</span>
          <span style={css(`font:400 12.5px ${FONT}; color:#94a3b8; white-space:nowrap;`)}>· {q.time}</span>
        </div>
      </div>
      <div style={css('padding:6px 16px 0;')}>
        {q.hasTitle !== false && <h3 className="zp-card-title" style={css(`margin:0; font:800 16px/1.35 ${FONT}; color:#0F172A; text-wrap:pretty;`)}>{q.title}</h3>}
        <p style={css(`margin:5px 0 0; font:400 13.5px/1.55 ${FONT}; color:#3A4757; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;`)}>{q.body}</p>
      </div>
      <div style={css('display:flex; align-items:center; gap:8px 12px; flex-wrap:wrap; margin:10px 16px 0; padding:9px 0 11px; border-top:1px solid #EEF1F7;')}>
        <TagRow topics={q.topics} tools={q.tools} />
        {q.accepted && (
          <span style={css(`display:inline-flex; align-items:center; gap:7px; font:700 12.5px ${FONT}; color:#00893F;`)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00893F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
            {t('Đã có câu trả lời được chấp nhận')}
          </span>
        )}
        <CardActions compact helpful={q.helpful} helped={q.helped} onHelpful={q.onHelpful} replies={q.answers} onReply={q.onOpen} />
      </div>
    </div>
  )
}

/** Compact use case preview — same card as Home "Use case nổi bật" and the Use Case Library grid. */
function UseCaseCard({ c }) {
  const { t } = useI18n()
  return (
    <div
      onClick={c.onOpen}
      className={'zp-card ' + hoverClass('transform:translateY(-3px); box-shadow:0 18px 40px rgba(0,0,0,.28); border-color:#CFE0FF;')}
      style={css('position:relative; border:1px solid #E6EBF3; border-radius:18px; background:#ffffff; cursor:pointer; padding:16px; box-shadow:0 10px 26px rgba(0,0,0,.16); transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;')}
    >
      <div style={css('display:flex; align-items:center; gap:9px; margin-bottom:12px; min-width:0;')}>
        <span style={css(`flex:none; width:34px; height:34px; border-radius:50%; background:${c.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px ${FONT};`)}>{c.initial}</span>
        <div style={css('display:flex; flex-direction:column; min-width:0;')}>
          <span style={css(`font:600 12.5px ${FONT}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{c.author}</span>
        </div>
      </div>
      <div style={css('display:flex; gap:13px;')}>
        <div onClick={(e) => e.stopPropagation()} style={css('position:relative; flex:none; width:88px; height:88px; border-radius:13px; overflow:hidden; background:linear-gradient(160deg,#e9eef7,#dde6f2);')}>
          <ImageSlot id={'lib-' + c.id} shape="rect" placeholder="ảnh" />
        </div>
        <div style={css('flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center;')}>
          <h3 className="zp-card-title" style={css(`margin:0; font:800 16px/1.35 ${FONT}; color:#0F172A; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;`)}>{c.title}</h3>
          <p style={css('margin:5px 0 0; font-size:13.5px; line-height:1.55; color:#3A4757; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;')}>{c.desc}</p>
        </div>
      </div>
      <TagRow topics={c.topics} tools={c.toolsR.map((x) => x.name)} style={{ marginTop: 12 }} />
      <div style={css('display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:14px; padding-top:12px; border-top:1px solid #EEF1F7;')}>
        <button onClick={(e) => { e.stopPropagation(); c.onOpen() }} className={hoverClass('gap:9px;')} style={css(`flex:none; display:inline-flex; align-items:center; gap:6px; border:none; background:transparent; padding:0; cursor:pointer; font:800 13px ${FONT}; color:#2c5fff; transition:gap .16s;`)}>
          {t('Xem Use Case')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
        </button>
        <CardActions helpful={c.helpful} helped={c.helped} onHelpful={c.onHelpful} replies={c.comments} onReply={c.onOpenComments} />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { t } = useI18n()
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  usePublishedUseCases() // approved submissions appear in "Đã lưu" too
  const location = useLocation()

  // Section is driven by the Sidebar's "Của tôi" sub-links (/profile#usecase|#question|#saved).
  // react-router's useLocation() re-renders on hash-only navigation within the same route, but we
  // also listen for the native `hashchange` event as a fallback, per the known SPA gotcha.
  const [hash, setHash] = useState(location.hash)
  const [showAllNotif, setShowAllNotif] = useState(false)
  useEffect(() => { setHash(location.hash) }, [location.hash])
  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const notif = useNotifications(!!user)
  const section = /#(activity|usecase|question|saved)\b/.exec(hash || '')?.[1] || 'activity'

  const [myQuestions, setMyQuestions] = useState([])
  const [savedQuestions, setSavedQuestions] = useState([])
  const [answersGiven, setAnswersGiven] = useState(0)
  const [myUseCases, setMyUseCases] = useState([])
  const [savedUseCaseIds, setSavedUseCaseIds] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [ucMeta, setUcMeta] = useState({})
  const refreshUcMeta = (ucId) => api.useCaseMeta(ucId).then((d) => setUcMeta((m) => ({ ...m, [ucId]: d }))).catch(() => {})
  useEffect(() => { savedUseCaseIds.forEach(refreshUcMeta) }, [savedUseCaseIds])

  useEffect(() => {
    if (!user) { setLoaded(true); return }
    Promise.all([
      api.listQuestions(),
      api.listSubmissions('?mine=1'),
      api.mySavedUseCaseIds(),
    ]).then(([qd, sd, savedIds]) => {
      const mine = qd.questions.filter((q) => q.authorId === user.id)
      setMyQuestions(mine)
      setSavedQuestions(qd.questions.filter((q) => q.saved))
      let answered = 0
      qd.questions.forEach((q) => q.answers.forEach((a) => { if (a.authorId === user.id) answered++ }))
      setAnswersGiven(answered)
      setMyUseCases(sd.submissions)
      setSavedUseCaseIds(savedIds.ids)
    }).finally(() => setLoaded(true))
  }, [user])

  if (!user) {
    return (
      <Layout active="profile">
        <div style={css('display:flex; align-items:center; justify-content:center; padding:120px 24px;')}>
          <div style={css(`font:700 18px ${FONT}; color:#fff;`)}>{t('Bạn cần đăng nhập để xem hồ sơ.')}</div>
        </div>
      </Layout>
    )
  }

  // ---- shared card mappers ----
  const mapQuestion = (q) => ({
    id: q.id,
    initials: q.initials,
    avatarBg: avatarColor(q.author),
    author: q.author,
    team: q.team,
    time: relativeTime(q.time),
    title: q.title,
    hasTitle: q.hasTitle,
    body: q.body,
    tagLabel: t('Câu hỏi'),
    statusLabel: q.resolved ? 'Đã trả lời' : t('Đang chờ trả lời'),
    statusBg: q.resolved ? '#E7F9F0' : '#FFF1E0',
    statusColor: q.resolved ? '#00893F' : '#B45300',
    topics: q.topics || [], tools: q.tools || [],
    accepted: q.answers.some((a) => a.accepted),
    helpful: q.answers.reduce((n, a) => n + (a.helpful || 0), 0) + (q.qHelpful || 0),
    helped: !!q.iHelpedQ,
    onHelpful: () => api.reactQuestion(q.id).then((d) => {
      const swap = (list) => list.map((x) => (x.id === q.id ? d.question : x))
      setMyQuestions(swap); setSavedQuestions(swap)
    }).catch(() => {}),
    answers: q.answers.length,
    onOpen: () => navigate(`/questions#q=${encodeURIComponent(q.id)}`),
  })
  const myQuestionCards = myQuestions.map(mapQuestion)
  const savedQuestionCards = savedQuestions.map(mapQuestion)

  // ---- use case board (status columns, always in this order) ----
  const ucCta = (c) => ({ changes_requested: t('Chỉnh sửa & gửi lại'), rejected: t('Gửi use case mới'), draft: t('Tiếp tục'), approved: t('Xem trong Thư viện') })[c.reviewStatus] || t('Xem use case')
  const ucHref = (c) => ({ changes_requested: `/use-cases?edit=${encodeURIComponent(c.id)}`, rejected: '/use-cases?share=1', draft: '/use-cases?share=1', approved: `/use-cases/${encodeURIComponent(c.id)}` })[c.reviewStatus] || '/profile#usecase'
  const ucPosts = myUseCases.map((c) => {
    const st = UC_STATUS[c.reviewStatus] || UC_STATUS.pending
    return {
      id: c.id,
      statusKey: c.reviewStatus,
      statusLabel: t(st.label),
      statusBg: st.bg,
      statusColor: st.color,
      time: relativeTime(c.time),
      kindLabel: t('Use case'),
      title: c.title,
      desc: c.problem,
      hasReason: (c.reviewStatus === 'rejected' || c.reviewStatus === 'changes_requested') && !!c.adminNote,
      reasonPrefix: c.reviewStatus === 'changes_requested' ? t('Admin cần bổ sung') : t('Admin từ chối'),
      reasonBg: c.reviewStatus === 'changes_requested' ? '#FFF4E3' : '#FFECEC',
      reasonColor: c.reviewStatus === 'changes_requested' ? '#7A4700' : '#B4232A',
      reason: c.adminNote,
      metric: c.reviewStatus === 'approved' ? t('Đã publish') : t('Chưa publish'),
      cta: ucCta(c),
      onOpen: () => navigate(ucHref(c)),
    }
  })
  const ucColumns = UC_ORDER.map((key) => {
    const meta = UC_STATUS[key]
    const items = ucPosts.filter((p) => p.statusKey === key)
    return { key, label: t(meta.label), accent: meta.accent, count: items.length, items, empty: items.length === 0 }
  })

  // ---- saved section ----
  const savedUseCaseCards = savedUseCaseIds
    .map((id) => allCases.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => ({
      id: c.id,
      title: c.title,
      desc: c.desc,
      author: c.author,
      initial: c.author.slice(0, 1).toUpperCase(),
      avatarBg: avatarColor(c.author),
      topics: (prdMeta[c.id] || {}).topics || [],
      helpful: ucMeta[c.id] ? ucMeta[c.id].helpful : (prdMeta[c.id] || {}).helpful || 0,
      helped: !!(ucMeta[c.id] && ucMeta[c.id].iHelped),
      comments: ucMeta[c.id] ? ucMeta[c.id].comments.length : 0,
      onHelpful: () => api.reactUseCase(c.id).then(() => refreshUcMeta(c.id)).catch(() => {}),
      onOpenComments: () => navigate(`/use-cases/${c.id}#comments`),
      toolsR: c.tools.map((name) => ({ name })),
      onOpen: () => navigate(`/use-cases/${c.id}`),
    }))

  let qDraft = null
  try { qDraft = JSON.parse(localStorage.getItem(QUESTION_DRAFT_KEY) || 'null') } catch { /* ignore */ }
  const draftItem = qDraft && (qDraft.title || qDraft.body) ? [{
    tagLabel: t('Câu hỏi'), tagBg: '#E7ECFB', tagColor: '#2c5fff',
    title: qDraft.title || t('(Chưa có tiêu đề)'), meta: t('Bản nháp') + ' · ' + relativeTime(qDraft.savedAt),
    statusLabel: t('Đang nháp'), statusBg: '#EDF0FA', statusColor: '#3A4757',
    cta: t('Tiếp tục'), primary: true,
    onOpen: () => navigate('/questions#ask'),
  }] : []
  const recentItems = [].concat(draftItem)
    .concat(myQuestions.map((q) => ({
      tagLabel: t('Câu hỏi'), tagBg: '#E7ECFB', tagColor: '#2c5fff',
      title: q.title, meta: relativeTime(q.time),
      statusLabel: q.resolved ? 'Đã trả lời' : t('Đang chờ trả lời'),
      statusBg: q.resolved ? '#E7F9F0' : '#FFF1E0', statusColor: q.resolved ? '#00893F' : '#B45300',
      cta: t('Xem chi tiết'), primary: false,
      onOpen: () => navigate(`/questions#q=${encodeURIComponent(q.id)}`),
    })))
    .concat(myUseCases.map((c) => {
      const st = UC_STATUS[c.reviewStatus] || UC_STATUS.pending
      return {
        tagLabel: t('Use case'), tagBg: '#E7F9F0', tagColor: '#00893F',
        title: c.title, meta: relativeTime(c.time),
        statusLabel: t(st.label), statusBg: st.bg, statusColor: st.color,
        // Pending actions on the viewer's side get a "continue" CTA; everything else just opens it.
        cta: ucCta(c),
        primary: ['draft', 'rejected', 'changes_requested'].includes(c.reviewStatus),
        onOpen: () => navigate(ucHref(c)),
      }
    }))
    .slice(0, 4)

  const sectionTitle = section === 'activity' ? t('Thông báo & hoạt động') : section === 'usecase' ? t('Use case của tôi') : section === 'question' ? t('Câu hỏi của tôi') : section === 'saved' ? t('Đã lưu') : ''

  return (
    <Layout active="profile">
      <div style={css('position:relative; width:100%; margin:0 auto; background:#04060d; color:#e8eefc;')}>
        <SpaceBackdrop arcTop={section ? 200 : 230} bg="#04060d" />

        {/* Profile header — only on the main view, hidden once a specific section is selected. */}
        {/* Section heading — gradient/glow style, no item-count label (removed per latest design revision). */}
        {section && (
          <section style={css('position:relative; padding:22px 40px 0;')}>
            <div style={css('max-width:760px; margin:0 auto;')}>
              <h1 style={heroHeading}>{sectionTitle}</h1>
            </div>
          </section>
        )}

        {section === 'activity' && (
          <section style={css('position:relative; padding:14px 40px 0;')}>
            <div style={css('max-width:760px; margin:0 auto;')}>
              <h3 style={css(`margin:0 0 10px; font:800 17px ${FONT}; color:#ffffff;`)}>{t('Thông báo')}</h3>
              <div style={css('background:#fff; border:1px solid #E6EBF3; border-radius:16px; overflow:hidden;')}>
                <div style={css('display:flex; justify-content:flex-end; padding:10px 16px; border-bottom:1px solid #EEF1F7;')}>
                  <button onClick={() => markNotificationsRead()} disabled={!notif.unread} style={css(`border:none; background:transparent; cursor:${notif.unread ? 'pointer' : 'default'}; font:700 12.5px ${FONT}; color:${notif.unread ? '#3366F0' : '#94a3b8'}; padding:0;`)}>{t('Đánh dấu đã đọc tất cả')}</button>
                </div>
                {notif.loaded && notif.items.length === 0 && (
                  <div style={css(`padding:32px 18px; text-align:center; font:600 13.5px ${FONT}; color:#94a3b8;`)}>{t('Chưa có thông báo nào. Khi có người trả lời, bình luận hoặc nhắc đến bạn, thông báo sẽ hiện ở đây.')}</div>
                )}
                {notif.items.slice(0, showAllNotif ? undefined : 6).map((n) => {
                  const unread = n.unread
                  return (
                    <div key={n.id} onClick={() => { if (unread) markNotificationsRead([n.id]); if (n.href) navigate(n.href) }} className={hoverClass('background:#F7F9FD;')} style={css(`display:flex; gap:12px; align-items:center; padding:10px 16px; border-bottom:1px solid #F3F5FA; background:${unread ? '#F3F7FF' : '#fff'}; cursor:pointer;`)}>
                      <span style={css(`flex:none; width:30px; height:30px; border-radius:10px; background:${n.iconBg}; color:${n.iconFg}; display:flex; align-items:center; justify-content:center;`)}>{NOTIF_ICONS[n.kind] || NOTIF_ICONS.answer}</span>
                      <div style={css('flex:1; min-width:0;')}>
                        <div style={css(unread ? `font:800 13.5px/1.5 ${FONT}; color:#1a5fff;` : `font:400 13.5px/1.5 ${FONT}; color:#475569;`)}>{n.text}</div>
                        <div style={css(`margin-top:1px; font:400 12px ${FONT}; color:#94a3b8;`)}>{n.timeLabel}</div>
                      </div>
                      {unread && <span style={css('flex:none; width:9px; height:9px; border-radius:50%; background:#2c5fff; box-shadow:0 0 0 3px rgba(44,95,255,.18);')}></span>}
                    </div>
                  )
                })}
                {notif.items.length > 6 && (
                  <button onClick={() => setShowAllNotif((v) => !v)} className={hoverClass('background:#F7F9FD;')} style={css(`display:block; width:100%; padding:10px 16px; border:none; background:#fff; cursor:pointer; font:700 12.5px ${FONT}; color:#2c5fff;`)}>
                    {showAllNotif ? t('Thu gọn') : t('Xem thêm') + ` (${notif.items.length - 6})`}
                  </button>
                )}
              </div>
            </div>
            <div style={css('max-width:760px; margin:22px auto 0;')}>
              <h3 style={css(`margin:0 0 10px; font:800 17px ${FONT}; color:#ffffff;`)}>{t('Hoạt động gần đây')}</h3>
              {loaded && recentItems.length === 0 && (
                <div style={css(`background:#fff; border:1px dashed #DDE3EC; border-radius:16px; padding:40px; text-align:center; font:600 13.5px ${FONT}; color:#94a3b8;`)}>{t('Chưa có hoạt động nào. Đặt câu hỏi hoặc chia sẻ use case đầu tiên của bạn.')}</div>
              )}
              <div style={css('display:flex; flex-direction:column; gap:8px; padding-bottom:32px;')}>
                {recentItems.map((r, i) => (
                  <div key={i} onClick={r.onOpen} className={'zp-card ' + hoverClass('transform:translateY(-2px); border-color:#CFE0FF; box-shadow:0 14px 30px rgba(30,50,90,.14);')} style={css('cursor:pointer; transition:transform .16s, box-shadow .16s, border-color .16s; background:#fff; border:1px solid #E6EBF3; border-radius:16px; padding:14px 18px; display:flex; align-items:center; gap:14px; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
                    <span style={css(`flex:none; display:inline-flex; align-items:center; height:26px; padding:0 12px; border-radius:999px; background:${r.tagBg}; color:${r.tagColor}; font:700 12px ${FONT};`)}>{r.tagLabel}</span>
                    <div style={css('flex:1; min-width:0;')}>
                      <div className="zp-card-title" style={css(`font:700 14.5px ${FONT}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{r.title}</div>
                      <div style={css(`margin-top:3px; font:400 13px ${FONT}; color:#94a3b8;`)}>{r.meta}</div>
                    </div>
                    <span style={css(`flex:none; display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${r.statusBg}; color:${r.statusColor}; font:700 11.5px ${FONT};`)}>{r.statusLabel}</span>
                    <button onClick={(e) => { e.stopPropagation(); r.onOpen() }} style={css(`flex:none; display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 14px; border-radius:999px; font:700 12.5px ${FONT}; cursor:pointer; white-space:nowrap; ${r.primary ? 'border:none; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff;' : 'border:1px solid #DDE3EC; background:#fff; color:#2c5fff;'}`)}>
                      {r.cta}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}


        {section === 'usecase' && (
          <section style={css('position:relative; padding:18px 40px 40px;')}>
            <div style={css('max-width:760px; margin:0 auto; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px;')}>
              {ucColumns.map((col) => (
                <div key={col.key} style={css('display:flex; flex-direction:column; gap:12px; min-width:0; padding:14px; border-radius:16px; background:#ffffff; border:1px solid #E6EBF3; box-shadow:0 10px 26px rgba(0,0,0,.18);')}>
                  <div style={css('display:flex; align-items:center; gap:10px; padding:2px 4px;')}>
                    <span style={css(`flex:none; width:9px; height:9px; border-radius:50%; background:${col.accent};`)}></span>
                    <span style={css(`font:800 14.5px ${FONT}; color:#0F172A;`)}>{col.label}</span>
                    <span style={css(`margin-left:auto; display:inline-flex; align-items:center; justify-content:center; min-width:26px; height:24px; padding:0 8px; border-radius:999px; background:#F1F4FA; color:#3A4757; font:700 12px ${FONT};`)}>{col.count}</span>
                  </div>
                  {col.items.map((p) => <BoardCard key={p.id} p={p} />)}
                  {col.empty && (
                    <div style={css(`padding:14px 12px; text-align:center; border:1px dashed #DDE3EC; border-radius:12px; font:500 12.5px ${FONT}; color:#94a3b8;`)}>{t('Chưa có use case')}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {section === 'question' && (
          <section style={css('position:relative; padding:18px 40px 40px;')}>
            <div style={css('max-width:760px; margin:0 auto; display:flex; flex-direction:column; gap:14px;')}>
              {draftItem.map((r) => (
                <div key="draft" onClick={r.onOpen} className={'zp-card ' + hoverClass('transform:translateY(-2px); border-color:#CFE0FF;')} style={css('cursor:pointer; background:#fff; border:1.5px dashed #B9CCF8; border-radius:16px; padding:14px 18px; display:flex; align-items:center; gap:14px;')}>
                  <span style={css(`flex:none; display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:#EDF0FA; color:#3A4757; font:700 11.5px ${FONT};`)}>{t('Bản nháp')}</span>
                  <div style={css('flex:1; min-width:0;')}>
                    <div className="zp-card-title" style={css(`font:700 14.5px ${FONT}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{r.title}</div>
                    <div style={css(`margin-top:3px; font:400 12.5px ${FONT}; color:#94a3b8;`)}>{r.meta}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); r.onOpen() }} style={css(`flex:none; height:32px; padding:0 14px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; font:700 12.5px ${FONT}; cursor:pointer;`)}>{t('Tiếp tục')} →</button>
                </div>
              ))}
              {myQuestionCards.map((q) => <QuestionCard key={q.id} q={q} />)}
              {loaded && myQuestionCards.length === 0 && (
                <div style={css(`background:#fff; border:1px dashed #DDE3EC; border-radius:16px; padding:40px; text-align:center; font:600 13.5px ${FONT}; color:#94a3b8;`)}>{t('Chưa có câu hỏi nào.')}</div>
              )}
            </div>
          </section>
        )}

        {section === 'saved' && (
          <section style={css('position:relative; padding:14px 40px 28px;')}>
            <div style={css('max-width:760px; margin:0 auto;')}>
              <h3 style={subHeading}>{t('Use case đã lưu')}</h3>
              {savedUseCaseCards.length === 0 ? (
                <div style={css(`background:#fff; border:1px dashed #DDE3EC; border-radius:16px; padding:32px; text-align:center; margin-bottom:24px; font:600 13.5px ${FONT}; color:#94a3b8;`)}>{t('Chưa lưu use case nào.')}</div>
              ) : (
                <div style={css('display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; margin-bottom:24px;')}>
                  {savedUseCaseCards.map((c) => <UseCaseCard key={c.id} c={c} />)}
                </div>
              )}

              <h3 style={subHeading}>{t('Câu hỏi đã lưu')}</h3>
              {savedQuestionCards.length === 0 ? (
                <div style={css(`background:#fff; border:1px dashed #DDE3EC; border-radius:16px; padding:32px; text-align:center; font:600 13.5px ${FONT}; color:#94a3b8;`)}>{t('Chưa lưu câu hỏi nào.')}</div>
              ) : (
                <div style={css('display:flex; flex-direction:column; gap:12px;')}>
                  {savedQuestionCards.map((q) => <QuestionCard key={q.id} q={q} />)}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </Layout>
  )
}
