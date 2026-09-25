import { Fragment, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { api, relativeTime } from '../lib/api.js'
import Layout from '../components/Layout.jsx'
import ImageSlot from '../components/ImageSlot.jsx'
import { allCases, prdMeta, avatarColor } from '../data/useCases.js'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const AV = ['#2c5fff', '#00A352', '#6F0CE2', '#FF8D00', '#0033C9', '#00B7FF']
const FEATURED_IDS = ['c1', 'c2', 'c3']
const UFO_STARS = [
  { left: '4%', top: '6px', size: '2px', dur: '2.6s', delay: '-.4s' },
  { left: '14%', top: '38px', size: '3px', dur: '3.1s', delay: '-1.8s' },
  { left: '24%', top: '4px', size: '2px', dur: '2.2s', delay: '-.9s' },
  { left: '90%', top: '14px', size: '3px', dur: '2.8s', delay: '-2.2s' },
  { left: '80%', top: '44px', size: '2px', dur: '2.4s', delay: '-1.1s' },
  { left: '96%', top: '2px', size: '2px', dur: '3.4s', delay: '-.2s' },
  { left: '70%', top: '0px', size: '2px', dur: '2.9s', delay: '-1.6s' },
]

const HOME_NOTIFICATIONS = [
  { text: 'HaiPD đã trả lời câu hỏi của bạn về tóm tắt PDF dài', href: '/questions', time: '2 giờ trước', unread: true, iconText: 'A', iconBg: '#E7ECFB', iconFg: '#2c5fff' },
  { text: 'QuyenNT đã mention bạn trong một bình luận', href: '/questions', time: '1 giờ trước', unread: true, iconText: '@', iconBg: '#F1E7FF', iconFg: '#6F0CE2' },
  { text: 'Use case "Tóm tắt phản hồi khách hàng theo tuần" đã được duyệt', href: '/use-cases', time: 'Hôm qua', unread: true, iconText: '✓', iconBg: '#E7F9F0', iconFg: '#00893F' },
  { text: 'Use case "Auto QA script" bị từ chối — xem lý do trong My Posts', href: '/profile#posts', time: '2 ngày trước', unread: false, iconText: '!', iconBg: '#FFECEC', iconFg: '#D8232A' },
]

const steps = [
  {
    glow: 'rgba(120,180,255,.5)', title: '1. Điền form ngắn', desc: 'Chia sẻ workflow & tài liệu liên quan của bạn', showArrow: false,
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>,
  },
  {
    glow: 'rgba(0,231,122,.5)', title: '2. AI Hub team hỗ trợ', desc: 'Phỏng vấn nhanh và giúp bạn viết lại theo template chuẩn', showArrow: true,
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"></circle><path d="M20 21a8 8 0 0 0-16 0"></path></svg>,
  },
  {
    glow: 'rgba(160,140,255,.5)', title: '3. Lan tỏa giá trị', desc: 'Use case của bạn được publish để mọi người cùng sử dụng', showArrow: true,
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"></path><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"></path></svg>,
  },
]

function replyLabel(n) {
  return n === 0 ? 'Chưa có trả lời' : n + ' trả lời'
}

const tsNum = (v) => new Date(String(v).includes('T') ? v : String(v).replace(' ', 'T') + 'Z').getTime()
const helpfulTotal = (q) => (q.answers || []).reduce((n, a) => n + (a.helpful || 0), 0) + (q.qHelpful || 0)

export default function HomePage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { user, requireLogin } = useAuth()

  const [questions, setQuestions] = useState([])
  const [openQ, setOpenQ] = useState(null)
  const [modalDraft, setModalDraft] = useState('')
  const [ucMeta, setUcMeta] = useState({})

  const patch = (id, updated) => setQuestions((qs) => qs.map((q) => (q.id === id ? updated : q)))

  useEffect(() => {
    api.listQuestions().then((d) => setQuestions(d.questions || [])).catch(() => {})
  }, [])

  const refreshUcMeta = (ucId) => api.useCaseMeta(ucId).then((d) => setUcMeta((s) => ({ ...s, [ucId]: d }))).catch(() => {})
  useEffect(() => { FEATURED_IDS.forEach(refreshUcMeta) }, [])

  // ---- trending questions (top 3 unresolved by helpfulness, then recency) ----
  const trending = questions
    .filter((q) => !q.resolved)
    .slice()
    .sort((a, b) => helpfulTotal(b) - helpfulTotal(a) || tsNum(b.ts || b.time) - tsNum(a.ts || a.time))
    .slice(0, 3)
    .map((q) => ({
      ...q,
      timeLabel: relativeTime(q.time),
      avatarBg: AV[q.author.charCodeAt(0) % AV.length],
      cat: [].concat(q.category).filter(Boolean)[0] || '',
      helpfulTotal: helpfulTotal(q),
      replyLabel: replyLabel((q.answers || []).length),
      qHelpBorder: q.iHelpedQ ? '#B9CCF8' : '#DDE3EC',
      qHelpBg: q.iHelpedQ ? '#EAF1FF' : '#fff',
      qHelpFill: q.iHelpedQ ? '#2c5fff' : 'none',
      onLike: (e) => { e.stopPropagation(); requireLogin(() => api.reactQuestion(q.id).then((d) => patch(q.id, d.question)).catch(() => {})) },
      onOpen: () => setOpenQ(q.id),
    }))

  // ---- question detail modal ----
  const modalSrc = openQ ? questions.find((q) => q.id === openQ) : null
  const modalAnswers = modalSrc ? (modalSrc.answers || []).map((a) => ({
    ...a,
    timeLabel: relativeTime(a.time),
    avatarBg: AV[a.author.charCodeAt(0) % AV.length],
    helpColor: a.iHelped ? '#2c5fff' : '#64748b',
    helpFill: a.iHelped ? '#2c5fff' : 'none',
    onHelpful: () => requireLogin(() => api.reactAnswer(modalSrc.id, a.id).then((d) => patch(modalSrc.id, d.question)).catch(() => {})),
  })) : []

  const closeModal = () => { setOpenQ(null); setModalDraft('') }
  const postModalReply = () => {
    const body = modalDraft.trim()
    if (!body || !modalSrc) return
    requireLogin(() => api.postAnswer(modalSrc.id, body).then((d) => { patch(modalSrc.id, d.question); setModalDraft('') }).catch(() => {}))
  }

  // ---- featured use cases (real data, live helpful/save counts) ----
  const featured = FEATURED_IDS.map((id) => allCases.find((c) => c.id === id)).filter(Boolean).map((c) => {
    const meta = ucMeta[c.id]
    const saved = meta ? meta.saved : false
    const helpful = meta ? meta.helpful : (prdMeta[c.id] || {}).helpful || 0
    const iHelped = meta ? meta.iHelped : false
    return {
      ...c,
      problem: (prdMeta[c.id] || {}).problem || '',
      initials: c.author.slice(0, 1).toUpperCase(),
      avatarBg: avatarColor(c.author),
      saved, helpful,
      saveColor: saved ? '#00893F' : '#5B6675',
      saveFill: saved ? 'currentColor' : 'none',
      helpBorder: iHelped ? '#B9CCF8' : '#DDE3EC',
      helpBg: iHelped ? '#EAF1FF' : '#fff',
      helpColor: iHelped ? '#2c5fff' : '#3A4757',
      helpFill: iHelped ? 'currentColor' : 'none',
      onSaveToggle: (e) => { e.stopPropagation(); requireLogin(() => api.saveUseCase(c.id).then(() => refreshUcMeta(c.id)).catch(() => {})) },
      onHelpful: (e) => { e.stopPropagation(); requireLogin(() => api.reactUseCase(c.id).then(() => refreshUcMeta(c.id)).catch(() => {})) },
      onOpen: () => navigate(`/use-cases/${c.id}`),
    }
  })

  return (
    <Layout active="home" notifications={HOME_NOTIFICATIONS}>
      <div style={css('width:100%; margin:0 auto; background:#04060d; color:#e8eefc;')}>

        {/* ============ WORDMARK ============ */}
        <section style={css('position:relative; padding:56px 40px 0; background:#04060d; text-align:center; overflow:hidden;')}>
          <div style={css('position:relative; max-width:900px; margin:0 auto; height:64px;')}>
            {UFO_STARS.map((s, i) => (
              <span key={i} style={{ position: 'absolute', left: s.left, top: s.top, width: s.size, height: s.size, borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px 1px rgba(255,255,255,.75)', animation: `twinkle ${s.dur} ease-in-out infinite`, animationDelay: s.delay, pointerEvents: 'none' }}></span>
            ))}
            <div style={css('position:absolute; left:58%; top:0; animation:ufobob 3.6s ease-in-out infinite; pointer-events:none;')}>
              <div style={css('position:relative; width:0; height:0; left:50%; transform:translateX(-50%);')}>
                <div style={css('position:absolute; left:50%; top:34px; width:130px; height:210px; transform:translateX(-50%); clip-path:polygon(50% 0%, 100% 100%, 0% 100%); background:linear-gradient(180deg,rgba(180,225,255,.5) 0%,rgba(140,200,255,.12) 65%,rgba(140,200,255,0) 100%); animation:beamflicker 2.2s ease-in-out infinite;')}></div>
                <svg width="76" height="40" viewBox="0 0 76 40" style={css('position:relative; display:block; filter:drop-shadow(0 6px 14px rgba(0,0,0,.5));')}>
                  <ellipse cx="38" cy="26" rx="36" ry="8" fill="#B7C6E0" />
                  <ellipse cx="38" cy="24" rx="27" ry="6.5" fill="#8CA0C7" />
                  <path d="M20 22 Q38 2 56 22 Z" fill="#CFE6FF" opacity="0.9" />
                  <circle cx="22" cy="27" r="2.2" fill="#5EE7FF" />
                  <circle cx="38" cy="29" r="2.2" fill="#FFE45E" />
                  <circle cx="54" cy="27" r="2.2" fill="#5EE7FF" />
                </svg>
              </div>
            </div>
          </div>
          <h1 style={css(`position:relative; margin:0; font-family:${FONT}; font-size:104px; line-height:1.05; font-weight:700; letter-spacing:-3px; background:linear-gradient(180deg,#ffffff 0%,#cfe3ff 46%,#4f93ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 6px 40px rgba(26,95,255,.85)) drop-shadow(0 0 16px rgba(90,150,255,.6)); text-wrap:balance;`)}>Zalopay AI Space</h1>
        </section>

        {/* ============ TRENDING QUESTIONS ============ */}
        <section id="waiting" style={css('position:relative; padding:28px 40px 40px; background:#04060d;')}>
          <div style={css('max-width:1200px; margin:0 auto;')}>
            <div style={css('display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:16px 24px;')}>
              <h2 style={css(`margin:0; font:900 30px ${FONT}; letter-spacing:-.01em; background:linear-gradient(100deg,#9fd0ff 0%,#6ea8ff 48%,#5ee7ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent;`)}>{t('Câu hỏi về AI đang thịnh hành')}</h2>
              <button
                onClick={() => navigate('/questions')}
                className={hoverClass('animation-play-state:paused;')}
                style={{ ...css(`flex:none; white-space:nowrap; display:inline-flex; align-items:center; gap:10px; height:48px; padding:0 22px; border-radius:999px; background:#00CF6A; color:#04180F; font:800 15px ${FONT}; border:none; cursor:pointer; box-shadow:0 0 0 4px rgba(0,207,106,.22),0 12px 30px rgba(0,207,106,.4);`), animation: 'shake 2.4s ease-in-out infinite' }}
              >
                {t('Xem thêm câu hỏi')}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              </button>
            </div>

            <div style={css('display:flex; flex-direction:column; gap:14px; margin-top:24px;')}>
              {trending.map((q) => (
                <div key={q.id} onClick={q.onOpen} className={hoverClass('transform:translateY(-3px); box-shadow:0 22px 48px rgba(0,0,0,.36); border-color:#CFE0FF;')} style={css('position:relative; background:#ffffff; border:1px solid #E6EBF3; border-radius:22px; padding:20px 24px 18px; cursor:pointer; box-shadow:0 14px 36px rgba(0,0,0,.28); transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;')}>
                  <div style={css('display:flex; align-items:center; gap:8px;')}>
                    <span style={css(`flex:none; white-space:nowrap; display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 13px; border-radius:10px; font:700 13px ${FONT}; background:#F1E7FF; color:#6F0CE2;`)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9.1 9a3 3 0 1 1 4.5 2.6c-.9.5-1.6 1.2-1.6 2.4"></path><path d="M12 18h.01"></path><circle cx="12" cy="12" r="9.5"></circle></svg>
                      {t('Câu hỏi')}
                    </span>
                    <span style={css(`margin-left:auto; flex:none; white-space:nowrap; display:inline-flex; align-items:center; height:32px; padding:0 14px; border-radius:999px; background:#FFF1E0; color:#B45300; font:700 13px ${FONT};`)}>{t('Đang chờ trả lời')}</span>
                  </div>
                  <h3 style={css(`margin:14px 0 0; font-size:19px; font-weight:800; line-height:1.35; color:#0F172A; text-wrap:pretty;`)}>{q.title}</h3>
                  <p style={css('margin:10px 0 0; font-size:15px; line-height:1.6; color:#5B6675; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;')}>{q.body}</p>
                  <div style={css('display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin-top:16px; padding-top:16px; border-top:1px solid #EEF1F7;')}>
                    <span style={css(`flex:none; width:38px; height:38px; border-radius:50%; background:${q.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800;`)}>{q.initials}</span>
                    <span style={css('display:flex; flex-direction:column; margin-right:6px;')}>
                      <span style={css('font-size:14.5px; font-weight:800; color:#0F172A; white-space:nowrap;')}>{q.author}</span>
                      <span style={css('font-size:12.5px; color:#94a3b8; white-space:nowrap;')}>{q.timeLabel}</span>
                    </span>
                    {q.cat && (
                      <span style={css(`flex:none; white-space:nowrap; display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 13px; border-radius:10px; font:700 13px ${FONT}; background:#EAF0FF; color:#2c5fff;`)}>{q.cat}</span>
                    )}
                    <button onClick={q.onLike} style={css(`margin-left:auto; flex:none; white-space:nowrap; display:inline-flex; align-items:center; gap:9px; height:40px; padding:0 16px; border-radius:999px; font-family:${FONT}; font-size:14px; font-weight:700; cursor:pointer; border:1px solid ${q.qHelpBorder}; background:${q.qHelpBg}; color:#3A4757;`)}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill={q.qHelpFill} stroke="#2c5fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.5 3.2L13.6 9H19a2.4 2.4 0 0 1 2.3 3l-1.8 7.3A2.4 2.4 0 0 1 17.2 22z"></path><path d="M7 11H3v11h4"></path></svg>
                      <span style={css('color:#2c5fff;')}>{q.helpfulTotal}</span> {t('hữu ích')}
                    </button>
                    <span style={css(`flex:none; white-space:nowrap; display:inline-flex; align-items:center; gap:9px; height:40px; padding:0 16px; border-radius:999px; font-family:${FONT}; font-size:14px; font-weight:700; border:1px solid #DDE3EC; background:#fff; color:#3A4757;`)}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                      {q.replyLabel}
                    </span>
                  </div>
                </div>
              ))}

              {trending.length === 0 && (
                <div style={css('padding:44px 24px; text-align:center; background:#fff; border:1px dashed #C9D4E6; border-radius:20px;')}>
                  <div style={css(`font:800 16px ${FONT}; color:#0F172A;`)}>{t('Không còn câu hỏi nào đang chờ')}</div>
                  <div style={css(`margin-top:8px; font:400 14px ${FONT}; color:#64748b;`)}>{t('Mọi câu hỏi đều đã có người trả lời. Bạn có thể đặt câu hỏi mới bất cứ lúc nào.')}</div>
                </div>
              )}
            </div>
          </div>

          {modalSrc && (
            <div onClick={closeModal} style={css('position:fixed; inset:0; z-index:3000; background:rgba(4,10,26,.62); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:40px 24px;')}>
              <div onClick={(e) => e.stopPropagation()} style={css('width:720px; max-width:100%; max-height:100%; overflow-y:auto; background:#ffffff; border-radius:22px; box-shadow:0 40px 100px rgba(3,12,40,.55);')}>
                <div style={css('display:flex; gap:14px; padding:24px 26px 0;')}>
                  <span style={css(`flex:none; width:44px; height:44px; border-radius:50%; background:${AV[modalSrc.author.charCodeAt(0) % AV.length]}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 14px ${FONT};`)}>{modalSrc.initials}</span>
                  <div style={css('flex:1; min-width:0;')}>
                    <div style={css('display:flex; align-items:center; gap:8px; flex-wrap:wrap;')}>
                      <span style={css(`font:800 14.5px ${FONT}; color:#0F172A;`)}>{modalSrc.author}</span>
                      <span style={css(`font:400 13px ${FONT}; color:#94a3b8;`)}>{relativeTime(modalSrc.time)}</span>
                      <span style={css(`display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${modalSrc.resolved ? '#E7F9F0' : '#FFF1E0'}; color:${modalSrc.resolved ? '#00893F' : '#B45300'}; font:700 11.5px ${FONT};`)}>{modalSrc.resolved ? 'Resolved' : t('Đang chờ trả lời')}</span>
                    </div>
                  </div>
                  <button onClick={closeModal} style={css('flex:none; width:36px; height:36px; border:1px solid #E6EBF3; border-radius:11px; background:#fff; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center;')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                  </button>
                </div>

                <div style={css('padding:16px 26px 0;')}>
                  <h3 style={css(`margin:0; font:800 21px/1.35 ${FONT}; color:#0F172A; text-wrap:pretty;`)}>{modalSrc.title}</h3>
                  <p style={css(`margin:11px 0 0; font:400 15px/1.65 ${FONT}; color:#3A4757; white-space:pre-wrap;`)}>{modalSrc.body}</p>
                  <div style={css('display:flex; align-items:center; gap:8px; margin-top:16px; flex-wrap:wrap;')}>
                    {[].concat(modalSrc.category).filter(Boolean).map((c) => (
                      <span key={c} style={css(`display:inline-flex; align-items:center; height:28px; padding:0 12px; border-radius:8px; background:#EAF0FF; color:#2c5fff; font:700 12px ${FONT};`)}>{c}</span>
                    ))}
                    {(modalSrc.tools || []).map((tl) => (
                      <span key={tl} style={css(`display:inline-flex; align-items:center; height:28px; padding:0 12px; border-radius:8px; background:#F1F4FA; color:#3A4757; font:700 12px ${FONT};`)}>{tl}</span>
                    ))}
                  </div>
                  <div style={css('display:flex; align-items:center; gap:10px; margin-top:16px; padding:13px 0 0; border-top:1px solid #EEF1F7;')}>
                    <span style={css(`display:inline-flex; align-items:center; gap:8px; height:34px; padding:0 14px; border:1px solid #E6EBF3; border-radius:999px; background:#F8FAFE; font:700 12.5px ${FONT}; color:#3A4757;`)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2c5fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.5 3.2L13.6 9H19a2.4 2.4 0 0 1 2.3 3l-1.8 7.3A2.4 2.4 0 0 1 17.2 22z"></path><path d="M7 11H3v11h4"></path></svg>
                      <span style={css('color:#2c5fff;')}>{helpfulTotal(modalSrc)}</span> {t('hữu ích')}
                    </span>
                    <span style={css(`margin-left:auto; font:700 12.5px ${FONT}; color:#64748b;`)}>{replyLabel(modalAnswers.length)}</span>
                  </div>
                </div>

                <div style={css('margin-top:18px; padding:18px 26px 22px; background:#F8FAFE; border-top:1px solid #EEF1F7;')}>
                  {modalAnswers.map((a) => (
                    <div key={a.id} style={css('display:flex; gap:12px; padding:14px 0; border-bottom:1px solid #EEF1F7;')}>
                      <span style={css(`flex:none; width:34px; height:34px; border-radius:50%; background:${a.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px ${FONT};`)}>{a.initials}</span>
                      <div style={css('flex:1; min-width:0;')}>
                        <div style={css('display:flex; align-items:center; gap:8px; flex-wrap:wrap;')}>
                          <span style={css(`font:800 13.5px ${FONT}; color:#0F172A;`)}>{a.author}</span>
                          <span style={css(`font:400 12px ${FONT}; color:#94a3b8;`)}>{a.timeLabel}</span>
                        </div>
                        <p style={css(`margin:7px 0 0; font:400 14px/1.6 ${FONT}; color:#3A4757;`)}>{a.body}</p>
                        <button onClick={a.onHelpful} style={css(`display:inline-flex; align-items:center; gap:7px; margin-top:9px; border:none; background:transparent; padding:0; cursor:pointer; font:700 12.5px ${FONT}; color:${a.helpColor};`)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={a.helpFill} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.5 3.2L13.6 9H19a2.4 2.4 0 0 1 2.3 3l-1.8 7.3A2.4 2.4 0 0 1 17.2 22z"></path><path d="M7 11H3v11h4"></path></svg>
                          Hữu ích · {a.helpful}
                        </button>
                      </div>
                    </div>
                  ))}
                  {modalAnswers.length === 0 && (
                    <div style={css(`padding:16px 0 6px; text-align:center; font:600 13.5px ${FONT}; color:#94a3b8;`)}>{t('Chưa có câu trả lời. Câu trả lời đầu tiên thường giúp ích nhất.')}</div>
                  )}

                  <div style={css('display:flex; gap:12px; margin-top:16px;')}>
                    <span style={css(`flex:none; width:34px; height:34px; border-radius:50%; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px ${FONT};`)}>{user?.initials || '?'}</span>
                    <div style={{ flex: 1 }}>
                      <textarea value={modalDraft} onChange={(e) => setModalDraft(e.target.value)} rows={3} placeholder={t('Viết câu trả lời của bạn...')} style={css(`width:100%; box-sizing:border-box; border:1px solid #DDE3EC; border-radius:14px; padding:12px 14px; font:400 14px/1.6 ${FONT}; color:#0F172A; background:#fff; outline:none; resize:vertical;`)}></textarea>
                      <div style={css('display:flex; align-items:center; margin-top:10px;')}>
                        <button onClick={() => navigate(`/questions#q=${modalSrc.id}`)} style={css(`font:700 12.5px ${FONT}; color:#3366F0; text-decoration:none; background:none; border:none; cursor:pointer; padding:0;`)}>{t('Mở trong Questions')}</button>
                        <button onClick={postModalReply} style={css(`margin-left:auto; height:40px; padding:0 20px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 13.5px ${FONT}; cursor:pointer; opacity:${modalDraft.trim() ? 1 : 0.5};`)}>
                          {t('Đăng câu trả lời')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ============ FEATURED USE CASES ============ */}
        <section id="featured" style={css('position:relative; padding:24px 40px 110px; background:linear-gradient(180deg,#05080f 0%,#070c1b 55%,#04060d 100%);')}>
          <div style={css('max-width:1200px; margin:0 auto;')}>
            <h2 style={css(`font:900 30px ${FONT}; letter-spacing:-.01em; margin:0; background:linear-gradient(100deg,#9fd0ff 0%,#6ea8ff 48%,#5ee7ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent;`)}>{t('Use case nổi bật')}</h2>

            <div style={css('display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:24px; margin-top:24px;')}>
              {featured.map((item) => (
                <div key={item.id} onClick={item.onOpen} className={hoverClass('transform:translateY(-4px); box-shadow:0 24px 54px rgba(0,0,0,.36); border-color:#CFE0FF;')} style={css('position:relative; display:flex; flex-direction:column; background:#ffffff; border:1px solid #E6EBF3; border-radius:22px; padding:14px 14px 18px; cursor:pointer; box-shadow:0 14px 36px rgba(0,0,0,.28); transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;')}>
                  <div onClick={(e) => e.stopPropagation()} style={css('position:relative; aspect-ratio:16 / 10; border-radius:16px; overflow:hidden; background:linear-gradient(160deg,#e9eef7,#dde6f2);')}>
                    <ImageSlot id={'lib-' + item.id} shape="rounded" radius={16} placeholder="ảnh use case" style={{ position: 'absolute', inset: 0 }} />
                    <span style={css(`position:absolute; top:12px; left:12px; z-index:2; pointer-events:none; display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 12px 0 10px; border-radius:999px; background:#ffffff; color:#00893F; font:800 12px ${FONT}; box-shadow:0 2px 10px rgba(0,0,0,.14);`)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                      {t('Use case')}
                    </span>
                    <button onClick={item.onSaveToggle} title="Lưu use case" style={css(`position:absolute; top:10px; right:10px; z-index:3; width:38px; height:38px; border-radius:12px; background:#fff; border:1px solid #E6EBF3; box-shadow:0 4px 14px rgba(20,30,60,.16); display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0; color:${item.saveColor};`)}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill={item.saveFill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    </button>
                  </div>
                  <div style={css('display:flex; flex-direction:column; flex:1; padding:16px 6px 0;')}>
                    <h3 style={css(`margin:0; font:800 17px/1.35 ${FONT}; color:#0F172A; text-wrap:pretty;`)}>{item.title}</h3>
                    <div style={css('margin-top:12px; font:800 11px "Aeonik Pro"; letter-spacing:.08em; color:#C2410C;')}>{t('VẤN ĐỀ')}</div>
                    <p style={css('margin:4px 0 0; font-size:14px; line-height:1.55; color:#5B6675; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;')}>{item.problem}</p>
                    <div style={css('margin-top:10px; font:800 11px "Aeonik Pro"; letter-spacing:.08em; color:#2c5fff;')}>{t('GIẢI PHÁP')}</div>
                    <p style={css('margin:4px 0 0; font-size:14px; line-height:1.55; color:#5B6675; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;')}>{item.desc}</p>
                    <div style={{ flex: 1, minHeight: 14 }}></div>
                    <div style={css('display:flex; align-items:center; gap:10px;')}>
                      <span style={css(`flex:none; width:34px; height:34px; border-radius:50%; background:${item.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px ${FONT};`)}>{item.initials}</span>
                      <span style={css(`font:800 14.5px ${FONT}; color:#0F172A; white-space:nowrap;`)}>{item.author}</span>
                      <button onClick={item.onHelpful} style={css(`margin-left:auto; display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 12px; border-radius:999px; border:1px solid ${item.helpBorder}; background:${item.helpBg}; color:${item.helpColor}; font:700 12.5px ${FONT}; cursor:pointer; white-space:nowrap;`)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={item.helpFill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.5 3.2L13.6 9H19a2.4 2.4 0 0 1 2.3 3l-1.8 7.3A2.4 2.4 0 0 1 17.2 22z"></path><path d="M7 11H3v11h4"></path></svg>
                        <span style={css('color:#2c5fff;')}>{item.helpful}</span> {t('hữu ích')}
                      </button>
                    </div>
                    <div style={css('display:flex; flex-wrap:wrap; gap:8px; margin-top:14px;')}>
                      {item.tools.length > 0 ? item.tools.map((tl) => (
                        <span key={tl} style={css(`display:inline-flex; align-items:center; height:36px; padding:0 15px; border:1px solid #DDE3EC; border-radius:11px; background:#fff; font:700 13.5px ${FONT}; color:#3A4757;`)}>{tl}</span>
                      )) : (
                        <span style={css(`display:inline-flex; align-items:center; height:36px; font:400 13px ${FONT}; color:#94a3b8;`)}>{t('Không dùng AI tool trực tiếp')}</span>
                      )}
                    </div>
                    <button onClick={item.onOpen} className={hoverClass('transform:translateY(-1px); box-shadow:0 14px 30px rgba(44,95,255,.5), inset 0 1px 0 rgba(255,255,255,.42);')} style={css(`margin-top:16px; position:relative; overflow:hidden; display:inline-flex; align-items:center; justify-content:center; gap:12px; height:52px; border-radius:14px; border:1px solid rgba(255,255,255,.35); background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:800 16px ${FONT}; cursor:pointer; box-shadow:0 10px 24px rgba(44,95,255,.34),inset 0 1px 0 rgba(255,255,255,.35); transition:transform .18s ease,box-shadow .18s ease;`)}>
                      {t('Xem Use Case')}
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                  </div>
                </div>
              ))}

              <a href="/use-cases" onClick={(e) => { e.preventDefault(); navigate('/use-cases') }} className={hoverClass('transform:translateY(-4px); box-shadow:0 24px 54px rgba(0,0,0,.36);')} style={css('display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; min-height:420px; border-radius:22px; border:1.5px dashed #B6CBF2; background:linear-gradient(160deg,#e8eaee 0%,#c4c9d4 100%); text-decoration:none; transition:transform .18s ease,box-shadow .18s ease;')}>
                <span style={{ ...css('display:flex; align-items:center; justify-content:center; width:64px; height:64px; border-radius:50%; background:linear-gradient(120deg,#0033C9,#1266e6); box-shadow:0 12px 28px rgba(10,60,200,.35);'), animation: 'wiggleCall 2.4s ease-in-out infinite' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </span>
                <span style={css(`font:800 20px ${FONT}; color:#0033C9;`)}>{t('Xem thêm use case')}</span>
                <span style={css(`font:400 14px ${FONT}; color:#5B6675;`)}>{t('Xem toàn bộ thư viện')}</span>
              </a>
            </div>
          </div>
        </section>

        {/* ============ SHARE YOUR USE CASE ============ */}
        <section style={css('position:relative; background:#04060d; padding:0 40px 64px;')}>
          <div style={css('max-width:900px; margin:0 auto; display:flex; gap:40px; align-items:center; flex-wrap:wrap; background:linear-gradient(120deg,#0033C9 0%,#0a4fe0 52%,#1266e6 100%); border-radius:24px; padding:44px 46px; box-shadow:0 22px 60px rgba(0,40,150,.34); position:relative; overflow:hidden; color:#fff;')}>
            <div style={css('position:absolute; right:-6%; top:-40%; width:520px; height:520px; border-radius:50%; background:radial-gradient(circle,rgba(0,207,106,.4) 0%,rgba(0,207,106,0) 66%); filter:blur(30px); pointer-events:none;')}></div>
            <div style={css('position:absolute; left:24%; bottom:-60%; width:560px; height:420px; border-radius:50%; background:radial-gradient(circle,rgba(90,170,255,.5) 0%,rgba(90,170,255,0) 68%); filter:blur(40px); pointer-events:none;')}></div>
            <div style={css('flex:1 1 360px; min-width:280px; position:relative; z-index:2;')}>
              <h2 style={css(`margin:0; font:900 27px/1.15 ${FONT}; letter-spacing:-.01em; color:#fff;`)}>Share your AI use case with Us</h2>
              <p style={css(`margin:14px 0 0; font:400 15px/1.6 ${FONT}; color:rgba(255,255,255,.82);`)}>{t('Bạn đang dùng AI để giải quyết công việc hiệu quả hơn?')} {t('Hãy chia sẻ để cùng nhau học hỏi và tạo ra giá trị lớn hơn cho Zalopay.')}</p>
            </div>
            <div style={css('flex:1 1 320px; min-width:260px; display:flex; align-items:flex-start; justify-content:center; gap:6px; position:relative; z-index:2;')}>
              {steps.map((item, i) => (
                <Fragment key={i}>
                  {item.showArrow && (
                    <svg width="22" height="22" style={{ flex: 'none', marginTop: 42 }} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                  )}
                  <div style={css('width:170px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:13px;')}>
                    <div style={css(`position:relative; width:64px; height:64px; border-radius:18px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.3); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; box-shadow:0 0 34px ${item.glow}, inset 0 1px 0 rgba(255,255,255,.35);`)}>
                      {item.icon}
                    </div>
                    <div style={css(`font:800 15px ${FONT}; color:#fff;`)}>{item.title}</div>
                    <div style={css(`font:400 12.5px/1.5 ${FONT}; color:rgba(255,255,255,.72);`)}>{item.desc}</div>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  )
}
