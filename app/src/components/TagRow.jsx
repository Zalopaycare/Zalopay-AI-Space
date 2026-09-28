import { css } from '../lib/style.js'

const base = 'display:inline-flex; align-items:center; height:24px; padding:0 10px; border-radius:999px; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; white-space:nowrap;'

/** Topic + AI tool tags, the one tag scheme shared by use case and question cards. */
export default function TagRow({ topics = [], tools = [], style }) {
  if (!topics.length && !tools.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, ...style }}>
      {topics.map((tp) => <span key={'t-' + tp} style={css(base + 'background:#EAF0FF; color:#2c5fff;')}>{tp}</span>)}
      {tools.map((tl) => <span key={'a-' + tl} style={css(base + 'background:#F1F4FA; color:#3A4757; border:1px solid #E3E8F2;')}>{tl}</span>)}
    </div>
  )
}
