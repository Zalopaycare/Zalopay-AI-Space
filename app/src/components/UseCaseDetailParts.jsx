import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSidebarLayout } from '../hooks/useSidebarCollapsed.js'
import { css, hoverClass } from '../lib/style.js'
import AnonTag from './AnonTag.jsx'
import { Blocks, CopyButton, Figure, Placeholders, Prompt, PromptTargetContext } from './UseCaseGuide.jsx'
import Fill from './Fill.jsx'
import { avatarPhotoCss } from './Avatar.jsx'

// Building blocks of the use case detail page, laid out as the 9-part template:
// hero + info row + "Ứng dụng ngay →" · 3 numbers · 1 Tóm tắt · 2–3 Bài toán | Giải pháp · 4 Kết quả ·
// 5 Tự áp dụng (the one highlighted block) · 6 An toàn & giới hạn · 7 Demo · 8 Chi tiết kỹ thuật
// (collapsed) · 9 Tiếp theo & liên hệ — with a sticky table of contents on wide screens.

export const DETAIL_COL = 'max-width:1120px; margin:0 auto;'
const CARD = 'border:1px solid #E6EBF3; border-radius:20px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30); padding:24px 26px;'
const H3 = 'font-size:17px; font-weight:800; color:#0F172A;'
const SUB = 'font-size:14.5px; font-weight:800; color:#0F172A; margin-bottom:10px;'
const DIFF = { 'Dễ': ['#4ADE80', 1], 'Trung bình': ['#FBBF24', 2], 'Khó': ['#F87171', 3] }

export const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export function BulletList({ items, dot = '#9FB6E8', color = '#3A4757', numbered = false }) {
  return (
    <div style={css('display:flex; flex-direction:column; gap:11px;')}>
      {items.map((text, i) => numbered ? (
        <div key={i} style={css('display:flex; gap:12px; align-items:flex-start;')}>
          <span style={css('flex:none; width:26px; height:26px; border-radius:50%; background:#E7ECFB; border:1px solid #B9CCF8; color:#2c5fff; display:flex; align-items:center; justify-content:center; font-size:12.5px; font-weight:800;')}>{i + 1}</span>
          <span style={css(`font-size:14px; line-height:1.65; color:${color}; text-wrap:pretty;`)}><Fill text={text} /></span>
        </div>
      ) : (
        <div key={i} style={css(`display:flex; gap:10px; font-size:14px; line-height:1.65; color:${color}; text-wrap:pretty;`)}>
          <span style={css(`flex:none; margin-top:8px; width:6px; height:6px; border-radius:50%; background:${dot};`)}></span><span><Fill text={text} /></span>
        </div>
      ))}
    </div>
  )
}

/** Title block on the dark hero: Loại + Trạng thái chips, title, tool name, one-line description,
 *  one horizontal info row and the "Ứng dụng ngay →" button that jumps to part 5. */
export function DetailHero({ c, h, topics, avatarBg, avatarUrl, onBack, onStart, startLabel, tldr = [], t }) {
  const chip = 'display:inline-flex; align-items:center; gap:7px; height:28px; padding:0 12px; border-radius:999px; font-size:12.5px; font-weight:700;'
  const label = (text) => <div style={css('font-size:11px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#8fa6d8; margin-bottom:6px;')}>{text}</div>
  const value = 'font-size:13.5px; font-weight:700; line-height:1.45; color:#fff;'
  const diff = DIFF[h.difficulty]
  const cells = [
    h.audience && <div key="aud">{label(t('Ai dùng được'))}<div style={css(value + 'font-weight:600;')}><Fill text={h.audience} /></div></div>,
    diff && (
      <div key="diff">
        {label(t('Độ khó'))}
        <div style={css('display:flex; align-items:center; gap:8px;')}>
          <span style={css('display:flex; gap:3px;')} aria-hidden="true">
            {[1, 2, 3].map((n) => <span key={n} style={css(`width:7px; height:14px; border-radius:3px; background:${n <= diff[1] ? diff[0] : 'rgba(255,255,255,.16)'};`)}></span>)}
          </span>
          <span style={css(`font-size:13.5px; font-weight:800; color:${diff[0]};`)}>{t(h.difficulty)}</span>
        </div>
      </div>
    ),
    h.access && <div key="acc">{label(t('Cách tiếp cận'))}<div style={css(value + 'font-weight:600;')}><Fill text={h.access} /></div></div>,
    h.tools.length > 0 && (
      <div key="tools">
        {label(t('Công cụ AI'))}
        <div style={css('display:flex; flex-wrap:wrap; gap:5px;')}>
          {h.tools.map((name) => <span key={name} style={css('display:inline-flex; align-items:center; height:24px; padding:0 9px; border-radius:999px; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.22); color:#fff; font-size:12px; font-weight:700;')}>{name}</span>)}
        </div>
      </div>
    ),
  ].filter(Boolean)

  return (
    <>
      {onBack && <button onClick={onBack} title={t('Quay lại Use Case Library')} className={hoverClass('color:#fff !important;')} style={css('display:inline-flex; align-items:center; gap:7px; margin:0 0 18px; padding:4px 0; border:none; background:none; color:#c9d6f5; font-size:14px; font-weight:600; font-family:inherit; cursor:pointer; transition:color .15s;')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
        {t('Quay lại')}
      </button>}
      {topics.length > 0 && <div style={css('display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;')}>
        {topics.map((tp) => <span key={tp} style={css(chip + 'background:rgba(46,144,255,.18); border:1px solid rgba(46,144,255,.45); color:#dbeaff;')}>{tp}</span>)}
      </div>}
      <h1 className="zp-detail-title" style={css('margin:0; font-size:38px; line-height:1.15; font-weight:800; letter-spacing:-1px; color:#fff; text-wrap:balance;')}>{c.title}</h1>
      {/* Who owns / posted it, right under the title: avatar + name + team. */}
      <div style={css('display:flex; align-items:center; gap:10px; margin-top:14px; min-width:0; flex-wrap:wrap;')}>
        <span style={css(`width:30px; height:30px; border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; background:${avatarBg};${avatarPhotoCss(avatarUrl)}`)}>{c.author.slice(0, 1).toUpperCase()}</span>
        <span style={css('font-size:14.5px; font-weight:700; color:#fff;')}><Fill text={h.owner} /></span>
        {h.ownerTeam && <span style={css('font-size:13.5px; color:#a9b8dc;')}>· <Fill text={h.ownerTeam} /></span>}
        <AnonTag p={c} dark />
      </div>
      {h.toolName && <div style={css('margin-top:10px; font-size:13.5px; font-weight:600; color:#8fb4ff;')}>{t('Tên công cụ')}: <span style={css('color:#fff; font-weight:800;')}>{h.toolName}</span></div>}
      <p style={css('margin:12px 0 0; max-width:820px; font-size:15.5px; line-height:1.65; color:rgba(230,236,250,.9); text-wrap:pretty;')}>{c.desc}</p>
      {/* One overview box: the info row, then the 30-second summary (part 1) right under it. */}
      <div id="uc-overview" className="zp-overview" style={{ marginTop: 22 }}>
        {cells.length > 0 && <div className="zp-info-row" style={{ '--zp-cells': Math.max(1, cells.length) }}>{cells}</div>}
        {tldr.length > 0 && (
          <div id="uc-tldr" className="zp-overview-tldr">
            {tldr.map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <div style={css('font-size:11px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#8fa6d8; padding-top:3px;')}>{t(k)}</div>
                <div style={css('font-size:14px; line-height:1.55; color:#e6ecfa; text-wrap:pretty;')}><Fill text={v} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
      {h.statusNote && <div style={css('margin-top:8px; font-size:12.5px; color:#a9b8dc;')}>{h.statusNote}</div>}
      {onStart && (
        <button onClick={onStart} className={hoverClass('filter:brightness(1.08) !important; transform:translateY(-1px);')} style={css('margin-top:20px; display:inline-flex; align-items:center; gap:10px; height:48px; padding:0 24px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-family:inherit; font-size:15px; font-weight:800; cursor:pointer; box-shadow:0 10px 30px rgba(44,95,255,.45); transition:transform .15s;')}>
          {startLabel} <span aria-hidden="true">→</span>
        </button>
      )}
    </>
  )
}

/** Up to three headline numbers right under the hero. */
export function StatTiles({ stats }) {
  if (!stats.length) return null
  return (
    <div className="zp-stats" style={{ marginTop: 22 }}>
      {stats.map((s, i) => (
        <div key={i} style={css('padding:16px 18px; border-radius:16px; background:rgba(255,255,255,.06); border:1px solid rgba(130,170,255,.24);')}>
          <div style={css('display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;')}>
            <span style={css('font-size:30px; line-height:1.1; font-weight:800; letter-spacing:-.8px; color:#fff;')}>{s.value}</span>
            {s.extra && <span style={css('font-size:15px; font-weight:800; color:#8fb4ff;')}>{s.extra}</span>}
          </div>
          <div style={css('margin-top:6px; font-size:12.5px; line-height:1.5; color:#b9c7e8; text-wrap:pretty;')}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

/** Original images from the source doc: one full width, several two by two (one column on phones). */
export function Images({ images, style }) {
  if (!images || !images.length) return null
  return (
    <div className="zp-thumbs" style={{ marginTop: 16, ...style }}>
      {images.map((img, i) => <Figure key={i} img={img} />)}
    </div>
  )
}

/** Section number in a glowing circle. */
export function NumBadge({ n, size = 28 }) {
  return (
    <span aria-hidden="true" style={css(`flex:none; display:inline-flex; align-items:center; justify-content:center; width:${size}px; height:${size}px; border-radius:50%; background:radial-gradient(circle at 35% 30%, #7FA8FF 0%, #2c5fff 60%, #1B3FCC 100%); color:#fff; font-size:${Math.round(size * 0.46)}px; font-weight:800; line-height:1; box-shadow:0 0 0 3px rgba(44,95,255,.18), 0 0 18px rgba(80,130,255,.75);`)}>{n}</span>
  )
}

/** Numbered section heading + white card. */
export function Section({ id, num, title, sub, children, bare = false }) {
  return (
    <section id={id} data-toc style={css('scroll-margin-top:84px; margin-top:26px;')}>
      <div style={css('display:flex; align-items:center; gap:10px; margin-bottom:12px; flex-wrap:wrap;')}>
        {num && <NumBadge n={num} />}
        <h2 style={css('margin:0; font-size:22px; font-weight:800; letter-spacing:-.3px; color:#fff;')}>{title}</h2>
        {sub && <span style={css('font-size:13px; color:#8b98b8;')}>{sub}</span>}
      </div>
      {bare ? children : <div style={css(CARD)}>{children}</div>}
    </section>
  )
}

export function Tldr({ rows }) {
  return (
    <div className="zp-tldr">
      {rows.map(([k, v]) => (
        <div key={k} style={css('display:contents;')}>
          <div style={css('font-size:12px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; color:#2c5fff; padding-top:2px;')}>{k}</div>
          <div style={css('font-size:14.5px; line-height:1.6; color:#1E293B; text-wrap:pretty;')}><Fill text={v} /></div>
        </div>
      ))}
    </div>
  )
}

/** 2 Bài toán | 3 Giải pháp on one row (one column on phones). */
export function ProblemSolution({ problem, solution, t, num: partNum }) {
  return (
    <section id="uc-problem" data-toc style={css('scroll-margin-top:84px; margin-top:26px;')}>
      <div className="zp-ps">
        {[
          ['2', t('Bài toán'), '#E0353F', (
            <>
              {problem.text && <p style={css('margin:0 0 14px; font-size:14px; line-height:1.65; color:#3A4757; text-wrap:pretty;')}><Fill text={problem.text} /></p>}
              {problem.bullets.length > 0 && <BulletList items={problem.bullets} dot="#E0353F" />}
              <Images images={problem.images} />
            </>
          )],
          ['3', t('Giải pháp'), '#00A352', (
            <>
              {solution.analogy && <div style={css('margin:0 0 14px; padding:10px 14px; border-radius:12px; background:#F4F7FE; font-size:13.5px; line-height:1.6; color:#1E3A7A;')}><b>{t('Hiểu đơn giản')}:</b> <Fill text={String(solution.analogy).replace(/^\s*hiểu đơn giản\s*[:：]\s*/i, '')} /></div>}
              <BulletList items={solution.steps} numbered />
              <Images images={solution.images} />
            </>
          )],
        ].map(([num, title, dot, body], i) => (
          <div key={num} style={{ display: 'contents' }}>
            {i === 1 && (
              <div className="zp-ps-arrow" aria-hidden="true">
                <span style={css('width:36px; height:36px; border-radius:50%; background:#0f1a3a; border:1px solid rgba(130,170,255,.4); color:#cfe0ff; display:flex; align-items:center; justify-content:center;')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>
                </span>
              </div>
            )}
            <div style={css(CARD)}>
              <div style={css(H3 + 'margin-bottom:12px; display:flex; align-items:center; gap:8px;')}>
                {i === 0 && partNum && <NumBadge n={partNum} size={26} />}{title}
                <span style={css(`width:8px; height:8px; border-radius:50%; background:${dot};`)}></span>
              </div>
              {body}
            </div>
          </div>
        ))}
      </div>
      {problem.tables.map((tb, i) => <div key={i} style={{ marginTop: 18 }}>{isNumericTable(tb) ? <div style={css(CARD)}><BarTable table={tb} t={t} /></div> : <PlainTable table={tb} />}</div>)}
    </section>
  )
}

const pctOf = (s) => parseFloat(String(s).replace('%', '').replace(',', '.'))
const isNumericTable = (tb) => tb.cols.length === 3 && tb.rows.length > 1 && tb.rows.every((r) => /^[\d.,\s]+$/.test(String(r[1])) && /%\s*$/.test(String(r[2])) && !Number.isNaN(pctOf(r[2])))

export function BarTable({ table, t, limit = 5 }) {
  const [all, setAll] = useState(false)
  const max = Math.max(...table.rows.map((r) => pctOf(r[2])))
  const rows = all ? table.rows : table.rows.slice(0, limit)
  return (
    <div style={css('padding:18px; border:1px solid #E6EBF3; border-radius:16px; display:flex; flex-direction:column;')}>
      <div style={css(SUB + 'margin-bottom:4px;')}>{table.title}</div>
      {table.note && <div style={css('font-size:12.5px; line-height:1.5; color:#64748b; margin-bottom:14px;')}>{table.note}</div>}
      <div style={css('display:flex; flex-direction:column; gap:12px;')}>
        {rows.map((r, i) => (
          <div key={i}>
            <div style={css('display:flex; justify-content:space-between; gap:12px; font-size:13px; line-height:1.4;')}>
              <span style={css(`color:${i === 0 ? '#0F172A' : '#3A4757'}; font-weight:${i === 0 ? 700 : 500};`)}>{r[0]}</span>
              <span style={css('flex:none; color:#0F172A; font-weight:700; font-variant-numeric:tabular-nums;')}>{r[1]} <span style={css('color:#64748b; font-weight:600;')}>· {r[2]}</span></span>
            </div>
            <div style={css('margin-top:5px; height:8px; border-radius:999px; background:#EEF2F9; overflow:hidden;')}>
              <div style={css(`height:100%; width:${Math.max(2, (pctOf(r[2]) / max) * 100)}%; border-radius:999px; background:${i === 0 ? 'linear-gradient(90deg,#2c5fff,#5b8cff)' : '#9FB6E8'};`)}></div>
            </div>
          </div>
        ))}
      </div>
      {table.rows.length > limit && (
        <button onClick={() => setAll(!all)} aria-expanded={all} className={hoverClass('background:#F2F6FF !important;')} style={css('margin-top:16px; align-self:flex-start; height:34px; padding:0 14px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#2c5fff; font-family:inherit; font-size:12.5px; font-weight:700; cursor:pointer;')}>
          {all ? t('Thu gọn') : t('Xem tất cả') + ` (${table.rows.length})`}
        </button>
      )}
    </div>
  )
}

export function PlainTable({ table, flat = false }) {
  return (
    <div style={css(flat ? '' : CARD)}>
      {table.title && <div style={css(SUB + 'margin-bottom:4px;')}>{table.title}</div>}
      {table.note && <div style={css('font-size:12.5px; color:#64748b; margin-bottom:12px;')}>{table.note}</div>}
      <div style={css('overflow-x:auto; border:1px solid #E6EBF3; border-radius:12px;')}>
        <table style={css('width:100%; border-collapse:collapse; font-size:13px;')}>
          <thead>
            <tr>{table.cols.map((c, ci) => <th key={ci} style={css('padding:10px 12px; text-align:left; font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#2c5fff; background:#F4F7FE; border-bottom:1px solid #E6EBF3;')}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={css(`padding:11px 12px; border-top:${ri ? '1px solid #F1F4FA' : 'none'}; font-size:13px; line-height:1.55; color:${ci === 0 ? '#0F172A' : '#3A4757'}; font-weight:${ci === 0 ? 600 : 400}; vertical-align:top; white-space:pre-line;`)}><Fill text={cell} /></td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** 4 Kết quả: Trước / Sau table, result lines, numeric tables as bars, and an honest "chưa đo" note. */
export function ResultBody({ r, t }) {
  const bars = r.tables.filter(isNumericTable)
  const plain = r.tables.filter((tb) => !isNumericTable(tb))
  return (
    <div style={css('display:flex; flex-direction:column; gap:18px;')}>
      {r.highlights && r.highlights.length > 0 && (
        <div className="zp-highlights">
          {r.highlights.map((h, i) => (
            <div key={i} style={css('padding:12px 14px; border-radius:14px; background:#F2FBF6; border:1px solid #CFEEDE;')}>
              {h.value && <div style={css('font-size:20px; font-weight:800; line-height:1.2; color:#00723C;')}><Fill text={h.value} /></div>}
              {h.label && <div style={css('margin-top:3px; font-size:13px; line-height:1.45; color:#2F4A3C;')}><Fill text={h.label} /></div>}
            </div>
          ))}
        </div>
      )}
      {r.beforeAfter && <PlainTable flat table={{ title: t('Trước / Sau'), note: r.beforeAfter.note, cols: r.beforeAfter.cols, rows: r.beforeAfter.rows }} />}
      {r.bullets.length > 0 && <BulletList items={r.bullets} dot="#00A352" color="#2F4A3C" />}
      {bars.length > 0 && <div className={bars.length > 1 ? 'zp-bars' : ''}>{bars.map((tb, i) => <BarTable key={i} table={tb} t={t} />)}</div>}
      {plain.map((tb, i) => <PlainTable flat key={i} table={tb} />)}
      {r.images && r.images.length > 0 && <Images images={r.images} style={{ marginTop: 0 }} />}
      {r.note && <div style={css('padding:11px 14px; border-radius:12px; background:#F4F7FE; border:1px solid #DCE6FB; font-size:13px; line-height:1.55; color:#2A3A57;')}><b>{t('Số đo')}:</b> <Fill text={r.note} /></div>}
    </div>
  )
}

function Collapsible({ title, count, children, defaultOpen = false, dark = false }) {
  return (
    <details open={defaultOpen} className="zp-collapse" style={css(`border:1px solid ${dark ? 'rgba(130,170,255,.24)' : '#E6EBF3'}; border-radius:14px; background:${dark ? 'transparent' : '#fff'}; overflow:hidden;`)}>
      <summary style={css(`display:flex; align-items:center; gap:10px; padding:13px 16px; cursor:pointer; list-style:none; font-size:14.5px; font-weight:800; color:${dark ? '#fff' : '#0F172A'};`)}>
        <svg className="zp-collapse-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
        <span style={{ flex: 1 }}>{title}</span>
        {count != null && <span style={css('font-size:12px; font-weight:700; color:#64748b;')}>{count}</span>}
      </summary>
      <div style={css('padding:4px 16px 16px;')}>{children}</div>
    </details>
  )
}

/** "Cần chuẩn bị" as a checklist the reader can tick; ticks are remembered per use case in this browser. */
function PrepChecklist({ id, items, t }) {
  const key = 'zp-prep-' + id
  const [done, setDone] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) } catch { return new Set() } })
  const toggle = (i) => setDone((s) => {
    const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i)
    try { localStorage.setItem(key, JSON.stringify([...n])) } catch { /* private mode */ }
    return n
  })
  return (
    <div>
      <div style={css('display:flex; align-items:baseline; justify-content:space-between; gap:12px;')}>
        <div style={css(SUB)}>{t('Cần chuẩn bị')}</div>
        <span style={css(`font-size:12.5px; font-weight:700; color:${done.size === items.length ? '#00893F' : '#64748b'};`)}>{done.size === items.length ? '✓ ' + t('Đã đủ') : `${done.size}/${items.length} ${t('đã có')}`}</span>
      </div>
      <div style={css('display:flex; flex-direction:column; gap:6px;')}>
        {items.map((text, i) => (
          <label key={i} className={hoverClass('background:#F4F7FE !important;')} style={css(`display:flex; gap:11px; align-items:flex-start; padding:9px 12px; border-radius:12px; border:1px solid ${done.has(i) ? '#CFEEDE' : '#E6EBF3'}; background:${done.has(i) ? '#F2FBF6' : '#fff'}; cursor:pointer;`)}>
            <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} style={css('flex:none; width:17px; height:17px; margin:2px 0 0; accent-color:#00A352; cursor:pointer;')} />
            <span style={css(`font-size:14px; line-height:1.55; color:${done.has(i) ? '#51705F' : '#1E293B'}; ${done.has(i) ? 'text-decoration:line-through; text-decoration-color:#9CCBB0;' : ''}`)}>{text}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function CodeBlock({ cb }) {
  return (
    <div>
      <div style={css('display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px;')}>
        <span style={css('font-size:12px; font-weight:800; letter-spacing:.07em; color:#2c5fff;')}>{cb.title}</span>
        <CopyButton text={cb.code} />
      </div>
      {cb.note && <div style={css('margin:-2px 0 8px; font-size:12.5px; color:#64748b;')}><Fill text={cb.note} /></div>}
      <pre style={css('margin:0; padding:14px 16px; border:1px solid #DDE3EC; border-radius:12px; background:#F7F9FD; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12.5px; line-height:1.7; color:#0F172A; white-space:pre-wrap; word-break:break-word;')}><Placeholders text={cb.code} /></pre>
    </div>
  )
}

/** 5 Tự áp dụng — the one highlighted block: fit, checklist, steps with copyable prompts, what success
 *  looks like, and the common-errors table (collapsed). */
export function ApplySection({ id, a, t, num = '5' }) {
  const parts = []
  if (a.intro) parts.push(<p key="intro" style={css('margin:0; font-size:14.5px; line-height:1.65; color:#1E293B;')}><Fill text={a.intro} /></p>)
  if (a.fit.yes.length || a.fit.no.length) parts.push(
    <div key="fit" className="zp-fit">
      {a.fit.yes.length > 0 && <div style={css('padding:14px 16px; border-radius:14px; background:#F2FBF6; border:1px solid #CFEEDE;')}><div style={css(SUB + 'color:#00723C;')}>✓ {t('Phù hợp với bạn nếu')}</div><BulletList items={a.fit.yes} dot="#00A352" /></div>}
      {a.fit.no.length > 0 && <div style={css('padding:14px 16px; border-radius:14px; background:#F7F8FB; border:1px solid #E3E8F2;')}><div style={css(SUB + 'color:#5B6675;')}>{t('Chưa phù hợp nếu')}</div><BulletList items={a.fit.no} dot="#94a3b8" /></div>}
    </div>,
  )
  if (a.prep.length) parts.push(
    <div key="prep">
      <PrepChecklist id={id} items={a.prep} t={t} />
      {a.prepPrompt && <div style={{ marginTop: 12 }}><Prompt b={a.prepPrompt} /></div>}
    </div>,
  )
  if (a.steps.length || a.stepSections.length || a.blocks.length || a.code.length || a.refTables.length) parts.push(
    <div key="steps">
      <div style={css(SUB)}>{t('Các bước')}</div>
      <div style={css('display:flex; flex-direction:column; gap:16px;')}>
        {a.steps.length > 0 && <BulletList items={a.steps} numbered />}
        {a.stepSections.map((s, i) => (
          <Collapsible key={s.id} title={`${i + 1}. ${s.title}`} defaultOpen={i < 2}>
            {s.sub && <div style={css('margin:0 0 12px; font-size:13px; color:#64748b;')}>{s.sub}</div>}
            <Blocks blocks={s.blocks} />
          </Collapsible>
        ))}
        {a.blocks.length > 0 && <Blocks blocks={a.blocks} />}
        {a.code.map((cb, i) => <CodeBlock key={i} cb={cb} />)}
        {a.refTables.map((tb, i) => <PlainTable flat key={i} table={tb} />)}
      </div>
    </div>,
  )
  if (a.success.length || a.samples.length || a.images.length) parts.push(
    <div key="success" style={css('padding:14px 16px; border-radius:14px; background:#F2FBF6; border:1px solid #CFEEDE;')}>
      <div style={css(SUB + 'color:#00723C;')}>{t('Kết quả bạn sẽ thấy')}</div>
      {a.success.length > 0 && <BulletList items={a.success} dot="#00A352" />}
      {a.samples.map((cb, i) => <div key={i} style={{ marginTop: 12 }}><CodeBlock cb={cb} /></div>)}
      <Images images={a.images} />
    </div>,
  )
  const pitfallsMissing = !a.pitfallTable && a.pitfalls.length === 1 && /cần bổ sung/i.test(a.pitfalls[0].meet) && !a.pitfalls[0].why
  if (pitfallsMissing) parts.push(
    <div key="errors" style={css('padding:14px 16px; border-radius:14px; border:1px dashed #E3A33B; background:#FFFBF2;')}>
      <div style={css(SUB + 'margin-bottom:6px;')}>{t('Lỗi hay gặp')}</div>
      <div style={css('font-size:13.5px; line-height:1.6; color:#5A4522;')}><Fill text="[cần bổ sung]" /> {t('Tài liệu gốc chưa ghi lỗi hay gặp và cách xử lý. Tác giả bổ sung giúp: Bạn gặp · Vì sao · Nói gì với AI / làm gì.')}</div>
    </div>,
  )
  else if (a.pitfalls.length || a.pitfallTable) parts.push(
    <Collapsible key="errors" title={t('Lỗi hay gặp')} count={a.pitfallTable ? null : a.pitfalls.length}>
      {a.pitfallTable
        ? <Blocks blocks={a.pitfallTable} />
        : a.pitfalls.some((p) => p.fix)
          ? a.pitfalls.some((p) => p.why)
            ? <PlainTable flat table={{ cols: [t('Bạn gặp'), t('Vì sao'), t('Nói gì với AI / làm gì')], rows: a.pitfalls.map((p) => [p.meet, p.why || '—', p.fix || '—']) }} />
            : <PlainTable flat table={{ cols: [t('Bạn gặp'), t('Cách xử lý')], rows: a.pitfalls.map((p) => [p.meet, p.fix || '—']) }} />
          : <PlainTable flat table={{ cols: [t('Bạn gặp'), t('Vì sao')], rows: a.pitfalls.map((p) => [p.meet, p.why || '—']) }} />}
    </Collapsible>,
  )
  return (
    <section id="uc-apply" data-toc style={css('scroll-margin-top:84px; margin-top:30px;')}>
      <div style={css('border-radius:24px; padding:2px; background:linear-gradient(135deg,#5b8cff,#2c5fff 45%,#00c2a8); box-shadow:0 20px 50px rgba(44,95,255,.35);')}>
        <div style={css('border-radius:22px; background:#fff; overflow:hidden; color-scheme:light;')}>
          <div style={css('padding:20px 26px 18px; background:linear-gradient(180deg,#EEF3FF,#ffffff); border-bottom:1px solid #E6EBF3;')}>
            <div style={css('font-size:12.5px; font-weight:800; letter-spacing:.08em; color:#2c5fff;')}>{t('BẮT ĐẦU TỪ ĐÂY')}</div>
            <h2 style={css('margin:6px 0 0; display:flex; align-items:center; gap:10px; font-size:24px; font-weight:800; letter-spacing:-.4px; color:#0F172A;')}><NumBadge n={num} size={30} />{t(a.title)}</h2>
          </div>
          <PromptTargetContext.Provider value={a.promptTarget || ''}>
            <div style={css('padding:22px 26px 26px; display:flex; flex-direction:column; gap:22px;')}>{parts}</div>
          </PromptTargetContext.Provider>
        </div>
      </div>
    </section>
  )
}

/** 8 Chi tiết kỹ thuật — collapsed by default. */
export function TechSection({ tech, t, num = '8' }) {
  return (
    <section id="uc-tech" data-toc style={css('scroll-margin-top:84px; margin-top:26px;')}>
      <Collapsible dark defaultOpen title={<><span style={{ marginRight: 10, display: 'inline-flex', verticalAlign: 'middle' }}><NumBadge n={num} size={26} /></span>{t('Chi tiết kỹ thuật')} <span style={css('margin-left:8px; padding:2px 8px; border-radius:999px; background:rgba(255,255,255,.12); font-size:11.5px; color:#cfe0ff;')}>{t('Dành cho dev')}</span></>}>
        <div style={css('display:flex; flex-direction:column; gap:14px; padding-top:8px;')}>
          {tech.bullets && tech.bullets.length > 0 && <div style={css('padding:16px 18px; border-radius:14px; background:#fff;')}><BulletList items={tech.bullets} dot="#2c5fff" /></div>}
          {tech.tables.map((tb, i) => <div key={i} style={css('padding:16px; border-radius:14px; background:#fff;')}><PlainTable flat table={tb} /></div>)}
          {tech.code && tech.code.map((cb, i) => <div key={'c' + i} style={css('padding:16px; border-radius:14px; background:#fff;')}><CodeBlock cb={cb} /></div>)}
          {tech.images && tech.images.length > 0 && <div style={css('padding:16px; border-radius:14px; background:#fff;')}><Images images={tech.images} style={{ marginTop: 0 }} /></div>}
          {tech.repo && !tech.repo.href && <div style={css('font-size:13px; color:#cfe0ff;')}>Repo: <b>{tech.repo.label}</b></div>}
          {tech.repo && tech.repo.href && (
            <a href={tech.repo.href} target="_blank" rel="noopener" className={hoverClass('background:rgba(255,255,255,.14) !important;')} style={css('align-self:flex-start; display:inline-flex; align-items:center; gap:9px; padding:10px 16px; border:1px solid rgba(130,170,255,.4); border-radius:999px; color:#fff; text-decoration:none; font-size:13px; font-weight:700;')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path></svg>
              {t('Mở repo')} · {tech.repo.label}
            </a>
          )}
        </div>
      </Collapsible>
    </section>
  )
}

/** Sticky table of contents (wide screens only); highlights the section in view. */
export function Toc({ items, t, alignTo }) {
  const [active, setActive] = useState(items[0]?.id)
  // Start level with an element in the main column (the overview box), then stay sticky.
  const navRef = useRef(null)
  const [offset, setOffset] = useState(null)
  useEffect(() => {
    if (!alignTo) return undefined
    const measure = () => {
      const box = document.getElementById(alignTo), nav = navRef.current
      if (!box || !nav || !nav.parentElement) return
      setOffset(Math.max(0, Math.round(box.getBoundingClientRect().top - nav.parentElement.getBoundingClientRect().top)))
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro) ro.observe(document.body)
    window.addEventListener('resize', measure)
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [alignTo])
  const ids = items.map((it) => it.id).join(',')
  useEffect(() => {
    const els = ids.split(',').map((x) => document.getElementById(x)).filter(Boolean)
    if (!els.length || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (vis[0]) setActive(vis[0].target.id)
    }, { rootMargin: '-90px 0px -60% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ids])
  return (
    <nav ref={navRef} className="zp-toc" aria-label={t('Mục lục')} style={offset != null ? { marginTop: offset } : undefined}>
      <div style={css('font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#8fa6d8; margin:0 0 10px 12px;')}>{t('Mục lục')}</div>
      {items.map((it) => {
        const on = it.id === active
        return (
          <a
            key={it.id}
            href={'#' + it.id}
            aria-current={on ? 'true' : undefined}
            onClick={(e) => { e.preventDefault(); setActive(it.id); scrollToId(it.id) }}
            className={on ? undefined : hoverClass('color:#fff !important;')}
            style={css(`display:block; padding:6px 12px; border-left:2px solid ${on ? (it.hot ? '#5b8cff' : '#8fb4ff') : 'rgba(130,170,255,.18)'}; color:${on ? '#fff' : '#a9b8dc'}; font-size:13px; font-weight:${on || it.hot ? 700 : 500}; line-height:1.4; text-decoration:none;`)}
          >
            {it.label}
          </a>
        )
      })}
    </nav>
  )
}

/** Long pages: "Quay lại" stays reachable once you scroll past the hero. It sits in the empty strip
 *  left of the content column (a pill when there is room, a round button when the strip is narrow),
 *  vertically centred, so it never covers the cards; on phones it floats bottom-left. */
export function FloatingBack({ onBack, t }) {
  const { offset } = useSidebarLayout()
  const [show, setShow] = useState(false)
  const [gutter, setGutter] = useState(0)
  useEffect(() => {
    const on = () => {
      setShow(window.scrollY > 380)
      const col = document.querySelector('.zp-detail-wrap')
      if (col) setGutter(Math.max(0, col.getBoundingClientRect().left - offset))
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on) }
  }, [offset])
  const pill = gutter >= 124, round = !pill && gutter >= 40
  const pos = pill ? `left:${offset + (gutter - 116) / 2}px; top:50%;`
    : round ? `left:${offset + (gutter - 38) / 2}px; top:50%;`
      : `left:${offset + 16}px; bottom:18px;`
  return createPortal(
    <button
      onClick={onBack}
      aria-label={t('Quay lại')}
      title={t('Quay lại')}
      tabIndex={show ? 0 : -1}
      className={hoverClass('background:rgba(44,95,255,.92) !important; border-color:rgba(160,195,255,.8) !important;')}
      style={css(`position:fixed; ${pos} z-index:1500; display:inline-flex; align-items:center; justify-content:center; gap:8px; height:38px; ${pill ? 'width:116px;' : 'width:38px;'} padding:0; border:1px solid rgba(130,170,255,.45); border-radius:999px; background:rgba(9,18,58,.9); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); color:#fff; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 10px 28px rgba(0,0,0,.45); transition:opacity .18s, background .15s; opacity:${show ? 1 : 0}; pointer-events:${show ? 'auto' : 'none'}; ${pill || round ? 'transform:translateY(-50%);' : ''}`)}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
      {pill && t('Quay lại')}
    </button>,
    document.body,
  )
}
