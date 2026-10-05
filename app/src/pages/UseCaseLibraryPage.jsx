import { useEffect, useMemo, useRef, useState } from 'react'
import { copyWithToast } from '../lib/clipboard.js'
import { fold } from '../lib/fold.js'
import { parseUseCaseDocx, TEMPLATE_URL } from '../lib/docxImport.js'
import { rememberReturn, hasReturn, pendingReturn, useScrollReturn } from '../lib/scrollReturn.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { useTitle } from '../hooks/useTitle.js'
import CoverImage from '../components/CoverImage.jsx'
import { AI_TOOLS, OTHER } from '../lib/taxonomy.js'
import { renderMentions } from '../components/MentionField.jsx'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useDialog } from '../hooks/useDialog.js'
import { css, hoverClass } from '../lib/style.js'
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
import { DETAIL_COL, DetailHero, Toc, scrollToId, FloatingBack } from '../components/UseCaseDetailParts.jsx'
import { DetailSections, detailLayout } from '../components/UseCaseDetailView.jsx'
import { buildTemplate } from '../data/useCaseTemplate.js'
import { submissionTpl } from '../data/submissionTpl.js'
import AnonTag from '../components/AnonTag.jsx'
import AnonToggle from '../components/AnonToggle.jsx'
import { askRemovalReason } from '../components/RemovalReason.jsx'
import MentionInput from '../components/MentionInput.jsx'
import PageActionBar from '../components/PageActionBar.jsx'
import { avatarPhotoCss } from '../components/Avatar.jsx'
import {
  allCases, prdMeta, caseDetail, teamsData, authorInfoFor,
  avatarColor, avatarPhoto, statusMeta, kindOf, statusOf, levelMeta, levelChip,
  newestFirst, postedLabel,
} from '../data/useCases.js'

const DRAFT_KEY = 'zp-usecase-draft-v1'
const CATS = ['Productivity & Personal Work', 'Content & Communication', 'Research & Knowledge', 'Data & Analysis', 'Coding & Technical', 'Automation & Workflow', 'Meeting & Collaboration', 'Design & Creative', 'Other']
const TOPICS = ['Prompting', 'Tài liệu dài', 'Tóm tắt', 'Bảo mật dữ liệu', 'Tiếng Việt', 'Ticket & CSKH', 'Code review', 'Báo cáo', 'Khác']
const TOOLS = [...AI_TOOLS, OTHER]
const TOOL_LIST = AI_TOOLS
const SORT_OPTS = [{ label: 'Mới nhất', val: 'new' }, { label: 'Nổi bật', val: 'helpful' }]
const EMPTY_SHARE_FORM = { title: '', oneLine: '', audience: '', problem: '', solution: '', prep: '', prompt: '', result: '', limits: '', contact: '', link: '', team: '', fitYes: '', fitNo: '', pitfalls: '', tech: '' }
const EMPTY_HIGHLIGHTS = [{ value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }]
const padHighlights = (list) => EMPTY_HIGHLIGHTS.map((h, i) => ({ ...h, ...((list || [])[i] || {}) }))
// Share form = the 9 parts of the detail page, in order. `need` = required keys on that step.
const SHARE_STEPS = [
  { key: 'intro', label: 'Giới thiệu', part: 'Phần đầu trang & Tóm tắt' },
  { key: 'ps', label: 'Bài toán & giải pháp', part: 'Phần Bài toán, Giải pháp' },
  { key: 'result', label: 'Kết quả', part: 'Phần Kết quả' },
  { key: 'apply', label: 'Ứng dụng ngay', part: 'Phần Ứng dụng ngay' },
  { key: 'more', label: 'Lưu ý & liên hệ', part: 'Phần An toàn, Kỹ thuật, Liên hệ' },
]

const chip = (on) => ({ bg: on ? '#E7ECFB' : '#fff', border: on ? '#B9CCF8' : '#DDE3EC', color: on ? '#2c5fff' : '#3A4757' })



export default function UseCaseLibraryPage() {
  const { id } = useParams()
  const { version: pubV, loaded: pubLoaded } = usePublishedUseCases()
  useScrollReturn(!id && pubLoaded ? pubV + 1 : false) // back from a use case -> same place in the list
  useTitle(id ? (allCases.find((x) => x.id === id) || {}).title || 'Use case' : 'Use Case Library')
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
  const [shareStep, setShareStep] = useState(0)
  const [shareType, setShareType] = useState('')
  const [cmtAnon, setCmtAnon] = useState(false) // comments + replies on the detail page
  const [cmtAlias, setCmtAlias] = useState('')
  const cmtAnonOpts = () => ({ anonymous: cmtAnon, alias: cmtAnon ? cmtAlias.trim() : '' })
  const [shareAnon, setShareAnon] = useState(false)
  const [shareAlias, setShareAlias] = useState('')
  const [shareHighlights, setShareHighlights] = useState(EMPTY_HIGHLIGHTS)
  // Fill the form from the Word template instead of typing: { name, filled, missing } | null
  const [docxInfo, setDocxInfo] = useState(null)
  const [docxError, setDocxError] = useState('')
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

  const importDocx = (file) => {
    setDocxError(''); setDocxInfo(null)
    if (!file) return
    parseUseCaseDocx(file, { cats: CATS, kinds: ['By tech', 'By non-tech'], statuses: ['Ý tưởng', 'Prototype', 'Đang dùng thật'], levels: ['Dễ', 'Trung bình', 'Khó'] })
      .then((r) => {
        if (!r.filled) { setDocxError('Không tìm thấy nội dung theo mẫu trong file này. Hãy dùng đúng file template và giữ nguyên tên các mục.'); return }
        setShareForm((f) => ({ ...f, ...Object.fromEntries(Object.entries(r.form).filter(([, v]) => v)) }))
        if (r.kind) setShareKind(r.kind)
        if (r.status) setShareStatus(r.status)
        if (r.level) setShareLevel(r.level)
        if (r.category.length) setShareCategory(r.category)
        const pick = (list, all) => { const known = list.filter((x) => all.some((a) => a.toLowerCase() === x.toLowerCase())).map((x) => all.find((a) => a.toLowerCase() === x.toLowerCase())); const extra = list.filter((x) => !all.some((a) => a.toLowerCase() === x.toLowerCase())); return [known, extra] }
        if (r.topics.length) { const [k, e] = pick(r.topics, TOPICS.filter((x) => x !== 'Khác')); setShareTopicSel([...k, ...(e.length ? ['Khác'] : [])].slice(0, 3)); setShareTopicOtherText(e.join(', ')) }
        if (r.tools.length) { const [k, e] = pick(r.tools, TOOLS.filter((x) => x !== OTHER)); setShareToolSel([...k, ...(e.length ? [OTHER] : [])]); setShareToolOtherText(e.join(', ')) }
        setDocxInfo({ name: file.name, filled: r.filled, missing: r.missing })
      })
      .catch((e) => setDocxError(e?.message === 'not_docx' ? 'Chỉ nhận file Word .docx (không nhận .doc cũ hay PDF).' : 'Không đọc được file này. Hãy lưu lại dưới dạng .docx rồi thử lại.'))
  }

  // ?edit=<id>: reopen my submission, prefilled, to fix what the admin asked for and resubmit.
  useEffect(() => {
    const editId = new URLSearchParams(location.search).get('edit')
    if (!editId) return
    api.listSubmissions('?mine=1').then((d) => {
      const s = (d.submissions || []).find((x) => x.id === editId)
      if (!s) return
      const ex = s.extra || {}
      setShareForm({ title: s.title || '', oneLine: ex.oneLine || '', audience: s.audience || '', problem: s.problem || '', solution: s.solution || '', prep: s.prep || '', prompt: s.prompt || '', result: s.result || '', limits: s.limits || '', contact: s.contact || '', link: s.link || '', team: s.team || '', fitYes: ex.fitYes || '', fitNo: ex.fitNo || '', pitfalls: ex.pitfalls || '', tech: ex.tech || '' })
      setShareType(ex.type || ''); setShareHighlights(padHighlights(ex.highlights)); setShareStep(0)
      setShareAnon(!!s.anonymous); setShareAlias(s.anonymous && s.alias && !/^Anonymous( \d+)?$/.test(s.alias) ? s.alias : '')
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

  const deleteUseCase = (ucId, reason) => {
    api.deleteUseCase(ucId, reason).then(() => {
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
    requireLogin(() => api.commentUseCase(ucId, text, replyTarget.parentId, (allCases.find((x) => x.id === ucId) || {}).title, { ...cmtAnonOpts(), replyToId: replyTarget.replyToId, ownerHandle: (allCases.find((x) => x.id === ucId) || {}).author }).then(() => { refreshMeta(ucId); cancelReply() }).catch(() => {}))
  }

  // ---- draft restore + autosave ----
  const restoredRef = useRef(false)
  const draftJsonRef = useRef(null)
  const draftTimerRef = useRef(null)
  const draftPayload = () => ({ shareForm, shareType, shareHighlights, shareAnon, shareAlias, shareKind, shareStatus, shareLevel, shareCategory, shareTopicSel, shareTopicOtherText, shareToolSel, shareToolOtherText, shareFileList })

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw) || {}
      setShareForm({ ...EMPTY_SHARE_FORM, ...(d.shareForm || {}) })
      setShareType(d.shareType || '')
      setShareAnon(!!d.shareAnon); setShareAlias(d.shareAlias || '')
      setShareHighlights(padHighlights(d.shareHighlights))
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
  }, [shareForm, shareType, shareHighlights, shareAnon, shareAlias, shareKind, shareStatus, shareLevel, shareCategory, shareTopicSel, shareTopicOtherText, shareToolSel, shareToolOtherText, shareFileList])

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
        extra: shareExtra(),
        anonymous: shareAnon, alias: shareAnon ? shareAlias.trim() : '',
        ...(shareCover?.data ? { cover: shareCover.data } : shareCover?.cleared ? { cover: null } : {}),
      }).then(() => { setShareStage('submitted'); setShareError(''); if (!editing) clearDraft(); if (editing?.status === 'approved') { loadPublishedUseCases(true); refreshMeta(editing.id) } })
        .catch(() => setShareError('Không gửi được use case, thử lại.'))
    })
  }

  const resetShareForm = () => {
    setShareForm(EMPTY_SHARE_FORM); setShareType(''); setShareAnon(false); setShareAlias(''); setShareHighlights(EMPTY_HIGHLIGHTS); setShareStep(0); setShareKind(''); setShareStatus(''); setShareLevel('')
    setShareCategory([]); setShareTopicSel([]); setShareTopicOtherText('')
    setShareToolSel([]); setShareToolOtherText(''); setShareFileList([]); setShareError(''); setShareStage('form')
    setShareCover(null); setCoverError(''); setDocxInfo(null); setDocxError('')
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
      avStyle: `width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex:none;background:${avatarColor(c.author)};${avatarPhotoCss(avatarPhoto(c.author))}`,
      avStyleL: `width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex:none;background:${avatarColor(c.author)};${avatarPhotoCss(avatarPhoto(c.author))}`,
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
  const q = fold(query.trim())
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
    if (q) list = list.filter((c) => fold([c.title, c.desc, c.author, c.team, authorInfoFor(c.author).name, c.category, c.tools.join(' '), (c.topics || []).join(' ')].join(' ')).includes(q))
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
  // [key, label, required, hint, placeholder, input|area, rows, step]
  const fieldDefs = [
    ['title', 'Tên use case', 'Required', 'Một câu ngắn gọn nói rõ use case làm được gì.', 'Ví dụ: Tóm tắt phản hồi khách hàng theo tuần', 'input', 0, 'intro'],
    ['oneLine', 'Mô tả 1 câu', 'Required', 'Hiện ngay dưới tên bài và trên thẻ ở Use Case Library: ai dùng, làm được gì.', 'Ví dụ: Giúp team CS gom và tóm tắt phản hồi của cả tuần trong 30 phút.', 'input', 0, 'intro'],
    ['audience', 'Dành cho ai', 'Required', 'Vai trò hoặc nhóm nào dùng được use case này.', 'Ví dụ: QC / QE, team mobile', 'input', 0, 'intro'],
    ['team', 'Team / Nhóm', 'Required', 'Nhóm đang làm use case, để người đọc biết hỏi ai.', 'Ví dụ: Product Ops', 'input', 0, 'intro'],
    ['problem', 'Bài toán', 'Required', 'Vấn đề bạn gặp và bối cảnh công việc, trước khi có AI.', 'Mỗi tuần cần đọc hàng trăm phản hồi từ khảo sát và ticket...', 'area', 4, 'ps'],
    ['solution', 'Giải pháp', 'Required', 'AI giúp thế nào. Mỗi dòng một bước.', 'Gom dữ liệu về một file\nNhờ AI phân nhóm theo chủ đề\n...', 'area', 5, 'ps'],
    ['result', 'Kết quả', 'Required', 'Thay đổi sau khi dùng: thời gian, chất lượng, số liệu nếu có. Mỗi dòng một ý.', 'Giảm từ 4 giờ xuống 30 phút mỗi tuần...', 'area', 3, 'result'],
    ['fitYes', 'Phù hợp với bạn nếu', 'Optional', 'Mỗi dòng một trường hợp nên dùng.', 'Bạn phải đọc nhiều phản hồi dạng chữ mỗi tuần', 'area', 3, 'apply'],
    ['fitNo', 'Chưa phù hợp nếu', 'Optional', 'Mỗi dòng một trường hợp chưa nên dùng.', 'Dữ liệu có thông tin khách hàng chưa được che', 'area', 2, 'apply'],
    ['prep', 'Cần chuẩn bị gì', 'Required', 'Công cụ, quyền truy cập, dữ liệu hoặc tài khoản cần có trước. Mỗi dòng một mục.', 'Tài khoản Claude nội bộ\nQuyền xem dashboard CSAT', 'area', 3, 'apply'],
    ['prompt', 'Prompt / quy trình', 'Required', 'Prompt hoặc các bước cụ thể để người khác copy và làm lại được.', 'Dán prompt hoặc mô tả quy trình ở đây...', 'area', 5, 'apply'],
    ['pitfalls', 'Lỗi hay gặp', 'Optional', 'Mỗi dòng một lỗi, viết theo dạng: Lỗi bạn gặp → cách xử lý.', 'AI tóm tắt thiếu ý → chia file thành nhiều phần nhỏ rồi gửi lần lượt', 'area', 3, 'apply'],
    ['limits', 'Giới hạn & lưu ý an toàn', 'Optional', 'Chỗ nào AI còn sai, dữ liệu nào không được đưa vào, khâu nào cần người kiểm lại.', 'Không đưa dữ liệu khách hàng chưa che vào prompt...', 'area', 3, 'more'],
    ['tech', 'Chi tiết kỹ thuật', 'Optional', 'Dành cho dev: kiến trúc, API, cấu hình. Không cần thì bỏ trống.', 'Gọi API nội bộ X, chạy mỗi sáng thứ Hai bằng cron...', 'area', 4, 'more'],
    ['link', 'Link tài liệu / repo', 'Optional', 'Link tới tài liệu, repo hoặc file mẫu để người khác tự xem.', 'https://...', 'input', 0, 'more'],
    ['contact', 'Người liên hệ', 'Optional', 'Ai trả lời khi người đọc gặp vướng: Tên người · Team.', 'Ví dụ: Thảo NT · Product Ops', 'input', 0, 'more'],
  ]
  const shareFields = fieldDefs.map(([k, label, req, hint, placeholder, kind, rows, step]) => ({
    key: k, label, req, hint, placeholder, rows, step,
    reqColor: req === 'Required' ? '#E0353F' : '#94a3b8',
    isInput: kind === 'input', isArea: kind === 'area',
    value: shareForm[k] || '', onChange: setField(k),
  }))
  const shareExtra = () => ({
    type: shareType, oneLine: shareForm.oneLine.trim(),
    highlights: shareHighlights.map((h) => ({ value: h.value.trim(), label: h.label.trim() })).filter((h) => h.value || h.label),
    fitYes: shareForm.fitYes.trim(), fitNo: shareForm.fitNo.trim(), pitfalls: shareForm.pitfalls.trim(), tech: shareForm.tech.trim(),
  })
  // What's still missing, per step (labels), so the stepper can point at it.
  const missingByStep = Object.fromEntries(SHARE_STEPS.map((st) => [st.key, [
    ...shareFields.filter((f) => f.step === st.key && f.req === 'Required' && !f.value.trim()).map((f) => f.label),
    ...(st.key === 'intro' ? [!shareLevel && 'Độ khó', !shareCategory.length && 'Category'].filter(Boolean) : []),
  ]]))
  const valid = !!(shareForm.oneLine.trim() && shareForm.title.trim() && shareForm.audience.trim() && shareForm.team.trim() && shareForm.problem.trim() && shareForm.solution.trim() && shareForm.prep.trim() && shareForm.prompt.trim() && shareForm.result.trim() && shareCategory.length && shareLevel)
  const oneOf = (val, setVal, opts, labels = {}) => opts.map((o) => ({ label: labels[o] || o, ...chip(val === o), onPick: () => setVal(val === o ? '' : o) }))

  const shareCategories = CATS.map((c) => ({ label: c, ...chip(shareCategory.indexOf(c) >= 0), onPick: () => setShareCategory((s) => (s.indexOf(c) >= 0 ? s.filter((x) => x !== c) : s.concat([c]))) }))
  const shareTopics = TOPICS.map((tp) => {
    const on = shareTopicSel.indexOf(tp) >= 0
    return { label: tp, ...chip(on), opacity: !on && shareTopicSel.length >= 3 ? 0.45 : 1, onPick: () => setShareTopicSel((s) => { const has = s.indexOf(tp) >= 0; if (!has && s.length >= 3) return s; return has ? s.filter((x) => x !== tp) : [...s, tp] }) }
  })
  const shareTools = TOOLS.map((tl) => ({ label: tl, ...chip(shareToolSel.indexOf(tl) >= 0), onPick: () => setShareToolSel((s) => (s.indexOf(tl) >= 0 ? s.filter((x) => x !== tl) : [...s, tl])) }))
  const shareLevels = oneOf(shareLevel, setShareLevel, ['Dễ', 'Trung bình', 'Khó'])

  const previewTitle = shareForm.title || 'Chưa có tiêu đề'
  const previewTopics = shareTopicSel.filter((t2) => t2 !== 'Khác').concat((shareTopicOtherText || '').split(',').map((x) => x.trim()).filter(Boolean))
  const previewTools = shareToolSel.filter((t2) => t2 !== 'Khác').concat((shareToolOtherText || '').split(',').map((x) => x.trim()).filter(Boolean))

  // "Xem trước" renders the submission through the same template + components as the real page.
  const previewTpl = () => {
    const sub = {
      title: previewTitle, audience: shareForm.audience, team: shareForm.team, problem: shareForm.problem, solution: shareForm.solution,
      prep: shareForm.prep, prompt: shareForm.prompt, result: shareForm.result, limits: shareForm.limits, contact: shareForm.contact, link: shareForm.link,
      status: shareStatus, level: shareLevel, author: shareAnon ? (shareAlias.trim() || 'Anonymous') : user?.name || '', team: shareAnon ? '' : shareForm.team, extra: shareExtra(),
    }
    const c = { id: 'preview', title: previewTitle, desc: shareForm.oneLine, author: shareAnon ? (shareAlias.trim() || 'Anonymous') : user?.domain || user?.name || 'Bạn', anonymous: shareAnon, alias: shareAlias.trim() || 'Anonymous', authorId: user?.id, realAuthor: shareAnon ? (user?.domain || user?.name) : null, team: shareForm.team, category: shareCategory[0] || 'Khác', tools: previewTools }
    const tp = buildTemplate(c, { tpl: submissionTpl(sub) }, { name: user?.name || '', role: shareForm.team })
    return { c, tp, layout: detailLayout(tp, t) }
  }

  // ================= DETAIL VIEW =================
  function renderDetail() {
    const dsel = allCases.find((x) => x.id === id)
    if (!dsel && !pubLoaded) return <div style={css('min-height:60vh; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:14px;')}>Đang tải use case…</div>
    if (!dsel) return (
      <div style={css('min-height:60vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; padding:40px var(--zp-gutter); text-align:center; color:#fff;')}>
        <div style={css('font-size:26px; font-weight:800;')}>{t('Không tìm thấy use case')}</div>
        <div style={css('max-width:460px; font-size:14.5px; line-height:1.6; color:#a9b8dc;')}>{t('Link này không còn đúng: use case có thể đã bị xoá, chưa được duyệt, hoặc địa chỉ bị gõ sai.')}</div>
        <button onClick={() => navigate('/use-cases')} style={css('margin-top:6px; height:44px; padding:0 22px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer;')}>{t('Về Use Case Library')}</button>
      </div>
    )
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
      if (text) requireLogin(() => api.commentUseCase(dsel.id, text, null, dsel.title, { ...cmtAnonOpts(), ownerHandle: dsel.author }).then(() => { refreshMeta(dsel.id); setDDraft('') }).catch(() => {}))
    }
    const toggleApplied = () => requireLogin(() => api.toggleApplied(dsel.id).then((d) => setUcMeta((m) => ({ ...m, [dsel.id]: { ...(m[dsel.id] || {}), ...d } }))).catch(() => {}))

    // Which of the 9 parts have data — the rest are hidden, numbered in order, and listed in the TOC.
    const layout = detailLayout(tp, t)
    const has = layout.has
    const toc = [...layout.toc, { id: 'comments', label: t('Hữu ích & bình luận') }]

    return (
      <div>
        <FloatingBack t={t} onBack={() => (hasReturn() ? navigate(-1) : navigate('/use-cases'))} />
        {/* Hero and body share one grid, so the TOC sits right beside the overview box and then
            stays in view (sticky) down the whole page. overflow-x:clip keeps sticky working. */}
        <div style={css('position:relative; background:#07070c; color:#fff; overflow-x:clip;')}>
          <SpaceBackdrop arcTop={300} />
          <div style={css('position:relative; z-index:3; padding:18px var(--zp-gutter) 60px;')}>
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
                avatarUrl={avatarPhoto(dsel.author)}
                onBack={() => (hasReturn() ? navigate(-1) : navigate('/use-cases'))}
                onStart={has.apply ? () => scrollToId('uc-apply') : null}
                startLabel={t('Ứng dụng ngay')}
              />
            <DetailSections id={dsel.id} tp={tp} t={t} layout={layout} />

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
                <span style={css(`width:36px; height:36px; border-radius:50%; flex:none; background:${user?.avatarColor || '#2c5fff'}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800;${avatarPhotoCss(user?.avatarUrl)}`)}>{user?.initials || '?'}</span>
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
                  <div style={css('display:flex; align-items:center; justify-content:flex-end; gap:12px; flex-wrap:wrap; margin-top:10px;')}>
                    <div style={css('margin-right:auto;')}><AnonToggle compact on={cmtAnon} onChange={setCmtAnon} alias={cmtAlias} onAlias={setCmtAlias} label="Bình luận ẩn danh" /></div>
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
                        <span style={css(`width:36px; height:36px; border-radius:50%; flex:none; background:#EAF1FF; color:#2c5fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800;${avatarPhotoCss(c.avatarUrl)}`)}>{c.initials}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={css('display:flex; align-items:center; gap:8px;')}>
                            <div style={css('flex:1; min-width:0; font-size:12px; font-weight:600; color:#0F172A;')}>{c.author} <AnonTag p={c} /> <span style={css('font-weight:500; color:#94a3b8;')}>· {relativeTime(c.time)}{c.edited ? ' · đã sửa' : ''}</span></div>
                            <CommentMenu isOwner={!!user && c.authorId === user.id} isAdmin={!!user?.isAdmin} onEdit={() => setEditingCmt(c.id)} onDelete={() => (user && c.authorId === user.id ? ucModals.askDelete(() => api.deleteUseCaseComment(dsel.id, c.id).then(() => refreshMeta(dsel.id)).catch(() => {})) : askRemovalReason({ what: 'bình luận', title: String(c.body || '').slice(0, 80) }).then((why) => why && api.deleteUseCaseComment(dsel.id, c.id, why).then(() => refreshMeta(dsel.id)).catch(() => {})))} onReport={() => ucModals.askReport('uc_comment', c.id)} />
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
                          <span style={css(`width:30px; height:30px; border-radius:50%; flex:none; background:#EAF1FF; color:#2c5fff; display:flex; align-items:center; justify-content:center; font-size:11.5px; font-weight:800;${avatarPhotoCss(r.avatarUrl)}`)}>{r.initials}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={css('display:flex; align-items:center; gap:8px;')}>
                              <div style={css('flex:1; min-width:0; font-size:12px; font-weight:600; color:#0F172A;')}>{r.author} <AnonTag p={r} /> <span style={css('font-weight:500; color:#94a3b8;')}>· {relativeTime(r.time)}{r.edited ? ' · đã sửa' : ''}</span></div>
                              <CommentMenu isOwner={!!user && r.authorId === user.id} isAdmin={!!user?.isAdmin} onEdit={() => setEditingCmt(r.id)} onDelete={() => (user && r.authorId === user.id ? ucModals.askDelete(() => api.deleteUseCaseComment(dsel.id, r.id).then(() => refreshMeta(dsel.id)).catch(() => {})) : askRemovalReason({ what: 'bình luận', title: String(r.body || '').slice(0, 80) }).then((why) => why && api.deleteUseCaseComment(dsel.id, r.id, why).then(() => refreshMeta(dsel.id)).catch(() => {})))} onReport={() => ucModals.askReport('uc_comment', r.id)} />
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
                          <span style={css(`width:30px; height:30px; border-radius:50%; flex:none; background:${user?.avatarColor || '#2c5fff'}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11.5px; font-weight:800;${avatarPhotoCss(user?.avatarUrl)}`)}>{user?.initials || '?'}</span>
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
            <Toc items={toc} t={t} alignTo="uc-overview" />
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
        <section style={css('position:relative; overflow:hidden; padding-bottom:260px; margin-bottom:-260px;')}>
          <SpaceBackdrop arcTop={190} />
          <div style={css('position:relative; z-index:4; padding:22px var(--zp-gutter) 0;')}>
            <h1 style={css('margin:0; text-align:center; font-family:"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; font-size:50px; line-height:1.06; font-weight:800; letter-spacing:-1px; background:linear-gradient(180deg,#ffffff 0%,#cfe3ff 46%,#4f93ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 6px 40px rgba(26,95,255,.85)) drop-shadow(0 0 16px rgba(90,150,255,.6));')}>{t('Use Case Library')}</h1>
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
                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); if (c.canEdit) setConfirmDeleteId(c.id); else askRemovalReason({ what: 'use case', title: c.title }).then((why) => why && deleteUseCase(c.id, why)) }} style={css('display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border:none; background:transparent; cursor:pointer; border-radius:10px; font:600 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#D8232A; text-align:left;')}>
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
                          <span style={css('font-size:12.5px; font-weight:600; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{c.author}</span><AnonTag p={c} />
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
              <div style={css('margin-top:16px; font:800 16px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{t('Bạn muốn xoá vĩnh viễn bài viết này?')}</div>
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
    const shareHeading = shareStage === 'submitted' ? (liveEdit ? 'Đã lưu thay đổi' : editing ? 'Đã gửi lại use case' : 'Use case đã được gửi') : shareStage === 'preview' ? 'Xem trước use case' : liveEdit ? 'Chỉnh sửa use case' : editing ? 'Chỉnh sửa & gửi lại use case' : t('Chia sẻ Use Case')
    const shareSubhead = shareStage === 'submitted' ? (liveEdit ? 'Use case đã được cập nhật trong Use Case Library.' : 'Admin sẽ xem xét và bạn nhận được thông báo về kết quả.') : liveEdit ? 'Thay đổi được cập nhật ngay trong Use Case Library.' : 'Mô tả cách bạn dùng AI để người khác làm lại được. Bài sẽ qua bước Admin duyệt.'
    const shareHint = shareError || (liveEdit ? 'Bài vẫn hiển thị trong Use Case Library sau khi lưu.' : 'Sau khi gửi, bài ở trạng thái Chờ duyệt và chưa hiển thị trong Use Case Library.')
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

              {shareStage === 'preview' && (() => {
                const pv = previewTpl()
                return (
                <div>
                  <div style={css('display:flex; align-items:center; gap:10px; background:#EEF3FF; border:1px solid #CFE0FF; border-radius:14px; padding:13px 18px; font-size:13.5px; font-weight:700; color:#1E44A8;')}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2c5fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7"></path></svg>
                    {t('Xem trước: đây đúng là trang chi tiết người đọc sẽ thấy sau khi bài được duyệt.')}
                  </div>
                  <div className="zp-detail-wrap" style={css('margin-top:16px; border-radius:20px; overflow:hidden; background:#07070c; color:#fff; padding:22px 22px 30px;')}>
                    <DetailHero tldr={pv.tp.tldr} t={t} c={pv.c} h={{ ...pv.tp.hero, posted: '' }} topics={previewTopics} avatarBg={user?.avatarColor || avatarColor(pv.c.author)} avatarUrl={user?.avatarUrl} startLabel={t('Ứng dụng ngay')} onStart={pv.layout.has.apply ? () => document.getElementById('uc-apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) : null} />
                    <DetailSections id="preview" tp={pv.tp} t={t} layout={pv.layout} />
                  </div>
                  <div style={css('margin-top:16px; padding:12px 16px; border-radius:14px; background:#fff; border:1px solid #E6EBF3;')}>
                    <AnonToggle compact on={shareAnon} onChange={setShareAnon} alias={shareAlias} onAlias={setShareAlias} />
                  </div>
                  <div style={css('display:flex; align-items:center; gap:12px; margin-top:12px; flex-wrap:wrap;')}>
                    <button onClick={() => setShareStage('form')} style={css('height:48px; padding:0 22px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap;')}>{t('Quay lại chỉnh sửa')}</button>
                    <button
                      onClick={submitShare}
                      style={css('margin-left:auto; height:48px; padding:0 26px; white-space:nowrap; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 12px 26px rgba(44,95,255,.4);')}
                    >
                      {liveEdit ? 'Lưu thay đổi' : editing ? 'Gửi lại để duyệt' : t('Gửi duyệt')}
                    </button>
                  </div>
                  {shareError && <div style={css('margin-top:10px; font-size:12.5px; font-weight:600; color:#D8232A;')}>{shareError}</div>}
                </div>
                )
              })()}

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
                  {!editing && (
                    <div style={css('margin-bottom:16px; padding:16px 18px; border-radius:18px; background:linear-gradient(180deg,#F3F7FF,#EEF3FF); border:1px solid #D5E2FC;')}>
                      <div style={css('display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap;')}>
                        <span style={css('flex:none; width:38px; height:38px; border-radius:11px; background:#2B579A; color:#fff; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:900;')}>W</span>
                        <div style={css('flex:1; min-width:220px;')}>
                          <div style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{t('Thích điền bằng Word hơn?')}</div>
                          <div style={css('margin-top:3px; font-size:12.5px; line-height:1.55; color:#475569;')}>{t('Tải template, điền trên máy (có thể gửi team góp ý trước), rồi tải file lên. Nội dung tự điền vào form bên dưới để bạn kiểm tra và bấm Gửi duyệt.')}</div>
                        </div>
                        <div style={css('display:flex; gap:8px; flex-wrap:wrap;')}>
                          <a href={TEMPLATE_URL} download className={hoverClass('background:#F2F6FF !important;')} style={css('display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 14px; border:1px solid #B9CCF8; border-radius:999px; background:#fff; color:#2c5fff; font-size:13px; font-weight:700; text-decoration:none; white-space:nowrap;')}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>
                            {t('Tải template Word')}
                          </a>
                          <label className={hoverClass('filter:brightness(1.06) !important;')} style={css('display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 14px; border:none; border-radius:999px; background:#2c5fff; color:#fff; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap;')}>
                            <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(e) => { importDocx(e.target.files?.[0]); e.target.value = '' }} />
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21V9"></path><path d="m7 14 5-5 5 5"></path><path d="M5 3h14"></path></svg>
                            {t('Tải lên file Word đã điền')}
                          </label>
                        </div>
                      </div>
                      {docxError && <div style={css('margin-top:10px; font-size:12.5px; font-weight:600; color:#D8232A;')}>{docxError}</div>}
                      {docxInfo && (
                        <div role="status" style={css(`margin-top:10px; padding:10px 12px; border-radius:12px; background:${docxInfo.missing.length ? '#FFF8E8' : '#F2FBF6'}; border:1px solid ${docxInfo.missing.length ? '#F3E0B0' : '#CFEEDE'}; font-size:12.5px; line-height:1.55; color:${docxInfo.missing.length ? '#5A4522' : '#1F4B33'};`)}>
                          <b>✓ {t('Đã điền')} {docxInfo.filled} {t('mục từ')} "{docxInfo.name}".</b> {docxInfo.missing.length ? t('Còn thiếu mục bắt buộc') + ': ' + docxInfo.missing.join(', ') + '. ' + t('Điền thêm bên dưới rồi gửi.') : t('Kiểm tra lại nội dung bên dưới rồi bấm Gửi duyệt.')}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Stepper: one step per part of the detail page; click any step to jump. */}
                  <div role="tablist" aria-label={t('Các bước')} style={css('display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px;')}>
                    {SHARE_STEPS.map((st, i) => {
                      const on = i === shareStep
                      const miss = missingByStep[st.key].length
                      return (
                        <button key={st.key} role="tab" aria-selected={on} onClick={() => setShareStep(i)} style={css(`display:inline-flex; align-items:center; gap:8px; height:38px; padding:0 14px 0 6px; border-radius:999px; border:1px solid ${on ? '#2c5fff' : '#DDE3EC'}; background:${on ? '#2c5fff' : '#fff'}; color:${on ? '#fff' : '#3A4757'}; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap;`)}>
                          <span style={css(`width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; background:${on ? 'rgba(255,255,255,.22)' : miss ? '#EEF1F7' : '#E7F9F0'}; color:${on ? '#fff' : miss ? '#64748b' : '#00893F'};`)}>{miss ? i + 1 : '✓'}</span>
                          {t(st.label)}
                        </button>
                      )
                    })}
                  </div>
                  <div style={css('background:#fff; border:1px solid #E6EBF3; border-radius:20px; padding:26px 28px; box-shadow:0 10px 24px rgba(30,50,90,.06);')}>
                    <div style={css('margin:0 0 20px; font-size:12px; font-weight:700; color:#64748b;')}>{t('Bước')} {shareStep + 1}/{SHARE_STEPS.length} · {t('Điền cho')} {t(SHARE_STEPS[shareStep].part)}</div>
                    {SHARE_STEPS[shareStep].key === 'intro' && (
                      <>
                        <div style={css('margin-bottom:24px;')}>
                          <div style={css('display:flex; align-items:center; gap:8px;')}>
                            <span style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{t('Ảnh bìa')}</span>
                            <span style={css('font-size:11px; font-weight:700; color:#94a3b8;')}>{t('Không bắt buộc')}</span>
                          </div>
                          <div style={css('margin-top:3px; font-size:12.5px; color:#64748b;')}>{t('Hiện trên thẻ use case. Không có ảnh thì dùng icon theo danh mục.')}</div>
                          <div style={css('display:flex; align-items:center; gap:14px; margin-top:10px;')}>
                            <CoverImage c={{ coverUrl: shareCover && !shareCover.cleared ? shareCover.url : null, category: shareCategory[0] }} size={84} radius={14} forceImage />
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
                        <div style={css(`margin:-4px 0 24px; padding:14px 16px; border-radius:14px; border:1px solid ${shareAnon ? '#B9CCF8' : '#E6EBF3'}; background:${shareAnon ? '#F2F6FF' : '#F8FAFE'};`)}>
                          <div style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{t('Người đăng')}</div>
                          <div style={css('margin-top:3px; font-size:12.5px; color:#64748b;')}>{t('Bật "Đăng ẩn danh" để người khác thấy tên hiển thị bạn chọn thay vì tên thật. Admin vẫn biết bạn là ai.')}</div>
                          <AnonToggle on={shareAnon} onChange={setShareAnon} alias={shareAlias} onAlias={setShareAlias} />
                        </div>
                      </>
                    )}
                    {shareFields.filter((f) => f.step === SHARE_STEPS[shareStep].key).map((f) => (
                      <div key={f.key} style={css('margin-bottom:24px;')}>
                        <div style={css('display:flex; align-items:center; gap:8px;')}>
                          <label htmlFor={'sf-' + f.key} style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{f.label}</label>
                          <span style={css(`font-size:11px; font-weight:700; color:${f.reqColor};`)}>{f.req === 'Required' ? t('Bắt buộc') : t('Không bắt buộc')}</span>
                        </div>
                        <div style={css('margin-top:5px; font-size:12.5px; color:#94a3b8;')}>{f.hint}</div>
                        {f.isInput && (
                          <input id={'sf-' + f.key} value={f.value} onChange={f.onChange} placeholder={f.placeholder} style={css('width:100%; margin-top:10px; border:1px solid #E6EBF3; border-radius:12px; padding:13px 15px; font-family:inherit; font-size:15px; color:#0f172a; background:#fff; outline:none; box-sizing:border-box;')} />
                        )}
                        {f.isArea && (
                          <textarea id={'sf-' + f.key} value={f.value} onChange={f.onChange} rows={f.rows} placeholder={f.placeholder} style={css('width:100%; margin-top:10px; border:1px solid #E6EBF3; border-radius:12px; padding:13px 15px; font-family:inherit; font-size:14.5px; line-height:1.7; color:#0f172a; background:#fff; outline:none; resize:vertical; display:block; box-sizing:border-box;')} />
                        )}
                      </div>
                    ))}
                    {SHARE_STEPS[shareStep].key === 'result' && (
                      <div style={css('margin-bottom:8px;')}>
                        <div style={css('display:flex; align-items:center; gap:8px;')}>
                          <span style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{t('Kết quả nổi bật')}</span>
                          <span style={css('font-size:11px; font-weight:700; color:#94a3b8;')}>{t('Không bắt buộc · tối đa 3')}</span>
                        </div>
                        <div style={css('margin-top:5px; font-size:12.5px; color:#94a3b8;')}>{t('Con số đáng nhớ nhất, hiện đầu phần Kết quả. Chỉ ghi số đã đo được.')}</div>
                        {shareHighlights.map((h, i) => (
                          <div key={i} style={css('display:flex; gap:8px; margin-top:10px;')}>
                            <input aria-label={t('Con số') + ' ' + (i + 1)} value={h.value} onChange={(e) => setShareHighlights((l) => l.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)))} placeholder={['2 ngày → 5 phút', '−80%', '12 team'][i]} style={css('flex:0 0 34%; min-width:0; border:1px solid #E6EBF3; border-radius:12px; padding:11px 13px; font-family:inherit; font-size:14px; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box;')} />
                            <input aria-label={t('Ý nghĩa') + ' ' + (i + 1)} value={h.label} onChange={(e) => setShareHighlights((l) => l.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} placeholder={['thời gian làm báo cáo tuần', 'lỗi nhập liệu', 'đang dùng hằng tuần'][i]} style={css('flex:1; min-width:0; border:1px solid #E6EBF3; border-radius:12px; padding:11px 13px; font-family:inherit; font-size:14px; color:#0f172a; outline:none; box-sizing:border-box;')} />
                          </div>
                        ))}
                      </div>
                    )}
                    {SHARE_STEPS[shareStep].key === 'intro' && (
                      <>
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
                          {shareTopicSel.indexOf('Khác') >= 0 && (
                            <input autoFocus value={shareTopicOtherText} onChange={(e) => setShareTopicOtherText(e.target.value)} placeholder="Nhập topic khác, cách nhau bằng dấu phẩy" style={css('flex:1 1 220px; min-width:180px; height:36px; box-sizing:border-box; padding:0 14px; border:1px solid #B9CCF8; border-radius:999px; background:#fff; color-scheme:light; font-family:inherit; font-size:13px; color:#0F172A; outline:none;')} />
                          )}
                        </div>

                        <div style={css('display:flex; align-items:center; gap:8px; margin-top:24px;')}>
                          <label style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{t('Công cụ AI')}</label>
                          <span style={css('font-size:11px; font-weight:700; color:#94a3b8;')}>{t('Không bắt buộc')}</span>
                        </div>
                        <div style={css('display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;')}>
                          {shareTools.map((tl) => (
                            <button key={tl.label} onClick={tl.onPick} style={css(`height:36px; padding:0 15px; border:1px solid ${tl.border}; border-radius:999px; background:${tl.bg}; color:${tl.color}; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer;`)}>{tl.label}</button>
                          ))}
                          {shareToolSel.indexOf('Khác') >= 0 && (
                            <input autoFocus value={shareToolOtherText} onChange={(e) => setShareToolOtherText(e.target.value)} placeholder="Nhập công cụ AI khác, cách nhau bằng dấu phẩy" style={css('flex:1 1 220px; min-width:180px; height:36px; box-sizing:border-box; padding:0 14px; border:1px solid #B9CCF8; border-radius:999px; background:#fff; color-scheme:light; font-family:inherit; font-size:13px; color:#0F172A; outline:none;')} />
                          )}
                        </div>

                      </>
                    )}
                  </div>

                  <div style={css('display:flex; align-items:center; gap:12px; margin-top:16px; flex-wrap:wrap;')}>
                    <button onClick={() => { setHasDraft(true); try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draftPayload(), savedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) })) } catch { /* ignore */ } closeShare() }} style={css('height:48px; padding:0 22px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap;')}>{t('Lưu nháp & đóng')}</button>
                    <div style={css('margin-left:auto; display:flex; gap:12px; flex:none;')}>
                      {shareStep > 0 && <button onClick={() => setShareStep(shareStep - 1)} style={css('height:48px; padding:0 20px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap;')}>‹ {t('Bước trước')}</button>}
                      {shareStep < SHARE_STEPS.length - 1
                        ? <button onClick={() => setShareStep(shareStep + 1)} style={css('height:48px; padding:0 24px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap; box-shadow:0 12px 26px rgba(44,95,255,.4);')}>{t('Tiếp')}: {t(SHARE_STEPS[shareStep + 1].label)} ›</button>
                        : (
                          <button
                            onClick={() => {
                              if (!valid) {
                                const first = SHARE_STEPS.findIndex((st) => missingByStep[st.key].length)
                                setShareError(t('Còn thiếu') + ': ' + SHARE_STEPS.filter((st) => missingByStep[st.key].length).map((st) => t(st.label) + ' (' + missingByStep[st.key].join(', ') + ')').join(' · '))
                                if (first >= 0) setShareStep(first)
                                return
                              }
                              setShareStage('preview'); setShareError('')
                            }}
                            style={css('height:48px; padding:0 26px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap; box-shadow:0 12px 26px rgba(44,95,255,.4);')}
                          >
                            {t('Xem trước & gửi')} ›
                          </button>
                        )}
                    </div>
                  </div>
                  <div style={css(`margin-top:10px; font-size:12.5px; font-weight:600; color:${shareHintColor};`)}>{shareError || (missingByStep[SHARE_STEPS[shareStep].key].length ? t('Bước này còn thiếu') + ': ' + missingByStep[SHARE_STEPS[shareStep].key].join(', ') : shareHint)}</div>
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
