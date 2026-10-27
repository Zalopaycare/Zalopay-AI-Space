import { css } from '../lib/style.js'

// Text from the AI Exhibition (booth popups, and the Bài toán / Giải pháp it gave a use case).
// The exhibition writes its text as light markdown: **bold**, "- " (or "+ ", "• ") bullets, blank lines between parts.
// Rendered with the detail page's look: plain paragraphs, dotted bullets, bold run-in headings.
export default function RichText({ text, dot = '#9FB6E8' }) {
  const bold = (s) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (/^\*\*[^*]+\*\*$/.test(part) ? <b key={i} style={css('font-weight:800; color:#0F172A;')}>{part.slice(2, -2)}</b> : part))
  const blocks = []
  for (const line of String(text || '').split('\n')) {
    const item = /^\s*[-•+]\s+(.*)$/.exec(line)
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
