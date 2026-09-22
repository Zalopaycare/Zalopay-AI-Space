import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { css, cx, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import TopNav from '../components/TopNav.jsx'
import ImageSlot from '../components/ImageSlot.jsx'
import {
  allCases, prdMeta, caseDetail, teamsData, authorInfoFor,
  avatarColor, statusMeta, kindOf, statusOf, levelMeta, levelChip, hlList,
} from '../data/useCases.js'

const DRAFT_KEY = 'zp-usecase-draft-v1'
const CATS = ['Productivity & Personal Work', 'Content & Communication', 'Research & Knowledge', 'Data & Analysis', 'Coding & Technical', 'Automation & Workflow', 'Meeting & Collaboration', 'Design & Creative', 'Other']
const TOPICS = ['Prompting', 'Tài liệu dài', 'Tóm tắt', 'Bảo mật dữ liệu', 'Tiếng Việt', 'Ticket & CSKH', 'Code review', 'Báo cáo', 'Khác']
const TOOLS = ['Claude', 'ChatGPT', 'Codex', 'Cursor', 'Gemini', 'Copilot', 'Magnify', 'Khác']
const TOOL_LIST = ['Claude', 'GPT', 'Gemini', 'Magnify', 'Kling', 'Perplexity', 'Copilot']
const SORT_OPTS = [{ label: 'Gần nhất', val: 'new' }, { label: 'Được nhiều vote nhất', val: 'helpful' }]
const EMPTY_SHARE_FORM = { title: '', audience: '', problem: '', solution: '', prep: '', prompt: '', result: '', limits: '', contact: '', link: '', team: '' }

const chip = (on) => ({ bg: on ? '#E7ECFB' : '#fff', border: on ? '#B9CCF8' : '#DDE3EC', color: on ? '#2c5fff' : '#3A4757' })
const optStyle = (active) => `padding:9px 13px;border-radius:8px;font-size:13px;font-weight:${active ? '700' : '500'};color:${active ? '#9fd0ff' : '#c3c3d4'};background:${active ? 'rgba(46,144,255,.18)' : 'transparent'};cursor:pointer;`
const kindChipActive = 'padding:9px 16px;border-radius:10px;border:1px solid rgba(46,144,255,.6);background:rgba(46,144,255,.2);color:#cfe6ff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;'
const kindChipIdle = 'padding:9px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#c3c3d4;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;'
const libViewActiveStyle = 'width:36px;height:36px;border:none;border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#2f8dff;color:#fff;'
const libViewIdleStyle = 'width:36px;height:36px;border:none;border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:transparent;color:#9a9ab0;'

function copyTextToClipboard(text) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch { /* ignore */ }
    document.body.removeChild(ta)
    if (ok) return Promise.resolve()
  } catch { /* ignore */ }
  return navigator.clipboard?.writeText ? navigator.clipboard.writeText(text) : Promise.reject()
}

const starField = [
  ['84px', '17%', 3, '3.4s', '0s'], ['126px', '33%', 2, '4.2s', '.5s'], ['92px', '59%', 4, '3.7s', '.2s'],
  ['150px', '79%', 3, '4.6s', '.9s'], ['206px', '11%', 2, '3.9s', '1.1s'], ['236px', '45%', 3, '4.1s', '.3s'],
  ['178px', '88%', 4, '3.5s', '.7s'], ['280px', '25%', 2, '4.4s', '1s'], ['300px', '67%', 3, '3.8s', '.4s'],
  ['112px', '49%', 2, '4.3s', '.6s'], ['256px', '83%', 3, '3.6s', '1.2s'], ['322px', '39%', 2, '4.5s', '.8s'],
]

function StarField() {
  return starField.map(([top, left, size, dur, delay], i) => (
    <span
      key={i}
      style={css(`position:absolute; top:${top}; left:${left}; width:${size}px; height:${size}px; border-radius:50%; background:${size >= 3 ? '#fff' : '#cfe6ff'}; box-shadow:0 0 ${size + 4}px ${size >= 3 ? '#9fd0ff' : '#2f8dff'}; animation:twinkle ${dur} ease-in-out ${delay} infinite; z-index:1; pointer-events:none;`)}
    />
  ))
}

export default function UseCaseLibraryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const isDetail = !!id

  // ---- shared interaction state (mirrors the .dc.html Logic class' `state`) ----
  const [query, setQuery] = useState('')
  const [savedIds, setSavedIds] = useState({})
  const [dVoted, setDVoted] = useState({})
  const [dComments, setDComments] = useState({})
  const [dDraft, setDDraft] = useState('')
  const [copiedCode, setCopiedCode] = useState(null)
  const [copiedLabel, setCopiedLabel] = useState('')

  const [libCat, setLibCat] = useState(null)
  const [libTopic, setLibTopic] = useState(null)
  const [libGroup, setLibGroup] = useState(null)
  const [libTool, setLibTool] = useState(null)
  const [libKind, setLibKind] = useState(null)
  const [libSort, setLibSort] = useState('new')
  const [libView, setLibView] = useState('grid')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openDrop, setOpenDrop] = useState(null)

  const [shareOpen, setShareOpen] = useState(false)
  const [shareStage, setShareStage] = useState('form')
  const [shareForm, setShareForm] = useState(EMPTY_SHARE_FORM)
  const [shareKind, setShareKind] = useState('')
  const [shareStatus, setShareStatus] = useState('')
  const [shareLevel, setShareLevel] = useState('')
  const [shareCategory, setShareCategory] = useState([])
  const [shareTopicSel, setShareTopicSel] = useState([])
  const [shareTopicOtherText, setShareTopicOtherText] = useState('')
  const [shareToolSel, setShareToolSel] = useState([])
  const [shareToolOtherText, setShareToolOtherText] = useState('')
  const [shareFileList, setShareFileList] = useState([])
  const [shareError, setShareError] = useState('')
  const [draftSavedAt, setDraftSavedAt] = useState('')
  const [hasDraft, setHasDraft] = useState(false)

  const closeDrop = () => setOpenDrop(null)

  // click-outside closes any open dropdown/menu
  useEffect(() => {
    const onClick = () => setOpenDrop(null)
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // open the share modal via ?share=1 (used by other pages' "Share a Use Case" CTAs)
  useEffect(() => {
    if (new URLSearchParams(location.search).get('share') != null) {
      setShareOpen(true)
      setShareStage('form')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- draft restore + autosave ----
  const restoredRef = useRef(false)
  const draftJsonRef = useRef(null)
  const draftTimerRef = useRef(null)
  const draftPayload = () => ({ shareForm, shareKind, shareStatus, shareLevel, shareCategory, shareTopicSel, shareTopicOtherText, shareToolSel, shareToolOtherText, shareFileList })

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw) || {}
      setShareForm({ ...EMPTY_SHARE_FORM, ...(d.shareForm || {}) })
      setShareKind(d.shareKind || '')
      setShareStatus(d.shareStatus || '')
      setShareLevel(d.shareLevel || '')
      setShareCategory(Array.isArray(d.shareCategory) ? d.shareCategory : d.shareCategory ? [d.shareCategory] : [])
      setShareTopicSel(d.shareTopicSel || [])
      setShareTopicOtherText(d.shareTopicOtherText || '')
      setShareToolSel(d.shareToolSel || [])
      setShareToolOtherText(d.shareToolOtherText || '')
      setShareFileList(d.shareFileList || [])
      setDraftSavedAt(d.savedAt || '')
      setHasDraft(true)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!restoredRef.current) return
    const payload = draftPayload()
    const json = JSON.stringify(payload)
    if (json === draftJsonRef.current) return
    clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      const empty = !Object.values(payload.shareForm).some((v) => (v || '').trim()) && !payload.shareCategory.length && !payload.shareTopicSel.length && !payload.shareToolSel.length && !payload.shareFileList.length
      if (empty) return
      const savedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      draftJsonRef.current = json
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...payload, savedAt })) } catch { /* ignore */ }
      setDraftSavedAt(savedAt)
      setHasDraft(true)
    }, 500)
    return () => clearTimeout(draftTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareForm, shareKind, shareStatus, shareLevel, shareCategory, shareTopicSel, shareTopicOtherText, shareToolSel, shareToolOtherText, shareFileList])

  const clearDraft = () => {
    clearTimeout(draftTimerRef.current)
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
    draftJsonRef.current = null
    setHasDraft(false)
    setDraftSavedAt('')
  }

  const resetShareForm = () => {
    setShareForm(EMPTY_SHARE_FORM); setShareKind(''); setShareStatus(''); setShareLevel('')
    setShareCategory([]); setShareTopicSel([]); setShareTopicOtherText('')
    setShareToolSel([]); setShareToolOtherText(''); setShareFileList([]); setShareError(''); setShareStage('form')
  }

  // ---- card mapper shared by grid + list views ----
  const mapCard = (c) => {
    const cd = caseDetail[c.id] || {}
    const saved = !!savedIds[c.id]
    return {
      ...c,
      avInitial: c.author.slice(0, 1).toUpperCase(),
      avStyle: `width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex:none;background:${avatarColor(c.author)}`,
      toolsR: c.tools.map((name) => ({ name })),
      kindLabel: c.kind === 'tech' ? 'By tech' : 'By non-tech',
      levelLabel: levelMeta(cd.level).label,
      levelChipLight: levelChip(cd.level, false),
      levelChipDark: levelChip(cd.level, true),
      overview: c.desc || c.problem,
      statusLabel: statusMeta(c.status).label,
      statusColor: statusMeta(c.status).color,
      onOpen: () => navigate(`/use-cases/${c.id}`),
      saveFill: saved ? 'currentColor' : 'none',
      saveColor: saved ? '#2c5fff' : '#59667A',
      saveColorD: saved ? '#9fd0ff' : '#c3c3d4',
      onSave: (e) => { e.stopPropagation(); setSavedIds((s) => ({ ...s, [c.id]: !s[c.id] })) },
    }
  }

  // ---- library filter/sort/derivations ----
  const q = query.trim().toLowerCase()
  const meta = prdMeta
  const catList = useMemo(() => Array.from(new Set(allCases.map((c) => c.category))).sort((a, b) => a.localeCompare(b, 'vi')), [])
  const topicList = useMemo(() => Array.from(new Set(Object.keys(meta).reduce((acc, k) => acc.concat(meta[k].topics || []), []))).sort((a, b) => a.localeCompare(b, 'vi')), [])

  const libCases = useMemo(() => {
    let list = allCases.map((c) => ({ ...c, kind: kindOf(c.id), status: statusOf(c.id), ...(meta[c.id] || { problem: '', result: '', topics: [], helpful: 0, comments: 0 }) }))
    if (libCat) list = list.filter((c) => c.category === libCat)
    if (libTopic) list = list.filter((c) => (c.topics || []).indexOf(libTopic) >= 0)
    if (libGroup) {
      const lt = teamsData.find((x) => x.name === libGroup)
      const lm = lt ? lt.match : [libGroup]
      list = list.filter((c) => lm.some((k) => c.category.toLowerCase().includes(k.toLowerCase())))
    }
    if (libTool) list = list.filter((c) => c.tools.includes(libTool))
    if (libKind) list = list.filter((c) => c.kind === libKind)
    if (q) list = list.filter((c) => (c.title + ' ' + c.desc + ' ' + c.author + ' ' + c.category + ' ' + c.tools.join(' ')).toLowerCase().includes(q))
    if (libSort === 'helpful') list = list.slice().sort((a, b) => (b.helpful || 0) - (a.helpful || 0))
    else list = list.slice().reverse()
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libCat, libTopic, libGroup, libTool, libKind, libSort, q, savedIds])

  const libCards = libCases.slice(0, 9).map(mapCard)
  const activeFilterCount = [libCat, libTopic, libTool, libGroup, libKind].filter(Boolean).length

  const catOptions = [{ label: 'Tất cả category', val: null }, ...catList.map((c) => ({ label: c, val: c }))]
    .map((o) => ({ label: o.label, val: o.val, onClick: () => { setLibCat(o.val); closeDrop() }, style: optStyle((libCat || null) === (o.val || null)) }))
  const topicOptions = [{ label: 'Tất cả topic', val: null }, ...topicList.map((t) => ({ label: t, val: t }))]
    .map((o) => ({ label: o.label, val: o.val, onClick: () => { setLibTopic(o.val); closeDrop() }, style: optStyle((libTopic || null) === (o.val || null)) }))
  const groupOptions = [{ label: 'Tất cả nhóm', val: null }, ...teamsData.map((tm) => ({ label: tm.name, val: tm.name }))]
    .map((o) => ({ label: o.label, val: o.val, onClick: () => { setLibGroup(o.val); closeDrop() }, style: optStyle((libGroup || null) === (o.val || null)) }))
  const toolOptions = [{ label: 'Tất cả công cụ AI', val: null }, ...TOOL_LIST.map((tl) => ({ label: tl, val: tl }))]
    .map((o) => ({ label: o.label, val: o.val, onClick: () => { setLibTool(o.val); closeDrop() }, style: optStyle((libTool || null) === (o.val || null)) }))
  const sortOptions = SORT_OPTS.map((o) => ({ label: o.label, val: o.val, onClick: () => { setLibSort(o.val); closeDrop() }, style: optStyle(libSort === o.val) }))
  const libKindChips = [{ label: 'Tất cả', val: null }, { label: 'By tech', val: 'tech' }, { label: 'By non-tech', val: 'nontech' }]
    .map((o) => ({ label: o.label, onClick: () => setLibKind(o.val), style: (libKind || null) === (o.val || null) ? kindChipActive : kindChipIdle }))

  // ---- share form derivations ----
  const setField = (k) => (e) => setShareForm((f) => ({ ...f, [k]: e.target.value }))
  const fieldDefs = [
    ['title', 'Use Case Title', 'Required', 'Một câu ngắn gọn nói rõ use case làm được gì.', 'Ví dụ: Tóm tắt phản hồi khách hàng theo tuần', 'input', 0],
    ['audience', 'Dành cho ai', 'Required', 'Vai trò hoặc nhóm nào dùng được use case này.', 'Ví dụ: QC / QE, team mobile', 'input', 0],
    ['team', 'Team / Nhóm', 'Required', 'Nhóm đang làm use case, để người đọc biết hỏi ai.', 'Ví dụ: Product Ops', 'input', 0],
    ['problem', 'Problem / Context', 'Required', 'Vấn đề bạn gặp và bối cảnh công việc.', 'Mỗi tuần cần đọc hàng trăm phản hồi từ khảo sát và ticket...', 'area', 4],
    ['solution', 'Solution / How it works', 'Required', 'Các bước làm, viết sao cho người khác đọc là làm lại được.', 'Bước 1: gom dữ liệu về một file. Bước 2: ...', 'area', 5],
    ['prep', 'Cần chuẩn bị gì', 'Required', 'Công cụ, quyền truy cập, dữ liệu hoặc tài khoản cần có trước khi bắt đầu.', 'Ví dụ: tài khoản Claude nội bộ, quyền xem dashboard CSAT, file .csv export', 'area', 3],
    ['prompt', 'Prompt / Workflow', 'Required', 'Prompt hoặc workflow cụ thể để người khác làm lại được.', 'Dán prompt hoặc mô tả workflow ở đây...', 'area', 5],
    ['result', 'Result / Impact', 'Required', 'Kết quả đạt được: thời gian tiết kiệm, chất lượng, số liệu nếu có.', 'Giảm từ 4 giờ xuống 30 phút mỗi tuần...', 'area', 3],
    ['limits', 'Giới hạn & lưu ý', 'Optional', 'Chỗ nào AI còn sai, dữ liệu nào không được đưa vào, cần người kiểm lại khâu nào.', 'Không đưa dữ liệu khách hàng chưa che vào prompt...', 'area', 3],
    ['link', 'Link tài liệu / repo', 'Optional', 'Link tới tài liệu, repo hoặc file mẫu để người khác tự xem.', 'https://...', 'input', 0],
    ['contact', 'Người liên hệ (PIC)', 'Optional', 'Ai trả lời khi người đọc gặp vướng.', 'Ví dụ: Thảo NT · Product Ops', 'input', 0],
  ]
  const shareFields = fieldDefs.map(([k, label, req, hint, placeholder, kind, rows]) => ({
    key: k, label, req, hint, placeholder, rows,
    reqColor: req === 'Required' ? '#E0353F' : '#94a3b8',
    isInput: kind === 'input', isArea: kind === 'area',
    value: shareForm[k], onChange: setField(k),
  }))
  const valid = !!(shareForm.title.trim() && shareForm.audience.trim() && shareForm.team.trim() && shareForm.problem.trim() && shareForm.solution.trim() && shareForm.prep.trim() && shareForm.prompt.trim() && shareForm.result.trim() && shareCategory.length && shareKind && shareStatus && shareLevel)
  const oneOf = (val, setVal, opts) => opts.map((o) => ({ label: o, ...chip(val === o), onPick: () => setVal(val === o ? '' : o) }))
  const sections = [
    ['PROBLEM / CONTEXT', shareForm.problem], ['SOLUTION / HOW IT WORKS', shareForm.solution], ['CẦN CHUẨN BỊ GÌ', shareForm.prep],
    ['PROMPT / WORKFLOW', shareForm.prompt], ['RESULT / IMPACT', shareForm.result], ['GIỚI HẠN & LƯU Ý', shareForm.limits],
    ['LINK TÀI LIỆU / REPO', shareForm.link], ['NGƯỜI LIÊN HỆ', shareForm.contact],
  ].filter((r) => r[1].trim()).map((r) => ({ label: r[0], text: r[1] }))

  const shareCategories = CATS.map((c) => ({ label: c, ...chip(shareCategory.indexOf(c) >= 0), onPick: () => setShareCategory((s) => (s.indexOf(c) >= 0 ? s.filter((x) => x !== c) : s.concat([c]))) }))
  const shareTopics = TOPICS.map((tp) => {
    const on = shareTopicSel.indexOf(tp) >= 0
    return { label: tp, ...chip(on), opacity: !on && shareTopicSel.length >= 3 ? 0.45 : 1, onPick: () => setShareTopicSel((s) => { const has = s.indexOf(tp) >= 0; if (!has && s.length >= 3) return s; return has ? s.filter((x) => x !== tp) : [...s, tp] }) }
  })
  const shareTools = TOOLS.map((tl) => ({ label: tl, ...chip(shareToolSel.indexOf(tl) >= 0), onPick: () => setShareToolSel((s) => (s.indexOf(tl) >= 0 ? s.filter((x) => x !== tl) : [...s, tl])) }))
  const shareKinds = oneOf(shareKind, setShareKind, ['By tech', 'By non-tech'])
  const shareStatuses = oneOf(shareStatus, setShareStatus, ['Ý tưởng', 'Prototype', 'Đang dùng thật'])
  const shareLevels = oneOf(shareLevel, setShareLevel, ['Dễ', 'Trung bình', 'Khó'])
  const shareFiles = shareFileList.map((name, i) => ({ name, onRemove: () => setShareFileList((s) => s.filter((_, j) => j !== i)) }))

  const previewTitle = shareForm.title || 'Chưa có tiêu đề'
  const previewCategory = shareCategory.length ? shareCategory.join(' · ') : 'Chưa chọn category'
  const previewTopics = shareTopicSel.filter((t2) => t2 !== 'Khác').concat((shareTopicOtherText || '').split(',').map((x) => x.trim()).filter(Boolean))
  const previewTools = shareToolSel.filter((t2) => t2 !== 'Khác').concat((shareToolOtherText || '').split(',').map((x) => x.trim()).filter(Boolean))
  const previewFacts = [
    { label: 'DÀNH CHO AI', value: shareForm.audience || '—' },
    { label: 'TRẠNG THÁI', value: shareStatus || '—' },
    { label: 'ĐỘ KHÓ', value: shareLevel || '—' },
    { label: 'NGƯỜI THỰC HIỆN', value: shareKind || '—' },
    { label: 'TEAM', value: shareForm.team || '—' },
  ]

  // ================= DETAIL VIEW =================
  function renderDetail() {
    const dsel = allCases.find((x) => x.id === id) || allCases[0]
    const dkind = kindOf(dsel.id)
    const dstat = statusOf(dsel.id)
    const dinfo = authorInfoFor(dsel.author)
    const cd = caseDetail[dsel.id] || {}
    const howto = cd.howto || {}
    const painR = (cd.pain || []).map((text) => ({ text }))
    const solutionR = (cd.solution || []).map((text, i) => ({ text, num: i + 1 }))
    const resultR = (cd.result || []).map((text) => ({ text }))
    const nextR = (cd.next || []).map((text) => ({ text }))
    const prepR = hlList(howto.prep)
    const stepsR = hlList(howto.steps).map((it, i) => ({ ...it, num: i + 1 }))
    const successR = hlList(howto.success)
    const pitfallR = hlList(howto.pitfalls)
    const contactR = hlList(howto.contact)
    const factsR = [
      { label: 'DÀNH CHO AI', value: cd.audience || dsel.team || dsel.category },
      { label: 'TRẠNG THÁI', value: statusMeta(dstat).label },
      { label: 'CATEGORY', value: dsel.category },
      { label: 'CÔNG CỤ AI', value: dsel.tools.length ? dsel.tools.join(', ') : 'Không dùng AI tool trực tiếp' },
      { label: 'TEAM', value: dsel.team || '—' },
    ]
    const tablesR = (cd.tables || []).map((tb) => ({ title: tb.title, note: tb.note || '', cols: tb.cols, rows: tb.rows }))
    const codeR = (cd.code || []).map((cb, i) => ({
      ...cb,
      copyLabel: copiedCode === dsel.id + '-' + i ? copiedLabel || 'Đã copy' : 'Copy',
      onCopy: (e) => {
        e.stopPropagation()
        const mark = (label) => { setCopiedCode(dsel.id + '-' + i); setCopiedLabel(label); clearTimeout(renderDetail._t); renderDetail._t = setTimeout(() => { setCopiedCode(null); setCopiedLabel('') }, 1800) }
        copyTextToClipboard(cb.code).then(() => mark('Đã copy')).catch(() => mark('Copy lỗi'))
      },
    }))
    const galleryR = cd.gallery || []
    const base = (prdMeta[dsel.id] || {}).helpful || 0
    const voted = !!dVoted[dsel.id]
    const commentsList = dComments[dsel.id] || []

    return (
      <div>
        <section style={css('position:relative; overflow:hidden; background:#07070c; color:#fff;')}>
          <div style={css('position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px); background-size:52px 52px; -webkit-mask-image:radial-gradient(78% 74% at 28% 22%, #000 18%, transparent 72%); mask-image:radial-gradient(78% 74% at 28% 22%, #000 18%, transparent 72%); pointer-events:none;')}></div>
          <div style={css('position:absolute; left:6%; top:-60px; width:820px; height:560px; background:radial-gradient(50% 60% at 42% 42%, rgba(46,144,255,.5) 0%, rgba(30,120,240,.2) 44%, rgba(30,120,240,0) 70%); pointer-events:none;')}></div>
          <StarField />
          <TopNav />
          <div style={css('position:relative; z-index:3; max-width:1200px; margin:0 auto; padding:8px 40px 76px;')}>
            <button
              onClick={() => navigate('/use-cases')}
              className={hoverClass('color:#fff;')}
              style={css('display:inline-flex; align-items:center; gap:9px; background:none; border:none; color:#c3c3d4; font-size:14px; font-weight:600; cursor:pointer; margin-bottom:28px; padding:0;')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
              {t('Quay lại Use Case Library')}
            </button>
            <div style={css('display:grid; grid-template-columns:1fr 560px; gap:46px; align-items:start;')}>
              <div>
                <div style={css('display:flex; gap:10px; margin-bottom:22px;')}>
                  <span style={css('display:inline-flex; align-items:center; gap:7px; padding:6px 13px; border-radius:20px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); font-size:11px; font-weight:800; letter-spacing:.4px;')}>
                    <span style={css(`width:8px; height:8px; border-radius:50%; background:${statusMeta(dstat).color}; box-shadow:0 0 8px ${statusMeta(dstat).color};`)}></span>{statusMeta(dstat).up}
                  </span>
                  <span style={css('display:inline-flex; align-items:center; padding:6px 13px; border-radius:20px; background:rgba(46,144,255,.16); border:1px solid rgba(46,144,255,.4); color:#e0f0ff; font-size:11px; font-weight:800; letter-spacing:.4px;')}>{dkind === 'tech' ? 'BY TECH' : 'BY NON-TECH'}</span>
                  <span style={css(levelChip(cd.level, true))}>{levelMeta(cd.level).label}</span>
                </div>
                <h1 style={css('margin:0 0 18px; font-size:44px; line-height:1.12; font-weight:800; letter-spacing:-1.2px; color:#fff;')}>{dsel.title}</h1>
                <p style={css('margin:0 0 28px; font-size:15.5px; line-height:1.68; color:#ffffff; max-width:600px; text-wrap:pretty;')}>{dsel.desc}</p>
                <div style={css('display:flex; align-items:center; gap:14px; margin-bottom:24px;')}>
                  <span style={css(`width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex:none;background:${avatarColor(dsel.author)}`)}>{dsel.author.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <div style={css('font-size:15px; font-weight:700; color:#fff;')}>{dinfo.name}</div>
                    <div style={css('font-size:13px; color:#9a9ab0;')}>{dinfo.role}</div>
                  </div>
                </div>
                <div style={css('display:flex; gap:10px; flex-wrap:wrap;')}>
                  {dsel.tools.map((name) => (
                    <span key={name} style={css('display:inline-flex; align-items:center; padding:9px 15px; border-radius:11px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.14); font-size:13px; font-weight:600; color:#e6e6f0;')}>{name}</span>
                  ))}
                </div>
              </div>
              <div>
                <div style={css('position:relative; background:linear-gradient(150deg, rgba(46,144,255,.34), rgba(20,15,32,.96) 62%); border:1px solid rgba(46,144,255,.4); border-radius:22px; padding:16px; box-shadow:0 26px 60px rgba(30,120,240,.4);')}>
                  <div style={css('position:absolute; right:-12px; top:-16px; z-index:4; width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg,#1e6fe0,#3a8dff); display:flex; align-items:center; justify-content:center; box-shadow:0 12px 26px rgba(30,120,240,.6);')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="M7 15v-3"></path><path d="M12 15V9"></path><path d="M17 15v-6"></path></svg>
                  </div>
                  <div style={css('background:#fff; border-radius:16px; padding:16px; box-shadow:0 6px 20px rgba(15,23,42,.08);')}>
                    <div style={css('position:relative; aspect-ratio:16/10; border-radius:12px; overflow:hidden; background:#eef2f9; margin-bottom:14px;')}>
                      <ImageSlot id={'uc-hero-' + dsel.id} shape="rect" placeholder="ảnh bìa use case" />
                    </div>
                    <div style={css('display:flex; flex-direction:column; gap:12px;')}>
                      {factsR.map((fx) => (
                        <div key={fx.label} style={css('display:flex; align-items:flex-start; justify-content:space-between; gap:14px;')}>
                          <span style={css('flex:none; font-size:10.5px; font-weight:800; letter-spacing:.06em; color:#94a3b8; padding-top:2px;')}>{fx.label}</span>
                          <span style={css('text-align:right; font-size:12.5px; font-weight:700; line-height:1.5; color:#0f172a;')}>{fx.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div style={css('position:relative; z-index:4; background:#07070c; padding:46px 40px 60px;')}>
          <div style={css('max-width:1200px; margin:0 auto;')}>
            <div style={css('display:grid; grid-template-columns:1fr; gap:24px; margin-bottom:26px;')}>
              <div style={css('border:1px solid #E6EBF3; border-radius:20px; padding:26px 28px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30);')}>
                <div style={css('font-size:17px; font-weight:800; color:#0F172A; margin-bottom:12px;')}>{t('Vấn đề')}</div>
                <p style={css('margin:0 0 16px; font-size:14px; line-height:1.65; color:#3A4757; text-wrap:pretty;')}>{cd.problem || dsel.desc}</p>
                <div style={css('display:flex; flex-direction:column; gap:11px;')}>
                  {painR.map((p, i) => (
                    <div key={i} style={css('display:flex; gap:10px; font-size:13.5px; line-height:1.55; color:#3A4757;')}>
                      <span style={css('flex:none; margin-top:6px; width:6px; height:6px; border-radius:50%; background:#E0353F;')}></span>{p.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={css('border:1px solid #E6EBF3; border-radius:20px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30); padding:26px 28px; margin-bottom:26px;')}>
              <div style={css('font-size:17px; font-weight:800; color:#0F172A; margin-bottom:22px;')}>Cách làm</div>
              <div style={css('display:grid; grid-auto-flow:column; grid-auto-columns:minmax(0,1fr); gap:0;')}>
                {solutionR.map((st) => (
                  <div key={st.num} style={css('position:relative; display:flex; flex-direction:column; gap:14px; padding:0 14px;')}>
                    <div style={css('position:relative; display:flex; align-items:center; height:34px;')}>
                      <span style={css('position:absolute; left:0; right:0; top:16px; height:2px; background:#DCE6FB;')}></span>
                      <span style={css('position:relative; z-index:1; width:34px; height:34px; border-radius:50%; background:#E7ECFB; border:2px solid #B9CCF8; color:#2c5fff; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800;')}>{st.num}</span>
                    </div>
                    <span style={css('font-size:13.5px; line-height:1.6; color:#3A4757; text-wrap:pretty;')}>{st.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={css('border:1px solid #E6EBF3; border-radius:20px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30); padding:26px 28px; margin-bottom:26px;')}>
              <div style={css('font-size:17px; font-weight:800; color:#0F172A; margin-bottom:20px;')}>{t('Kết quả')} &amp; trạng thái</div>
              <div style={css('display:grid; grid-template-columns:1fr 1fr; gap:18px;')}>
                <div style={css('background:#F2FBF6; border:1px solid #CFEEDE; border-radius:16px; padding:20px 22px;')}>
                  <div style={css('font-size:13px; font-weight:800; color:#00893F; margin-bottom:14px;')}>Đã đạt được</div>
                  <div style={css('display:flex; flex-direction:column; gap:12px;')}>
                    {resultR.map((r, i) => (
                      <div key={i} style={css('display:flex; gap:10px; font-size:13.5px; line-height:1.6; color:#2F4A3C;')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00A352" strokeWidth="2.4" style={{ flex: 'none', marginTop: 2 }}><path d="M20 6 9 17l-5-5"></path></svg>{r.text}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={css('background:#FFF8E8; border:1px solid #F3E0B0; border-radius:16px; padding:20px 22px;')}>
                  <div style={css('font-size:13px; font-weight:800; color:#B45300; margin-bottom:14px;')}>{t('Giới hạn & lưu ý')}</div>
                  <div style={css('display:flex; flex-direction:column; gap:12px;')}>
                    {nextR.map((n, i) => (
                      <div key={i} style={css('display:flex; gap:10px; font-size:13.5px; line-height:1.6; color:#5A4522;')}>
                        <span style={css('flex:none; margin-top:7px; width:6px; height:6px; border-radius:50%; background:#E39100;')}></span>{n.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={css('border:1px solid #E6EBF3; border-radius:20px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30); padding:26px 28px; margin-bottom:26px;')}>
              <div style={css('display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:6px;')}>
                <div style={css('font-size:17px; font-weight:800; color:#0F172A;')}>Làm theo</div>
                <span style={css(levelChip(cd.level, false))}>{levelMeta(cd.level).label}</span>
              </div>
              <div style={css('font-size:12.5px; color:#64748b; margin-bottom:22px;')}>Phần <span style={css('color:#C8102E; font-weight:700;')}>chữ đỏ</span> là nội dung đề xuất thêm, chưa có trong tài liệu gốc — cần người phụ trách xác nhận.</div>

              <div style={css('display:grid; grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr); gap:22px; margin-bottom:22px;')}>
                <div style={css('background:#F7F9FD; border:1px solid #E6EBF3; border-radius:16px; padding:20px 22px;')}>
                  <div style={css('font-size:13px; font-weight:800; color:#2c5fff; margin-bottom:14px;')}>{t('Cần chuẩn bị gì')}</div>
                  <div style={css('display:flex; flex-direction:column; gap:11px;')}>
                    {prepR.map((it, i) => (
                      <div key={i} style={css(`display:flex; gap:10px; font-size:13.5px; line-height:1.6; color:${it.color};`)}>
                        <span style={css(`flex:none; margin-top:7px; width:6px; height:6px; border-radius:50%; background:${it.dot};`)}></span>{it.text}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={css('background:#ffffff; border:1px solid #E6EBF3; border-radius:16px; padding:20px 22px;')}>
                  <div style={css('font-size:13px; font-weight:800; color:#2c5fff; margin-bottom:14px;')}>Các bước</div>
                  <div style={css('display:flex; flex-direction:column; gap:13px;')}>
                    {stepsR.map((it) => (
                      <div key={it.num} style={css('display:flex; gap:12px; align-items:flex-start;')}>
                        <span style={css('flex:none; width:24px; height:24px; border-radius:50%; background:#E7ECFB; border:1px solid #B9CCF8; color:#2c5fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800;')}>{it.num}</span>
                        <span style={css(`font-size:13.5px; line-height:1.6; color:${it.color}; text-wrap:pretty;`)}>{it.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={css('display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:22px; margin-bottom:22px;')}>
                <div style={css('background:#F2FBF6; border:1px solid #CFEEDE; border-radius:16px; padding:20px 22px;')}>
                  <div style={css('font-size:13px; font-weight:800; color:#00893F; margin-bottom:14px;')}>Biết là thành công khi</div>
                  <div style={css('display:flex; flex-direction:column; gap:12px;')}>
                    {successR.map((it, i) => (
                      <div key={i} style={css(`display:flex; gap:10px; font-size:13.5px; line-height:1.6; color:${it.color};`)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00A352" strokeWidth="2.4" style={{ flex: 'none', marginTop: 2 }}><path d="M20 6 9 17l-5-5"></path></svg>{it.text}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={css('background:#FDF3F4; border:1px solid #F5D6DA; border-radius:16px; padding:20px 22px;')}>
                  <div style={css('font-size:13px; font-weight:800; color:#C0303A; margin-bottom:14px;')}>Lỗi hay gặp</div>
                  <div style={css('display:flex; flex-direction:column; gap:12px;')}>
                    {pitfallR.map((it, i) => (
                      <div key={i} style={css(`display:flex; gap:10px; font-size:13.5px; line-height:1.6; color:${it.color};`)}>
                        <span style={css('flex:none; margin-top:7px; width:6px; height:6px; border-radius:50%; background:#E0353F;')}></span>{it.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={css('background:linear-gradient(120deg,#2c5fff 0%,#1a3fd6 100%); border-radius:16px; padding:18px 22px;')}>
                <div style={css('font-size:13px; font-weight:800; color:#ffffff; margin-bottom:10px;')}>Hỏi ai</div>
                <div style={css('display:flex; flex-direction:column; gap:8px;')}>
                  {contactR.map((it, i) => (
                    <div key={i} style={css('display:flex; gap:10px; font-size:13.5px; line-height:1.6; color:#ffffff;')}>
                      <span style={css('flex:none; margin-top:7px; width:6px; height:6px; border-radius:50%; background:#ffffff;')}></span><span style={css('color:#ffffff;')}>{it.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {tablesR.map((tb, ti) => (
              <div key={ti} style={css('border:1px solid #E6EBF3; border-radius:20px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30); padding:24px 26px; margin-bottom:26px;')}>
                <div style={css('font-size:17px; font-weight:800; color:#0F172A; margin-bottom:6px;')}>{tb.title}</div>
                <div style={css('font-size:12.5px; color:#64748b; margin-bottom:16px;')}>{tb.note}</div>
                <table style={css('width:100%; border-collapse:collapse; font-size:13px;')}>
                  <thead>
                    <tr>
                      {tb.cols.map((c, ci) => (
                        <th key={ci} style={css('padding:10px 12px; text-align:left; font-size:11px; font-weight:800; letter-spacing:.06em; color:#2c5fff; background:#F4F7FE; border-bottom:1px solid #E6EBF3;')}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tb.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={css('padding:11px 12px; border-bottom:1px solid #F1F4FA; font-size:13px; line-height:1.55; color:#3A4757; vertical-align:top;')}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {codeR.map((cb, ci) => (
              <div key={ci} style={css('border:1px solid #E6EBF3; border-radius:20px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30); padding:24px 26px; margin-bottom:26px;')}>
                <div style={css('display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px;')}>
                  <span style={css('font-size:12px; font-weight:800; letter-spacing:.07em; color:#2c5fff;')}>{cb.title}</span>
                  <button onClick={cb.onCopy} className={hoverClass('background:#F2F6FF; border-color:#B9CCF8;')} style={css('display:inline-flex; align-items:center; gap:7px; height:32px; padding:0 14px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer;')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>
                    {cb.copyLabel}
                  </button>
                </div>
                <pre style={css('margin:0; padding:16px 18px; border:1px solid #DDE3EC; border-radius:12px; background:#F7F9FD; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12.5px; line-height:1.7; color:#0F172A; white-space:pre-wrap; word-break:break-word;')}>{cb.code}</pre>
              </div>
            ))}

            {galleryR.length > 0 && (
              <div style={css('border:1px solid #E6EBF3; border-radius:20px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30); padding:26px 28px; margin-bottom:26px;')}>
                <div style={css('font-size:17px; font-weight:800; color:#0F172A; margin-bottom:18px;')}>Hình ảnh &amp; demo</div>
                <div style={css('display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px;')}>
                  {galleryR.map((g) => (
                    <div key={g.id}>
                      <div style={css('position:relative; aspect-ratio:16/9; border-radius:14px; overflow:hidden; border:1px solid #E6EBF3; background:#eef2f9;')}>
                        <ImageSlot id={g.id} shape="rect" placeholder={g.placeholder} />
                      </div>
                      <div style={css('margin-top:9px; font-size:12.5px; color:#64748b;')}>{g.caption}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!!dsel.repoHref && (
              <div style={css('border:1px solid #E6EBF3; border-radius:20px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30); padding:20px 24px; margin-bottom:26px; display:flex; align-items:center; justify-content:space-between; gap:18px; flex-wrap:wrap;')}>
                <div>
                  <div style={css('font-size:11px; font-weight:800; letter-spacing:.07em; color:#94a3b8;')}>SOURCE</div>
                  <div style={css('margin-top:3px; font-size:14px; font-weight:700; color:#0F172A;')}>{dsel.repo}</div>
                </div>
                <a href={dsel.repoHref} target="_blank" rel="noopener" className={hoverClass('background:#DCE6FB;')} style={css('display:inline-flex; align-items:center; gap:9px; padding:11px 18px; border:1px solid #B9CCF8; border-radius:999px; background:#E7ECFB; color:#2c5fff; text-decoration:none; font-size:13px; font-weight:700;')}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path></svg>
                  Mở repo
                </a>
              </div>
            )}

            <div style={css('border:1px solid #E6EBF3; border-radius:20px; padding:24px 28px; margin-bottom:36px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30);')}>
              <div style={css('display:flex; align-items:center; gap:12px; flex-wrap:wrap;')}>
                <button
                  onClick={() => setDVoted((s) => ({ ...s, [dsel.id]: !s[dsel.id] }))}
                  style={css(`display:inline-flex; align-items:center; gap:9px; height:44px; padding:0 20px; border:1px solid ${voted ? '#B9CCF8' : '#DDE3EC'}; border-radius:999px; background:${voted ? '#EAF1FF' : '#fff'}; color:${voted ? '#2c5fff' : '#3A4757'}; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer;`)}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill={voted ? '#2c5fff' : 'none'} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.6 3.4L13.5 9h5a2.5 2.5 0 0 1 2.4 3.1l-1.7 7A2.5 2.5 0 0 1 16.8 22H7Z"></path><path d="M7 22H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3"></path></svg>
                  {base + (voted ? 1 : 0)} người thấy hữu ích
                </button>
                <span style={css('display:inline-flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:#94a3b8;')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"></path></svg>
                  {commentsList.length} bình luận
                </span>
              </div>

              <div style={css('display:flex; gap:12px; margin-top:20px; align-items:flex-start;')}>
                <span style={css('width:36px; height:36px; border-radius:50%; flex:none; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800;')}>NT</span>
                <div style={{ flex: 1 }}>
                  <textarea
                    value={dDraft}
                    onChange={(e) => setDDraft(e.target.value)}
                    rows={2}
                    placeholder={t('Viết bình luận về use case này...')}
                    style={css('width:100%; border:1px solid #E6EBF3; border-radius:12px; padding:12px 14px; font-family:inherit; font-size:14px; line-height:1.6; color:#0f172a; background:#fff; outline:none; resize:vertical; display:block;')}
                  />
                  <div style={css('display:flex; justify-content:flex-end; margin-top:10px;')}>
                    <button
                      onClick={() => {
                        const text = dDraft.trim()
                        if (!text) return
                        setDComments((s) => ({ ...s, [dsel.id]: [{ author: 'Nguyễn Thảo', initials: 'NT', time: 'Vừa xong', body: text }, ...(s[dsel.id] || [])] }))
                        setDDraft('')
                      }}
                      style={css(`height:38px; padding:0 20px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:13.5px; font-weight:700; cursor:pointer; opacity:${dDraft.trim() ? 1 : 0.5};`)}
                    >
                      {t('Gửi bình luận')}
                    </button>
                  </div>
                </div>
              </div>

              <div style={css('display:flex; flex-direction:column; gap:14px; margin-top:8px;')}>
                {commentsList.map((c, i) => (
                  <div key={i} style={css('display:flex; gap:12px; padding-top:14px; border-top:1px solid #EEF1F7;')}>
                    <span style={css('width:36px; height:36px; border-radius:50%; flex:none; background:#EAF1FF; color:#2c5fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800;')}>{c.initials}</span>
                    <div>
                      <div style={css('font-size:13px; font-weight:700; color:#0F172A;')}>{c.author} <span style={css('font-weight:500; color:#94a3b8;')}>· {c.time}</span></div>
                      <div style={css('margin-top:4px; font-size:13.5px; line-height:1.65; color:#3A4757;')}>{c.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={css('position:relative; overflow:hidden; border-radius:22px; padding:32px 38px; background:radial-gradient(58% 120% at 93% 6%, rgba(46,144,255,.42) 0%, rgba(46,144,255,0) 46%), linear-gradient(122deg,#0b1f5e 0%,#1a5fff 52%,#3a8dff 100%); display:flex; align-items:center; justify-content:space-between; color:#fff; gap:24px;')}>
              <div>
                <div style={css('font-size:24px; font-weight:800; letter-spacing:-.5px; margin-bottom:8px;')}>Share your AI with Zalopay</div>
                <p style={css('margin:0; font-size:14px; line-height:1.6; color:rgba(255,255,255,.88);')}>{t('Bạn có một AI use case hay workflow hữu ích?')}<br />{t('Hãy chia sẻ để cùng nhau học hỏi và tạo ra giá trị lớn hơn cho Zalopay.')}</p>
              </div>
              <div style={css('display:flex; align-items:center; gap:18px; flex:none;')}>
                <button onClick={() => { setShareOpen(true); setShareStage((s) => (s === 'submitted' ? 'form' : s)) }} style={css('display:inline-flex; align-items:center; gap:9px; padding:14px 26px; border-radius:12px; background:#fff; color:#1a5fff; font-size:15px; font-weight:700; box-shadow:0 14px 30px rgba(40,10,90,.34); border:none; cursor:pointer;')}>
                  {t('Chia sẻ ngay')}
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================= LIBRARY VIEW =================
  function renderLibrary() {
    return (
      <div style={css('background:#07070c; color:#fff;')}>
        <section style={css('position:relative; overflow:hidden;')}>
          <div style={css('position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px); background-size:52px 52px; -webkit-mask-image:radial-gradient(82% 62% at 50% 16%, #000 26%, transparent 76%); mask-image:radial-gradient(82% 62% at 50% 16%, #000 26%, transparent 76%); pointer-events:none;')}></div>
          <div style={css('position:absolute; left:50%; top:70px; transform:translateX(-50%); width:1180px; height:600px; background:radial-gradient(50% 56% at 50% 40%, rgba(150,190,255,.62) 0%, rgba(26,95,255,.6) 22%, rgba(16,60,210,.3) 48%, rgba(16,60,210,0) 72%); pointer-events:none;')}></div>
          <div style={css('position:absolute; left:50%; top:150px; transform:translateX(-50%); width:560px; height:320px; background:radial-gradient(50% 50% at 50% 50%, rgba(120,170,255,.55) 0%, rgba(60,120,255,0) 70%); filter:blur(6px); pointer-events:none;')}></div>
          <div style={css('position:absolute; left:50%; top:348px; transform:translateX(-50%); width:2600px; height:2600px; border-radius:50%; background:#07070c; border-top:1.5px solid rgba(165,200,255,.95); box-shadow:0 -2px 92px 10px rgba(26,95,255,.68), inset 0 8px 82px rgba(46,120,255,.3); pointer-events:none;')}></div>
          <StarField />
          <TopNav />
          <div style={css('position:relative; z-index:4; height:600px;')}>
            <h1 style={css('position:absolute; top:190px; left:0; right:0; margin:0; text-align:center; font-family:"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; font-size:104px; line-height:1; font-weight:700; letter-spacing:-3px; background:linear-gradient(180deg,#ffffff 0%,#cfe3ff 46%,#4f93ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 6px 40px rgba(26,95,255,.85)) drop-shadow(0 0 16px rgba(90,150,255,.6));')}>{t('Thư viện Use Case')}</h1>
          </div>
        </section>

        <section style={css('background:transparent; padding:26px 40px 52px;')}>
          <div style={css('max-width:1200px; margin:0 auto;')}>
            <div style={css('display:flex; align-items:center; gap:12px; margin-bottom:16px;')}>
              <button
                onClick={(e) => { e.stopPropagation(); setFiltersOpen((s) => !s); setOpenDrop(null) }}
                className={hoverClass('background:rgba(255,255,255,.1);')}
                style={css('display:inline-flex; align-items:center; gap:9px; padding:12px 16px; border-radius:12px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.05); color:#e6e6f0; font-size:13.5px; font-weight:600; cursor:pointer; font-family:inherit;')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18"></path><path d="M7 12h10"></path><path d="M10 18h4"></path></svg>
                {activeFilterCount ? `Filters · ${activeFilterCount}` : 'Filters'}
              </button>
              <div style={css('flex:1; display:flex; align-items:center; gap:10px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:12px 15px;')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a9ab0" strokeWidth="2"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3-3"></path></svg>
                <input
                  placeholder={t('Tìm use case: PRD, báo cáo, phân tích dữ liệu, ...')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={css('flex:1; border:none; outline:none; font-size:13.5px; color:#e6e6f0; font-family:inherit; background:transparent;')}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <button onClick={(e) => { e.stopPropagation(); setOpenDrop((s) => (s === 'sort' ? null : 'sort')) }} style={css('display:inline-flex; align-items:center; gap:10px; justify-content:space-between; min-width:130px; padding:12px 15px; border-radius:12px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.05); color:#e6e6f0; font-size:13.5px; font-weight:600; cursor:pointer; font-family:inherit;')}>
                  {(SORT_OPTS.find((o) => o.val === libSort) || SORT_OPTS[0]).label}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a9ab0" strokeWidth="2"><path d="m6 9 6 6 6-6"></path></svg>
                </button>
                {openDrop === 'sort' && (
                  <Dropdown options={sortOptions} />
                )}
              </div>
              <div style={css('display:flex; gap:4px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:4px;')}>
                <button onClick={() => setLibView('grid')} style={css(libView === 'grid' ? libViewActiveStyle : libViewIdleStyle)}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>
                </button>
                <button onClick={() => setLibView('list')} style={css(libView === 'list' ? libViewActiveStyle : libViewIdleStyle)}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></svg>
                </button>
              </div>
            </div>

            {filtersOpen && (
              <div style={css('display:flex; align-items:center; gap:12px; margin-bottom:18px; padding:16px; border:1px solid rgba(255,255,255,.1); border-radius:14px; background:rgba(255,255,255,.03); flex-wrap:wrap;')}>
                <FilterDropdown label={t('Chủ đề') === 'Chủ đề' ? (libCat || 'Tất cả category') : libCat || 'Tất cả category'} name="cat" openDrop={openDrop} setOpenDrop={setOpenDrop} options={catOptions} width={240} />
                <FilterDropdown label={libTopic || 'Tất cả topic'} name="topic" openDrop={openDrop} setOpenDrop={setOpenDrop} options={topicOptions} width={220} />
                <FilterDropdown label={libTool || 'Tất cả công cụ AI'} name="tool" openDrop={openDrop} setOpenDrop={setOpenDrop} options={toolOptions} width={210} />
                <FilterDropdown label={libGroup || 'Tất cả nhóm'} name="group" openDrop={openDrop} setOpenDrop={setOpenDrop} options={groupOptions} width={220} />
                <div style={css('display:flex; align-items:center; gap:10px; flex-wrap:wrap;')}>
                  {libKindChips.map((chip2, i) => (
                    <button key={i} onClick={chip2.onClick} style={css(chip2.style)}>{chip2.label}</button>
                  ))}
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setLibCat(null); setLibTopic(null); setLibTool(null); setLibGroup(null); setLibKind(null); setOpenDrop(null) }}
                    style={css('margin-left:auto; padding:11px 15px; border-radius:12px; border:1px solid rgba(255,255,255,.12); background:transparent; color:#9fd0ff; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit;')}
                  >
                    {t('Xoá bộ lọc')}
                  </button>
                )}
              </div>
            )}

            <div id="lib-grid">
              {libCards.length === 0 && (
                <div style={css('padding:74px 0; text-align:center; color:#8a8a9e; font-size:15px;')}>{t('Không tìm thấy use case phù hợp. Thử đổi bộ lọc hoặc từ khóa khác nhé.')}</div>
              )}

              {libView === 'grid' && libCards.length > 0 && (
                <div style={css('display:grid; grid-template-columns:repeat(3,1fr); gap:20px;')}>
                  {libCards.map((c) => (
                    <div
                      key={c.id}
                      onClick={c.onOpen}
                      className={hoverClass('transform:translateY(-4px); box-shadow:0 24px 54px rgba(30,50,90,.18); border-color:#CFE0FF;')}
                      style={css('position:relative; display:flex; flex-direction:column; height:100%; border:1px solid #E6EBF3; border-radius:16px; background:#ffffff; cursor:pointer; padding:16px; box-shadow:0 14px 36px rgba(30,50,90,.1); transition:transform .16s, box-shadow .16s, border-color .16s;')}
                    >
                      <div style={css('position:relative; aspect-ratio:16/9; border-radius:12px; overflow:hidden; margin-bottom:14px; background:#eef2f9;')}>
                        <ImageSlot id={'lib-' + c.id} shape="rect" placeholder="ảnh use case 16:9" />
                        <span style={css('position:absolute; bottom:10px; left:10px; z-index:3; display:inline-flex; align-items:center; padding:5px 11px; border-radius:20px; background:#59667A; font-size:10.5px; font-weight:700; color:#fff; box-shadow:0 2px 10px rgba(0,0,0,.18); pointer-events:none;')}>{c.kindLabel}</span>
                      </div>
                      <button onClick={c.onSave} title="Lưu use case" className={hoverClass('background:#F2F6FF;')} style={css(`position:absolute; top:26px; right:26px; z-index:6; width:28px; height:28px; border-radius:8px; background:rgba(255,255,255,.94); border:1px solid #E6EBF3; box-shadow:0 4px 14px rgba(20,30,60,.16); cursor:pointer; color:${c.saveColor}; display:flex; align-items:center; justify-content:center;`)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={c.saveFill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                      </button>
                      <div style={css('display:flex; margin-bottom:9px;')}><span style={css(c.levelChipLight)}>{c.levelLabel}</span></div>
                      <h3 style={css('margin:0 0 8px; font-size:15px; font-weight:700; line-height:1.3; color:#0F172A;')}>{c.title}</h3>
                      <p style={css('margin:0 0 14px; font-size:12.5px; line-height:1.55; color:#5B6675; text-wrap:pretty; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;')}>{c.overview}</p>
                      <div style={css('display:flex; align-items:center; gap:8px; margin-bottom:12px; min-width:0;')}>
                        <span style={css(c.avStyle)}>{c.avInitial}</span>
                        <span style={css('font-size:12.5px; font-weight:700; color:#0F172A;')}>{c.author}</span>
                        <span style={css('color:#CDD5DD;')}>·</span>
                        <span style={css('font-size:12.5px; color:#64748b; white-space:nowrap;')}>{c.category}</span>
                      </div>
                      <div style={css('display:flex; align-items:center; gap:7px; flex-wrap:wrap;')}>
                        {c.toolsR.map((tool) => (
                          <span key={tool.name} style={css('display:inline-flex; align-items:center; padding:4px 10px; border-radius:8px; border:1px solid #DDE3EC; background:#fff; font-size:11.5px; font-weight:600; color:#3A4757;')}>{tool.name}</span>
                        ))}
                        {(c.topics || []).map((tp) => (
                          <span key={tp} style={css('display:inline-flex; align-items:center; padding:4px 10px; border-radius:8px; background:#E7ECFB; font-size:11.5px; font-weight:600; color:#2c5fff;')}>{tp}</span>
                        ))}
                      </div>
                      <div style={css('display:flex; align-items:center; justify-content:flex-end; gap:16px; margin-top:auto; padding-top:12px; border-top:1px solid #EEF1F7;')}>
                        <span style={css('display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#3A4757;')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00A65A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.5 3.4L13.5 9H19a2 2 0 0 1 2 2.4l-1.7 8A2 2 0 0 1 17.3 22z"></path></svg>
                          {c.helpful} {t('hữu ích')}
                        </span>
                        <span style={css('display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#94a3b8;')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                          {c.comments}
                        </span>
                      </div>
                      <button onClick={c.onOpen} className={hoverClass('box-shadow:0 12px 26px rgba(44,95,255,.46); transform:translateY(-1px);')} style={css('margin-top:16px; width:100%; display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:11px 16px; border-radius:11px; border:1px solid rgba(255,255,255,.35); background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 8px 18px rgba(44,95,255,.34); transition:filter .16s, box-shadow .16s, transform .16s;')}>
                        {t('Xem Use Case')}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {libView === 'list' && libCards.length > 0 && (
                <div style={css('display:flex; flex-direction:column; gap:14px;')}>
                  {libCards.map((c) => (
                    <div
                      key={c.id}
                      onClick={c.onOpen}
                      className={hoverClass('transform:translateY(-3px); box-shadow:0 16px 36px rgba(30,120,240,.3); border-color:rgba(46,144,255,.6);')}
                      style={css('position:relative; border:1px solid rgba(46,144,255,.4); border-radius:16px; background:linear-gradient(150deg, rgba(46,144,255,.28) 0%, rgba(17,13,26,.98) 58%); cursor:pointer; padding:18px 22px; transition:transform .16s, box-shadow .16s, border-color .16s;')}
                    >
                      <div style={css('display:flex; align-items:center; gap:8px; margin-bottom:11px; padding-right:40px; flex-wrap:wrap;')}>
                        <span style={css('display:inline-flex; align-items:center; gap:5px; padding:5px 11px; border-radius:20px; background:rgba(46,144,255,.14); font-size:10.5px; font-weight:700; color:#9fd0ff;')}>{c.kindLabel}</span>
                        <span style={css(c.levelChipDark)}>{c.levelLabel}</span>
                        {(c.topics || []).map((tp) => (
                          <span key={tp} style={css('display:inline-flex; align-items:center; padding:5px 11px; border-radius:20px; background:rgba(255,255,255,.06); font-size:10.5px; font-weight:700; color:#c3c3d4;')}>{tp}</span>
                        ))}
                      </div>
                      <h3 style={css('margin:0 0 9px; font-size:16px; font-weight:700; line-height:1.3; color:#fff;')}>{c.title}</h3>
                      <div style={css('display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin-bottom:14px; max-width:860px;')}>
                        <div>
                          <div style={css('font-size:10px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#ff9f6b; margin-bottom:4px;')}>{t('Vấn đề')}</div>
                          <div style={css('font-size:12.5px; line-height:1.5; color:#c3c3d4;')}>{c.problem}</div>
                        </div>
                        <div>
                          <div style={css('font-size:10px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#9fd0ff; margin-bottom:4px;')}>{t('Dùng AI thế nào')}</div>
                          <div style={css('font-size:12.5px; line-height:1.5; color:#c3c3d4;')}>{c.desc}</div>
                        </div>
                        <div>
                          <div style={css('font-size:10px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#6ee7a8; margin-bottom:4px;')}>{t('Kết quả')}</div>
                          <div style={css('font-size:12.5px; line-height:1.5; color:#c3c3d4;')}>{c.result}</div>
                        </div>
                      </div>
                      <div style={css('display:flex; align-items:center; gap:16px; margin-bottom:12px;')}>
                        <span style={css('display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#c3c3d4;')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6ee7a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.5 3.4L13.5 9H19a2 2 0 0 1 2 2.4l-1.7 8A2 2 0 0 1 17.3 22z"></path></svg>
                          {c.helpful} {t('hữu ích')}
                        </span>
                        <span style={css('display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#9a9ab0;')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                          {c.comments}
                        </span>
                      </div>
                      <div style={css('display:flex; align-items:center; gap:14px; flex-wrap:wrap;')}>
                        <div style={css('display:flex; align-items:center; gap:8px;')}>
                          <span style={css(c.avStyle)}>{c.avInitial}</span>
                          <span style={css('font-size:12.5px; font-weight:700; color:#e6e6f0;')}>{c.author}</span>
                          <span style={css('color:rgba(255,255,255,.25);')}>·</span>
                          <span style={css('font-size:12.5px; color:#9a9ab0;')}>{c.category}</span>
                        </div>
                        <div style={css('display:flex; align-items:center; gap:7px; flex-wrap:wrap;')}>
                          {c.toolsR.map((tool) => (
                            <span key={tool.name} style={css('display:inline-flex; align-items:center; padding:4px 10px; border-radius:8px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); font-size:11.5px; font-weight:600; color:#c3c3d4;')}>{tool.name}</span>
                          ))}
                        </div>
                      </div>
                      <button onClick={c.onSave} title="Lưu use case" className={hoverClass('background:rgba(255,255,255,.12);')} style={css(`position:absolute; top:14px; right:14px; z-index:6; width:28px; height:28px; border:none; border-radius:8px; background:rgba(255,255,255,.06); cursor:pointer; color:${c.saveColorD}; display:flex; align-items:center; justify-content:center;`)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={c.saveFill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section style={css('background:transparent; padding:6px 40px 34px;')}>
          <div style={css('position:relative; overflow:hidden; max-width:1200px; margin:0 auto; background:radial-gradient(58% 120% at 93% 6%, rgba(46,144,255,.42) 0%, rgba(46,144,255,0) 46%), linear-gradient(122deg,#0a1f52 0%,#1e5fd6 52%,#2f8dff 100%); border:1px solid rgba(255,255,255,.14); border-radius:24px; padding:44px 46px; display:grid; grid-template-columns:1fr 1.18fr; gap:44px; align-items:center; box-shadow:0 26px 60px rgba(20,80,200,.42);')}>
            <div style={css('position:relative; z-index:1;')}>
              <h2 style={css('margin:0 0 12px; font-size:28px; font-weight:800; letter-spacing:-.5px; color:#fff;')}>Share your AI use case with us</h2>
              <p style={css('margin:0 0 26px; font-size:14.5px; line-height:1.65; color:rgba(255,255,255,.88);')}>{t('Bạn đang dùng AI để giải quyết công việc hiệu quả hơn?')}<br />{t('Hãy chia sẻ để cùng nhau học hỏi và tạo ra giá trị lớn hơn cho Zalopay nhé!')}</p>
              <div style={css('display:flex; align-items:center; gap:18px;')}>
                <button onClick={() => { setShareOpen(true); setShareStage((s) => (s === 'submitted' ? 'form' : s)) }} className={hoverClass('transform:translateY(-2px); box-shadow:0 18px 40px rgba(6,30,120,.5);')} style={css('display:inline-flex; align-items:center; gap:9px; padding:13px 24px; border-radius:12px; background:#fff; color:#1e5fd6; font-size:15px; font-weight:700; box-shadow:0 14px 30px rgba(6,30,120,.34); transition:transform .16s, box-shadow .16s; border:none; cursor:pointer;')}>
                  {t('Chia sẻ Use Case')}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M7 17 17 7"></path><path d="M7 7h10v10"></path></svg>
                </button>
              </div>
            </div>
            <div style={css('position:relative; z-index:1; display:flex; align-items:stretch; justify-content:space-between; gap:10px;')}>
              {[
                { n: '1.', title: '1. Điền form ngắn', desc: t('Chia sẻ workflow & tài liệu liên quan của bạn') },
                { n: '2.', title: '2. Zalopay AI Team hỗ trợ', desc: t('Phỏng vấn nhanh và giúp bạn trình bày lại một cách trự quan hơn') },
                { n: '3.', title: '3. Lan tỏa giá trị', desc: t('Use case của bạn được publish để mọi người cùng khám phá') },
              ].map((step, i) => (
                <div key={i} style={css('flex:1; text-align:center; padding:22px 14px; border-radius:18px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.22); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); box-shadow:inset 0 1px 0 rgba(255,255,255,.3);')}>
                  <div style={css('position:relative; width:56px; height:56px; margin:0 auto 14px; border-radius:16px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.34); box-shadow:0 8px 22px rgba(6,30,120,.42), inset 0 1px 0 rgba(255,255,255,.5);')}>
                    <div style={css(`position:absolute; inset:0; border-radius:16px; background:radial-gradient(circle at 50% 30%, rgba(130,195,255,.75), rgba(130,195,255,0) 70%); animation:glowpulse 3.6s ease-in-out infinite ${i * 0.5}s;`)}></div>
                    <span style={{ position: 'relative', fontSize: 22, fontWeight: 800, color: '#fff', filter: 'drop-shadow(0 0 6px rgba(255,255,255,.6))' }}>{step.n}</span>
                  </div>
                  <div style={css('font-size:14px; font-weight:700; color:#fff; margin-bottom:6px;')}>{step.title}</div>
                  <div style={css('font-size:12px; line-height:1.5; color:rgba(255,255,255,.82);')}>{step.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  }

  // ================= SHARE MODAL =================
  function renderShareModal() {
    const shareHeading = shareStage === 'submitted' ? 'Use case đã được gửi' : shareStage === 'preview' ? 'Preview use case' : t('Chia sẻ Use Case')
    const shareSubhead = shareStage === 'submitted' ? 'Admin sẽ xem xét và bạn nhận được thông báo về kết quả.' : 'Mô tả cách bạn dùng AI để người khác làm lại được. Bài sẽ qua bước Admin duyệt.'
    const shareOpacity = valid ? 1 : 0.5
    const shareHint = shareError || 'Sau khi gửi, bài ở trạng thái Pending Review và chưa hiển thị trong Library.'
    const shareHintColor = shareError ? '#D8232A' : '#94a3b8'

    return (
      <div
        onClick={() => { setShareOpen(false); setShareError('') }}
        style={css('position:fixed; inset:0; z-index:4000; background:rgba(4,8,20,.66); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); display:flex; align-items:flex-start; justify-content:center; padding:48px 24px; overflow-y:auto; font-family:"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}
      >
        <div onClick={(e) => e.stopPropagation()} style={css('width:880px; max-width:100%; background:#eef1f9; border-radius:24px; box-shadow:0 44px 110px rgba(2,8,30,.6); overflow:hidden;')}>
          <div style={css('position:relative; background:linear-gradient(180deg,#0c1533 0%,#070b1c 100%); padding:26px 32px 28px;')}>
            <button onClick={() => { setShareOpen(false); setShareError('') }} title="Đóng" style={css('position:absolute; top:22px; right:22px; width:36px; height:36px; border-radius:11px; border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.08); color:#dbe6ff; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0;')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
            <h1 style={css('margin:0; padding-right:56px; font-size:26px; font-weight:800; line-height:1.25; letter-spacing:-.01em; color:#fff;')}>{shareHeading}</h1>
            <p style={css('margin:9px 0 0; padding-right:56px; font-size:14px; line-height:1.6; color:rgba(206,219,245,.72);')}>{shareSubhead}</p>
            <div style={css('display:flex; align-items:center; gap:12px; margin-top:16px; flex-wrap:wrap;')}>
              <span style={css('display:inline-flex; align-items:center; gap:8px; height:30px; padding:0 13px; border-radius:999px; background:rgba(22,214,140,.14); border:1px solid rgba(22,214,140,.34); font-size:12px; font-weight:700; color:#6fe3aa;')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                {hasDraft ? 'Nháp đã lưu lúc ' + draftSavedAt : 'Nháp tự lưu khi bạn gõ'}
              </span>
              {hasDraft && (
                <button onClick={clearDraft} style={css('height:30px; padding:0 13px; border-radius:999px; border:1px solid rgba(255,255,255,.2); background:transparent; color:#c3d0f5; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer;')}>{t('Xoá nháp')}</button>
              )}
            </div>
          </div>

          <div style={css('padding:26px 32px 34px;')}>
            <div style={css('display:flex; flex-direction:column; gap:16px;')}>
              {shareStage === 'submitted' && (
                <div style={css('background:#fff; border:1px solid #E6EBF3; border-radius:20px; padding:34px 30px; box-shadow:0 10px 24px rgba(30,50,90,.06); text-align:center;')}>
                  <div style={css('width:56px; height:56px; margin:0 auto; border-radius:18px; background:#FFF1E0; display:flex; align-items:center; justify-content:center;')}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#B45300" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>
                  </div>
                  <div style={css('margin-top:16px; font-size:19px; font-weight:800; color:#0F172A;')}>{t('Đã gửi để Admin duyệt')}</div>
                  <div style={css('margin-top:8px; font-size:14px; line-height:1.6; color:#64748b;')}>Use case ở trạng thái <strong style={{ color: '#B45300' }}>Pending Review</strong>. Bạn sẽ nhận thông báo khi được duyệt hoặc bị từ chối kèm lý do. Trong lúc chờ, bài chưa xuất hiện trong Library.</div>
                  <div style={css('display:flex; justify-content:center; gap:12px; margin-top:22px;')}>
                    <a href="/profile" onClick={(e) => { e.preventDefault(); navigate('/profile') }} style={css('display:inline-flex; align-items:center; height:44px; padding:0 20px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font-size:13.5px; font-weight:700; text-decoration:none;')}>{t('Xem trong My Posts')}</a>
                    <button onClick={() => { setShareOpen(false); navigate('/use-cases') }} style={css('height:44px; padding:0 22px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:13.5px; font-weight:700; cursor:pointer;')}>{t('Về Library')}</button>
                  </div>
                </div>
              )}

              {shareStage === 'preview' && (
                <div>
                  <div style={css('display:flex; align-items:center; gap:10px; background:#EEF3FF; border:1px solid #CFE0FF; border-radius:14px; padding:13px 18px; font-size:13.5px; font-weight:700; color:#1E44A8;')}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2c5fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7"></path></svg>
                    {t('Preview — đây là cách use case hiển thị sau khi được duyệt.')}
                  </div>
                  <div style={css('margin-top:16px; background:#fff; border:1px solid #E6EBF3; border-radius:20px; padding:28px 30px; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                    <div style={css('display:flex; align-items:center; gap:8px; flex-wrap:wrap;')}>
                      <span style={css('display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:#E7ECFB; color:#2c5fff; font-size:11.5px; font-weight:700;')}>{previewCategory}</span>
                      {previewTopics.map((t2, i) => (
                        <span key={i} style={css('display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:#EDF0FA; color:#3A4757; font-size:11.5px; font-weight:700;')}>{t2}</span>
                      ))}
                      {previewTools.map((tl, i) => (
                        <span key={i} style={css('display:inline-flex; align-items:center; height:26px; padding:0 10px; border:1px solid #DDE3EC; border-radius:8px; font-size:11.5px; font-weight:700; color:#3A4757;')}>{tl}</span>
                      ))}
                    </div>
                    <h2 style={css('margin:14px 0 0; font-size:24px; font-weight:800; line-height:1.3; color:#0F172A;')}>{previewTitle}</h2>
                    <div style={css('display:flex; align-items:center; gap:11px; margin-top:12px;')}>
                      <span style={css('width:28px; height:28px; border-radius:50%; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800;')}>NT</span>
                      <span style={css('font-size:13px; font-weight:700; color:#0F172A;')}>Nguyễn Thảo</span>
                      <span style={css('color:#CDD5DD;')}>·</span>
                      <span style={css('font-size:13px; color:#94a3b8;')}>Product Ops</span>
                    </div>
                    <div style={css('margin-top:20px; border:1px solid #E6EBF3; border-radius:14px; background:#F8FAFE; padding:6px 16px;')}>
                      {previewFacts.map((fa, i) => (
                        <div key={i} style={css('display:flex; align-items:center; justify-content:space-between; gap:16px; padding:10px 0; border-bottom:1px solid #EAF0FA;')}>
                          <span style={css('font-size:11px; font-weight:800; letter-spacing:.08em; color:#94a3b8;')}>{fa.label}</span>
                          <span style={css('font-size:13px; font-weight:700; color:#0F172A; text-align:right;')}>{fa.value}</span>
                        </div>
                      ))}
                    </div>
                    {sections.map((s, i) => (
                      <div key={i} style={css('margin-top:24px;')}>
                        <div style={css('font-size:12.5px; font-weight:700; letter-spacing:.4px; color:#94a3b8;')}>{s.label}</div>
                        <p style={css('margin:8px 0 0; font-size:15px; line-height:1.7; color:#3A4757; white-space:pre-wrap; text-wrap:pretty;')}>{s.text}</p>
                      </div>
                    ))}
                    {shareFileList.map((f, i) => (
                      <span key={i} style={css('display:inline-flex; align-items:center; gap:9px; margin-top:18px; height:38px; padding:0 14px; border:1px solid #DDE3EC; border-radius:11px; background:#F8FAFE; font-size:12.5px; font-weight:700; color:#3A4757;')}>{f}</span>
                    ))}
                  </div>
                  <div style={css('display:flex; align-items:center; gap:12px; margin-top:16px;')}>
                    <button onClick={() => setShareStage('form')} style={css('height:48px; padding:0 22px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer;')}>{t('Quay lại chỉnh sửa')}</button>
                    <button
                      onClick={() => {
                        if (!valid) { setShareError('Còn thiếu thông tin bắt buộc — điền đủ các mục Required trước khi gửi duyệt.'); return }
                        setShareStage('submitted'); setShareError(''); clearDraft()
                      }}
                      style={css('margin-left:auto; height:48px; padding:0 26px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 12px 26px rgba(44,95,255,.4);')}
                    >
                      {t('Gửi duyệt')}
                    </button>
                  </div>
                </div>
              )}

              {shareStage === 'form' && (
                <div>
                  <div style={css('background:#fff; border:1px solid #E6EBF3; border-radius:20px; padding:26px 28px; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                    {shareFields.map((f) => (
                      <div key={f.key} style={css('margin-bottom:24px;')}>
                        <div style={css('display:flex; align-items:center; gap:8px;')}>
                          <label style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{f.label}</label>
                          <span style={css(`font-size:11px; font-weight:700; color:${f.reqColor};`)}>{f.req}</span>
                        </div>
                        <div style={css('margin-top:5px; font-size:12.5px; color:#94a3b8;')}>{f.hint}</div>
                        {f.isInput && (
                          <input value={f.value} onChange={f.onChange} placeholder={f.placeholder} style={css('width:100%; margin-top:10px; border:1px solid #E6EBF3; border-radius:12px; padding:13px 15px; font-family:inherit; font-size:15px; color:#0f172a; background:#fff; outline:none; box-sizing:border-box;')} />
                        )}
                        {f.isArea && (
                          <textarea value={f.value} onChange={f.onChange} rows={f.rows} placeholder={f.placeholder} style={css('width:100%; margin-top:10px; border:1px solid #E6EBF3; border-radius:12px; padding:13px 15px; font-family:inherit; font-size:14.5px; line-height:1.7; color:#0f172a; background:#fff; outline:none; resize:vertical; display:block; box-sizing:border-box;')} />
                        )}
                      </div>
                    ))}

                    <ChipGroup title="Người thực hiện" required="Required · chọn một" options={shareKinds} />
                    <ChipGroup title="Trạng thái" required="Required · chọn một" options={shareStatuses} />
                    <ChipGroup title="Độ khó khi làm lại" required="Required · chọn một" options={shareLevels} last />

                    <div style={css('display:flex; align-items:center; gap:8px;')}>
                      <label style={css('font-size:14px; font-weight:800; color:#0F172A;')}>Category</label>
                      <span style={css('font-size:11px; font-weight:700; color:#E0353F;')}>{t('Required · được chọn nhiều')}</span>
                    </div>
                    <div style={css('display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;')}>
                      {shareCategories.map((c) => (
                        <button key={c.label} onClick={c.onPick} style={css(`height:36px; padding:0 15px; border:1px solid ${c.border}; border-radius:999px; background:${c.bg}; color:${c.color}; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer;`)}>{c.label}</button>
                      ))}
                    </div>

                    <div style={css('display:flex; align-items:center; gap:8px; margin-top:24px;')}>
                      <label style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{t('Chủ đề')}</label>
                      <span style={css('font-size:11px; font-weight:700; color:#94a3b8;')}>Optional · tối đa 3 · {shareTopicSel.length}/3</span>
                    </div>
                    <div style={css('display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;')}>
                      {shareTopics.map((tp) => (
                        <button key={tp.label} onClick={tp.onPick} style={css(`height:36px; padding:0 15px; border:1px solid ${tp.border}; border-radius:999px; background:${tp.bg}; color:${tp.color}; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; opacity:${tp.opacity};`)}>{tp.label}</button>
                      ))}
                    </div>
                    {shareTopicSel.indexOf('Khác') >= 0 && (
                      <input value={shareTopicOtherText} onChange={(e) => setShareTopicOtherText(e.target.value)} placeholder="Nhập topic khác, cách nhau bằng dấu phẩy" style={css('width:100%; box-sizing:border-box; height:40px; margin-top:10px; padding:0 14px; border:1px solid #DDE3EC; border-radius:10px; background:#fff; font-family:inherit; font-size:13.5px; color:#0F172A; outline:none;')} />
                    )}

                    <div style={css('display:flex; align-items:center; gap:8px; margin-top:24px;')}>
                      <label style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{t('Công cụ AI')}</label>
                      <span style={css('font-size:11px; font-weight:700; color:#94a3b8;')}>{t('Không bắt buộc')}</span>
                    </div>
                    <div style={css('display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;')}>
                      {shareTools.map((tl) => (
                        <button key={tl.label} onClick={tl.onPick} style={css(`height:36px; padding:0 15px; border:1px solid ${tl.border}; border-radius:999px; background:${tl.bg}; color:${tl.color}; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer;`)}>{tl.label}</button>
                      ))}
                    </div>
                    {shareToolSel.indexOf('Khác') >= 0 && (
                      <input value={shareToolOtherText} onChange={(e) => setShareToolOtherText(e.target.value)} placeholder="Nhập công cụ AI khác, cách nhau bằng dấu phẩy" style={css('width:100%; box-sizing:border-box; height:40px; margin-top:10px; padding:0 14px; border:1px solid #DDE3EC; border-radius:10px; background:#fff; font-family:inherit; font-size:13.5px; color:#0F172A; outline:none;')} />
                    )}

                    <div style={css('display:flex; align-items:center; gap:8px; margin-top:24px;')}>
                      <label style={css('font-size:14px; font-weight:800; color:#0F172A;')}>Attachments</label>
                      <span style={css('font-size:11px; font-weight:700; color:#94a3b8;')}>{t('Không bắt buộc · ảnh chụp màn hình, file mẫu')}</span>
                    </div>
                    <div style={css('display:flex; flex-wrap:wrap; gap:10px; margin-top:10px; align-items:center;')}>
                      {shareFiles.map((f, i) => (
                        <span key={i} style={css('display:inline-flex; align-items:center; gap:9px; height:38px; padding:0 8px 0 14px; border:1px solid #DDE3EC; border-radius:11px; background:#F8FAFE; font-size:12.5px; font-weight:700; color:#3A4757;')}>
                          {f.name}
                          <button onClick={f.onRemove} style={css('width:24px; height:24px; border:none; border-radius:7px; background:transparent; cursor:pointer; color:#94a3b8; display:flex; align-items:center; justify-content:center;')}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                          </button>
                        </span>
                      ))}
                      <button onClick={() => setShareFileList((s) => [...s, 'screenshot-' + (s.length + 1) + '.png'])} style={css('display:inline-flex; align-items:center; gap:8px; height:38px; padding:0 16px; border:1px dashed #C9D4E6; border-radius:11px; background:#fff; color:#3366F0; font-family:inherit; font-size:12.5px; font-weight:700; cursor:pointer;')}>Attach file</button>
                    </div>
                  </div>

                  <div style={css('display:flex; align-items:center; gap:12px; margin-top:16px;')}>
                    <span style={css('font-size:12.5px; font-weight:600; color:#94a3b8;')}>{t('Điền đủ các mục Required để người đọc hiểu và làm lại được. Admin duyệt trước khi publish.')}</span>
                    <div style={css('margin-left:auto; display:flex; gap:12px;')}>
                      <button onClick={() => { setHasDraft(true); localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draftPayload(), savedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) })); setShareOpen(false) }} style={css('height:48px; padding:0 22px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer;')}>{t('Lưu nháp & đóng')}</button>
                      <button
                        onClick={() => {
                          if (!valid) { setShareError('Còn thiếu thông tin bắt buộc — điền đủ các mục Required để người khác đọc là làm lại được.'); return }
                          setShareStage('preview'); setShareError('')
                        }}
                        style={css(`height:48px; padding:0 22px; border:1px solid #B9CCF8; border-radius:999px; background:#E7ECFB; color:#2c5fff; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; opacity:${shareOpacity};`)}
                      >
                        {t('Xem trước')}
                      </button>
                      <button
                        onClick={() => {
                          if (!valid) { setShareError('Còn thiếu thông tin bắt buộc — điền đủ các mục Required trước khi gửi duyệt.'); return }
                          setShareStage('submitted'); setShareError(''); clearDraft()
                        }}
                        style={css(`height:48px; padding:0 26px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; opacity:${shareOpacity}; box-shadow:0 12px 26px rgba(44,95,255,.4);`)}
                      >
                        {t('Gửi duyệt')}
                      </button>
                    </div>
                  </div>
                  <div style={css(`margin-top:10px; font-size:12.5px; font-weight:600; color:${shareHintColor};`)}>{shareHint}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {isDetail ? renderDetail() : renderLibrary()}
      {shareOpen && renderShareModal()}
    </>
  )
}

function Dropdown({ options }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={css('position:absolute; top:50px; right:0; z-index:30; width:170px; background:#14141c; border:1px solid rgba(255,255,255,.1); border-radius:12px; box-shadow:0 18px 40px rgba(0,0,0,.5); padding:6px;')}
    >
      {options.map((opt, i) => (
        <div key={i} onClick={opt.onClick} className={hoverClass('background:rgba(255,255,255,.06);')} style={css(opt.style)}>{opt.label}</div>
      ))}
    </div>
  )
}

function FilterDropdown({ label, name, openDrop, setOpenDrop, options, width }) {
  const open = openDrop === name
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpenDrop(open ? null : name) }}
        style={css('display:inline-flex; align-items:center; gap:10px; justify-content:space-between; min-width:190px; padding:11px 15px; border-radius:12px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.05); color:#e6e6f0; font-size:13.5px; font-weight:600; cursor:pointer; font-family:inherit;')}
      >
        {label}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a9ab0" strokeWidth="2"><path d="m6 9 6 6 6-6"></path></svg>
      </button>
      {open && (
        <div onClick={(e) => e.stopPropagation()} style={css(`position:absolute; top:50px; left:0; z-index:30; width:${width}px; max-height:300px; overflow:auto; background:#14141c; border:1px solid rgba(255,255,255,.1); border-radius:12px; box-shadow:0 18px 40px rgba(0,0,0,.5); padding:6px;`)}>
          {options.map((opt, i) => (
            <div key={i} onClick={opt.onClick} className={hoverClass('background:rgba(255,255,255,.06);')} style={css(opt.style)}>{opt.label}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChipGroup({ title, required, options, last }) {
  return (
    <>
      <div style={css('display:flex; align-items:center; gap:8px; margin-bottom:10px;')}>
        <label style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{title}</label>
        <span style={css('font-size:11px; font-weight:700; color:#E0353F;')}>{required}</span>
      </div>
      <div style={css(`display:flex; flex-wrap:wrap; gap:8px; margin-bottom:${last ? 24 : 24}px;`)}>
        {options.map((o) => (
          <button key={o.label} onClick={o.onPick} style={css(`height:36px; padding:0 15px; border:1px solid ${o.border}; border-radius:999px; background:${o.bg}; color:${o.color}; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer;`)}>{o.label}</button>
        ))}
      </div>
    </>
  )
}
