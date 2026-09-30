import { useEffect, useMemo, useRef, useState } from 'react'
import { copyWithToast } from '../lib/clipboard.js'
import { rememberReturn, hasReturn, pendingReturn, useScrollReturn } from '../lib/scrollReturn.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { useTitle } from '../hooks/useTitle.js'
import CoverImage from '../components/CoverImage.jsx'
import { AI_TOOLS, OTHER } from '../lib/taxonomy.js'
import { renderMentions } from '../components/MentionField.jsx'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useDialog } from '../hooks/useDialog.js'
import { css, cx, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import CommentMenu, { InlineEdit, useCommentModals, Chevron } from '../components/CommentMenu.jsx'
import { api, relativeTime } from '../lib/api.js'
import { usePublishedUseCases, loadPublishedUseCases } from '../lib/publishedUseCases.js'
import Layout from '../components/Layout.jsx'
import SpaceBackdrop from '../components/SpaceBackdrop.jsx'
import CardActions from '../components/CardActions.jsx'
import TagRow from '../components/TagRow.jsx'
import FilterPill from '../components/FilterPill.jsx'
import { DETAIL_COL, DetailHero, Section, ProblemSolution, ResultBody, ApplySection, TechSection, Toc, BulletList, PlainTable, scrollToId, Images, FloatingBack } from '../components/UseCaseDetailParts.jsx'
import { buildTemplate } from '../data/useCaseTemplate.js'
import MentionInput from '../components/MentionInput.jsx'
import PageActionBar from '../components/PageActionBar.jsx'
import {
  allCases, prdMeta, caseDetail, teamsData, authorInfoFor,
  avatarColor, statusMeta, kindOf, statusOf, levelMeta, levelChip,
  newestFirst, postedLabel,
} from '../data/useCases.js'

const DRAFT_KEY = 'zp-usecase-draft-v1'
const CATS = ['Productivity & Personal Work', 'Content & Communication', 'Research & Knowledge', 'Data & Analysis', 'Coding & Technical', 'Automation & Workflow', 'Meeting & Collaboration', 'Design & Creative', 'Other']
const TOPICS = ['Prompting', 'Tài liệu dài', 'Tóm tắt', 'Bảo mật dữ liệu', 'Tiếng Việt', 'Ticket & CSKH', 'Code review', 'Báo cáo', 'Khác']
const TOOLS = [...AI_TOOLS, OTHER]
const TOOL_LIST = AI_TOOLS
const SORT_OPTS = [{ label: 'Mới nhất', val: 'new' }, { label: 'Nổi bật', val: 'helpful' }]
const EMPTY_SHARE_FORM = { title: '', audience: '', problem: '', solution: '', prep: '', prompt: '', result: '', limits: '', contact: '', link: '', team: '' }

const chip = (on) => ({ bg: on ? '#E7ECFB' : '#fff', border: on ? '#B9CCF8' : '#DDE3EC', color: on ? '#2c5fff' : '#3A4757' })



export default function UseCaseLibraryPage() {
  const { id } = useParams()
  const { version: pubV, loaded: pubLoaded } = usePublishedUseCases()
  useScrollReturn(!id && pubLoaded ? pubV + 1 : false) // back from a use case -> same place in the list
  useTitle(id ? (allCases.find((x) => x.id === id) || {}).title || 'Use case' : 'Thư viện Use Case')
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const { user, requireLogin } = useAuth()
  const isDetail = !!id

  // ---- shared interaction state (mirrors the .dc.html Logic class' `state`) ----
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') || '')
  const [ucMeta, setUcMeta] = useState({}) // id -> { helpful, iHelped, saved, comments: [] }
  const [dDraft, setDDraft] = useState('')
  const dBoxRef = useRef(null)
  const replyBoxRef = useRef(null)
  const [replyTarget, setReplyTarget] = useState(null) // { parentId, authorName } | null
  const [replyDraft, setReplyDraft] = useState('')
  const [editingCmt, setEditingCmt] = useState(null) // comment id being edited
  const ucModals = useCommentModals(api)
  const [expandedThreads, setExpandedThreads] = useState(() => new Set())
  const [openMenuId, setOpenMenuId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const [libCat, setLibCat] = useState(() => new URLSearchParams(window.location.search).get('cat'))
  const [libTopic, setLibTopic] = useState(null)
  const [libGroup, setLibGroup] = useState(null)
  const [libTool, setLibTool] = useState(() => new URLSearchParams(window.location.search).get('tool'))
  const [libKind, setLibKind] = useState(null)
  const [libSort, setLibSort] = useState(() => new URLSearchParams(window.location.search).get('sort') || 'new')
  // Filters, sort and search live in the URL (?q=&cat=&tool=&sort=) so a view can be shared and Back restores it.
  useUrlFilters({ q: [query, setQuery, ''], cat: [libCat, setLibCat, null], tool: [libTool, setLibTool, null], sort: [libSort, setLibSort, 'new'] }, !id)
  const [libPage, setLibPage] = useState(() => pendingReturn()?.page || 1)
  const [openDrop, setOpenDrop] = useState(null)

  const [shareOpen, setShareOpen] = useState(false)
  // Optional cover image: { url } for display; `data` only when the author picked a new file (sent
  // as a data URL, downscaled first); `cleared` when they removed an existing one.
  const [shareCover, setShareCover] = useState(null)
  const [coverError, setCoverError] = useState('')
  const pickCover = (file) => {
    setCoverError('')
    if (!file) return
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { setCoverError('Chỉ nhận ảnh PNG, JPG, WEBP hoặc GIF.'); return }
    const img = new Image()
    const src = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height))
      const cv = document.createElement('canvas')
      cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale)
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
      const data = cv.toDataURL('image/jpeg', 0.85)
      URL.revokeObjectURL(src)
      if (data.length > 2.6 * 1024 * 1024) { setCoverError('Ảnh quá lớn, chọn ảnh khác nhỏ hơn.'); return }
      setShareCover({ url: data, data })
    }
    img.onerror = () => { URL.revokeObjectURL(src); setCoverError('Không đọc được ảnh này.') }
    img.src = src
  }
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
  // Editing a submission the admin sent back ("Yêu cầu chỉnh sửa"): { id, note } | null
  const [editing, setEditing] = useState(null)
  const [draftSavedAt, setDraftSavedAt] = useState('')
  const [hasDraft, setHasDraft] = useState(false)

  const closeDrop = () => setOpenDrop(null)

  // click-outside closes any open dropdown/menu
  useEffect(() => {
    const onClick = () => setOpenDrop(null)
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // ?edit=<id>: reopen my submission, prefilled, to fix what the admin asked for and resubmit.
  useEffect(() => {
    const editId = new URLSearchParams(location.search).get('edit')
    if (!editId) return
    api.listSubmissions('?mine=1').then((d) => {
      const s = (d.submissions || []).find((x) => x.id === editId)
      if (!s) return
      setShareForm({ title: s.title || '', audience: s.audience || '', problem: s.problem || '', solution: s.solution || '', prep: s.prep || '', prompt: s.prompt || '', result: s.result || '', limits: s.limits || '', contact: s.contact || '', link: s.link || '', team: s.team || '' })
      setShareKind(s.kind || ''); setShareStatus(s.status || ''); setShareLevel(s.level || '')
      setShareCategory([].concat(s.category || []))
      const known = (list, all) => list.filter((x) => all.includes(x))
      const extra = (list, all) => list.filter((x) => !all.includes(x))
      const tps = s.topics || [], tls = s.tools || []
      setShareTopicSel([...known(tps, TOPICS), ...(extra(tps, TOPICS).length ? ['Khác'] : [])]); setShareTopicOtherText(extra(tps, TOPICS).join(', '))
      setShareToolSel([...known(tls, TOOLS), ...(extra(tls, TOOLS).length ? ['Khác'] : [])]); setShareToolOtherText(extra(tls, TOOLS).join(', '))
      setEditing({ id: s.id, note: s.adminNote || '', status: s.reviewStatus })
      setShareCover(s.coverUrl ? { url: s.coverUrl } : null)
      setShareStage('form'); setShareError(''); setShareOpen(true)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  // open the share modal via ?share=1 (used by other pages' "Share a Use Case" CTAs) — also when
  // the link is clicked while already on this page, since the page doesn't remount.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('share') != null) {
      setShareOpen(true)
      setShareStage((st) => (st === 'submitted' ? 'form' : st))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])
  // Closing keeps the autosaved draft; ?share / ?edit are dropped so the same link opens it again.
  const closeShare = () => {
    setShareOpen(false); setShareError('')
    if (editing) { setEditing(null); resetShareForm() }
    const qs = new URLSearchParams(location.search)
    if (qs.has('share') || qs.has('edit')) { qs.delete('share'); qs.delete('edit'); navigate({ pathname: location.pathname, search: qs.toString() ? '?' + qs : '' }, { replace: true }) }
  }
  const shareDialog = useDialog(shareOpen, () => closeShare(), 'Chia sẻ Use Case')
  const delDialog = useDialog(!!confirmDeleteId, () => setConfirmDeleteId(null), t('Xác nhận xoá'))

  // Sidebar's "Tìm kiếm" link (/use-cases#search) should land focused in the search box
  const searchInputRef = useRef(null)
  useEffect(() => {
    if (location.hash === '#search' && searchInputRef.current) {
      searchInputRef.current.focus()
      searchInputRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [location.hash])

  // real helpful-vote counts + comments for each use case, backed by the API
  const refreshMeta = (ucId) => api.useCaseMeta(ucId).then((d) => setUcMeta((s) => ({ ...s, [ucId]: d }))).catch(() => {})
  useEffect(() => { allCases.forEach((c) => refreshMeta(c.id)) }, [pubV])
  useEffect(() => { if (id) refreshMeta(id) }, [id])
  useEffect(() => {
    if (!id || location.hash !== '#comments') return
    const tm = setTimeout(() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250)
    return () => clearTimeout(tm)
  }, [id, location.hash])

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

  const deleteUseCase = (ucId) => {
    api.deleteUseCase(ucId).then(() => {
      loadPublishedUseCases(true)
      if (id === ucId) navigate('/use-cases')
      setUcMeta((m) => { const n = { ...m }; delete n[ucId]; return n })
      setConfirmDeleteId(null)
    }).catch(() => setConfirmDeleteId(null))
  }

  const toggleThread = (pid) => setExpandedThreads((s) => { const n = new Set(s); if (n.has(pid)) n.delete(pid); else n.add(pid); return n })
  const startReply = (topId, authorName, replyToId) => { setReplyTarget({ parentId: topId, authorName, replyToId }); setReplyDraft(''); setExpandedThreads((s) => new Set(s).add(topId)) }
  const cancelReply = () => { setReplyTarget(null); setReplyDraft('') }
  const submitReply = (ucId) => {
    const text = (replyBoxRef.current ? replyBoxRef.current.expand(replyDraft) : replyDraft).trim()
    if (!text || !replyTarget) return
    requireLogin(() => api.commentUseCase(ucId, text, replyTarget.parentId, (allCases.find((x) => x.id === ucId) || {}).title, { replyToId: replyTarget.replyToId, ownerHandle: (allCases.find((x) => x.id === ucId) || {}).author }).then(() => { refreshMeta(ucId); cancelReply() }).catch(() => {}))
  }

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
    if (!restoredRef.current || editing) return
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

  const submitShare = () => {
    if (!valid) { setShareError('Còn thiếu thông tin bắt buộc — điền đủ các mục Bắt buộc trước khi gửi duyệt.'); return }
    requireLogin(() => {
      (editing ? (p) => api.updateSubmission(editing.id, p) : api.submitUseCase)({
        title: shareForm.title.trim(), audience: shareForm.audience.trim(), team: shareForm.team.trim(),
        problem: shareForm.problem.trim(), solution: shareForm.solution.trim(), prep: shareForm.prep.trim(),
        prompt: shareForm.prompt.trim(), result: shareForm.result.trim(), limits: shareForm.limits.trim(),
        contact: shareForm.contact.trim(), link: shareForm.link.trim(),
        kind: shareKind, status: shareStatus, level: shareLevel,
        category: shareCategory, topics: previewTopics, tools: previewTools,
        ...(shareCover?.data ? { cover: shareCover.data } : shareCover?.cleared ? { cover: null } : {}),
      }).then(() => { setShareStage('submitted'); setShareError(''); if (!editing) clearDraft(); if (editing?.status === 'approved') { loadPublishedUseCases(true); refreshMeta(editing.id) } })
        .catch(() => setShareError('Không gửi được use case, thử lại.'))
    })
  }

  const resetShareForm = () => {
    setShareForm(EMPTY_SHARE_FORM); setShareKind(''); setShareStatus(''); setShareLevel('')
    setShareCategory([]); setShareTopicSel([]); setShareTopicOtherText('')
    setShareToolSel([]); setShareToolOtherText(''); setShareFileList([]); setShareError(''); setShareStage('form')
    setShareCover(null); setCoverError('')
  }

  // ---- card mapper shared by grid + list views ----
  const mapCard = (c) => {
    const cd = caseDetail[c.id] || {}
    const live = ucMeta[c.id]
    const saved = live ? live.saved : false
    const voted = live ? live.iHelped : false
    return {
      ...c,
      avInitial: c.author.slice(0, 1).toUpperCase(),
      posted: postedLabel(c),
      avStyle: `width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex:none;background:${avatarColor(c.author)}`,
      avStyleL: `width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex:none;background:${avatarColor(c.author)}`,
      toolsR: c.tools.map((name) => ({ name })),
      kindLabel: c.kind === 'tech' ? 'By tech' : 'By non-tech',
      levelLabel: levelMeta(cd.level).label,
      levelChipLight: levelChip(cd.level, false),
      levelChipDark: levelChip(cd.level, true),
      overview: c.desc || c.problem,
      canDelete: !!user && !!c.authorId && (c.authorId === user.id || !!user.isAdmin),
      canEdit: !!user && !!c.authorId && c.authorId === user.id,
      statusLabel: statusMeta(c.status).label,
      statusColor: statusMeta(c.status).color,
      onOpen: () => { rememberReturn(c.id, { page: libPage }); navigate(`/use-cases/${c.id}`) },
      onOpenComments: () => { rememberReturn(c.id, { page: libPage }); navigate(`/use-cases/${c.id}#comments`) },
      saveFill: saved ? 'currentColor' : 'none',
      saveColor: saved ? '#2c5fff' : '#59667A',
      saveColorD: saved ? '#9fd0ff' : '#c3c3d4',
      onSave: (e) => { e.stopPropagation(); requireLogin(() => api.saveUseCase(c.id).then(() => refreshMeta(c.id)).catch(() => {})) },
      helpBg: voted ? '#EAF1FF' : '#fff',
      helpBorder: voted ? '#B9CCF8' : '#DDE3EC',
      helpColor: voted ? '#2c5fff' : '#3A4757',
      helpFill: voted ? '#2c5fff' : 'none',
      helped: voted,
      onHelpful: (e) => { e.stopPropagation(); requireLogin(() => api.reactUseCase(c.id).then(() => refreshMeta(c.id)).catch(() => {})) },
    }
  }

  // ---- library filter/sort/derivations ----
  const q = query.trim().toLowerCase()
  const meta = prdMeta
  const catList = useMemo(() => Array.from(new Set(allCases.map((c) => c.category))).sort((a, b) => a.localeCompare(b, 'vi')), [pubV])

  const libCases = useMemo(() => {
    let list = allCases.map((c) => {
      const m = meta[c.id] || { problem: '', result: '', topics: [], helpful: 0, comments: 0 }
      const live = ucMeta[c.id]
      return { ...c, kind: kindOf(c.id), status: statusOf(c.id), ...m, ...(live ? { helpful: live.helpful, comments: live.comments.length } : {}) }
    })
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
    // Newest first: approved community submissions (already newest-first), then the built-ins.
    else list = newestFirst(list)
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libCat, libTopic, libGroup, libTool, libKind, libSort, q, ucMeta, pubV])

  useEffect(() => { setLibPage(1) }, [query, libCat, libTool, libSort, libGroup, libTopic])
  const PAGE_SIZE = 6
  const pageCount = Math.max(1, Math.ceil(libCases.length / PAGE_SIZE))
  const curPage = Math.min(libPage, pageCount)
  const libCards = libCases.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE).map(mapCard)
  const activeFilterCount = [libCat, libTopic, libTool, libGroup, libKind].filter(Boolean).length

  const catOptions = [{ label: 'Tất cả category', val: null }, ...catList.map((c) => ({ label: c, val: c }))]
    .map((o) => ({ label: t(o.label), active: (libCat || null) === (o.val || null), onClick: () => { setLibCat(o.val); closeDrop() } }))
  const toolOptions = [{ label: 'Tất cả công cụ AI', val: null }, ...TOOL_LIST.map((tl) => ({ label: tl, val: tl }))]
    .map((o) => ({ label: t(o.label), active: (libTool || null) === (o.val || null), onClick: () => { setLibTool(o.val); closeDrop() } }))
  const sortOptions = SORT_OPTS.map((o) => ({ label: t(o.label), active: libSort === o.val, onClick: () => { setLibSort(o.val); closeDrop() } }))
  const libFilters = (
    <>
      <FilterPill label={libCat || t('Category')} active={!!libCat} onClear={() => setLibCat(null)} name="cat" openDrop={openDrop} setOpenDrop={setOpenDrop} options={catOptions} width={240} />
      <FilterPill label={libTool || t('Công cụ AI')} active={!!libTool} onClear={() => setLibTool(null)} name="tool" openDrop={openDrop} setOpenDrop={setOpenDrop} options={toolOptions} width={200} />
      <FilterPill label={t((SORT_OPTS.find((o) => o.val === libSort) || SORT_OPTS[0]).label)} name="sort" openDrop={openDrop} setOpenDrop={setOpenDrop} options={sortOptions} width={200} align="right" />
    </>
  )

  // ---- share form derivations ----
  const setField = (k) => (e) => setShareForm((f) => ({ ...f, [k]: e.target.value }))
  const fieldDefs = [
    ['title', 'Tên use case', 'Required', 'Một câu ngắn gọn nói rõ use case làm được gì.', 'Ví dụ: Tóm tắt phản hồi khách hàng theo tuần', 'input', 0],
    ['audience', 'Dành cho ai', 'Required', 'Vai trò hoặc nhóm nào dùng được use case này.', 'Ví dụ: QC / QE, team mobile', 'input', 0],
    ['team', 'Team / Nhóm', 'Required', 'Nhóm đang làm use case, để người đọc biết hỏi ai.', 'Ví dụ: Product Ops', 'input', 0],
    ['problem', 'Vấn đề / Bối cảnh', 'Required', 'Vấn đề bạn gặp và bối cảnh công việc.', 'Mỗi tuần cần đọc hàng trăm phản hồi từ khảo sát và ticket...', 'area', 4],
    ['solution', 'Giải pháp / Cách làm', 'Required', 'Các bước làm, viết sao cho người khác đọc là làm lại được.', 'Bước 1: gom dữ liệu về một file. Bước 2: ...', 'area', 5],
    ['prep', 'Cần chuẩn bị gì', 'Required', 'Công cụ, quyền truy cập, dữ liệu hoặc tài khoản cần có trước khi bắt đầu.', 'Ví dụ: tài khoản Claude nội bộ, quyền xem dashboard CSAT, file .csv export', 'area', 3],
    ['prompt', 'Prompt / Quy trình', 'Required', 'Prompt hoặc workflow cụ thể để người khác làm lại được.', 'Dán prompt hoặc mô tả workflow ở đây...', 'area', 5],
    ['result', 'Kết quả / Tác động', 'Required', 'Kết quả đạt được: thời gian tiết kiệm, chất lượng, số liệu nếu có.', 'Giảm từ 4 giờ xuống 30 phút mỗi tuần...', 'area', 3],
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
    const dsel = allCases.find((x) => x.id === id) || (pubLoaded ? allCases[0] : null)
    if (!dsel) return <div style={css('min-height:60vh; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:14px;')}>Đang tải use case…</div>
    const dinfo = authorInfoFor(dsel.author)
    const cd = caseDetail[dsel.id] || {}
    const dTopics = (prdMeta[dsel.id] || {}).topics || []
    const tp = buildTemplate(dsel, cd, dinfo)
    const live = ucMeta[dsel.id]
    const base = live ? live.helpful : (prdMeta[dsel.id] || {}).helpful || 0
    const voted = live ? live.iHelped : false
    const applied = live ? live.applied || 0 : 0
    const iApplied = live ? !!live.iApplied : false
    const commentsList = live ? live.comments : []
    const postDComment = () => {
      const text = (dBoxRef.current ? dBoxRef.current.expand(dDraft) : dDraft).trim()
      if (text) requireLogin(() => api.commentUseCase(dsel.id, text, null, dsel.title, { ownerHandle: dsel.author }).then(() => { refreshMeta(dsel.id); setDDraft('') }).catch(() => {}))
    }
    const toggleApplied = () => requireLogin(() => api.toggleApplied(dsel.id).then((d) => setUcMeta((m) => ({ ...m, [dsel.id]: { ...(m[dsel.id] || {}), ...d } }))).catch(() => {}))

    // Which of the 9 parts have data — the rest are hidden, and the TOC lists only what's shown.
    const has = {
      tldr: tp.tldr.length > 0,
      ps: !!(tp.problem.text || tp.problem.bullets.length || tp.solution.steps.length),
      result: !!(tp.result.bullets.length || tp.result.beforeAfter || tp.result.tables.length || tp.result.note || tp.result.images.length),
      apply: !tp.apply.empty,
      safety: !!(tp.safety.rules.length || tp.safety.limits.length || tp.safety.tables.length),
      demo: tp.demo.length > 0,
      tech: !!(tp.tech.tables.length || tp.tech.repo || tp.tech.bullets.length || tp.tech.code.length || tp.tech.images.length),
      next: !!(tp.next.steps.length || tp.next.contact.length || tp.next.link),
    }
    const toc = [
      has.tldr && { id: 'uc-tldr', label: '1. ' + t('Tóm tắt') },
      has.ps && { id: 'uc-problem', label: '2–3. ' + t('Bài toán & giải pháp') },
      has.result && { id: 'uc-result', label: '4. ' + t('Kết quả') },
      has.apply && { id: 'uc-apply', label: '5. ' + t(tp.apply.title), hot: true },
      has.safety && { id: 'uc-safety', label: '6. ' + t('An toàn & giới hạn') },
      has.demo && { id: 'uc-demo', label: '7. Demo' },
      has.tech && { id: 'uc-tech', label: '8. ' + t('Chi tiết kỹ thuật') },
      has.next && { id: 'uc-next', label: '9. ' + t('Tiếp theo & liên hệ') },
      { id: 'comments', label: t('Upvote & bình luận') },
    ].filter(Boolean)

    return (
      <div>
        <FloatingBack t={t} onBack={() => (hasReturn() ? navigate(-1) : navigate('/use-cases'))} />
        <section style={css('position:relative; overflow:hidden; background:#07070c; color:#fff;')}>
          <SpaceBackdrop arcTop={300} />
          <div style={css('position:relative; z-index:3; padding:18px var(--zp-gutter) 30px;')}>
            {/* same grid as the body below, so the overview box is exactly as wide as the white cards */}
            <div className="zp-detail-wrap" style={css(DETAIL_COL)}>
            <div className="zp-detail-grid">
            <div style={{ minWidth: 0 }}>
              <DetailHero
                tldr={tp.tldr}
                t={t}
                c={dsel}
                h={{ ...tp.hero, posted: postedLabel(dsel) }}
                topics={dTopics}
                avatarBg={avatarColor(dsel.author)}
                onBack={() => (hasReturn() ? navigate(-1) : navigate('/use-cases'))}
                onStart={has.apply ? () => scrollToId('uc-apply') : null}
                startLabel={t('Ứng dụng ngay')}
              />
            </div>
            <div className="zp-toc-space" aria-hidden="true"></div>
            </div>
            </div>
          </div>
        </section>

        <div style={css('position:relative; z-index:4; background:#07070c; padding:0 var(--zp-gutter) 60px;')}>
          <div className="zp-detail-wrap" style={css(DETAIL_COL)}>
            <div className="zp-detail-grid">
            <div style={{ minWidth: 0 }}>
            {has.ps && <ProblemSolution t={t} problem={tp.problem} solution={tp.solution} />}
            {has.result && <Section id="uc-result" num="4" title={t('Kết quả')}><ResultBody r={tp.result} t={t} /></Section>}
            {has.apply && <ApplySection id={dsel.id} a={tp.apply} t={t} />}
            {has.safety && (
              <Section id="uc-safety" num="6" title={t('An toàn & giới hạn')}>
                <div style={css('display:flex; flex-direction:column; gap:16px;')}>
                  {tp.safety.rules.length > 0 && <div><div style={css('font-size:14.5px; font-weight:800; color:#0F172A; margin-bottom:10px;')}>{t('Nguyên tắc an toàn')}</div><BulletList items={tp.safety.rules} dot="#6F0CE2" /></div>}
                  {tp.safety.limits.length > 0 && <div><div style={css('font-size:14.5px; font-weight:800; color:#0F172A; margin-bottom:10px;')}>{t('Hiện chưa làm được')}</div><BulletList items={tp.safety.limits} dot="#E39100" /></div>}
                  {tp.safety.tables.map((tb, i) => <PlainTable flat key={i} table={tb} />)}
                </div>
              </Section>
            )}
            {has.demo && (
              <Section id="uc-demo" num="7" title="Demo">
                <Images images={tp.demo} style={{ marginTop: 0 }} />
              </Section>
            )}
            {has.tech && <TechSection tech={tp.tech} t={t} />}
            {has.next && (
              <Section id="uc-next" num="9" title={t('Tiếp theo & liên hệ')}>
                <div style={css('display:flex; flex-direction:column; gap:16px;')}>
                  {tp.next.steps.length > 0 && <div><div style={css('font-size:14.5px; font-weight:800; color:#0F172A; margin-bottom:10px;')}>{t('Sắp làm')}</div><BulletList items={tp.next.steps} dot="#2c5fff" /></div>}
                  {tp.next.contact.length > 0 && <div><div style={css('font-size:14.5px; font-weight:800; color:#0F172A; margin-bottom:10px;')}>{t('Liên hệ')}</div><BulletList items={tp.next.contact} dot="#9FB6E8" /></div>}
                  {tp.next.link && <a href={tp.next.link} target="_blank" rel="noopener" style={css('align-self:flex-start; font-size:13.5px; font-weight:700; color:#2c5fff;')}>{t('Tài liệu gốc')} ↗</a>}
                </div>
              </Section>
            )}

            <div id="comments" data-toc style={css('scroll-margin-top:90px; border:1px solid #E6EBF3; border-radius:20px; padding:24px 28px; margin:30px 0 36px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30);')}>
              {ucModals.modals}
              <div style={css('display:flex; align-items:center; gap:12px; flex-wrap:wrap;')}>
                <button
                  onClick={() => requireLogin(() => api.reactUseCase(dsel.id).then(() => refreshMeta(dsel.id)).catch(() => {}))}
                  aria-pressed={voted}
                  style={css(`display:inline-flex; align-items:center; gap:9px; height:44px; padding:0 20px; border:1px solid ${voted ? '#B9CCF8' : '#DDE3EC'}; border-radius:999px; background:${voted ? '#EAF1FF' : '#fff'}; color:${voted ? '#2c5fff' : '#3A4757'}; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer;`)}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill={voted ? '#2c5fff' : 'none'} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.6 3.4L13.5 9h5a2.5 2.5 0 0 1 2.4 3.1l-1.7 7A2.5 2.5 0 0 1 16.8 22H7Z"></path><path d="M7 22H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3"></path></svg>
                  {base} {t('Upvote')}
                </button>
                <button
                  onClick={toggleApplied}
                  aria-pressed={iApplied}
                  title={t('Bấm nếu bạn đã tự áp dụng use case này')}
                  style={css(`display:inline-flex; align-items:center; gap:9px; height:44px; padding:0 20px; border:1px solid ${iApplied ? '#9FDDBC' : '#DDE3EC'}; border-radius:999px; background:${iApplied ? '#E7F9F0' : '#fff'}; color:${iApplied ? '#00723C' : '#3A4757'}; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer;`)}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{iApplied ? <><circle cx="12" cy="12" r="9" fill="#00A352" stroke="#00A352"></circle><path d="m8 12.5 2.7 2.7L16.5 9.5" stroke="#fff"></path></> : <><circle cx="12" cy="12" r="9"></circle><path d="m8 12.5 2.7 2.7L16.5 9.5"></path></>}</svg>
                  {t('Tôi đã áp dụng')} · {applied}
                </button>
                <span style={css('display:inline-flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:#94a3b8;')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"></path></svg>
                  {commentsList.length} {t('Bình luận')}
                </span>
              </div>

              <div style={css('display:flex; gap:12px; margin-top:20px; align-items:flex-start;')}>
                <span style={css('width:36px; height:36px; border-radius:50%; flex:none; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800;')}>{user?.initials || '?'}</span>
                <div style={{ flex: 1 }}>
                  <MentionInput
                    ref={dBoxRef}
                    multiline
                    rows={2}
                    popupWidth={340}
                    value={dDraft}
                    onChange={setDDraft}
                    onEnter={postDComment}
                    placeholder={t('Viết bình luận về use case này... Gõ @ để mention đồng nghiệp.')}
                    style={css('width:100%; border:1px solid #E6EBF3; border-radius:12px; padding:12px 14px; font-family:inherit; font-size:14px; line-height:1.6; color:#0f172a; background:#fff; outline:none; resize:vertical; display:block; box-sizing:border-box;')}
                  />
                  <div style={css('display:flex; justify-content:flex-end; margin-top:10px;')}>
                    <button
                      onClick={postDComment}
                      style={css(`height:38px; padding:0 20px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:13.5px; font-weight:700; cursor:pointer; opacity:${dDraft.trim() ? 1 : 0.5};`)}
                    >
                      {t('Gửi bình luận')}
                    </button>
                  </div>
                </div>
              </div>

              <div style={css('display:flex; flex-direction:column; gap:14px; margin-top:8px;')}>
                {commentsList.filter((c) => !c.parentId).map((c) => {
                  const replies = commentsList.filter((r) => r.parentId === c.id)
                  const expanded = replies.length <= 1 || expandedThreads.has(c.id)
                  return (
                    <div key={c.id} style={css('padding-top:14px; border-top:1px solid #EEF1F7;')}>
                      <div className="zp-cmt" style={css('display:flex; gap:12px;')}>
                        <span style={css('width:36px; height:36px; border-radius:50%; flex:none; background:#EAF1FF; color:#2c5fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800;')}>{c.initials}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={css('display:flex; align-items:center; gap:8px;')}>
                            <div style={css('flex:1; min-width:0; font-size:12px; font-weight:600; color:#0F172A;')}>{c.author} <span style={css('font-weight:500; color:#94a3b8;')}>· {relativeTime(c.time)}{c.edited ? ' · đã sửa' : ''}</span></div>
                            <CommentMenu isOwner={!!user && c.authorId === user.id} isAdmin={!!user?.isAdmin} onEdit={() => setEditingCmt(c.id)} onDelete={() => ucModals.askDelete(() => api.deleteUseCaseComment(dsel.id, c.id).then(() => refreshMeta(dsel.id)).catch(() => {}))} onReport={() => ucModals.askReport('uc_comment', c.id)} />
                          </div>
                          {editingCmt === c.id
                            ? <InlineEdit initial={c.body} onSave={(b) => api.editUseCaseComment(dsel.id, c.id, b).then(() => { refreshMeta(dsel.id); setEditingCmt(null) }).catch(() => {})} onCancel={() => setEditingCmt(null)} />
                            : <div style={css('margin-top:4px; font-size:13.5px; line-height:1.65; color:#3A4757;')}>{renderMentions(c.body)}</div>}
                          <button onClick={() => startReply(c.id, c.author, c.id)} style={css('margin-top:6px; border:none; background:transparent; padding:0; cursor:pointer; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>{t('Trả lời')}</button>
                        </div>
                      </div>

                      {replies.length > 1 && (
                        <button onClick={() => toggleThread(c.id)} style={css('margin:10px 0 0 48px; border:none; background:transparent; padding:0; cursor:pointer; display:flex; align-items:center; gap:6px; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#2c5fff;')}>
                          <Chevron up={expanded} />
                          {expanded ? t('Ẩn replies') : t('Xem thêm') + ' ' + replies.length + ' ' + t('replies')}
                        </button>
                      )}

                      {expanded && replies.map((r) => (
                        <div key={r.id} className="zp-cmt" style={css('display:flex; gap:10px; margin:12px 0 0 48px;')}>
                          <span style={css('width:30px; height:30px; border-radius:50%; flex:none; background:#EAF1FF; color:#2c5fff; display:flex; align-items:center; justify-content:center; font-size:11.5px; font-weight:800;')}>{r.initials}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={css('display:flex; align-items:center; gap:8px;')}>
                              <div style={css('flex:1; min-width:0; font-size:12px; font-weight:600; color:#0F172A;')}>{r.author} <span style={css('font-weight:500; color:#94a3b8;')}>· {relativeTime(r.time)}{r.edited ? ' · đã sửa' : ''}</span></div>
                              <CommentMenu isOwner={!!user && r.authorId === user.id} isAdmin={!!user?.isAdmin} onEdit={() => setEditingCmt(r.id)} onDelete={() => ucModals.askDelete(() => api.deleteUseCaseComment(dsel.id, r.id).then(() => refreshMeta(dsel.id)).catch(() => {}))} onReport={() => ucModals.askReport('uc_comment', r.id)} />
                            </div>
                            {editingCmt === r.id
                              ? <InlineEdit initial={r.body} onSave={(b) => api.editUseCaseComment(dsel.id, r.id, b).then(() => { refreshMeta(dsel.id); setEditingCmt(null) }).catch(() => {})} onCancel={() => setEditingCmt(null)} />
                              : <div style={css('margin-top:3px; font-size:13px; line-height:1.6; color:#3A4757;')}>{renderMentions(r.body)}</div>}
                            <button onClick={() => startReply(c.id, r.author, r.id)} style={css('margin-top:5px; border:none; background:transparent; padding:0; cursor:pointer; font:700 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>{t('Trả lời')}</button>
                          </div>
                        </div>
                      ))}

                      {replyTarget?.parentId === c.id && (
                        <div style={css('display:flex; gap:10px; margin:12px 0 0 48px;')}>
                          <span style={css('width:30px; height:30px; border-radius:50%; flex:none; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font-size:11.5px; font-weight:800;')}>{user?.initials || '?'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <MentionInput
                              ref={replyBoxRef}
                              autoFocus
                              multiline
                              rows={1}
                              value={replyDraft}
                              onChange={setReplyDraft}
                              onEnter={() => submitReply(dsel.id)}
                              onKeyDown={(e) => { if (e.key === 'Escape') cancelReply() }}
                              placeholder={t('Trả lời') + ' ' + replyTarget.authorName + ', ' + t('gõ @ để mention...')}
                              style={css('width:100%; border:1px solid #E6EBF3; border-radius:12px; padding:9px 12px; font-family:inherit; font-size:13px; line-height:1.5; color:#0f172a; background:#fff; outline:none; resize:vertical; display:block; box-sizing:border-box;')}
                            />
                            <div style={css('display:flex; justify-content:flex-end; gap:8px; margin-top:8px;')}>
                              <button onClick={cancelReply} style={css('height:32px; padding:0 14px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;')}>{t('Hủy')}</button>
                              <button onClick={() => submitReply(dsel.id)} style={css(`height:32px; padding:0 16px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer; opacity:${replyDraft.trim() ? 1 : 0.5};`)}>{t('Gửi')}</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            </div>
            <Toc items={toc} t={t} />
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
        <section style={css('position:relative; overflow:hidden; padding-bottom:260px; margin-bottom:-260px;')}>
          <SpaceBackdrop arcTop={190} />
          <div style={css('position:relative; z-index:4; padding:22px var(--zp-gutter) 0;')}>
            <h1 style={css('margin:0; text-align:center; font-family:"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; font-size:50px; line-height:1.06; font-weight:800; letter-spacing:-1px; background:linear-gradient(180deg,#ffffff 0%,#cfe3ff 46%,#4f93ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 6px 40px rgba(26,95,255,.85)) drop-shadow(0 0 16px rgba(90,150,255,.6));')}>{t('Thư viện Use Case')}</h1>
            <p style={css('margin:10px auto 0; max-width:760px; text-align:center; font:400 15px/1.5 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:rgba(206,219,245,.72); text-wrap:pretty;')}>{t('Tổng hợp các cách và tips Zalopay Starter áp dụng AI vào công việc.')}</p>
          </div>
          <PageActionBar ref={searchInputRef} prompt="Bạn có use case AI muốn chia sẻ?" cta="Chia sẻ use case" onCompose={() => { setShareOpen(true); setShareStage((st) => (st === 'submitted' ? 'form' : st)) }} query={query} onQuery={setQuery} placeholder="Tìm use case: PRD, báo cáo, dữ liệu..." filters={libFilters} />
        </section>

        <section style={css('position:relative; z-index:5; background:transparent; padding:26px var(--zp-gutter) 52px;')}>
          <div style={css('max-width:760px; margin:0 auto;')}>

              {activeFilterCount > 0 && (
                <div style={css('display:flex; justify-content:flex-start; align-items:center; gap:8px; margin:-12px 0 10px; font-size:13px; color:#a9b8dc;')}>
                  <span>{libCases.length} {t('use case phù hợp')}</span><span style={{ color: '#56607E' }}>·</span>
                  <button
                    onClick={() => { setLibCat(null); setLibTopic(null); setLibTool(null); setLibGroup(null); setLibKind(null); setOpenDrop(null) }}
                    style={css('height:28px; padding:0 4px; border:none; background:transparent; color:#8fb4ff; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit;')}
                  >
                    {t('Xoá bộ lọc')}
                  </button>
                </div>
              )}

            <div id="lib-grid">
              {libCards.length === 0 && (
                <div style={css('padding:74px 0; text-align:center; color:#8a8a9e; font-size:15px;')}>{t('Không tìm thấy use case phù hợp. Thử đổi bộ lọc hoặc từ khóa khác nhé.')}</div>
              )}

              {libCards.length > 0 && (
                <div style={css('display:flex; flex-direction:column; gap:12px;')}>
                  {libCards.map((c) => (
                    <div
                      key={c.id}
                      data-card-id={c.id}
                      onClick={c.onOpen}
                      className={'zp-card ' + hoverClass('transform:translateY(-3px); border-color:rgba(80,140,255,.8); box-shadow:0 0 0 1px rgba(60,120,255,.18), 0 0 22px rgba(60,120,255,.34), 0 18px 40px rgba(0,0,0,.3);')}
                      style={css('position:relative; display:flex; flex-direction:column; border:1px solid rgba(60,120,255,.45); border-radius:18px; background:#ffffff; cursor:pointer; padding:14px 16px; box-shadow:0 0 0 1px rgba(60,120,255,.10), 0 0 16px rgba(60,120,255,.22), 0 10px 26px rgba(0,0,0,.2); transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;')}
                    >
                      <div style={css('display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;')}>
                        <span style={css('display:inline-flex; align-items:center; gap:6px; height:23px; padding:0 10px 0 9px; border-radius:999px; background:#E4ECFF; color:#2c5fff; font:800 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></svg>
                          {t('Use case')}
                        </span>
                        <div style={css('position:relative; flex:none;')}>
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenuId((mid) => (mid === c.id ? null : c.id)) }} title={t('Thêm')} aria-label={t('Tuỳ chọn khác')} aria-haspopup="menu" style={css('width:32px; height:32px; border-radius:10px; background:#fff; border:1px solid #E6EBF3; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0; color:#5B6675;')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="5" cy="12" r="1.4"></circle><circle cx="12" cy="12" r="1.4"></circle><circle cx="19" cy="12" r="1.4"></circle></svg>
                          </button>
                          {openMenuId === c.id && (
                            <div onClick={(e) => e.stopPropagation()} style={css('position:absolute; right:0; top:38px; width:190px; background:#fff; border:1px solid #E6EBF3; border-radius:14px; box-shadow:0 20px 46px rgba(15,23,42,.2); overflow:hidden; z-index:60; padding:6px;')}>
                              <button onClick={(e) => copyCardLink(e, c.id)} style={css('display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A; text-align:left;')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"></path></svg>
                                {t('Sao chép link')}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); c.onSave(e); setOpenMenuId(null) }} style={css('display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A; text-align:left;')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill={c.saveFill} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                {c.saveFill === 'currentColor' ? t('Bỏ lưu') : t('Lưu use case')}
                              </button>
                              {c.canEdit && (
                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); navigate('/use-cases?edit=' + c.id) }} style={css('display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A; text-align:left;')}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
                                  {t('Chỉnh sửa')}
                                </button>
                              )}
                              {c.canDelete && (
                                <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(c.id); setOpenMenuId(null) }} style={css('display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#D8232A; text-align:left;')}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
                                  {t('Xoá bài viết')}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={css('display:flex; gap:13px;')}>
                        <CoverImage c={allCases.find((x) => x.id === c.id) || c} />
                        <div style={css('flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center;')}>
                          <h3 className="zp-card-title" style={css('margin:0; font-size:15px; font-weight:800; line-height:1.38; color:#0F172A; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;')}>{c.title}</h3>
                          <p style={css('margin:4px 0 0; font-size:13px; line-height:1.5; color:#3A4757; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;')}>{c.overview}</p>
                        </div>
                      </div>
                      <div style={css('display:flex; align-items:center; gap:8px; min-width:0; margin-top:10px;')}>
                        <span style={css(c.avStyle)}>{c.avInitial}</span>
                        <div style={css('display:flex; align-items:baseline; gap:6px; min-width:0;')}>
                          <span style={css('font-size:12.5px; font-weight:600; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{c.author}</span>
                          {c.posted && <span style={css('flex:none; font-size:12px; font-weight:500; color:#94a3b8; white-space:nowrap;')}>· {t('Đăng')} {c.posted}</span>}
                        </div>
                      </div>
                      <TagRow topics={c.topics || []} tools={c.tools} style={{ marginTop: 10 }} />
                      <div style={css('display:flex; align-items:center; gap:8px; margin-top:12px; padding-top:10px; border-top:1px solid #EEF1F7;')}>
                        <button onClick={(e) => { e.stopPropagation(); c.onOpen() }} className={hoverClass('gap:9px;')} style={css('flex:none; display:inline-flex; align-items:center; gap:6px; border:none; background:transparent; padding:0; cursor:pointer; font-family:inherit; font-size:12.5px; font-weight:800; color:#2c5fff; white-space:nowrap; transition:gap .16s;')}>
                          {t('Xem Use Case')}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                        </button>
                        <CardActions compact helpful={c.helpful} helped={c.helped} onHelpful={c.onHelpful} replies={c.comments} onReply={c.onOpenComments} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pageCount > 1 && (
                <div style={css('display:flex; align-items:center; justify-content:center; gap:6px; margin-top:26px;')}>
                  <button disabled={curPage === 1} onClick={() => { setLibPage(curPage - 1); document.getElementById('lib-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} style={css(`height:36px; padding:0 14px; border-radius:10px; border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.06); color:#fff; font:700 13px inherit; cursor:pointer; opacity:${curPage === 1 ? 0.4 : 1};`)}>‹ {t('Trước')}</button>
                  {Array.from({ length: pageCount }, (_, k) => k + 1).map((n) => (
                    <button key={n} onClick={() => { setLibPage(n); document.getElementById('lib-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} style={css(`width:36px; height:36px; border-radius:10px; border:1px solid ${n === curPage ? '#2c5fff' : 'rgba(255,255,255,.2)'}; background:${n === curPage ? '#2c5fff' : 'rgba(255,255,255,.06)'}; color:#fff; font:800 13px inherit; cursor:pointer;`)}>{n}</button>
                  ))}
                  <button disabled={curPage === pageCount} onClick={() => { setLibPage(curPage + 1); document.getElementById('lib-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} style={css(`height:36px; padding:0 14px; border-radius:10px; border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.06); color:#fff; font:700 13px inherit; cursor:pointer; opacity:${curPage === pageCount ? 0.4 : 1};`)}>{t('Sau')} ›</button>
                </div>
              )}

            </div>
          </div>
        </section>


        {confirmDeleteId && (
          <div onClick={() => setConfirmDeleteId(null)} style={css('position:fixed; inset:0; z-index:5000; background:rgba(4,10,26,.66); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:24px;')}>
            <div ref={delDialog.ref} {...delDialog.dialogProps} onClick={(e) => e.stopPropagation()} style={css('width:360px; max-width:100%; background:#fff; border-radius:20px; padding:26px 24px; box-shadow:0 30px 70px rgba(3,12,40,.5); text-align:center;')}>
              <div style={css('width:52px; height:52px; margin:0 auto; border-radius:50%; background:#FFECEC; color:#D8232A; display:flex; align-items:center; justify-content:center;')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
              </div>
              <div style={css('margin-top:16px; font:800 16px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{t('Bạn muốn xóa vĩnh viễn bài viết này?')}</div>
              <div style={css('margin-top:8px; font:400 13.5px/1.5 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>{t('Hành động này không thể hoàn tác.')}</div>
              <div style={css('display:flex; gap:10px; margin-top:22px;')}>
                <button onClick={() => setConfirmDeleteId(null)} style={css('flex:1; height:44px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;')}>{t('Quay lại')}</button>
                <button onClick={() => deleteUseCase(confirmDeleteId)} style={css('flex:1; height:44px; border:none; border-radius:999px; background:#D8232A; color:#fff; font:700 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;')}>{t('Đồng ý')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ================= SHARE MODAL =================
  function renderShareModal() {
    // Editing a published use case saves in place; editing one under review resubmits it.
    const liveEdit = editing?.status === 'approved'
    const shareHeading = shareStage === 'submitted' ? (liveEdit ? 'Đã lưu thay đổi' : editing ? 'Đã gửi lại use case' : 'Use case đã được gửi') : shareStage === 'preview' ? 'Preview use case' : liveEdit ? 'Chỉnh sửa use case' : editing ? 'Chỉnh sửa & gửi lại use case' : t('Chia sẻ Use Case')
    const shareSubhead = shareStage === 'submitted' ? (liveEdit ? 'Use case đã được cập nhật trong Thư viện.' : 'Admin sẽ xem xét và bạn nhận được thông báo về kết quả.') : liveEdit ? 'Thay đổi được cập nhật ngay trong Thư viện.' : 'Mô tả cách bạn dùng AI để người khác làm lại được. Bài sẽ qua bước Admin duyệt.'
    const shareOpacity = valid ? 1 : 0.5
    const shareHint = shareError || (liveEdit ? 'Bài vẫn hiển thị trong Thư viện sau khi lưu.' : 'Sau khi gửi, bài ở trạng thái Chờ duyệt và chưa hiển thị trong Thư viện.')
    const shareHintColor = shareError ? '#D8232A' : '#94a3b8'

    return (
      <div
        onClick={closeShare}
        style={css('position:fixed; inset:0; z-index:4000; background:rgba(4,8,20,.66); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); display:flex; align-items:flex-start; justify-content:center; padding:48px 24px; overflow-y:auto; font-family:"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}
      >
        <div ref={shareDialog.ref} {...shareDialog.dialogProps} onClick={(e) => e.stopPropagation()} style={css('width:880px; max-width:100%; background:#eef1f9; border-radius:24px; outline:none; box-shadow:0 44px 110px rgba(2,8,30,.6); overflow:hidden;')}>
          <div style={css('position:relative; background:linear-gradient(180deg,#0c1533 0%,#070b1c 100%); padding:26px 32px 28px;')}>
            <button onClick={closeShare} title="Đóng" aria-label="Đóng" style={css('position:absolute; top:22px; right:22px; width:36px; height:36px; border-radius:11px; border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.08); color:#dbe6ff; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0;')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
            <h1 style={css('margin:0; padding-right:56px; font-size:26px; font-weight:800; line-height:1.25; letter-spacing:-.01em; color:#fff;')}>{shareHeading}</h1>
            <p style={css('margin:9px 0 0; padding-right:56px; font-size:14px; line-height:1.6; color:rgba(206,219,245,.72);')}>{shareSubhead}</p>
            <div style={css('display:flex; align-items:center; gap:12px; margin-top:16px; flex-wrap:wrap;')}>
              <span style={css('display:inline-flex; align-items:center; gap:8px; height:30px; padding:0 13px; border-radius:999px; background:rgba(22,214,140,.14); border:1px solid rgba(22,214,140,.34); font-size:12px; font-weight:700; color:#6fe3aa;')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                {liveEdit ? 'Sửa xong bấm "Lưu thay đổi"' : editing ? 'Sửa xong bấm "Gửi lại để duyệt"' : hasDraft ? 'Nháp đã lưu lúc ' + draftSavedAt : 'Nháp tự lưu khi bạn gõ'}
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
                  <div style={css('margin-top:8px; font-size:14px; line-height:1.6; color:#64748b;')}>Use case ở trạng thái <strong style={{ color: '#B45300' }}>Chờ duyệt</strong>. Bạn sẽ nhận thông báo khi được duyệt hoặc bị từ chối kèm lý do. Trong lúc chờ, bài chưa xuất hiện trong Library.</div>
                  <div style={css('display:flex; justify-content:center; gap:12px; margin-top:22px;')}>
                    <a href="/profile#usecase" onClick={(e) => { e.preventDefault(); navigate('/profile#usecase') }} style={css('display:inline-flex; align-items:center; height:44px; padding:0 20px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font-size:13.5px; font-weight:700; text-decoration:none;')}>{t('Xem trong Use case của tôi')}</a>
                    <button onClick={closeShare} style={css('height:44px; padding:0 22px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:13.5px; font-weight:700; cursor:pointer;')}>{t('Về Library')}</button>
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
                      <span style={css('width:28px; height:28px; border-radius:50%; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800;')}>{user?.initials || '?'}</span>
                      <span style={css('font-size:13px; font-weight:600; color:#0F172A;')}>{user?.domain || user?.name || 'Chưa đăng nhập'}</span>
                      <span style={css('color:#CDD5DD;')}>·</span>
                      <span style={css('font-size:13px; color:#94a3b8;')}>{user?.team || shareForm.team}</span>
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
                    <button onClick={() => setShareStage('form')} style={css('height:48px; padding:0 22px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap;')}>{t('Quay lại chỉnh sửa')}</button>
                    <button
                      onClick={submitShare}
                      style={css('margin-left:auto; height:48px; padding:0 26px; white-space:nowrap; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:14px; font-weight:700; white-space:nowrap; cursor:pointer; box-shadow:0 12px 26px rgba(44,95,255,.4);')}
                    >
                      {liveEdit ? 'Lưu thay đổi' : editing ? 'Gửi lại để duyệt' : t('Gửi duyệt')}
                    </button>
                  </div>
                </div>
              )}

              {shareStage === 'form' && (
                <div>
                  {editing?.note && (
                    <div style={css('display:flex; gap:12px; margin-bottom:16px; padding:14px 18px; border-radius:16px; background:#FFF7E8; border:1px solid #F3DCB4;')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9A5B00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 2 }}><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
                      <div>
                        <div style={css('font:800 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#7A4700;')}>Admin cần bạn chỉnh sửa / bổ sung</div>
                        <div style={css('margin-top:4px; font:500 13.5px/1.6 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#5C3A00; white-space:pre-wrap;')}>{editing.note}</div>
                      </div>
                    </div>
                  )}
                  <div style={css('background:#fff; border:1px solid #E6EBF3; border-radius:20px; padding:26px 28px; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                    <div style={css('margin-bottom:24px;')}>
                      <div style={css('display:flex; align-items:center; gap:8px;')}>
                        <span style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{t('Ảnh bìa')}</span>
                        <span style={css('font-size:11px; font-weight:700; color:#94a3b8;')}>{t('Không bắt buộc')}</span>
                      </div>
                      <div style={css('margin-top:3px; font-size:12.5px; color:#64748b;')}>{t('Hiện trên thẻ use case. Không có ảnh thì dùng icon theo danh mục.')}</div>
                      <div style={css('display:flex; align-items:center; gap:14px; margin-top:10px;')}>
                        <CoverImage c={{ coverUrl: shareCover && !shareCover.cleared ? shareCover.url : null, category: shareCategory[0] }} size={84} radius={14} />
                        <label className={hoverClass('background:#F2F6FF !important; border-color:#B9CCF8 !important;')} style={css('display:inline-flex; align-items:center; gap:8px; height:38px; padding:0 16px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap;')}>
                          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { pickCover(e.target.files?.[0]); e.target.value = '' }} />
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="9" cy="9" r="1.6"></circle><path d="m21 15-5-5L5 21"></path></svg>
                          {shareCover && !shareCover.cleared ? t('Đổi ảnh') : t('Tải ảnh lên')}
                        </label>
                        {shareCover && !shareCover.cleared && (
                          <button type="button" onClick={() => setShareCover(editing ? { cleared: true } : null)} style={css('border:none; background:none; padding:0; cursor:pointer; font-size:13px; font-weight:700; color:#D8232A; font-family:inherit;')}>{t('Bỏ ảnh')}</button>
                        )}
                      </div>
                      {coverError && <div style={css('margin-top:8px; font-size:12.5px; font-weight:600; color:#D8232A;')}>{coverError}</div>}
                    </div>
                    {shareFields.map((f) => (
                      <div key={f.key} style={css('margin-bottom:24px;')}>
                        <div style={css('display:flex; align-items:center; gap:8px;')}>
                          <label style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{f.label}</label>
                          <span style={css(`font-size:11px; font-weight:700; color:${f.reqColor};`)}>{f.req === 'Required' ? t('Bắt buộc') : t('Không bắt buộc')}</span>
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

                    <ChipGroup title="Người thực hiện" required="Bắt buộc · chọn một" options={shareKinds} />
                    <ChipGroup title="Trạng thái" required="Bắt buộc · chọn một" options={shareStatuses} />
                    <ChipGroup title="Độ khó khi làm lại" required="Bắt buộc · chọn một" options={shareLevels} last />

                    <div style={css('display:flex; align-items:center; gap:8px;')}>
                      <label style={css('font-size:14px; font-weight:800; color:#0F172A;')}>Category</label>
                      <span style={css('font-size:11px; font-weight:700; color:#E0353F;')}>{t('Bắt buộc · chọn được nhiều')}</span>
                    </div>
                    <div style={css('display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;')}>
                      {shareCategories.map((c) => (
                        <button key={c.label} onClick={c.onPick} style={css(`height:36px; padding:0 15px; border:1px solid ${c.border}; border-radius:999px; background:${c.bg}; color:${c.color}; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer;`)}>{c.label}</button>
                      ))}
                    </div>

                    <div style={css('display:flex; align-items:center; gap:8px; margin-top:24px;')}>
                      <label style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{t('Chủ đề')}</label>
                      <span style={css('font-size:11px; font-weight:700; color:#94a3b8;')}>Không bắt buộc · tối đa 3 · {shareTopicSel.length}/3</span>
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
                      <button onClick={() => setShareFileList((s) => [...s, 'screenshot-' + (s.length + 1) + '.png'])} style={css('display:inline-flex; align-items:center; gap:8px; height:38px; padding:0 16px; border:1px dashed #C9D4E6; border-radius:11px; background:#fff; color:#3366F0; font-family:inherit; font-size:12.5px; font-weight:700; cursor:pointer;')}>Đính kèm file</button>
                    </div>
                  </div>

                  <div style={css('display:flex; align-items:center; gap:12px; margin-top:16px; flex-wrap:wrap;')}>
                    <span style={css('flex:1 1 260px; font-size:12.5px; font-weight:600; color:#94a3b8;')}>{t('Điền đủ các mục Bắt buộc để người đọc hiểu và làm lại được. Admin duyệt trước khi publish.')}</span>
                    <div style={css('margin-left:auto; display:flex; gap:12px; flex:none;')}>
                      <button onClick={() => { setHasDraft(true); localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draftPayload(), savedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) })); closeShare() }} style={css('height:48px; padding:0 22px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap;')}>{t('Lưu nháp & đóng')}</button>
                      <button
                        onClick={() => {
                          if (!valid) { setShareError('Còn thiếu thông tin bắt buộc — điền đủ các mục Bắt buộc để người khác đọc là làm lại được.'); return }
                          setShareStage('preview'); setShareError('')
                        }}
                        style={css(`height:48px; padding:0 22px; border:1px solid #B9CCF8; border-radius:999px; background:#E7ECFB; color:#2c5fff; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; opacity:${shareOpacity};`)}
                      >
                        {t('Xem trước')}
                      </button>
                      <button
                        onClick={submitShare}
                        style={css(`height:48px; padding:0 26px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:14px; font-weight:700; white-space:nowrap; cursor:pointer; opacity:${shareOpacity}; box-shadow:0 12px 26px rgba(44,95,255,.4);`)}
                      >
                        {liveEdit ? 'Lưu thay đổi' : editing ? 'Gửi lại để duyệt' : t('Gửi duyệt')}
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
    <Layout active="usecase">
      {isDetail ? renderDetail() : renderLibrary()}
      {shareOpen && createPortal(renderShareModal(), document.body)}
    </Layout>
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
