import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Avatar from './Avatar.jsx'
import { api } from '../lib/api.js'
import { css, hoverClass } from '../lib/style.js'
import { copyWithToast } from '../lib/clipboard.js'
import { showToast } from './Toaster.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'

// "Gửi qua tin nhắn": forward a use case or thread to one or more people, with an optional note.
// `share` = { kind: 'usecase' | 'thread', id, title, link }. Recent conversations come first; typing
// searches everyone. Each person gets it in their "Tin nhắn" as a card linking back.

const MAX_PICK = 10

export default function ShareToDM({ share, onClose }) {
  const { t } = useI18n()
  const [recent, setRecent] = useState(null)
  const [q, setQ] = useState('')
  const [found, setFound] = useState([])
  const [picked, setPicked] = useState([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    // people I talk to first, then anyone, so the list is never empty
    Promise.all([api.dmConversations().catch(() => ({})), api.dmPeople('').catch(() => ({}))]).then(([c, p]) => {
      const mine = (c.conversations || []).map((x) => x.user).filter(Boolean)
      setRecent([...mine, ...(p.people || []).filter((u) => !mine.some((m) => m.id === u.id))])
    })
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const s = q.trim()
    if (!s) { setFound([]); return undefined }
    const tm = setTimeout(() => api.dmPeople(s).then((d) => setFound(d.people || [])).catch(() => {}), 200)
    return () => clearTimeout(tm)
  }, [q])

  const list = q.trim() ? found : (recent || [])
  const isOn = (u) => picked.some((p) => p.id === u.id)
  const toggle = (u) => setPicked((l) => (l.some((p) => p.id === u.id) ? l.filter((p) => p.id !== u.id) : l.length >= MAX_PICK ? l : [...l, u]))
  const send = () => {
    if (!picked.length || busy) return
    setBusy(true); setErr('')
    Promise.allSettled(picked.map((u) => api.dmSend(u.id, note.trim(), [], { kind: share.kind, id: share.id }))).then((rs) => {
      const ok = rs.filter((r) => r.status === 'fulfilled').length
      setBusy(false)
      if (!ok) { setErr(t('Chưa gửi được, thử lại nhé.')); return }
      showToast(ok === 1 ? t('Đã gửi cho') + ' ' + picked[0].name : t('Đã gửi cho') + ` ${ok} ` + t('người'))
      onClose()
    })
  }

  return createPortal(
    <div onClick={onClose} style={css('position:fixed; inset:0; z-index:5000; background:rgba(2,6,20,.62); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:16px;')}>
      <div role="dialog" aria-modal="true" aria-label={t('Gửi qua tin nhắn')} onClick={(e) => e.stopPropagation()} style={css('width:min(440px, 100%); max-height:min(640px, calc(100vh - 32px)); display:flex; flex-direction:column; background:#fff; border-radius:20px; box-shadow:0 30px 70px rgba(0,0,0,.45); overflow:hidden; font-family:inherit; color:#0F172A;')}>
        <div style={css('flex:none; display:flex; align-items:center; gap:8px; padding:14px 16px 10px;')}>
          <span style={css('flex:1; font-size:16px; font-weight:800;')}>{t('Gửi qua tin nhắn')}</span>
          <button onClick={onClose} aria-label={t('Đóng')} className={hoverClass('background:#E4E9F2 !important;')} style={css('flex:none; width:30px; height:30px; border:none; border-radius:50%; background:#F0F3F9; color:#3A4757; display:flex; align-items:center; justify-content:center; cursor:pointer;')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>
          </button>
        </div>
        {/* what is being sent */}
        <div style={css('flex:none; margin:0 16px; padding:9px 12px; border:1px solid #E3E8F2; border-radius:12px; background:#F7F9FD; display:flex; align-items:center; gap:9px;')}>
          <span style={css('flex:none; height:20px; padding:0 8px; border-radius:999px; background:#E4ECFF; color:#2c5fff; font-size:10.5px; font-weight:800; display:inline-flex; align-items:center;')}>{share.kind === 'thread' ? t('Thread') : t('Use case')}</span>
          <span style={css('flex:1; min-width:0; font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{share.title}</span>
        </div>
        <div style={css('flex:none; padding:10px 16px 6px;')}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Tìm người…')} aria-label={t('Tìm người')} style={css('width:100%; height:38px; border:1px solid #E3E8F2; border-radius:999px; padding:0 14px; font-family:inherit; font-size:13px; color:#0F172A; background:#F7F9FD; outline:none; box-sizing:border-box;')} />
          {picked.length > 0 && (
            <div style={css('display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;')}>
              {picked.map((u) => (
                <button key={u.id} onClick={() => toggle(u)} title={t('Bỏ chọn')} style={css('display:inline-flex; align-items:center; gap:6px; height:26px; padding:0 9px 0 3px; border:none; border-radius:999px; background:#EEF3FF; color:#2c5fff; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer;')}>
                  <Avatar user={u} size={20} fontSize={8.5} />{u.name} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={css('flex:1; min-height:120px; overflow-y:auto; padding:2px 8px 6px;')}>
          {recent === null && !q.trim() && <div style={css('padding:20px; text-align:center; color:#94a3b8; font-size:12.5px;')}>{t('Đang tải…')}</div>}
          {recent !== null && !list.length && <div style={css('padding:20px; text-align:center; color:#94a3b8; font-size:12.5px;')}>{t('Không tìm thấy ai.')}</div>}
          {list.map((u) => {
            const on = isOn(u)
            return (
              <button key={u.id} onClick={() => toggle(u)} aria-pressed={on} className={hoverClass('background:#F5F7FC !important;')} style={css('width:100%; display:flex; align-items:center; gap:11px; padding:8px; border:none; border-radius:12px; background:transparent; cursor:pointer; text-align:left; font-family:inherit;')}>
                <Avatar user={u} size={38} />
                <span style={css('flex:1; min-width:0;')}>
                  <span style={css('display:block; font-size:13.5px; font-weight:700; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{u.name}</span>
                  {u.team && <span style={css('display:block; font-size:12px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{u.team}</span>}
                </span>
                <span aria-hidden="true" style={css(`flex:none; width:22px; height:22px; border-radius:50%; border:2px solid ${on ? '#2c5fff' : '#CBD3E1'}; background:${on ? '#2c5fff' : '#fff'}; color:#fff; display:flex; align-items:center; justify-content:center;`)}>
                  {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>}
                </span>
              </button>
            )
          })}
        </div>
        <div style={css('flex:none; padding:10px 16px 14px; border-top:1px solid #EEF1F7;')}>
          {err && <div style={css('margin:0 0 6px 4px; font-size:12px; font-weight:600; color:#D8232A;')}>{err}</div>}
          {picked.length > 0 && (
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} placeholder={t('Thêm lời nhắn (không bắt buộc)…')} aria-label={t('Lời nhắn')} style={css('width:100%; margin-bottom:10px; resize:none; border:1px solid #E3E8F2; border-radius:14px; padding:9px 13px; font-family:inherit; font-size:13px; line-height:1.5; color:#0F172A; background:#F7F9FD; outline:none; box-sizing:border-box;')} />
          )}
          <div style={css('display:flex; align-items:center; gap:8px;')}>
            <button onClick={() => { copyWithToast(share.link, 'Đã sao chép link ✓'); onClose() }} className={hoverClass('background:#F0F3F9 !important;')} style={css('display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 14px; border:1px solid #E3E8F2; border-radius:999px; background:#fff; color:#3A4757; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer;')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"></path></svg>
              {t('Sao chép link')}
            </button>
            <button onClick={send} disabled={!picked.length || busy} style={css(`flex:1; height:38px; border:none; border-radius:999px; background:${picked.length ? 'linear-gradient(180deg,#4480ff 0%,#2c5fff 100%)' : '#E3E8F2'}; color:${picked.length ? '#fff' : '#94a3b8'}; font-family:inherit; font-size:13.5px; font-weight:800; cursor:${picked.length ? 'pointer' : 'default'}; opacity:${busy ? 0.6 : 1};`)}>
              {busy ? t('Đang gửi…') : picked.length > 1 ? `${t('Gửi')} (${picked.length})` : t('Gửi')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
