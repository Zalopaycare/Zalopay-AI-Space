import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { api, relativeTime } from '../lib/api.js'
import Layout from '../components/Layout.jsx'
import ImageSlot from '../components/ImageSlot.jsx'
import Avatar, { AVATAR_COLORS } from '../components/Avatar.jsx'
import { allCases, prdMeta, avatarColor } from '../data/useCases.js'
import SpaceBackdrop from '../components/SpaceBackdrop.jsx'
import CardActions from '../components/CardActions.jsx'

/**
 * Your own big profile avatar — click it to pick a color, persisted via PATCH /auth/me.
 * The picker is a full-viewport backdrop overlay (portaled to body) rather than an
 * in-flow popover, so it never sits flush against neighboring white cards (the stats
 * grid right below it) and reads unambiguously as a floating panel, on any screen size.
 */
function AvatarPicker({ user, onChange }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <div style={css('position:relative; flex:none;')}>
      <button
        onClick={() => setOpen(true)}
        title={t('Đổi màu avatar')}
        style={css('position:relative; border:none; background:none; padding:0; cursor:pointer; border-radius:50%; display:block;')}
      >
        <Avatar user={user} size={84} fontSize={28} />
        <span style={css('position:absolute; right:-2px; bottom:-2px; width:28px; height:28px; border-radius:50%; background:#fff; border:2px solid #04060d; display:flex; align-items:center; justify-content:center; color:#2c5fff;')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
        </span>
      </button>
      {open && createPortal(
        <div
          onClick={() => setOpen(false)}
          style={css('position:fixed; inset:0; z-index:2200; background:rgba(4,6,13,.6); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:24px;')}
        >
          <div onClick={(e) => e.stopPropagation()} style={css('width:360px; max-width:100%; background:#fff; border:1px solid #E6EBF3; border-radius:20px; box-shadow:0 30px 70px rgba(6,14,40,.45); padding:22px;')}>
            <div style={css('display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;')}>
              <div style={css(`font:800 15px ${FONT}; color:#0F172A;`)}>{t('Chọn màu avatar')}</div>
              <button onClick={() => setOpen(false)} style={css('width:30px; height:30px; border:none; border-radius:50%; background:#F1F4FA; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center;')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              </button>
            </div>
            <div style={css('display:grid; grid-template-columns:repeat(6,1fr); gap:12px;')}>
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { onChange(c); setOpen(false) }}
                  title={c}
                  style={{ width: 40, height: 40, borderRadius: '50%', background: c, border: user.avatarColor === c ? '3px solid #0F172A' : '2px solid transparent', boxShadow: '0 2px 6px rgba(0,0,0,.15)', cursor: 'pointer', padding: 0 }}
                />
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'

// Review-status meta for the "Use case của tôi" board columns, always rendered in this order.
// 'draft' has no backend equivalent yet (api.listSubmissions only returns approved/pending/rejected),
// so that column is always empty — it still renders per the design spec.
const UC_STATUS = {
  draft: { label: 'Đang nháp', bg: '#EDF0FA', color: '#3A4757', accent: '#94a3b8' },
  pending: { label: 'Chờ duyệt', bg: '#FFF1E0', color: '#B45300', accent: '#FF8D00' },
  rejected: { label: 'Bị từ chối', bg: '#FFECEC', color: '#D8232A', accent: '#E0353F' },
  approved: { label: 'Đã đăng', bg: '#E7F9F0', color: '#00893F', accent: '#00CF6A' },
}
const UC_ORDER = ['draft', 'pending', 'rejected', 'approved']

// Same bright gradient/glow text treatment as the Use Case Library hero title.
const GRAD_TEXT = 'background:linear-gradient(180deg,#ffffff 0%,#cfe3ff 46%,#4f93ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 6px 40px rgba(26,95,255,.85)) drop-shadow(0 0 16px rgba(90,150,255,.6));'
const GRAD_TEXT_SM = 'background:linear-gradient(180deg,#ffffff 0%,#cfe3ff 46%,#4f93ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 3px 14px rgba(26,95,255,.6)) drop-shadow(0 0 6px rgba(90,150,255,.4));'
const heroHeading = css(`margin:0; font:900 78px/1.1 ${FONT}; letter-spacing:-.01em; ${GRAD_TEXT}`)
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
        <div style={css(`margin-top:12px; padding:12px 14px; border-radius:12px; background:#FFECEC; font:600 12.5px/1.55 ${FONT}; color:#B4232A;`)}>{p.reasonPrefix}: {p.reason}</div>
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
      <div style={css('display:flex; align-items:center; gap:7px; padding:20px 22px 0; flex-wrap:wrap;')}>
        <span style={css(`display:inline-flex; align-items:center; gap:6px; height:23px; padding:0 10px 0 9px; border-radius:999px; background:#F1E7FF; color:#6F0CE2; font:800 11.5px ${FONT};`)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9.1 9a3 3 0 1 1 4.5 2.6c-.9.5-1.6 1.2-1.6 2.4"></path><path d="M12 18h.01"></path><circle cx="12" cy="12" r="9.5"></circle></svg>
          {t('Câu hỏi')}
        </span>
        {q.cat && <span style={css(`display:inline-flex; align-items:center; height:23px; padding:0 10px; border-radius:999px; background:#EAF0FF; color:#2c5fff; font:700 11.5px ${FONT};`)}>{q.cat}</span>}
        <span style={css(`margin-left:auto; display:inline-flex; align-items:center; height:23px; padding:0 10px; border-radius:999px; background:${q.statusBg}; color:${q.statusColor}; font:700 11.5px ${FONT};`)}>{q.statusLabel}</span>
      </div>
      <div style={css('display:flex; align-items:center; gap:14px; padding:14px 22px 0;')}>
        <span style={css(`flex:none; width:42px; height:42px; border-radius:50%; background:${q.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 14px ${FONT};`)}>{q.initials}</span>
        <div style={css('flex:1; min-width:0; display:flex; align-items:center; gap:8px;')}>
          <span style={css(`font:800 15px ${FONT}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{q.author}</span>
          <span style={css(`font:400 13px ${FONT}; color:#94a3b8; white-space:nowrap;`)}>· {q.time}</span>
        </div>
      </div>
      <div style={css('padding:14px 22px 0;')}>
        <h3 className="zp-card-title" style={css(`margin:0; font:800 19px/1.35 ${FONT}; color:#0F172A; text-wrap:pretty;`)}>{q.title}</h3>
        <p style={css(`margin:9px 0 0; font:400 14.5px/1.65 ${FONT}; color:#3A4757; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;`)}>{q.body}</p>
      </div>
      <div style={css('display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:16px 22px 0; padding:14px 0 16px; border-top:1px solid #EEF1F7;')}>
        {q.accepted && (
          <span style={css(`display:inline-flex; align-items:center; gap:7px; font:700 12.5px ${FONT}; color:#00893F;`)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00893F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
            {t('Đã có câu trả lời được chấp nhận')}
          </span>
        )}
        <CardActions helpful={q.helpful} helped={q.helped} onHelpful={q.onHelpful} replies={q.answers} onReply={q.onOpen} />
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
          <span style={css(`font:800 13.5px ${FONT}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{c.author}</span>
          <span style={css('font-size:11.5px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{c.team}</span>
        </div>
      </div>
      <div style={css('display:flex; gap:13px;')}>
        <div onClick={(e) => e.stopPropagation()} style={css('position:relative; flex:none; width:88px; height:88px; border-radius:13px; overflow:hidden; background:linear-gradient(160deg,#e9eef7,#dde6f2);')}>
          <ImageSlot id={'lib-' + c.id} shape="rect" placeholder="ảnh" />
        </div>
        <div style={css('flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center;')}>
          <h3 className="zp-card-title" style={css(`margin:0; font:800 15px/1.32 ${FONT}; color:#0F172A; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;`)}>{c.title}</h3>
          <p style={css('margin:5px 0 0; font-size:12.5px; line-height:1.5; color:#5B6675; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;')}>{c.desc}</p>
        </div>
      </div>
      <div style={css('display:flex; flex-wrap:wrap; gap:6px; margin-top:12px;')}>
        {c.toolsR.length > 0 ? c.toolsR.map((tl) => (
          <span key={tl.name} style={css(`display:inline-flex; align-items:center; height:28px; padding:0 11px; border:1px solid #DDE3EC; border-radius:9px; background:#fff; font:700 12px ${FONT}; color:#3A4757;`)}>{tl.name}</span>
        )) : (
          <span style={css(`display:inline-flex; align-items:center; height:28px; font:400 12px ${FONT}; color:#94a3b8;`)}>{t('Không dùng AI tool trực tiếp')}</span>
        )}
      </div>
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
  const location = useLocation()

  // Section is driven by the Sidebar's "Của tôi" sub-links (/profile#usecase|#question|#saved).
  // react-router's useLocation() re-renders on hash-only navigation within the same route, but we
  // also listen for the native `hashchange` event as a fallback, per the known SPA gotcha.
  const [hash, setHash] = useState(location.hash)
  useEffect(() => { setHash(location.hash) }, [location.hash])
  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const section = /#(usecase|question|saved)\b/.exec(hash || '')?.[1] || null

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
      const mine = qd.questions.filter((q) => q.author === user.name)
      setMyQuestions(mine)
      setSavedQuestions(qd.questions.filter((q) => q.saved))
      let answered = 0
      qd.questions.forEach((q) => q.answers.forEach((a) => { if (a.author === user.name) answered++ }))
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
    body: q.body,
    tagLabel: t('Câu hỏi'),
    statusLabel: q.resolved ? 'Đã trả lời' : t('Đang chờ trả lời'),
    statusBg: q.resolved ? '#E7F9F0' : '#FFF1E0',
    statusColor: q.resolved ? '#00893F' : '#B45300',
    cat: [].concat(q.category).filter(Boolean)[0] || '',
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

  // ---- use case board (4 status columns, always in this order) ----
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
      hasReason: c.reviewStatus === 'rejected',
      reasonPrefix: t('Admin từ chối'),
      reason: c.adminNote,
      metric: c.reviewStatus === 'approved' ? t('Đã publish') : t('Chưa publish'),
      cta: c.reviewStatus === 'rejected' ? t('Sửa & gửi lại') : t('Xem use case'),
      onOpen: () => navigate(c.reviewStatus === 'rejected' ? '/use-cases?share=1' : '/use-cases'),
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
      team: c.team || c.category,
      helpful: ucMeta[c.id] ? ucMeta[c.id].helpful : (prdMeta[c.id] || {}).helpful || 0,
      helped: !!(ucMeta[c.id] && ucMeta[c.id].iHelped),
      comments: ucMeta[c.id] ? ucMeta[c.id].comments.length : 0,
      onHelpful: () => api.reactUseCase(c.id).then(() => refreshUcMeta(c.id)).catch(() => {}),
      onOpenComments: () => navigate(`/use-cases/${c.id}#comments`),
      toolsR: c.tools.map((name) => ({ name })),
      onOpen: () => navigate(`/use-cases/${c.id}`),
    }))

  // ---- main-view stats + a light "recent activity" roll-up (not one of the 3 hash sections) ----
  const stats = [
    { value: myUseCases.length, label: t('Use case'), color: '#2c5fff' },
    { value: myQuestions.length, label: t('Câu hỏi'), color: '#0F172A' },
    { value: answersGiven, label: t('Câu trả lời'), color: '#00A352' },
  ]
  const recentItems = []
    .concat(myQuestions.map((q) => ({
      tagLabel: t('Câu hỏi'), tagBg: '#E7ECFB', tagColor: '#2c5fff',
      title: q.title, meta: relativeTime(q.time),
      statusLabel: q.resolved ? 'Đã trả lời' : t('Đang chờ trả lời'),
      statusBg: q.resolved ? '#E7F9F0' : '#FFF1E0', statusColor: q.resolved ? '#00893F' : '#B45300',
    })))
    .concat(myUseCases.map((c) => {
      const st = UC_STATUS[c.reviewStatus] || UC_STATUS.pending
      return {
        tagLabel: t('Use case'), tagBg: '#E7F9F0', tagColor: '#00893F',
        title: c.title, meta: relativeTime(c.time),
        statusLabel: t(st.label), statusBg: st.bg, statusColor: st.color,
      }
    }))
    .slice(0, 4)

  const sectionTitle = section === 'usecase' ? t('Use case của tôi') : section === 'question' ? t('Câu hỏi của tôi') : section === 'saved' ? t('Đã lưu') : ''

  return (
    <Layout active="profile">
      <div style={css('position:relative; width:100%; margin:0 auto; background:#04060d; color:#e8eefc;')}>
        <SpaceBackdrop arcTop={section ? 200 : 230} bg="#04060d" />

        {/* Profile header — only on the main view, hidden once a specific section is selected. */}
        {!section && (
          <section style={css('position:relative; padding:48px 40px 0;')}>
            <div style={css('max-width:760px; margin:0 auto; display:flex; align-items:center; gap:26px; flex-wrap:wrap;')}>
              <AvatarPicker user={user} onChange={(color) => api.updateMe({ avatarColor: color }).then((d) => setUser(d.user)).catch(() => {})} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <h1 style={css(`margin:0; font:900 26px ${FONT}; color:#ffffff;`)}>{user.name}</h1>
                <p style={css(`margin:6px 0 0; font:400 15px ${FONT}; color:#c3d0f5;`)}>{user.team ? user.team + ' · ' : ''}{user.email}</p>
                <div style={css(`display:inline-flex; align-items:center; gap:8px; margin-top:10px; height:26px; padding:0 12px; border-radius:999px; background:#E7ECFB; color:#2c5fff; font:700 11.5px ${FONT};`)}>{t('Đăng nhập bằng email công ty')}</div>
              </div>
            </div>

            <div style={css('max-width:760px; margin:26px auto 0; display:grid; grid-template-columns:repeat(3,1fr); gap:14px;')}>
              {stats.map((s) => (
                <div key={s.label} style={css('background:#fff; border:1px solid #E6EBF3; border-radius:16px; padding:18px 20px; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
                  <div style={css(`font:900 26px ${FONT}; color:${s.color};`)}>{s.value}</div>
                  <div style={css(`margin-top:5px; font:600 12.5px ${FONT}; color:#64748b;`)}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={css('max-width:760px; margin:32px auto 0;')}>
              <h3 style={css(`margin:0 0 14px; font:800 17px ${FONT}; color:#ffffff;`)}>{t('Hoạt động gần đây')}</h3>
              {loaded && recentItems.length === 0 && (
                <div style={css(`background:#fff; border:1px dashed #DDE3EC; border-radius:16px; padding:40px; text-align:center; font:600 13.5px ${FONT}; color:#94a3b8;`)}>{t('Chưa có hoạt động nào. Đặt câu hỏi hoặc chia sẻ use case đầu tiên của bạn.')}</div>
              )}
              <div style={css('display:flex; flex-direction:column; gap:12px; padding-bottom:90px;')}>
                {recentItems.map((r, i) => (
                  <div key={i} style={css('background:#fff; border:1px solid #E6EBF3; border-radius:16px; padding:18px 22px; display:flex; align-items:center; gap:16px; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
                    <span style={css(`flex:none; display:inline-flex; align-items:center; height:26px; padding:0 12px; border-radius:999px; background:${r.tagBg}; color:${r.tagColor}; font:700 12px ${FONT};`)}>{r.tagLabel}</span>
                    <div style={css('flex:1; min-width:0;')}>
                      <div style={css(`font:700 15px ${FONT}; color:#0F172A;`)}>{r.title}</div>
                      <div style={css(`margin-top:3px; font:400 13px ${FONT}; color:#94a3b8;`)}>{r.meta}</div>
                    </div>
                    <span style={css(`flex:none; display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${r.statusBg}; color:${r.statusColor}; font:700 11.5px ${FONT};`)}>{r.statusLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Section heading — gradient/glow style, no item-count label (removed per latest design revision). */}
        {section && (
          <section style={css('position:relative; padding:48px 40px 0;')}>
            <div style={css('max-width:760px; margin:0 auto;')}>
              <h1 style={heroHeading}>{sectionTitle}</h1>
            </div>
          </section>
        )}

        {section === 'usecase' && (
          <section style={css('position:relative; padding:22px 40px 90px;')}>
            <div style={css('max-width:760px; margin:0 auto; display:flex; flex-direction:column; gap:16px;')}>
              {ucColumns.map((col) => (
                <div key={col.key} style={css('display:flex; flex-direction:column; gap:12px; min-width:0; padding:14px; border-radius:18px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);')}>
                  <div style={css('display:flex; align-items:center; gap:10px; padding:2px 4px;')}>
                    <span style={css(`flex:none; width:9px; height:9px; border-radius:50%; background:${col.accent};`)}></span>
                    <span style={css(`font:800 15px ${FONT}; color:#ffffff;`)}>{col.label}</span>
                    <span style={css(`margin-left:auto; display:inline-flex; align-items:center; justify-content:center; min-width:26px; height:24px; padding:0 8px; border-radius:999px; background:rgba(255,255,255,.1); color:#dbe6ff; font:700 12px ${FONT};`)}>{col.count}</span>
                  </div>
                  {col.items.map((p) => <BoardCard key={p.id} p={p} />)}
                  {col.empty && (
                    <div style={css(`padding:22px 12px; text-align:center; border:1px dashed rgba(255,255,255,.18); border-radius:14px; font:500 13px ${FONT}; color:#8b98b8;`)}>{t('Chưa có use case')}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {section === 'question' && (
          <section style={css('position:relative; padding:22px 40px 90px;')}>
            <div style={css('max-width:760px; margin:0 auto; display:flex; flex-direction:column; gap:14px;')}>
              {myQuestionCards.map((q) => <QuestionCard key={q.id} q={q} />)}
              {loaded && myQuestionCards.length === 0 && (
                <div style={css(`background:#fff; border:1px dashed #DDE3EC; border-radius:16px; padding:40px; text-align:center; font:600 13.5px ${FONT}; color:#94a3b8;`)}>{t('Chưa có câu hỏi nào.')}</div>
              )}
            </div>
          </section>
        )}

        {section === 'saved' && (
          <section style={css('position:relative; padding:22px 40px 90px;')}>
            <div style={css('max-width:760px; margin:0 auto;')}>
              <h3 style={subHeading}>{t('Use case đã lưu')}</h3>
              {savedUseCaseCards.length === 0 ? (
                <div style={css(`background:#fff; border:1px dashed #DDE3EC; border-radius:16px; padding:32px; text-align:center; margin-bottom:40px; font:600 13.5px ${FONT}; color:#94a3b8;`)}>{t('Chưa lưu use case nào.')}</div>
              ) : (
                <div style={css('display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; margin-bottom:40px;')}>
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
