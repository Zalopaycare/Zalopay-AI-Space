import { forwardRef, useRef } from 'react'

// Matches "@handle" and "@name@company.domain" mention tokens.
export const MENTION_SPLIT = /(@[A-Za-z0-9._-]+(?:@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)?)/g

/** "@nhanltp@vng.com.vn" → "@nhanltp": show the domain account, keep the full address stored. */
export const shortMention = (tok) => '@' + tok.slice(1).split('@')[0]

/**
 * Replace short "@handle" tokens the picker inserted with the full address it stood for
 * (map: handle → email), so the server can notify people who have never signed in.
 */
export function expandMentions(text, map) {
  if (!map || !Object.keys(map).length) return text
  return String(text).replace(/@([A-Za-z0-9._-]+)(?![A-Za-z0-9._@-])/g, (m, h) => (map[h.toLowerCase()] ? '@' + map[h.toLowerCase()] : m))
}

/**
 * An <input>/<textarea> that highlights @mentions while typing. A mirror layer behind the
 * transparent-text field draws the same text with mention tokens tinted, so the look changes
 * without shifting the caret (same font metrics — colour and background only, no bold).
 */
const MentionField = forwardRef(function MentionField({ multiline = false, style, value, onScroll, ...rest }, ref) {
  const mirror = useRef(null)
  const Tag = multiline ? 'textarea' : 'input'
  const sync = (e) => { if (mirror.current) { mirror.current.scrollTop = e.target.scrollTop; mirror.current.scrollLeft = e.target.scrollLeft } onScroll && onScroll(e) }
  const parts = String(value || '').split(MENTION_SPLIT)
  const { width, ...fieldStyle } = style || {}
  const shared = {
    ...fieldStyle,
    width: '100%', margin: 0, boxSizing: 'border-box',
    whiteSpace: multiline ? 'pre-wrap' : 'pre', overflowWrap: multiline ? 'break-word' : 'normal',
    fontFamily: fieldStyle.fontFamily || 'inherit',
  }
  return (
    <div style={{ position: 'relative', width: width || '100%', display: multiline ? 'block' : 'inline-block' }}>
      <div
        ref={mirror}
        aria-hidden="true"
        style={{ ...shared, position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', color: fieldStyle.color || '#0F172A', borderColor: 'transparent', resize: 'none', display: 'block', ...(multiline ? {} : { lineHeight: 'normal', display: 'flex', alignItems: 'center' }) }}
      >
        {parts.map((p, i) => (p.charAt(0) === '@' && p.length > 1
          ? <span key={i} style={{ color: '#2c5fff', background: '#E4ECFF', borderRadius: 4, boxShadow: '0 0 0 1px #E4ECFF' }}>{p}</span>
          : <span key={i}>{p}</span>))}
        {multiline ? '​' : null}
      </div>
      <Tag
        ref={ref}
        value={value}
        onScroll={sync}
        onInput={sync}
        {...rest}
        className={'zp-mention-field' + (rest.className ? ' ' + rest.className : '')}
        style={{ ...shared, position: 'relative', background: 'transparent', color: 'transparent', caretColor: fieldStyle.color || '#0F172A' }}
      />
    </div>
  )
})

export default MentionField
