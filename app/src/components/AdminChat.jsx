import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import { api } from '../lib/api.js'
import { css } from '../lib/style.js'
import { refreshChatUnread } from '../lib/chat.js'
import { useCommentAttachments, AttachButton, PendingAttachments, CommentFiles } from './CommentAttachments.jsx'

// "Chat với Admin", Messenger-style. MyChat: a person's one conversation with the admin team (the
// /chat page). AdminInbox: every conversation, newest first, with the open one beside it (Admin Console).
// New messages arrive by polling (?after=<last id>) every few seconds while the tab is visible.

const POLL_MS = 4000
const parseTime = (raw) => new Date(String(raw).replace(' ', 'T') + (/[zZ+]/.test(String(raw)) ? '' : 'Z'))
const clock = (raw) => parseTime(raw).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const dayLabel = (raw) => {
  const d = parseTime(raw), now = new Date()
  const same = (a, b) => a.toDateString() === b.toDateString()
  if (same(d, now)) return 'Hôm nay'
  if (same(d, new Date(now.getTime() - 86_400_000))) return 'Hôm qua'
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const shortTime = (raw) => (dayLabel(raw) === 'Hôm nay' ? clock(raw) : dayLabel(raw) === 'Hôm qua' ? 'Hôm qua' : parseTime(raw).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }))

// Poll a conversation: loads it, then asks only for messages after the newest one we have.
function useConversation(load, key) {
  const [messages, setMessages] = useState([])
  const [loaded, setLoaded] = useState(false)
  const lastRef = useRef(0)
  useEffect(() => {
    if (key == null) return undefined
    let alive = true
    setMessages([]); setLoaded(false); lastRef.current = 0
    const pull = () => load(lastRef.current).then((d) => {
      if (!alive) return
      const fresh = (d.messages || []).filter((m) => m.id > lastRef.current)
      if (fresh.length) { lastRef.current = fresh[fresh.length - 1].id; setMessages((l) => [...l, ...fresh]); refreshChatUnread() }
      setLoaded(true)
    }).catch(() => alive && setLoaded(true))
    pull()
    const t = setInterval(() => { if (document.visibilityState === 'visible') pull() }, POLL_MS)
    return () => { alive = false; clearInterval(t) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const add = (m) => { if (m && m.id > lastRef.current) { lastRef.current = m.id; setMessages((l) => [...l, m]) } }
  return { messages, loaded, add }
}

function Bubbles({ messages, mineIf, intro, t }) {
  const items = []
  let prevDay = '', prev = null
  for (const m of messages) {
    const day = dayLabel(m.time)
    if (day !== prevDay) { items.push({ day }); prevDay = day; prev = null }
    const mine = mineIf(m)
    const first = !prev || prev.mine !== mine || prev.m.sender?.id !== m.sender?.id
    items.push({ m, mine, first })
    prev = { m, mine }
  }
  // the last message of each run carries the time; the first of a run from the other side shows who
  for (let i = 0; i < items.length; i++) if (items[i].m) items[i].last = !items[i + 1] || !items[i + 1].m || items[i + 1].first
  return (
    <div style={css('display:flex; flex-direction:column; gap:3px;')}>
      {intro}
      {items.map((it, i) => (it.day ? (
        <div key={'d' + i} style={css('align-self:center; margin:14px 0 8px; padding:3px 10px; border-radius:999px; background:#EEF2F9; color:#64748b; font-size:11px; font-weight:700;')}>{t(it.day)}</div>
      ) : (
        <div key={it.m.id} style={css(`display:flex; align-items:flex-end; gap:8px; ${it.mine ? 'flex-direction:row-reverse;' : ''} margin-top:${it.first ? 8 : 0}px;`)}>
          {!it.mine && !it.m.fromAdmin && <span style={css('flex:none; width:30px;')}>{it.last && <Avatar user={it.m.sender} size={30} />}</span>}
          <div style={css(`max-width:min(72%, 560px); display:flex; flex-direction:column; align-items:${it.mine ? 'flex-end' : 'flex-start'};`)}>
            {!it.mine && it.first && <div style={css('margin:0 0 3px 12px; font-size:11px; font-weight:700; color:#64748b;')}>{it.m.fromAdmin ? 'Admin' : it.m.sender?.name}</div>}
            {it.m.body && <div
              title={clock(it.m.time)}
              style={css(`padding:8px 13px; font-size:13.5px; line-height:1.5; white-space:pre-wrap; overflow-wrap:anywhere; ${it.mine
                ? 'background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff;'
                : 'background:#F0F3F9; color:#0F172A;'} border-radius:18px; ${it.mine ? `border-top-right-radius:${it.first ? 18 : 6}px; border-bottom-right-radius:${it.last ? 18 : 6}px;` : `border-top-left-radius:${it.first ? 18 : 6}px; border-bottom-left-radius:${it.last ? 18 : 6}px;`}`)}
            >{it.m.body}</div>}
            {it.m.files?.length > 0 && <CommentFiles files={it.m.files} style={{ marginTop: it.m.body ? 4 : 0, display: 'flex', flexDirection: 'column', alignItems: it.mine ? 'flex-end' : 'flex-start' }} />}
            {it.last && <div style={css(`margin:3px ${it.mine ? '4px 0 0' : '0 0 12px'}; font-size:10.5px; color:#94a3b8;`)}>{clock(it.m.time)}</div>}
          </div>
        </div>
      )))}
    </div>
  )
}

function Composer({ onSend, placeholder, t }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const ref = useRef(null)
  // pictures and files to send with the message (same limits as comments: 5 files, 10 MB each)
  const att = useCommentAttachments()
  const files = att.files('chat')
  const ready = !!text.trim() || files.length > 0
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 132) + 'px'
    el.style.overflowY = el.scrollHeight > 132 ? 'auto' : 'hidden'
  }, [text])
  const send = () => {
    const body = text.trim()
    if (!ready || busy) return
    setBusy(true); setErr('')
    onSend(body, att.payload('chat')).then(() => { setText(''); att.clear('chat') }).catch(() => setErr(t('Chưa gửi được, thử lại nhé.'))).finally(() => { setBusy(false); ref.current?.focus() })
  }
  return (
    <div style={css('flex:none; padding:10px 12px 12px; border-top:1px solid #EEF1F7; background:#fff;')}>
      {err && <div style={css('margin:0 0 6px 6px; font-size:12px; font-weight:600; color:#D8232A;')}>{err}</div>}
      {(files.length > 0 || att.errorFor('chat')) && <div style={css('margin:-8px 0 6px;')}><PendingAttachments files={files} onRemove={(i) => att.remove('chat', i)} error={att.errorFor('chat')} /></div>}
      <div style={css('display:flex; align-items:flex-end; gap:8px;')}>
        <textarea
          ref={ref}
          rows={1}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }}
          onPaste={(e) => { const pics = [...(e.clipboardData?.files || [])]; if (pics.length) { e.preventDefault(); att.add('chat', pics) } }}
          placeholder={placeholder}
          aria-label={placeholder}
          style={css('flex:1; min-width:0; resize:none; border:1px solid #E3E8F2; border-radius:20px; padding:9px 15px; font-family:inherit; font-size:13.5px; line-height:1.5; color:#0F172A; background:#F7F9FD; outline:none; box-sizing:border-box; max-height:132px;')}
        />
        {/* attach sits right beside send */}
        <span style={css('flex:none; padding-bottom:2px;')}><AttachButton size={36} title={t('Gửi kèm hình ảnh, file')} onFiles={(list) => att.add('chat', list)} disabled={busy} /></span>
        <button
          onClick={send}
          disabled={!ready || busy}
          aria-label={t('Gửi')}
          style={css(`flex:none; width:40px; height:40px; border:none; border-radius:50%; background:${ready ? 'linear-gradient(180deg,#4480ff 0%,#2c5fff 100%)' : '#E3E8F2'}; color:#fff; display:flex; align-items:center; justify-content:center; cursor:${ready ? 'pointer' : 'default'}; opacity:${busy ? 0.6 : 1};`)}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"></path><path d="M22 2 15 22l-4-9-9-4Z"></path></svg>
        </button>
      </div>
      <div style={css('margin:5px 0 0 14px; font-size:10.5px; color:#a3afc2;')}>{t('Enter để gửi · Shift + Enter để xuống dòng · dán ảnh trực tiếp được')}</div>
    </div>
  )
}

// Keeps the newest message in view, unless the reader scrolled up to read older ones.
function ScrollArea({ deps, children }) {
  const ref = useRef(null)
  const stick = useRef(true)
  useLayoutEffect(() => { const el = ref.current; if (el && stick.current) el.scrollTop = el.scrollHeight }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      ref={ref}
      onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}
      // pictures load after the first scroll and push the newest message down: follow them if we were at the bottom
      onLoadCapture={() => { const el = ref.current; if (el && stick.current) el.scrollTop = el.scrollHeight }}
      style={css('flex:1; min-height:0; overflow-y:auto; padding:14px 16px 10px;')}>
      {children}
    </div>
  )
}

const PANEL = 'display:flex; flex-direction:column; min-height:0; background:#fff; border:1px solid #E6EBF3; border-radius:20px; overflow:hidden; box-shadow:0 14px 34px rgba(8,16,40,.30);'
const ADMIN_BADGE = <span style={css('display:inline-flex; align-items:center; height:20px; padding:0 8px; border-radius:999px; background:#E7ECFB; color:#2c5fff; font-size:11px; font-weight:800;')}>Admin</span>

function TeamMark({ size = 38 }) {
  return (
    <span aria-hidden="true" style={css(`flex:none; width:${size}px; height:${size}px; border-radius:50%; background:linear-gradient(135deg,#4480ff,#6F0CE2); color:#fff; display:flex; align-items:center; justify-content:center;`)}>
      <svg width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6Z"></path><path d="m9 12 2 2 4-4"></path></svg>
    </span>
  )
}

// ---- a person: their one conversation with the admin team ----
export function MyChat({ t }) {
  const { messages, loaded, add } = useConversation((after) => api.chatMine(after), 'me')
  const intro = (
    <div style={css('display:flex; align-items:flex-end; gap:8px; margin-top:4px;')}>
      <span style={css('flex:none; width:30px;')}><TeamMark size={30} /></span>
      <div style={css('max-width:min(72%, 560px); padding:8px 13px; border-radius:18px; border-bottom-left-radius:6px; background:#F0F3F9; color:#0F172A; font-size:13.5px; line-height:1.5;')}>
        {t('Chào bạn! Bạn cần hỗ trợ gì về AI Space? Gửi câu hỏi, góp ý hoặc báo lỗi tại đây, đội Admin sẽ trả lời sớm nhất có thể.')}
      </div>
    </div>
  )
  return (
    <div className="zp-chat-single" style={css(PANEL)}>
      <div style={css('flex:none; display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid #EEF1F7;')}>
        <TeamMark />
        <div style={css('min-width:0;')}>
          <div style={css('display:flex; align-items:center; gap:8px; font-size:14.5px; font-weight:800; color:#0F172A;')}>{t('Admin AI Space')} {ADMIN_BADGE}</div>
          <div style={css('font-size:12px; color:#64748b;')}>{t('Thường trả lời trong giờ làm việc')}</div>
        </div>
      </div>
      <ScrollArea deps={[messages.length, loaded]}>
        {loaded ? <Bubbles messages={messages} mineIf={(m) => !m.fromAdmin} intro={intro} t={t} /> : <div style={css('padding:30px; text-align:center; color:#94a3b8; font-size:13px;')}>{t('Đang tải…')}</div>}
      </ScrollArea>
      <Composer t={t} placeholder={t('Nhắn cho Admin…')} onSend={(body, files) => api.chatSend(body, files).then((d) => add(d.message))} />
    </div>
  )
}

// ---- an admin: the shared inbox. `uid` = open conversation (null = none), `onOpen(uid | null)` switches. ----
export function AdminInbox({ t, uid, onOpen }) {
  const [threads, setThreads] = useState(null)
  const [q, setQ] = useState('')
  useEffect(() => {
    let alive = true
    const pull = () => api.chatThreads().then((d) => alive && setThreads(d.threads || [])).catch(() => alive && setThreads((x) => x || []))
    pull()
    const tm = setInterval(() => { if (document.visibilityState === 'visible') pull() }, POLL_MS * 2)
    return () => { alive = false; clearInterval(tm) }
  }, [uid])
  const open = (id) => onOpen(id || null)
  const conv = useConversation((after) => api.chatThread(uid, after), uid)
  // opening a conversation reads it: refresh the list and the sidebar badge right away
  useEffect(() => {
    if (!uid || !conv.loaded) return
    api.chatThreads().then((d) => setThreads(d.threads || [])).catch(() => {})
    refreshChatUnread()
  }, [uid, conv.loaded])
  const current = (threads || []).find((x) => x.user?.id === uid)?.user || conv.messages.find((m) => !m.fromAdmin)?.sender
  const list = (threads || []).filter((x) => !q.trim() || (x.user?.name || '').toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div className="zp-chat-inbox" data-open={uid ? 'thread' : 'list'}>
      <div className="zp-chat-list" style={css(PANEL)}>
        <div style={css('flex:none; padding:12px 14px 10px; border-bottom:1px solid #EEF1F7;')}>
          <div style={css('display:flex; align-items:center; gap:8px; font-size:14.5px; font-weight:800; color:#0F172A;')}>{t('Hộp thư Admin')} {ADMIN_BADGE}</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Tìm người nhắn…')} aria-label={t('Tìm người nhắn')} style={css('width:100%; margin-top:10px; height:34px; border:1px solid #E3E8F2; border-radius:999px; padding:0 14px; font-family:inherit; font-size:12.5px; background:#F7F9FD; outline:none; box-sizing:border-box;')} />
        </div>
        <div style={css('flex:1; min-height:0; overflow-y:auto; padding:6px;')}>
          {threads === null && <div style={css('padding:20px; text-align:center; color:#94a3b8; font-size:12.5px;')}>{t('Đang tải…')}</div>}
          {threads && !list.length && <div style={css('padding:24px 14px; text-align:center; color:#94a3b8; font-size:12.5px; line-height:1.5;')}>{q ? t('Không tìm thấy ai.') : t('Chưa có ai nhắn Admin.')}</div>}
          {list.map((th) => {
            const on = th.user?.id === uid
            return (
              <button key={th.user?.id} onClick={() => open(th.user?.id)} style={css(`width:100%; display:flex; align-items:center; gap:10px; padding:9px 10px; border:none; border-radius:14px; background:${on ? '#EEF3FF' : 'transparent'}; cursor:pointer; text-align:left; font-family:inherit;`)}>
                <Avatar user={th.user} size={40} />
                <div style={css('flex:1; min-width:0;')}>
                  <div style={css('display:flex; align-items:baseline; gap:6px;')}>
                    <span style={css(`flex:1; min-width:0; font-size:13.5px; font-weight:${th.unread ? 800 : 700}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{th.user?.name}</span>
                    <span style={css('flex:none; font-size:11px; color:#94a3b8;')}>{shortTime(th.last.time)}</span>
                  </div>
                  <div style={css('display:flex; align-items:center; gap:6px; margin-top:2px;')}>
                    <span style={css(`flex:1; min-width:0; font-size:12.5px; color:${th.unread ? '#0F172A' : '#64748b'}; font-weight:${th.unread ? 700 : 400}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{th.last.fromAdmin ? t('Bạn') + ': ' : ''}{th.last.body}</span>
                    {th.unread > 0 && <span style={css('flex:none; min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:#2c5fff; color:#fff; font-size:10.5px; font-weight:800; display:flex; align-items:center; justify-content:center;')}>{th.unread}</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="zp-chat-thread" style={css(PANEL)}>
        {uid ? (
          <>
            <div style={css('flex:none; display:flex; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid #EEF1F7;')}>
              <button className="zp-chat-back" onClick={() => open(null)} aria-label={t('Quay lại hộp thư')} style={css('flex:none; width:32px; height:32px; border:none; border-radius:50%; background:#F0F3F9; color:#3A4757; align-items:center; justify-content:center; cursor:pointer;')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
              </button>
              {current && <Avatar user={current} size={36} />}
              <div style={css('font-size:14.5px; font-weight:800; color:#0F172A;')}>{current?.name || ''}</div>
            </div>
            <ScrollArea deps={[conv.messages.length, conv.loaded, uid]}>
              {conv.loaded
                ? (conv.messages.length ? <Bubbles messages={conv.messages} mineIf={(m) => m.fromAdmin} t={t} /> : <div style={css('padding:30px; text-align:center; color:#94a3b8; font-size:13px;')}>{t('Chưa có tin nhắn.')}</div>)
                : <div style={css('padding:30px; text-align:center; color:#94a3b8; font-size:13px;')}>{t('Đang tải…')}</div>}
            </ScrollArea>
            <Composer t={t} placeholder={t('Trả lời với tư cách Admin…')} onSend={(body, files) => api.chatReply(uid, body, files).then((d) => { conv.add(d.message); api.chatThreads().then((x) => setThreads(x.threads || [])).catch(() => {}) })} />
          </>
        ) : (
          <div style={css('flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:30px; text-align:center; color:#64748b;')}>
            <TeamMark size={52} />
            <div style={css('font-size:14px; font-weight:800; color:#0F172A;')}>{t('Chọn một cuộc trò chuyện')}</div>
            <div style={css('font-size:12.5px; max-width:300px; line-height:1.5;')}>{t('Tin nhắn mọi người gửi Admin hiện ở cột bên trái. Admin nào trả lời cũng được, người nhắn sẽ thấy "Admin · tên bạn".')}</div>
          </div>
        )}
      </div>
    </div>
  )
}
