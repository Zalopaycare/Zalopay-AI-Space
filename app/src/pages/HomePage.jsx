import { Fragment, useEffect, useRef, useState } from 'react'
import { renderMentions } from '../components/MentionField.jsx'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { api, relativeTime } from '../lib/api.js'
import Layout from '../components/Layout.jsx'
import ImageSlot from '../components/ImageSlot.jsx'
import { allCases, prdMeta, avatarColor } from '../data/useCases.js'
import { usePublishedUseCases, loadPublishedUseCases } from '../lib/publishedUseCases.js'
import logo from '../assets/zalopay-ai-space-logo.png'
import SpaceBackdrop from '../components/SpaceBackdrop.jsx'
import aiCloud from '../assets/ai-cloud.png'
import aiCube from '../assets/ai-cube.png'
import aiOpenai from '../assets/ai-openai.png'
import aiClaude from '../assets/ai-claude.png'
import CardActions from '../components/CardActions.jsx'
import TagRow from '../components/TagRow.jsx'
import PageActionBar from '../components/PageActionBar.jsx'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const AV = ['#2c5fff', '#00A352', '#6F0CE2', '#FF8D00', '#0033C9', '#00B7FF']
const FEATURED_IDS = ['c1', 'c2', 'c3', 'c4']
const AI_LOGOS = [
  { src: aiCloud, alt: 'Cloud terminal', w: 28, pos: { left: -100, top: 58 } },
  { src: aiCube, alt: 'Cursor', w: 22, pos: { left: -40, bottom: 60 } },
  { src: aiOpenai, alt: 'ChatGPT', w: 26, pos: { right: -98, top: 60 } },
  { src: aiClaude, alt: 'Claude', w: 26, pos: { right: -42, bottom: 60 } },
]

// The Pixar-style wordmark intro plays once per page load, not on every in-app visit to Home.
let introPlayed = false

const UFO_STARS = [
  { left: '4%', top: '6px', size: '2px', dur: '2.6s', delay: '-.4s' },
  { left: '14%', top: '38px', size: '3px', dur: '3.1s', delay: '-1.8s' },
  { left: '24%', top: '4px', size: '2px', dur: '2.2s', delay: '-.9s' },
  { left: '90%', top: '14px', size: '3px', dur: '2.8s', delay: '-2.2s' },
  { left: '80%', top: '44px', size: '2px', dur: '2.4s', delay: '-1.1s' },
  { left: '96%', top: '2px', size: '2px', dur: '3.4s', delay: '-.2s' },
  { left: '70%', top: '0px', size: '2px', dur: '2.9s', delay: '-1.6s' },
  { left: '38%', top: '10px', size: '2px', dur: '2.5s', delay: '-.6s' },
  { left: '46%', top: '46px', size: '2px', dur: '3.2s', delay: '-2.4s' },
  { left: '58%', top: '4px', size: '3px', dur: '2.7s', delay: '-1.3s' },
  { left: '63%', top: '40px', size: '2px', dur: '2.3s', delay: '-.2s' },
  { left: '32%', top: '48px', size: '2px', dur: '3.5s', delay: '-1.9s' },
  { left: '52%', top: '18px', size: '2px', dur: '2.9s', delay: '-.8s' },
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

// Accent/case-insensitive match so "tu dong" finds "Tự động".
const fold = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
const matches = (needle, ...fields) => fields.flat().some((f) => fold(f).includes(needle))
const SEARCH_LIMIT = 5

function replyLabel(n) {
  return n === 0 ? 'Chưa có comment' : n + ' comment'
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
  const [homeQuery, setHomeQuery] = useState('')
  // Height of the live search results, so the space backdrop's horizon moves down with the page.
  const resultsRef = useRef(null)
  const [resultsH, setResultsH] = useState(0)
  useEffect(() => {
    const el = resultsRef.current
    if (!el) { setResultsH(0); return }
    const ro = new ResizeObserver(() => setResultsH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  })
  const [playIntro] = useState(() => !introPlayed)
  useEffect(() => { introPlayed = true }, [])
  const [openMenuId, setOpenMenuId] = useState(null)
  const [copiedCardId, setCopiedCardId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [modalReply, setModalReply] = useState(null) // { answerId, parentId, authorName } | null
  const [modalReplyDraft, setModalReplyDraft] = useState('')
  const [modalThreads, setModalThreads] = useState(() => new Set())

  const patch = (id, updated) => setQuestions((qs) => qs.map((q) => (q.id === id ? updated : q)))

  useEffect(() => {
    if (!openMenuId) return
    const close = () => setOpenMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenuId])

  const copyCardLink = (e, ucId) => {
    e.stopPropagation()
    const url = window.location.origin + '/use-cases/' + ucId
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedCardId(ucId)
      setTimeout(() => setCopiedCardId((c) => (c === ucId ? null : c)), 1500)
    }).catch(() => {})
    setOpenMenuId(null)
  }

  const copyLink = (e, path, key) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(window.location.origin + path).then(() => {
      setCopiedCardId(key)
      setTimeout(() => setCopiedCardId((c) => (c === key ? null : c)), 1500)
    }).catch(() => {})
    setOpenMenuId(null)
  }

  // confirmDeleteId is either a use case id or 'q:<questionId>'.
  const confirmDelete = (key) => {
    const done = () => setConfirmDeleteId(null)
    if (key.startsWith('q:')) {
      const qid = key.slice(2)
      api.deleteQuestion(qid).then(() => { setQuestions((qs) => qs.filter((x) => x.id !== qid)); done() }).catch(done)
    } else {
      api.deleteUseCase(key).then(() => { loadPublishedUseCases(true); done() }).catch(done)
    }
  }

  useEffect(() => {
    api.listQuestions().then((d) => setQuestions(d.questions || [])).catch(() => {})
  }, [])

  const refreshUcMeta = (ucId) => api.useCaseMeta(ucId).then((d) => setUcMeta((s) => ({ ...s, [ucId]: d }))).catch(() => {})
  // Newest approved community use cases first, topped up with the built-in picks.
  const { version: pubV } = usePublishedUseCases()
  const featuredCases = [...allCases.filter((c) => c.submitted), ...FEATURED_IDS.map((fid) => allCases.find((c) => c.id === fid)).filter(Boolean)].slice(0, 3)
  useEffect(() => { featuredCases.forEach((c) => refreshUcMeta(c.id)) }, [pubV]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- trending questions (top 3 unresolved by helpfulness, then recency) ----
  const searchNeedle = fold(homeQuery.trim())
  const pick = (list) => Object.assign(list.slice(0, SEARCH_LIMIT), { total: list.length })
  const searchUc = searchNeedle ? pick(allCases.filter((c) => matches(searchNeedle, c.title, c.desc, c.author, c.tools || [], (prdMeta[c.id] || {}).topics || []))
    .map((c) => ({ id: c.id, title: c.title, sub: [c.author, ...(c.tools || [])].filter(Boolean).join(' · '), href: '/use-cases/' + c.id }))) : []
  const searchQ = searchNeedle ? pick(questions.filter((q) => matches(searchNeedle, q.title, q.body, q.author, q.topics || [], q.tools || []))
    .map((q) => ({ id: q.id, title: q.title, sub: [q.author, relativeTime(q.time), ...(q.topics || [])].filter(Boolean).join(' · '), href: '/questions#q=' + encodeURIComponent(q.id) }))) : []

  const trending = questions
    .filter((q) => !q.resolved)
    .slice()
    .sort((a, b) => helpfulTotal(b) - helpfulTotal(a) || tsNum(b.ts || b.time) - tsNum(a.ts || a.time))
    .slice(0, 3)
    .map((q) => ({
      ...q,
      timeLabel: relativeTime(q.time),
      avatarBg: q.avatarColor || AV[q.author.charCodeAt(0) % AV.length],
      cat: [].concat(q.category).filter(Boolean)[0] || '',
      helpfulTotal: helpfulTotal(q),
      replyLabel: replyLabel((q.answers || []).length),
      qHelpBorder: q.iHelpedQ ? '#B9CCF8' : '#DDE3EC',
      qHelpBg: q.iHelpedQ ? '#EAF1FF' : '#fff',
      qHelpFill: q.iHelpedQ ? '#2c5fff' : 'none',
      onLike: (e) => { e.stopPropagation(); requireLogin(() => api.reactQuestion(q.id).then((d) => patch(q.id, d.question)).catch(() => {})) },
      onOpen: () => setOpenQ(q.id),
      onSave: (e) => { e.stopPropagation(); requireLogin(() => api.saveQuestion(q.id).then((d) => patch(q.id, d.question)).catch(() => {})) },
      canDelete: !!user && q.authorId === user.id,
    }))

  // ---- question detail modal ----
  const modalSrc = openQ ? questions.find((q) => q.id === openQ) : null
  const modalAnswers = modalSrc ? (modalSrc.answers || []).map((a) => ({
    ...a,
    timeLabel: relativeTime(a.time),
    avatarBg: a.avatarColor || AV[a.author.charCodeAt(0) % AV.length],
    helpColor: a.iHelped ? '#2c5fff' : '#64748b',
    helpFill: a.iHelped ? '#2c5fff' : 'none',
    onHelpful: () => requireLogin(() => api.reactAnswer(modalSrc.id, a.id).then((d) => patch(modalSrc.id, d.question)).catch(() => {})),
  })) : []

  const closeModal = () => { setOpenQ(null); setModalDraft(''); setModalReply(null); setModalReplyDraft('') }
  const startModalReply = (answerId, parentId, authorName) => {
    setModalReply({ answerId, parentId, authorName })
    setModalReplyDraft('')
    if (parentId) setModalThreads((s) => new Set(s).add(parentId))
  }
  const toggleModalThread = (cid) => setModalThreads((s) => { const n = new Set(s); if (n.has(cid)) n.delete(cid); else n.add(cid); return n })
  const submitModalReply = () => {
    const body = modalReplyDraft.trim()
    if (!body || !modalReply || !modalSrc) return
    const { answerId, parentId } = modalReply
    requireLogin(() => api.postAnswerComment(modalSrc.id, answerId, body, parentId).then((d) => { patch(modalSrc.id, d.question); setModalReply(null); setModalReplyDraft('') }).catch(() => {}))
  }
  const renderModalReplyBox = (answerId, parentId) => (modalReply && modalReply.answerId === answerId && modalReply.parentId === parentId ? (
    <div style={css('display:flex; gap:9px; align-items:center; margin-top:10px;')}>
      <span style={css(`flex:none; width:26px; height:26px; border-radius:50%; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font:800 10px ${FONT};`)}>{user?.initials || '?'}</span>
      <input
        autoFocus
        value={modalReplyDraft}
        onChange={(e) => setModalReplyDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submitModalReply() }}
        placeholder={t('Reply comment của') + ' ' + modalReply.authorName + '...'}
        style={css(`flex:1; min-width:0; border:1px solid #DDE3EC; border-radius:999px; padding:8px 14px; font:400 13px ${FONT}; color:#0F172A; background:#fff; outline:none;`)}
      />
      <button onClick={() => { setModalReply(null); setModalReplyDraft('') }} style={css(`flex:none; height:32px; padding:0 12px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 12px ${FONT}; cursor:pointer;`)}>{t('Hủy')}</button>
      <button onClick={submitModalReply} style={css(`flex:none; height:32px; padding:0 14px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 12px ${FONT}; cursor:pointer; opacity:${modalReplyDraft.trim() ? 1 : 0.5};`)}>{t('Gửi')}</button>
    </div>
  ) : null)
  const postModalReply = () => {
    const body = modalDraft.trim()
    if (!body || !modalSrc) return
    requireLogin(() => api.postAnswer(modalSrc.id, body).then((d) => { patch(modalSrc.id, d.question); setModalDraft('') }).catch(() => {}))
  }

  // ---- featured use cases (real data, live helpful/save counts) ----
  const featured = featuredCases.map((c) => {
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
      helped: iHelped,
      canDelete: !!user && !!c.authorId && (c.authorId === user.id || !!user.isAdmin),
      canEdit: !!user && !!c.authorId && c.authorId === user.id,
      commentCount: meta && meta.comments ? meta.comments.length : 0,
    }
  })

  return (
    <Layout active="home">
      <div style={css('position:relative; width:100%; margin:0 auto; background:#04060d; color:#e8eefc;')}>
        <SpaceBackdrop arcTop={190 + resultsH} bg="#04060d" className={playIntro ? 'zp-backdrop-intro' : undefined} />

        {/* ============ WORDMARK ============ */}
        <section className={playIntro ? 'zp-intro' : undefined} style={css('position:relative; z-index:1; padding:14px 40px 70px; margin-bottom:-70px; background:transparent; text-align:center; overflow:hidden;')}>
          <div style={css('position:relative; max-width:320px; width:100%; margin:0 auto; height:32px;')}>
            {UFO_STARS.map((s, i) => (
              <span key={i} style={{ position: 'absolute', left: s.left, top: s.top, width: s.size, height: s.size, borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px 1px rgba(255,255,255,.75)', animation: `twinkle ${s.dur} ease-in-out infinite`, animationDelay: s.delay, pointerEvents: 'none' }}></span>
            ))}
            <div className="zp-ufo">
              <div style={css('position:relative; width:0; height:0;')}>
                <div style={css('position:absolute; left:0; top:24px; width:84px; height:96px; transform:translateX(-50%); clip-path:polygon(50% 0%, 100% 100%, 0% 100%); background:linear-gradient(180deg,rgba(180,225,255,.5) 0%,rgba(140,200,255,.12) 65%,rgba(140,200,255,0) 100%);')} className="zp-beam"></div>
                <svg width="60" height="32" viewBox="0 0 76 40" style={css('position:absolute; left:-30px; top:0; display:block; filter:drop-shadow(0 6px 14px rgba(0,0,0,.5));')}>
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
          <div style={css('position:relative; margin:0 auto; width:min(100%,320px);')}>
            <div className="zp-logo-ting" style={css('position:relative;')}>
              <div className="zp-flash"></div>
              <div className="zp-logo-reveal">
                <img src={logo} alt="Zalopay AI Space" style={css('position:relative; display:block; width:100%; height:auto;')} />
              </div>
              <svg className="zp-glint" width="72" height="72" viewBox="0 0 24 24"><path d="M12 0 C12.8 7.5 16.5 11.2 24 12 C16.5 12.8 12.8 16.5 12 24 C11.2 16.5 7.5 12.8 0 12 C7.5 11.2 11.2 7.5 12 0 Z" fill="#fff" /></svg>
            </div>
            {AI_LOGOS.map((l, i) => (
              <div key={l.alt} className="zp-ailogo-pos" style={{ ...l.pos, '--i': i }}>
                <div className="zp-ailogo"><img src={l.src} alt={l.alt} style={{ width: l.w, height: 'auto', display: 'block' }} /></div>
              </div>
            ))}
          </div>
          <p className="zp-tagline" style={css(`position:relative; margin:10px auto 0; max-width:760px; font:500 15px/1.5 ${FONT}; color:rgba(214,226,250,.86); text-wrap:balance;`)}>{t('Không gian cho các Zalopay Starter trao đổi kiến thức và khám phá cách ứng dụng AI trong công việc.')}</p>
        </section>

        <PageActionBar searchOnly query={homeQuery} onQuery={setHomeQuery} onSubmit={() => {}} placeholder="Tìm use case, câu hỏi, tác giả, công cụ..." />
        {searchNeedle && (
          <div ref={resultsRef} style={css('position:relative; z-index:5; padding:14px 40px 0;')}>
            <div style={css('max-width:760px; margin:0 auto; background:#ffffff; border:1px solid #E6EBF3; border-radius:20px; box-shadow:0 18px 44px rgba(0,0,0,.3); padding:8px 8px 10px;')}>
              {searchUc.length === 0 && searchQ.length === 0 ? (
                <div style={css(`padding:26px 16px; text-align:center; font:600 14px ${FONT}; color:#64748b;`)}>
                  {t('Chưa có kết quả cho')} "<span style={css('color:#0F172A;')}>{homeQuery.trim()}</span>"
                </div>
              ) : (
                [['Use case', searchUc, '/use-cases'], ['Câu hỏi', searchQ, '/questions']].filter(([, list]) => list.length).map(([label, list, base]) => (
                  <div key={label} style={css('padding:4px 0;')}>
                    <div style={css('display:flex; align-items:center; justify-content:space-between; padding:8px 12px 4px;')}>
                      <span style={css(`font:800 11.5px ${FONT}; letter-spacing:.05em; text-transform:uppercase; color:#94a3b8;`)}>{t(label)} · {list.total}</span>
                      {list.total > list.length && (
                        <button onClick={() => navigate(base + '?q=' + encodeURIComponent(homeQuery.trim()))} style={css(`border:none; background:none; padding:0; cursor:pointer; font:700 12.5px ${FONT}; color:#2c5fff;`)}>{t('Xem tất cả')} →</button>
                      )}
                    </div>
                    {list.map((r) => (
                      <button key={r.id} onClick={() => navigate(r.href)} className={hoverClass('background:#F3F6FC;')} style={css('display:flex; align-items:center; gap:12px; width:100%; padding:10px 12px; border:none; background:transparent; border-radius:12px; cursor:pointer; text-align:left; transition:background .12s;')}>
                        <span style={css(`flex:none; width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; background:${label === 'Use case' ? '#EAF0FF' : '#F1E7FF'}; color:${label === 'Use case' ? '#2c5fff' : '#6F0CE2'};`)}>
                          {label === 'Use case'
                            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>
                            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.1 9a3 3 0 1 1 4.5 2.6c-.9.5-1.6 1.2-1.6 2.4"></path><path d="M12 18h.01"></path><circle cx="12" cy="12" r="9.5"></circle></svg>}
                        </span>
                        <span style={css('flex:1; min-width:0;')}>
                          <span style={css(`display:block; font:700 14px/1.35 ${FONT}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{r.title}</span>
                          <span style={css(`display:block; margin-top:2px; font:400 12.5px ${FONT}; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{r.sub}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============ TRENDING QUESTIONS ============ */}
        <section id="waiting" style={css('position:relative; z-index:1; padding:22px 40px 16px; background:transparent;')}>
          <div style={css('max-width:760px; margin:0 auto;')}>
            <div style={css('display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:16px 24px;')}>
              <h2 style={css(`margin:0; font:900 34px/1.15 ${FONT}; letter-spacing:-.015em; background:linear-gradient(100deg,#ffffff 0%,#f1e4ff 35%,#d9b8ff 70%,#c89bff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 2px 6px rgba(12,4,40,.75)) drop-shadow(0 0 10px rgba(200,145,255,.75)) drop-shadow(0 0 26px rgba(170,100,255,.55));`)}>{t('Câu hỏi về AI đang thịnh hành')}</h2>
              <button
                onClick={() => navigate('/questions')}
                className={'zp-see-all ' + hoverClass('color:#e4ccff !important;')}
                style={css(`flex:none; white-space:nowrap; display:inline-flex; align-items:center; gap:8px; padding:6px 2px; border:none; background:transparent; color:#c89bff; font:800 15px ${FONT}; cursor:pointer; transition:color .16s;`)}
              >
                {t('Xem tất cả')}
                <svg className="zp-see-all-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              </button>
            </div>

            <div style={css('display:flex; flex-direction:column; gap:12px; margin-top:16px;')}>
              {trending.map((q) => (
                <div key={q.id} onClick={q.onOpen} className={'zp-card zp-card-q ' + hoverClass('transform:translateY(-3px); border-color:rgba(168,85,247,.75); box-shadow:0 0 0 1px rgba(168,85,247,.18), 0 0 22px rgba(168,85,247,.34), 0 22px 48px rgba(0,0,0,.36);')} style={css('position:relative; display:flex; flex-direction:column; min-width:0; background:#ffffff; border:1px solid rgba(168,85,247,.45); border-radius:20px; cursor:pointer; box-shadow:0 0 0 1px rgba(168,85,247,.10), 0 0 16px rgba(168,85,247,.22), 0 14px 36px rgba(0,0,0,.28); transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;')}>
                  <div style={css('display:flex; align-items:center; gap:7px; padding:12px 16px 0; flex-wrap:wrap;')}>
                    <span style={css(`display:inline-flex; align-items:center; gap:6px; height:23px; padding:0 10px 0 9px; border-radius:999px; background:#F1E7FF; color:#6F0CE2; font:800 11.5px ${FONT};`)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9.1 9a3 3 0 1 1 4.5 2.6c-.9.5-1.6 1.2-1.6 2.4"></path><path d="M12 18h.01"></path><circle cx="12" cy="12" r="9.5"></circle></svg>
                      {t('Câu hỏi')}
                    </span>
                    <span style={css(`margin-left:auto; display:inline-flex; align-items:center; height:23px; padding:0 10px; border-radius:999px; background:#FFF1E0; color:#B45300; font:700 11.5px ${FONT};`)}>{t('Đang chờ trả lời')}</span>
                  </div>
                  <div style={css('display:flex; align-items:center; gap:10px; padding:8px 16px 0;')}>
                    <span style={css(`flex:none; width:28px; height:28px; border-radius:50%; background:${q.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px ${FONT};`)}>{q.initials}</span>
                    <div style={css('flex:1; min-width:0; display:flex; align-items:center; gap:8px;')}>
                      <span style={css(`font:600 12.5px ${FONT}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{q.author}</span>
                      <span style={css(`font:400 12.5px ${FONT}; color:#94a3b8; white-space:nowrap;`)}>· {q.timeLabel}</span>
                    </div>
                    <div style={css('position:relative; flex:none;')}>
                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId((mid) => (mid === 'q:' + q.id ? null : 'q:' + q.id)) }} title={t('Thêm')} style={css('width:32px; height:32px; border:1px solid #E6EBF3; border-radius:12px; background:#fff; color:#5B6675; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="5" cy="12" r="1.4"></circle><circle cx="12" cy="12" r="1.4"></circle><circle cx="19" cy="12" r="1.4"></circle></svg>
                      </button>
                      {openMenuId === 'q:' + q.id && (
                        <div onClick={(e) => e.stopPropagation()} style={css('position:absolute; right:0; top:38px; width:200px; background:#fff; border:1px solid #E6EBF3; border-radius:14px; box-shadow:0 20px 46px rgba(15,23,42,.2); overflow:hidden; z-index:60; padding:6px;')}>
                          <button onClick={(e) => copyLink(e, '/questions#q=' + encodeURIComponent(q.id), 'q:' + q.id)} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#0F172A; text-align:left;`)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"></path></svg>
                            {copiedCardId === 'q:' + q.id ? t('Đã copy!') : t('Copy link')}
                          </button>
                          <button onClick={(e) => { q.onSave(e); setOpenMenuId(null) }} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#0F172A; text-align:left;`)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={q.saved ? '#00A352' : 'none'} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                            {q.saved ? t('Bỏ lưu') : t('Lưu câu hỏi')}
                          </button>
                          {q.canDelete && (
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); navigate('/questions#edit=' + encodeURIComponent(q.id)) }} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#0F172A; text-align:left;`)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
                              {t('Chỉnh sửa')}
                            </button>
                          )}
                          {q.canDelete && (
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId('q:' + q.id); setOpenMenuId(null) }} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#D8232A; text-align:left;`)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
                              {t('Xoá bài viết')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={css('flex:1; padding:6px 16px 0;')}>
                    {q.hasTitle !== false && <h3 className="zp-card-title" style={css(`margin:0; font:800 16px/1.35 ${FONT}; color:#0F172A; text-wrap:pretty;`)}>{q.title}</h3>}
                    <p className={q.hasTitle !== false ? undefined : 'zp-card-body'} style={css(`margin:${q.hasTitle !== false ? 5 : 2}px 0 0; font:${q.hasTitle !== false ? '400 13.5px' : '500 15px'}/1.55 ${FONT}; color:${q.hasTitle !== false ? '#3A4757' : '#0F172A'}; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;`)}>{renderMentions(q.body)}</p>
                    <button onClick={(e) => { e.stopPropagation(); navigate('/questions#q=' + encodeURIComponent(q.id)) }} className={hoverClass('color:#5B21B6 !important;')} style={css(`display:inline-flex; align-items:center; gap:5px; margin-top:6px; padding:0; border:none; background:transparent; cursor:pointer; font:700 13px ${FONT}; color:#7C3AED;`)}>
                      {t('Xem thêm')}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                  </div>
                  <div style={css('display:flex; align-items:center; gap:8px 12px; flex-wrap:wrap; margin:10px 16px 0; padding:9px 0 11px; border-top:1px solid #EEF1F7;')}>
                    <TagRow topics={q.topics || []} tools={q.tools || []} />
                    <CardActions compact helpful={q.helpfulTotal} helped={q.iHelpedQ} onHelpful={q.onLike} replies={(q.answers || []).length} onReply={q.onOpen} />
                  </div>
                </div>
              ))}

              {trending.length === 0 && (
                <div style={css('grid-column:1 / -1; padding:44px 24px; text-align:center; background:#fff; border:1px dashed #C9D4E6; border-radius:20px;')}>
                  <div style={css(`font:800 16px ${FONT}; color:#0F172A;`)}>{t('Không còn câu hỏi nào đang chờ')}</div>
                  <div style={css(`margin-top:8px; font:400 14px ${FONT}; color:#64748b;`)}>{t('Mọi câu hỏi đều đã có người trả lời. Bạn có thể đặt câu hỏi mới bất cứ lúc nào.')}</div>
                </div>
              )}
            </div>
          </div>

          {modalSrc && createPortal((
            <div onClick={closeModal} style={css('position:fixed; inset:0; z-index:3000; background:rgba(4,10,26,.62); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:40px 24px;')}>
              <div onClick={(e) => e.stopPropagation()} style={css('width:720px; max-width:100%; max-height:100%; overflow-y:auto; background:#ffffff; border-radius:22px; box-shadow:0 40px 100px rgba(3,12,40,.55);')}>
                <div style={css('display:flex; gap:14px; padding:24px 26px 0;')}>
                  <span style={css(`flex:none; width:44px; height:44px; border-radius:50%; background:${modalSrc.avatarColor || AV[modalSrc.author.charCodeAt(0) % AV.length]}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 14px ${FONT};`)}>{modalSrc.initials}</span>
                  <div style={css('flex:1; min-width:0;')}>
                    <div style={css('display:flex; align-items:center; gap:8px; flex-wrap:wrap;')}>
                      <span style={css(`font:600 13px ${FONT}; color:#0F172A;`)}>{modalSrc.author}</span>
                      <span style={css(`font:400 13px ${FONT}; color:#94a3b8;`)}>{relativeTime(modalSrc.time)}</span>
                      <span style={css(`display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${modalSrc.resolved ? '#E7F9F0' : '#FFF1E0'}; color:${modalSrc.resolved ? '#00893F' : '#B45300'}; font:700 11.5px ${FONT};`)}>{modalSrc.resolved ? 'Resolved' : t('Đang chờ trả lời')}</span>
                    </div>
                  </div>
                  <button onClick={closeModal} style={css('flex:none; width:36px; height:36px; border:1px solid #E6EBF3; border-radius:11px; background:#fff; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center;')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                  </button>
                </div>

                <div style={css('padding:16px 26px 0;')}>
                  {modalSrc.hasTitle !== false && <h3 style={css(`margin:0; font:800 21px/1.35 ${FONT}; color:#0F172A; text-wrap:pretty;`)}>{modalSrc.title}</h3>}
                  <p style={css(`margin:${modalSrc.hasTitle !== false ? 11 : 0}px 0 0; font:400 15px/1.65 ${FONT}; color:#3A4757; white-space:pre-wrap;`)}>{renderMentions(modalSrc.body)}</p>
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
                      <span style={css('color:#2c5fff;')}>{helpfulTotal(modalSrc)}</span> {t('Upvote')}
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
                          <span style={css(`font:600 12.5px ${FONT}; color:#0F172A;`)}>{a.author}</span>
                          <span style={css(`font:400 12px ${FONT}; color:#94a3b8;`)}>{a.timeLabel}</span>
                        </div>
                        <p style={css(`margin:7px 0 0; font:400 14px/1.6 ${FONT}; color:#3A4757;`)}>{renderMentions(a.body)}</p>
                        <div style={css('display:flex; align-items:center; gap:16px; margin-top:9px;')}>
                          <button onClick={a.onHelpful} style={css(`display:inline-flex; align-items:center; gap:7px; border:none; background:transparent; padding:0; cursor:pointer; font:700 12.5px ${FONT}; color:${a.helpColor};`)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill={a.helpFill} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.5 3.2L13.6 9H19a2.4 2.4 0 0 1 2.3 3l-1.8 7.3A2.4 2.4 0 0 1 17.2 22z"></path><path d="M7 11H3v11h4"></path></svg>
                            {t('Like')} · {a.helpful}
                          </button>
                          <button onClick={() => startModalReply(a.id, null, a.author)} style={css(`display:inline-flex; align-items:center; gap:6px; border:none; background:transparent; padding:0; cursor:pointer; font:700 12.5px ${FONT}; color:#64748b;`)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            {t('Reply')}{a.comments && a.comments.length ? ' · ' + a.comments.length : ''}
                          </button>
                        </div>
                        {(a.comments || []).filter((c) => !c.parentId).map((c) => {
                          const replies = a.comments.filter((r) => r.parentId === c.id)
                          const open = modalThreads.has(c.id)
                          return (
                            <div key={c.id} style={css('margin-top:12px; padding-left:12px; border-left:2px solid #E2E8F5;')}>
                              <div style={css('display:flex; gap:9px;')}>
                                <span style={css(`flex:none; width:26px; height:26px; border-radius:50%; background:${c.avatarColor || AV[c.author.charCodeAt(0) % AV.length]}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 10px ${FONT};`)}>{c.initials}</span>
                                <div style={css('flex:1; min-width:0;')}>
                                  <div style={css('display:flex; align-items:center; gap:8px;')}>
                                    <span style={css(`font:600 12px ${FONT}; color:#0F172A;`)}>{c.author}</span>
                                    <span style={css(`font:400 11.5px ${FONT}; color:#94a3b8;`)}>{relativeTime(c.time)}</span>
                                  </div>
                                  <div style={css(`margin-top:3px; font:400 13.5px/1.55 ${FONT}; color:#3A4757;`)}>{renderMentions(c.body)}</div>
                                  <button onClick={() => startModalReply(a.id, c.id, c.author)} style={css(`margin-top:5px; border:none; background:transparent; padding:0; cursor:pointer; font:700 12px ${FONT}; color:#64748b;`)}>{t('Reply')}</button>
                                </div>
                              </div>
                              {replies.length > 0 && (
                                <button onClick={() => toggleModalThread(c.id)} style={css(`margin:8px 0 0 35px; border:none; background:transparent; padding:0; cursor:pointer; display:flex; align-items:center; gap:6px; font:700 12px ${FONT}; color:#2c5fff;`)}>
                                  <span style={css('width:20px; height:1px; background:#CBD5E1; display:inline-block;')}></span>
                                  {open ? t('Ẩn comment') : t('Xem') + ' ' + replies.length + ' ' + t('comment')}
                                </button>
                              )}
                              {open && replies.map((r) => (
                                <div key={r.id} style={css('display:flex; gap:9px; margin:10px 0 0 35px;')}>
                                  <span style={css(`flex:none; width:22px; height:22px; border-radius:50%; background:${r.avatarColor || AV[r.author.charCodeAt(0) % AV.length]}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 9px ${FONT};`)}>{r.initials}</span>
                                  <div style={css('flex:1; min-width:0;')}>
                                    <div style={css('display:flex; align-items:center; gap:8px;')}>
                                      <span style={css(`font:600 12px ${FONT}; color:#0F172A;`)}>{r.author}</span>
                                      <span style={css(`font:400 11px ${FONT}; color:#94a3b8;`)}>{relativeTime(r.time)}</span>
                                    </div>
                                    <div style={css(`margin-top:3px; font:400 13px/1.55 ${FONT}; color:#3A4757;`)}>{renderMentions(r.body)}</div>
                                    <button onClick={() => startModalReply(a.id, c.id, r.author)} style={css(`margin-top:4px; border:none; background:transparent; padding:0; cursor:pointer; font:700 11.5px ${FONT}; color:#64748b;`)}>{t('Reply')}</button>
                                  </div>
                                </div>
                              ))}
                              <div style={css('margin-left:35px;')}>{renderModalReplyBox(a.id, c.id)}</div>
                            </div>
                          )
                        })}
                        {renderModalReplyBox(a.id, null)}
                      </div>
                    </div>
                  ))}
                  {modalAnswers.length === 0 && (
                    <div style={css(`padding:16px 0 6px; text-align:center; font:600 13px ${FONT}; color:#94a3b8;`)}>{t('Chưa có comment nào. Comment đầu tiên thường giúp ích nhất.')}</div>
                  )}

                  <div style={css('display:flex; gap:12px; margin-top:16px;')}>
                    <span style={css(`flex:none; width:34px; height:34px; border-radius:50%; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px ${FONT};`)}>{user?.initials || '?'}</span>
                    <div style={{ flex: 1 }}>
                      <textarea value={modalDraft} onChange={(e) => setModalDraft(e.target.value)} rows={3} placeholder={t('Viết comment của bạn...')} style={css(`width:100%; box-sizing:border-box; border:1px solid #DDE3EC; border-radius:14px; padding:12px 14px; font:400 14px/1.6 ${FONT}; color:#0F172A; background:#fff; outline:none; resize:vertical;`)}></textarea>
                      <div style={css('display:flex; align-items:center; margin-top:10px;')}>
                        <button onClick={() => navigate(`/questions#q=${modalSrc.id}`)} style={css(`font:700 12.5px ${FONT}; color:#3366F0; text-decoration:none; background:none; border:none; cursor:pointer; padding:0;`)}>{t('Mở trong Questions')}</button>
                        <button onClick={postModalReply} style={css(`margin-left:auto; height:40px; padding:0 20px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 13.5px ${FONT}; cursor:pointer; opacity:${modalDraft.trim() ? 1 : 0.5};`)}>
                          {t('Đăng comment')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ), document.body)}
        </section>

        {/* ============ FEATURED USE CASES ============ */}
        <section id="featured" style={css('position:relative; padding:24px 40px 36px; background:linear-gradient(180deg,#05080f 0%,#070c1b 55%,#04060d 100%);')}>
          <div style={css('max-width:760px; margin:0 auto;')}>
            <div style={css('display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:16px 24px;')}>
              <h2 style={css(`font:900 34px/1.15 ${FONT}; letter-spacing:-.015em; margin:0; background:linear-gradient(100deg,#ffffff 0%,#dce9ff 35%,#9fc2ff 70%,#78a8ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 2px 6px rgba(2,8,30,.75)) drop-shadow(0 0 10px rgba(110,165,255,.75)) drop-shadow(0 0 26px rgba(70,130,255,.55));`)}>{t('Use case nổi bật')}</h2>
              <button
                onClick={() => navigate('/use-cases')}
                className={'zp-see-all ' + hoverClass('color:#9fd0ff;')}
                style={css(`flex:none; white-space:nowrap; display:inline-flex; align-items:center; gap:8px; padding:6px 2px; border:none; background:transparent; color:#6ea8ff; font:800 15px ${FONT}; cursor:pointer; transition:color .16s;`)}
              >
                {t('Xem tất cả')}
                <svg className="zp-see-all-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              </button>
            </div>

            <div style={css('display:flex; flex-direction:column; gap:12px; margin-top:16px;')}>
              {featured.map((item) => (
                <div key={item.id} onClick={item.onOpen} className={'zp-card ' + hoverClass('transform:translateY(-3px); border-color:rgba(80,140,255,.8); box-shadow:0 0 0 1px rgba(60,120,255,.18), 0 0 22px rgba(60,120,255,.34), 0 18px 40px rgba(0,0,0,.3);')} style={css('position:relative; display:flex; flex-direction:column; background:#ffffff; border:1px solid rgba(60,120,255,.45); border-radius:18px; padding:14px 16px; cursor:pointer; box-shadow:0 0 0 1px rgba(60,120,255,.10), 0 0 16px rgba(60,120,255,.22), 0 10px 26px rgba(0,0,0,.2); transition:transform .18s ease,box-shadow .18s ease;')}>
                  <div style={css('display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;')}>
                    <span style={css('display:inline-flex; align-items:center; gap:6px; height:23px; padding:0 10px 0 9px; border-radius:999px; background:#E4ECFF; color:#2c5fff; font:800 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></svg>
                      {t('Use case')}
                    </span>
                    <div style={css('position:relative; flex:none;')}>
                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId((mid) => (mid === item.id ? null : item.id)) }} title={t('Thêm')} style={css('width:32px; height:32px; border-radius:10px; background:#fff; border:1px solid #E6EBF3; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0; color:#5B6675;')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="5" cy="12" r="1.4"></circle><circle cx="12" cy="12" r="1.4"></circle><circle cx="19" cy="12" r="1.4"></circle></svg>
                      </button>
                      {openMenuId === item.id && (
                        <div onClick={(e) => e.stopPropagation()} style={css('position:absolute; right:0; top:38px; width:190px; background:#fff; border:1px solid #E6EBF3; border-radius:14px; box-shadow:0 20px 46px rgba(15,23,42,.2); overflow:hidden; z-index:60; padding:6px;')}>
                          <button onClick={(e) => copyCardLink(e, item.id)} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#0F172A; text-align:left;`)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"></path></svg>
                            {copiedCardId === item.id ? t('Đã copy!') : t('Copy link')}
                          </button>
                          <button onClick={(e) => { item.onSaveToggle(e); setOpenMenuId(null) }} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#0F172A; text-align:left;`)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={item.saveFill} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                            {item.saveFill === 'currentColor' ? t('Bỏ lưu') : t('Lưu use case')}
                          </button>
                          {item.canEdit && (
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); navigate('/use-cases?edit=' + item.id) }} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#0F172A; text-align:left;`)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
                              {t('Chỉnh sửa')}
                            </button>
                          )}
                          {item.canDelete && (
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); setOpenMenuId(null) }} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#D8232A; text-align:left;`)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
                              {t('Xoá bài viết')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={css('display:flex; gap:13px;')}>
                    <div onClick={(e) => e.stopPropagation()} style={css('position:relative; flex:none; width:76px; height:76px; border-radius:12px; overflow:hidden; background:linear-gradient(160deg,#e9eef7,#dde6f2);')}>
                      <ImageSlot id={'lib-' + item.id} shape="rect" placeholder="ảnh" />
                    </div>
                    <div style={css('flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center;')}>
                      <h3 className="zp-card-title" style={css(`margin:0; font:800 15px/1.38 ${FONT}; color:#0F172A; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;`)}>{item.title}</h3>
                      <p style={css('margin:4px 0 0; font-size:13px; line-height:1.5; color:#3A4757; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;')}>{item.desc}</p>
                    </div>
                  </div>
                  <div style={css('display:flex; align-items:center; gap:8px; min-width:0; margin-top:10px;')}>
                    <span style={css(`flex:none; width:28px; height:28px; border-radius:50%; background:${item.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px ${FONT};`)}>{item.initials}</span>
                    <div style={css('display:flex; flex-direction:column; min-width:0;')}>
                      <span style={css(`font:600 12.5px ${FONT}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{item.author}</span>
                    </div>
                  </div>
                  <TagRow topics={(prdMeta[item.id] || {}).topics || []} tools={item.tools} style={{ marginTop: 10 }} />
                  <div style={css('display:flex; align-items:center; gap:8px; margin-top:12px; padding-top:10px; border-top:1px solid #EEF1F7;')}>
                    <button onClick={(e) => { e.stopPropagation(); item.onOpen() }} className={hoverClass('gap:9px;')} style={css(`flex:none; display:inline-flex; align-items:center; gap:6px; border:none; background:transparent; padding:0; cursor:pointer; font:800 12.5px ${FONT}; color:#2c5fff; white-space:nowrap; transition:gap .16s;`)}>
                      {t('Xem Use Case')}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                    <CardActions compact helpful={item.helpful} helped={item.helped} onHelpful={item.onHelpful} replies={item.commentCount} onReply={() => navigate(`/use-cases/${item.id}#comments`)} />
                  </div>
                </div>
              ))}

            </div>
          </div>
        </section>

      </div>

      {confirmDeleteId && (
        <div onClick={() => setConfirmDeleteId(null)} style={css('position:fixed; inset:0; z-index:5000; background:rgba(4,10,26,.66); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:24px;')}>
          <div onClick={(e) => e.stopPropagation()} style={css('width:360px; max-width:100%; background:#fff; border-radius:20px; padding:26px 24px; box-shadow:0 30px 70px rgba(3,12,40,.5); text-align:center;')}>
            <div style={css('width:52px; height:52px; margin:0 auto; border-radius:50%; background:#FFECEC; color:#D8232A; display:flex; align-items:center; justify-content:center;')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
            </div>
            <div style={css(`margin-top:16px; font:800 16px ${FONT}; color:#0F172A;`)}>{t('Bạn muốn xóa vĩnh viễn bài viết này?')}</div>
            <div style={css(`margin-top:8px; font:400 13.5px/1.5 ${FONT}; color:#64748b;`)}>{t('Hành động này không thể hoàn tác.')}</div>
            <div style={css('display:flex; gap:10px; margin-top:22px;')}>
              <button onClick={() => setConfirmDeleteId(null)} style={css(`flex:1; height:44px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 14px ${FONT}; cursor:pointer;`)}>{t('Quay lại')}</button>
              <button onClick={() => confirmDelete(confirmDeleteId)} style={css(`flex:1; height:44px; border:none; border-radius:999px; background:#D8232A; color:#fff; font:700 14px ${FONT}; cursor:pointer;`)}>{t('Đồng ý')}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
