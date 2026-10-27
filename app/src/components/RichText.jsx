import { css } from '../lib/style.js'

// Text from the AI Exhibition (the Bài toán / Giải pháp it gave a booth or a use case), shown the way the
// exhibition shows it: line breaks, blank lines and "- " / "+ " list marks kept exactly as written,
// **…** in bold.
export default function RichText({ text }) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g)
  return (
    <div style={css('white-space:pre-wrap; overflow-wrap:anywhere;')}>
      {parts.map((part, i) => (/^\*\*[^*]+\*\*$/.test(part) ? <b key={i} style={css('font-weight:800; color:#0F172A;')}>{part.slice(2, -2)}</b> : part))}
    </div>
  )
}
