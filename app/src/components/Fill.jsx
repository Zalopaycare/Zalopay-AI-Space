// Renders text with every "[cần bổ sung]" shown as an amber chip, so missing info stands out
// instead of reading like normal content, and every "{{…}}" in red: wording AI Space wrote
// that the team's source document doesn't say (to be confirmed or replaced by the owner).
// **bold** and *italic* (written with the share form's B / I) show as such.
import { hasInline, parseInline, stripInline } from '../lib/inlineFormat.js'
import { toneObj } from '../lib/theme.js'

const MARK = /(\[cần bổ sung[^\]]*\]|\{\{[^}]*\}\})/i

/** The same text without the "{{…}}" marks (for alt text and other plain-text uses). */
export const plainText = (text) => stripInline(String(text ?? '').replace(/\{\{([^}]*)\}\}/g, '$1'))

// One stretch of ordinary text, with its bold / italic.
const styled = (s, key) => (!hasInline(s) ? s : parseInline(s).map((r, i) => {
  if (!r.b && !r.i) return r.text
  return <span key={key + '-' + i} style={{ fontWeight: r.b ? 800 : undefined, fontStyle: r.i ? 'italic' : undefined }}>{r.text}</span>
}))

export default function Fill({ text }) {
  if (text == null) return null
  const s = String(text)
  if (!MARK.test(s)) return styled(s, 'f')
  return s.split(MARK).map((part, i) => {
    if (!(i % 2)) return styled(part, i)
    if (part.startsWith('{{')) return <span key={i} title="Không có trong tài liệu gốc: AI Space tự viết, cần team xác nhận" style={toneObj({ color: '#D8232A', textDecoration: 'underline dashed', textDecorationColor: '#F19A9E', textUnderlineOffset: 3 })}>{part.slice(2, -2)}</span>
    return <span key={i} title="Tài liệu gốc chưa có thông tin này" style={toneObj({ display: 'inline-block', padding: '0 7px', borderRadius: 6, background: '#FFF1D6', border: '1px dashed #E3A33B', color: '#8A5300', fontSize: '0.92em', fontWeight: 700, lineHeight: 1.5 })}>{part}</span>
  })
}
