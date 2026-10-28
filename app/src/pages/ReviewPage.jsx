import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { api, relativeTime } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useTitle } from '../hooks/useTitle.js'
import Layout from '../components/Layout.jsx'
import { avatarPhotoCss } from '../components/Avatar.jsx'
import { safeHref } from '../lib/safeHref.js'

// Review page for a submitted use case, Google-Docs style: the post on the left, comments in a rail on
// the right lined up with the passage they're about. Admins select text (or use 💬 on a section) to
// comment; the author replies, marks each one "Đã sửa", then edits and resubmits.

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const f = (w, s, lh) => `font:${w} ${s}px${lh ? '/' + lh : ''} ${FONT}`
const STATUS = {
  pending: { label: 'Đang chờ duyệt', bg: '#FFF1E0', fg: '#B45300' },
  changes_requested: { label: 'Cần chỉnh sửa', bg: '#FFF4E3', fg: '#9A5B00' },
  approved: { label: 'Đã đăng', bg: '#E7F9F0', fg: '#00893F' },
  rejected: { label: 'Từ chối', bg: '#FFECEC', fg: '#D8232A' },
}
const RAIL = 340
const GAP = 10

/** The post in the parts of the share form (and of the published page), in order. `step` = the form step
 *  that edits the part. Optional fields only show when filled (or when a comment is pinned to them). */
function partsOf(s) {
  const ex = s.extra || {}
  const hl = (ex.highlights || []).map((h) => [h.value, h.label].filter(Boolean).join(' — ')).join('\n')
  const block = (key, label, value, opts = {}) => ({ key, label, value: String(value || ''), ...opts })
  return [
    { step: 0, title: 'Đầu trang', blocks: [
      block('oneLine', 'Mô tả 1 câu', ex.oneLine, { required: true }),
      block('audience', 'Ai dùng được', s.audience, { required: true }),
      block('members', 'Thành viên cùng làm', (ex.members || []).join(', ')),
      block('team', 'Team', s.team),
    ] },
    { step: 1, title: 'Bài toán & giải pháp', blocks: [
      block('problem', 'Bài toán', s.problem, { required: true }),
      block('solution', 'Giải pháp', s.solution, { required: true }),
      block('result', 'Số liệu & hình ảnh', s.result),
      block('highlights', 'Con số nổi bật', hl),
    ] },
    { step: 2, title: 'Tự áp dụng', blocks: [
      block('link', 'Link tài liệu / repo', s.link),
      block('fitYes', 'Phù hợp với bạn nếu', ex.fitYes),
      block('fitNo', 'Chưa phù hợp nếu', ex.fitNo),
      block('prep', 'Cần chuẩn bị gì', s.prep, { required: true }),
      (ex.steps || []).length ? { key: 'steps', label: 'Các bước', steps: ex.steps, value: ex.steps.map((x) => [x.title, x.text, x.prompt, x.note].join('\n')).join('\n') } : block('prompt', 'Prompt / quy trình', s.prompt, { mono: true }),
      block('success', 'Kết quả bạn sẽ thấy', ex.success),
      block('pitfalls', 'Lỗi hay gặp', ex.pitfalls),
      block('tech', 'Chi tiết kỹ thuật', ex.tech, { mono: true }),
      block('contact', 'Người liên hệ', s.contact),
    ] },
    { step: 3, title: 'Trách nhiệm & giới hạn', blocks: [
      block('safety', 'Trách nhiệm của con người', ex.safety),
      block('limits', 'Giới hạn của AI', s.limits),
    ] },
  ]
}

const escapeRe = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** `text` with each thread's quote wrapped in a <mark data-thread> (first unclaimed occurrence; whitespace-insensitive). */
function withMarks(text, threads, activeId, onPick) {
  const hits = []
  for (const th of threads) {
    if (!th.quote) continue
    const re = new RegExp(escapeRe(th.quote).replace(/ /g, '\\s+'), 'g')
    let m
    while ((m = re.exec(text))) {
      const a = m.index, b = a + m[0].length
      if (!hits.some((h) => a < h.b && b > h.a)) { hits.push({ a, b, th }); break }
      if (!m[0].length) break
    }
  }
  if (!hits.length) return text
  hits.sort((x, y) => x.a - y.a)
  const out = []
  let at = 0
  for (const h of hits) {
    if (h.a > at) out.push(text.slice(at, h.a))
    const on = h.th.id === activeId
    out.push(
      <mark key={h.th.id} data-thread={h.th.id} onClick={(e) => { e.stopPropagation(); onPick(h.th.id) }}
        style={css(`background:${h.th.resolved ? 'rgba(148,163,184,.18)' : on ? '#FFD666' : '#FFF0B3'}; color:inherit; border-bottom:2px solid ${h.th.resolved ? 'transparent' : on ? '#E0A100' : '#F5C542'}; border-radius:3px; padding:1px 0; cursor:pointer;`)}>
        {text.slice(h.a, h.b)}
      </mark>,
    )
    at = h.b
  }
  if (at < text.length) out.push(text.slice(at))
  return out
}

function Av({ u, size = 26 }) {
  return <span style={css(`flex:none; width:${size}px; height:${size}px; border-radius:50%; background:${u?.avatarColor || '#64748B'}; color:#fff; display:flex; align-items:center; justify-content:center;` + f(800, size * 0.38) + ';' + avatarPhotoCss(u?.avatarUrl))}>{u?.initials}</span>
}

export default function ReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState(null) // { submission, comments, isOwner }
  const [err, setErr] = useState('')
  const [active, setActive] = useState(null) // thread id
  const [draft, setDraft] = useState(null) // { field, quote } for a new thread
  const [draftText, setDraftText] = useState('')
  const [pick, setPick] = useState(null) // floating "Bình luận" button for a text selection: { field, quote, x, y }
  const [showResolved, setShowResolved] = useState(false)
  const [decide, setDecide] = useState(null) // 'approved' | 'changes_requested' | 'rejected'
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [wide, setWide] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1180)
  const docRef = useRef(null)
  const wrapRef = useRef(null)
  const cardRefs = useRef({})
  const [tops, setTops] = useState({})
  useTitle(data ? 'Duyệt: ' + data.submission.title : 'Duyệt use case')

  const load = useCallback(() => api.getReview(id).then((d) => { setData(d); setErr('') }).catch((e) => setErr(e?.status === 404 || e?.data?.error === 'not_found' ? 'missing' : 'error')), [id])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= 1180)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  const isAdmin = !!user?.isAdmin
  const sub = data?.submission
  const threads = (data?.comments || []).filter((c) => showResolved || !c.resolved || c.id === active)
  const openCount = (data?.comments || []).filter((c) => !c.resolved).length
  const resolvedCount = (data?.comments || []).length - openCount
  const parts = sub ? partsOf(sub) : []
  const blocks = parts.flatMap((pt) => pt.blocks)
  const fieldOrder = ['title', 'general', ...blocks.map((b) => b.key)]
  const sorted = [...threads].sort((a, b) => fieldOrder.indexOf(a.field) - fieldOrder.indexOf(b.field))

  // Line each card up with its passage (or section), pushing it down when it would overlap the one above.
  const anchorTop = useCallback((th) => {
    const wrap = wrapRef.current
    if (!wrap) return 0
    const el = (th.id && wrap.querySelector(`mark[data-thread="${th.id}"]`)) || wrap.querySelector(`[data-field="${th.field}"]`)
    if (!el) return 0
    return el.getBoundingClientRect().top - wrap.getBoundingClientRect().top
  }, [])
  useLayoutEffect(() => {
    if (!wide || !sub) return
    const items = [...sorted]
    if (draft) items.push({ id: '__draft', field: draft.field, quote: draft.quote, draftAt: draft.at })
    const want = items.map((th) => ({ id: th.id, y: th.id === '__draft' && th.draftAt != null ? th.draftAt : anchorTop(th) })).sort((a, b) => a.y - b.y)
    // The active card sits exactly at its anchor; the others make room around it.
    const next = {}
    let bottom = -Infinity
    for (const w of want) {
      const h = cardRefs.current[w.id]?.offsetHeight || 80
      const y = Math.max(w.y, bottom + GAP)
      next[w.id] = y
      bottom = y + h
    }
    const act = active && want.find((w) => w.id === active)
    if (act && next[active] !== act.y) {
      const shift = next[active] - act.y
      for (const w of want) next[w.id] -= shift
      // keep anything above from going negative
      const min = Math.min(...Object.values(next))
      if (min < 0) for (const k in next) next[k] -= min
    }
    if (JSON.stringify(next) !== JSON.stringify(tops)) setTops(next)
  })

  // Text selection inside a section → floating "Bình luận" button (admins only).
  const onMouseUp = () => {
    if (!isAdmin) return
    setTimeout(() => {
      const sel = window.getSelection()
      const text = sel ? sel.toString().replace(/\s+/g, ' ').trim() : ''
      if (!sel || !text || sel.rangeCount === 0) { setPick(null); return }
      const range = sel.getRangeAt(0)
      const node = (n) => (n && n.nodeType === 3 ? n.parentElement : n)
      const a = node(range.startContainer)?.closest('[data-text]'), b = node(range.endContainer)?.closest('[data-text]')
      if (!a || a !== b) { setPick(null); return }
      const r = range.getBoundingClientRect()
      setPick({ field: a.getAttribute('data-text'), quote: text.slice(0, 500), x: r.right, y: r.top })
    }, 0)
  }
  useEffect(() => {
    if (!pick) return
    const off = () => setPick(null)
    window.addEventListener('scroll', off, { passive: true })
    return () => window.removeEventListener('scroll', off)
  }, [pick])

  const startDraft = (field, quote = '', at = null) => {
    const wrap = wrapRef.current
    const y = at != null && wrap ? at - wrap.getBoundingClientRect().top : null
    setDraft({ field, quote, at: y }); setDraftText(''); setPick(null); setActive('__draft')
    window.getSelection()?.removeAllRanges()
  }
  const saveDraft = () => {
    const body = draftText.trim()
    if (!body || !draft) return
    setBusy(true)
    api.addReviewComment(id, { field: draft.field, quote: draft.quote, body })
      .then((d) => { setData((x) => ({ ...x, comments: d.comments })); const last = d.comments.filter((c) => c.field === draft.field && c.body === body).pop(); setActive(last ? last.id : null); setDraft(null); setDraftText('') })
      .catch(() => {})
      .finally(() => setBusy(false))
  }
  const reply = (th, body) => api.addReviewComment(id, { parentId: th.id, body }).then((d) => setData((x) => ({ ...x, comments: d.comments })))
  const resolve = (th, on) => api.resolveReviewComment(id, th.id, on).then((d) => { setData((x) => ({ ...x, comments: d.comments })); if (on && !showResolved) setActive(null) })
  const remove = (c) => window.confirm('Xoá góp ý này?') && api.deleteReviewComment(id, c.id).then((d) => { setData((x) => ({ ...x, comments: d.comments })); setActive(null) })

  const pickThread = (tid) => {
    setActive(tid)
    const el = wrapRef.current?.querySelector(`mark[data-thread="${tid}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  const submitDecision = () => {
    const n = note.trim()
    if (decide === 'rejected' && !n) return
    if (decide === 'changes_requested' && !n && !openCount) return
    setBusy(true)
    api.reviewSubmission(id, decide, n).then(() => { setDecide(null); setNote(''); load() }).catch(() => {}).finally(() => setBusy(false))
  }

  if (err) {
    return (
      <Layout>
        <div style={css('min-height:60vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; padding:40px; text-align:center; color:#fff;')}>
          <div style={css(f(800, 24))}>{err === 'missing' ? 'Không tìm thấy bài này' : 'Không tải được bài'}</div>
          <div style={css(f(400, 14, 1.6) + ';color:#a9b8dc; max-width:440px;')}>{err === 'missing' ? 'Bài có thể đã bị xoá, hoặc bạn không phải người gửi / admin.' : 'Kiểm tra mạng rồi thử lại.'}</div>
          <button onClick={() => (err === 'missing' ? navigate(isAdmin ? '/admin' : '/profile') : load())} style={css('height:42px; padding:0 22px; border:none; border-radius:999px; background:#2c5fff; color:#fff; cursor:pointer;' + f(700, 14))}>{err === 'missing' ? 'Quay lại' : 'Thử lại'}</button>
        </div>
      </Layout>
    )
  }
  if (!sub) return <Layout><div style={css('min-height:60vh; display:flex; align-items:center; justify-content:center; color:#94a3b8;' + f(500, 14))}>Đang tải bài…</div></Layout>

  const st = STATUS[sub.reviewStatus] || STATUS.pending
  const underReview = ['pending', 'changes_requested'].includes(sub.reviewStatus)
  const threadsFor = (field) => (data.comments || []).filter((c) => c.field === field)
  const countBadge = (field) => {
    const n = threadsFor(field).filter((c) => !c.resolved).length
    return n ? <span style={css('display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:#FFE7A3; color:#7A5200;' + f(800, 11))}>{n}</span> : null
  }
  const addBtn = (field) => isAdmin && underReview && (
    <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); startDraft(field, '', r.top) }} title="Góp ý cho cả mục này" aria-label="Góp ý cho cả mục này"
      className={hoverClass('background:#EEF3FF !important; color:#2c5fff !important;')}
      style={css('display:inline-flex; align-items:center; gap:5px; height:26px; padding:0 9px; border:1px solid #E1E7F2; border-radius:999px; background:#fff; color:#64748b; cursor:pointer;' + f(700, 11.5))}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M12 8v6M9 11h6"></path></svg>
      Góp ý
    </button>
  )
  const textOf = (field, value, mono, extra = '') => (
    <div data-text={field} style={css(`margin-top:6px; white-space:pre-wrap; word-break:break-word; color:#0f172a; ${mono ? 'font:500 13px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace; background:#F6F8FC; border:1px solid #EAEFF7; border-radius:10px; padding:10px 12px;' : f(400, 14.5, 1.7)} ${extra}`)}>
      {value ? withMarks(value, threadsFor(field), active, pickThread) : <span style={css(f(600, 13) + ';color:#B45300;')}>Chưa điền (bắt buộc)</span>}
    </div>
  )
  const canEdit = data.isOwner && ['changes_requested', 'pending', 'approved'].includes(sub.reviewStatus)
  const editAt = (step) => navigate('/use-cases?edit=' + encodeURIComponent(sub.id) + (step ? '&step=' + step : ''))
  const editBtn = (step) => canEdit && (
    <button onClick={() => editAt(step)} className={hoverClass('background:#2c5fff !important; color:#fff !important;')}
      style={css('display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 13px; border:1px solid #C9D7FF; border-radius:999px; background:#EEF3FF; color:#2c5fff; cursor:pointer; white-space:nowrap;' + f(700, 12.5))}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
      Sửa phần này
    </button>
  )
  const stepsOf = (b) => (
    <ol style={css('list-style:none; margin:8px 0 0; padding:0; display:flex; flex-direction:column; gap:12px;')}>
      {b.steps.map((x, i) => (
        <li key={i} style={css('display:flex; gap:11px;')}>
          <span style={css('flex:none; width:24px; height:24px; border-radius:50%; background:#2c5fff; color:#fff; display:flex; align-items:center; justify-content:center; margin-top:1px;' + f(800, 12))}>{i + 1}</span>
          <div style={css('flex:1; min-width:0;')}>
            {x.title && <div data-text="steps" style={css(f(800, 14.5, 1.5) + ';color:#0f172a;')}>{withMarks(x.title, threadsFor('steps'), active, pickThread)}</div>}
            {x.text && textOf('steps', x.text, false, 'margin-top:2px;')}
            {x.prompt && textOf('steps', x.prompt, true)}
            {x.note && <div data-text="steps" style={css('margin-top:6px; padding:7px 11px; border-radius:10px; background:#FFF1F1; border:1px solid #F6C9CB; white-space:pre-wrap; word-break:break-word;' + f(600, 13, 1.55) + ';color:#B4141B;')}>⚠ {withMarks(x.note, threadsFor('steps'), active, pickThread)}</div>}
          </div>
        </li>
      ))}
    </ol>
  )

  const cards = sorted.map((th) => (
    <Thread key={th.id} th={th} active={active === th.id} me={user} isAdmin={isAdmin} isOwner={data.isOwner}
      refEl={(el) => { cardRefs.current[th.id] = el }}
      style={wide ? { position: 'absolute', left: 0, right: 0, top: tops[th.id] ?? 0, transition: 'top .18s ease' } : {}}
      onFocus={() => pickThread(th.id)} onReply={reply} onResolve={resolve} onDelete={remove} />
  ))
  const draftCard = draft && (
    <div ref={(el) => { cardRefs.current.__draft = el }} style={css(`${wide ? `position:absolute; left:0; right:0; top:${tops.__draft ?? 0}px;` : ''} background:#fff; border:2px solid #2c5fff; border-radius:14px; padding:12px; box-shadow:0 14px 34px rgba(6,14,40,.35);`)}>
      <div style={css(f(800, 12) + ';color:#2c5fff;')}>Góp ý mới · {(blocks.find((b) => b.key === draft.field) || { label: draft.field === 'title' ? 'Tên use case' : 'Chung' }).label}</div>
      {draft.quote && <div style={css('margin-top:6px; padding-left:8px; border-left:3px solid #F5C542;' + f(400, 12.5, 1.5) + ';color:#64748b; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;')}>“{draft.quote}”</div>}
      <textarea autoFocus value={draftText} onChange={(e) => setDraftText(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveDraft(); if (e.key === 'Escape') { setDraft(null); setActive(null) } }} rows={3} placeholder="Cần sửa hoặc bổ sung gì ở đây?"
        style={css('width:100%; margin-top:8px; border:1px solid #DDE3EC; border-radius:10px; padding:9px 11px; background:#fff; color-scheme:light; color:#0f172a; resize:vertical; outline:none; box-sizing:border-box; display:block;' + f(400, 13.5, 1.55))} />
      <div style={css('display:flex; justify-content:flex-end; gap:8px; margin-top:8px;')}>
        <button onClick={() => { setDraft(null); setActive(null) }} style={css('height:32px; padding:0 14px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; cursor:pointer;' + f(700, 12.5))}>Huỷ</button>
        <button disabled={!draftText.trim() || busy} onClick={saveDraft} style={css(`height:32px; padding:0 16px; border:none; border-radius:999px; background:#2c5fff; color:#fff; cursor:pointer; opacity:${draftText.trim() && !busy ? 1 : 0.5};` + f(700, 12.5))}>Bình luận</button>
      </div>
    </div>
  )

  return (
    <Layout>
      <div style={css('position:relative; padding:24px var(--zp-gutter) 80px; background:radial-gradient(70% 40% at 60% 0%, rgba(44,95,255,.20), transparent 70%), #04060d;')}>
        <div style={css(`max-width:${wide ? 760 + RAIL + 28 : 760}px; margin:0 auto;`)}>
          <button onClick={() => navigate(isAdmin && !data.isOwner ? '/admin' : '/profile#usecase')} className={hoverClass('color:#fff !important;')} style={css('border:none; background:none; padding:0; cursor:pointer; color:#a9b8dc;' + f(600, 13.5))}>← {isAdmin && !data.isOwner ? 'Trang quản trị' : 'Use case của tôi'}</button>

          {/* Decision / status bar */}
          <div style={css('position:sticky; top:66px; z-index:30; margin-top:12px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:12px 16px; border-radius:16px; background:rgba(12,22,58,.92); border:1px solid rgba(130,170,255,.22); backdrop-filter:blur(12px); box-shadow:0 12px 30px rgba(0,0,0,.35);')}>
            <span style={css(`padding:4px 11px; border-radius:999px; background:${st.bg}; color:${st.fg};` + f(800, 12))}>{st.label}</span>
            <span style={css(f(600, 13) + ';color:#c9d5f2;')}>{openCount} góp ý cần xử lý{resolvedCount ? ` · ${resolvedCount} đã sửa` : ''}</span>
            {resolvedCount > 0 && (
              <label style={css('display:inline-flex; align-items:center; gap:6px; cursor:pointer;' + f(600, 12.5) + ';color:#a9b8dc;')}>
                <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Hiện góp ý đã sửa
              </label>
            )}
            <span style={{ flex: 1 }}></span>
            {isAdmin && underReview && (
              <>
                <button onClick={() => { setDecide('rejected'); setNote('') }} style={css('height:38px; padding:0 16px; border:1px solid #F5C9CB; border-radius:999px; background:#FFECEC; color:#D8232A; cursor:pointer;' + f(700, 13))}>Từ chối</button>
                <button onClick={() => { setDecide('changes_requested'); setNote('') }} style={css('height:38px; padding:0 16px; border:1px solid #F3DCB4; border-radius:999px; background:#FFF4E3; color:#9A5B00; cursor:pointer;' + f(700, 13))}>Yêu cầu chỉnh sửa{openCount ? ` (${openCount})` : ''}</button>
                <button onClick={() => { setDecide('approved'); setNote('') }} style={css('height:38px; padding:0 18px; border:none; border-radius:999px; background:#00A352; color:#fff; cursor:pointer;' + f(700, 13))}>Duyệt & đăng</button>
              </>
            )}
            {canEdit && (
              <button onClick={() => editAt(0)} style={css('height:38px; padding:0 18px; border:none; border-radius:999px; background:#2c5fff; color:#fff; cursor:pointer;' + f(700, 13))}>Chỉnh sửa bài</button>
            )}
          </div>

          {data.isOwner && sub.reviewStatus === 'changes_requested' && (
            <div style={css('margin-top:12px; padding:14px 16px; border-radius:14px; background:#FFF8E8; border:1px solid #F3DCB4;' + f(500, 13.5, 1.6) + ';color:#5C3A00;')}>
              <b>Admin cần bạn chỉnh sửa trước khi duyệt.</b> Xem các góp ý tô vàng bên cạnh bài, trả lời hoặc bấm <b>Đã sửa</b> cho từng góp ý, rồi bấm <b>Sửa phần này</b> ở phần cần sửa (hoặc <b>Chỉnh sửa bài</b>) để cập nhật và gửi lại.
              {sub.adminNote && <div style={css('margin-top:8px; white-space:pre-wrap;')}><b>Ghi chú chung:</b> {sub.adminNote}</div>}
            </div>
          )}
          {isAdmin && underReview && (
            <div style={css('margin-top:10px;' + f(500, 12.5) + ';color:#8fa6d8;')}>Mẹo: bôi đen một đoạn chữ trong bài để góp ý đúng chỗ, hoặc bấm “Góp ý” cạnh tên mục.</div>
          )}

          <div ref={wrapRef} style={css(`position:relative; margin-top:14px; display:grid; grid-template-columns:${wide ? `minmax(0,760px) ${RAIL}px` : 'minmax(0,1fr)'}; gap:28px; align-items:start;`)}>
            <article ref={docRef} onMouseUp={onMouseUp} style={css('background:#fff; border-radius:20px; padding:30px 34px 36px; box-shadow:0 30px 70px rgba(0,0,0,.35); min-width:0;')}>
              <div data-field="title" style={css('display:flex; align-items:flex-start; gap:10px;')}>
                <h1 data-text="title" style={css('flex:1; min-width:0; margin:0; word-break:break-word;' + f(800, 26, 1.3) + ';color:#0f172a;')}>{withMarks(sub.title, threadsFor('title'), active, pickThread)}</h1>
                <span style={css('display:flex; align-items:center; gap:6px; margin-top:6px;')}>{countBadge('title')}{addBtn('title')}</span>
              </div>
              <div style={css('margin-top:8px;' + f(400, 13.5) + ';color:#64748b;')}>
                {sub.author}{sub.realAuthor && sub.anonymous ? ` (${sub.realAuthor})` : ''}{sub.team ? ' · ' + sub.team : ''} · gửi {relativeTime(sub.time)}{sub.edited ? ' · đã chỉnh sửa' : ''}
              </div>
              <div style={css('display:flex; gap:6px; flex-wrap:wrap; margin-top:12px;')}>
                {[...[].concat(sub.category || []), ...(sub.topics || []), sub.level].filter(Boolean).map((x) => <span key={'c' + x} style={css('padding:4px 10px; border-radius:999px; background:#EAF0FF; color:#2c5fff;' + f(700, 12))}>{x}</span>)}
                {(sub.tools || []).map((x) => <span key={'t' + x} style={css('padding:4px 10px; border-radius:999px; background:#F1F4FA; color:#3A4757;' + f(700, 12))}>{x}</span>)}
              </div>
              <div data-field="general" style={css('display:flex; align-items:center; gap:8px; margin-top:12px;')}>
                {countBadge('general')}{isAdmin && underReview && addBtn('general')}
                {isAdmin && underReview && <span style={css(f(500, 12) + ';color:#94a3b8;')}>Góp ý chung cho cả bài</span>}
              </div>

              {parts.map((pt) => {
                const shown = pt.blocks.filter((b) => b.value.trim() || b.required || threadsFor(b.key).length)
                return (
                  <section key={pt.step} style={css('margin-top:26px;')}>
                    <div style={css('display:flex; align-items:center; gap:10px; padding:9px 12px 9px 14px; border-radius:12px; background:linear-gradient(90deg,#1D3A8F,#2c5fff);')}>
                      <h2 style={css('flex:1; min-width:0; margin:0;' + f(800, 16) + ';color:#fff;')}>{pt.step + 1}. {pt.title}</h2>
                      {editBtn(pt.step)}
                    </div>
                    {!shown.length && <div style={css('margin-top:10px; padding:0 4px;' + f(500, 13) + ';color:#94a3b8;')}>Không điền phần này (không bắt buộc).</div>}
                    {shown.map((b) => (
                      <div key={b.key} data-field={b.key} style={css('margin-top:14px; padding:0 4px;')}>
                        <div style={css('display:flex; align-items:center; gap:8px;')}>
                          <h3 style={css('flex:1; margin:0;' + f(800, 14) + ';color:#1D3A8F;')}>{b.label}</h3>
                          {countBadge(b.key)}{addBtn(b.key)}
                        </div>
                        {b.steps ? stepsOf(b) : textOf(b.key, b.value, b.mono)}
                        {b.key === 'link' && b.value && !safeHref(b.value) && <div style={css('margin-top:6px;' + f(700, 12) + ';color:#D8232A;')}>⚠ Link không hợp lệ (chỉ nhận http/https), sẽ không bấm được.</div>}
                      </div>
                    ))}
                  </section>
                )
              })}
            </article>

            <aside aria-label="Góp ý" style={css(`position:relative; min-width:0; ${wide ? 'align-self:stretch;' : 'display:flex; flex-direction:column; gap:10px;'}`)}>
              {!wide && <div style={css(f(800, 15) + ';color:#fff; margin-bottom:4px;')}>Góp ý</div>}
              {cards}
              {draftCard}
              {!sorted.length && !draft && (
                <div style={css(`${wide ? 'position:sticky; top:150px;' : ''} padding:16px; border-radius:14px; border:1px dashed rgba(130,170,255,.35); color:#a9b8dc;` + f(500, 13, 1.6))}>
                  {isAdmin && underReview ? 'Chưa có góp ý. Bôi đen chữ trong bài hoặc bấm “Góp ý” cạnh tên mục để thêm.' : resolvedCount ? 'Mọi góp ý đã được xử lý.' : 'Chưa có góp ý nào.'}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {pick && (
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => startDraft(pick.field, pick.quote, pick.y)}
          style={css(`position:fixed; left:${Math.min(pick.x + 8, window.innerWidth - 140)}px; top:${Math.max(pick.y - 44, 70)}px; z-index:2500; display:inline-flex; align-items:center; gap:6px; height:36px; padding:0 14px; border:none; border-radius:999px; background:#2c5fff; color:#fff; cursor:pointer; box-shadow:0 10px 26px rgba(20,50,160,.45);` + f(700, 13))}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Bình luận
        </button>
      )}

      {decide && (() => {
        const cfg = {
          approved: { title: 'Duyệt & đăng use case này?', desc: 'Bài hiện ngay trong Use Case Library. Người gửi nhận email + thông báo.' + (openCount ? ` Lưu ý: còn ${openCount} góp ý chưa xử lý.` : ''), label: 'Lời nhắn cho người gửi', required: false, cta: 'Duyệt & đăng', color: '#00A352' },
          changes_requested: { title: 'Gửi yêu cầu chỉnh sửa', desc: openCount ? `Người gửi nhận email + thông báo, mở bài sẽ thấy ${openCount} góp ý ngay cạnh từng đoạn.` : 'Chưa có góp ý nào trên bài, hãy ghi rõ cần sửa gì.', label: 'Ghi chú chung', required: !openCount, cta: 'Gửi yêu cầu chỉnh sửa', color: '#D98200' },
          rejected: { title: 'Từ chối use case này?', desc: 'Bài sẽ không được đăng. Người gửi nhận email + thông báo kèm lý do.', label: 'Lý do từ chối', required: true, cta: 'Từ chối & gửi lý do', color: '#D8232A' },
        }[decide]
        const ok = (!cfg.required || note.trim()) && !busy
        return (
          <div onClick={() => setDecide(null)} style={css('position:fixed; inset:0; z-index:3000; background:rgba(6,14,40,.6); display:flex; align-items:center; justify-content:center; padding:24px;')}>
            <div onClick={(e) => e.stopPropagation()} style={css(`width:520px; max-width:100%; background:#fff; border-radius:20px; padding:26px 28px; box-sizing:border-box; border-top:5px solid ${cfg.color};`)}>
              <div style={css(f(800, 19) + ';color:#0f172a;')}>{cfg.title}</div>
              <div style={css('margin-top:6px;' + f(400, 13.5, 1.6) + ';color:#64748b;')}>{cfg.desc}</div>
              <div style={css('margin-top:16px;' + f(800, 13) + ';color:#0f172a;')}>{cfg.label} {cfg.required ? <span style={{ color: '#E0353F' }}>*</span> : <span style={css(f(500, 12) + ';color:#94a3b8;')}>(không bắt buộc)</span>}</div>
              <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} rows={4} style={css('width:100%; margin-top:8px; border:1px solid #E6EBF3; border-radius:12px; padding:11px 13px; background:#fff; color-scheme:light; color:#0f172a; resize:vertical; outline:none; box-sizing:border-box; display:block;' + f(400, 14, 1.6))} />
              <div style={css('display:flex; justify-content:flex-end; gap:10px; margin-top:18px;')}>
                <button onClick={() => setDecide(null)} style={css('height:42px; padding:0 18px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; cursor:pointer;' + f(700, 13.5))}>Huỷ</button>
                <button disabled={!ok} onClick={submitDecision} style={css(`height:42px; padding:0 20px; border:none; border-radius:999px; background:${cfg.color}; color:#fff; cursor:${ok ? 'pointer' : 'not-allowed'}; opacity:${ok ? 1 : 0.5};` + f(700, 13.5))}>{cfg.cta}</button>
              </div>
            </div>
          </div>
        )
      })()}
    </Layout>
  )
}

/** One comment thread in the rail: the quoted passage, the comment, replies, "Đã sửa" and a reply box. */
function Thread({ th, active, me, isAdmin, isOwner, refEl, style, onFocus, onReply, onResolve, onDelete }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const send = () => {
    const body = text.trim()
    if (!body) return
    setBusy(true)
    onReply(th, body).then(() => setText('')).catch(() => {}).finally(() => setBusy(false))
  }
  const canAct = isAdmin || isOwner
  const line = (c, small) => (
    <div key={c.id} style={css(`display:flex; gap:9px; ${small ? 'margin-top:10px; padding-top:10px; border-top:1px solid #F0F3F8;' : ''}`)}>
      <Av u={c.author} size={small ? 22 : 26} />
      <div style={css('flex:1; min-width:0;')}>
        <div style={css('display:flex; align-items:baseline; gap:6px;')}>
          <span style={css(f(800, 12.5) + ';color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{c.author.name}</span>
          {c.author.isAdmin && <span style={css('padding:1px 6px; border-radius:999px; background:#EAF0FF; color:#2c5fff;' + f(800, 10))}>Admin</span>}
          <span style={css(f(400, 11) + ';color:#94a3b8; white-space:nowrap;')}>{relativeTime(c.time)}</span>
          <span style={{ flex: 1 }}></span>
          {c.author.id === me?.id && <button onClick={(e) => { e.stopPropagation(); onDelete(c) }} title="Xoá" aria-label="Xoá góp ý" className={hoverClass('color:#D8232A !important;')} style={css('border:none; background:none; padding:0; cursor:pointer; color:#b6c0d0;' + f(700, 12))}>✕</button>}
        </div>
        <div style={css('margin-top:3px; white-space:pre-wrap; word-break:break-word;' + f(400, 13.5, 1.55) + ';color:#1e293b;')}>{c.body}</div>
      </div>
    </div>
  )
  return (
    <div ref={refEl} onClick={onFocus} style={{ ...css(`background:${th.resolved ? '#F4F6FA' : '#fff'}; border:${active ? '2px solid #F5C542' : '1px solid #E6EBF3'}; border-radius:14px; padding:${active ? 11 : 12}px; cursor:pointer; box-shadow:${active ? '0 16px 36px rgba(6,14,40,.40)' : '0 8px 20px rgba(6,14,40,.22)'}; opacity:${th.resolved && !active ? 0.8 : 1};`), ...style }}>
      {th.resolved && <div style={css('margin-bottom:8px;' + f(800, 11.5) + ';color:#00893F;')}>✓ Đã sửa{th.resolvedBy ? ' · ' + th.resolvedBy : ''}</div>}
      {th.quote && <div style={css('margin-bottom:8px; padding-left:8px; border-left:3px solid #F5C542;' + f(400, 12, 1.5) + ';color:#64748b; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;')}>“{th.quote}”</div>}
      {line(th)}
      {th.replies.map((r) => line(r, true))}
      {canAct && active && (
        <div onClick={(e) => e.stopPropagation()} style={css('margin-top:10px;')}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send() }} rows={2} placeholder={isOwner && !isAdmin ? 'Trả lời admin, ví dụ: Đã bổ sung số liệu…' : 'Trả lời…'}
            style={css('width:100%; border:1px solid #DDE3EC; border-radius:10px; padding:8px 10px; background:#fff; color-scheme:light; color:#0f172a; resize:vertical; outline:none; box-sizing:border-box; display:block;' + f(400, 13, 1.5))} />
          <div style={css('display:flex; align-items:center; gap:8px; margin-top:8px;')}>
            <button onClick={() => onResolve(th, !th.resolved)} style={css(`height:30px; padding:0 12px; border:1px solid ${th.resolved ? '#DDE3EC' : '#BFE8D2'}; border-radius:999px; background:${th.resolved ? '#fff' : '#E7F9F0'}; color:${th.resolved ? '#3A4757' : '#00893F'}; cursor:pointer;` + f(700, 12))}>{th.resolved ? 'Mở lại' : '✓ Đã sửa'}</button>
            <span style={{ flex: 1 }}></span>
            <button disabled={!text.trim() || busy} onClick={send} style={css(`height:30px; padding:0 14px; border:none; border-radius:999px; background:#2c5fff; color:#fff; cursor:pointer; opacity:${text.trim() && !busy ? 1 : 0.5};` + f(700, 12))}>Trả lời</button>
          </div>
        </div>
      )}
      {canAct && !active && !th.resolved && (
        <div style={css('margin-top:8px;' + f(600, 11.5) + ';color:#94a3b8;')}>{th.replies.length ? `${th.replies.length} trả lời · ` : ''}Bấm để trả lời hoặc đánh dấu đã sửa</div>
      )}
    </div>
  )
}
