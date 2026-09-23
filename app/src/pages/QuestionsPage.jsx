import { useEffect, useRef, useState } from 'react'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { api, relativeTime } from '../lib/api.js'
import TopNav from '../components/TopNav.jsx'
import ImageSlot from '../components/ImageSlot.jsx'

const AV = ['#2c5fff', '#00A352', '#6F0CE2', '#FF8D00', '#0033C9', '#00B7FF']
const CATEGORIES = ['Productivity & Personal Work', 'Content & Communication', 'Research & Knowledge', 'Data & Analysis', 'Coding & Technical', 'Automation & Workflow', 'Meeting & Collaboration', 'Design & Creative', 'Other']
const TOPICS = ['Prompting', 'Tài liệu dài', 'Tóm tắt', 'Bảo mật dữ liệu', 'Tiếng Việt', 'Ticket & CSKH', 'Code review', 'Báo cáo', 'Other']
const TOOLS = ['Claude', 'ChatGPT', 'Gemini', 'Copilot', 'Magnify', 'Other']
const PEOPLE = [
  { name: 'HaiPD', initials: 'HP', team: 'Data' },
  { name: 'QuyenNT', initials: 'QN', team: 'Marketing' },
  { name: 'LinhVT', initials: 'LV', team: 'Brand' },
  { name: 'TrucVN', initials: 'TV', team: 'Customer Support' },
  { name: 'DucMH', initials: 'DM', team: 'Engineering' },
  { name: 'NgocTA', initials: 'NT', team: 'Product Ops' },
]
const CLAMP = 200

const INITIAL_NOTIFICATIONS = [
  { id: 'n1', kind: 'answer', text: 'HaiPD đã trả lời câu hỏi của bạn: "Làm sao để dùng Claude tóm tắt file PDF dài hơn 50 trang?"', time: '2 giờ trước', unread: true, target: 'q1' },
  { id: 'n2', kind: 'mention', text: 'QuyenNT đã mention bạn trong một bình luận', time: '1 giờ trước', unread: true, teams: 'delivered', target: 'q1' },
  { id: 'n3', kind: 'approved', text: 'Use case "Tóm tắt phản hồi khách hàng theo tuần" của bạn đã được duyệt', time: 'Hôm qua', unread: true, target: null },
  { id: 'n4', kind: 'rejected', text: 'Use case "Auto QA script" bị từ chối — Admin có ghi lý do', time: '2 ngày trước', unread: false, target: null },
  { id: 'n5', kind: 'mention', text: 'DucMH đã mention bạn trong một câu trả lời', time: '3 ngày trước', unread: false, teams: 'failed', target: 'q4' },
]

const NK = {
  answer: { iconText: 'A', iconBg: '#E7ECFB', iconFg: '#2c5fff' },
  mention: { iconText: '@', iconBg: '#F1E7FF', iconFg: '#6F0CE2' },
  approved: { iconText: '✓', iconBg: '#E7F9F0', iconFg: '#00893F' },
  rejected: { iconText: '!', iconBg: '#FFECEC', iconFg: '#D8232A' },
}

const chip = (on) => ({ bg: on ? '#E7ECFB' : '#ffffff', border: on ? '#B9CCF8' : '#DDE3EC', color: on ? '#2c5fff' : '#3A4757' })
const mentionScan = (v) => { const m = /@([\p{L}\w]*)$/u.exec(v); return m ? m[1].toLowerCase() : null }
const insertMention = (v, name) => v.replace(/@([\p{L}\w]*)$/u, '@' + name + ' ')
const renderBody = (text) => String(text).split(/(@[A-Za-z][A-Za-z0-9]*)/g).map((p, i) => (p.charAt(0) === '@' ? <span key={i} style={{ color: '#2c5fff', fontWeight: 700 }}>{p}</span> : p))

export default function QuestionsPage() {
  const { t } = useI18n()
  const { user, requireLogin } = useAuth()
  const [questions, setQuestions] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [notificationsState, setNotificationsState] = useState(INITIAL_NOTIFICATIONS)
  const [view, setView] = useState('feed') // 'feed' | 'ask'
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('latest')
  const [quick, setQuick] = useState('all')
  const [readAll, setReadAll] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [fullBody, setFullBody] = useState({})
  const [replyDrafts, setReplyDrafts] = useState({})
  const [replyMention, setReplyMention] = useState(null)
  const [openComments, setOpenComments] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [commentMention, setCommentMention] = useState(null)

  const [askTitle, setAskTitle] = useState('')
  const [askBody, setAskBody] = useState('')
  const [askCategory, setAskCategory] = useState([])
  const [askTopicsSel, setAskTopicsSel] = useState([])
  const [askToolsSel, setAskToolsSel] = useState([])
  const [askFiles, setAskFiles] = useState([])
  const [askDraftSaved, setAskDraftSaved] = useState(false)
  const [askError, setAskError] = useState('')
  const [askOtherText, setAskOtherText] = useState('')
  const [askTopicOtherText, setAskTopicOtherText] = useState('')
  const [askToolOtherText, setAskToolOtherText] = useState('')
  const askBodyRef = useRef(null)

  const patch = (id, updated) => setQuestions((qs) => qs.map((q) => (q.id === id ? updated : q)))

  const reload = () => api.listQuestions().then((d) => { setQuestions(d.questions); setLoaded(true) }).catch(() => setLoaded(true))
  useEffect(() => { reload() }, [])

  const mentionList = (mq, apply) => PEOPLE.filter((p) => p.name !== (user?.name || '') && (!mq || p.name.toLowerCase().includes(mq)))
    .slice(0, 4).map((p, i) => ({ ...p, bg: AV[i % AV.length], onPick: () => apply(p.name) }))

  // deep-link: #q=<id> expands and scrolls to that question
  useEffect(() => {
    if (!loaded) return
    const m = /[#&]q=([^&]+)/.exec(window.location.hash || '')
    if (!m) return
    const id = decodeURIComponent(m[1])
    if (!questions.some((q) => q.id === id)) return
    setView('feed')
    setExpanded((s) => ({ ...s, [id]: true }))
    setFullBody((s) => ({ ...s, [id]: true }))
    let tries = 0
    const seek = () => {
      const el = document.querySelector('[data-qid="' + id + '"]')
      if (el) {
        const y = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - 90)
        window.scrollTo(0, y)
      } else if (tries++ < 20) setTimeout(seek, 80)
    }
    setTimeout(seek, 120)
  }, [loaded])

  const toggle = (id) => { setExpanded((s) => ({ ...s, [id]: !s[id] })); setFullBody((s) => ({ ...s, [id]: true })) }
  const accept = (qid, aid) => requireLogin(() => api.acceptAnswer(qid, aid).then((d) => patch(qid, d.question)).catch(() => {}))

  const applyRich = (kind) => {
    const el = askBodyRef.current
    if (!el) return
    const v = el.value, a = el.selectionStart, b = el.selectionEnd
    const sel = v.slice(a, b)
    const wrap = (mark, ph) => { const body = sel || ph; return { text: v.slice(0, a) + mark + body + mark + v.slice(b), from: a + mark.length, to: a + mark.length + body.length } }
    const listify = (fn) => { const ls = (sel || 'Mục mới').split('\n'); const body = ls.map(fn).join('\n'); return { text: v.slice(0, a) + body + v.slice(b), from: a, to: a + body.length } }
    let r
    if (kind === 'Bold') r = wrap('**', 'chữ in đậm')
    else if (kind === 'Italic') r = wrap('*', 'chữ in nghiêng')
    else if (kind === 'Strikethrough') r = wrap('~~', 'chữ gạch ngang')
    else if (kind === 'Code') r = sel.indexOf('\n') >= 0 ? wrap('\n```\n', 'code') : wrap('`', 'code')
    else if (kind === 'Bullet list') r = listify((l) => '• ' + l)
    else if (kind === 'Numbered list') r = listify((l, i) => (i + 1) + '. ' + l)
    else return
    setAskBody(r.text); setAskError('')
    requestAnimationFrame(() => { const e2 = askBodyRef.current; if (e2) { e2.focus(); e2.setSelectionRange(r.from, r.to) } })
  }

  const postQuestion = () => {
    const tt = askTitle.trim(), bb = askBody.trim(), cc = askCategory
    if (!tt || !bb || !cc.length) { setAskError('Cần có Title, Details và Category trước khi đăng.'); return }
    requireLogin(() => {
      const payload = {
        title: tt, body: bb,
        category: cc.map((x) => (x === 'Other' ? askOtherText.trim() : x)).filter(Boolean),
        topics: askTopicsSel.map((x) => (x === 'Other' ? askTopicOtherText.trim() : x)).filter(Boolean),
        tools: askToolsSel.map((x) => (x === 'Other' ? askToolOtherText.trim() : x)).filter(Boolean),
      }
      api.postQuestion(payload).then((d) => {
        const id = d.question.id
        setQuestions((qs) => [d.question, ...qs])
        setView('feed')
        setExpanded((s) => ({ ...s, [id]: true }))
        setAskTitle(''); setAskBody(''); setAskCategory([]); setAskTopicsSel([]); setAskToolsSel([]); setAskFiles([]); setAskError(''); setAskDraftSaved(false)
        window.scrollTo(0, 0)
      }).catch(() => setAskError('Không đăng được câu hỏi, thử lại.'))
    })
  }

  // ---- derive feed ----
  const qs = query.trim().toLowerCase()
  const match = (q) => {
    if (quick === 'waiting' && q.resolved) return false
    if (quick === 'resolved' && !q.resolved) return false
    if (quick === 'mine' && q.author !== (user?.name || '')) return false
    if (quick === 'saved' && !q.saved) return false
    if (quick === 'unanswered' && q.answers.length) return false
    if (!qs) return true
    return [q.title, q.body, q.author, [].concat(q.category).join(' '), q.topics.join(' '), q.tools.join(' ')].join(' ').toLowerCase().indexOf(qs) >= 0
  }
  const helpfulSum = (q) => q.answers.reduce((n, a) => n + a.helpful, 0)
  let list = questions.filter(match)
  const tsNum = (v) => new Date(String(v).includes('T') ? v : String(v).replace(' ', 'T') + 'Z').getTime()
  list = sort === 'active' ? list.slice().sort((a, b) => b.answers.length - a.answers.length || helpfulSum(b) - helpfulSum(a))
    : sort === 'all' ? list.slice()
      : list.slice().sort((a, b) => tsNum(b.ts) - tsNum(a.ts))

  const feed = list.map((q) => {
    const isExpanded = !!expanded[q.id]
    const full = !!fullBody[q.id]
    const long = q.body.length > CLAMP
    const draft = replyDrafts[q.id] || ''
    const ordered = q.answers.slice().sort((a, b) => (b.accepted ? 1 : 0) - (a.accepted ? 1 : 0))
    const rm = replyMention && replyMention.id === q.id ? replyMention.query : null

    const answers = ordered.map((a) => {
      const cd = commentDrafts[a.id] || ''
      const cm = commentMention && commentMention.id === a.id ? commentMention.query : null
      return {
        ...a,
        bodyEl: renderBody(a.body),
        time: relativeTime(a.time),
        avatarBg: AV[a.author.charCodeAt(0) % AV.length],
        border: a.accepted ? '#BEE9D3' : '#EEF1F7',
        helpColor: a.iHelped ? '#2c5fff' : '#64748b',
        helpFill: a.iHelped ? '#2c5fff' : 'none',
        replyLabel: a.comments.length ? 'Reply · ' + a.comments.length : 'Reply',
        canAccept: q.author === (user?.name || '') && !q.resolved,
        showComments: !!openComments[a.id] || a.comments.length > 0,
        comments: a.comments.map((c, j) => ({ ...c, time: relativeTime(c.time), bodyEl: renderBody(c.body), avatarBg: AV[(c.author.charCodeAt(0) + j) % AV.length] })),
        commentDraft: cd,
        mentionOpen: cm !== null,
        mentions: mentionList(cm, (name) => { setCommentDrafts((s) => ({ ...s, [a.id]: insertMention(s[a.id] || '', name) })); setCommentMention(null) }),
        onCommentChange: (e) => { const v = e.target.value, mq = mentionScan(v); setCommentDrafts((s) => ({ ...s, [a.id]: v })); setCommentMention(mq === null ? null : { id: a.id, query: mq }) },
        onPostComment: () => {
          const body = (commentDrafts[a.id] || '').trim()
          if (!body) return
          requireLogin(() => api.postAnswerComment(q.id, a.id, body).then((d) => patch(q.id, d.question)).catch(() => {}))
          setCommentDrafts((s) => ({ ...s, [a.id]: '' })); setCommentMention(null)
        },
        onReply: () => setOpenComments((s) => ({ ...s, [a.id]: !s[a.id] })),
        onHelpful: () => requireLogin(() => api.reactAnswer(q.id, a.id).then((d) => patch(q.id, d.question)).catch(() => {})),
        onAccept: () => accept(q.id, a.id),
      }
    })

    return {
      ...q,
      time: relativeTime(q.time),
      avatarBg: AV[q.author.charCodeAt(0) % AV.length],
      cats: [].concat(q.category).filter(Boolean),
      statusBg: q.resolved ? '#E7F9F0' : '#FFF1E0',
      statusFg: q.resolved ? '#00893F' : '#B45300',
      statusLabel: q.resolved ? 'Resolved' : t('Đang chờ trả lời'),
      bodyShown: full || !long ? q.body : q.body.slice(0, CLAMP).trimEnd() + '…',
      truncated: long && !full,
      saveBg: q.saved ? '#E7F9F0' : '#fff',
      saveBorder: q.saved ? '#BEE9D3' : '#DDE3EC',
      saveColor: q.saved ? '#00893F' : '#94a3b8',
      saveFill: q.saved ? '#00A352' : 'none',
      saveLabel: q.saved ? t('Đã lưu') : 'Lưu câu hỏi',
      images: q.images || [],
      hasImages: !!(q.images && q.images.length),
      imageCols: q.images && q.images.length > 1 ? '1fr 1fr' : '1fr',
      helpfulTotal: q.answers.reduce((n, a) => n + (a.helpful || 0), 0) + (q.qHelpful || 0),
      qHelpBg: q.iHelpedQ ? '#E7ECFB' : '#F8FAFE',
      qHelpBorder: q.iHelpedQ ? '#B9CCF8' : '#E6EBF3',
      qHelpFill: q.iHelpedQ ? '#2c5fff' : 'none',
      onHelpfulQ: (e) => { if (e) e.stopPropagation(); requireLogin(() => api.reactQuestion(q.id).then((d) => patch(q.id, d.question)).catch(() => {})) },
      hasAccepted: q.answers.some((a) => a.accepted),
      replyLabel: q.answers.length === 0 ? 'Reply' : q.answers.length === 1 ? '1 reply' : q.answers.length + ' replies',
      replyBg: isExpanded ? '#E7ECFB' : '#fff',
      replyBorder: isExpanded ? '#B9CCF8' : '#DDE3EC',
      replyColor: isExpanded ? '#2c5fff' : '#3A4757',
      expanded: isExpanded, answers, noAnswers: q.answers.length === 0,
      isOwner: q.author === (user?.name || '') && !q.resolved && q.answers.length > 0,
      onToggle: () => toggle(q.id),
      onExpandBody: () => setFullBody((s) => ({ ...s, [q.id]: !s[q.id] })),
      onSave: (e) => { if (e) e.stopPropagation(); requireLogin(() => api.saveQuestion(q.id).then((d) => patch(q.id, d.question)).catch(() => {})) },
      replyDraft: draft,
      onReplyChange: (e) => { const v = e.target.value, mq = mentionScan(v); setReplyDrafts((s) => ({ ...s, [q.id]: v })); setReplyMention(mq === null ? null : { id: q.id, query: mq }) },
      replyMentionOpen: rm !== null,
      replyMentions: mentionList(rm, (name) => { setReplyDrafts((s) => ({ ...s, [q.id]: insertMention(s[q.id] || '', name) })); setReplyMention(null) }),
      replyOpacity: draft.trim() ? 1 : 0.5,
      onPostReply: () => {
        const body = (replyDrafts[q.id] || '').trim()
        if (!body) return
        requireLogin(() => api.postAnswer(q.id, body).then((d) => patch(q.id, d.question)).catch(() => {}))
        setReplyDrafts((s) => ({ ...s, [q.id]: '' })); setReplyMention(null)
      },
    }
  })

  const notifications = notificationsState.map((n) => {
    const unread = n.unread && !readAll
    return {
      ...n, ...(NK[n.kind] || NK.answer),
      hasTeams: !!n.teams,
      teamsLabel: n.teams === 'failed' ? 'Teams: gửi thất bại' : 'Đã gửi qua Teams',
      teamsBg: n.teams === 'failed' ? '#FFECEC' : '#E7F9F0',
      teamsFg: n.teams === 'failed' ? '#D8232A' : '#00893F',
      unread,
      onOpen: () => {
        setReadAll(true); setView('feed')
        if (n.target) { setExpanded((s) => ({ ...s, [n.target]: true })); setFullBody((s) => ({ ...s, [n.target]: true })) }
      },
    }
  })

  const sorts = [['latest', 'Gần nhất'], ['active', 'Trending'], ['all', 'Tất cả']].map(([k, label]) => ({
    label, bg: sort === k ? '#fff' : 'transparent', color: sort === k ? '#2c5fff' : '#3A4757', onPick: () => setSort(k),
  }))
  const quickFilters = [['all', 'Tất cả'], ['waiting', 'Chờ trả lời'], ['resolved', 'Resolved'], ['mine', 'Đã đăng'], ['saved', 'Đã lưu']].map(([k, label]) => ({
    label: t(label), ...chip(quick === k), onPick: () => setQuick(k),
  }))
  const isEmpty = feed.length === 0
  const emptyTitle = qs || quick !== 'all' ? 'Không có câu hỏi khớp bộ lọc' : 'Chưa có câu hỏi nào'
  const emptyHint = qs || quick !== 'all' ? 'Thử đổi từ khóa hoặc bỏ bộ lọc.' : 'Câu hỏi đầu tiên sẽ mở đầu cho cả thread thảo luận.'

  const richTools = [
    { label: 'B', title: 'Bold', font: '800 14px' },
    { label: 'I', title: 'Italic', font: 'italic 700 14px' },
    { label: 'S', title: 'Strikethrough', font: '700 14px' },
    { label: '•', title: 'Bullet list', font: '800 16px' },
    { label: '1.', title: 'Numbered list', font: '800 12px' },
    { label: '</>', title: 'Code', font: '700 11px' },
  ]
  const askCategories = CATEGORIES.map((c) => {
    const on = askCategory.indexOf(c) >= 0
    return { label: c, ...chip(on), onPick: () => setAskCategory((s) => (on ? s.filter((x) => x !== c) : [...s, c])) }
  })
  const askTopics = TOPICS.map((tp) => {
    const on = askTopicsSel.indexOf(tp) >= 0
    return { label: tp, ...chip(on), opacity: !on && askTopicsSel.length >= 3 ? 0.45 : 1, onPick: () => setAskTopicsSel((s) => { const has = s.indexOf(tp) >= 0; if (!has && s.length >= 3) return s; return has ? s.filter((x) => x !== tp) : [...s, tp] }) }
  })
  const askTools = TOOLS.map((tl) => ({ label: tl, ...chip(askToolsSel.indexOf(tl) >= 0), onPick: () => setAskToolsSel((s) => (s.indexOf(tl) >= 0 ? s.filter((x) => x !== tl) : [...s, tl])) }))
  const askOpacity = askTitle.trim() && askBody.trim() && askCategory.length ? 1 : 0.5

  return (
    <div style={css('position:relative; width:100%; margin:0 auto; background:#04060d; color:#e8eefc;')}>
      <div style={css('position:absolute; top:-260px; left:-8%; width:900px; height:900px; border-radius:50%; background:radial-gradient(circle,rgba(58,120,255,.34),rgba(58,120,255,0) 66%); filter:blur(60px); pointer-events:none; z-index:0;')}></div>
      <div style={css('position:absolute; top:-160px; right:-10%; width:820px; height:820px; border-radius:50%; background:radial-gradient(circle,rgba(0,140,255,.22),rgba(0,140,255,0) 66%); filter:blur(60px); pointer-events:none; z-index:0;')}></div>
      <div style={css('position:absolute; top:900px; left:22%; width:1000px; height:1100px; border-radius:50%; background:radial-gradient(circle,rgba(44,95,255,.16),rgba(44,95,255,0) 68%); filter:blur(80px); pointer-events:none; z-index:0;')}></div>
      <div style={css('position:absolute; top:2100px; left:-14%; width:900px; height:1100px; border-radius:50%; background:radial-gradient(circle,rgba(0,207,106,.1),rgba(0,207,106,0) 68%); filter:blur(80px); pointer-events:none; z-index:0;')}></div>
      <div style={css('position:relative; z-index:1;')}>

        <TopNav notifications={notifications} />

        <div>
          <div style={css('position:relative; background:transparent; padding:44px 40px 50px;')}>
            <div style={css('position:relative; z-index:2; max-width:760px; margin:0 auto;')}>
              <h1 style={css('margin:0; text-align:center; font:700 70px/1.04 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; letter-spacing:-.02em; background:linear-gradient(180deg,#ffffff 0%,#dfeaff 46%,#a9caff 100%); -webkit-background-clip:text; background-clip:text; color:transparent;')}>{t('Câu hỏi')}</h1>
              <p style={css('margin:14px auto 0; max-width:620px; text-align:center; font:400 16px/1.55 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:rgba(206,219,245,.72); text-wrap:pretty;')}>{t('Hỏi nhanh, trả lời thẳng vào việc. Người đặt câu hỏi chọn câu trả lời đã giải quyết được vấn đề.')}</p>
            </div>
          </div>

          <div style={css('padding:24px 40px 90px;')}>
            <div style={css('max-width:760px; margin:0 auto;')}>

              <div onClick={() => setView('ask')} className={hoverClass('background:rgba(255,255,255,.12); border-color:rgba(160,196,255,.5);')} style={css('display:flex; align-items:center; gap:14px; background:rgba(255,255,255,.07); backdrop-filter:blur(18px) saturate(140%); -webkit-backdrop-filter:blur(18px) saturate(140%); border:1px solid rgba(255,255,255,.16); border-radius:18px; padding:16px 18px; box-shadow:0 18px 40px rgba(0,0,0,.28); cursor:pointer; transition:background .25s,border-color .25s;')}>
                <div style={css('flex:none; width:42px; height:42px; border-radius:50%; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font:800 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{user?.initials || '?'}</div>
                <span style={css('flex:1; font:400 15px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:rgba(219,230,255,.78);')}>{t('Bạn đang vướng ở đâu với AI?')}</span>
                <span style={css('flex:none; display:inline-flex; align-items:center; gap:8px; height:40px; padding:0 18px; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; box-shadow:0 10px 22px rgba(44,95,255,.4);')}>{t('Đặt câu hỏi')}</span>
              </div>

              <div style={css('display:flex; align-items:center; gap:10px; margin-top:18px;')}>
                <div style={css('flex:1; display:flex; align-items:center; gap:11px; background:#ffffff; border:1px solid #E6EBF3; border-radius:999px; padding:11px 18px;')}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Tìm câu hỏi, tác giả, công cụ...')} style={css('flex:1; border:none; outline:none; background:transparent; font-size:14.5px; color:#0F172A;')} />
                </div>
                <div style={css('display:inline-flex; align-items:center; gap:5px; height:44px; padding:5px; border-radius:999px; background:#EDF0FA;')}>
                  {sorts.map((s2) => (
                    <button key={s2.label} onClick={s2.onPick} style={css(`border:none; cursor:pointer; height:34px; padding:0 15px; border-radius:999px; font:700 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; background:${s2.bg}; color:${s2.color}; white-space:nowrap;`)}>{t(s2.label)}</button>
                  ))}
                </div>
              </div>

              <div style={css('display:flex; align-items:center; gap:8px; margin-top:14px; overflow:hidden; flex-wrap:wrap;')}>
                {quickFilters.map((f) => (
                  <button key={f.label} onClick={f.onPick} style={css(`height:32px; padding:0 14px; white-space:nowrap; border:1px solid ${f.border}; border-radius:999px; background:${f.bg}; color:${f.color}; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;`)}>{f.label}</button>
                ))}
              </div>

              <div style={css('display:flex; flex-direction:column; gap:16px; margin-top:20px;')}>
                {feed.map((q) => (
                  <div key={q.id} data-qid={q.id} style={css('background:#ffffff; border:1px solid #E6EBF3; border-radius:20px; box-shadow:0 20px 46px rgba(0,0,0,.34); overflow:hidden;')}>
                    <div style={css('display:flex; align-items:center; gap:7px; padding:20px 22px 0; flex-wrap:wrap;')}>
                      <span style={css(`display:inline-flex; align-items:center; height:23px; padding:0 10px; border-radius:999px; background:${q.statusBg}; color:${q.statusFg}; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{q.statusLabel}</span>
                      {q.cats.map((c) => (
                        <span key={c} style={css('display:inline-flex; align-items:center; height:23px; padding:0 10px; border-radius:999px; background:#E7ECFB; color:#2c5fff; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{c}</span>
                      ))}
                      {q.topics.map((tp) => (
                        <span key={tp} style={css('display:inline-flex; align-items:center; height:23px; padding:0 10px; border-radius:999px; background:#EDF0FA; color:#3A4757; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{tp}</span>
                      ))}
                    </div>

                    <div style={css('display:flex; gap:14px; padding:14px 22px 0;')}>
                      <div style={css(`flex:none; width:42px; height:42px; border-radius:50%; background:${q.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{q.initials}</div>
                      <div style={css('flex:1; min-width:0;')}>
                        <div style={css('display:flex; align-items:center; gap:8px; flex-wrap:wrap;')}>
                          <span style={css('font:800 14.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{q.author}</span>
                          <span style={css('font:400 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{q.team}</span>
                          <span style={css('color:#CDD5DD;')}>·</span>
                          <span style={css('font:400 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{q.time}</span>
                        </div>
                      </div>
                      <button onClick={q.onSave} title={q.saveLabel} style={css(`flex:none; width:38px; height:38px; border:1px solid ${q.saveBorder}; border-radius:12px; background:${q.saveBg}; color:${q.saveColor}; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;`)}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill={q.saveFill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                      </button>
                    </div>

                    <div style={css('padding:14px 22px 0;')}>
                      <h3 style={css('margin:0; font:800 19px/1.35 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A; text-wrap:pretty;')}>{q.title}</h3>
                      <p style={css('margin:9px 0 0; font:400 14.5px/1.65 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757; white-space:pre-wrap;')}>
                        {q.bodyShown}
                        {q.truncated && (
                          <button onClick={q.onExpandBody} style={css('display:inline; margin-left:6px; padding:0; border:none; background:transparent; cursor:pointer; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3366F0; vertical-align:baseline;')}>{t('Xem thêm')}</button>
                        )}
                      </p>
                      {q.hasImages && (
                        <div style={css(`display:grid; grid-template-columns:${q.imageCols}; gap:6px; margin-top:14px; border-radius:14px; overflow:hidden; border:1px solid #E6EBF3;`)}>
                          {q.images.map((im) => (
                            <ImageSlot key={im.id} id={im.id} placeholder={im.placeholder} shape="rect" style={{ width: '100%', height: 230, background: '#EEF2F9' }} />
                          ))}
                        </div>
                      )}
                      <div style={css('display:flex; align-items:center; gap:8px; margin-top:14px; flex-wrap:wrap;')}>
                        {q.tools.map((tool) => (
                          <span key={tool} style={css('display:inline-flex; align-items:center; height:26px; padding:0 10px; border:1px solid #DDE3EC; border-radius:8px; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757;')}>{tool}</span>
                        ))}
                      </div>
                    </div>

                    <div style={css('display:flex; align-items:center; gap:12px; margin:16px 22px 0; padding:14px 0 16px; border-top:1px solid #EEF1F7;')}>
                      <button onClick={q.onHelpfulQ} className={hoverClass('background:#E7ECFB; border-color:#B9CCF8;')} style={css(`display:inline-flex; align-items:center; gap:8px; height:34px; padding:0 14px; border:1px solid ${q.qHelpBorder}; border-radius:999px; background:${q.qHelpBg}; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757; cursor:pointer; transition:background .16s,border-color .16s;`)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill={q.qHelpFill} stroke="#2c5fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.5 3.2L13.6 9H19a2.4 2.4 0 0 1 2.3 3l-1.8 7.3A2.4 2.4 0 0 1 17.2 22z"></path><path d="M7 11H3v11h4"></path></svg>
                        <span style={css('color:#2c5fff;')}>{q.helpfulTotal}</span> người thấy hữu ích
                      </button>
                      {q.hasAccepted && (
                        <span style={css('display:inline-flex; align-items:center; gap:7px; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#00893F;')}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00893F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                          {t('Đã có câu trả lời được chấp nhận')}
                        </span>
                      )}
                      <button onClick={q.onToggle} style={css(`margin-left:auto; display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 16px; border:1px solid ${q.replyBorder}; border-radius:999px; background:${q.replyBg}; color:${q.replyColor}; font:700 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;`)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        {q.replyLabel}
                      </button>
                    </div>

                    {q.expanded && (
                      <div style={css('margin-top:16px; padding:18px 22px 20px; background:#F8FAFE; border-top:1px solid #EEF1F7;')}>
                        {q.isOwner && (
                          <div style={css('display:flex; align-items:center; gap:11px; margin-bottom:14px; padding:12px 16px; background:#EEF3FF; border:1px solid #D7E4FF; border-radius:14px;')}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2c5fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v5"></path><path d="M12 16h.01"></path></svg>
                            <span style={css('font:600 12.5px/1.5 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#1E44A8;')}>Bạn là người hỏi. Chọn "This solved my problem" ở một câu trả lời để đánh dấu Resolved.</span>
                          </div>
                        )}

                        <div style={css('display:flex; flex-direction:column; gap:14px;')}>
                          {q.answers.map((a) => (
                            <div key={a.id} style={css('display:flex; gap:12px;')}>
                              <div style={css(`flex:none; width:34px; height:34px; border-radius:50%; background:${a.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{a.initials}</div>
                              <div style={css('flex:1; min-width:0;')}>
                                <div style={css(`background:#fff; border:1px solid ${a.border}; border-radius:16px; padding:14px 16px;`)}>
                                  {a.accepted && (
                                    <div style={css('display:inline-flex; align-items:center; gap:7px; margin-bottom:9px; height:24px; padding:0 11px; border-radius:999px; background:#E7F9F0; color:#00893F; font:800 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00893F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                                      Accepted Answer
                                    </div>
                                  )}
                                  <div style={css('display:flex; align-items:center; gap:9px; flex-wrap:wrap;')}>
                                    <span style={css('font:800 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{a.author}</span>
                                    <span style={css('font:400 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{a.team}</span>
                                    <span style={css('margin-left:auto; font:400 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{a.time}</span>
                                  </div>
                                  <div style={css('margin-top:8px; font:400 14.5px/1.7 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757; white-space:pre-wrap; text-wrap:pretty;')}>{a.bodyEl}</div>
                                </div>
                                <div style={css('display:flex; align-items:center; gap:16px; margin:9px 0 0; padding-left:4px; flex-wrap:wrap;')}>
                                  <button onClick={a.onHelpful} style={css(`display:inline-flex; align-items:center; gap:7px; border:none; background:transparent; padding:0; cursor:pointer; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:${a.helpColor};`)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill={a.helpFill} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"></path><path d="M7 10l4.6-7a2.2 2.2 0 0 1 3.8 1.9L14.5 9h4.3a2.2 2.2 0 0 1 2.1 2.8l-1.8 7A2.2 2.2 0 0 1 17 20.5H7z"></path></svg>
                                    Helpful · {a.helpful}
                                  </button>
                                  <button onClick={a.onReply} style={css('border:none; background:transparent; padding:0; cursor:pointer; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>{a.replyLabel}</button>
                                  {a.canAccept && (
                                    <button onClick={a.onAccept} className={hoverClass('background:#E7F9F0;')} style={css('display:inline-flex; align-items:center; gap:7px; height:30px; padding:0 14px; border:1px solid #00CF6A; border-radius:999px; background:#fff; color:#00893F; font:700 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;')}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00893F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                                      This solved my problem
                                    </button>
                                  )}
                                </div>

                                {a.showComments && (
                                  <div style={css('display:flex; flex-direction:column; gap:10px; margin-top:12px; padding-left:14px; border-left:2px solid #E2E8F5;')}>
                                    {a.comments.map((c) => (
                                      <div key={c.id} style={css('display:flex; gap:10px;')}>
                                        <div style={css(`flex:none; width:26px; height:26px; border-radius:50%; background:${c.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 10px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{c.initials}</div>
                                        <div style={css('flex:1; min-width:0; background:#fff; border:1px solid #EEF1F7; border-radius:14px; padding:10px 13px;')}>
                                          <div style={css('display:flex; align-items:center; gap:8px;')}>
                                            <span style={css('font:800 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{c.author}</span>
                                            <span style={css('font:400 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{c.team}</span>
                                            <span style={css('margin-left:auto; font:400 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{c.time}</span>
                                          </div>
                                          <div style={css('margin-top:5px; font:400 13.5px/1.6 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757;')}>{c.bodyEl}</div>
                                        </div>
                                      </div>
                                    ))}
                                    <div style={css('display:flex; gap:10px; align-items:center;')}>
                                      <div style={css('flex:none; width:26px; height:26px; border-radius:50%; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font:800 10px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{user?.initials || '?'}</div>
                                      <div style={css('flex:1; position:relative;')}>
                                        <input value={a.commentDraft} onChange={a.onCommentChange} placeholder={`Trả lời ${a.author}, gõ @ để mention...`} style={css('width:100%; border:1px solid #E6EBF3; border-radius:999px; padding:9px 15px; font-size:13.5px; color:#0F172A; background:#ffffff; outline:none; box-sizing:border-box;')} />
                                        {a.mentionOpen && (
                                          <div style={css('position:absolute; left:0; bottom:42px; width:280px; background:#ffffff; border:1px solid #E6EBF3; border-radius:14px; box-shadow:0 18px 40px rgba(15,23,42,.18); padding:6px; z-index:80;')}>
                                            {a.mentions.map((m) => (
                                              <div key={m.name} onClick={m.onPick} className={hoverClass('background:#F4F7FE;')} style={css('display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px; cursor:pointer;')}>
                                                <span style={css(`width:26px; height:26px; border-radius:50%; background:${m.bg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 10px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{m.initials}</span>
                                                <span style={css('font:700 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{m.name}</span>
                                                <span style={css('font:400 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{m.team}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <button onClick={a.onPostComment} style={css('flex:none; height:34px; padding:0 15px; border:none; border-radius:999px; background:#EDF0FA; color:#2A3A57; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;')}>Send</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {q.noAnswers && (
                            <div style={css('padding:18px 0; text-align:center; font:600 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{t('Chưa có câu trả lời. Câu trả lời đầu tiên thường giúp ích nhiều nhất.')}</div>
                          )}
                        </div>

                        <div style={css('display:flex; gap:12px; margin-top:16px; padding-top:16px; border-top:1px solid #E6EBF3;')}>
                          <div style={css('flex:none; width:34px; height:34px; border-radius:50%; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{user?.initials || '?'}</div>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <textarea value={q.replyDraft} onChange={q.onReplyChange} rows={3} placeholder={t('Viết câu trả lời của bạn. Gõ @ để mention đồng nghiệp.')} style={css('width:100%; border:1px solid #E6EBF3; border-radius:16px; padding:12px 15px; font-size:14.5px; line-height:1.7; color:#0F172A; background:#ffffff; outline:none; resize:vertical; display:block; box-sizing:border-box;')}></textarea>
                            {q.replyMentionOpen && (
                              <div style={css('position:absolute; left:0; bottom:58px; width:300px; background:#ffffff; border:1px solid #E6EBF3; border-radius:14px; box-shadow:0 18px 40px rgba(15,23,42,.18); padding:6px; z-index:80;')}>
                                {q.replyMentions.map((m) => (
                                  <div key={m.name} onClick={m.onPick} className={hoverClass('background:#F4F7FE;')} style={css('display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:10px; cursor:pointer;')}>
                                    <span style={css(`width:28px; height:28px; border-radius:50%; background:${m.bg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 10.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{m.initials}</span>
                                    <span style={css('font:700 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{m.name}</span>
                                    <span style={css('font:400 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{m.team}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={css('display:flex; align-items:center; margin-top:10px;')}>
                              <span style={css('font:600 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{t('Mention gửi thông báo trong sản phẩm và qua Microsoft Teams.')}</span>
                              <button onClick={q.onPostReply} style={css(`margin-left:auto; height:40px; padding:0 20px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer; opacity:${q.replyOpacity};`)}>{t('Đăng câu trả lời')}</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isEmpty && (
                  <div style={css('background:#ffffff; border:1px dashed #D5DEEC; border-radius:20px; padding:60px 0; text-align:center;')}>
                    <div style={css('font:800 17px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{emptyTitle}</div>
                    <div style={css('margin-top:8px; font:400 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>{emptyHint}</div>
                    <button onClick={() => setView('ask')} style={css('margin-top:20px; height:44px; padding:0 22px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;')}>{t('Đặt câu hỏi')}</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {view === 'ask' && (
          <div onClick={() => setView('feed')} style={css('position:fixed; inset:0; z-index:4000; background:rgba(4,10,26,.66); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); display:flex; align-items:flex-start; justify-content:center; padding:44px 24px; overflow-y:auto;')}>
            <div onClick={(e) => e.stopPropagation()} style={css('width:760px; max-width:100%;')}>
              <div style={css('display:flex; align-items:flex-start; gap:16px; margin-bottom:20px;')}>
                <div style={{ flex: 1 }}>
                  <h1 style={css('margin:0; font:800 30px/1.2 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#fff; letter-spacing:-.01em;')}>{t('Đặt câu hỏi')}</h1>
                  <p style={css('margin:8px 0 0; font:400 14.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:rgba(206,219,245,.72);')}>{t('Câu hỏi được đăng trực tiếp, không cần Admin duyệt.')}</p>
                </div>
                <button onClick={() => setView('feed')} className={hoverClass('background:rgba(255,255,255,.16);')} style={css('flex:none; width:40px; height:40px; border:1px solid rgba(255,255,255,.18); border-radius:50%; background:rgba(255,255,255,.08); color:#e6eeff; cursor:pointer; display:flex; align-items:center; justify-content:center;')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                </button>
              </div>

              <div style={css('display:flex; flex-direction:column; gap:16px;')}>
                {askDraftSaved && (
                  <div style={css('display:flex; align-items:center; gap:10px; background:#EEF3FF; border:1px solid #CFE0FF; border-radius:14px; padding:13px 18px; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#1E44A8;')}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2c5fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                    {t('Đã lưu nháp. Draft chỉ là tiện ích cá nhân, không phải trạng thái kiểm duyệt.')}
                  </div>
                )}

                <div style={css('background:#ffffff; border:1px solid #E6EBF3; border-radius:20px; padding:26px 28px; box-shadow:0 20px 46px rgba(0,0,0,.34);')}>
                  <div style={css('display:flex; align-items:center; gap:8px;')}>
                    <label style={css('font:800 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{t('Tiêu đề câu hỏi')}</label>
                    <span style={css('font:700 11px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#E0353F;')}>{t('Bắt buộc')}</span>
                  </div>
                  <input value={askTitle} onChange={(e) => { setAskTitle(e.target.value); setAskError('') }} placeholder="Ví dụ: Làm sao để Claude giữ đúng format bảng khi tóm tắt báo cáo?" style={css('width:100%; margin-top:10px; border:1px solid #E6EBF3; border-radius:12px; padding:13px 15px; font-size:15px; color:#0F172A; background:#ffffff; outline:none; box-sizing:border-box;')} />

                  <div style={css('display:flex; align-items:center; gap:8px; margin-top:24px;')}>
                    <label style={css('font:800 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{t('Nội dung')}</label>
                    <span style={css('font:700 11px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#E0353F;')}>{t('Bắt buộc')}</span>
                  </div>
                  <div style={css('margin-top:10px; border:1px solid #E6EBF3; border-radius:12px; overflow:hidden;')}>
                    <div style={css('display:flex; align-items:center; gap:4px; padding:8px 10px; border-bottom:1px solid #EEF1F7; background:#ffffff;')}>
                      {richTools.map((r) => (
                        <button key={r.title} onClick={() => applyRich(r.title)} title={r.title} className={hoverClass('background:#EDF0FA;')} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'transparent', color: '#3A4757', font: r.font + ' "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.label}</button>
                      ))}
                      <span style={css('margin-left:auto; font:600 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{t('Gõ @ để mention đồng nghiệp')}</span>
                    </div>
                    <textarea ref={askBodyRef} value={askBody} onChange={(e) => { setAskBody(e.target.value); setAskError('') }} rows={8} placeholder={t('Bối cảnh, cách bạn đã thử, và kết quả mong đợi...')} style={css('width:100%; border:none; padding:14px 16px; font-size:14.5px; line-height:1.7; color:#0F172A; background:#ffffff; outline:none; resize:vertical; display:block; box-sizing:border-box;')}></textarea>
                  </div>

                  <div style={css('display:flex; align-items:center; gap:8px; margin-top:24px;')}>
                    <label style={css('font:800 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{t('Chủ đề') === 'Chủ đề' ? 'Category' : 'Category'}</label>
                    <span style={css('font:700 11px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#E0353F;')}>{t('Bắt buộc · được chọn nhiều')}</span>
                  </div>
                  <div style={css('display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;')}>
                    {askCategories.map((c) => (
                      <button key={c.label} onClick={c.onPick} style={css(`height:36px; padding:0 15px; border:1px solid ${c.border}; border-radius:999px; background:${c.bg}; color:${c.color}; font:700 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;`)}>{c.label}</button>
                    ))}
                  </div>
                  {askCategory.indexOf('Other') >= 0 && (
                    <input value={askOtherText} onChange={(e) => setAskOtherText(e.target.value)} placeholder={t('Nhập category của bạn...')} style={css('width:100%; box-sizing:border-box; margin-top:10px; border:1px solid #DDE3EC; border-radius:12px; background:#fff; padding:12px 15px; font:600 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0f172a; outline:none;')} />
                  )}

                  <div style={css('display:flex; align-items:center; gap:8px; margin-top:24px;')}>
                    <label style={css('font:800 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{t('Chủ đề')}</label>
                    <span style={css('font:700 11px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>Optional · tối đa 3 · {askTopicsSel.length}/3</span>
                  </div>
                  <div style={css('display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;')}>
                    {askTopics.map((tp) => (
                      <button key={tp.label} onClick={tp.onPick} style={css(`height:36px; padding:0 15px; border:1px solid ${tp.border}; border-radius:999px; background:${tp.bg}; color:${tp.color}; font:700 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer; opacity:${tp.opacity};`)}>{tp.label}</button>
                    ))}
                  </div>
                  {askTopicsSel.indexOf('Other') >= 0 && (
                    <input value={askTopicOtherText} onChange={(e) => setAskTopicOtherText(e.target.value)} placeholder={t('Nhập topic của bạn...')} style={css('width:100%; box-sizing:border-box; margin-top:10px; border:1px solid #DDE3EC; border-radius:12px; background:#fff; padding:12px 15px; font:600 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0f172a; outline:none;')} />
                  )}

                  <div style={css('display:flex; align-items:center; gap:8px; margin-top:24px;')}>
                    <label style={css('font:800 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{t('Công cụ AI')}</label>
                    <span style={css('font:700 11px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{t('Không bắt buộc')}</span>
                  </div>
                  <div style={css('display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;')}>
                    {askTools.map((tl) => (
                      <button key={tl.label} onClick={tl.onPick} style={css(`height:36px; padding:0 15px; border:1px solid ${tl.border}; border-radius:999px; background:${tl.bg}; color:${tl.color}; font:700 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;`)}>{tl.label}</button>
                    ))}
                  </div>
                  {askToolsSel.indexOf('Other') >= 0 && (
                    <input value={askToolOtherText} onChange={(e) => setAskToolOtherText(e.target.value)} placeholder={t('Nhập công cụ AI của bạn...')} style={css('width:100%; box-sizing:border-box; margin-top:10px; border:1px solid #DDE3EC; border-radius:12px; background:#fff; padding:12px 15px; font:600 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0f172a; outline:none;')} />
                  )}

                  <div style={css('display:flex; align-items:center; gap:8px; margin-top:24px;')}>
                    <label style={css('font:800 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{t('Hình ảnh')}</label>
                    <span style={css('font:700 11px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{t('Không bắt buộc')}</span>
                  </div>
                  <div style={css('display:flex; flex-wrap:wrap; gap:10px; margin-top:10px; align-items:center;')}>
                    {askFiles.map((name, i) => (
                      <span key={i} style={css('display:inline-flex; align-items:center; gap:9px; height:38px; padding:0 8px 0 14px; border:1px solid #DDE3EC; border-radius:11px; background:#ffffff; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757;')}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-4.5-4.5L7 20"></path></svg>
                        {name}
                        <button onClick={() => setAskFiles((s) => s.filter((_, j) => j !== i))} style={css('width:24px; height:24px; border:none; border-radius:7px; background:transparent; cursor:pointer; color:#94a3b8; display:flex; align-items:center; justify-content:center;')}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                        </button>
                      </span>
                    ))}
                    <button onClick={() => setAskFiles((s) => [...s, 'anh-loi-' + (s.length + 1) + '.png'])} style={css('display:inline-flex; align-items:center; gap:8px; height:38px; padding:0 16px; border:1px dashed #C9D4E6; border-radius:11px; background:#fff; color:#3366F0; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;')}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-4.5-4.5L7 20"></path></svg>
                      {t('Thêm hình ảnh')}
                    </button>
                  </div>
                </div>

                <div style={css('display:flex; align-items:center; gap:12px;')}>
                  <span style={css('font:600 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{t('Đăng dưới tên thật:')} <span style={css('color:#3A4757; font-weight:700;')}>{user ? `${user.name}${user.team ? ' · ' + user.team : ''}` : 'Chưa đăng nhập'}</span></span>
                  <div style={css('margin-left:auto; display:flex; gap:12px;')}>
                    <button onClick={() => setAskDraftSaved(true)} style={css('height:48px; padding:0 22px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;')}>{t('Lưu nháp')}</button>
                    <button onClick={postQuestion} style={css(`height:48px; padding:0 26px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer; opacity:${askOpacity}; box-shadow:0 12px 26px rgba(44,95,255,.4);`)}>{t('Đăng câu hỏi')}</button>
                  </div>
                </div>
                <div style={css(`font:600 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:${askError ? '#ff9ea2' : '#c3d0f5'};`)}>{askError}</div>
              </div>
            </div>
          </div>
        )}

        <div style={css('display:flex; justify-content:center; padding:36px 0 56px;')}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={css('display:inline-flex; align-items:center; gap:9px; height:44px; padding:0 22px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer; box-shadow:0 6px 18px rgba(30,50,90,.06);')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"></path><path d="m5 12 7-7 7 7"></path></svg>
            {t('Quay lại đầu trang')}
          </button>
        </div>
      </div>
    </div>
  )
}
