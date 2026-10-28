import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rememberReturn } from '../lib/scrollReturn.js'
import { api } from '../lib/api.js'
import { css } from '../lib/style.js'

// AI Exhibition booths with no write-up yet, as small tiles in the style of the exhibition's booth
// list: number badge in the category colour, name, members, event label, a "Chưa có thông tin" tag and a
// "Quan tâm" toggle that pings the booth members ("…nhận được N lượt quan tâm. Đăng Use Case ngay!").
// A tile opens the booth as a use case page (/use-cases/ex6): Vấn đề and Giải pháp from the exhibition,
// the rest "Chưa có thông tin" until the owners write it up.

const LABEL_COLOR = (label) => (/^Claw-a-thon/.test(label) ? '#2E8F4C' : /^Business/.test(label) ? '#6F0CE2' : '#2140D9')

const NOINFO_TAG = 'display:inline-flex; align-items:center; height:20px; padding:0 8px; border-radius:999px; background:#FFF4E3; border:1px solid #F3DCB4; color:#9A5B00; font-size:11px; font-weight:700; white-space:nowrap;'

function Star({ on }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill={on ? '#F59E0B' : 'none'} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"></path></svg>
}

// What a booth's owners (and admins, who see it as they do) get on the tile instead of "Quan tâm".
const OWNER_TILE = { pending: 'Đang chờ duyệt', changes_requested: 'Cần chỉnh sửa' }
function OwnerButton({ p, t, onOpen }) {
  const label = OWNER_TILE[p.submission?.status] || 'Bổ sung thông tin'
  return (
    <button onClick={(e) => { e.stopPropagation(); onOpen() }}
      style={css('flex:none; display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 13px; border-radius:999px; border:none; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:12px; font-weight:800; cursor:pointer; white-space:nowrap;')}>
      {t(label)} →
    </button>
  )
}

function InterestButton({ p, busy, onToggle, t }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(p) }}
      aria-pressed={!!p.mine}
      title={t('Nhắc người làm đăng Use Case này')}
      style={css(`flex:none; display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 12px; border-radius:999px; border:1px solid ${p.mine ? '#F3C98B' : '#DDE3EC'}; background:${p.mine ? '#FFF4E3' : '#fff'}; color:${p.mine ? '#B45300' : '#3A4757'}; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; font-variant-numeric:tabular-nums; opacity:${busy ? 0.6 : 1};`)}
    >
      <Star on={p.mine} />
      {t('Quan tâm')}{p.interest > 0 ? ` · ${p.interest}` : ''}
    </button>
  )
}

// What a booth's owner sees on its page: start the write-up, or where the team's write-up stands.
const OWNER_STATUS = {
  pending: ['Bài của team đang chờ Admin duyệt. Ai trong team cũng sửa được.', '#1E44A8', '#EEF3FF', '#CFDDFB'],
  changes_requested: ['Admin cần team chỉnh sửa / bổ sung trước khi duyệt.', '#9A5B00', '#FFF8E8', '#F3E0B0'],
  rejected: ['Bài trước chưa được duyệt. Team có thể gửi lại.', '#C0262D', '#FFF0F0', '#F5C9CB'],
}

/** On a booth's page, for its owners only: "Bổ sung thông tin" (the share form, pre-filled), or the
 *  status of the write-up already sent with a link to edit it. */
export function BoothOwnerBar({ p, t }) {
  const navigate = useNavigate()
  if (!p.owner) return null
  const sub = p.submission && p.submission.status !== 'rejected' ? p.submission : null
  const st = p.submission ? OWNER_STATUS[p.submission.status] : null
  const btn = 'display:inline-flex; align-items:center; gap:7px; height:36px; padding:0 16px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:13px; font-weight:800; cursor:pointer; box-shadow:0 6px 16px rgba(44,95,255,.35);'
  return (
    <div style={css(`display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-top:16px; padding:14px 16px; border-radius:14px; background:${st ? st[2] : '#EEF3FF'}; border:1px solid ${st ? st[3] : '#CFDDFB'};`)}>
      <div style={css('flex:1; min-width:220px;')}>
        <div style={css(`font-size:13.5px; font-weight:800; color:${st ? st[1] : '#1E3A7A'};`)}>{p.adminView ? t('Bạn đang xem với quyền Admin (như Owner)') : t('Bạn là Owner của use case này')}</div>
        <div style={css('margin-top:2px; font-size:12.5px; line-height:1.5; color:#3A4757;')}>
          {st ? t(st[0]) : t('Bài toán, Giải pháp và thành viên đã có sẵn từ AI Exhibition. Bổ sung các phần còn trống (ảnh bìa, các bước, số liệu…) rồi gửi Admin duyệt.')}
        </div>
      </div>
      {!sub && <button onClick={() => navigate(`/use-cases?share=1&booth=${encodeURIComponent(p.id)}`)} style={css(btn)}>{t('Bổ sung thông tin')} →</button>}
      {sub && sub.status === 'pending' && <button onClick={() => navigate(`/use-cases?edit=${encodeURIComponent(sub.id)}`)} style={css(btn)}>{t('Xem / sửa bài đã gửi')}</button>}
      {sub && sub.status === 'changes_requested' && <button onClick={() => navigate(`/review/${encodeURIComponent(sub.id)}`)} style={css(btn)}>{t('Xem góp ý và sửa')}</button>}
    </div>
  )
}

/** "Quan tâm" on a booth's own page, under its title: the same toggle as on the tile. */
export function BoothInterest({ p, t, requireLogin }) {
  const [, setTick] = useState(0)
  const [busy, setBusy] = useState(false)
  const toggle = () => requireLogin(() => {
    if (busy) return
    setBusy(true)
    api.interestPending(p.id)
      .then((r) => { p.interest = r.interest; p.mine = r.mine; setTick((n) => n + 1) })
      .catch(() => {})
      .finally(() => setBusy(false))
  })
  return (
    <div style={css('display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-top:16px; padding:12px 16px; border-radius:14px; background:rgba(255,255,255,.05); border:1px solid rgba(130,170,255,.22);')}>
      <span style={css('flex:1; min-width:220px; font-size:12.5px; line-height:1.5; color:#a9b8dc;')}>{t('Use case này chưa có bài chi tiết trên AI Space. Bấm "Quan tâm" để nhắc team đăng lên.')}</span>
      <InterestButton p={p} busy={busy} onToggle={toggle} t={t} />
    </div>
  )
}

export default function PendingCases({ items, t, requireLogin }) {
  const [, setTick] = useState(0)
  const [busy, setBusy] = useState(null)
  const navigate = useNavigate()
  const open = (p) => { rememberReturn(p.id); navigate(`/use-cases/${p.id}`) }
  if (!items.length) return null

  const toggle = (p) => requireLogin(() => {
    if (busy) return
    setBusy(p.id)
    api.interestPending(p.id)
      .then((r) => { p.interest = r.interest; p.mine = r.mine; setTick((n) => n + 1) })
      .catch(() => {})
      .finally(() => setBusy(null))
  })

  return (
    <section style={css('margin-top:28px;')}>
      <div style={css('display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:4px;')}>
        <h2 style={css('margin:0; font-size:18px; font-weight:800; letter-spacing:-.2px; color:#fff;')}>{t('Use case từ AI Exhibition 2026')}</h2>
        <span style={css('font-size:12.5px; color:#8fa6d8;')}>{items.length}</span>
      </div>
      <p style={css('margin:0 0 12px; font-size:12.5px; line-height:1.5; color:#a9b8dc;')}>{t('Chưa có thông tin chi tiết. Bấm "Quan tâm" để nhắc người làm đăng Use Case lên AI Space.')}</p>
      <div className="zp-pending-grid">
        {items.map((p) => {
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => open(p)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(p) } }}
              style={css('display:flex; align-items:flex-start; gap:12px; padding:12px 12px 12px 14px; border-radius:16px; background:#F8FAFE; border:1.5px solid #E3E8F7; cursor:pointer;')}
            >
              <div style={css('flex:1; min-width:0; display:flex; flex-direction:column; align-self:stretch;')}>
                <div style={css('font-size:13.5px; font-weight:800; line-height:1.35; color:#0F172A; text-wrap:pretty;')}>{p.title}</div>
                {p.members?.length > 0 && (
                  <div style={css('margin-top:3px; font-size:12px; line-height:1.45; color:#5B6B82;')}>
                    <span style={css('font-weight:600; color:#3A4757;')}>Owner:</span> {p.members.join(', ')}
                  </div>
                )}
                {/* label + tag on the left, "Quan tâm" pinned to the bottom-right corner */}
                <div style={css('display:flex; align-items:flex-end; gap:8px; margin-top:auto; padding-top:8px;')}>
                  <div style={css('flex:1; min-width:0; display:flex; align-items:center; gap:6px; flex-wrap:wrap;')}>
                    {p.label && <span style={css(`font-size:12px; font-weight:600; color:${LABEL_COLOR(p.label)};`)}>{p.label}</span>}
                    <span style={css(NOINFO_TAG)}>{t('Chưa có thông tin')}</span>
                  </div>
                  {p.owner ? <OwnerButton p={p} t={t} onOpen={() => open(p)} /> : <InterestButton p={p} busy={busy === p.id} onToggle={toggle} t={t} />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
