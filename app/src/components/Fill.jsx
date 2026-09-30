// Renders text with every "[cần bổ sung]" shown as an amber chip, so missing info stands out
// instead of reading like normal content.
const MARK = /(\[cần bổ sung[^\]]*\])/i

export default function Fill({ text }) {
  if (text == null) return null
  const s = String(text)
  if (!MARK.test(s)) return s
  return s.split(MARK).map((part, i) => (i % 2
    ? <span key={i} title="Tài liệu gốc chưa có thông tin này" style={{ display: 'inline-block', padding: '0 7px', borderRadius: 6, background: '#FFF1D6', border: '1px dashed #E3A33B', color: '#8A5300', fontSize: '0.92em', fontWeight: 700, lineHeight: 1.5 }}>{part}</span>
    : part))
}
