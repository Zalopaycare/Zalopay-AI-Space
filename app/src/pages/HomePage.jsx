import { rememberReturn, useScrollReturn } from '../lib/scrollReturn.js'
import AnonTag from '../components/AnonTag.jsx'
import FileLinks from '../components/FileLinks.jsx'
import { askRemovalReason } from '../components/RemovalReason.jsx'
import { Fragment, useEffect, useRef, useState } from 'react'
import { copyWithToast } from '../lib/clipboard.js'
import { useTitle } from '../hooks/useTitle.js'
import CoverImage from '../components/CoverImage.jsx'
import { renderMentions } from '../components/MentionField.jsx'
import { useDialog } from '../hooks/useDialog.js'
import { useNavigate } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { api, threadTime } from '../lib/api.js'
import Layout from '../components/Layout.jsx'
import { allCases, prdMeta, avatarColor, avatarPhoto, newestFirst, postedShort } from '../data/useCases.js'
import { avatarPhotoCss } from '../components/Avatar.jsx'
import { usePublishedUseCases, loadPublishedUseCases } from '../lib/publishedUseCases.js'
import SpaceBackdrop from '../components/SpaceBackdrop.jsx'
import HeroWordmark from '../components/HeroWordmark.jsx'
import CardActions from '../components/CardActions.jsx'
import TagRow from '../components/TagRow.jsx'
import PageActionBar from '../components/PageActionBar.jsx'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const AV = ['#2c5fff', '#00A352', '#6F0CE2', '#FF8D00', '#0033C9', '#00B7FF']

// The Pixar-style wordmark intro plays once per page load, not on every in-app visit to Home.
let introPlayed = false



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
  return n + ' Bình luận'
}

const tsNum = (v) => new Date(String(v).includes('T') ? v : String(v).replace(' ', 'T') + 'Z').getTime()
const helpfulTotal = (q) => (q.answers || []).reduce((n, a) => n + (a.helpful || 0), 0) + (q.qHelpful || 0)

export default function HomePage() {
  useTitle('')
  const navigate = useNavigate()
  const { t } = useI18n()
  const { user, requireLogin } = useAuth()

  const [questions, setQuestions] = useState([])
  const [ucMeta, setUcMeta] = useState({})
  const [homeQuery, setHomeQuery] = useState('')
  // Search results panel: closes on Esc / click outside, reopens on focus or typing.
  const [searchOpen, setSearchOpen] = useState(true)
  const [activeIdx, setActiveIdx] = useState(-1)
  const searchWrapRef = useRef(null)
  const searchInputRef = useRef(null)
  useEffect(() => {
    if (!searchOpen) return
    const onDown = (e) => { if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) setSearchOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [searchOpen])
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
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

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
    copyWithToast(url, 'Đã sao chép link ✓')
    setOpenMenuId(null)
  }

  const copyLink = (e, path, key) => {
    e.stopPropagation()
    copyWithToast(window.location.origin + path, 'Đã sao chép link ✓')
    setOpenMenuId(null)
  }

  // confirmDeleteId is either a use case id or 'q:<questionId>'.
  const confirmDelete = (key, reason) => {
    const done = () => setConfirmDeleteId(null)
    if (key.startsWith('q:')) {
      const qid = key.slice(2)
      api.deleteQuestion(qid, reason).then(() => { setQuestions((qs) => qs.filter((x) => x.id !== qid)); done() }).catch(done)
    } else {
      api.deleteUseCase(key, reason).then(() => { loadPublishedUseCases(true); done() }).catch(done)
    }
  }

  // Again when the signed-in user changes their photo, so their own posts pick it up at once.
  useEffect(() => {
    api.listQuestions().then((d) => setQuestions(d.questions || [])).catch(() => {})
  }, [user?.avatarUrl])

  const refreshUcMeta = (ucId) => api.useCaseMeta(ucId).then((d) => setUcMeta((s) => ({ ...s, [ucId]: d }))).catch(() => {})
  // Newest approved community use cases first, topped up with the built-in picks.
  const { version: pubV, loaded: pubLoaded } = usePublishedUseCases()
  useScrollReturn(pubLoaded ? pubV + 1 : false)
  const featuredCases = newestFirst(allCases).slice(0, 3) // same order as the Library's "Mới nhất"
  useEffect(() => { featuredCases.forEach((c) => refreshUcMeta(c.id)) }, [pubV]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- latest questions (3 newest, any status — same order as /questions "Mới nhất") ----
  const searchNeedle = fold(homeQuery.trim())
  const pick = (list) => Object.assign(list.slice(0, SEARCH_LIMIT), { total: list.length })
  const searchUc = searchNeedle ? pick(allCases.filter((c) => matches(searchNeedle, c.title, c.desc, c.author, c.tools || [], (prdMeta[c.id] || {}).topics || []))
    .map((c) => ({ id: c.id, title: c.title, sub: [c.author, ...(c.tools || [])].filter(Boolean).join(' · '), href: '/use-cases/' + c.id }))) : []
  const searchQ = searchNeedle ? pick(questions.filter((q) => matches(searchNeedle, q.title, q.body, q.author, q.topics || [], q.tools || []))
    .map((q) => ({ id: q.id, title: q.title, sub: [q.author, threadTime(q.time), ...(q.topics || [])].filter(Boolean).join(' · '), href: '/questions/' + encodeURIComponent(q.id) }))) : []

  // Keyboard: ↑/↓ walk the results, Enter opens the highlighted one, or (none highlighted) the page
  // with more matches pre-filtered by the query; Esc closes the panel.
  const flatResults = [...searchQ, ...searchUc] // same order as the nav: AI Thread, then Use Case Library
  const onSearchKey = (e) => {
    if (e.key === 'Escape') { if (searchOpen && searchNeedle) { e.preventDefault(); setSearchOpen(false); setActiveIdx(-1) } return }
    if (!searchNeedle) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSearchOpen(true); setActiveIdx((i) => Math.min(flatResults.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(-1, i - 1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = searchOpen && activeIdx >= 0 ? flatResults[activeIdx] : null
      if (hit) navigate(hit.href)
      else navigate(((searchQ.total || 0) > (searchUc.total || 0) ? '/questions' : '/use-cases') + '?q=' + encodeURIComponent(homeQuery.trim()))
    }
  }
  const showResults = !!searchNeedle && searchOpen

  const trending = questions
    .slice()
    .sort((a, b) => tsNum(b.ts || b.time) - tsNum(a.ts || a.time)) // newest first, matching the "mới nhất" heading
    .slice(0, 3)
    .map((q) => ({
      ...q,
      timeLabel: threadTime(q.time),
      avatarBg: q.avatarColor || AV[q.author.charCodeAt(0) % AV.length],
      cat: [].concat(q.category).filter(Boolean)[0] || '',
      helpfulTotal: helpfulTotal(q),
      replyLabel: replyLabel((q.answers || []).length),
      qHelpBorder: q.iHelpedQ ? '#B9CCF8' : '#DDE3EC',
      qHelpBg: q.iHelpedQ ? '#EAF1FF' : '#fff',
      qHelpFill: q.iHelpedQ ? '#2c5fff' : 'none',
      onLike: (e) => { e.stopPropagation(); requireLogin(() => api.reactQuestion(q.id).then((d) => patch(q.id, d.question)).catch(() => {})) },
      onOpen: () => navigate('/questions/' + encodeURIComponent(q.id)),
      onSave: (e) => { e.stopPropagation(); requireLogin(() => api.saveQuestion(q.id).then((d) => patch(q.id, d.question)).catch(() => {})) },
      canEdit: !!user && q.authorId === user.id,
      // Admins can remove any question (the server allows it); only the author can edit.
      canDelete: !!user && (q.authorId === user.id || !!user.isAdmin),
    }))

  const homeDelDialog = useDialog(!!confirmDeleteId, () => setConfirmDeleteId(null), t('Xác nhận xoá'))

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
      avatarUrl: avatarPhoto(c.author),
      saved, helpful,
      saveColor: saved ? '#00893F' : '#5B6675',
      saveFill: saved ? 'currentColor' : 'none',
      helpBorder: iHelped ? '#B9CCF8' : '#DDE3EC',
      helpBg: iHelped ? '#EAF1FF' : '#fff',
      helpColor: iHelped ? '#2c5fff' : '#3A4757',
      helpFill: iHelped ? 'currentColor' : 'none',
      onSaveToggle: (e) => { e.stopPropagation(); requireLogin(() => api.saveUseCase(c.id).then(() => refreshUcMeta(c.id)).catch(() => {})) },
      onHelpful: (e) => { e.stopPropagation(); requireLogin(() => api.reactUseCase(c.id).then(() => refreshUcMeta(c.id)).catch(() => {})) },
      onOpen: () => { rememberReturn(c.id); navigate(`/use-cases/${c.id}`) },
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
        <section className={playIntro ? 'zp-intro' : undefined} style={css('position:relative; z-index:1; padding:14px var(--zp-gutter) 70px; margin-bottom:-70px; background:transparent; text-align:center; overflow:hidden;')}>
          <HeroWordmark />
          <p className="zp-tagline" style={css(`position:relative; margin:10px auto 0; max-width:760px; font:500 15px/1.5 ${FONT}; color:rgba(214,226,250,.86); text-wrap:balance;`)}>{t('Không gian cho các Zalopay Starter trao đổi kiến thức và khám phá cách ứng dụng AI trong công việc.')}</p>
        </section>

        <div ref={searchWrapRef}>
        <PageActionBar
          ref={searchInputRef}
          searchOnly
          query={homeQuery}
          onQuery={(v) => { setHomeQuery(v); setSearchOpen(true); setActiveIdx(-1) }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={onSearchKey}
          onSubmit={() => {}}
          inputProps={{ onClick: () => setSearchOpen(true), role: 'combobox', 'aria-expanded': showResults, 'aria-controls': 'home-search-results', 'aria-activedescendant': activeIdx >= 0 ? 'home-sr-' + activeIdx : undefined }}
          placeholder="Tìm use case, câu hỏi, tác giả, công cụ..."
        />
        {showResults && (
          <div ref={resultsRef} id="home-search-results" role="listbox" style={css('position:relative; z-index:5; padding:14px var(--zp-gutter) 0;')}>
            <div style={css('max-width:760px; margin:0 auto; background:#ffffff; border:1px solid #E6EBF3; border-radius:20px; box-shadow:0 18px 44px rgba(0,0,0,.3); padding:8px 8px 10px;')}>
              {searchUc.length === 0 && searchQ.length === 0 ? (
                <div style={css(`padding:26px 16px; text-align:center; font:600 14px ${FONT}; color:#64748b;`)}>
                  {t('Chưa có kết quả cho')} "<span style={css('color:#0F172A;')}>{homeQuery.trim()}</span>"
                </div>
              ) : (
                [['AI Thread', searchQ, '/questions'], ['Use case', searchUc, '/use-cases']].filter(([, list]) => list.length).map(([label, list, base]) => (
                  <div key={label} style={css('padding:4px 0;')}>
                    <div style={css('display:flex; align-items:center; justify-content:space-between; padding:8px 12px 4px;')}>
                      <span style={css(`font:800 11.5px ${FONT}; letter-spacing:.05em; text-transform:uppercase; color:#94a3b8;`)}>{t(label)} · {list.total}</span>
                      {list.total > list.length && (
                        <button onClick={() => navigate(base + '?q=' + encodeURIComponent(homeQuery.trim()))} style={css(`border:none; background:none; padding:0; cursor:pointer; font:700 12.5px ${FONT}; color:#2c5fff;`)}>{t('Xem tất cả')} →</button>
                      )}
                    </div>
                    {list.map((r) => {
                      const idx = flatResults.indexOf(r)
                      return (
                      <button key={r.id} id={'home-sr-' + idx} role="option" aria-selected={idx === activeIdx} onMouseEnter={() => setActiveIdx(idx)} onClick={() => navigate(r.href)} className={hoverClass('background:#F3F6FC;')} style={css(`display:flex; align-items:center; gap:12px; width:100%; padding:10px 12px; border:none; background:${idx === activeIdx ? '#EEF3FF' : 'transparent'}; border-radius:12px; cursor:pointer; text-align:left; transition:background .12s;`)}>
                        <span style={css(`flex:none; width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; background:${label === 'Use case' ? '#EAF0FF' : '#F1E7FF'}; color:${label === 'Use case' ? '#2c5fff' : '#6F0CE2'};`)}>
                          {label === 'Use case'
                            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>
                            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M7 8h10"></path><path d="M7 12h6"></path></svg>}
                        </span>
                        <span style={css('flex:1; min-width:0;')}>
                          <span style={css(`display:block; font:700 14px/1.35 ${FONT}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{r.title}</span>
                          <span style={css(`display:block; margin-top:2px; font:400 12.5px var(--zp-font-text); color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{r.sub}</span>
                        </span>
                      </button>
                      )
                    })}
                  </div>
                ))
              )}
              <div style={css(`padding:8px 12px 2px; font:500 12px ${FONT}; color:#94a3b8;`)}>{t('↑ ↓ để chọn · Enter để mở · Esc để đóng')}</div>
            </div>
          </div>
        )}
        </div>

        {/* ============ TRENDING QUESTIONS ============ */}
        <section id="waiting" style={css('position:relative; z-index:1; padding:22px var(--zp-gutter) 16px; background:transparent;')}>
          <div style={css('max-width:760px; margin:0 auto;')}>
            <div style={css('display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:16px 24px;')}>
              <h2 style={css(`margin:0; font:900 34px/1.15 ${FONT}; letter-spacing:-.015em; background:linear-gradient(100deg,#ffffff 0%,#f1e4ff 35%,#d9b8ff 70%,#c89bff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 2px 6px rgba(12,4,40,.75)) drop-shadow(0 0 10px rgba(200,145,255,.75)) drop-shadow(0 0 26px rgba(170,100,255,.55));`)}>{t('Các câu hỏi về AI mới nhất')}</h2>
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M7 8h10"></path><path d="M7 12h6"></path></svg>
                      {t('Thread')}
                    </span>
                    <span style={css(`margin-left:auto; display:inline-flex; align-items:center; height:23px; padding:0 10px; border-radius:999px; background:${(q.answers || []).length ? '#E7F9F0' : '#FFF1E0'}; color:${(q.answers || []).length ? '#00893F' : '#B45300'}; font:700 11.5px ${FONT};`)}>{(q.answers || []).length ? t('Đã trả lời') : t('Đang chờ trả lời')}</span>
                  </div>
                  <div style={css('display:flex; align-items:center; gap:10px; padding:8px 16px 0;')}>
                    <span style={css(`flex:none; width:28px; height:28px; border-radius:50%; background:${q.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px ${FONT};${avatarPhotoCss(q.avatarUrl)}`)}>{q.initials}</span>
                    <div style={css('flex:1; min-width:0; display:flex; align-items:center; gap:8px;')}>
                      <span style={css(`font:600 12.5px ${FONT}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{q.author}</span><AnonTag p={q} />
                      <span style={css(`font:400 12.5px var(--zp-font-text); color:#94a3b8; white-space:nowrap;`)}>· {q.timeLabel}</span>
                    </div>
                    <div style={css('position:relative; flex:none;')}>
                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId((mid) => (mid === 'q:' + q.id ? null : 'q:' + q.id)) }} title={t('Thêm')} aria-label={t('Tuỳ chọn khác')} aria-haspopup="menu" style={css('width:32px; height:32px; border:1px solid #E6EBF3; border-radius:12px; background:#fff; color:#5B6675; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="5" cy="12" r="1.4"></circle><circle cx="12" cy="12" r="1.4"></circle><circle cx="19" cy="12" r="1.4"></circle></svg>
                      </button>
                      {openMenuId === 'q:' + q.id && (
                        <div role="menu" onClick={(e) => e.stopPropagation()} style={css('position:absolute; right:0; top:38px; width:200px; background:#fff; border:1px solid #E6EBF3; border-radius:14px; box-shadow:0 20px 46px rgba(15,23,42,.2); overflow:hidden; z-index:60; padding:6px;')}>
                          <button onClick={(e) => copyLink(e, '/questions/' + encodeURIComponent(q.id), 'q:' + q.id)} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#0F172A; text-align:left;`)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"></path></svg>
                            {t('Sao chép link')}
                          </button>
                          <button onClick={(e) => { q.onSave(e); setOpenMenuId(null) }} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#0F172A; text-align:left;`)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={q.saved ? '#00A352' : 'none'} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                            {q.saved ? t('Bỏ lưu') : t('Lưu câu hỏi')}
                          </button>
                          {q.canEdit && (
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); navigate('/questions#edit=' + encodeURIComponent(q.id)) }} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#0F172A; text-align:left;`)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
                              {t('Chỉnh sửa')}
                            </button>
                          )}
                          {q.canDelete && (
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); if (q.canEdit) setConfirmDeleteId('q:' + q.id); else askRemovalReason({ what: 'câu hỏi', title: q.title }).then((r) => r && confirmDelete('q:' + q.id, r)) }} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#D8232A; text-align:left;`)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
                              {t('Xoá bài viết')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={css('flex:1; padding:6px 16px 0;')}>
                    {q.hasTitle !== false && <h3 className="zp-card-title" style={css(`margin:0; font:800 15px/1.38 ${FONT}; color:#0F172A; text-wrap:pretty;`)}>{q.title}</h3>}
                    <p className={q.hasTitle !== false ? undefined : 'zp-card-body'} style={css(`margin:${q.hasTitle !== false ? 5 : 2}px 0 0; font:${q.hasTitle !== false ? '400 14px' : '400 15px'}/1.55 var(--zp-font-text); color:${q.hasTitle !== false ? '#3A4757' : '#0F172A'}; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;`)}>{renderMentions(q.body)}</p>
                  </div>
                  <div style={css('display:flex; align-items:center; gap:8px 12px; flex-wrap:wrap; margin:10px 16px 0; padding:9px 0 11px; border-top:1px solid #EEF1F7;')}>
                    {/* like · comment · save on the left, the way in on the right */}
                    <CardActions compact helpful={q.helpfulTotal} helped={q.iHelpedQ} onHelpful={q.onLike} replies={(q.answers || []).length} onReply={q.onOpen} saved={!!q.saved} onSave={q.onSave} />
                    <TagRow topics={q.topics || []} tools={q.tools || []} />
                    <button onClick={(e) => { e.stopPropagation(); navigate('/questions/' + encodeURIComponent(q.id)) }} className={hoverClass('color:#5B21B6 !important;')} style={css(`margin-left:auto; display:inline-flex; align-items:center; gap:5px; padding:0; border:none; background:transparent; cursor:pointer; font:700 13px ${FONT}; color:#7C3AED;`)}>
                      {t('Xem thêm')}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                  </div>
                </div>
              ))}

              {trending.length === 0 && (
                <div style={css('grid-column:1 / -1; padding:44px 24px; text-align:center; background:#fff; border:1px dashed #C9D4E6; border-radius:20px;')}>
                  <div style={css(`font:800 16px ${FONT}; color:#0F172A;`)}>{t('Chưa có câu hỏi nào')}</div>
                  <div style={css(`margin-top:8px; font:400 14px var(--zp-font-text); color:#64748b;`)}>{t('Hãy là người đầu tiên đặt câu hỏi về AI.')}</div>
                </div>
              )}
            </div>
          </div>

        </section>

        {/* ============ FEATURED USE CASES ============ */}
        <section id="featured" style={css('position:relative; padding:24px var(--zp-gutter) 36px; background:linear-gradient(180deg,#05080f 0%,#070c1b 55%,#04060d 100%);')}>
          <div style={css('max-width:760px; margin:0 auto;')}>
            <div style={css('display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:16px 24px;')}>
              <h2 style={css(`font:900 34px/1.15 ${FONT}; letter-spacing:-.015em; margin:0; background:linear-gradient(100deg,#ffffff 0%,#dce9ff 35%,#9fc2ff 70%,#78a8ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 2px 6px rgba(2,8,30,.75)) drop-shadow(0 0 10px rgba(110,165,255,.75)) drop-shadow(0 0 26px rgba(70,130,255,.55));`)}>{t('Các AI Use Case mới nhất')}</h2>
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
                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId((mid) => (mid === item.id ? null : item.id)) }} title={t('Thêm')} aria-label={t('Tuỳ chọn khác')} aria-haspopup="menu" style={css('width:32px; height:32px; border-radius:10px; background:#fff; border:1px solid #E6EBF3; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0; color:#5B6675;')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="5" cy="12" r="1.4"></circle><circle cx="12" cy="12" r="1.4"></circle><circle cx="19" cy="12" r="1.4"></circle></svg>
                      </button>
                      {openMenuId === item.id && (
                        <div onClick={(e) => e.stopPropagation()} style={css('position:absolute; right:0; top:38px; width:190px; background:#fff; border:1px solid #E6EBF3; border-radius:14px; box-shadow:0 20px 46px rgba(15,23,42,.2); overflow:hidden; z-index:60; padding:6px;')}>
                          <button onClick={(e) => copyCardLink(e, item.id)} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#0F172A; text-align:left;`)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"></path></svg>
                            {t('Sao chép link')}
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
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); if (item.canEdit) setConfirmDeleteId(item.id); else askRemovalReason({ what: 'use case', title: item.title }).then((r) => r && confirmDelete(item.id, r)) }} style={css(`display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13px ${FONT}; color:#D8232A; text-align:left;`)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
                              {t('Xoá bài viết')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={css('display:flex; gap:13px;')}>
                    <CoverImage c={allCases.find((x) => x.id === item.id) || item} />
                    <div style={css('flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center;')}>
                      <h3 className="zp-card-title" style={css(`margin:0; font:800 15px/1.38 ${FONT}; color:#0F172A; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;`)}>{item.title}</h3>
                      {/* same as the Use Case Library card: the people behind it right under the name */}
                      <div style={css(`margin-top:4px; font:400 12.5px/1.45 var(--zp-font-text); color:#5B6B82;`)}>
                        <span style={css('font-weight:700; color:#0F172A;')}>Owner:</span> {item.byline || item.author}<AnonTag p={item} />
                      </div>
                      {postedShort(allCases.find((x) => x.id === item.id) || item) && <div style={css(`margin-top:2px; font:400 12px/1.45 var(--zp-font-text); color:#94a3b8;`)}>{postedShort(allCases.find((x) => x.id === item.id) || item)}</div>}
                      {item.desc && <p style={css('margin:4px 0 0; font-size:14px; line-height:1.5; color:#3A4757; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;')}>{item.desc}</p>}
                    </div>
                  </div>
                  <div style={css('display:flex; align-items:center; gap:8px; margin-top:12px; padding-top:10px; border-top:1px solid #EEF1F7;')}>
                    <CardActions compact helpful={item.helpful} helped={item.helped} onHelpful={item.onHelpful} saved={!!item.saved} onSave={item.onSaveToggle} replies={item.commentCount} onReply={() => { rememberReturn(item.id); navigate(`/use-cases/${item.id}#comments`) }} />
                    <button onClick={(e) => { e.stopPropagation(); item.onOpen() }} className={hoverClass('gap:9px;')} style={css(`flex:none; margin-left:auto; display:inline-flex; align-items:center; gap:6px; border:none; background:transparent; padding:0; cursor:pointer; font:800 12.5px ${FONT}; color:#2c5fff; white-space:nowrap; transition:gap .16s;`)}>
                      {t('Xem Use Case')}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </section>

      </div>

      {confirmDeleteId && (
        <div onClick={() => setConfirmDeleteId(null)} style={css('position:fixed; inset:0; z-index:5000; background:rgba(4,10,26,.66); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:24px;')}>
          <div ref={homeDelDialog.ref} {...homeDelDialog.dialogProps} onClick={(e) => e.stopPropagation()} style={css('width:360px; max-width:100%; background:#fff; border-radius:20px; padding:26px 24px; box-shadow:0 30px 70px rgba(3,12,40,.5); text-align:center;')}>
            <div style={css('width:52px; height:52px; margin:0 auto; border-radius:50%; background:#FFECEC; color:#D8232A; display:flex; align-items:center; justify-content:center;')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
            </div>
            <div style={css(`margin-top:16px; font:800 16px ${FONT}; color:#0F172A;`)}>{t('Bạn muốn xoá vĩnh viễn bài viết này?')}</div>
            <div style={css(`margin-top:8px; font:400 13.5px/1.5 var(--zp-font-text); color:#64748b;`)}>{t('Hành động này không thể hoàn tác.')}</div>
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
