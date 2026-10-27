import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../lib/api.js'
import { css } from '../lib/style.js'

// AI Exhibition booths with no write-up yet, as small tiles in the style of the exhibition's booth
// list: number badge in the category colour, name, members, event label, a "Chưa có thông tin" tag and a
// "Quan tâm" toggle that pings the booth members ("…nhận được N lượt quan tâm. Đăng Use Case ngay!").
// Opening a tile shows the booth's "Vấn đề" and "Giải pháp" from the exhibition, in AI Space's detail-page look.

const CAT_COLOR = {
  'Software Development': ['#2140D9', '#132A9E'],
  'Chatbot & Knowledge Search': ['#4CC970', '#2E8F4C'],
  'Config & Operations Automation': ['#4BB6F5', '#2A7FB4'],
  'Data Analytics & Monitoring': ['#7B2FE0', '#5418A8'],
  'Docs, Content & Design': ['#E8336D', '#A81E4C'],
  'Test Automation': ['#FF8D00', '#B36300'],
}
const LABEL_COLOR = (label) => (/^Claw-a-thon/.test(label) ? '#2E8F4C' : /^Business/.test(label) ? '#6F0CE2' : '#2140D9')
const colorsOf = (p) => CAT_COLOR[p.category] || ['#2140D9', '#132A9E']

const NOINFO_TAG = 'display:inline-flex; align-items:center; height:20px; padding:0 8px; border-radius:999px; background:#FFF4E3; border:1px solid #F3DCB4; color:#9A5B00; font-size:11px; font-weight:700; white-space:nowrap;'

function Star({ on }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill={on ? '#F59E0B' : 'none'} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"></path></svg>
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

// The exhibition writes its text as light markdown: **bold**, "- " bullets, blank lines between parts.
// Rendered with the detail page's look: plain paragraphs, dotted bullets, bold run-in headings.
function Rich({ text, dot }) {
  const bold = (s) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (/^\*\*[^*]+\*\*$/.test(part) ? <b key={i} style={css('font-weight:800; color:#0F172A;')}>{part.slice(2, -2)}</b> : part))
  const blocks = []
  for (const line of String(text || '').split('\n')) {
    const item = /^\s*[-•]\s+(.*)$/.exec(line)
    const last = blocks[blocks.length - 1]
    if (item) (last && last.list ? last.items.push(item[1]) : blocks.push({ list: true, items: [item[1]] }))
    else if (line.trim()) blocks.push({ text: line.trim() })
  }
  return blocks.map((b, i) => (b.list ? (
    <div key={i} style={css(`display:flex; flex-direction:column; gap:7px; margin-top:${i ? 8 : 0}px;`)}>
      {b.items.map((x, k) => (
        <div key={k} style={css('display:flex; gap:10px; align-items:flex-start;')}>
          <span style={css(`flex:none; margin-top:8px; width:6px; height:6px; border-radius:50%; background:${dot};`)}></span>
          <span>{bold(x)}</span>
        </div>
      ))}
    </div>
  ) : <p key={i} style={css(`margin:${i ? 12 : 0}px 0 0;`)}>{bold(b.text)}</p>))
}

// Same card look as "Bài toán" / "Giải pháp" on a use case detail page.
const CARD = 'min-width:0; border:1px solid #E6EBF3; border-radius:20px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30); padding:18px 20px;'

function PendingPopup({ p, busy, onToggle, onClose, t }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [onClose])
  const card = (title, dot, text) => (
    <div style={css(CARD)}>
      <div style={css('display:flex; align-items:center; gap:8px; margin-bottom:12px; font-size:15px; font-weight:800; color:#0F172A;')}>
        {t(title)}<span style={css(`width:8px; height:8px; border-radius:50%; background:${dot};`)}></span>
      </div>
      <div style={css('font-size:13px; line-height:1.55; color:#3A4757; text-wrap:pretty;')}>
        {text ? <Rich text={text} dot={dot} /> : <span style={css('color:#94a3b8;')}>{t('Chưa có thông tin')}</span>}
      </div>
    </div>
  )
  return (
    <div role="dialog" aria-modal="true" aria-label={p.title} onClick={onClose} style={css('position:fixed; inset:0; z-index:4000; background:rgba(2,4,12,.72); display:flex; align-items:flex-start; justify-content:center; padding:40px 16px; overflow-y:auto;')}>
      <div className="zp-detail-wrap" onClick={(e) => e.stopPropagation()} style={css('position:relative; width:100%; max-width:960px; border-radius:20px; overflow:hidden; border:1px solid rgba(130,170,255,.24); background:radial-gradient(120% 70% at 50% -10%, #1b2f74 0%, #0b1230 45%, #07070c 100%); color:#fff; padding:24px 22px 26px; box-shadow:0 30px 80px rgba(0,0,0,.55);')}>
        <button onClick={onClose} aria-label={t('Đóng')} style={css('position:absolute; top:14px; right:14px; width:34px; height:34px; border:1px solid rgba(130,170,255,.3); border-radius:50%; background:rgba(255,255,255,.06); color:#c9d6f5; display:flex; align-items:center; justify-content:center; cursor:pointer;')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
        </button>
        <div style={css('display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding-right:44px;')}>
          <span style={css('display:inline-flex; align-items:center; height:24px; padding:0 10px; border-radius:999px; background:rgba(46,144,255,.18); border:1px solid rgba(46,144,255,.45); color:#dbeaff; font-size:11.5px; font-weight:700;')}>AI Exhibition · Booth {p.booth}</span>
          <span style={css(NOINFO_TAG)}>{t('Chưa có thông tin')}</span>
        </div>
        <h2 style={css('margin:12px 0 0; padding-right:44px; font-size:26px; line-height:1.2; font-weight:800; letter-spacing:-.6px; color:#fff; text-wrap:balance;')}>{p.title}</h2>
        {p.members?.length > 0 && (
          <div style={css('display:flex; align-items:baseline; gap:8px; margin-top:10px; flex-wrap:wrap; font-size:13px; line-height:1.5;')}>
            <span style={css('font-weight:600; color:#a9b8dc;')}>Owner:</span>
            <span style={css('font-weight:700; color:#fff;')}>{p.members.join(', ')}</span>
          </div>
        )}
        <div style={css('margin-top:6px; font-size:12.5px; color:#a9b8dc;')}>{[p.label, p.category].filter(Boolean).join(' · ')}</div>
        <div className="zp-ps" style={{ marginTop: 20 }}>
          {card('Bài toán', '#E0353F', p.problem)}
          <div className="zp-ps-arrow" aria-hidden="true">
            <span style={css('width:36px; height:36px; border-radius:50%; background:#0f1a3a; border:1px solid rgba(130,170,255,.4); color:#cfe0ff; display:flex; align-items:center; justify-content:center;')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>
            </span>
          </div>
          {card('Giải pháp', '#00A352', p.solution)}
        </div>
        <div style={css('display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-top:20px;')}>
          <span style={css('flex:1; min-width:200px; font-size:12.5px; line-height:1.5; color:#a9b8dc;')}>{t('Use case này chưa có bài chi tiết trên AI Space. Bấm "Quan tâm" để nhắc team đăng lên.')}</span>
          <InterestButton p={p} busy={busy} onToggle={onToggle} t={t} />
        </div>
      </div>
    </div>
  )
}

export default function PendingCases({ items, t, requireLogin }) {
  const [, setTick] = useState(0)
  const [busy, setBusy] = useState(null)
  const [open, setOpen] = useState(null)
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
          const [c1, c2] = colorsOf(p)
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => setOpen(p)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(p) } }}
              style={css('display:flex; align-items:flex-start; gap:12px; padding:12px 12px 12px 14px; border-radius:16px; background:#F8FAFE; border:1.5px solid #E3E8F7; cursor:pointer;')}
            >
              <span aria-hidden="true" style={css(`flex:none; width:44px; height:44px; border-radius:12px; background:${c1}; box-shadow:0 4px 0 ${c2}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:19px; font-weight:800; font-style:italic;`)}>{p.booth}</span>
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
                  <InterestButton p={p} busy={busy === p.id} onToggle={toggle} t={t} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {/* on <body> so the sticky search bar and the top nav (their own stacking contexts) stay underneath */}
      {open && createPortal(<PendingPopup p={open} busy={busy === open.id} onToggle={toggle} onClose={() => setOpen(null)} t={t} />, document.body)}
    </section>
  )
}
