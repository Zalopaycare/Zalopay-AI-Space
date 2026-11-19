import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { css, hoverClass, CARD_HOVER } from '../lib/style.js'
import { fold } from '../lib/fold.js'
import { api, relativeTime } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useDialog } from '../hooks/useDialog.js'
import Avatar from './Avatar.jsx'
import { askRemovalReason } from './RemovalReason.jsx'
import { CommentBox } from './Events.jsx'
import { playSound } from '../lib/sound.js'

// "Muốn nghe" (second tab of the AI Space page; server: routes/topics.js): topics people would like a
// colleague to share about. Post one with "Đăng ký nội dung", press "Mình cũng muốn nghe" on others (the
// most wanted come first), open one to comment and tag who could share it. /?topic=<id> opens one
// (notification links), /?new=topic the form.

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const OPEN_FORM = 'zp-open-topic-form'
export const openTopicForm = () => window.dispatchEvent(new CustomEvent(OPEN_FORM))

/** "Mình cũng muốn nghe · N" with a raised hand: an outline until pressed, filled blue once pressed (like "Quan tâm"). */
function VoteButton({ t, onVote, height = 34 }) {
  const on = t.voted
  return (
    <button onClick={(e) => { e.stopPropagation(); onVote(t) }} aria-pressed={on}
      className={hoverClass(on ? 'filter:brightness(1.06);' : 'background:#EEF3FF !important;')}
      style={css(`flex:none; display:inline-flex; align-items:center; gap:7px; height:${height}px; padding:0 14px; border-radius:10px; box-sizing:border-box; cursor:pointer; white-space:nowrap; font:700 13px ${FONT}; ${on ? 'background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; border:1.5px solid transparent;' : 'background:#fff; color:#2c5fff; border:1.5px solid #9FB6F5;'}`)}>
      {/* a raised hand: "me too" */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0"></path><path d="M14 10V4a2 2 0 0 0-4 0v2"></path><path d="M10 10.5V6a2 2 0 0 0-4 0v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>
      {on ? 'Bạn cũng muốn nghe' : 'Mình cũng muốn nghe'}{t.votes > 0 ? ` · ${t.votes}` : ''}
    </button>
  )
}

export default function TopicsPanel({ query = '' }) {
  const { user, requireLogin } = useAuth()
  const [topics, setTopics] = useState(null)
  const [openId, setOpenId] = useState(() => new URLSearchParams(window.location.search).get('topic'))
  const [form, setForm] = useState(null) // null | {} (new) | topic (edit)
  const reload = () => api.listTopics().then((d) => setTopics(d.topics || [])).catch(() => setTopics((x) => x || []))
  useEffect(() => { reload() }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const on = () => requireLogin(() => setForm({}))
    window.addEventListener(OPEN_FORM, on)
    return () => window.removeEventListener(OPEN_FORM, on)
  }, [requireLogin])
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (new URLSearchParams(location.search).get('new') !== 'topic') return
    navigate({ pathname: location.pathname, search: '?tab=wish', hash: location.hash }, { replace: true })
    requireLogin(() => setForm({}))
  }, [location.search]) // eslint-disable-line react-hooks/exhaustive-deps
  const put = (t) => setTopics((list) => (list || []).map((x) => (x.id === t.id ? { ...x, ...t } : x)))
  const vote = (t) => requireLogin(() => api.voteTopic(t.id).then((d) => { put(d.topic); playSound() }).catch(() => {}))
  const close = () => {
    setOpenId(null)
    const u = new URL(window.location.href)
    if (u.searchParams.has('topic')) { u.searchParams.delete('topic'); window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash) }
  }
  const q = fold(query.trim())
  const list = topics || []
  const shown = q ? list.filter((t) => [t.title, t.detail, t.author?.name, t.author?.fullName].some((x) => fold(x).includes(q))) : list

  return (
    <>
      {topics === null ? (
        <div style={css('padding:40px 0; text-align:center; font:500 13.5px var(--zp-font-text); color:#8EA0C8;')}>Đang tải…</div>
      ) : shown.length === 0 ? (
        <div style={css('background:#fff; border-radius:18px; padding:36px 24px; text-align:center; box-shadow:0 14px 34px rgba(3,12,40,.3);')}>
          <div style={css(`font:800 16px ${FONT}; color:#0F172A;`)}>{q ? 'Không tìm thấy nội dung phù hợp' : 'Chưa có ai đăng ký nội dung muốn nghe'}</div>
          <div style={css('margin-top:6px; font:400 13.5px/1.6 var(--zp-font-text); color:#64748b;')}>Bạn muốn nghe đồng nghiệp chia sẻ về chủ đề AI nào? Đăng ký để mọi người cùng ủng hộ.</div>
          <button onClick={() => requireLogin(() => setForm({}))} style={css(`margin-top:14px; height:40px; padding:0 20px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; font:700 13.5px ${FONT}; cursor:pointer;`)}>Đăng ký nội dung</button>
        </div>
      ) : (
        <div style={css('display:flex; flex-direction:column; gap:12px;')}>
          {shown.map((t) => (
            <div key={t.id} role="button" tabIndex={0} onClick={() => setOpenId(t.id)} onKeyDown={(e) => { if (e.key === 'Enter') setOpenId(t.id) }}
              className={hoverClass(CARD_HOVER)} style={css('cursor:pointer; background:#fff; border-radius:18px; padding:16px 18px; box-shadow:0 14px 34px rgba(3,12,40,.3); transition:transform .18s ease, box-shadow .18s ease;')}>
              <div style={css(`font:800 16px/1.35 ${FONT}; color:#0F172A; word-break:break-word;`)}>{t.title}</div>
              {t.detail && <div style={css('margin-top:4px; font:400 13.5px/1.55 var(--zp-font-text); color:#475569; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word;')}>{t.detail}</div>}
              <div style={css('margin-top:12px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;')}>
                <VoteButton t={t} onVote={vote} />
                <span style={css('display:inline-flex; align-items:center; gap:5px; font:600 12.5px var(--zp-font-text); color:#64748b;')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1.1-4.4A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"></path></svg>
                  {t.commentCount ? `${t.commentCount} bình luận` : 'Bình luận'}
                </span>
                <span style={{ flex: 1 }} />
                <span style={css('display:inline-flex; align-items:center; gap:6px; font:400 12px var(--zp-font-text); color:#94a3b8;')}><Avatar user={t.author} size={20} fontSize={8} />{t.author?.name} · {relativeTime(t.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {openId && <TopicDialog id={openId} known={list.find((x) => x.id === openId)} onClose={close} onChanged={put} onEdit={(t) => { close(); setForm(t) }} onDeleted={() => { close(); reload() }} />}
      {form && <TopicForm initial={form} onClose={() => setForm(null)} onSaved={(t) => { setForm(null); reload(); setOpenId(t.id); playSound() }} />}
    </>
  )
}

function TopicDialog({ id, known, onClose, onChanged, onEdit, onDeleted }) {
  const { requireLogin } = useAuth()
  const [t, setT] = useState(known || null)
  const [missing, setMissing] = useState(false)
  const dialog = useDialog(true, onClose, 'Nội dung muốn nghe')
  useEffect(() => { api.getTopic(id).then((d) => setT(d.topic)).catch(() => setMissing(true)) }, [id])
  const vote = () => requireLogin(() => api.voteTopic(t.id).then((d) => { setT((x) => ({ ...x, ...d.topic })); onChanged(d.topic); playSound() }).catch(() => {}))
  const remove = () => {
    if (t.isMine) {
      if (window.confirm('Xoá nội dung này?')) api.deleteTopic(t.id).then(onDeleted).catch(() => window.alert('Chưa xoá được, thử lại nhé.'))
    } else {
      askRemovalReason({ what: 'nội dung muốn nghe', title: t.title }).then((r) => r && api.deleteTopic(t.id, r).then(onDeleted).catch(() => window.alert('Chưa xoá được, thử lại nhé.')))
    }
  }
  const btn = `height:32px; padding:0 14px; border:none; border-radius:9px; background:#EEF1F6; color:#0F172A; cursor:pointer; font:700 12.5px ${FONT};`
  return createPortal(
    <div className="zp-overlay-in" onClick={onClose} style={css('position:fixed; inset:0; z-index:4000; background:rgba(4,10,26,.66); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; padding:24px 16px;')}>
      <div ref={dialog.ref} {...dialog.dialogProps} className="zp-dialog-in zp-thinscroll" onClick={(e) => e.stopPropagation()} style={css('position:relative; width:560px; max-width:100%; max-height:calc(100vh - 48px); overflow-y:auto; background:#fff; border-radius:22px; box-shadow:0 30px 80px rgba(0,0,0,.45); padding-bottom:20px;')}>
        <div style={css('position:sticky; top:0; z-index:3; height:0;')}>
          <button onClick={onClose} aria-label="Đóng" style={css('position:absolute; top:12px; right:12px; width:34px; height:34px; border:none; border-radius:50%; background:#F1F4FA; color:#334155; cursor:pointer; font-size:16px;')}>✕</button>
        </div>
        {!t ? (
          <div style={css('padding:56px 20px; text-align:center; font:600 14px var(--zp-font-text); color:#64748b;')}>{missing ? 'Không tìm thấy nội dung này. Có thể đã bị xoá.' : 'Đang tải…'}</div>
        ) : (<>
          <div style={css('padding:22px 22px 0;')}>
            <div style={css(`font:700 12.5px ${FONT}; color:#2c5fff;`)}>Muốn nghe</div>
            <h2 style={css(`margin:4px 46px 0 0; font:800 21px/1.3 ${FONT}; color:#0F172A; word-break:break-word;`)}>{t.title}</h2>
            {t.detail && <div style={css('margin-top:8px; font:400 14px/1.65 var(--zp-font-text); color:#334155; white-space:pre-wrap; word-break:break-word;')}>{t.detail}</div>}
            <div style={css('margin-top:10px; display:flex; align-items:center; gap:7px; font:400 12.5px var(--zp-font-text); color:#64748b;')}><Avatar user={t.author} size={20} fontSize={8} />Đăng ký bởi <b style={css('color:#0F172A;')}>{t.author?.name}</b> · {relativeTime(t.createdAt)}</div>
          </div>
          <div style={css('display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:14px 22px 0;')}>
            <VoteButton t={t} onVote={vote} height={32} />
            {t.voters?.length > 0 && (
              <span style={css('display:inline-flex; align-items:center; gap:6px; font:400 12.5px var(--zp-font-text); color:#64748b;')}>
                <span style={css('display:inline-flex;')}>{t.voters.slice(0, 4).map((p, i) => <span key={p.id} style={css(`display:inline-flex; margin-left:${i ? -6 : 0}px; border-radius:50%; box-shadow:0 0 0 2px #fff;`)}><Avatar user={p} size={20} fontSize={8} /></span>)}</span>
                {t.votes} người muốn nghe
              </span>
            )}
            <span style={{ flex: 1 }} />
            {t.isMine && <button onClick={() => onEdit(t)} className={hoverClass('background:#E4E9F2 !important;')} style={css(btn)}>Sửa</button>}
            {t.canEdit && <button onClick={remove} className={hoverClass('background:#FFF1F1 !important; color:#D8232A !important;')} style={css(btn)}>Xoá</button>}
          </div>
          <div style={css('margin:16px 22px 0; padding:10px 12px; border-radius:10px; background:#F3F6FD; font:400 12.5px/1.55 var(--zp-font-text); color:#475569;')}>Biết ai chia sẻ được chủ đề này? Gõ @ trong bình luận để nhắc họ. Ai muốn chia sẻ thì bấm Tạo sự kiện ở trang AI Space.</div>
          <CommentBox comments={t.comments} onChange={(d) => { setT((x) => ({ ...x, comments: d.comments, commentCount: d.commentCount })); onChanged({ id: t.id, commentCount: d.commentCount }) }}
            post={(body, replyTo) => api.postTopicComment(t.id, body, replyTo)} like={(cid) => api.likeTopicComment(t.id, cid)} remove={(cid, reason) => api.deleteTopicComment(t.id, cid, reason)} />
        </>)}
      </div>
    </div>,
    document.body,
  )
}

function TopicForm({ initial, onClose, onSaved }) {
  const editing = !!initial.id
  const [title, setTitle] = useState(initial.title || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialog = useDialog(true, onClose, editing ? 'Sửa nội dung' : 'Đăng ký nội dung muốn nghe')
  const save = () => {
    if (!title.trim()) { setError('Ghi topic bạn muốn nghe nhé.'); return }
    setBusy(true); setError('')
    ;(editing ? api.updateTopic(initial.id, { title }) : api.createTopic({ title }))
      .then((d) => onSaved(d.topic))
      .catch((e) => setError(e?.data?.message || 'Chưa lưu được, thử lại nhé.'))
      .finally(() => setBusy(false))
  }
  const field = 'width:100%; box-sizing:border-box; margin-top:6px; padding:10px 13px; border:1px solid #E6EBF3; border-radius:12px; background:#fff; color:#0F172A; font:500 14px/1.5 var(--zp-font-text); outline:none;'
  return createPortal(
    <div className="zp-overlay-in" onClick={onClose} style={css('position:fixed; inset:0; z-index:4000; background:rgba(4,10,26,.66); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; padding:24px 16px;')}>
      <div ref={dialog.ref} {...dialog.dialogProps} className="zp-dialog-in zp-soft-ph" onClick={(e) => e.stopPropagation()} style={css('width:520px; max-width:100%; background:#fff; border-radius:22px; box-shadow:0 30px 80px rgba(0,0,0,.45); overflow:hidden;')}>
        <div style={css('display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:16px 20px; border-bottom:1px solid #EEF1F7;')}>
          <button onClick={onClose} style={css(`justify-self:start; border:none; background:none; padding:0; cursor:pointer; font:500 15px ${FONT}; color:#0F172A;`)}>Huỷ</button>
          <div style={css(`font:800 16px ${FONT}; color:#0F172A;`)}>{editing ? 'Sửa nội dung' : 'Đăng ký nội dung muốn nghe'}</div>
          <span />
        </div>
        <div style={css('padding:18px 22px 6px;')}>
          {/* one field: the topic */}
          <div style={css(`font:700 13px ${FONT}; color:#0F172A;`)}>Topic về AI bạn muốn nghe từ người khác <span style={css('color:#D8232A;')}>*</span></div>
          <textarea value={title} onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }} rows={3} maxLength={160} autoFocus placeholder="Ví dụ: Dùng Claude Code để review code, AI viết test case tự động" style={css(field + 'resize:none;')} />
          {error && <div style={css(`margin-top:10px; font:600 13px ${FONT}; color:#D8232A;`)}>{error}</div>}
        </div>
        <div style={css('display:flex; justify-content:flex-end; padding:12px 22px 18px;')}>
          <button onClick={save} disabled={busy} style={css(`height:44px; padding:0 24px; border:none; border-radius:999px; background:${title.trim() ? 'linear-gradient(180deg,#4480ff,#2c5fff)' : '#E3E8F2'}; color:${title.trim() ? '#fff' : '#94a3b8'}; font:700 14px ${FONT}; cursor:pointer; opacity:${busy ? 0.6 : 1};`)}>{busy ? 'Đang lưu…' : editing ? 'Lưu' : 'Đăng ký'}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
