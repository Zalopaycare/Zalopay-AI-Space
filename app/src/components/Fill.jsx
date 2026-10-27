// Renders text with every "[cần bổ sung]" shown as an amber chip, so missing info stands out
// instead of reading like normal content, and every "{{…}}" in red: wording AI Space wrote
// that the team's source document doesn't say (to be confirmed or replaced by the owner).
const MARK = /(\[cần bổ sung[^\]]*\]|\{\{[^}]*\}\})/i

/** The same text without the "{{…}}" marks (for alt text and other plain-text uses). */
export const plainText = (text) => String(text ?? '').replace(/\{\{([^}]*)\}\}/g, '$1')

export default function Fill({ text }) {
  if (text == null) return null
  const s = String(text)
  if (!MARK.test(s)) return s
  return s.split(MARK).map((part, i) => {
    if (!(i % 2)) return part
    if (part.startsWith('{{')) return <span key={i} title="Không có trong tài liệu gốc: AI Space tự viết, cần team xác nhận" style={{ color: '#D8232A', textDecoration: 'underline dashed', textDecorationColor: '#F19A9E', textUnderlineOffset: 3 }}>{part.slice(2, -2)}</span>
    return <span key={i} title="Tài liệu gốc chưa có thông tin này" style={{ display: 'inline-block', padding: '0 7px', borderRadius: 6, background: '#FFF1D6', border: '1px dashed #E3A33B', color: '#8A5300', fontSize: '0.92em', fontWeight: 700, lineHeight: 1.5 }}>{part}</span>
  })
}
