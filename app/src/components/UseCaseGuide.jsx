import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { copyWithToast } from '../lib/clipboard.js'
import { css, hoverClass } from '../lib/style.js'
import Fill from './Fill.jsx'

// Building blocks for step-by-step use case content: prompts with Copy, mock AI result windows,
// tables, coloured notes, tool tabs and click-to-zoom images (used by the detail page's part 5).

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'
const MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace'
const TONES = {
  info: { bg: '#EEF3FF', border: '#CFDDFB', title: '#1E44A8', text: '#2A3A57', icon: 'i' },
  warn: { bg: '#FFF8E8', border: '#F3E0B0', title: '#B45300', text: '#5A4522', icon: '!' },
  danger: { bg: '#FFF0F0', border: '#F5C9CB', title: '#C0262D', text: '#5C1D20', icon: '!' },
  ok: { bg: '#F2FBF6', border: '#CFEEDE', title: '#00893F', text: '#1F4B33', icon: '✓' },
}


export function CopyButton({ text, small }) {
  const [state, setState] = useState('')
  const done = (s) => { setState(s); setTimeout(() => setState(''), 1600) }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); copyWithToast(text).then(() => done('Đã copy')) }}
      className={hoverClass('background:#EEF3FF !important; border-color:#B9CCF8 !important;')}
      style={css(`flex:none; display:inline-flex; align-items:center; gap:6px; height:${small ? 26 : 30}px; padding:0 ${small ? 10 : 12}px; border:1px solid ${state === 'Đã copy' ? '#BEE9D3' : '#DDE3EC'}; border-radius:999px; background:${state === 'Đã copy' ? '#E7F9F0' : '#fff'}; color:${state === 'Đã copy' ? '#00893F' : '#3A4757'}; font:700 ${small ? 11.5 : 12}px ${FONT}; cursor:pointer;`)}
    >
      {state === 'Đã copy'
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>}
      {state || 'Copy'}
    </button>
  )
}

const Label = ({ children }) => <div style={css(`font:700 12.5px ${FONT}; color:#64748b; margin-bottom:8px;`)}>{children}</div>
const SubTitle = ({ children }) => <div style={css(`font:800 14.5px ${FONT}; color:#0F172A; margin-bottom:8px;`)}>{children}</div>

/** Marks the parts of a prompt the reader has to change: [ngoặc vuông] and <tên_bạn>. */
export function Placeholders({ text }) {
  return String(text).split(/(\[[^\]\n]+\]|<[^>\n]+>)/).map((part, i) => (i % 2
    ? <mark key={i} title="Sửa chỗ này cho đúng với bạn" style={{ background: '#FFF1BF', color: '#7A4B00', borderRadius: 4, padding: '0 2px' }}>{part}</mark>
    : part))
}

export function Prompt({ b }) {
  return (
    <div>
      {b.label && <Label>{b.label}</Label>}
      <div style={css('border:1px solid #CFDDFB; border-radius:14px; background:linear-gradient(180deg,#F5F8FF,#EEF3FF); overflow:hidden;')}>
        <div style={css('display:flex; align-items:center; gap:8px; padding:8px 10px 8px 14px; border-bottom:1px solid #DCE6FB;')}>
          <span style={css(`display:inline-flex; align-items:center; gap:6px; font:800 11px ${FONT}; letter-spacing:.08em; color:#2c5fff;`)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            PROMPT
          </span>
          <span style={css(`font:500 11.5px ${FONT}; color:#64748b;`)}>gửi cho Claude Code / Codex / Cursor</span>
          <span style={{ flex: 1 }}></span>
          <CopyButton text={b.text} />
        </div>
        <pre style={css(`margin:0; padding:14px 16px; font:500 13px/1.7 ${MONO}; color:#0F172A; white-space:pre-wrap; word-break:break-word;`)}><Placeholders text={b.text} /></pre>
      </div>
    </div>
  )
}

// A mock terminal window — stands in for a screenshot of what the AI prints back.
function Result({ b }) {
  const width = Math.max(0, ...(b.lines || []).map((l) => l[0].length))
  return (
    <div>
      {b.label && <Label>{b.label}</Label>}
      <div style={css('border-radius:14px; overflow:hidden; background:#0B1226; border:1px solid #1E2A4A; box-shadow:0 12px 30px rgba(8,16,40,.25);')}>
        <div style={css('display:flex; align-items:center; gap:7px; padding:10px 14px; background:#131C36; border-bottom:1px solid #1E2A4A;')}>
          <span style={css('width:10px; height:10px; border-radius:50%; background:#FF5F57;')}></span>
          <span style={css('width:10px; height:10px; border-radius:50%; background:#FEBC2E;')}></span>
          <span style={css('width:10px; height:10px; border-radius:50%; background:#28C840;')}></span>
          <span style={css(`margin-left:8px; font:600 12px ${MONO}; color:#8FA3CC; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{b.title}</span>
        </div>
        <div style={css(`padding:14px 16px; font:500 13px/1.75 ${MONO}; color:#C9D6F5; white-space:pre-wrap; word-break:break-word;`)}>
          {b.code
            ? b.code
            : b.lines.map(([k, v, tone], i) => (
              <div key={i} style={css('display:flex; gap:10px;')}>
                <span style={css(`flex:none; color:#7F93BF; min-width:${Math.min(width, 16)}ch;`)}>{k}</span>
                <span style={css('flex:none; color:#56658C;')}>:</span>
                <span style={css(`min-width:0; ${tone === 'ok' ? 'color:#4ADE80; font-weight:700;' : tone === 'fail' ? 'color:#F87171; font-weight:700;' : tone === 'link' ? 'color:#7FB2FF; text-decoration:underline;' : ''}`)}>{v}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function Table({ b }) {
  return (
    <div>
      {b.title && <SubTitle>{b.title}</SubTitle>}
      <div style={css('border:1px solid #E6EBF3; border-radius:14px; overflow:hidden;')}>
        <table style={css('width:100%; border-collapse:collapse;')}>
          <thead>
            <tr>{b.cols.map((c, i) => <th key={i} style={css(`padding:10px 14px; text-align:left; font:800 11px ${FONT}; letter-spacing:.06em; text-transform:uppercase; color:#2c5fff; background:#F4F7FE; border-bottom:1px solid #E6EBF3;`)}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {b.rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 ? '#FBFCFE' : '#fff' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={css(`padding:11px 14px; border-top:${ri ? '1px solid #F1F4FA' : 'none'}; font:${ci === 0 ? 600 : 400} 13.5px/1.55 ${FONT}; color:${ci === 0 ? '#0F172A' : '#3A4757'}; vertical-align:top;`)}>
                    {b.copyCol === ci && !String(cell).startsWith('—')
                      ? (
                        <div style={css('display:flex; align-items:flex-start; gap:8px;')}>
                          <span style={css(`flex:1; min-width:0; padding:7px 10px; border-radius:10px; background:#EEF3FF; border:1px solid #DCE6FB; font:500 12.5px/1.55 ${MONO}; color:#1E2A4A;`)}>{cell}</span>
                          <CopyButton text={cell} small />
                        </div>
                      )
                      : <Fill text={String(cell).replace(/^— /, '')} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Note({ b }) {
  const tn = TONES[b.tone] || TONES.info
  return (
    <div style={css(`display:flex; gap:12px; padding:13px 16px; border-radius:14px; background:${tn.bg}; border:1px solid ${tn.border};`)}>
      <span style={css(`flex:none; width:22px; height:22px; border-radius:50%; background:${tn.title}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px ${FONT}; margin-top:1px;`)}>{tn.icon}</span>
      <div style={css(`font:400 13.5px/1.6 ${FONT}; color:${tn.text};`)}>
        {b.title && <div style={css(`font:800 13.5px ${FONT}; color:${tn.title}; margin-bottom:2px;`)}>{b.title}</div>}
        <Fill text={b.text} />
      </div>
    </div>
  )
}

function Tabs({ b }) {
  const [on, setOn] = useState(0)
  return (
    <div>
      <div style={css('display:inline-flex; flex-wrap:wrap; gap:4px; padding:4px; border-radius:999px; background:#EDF0FA; margin-bottom:10px;')}>
        {b.tabs.map((tb, i) => (
          <button key={tb.label} onClick={() => setOn(i)} style={css(`height:32px; padding:0 14px; border:none; border-radius:999px; cursor:pointer; font:700 12.5px ${FONT}; background:${on === i ? '#fff' : 'transparent'}; color:${on === i ? '#2c5fff' : '#3A4757'}; ${on === i ? 'box-shadow:0 2px 8px rgba(30,50,90,.12);' : ''}`)}>
            {tb.label}
          </button>
        ))}
      </div>
      <Blocks blocks={b.tabs[on].blocks} />
    </div>
  )
}

function Block({ b }) {
  switch (b.type) {
    case 'text':
      return (
        <div>
          {b.title && <SubTitle>{b.title}</SubTitle>}
          <p style={css(`margin:0; font:400 14px/1.7 ${FONT}; color:#3A4757; text-wrap:pretty; white-space:pre-line;`)}><Fill text={b.text} /></p>
        </div>
      )
    case 'bullets':
      return (
        <div style={css('display:flex; flex-direction:column; gap:9px;')}>
          {b.items.map((it, i) => (
            <div key={i} style={css(`display:flex; gap:10px; font:400 14px/1.65 ${FONT}; color:#3A4757;`)}>
              <span style={css(`flex:none; margin-top:8px; width:6px; height:6px; border-radius:50%; background:${b.tone === 'danger' ? '#E0353F' : '#2c5fff'};`)}></span><span><Fill text={it} /></span>
            </div>
          ))}
        </div>
      )
    case 'steps': {
      // A block titled "Bước 2 · …" details step 2 of the overview list above it: number its items
      // 2.1, 2.2… so they don't read as the same steps starting over at 1.
      const parent = /^Bước\s*(\d+)/i.exec(b.title || '')
      const num = (i) => (parent ? `${parent[1]}.${i + 1}` : i + 1)
      return (
        <div>
          {b.title && <SubTitle>{b.title}</SubTitle>}
          <div style={css('display:flex; flex-direction:column; gap:10px;')}>
            {b.items.map((it, i) => (
              <div key={i} style={css('display:flex; gap:12px; align-items:flex-start;')}>
                <span style={css(`flex:none; min-width:24px; height:24px; padding:0 ${parent ? 6 : 0}px; box-sizing:border-box; border-radius:999px; background:${parent ? '#F4F7FE' : '#E7ECFB'}; border:1px solid ${parent ? '#DCE6FB' : '#B9CCF8'}; color:#2c5fff; display:flex; align-items:center; justify-content:center; font:800 ${parent ? 11 : 12}px ${FONT};`)}>{num(i)}</span>
                <span style={css(`font:400 14px/1.65 ${FONT}; color:#3A4757; text-wrap:pretty;`)}><Fill text={it} /></span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    case 'file':
      return (
        <div style={css('display:flex; align-items:center; gap:14px; padding:14px 16px; border:1px dashed #B9CCF8; border-radius:14px; background:#F7F9FF;')}>
          <span style={css('flex:none; width:44px; height:44px; border-radius:12px; background:linear-gradient(160deg,#4480ff,#2c5fff); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 18px rgba(44,95,255,.3);')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.33 3.33 0 0 1 4.71 4.71l-9.2 9.19a1.67 1.67 0 0 1-2.36-2.36l8.49-8.48"></path></svg>
          </span>
          <div style={css('min-width:0;')}>
            <div style={css(`font:700 14px ${MONO}; color:#0F172A;`)}>{b.name}</div>
            <div style={css(`margin-top:2px; font:400 12.5px ${FONT}; color:#64748b;`)}>{b.sub}</div>
          </div>
        </div>
      )
    case 'image': return <div className="zp-thumbs"><Figure img={b} /></div>
    case 'prompt': return <Prompt b={b} />
    case 'result': return <Result b={b} />
    case 'table': return <Table b={b} />
    case 'note': return <Note b={b} />
    case 'tabs': return <Tabs b={b} />
    default: return null
  }
}

/** An original screenshot/diagram from the source doc as a small thumbnail; click opens it large
 *  in a popup, and a click anywhere (or Esc) closes it again. */
export function Figure({ img }) {
  const [open, setOpen] = useState(false)
  // Landscape images are shown whole (never cropped) at the column's full width; tall screenshots
  // get a capped preview from the top. Never stretched past their real size.
  const [dims, setDims] = useState(null)
  const tall = dims && dims.h > dims.w * 1.15
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])
  return (
    <figure style={{ margin: 0, minWidth: 0 }}>
      <button type="button" onClick={() => setOpen(true)} title="Bấm để xem ảnh lớn" className={hoverClass('border-color:#B9CCF8 !important; box-shadow:0 8px 22px rgba(44,95,255,.18) !important;')} style={css('display:block; width:100%; padding:0; border:1px solid #E6EBF3; border-radius:12px; background:#F7F9FD; overflow:hidden; cursor:zoom-in; transition:box-shadow .15s, border-color .15s;')}>
        <img
          src={img.src}
          alt={img.caption || ''}
          onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={{ display: 'block', margin: '0 auto', width: '100%', maxWidth: dims ? dims.w : undefined, height: tall ? 300 : 'auto', objectFit: tall ? 'cover' : undefined, objectPosition: 'top' }}
        />
      </button>
      {img.caption && <figcaption style={css(`margin-top:7px; font:400 12px/1.45 ${FONT}; color:#64748b;`)}><Fill text={img.caption} /></figcaption>}
      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label={img.caption || 'Ảnh'} onClick={() => setOpen(false)} style={css('position:fixed; inset:0; z-index:5000; background:rgba(3,6,18,.86); backdrop-filter:blur(4px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:24px; box-sizing:border-box; cursor:zoom-out;')}>
          <img src={img.src} alt={img.caption || ''} style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 110px)', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,.6)', background: '#fff' }} />
          {img.caption && <div style={css(`max-width:900px; text-align:center; font:500 13.5px/1.5 ${FONT}; color:#dbe4f7;`)}><Fill text={img.caption} /></div>}
          <div style={css(`font:500 12px ${FONT}; color:#8fa6d8;`)}>Bấm bất cứ đâu để đóng</div>
        </div>,
        document.body,
      )}
    </figure>
  )
}

export function Blocks({ blocks }) {
  return <div style={css('display:flex; flex-direction:column; gap:14px;')}>{blocks.map((b, i) => <Block key={i} b={b} />)}</div>
}
