import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Shared modal behaviour: Esc closes, Tab/Shift+Tab stay inside the dialog, focus moves into it
 * on open and returns to whatever had it before on close. Spread `dialogProps` on the dialog box.
 *
 *   const { ref, dialogProps } = useDialog(open, onClose, 'Chia sẻ Use Case')
 *   <div ref={ref} {...dialogProps}>…</div>
 *
 * Only the topmost open dialog reacts to Esc/Tab, so a confirm box over a modal closes alone.
 */
const stack = []

export function useDialog(open, onClose, label, { escInFields = true, focusField = true } = {}) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const token = {}
    stack.push(token)
    const before = document.activeElement
    const box = ref.current
    // Focus the first field (or the box itself) unless something inside already asked for focus.
    requestAnimationFrame(() => {
      if (!box || box.contains(document.activeElement)) return
      const first = focusField ? box.querySelector('input:not([type="hidden"]), textarea, select') || box.querySelector(FOCUSABLE) : null
      ;(first || box).focus({ preventScroll: true })
    })
    const onKey = (e) => {
      if (stack[stack.length - 1] !== token || !box) return
      if (e.key === 'Escape' && !e.defaultPrevented) {
        if (!escInFields && ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) { document.activeElement.blur(); return }
        e.preventDefault(); closeRef.current && closeRef.current()
      }
      else if (e.key === 'Tab') {
        const items = Array.from(box.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null)
        if (!items.length) { e.preventDefault(); return }
        const first = items[0], last = items[items.length - 1]
        if (e.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const i = stack.indexOf(token)
      if (i >= 0) stack.splice(i, 1)
      if (before && typeof before.focus === 'function' && document.contains(before)) before.focus({ preventScroll: true })
    }
  }, [open])

  return { ref, dialogProps: { role: 'dialog', 'aria-modal': 'true', 'aria-label': label, tabIndex: -1 } }
}
