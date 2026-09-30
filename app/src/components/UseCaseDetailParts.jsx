import { useRef, useState } from 'react'
import { css, hoverClass } from '../lib/style.js'
import ImageSlot from './ImageSlot.jsx'

// Building blocks of the use case detail page: one info row, highlight numbers, problem → solution,
// result + limits, numeric tables as bars, and a tabbed deep dive. Every block sits in the same
// column (DETAIL_COL) so edges line up from the title down to the comments.

export const DETAIL_COL = 'max-width:960px; margin:0 auto;'
export const CARD = 'border:1px solid #E6EBF3; border-radius:20px; background:#ffffff; box-shadow:0 14px 34px rgba(8,16,40,.30); padding:24px 26px;'
const H3 = 'font-size:17px; font-weight:800; color:#0F172A;'

const DIFF = { 'Dễ': ['#4ADE80', 1], 'Trung bình': ['#FBBF24', 2], 'Khó': ['#F87171', 3] }
const STATUS_VI = { inuse: ['Đang dùng thật', '#4ADE80'], pilot: ['Pilot', '#7FB2FF'], planning: ['Ý tưởng', '#FBBF24'], prototype: ['Prototype', '#FBBF24'] }

export function BulletList({ items, dot = '#9FB6E8', color = '#3A4757', numbered = false }) {
  return (
    <div style={css('display:flex; flex-direction:column; gap:11px;')}>
      {items.map((it, i) => numbered ? (
        <div key={i} style={css('display:flex; gap:12px; align-items:flex-start;')}>
          <span style={css('flex:none; width:26px; height:26px; border-radius:50%; background:#E7ECFB; border:1px solid #B9CCF8; color:#2c5fff; display:flex; align-items:center; justify-content:center; font-size:12.5px; font-weight:800;')}>{i + 1}</span>
          <span style={css(`font-size:14px; line-height:1.65; color:${color}; text-wrap:pretty;`)}>{it.text}</span>
        </div>
      ) : (
        <div key={i} style={css(`display:flex; gap:10px; font-size:14px; line-height:1.65; color:${color}; text-wrap:pretty;`)}>
          <span style={css(`flex:none; margin-top:8px; width:6px; height:6px; border-radius:50%; background:${dot};`)}></span>{it.text}
        </div>
      ))}
    </div>
  )
}

/** Tác giả · Category · Dành cho · Độ khó · Trạng thái — one horizontal row (stacks on phones). */
export function InfoRow({ author, avatarBg, name, team, category, audience, difficulty, status, statusText, statusNote, contact, t }) {
  const label = (text) => <div style={css('font-size:11px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#8fa6d8; margin-bottom:6px;')}>{text}</div>
  const value = 'font-size:13.5px; font-weight:700; line-height:1.45; color:#fff;'
  const diff = DIFF[difficulty]
  const [stLabel, stColor] = statusText ? [statusText, '#4ADE80'] : STATUS_VI[status] || STATUS_VI.inuse
  return (
    <div style={css('margin-top:22px; border-radius:18px; background:rgba(255,255,255,.06); border:1px solid rgba(130,170,255,.24); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); overflow:hidden;')}>
      <div className="zp-info-row">
        <div>
          {label(t('Tác giả'))}
          <div style={css('display:flex; align-items:center; gap:10px; min-width:0;')}>
            <span style={css(`width:34px; height:34px; border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:#fff; background:${avatarBg}`)}>{author.slice(0, 1).toUpperCase()}</span>
            <div style={css('min-width:0;')}>
              <div style={css(value + 'font-size:14px;')}>{name}</div>
              <div style={css('font-size:12px; color:#a9b8dc;')}>{team}</div>
            </div>
          </div>
        </div>
        <div>{label(t('Category'))}<div style={css(value)}>{category || '—'}</div></div>
        <div>{label(t('Dành cho'))}<div style={css(value + 'font-weight:600;')}>{audience || '—'}</div></div>
        <div>
          {label(t('Độ khó'))}
          {diff ? (
            <div style={css('display:flex; align-items:center; gap:8px;')}>
              <span style={css('display:flex; gap:3px;')} aria-hidden="true">
                {[1, 2, 3].map((n) => <span key={n} style={css(`width:7px; height:14px; border-radius:3px; background:${n <= diff[1] ? diff[0] : 'rgba(255,255,255,.16)'};`)}></span>)}
              </span>
              <span style={css(`font-size:13.5px; font-weight:800; color:${diff[0]};`)}>{t(difficulty)}</span>
            </div>
          ) : <div style={css(value)}>—</div>}
        </div>
        <div>
          {label(t('Trạng thái'))}
          <div style={css('display:flex; align-items:center; gap:7px;')}>
            <span style={css(`width:8px; height:8px; border-radius:50%; flex:none; background:${stColor}; box-shadow:0 0 8px ${stColor};`)}></span>
            <span style={css(value)}>{t(stLabel)}</span>
          </div>
          {statusNote && <div style={css('margin-top:4px; font-size:12px; line-height:1.45; color:#a9b8dc;')}>{statusNote}</div>}
        </div>
      </div>
      {contact && (
        <div style={css('padding:11px 18px; border-top:1px solid rgba(130,170,255,.16); font-size:12.5px; line-height:1.55; color:#c3d0f0;')}>
          <span style={css('font-weight:800; color:#8fb4ff;')}>{t('Liên hệ')}: </span>{contact}
        </div>
      )}
    </div>
  )
}

/** Up to three headline numbers under the info row. */
export function StatTiles({ stats }) {
  if (!stats || !stats.length) return null
  return (
    <div className="zp-stats" style={{ marginTop: 14 }}>
      {stats.map((s, i) => (
        <div key={i} style={css('padding:16px 18px; border-radius:16px; background:linear-gradient(180deg, rgba(44,95,255,.16), rgba(44,95,255,.06)); border:1px solid rgba(130,170,255,.26);')}>
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

/** Bài toán → Giải pháp side by side (red vs green edge), stacked on phones with the arrow pointing down. */
export function ProblemSolution({ problem, pains, steps, t }) {
  return (
    <div className="zp-ps">
      <div style={css(CARD + 'border-color:#F4C5C9; border-top:4px solid #E0353F;')}>
        <div style={css(H3 + 'margin-bottom:12px; display:flex; align-items:center; gap:8px;')}><span style={css('color:#E0353F;')}>●</span>{t('Bài toán')}</div>
        {problem && <p style={css('margin:0 0 14px; font-size:14px; line-height:1.65; color:#3A4757; text-wrap:pretty;')}>{problem}</p>}
        {pains.length > 0 && <BulletList items={pains} dot="#E0353F" />}
      </div>
      <div className="zp-ps-arrow" aria-hidden="true">
        <span style={css('width:40px; height:40px; border-radius:50%; background:#0f1a3a; border:1px solid rgba(130,170,255,.4); color:#cfe0ff; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,.4);')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>
        </span>
      </div>
      <div style={css(CARD + 'border-color:#BFE8D2; border-top:4px solid #00A352;')}>
        <div style={css(H3 + 'margin-bottom:14px; display:flex; align-items:center; gap:8px;')}><span style={css('color:#00A352;')}>●</span>{t('Giải pháp')}</div>
        <BulletList items={steps} numbered />
      </div>
    </div>
  )
}

/** Kết quả across the full width, with Giới hạn & lưu ý beside it (below it on narrow screens). */
export function ResultCard({ results, limits, t }) {
  if (!results.length && !limits.length) return null
  return (
    <div style={css(CARD + 'margin-top:18px;')}>
      <div className={limits.length && results.length ? 'zp-result' : ''}>
        {results.length > 0 && (
          <div>
            <div style={css(H3 + 'margin-bottom:14px;')}>{t('Kết quả')}</div>
            <BulletList items={results} dot="#00A352" color="#2F4A3C" />
          </div>
        )}
        {limits.length > 0 && (
          <div style={css('padding:16px 18px; border-radius:14px; background:#FFF8E8; border:1px solid #F3E0B0; align-self:start;')}>
            <div style={css('font-size:13px; font-weight:800; color:#B45300; margin-bottom:10px;')}>{t('Giới hạn & lưu ý')}</div>
            <BulletList items={limits} dot="#E39100" color="#5A4522" />
          </div>
        )}
      </div>
    </div>
  )
}

const pctOf = (s) => parseFloat(String(s).replace('%', '').replace(',', '.'))
/** A 3-column table of label · count · percent — shown as horizontal bars instead of rows. */
function isNumericTable(tb) {
  return tb.cols.length === 3 && tb.rows.length > 1 && tb.rows.every((r) => /^[\d.,\s]+$/.test(String(r[1])) && /%\s*$/.test(String(r[2])) && !Number.isNaN(pctOf(r[2])))
}

export function BarTable({ table, t, limit = 5 }) {
  const [all, setAll] = useState(false)
  const max = Math.max(...table.rows.map((r) => pctOf(r[2])))
  const rows = all ? table.rows : table.rows.slice(0, limit)
  return (
    <div style={css(CARD + 'padding:22px 22px 18px; display:flex; flex-direction:column;')}>
      <div style={css(H3 + 'font-size:16px; margin-bottom:4px;')}>{table.title}</div>
      {table.note && <div style={css('font-size:12.5px; line-height:1.5; color:#64748b; margin-bottom:16px;')}>{table.note}</div>}
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

export function PlainTable({ table }) {
  return (
    <div style={css(CARD)}>
      <div style={css(H3 + 'font-size:16px; margin-bottom:4px;')}>{table.title}</div>
      {table.note && <div style={css('font-size:12.5px; color:#64748b; margin-bottom:14px;')}>{table.note}</div>}
      <div style={css('overflow-x:auto;')}>
        <table style={css('width:100%; border-collapse:collapse; font-size:13px;')}>
          <thead>
            <tr>{table.cols.map((c, ci) => <th key={ci} style={css('padding:10px 12px; text-align:left; font-size:11px; font-weight:800; letter-spacing:.06em; color:#2c5fff; background:#F4F7FE; border-bottom:1px solid #E6EBF3;')}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={css('padding:11px 12px; border-bottom:1px solid #F1F4FA; font-size:13px; line-height:1.55; color:#3A4757; vertical-align:top;')}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Numeric tables two by two as bars, other tables full width. */
export function DetailTables({ tables, t }) {
  if (!tables.length) return null
  const bars = tables.filter(isNumericTable)
  const plain = tables.filter((tb) => !isNumericTable(tb))
  return (
    <div style={css('display:flex; flex-direction:column; gap:18px; margin-top:18px;')}>
      {bars.length > 0 && <div className={bars.length > 1 ? 'zp-bars' : ''}>{bars.map((tb, i) => <BarTable key={i} table={tb} t={t} />)}</div>}
      {plain.map((tb, i) => <PlainTable key={i} table={tb} />)}
    </div>
  )
}

/** Chuẩn bị · Các bước · Prompt & lệnh · Lỗi phổ biến · Bảo mật · Hình ảnh — one card with tabs. */
export function DeepDive({ prep, steps, success, code, pitfalls, security, gallery, t }) {
  const tabs = [
    prep.length && { key: 'prep', label: t('Chuẩn bị') },
    steps.length && { key: 'steps', label: t('Các bước') },
    code.length && { key: 'code', label: t('Prompt & lệnh') },
    pitfalls.length && { key: 'pitfalls', label: t('Lỗi phổ biến') },
    security.length && { key: 'security', label: t('Bảo mật') },
    gallery.length && { key: 'gallery', label: t('Hình ảnh') },
  ].filter(Boolean)
  const [tab, setTab] = useState(tabs[0]?.key)
  const listRef = useRef(null)
  if (!tabs.length) return null
  const cur = tabs.find((x) => x.key === tab) ? tab : tabs[0].key
  const onKey = (e) => {
    const i = tabs.findIndex((x) => x.key === cur)
    const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1
    if (next < 0) return
    e.preventDefault()
    setTab(tabs[next].key)
    listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus()
  }
  return (
    <>
      <div style={css('display:flex; align-items:baseline; gap:12px; margin:34px 0 14px;')}>
        <h2 style={css('margin:0; font-size:24px; font-weight:800; letter-spacing:-.4px; color:#fff;')}>Deep dive</h2>
        <span style={css('font-size:13px; color:#8b98b8;')}>{t('Làm theo từng bước')}</span>
      </div>
      <div style={css(CARD + 'padding:0; overflow:hidden;')}>
        <div ref={listRef} role="tablist" aria-label="Deep dive" onKeyDown={onKey} style={css('display:flex; gap:4px; padding:10px 12px 0; border-bottom:1px solid #E6EBF3; overflow-x:auto; scrollbar-width:none;')}>
          {tabs.map((x) => {
            const on = x.key === cur
            return (
              <button
                key={x.key}
                role="tab"
                id={'dd-tab-' + x.key}
                aria-selected={on}
                aria-controls={'dd-panel-' + x.key}
                tabIndex={on ? 0 : -1}
                onClick={() => setTab(x.key)}
                className={on ? undefined : hoverClass('color:#0F172A !important;')}
                style={css(`flex:none; height:42px; padding:0 14px; border:none; border-bottom:2.5px solid ${on ? '#2c5fff' : 'transparent'}; margin-bottom:-1px; background:none; color:${on ? '#2c5fff' : '#64748b'}; font-family:inherit; font-size:13.5px; font-weight:${on ? 800 : 600}; cursor:pointer; white-space:nowrap;`)}
              >
                {x.label}
              </button>
            )
          })}
        </div>
        <div role="tabpanel" id={'dd-panel-' + cur} aria-labelledby={'dd-tab-' + cur} style={css('padding:24px 26px;')}>
          {cur === 'prep' && <BulletList items={prep} dot="#2c5fff" />}
          {cur === 'steps' && (
            <>
              <BulletList items={steps} numbered />
              {success.length > 0 && (
                <div style={css('margin-top:18px; padding:14px 16px; border-radius:12px; background:#F2FBF6; border:1px solid #CFEEDE;')}>
                  <div style={css('font-size:12.5px; font-weight:800; color:#00893F; margin-bottom:8px;')}>{t('Biết là thành công khi')}</div>
                  <BulletList items={success} dot="#00A352" />
                </div>
              )}
            </>
          )}
          {cur === 'code' && (
            <div style={css('display:flex; flex-direction:column; gap:18px;')}>
              {code.map((cb, ci) => (
                <div key={ci}>
                  <div style={css('display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px;')}>
                    <span style={css('font-size:12px; font-weight:800; letter-spacing:.07em; color:#2c5fff;')}>{cb.title}</span>
                    <button onClick={cb.onCopy} className={hoverClass('background:#F2F6FF; border-color:#B9CCF8;')} style={css('display:inline-flex; align-items:center; gap:7px; height:32px; padding:0 14px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer;')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>
                      {cb.copyLabel}
                    </button>
                  </div>
                  <pre style={css('margin:0; padding:16px 18px; border:1px solid #DDE3EC; border-radius:12px; background:#F7F9FD; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12.5px; line-height:1.7; color:#0F172A; white-space:pre-wrap; word-break:break-word;')}>{cb.code}</pre>
                </div>
              ))}
            </div>
          )}
          {cur === 'pitfalls' && <BulletList items={pitfalls} dot="#E39100" />}
          {cur === 'security' && <BulletList items={security} dot="#6F0CE2" />}
          {cur === 'gallery' && (
            <div className="zp-gallery">
              {gallery.map((g) => (
                <div key={g.id}>
                  <div style={css('position:relative; aspect-ratio:16/9; border-radius:14px; overflow:hidden; border:1px solid #E6EBF3; background:#eef2f9;')}>
                    <ImageSlot id={g.id} shape="rect" placeholder={g.placeholder} />
                  </div>
                  <div style={css('margin-top:9px; font-size:12.5px; color:#64748b;')}>{g.caption}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
