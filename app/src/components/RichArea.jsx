import { useLayoutEffect, useRef, useState } from 'react'
import { css, hoverClass } from '../lib/style.js'
import { inlineToHtml, nodeToInline } from '../lib/inlineFormat.js'

/**
 * A text box that takes bold and italic, for the share form: Ctrl/⌘+B, Ctrl/⌘+I or the B / I buttons
 * above it, and the words show formatted as you type (no ** to write). The value stays a plain string
 * with the marks in it (lib/inlineFormat.js); onChange gets { target: { value } } like a <textarea>.
 */
export default function RichArea({ id, value, onChange, rows = 3, placeholder, style, ariaLabel }) {
  const ref = useRef(null)
  const last = useRef(null) // the value this box last sent up, so its own edits aren't written back
  const [marks, setMarks] = useState({ b: false, i: false })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || value === last.current) return
    el.innerHTML = inlineToHtml(value || '')
    last.current = value
  }, [value])

  const emit = () => {
    const v = nodeToInline(ref.current)
    if (!v && ref.current.innerHTML) ref.current.innerHTML = '' // emptied: let the placeholder show again
    last.current = v
    onChange({ target: { value: v } })
  }
  const readMarks = () => {
    try { setMarks({ b: document.queryCommandState('bold'), i: document.queryCommandState('italic') }) } catch { /* ignore */ }
  }
  const apply = (cmd) => {
    ref.current?.focus()
    document.execCommand('styleWithCSS', false, false)
    document.execCommand(cmd)
    emit(); readMarks()
  }
  const onKeyDown = (e) => {
    const mod = e.metaKey || e.ctrlKey
    if (mod && !e.shiftKey && !e.altKey && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); apply('bold'); return }
    if (mod && !e.shiftKey && !e.altKey && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); apply('italic'); return }
    if (mod && /^[uU]$/.test(e.key)) { e.preventDefault(); return } // no underline: it isn't kept
    // a new line is a line break, not a new <div> block
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); document.execCommand('insertLineBreak') }
  }
  // pasted text comes in plain (no fonts, colours or links from elsewhere)
  const onPaste = (e) => {
    e.preventDefault()
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
  }

  const btn = (on) => `width:26px; height:24px; border:1px solid ${on ? '#B9CCF8' : 'transparent'}; border-radius:7px; background:${on ? '#EAF1FF' : 'transparent'}; color:${on ? '#2c5fff' : '#64748b'}; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0; font-family:Georgia,serif; font-size:14px;`
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  return (
    <div style={css('position:relative;')}>
      <div style={css('display:flex; align-items:center; gap:2px; margin-top:8px; margin-bottom:-4px;')}>
        <button type="button" tabIndex={-1} onMouseDown={(e) => { e.preventDefault(); apply('bold') }} title={`In đậm (${isMac ? '⌘' : 'Ctrl'}+B)`} aria-label="In đậm" aria-pressed={marks.b} className={hoverClass('background:#F1F4FA !important;')} style={css(btn(marks.b) + 'font-weight:800;')}>B</button>
        <button type="button" tabIndex={-1} onMouseDown={(e) => { e.preventDefault(); apply('italic') }} title={`In nghiêng (${isMac ? '⌘' : 'Ctrl'}+I)`} aria-label="In nghiêng" aria-pressed={marks.i} className={hoverClass('background:#F1F4FA !important;')} style={css(btn(marks.i) + 'font-style:italic;')}>I</button>
      </div>
      <div
        ref={ref}
        id={id}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel || placeholder}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className="zp-richarea"
        onInput={emit}
        onKeyDown={onKeyDown}
        onKeyUp={readMarks}
        onMouseUp={readMarks}
        onFocus={readMarks}
        onPaste={onPaste}
        style={{ ...(style || {}), marginTop: 6, minHeight: `calc(${rows} * 1.6em + 20px)`, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', cursor: 'text', resize: 'none', overflow: 'auto' }}
      />
    </div>
  )
}
