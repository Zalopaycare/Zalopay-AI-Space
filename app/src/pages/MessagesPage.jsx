import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import Avatar from '../components/Avatar.jsx'
import SoftLink from '../components/SoftLink.jsx'
import { useConversation, Bubbles, Composer, ScrollArea, PANEL, shortTime } from '../components/AdminChat.jsx'
import { api } from '../lib/api.js'
import { css, hoverClass } from '../lib/style.js'
import { refreshDmUnread } from '../lib/dm.js'
import { useI18n } from '../i18n/I18nContext.jsx'

// "Tin nhắn", like Threads' Messages: conversations on the left (search finds anyone to start one
// with), the open one on the right. /messages?to=<user id> opens a conversation, new or not.
// A forwarded use case or thread shows as a card in the chat, linking to it.

const POLL_MS = 8000

/** A forwarded use case / thread inside the chat. */
export function ShareCard({ share, mine, t }) {
  if (share.missing) {
    return <div style={css('margin-top:4px; padding:10px 14px; border:1px dashed #D5DCE8; border-radius:16px; font-size:12.5px; color:#94a3b8;')}>{t('Nội dung này không còn nữa.')}</div>
  }
  const thread = share.kind === 'thread'
  return (
    <SoftLink
      to={share.href}
      className={hoverClass('border-color:#B9CCF8 !important; box-shadow:0 6px 18px rgba(44,95,255,.14) !important;')}
      style={css(`display:block; width:min(300px, 100%); margin-top:4px; border:1px solid #E3E8F2; border-radius:16px; ${mine ? 'border-top-right-radius:6px;' : 'border-top-left-radius:6px;'} overflow:hidden; background:#fff; text-decoration:none; color:#0F172A; transition:border-color .15s, box-shadow .15s;`)}
    >
      {!thread && share.cover && <img src={share.cover} alt="" style={css('display:block; width:100%; aspect-ratio:16/9; object-fit:cover; background:#EEF2F9;')} />}
      <div style={css('padding:10px 13px 11px;')}>
        <span style={css('display:inline-flex; align-items:center; gap:5px; height:20px; padding:0 8px; border-radius:999px; background:#E4ECFF; color:#2c5fff; font-size:10.5px; font-weight:800;')}>{thread ? t('Thread') : t('Use case')}</span>
        {thread ? (
          <>
            <div style={css('margin-top:7px; font-size:12.5px; color:#64748b;')}><b style={css('color:#0F172A;')}>{share.author}</b>{share.time ? ' · ' + shortTime(share.time) : ''}</div>
            <div style={css('margin-top:3px; font-size:13px; line-height:1.45; white-space:pre-wrap; overflow-wrap:anywhere; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden;')}>{share.text}</div>
            <div style={css('display:flex; gap:12px; margin-top:7px; font-size:12px; color:#64748b;')}>
              <span>♡ {share.likes}</span>
              <span>💬 {share.replies}</span>
            </div>
          </>
        ) : (
          <>
            <div style={css('margin-top:7px; font-size:14px; font-weight:800; line-height:1.35;')}>{share.title}</div>
            {share.owner && <div style={css('margin-top:3px; font-size:12px; color:#64748b;')}>Owner: {share.owner}</div>}
          </>
        )}
      </div>
    </SoftLink>
  )
}

export default function MessagesPage() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const uid = Number(params.get('to')) || null
  const open = (id) => setParams(id ? { to: String(id) } : {})

  const [list, setList] = useState(null)
  const [q, setQ] = useState('')
  const [people, setPeople] = useState([])
  const searchRef = useRef(null)
  const pullList = () => api.dmConversations().then((d) => setList(d.conversations || [])).catch(() => setList((x) => x || []))
  useEffect(() => {
    pullList()
    const tm = setInterval(() => { if (document.visibilityState === 'visible') pullList() }, POLL_MS)
    return () => clearInterval(tm)
  }, [])
  // typing searches everyone who has signed in, so a new conversation starts from the same box
  useEffect(() => {
    const s = q.trim()
    if (!s) { setPeople([]); return undefined }
    const tm = setTimeout(() => api.dmPeople(s).then((d) => setPeople(d.people || [])).catch(() => {}), 200)
    return () => clearTimeout(tm)
  }, [q])

  const [peer, setPeer] = useState(null)
  useEffect(() => { setPeer(null) }, [uid])
  const conv = useConversation((after) => api.dmWith(uid, after).then((d) => { setPeer(d.user); return d }), uid, refreshDmUnread)
  // opening a conversation reads it: refresh the list and the sidebar badge right away
  useEffect(() => { if (uid && conv.loaded) { pullList(); refreshDmUnread() } }, [uid, conv.loaded])
  const current = peer || (list || []).find((c) => c.user?.id === uid)?.user

  const needle = q.trim().toLowerCase()
  const shown = (list || []).filter((c) => !needle || (c.user?.name || '').toLowerCase().includes(needle))
  const others = people.filter((p) => !shown.some((c) => c.user?.id === p.id))

  const Row = ({ user, on, children, onClick }) => (
    <button onClick={onClick} className={on ? undefined : hoverClass('background:#F5F7FC !important;')} style={css(`width:100%; display:flex; align-items:center; gap:11px; padding:9px 10px; border:none; border-radius:14px; background:${on ? '#EEF3FF' : 'transparent'}; cursor:pointer; text-align:left; font-family:inherit;`)}>
      <Avatar user={user} size={44} />
      <div style={css('flex:1; min-width:0;')}>{children}</div>
    </button>
  )

  return (
    <Layout active="messages">
      <div className="zp-chat-page">
        <div style={css('margin-bottom:12px;')}>
          <h1 style={css('margin:0; font-size:22px; font-weight:800; letter-spacing:-.4px; color:#fff;')}>{t('Tin nhắn')}</h1>
          <p style={css('margin:4px 0 0; font-size:13px; color:#a9b8dc;')}>{t('Nhắn riêng cho đồng nghiệp, gửi nhau use case và thread hay.')}</p>
        </div>
        <div className="zp-chat-inbox" data-open={uid ? 'thread' : 'list'}>
          <div className="zp-chat-list" style={css(PANEL)}>
            <div style={css('flex:none; padding:12px 14px 10px; border-bottom:1px solid #EEF1F7;')}>
              <div style={css('display:flex; align-items:center; gap:8px;')}>
                <span style={css('flex:1; font-size:15px; font-weight:800; color:#0F172A;')}>{t('Tin nhắn')}</span>
                <button onClick={() => searchRef.current?.focus()} title={t('Tin nhắn mới')} aria-label={t('Tin nhắn mới')} className={hoverClass('background:#E4ECFF !important;')} style={css('flex:none; width:32px; height:32px; border:none; border-radius:50%; background:#F0F3F9; color:#0F172A; display:flex; align-items:center; justify-content:center; cursor:pointer;')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                </button>
              </div>
              <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Tìm người để nhắn…')} aria-label={t('Tìm người để nhắn')} style={css('width:100%; margin-top:10px; height:36px; border:1px solid #E3E8F2; border-radius:999px; padding:0 14px; font-family:inherit; font-size:13px; background:#F7F9FD; outline:none; box-sizing:border-box;')} />
            </div>
            <div style={css('flex:1; min-height:0; overflow-y:auto; padding:6px;')}>
              {list === null && <div style={css('padding:20px; text-align:center; color:#94a3b8; font-size:12.5px;')}>{t('Đang tải…')}</div>}
              {list && !shown.length && !others.length && (
                <div style={css('padding:26px 16px; text-align:center; color:#94a3b8; font-size:12.5px; line-height:1.55;')}>{needle ? t('Không tìm thấy ai.') : t('Chưa có cuộc trò chuyện nào. Tìm tên đồng nghiệp ở ô trên để bắt đầu.')}</div>
              )}
              {shown.map((c) => (
                <Row key={c.user.id} user={c.user} on={c.user.id === uid} onClick={() => { open(c.user.id); setQ('') }}>
                  <div style={css('display:flex; align-items:baseline; gap:6px;')}>
                    <span style={css(`flex:1; min-width:0; font-size:13.5px; font-weight:${c.unread ? 800 : 700}; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{c.user.name}</span>
                    <span style={css('flex:none; font-size:11px; color:#94a3b8;')}>{shortTime(c.last.time)}</span>
                  </div>
                  <div style={css('display:flex; align-items:center; gap:6px; margin-top:2px;')}>
                    <span style={css(`flex:1; min-width:0; font-size:12.5px; color:${c.unread ? '#0F172A' : '#64748b'}; font-weight:${c.unread ? 700 : 400}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{c.last.mine ? t('Bạn') + ': ' : ''}{c.last.body}</span>
                    {c.unread > 0 && <span style={css('flex:none; width:9px; height:9px; border-radius:50%; background:#2c5fff;')}></span>}
                  </div>
                </Row>
              ))}
              {others.length > 0 && <div style={css('padding:12px 10px 4px; font-size:11px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; color:#94a3b8;')}>{t('Mọi người')}</div>}
              {others.map((p) => (
                <Row key={p.id} user={p} on={p.id === uid} onClick={() => { open(p.id); setQ('') }}>
                  <div style={css('font-size:13.5px; font-weight:700; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{p.name}</div>
                  {p.team && <div style={css('margin-top:2px; font-size:12px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{p.team}</div>}
                </Row>
              ))}
            </div>
          </div>

          <div className="zp-chat-thread" style={css(PANEL)}>
            {uid ? (
              <>
                <div style={css('flex:none; display:flex; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid #EEF1F7;')}>
                  <button className="zp-chat-back" onClick={() => open(null)} aria-label={t('Quay lại danh sách')} style={css('flex:none; width:32px; height:32px; border:none; border-radius:50%; background:#F0F3F9; color:#3A4757; align-items:center; justify-content:center; cursor:pointer;')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
                  </button>
                  {current && <Avatar user={current} size={36} />}
                  <div style={css('min-width:0;')}>
                    <div style={css('font-size:14.5px; font-weight:800; color:#0F172A;')}>{current?.name || ''}</div>
                    {current?.team && <div style={css('font-size:12px; color:#64748b;')}>{current.team}</div>}
                  </div>
                </div>
                <ScrollArea deps={[conv.messages.length, conv.loaded, uid]}>
                  {!conv.loaded ? <div style={css('padding:30px; text-align:center; color:#94a3b8; font-size:13px;')}>{t('Đang tải…')}</div>
                    : conv.messages.length ? <Bubbles messages={conv.messages} mineIf={(m) => m.mine} names={false} extra={(m, mine) => m.share && <ShareCard share={m.share} mine={mine} t={t} />} t={t} />
                      : current && (
                        <div style={css('display:flex; flex-direction:column; align-items:center; gap:8px; padding:40px 20px; text-align:center;')}>
                          <Avatar user={current} size={72} />
                          <div style={css('font-size:16px; font-weight:800; color:#0F172A;')}>{current.name}</div>
                          {current.team && <div style={css('font-size:12.5px; color:#64748b;')}>{current.team}</div>}
                          <div style={css('margin-top:4px; font-size:12.5px; color:#94a3b8;')}>{t('Gửi lời chào để bắt đầu cuộc trò chuyện.')}</div>
                        </div>
                      )}
                </ScrollArea>
                <Composer t={t} placeholder={t('Nhắn tin…')} onSend={(body, files) => api.dmSend(uid, body, files).then((d) => { conv.add(d.message); pullList() })} />
              </>
            ) : (
              <div style={css('flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:30px; text-align:center; color:#64748b;')}>
                <span style={css('width:64px; height:64px; border-radius:50%; border:2px solid #0F172A; color:#0F172A; display:flex; align-items:center; justify-content:center;')}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z"></path><path d="M22 2 11 13"></path></svg>
                </span>
                <div style={css('font-size:15px; font-weight:800; color:#0F172A;')}>{t('Tin nhắn của bạn')}</div>
                <div style={css('font-size:12.5px; max-width:300px; line-height:1.5;')}>{t('Chọn một cuộc trò chuyện, hoặc tìm tên đồng nghiệp để nhắn riêng.')}</div>
                <button onClick={() => searchRef.current?.focus()} style={css('margin-top:4px; height:36px; padding:0 18px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:13px; font-weight:800; cursor:pointer;')}>{t('Tin nhắn mới')}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
