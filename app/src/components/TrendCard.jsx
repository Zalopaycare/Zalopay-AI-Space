import { useState } from 'react'
import { css } from '../lib/style.js'

// Google-Trends-style view of how often topics / AI tools come up in posts.
//  · Interest (0–100): mentions per time bucket, scaled so the busiest bucket of any shown term = 100.
//  · "Phổ biến" ranks by total mentions in the period (top term = 100).
//  · "Đang tăng" ranks by growth vs the previous period of the same length; no mentions before → "Tăng vọt" (Breakout).
// Only terms mentioned at least MIN_MENTIONS times in the period are counted; spellings that differ only in
// case/spacing are merged, and garbled labels (U+FFFD) are dropped.

const MIN_MENTIONS = 3
const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const DAY = 86_400_000
const PERIODS = [
  ['30d', '30 ngày', 30, 30], // [key, label, days, buckets]
  ['90d', '90 ngày', 91, 13],
  ['12m', '12 tháng', 365, 12],
]
const keyOf = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()

/** mentions: [{ label, time }] (time = Date | string). */
export default function TrendCard({ title, mentions, color = '#2c5fff' }) {
  const [period, setPeriod] = useState('90d')
  const [mode, setMode] = useState('top')
  const [, , days, nb] = PERIODS.find((p) => p[0] === period)
  const now = Date.now()
  const from = now - days * DAY, prevFrom = from - days * DAY
  const size = (days * DAY) / nb

  const terms = new Map() // key -> { spellings, buckets[], total, prev }
  for (const m of mentions) {
    const label = String(m.label || '').trim()
    if (!label || label.includes('�')) continue
    const t = new Date(m.time).getTime()
    if (Number.isNaN(t) || t < prevFrom || t > now) continue
    const k = keyOf(label)
    let e = terms.get(k)
    if (!e) terms.set(k, (e = { spellings: {}, buckets: Array(nb).fill(0), total: 0, prev: 0 }))
    if (t < from) { e.prev++; continue }
    e.spellings[label] = (e.spellings[label] || 0) + 1
    e.buckets[Math.min(nb - 1, Math.floor((t - from) / size))]++
    e.total++
  }
  const rows = [...terms.values()].filter((e) => e.total >= MIN_MENTIONS).map((e) => ({
    ...e,
    label: Object.entries(e.spellings).sort((a, b) => b[1] - a[1])[0][0],
    growth: e.prev ? (e.total - e.prev) / e.prev : Infinity,
  }))
  const peak = Math.max(1, ...rows.flatMap((r) => r.buckets))
  const topTotal = Math.max(1, ...rows.map((r) => r.total))
  const list = mode === 'top'
    ? rows.sort((a, b) => b.total - a.total)
    : rows.filter((r) => r.growth > 0).sort((a, b) => b.growth - a.growth || b.total - a.total)

  const tab = (on) => `height:28px; padding:0 11px; border:none; border-radius:999px; cursor:pointer; font:700 12px ${FONT}; ${on ? 'background:#fff; color:#2c5fff; box-shadow:0 1px 3px rgba(15,23,42,.12);' : 'background:transparent; color:#475569;'}`
  return (
    <div>
      <div style={css('display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:12px;')}>
        <h2 style={css(`margin:0; font:800 16px ${FONT}; color:#0f172a;`)}>{title}</h2>
        <div style={css('display:flex; gap:6px; flex-wrap:wrap;')}>
          <div style={css('display:flex; padding:3px; border-radius:999px; background:#EEF1F7;')}>
            {[['top', 'Phổ biến'], ['rising', 'Đang tăng']].map(([k, l]) => <button key={k} onClick={() => setMode(k)} style={css(tab(mode === k))}>{l}</button>)}
          </div>
          <div style={css('display:flex; padding:3px; border-radius:999px; background:#EEF1F7;')}>
            {PERIODS.map(([k, l]) => <button key={k} onClick={() => setPeriod(k)} style={css(tab(period === k))}>{l}</button>)}
          </div>
        </div>
      </div>
      {list.length === 0 ? (
        <div style={css(`padding:14px 0; font:600 13px ${FONT}; color:#94a3b8;`)}>
          {mode === 'top' ? `Chưa có mục nào được nhắc từ ${MIN_MENTIONS} lần trở lên trong khoảng này.` : 'Chưa có mục nào đang tăng so với kỳ trước.'}
        </div>
      ) : (
        <div style={css('display:flex; flex-direction:column; gap:4px;')}>
          <div style={css(`display:grid; grid-template-columns:minmax(0,1fr) 120px 64px; gap:12px; padding:0 0 4px; font:700 10.5px ${FONT}; letter-spacing:.05em; color:#94a3b8; text-transform:uppercase;`)}>
            <span>Tên</span><span>Mức quan tâm theo thời gian</span><span style={{ textAlign: 'right' }}>{mode === 'top' ? 'Điểm' : 'Tăng'}</span>
          </div>
          {list.slice(0, 6).map((r) => (
            <div key={r.label} title={`${r.total} lần trong kỳ này · ${r.prev} lần kỳ trước`} style={css('display:grid; grid-template-columns:minmax(0,1fr) 120px 64px; gap:12px; align-items:center; padding:7px 0; border-top:1px solid #F1F4F9;')}>
              <span style={css(`font:600 13px ${FONT}; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`)}>{r.label} <span style={{ color: '#94a3b8', fontWeight: 500 }}>· {r.total}</span></span>
              <Spark values={r.buckets.map((v) => Math.round((v / peak) * 100))} color={color} />
              <span style={css(`text-align:right; font:800 13px ${FONT}; color:${mode === 'top' ? '#0f172a' : '#00893F'};`)}>
                {mode === 'top' ? Math.round((r.total / topTotal) * 100) : r.growth === Infinity ? 'Tăng vọt' : '+' + Math.round(r.growth * 100) + '%'}
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={css(`margin-top:10px; font:500 11.5px/1.5 ${FONT}; color:#94a3b8;`)}>
        Điểm 0–100 như Google Trends: 100 là mục được nhắc nhiều nhất. Chỉ tính mục được nhắc từ {MIN_MENTIONS} lần trở lên trong câu hỏi và use case.
      </div>
    </div>
  )
}

function Spark({ values, color }) {
  const w = 120, h = 28, n = values.length
  const pts = values.map((v, i) => `${n > 1 ? (i / (n - 1)) * w : w / 2},${h - 2 - (v / 100) * (h - 4)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Mức quan tâm theo thời gian">
      <line x1="0" y1={h - 2} x2={w} y2={h - 2} stroke="#E6EBF3" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
