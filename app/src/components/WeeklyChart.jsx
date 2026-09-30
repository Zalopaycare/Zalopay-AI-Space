import { useState } from 'react'
import { css } from '../lib/style.js'

// 8-week line chart for the admin overview. Plain SVG (no chart library in the project).
// One y-axis (all series are counts), 2px lines, 8px markers, a legend plus direct end labels,
// a crosshair tooltip on hover, and a table view for anyone who can't rely on colour.
const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
// Validated categorical order (dataviz reference palette, light surface): blue, orange, aqua, yellow.
const SERIES = [
  { key: 'members', label: 'Thành viên mới', color: '#2a78d6' },
  { key: 'questions', label: 'Câu hỏi', color: '#eb6834' },
  { key: 'useCases', label: 'Use case gửi', color: '#1baf7a' },
  { key: 'comments', label: 'Comment & reply', color: '#eda100' },
]
const W = 760, H = 250, L = 36, R = 118, T = 14, B = 30
const dd = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7)

export default function WeeklyChart({ weeks }) {
  const [hover, setHover] = useState(null)
  const [table, setTable] = useState(false)
  if (!weeks) return <div style={css(`font:600 13px ${FONT}; color:#94a3b8; padding:20px 0;`)}>Đang tải…</div>
  const n = weeks.starts.length
  const max = Math.max(4, ...SERIES.flatMap((s) => weeks[s.key]))
  const step = Math.ceil(max / 4)
  const top = step * 4
  const x = (i) => L + (i * (W - L - R)) / (n - 1)
  const y = (v) => T + (H - T - B) * (1 - v / top)
  // direct labels at the line ends, nudged apart so they never overlap
  const ends = SERIES.map((s) => ({ ...s, v: weeks[s.key][n - 1], ly: y(weeks[s.key][n - 1]) })).sort((a, b) => a.ly - b.ly)
  for (let i = 1; i < ends.length; i++) if (ends[i].ly - ends[i - 1].ly < 14) ends[i].ly = ends[i - 1].ly + 14

  return (
    <div>
      <div style={css('display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:10px;')}>
        {SERIES.map((s) => (
          <span key={s.key} style={css(`display:inline-flex; align-items:center; gap:7px; font:600 12.5px ${FONT}; color:#3A4757;`)}>
            <span style={css(`width:16px; height:3px; border-radius:2px; background:${s.color};`)}></span>{s.label}
          </span>
        ))}
        <button onClick={() => setTable(!table)} style={css(`margin-left:auto; height:30px; padding:0 12px; border:1px solid #DDE3EC; border-radius:9px; background:#fff; color:#3A4757; font:700 12px ${FONT}; cursor:pointer;`)}>{table ? 'Xem biểu đồ' : 'Xem bảng số'}</button>
      </div>
      {table ? (
        <div style={css('overflow-x:auto; border:1px solid #EEF1F7; border-radius:12px;')}>
          <table style={css(`width:100%; border-collapse:collapse; font:500 12.5px ${FONT}; color:#3A4757;`)}>
            <thead><tr><th style={css('text-align:left; padding:9px 12px; background:#F8FAFE; color:#64748b;')}>Tuần bắt đầu</th>{SERIES.map((s) => <th key={s.key} style={css('text-align:right; padding:9px 12px; background:#F8FAFE; color:#64748b;')}>{s.label}</th>)}</tr></thead>
            <tbody>{weeks.starts.map((w, i) => <tr key={w}><td style={css('padding:8px 12px; border-top:1px solid #F3F5FA;')}>{dd(w)}</td>{SERIES.map((s) => <td key={s.key} style={css('text-align:right; padding:8px 12px; border-top:1px solid #F3F5FA; font-variant-numeric:tabular-nums;')}>{weeks[s.key][i]}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Biểu đồ 8 tuần: thành viên mới, câu hỏi, use case, comment" style={{ display: 'block', overflow: 'visible' }} onMouseLeave={() => setHover(null)}>
            {[0, 1, 2, 3, 4].map((k) => (
              <g key={k}>
                <line x1={L} x2={W - R} y1={y(k * step)} y2={y(k * step)} stroke={k ? '#EEF1F7' : '#DDE3EC'} strokeWidth="1" />
                <text x={L - 8} y={y(k * step) + 4} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily={FONT}>{k * step}</text>
              </g>
            ))}
            {weeks.starts.map((w, i) => <text key={w} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#94a3b8" fontFamily={FONT}>{dd(w)}</text>)}
            {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#B9CCF8" strokeWidth="1" strokeDasharray="3 3" />}
            {SERIES.map((s) => (
              <g key={s.key}>
                <polyline fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={weeks[s.key].map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
                {weeks[s.key].map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 4} fill={s.color} stroke="#fff" strokeWidth="2" />)}
              </g>
            ))}
            {ends.map((e) => <text key={e.key} x={W - R + 10} y={e.ly + 4} fontSize="11.5" fontWeight="600" fill="#3A4757" fontFamily={FONT}>{e.label} · {e.v}</text>)}
            {weeks.starts.map((w, i) => (
              <rect key={w} x={x(i) - (W - L - R) / (n - 1) / 2} y={T} width={(W - L - R) / (n - 1)} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} />
            ))}
          </svg>
          {hover != null && (
            <div style={css(`position:absolute; top:6px; left:${(x(hover) / W) * 100}%; transform:translateX(${hover > n / 2 ? '-105%' : '5%'}); pointer-events:none; background:#0f172a; color:#fff; border-radius:10px; padding:9px 12px; font:500 12px/1.6 ${FONT}; box-shadow:0 10px 26px rgba(0,0,0,.25); white-space:nowrap;`)}>
              <div style={css('font-weight:800; margin-bottom:2px;')}>Tuần từ {dd(weeks.starts[hover])}</div>
              {SERIES.map((s) => <div key={s.key}><span style={css(`display:inline-block; width:8px; height:8px; border-radius:50%; background:${s.color}; margin-right:7px;`)}></span>{s.label}: <b>{weeks[s.key][hover]}</b></div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
