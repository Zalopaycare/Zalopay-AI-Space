import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSidebarLayout } from '../hooks/useSidebarCollapsed.js'
import { safeHref } from '../lib/safeHref.js'
import { css, hoverClass } from '../lib/style.js'
import AnonTag from './AnonTag.jsx'
import { Blocks, CopyButton, Figure, Placeholders, Prompt, PromptTargetContext } from './UseCaseGuide.jsx'
import Fill from './Fill.jsx'
import RichText from './RichText.jsx'

// Building blocks of the use case detail page, laid out as the template:
// hero (owner, contacts) + info row · 3 numbers · 1 Tóm tắt · 2–3 Bài toán | Giải pháp ·
// 4 Tự áp dụng (links first; the one highlighted block) · 5 Kết quả · 6 Lưu ý khi dùng · 7 Demo —
// with a sticky table of contents on wide screens. Technical details are not shown.

export const DETAIL_COL = 'max-width:1120px; margin:0 auto;'
const CARD = 'border:1px solid #E6EBF3; border-radius:20px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30); padding:18px 20px;'
// Heading scale on a use case page: part titles outside the cards (20px white) > SUB, the headings
// inside a card (Bài toán, Giải pháp, Cần chuẩn bị, Các bước…; 16px deep blue) > SUB2, what sits under
// those (Số liệu & hình ảnh, table titles, a step's name; 14px near-black) > body text (13px).
const SUB = 'font-size:16px; font-weight:800; letter-spacing:-.2px; color:#1D3A8F; margin-bottom:10px;'
const SUB2 = 'font-size:14px; font-weight:800; color:#0F172A; margin-bottom:8px;'
const DIFF = { 'Dễ': ['#4ADE80', 1], 'Trung bình': ['#FBBF24', 2], 'Khó': ['#F87171', 3] }

export const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export function BulletList({ items, dot = '#9FB6E8', color = '#3A4757', numbered = false }) {
  return (
    <div style={css('display:flex; flex-direction:column; gap:8px;')}>
      {items.map((text, i) => numbered ? (
        <div key={i} style={css('display:flex; gap:12px; align-items:flex-start;')}>
          <span style={css('flex:none; width:26px; height:26px; border-radius:50%; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font-size:12.5px; font-weight:800; box-shadow:0 3px 8px rgba(44,95,255,.3);')}>{i + 1}</span>
          <span style={css(`padding-top:3px; font-size:13.5px; line-height:1.55; color:${numbered ? '#0F172A' : color}; text-wrap:pretty;`)}><Fill text={text} /></span>
        </div>
      ) : (
        <div key={i} style={css(`display:flex; gap:10px; font-size:13px; line-height:1.55; color:${color}; text-wrap:pretty;`)}>
          <span style={css(`flex:none; margin-top:8px; width:6px; height:6px; border-radius:50%; background:${dot};`)}></span><span><Fill text={text} /></span>
        </div>
      ))}
    </div>
  )
}

/** Title block on the dark hero: title, "Owner" line and one-line summary beside the cover, and one
 *  horizontal info row. */
export function DetailHero({ c, h, onBack, onUploadCover, tldr = [], t }) {
  const [coverBusy, setCoverBusy] = useState(false)
  const [coverErr, setCoverErr] = useState('')
  const label = (text) => <div style={css('font-size:11px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#8fa6d8; margin-bottom:6px;')}>{text}</div>
  const value = 'font-size:12.5px; font-weight:700; line-height:1.45; color:#fff;'
  const diff = DIFF[h.difficulty]
  // an AI Exhibition booth not written up yet keeps the info row, each fact "Chưa có thông tin"
  const none = (key, name) => c.pending && <div key={key}>{label(t(name))}<div style={css(value + 'font-weight:600; color:#8fa6d8;')}>{t('Chưa có thông tin')}</div></div>
  const cells = [
    !h.audience && none('aud', 'Ai dùng được'),
    !diff && none('diff', 'Độ khó'),
    !h.tools.length && none('tools', 'Công cụ AI'),
    h.audience && <div key="aud">{label(t('Ai dùng được'))}<div style={css(value + 'font-weight:600;')}><Fill text={h.audience} /></div></div>,
    diff && (
      <div key="diff">
        {label(t('Độ khó'))}
        <div style={css('display:flex; align-items:center; gap:8px;')}>
          <span style={css('display:flex; gap:3px;')} aria-hidden="true">
            {[1, 2, 3].map((n) => <span key={n} style={css(`width:7px; height:14px; border-radius:3px; background:${n <= diff[1] ? diff[0] : 'rgba(255,255,255,.16)'};`)}></span>)}
          </span>
          <span style={css(`font-size:12.5px; font-weight:800; color:${diff[0]};`)}>{t(h.difficulty)}</span>
        </div>
      </div>
    ),
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
      {onBack && <button onClick={onBack} title={t('Quay lại Use Case Library')} className={hoverClass('color:#fff !important;')} style={css('display:inline-flex; align-items:center; gap:7px; margin:0 0 18px; padding:4px 0; border:none; background:none; color:#c9d6f5; font-size:13px; font-weight:600; font-family:inherit; cursor:pointer; transition:color .15s;')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
        {t('Quay lại')}
      </button>}
      {/* Title, Owner and summary on the left, the 1920×1080 cover on the right (stacked on narrow
          columns, cover first). Older screenshots of other shapes are shown whole. */}
      <div className={c.coverUrl || onUploadCover ? 'zp-hero-split' : undefined}>
        <div style={css('min-width:0;')}>
          <h1 className="zp-detail-title" style={css('margin:0; font-size:30px; line-height:1.15; font-weight:800; letter-spacing:-1px; color:#fff; text-wrap:balance;')}>{c.title}</h1>
          {/* Everyone who built it (or the poster), right under the title. */}
          {(h.members?.length > 0 || h.owner) && (
            <div style={css('display:flex; align-items:baseline; gap:8px; margin-top:12px; flex-wrap:wrap; font-size:13px; line-height:1.5;')}>
              <span style={css('font-weight:600; color:#a9b8dc;')}>Owner:</span>
              <span style={css('font-weight:700; color:#fff;')}><Fill text={h.members?.length ? h.members.join(', ') : h.owner} /></span>
              <AnonTag p={c} dark />
            </div>
          )}
          {c.desc && <p style={css('margin:12px 0 0; max-width:820px; font-size:14px; line-height:1.55; color:rgba(230,236,250,.9); text-wrap:pretty;')}>{c.desc}</p>}
        </div>
        {/* no cover yet: admins get an empty 16:9 frame with an upload button */}
        {!c.coverUrl && onUploadCover && (
          <div className="zp-hero-cover" style={css('width:100%; aspect-ratio:16 / 9; border-radius:18px; border:1.5px dashed rgba(130,170,255,.45); background:rgba(255,255,255,.04); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; text-align:center; padding:16px; box-sizing:border-box;')}>
            <div style={css('font-size:13px; font-weight:700; color:#c9d6f5;')}>{t('Chưa có ảnh bìa')}</div>
            <div style={css('font-size:11.5px; color:#8fa6d8;')}>1920 × 1080 px (16:9)</div>
            <label style={css(`display:inline-flex; align-items:center; gap:7px; height:34px; padding:0 15px; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font-size:12.5px; font-weight:800; cursor:pointer; opacity:${coverBusy ? 0.6 : 1};`)}>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden disabled={coverBusy} onChange={(e) => {
                const f = e.target.files?.[0]; e.target.value = ''
                if (!f) return
                setCoverBusy(true); setCoverErr('')
                onUploadCover(f).catch((er) => setCoverErr(er?.message || t('Chưa tải được ảnh, thử lại nhé.'))).finally(() => setCoverBusy(false))
              }} />
              {coverBusy ? t('Đang tải…') : t('Tải ảnh bìa')}
            </label>
            {coverErr && <div style={css('font-size:11.5px; font-weight:600; color:#ffb4b4;')}>{coverErr}</div>}
          </div>
        )}
        {c.coverUrl && (
          <div className="zp-hero-cover" style={css('width:100%; aspect-ratio:16 / 9; border-radius:18px; overflow:hidden; background:#0b1230; border:1px solid rgba(130,170,255,.22); display:flex; align-items:center; justify-content:center;')}>
            <img src={c.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>
        )}
      </div>
      {/* One overview box: the info row, then the 30-second summary (part 1) right under it. */}
      <div id="uc-overview" className="zp-overview" style={{ marginTop: 22 }}>
        {cells.length > 0 && <div className="zp-info-row" style={{ '--zp-cells': Math.max(1, cells.length) }}>{cells}</div>}
        {tldr.length > 0 && (
          <div id="uc-tldr" className="zp-overview-tldr">
            {tldr.map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <div style={css('font-size:11px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#8fa6d8; padding-top:3px;')}>{t(k)}</div>
                <div style={css('font-size:13px; line-height:1.55; color:#e6ecfa; text-wrap:pretty;')}><Fill text={v} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
      {h.statusNote && <div style={css('margin-top:8px; font-size:12px; color:#a9b8dc;')}>{h.statusNote}</div>}
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
            <span style={css('font-size:24px; line-height:1.1; font-weight:800; letter-spacing:-.8px; color:#fff;')}>{s.value}</span>
            {s.extra && <span style={css('font-size:13.5px; font-weight:800; color:#8fb4ff;')}>{s.extra}</span>}
          </div>
          <div style={css('margin-top:6px; font-size:12px; line-height:1.5; color:#b9c7e8; text-wrap:pretty;')}>{s.label}</div>
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
/** A part the owner hasn't filled in yet (AI Exhibition booths): one quiet line. */
export function NoInfo({ t }) {
  return <div style={css('font-size:13px; color:#94a3b8;')}>{t('Chưa có thông tin')}</div>
}

export function NumBadge({ n, size = 28 }) {
  return (
    <span aria-hidden="true" style={css(`flex:none; display:inline-flex; align-items:center; justify-content:center; width:${size}px; height:${size}px; border-radius:50%; background:radial-gradient(circle at 35% 30%, #7FA8FF 0%, #2c5fff 60%, #1B3FCC 100%); color:#fff; font-size:${Math.round(size * 0.46)}px; font-weight:800; line-height:1; box-shadow:0 0 0 3px rgba(44,95,255,.18), 0 0 18px rgba(80,130,255,.75);`)}>{n}</span>
  )
}

/** Numbered section heading + white card. */
export function Section({ id, num, title, sub, children, bare = false }) {
  return (
    <section id={id} data-toc style={css('scroll-margin-top:84px; margin-top:18px;')}>
      <div style={css('display:flex; align-items:center; gap:10px; margin-bottom:12px; flex-wrap:wrap;')}>
        {num && <NumBadge n={num} />}
        <h2 style={css('margin:0; font-size:20px; font-weight:800; letter-spacing:-.4px; color:#fff;')}>{title}</h2>
        {sub && <span style={css('font-size:12.5px; color:#8b98b8;')}>{sub}</span>}
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
          <div style={css('font-size:13.5px; line-height:1.6; color:#1E293B; text-wrap:pretty;')}><Fill text={v} /></div>
        </div>
      ))}
    </div>
  )
}

/** Bài toán | Giải pháp side by side in one card (one column when narrow), Số liệu & hình ảnh below. */
export function ProblemSolution({ problem, solution, result, showEmpty = false, t, num: partNum }) {
  // One card, two columns: Bài toán (red) | Giải pháp (green); Số liệu & hình ảnh across the bottom.
  const hasProblem = !!(problem.text || problem.bullets.length) || showEmpty
  const head = (title, color) => <div style={css(SUB + `color:${color};`)}>{title}</div>
  const body = 'margin:0 0 10px; font-size:13px; line-height:1.6; color:#3A4757; text-wrap:pretty;'
  return (
    <Section id="uc-problem" num={partNum} title={t('Bài toán & giải pháp')} bare>
      <div style={css(CARD)}>
        <div className={hasProblem ? 'zp-ps2' : undefined}>
          {hasProblem && (
            <div style={{ minWidth: 0 }}>
              {head(t('Bài toán'), '#C81E1E')}
              {problem.text && (problem.rich
                ? <div style={css(body)}><RichText text={problem.text} /></div>
                : <p style={css(body + 'white-space:pre-line;')}><Fill text={problem.text} /></p>)}
              {problem.bullets.length > 0 && <BulletList items={problem.bullets} dot="#E0353F" />}
              {showEmpty && !problem.text && !problem.bullets.length && <NoInfo t={t} />}
            </div>
          )}
          <div className={hasProblem ? 'zp-ps2-sol' : undefined} style={{ minWidth: 0 }}>
            {head(t('Giải pháp'), '#00893F')}
            {solution.analogy && <div style={css('margin:0 0 14px; padding:10px 14px; border-radius:12px; background:#F4F7FE; font-size:12.5px; line-height:1.6; color:#1E3A7A;')}><b>{t('Hiểu đơn giản')}:</b> <Fill text={String(solution.analogy).replace(/^\s*hiểu đơn giản\s*[:：]\s*/i, '')} /></div>}
            {solution.text && (solution.rich
              ? <div style={css(body)}><RichText text={solution.text} /></div>
              : <p style={css(body + 'white-space:pre-line;')}><Fill text={solution.text} /></p>)}
            <BulletList items={solution.steps} numbered />
            <Images images={solution.images} />
            {showEmpty && !solution.text && !solution.steps.length && <NoInfo t={t} />}
          </div>
        </div>
        {result && (
          <div style={css('margin-top:18px; padding-top:18px; border-top:1px solid #EEF1F7;')}>
            {/* not "Kết quả": the AI Exhibition's Giải pháp text often ends with its own "Kết quả:" */}
            <div style={css(SUB2 + 'display:flex; align-items:center; gap:8px;')}>{t('Số liệu & hình ảnh')}<span style={css('width:7px; height:7px; border-radius:50%; background:#2c5fff;')}></span></div>
            <ResultBody r={result} t={t} />
          </div>
        )}
      </div>
      {problem.tables.map((tb, i) => <div key={i} style={{ marginTop: 18 }}>{isNumericTable(tb) ? <div style={css(CARD)}><BarTable table={tb} t={t} /></div> : <PlainTable table={tb} />}</div>)}
    </Section>
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
      <div style={css(SUB2 + 'margin-bottom:4px;')}>{table.title}</div>
      {table.note && <div style={css('font-size:12px; line-height:1.5; color:#64748b; margin-bottom:14px;')}>{table.note}</div>}
      <div style={css('display:flex; flex-direction:column; gap:12px;')}>
        {rows.map((r, i) => (
          <div key={i}>
            <div style={css('display:flex; justify-content:space-between; gap:12px; font-size:12.5px; line-height:1.4;')}>
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
        <button onClick={() => setAll(!all)} aria-expanded={all} className={hoverClass('background:#F2F6FF !important;')} style={css('margin-top:16px; align-self:flex-start; height:34px; padding:0 14px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#2c5fff; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer;')}>
          {all ? t('Thu gọn') : t('Xem tất cả') + ` (${table.rows.length})`}
        </button>
      )}
    </div>
  )
}

export function PlainTable({ table, flat = false, tone }) {
  const red = tone === 'danger'
  return (
    <div style={css(flat ? '' : CARD)}>
      {table.title && <div style={css(SUB2 + 'margin-bottom:4px;')}><Fill text={table.title} /></div>}
      {table.note && <div style={css('font-size:12px; color:#64748b; margin-bottom:12px;')}><Fill text={table.note} /></div>}
      <div style={css(`overflow-x:auto; border:1px solid ${red ? '#F5C9CB' : '#E6EBF3'}; border-radius:12px; background:#fff;`)}>
        <table style={css('width:100%; border-collapse:collapse; font-size:12.5px;')}>
          <thead>
            <tr>{table.cols.map((c, ci) => <th key={ci} style={css(`padding:10px 12px; text-align:left; font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:${red ? '#C0262D' : '#2c5fff'}; background:${red ? '#FFF0F0' : '#F4F7FE'}; border-bottom:1px solid #E6EBF3;`)}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={css(`padding:11px 12px; border-top:${ri ? '1px solid #F1F4FA' : 'none'}; font-size:12.5px; line-height:1.55; color:${ci === 0 ? '#0F172A' : '#3A4757'}; font-weight:${ci === 0 ? 600 : 400}; vertical-align:top; white-space:pre-line;`)}><Fill text={cell} /></td>)}</tr>
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
              {h.label && <div style={css('margin-top:3px; font-size:12.5px; line-height:1.45; color:#2F4A3C;')}><Fill text={h.label} /></div>}
            </div>
          ))}
        </div>
      )}
      {r.beforeAfter && <PlainTable flat table={{ title: t('Trước / Sau'), note: r.beforeAfter.note, cols: r.beforeAfter.cols, rows: r.beforeAfter.rows }} />}
      {r.bullets.length > 0 && <BulletList items={r.bullets} dot="#00A352" color="#2F4A3C" />}
      {bars.length > 0 && <div className={bars.length > 1 ? 'zp-bars' : ''}>{bars.map((tb, i) => <BarTable key={i} table={tb} t={t} />)}</div>}
      {plain.map((tb, i) => <PlainTable flat key={i} table={tb} />)}
      {r.images && r.images.length > 0 && <Images images={r.images} style={{ marginTop: 0 }} />}
      {r.note && <div style={css('padding:11px 14px; border-radius:12px; background:#F4F7FE; border:1px solid #DCE6FB; font-size:12.5px; line-height:1.55; color:#2A3A57;')}><b>{t('Số đo')}:</b> <Fill text={r.note} /></div>}
    </div>
  )
}

function Collapsible({ title, count, children, defaultOpen = false, dark = false }) {
  return (
    <details open={defaultOpen} className="zp-collapse" style={css(`border:1px solid ${dark ? 'rgba(130,170,255,.24)' : '#E6EBF3'}; border-radius:14px; background:${dark ? 'transparent' : '#fff'}; overflow:hidden;`)}>
      <summary style={css(`display:flex; align-items:center; gap:10px; padding:13px 16px; cursor:pointer; list-style:none; font-size:13.5px; font-weight:800; color:${dark ? '#fff' : '#0F172A'};`)}>
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
        <span style={css(`font-size:12px; font-weight:700; color:${done.size === items.length ? '#00893F' : '#64748b'};`)}>{done.size === items.length ? '✓ ' + t('Đã đủ') : `${done.size}/${items.length} ${t('đã có')}`}</span>
      </div>
      <div style={css('display:flex; flex-direction:column; gap:6px;')}>
        {items.map((text, i) => (
          <label key={i} className={hoverClass('background:#F4F7FE !important;')} style={css(`display:flex; gap:11px; align-items:flex-start; padding:9px 12px; border-radius:12px; border:1px solid ${done.has(i) ? '#CFEEDE' : '#E6EBF3'}; background:${done.has(i) ? '#F2FBF6' : '#fff'}; cursor:pointer;`)}>
            <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} style={css('flex:none; width:17px; height:17px; margin:2px 0 0; accent-color:#00A352; cursor:pointer;')} />
            <span style={css(`font-size:13px; line-height:1.55; color:${done.has(i) ? '#51705F' : '#1E293B'}; ${done.has(i) ? 'text-decoration:line-through; text-decoration-color:#9CCBB0;' : ''}`)}>{text}</span>
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
      {cb.note && <div style={css('margin:-2px 0 8px; font-size:12px; color:#64748b;')}><Fill text={cb.note} /></div>}
      <pre style={css('margin:0; padding:14px 16px; border:1px solid #DDE3EC; border-radius:12px; background:#F7F9FD; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; line-height:1.7; color:#0F172A; white-space:pre-wrap; word-break:break-word;')}><Placeholders text={cb.code} /></pre>
    </div>
  )
}

/** Detailed steps as a journey: the whole path in one row (1 → 2 → 3…), one step's details at a time,
 *  with "Bước trước / Bước tiếp" to walk through. The row scrolls sideways on narrow screens. */
function StepJourney({ sections, t }) {
  const [on, setOn] = useState(0)
  const topRef = useRef(null)
  const go = (i) => {
    setOn(i)
    // keep the row in view when a long step pushed it off the top of the screen
    const el = topRef.current
    if (el && el.getBoundingClientRect().top < 70) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const s = sections[on]
  const last = sections.length - 1
  const navBtn = (primary) => `display:inline-flex; align-items:center; gap:6px; min-height:36px; padding:7px 16px; border-radius:18px; text-align:left; line-height:1.35; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; ${primary
    ? 'border:none; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; box-shadow:0 6px 16px rgba(44,95,255,.3);'
    : 'border:1px solid #D5E0F7; background:#fff; color:#2c5fff;'}`
  return (
    <div ref={topRef} style={css('scroll-margin-top:84px; border:1px solid #D5E0F7; border-radius:16px; overflow:hidden; background:#fff;')}>
      <div role="tablist" aria-label={t('Các bước')} className="zp-journey" style={css('display:flex; padding:14px 10px 12px; background:linear-gradient(180deg,#EEF3FF,#F8FAFF); border-bottom:1px solid #DFE7F8; overflow-x:auto;')}>
        {sections.map((x, i) => {
          const state = i === on ? 'on' : i < on ? 'done' : 'todo'
          return (
            <button
              key={x.id}
              role="tab"
              aria-selected={i === on}
              onClick={() => go(i)}
              style={css('position:relative; flex:1 0 88px; display:flex; flex-direction:column; align-items:center; gap:7px; padding:0 6px; border:none; background:none; cursor:pointer; font-family:inherit;')}
            >
              {/* the line to the next step */}
              {i < last && <span aria-hidden="true" style={css(`position:absolute; top:16px; left:calc(50% + 20px); right:calc(-50% + 20px); height:2px; border-radius:2px; background:${i < on ? '#2c5fff' : '#CFDAF2'};`)}></span>}
              <span style={css(`position:relative; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; ${state === 'on'
                ? 'background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; box-shadow:0 0 0 5px rgba(44,95,255,.16), 0 4px 10px rgba(44,95,255,.35);'
                : state === 'done' ? 'background:#E1E9FF; color:#2c5fff; border:2px solid #2c5fff;' : 'background:#fff; color:#8A9AB8; border:2px solid #CFDAF2;'}`)}>
                {state === 'done'
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                  : i + 1}
              </span>
              <span style={css(`max-width:150px; font-size:12px; line-height:1.35; text-align:center; font-weight:${i === on ? 800 : 600}; color:${i === on ? '#0B1F5C' : '#5B6B86'}; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;`)}>{x.title}</span>
            </button>
          )
        })}
      </div>
      <div role="tabpanel" style={css('padding:16px 18px 18px;')}>
        <div style={css('font-size:10.5px; font-weight:800; letter-spacing:.08em; color:#5B7BD6;')}>{t('BƯỚC')} {on + 1}/{sections.length}</div>
        <div style={css('margin:2px 0 12px; font-size:15px; font-weight:800; line-height:1.35; color:#0F172A;')}>{s.title}</div>
        {s.sub && <div style={css('margin:0 0 12px; font-size:12.5px; color:#64748b;')}>{s.sub}</div>}
        <Blocks blocks={s.blocks} />
        <div style={css('display:flex; align-items:center; gap:10px; margin-top:18px; padding-top:14px; border-top:1px solid #EEF1F7;')}>
          {on > 0 && <button onClick={() => go(on - 1)} style={css(navBtn(false))}>← {t('Bước trước')}</button>}
          {on < last && <button onClick={() => go(on + 1)} style={css(navBtn(true) + 'margin-left:auto;')}>{t('Bước tiếp')}: {sections[on + 1].title} →</button>}
        </div>
      </div>
    </div>
  )
}

/** 5 Tự áp dụng — the one highlighted block: fit, checklist, steps with copyable prompts, what success
 *  looks like, and the common-errors table (always open, in red). */
export function ApplySection({ id, a, t, num = '5' }) {
  const parts = []
  const links = a.links || []
  if (links.length) parts.push(
    <div key="links" style={css('display:flex; flex-wrap:wrap; gap:8px;')}>
      {links.map((l, i) => safeHref(l.href)
        ? <a key={i} href={safeHref(l.href)} target="_blank" rel="noopener" className={hoverClass('background:#E7ECFB !important;')} style={css('display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 13px; border-radius:999px; background:#F1F4FC; border:1px solid #D7E0F7; color:#2c5fff; font-size:12px; font-weight:700; text-decoration:none;')}>{l.kind === 'repo' ? `${t('Repo')} · ${l.label}` : t(l.label)} ↗</a>
        : <span key={i} style={css('display:inline-flex; align-items:center; height:32px; padding:0 13px; border-radius:999px; background:#F7F8FB; border:1px solid #E3E8F2; color:#3A4757; font-size:12px; font-weight:600;')}>{l.kind === 'repo' ? `${t('Repo')}: ${l.label}` : l.label}</span>)}
    </div>,
  )
  if (a.intro) parts.push(<p key="intro" style={css('margin:0; font-size:13.5px; line-height:1.55; color:#1E293B;')}><Fill text={a.intro} /></p>)
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
        {a.stepSections.length > 0 && <StepJourney sections={a.stepSections} t={t} />}
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
  if (a.pitfalls.length || a.pitfallTable) parts.push(
    // Always open and in red: the mistakes are what readers most need to see before they start.
    <div key="errors" style={css('padding:14px 16px 16px; border-radius:14px; border:1px solid #F5C2C2; background:#FFF5F5;')}>
      <div style={css(SUB + 'display:flex; align-items:center; gap:8px; color:#C81E1E;')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
        {t('Lỗi hay gặp')}
      </div>
      {a.pitfallTable
        ? <Blocks blocks={a.pitfallTable} />
        : a.pitfalls.some((p) => p.fix)
          ? a.pitfalls.some((p) => p.why)
            ? <PlainTable flat tone="danger" table={{ cols: [t('Bạn gặp'), t('Vì sao'), t('Nói gì với AI / làm gì')], rows: a.pitfalls.map((p) => [p.meet, p.why || '—', p.fix || '—']) }} />
            : <PlainTable flat tone="danger" table={{ cols: [t('Bạn gặp'), t('Cách xử lý')], rows: a.pitfalls.map((p) => [p.meet, p.fix || '—']) }} />
          : <PlainTable flat tone="danger" table={{ cols: [t('Bạn gặp'), t('Vì sao')], rows: a.pitfalls.map((p) => [p.meet, p.why || '—']) }} />}
    </div>,
  )
  return (
    <Section id="uc-apply" num={num} title={t(a.title)}>
      <PromptTargetContext.Provider value={a.promptTarget || ''}>
        <div style={css('display:flex; flex-direction:column; gap:22px; color-scheme:light;')}>{parts}</div>
      </PromptTargetContext.Provider>
    </Section>
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
            style={css(`display:block; padding:6px 12px; border-left:2px solid ${on ? (it.hot ? '#5b8cff' : '#8fb4ff') : 'rgba(130,170,255,.18)'}; color:${on ? '#fff' : '#a9b8dc'}; font-size:12.5px; font-weight:${on || it.hot ? 700 : 500}; line-height:1.4; text-decoration:none;`)}
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
      style={css(`position:fixed; ${pos} z-index:1500; display:inline-flex; align-items:center; justify-content:center; gap:8px; height:38px; ${pill ? 'width:116px;' : 'width:38px;'} padding:0; border:1px solid rgba(130,170,255,.45); border-radius:999px; background:rgba(9,18,58,.9); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); color:#fff; font-family:inherit; font-size:12.5px; font-weight:700; cursor:pointer; box-shadow:0 10px 28px rgba(0,0,0,.45); transition:opacity .18s, background .15s; opacity:${show ? 1 : 0}; pointer-events:${show ? 'auto' : 'none'}; ${pill || round ? 'transform:translateY(-50%);' : ''}`)}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
      {pill && t('Quay lại')}
    </button>,
    document.body,
  )
}
